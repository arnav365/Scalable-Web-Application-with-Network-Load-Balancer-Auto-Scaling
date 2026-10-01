# Scalable Web Application with Network Load Balancer & Auto Scaling

AWS Project 05: an internet-facing **Network Load Balancer** (TCP:80) in front of an **EC2 Auto Scaling Group** (min 2 · desired 2 · max 4) running Apache2 on Ubuntu 24.04, spread across two Availability Zones in a `10.0.0.0/16` VPC.

```
Internet → Network Load Balancer → Target Group → EC2 instances ← Auto Scaling Group
```

Everything lives in [`project5-nlb-autoscaling/`](project5-nlb-autoscaling/):

- **Website:** "Network Flow Lab", an interactive architecture explainer (`npm start` inside the folder)
- **Deployment scripts:** user data, launch template, AWS CLI reference, traffic test, teardown
- **Documentation:** [full README](project5-nlb-autoscaling/README.md)
