/* Motion engine, second version, for choose-compare r006-02 (the user's adjustments to r006-01, 2026-10-15):
   "do not fold to unfold right after if the row is already unfolded, keep it unfolded" and "on the fold/unfold do not
   make unhighlighted lines suddenly highlighted". compare-motion.js stays as it was for r005-0x and r006-01.

   Same contract as compare-motion.js (bandIn, bandOut, cell, chosen, rowsIn), plus:
     bandKeep(tr, oldHeight, entering)   a row's band stays open while what it shows changes (whole row ↔ one card, or
                                         one card ↔ another in the same row): it is resized from its old height, never
                                         folded; `entering` are the cards that were not shown before
     cardOut(card, done)                 a card leaves a band that stays open (before the re-render)
     unmark(el, done)                    a highlight (the open cell's underline) goes away (before the re-render)
   While anything resizes, hover highlights are suspended until the pointer moves again, so a row that slides under a
   still pointer is not suddenly highlighted. Reduced motion: every change instant (GV-100, GV-101). */
(() => {
  const mq = matchMedia('(prefers-reduced-motion: reduce)');
  let forced = false; const reduced = () => mq.matches || forced;
  let prev = null, keep = null;
  const finishAll = () => document.getAnimations().forEach(x => { if (x.effect?.getComputedTiming().endTime !== Infinity) x.finish(); });

  // hover: suspended from a selection change until the pointer moves after the motion has settled
  const root = document.documentElement; let calmAt = 0;
  function settle(ms) { root.classList.add('no-hover'); calmAt = performance.now() + ms; }
  addEventListener('pointermove', () => { if (root.classList.contains('no-hover') && performance.now() > calmAt) root.classList.remove('no-hover'); });

  const crit = tr => tr.previousElementSibling?.querySelector('[data-row]')?.dataset.row;
  const bands = el => new Map([...el.querySelectorAll('tr.ev')].map(tr => [crit(tr), tr]));
  const cardsOf = tr => [...tr.querySelectorAll('.card')].map(c => c.dataset.card);
  function snap(el, ctx) {
    const cells = {}; el.querySelectorAll('td[data-cell]').forEach(td => { const x = ctx.s.cells[td.dataset.cell] || {}; cells[td.dataset.cell] = { status: x.status, value: x.value }; });
    return { subject: ctx.s.id, cells, bands: new Map([...bands(el)].map(([c, tr]) => [c, cardsOf(tr)])),
      item: el.querySelector('td.item')?.dataset.cell || null,
      chosen: ctx.s.products.find(p => p.state === 'chosen')?.id || null, rows: [...el.querySelectorAll('[data-row]')].map(h => h.dataset.row) };
  }

  function wrap(render, hooks) {
    return (el, ctx) => {
      const realDraw = ctx.act.draw;
      const draw = () => {
        const ui = ctx.act.ui, P = ctx.s.products, waits = [];
        const shows = c => ui.rows?.has(c) ? P.map(p => `${p.id}:${c}`) : ui.item?.endsWith(':' + c) ? [ui.item] : [];
        keep = new Map();
        bands(el).forEach((tr, c) => {
          const next = shows(c);
          if (!next.length) { waits.push(done => hooks.bandOut(tr, done)); return; }       // the band folds
          keep.set(c, { h: tr.getBoundingClientRect().height, cards: cardsOf(tr) });       // the band stays open
          tr.querySelectorAll('.card').forEach(card => { if (!next.includes(card.dataset.card) && hooks.cardOut) waits.push(done => hooks.cardOut(card, done)); });
        });
        el.querySelectorAll('td.item').forEach(td => { if (td.dataset.cell !== ui.item && hooks.unmark) waits.push(done => hooks.unmark(td, done)); });
        if (reduced() || !waits.length) return realDraw();
        settle(450);
        let n = waits.length, fired = false; const go = () => { if (!fired) { fired = true; realDraw(); } };
        waits.forEach(w => w(() => { if (--n <= 0) go(); })); setTimeout(go, 400);
      };
      render(el, { ...ctx, act: { ...ctx.act, draw } });
      const now = snap(el, ctx), p = prev; prev = now;
      const kept = keep; keep = null;
      root.dataset.motion = reduced() ? 'reduce' : 'full';
      if (!p || p.subject !== now.subject || reduced()) return;
      let moved = false;
      bands(el).forEach((tr, c) => {
        const before = p.bands.get(c), cards = now.bands.get(c);
        if (!before) { hooks.bandIn?.(tr, tr.classList.contains('full') ? 'full' : 'single'); moved = true; }
        else if (before.join() !== cards.join()) {
          const old = kept?.get(c)?.h ?? tr.getBoundingClientRect().height;
          hooks.bandKeep?.(tr, old, [...tr.querySelectorAll('.card')].filter(x => !before.includes(x.dataset.card))); moved = true;
        }
      });
      if (now.item && now.item !== p.item) hooks.mark?.(el.querySelector(`td[data-cell="${now.item}"]`));
      Object.entries(now.cells).forEach(([k, v]) => { const o = p.cells[k];
        if (o && (o.status !== v.status || o.value !== v.value)) hooks.cell?.(el.querySelector(`td[data-cell="${k}"]`), o, v); });
      if (now.chosen && now.chosen !== p.chosen) {
        const th = [...el.querySelectorAll('thead th.prod')].find(h => h.querySelector(`[data-un="${now.chosen}"]`));
        hooks.chosen?.(th, [...el.querySelectorAll(`td[data-cell^="${now.chosen}:"]`)]);
      }
      const added = now.rows.filter(r => !p.rows.includes(r));
      if (added.length && p.rows.length) { hooks.rowsIn?.(added.map(r => el.querySelector(`[data-row="${r}"]`).closest('tr'))); moved = true; }
      if (moved) settle(450);
    };
  }

  addEventListener('DOMContentLoaded', () => {
    const bar = document.createElement('div'); bar.className = 'motion-ctl';
    bar.innerHTML = '<label><input type="checkbox" data-reduce> Reduce motion</label>';
    document.body.appendChild(bar);
    bar.querySelector('[data-reduce]').onchange = e => { forced = e.target.checked; root.dataset.motion = reduced() ? 'reduce' : 'full'; finishAll(); };
    const st = document.createElement('style');
    st.textContent = `.motion-ctl { position: fixed; right: 12px; bottom: 36px; z-index: 50; font-size: 12px; padding: 4px 10px; border: 1px solid var(--line); border-radius: 999px;
      background: color-mix(in srgb, var(--bg) 75%, transparent); backdrop-filter: blur(10px); color: var(--ink-mute); }`;
    document.head.appendChild(st);
  });
  mq.addEventListener('change', () => finishAll());
  window.MOTION = { wrap, reduced, settle };
})();
