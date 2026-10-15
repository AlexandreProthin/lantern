/* Motion for choose-welcome (round 3, "as close as Learn"): a port of the shipped Learn Welcome
   (app/src/rooms/learn/embers.ts, capsule.ts, Welcome.svelte; agent_design/welcome/RECIPE.md "Final motion" and
   agent_design/welcome-context/RECIPE.md "Final motion"). Same constants, same choreography; the colours are read
   from the tokens, so the light is teal in this room. Choose additions keep Learn's vocabulary: the need starters
   enter like Learn's suggestion chips, and the card hover runs the light along the steps bar instead of the graph
   thumbnail. Every state change completes on timers, never on animation promises or frames.
   Usage: WELCOME_MOTION.wire(ctx) after COLOR_BASE.render; it restructures the base field into Learn's DOM
   (one persistent button in .ask, a dock in the subject row, a slot in the tail, .lower around the needs). */
(() => {
  const K = window.WELCOME_KIT;
  const R = { speed: 1250, emitEvery: 22, cap: 34, drift: 26, lifeMin: 610, lifeMax: 690, BURST: 16 };
  const EASE = 'cubic-bezier(.2,.8,.2,1)', EXIT = 'cubic-bezier(.4,0,1,1)';
  const MS = { card: 380, subject: 260, slide: 240, close: 110, underline: 650, handoff: 260, chip: 200, chipGap: 50 };
  const osReduced = matchMedia('(prefers-reduced-motion: reduce)');
  let forced = false;
  const reduced = () => forced || osReduced.matches;

  const css = `
  .embers { position: fixed; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 8; }
  .cap.anim { overflow: hidden; }
  .cap .row1 { gap: 0; }
  .question { position: relative; flex: 1; min-width: 0; display: flex; }
  .question .subj { width: 100%; }
  .question.arriving::after { content: ''; position: absolute; left: 0; right: 0; bottom: -1px; height: 1px; background: var(--accent); transform-origin: left; animation: cw-underline ${MS.underline}ms ease-out; }
  .dock { flex: 0 0 auto; width: 0; height: 1px; }
  .cap.on.focused .dock { width: calc(var(--bw) + 10px); }
  .cap.two .dock { width: 0; }
  .lower { display: none; } .cap.two .lower { display: block; }
  .hair { transform-origin: left center; }
  .slot { width: 0; height: 0; } .cap.focused .slot { width: var(--bw); height: var(--bh); }
  .ask > .primary { position: absolute; left: 0; top: 0; margin: 0; z-index: 3; visibility: hidden; overflow: hidden; display: inline-block; }
  .ask > .primary.show { visibility: visible; }
  .ask > .primary:disabled { background: var(--surface-2); color: var(--ink-faint); border-color: var(--line); box-shadow: none; opacity: 1; cursor: default; }
  .example .hint { display: inline-block; transform-origin: 0 0; }
  .starters button { animation: cw-appear ${MS.chip}ms both; animation-delay: var(--delay, 0ms); }
  .card { transition: opacity 180ms ease-out, border-color 180ms ease-out; }
  button, input { transition: color 180ms ease-out, opacity 180ms ease-out, box-shadow 180ms ease-out, background 180ms ease-out, border-color 180ms ease-out; }
  .proto .mo { display: inline-flex; gap: 6px; align-items: center; }
  .proto .mo button { background: var(--surface); border: 1px solid var(--line); border-radius: 4px; color: var(--ink-mute); padding: 1px 8px; font: 11px ui-monospace, Consolas, monospace; }
  .proto .mo button[aria-pressed=true] { color: var(--node-lit); border-color: var(--accent); }
  @keyframes cw-underline { from { transform: scaleX(0); } to { transform: scaleX(1); } }
  @keyframes cw-appear { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: none; } }
  html.rm *, html.rm *::before, html.rm *::after { animation: none !important; transition: none !important; }
  html.rm .embers { display: none; }
  @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation: none !important; transition: none !important; } .embers { display: none; } }`;

  /* ---------- embers: app/src/rooms/learn/embers.ts ---------- */
  const travelDuration = (l) => Math.max(160, Math.min(650, l / R.speed * 1000));
  function emberFan(i, n, heading) {
    const v = (Math.sin((i + 1) * 7.13) + 1) / 2, a = n === 1 ? heading : heading + (i / (n - 1) - .5) * Math.PI * 1.4, s = 28 + v * 38;
    return { vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: R.lifeMin + (R.lifeMax - R.lifeMin) * v };
  }
  function emberTrail(serial, tx, ty) {
    const sc = Math.sin(serial * 2.39996), v = (Math.sin(serial * 7.13) + 1) / 2;
    return { vx: -tx * 24 - ty * sc * R.drift, vy: -ty * 24 + tx * sc * R.drift, life: R.lifeMin + (R.lifeMax - R.lifeMin) * v };
  }
  const Embers = {
    canvas: null, dust: [], trips: [], frame: 0, timers: new Set(),
    allowed() { return !reduced() && !document.hidden; },
    center(el) { const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; },
    fan(p, n = R.BURST, heading = -Math.PI / 2) { if (!this.allowed()) return; const born = performance.now(); for (let i = 0; i < n; i++) this.dust.push({ ...p, born, ...emberFan(i, n, heading) }); this.start(); },
    travel(a, b) { const d = travelDuration(Math.hypot(b.x - a.x, b.y - a.y)); if (!this.allowed()) return 0; this.trips.push({ a, b, start: performance.now(), d, em: 0, ser: 0 }); this.start(); return d; },
    arrival(field) { this.later(() => { if (!this.allowed()) return; const r = field.getBoundingClientRect(); this.travel({ x: r.left, y: r.bottom }, { x: r.left + r.width / 2, y: r.bottom }); }, MS.underline); },
    later(fn, ms) { const t = setTimeout(() => { this.timers.delete(t); fn(); }, ms); this.timers.add(t); },
    start() { if (!this.frame) this.frame = requestAnimationFrame(this.paint); },
    paint: (now) => {
      const E = Embers; E.frame = 0; if (!E.allowed()) { E.clear(); return; }
      const c = E.canvas, ctx = c.getContext('2d'), r = devicePixelRatio || 1;
      c.width = innerWidth * r; c.height = innerHeight * r; ctx.scale(r, r);
      const cs = getComputedStyle(c), cream = cs.getPropertyValue('--node-lit').trim(), lamp = cs.getPropertyValue('--accent').trim();
      E.trips = E.trips.filter((t) => {
        const k = Math.min(1, (now - t.start) / t.d), x = t.a.x + (t.b.x - t.a.x) * k, y = t.a.y + (t.b.y - t.a.y) * k;
        const L = Math.hypot(t.b.x - t.a.x, t.b.y - t.a.y) || 1;
        if (now - t.em >= R.emitEvery && E.dust.length < R.cap) { E.dust.push({ x, y, born: now, ...emberTrail(++t.ser, (t.b.x - t.a.x) / L, (t.b.y - t.a.y) / L) }); t.em = now; }
        ctx.globalAlpha = 1; ctx.fillStyle = cream; ctx.shadowColor = lamp; ctx.shadowBlur = 12; ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
        if (k === 1) E.fan(t.b); return k < 1;
      });
      E.dust = E.dust.filter((p) => {
        const age = now - p.born, k = age / p.life; if (k >= 1) return false;
        ctx.globalAlpha = (1 - k) ** 1.8; ctx.fillStyle = k < .4 ? cream : lamp; ctx.beginPath();
        ctx.arc(p.x + p.vx * age / 1000, p.y + p.vy * age / 1000, 1.2 * (1 - k * .65), 0, Math.PI * 2); ctx.fill(); return true;
      });
      if (E.trips.length || E.dust.length) E.start();
    },
    clear() { cancelAnimationFrame(this.frame); this.frame = 0; this.dust = []; this.trips = []; this.canvas?.getContext('2d').clearRect(0, 0, this.canvas.width, this.canvas.height); },
  };

  /* ---------- the capsule: app/src/rooms/learn/capsule.ts ---------- */
  class Capsule {
    constructor(p) { this.p = p; this.shape = null; this.shown = false; this.timers = []; this.measure(); }
    measure() { const { btn, cap } = this.p; this.nat = { w: btn.offsetWidth, h: btn.offsetHeight }; cap.style.setProperty('--bw', this.nat.w + 'px'); cap.style.setProperty('--bh', this.nat.h + 'px'); }
    apply(shape, show, instant = false) {
      if (shape === this.shape && show === this.shown) return;
      const p = this.p, prev = { shape: this.shape, shown: this.shown };
      this.shape = shape; this.shown = show;
      const from = prev.shown ? this.current() : null, before = this.snapshot();
      const hintBefore = { left: p.hint.getBoundingClientRect().left, size: parseFloat(getComputedStyle(p.hint).fontSize) };
      this.kill();
      p.cap.classList.toggle('on', shape !== 'rest'); p.cap.classList.toggle('two', shape === 'two'); p.cap.classList.toggle('focused', show);
      p.wrap.classList.toggle('capsule', shape !== 'rest'); p.wrap.classList.toggle('two', shape === 'two');
      this.autosize();
      const after = this.snapshot(), to = show ? this.target(shape) : null;
      if (to) this.place(to);
      if (instant || reduced() || prev.shape === null) { p.btn.classList.toggle('show', show); return; }
      this.glideHint(hintBefore);
      this.morph(before, after, prev.shape, shape);
      if (show && !prev.shown) {
        p.btn.classList.add('show');
        p.btn.animate([{ clipPath: 'inset(0 0 0 100% round 999px)', transform: 'translateX(16px)' }, { clipPath: 'inset(0 0 0 0 round 999px)', transform: 'none' }], { duration: MS.slide, easing: EASE });
      } else if (show && from && to && prev.shape !== shape) {
        p.btn.animate([{ left: from.x + 'px', top: from.y + 'px' }, { left: to.x + 'px', top: to.y + 'px' }], { duration: MS.card, easing: EASE });
      } else if (!show && from) {
        this.place(from);
        const ms = MS.slide * .7;
        p.btn.animate([{ clipPath: 'inset(0 0 0 0 round 999px)', transform: 'none' }, { clipPath: 'inset(0 0 0 100% round 999px)', transform: 'translateX(16px)' }], { duration: ms, easing: EXIT, fill: 'forwards' });
        this.later(() => { if (!this.shown) { p.btn.classList.remove('show'); p.btn.getAnimations().forEach((a) => a.cancel()); } }, ms);
      }
    }
    resized() {
      const p = this.p, before = p.dir.offsetHeight; this.autosize();
      const delta = p.dir.offsetHeight - before;
      if (delta && this.shown && this.shape === 'two') p.btn.style.top = (parseFloat(p.btn.style.top || '0') + delta) + 'px';
    }
    fadeLower(done) {
      if (reduced() || this.shape !== 'two') { done(); return; }
      this.p.lower.animate([{ opacity: 1 }, { opacity: 0 }], { duration: MS.close, fill: 'forwards' });
      this.later(() => { this.p.lower.getAnimations().forEach((a) => a.cancel()); done(); }, MS.close);
    }
    reposition() { if (this.shown && this.shape) this.place(this.target(this.shape)); }
    autosize() { const d = this.p.dir; if (this.shape === 'two') { d.style.height = '0'; d.style.height = d.scrollHeight + 'px'; } else d.style.height = ''; }
    later(fn, ms) { this.timers.push(setTimeout(fn, ms)); }
    kill() {
      const p = this.p;
      for (const el of [p.cap, p.subj, p.dock, p.lower, p.hair, p.btn, p.hint]) el.getAnimations().forEach((a) => a.cancel());
      this.timers.forEach(clearTimeout); this.timers = []; p.cap.classList.remove('anim');
    }
    snapshot() {
      const c = getComputedStyle(this.p.cap), s = getComputedStyle(this.p.subj);
      return { h: this.p.cap.offsetHeight, pad: c.padding, rad: c.borderRadius, bc: c.borderColor, bbc: c.borderBottomColor, bg: c.backgroundColor, fs: s.fontSize, sp: s.padding, dw: this.p.dock.offsetWidth + 'px' };
    }
    target(shape) {
      const { cap, top } = this.p, cs = getComputedStyle(cap), { w, h } = this.nat;
      const x = cap.offsetLeft + cap.offsetWidth - 1 - parseFloat(cs.paddingRight) - w;
      const y = shape === 'two' ? cap.offsetTop + cap.offsetHeight - 1 - parseFloat(cs.paddingBottom) - h : cap.offsetTop + top.offsetTop + (top.offsetHeight - h) / 2;
      return { x, y };
    }
    current() { const a = this.p.ask.getBoundingClientRect(), r = this.p.btn.getBoundingClientRect(); return { x: r.x - a.x, y: r.y - a.y }; }
    place(at) { this.p.btn.style.left = at.x + 'px'; this.p.btn.style.top = at.y + 'px'; }
    glideHint(before) {
      const hint = this.p.hint, dx = before.left - hint.getBoundingClientRect().left, scale = before.size / parseFloat(getComputedStyle(hint).fontSize);
      if (Math.abs(dx) < .5 && Math.abs(scale - 1) < .005) return;
      hint.animate([{ transform: `translateX(${dx}px) scale(${scale})` }, { transform: 'none' }], { duration: MS.card, easing: EASE });
    }
    morph(o, n, from, to) {
      const p = this.p;
      if (o.h !== n.h || o.pad !== n.pad || o.rad !== n.rad || o.bg !== n.bg || o.bc !== n.bc) {
        p.cap.classList.add('anim');
        p.cap.animate([{ height: o.h + 'px', padding: o.pad, borderRadius: o.rad, borderColor: o.bc, borderBottomColor: o.bbc, backgroundColor: o.bg },
          { height: n.h + 'px', padding: n.pad, borderRadius: n.rad, borderColor: n.bc, borderBottomColor: n.bbc, backgroundColor: n.bg }], { duration: MS.card, easing: EASE });
        this.later(() => p.cap.classList.remove('anim'), MS.card);
      }
      if (o.fs !== n.fs) p.subj.animate([{ fontSize: o.fs, padding: o.sp, opacity: 1 }, { opacity: .15, offset: .35 }, { fontSize: n.fs, padding: n.sp, opacity: 1 }], { duration: MS.subject, easing: EASE });
      if (o.dw !== n.dw) p.dock.animate([{ width: o.dw }, { width: n.dw }], { duration: MS.slide, easing: EASE });
      if (to === 'two' && from !== 'two') {
        p.lower.animate([{ opacity: 0, transform: 'translateY(-6px)' }, { opacity: 1, transform: 'none' }], { duration: 240, delay: MS.card * .33, fill: 'backwards', easing: 'ease-out' });
        p.hair.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: MS.card * .76, delay: MS.card * .19, fill: 'backwards', easing: EASE });
      }
    }
  }

  /* ---------- wiring on the colour base ---------- */
  let capsule, arrived = false;
  function restructure() {
    const cap = document.getElementById('cap'), ask = cap.parentElement, row1 = cap.querySelector('.row1'), subj = document.getElementById('subj');
    const btn = document.getElementById('go1'); document.getElementById('go2').remove();
    const q = document.createElement('div'); q.className = 'question'; row1.insertBefore(q, subj); q.appendChild(subj);
    const dock = document.createElement('span'); dock.className = 'dock'; row1.appendChild(dock);
    btn.remove(); ask.appendChild(btn);
    const lower = document.createElement('div'); lower.className = 'lower';
    ['.hair', '.dirf', '.starters', '.tail'].forEach((s) => lower.appendChild(cap.querySelector(s)));
    cap.appendChild(lower);
    const slot = document.createElement('span'); slot.className = 'slot'; lower.querySelector('.tail').appendChild(slot);
    const ex = document.querySelector('.example'), hint = document.createElement('span'); hint.className = 'hint';
    while (ex.firstChild) hint.appendChild(ex.firstChild); ex.appendChild(hint);
    lower.querySelectorAll('.starters button').forEach((b, i) => b.style.setProperty('--delay', `${MS.card * .33 + i * MS.chipGap}ms`));
    return { ask, cap, top: row1, subj, dir: document.getElementById('dir'), dock, lower, hair: lower.querySelector('.hair'), btn, wrap: document.getElementById('wrap'), hint, q };
  }

  function wire(ctx) {
    if (!Embers.canvas) { const c = document.createElement('canvas'); c.className = 'embers'; c.setAttribute('aria-hidden', 'true'); document.body.appendChild(c); Embers.canvas = c; }
    Embers.clear();
    controls();
    capsule?.kill();
    capsule = null;
    const D = window.WELCOME_KIT.D;
    document.querySelectorAll('.card').forEach((c) => {
      c.addEventListener('keydown', (e) => { if (e.key === 'Enter') c.click(); });
      // Learn runs a light through the thumbnail; Choose runs it along the steps bar, to where the decision stands.
      c.addEventListener('mouseenter', () => {
        const bars = [...c.querySelectorAll('.step i')], filled = [...c.querySelectorAll('.step i b')].filter((b) => b.offsetWidth > 0);
        if (!bars.length) return;
        const r0 = bars[0].getBoundingClientRect(), last = filled.length ? filled.at(-1).getBoundingClientRect() : null;
        const end = last ? { x: last.right, y: last.top + last.height / 2 } : { x: r0.left + 1, y: r0.top + r0.height / 2 };
        if (end.x - r0.left > 4) Embers.travel({ x: r0.left, y: r0.top + r0.height / 2 }, end);
      });
    });
    const wrap = document.getElementById('wrap');
    if (!wrap) return;
    const p = restructure();
    const { subj, dir, btn, cap } = p;
    let open = false, focused = false, busy = false;
    const shape = () => open ? 'two' : (focused || subj.value.trim()) ? 'cap' : 'rest';
    const upd = () => {
      const r = K.check(subj.value, dir.value);
      btn.disabled = !r.ok || busy;
      const cnt = document.getElementById('cnt'); cnt.textContent = r.counter; cnt.classList.toggle('over', r.over);
      const why = document.getElementById('why'); why.textContent = r.why; why.classList.toggle('over', r.over);
      capsule?.apply(shape(), focused);
    };
    capsule = new Capsule(p);
    capsule.apply(shape(), focused, true);
    if (!arrived && !reduced()) {
      p.q.classList.add('arriving'); p.q.addEventListener('animationend', () => p.q.classList.remove('arriving'), { once: true });
      setTimeout(() => p.q.classList.remove('arriving'), MS.underline + 80);
      Embers.arrival(subj);
    }
    arrived = true;
    const inField = (el) => !!el && (cap.contains(el) || el === btn);
    p.ask.addEventListener('focusin', (e) => { if (inField(e.target) && !focused) { focused = true; upd(); } });
    p.ask.addEventListener('focusout', (e) => {
      if (!inField(e.target)) return;
      setTimeout(() => { if (inField(document.activeElement)) return; focused = false; if (!dir.value.trim()) { open = false; dir.value = ''; } upd(); }, 0);
    });
    const openDir = () => { if (!open) { open = true; upd(); } dir.focus(); };
    const closeDir = () => {
      dir.value = ''; upd();
      capsule.fadeLower(() => { open = false; upd(); subj.focus(); subj.setSelectionRange(subj.value.length, subj.value.length); });
    };
    const submit = () => {
      if (btn.disabled) return;
      busy = true; upd();
      const r = subj.getBoundingClientRect(), d = Embers.travel({ x: r.left + r.width / 2, y: r.bottom }, Embers.center(btn));
      setTimeout(() => { K.submit(subj.value, dir.value); busy = false; upd(); }, d + MS.handoff); // timer-driven handoff
    };
    subj.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { subj.value = ''; upd(); }
      else if (e.key === 'Enter' && e.shiftKey) { e.preventDefault(); openDir(); }
      else if (e.key === 'Enter') { e.preventDefault(); submit(); }
      else if (e.key === 'ArrowDown' && open) { e.preventDefault(); dir.focus(); }
    });
    dir.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
      else if (e.key === 'Escape' || (e.key === 'Backspace' && !dir.value)) { e.preventDefault(); closeDir(); }
      else if (e.key === 'ArrowUp' && dir.selectionStart === 0 && dir.selectionEnd === 0) { e.preventDefault(); subj.focus(); }
    });
    subj.addEventListener('input', upd);
    dir.addEventListener('input', () => { upd(); capsule.resized(); });
    document.querySelectorAll('[data-st]').forEach((b) => b.addEventListener('click', () => {
      const st = D.starters[+b.dataset.st], ins = K.fill(st.insert);
      const v = dir.value, at = dir.selectionStart ?? v.length;
      const sep = at && !/[\s,]$/.test(v.slice(0, at)) ? ', ' : '';
      dir.value = v.slice(0, at) + sep + ins + v.slice(at);
      const caret = at + sep.length + ins.length - (st.caretBack || 0);
      dir.focus(); dir.setSelectionRange(caret, caret); upd(); capsule.resized();
    }));
    btn.addEventListener('click', submit);
    // As the app: measure, then focus the field on arrival (WG-1), which shows the capsule and its button.
    setTimeout(() => { capsule?.measure(); capsule?.reposition(); if (!subj.disabled) subj.focus(); }, 0);
  }

  let ctl = false;
  function controls() {
    if (ctl) return; ctl = true;
    const bar = document.querySelector('.proto'); if (!bar) return;
    bar.insertAdjacentHTML('beforeend', `<span class="mo"><button type="button" id="replay">Replay arrival</button><button type="button" id="rm" aria-pressed="false">Reduce motion</button></span>`);
    document.getElementById('replay').addEventListener('click', () => { arrived = false; dispatchEvent(new HashChangeEvent('hashchange')); setTimeout(() => document.getElementById('subj')?.focus(), 0); });
    document.getElementById('rm').addEventListener('click', (e) => {
      forced = !forced; e.currentTarget.setAttribute('aria-pressed', forced); document.documentElement.classList.toggle('rm', forced);
      if (forced) Embers.clear();
    });
  }

  addEventListener('resize', () => capsule?.reposition());
  window.WELCOME_MOTION = { css, wire, MS, R };
})();
