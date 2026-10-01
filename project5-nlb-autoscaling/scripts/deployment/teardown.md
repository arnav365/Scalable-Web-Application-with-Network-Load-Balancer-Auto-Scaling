# Teardown (sandbox clean-up)

Delete in reverse dependency order so nothing is left running. Replace each placeholder with the value printed by `aws-cli-reference.sh` (or copied from the console).

```bash
# 1. Auto Scaling Group (terminates its instances)
aws autoscaling delete-auto-scaling-group --auto-scaling-group-name p5-asg --force-delete

# 2. Launch template
aws ec2 delete-launch-template --launch-template-name p5-lt

# 3. Network Load Balancer (also removes its listener)
aws elbv2 delete-load-balancer --load-balancer-arn <YOUR-NLB-ARN>

# 4. Target group (after the NLB is gone)
aws elbv2 delete-target-group --target-group-arn <YOUR-TARGET-GROUP-ARN>

# 5. Security group (after the instances have terminated)
aws ec2 delete-security-group --group-id <YOUR-SECURITY-GROUP-ID>

# 6. Network
aws ec2 delete-subnet --subnet-id <YOUR-SUBNET-1-ID>
aws ec2 delete-subnet --subnet-id <YOUR-SUBNET-2-ID>
aws ec2 delete-route-table --route-table-id <YOUR-ROUTE-TABLE-ID>
aws ec2 detach-internet-gateway --internet-gateway-id <YOUR-IGW-ID> --vpc-id <YOUR-VPC-ID>
aws ec2 delete-internet-gateway --internet-gateway-id <YOUR-IGW-ID>
aws ec2 delete-vpc --vpc-id <YOUR-VPC-ID>
```

If a delete fails with a dependency error, wait a minute (instances or load balancer network interfaces may still be shutting down) and retry.
