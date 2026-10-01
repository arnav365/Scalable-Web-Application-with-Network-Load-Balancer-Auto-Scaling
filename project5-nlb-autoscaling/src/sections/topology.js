/**
 * Interactive network topology — the centrepiece diagram.
 *
 * Two layouts are generated from the same model: horizontal for wide
 * containers and a vertical "bus" layout for phones. Nodes are focusable
 * buttons; hover / focus previews a node, click / Enter pins it.
 */
import { diagram, node, edge, frame, el, txt, hCurve } from '../components/svg.js';
import { PacketFlow, flash } from '../animations/packets.js';
import { TOPOLOGY_NODES, TOPOLOGY_EDGES, BASELINE, EC2_IDS } from '../data/architecture.js';

const LAYOUTS = {
  h: {
    w: 1000,
    h: 500,
    frame: [764, 8, 230, 484],
    frameLabel: [778, 482],
    nodes: {
      internet: { x: 82, y: 250, w: 152, h: 60 },
      nlb: { x: 318, y: 250, w: 240, h: 72 },
      tg: { x: 572, y: 250, w: 228, h: 60 },
      asg: { x: 879, y: 46, w: 206, h: 50 },
      'ec2-1': { x: 879, y: 136, w: 206, h: 64 },
      'ec2-2': { x: 879, y: 226, w: 206, h: 64 },
      'ec2-3': { x: 879, y: 316, w: 206, h: 64 },
      'ec2-4': { x: 879, y: 406, w: 206, h: 64 },
    },
    path(a, b, n) {
      const A = n[a];
      const B = n[b];
      const x1 = A.x + A.w / 2;
      const x2 = B.x - B.w / 2 - 2;
      return A.y === B.y ? `M${x1} ${A.y}H${x2}` : hCurve(x1, A.y, x2, B.y);
    },
  },
  v: {
    w: 420,
    h: 720,
    frame: [12, 362, 396, 340],
    frameLabel: [26, 384],
    nodes: {
      internet: { x: 210, y: 44, w: 180, h: 56 },
      nlb: { x: 210, y: 162, w: 270, h: 68 },
      tg: { x: 210, y: 280, w: 244, h: 56 },
      'ec2-1': { x: 112, y: 446, w: 172, h: 64 },
      'ec2-2': { x: 308, y: 446, w: 172, h: 64 },
      'ec2-3': { x: 112, y: 556, w: 172, h: 64 },
      'ec2-4': { x: 308, y: 556, w: 172, h: 64 },
      asg: { x: 210, y: 652, w: 256, h: 46 },
    },
    path(a, b, n) {
      const A = n[a];
      const B = n[b];
      const y1 = A.y + A.h / 2;
      if (A.x === B.x) return `M${A.x} ${y1}V${B.y - B.h / 2 - 2}`;
      // Bus layout: trunk down the centre, branch sideways into the node
      const side = B.x < A.x ? B.x + B.w / 2 + 2 : B.x - B.w / 2 - 2;
      return `M${A.x} ${y1}V${B.y}H${side}`;
    },
  },
};

const DEFAULT_PANEL = `
  <span class="tag info__tag">Inspector</span>
  <h3 class="info__title">Select a component</h3>
  <p class="info__summary">Every node on the map is interactive.</p>
  <p class="topo__hint"><span class="topo__hint-key" aria-hidden="true">↖</span>Hover, tap, or tab to a node. Click or press Enter to pin it.</p>
  <dl class="info__specs">
    <div><dt>Path</dt><dd>Internet → NLB → TG → EC2</dd></div>
    <div><dt>Running</dt><dd>2 instances (desired)</dd></div>
    <div><dt>Scale-out room</dt><dd>+2 (max 4)</dd></div>
  </dl>`;

function relations(id) {
  const nodes = new Set([id]);
  const edges = new Set();
  TOPOLOGY_EDGES.forEach(([a, b], i) => {
    if (a === id || b === id) {
      nodes.add(a);
      nodes.add(b);
      edges.add(i);
    }
  });
  if (id === 'asg') EC2_IDS.forEach((e) => nodes.add(e));
  if (EC2_IDS.includes(id)) nodes.add('asg');
  return { nodes, edges };
}

function panelHtml(id) {
  const d = TOPOLOGY_NODES[id];
  const { nodes } = relations(id);
  nodes.delete(id);
  const links = [...nodes].map((n) => TOPOLOGY_NODES[n].label).join(', ');
  const specs = d.specs.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
  return `
    <span class="tag info__tag">${d.tag}</span>
    <h3 class="info__title">${d.title}</h3>
    <p class="info__summary">${d.summary}</p>
    <p class="info__desc">${d.desc}</p>
    <dl class="info__specs">${specs}</dl>
    <p class="info__links">Linked to: <strong>${links}</strong></p>`;
}

