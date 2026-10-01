#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Project 05 — AWS CLI reference deployment
#
# Builds:  VPC → 2 public subnets → IGW + route table → security group →
#          target group → internet-facing NLB + TCP:80 listener →
#          launch template → Auto Scaling Group (2 / 2 / 4)
#
# The console steps on the website do exactly the same thing. This script is
# for reference and repeatability; read it before running it.
#
# Fill in the four inputs below. Every other ID is captured from the
# previous command's output, so no resource IDs are hard-coded.
# ---------------------------------------------------------------------------
set -euo pipefail

AMI_ID="<YOUR-AMI-ID>"            # Ubuntu Server 24.04 LTS (x86_64) in your region
KEY_NAME="<YOUR-KEY-PAIR-NAME>"   # existing EC2 key pair
MY_IP="<MY-IP>"                   # your public IPv4, e.g. from https://checkip.amazonaws.com
AZ_1="<AZ-1>"                     # e.g. the first AZ in your region
AZ_2="<AZ-2>"                     # a different AZ in the same region

for v in AMI_ID KEY_NAME MY_IP AZ_1 AZ_2; do
  if [[ "${!v}" == \<* ]]; then echo "Set $v before running." >&2; exit 1; fi
done

HERE="$(cd "$(dirname "$0")" && pwd)"
tag() { echo "ResourceType=$1,Tags=[{Key=Name,Value=$2},{Key=Project,Value=p5-nlb-autoscaling}]"; }

# 1. VPC ----------------------------------------------------------------------
VPC_ID=$(aws ec2 create-vpc --cidr-block 10.0.0.0/16 \
  --tag-specifications "$(tag vpc p5-vpc)" --query Vpc.VpcId --output text)
aws ec2 modify-vpc-attribute --vpc-id "$VPC_ID" --enable-dns-hostnames

IGW_ID=$(aws ec2 create-internet-gateway \
  --tag-specifications "$(tag internet-gateway p5-igw)" \
  --query InternetGateway.InternetGatewayId --output text)
aws ec2 attach-internet-gateway --internet-gateway-id "$IGW_ID" --vpc-id "$VPC_ID"

# 2. Public subnets -----------------------------------------------------------
SUBNET_1=$(aws ec2 create-subnet --vpc-id "$VPC_ID" --cidr-block 10.0.1.0/24 \
  --availability-zone "$AZ_1" --tag-specifications "$(tag subnet p5-public-1)" \
  --query Subnet.SubnetId --output text)
SUBNET_2=$(aws ec2 create-subnet --vpc-id "$VPC_ID" --cidr-block 10.0.2.0/24 \
  --availability-zone "$AZ_2" --tag-specifications "$(tag subnet p5-public-2)" \
  --query Subnet.SubnetId --output text)

for s in "$SUBNET_1" "$SUBNET_2"; do
  aws ec2 modify-subnet-attribute --subnet-id "$s" --map-public-ip-on-launch
done

RT_ID=$(aws ec2 create-route-table --vpc-id "$VPC_ID" \
  --tag-specifications "$(tag route-table p5-public-rt)" \
  --query RouteTable.RouteTableId --output text)
aws ec2 create-route --route-table-id "$RT_ID" --destination-cidr-block 0.0.0.0/0 --gateway-id "$IGW_ID"
aws ec2 associate-route-table --route-table-id "$RT_ID" --subnet-id "$SUBNET_1"
aws ec2 associate-route-table --route-table-id "$RT_ID" --subnet-id "$SUBNET_2"

# 3. Security group -------------------------------------------------------------
SG_ID=$(aws ec2 create-security-group --group-name p5-web-sg \
  --description "Project 05 web instances: HTTP from anywhere, SSH from my IP" \
  --vpc-id "$VPC_ID" --query GroupId --output text)
aws ec2 authorize-security-group-ingress --group-id "$SG_ID" --protocol tcp --port 80 --cidr 0.0.0.0/0
aws ec2 authorize-security-group-ingress --group-id "$SG_ID" --protocol tcp --port 22 --cidr "${MY_IP}/32"

# 4. Target group (TCP:80, instance targets) ----------------------------------
TG_ARN=$(aws elbv2 create-target-group --name p5-tg \
  --protocol TCP --port 80 --target-type instance --vpc-id "$VPC_ID" \
  --health-check-protocol TCP --healthy-threshold-count 3 --unhealthy-threshold-count 3 \
  --health-check-interval-seconds 10 \
  --query 'TargetGroups[0].TargetGroupArn' --output text)

# 5. Network Load Balancer + listener -----------------------------------------
NLB_ARN=$(aws elbv2 create-load-balancer --name p5-nlb --type network \
  --scheme internet-facing --ip-address-type ipv4 --subnets "$SUBNET_1" "$SUBNET_2" \
  --query 'LoadBalancers[0].LoadBalancerArn' --output text)

aws elbv2 create-listener --load-balancer-arn "$NLB_ARN" --protocol TCP --port 80 \
  --default-actions "Type=forward,TargetGroupArn=$TG_ARN" > /dev/null

# 6. Launch template ----------------------------------------------------------
USER_DATA=$(base64 -w0 "$HERE/user-data.sh")
LT_DATA=$(cat <<JSON
{
  "ImageId": "$AMI_ID",
  "InstanceType": "t3.micro",
  "KeyName": "$KEY_NAME",
  "NetworkInterfaces": [{ "DeviceIndex": 0, "AssociatePublicIpAddress": true, "Groups": ["$SG_ID"] }],
  "MetadataOptions": { "HttpTokens": "required", "HttpEndpoint": "enabled" },
  "TagSpecifications": [{ "ResourceType": "instance", "Tags": [{ "Key": "Name", "Value": "p5-web" }] }],
  "UserData": "$USER_DATA"
}
JSON
)
aws ec2 create-launch-template --launch-template-name p5-lt --launch-template-data "$LT_DATA" > /dev/null

# 7–9. Auto Scaling Group, attached to the target group -----------------------
aws autoscaling create-auto-scaling-group --auto-scaling-group-name p5-asg \
  --launch-template "LaunchTemplateName=p5-lt,Version=\$Latest" \
  --min-size 2 --desired-capacity 2 --max-size 4 \
  --vpc-zone-identifier "$SUBNET_1,$SUBNET_2" \
  --target-group-arns "$TG_ARN" \
  --health-check-type ELB --health-check-grace-period 120

# 10. Output ------------------------------------------------------------------
NLB_DNS=$(aws elbv2 describe-load-balancers --load-balancer-arns "$NLB_ARN" \
  --query 'LoadBalancers[0].DNSName' --output text)

cat <<EOF

Created (save these for teardown):
  VPC_ID=$VPC_ID
  IGW_ID=$IGW_ID
  SUBNET_1=$SUBNET_1
  SUBNET_2=$SUBNET_2
  RT_ID=$RT_ID
  SG_ID=$SG_ID
  TG_ARN=$TG_ARN
  NLB_ARN=$NLB_ARN

NLB DNS: http://$NLB_DNS
Targets take a few minutes to become healthy. Check with:
  aws elbv2 describe-target-health --target-group-arn $TG_ARN
Then run:
  bash scripts/deployment/test-nlb.sh $NLB_DNS
EOF
