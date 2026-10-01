# Scalable Web App with NLB & Auto Scaling

**AWS Project 05 · Network Flow Lab**

An AWS architecture that serves an Apache web application from EC2 instances behind an **internet-facing Network Load Balancer**, with an **EC2 Auto Scaling Group** that keeps between two and four instances running across **two Availability Zones**. The repo also contains an interactive website that explains the architecture with live SVG topology diagrams, a load-distribution simulation, and an Auto Scaling simulation.

> **Status:** Architecture ready · Implementation in progress · AWS deployment pending · Testing pending.
> No AWS resources are claimed to exist yet. Values on the website marked *Demo data* or *Simulation* are illustrative. Real instance IDs, IPs and health states appear only once the stack is deployed (see [Live instance data](#live-instance-data)).

---

## Overview

| | |
|---|---|
| **Goal** | Distribute TCP traffic across healthy EC2 instances and keep the application available as load and failures change |
| **Entry point** | Internet-facing Network Load Balancer, TCP listener on port 80 |
| **Compute** | `t3.micro`, Ubuntu 24.04 LTS, Apache2 |
| **Capacity** | Auto Scaling Group — min 2 · desired 2 · max 4 |
| **Network** | VPC `10.0.0.0/16`, two public subnets in two AZs |
| **Cost profile** | Sandbox / free-tier friendly: no NAT Gateway, no database, no CDN, no DNS zone |

## Architecture

```
Internet
   │
   ▼
Network Load Balancer  (internet-facing · TCP:80 · one node per AZ)
   │
   ▼
Target Group           (TCP:80 · instance targets · TCP health check)
   │
   ├──────────────┬──────────────┬──────────────┐
   ▼              ▼              ▼              ▼
 EC2-01         EC2-02         EC2-03         EC2-04
 AZ-1           AZ-2           AZ-1           AZ-2
 baseline       baseline       scale-out      scale-out
   └──────────────┴──────┬───────┴──────────────┘
                         │
               Auto Scaling Group
               min 2 · desired 2 · max 4
```

## AWS Services

| Service | Purpose | Role in this project |
|---|---|---|
| **Amazon VPC** | Isolated network | `10.0.0.0/16` with two public subnets, an Internet Gateway and a public route table |
| **Security Groups** | Stateful firewall | Allows HTTP 80 from anywhere and SSH 22 from your IP only |
| **Network Load Balancer** | Layer 4 load balancing | Distributes TCP traffic across healthy EC2 instances |
| **Target Group** | Target registry and health | TCP:80 instance targets, health-checked over TCP |
| **Amazon EC2** | Compute | Runs the Apache web application |
| **EC2 Auto Scaling** | Capacity management | Maintains the required number of instances and replaces unhealthy ones |

## Network Architecture

| Resource | Value |
|---|---|
| VPC | `10.0.0.0/16` (DNS hostnames enabled) |
| Public subnet 1 | `10.0.1.0/24` in AZ-1, auto-assign public IPv4 |
| Public subnet 2 | `10.0.2.0/24` in AZ-2, auto-assign public IPv4 |
| Internet Gateway | Attached to the VPC |
| Route table | `0.0.0.0/0 → IGW`, associated with both subnets |
| NAT Gateway | Not used — instances are in public subnets |

## NLB Configuration

| Setting | Value |
|---|---|
| Type | Network Load Balancer |
| Name | `p5-nlb` |
| Scheme | Internet-facing, IPv4 |
| Subnets | Both public subnets (one NLB node per AZ) |
| Listener | TCP : 80 → forward to `p5-tg` |
| Cross-zone load balancing | Default (off for NLB) — each node routes to targets in its own AZ |

How it routes: an NLB works at Layer 4. For each new TCP flow it picks a target with a flow hash (protocol, source/destination IP and port, TCP sequence number), then keeps that whole connection on the same target. Over many connections traffic spreads evenly, but it is not strict round-robin. With instance targets the client IP is preserved, so the instance sees the real client address.

## Target Group

| Setting | Value |
|---|---|
| Name | `p5-tg` |
| Target type | Instance |
| Protocol : port | TCP : 80 |
| Health check | TCP on the traffic port · interval 10 s · healthy/unhealthy threshold 3 |
| Registration | Automatic, by the Auto Scaling Group |

## EC2 Configuration

| Setting | Value |
|---|---|
| AMI | Ubuntu Server 24.04 LTS (`<YOUR-AMI-ID>`) |
| Instance type | `t3.micro` |
| Web server | Apache2 on port 80 |
| Launch template | `p5-lt` with public IP, `p5-web-sg`, IMDSv2 required |
| User data | [`scripts/deployment/user-data.sh`](scripts/deployment/user-data.sh) — installs Apache2, deploys this site, writes `/instance.json` |

## Auto Scaling Configuration

| Setting | Value |
|---|---|
| Name | `p5-asg` |
| Launch template | `p5-lt` (`$Latest`) |
| Subnets | Both public subnets |
| Min / desired / max | 2 / 2 / 4 |
| Health check type | ELB, 120 s grace period |
| Target group | `p5-tg` |

The ASG balances instances across both AZs (EC2-01 → AZ-1, EC2-02 → AZ-2, EC2-03 → AZ-1, EC2-04 → AZ-2). To demonstrate scaling in a sandbox, raise the desired capacity manually (see [Testing](#testing)). A scaling policy (for example target tracking on average CPU) can be added later.

## Security

Security group **`p5-web-sg`** on the instances:

| Direction | Type | Protocol | Port | Source / destination | Why |
|---|---|---|---|---|---|
| Inbound | HTTP | TCP | 80 | `0.0.0.0/0` | Client traffic from the NLB (client IP preserved) and NLB health checks |
| Inbound | SSH | TCP | 22 | `<MY-IP>/32` | Administration from your own IP only |
| Outbound | All | All | All | `0.0.0.0/0` | Package installs and responses |

- SSH is **never** opened to `0.0.0.0/0`.
- Instance metadata requires IMDSv2 tokens.
- An NLB can have its own security group; that is optional here.

## Deployment Steps

Console steps (the website's *Build → Deploy → Scale* timeline shows the same):

1. **Create VPC** — `10.0.0.0/16`, attach an Internet Gateway, create a route table with `0.0.0.0/0 → IGW`.
2. **Create subnets** — `10.0.1.0/24` (AZ-1) and `10.0.2.0/24` (AZ-2); associate with the route table; enable auto-assign public IPv4.
3. **Create security group** — `p5-web-sg` with the rules above.
4. **Create target group** — `p5-tg`, instances, TCP:80, TCP health check. Register nothing yet.
5. **Create NLB** — `p5-nlb`, internet-facing, both subnets, listener TCP:80 → `p5-tg`.
6. **Create launch template** — `p5-lt`: Ubuntu 24.04 AMI, `t3.micro`, key pair, `p5-web-sg`, public IP, user data from `scripts/deployment/user-data.sh`.
7. **Create Auto Scaling Group** — `p5-asg` from `p5-lt` in both subnets; min 2, desired 2, max 4.
8. **Attach target group** — attach `p5-tg`, enable ELB health checks (grace 120 s).
9. **Launch EC2 instances** — the ASG launches two instances, one per AZ. Wait until both targets are *healthy*.
10. **Test NLB DNS** — open `http://<YOUR-NLB-DNS>` and run the tests below.

Apache setup (done automatically by user data; manual equivalent):

```bash
sudo apt update
sudo apt install apache2 -y
sudo systemctl enable apache2
sudo systemctl start apache2
systemctl status apache2
```

CLI alternative: [`scripts/deployment/aws-cli-reference.sh`](scripts/deployment/aws-cli-reference.sh) builds the whole stack. You only fill in the AMI ID, key pair, your IP and two AZ names; every resource ID is captured from command output, nothing is hard-coded. Clean-up: [`scripts/deployment/teardown.md`](scripts/deployment/teardown.md).

## Testing

```bash
# Targets as the NLB sees them
aws elbv2 describe-target-health --target-group-arn <YOUR-TARGET-GROUP-ARN>

# Reachability + distribution over 20 new TCP connections
bash scripts/deployment/test-nlb.sh <YOUR-NLB-DNS> 20

# Scaling demo
aws autoscaling set-desired-capacity --auto-scaling-group-name p5-asg --desired-capacity 3
```

Validation checklist (all items start as **Pending validation**):

- [ ] NLB reachable
- [ ] Target group healthy
- [ ] EC2 instances running
- [ ] Apache responding
- [ ] NLB distributes traffic
- [ ] Auto Scaling maintains minimum capacity (terminate one instance → replacement launches)
- [ ] Multiple AZs configured
- [ ] Security group configured

### Live instance data

The user-data script writes `/var/www/html/instance.json` on each instance from the instance metadata:

```json
{ "instance_id": "...", "availability_zone": "...", "private_ip": "...", "instance_type": "t3.micro", "os": "Ubuntu 24.04 LTS", "web_server": "Apache2" }
```

When the website is served through the NLB, **Probe live NLB** in the *Load distribution* section reads this file and replaces the demo server tiles with real values labelled *Live*. Run locally, the probe reports that live data is unavailable instead of inventing any.

## Screenshots

_Add screenshots after deployment, for example:_

| | |
|---|---|
| Website hero & topology | `docs/screenshots/hero.png` |
| Target group — healthy targets | `docs/screenshots/target-health.png` |
| Auto Scaling Group activity | `docs/screenshots/asg-activity.png` |
| `test-nlb.sh` output across instances | `docs/screenshots/distribution.png` |

## Future Improvements

- CloudWatch-based monitoring and alerting can be added in a future version.
- Target-tracking scaling policy instead of manual desired-capacity changes.
- Move instances to private subnets (would require a NAT Gateway or VPC endpoints).
- TLS listener on the NLB with a certificate.
- Infrastructure as code (CloudFormation or Terraform).

## Project Structure

```
project5-nlb-autoscaling/
├── index.html                  # Single-page site (semantic sections)
├── package.json                # npm start → zero-dependency dev server
├── README.md
├── public/assets/favicon.svg
├── scripts/
│   ├── serve.mjs               # Local static server
│   └── deployment/
│       ├── user-data.sh        # EC2 bootstrap: Apache2 + site + instance.json
│       ├── launch-template.json
│       ├── aws-cli-reference.sh
│       ├── test-nlb.sh
│       └── teardown.md
└── src/
    ├── main.js                 # Entry point
    ├── animations/             # motion preference, packet engine, scroll reveal
    ├── components/             # SVG builder, icons, navigation
    ├── data/                   # architecture model, instance slots, status, checklist
    ├── sections/               # hero, topology, distribution, instances, autoscaling,
    │                           # blueprint, deployment, validation, status
    └── styles/                 # tokens, base, layout, components, sections
```

### Run the website locally

```bash
cd project5-nlb-autoscaling
npm start            # http://localhost:5173  (no dependencies to install)
```

Plain HTML/CSS/vanilla JS ES modules, no build step and no runtime libraries. Animations run on `requestAnimationFrame` only while a diagram is on screen. They respect `prefers-reduced-motion`, and the **Motion** button in the navigation pauses them all.

## Technologies

- **AWS:** VPC · EC2 · Network Load Balancer · Target Group · EC2 Auto Scaling · Security Groups
- **OS:** Ubuntu 24.04 LTS
- **Web server:** Apache2
- **Frontend:** HTML · CSS · JavaScript (ES modules)
- **Visualization:** SVG · CSS animations · JavaScript

## Author

**&lt;Your Name&gt;** — AWS Project 05
GitHub: [arnav365/Scalable-Web-Application-with-Network-Load-Balancer-Auto-Scaling](https://github.com/arnav365/Scalable-Web-Application-with-Network-Load-Balancer-Auto-Scaling)
