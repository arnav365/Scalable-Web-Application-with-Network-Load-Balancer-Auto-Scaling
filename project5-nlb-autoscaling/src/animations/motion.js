/**
 * Global motion preference.
 *
 * Defaults to the OS `prefers-reduced-motion` setting. The Motion button in the
 * navigation lets a visitor override it either way (and pause all continuous
 * animation — WCAG 2.2.2). The choice is remembered per browser.
 */

const STORAGE_KEY = 'p5-motion';
const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
const listeners = new Set();

function readStored() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === 'on' || v === 'off' ? v : null;
  } catch {
    return null;
  }
}

let userChoice = readStored();

function compute() {
  if (userChoice) return userChoice === 'on';
  return !mq.matches;
}

let enabled = compute();

function apply() {
  enabled = compute();
  document.documentElement.dataset.motion = enabled ? 'on' : 'off';
  listeners.forEach((fn) => fn(enabled));
}

mq.addEventListener('change', apply);

export const motion = {
  get enabled() {
    return enabled;
  },
  toggle() {
    userChoice = enabled ? 'off' : 'on';
    try {
      localStorage.setItem(STORAGE_KEY, userChoice);
    } catch {
      /* storage unavailable — preference lasts for this page view */
    }
    apply();
  },
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};

export function initMotionToggle() {
  apply();
  const btn = document.querySelector('[data-motion-toggle]');
  if (!btn) return;
  const sync = (on) => {
    btn.setAttribute('aria-pressed', String(on));
    btn.setAttribute('aria-label', on ? 'Pause animations' : 'Play animations');
    btn.title = on ? 'Pause animations' : 'Play animations';
  };
  sync(enabled);
  motion.subscribe(sync);
  btn.addEventListener('click', () => motion.toggle());
}
