/**
 * Deployment section: accessible tabs (WAI-ARIA tabs pattern),
 * copy-to-clipboard for code blocks, and a scroll-linked timeline rail.
 */

function initTabs(root) {
  const tabs = [...root.querySelectorAll('[role="tab"]')];
  const select = (tab, focus = true) => {
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
    });
    if (focus) tab.focus();
  };

  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => select(tab, false));
    tab.addEventListener('keydown', (e) => {
      const moves = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 };
      if (!(e.key in moves)) return;
      e.preventDefault();
      select(tabs[(moves[e.key] + tabs.length) % tabs.length]);
    });
  });
}

async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  ta.remove();
}

function initCopy() {
  document.querySelectorAll('[data-copy]').forEach((btn) => {
    btn.setAttribute('aria-label', 'Copy commands to clipboard');
    btn.addEventListener('click', async () => {
      const code = btn.closest('.code').querySelector('pre code');
      try {
        await copyText(code.innerText.trim());
        btn.textContent = 'Copied';
        btn.classList.add('is-done');
      } catch {
        btn.textContent = 'Press Ctrl+C';
      }
      setTimeout(() => {
        btn.textContent = 'Copy';
        btn.classList.remove('is-done');
      }, 1800);
    });
  });
}

function initTimeline() {
  const line = document.querySelector('.timeline');
  if (!line) return;
  const steps = [...line.querySelectorAll('.timeline__step')];
  let ticking = false;

  const update = () => {
    ticking = false;
    const rect = line.getBoundingClientRect();
    const focusY = window.innerHeight * 0.6;
    const progress = Math.min(1, Math.max(0, (focusY - rect.top) / rect.height));
    line.style.setProperty('--progress', `${(progress * 100).toFixed(1)}%`);
    steps.forEach((s) => s.classList.toggle('is-reached', s.getBoundingClientRect().top < focusY));
  };

  const onScroll = () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  update();
}

export function initDeployment() {
  const tabs = document.querySelector('[data-tabs]');
  if (tabs) initTabs(tabs);
  initCopy();
  initTimeline();
}
