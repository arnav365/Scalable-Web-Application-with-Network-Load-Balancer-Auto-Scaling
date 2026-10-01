/**
 * Hero visual — vertical request path drawn like an engineering sheet:
 * USER → INTERNET → NLB → TARGET GROUP → EC2 ×3, with simulated packets.
 */
import { diagram, node, edge, el, txt, vCurve } from '../components/svg.js';
import { PacketFlow, flash } from '../animations/packets.js';

const W = 520;
const H = 610;
const CX = 260;

const TIERS = [
  { y: 44, code: 'T0', name: 'CLIENT' },
  { y: 148, code: 'T1', name: 'EDGE' },
  { y: 268, code: 'T2', name: 'LAYER 4' },
  { y: 388, code: 'T3', name: 'ROUTING' },
  { y: 540, code: 'T4', name: 'COMPUTE' },
];

export function initHero() {
  const host = document.querySelector('[data-hero-topology]');
  if (!host) return;

  const { svg, layers, arrow } = diagram(host, {
    w: W,
    h: H,
    id: 'hero',
    label: 'Request path: user, internet, Network Load Balancer on TCP port 80, target group, and three EC2 instances. The third instance is scale-out capacity.',
  });

  // Tier guides — dotted rules with tier codes on the right margin
  TIERS.slice(0, 4).forEach((t) => {
    el('line', { x1: 392, y1: t.y, x2: 452, y2: t.y, class: 'edge', 'stroke-dasharray': '1 4' }, layers.frames);
    txt(layers.frames, W - 6, t.y - 3, t.code, 'coord', { 'text-anchor': 'end' });
    txt(layers.frames, W - 6, t.y + 9, t.name, 'coord', { 'text-anchor': 'end' });
  });
  txt(layers.frames, 8, 478, 'T4 · COMPUTE', 'coord');

  node(layers.nodes, { x: CX, y: 44, w: 132, h: 44, label: 'User', icon: 'user' });
  node(layers.nodes, { x: CX, y: 148, w: 176, h: 52, label: 'Internet', sub: 'PUBLIC DNS', icon: 'internet' });
  node(layers.nodes, { x: CX, y: 268, w: 244, h: 64, label: 'Network Load Balancer', sub: 'TCP : 80', icon: 'nlb', cls: 'n--key' });
  node(layers.nodes, { x: CX, y: 388, w: 206, h: 52, label: 'Target Group', sub: 'HEALTHY TARGETS', icon: 'tg' });

  const ec2 = [
    { x: 92, label: 'EC2-01', sub: 'AZ-1 · HEALTHY' },
    { x: 260, label: 'EC2-02', sub: 'AZ-2 · HEALTHY' },
    { x: 428, label: 'EC2-03', sub: 'SCALE-OUT', cls: 'n--standby' },
  ].map((o) => node(layers.nodes, { ...o, y: 540, w: 156, h: 64, icon: 'ec2', status: true }));

  const e = {
    user: edge(layers.edges, `M${CX} 66V122`, 'edge--live', arrow),
    internet: edge(layers.edges, `M${CX} 174V236`, 'edge--live', arrow),
    nlb: edge(layers.edges, `M${CX} 300V362`, 'edge--live', arrow),
    tg: [
      edge(layers.edges, vCurve(CX, 414, 92, 508), 'edge--live', arrow),
      edge(layers.edges, vCurve(CX, 414, 260, 508), 'edge--live', arrow),
      edge(layers.edges, vCurve(CX, 414, 428, 508), 'edge--standby', arrow),
    ],
  };

  // Dimension annotation beside the NLB
  el('path', { d: 'M110 240v56M106 240h8M106 296h8', class: 'edge' }, layers.frames);
  txt(layers.frames, 100, 272, 'L4', 'coord', { 'text-anchor': 'end' });

  const flow = new PacketFlow(svg, layers.packets);
  let turn = 0;
  flow.emit({
    every: 720,
    speed: 0.2,
    r: 4,
    route() {
      const i = turn++ % 2; // baseline capacity: EC2-01 and EC2-02
      this.onArrive = () => flash(ec2[i]);
      return [e.user, e.internet, e.nlb, e.tg[i]];
    },
  });
}
