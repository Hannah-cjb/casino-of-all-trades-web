window.Tooltips = (() => {
  const DELAY = 2000;
  let timer = null;
  let target = null;
  let bubble = null;

  function ensureBubble() {
    if (bubble) return bubble;
    bubble = document.createElement('div');
    bubble.className = 'tooltip-bubble';
    bubble.setAttribute('role', 'tooltip');
    document.body.appendChild(bubble);
    return bubble;
  }

  function describe(el) {
    if (el.dataset.tip) return el.dataset.tip;
    if (el.classList.contains('game-card')) {
      const name = el.querySelector('h2');
      return name ? `Open ${name.textContent}.` : null;
    }
    return null;
  }

  function show(el) {
    const text = describe(el);
    if (!text) return;
    const el_rect = el.getBoundingClientRect();
    if (el_rect.width === 0 && el_rect.height === 0) return;
    const b = ensureBubble();
    b.textContent = text;
    const width = b.offsetWidth;
    const height = b.offsetHeight;
    let x = el_rect.left + el_rect.width / 2 - width / 2;
    x = Math.max(8, Math.min(x, window.innerWidth - width - 8));
    let y = el_rect.top - height - 10;
    if (y < 8) y = el_rect.bottom + 10;
    b.style.left = `${x}px`;
    b.style.top = `${y}px`;
    b.classList.add('show');
  }

  function hide() {
    if (bubble) bubble.classList.remove('show');
  }

  function abort() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    target = null;
    hide();
  }

  document.addEventListener('pointerover', (e) => {
    const btn = e.target.closest ? e.target.closest('button') : null;
    if (!btn || btn === target) return;
    if (timer) clearTimeout(timer);
    hide();
    target = btn;
    timer = setTimeout(() => {
      timer = null;
      if (target === btn && btn.isConnected) show(btn);
    }, DELAY);
  });

  document.addEventListener('pointerout', (e) => {
    const btn = e.target.closest ? e.target.closest('button') : null;
    if (!btn) return;
    if (e.relatedTarget && btn.contains(e.relatedTarget)) return;
    if (btn === target) abort();
  });

  document.addEventListener('pointerdown', abort, true);
  document.addEventListener('scroll', abort, true);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') abort();
  });
  window.addEventListener('blur', abort);

  return { hide, abort };
})();
