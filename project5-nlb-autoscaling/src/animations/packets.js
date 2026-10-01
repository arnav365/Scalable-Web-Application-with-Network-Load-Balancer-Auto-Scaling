/**
 * PacketFlow — moves small "packet" circles along chains of SVG paths.
 *
 * - One requestAnimationFrame loop per diagram, only while the diagram is
 *   on screen, the tab is visible, and motion is enabled.
 * - Packets are positioned with a single `transform` attribute write per frame.
 * - Path lengths are measured once and cached.
 */
import { motion } from './motion.js';
import { el } from '../components/svg.js';

const lengths = new WeakMap();
const lengthOf = (path) => {
  let l = lengths.get(path);
  if (l === undefined) {
    l = path.getTotalLength();
    lengths.set(path, l);
  }
  return l;
};

export class PacketFlow {
  /**
   * @param {SVGSVGElement} svg   diagram root (observed for visibility)
   * @param {SVGGElement}  layer  group packets are drawn into
   */
  constructor(svg, layer) {
    this.svg = svg;
    this.layer = layer;
    this.packets = new Set();
    this.emitters = [];
    this.inView = false;
    this.raf = 0;
    this.last = 0;
    this.frame = this.frame.bind(this);
    this.sync = this.sync.bind(this);

    this.io = new IntersectionObserver(
      ([entry]) => {
        this.inView = entry.isIntersecting;
        this.sync();
      },
      { rootMargin: '80px' },
    );
    this.io.observe(svg);
    this.unsubscribe = motion.subscribe(this.sync);
    document.addEventListener('visibilitychange', this.sync);
  }

  get running() {
    return this.inView && motion.enabled && !document.hidden;
  }

  /**
   * Register a periodic emitter.
   * @param {object} o
   * @param {number|() => number} o.every  interval in ms
   * @param {() => SVGPathElement[]|null} o.route  path chain for the next packet
   */
  emit(o) {
    const emitter = { enabled: true, t: 0, speed: 0.18, r: 4, ...o };
    this.emitters.push(emitter);
    return emitter;
  }

  /**
   * Launch a single packet along a chain of paths.
   * Returns false when animation is not running, so callers can fall back
   * to an instant result (e.g. with reduced motion).
   */
  spawn(paths, { speed = 0.18, r = 4, cls = 'pkt', delay = 0, onArrive } = {}) {
    if (!this.running || !paths?.length) return false;
    const segs = paths.map((path) => ({ path, l: lengthOf(path) }));
    const total = segs.reduce((sum, s) => sum + s.l, 0);
    const node = el('circle', { r, class: cls, visibility: 'hidden' }, this.layer);
    this.packets.add({ node, segs, total, d: -delay * speed, speed, onArrive });
    return true;
  }

  sync() {
    if (this.running) {
      if (!this.raf) {
        this.last = performance.now();
        this.raf = requestAnimationFrame(this.frame);
      }
    } else {
      if (this.raf) cancelAnimationFrame(this.raf);
      this.raf = 0;
      if (!motion.enabled) this.clear();
    }
  }

  frame(now) {
    const dt = Math.min(now - this.last, 64); // avoid jumps after a stall
    this.last = now;

    for (const e of this.emitters) {
      if (!e.enabled) continue;
      e.t += dt;
      const every = typeof e.every === 'function' ? e.every() : e.every;
      if (e.t >= every) {
        e.t = 0;
        const route = e.route();
        if (route) this.spawn(route, e);
      }
    }

    for (const p of this.packets) {
      p.d += p.speed * dt;
      if (p.d < 0) continue;
      if (p.d >= p.total) {
        p.node.remove();
        this.packets.delete(p);
        p.onArrive?.();
        continue;
      }
      let d = p.d;
      for (const s of p.segs) {
        if (d <= s.l) {
          const pt = s.path.getPointAtLength(d);
          p.node.setAttribute('transform', `translate(${pt.x.toFixed(1)} ${pt.y.toFixed(1)})`);
          break;
        }
        d -= s.l;
      }
      p.node.removeAttribute('visibility');
    }

    this.raf = requestAnimationFrame(this.frame);
  }

  clear() {
    this.packets.forEach((p) => p.node.remove());
    this.packets.clear();
  }

  destroy() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.clear();
    this.io.disconnect();
    this.unsubscribe();
    document.removeEventListener('visibilitychange', this.sync);
  }
}

/** Briefly flag a node as "hit" when a packet arrives. */
export function flash(node, ms = 320) {
  if (!node) return;
  node.classList.add('is-hit');
  clearTimeout(node._hitTimer);
  node._hitTimer = setTimeout(() => node.classList.remove('is-hit'), ms);
}
