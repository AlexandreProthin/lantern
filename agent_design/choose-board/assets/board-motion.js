/* Motion engine for the choose-board motion round. The board is re-rendered on every change (rail-structure.js),
   so this wrapper compares each render with the previous one and calls the proposal's hooks for what changed:
     open(sheet)                       the board opened (rail → sheet)
     close(sheet, done)                the board is closing; call done() when the exit is over (the re-render follows)
     counter(ctr, oldHTML, newHTML)    a rail counter's value changed (also on returning from the sheet: "what changed")
     ready(rec)                        the board just became complete (Recommend offered)
     status(st, value)                 the subject status changed (exploring / decided / bought)
     chosen(card)                      a product was just chosen (sheet)
   Every hook runs only when motion is allowed: prefers-reduced-motion, or the prototype's "Reduce motion" switch
   (standing in for the app's Appearance override, GV-100), makes every change instant (GV-101). Information never
   depends on motion (GV-103): the hooks only animate what the static render already shows.
   Prototype control: "Settle the next thing" changes the board from outside it, as the graph and the dialogue do.
   MOTION.wrap(render, hooks) returns a render function for BOARD_KIT.mount. */
(() => {
  const mq = matchMedia('(prefers-reduced-motion: reduce)');
  let forced = false;
  const reduced = () => mq.matches || forced;
  let prev = null, last = null, railMem = null;   // railMem: the rail's counters when last shown

  function snap(el, ctx) {
    return { expanded: ctx.expanded, stage: ctx.stage, status: ctx.s.status, subject: ctx.s.id,
      chosen: ctx.counts.chosen ? ctx.counts.chosen.name : null,
      ctrs: [...el.querySelectorAll('.rail .ctr b')].map(b => b.innerHTML) };
  }

  function wrap(render, hooks) {
    return (el, ctx) => {
      const orig = ctx.setExpanded;
      const setExpanded = v => {
        const sheet = el.querySelector('.sheet');
        if (!v && sheet && hooks.close && !reduced()) {
          // done once: when the exit ends, or after 450 ms if the page is hidden and animations do not advance
          let fired = false; const done = () => { if (!fired) { fired = true; orig(false); } };
          hooks.close(sheet, done); setTimeout(done, 450);
        } else orig(v);
      };
      last = { ...ctx, setExpanded };
      render(el, last);
      const now = snap(el, ctx), p = prev, mem = railMem; prev = now;
      if (!now.expanded) railMem = now.ctrs;
      if (p && p.subject !== now.subject) railMem = now.expanded ? null : now.ctrs;
      document.documentElement.dataset.motion = reduced() ? 'reduce' : 'full';
      if (!p || p.subject !== now.subject || reduced()) return;           // first render, scenario switch, reduced: no motion
      if (now.expanded && !p.expanded) hooks.open?.(el.querySelector('.sheet'));
      if (!now.expanded && mem) el.querySelectorAll('.rail .ctr').forEach((c, i) => {
        if (mem[i] !== undefined && mem[i] !== now.ctrs[i]) hooks.counter?.(c, mem[i], now.ctrs[i]);
      });
      if (now.stage === 'ready' && p.stage !== 'ready') el.querySelectorAll('[data-rec]').forEach(r => hooks.ready?.(r));
      if (now.status !== p.status) el.querySelectorAll('.st').forEach(s => hooks.status?.(s, now.status));
      if (now.chosen && now.chosen !== p.chosen) { const c = el.querySelector('.prod.chosen'); if (c) hooks.chosen?.(c); }
    };
  }

  // prototype controls: settle the next missing thing from outside the board; force reduced motion
  addEventListener('DOMContentLoaded', () => {
    const bar = document.createElement('div'); bar.className = 'motion-ctl';
    bar.innerHTML = '<button data-settle>Settle the next thing</button><label><input type="checkbox" data-reduce> Reduce motion</label>';
    document.body.appendChild(bar);
    bar.querySelector('[data-settle]').onclick = () => {
      if (!last) return; const m = last.missing[0], a = last.act, s = last.s;
      if (!m) { const sl = s.products.find(p => p.state === 'shortlisted'); if (sl && !last.counts.chosen) a.product(sl, 'chosen'); else if (s.status === 'decided') a.bought(); return; }
      if (m.need) a.answer(m.need, 'yes');
      else if (m.crit) a.rank(m.crit, 'must');
      else if (m.area === 'shortlist') { const c = s.products.find(p => p.state === 'candidate'); if (c) a.product(c, 'shortlisted'); else s.products.push({ name: 'Printer E', state: 'shortlisted', fact: 'found by research' }), a.fillCompare(); }
      else if (m.area === 'compare') a.fillCompare();
      else if (m.area === 'needs') a.addNeed('Budget');
      else if (m.area === 'criteria') { s.criteria.push({ name: 'Price', state: 'must', why: 'budget' }); a.fillCompare(); }
    };
    bar.querySelector('[data-reduce]').onchange = e => { forced = e.target.checked; document.documentElement.dataset.motion = reduced() ? 'reduce' : 'full'; document.getAnimations().forEach(x => x.finish()); };
    const st = document.createElement('style');
    st.textContent = `.motion-ctl { position: fixed; right: 12px; bottom: 10px; z-index: 50; display: flex; gap: 10px; align-items: center; font-size: 12px;
      padding: 3px 10px 3px 3px; border: 1px solid var(--line); border-radius: 999px; background: color-mix(in srgb, var(--bg) 75%, transparent); backdrop-filter: blur(10px); color: var(--ink-mute); }
      .motion-ctl button { border-radius: 999px; } .tag { bottom: 50px !important; }`;
    document.head.appendChild(st);
  });
  mq.addEventListener('change', () => document.getAnimations().forEach(x => x.finish()));
  window.MOTION = { wrap, reduced };
})();
