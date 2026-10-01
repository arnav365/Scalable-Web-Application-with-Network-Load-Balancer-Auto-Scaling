/**
 * Small SVG builder used by every diagram on the page.
 * Coordinates are in the diagram's own viewBox units; nodes are positioned
 * by their centre point.
 */
import { ICONS } from './icons.js';

export const NS = 'http://www.w3.org/2000/svg';

export function el(tag, attrs = {}, parent) {
  const node = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v !== undefined && v !== null && v !== false) node.setAttribute(k, v);
  }
  if (parent) parent.appendChild(node);
  return node;
}

export function txt(parent, x, y, content, cls, attrs = {}) {
  const t = el('text', { x, y, class: cls, ...attrs }, parent);
  t.textContent = content;
  return t;
}

/** Create the root <svg> for a diagram, with arrowhead marker and layers. */
export function diagram(container, { w, h, id, label, role = 'img' }) {
  container.textContent = '';
  const svg = el('svg', {
    class: 'diagram',
    viewBox: `0 0 ${w} ${h}`,
    role,
    'aria-label': label,
  });
  const defs = el('defs', {}, svg);
  const marker = el(
    'marker',
    { id: `${id}-arrow`, viewBox: '0 0 8 8', refX: 7, refY: 4, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' },
    defs,
  );
  el('path', { d: 'M0 0.8 7 4 0 7.2z', class: 'edge-end' }, marker);

  const layers = {
    frames: el('g', { class: 'layer-frames' }, svg),
    edges: el('g', { class: 'layer-edges' }, svg),
    packets: el('g', { class: 'layer-packets' }, svg),
    nodes: el('g', { class: 'layer-nodes' }, svg),
  };
  container.appendChild(svg);
  return { svg, layers, arrow: `url(#${id}-arrow)` };
}

/**
 * Draw a node. Returns the <g>.
 * @param {object} o  { x, y, w, h, label, sub, icon, cls, status, attrs }
 */
export function node(parent, o) {
  const { x, y, w, h, label, sub, icon, cls = '', status, attrs = {} } = o;
  const g = el('g', { class: `n ${cls}`.trim(), ...attrs }, parent);
  el('rect', { class: 'n__box', x: x - w / 2, y: y - h / 2, width: w, height: h, rx: 6 }, g);

  const hasIcon = icon && ICONS[icon];
  if (hasIcon) {
    const ig = el('g', { class: 'n__icon', transform: `translate(${x - w / 2 + 14} ${y - 12})` }, g);
    ig.innerHTML = ICONS[icon];
  }

  const tx = hasIcon ? x - w / 2 + 48 : x;
  const anchor = hasIcon ? 'start' : 'middle';
  const ly = sub ? y - 2 : y + 5;
  txt(g, tx, ly, label, 'n__label', { 'text-anchor': anchor });
  if (sub) txt(g, tx, y + 14, sub, 'n__sub', { 'text-anchor': anchor });

  if (status) {
    el('circle', { class: 'n__status', cx: x + w / 2 - 11, cy: y - h / 2 + 11, r: 4 }, g);
  }
  return g;
}

export function edge(parent, d, cls = '', marker) {
  return el('path', { d, class: `edge ${cls}`.trim(), 'marker-end': marker }, parent);
}

export function frame(parent, x, y, w, h, cls = '', rx = 10) {
  return el('rect', { x, y, width: w, height: h, rx, class: `frame ${cls}`.trim() }, parent);
}

/** Vertical S-curve between two points (top → bottom). */
export const vCurve = (x1, y1, x2, y2) => {
  const my = (y1 + y2) / 2;
  return `M${x1} ${y1}C${x1} ${my} ${x2} ${my} ${x2} ${y2}`;
};

/** Horizontal S-curve between two points (left → right). */
export const hCurve = (x1, y1, x2, y2) => {
  const mx = (x1 + x2) / 2;
  return `M${x1} ${y1}C${mx} ${y1} ${mx} ${y2} ${x2} ${y2}`;
};
