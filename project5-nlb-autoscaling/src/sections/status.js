/** Project status indicator, rendered from src/data/project-status.js. */
import { PROJECT_STATUS } from '../data/project-status.js';

export function initStatus() {
  const list = document.querySelector('[data-project-status]');
  if (!list) return;
  list.innerHTML = PROJECT_STATUS.map(
    (s) => `<li class="status-row" data-state="${s.state}"><span class="status-row__key">${s.key}</span><span class="status-row__val">${s.value}</span></li>`,
  ).join('');
}
