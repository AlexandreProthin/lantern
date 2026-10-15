/* Smooth resizing for the choose-compare motion round 6 (request revision 6: "make the columns and row resize smoothly
   when the selection changes"). Used with compare-motion.js; nothing here changes the structure or the visuals.
   - RESIZE.wrap(render): measures every column before a re-render and, after it, eases each column from its old width to
     its new one (the rows re-wrap with it, so their heights follow continuously).
   - RESIZE.grow(tr) / RESIZE.shrink(tr, done): a row that appears (an evidence band, irrelevant criteria) grows from zero
     height, and one that leaves shrinks to zero before the re-render. Each cell's content is wrapped in a clipping box for
     the length of the animation, then unwrapped.
   - The "Show/Hide irrelevant" button is intercepted on hide, so those rows shrink before they go.
   Durations come from RESIZE.ms (default 240). Reduced motion: everything instant (MOTION.reduced). */
(() => {
  const R = { ms: 240, ease: 'cubic-bezier(.3,.6,.3,1)' };
  const reduced = () => window.MOTION?.reduced() ?? matchMedia('(prefers-reduced-motion: reduce)').matches;
  let subject = null;

  const colWidths = el => [...el.querySelectorAll('thead tr:first-child > th')].map(th => th.getBoundingClientRect().width);

  function wrap(render) {
    // the kit rebuilds the page before rendering, so the widths of the last render are remembered rather than measured
    let last = null, lastEl = null;
    addEventListener('resize', () => { if (lastEl?.isConnected) last = colWidths(lastEl); });
    return (el, ctx) => {
      const before = last, same = subject === ctx.s.id; subject = ctx.s.id;
      render(el, ctx);
      const ths = [...el.querySelectorAll('thead tr:first-child > th')], after = ths.map(th => th.getBoundingClientRect().width);
      last = after; lastEl = el;
      if (!before || !same || reduced()) return;
      if (after.length !== before.length || after.every((w, i) => Math.abs(w - before[i]) < 1)) return;
      ths.forEach((th, i) => { th.style.transition = 'none'; th.style.width = th.style.minWidth = th.style.maxWidth = before[i] + 'px'; });
      el.querySelector('table').offsetWidth;                                         // commit the old widths
      ths.forEach((th, i) => { th.style.transition = `width ${R.ms}ms ${R.ease}, min-width ${R.ms}ms ${R.ease}, max-width ${R.ms}ms ${R.ease}`;
        th.style.width = th.style.minWidth = th.style.maxWidth = after[i] + 'px'; });
      const clear = () => ths.forEach(th => { th.style.transition = th.style.width = th.style.minWidth = th.style.maxWidth = ''; });
      setTimeout(clear, R.ms + 40);
    };
  }

  function box(cell) {
    const cs = getComputedStyle(cell), w = document.createElement('div'); w.className = 'rz';
    w.style.cssText = 'overflow:hidden'; while (cell.firstChild) w.appendChild(cell.firstChild); cell.appendChild(w);
    return { w, pt: cs.paddingTop, pb: cs.paddingBottom, h: w.getBoundingClientRect().height };
  }
  const unbox = (cell, w) => { if (w.parentNode !== cell) return; while (w.firstChild) cell.insertBefore(w.firstChild, w); w.remove(); };
  function grow(tr) {
    if (reduced()) return;
    [...tr.children].forEach(cell => { const { w, pt, pb, h } = box(cell);
      w.animate([{ height: '0px', opacity: 0 }, { height: h + 'px', opacity: 1 }], { duration: R.ms, easing: R.ease });
      cell.animate([{ paddingTop: '0px', paddingBottom: '0px' }, { paddingTop: pt, paddingBottom: pb }], { duration: R.ms, easing: R.ease }).onfinish = () => unbox(cell, w); });
  }
  function shrink(tr, done) {
    if (reduced()) return done();
    let first = null;
    [...tr.children].forEach(cell => { const { w, pt, pb, h } = box(cell);
      w.animate([{ height: h + 'px', opacity: 1 }, { height: '0px', opacity: 0 }], { duration: R.ms * .85, easing: R.ease, fill: 'forwards' });
      const a = cell.animate([{ paddingTop: pt, paddingBottom: pb }, { paddingTop: '0px', paddingBottom: '0px' }], { duration: R.ms * .85, easing: R.ease, fill: 'forwards' });
      first = first || a; });
    if (first) first.onfinish = done; else done();
  }

  // hiding the irrelevant criteria: let their rows shrink first, then let the button do its work
  let passing = false;
  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('[data-irr]');
    if (!b || passing || reduced() || !/^Hide/.test(b.textContent)) return;
    const rows = [...document.querySelectorAll('tbody tr.crow.irr')].flatMap(tr => tr.nextElementSibling?.classList.contains('ev') ? [tr, tr.nextElementSibling] : [tr]);
    const grp = [...document.querySelectorAll('tbody tr.grp')].find(g => /Irrelevant/.test(g.textContent));
    if (grp) rows.unshift(grp);
    if (!rows.length) return;
    e.stopImmediatePropagation(); e.preventDefault();
    let n = rows.length, fired = false; const go = () => { if (fired || --n > 0) return; fired = true; passing = true; b.click(); passing = false; };
    rows.forEach(tr => shrink(tr, go)); setTimeout(() => { if (!fired) { n = 0; go(); } }, R.ms + 200);
  }, true);

  window.RESIZE = Object.assign(R, { wrap, grow, shrink });
})();
