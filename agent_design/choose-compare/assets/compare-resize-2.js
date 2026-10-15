/* Smooth resizing, second version, for choose-compare r006-02 (compare-resize.js stays as it was for r006-01).
   Same as compare-resize.js (columns ease between widths; rows grow and shrink), plus the user's adjustments:
   - keep(tr, oldHeight, entering): a band that stays open eases from its old height to its new one, and only the cards
     that are new fade in; it is never folded and unfolded again.
   - Highlights travel with the motion instead of snapping: a growing row's rules (the band's teal bottom rule, the open
     cell's rule) and the row's teal edge fade in as it opens and fade out as it closes; the open cell's underline
     (mark/unmark) fades in and out.
   Reduced motion: everything instant. */
(() => {
  const R = { ms: 240, ease: 'cubic-bezier(.3,.6,.3,1)' };
  const reduced = () => window.MOTION?.reduced() ?? matchMedia('(prefers-reduced-motion: reduce)').matches;
  let subject = null;
  const colWidths = el => [...el.querySelectorAll('thead tr:first-child > th')].map(th => th.getBoundingClientRect().width);
  const clearOf = v => (v && v !== 'none') ? v.replace(/rgba?\([^)]*\)|color\([^)]*\)|#[0-9a-f]{3,8}\b/gi, 'transparent') : 'none';

  function wrap(render) {
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
      el.querySelector('table').offsetWidth;
      ths.forEach((th, i) => { th.style.transition = `width ${R.ms}ms ${R.ease}, min-width ${R.ms}ms ${R.ease}, max-width ${R.ms}ms ${R.ease}`;
        th.style.width = th.style.minWidth = th.style.maxWidth = after[i] + 'px'; });
      setTimeout(() => ths.forEach(th => { th.style.transition = th.style.width = th.style.minWidth = th.style.maxWidth = ''; }), R.ms + 40);
    };
  }

  function box(cell) {
    const cs = getComputedStyle(cell), w = document.createElement('div'); w.className = 'rz'; w.style.overflow = 'hidden';
    while (cell.firstChild) w.appendChild(cell.firstChild); cell.appendChild(w);
    return { w, pt: cs.paddingTop, pb: cs.paddingBottom, h: w.getBoundingClientRect().height, bs: cs.boxShadow, bb: cs.borderBottomColor };
  }
  const unbox = (cell, w) => { if (w.parentNode !== cell) return; while (w.firstChild) cell.insertBefore(w.firstChild, w); w.remove(); };
  // the row's own highlight (the teal edge on the criterion while its band is open) travels with the band
  const edgeOf = tr => tr.previousElementSibling?.querySelector('th[data-row]');

  function grow(tr) {
    if (reduced()) return;
    [...tr.children].forEach(cell => { const b = box(cell);
      b.w.animate([{ height: '0px', opacity: 0 }, { height: b.h + 'px', opacity: 1 }], { duration: R.ms, easing: R.ease });
      cell.animate([{ paddingTop: '0px', paddingBottom: '0px', boxShadow: clearOf(b.bs), borderBottomColor: 'transparent' },
        { paddingTop: b.pt, paddingBottom: b.pb, boxShadow: b.bs, borderBottomColor: b.bb }], { duration: R.ms, easing: R.ease }).onfinish = () => unbox(cell, b.w); });
    const e = tr.classList.contains('ev') && edgeOf(tr);
    if (e) { const bs = getComputedStyle(e).boxShadow; e.animate([{ boxShadow: clearOf(bs) }, { boxShadow: bs }], { duration: R.ms, easing: R.ease }); }
  }
  function shrink(tr, done) {
    if (reduced()) return done();
    let first = null;
    [...tr.children].forEach(cell => { const b = box(cell);
      b.w.animate([{ height: b.h + 'px', opacity: 1 }, { height: '0px', opacity: 0 }], { duration: R.ms * .85, easing: R.ease, fill: 'forwards' });
      const a = cell.animate([{ paddingTop: b.pt, paddingBottom: b.pb, boxShadow: b.bs, borderBottomColor: b.bb },
        { paddingTop: '0px', paddingBottom: '0px', boxShadow: clearOf(b.bs), borderBottomColor: 'transparent' }], { duration: R.ms * .85, easing: R.ease, fill: 'forwards' });
      first = first || a; });
    const e = tr.classList.contains('ev') && edgeOf(tr);
    if (e) { const bs = getComputedStyle(e).boxShadow; e.animate([{ boxShadow: bs }, { boxShadow: clearOf(bs) }], { duration: R.ms * .85, easing: R.ease, fill: 'forwards' }); }
    if (first) first.onfinish = done; else done();
  }
  function keep(tr, oldH, entering) {
    if (reduced()) return;
    const newH = tr.getBoundingClientRect().height;
    [...tr.children].forEach(cell => {
      const b = box(cell), pad = parseFloat(b.pt) + parseFloat(b.pb), from = Math.max(0, oldH - pad), to = Math.max(b.h, newH - pad);
      b.w.animate([{ height: from + 'px' }, { height: to + 'px' }], { duration: R.ms, easing: R.ease }).onfinish = () => unbox(cell, b.w);
      if (entering.some(c => cell.contains(c))) cell.animate([{ boxShadow: clearOf(b.bs) }, { boxShadow: b.bs }], { duration: R.ms, easing: R.ease });
    });
    entering.forEach(c => c.animate([{ opacity: 0 }, { opacity: 1 }], { duration: R.ms, easing: R.ease }));
  }
  function cardOut(card, done) {
    if (reduced()) return done();
    const td = card.parentElement, bs = getComputedStyle(td).boxShadow;
    td.animate([{ boxShadow: bs }, { boxShadow: clearOf(bs) }], { duration: 140, easing: 'ease-in', fill: 'forwards' });
    card.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 140, easing: 'ease-in', fill: 'forwards' }).onfinish = done;
  }
  function mark(td) {
    if (reduced() || !td) return; const cs = getComputedStyle(td);
    td.animate([{ boxShadow: clearOf(cs.boxShadow), backgroundColor: 'transparent' }, { boxShadow: cs.boxShadow, backgroundColor: cs.backgroundColor }], { duration: R.ms, easing: R.ease });
  }
  function unmark(td, done) {
    if (reduced()) return done(); const cs = getComputedStyle(td);
    td.animate([{ boxShadow: cs.boxShadow, backgroundColor: cs.backgroundColor }, { boxShadow: clearOf(cs.boxShadow), backgroundColor: 'transparent' }],
      { duration: R.ms * .85, easing: R.ease, fill: 'forwards' }).onfinish = done;
  }

  let passing = false;
  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('[data-irr]');
    if (!b || passing || reduced() || !/^Hide/.test(b.textContent)) return;
    const rows = [...document.querySelectorAll('tbody tr.crow.irr')].flatMap(tr => tr.nextElementSibling?.classList.contains('ev') ? [tr, tr.nextElementSibling] : [tr]);
    const grp = [...document.querySelectorAll('tbody tr.grp')].find(g => /Irrelevant/.test(g.textContent));
    if (grp) rows.unshift(grp);
    if (!rows.length) return;
    e.stopImmediatePropagation(); e.preventDefault(); window.MOTION?.settle?.(450);
    let n = rows.length, fired = false; const go = () => { if (fired || --n > 0) return; fired = true; passing = true; b.click(); passing = false; };
    rows.forEach(tr => shrink(tr, go)); setTimeout(() => { if (!fired) { n = 0; go(); } }, R.ms + 200);
  }, true);

  window.RESIZE = Object.assign(R, { wrap, grow, shrink, keep, cardOut, mark, unmark });
})();
