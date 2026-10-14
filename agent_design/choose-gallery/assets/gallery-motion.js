/* Motion engine for the choose-gallery motion round. The kit re-renders the whole gallery on every change, so this
   wrapper measures the cards before and after each render (relative to the grid, so scrolling does not matter) and
   calls the proposal's hooks for what changed:
     arrive(cards)               the space was entered (first render, or a scenario switch standing in for it)
     move(card, dx, dy)          a card changed place (sort, filter, a subject opened moves to the front, a delete closes the gap)
     enter(card, i)              a card appeared (filter widened); i = its order among the entering cards
     leave(ghost)                a card disappeared (filter narrowed, delete); ghost = a copy at its old place, remove it when done
     lift(lift, card)            a card was selected and lifts (unfolds) over the grid
     fold(ghost)                 the lifted card folds back; ghost = a copy of the old lift at its place, remove it when done
     status(card, from, to)      a subject's status changed (the prototype's "Un-choose one", the board's choose / bought)
     count(n, from, to)          a status tab's count changed
     open(card)                  the subject is being opened (Open in Survey, double-click, Enter); the handoff
   Hooks run only when motion is allowed: prefers-reduced-motion or the prototype's "Reduce motion" switch (standing in
   for the app's Appearance override, GV-100) makes every change instant (GV-101). Information never depends on motion
   (GV-103): hooks only animate what the static render already shows.
   GALLERY_MOTION.wrap(render, hooks) returns a render function for GALLERY_KIT.mount. */
