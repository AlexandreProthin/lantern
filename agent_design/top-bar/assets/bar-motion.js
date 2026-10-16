// Motion-phase helper for top-bar: makes the static rows of bar-kit.js live, so three motion languages can
// be compared on the same frozen look (r004-03). Each file supplies the timing in CSS and a few switches here.
// BARM.enhance({ slide, relight, stagger, breathe }):
//   slide   the current-space marker glides to the new space (else it fades out and back in place)
//   relight the accent dot re-lights at the new space (a CSS keyframe on .dot.lit)
//   stagger ms between panel rows as they appear (0 = the panel arrives as one piece)
//   breathe the field's accent edge breathes once when the panel opens
(function () {
  const k = () => Number(getComputedStyle(document.documentElement).getPropertyValue('--k')) || 0;
  const wait = ms => new Promise(r => setTimeout(r, ms * Math.max(k(), 1)));

  function enhance(opts) {
    const states = [...document.querySelectorAll('.state')];
    for (const section of states) {
      const cap = section.querySelector('.cap2'); if (!cap) continue;
      const btns = [...cap.querySelectorAll('.btn')].filter(b => !b.classList.contains('room') && !b.classList.contains('mute'));
      const ind = document.createElement('span'), dot = document.createElement('span');
      ind.className = 'ind'; dot.className = 'dot2 lit'; cap.append(ind, dot);
      const place = (btn, animate) => {
        btns.forEach(b => { b.classList.toggle('on', b === btn); b.classList.toggle('off', b !== btn); b.classList.remove('ul'); });
        const x = btn.offsetLeft, w = btn.offsetWidth;
        const set = () => { ind.style.left = `${x + 6}px`; ind.style.width = `${w - 12}px`; dot.style.left = `${x + w - 9}px`; };
        if (!animate) { cap.classList.add('instant'); set(); cap.offsetWidth; cap.classList.remove('instant'); return; }
        if (opts.slide) set();
        else { cap.classList.add('swap'); setTimeout(() => { cap.classList.add('instant'); set(); cap.offsetWidth; cap.classList.remove('instant', 'swap'); }, 90 * Math.max(k(), 1)); }
        if (opts.relight) { dot.classList.remove('lit'); dot.offsetWidth; dot.classList.add('lit'); }
      };
      section._place = i => place(btns[i], true); section._count = btns.length;
      place(btns.find(b => b.classList.contains('on')) || btns[0], false);
      btns.forEach(b => b.addEventListener('click', () => place(b, true)));
      const room = cap.querySelector('.room');
      section._room = () => { const next = section.dataset.room === 'learn' ? 'choose' : 'learn'; section.dataset.room = next; room.firstChild.textContent = next === 'learn' ? 'Learn' : 'Choose'; };
      room.addEventListener('click', section._room);
      const menu = section.querySelector('.menu'), field = section.querySelector('.field');
      if (menu && field) {
        menu.classList.add('open');
        const rows = [...menu.children];
        section._panel = open => {
          menu.classList.toggle('open', open);
          if (open && opts.stagger) rows.forEach((r, i) => { r.style.animationDelay = `calc(var(--k,1) * ${i * opts.stagger}ms)`; r.classList.remove('stag'); r.offsetWidth; r.classList.add('stag'); });
          if (open && opts.breathe) { field.classList.remove('breathe'); field.offsetWidth; field.classList.add('breathe'); }
        };
        field.addEventListener('click', () => section._panel(!menu.classList.contains('open')));
        addEventListener('keydown', e => { if (e.key === 'Escape') section._panel(false); });
        // A press anywhere outside the open panel and its field closes it (user, 2026-10-17, at the final).
        addEventListener('pointerdown', e => { if (menu.classList.contains('open') && !menu.contains(e.target) && !field.contains(e.target)) section._panel(false); }, true);
      }
    }
    // A fixed control strip: play the same sequence on every file, slow it down, or follow reduced motion.
    const bar = document.createElement('div'); bar.className = 'play';
    bar.innerHTML = '<button id="play">▶ Play the sequence</button><label><input type="checkbox" id="slow"> slow ×4</label><span>click spaces, the field, the room name · Esc closes the panel</span>';
    document.body.prepend(bar);
    document.getElementById('slow').addEventListener('change', e => document.documentElement.style.setProperty('--k', e.target.checked ? 4 : 1));
    document.getElementById('play').addEventListener('click', async () => {
      const [first, menuRow, , empty] = states;
      first._place(2); await wait(700); first._place(0); await wait(700); first._place(1); await wait(700);
      if (menuRow._panel) { menuRow._panel(false); await wait(600); menuRow._panel(true); await wait(900); }
      empty._room(); await wait(1100); empty._room();
    });
  }
  window.BARM = { enhance };
})();
