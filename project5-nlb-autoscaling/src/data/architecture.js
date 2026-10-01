/**
 * Architecture model shared by the topology, hero and blueprint diagrams.
 * Descriptions are written for viva / presentation use.
 */

export const TOPOLOGY_NODES = {
  internet: {
    label: 'Internet',
    sub: 'CLIENT TRAFFIC',
    icon: 'internet',
    tag: 'Origin',
    title: 'Internet',
    summary: 'Where every client request begins.',
    desc: 'Clients reach the application through the NLB’s public DNS name. Traffic enters the VPC through the Internet Gateway attached to the public subnets.',
    specs: [
      ['Entry point', 'NLB DNS name'],
      ['Protocol', 'TCP'],
      ['Port', '80'],
    ],
  },
  nlb: {
    label: 'Network Load Balancer',
    sub: 'TCP : 80 · INTERNET-FACING',
    icon: 'nlb',
    cls: 'n--key',
    tag: 'Layer 4',
    title: 'Network Load Balancer',
    summary: 'Distributes TCP traffic across healthy EC2 targets.',
    desc: 'An internet-facing NLB with a TCP:80 listener and a node in each public subnet. It picks a target for every new TCP flow using a flow hash and forwards only to targets that pass health checks.',
    specs: [
      ['Scheme', 'Internet-facing'],
      ['Listener', 'TCP : 80'],
      ['Subnets', '2 public · 2 AZs'],
      ['Client IP', 'Preserved'],
    ],
  },
  tg: {
    label: 'Target Group',
    sub: 'TCP:80 · INSTANCE TARGETS',
    icon: 'tg',
    tag: 'Routing',
    title: 'Target Group',
    summary: 'The registry of EC2 targets and their health.',
    desc: 'An instance-type target group on TCP:80. The Auto Scaling Group registers and deregisters instances automatically; TCP health checks decide which targets may receive traffic.',
    specs: [
      ['Target type', 'Instance'],
      ['Protocol : port', 'TCP : 80'],
      ['Health check', 'TCP : 80'],
      ['Registration', 'Automatic via ASG'],
    ],
  },
  'ec2-1': {
    label: 'EC2-01',
    sub: 'AZ-1 · BASELINE',
    icon: 'ec2',
    status: true,
    tag: 'Compute · AZ-1',
    title: 'EC2 Instance 01',
    summary: 'Runs Apache2 on Ubuntu 24.04 LTS.',
    desc: 'Launched from the launch template into public subnet 10.0.1.0/24. One of the two instances that always run at the minimum capacity.',
    specs: [
      ['Type', 't3.micro'],
      ['OS', 'Ubuntu 24.04 LTS'],
      ['Web server', 'Apache2 : 80'],
      ['Capacity role', 'Baseline'],
    ],
  },
  'ec2-2': {
    label: 'EC2-02',
    sub: 'AZ-2 · BASELINE',
    icon: 'ec2',
    status: true,
    tag: 'Compute · AZ-2',
    title: 'EC2 Instance 02',
    summary: 'Runs Apache2 on Ubuntu 24.04 LTS.',
    desc: 'Launched into public subnet 10.0.2.0/24 in the second Availability Zone, so the application survives the loss of one zone.',
    specs: [
      ['Type', 't3.micro'],
      ['OS', 'Ubuntu 24.04 LTS'],
      ['Web server', 'Apache2 : 80'],
      ['Capacity role', 'Baseline'],
    ],
  },
  'ec2-3': {
    label: 'EC2-03',
    sub: 'AZ-1 · SCALE-OUT',
    icon: 'ec2',
    status: true,
    cls: 'n--standby',
    tag: 'Scale-out · AZ-1',
    title: 'EC2 Instance 03',
    summary: 'Launched only when desired capacity reaches 3.',
    desc: 'Not running at the default desired capacity of 2. When the group scales out, the new instance is placed in AZ-1 to keep both zones balanced, then registered with the target group.',
    specs: [
      ['Type', 't3.micro'],
      ['State at desired = 2', 'Not launched'],
      ['Launched at', 'Desired ≥ 3'],
    ],
  },
  'ec2-4': {
    label: 'EC2-04',
    sub: 'AZ-2 · SCALE-OUT',
    icon: 'ec2',
    status: true,
    cls: 'n--standby',
    tag: 'Scale-out · AZ-2',
    title: 'EC2 Instance 04',
    summary: 'The maximum: launched only at peak capacity.',
    desc: 'The fourth and final slot. The group never exceeds its maximum of 4 instances, which caps cost in a sandbox account.',
    specs: [
      ['Type', 't3.micro'],
      ['State at desired = 2', 'Not launched'],
      ['Launched at', 'Desired = 4 (max)'],
    ],
  },
  asg: {
    label: 'Auto Scaling Group',
    sub: 'CAPACITY 2 → 4',
    icon: 'asg',
    cls: 'n--soft',
    tag: 'Capacity',
    title: 'Auto Scaling Group',
    summary: 'Maintains the required number of instances.',
    desc: 'Keeps between 2 and 4 instances running across both Availability Zones, replaces any instance that fails its ELB health check, and registers new instances with the target group.',
    specs: [
      ['Min / desired / max', '2 / 2 / 4'],
      ['Health check type', 'ELB'],
      ['Subnets', 'Both public subnets'],
      ['Launch template', 'p5-lt'],
    ],
  },
};

export const TOPOLOGY_EDGES = [
  ['internet', 'nlb'],
  ['nlb', 'tg'],
  ['tg', 'ec2-1'],
  ['tg', 'ec2-2'],
  ['tg', 'ec2-3'],
  ['tg', 'ec2-4'],
];

/** Instances that run at the default desired capacity (2). */
export const BASELINE = ['ec2-1', 'ec2-2'];
export const EC2_IDS = ['ec2-1', 'ec2-2', 'ec2-3', 'ec2-4'];
