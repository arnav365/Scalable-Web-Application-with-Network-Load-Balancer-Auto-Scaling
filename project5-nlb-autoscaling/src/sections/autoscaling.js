/**
 * "Capacity follows traffic" — front-end architecture simulation.
 * The slider changes only this page; it is never connected to AWS.
 */
import { iconSvg } from '../components/icons.js';
import { el } from '../components/svg.js';
import { PacketFlow } from '../animations/packets.js';

const LEVELS = [
  { name: 'Low', desired: 2, every: 1100 },
  { name: 'Normal', desired: 2, every: 650 },
  { name: 'High', desired: 3, every: 330 },
  { name: 'Peak', desired: 4, every: 170 },
];

// Launch order keeps the zones balanced: AZ-1, AZ-2, AZ-1, AZ-2
const INSTANCES = [
  { name: 'EC2-01', zone: 1 },
  { name: 'EC2-02', zone: 2 },
  { name: 'EC2-03', zone: 1 },
  { name: 'EC2-04', zone: 2 },
];

const MIN = 2;
const MAX = 4;

function clock() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

export function initAutoScaling() {
  const root = document.querySelector('[data-asg]');
  if (!root) return;

  const range = root.querySelector('[data-asg-range]');
  const levelOut = root.querySelector('[data-asg-level]');
  const desiredOut = root.querySelector('[data-asg-desired]');
  const runningOut = root.querySelector('[data-asg-running]');
  const activity = root.querySelector('[data-asg-activity]');
  const chain = [...root.querySelectorAll('[data-chain]')];
  const lane = root.querySelector('[data-asg-lane]');

  // ---- Slots ----
  const slots = INSTANCES.map((inst) => {
    const slot = document.createElement('div');
    slot.className = 'slot';
    slot.innerHTML = `
      <span class="slot__empty">Available capacity</span>
      <div class="slot__inst">
        <span class="slot__icon">${iconSvg('ec2')}</span>
        <span>
          <span class="slot__name">${inst.name}</span>
          <span class="slot__state"><span class="dot dot--healthy" aria-hidden="true"></span><span data-state>InService</span></span>
        </span>
      </div>`;
    root.querySelector(`[data-asg-zone="${inst.zone}"]`).appendChild(slot);
    return { ...inst, slot, stateEl: slot.querySelector('[data-state]'), timer: 0 };
  });

  // ---- Incoming traffic lane ----
  const { svg, layer, path } = buildLane(lane);
  const flow = new PacketFlow(svg, layer);
  let level = Number(range.value);
  flow.emit({ every: () => LEVELS[level].every, speed: 0.34, r: 3.5, route: () => [path] });

  let desired = LEVELS[level].desired;

  function log(msg) {
    const li = document.createElement('li');
    li.innerHTML = `<time>${clock()}</time>`;
    li.append(msg);
    activity.prepend(li);
    while (activity.children.length > 5) activity.lastElementChild.remove();
  }

  function setInstance(i, on, animate) {
    const s = slots[i];
    clearTimeout(s.timer);
    s.slot.classList.toggle('is-on', on);
    if (on && animate) {
      s.slot.classList.add('is-launching');
      s.stateEl.textContent = 'Pending';
      s.timer = setTimeout(() => {
        s.slot.classList.remove('is-launching');
        s.stateEl.textContent = 'InService';
        log(`${s.name} InService · registered with target group`);
      }, 1100);
    } else {
      s.slot.classList.remove('is-launching');
      s.stateEl.textContent = 'InService';
    }
  }

  function apply(next, animate = true) {
    const prev = desired;
    desired = Math.min(MAX, Math.max(MIN, next));
    for (let i = 0; i < MAX; i++) {
      const on = i < desired;
      const wasOn = i < prev;
      if (on !== wasOn || !animate) setInstance(i, on, animate && on);
    }
    if (animate && desired > prev) {
      for (let i = prev; i < desired; i++) log(`Launching ${slots[i].name} in AZ-${slots[i].zone} (desired ${prev} → ${desired})`);
    } else if (animate && desired < prev) {
      for (let i = prev - 1; i >= desired; i--) log(`Terminating ${slots[i].name} · deregistered from target group (desired ${prev} → ${desired})`);
    }
    desiredOut.textContent = desired;
    runningOut.textContent = desired;
    chain.forEach((c) => c.classList.toggle('is-current', Number(c.dataset.chain) === desired));
  }

  function onInput() {
    level = Number(range.value);
    const L = LEVELS[level];
    levelOut.textContent = L.name;
    range.style.setProperty('--fill', `${(level / 3) * 100}%`);
    range.setAttribute('aria-valuetext', `${L.name} traffic, ${L.desired} instances`);
    if (L.desired !== desired) apply(L.desired);
    else log(`Traffic ${L.name.toLowerCase()} · capacity unchanged at ${desired}`);
  }

  range.addEventListener('input', onInput);

  apply(desired, false);
  range.style.setProperty('--fill', `${(level / 3) * 100}%`);
  log(`Group at minimum capacity · ${desired} instances across 2 AZs`);
}

function buildLane(host) {
  const svg = el('svg', { class: 'diagram', viewBox: '0 0 600 40', 'aria-hidden': 'true' });
  el('text', { x: 0, y: 12, class: 'coord' }, svg).textContent = 'INCOMING TCP:80 → NLB';
  const path = el('path', { d: 'M0 26H600', class: 'edge', 'stroke-dasharray': '2 5' }, svg);
  const layer = el('g', {}, svg);
  host.appendChild(svg);
  return { svg, layer, path };
}