(() => {
  const mq = matchMedia('(prefers-reduced-motion: reduce)');
  let forced = false, replay = false;
  const reduced = () => mq.matches || forced;
  let prev = null, pendingOpen = null;
  const EASE_OUT = 'cubic-bezier(.2,.7,.2,1)', EASE_IN = 'cubic-bezier(.5,0,.8,.4)';

  function measure(el) {
    const grid = el.querySelector('.grid'); if (!grid) return { grid: null, cards: new Map() };
    const g = grid.getBoundingClientRect(), cards = new Map();
    grid.querySelectorAll(':scope > .card[data-id]').forEach(k => { const r = k.getBoundingClientRect(); cards.set(k.dataset.id, { el: k, x: r.left - g.left, y: r.top - g.top, w: r.width, h: r.height }); });
    return { grid, cards };
  }
  function ghost(grid, node, r, z = 4) {
    const gh = node.cloneNode(true); gh.removeAttribute('data-id'); gh.removeAttribute('tabindex'); gh.setAttribute('aria-hidden', 'true');
    gh.querySelectorAll('[data-id],[data-open],[data-rn],[data-del],[data-reveal]').forEach(n => { n.removeAttribute('data-id'); n.removeAttribute('data-open'); n.removeAttribute('data-rn'); n.removeAttribute('data-del'); n.removeAttribute('data-reveal'); });
    Object.assign(gh.style, { position: 'absolute', left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px', margin: 0, zIndex: z, pointerEvents: 'none' });
    gh.classList.add('ghost'); grid.appendChild(gh); return gh;
  }

  // timer-driven safety: a hidden or throttled window pauses the animation timeline, which would leave a card clipped
  // or faded mid-way. Every animation a hook starts is finished by a timer at its end time, so the static state wins.
  const seen = new WeakSet();
  function guard() {
    document.getAnimations().forEach(a => {
      if (seen.has(a)) return; seen.add(a);
      const end = a.effect?.getComputedTiming?.().endTime;
      if (Number.isFinite(end)) setTimeout(() => { if (a.playState === 'running' || a.playState === 'paused') try { a.finish(); } catch (_) {} }, end + 80);
    });
  }
  const guarded = hooks => Object.fromEntries(Object.entries(hooks).map(([k, f]) => [k, (...a) => { const r = f(...a); guard(); return r; }]));

  function wrap(render, rawHooks) {
    const hooks = guarded(rawHooks);
    // the handoff: remember which subject is being opened, animate it after the re-render that follows
    const mark = id => { pendingOpen = id; };
    document.addEventListener('click', e => { const b = e.target.closest('[data-open]'); if (b) mark(b.dataset.open); }, true);
    document.addEventListener('dblclick', e => { const k = e.target.closest('.card[data-id]'); if (k && !e.target.closest('input, button')) mark(k.dataset.id); }, true);
    document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches?.('.card[data-id]')) mark(e.target.dataset.id); }, true);

    return (el, c) => {
      const before = measure(el), oldLift = el.querySelector('.lift'), oldSel = prev?.sel;
      let liftCopy = null;
      if (oldLift && before.grid) { const g = before.grid.getBoundingClientRect(), r = oldLift.getBoundingClientRect(); liftCopy = { node: oldLift.closest('.card').cloneNode(true), r: { x: r.left - g.left, y: r.top - g.top, w: r.width, h: r.height }, card: before.cards.get(oldSel) }; }
      const oldCounts = [...el.querySelectorAll('.tab .n')].map(n => n.textContent);
      render(el, c);
      const after = measure(el);
      const now = { sel: c.st.sel, scenario: c.st.scenario, status: Object.fromEntries(c.subjects.map(s => [s.id, s.status])) };
      const p = prev; prev = now;
      const open = pendingOpen; pendingOpen = null;
      if (reduced() || !after.grid && !before.grid) return;
      if (!p || p.scenario !== now.scenario || replay) { replay = false; if (after.grid && hooks.arrive) hooks.arrive([...after.cards.values()].map(x => x.el)); return; }
      // count changes in the status tabs
      el.querySelectorAll('.tab .n').forEach((n, i) => { if (oldCounts[i] != null && oldCounts[i] !== n.textContent && hooks.count) hooks.count(n, oldCounts[i], n.textContent); });
      if (!after.grid) return;
      let entering = 0;
      after.cards.forEach((a, id) => {
        const b = before.cards.get(id);
        if (!b) { hooks.enter?.(a.el, entering++); return; }
        const dx = b.x - a.x, dy = b.y - a.y;
        if ((Math.abs(dx) > 1 || Math.abs(dy) > 1) && hooks.move) hooks.move(a.el, dx, dy);
        if (p.status[id] && p.status[id] !== now.status[id] && hooks.status) hooks.status(a.el, p.status[id], now.status[id]);
      });
      before.cards.forEach((b, id) => { if (!after.cards.has(id) && hooks.leave) { const gh = ghost(after.grid, b.el, b); hooks.leave(gh); } });
      // lifting and folding
      if (oldSel !== now.sel) {
        if (liftCopy && hooks.fold && after.cards.has(oldSel)) {
          const gh = ghost(after.grid, liftCopy.node, liftCopy.card || liftCopy.r, 6);
          // keep only the lift: the copy must not count as a selected card (that would dim the grid while it folds)
          gh.classList.remove('sel'); gh.style.height = '';
          Object.assign(gh.style, { background: 'transparent', border: '0', backdropFilter: 'none', webkitBackdropFilter: 'none', boxShadow: 'none', opacity: 1 });
          gh.querySelectorAll(':scope > :not(.lift)').forEach(n => n.style.visibility = 'hidden');
          hooks.fold(gh);
        }
        const lift = el.querySelector('.lift');
        if (lift && hooks.lift) hooks.lift(lift, lift.closest('.card'));
      }
      if (open && hooks.open) { const k = after.cards.get(open); if (k) hooks.open(k.el); }
    };
  }

  // prototype controls, outside the kit's redrawn DOM
  function controls() {
    const box = document.createElement('div');
    box.className = 'mctl';
    box.innerHTML = `<button data-m="replay">Replay arrival</button><button data-m="reduce" aria-pressed="false">Reduce motion</button>`;
    document.body.appendChild(box);
    box.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.m === 'reduce') { forced = !forced; b.setAttribute('aria-pressed', forced); b.classList.toggle('on', forced); document.documentElement.classList.toggle('reduce', forced); document.dispatchEvent(new CustomEvent('lx:reduce', { detail: forced })); }
      if (b.dataset.m === 'replay') { replay = true; document.querySelector('[data-scn].on')?.click(); }
    });
    const st = document.createElement('style');
    st.textContent = `.mctl { position: fixed; left: 12px; bottom: 10px; z-index: 55; display: flex; gap: 4px; padding: 3px; border: 1px solid var(--line); border-radius: 999px;
      background: color-mix(in srgb, var(--bg) 75%, transparent); backdrop-filter: blur(10px); font: 12px var(--font-small, system-ui); }
      .mctl button { border: 0; border-radius: 999px; padding: 2px 10px; color: var(--ink-mute); } .mctl button.on { background: var(--surface-2); color: var(--node-lit); }
      .ghost { transition: none !important; } html.reduce *, html.reduce *::before { transition: none !important; animation: none !important; }
      @media (max-width: 760px) { .mctl { bottom: 52px; } }`;
    document.head.appendChild(st);
  }

  window.GALLERY_MOTION = { wrap, controls, reduced, EASE_OUT, EASE_IN };
})();
