/**
 * Architecture blueprint — VPC, two AZs, public subnets, NLB nodes,
 * target group, Auto Scaling Group and EC2 placement.
 *
 * Cross-zone load balancing is drawn in its NLB default (off): each NLB node
 * forwards to targets in its own Availability Zone.
 */
import { diagram, node, edge, frame, el, txt, vCurve } from '../components/svg.js';
import { PacketFlow, flash } from '../animations/packets.js';

function health(parent, x, y, healthy) {
  const g = el('g', {}, parent);
  el('circle', { cx: x - 44, cy: y - 3.5, r: 4, class: 'n__status', ...(healthy ? {} : { style: 'fill:var(--paper);stroke:var(--amber)' }) }, g);
  txt(g, x - 34, y, healthy ? 'HEALTHY TARGET' : 'SCALE-OUT SLOT', `frame-label ${healthy ? '' : 'frame-label--amber'}`, { style: 'font-size:10px' });
}

function ec2Nodes(layer, list, w, h) {
  return list.map(([x, y, label, sub, standby]) =>
    node(layer, { x, y, w, h, label, sub, icon: 'ec2', status: true, cls: standby ? 'n--standby' : '' }),
  );
}

function horizontal(host) {
  const { svg, layers, arrow } = diagram(host, {
    w: 1200,
    h: 820,
    id: 'bp-h',
    label: 'Blueprint: VPC 10.0.0.0/16 with an Internet Gateway, two Availability Zones each with a public subnet, a Network Load Balancer with a node in each zone, a target group, and an Auto Scaling Group containing EC2-01 and EC2-03 in zone 1 and EC2-02 and EC2-04 in zone 2.',
  });
  const F = layers.frames;

  frame(F, 30, 118, 1140, 682, 'frame--solid', 14);
  txt(F, 48, 148, 'VPC · 10.0.0.0/16', 'frame-label frame-label--strong');
  txt(F, 716, 140, 'ROUTE 0.0.0.0/0 → IGW', 'coord');

  frame(F, 60, 162, 525, 618, '', 12);
  frame(F, 615, 162, 525, 618, '', 12);
  txt(F, 76, 184, 'AVAILABILITY ZONE 1', 'frame-label');
  txt(F, 1124, 184, 'AVAILABILITY ZONE 2', 'frame-label', { 'text-anchor': 'end' });

  frame(F, 80, 198, 485, 562, 'frame--subnet', 10);
  frame(F, 635, 198, 485, 562, 'frame--subnet', 10);
  txt(F, 96, 220, 'PUBLIC SUBNET · 10.0.1.0/24', 'frame-label frame-label--signal');
  txt(F, 1104, 220, 'PUBLIC SUBNET · 10.0.2.0/24', 'frame-label frame-label--signal', { 'text-anchor': 'end' });

  frame(F, 100, 468, 1000, 272, 'frame--asg', 10);
  txt(F, 118, 726, 'AUTO SCALING GROUP · MIN 2 · DESIRED 2 · MAX 4', 'frame-label frame-label--amber');

  node(layers.nodes, { x: 600, y: 44, w: 190, h: 52, label: 'Internet', sub: 'CLIENTS', icon: 'internet' });
  node(layers.nodes, { x: 600, y: 118, w: 214, h: 44, label: 'Internet Gateway', icon: 'igw', cls: 'n--soft' });
  node(layers.nodes, { x: 600, y: 285, w: 900, h: 66, label: 'Network Load Balancer', sub: 'INTERNET-FACING · TCP:80 LISTENER · ONE NODE PER AZ', icon: 'nlb', cls: 'n--key' });
  node(layers.nodes, { x: 600, y: 405, w: 900, h: 54, label: 'Target Group', sub: 'TCP:80 · INSTANCE TARGETS · HEALTH CHECK TCP:80', icon: 'tg' });

  // NLB node markers in each AZ
  [327, 872].forEach((x, i) => {
    el('circle', { cx: x, cy: 318, r: 5, class: 'pkt' }, layers.nodes);
    txt(layers.nodes, x + 12, 340, `NLB NODE · AZ-${i + 1}`, 'coord');
  });

  const ec2 = ec2Nodes(
    layers.nodes,
    [
      [222, 590, 'EC2-01', 'AZ-1 · t3.micro'],
      [442, 590, 'EC2-03', 'AZ-1 · STANDBY', true],
      [758, 590, 'EC2-02', 'AZ-2 · t3.micro'],
      [978, 590, 'EC2-04', 'AZ-2 · STANDBY', true],
    ],
    184,
    70,
  );
  health(F, 222, 650, true);
  health(F, 442, 650, false);
  health(F, 758, 650, true);
  health(F, 978, 650, false);

  const E = layers.edges;
  const e = {
    inet: edge(E, 'M600 70V94', 'edge--live', arrow),
    igw: [edge(E, vCurve(600, 140, 327, 250), 'edge--live', arrow), edge(E, vCurve(600, 140, 872, 250), 'edge--live', arrow)],
    nlb: [edge(E, 'M327 318V376', 'edge--live', arrow), edge(E, 'M872 318V376', 'edge--live', arrow)],
    tg: [edge(E, vCurve(327, 432, 222, 553), 'edge--live', arrow), edge(E, vCurve(872, 432, 758, 553), 'edge--live', arrow)],
  };
  edge(E, vCurve(327, 432, 442, 553), 'edge--standby', arrow);
  edge(E, vCurve(872, 432, 978, 553), 'edge--standby', arrow);

  return { svg, layers, e, targets: [ec2[0], ec2[2]] };
}

