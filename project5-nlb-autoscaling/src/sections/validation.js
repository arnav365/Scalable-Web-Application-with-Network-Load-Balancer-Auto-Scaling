/**
 * Validation checklist. All items start as "Pending validation".
 * The presenter marks items after testing a real deployment; marks are kept
 * in this browser only and are never presented as automated results.
 */
import { VALIDATION_ITEMS } from '../data/validation.js';

const KEY = 'p5-validation';

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    return {};
  }
}

function save(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable — marks last for this page view */
  }
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function initValidation() {
  const root = document.querySelector('[data-validation]');
  if (!root) return;
  const list = root.querySelector('[data-validate-list]');
  const countEl = root.querySelector('[data-validate-count]');
  const bar = root.querySelector('[data-validate-bar]');
  const resetBtn = root.querySelector('[data-validate-reset]');
  let state = load();

  list.innerHTML = VALIDATION_ITEMS.map(
    (item) => `
    <li class="check" data-id="${item.id}" data-state="pending">
      <button class="check__btn" type="button" aria-pressed="false">
        <span class="check__box" aria-hidden="true">✓</span>
        <span>
          <span class="check__label">${esc(item.label)}</span>
          <span class="check__how">${esc(item.how)}</span>
        </span>
        <span class="check__state">Pending validation</span>
      </button>
    </li>`,
  ).join('');

  function render() {
    let done = 0;
    list.querySelectorAll('.check').forEach((li) => {
      const verified = state[li.dataset.id] === 'verified';
      if (verified) done++;
      li.dataset.state = verified ? 'verified' : 'pending';
      li.querySelector('.check__btn').setAttribute('aria-pressed', String(verified));
      li.querySelector('.check__state').textContent = verified ? 'Verified by presenter' : 'Pending validation';
    });
    countEl.textContent = done;
    bar.style.transform = `scaleX(${done / VALIDATION_ITEMS.length})`;
  }

  list.addEventListener('click', (e) => {
    const li = e.target.closest('.check');
    if (!li) return;
    const id = li.dataset.id;
    if (state[id] === 'verified') delete state[id];
    else state[id] = 'verified';
    save(state);
    render();
  });

  resetBtn.addEventListener('click', () => {
    state = {};
    save(state);
    render();
  });

  render();
}