function build(host, panel, mode) {
  const L = LAYOUTS[mode];
  const { svg, layers, arrow } = diagram(host, {
    w: L.w,
    h: L.h,
    id: `topo-${mode}`,
    role: 'group',
    label: 'Interactive topology. Use Tab to move between components and Enter to pin details.',
  });

  // Auto Scaling Group boundary
  const frameGroup = el('g', { class: 'frame-group' }, layers.frames);
  frame(frameGroup, ...L.frame, 'frame--asg', 12);
  txt(frameGroup, ...L.frameLabel, 'SPANS AZ-1 + AZ-2', 'frame-label frame-label--amber');

  const nodes = {};
  for (const [id, pos] of Object.entries(L.nodes)) {
    const d = TOPOLOGY_NODES[id];
    nodes[id] = node(layers.nodes, {
      ...pos,
      label: d.label,
      sub: d.sub,
      icon: d.icon,
      status: d.status,
      cls: `topo-node ${d.cls || ''}`,
      attrs: {
        tabindex: 0,
        role: 'button',
        'data-id': id,
        'aria-pressed': 'false',
        'aria-label': `${d.title}. ${d.summary}`,
      },
    });
  }

  const edges = TOPOLOGY_EDGES.map(([a, b]) =>
    edge(layers.edges, L.path(a, b, L.nodes), BASELINE.includes(b) || !b.startsWith('ec2') ? 'edge--live' : 'edge--standby', arrow),
  );
  // Draw scale-out (dashed) edges beneath live ones where the bus layout overlaps them
  edges.filter((p) => p.classList.contains('edge--standby')).forEach((p) => layers.edges.prepend(p));
  const edgeTo = (b) => edges[TOPOLOGY_EDGES.findIndex(([, to]) => to === b)];

  // Simulated packets: Internet → NLB → TG → one of the baseline instances
  const flow = new PacketFlow(svg, layers.packets);
  let turn = 0;
  flow.emit({
    every: 760,
    speed: 0.24,
    route() {
      const target = BASELINE[turn++ % BASELINE.length];
      this.onArrive = () => flash(nodes[target]);
      return [edgeTo('nlb'), edgeTo('tg'), edgeTo(target)];
    },
  });

  // ---- Interaction ----
  let hovered = null;
  let pinned = null;

  function render() {
    const id = hovered || pinned;
    svg.classList.toggle('has-active', Boolean(id));
    Object.entries(nodes).forEach(([nid, g]) => {
      g.classList.remove('is-active', 'is-linked');
      g.setAttribute('aria-pressed', String(nid === pinned));
    });
    edges.forEach((p) => p.classList.remove('is-linked'));
    frameGroup.classList.remove('is-linked');

    if (!id) {
      panel.innerHTML = DEFAULT_PANEL;
      return;
    }
    const rel = relations(id);
    rel.nodes.forEach((n) => nodes[n].classList.add(n === id ? 'is-active' : 'is-linked'));
    rel.edges.forEach((i) => edges[i].classList.add('is-linked'));
    if (rel.nodes.has('asg')) frameGroup.classList.add('is-linked');
    panel.innerHTML = panelHtml(id);
  }

  const idOf = (evt) => evt.target.closest?.('.topo-node')?.dataset.id;

  svg.addEventListener('pointerover', (e) => {
    const id = idOf(e);
    if (id && id !== hovered) {
      hovered = id;
      render();
    }
  });
  svg.addEventListener('pointerout', (e) => {
    if (idOf(e) && !e.relatedTarget?.closest?.(`[data-id="${idOf(e)}"]`)) {
      hovered = null;
      render();
    }
  });
  svg.addEventListener('focusin', (e) => {
    hovered = idOf(e) || null;
    render();
  });
  svg.addEventListener('focusout', () => {
    hovered = null;
    render();
  });
  svg.addEventListener('click', (e) => {
    const id = idOf(e);
    pinned = id && id !== pinned ? id : null;
    render();
  });
  svg.addEventListener('keydown', (e) => {
    const id = idOf(e);
    if (!id) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      pinned = id !== pinned ? id : null;
      render();
    } else if (e.key === 'Escape') {
      pinned = null;
      render();
    }
  });

  render();
  return { flow };
}

export function initTopology() {
  const host = document.querySelector('[data-topology]');
  const panel = document.querySelector('[data-topo-panel]');
  if (!host || !panel) return;

  let mode = null;
  let current = null;
  const layout = () => {
    const next = host.clientWidth >= 620 ? 'h' : 'v';
    if (next === mode) return;
    mode = next;
    current?.flow.destroy();
    current = build(host, panel, mode);
  };
  layout();
  new ResizeObserver(layout).observe(host);
}