function vertical(host) {
  const { svg, layers, arrow } = diagram(host, {
    w: 440,
    h: 930,
    id: 'bp-v',
    label: 'Blueprint: VPC with Internet Gateway, Network Load Balancer, target group, and an Auto Scaling Group spanning Availability Zone 1 (EC2-01, EC2-03) and Availability Zone 2 (EC2-02, EC2-04).',
  });
  const F = layers.frames;

  frame(F, 10, 104, 420, 812, 'frame--solid', 14);
  txt(F, 24, 144, 'VPC · 10.0.0.0/16', 'frame-label frame-label--strong');

  frame(F, 22, 372, 396, 530, 'frame--asg', 10);
  txt(F, 36, 890, 'AUTO SCALING · MIN 2 / MAX 4', 'frame-label frame-label--amber');

  frame(F, 34, 404, 372, 212, 'frame--subnet', 10);
  frame(F, 34, 636, 372, 212, 'frame--subnet', 10);
  txt(F, 48, 426, 'AZ-1 · 10.0.1.0/24', 'frame-label frame-label--signal');
  txt(F, 48, 658, 'AZ-2 · 10.0.2.0/24', 'frame-label frame-label--signal');

  node(layers.nodes, { x: 220, y: 40, w: 180, h: 48, label: 'Internet', icon: 'internet' });
  node(layers.nodes, { x: 220, y: 104, w: 204, h: 40, label: 'Internet Gateway', icon: 'igw', cls: 'n--soft' });
  node(layers.nodes, { x: 220, y: 205, w: 330, h: 62, label: 'Network Load Balancer', sub: 'TCP:80 · NODES IN AZ-1 + AZ-2', icon: 'nlb', cls: 'n--key' });
  node(layers.nodes, { x: 220, y: 310, w: 300, h: 54, label: 'Target Group', sub: 'TCP:80 · INSTANCE TARGETS', icon: 'tg' });

  const ec2 = ec2Nodes(
    layers.nodes,
    [
      [128, 506, 'EC2-01', 'HEALTHY'],
      [312, 506, 'EC2-03', 'STANDBY', true],
      [128, 738, 'EC2-02', 'HEALTHY'],
      [312, 738, 'EC2-04', 'STANDBY', true],
    ],
    168,
    66,
  );
  txt(F, 220, 580, 'UBUNTU 24.04 · APACHE2 · :80', 'coord', { 'text-anchor': 'middle' });
  txt(F, 220, 812, 'UBUNTU 24.04 · APACHE2 · :80', 'coord', { 'text-anchor': 'middle' });

  const E = layers.edges;
  const e = {
    inet: edge(E, 'M220 64V82', 'edge--live', arrow),
    igw: [edge(E, 'M220 124V172', 'edge--live', arrow)],
    nlb: [edge(E, 'M220 236V281', 'edge--live', arrow)],
    tg: [edge(E, 'M220 337V506H214', 'edge--live', arrow), edge(E, 'M220 337V738H214', 'edge--live', arrow)],
  };
  // Standby branches sit beneath the live trunk they share
  E.prepend(edge(E, 'M220 337V506H226', 'edge--standby', arrow), edge(E, 'M220 337V738H226', 'edge--standby', arrow));

  return { svg, layers, e, targets: [ec2[0], ec2[2]] };
}

export function initBlueprint() {
  const host = document.querySelector('[data-blueprint]');
  if (!host) return;

  let mode = null;
  let flow = null;

  const layout = () => {
    const next = host.clientWidth >= 640 ? 'h' : 'v';
    if (next === mode) return;
    mode = next;
    flow?.destroy();
    const d = mode === 'h' ? horizontal(host) : vertical(host);
    flow = new PacketFlow(d.svg, d.layers.packets);
    let k = 0;
    flow.emit({
      every: 800,
      speed: 0.26,
      route() {
        const i = k++ % 2; // AZ-1 then AZ-2
        this.onArrive = () => flash(d.targets[i]);
        const zone = Math.min(i, d.e.igw.length - 1);
        return [d.e.inet, d.e.igw[zone], d.e.nlb[zone], d.e.tg[i]];
      },
    });
  };
  layout();
  new ResizeObserver(layout).observe(host);
}
