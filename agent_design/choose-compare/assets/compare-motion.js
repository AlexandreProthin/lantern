/* Motion engine for the choose-compare motion round. The table is re-rendered on every change (compare-structure.js),
   so this wrapper compares each render with the previous one and calls the proposal's hooks for what changed:
     bandIn(tr, kind)              an evidence band appeared: kind 'full' (a whole row) or 'single' (one card)
     bandOut(tr, done)             a band is about to fold; call done() when the exit is over (the re-render follows)
     cell(td, from, to)            a cell's status or value changed: from/to = { status, value } (research arriving,
                                   an edit, a revert, a check starting)
     chosen(th, tds)               a product was just chosen: its header and its column's cells
     rowsIn(trs)                   criterion rows appeared (the irrelevant toggle)
   Folding is intercepted: the structure mutates its state and calls act.draw(); the wrapper first lets folding bands
   leave (at most 400 ms, so a hidden window still folds), then draws.
   Reduced motion (OS or the prototype's switch, standing in for Appearance, GV-100) makes every change instant (GV-101);
   information never depends on motion (GV-103). Research in progress may pulse (busy state, RS-25).
   MOTION.wrap(render, hooks) returns a render function for COMPARE_KIT.mount. */
(() => {
  const mq = matchMedia('(prefers-reduced-motion: reduce)');
  let forced = false; const reduced = () => mq.matches || forced;
  let prev = null, el0 = null;
  // finish transient animations; endless ones (the busy pulse) stop by themselves when data-motion becomes 'reduce'
  const finishAll = () => document.getAnimations().forEach(x => { if (x.effect?.getComputedTiming().endTime !== Infinity) x.finish(); });

  const bands = el => new Map([...el.querySelectorAll('tr.ev')].map(tr => {
    const c = tr.previousElementSibling?.querySelector('[data-row]')?.dataset.row, card = tr.querySelector('.card');
    return [c + '|' + (tr.classList.contains('full') ? 'full' : card?.dataset.card), tr];
  }));
  function snap(el, ctx) {
    const cells = {}; el.querySelectorAll('td[data-cell]').forEach(td => { const [p, c] = td.dataset.cell.split(':'); const x = ctx.s.cells[`${p}:${c}`] || {}; cells[td.dataset.cell] = { status: x.status, value: x.value }; });
    return { subject: ctx.s.id, cells, bands: [...bands(el).keys()], chosen: ctx.s.products.find(p => p.state === 'chosen')?.id || null,
      rows: [...el.querySelectorAll('[data-row]')].map(h => h.dataset.row) };
  }

  function wrap(render, hooks) {
    return (el, ctx) => {
      el0 = el;
      const realDraw = ctx.act.draw;
      const draw = () => {
        // which bands will still exist? compare the structure's new state with the bands on screen
        const ui = ctx.act.ui, leaving = [];
        bands(el).forEach((tr, key) => { const [c, what] = key.split('|');
          const stays = what === 'full' ? ui.rows?.has(c) : (ui.item === what && !ui.rows?.has(c));
          if (!stays) leaving.push(tr); });
        if (!leaving.length || reduced() || !hooks.bandOut) return realDraw();
        let n = leaving.length, fired = false; const done = () => { if (!fired && --n <= 0) { fired = true; realDraw(); } };
        leaving.forEach(tr => hooks.bandOut(tr, done)); setTimeout(() => { if (!fired) { fired = true; realDraw(); } }, 400);
      };
      render(el, { ...ctx, act: { ...ctx.act, draw } });
      const now = snap(el, ctx), p = prev; prev = now;
      document.documentElement.dataset.motion = reduced() ? 'reduce' : 'full';
      if (!p || p.subject !== now.subject || reduced()) return;
      const B = bands(el);
      B.forEach((tr, key) => { if (!p.bands.includes(key)) hooks.bandIn?.(tr, key.endsWith('|full') ? 'full' : 'single'); });
      Object.entries(now.cells).forEach(([k, v]) => { const o = p.cells[k];
        if (o && (o.status !== v.status || o.value !== v.value)) hooks.cell?.(el.querySelector(`td[data-cell="${k}"]`), o, v); });
      if (now.chosen && now.chosen !== p.chosen) {
        const th = [...el.querySelectorAll('thead th.prod')].find(h => h.querySelector(`[data-un="${now.chosen}"]`));
        hooks.chosen?.(th, [...el.querySelectorAll(`td[data-cell^="${now.chosen}:"]`)]);
      }
      const added = now.rows.filter(r => !p.rows.includes(r));
      if (added.length && p.rows.length) hooks.rowsIn?.(added.map(r => el.querySelector(`[data-row="${r}"]`).closest('tr')));
    };
  }

  addEventListener('DOMContentLoaded', () => {
    const bar = document.createElement('div'); bar.className = 'motion-ctl';
    bar.innerHTML = '<label><input type="checkbox" data-reduce> Reduce motion</label>';
    document.body.appendChild(bar);
    bar.querySelector('[data-reduce]').onchange = e => { forced = e.target.checked; document.documentElement.dataset.motion = reduced() ? 'reduce' : 'full'; finishAll(); };
    const st = document.createElement('style');
    st.textContent = `.motion-ctl { position: fixed; right: 12px; bottom: 36px; z-index: 50; font-size: 12px; padding: 4px 10px; border: 1px solid var(--line); border-radius: 999px;
      background: color-mix(in srgb, var(--bg) 75%, transparent); backdrop-filter: blur(10px); color: var(--ink-mute); }`;
    document.head.appendChild(st);
  });
  mq.addEventListener('change', () => finishAll());
  window.MOTION = { wrap, reduced };
})();
