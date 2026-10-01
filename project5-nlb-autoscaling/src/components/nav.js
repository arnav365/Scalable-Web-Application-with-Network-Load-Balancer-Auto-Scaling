/**
 * Floating navigation: compact-on-scroll, accessible mobile menu,
 * and active-section tracking for both the nav and the story rail.
 */

export function initNav() {
  const nav = document.querySelector('[data-nav]');
  if (!nav) return;
  const toggle = nav.querySelector('[data-nav-toggle]');
  const menu = nav.querySelector('#nav-menu');
  const toggleLabel = toggle.querySelector('.visually-hidden');

  // ---- Compact state ----
  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      nav.classList.toggle('is-compact', window.scrollY > 40);
      ticking = false;
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // ---- Mobile menu ----
  const setOpen = (open, { focusToggle = false } = {}) => {
    nav.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggleLabel.textContent = open ? 'Close menu' : 'Open menu';
    if (open) menu.querySelector('a')?.focus();
    else if (focusToggle) toggle.focus();
  };

  toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
  menu.addEventListener('click', (e) => {
    if (e.target.closest('a')) setOpen(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) setOpen(false, { focusToggle: true });
  });
  document.addEventListener('click', (e) => {
    if (nav.classList.contains('is-open') && !nav.contains(e.target)) setOpen(false);
  });
  window.matchMedia('(min-width: 961px)').addEventListener('change', (mq) => mq.matches && setOpen(false));

  // ---- Active section ----
  const navLinks = [...document.querySelectorAll('[data-nav-link]')];
  const railLinks = [...document.querySelectorAll('[data-rail-link]')];
  const chapters = [...document.querySelectorAll('[data-chapter]')];
  const order = chapters.map((c) => c.id);

  const setActive = (id) => {
    const navIds = navLinks.map((a) => a.hash.slice(1));
    // Chapters without a nav entry (blueprint, summary) keep the nearest previous one lit
    let navId = id;
    for (let i = order.indexOf(id); i >= 0 && !navIds.includes(navId); i--) navId = order[i];
    navLinks.forEach((a) => a.setAttribute('aria-current', String(a.hash === `#${navId}`)));
    const idx = order.indexOf(id);
    railLinks.forEach((a) => {
      const i = order.indexOf(a.hash.slice(1));
      a.setAttribute('aria-current', String(i === idx));
      a.classList.toggle('is-past', i < idx);
    });
  };

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => e.isIntersecting && setActive(e.target.id));
    },
    { rootMargin: '-45% 0px -50% 0px' },
  );
  chapters.forEach((c) => io.observe(c));
  setActive(order[0]);
}
