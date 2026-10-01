/**
 * EC2 server tiles.
 *
 * Rendered from INSTANCE_SLOTS as clearly-labelled demo data. When a live
 * probe returns a real /instance.json payload, the next free tile is
 * replaced with the real values and relabelled "Live".
 */
import { INSTANCE_SLOTS, INSTANCE_DEFAULTS } from '../data/instances.js';

const liveIds = new Map(); // instance_id → tile index

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function rows(list) {
  return list
    .map(([k, v, muted]) => `<div><dt>${k}</dt><dd${muted ? ' class="is-muted"' : ''} title="${esc(v)}">${esc(v)}</dd></div>`)
    .join('');
}

function demoTile(s) {
  const standby = s.state === 'standby';
  return `
    <li class="tile" data-state="${s.state}">
      <div class="tile__inner">
        <div class="tile__leds">
          <span class="tile__health"><span class="dot ${standby ? 'dot--scale' : 'dot--healthy'}" aria-hidden="true"></span>${standby ? 'Standby' : 'Healthy'}</span>
          <span class="tile__vent" aria-hidden="true"></span>
        </div>
        <div class="tile__body">
          <p class="tile__name">${s.slot}</p>
          <p class="tile__os">${INSTANCE_DEFAULTS.type} · ${s.role}</p>
        </div>
        <dl class="tile__rows">
          ${rows([
            ['Instance ID', standby ? 'not launched' : 'assigned at launch', true],
            ['Status', standby ? 'Not launched' : 'Active'],
            ['Zone', `${s.az} · ${s.subnet}`],
            ['OS', INSTANCE_DEFAULTS.os],
            ['Web server', INSTANCE_DEFAULTS.webServer],
            ['Port', INSTANCE_DEFAULTS.port],
            ['Health', standby ? 'n/a until launched' : 'Healthy (simulated)', standby],
          ])}
        </dl>
        <p class="tile__src">Source · demo data</p>
      </div>
    </li>`;
}

function liveTile(slot, d) {
  return `
    <li class="tile" data-state="live">
      <div class="tile__inner">
        <div class="tile__leds">
          <span class="tile__health"><span class="dot dot--healthy" aria-hidden="true"></span>Responding</span>
          <span class="tile__vent" aria-hidden="true"></span>
        </div>
        <div class="tile__body">
          <p class="tile__name">${slot}</p>
          <p class="tile__os">${esc(d.instance_type || INSTANCE_DEFAULTS.type)} · reported by instance</p>
        </div>
        <dl class="tile__rows">
          ${rows([
            ['Instance ID', d.instance_id],
            ['Status', 'Served via NLB'],
            ['Zone', d.availability_zone || 'unknown'],
            ['Private IP', d.private_ip || 'unknown'],
            ['OS', d.os || INSTANCE_DEFAULTS.os],
            ['Web server', d.web_server || INSTANCE_DEFAULTS.webServer],
            ['Port', INSTANCE_DEFAULTS.port],
          ])}
        </dl>
        <p class="tile__src">Source · live /instance.json</p>
      </div>
    </li>`;
}

export function initInstances() {
  const list = document.querySelector('[data-tiles]');
  if (!list) return;
  list.innerHTML = INSTANCE_SLOTS.map(demoTile).join('');
}

/** Apply a real /instance.json payload to the tiles. Returns the slot name used. */
export function applyLiveInstance(data) {
  const list = document.querySelector('[data-tiles]');
  if (!list || !data?.instance_id) return null;

  let index = liveIds.get(data.instance_id);
  if (index === undefined) {
    index = liveIds.size;
    if (index >= INSTANCE_SLOTS.length) return null;
    liveIds.set(data.instance_id, index);
  }
  const slot = INSTANCE_SLOTS[index].slot;
  const tile = list.children[index];
  if (tile) tile.outerHTML = liveTile(slot, data);

  const source = document.querySelector('[data-tiles-source]');
  if (source) {
    source.className = 'tag tag--live';
    source.textContent = `Live · ${liveIds.size} instance${liveIds.size > 1 ? 's' : ''} reported`;
  }
  return slot;
}
