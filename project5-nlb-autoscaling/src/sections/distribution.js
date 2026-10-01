/**
 * Load distribution — simulated request stream through the NLB.
 *
 * Each simulated request gets a random ephemeral source port. The target is
 * picked with a hash of that flow (like an NLB's flow hash), so traffic is
 * spread evenly over many requests but is not strict round-robin.
 *
 * "Probe live NLB" fetches /instance.json from the origin serving this page.
 * That only succeeds when the page is served by EC2 instances behind the NLB
 * (see scripts/deployment/user-data.sh); otherwise it reports that clearly.
 */
import { diagram, node, edge, hCurve } from '../components/svg.js';
import { PacketFlow, flash } from '../animations/packets.js';
import { LIVE_ENDPOINT } from '../data/instances.js';
import { applyLiveInstance } from './instances.js';

const TARGETS = ['EC2-01', 'EC2-02'];
const MAX_ROWS = 40;
const STREAM_MS = 650;

function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

const pad = (n) => String(n).padStart(3, '0');
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export function initDistribution() {
  const root = document.querySelector('[data-distribution]');
  if (!root) return;

  const $ = (sel) => root.querySelector(sel);
  const canvas = $('[data-dist-canvas]');
  const log = $('[data-dist-log]');
  const totalEl = $('[data-dist-total]');
  const summary = $('[data-dist-summary]');
  const note = $('[data-dist-note]');
  const modeTag = $('[data-dist-mode]');
  const toggleBtn = $('[data-dist-toggle]');
  const burstBtn = $('[data-dist-burst]');
  const resetBtn = $('[data-dist-reset]');
  const probeBtn = $('[data-dist-probe]');
  const counters = TARGETS.map((name) => {
    const c = root.querySelector(`[data-counter="${name}"]`);
    return { bar: c.querySelector('[data-counter-bar]'), val: c.querySelector('[data-counter-val]'), pct: c.querySelector('[data-counter-pct]') };
  });

  // ---- Diagram ----
  const { svg, layers, arrow } = diagram(canvas, {
    w: 640,
    h: 250,
    id: 'dist',
    label: 'Simulated clients send requests to the Network Load Balancer, which forwards each flow to EC2-01 or EC2-02.',
  });
  node(layers.nodes, { x: 80, y: 125, w: 134, h: 54, label: 'Clients', sub: 'SIMULATED', icon: 'user' });
  node(layers.nodes, { x: 300, y: 125, w: 180, h: 62, label: 'NLB', sub: 'TCP:80 · FLOW HASH', icon: 'nlb', cls: 'n--key' });
  const targets = [
    node(layers.nodes, { x: 543, y: 62, w: 170, h: 58, label: 'EC2-01', sub: 'AZ-1', icon: 'ec2', status: true }),
    node(layers.nodes, { x: 543, y: 188, w: 170, h: 58, label: 'EC2-02', sub: 'AZ-2', icon: 'ec2', status: true }),
  ];
  const eIn = edge(layers.edges, 'M147 125H208', 'edge--live', arrow);
  const eOut = [
    edge(layers.edges, hCurve(390, 125, 456, 62), 'edge--live', arrow),
    edge(layers.edges, hCurve(390, 125, 456, 188), 'edge--live', arrow),
  ];
  const flow = new PacketFlow(svg, layers.packets);

  // ---- State ----
  let seq = 0;
  let counts = [0, 0];
  let streamTimer = 0;
  let inView = false;
  let pendingBurst = 0;

  function renderCounts() {
    const total = counts[0] + counts[1];
    totalEl.textContent = total;
    counters.forEach((c, i) => {
      const share = total ? counts[i] / total : 0;
      c.val.textContent = counts[i];
      c.pct.textContent = `${Math.round(share * 100)}%`;
      c.bar.style.transform = `scaleX(${share})`;
    });
  }

  function addRow({ id, src, target, kind }) {
    log.querySelector('.log__empty')?.remove();
    const li = document.createElement('li');
    li.className = 'log__row';
    li.innerHTML = `
      <span class="log__id">${esc(id)}</span>
      <span class="log__src">${esc(src)}</span>
      <span class="log__path">→ NLB → <b>${esc(target)}</b></span>
      <span class="log__kind${kind === 'LIVE' ? ' log__kind--live' : ''}">${kind}</span>`;
    log.prepend(li);
    while (log.children.length > MAX_ROWS) log.lastElementChild.remove();
  }

  function emptyLog() {
    log.innerHTML = '<li class="log__empty">No requests yet — start the stream or send a burst.</li>';
  }

  function announce() {
    const total = counts[0] + counts[1];
    summary.textContent = `${total} simulated requests: EC2-01 received ${counts[0]}, EC2-02 received ${counts[1]}.`;
  }

  function send(delay = 0) {
    const n = ++seq;
    const port = 49152 + Math.floor(Math.random() * 16384);
    const t = fnv1a(`tcp|client:${port}|nlb:80`) % TARGETS.length;
    const done = () => {
      counts[t]++;
      renderCounts();
      addRow({ id: `#${pad(n)}`, src: `src :${port}`, target: TARGETS[t], kind: 'SIM' });
      if (pendingBurst > 0 && --pendingBurst === 0) announce();
    };
    const animated = flow.spawn([eIn, eOut[t]], {
      speed: 0.32,
      delay,
      onArrive: () => {
        flash(targets[t]);
        done();
      },
    });
    if (!animated) done();
  }

  // ---- Stream control ----
  function setStreaming(on) {
    clearInterval(streamTimer);
    streamTimer = 0;
    toggleBtn.setAttribute('aria-pressed', String(on));
    toggleBtn.textContent = on ? 'Pause stream' : 'Start stream';
    if (on) {
      send();
      streamTimer = setInterval(() => inView && send(), STREAM_MS);
    } else if (seq) {
      announce();
    }
  }

  toggleBtn.addEventListener('click', () => setStreaming(!streamTimer));
  burstBtn.addEventListener('click', () => {
    pendingBurst += 10;
    for (let i = 0; i < 10; i++) send(i * 140);
  });
  resetBtn.addEventListener('click', () => {
    setStreaming(false);
    flow.clear();
    seq = 0;
    pendingBurst = 0;
    counts = [0, 0];
    renderCounts();
    emptyLog();
    summary.textContent = 'Simulation reset.';
  });

  new IntersectionObserver(([e]) => {
    inView = e.isIntersecting;
  }).observe(root);

  // ---- Live probe (real data only) ----
  probeBtn.addEventListener('click', async () => {
    probeBtn.disabled = true;
    note.className = 'dist__note';
    note.textContent = `Probing /${LIVE_ENDPOINT} …`;
    const seen = new Set();
    let ok = 0;
    for (let i = 0; i < 8; i++) {
      try {
        const res = await fetch(`${LIVE_ENDPOINT}?probe=${Date.now()}-${i}`, { cache: 'no-store' });
        if (!res.ok) break;
        const data = await res.json();
        if (!data || typeof data.instance_id !== 'string') break;
        ok++;
        seen.add(data.instance_id);
        const slot = applyLiveInstance(data) || data.instance_id;
        addRow({ id: 'LIVE', src: data.availability_zone || '', target: `${slot} (${data.instance_id})`, kind: 'LIVE' });
      } catch {
        break;
      }
    }
    probeBtn.disabled = false;
    if (ok) {
      modeTag.className = 'tag tag--live';
      modeTag.textContent = 'Live probe + simulation';
      note.className = 'dist__note is-live';
      note.textContent = `${ok} live responses from ${seen.size} instance${seen.size > 1 ? 's' : ''}. Browsers reuse one keep-alive TCP connection, so a single tab often sees one instance — use the curl loop in the Traffic test commands to see the flow hash spread connections.`;
    } else {
      note.className = 'dist__note is-warn';
      note.textContent = `Live probe unavailable: /${LIVE_ENDPOINT} was not found. This page is not being served by EC2 instances behind the NLB yet, so only the simulation is shown.`;
    }
  });

  emptyLog();
  renderCounts();
}
