/**
 * Line icons drawn on a 24×24 grid with a 1.5 stroke.
 * Original drawings (not AWS trademark artwork).
 */
export const ICONS = {
  user: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c0-3.9 3.1-6.5 7-6.5s7 2.6 7 6.5"/>',
  internet:
    '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.8 3.8 5.8 3.8 9s-1.2 6.2-3.8 9c-2.6-2.8-3.8-5.8-3.8-9S9.4 5.8 12 3z"/>',
  nlb:
    '<circle cx="4.5" cy="12" r="2"/><path d="M6.5 12H10m0 0 7-6.5M10 12h7m-7 0 7 6.5"/><circle cx="19" cy="5" r="2"/><circle cx="19" cy="12" r="2"/><circle cx="19" cy="19" r="2"/>',
  tg: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" class="fill"/>',
  ec2:
    '<rect x="6" y="6" width="12" height="12" rx="2"/><rect x="9.5" y="9.5" width="5" height="5" rx="1"/><path d="M9 3v3M12 3v3M15 3v3M9 18v3M12 18v3M15 18v3M3 9h3M3 12h3M3 15h3M18 9h3M18 12h3M18 15h3"/>',
  asg:
    '<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/><rect x="8.5" y="8.5" width="7" height="7" rx="1.5"/>',
  vpc:
    '<rect x="3" y="4.5" width="18" height="15" rx="2" stroke-dasharray="3 2.2"/><rect x="6" y="8.5" width="5" height="7" rx="1"/><rect x="13" y="8.5" width="5" height="7" rx="1"/>',
  sg: '<path d="M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6z"/><path d="M9 12l2 2 4-4"/>',
  igw: '<path d="M4 20V9l8-5 8 5v11"/><path d="M9 20v-6h6v6"/>',
};

/** Full inline SVG string for HTML contexts. */
export function iconSvg(name) {
  const body = ICONS[name];
  if (!body) return '';
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;
}

/** Fill every `[data-icon]` placeholder in the static markup. */
export function hydrateIcons(root = document) {
  root.querySelectorAll('[data-icon]').forEach((node) => {
    if (!node.firstElementChild) node.innerHTML = iconSvg(node.dataset.icon);
  });
}
