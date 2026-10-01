/**
 * Validation checklist. Every item starts as "Pending validation".
 * Items are only marked verified by the presenter after testing a real deployment.
 */
export const VALIDATION_ITEMS = [
  { id: 'nlb-reachable', label: 'NLB reachable', how: 'curl -I http://<YOUR-NLB-DNS>' },
  { id: 'tg-healthy', label: 'Target group healthy', how: 'aws elbv2 describe-target-health --target-group-arn <YOUR-TARGET-GROUP-ARN>' },
  { id: 'ec2-running', label: 'EC2 instances running', how: 'EC2 console → Instances → 2 × running (t3.micro)' },
  { id: 'apache', label: 'Apache responding', how: 'systemctl status apache2 · curl -I http://localhost' },
  { id: 'distribution', label: 'NLB distributes traffic', how: 'Repeated curl to /instance.json returns more than one instance ID' },
  { id: 'min-capacity', label: 'Auto Scaling maintains minimum capacity', how: 'Terminate one instance → ASG launches a replacement' },
  { id: 'multi-az', label: 'Multiple AZs configured', how: 'Instances and NLB nodes present in both public subnets' },
  { id: 'security-group', label: 'Security group configured', how: 'Inbound: TCP 80 from 0.0.0.0/0 · TCP 22 from <MY-IP>/32 only' },
];
