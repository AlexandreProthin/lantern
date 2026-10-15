/* Motion toolkit for the choose-nodes motion round (shared by r003-*). Only how a node CHANGES state is designed
   here; selection, the route light, spawning and the busy pulse are the graph's (graph-view GV-31…98, Learn's final)
   and are not redrawn. Provides:
   - Motion.reduced(): OS prefers-reduced-motion or the prototype's "Reduce motion" toggle (GV-100); a change takes
     effect live and cancels every transient animation (Motion.cancelAll).
   - Motion.ghost(change): the node's previous rendering laid over the new one (for cross-fades and reveals).
   - Motion.embers / Motion.travel: Learn's particles and travelling light on a canvas over the graph.
   - the story player: the same nine decisions on every proposal, plus Reset and Reduce motion (prototype controls).
   Nothing conveys information only by motion (GV-103): every end state is the static render. */
(function () {
  const mq = matchMedia('(prefers-reduced-motion: reduce)');
  let forced = false;
  const reduced = () => mq.matches || forced;
  const EASE_OUT = 'cubic-bezier(.2,.7,.2,1)', EASE_IN = 'cubic-bezier(.5,0,.8,.4)';
  const live = new Set();       // WAAPI animations and ghosts in flight
  const tok = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

  function track(a) { live.add(a); a.finished.then(() => live.delete(a), () => live.delete(a)); return a; }
  function animate(el, kf, opt) { if (!el || reduced()) return null; return track(el.animate(kf, { fill: 'none', ...opt })); }

  function ghost(change, cls = '') {
    if (reduced() || !change.el || !change.oldHTML) return null;
    const g = document.createElement('span');
    g.className = 'mo-ghost ' + cls; g.setAttribute('aria-hidden', 'true'); g.innerHTML = change.oldHTML;
    change.el.appendChild(g); live.add(g);
    return g;
  }
  const drop = g => { if (g) { g.remove(); live.delete(g); } };

  // ---------- particles and travelling light (Learn's language), on one canvas over the graph ----------
  let cv, cx, parts = [], dots = [], raf = 0, last = 0;
  function layer() {
    const host = NodeKit.api.canvas();
    if (!cv || cv.parentNode !== host) {
      cv = document.createElement('canvas'); cv.className = 'mo-layer'; cv.setAttribute('aria-hidden', 'true'); host.appendChild(cv);
      cx = cv.getContext('2d');
    }
    const w = host.offsetWidth + 80, h = host.offsetHeight + 80, dpr = Math.min(2, devicePixelRatio || 1);
    if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.style.width = w + 'px'; }
    if (cv.height !== Math.round(h * dpr)) { cv.height = Math.round(h * dpr); cv.style.height = h + 'px'; }
    cx.setTransform(dpr, 0, 0, dpr, 40 * dpr, 40 * dpr); // 40 px bleed around the graph
  }
  function centre(el) {
    const a = el.querySelector('.anchor').getBoundingClientRect(), c = NodeKit.api.canvas().getBoundingClientRect();
    return { x: a.left - c.left + a.width / 2, y: a.top - c.top + a.height / 2, r: a.width / 2 };
  }
  function rgb(name) {
    const v = tok(name); let m;
    if ((m = v.match(/^#([0-9a-f]{6})$/i))) { const n = parseInt(m[1], 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
    if ((m = v.match(/rgba?\(([^)]+)\)/))) return m[1].split(',').slice(0, 3).map(Number);
    return [200, 240, 230];
  }
  // a burst from the rim: count, life (ms), speed (px/s max), spread (radians) around dir
  function embers(el, { count = 12, life = 800, speed = 38, spread = Math.PI * 2, dir = -Math.PI / 2, color = '--node-lit' } = {}) {
    if (reduced() || !el) return;
    layer(); const c = centre(el), col = rgb(color);
    for (let i = 0; i < count; i++) {
      const a = dir + (Math.random() - .5) * spread, v = speed * (.45 + Math.random() * .55);
      parts.push({ x: c.x + Math.cos(a) * c.r, y: c.y + Math.sin(a) * c.r, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
        t: 0, life: life * (.85 + Math.random() * .15), col, r: 1.1 + Math.random() * .9 });
    }
    run();
  }
  // a light dot travelling through the centres of els (Learn: 1250 px/s, 160–650 ms per leg, comet trail)
  function travel(els, { color = '--focus', onArrive } = {}) {
    if (reduced() || els.some(e => !e)) { if (onArrive) onArrive(); return; }
    layer(); const pts = els.map(centre), col = rgb(color);
    const legs = []; for (let i = 1; i < pts.length; i++) {
      const d = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
      legs.push({ a: pts[i - 1], b: pts[i], ms: Math.min(650, Math.max(160, d / 1.25)) });
    }
    dots.push({ legs, leg: 0, t: 0, col, onArrive, emit: 0 }); run();
  }
  function run() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); } }
  function tick(now) {
    const dt = Math.min(50, now - last); last = now;
    const host = NodeKit.api.canvas(); if (!cv || cv.parentNode !== host) layer();
    cx.save(); cx.setTransform(1, 0, 0, 1, 0, 0); cx.clearRect(0, 0, cv.width, cv.height); cx.restore();
    cx.globalCompositeOperation = 'lighter';
    for (const d of dots) {
      const L = d.legs[d.leg]; d.t += dt; const k = Math.min(1, d.t / L.ms);
      const x = L.a.x + (L.b.x - L.a.x) * k, y = L.a.y + (L.b.y - L.a.y) * k;
      d.emit += dt; if (d.emit > 22 && parts.length < 160) { d.emit = 0;
        parts.push({ x, y, vx: (Math.random() - .5) * 26, vy: (Math.random() - .5) * 26, t: 0, life: 640, col: d.col, r: 1.2 }); }
      glow(x, y, 3.2, d.col, 1);
      if (k >= 1) { d.t = 0; d.leg++; if (d.leg >= d.legs.length) { d.done = true; if (d.onArrive) d.onArrive(); } }
    }
    dots = dots.filter(d => !d.done);
    for (const p of parts) { p.t += dt; p.x += p.vx * dt / 1000; p.y += p.vy * dt / 1000; p.vy -= 6 * dt / 1000;
      glow(p.x, p.y, p.r, p.col, 1 - p.t / p.life); }
    parts = parts.filter(p => p.t < p.life);
    if (parts.length || dots.length) raf = requestAnimationFrame(tick);
    else { raf = 0; cx.save(); cx.setTransform(1, 0, 0, 1, 0, 0); cx.clearRect(0, 0, cv.width, cv.height); cx.restore(); }
  }
  function glow(x, y, r, col, a) {
    if (a <= 0) return; const k = col.join(',');
    const g = cx.createRadialGradient(x, y, 0, x, y, r * 4);
    g.addColorStop(0, `rgba(${k},${a})`); g.addColorStop(.3, `rgba(${k},${a * .45})`); g.addColorStop(1, `rgba(${k},0)`);
    cx.fillStyle = g; cx.beginPath(); cx.arc(x, y, r * 4, 0, Math.PI * 2); cx.fill();
  }

  function cancelAll() {
    for (const a of [...live]) { if (a.cancel) a.cancel(); else drop(a); }
    live.clear(); parts = []; dots.forEach(d => d.onArrive && d.onArrive()); dots = [];
    if (raf) { cancelAnimationFrame(raf); raf = 0; } if (cx) { cx.save(); cx.setTransform(1, 0, 0, 1, 0, 0); cx.clearRect(0, 0, cv.width, cv.height); cx.restore(); }
  }
  mq.addEventListener('change', cancelAll);
  document.addEventListener('visibilitychange', () => { if (document.hidden) cancelAll(); }); // as Learn's final

  // ---------- the story: the same decisions on every proposal ----------
  const STORY = [
    ['n3', 'answered', { answer: 'no, PLA only' }, 'Answer a need'],
    ['k5', 'irrelevant', null, 'Rank a criterion irrelevant'],
    ['c3', 'lit', null, 'Light a concept'],
    ['k3', 'must', null, 'Change nice to must'],
    ['p4', 'shortlisted', null, 'Shortlist a product'],
    ['p2', 'chosen', null, 'Choose another product (the first goes back to the shortlist)'],
    ['p5', 'rejected', { reason: 'louder than Printer B for the same price' }, 'Reject a product'],
    ['c4', 'dismissed', null, 'Dismiss a concept'],
    ['c4', 'open', null, 'Restore it'],
    ['s', 'bought', null, 'Mark as bought'],
  ];
  let step = 0, timer = 0;
  function show(id) {
    const g = NodeKit.api.graph(), e = NodeKit.api.el(id); if (!e) return;
    const er = e.getBoundingClientRect(), gr = g.getBoundingClientRect();
    if (er.top < gr.top + 40 || er.bottom > gr.bottom - 40 || er.left < gr.left || er.right > gr.right)
      g.scrollTo({ top: g.scrollTop + er.top - gr.top - gr.height / 2 + 30, left: g.scrollLeft + er.left - gr.left - 80, behavior: 'instant' }); // GV-102: pan is instant
  }
  function doStep() {
    if (step >= STORY.length) return false;
    const [id, st, extra, what] = STORY[step++];
    show(id); NodeKit.api.set(id, st, extra);
    say(`${step}/${STORY.length} · ${what}`);
    return true;
  }
  function play() {
    stop(); if (step >= STORY.length) reset();
    const next = () => { if (doStep()) timer = setTimeout(next, 1700); else say('Story done · Reset to replay'); };
    next();
  }
  function stop() { clearTimeout(timer); timer = 0; }
  function reset() { stop(); cancelAll(); step = 0; NodeKit.api.reset(); say('Reset'); }
  function say(t) { const s = document.getElementById('mo-say'); if (s) s.textContent = t; }

  const css = `
.mo-ghost{position:absolute;left:0;top:0;pointer-events:none;z-index:2}
.mo-layer{position:absolute;left:-40px;top:-40px;pointer-events:none;z-index:3}
.kit-node{z-index:1}
.mo-pill{position:fixed;left:12px;bottom:12px;z-index:50;display:flex;flex-wrap:wrap;align-items:center;gap:4px;padding:4px;border:1px solid var(--line);
  border-radius:999px;background:color-mix(in srgb,var(--bg) 78%,transparent);backdrop-filter:blur(10px);font:12px/1.4 var(--font-small);max-width:calc(100vw - 24px)}
.mo-pill button{background:none;border:0;border-radius:999px;padding:4px 10px;color:var(--ink-mute);cursor:pointer;font:inherit}
.mo-pill button:hover{color:var(--ink)}.mo-pill button[aria-pressed="true"]{color:var(--node-lit);background:var(--surface-2)}
.mo-pill #mo-say{color:var(--ink-faint);padding:0 10px 0 6px}
.mo-tag{position:fixed;right:12px;bottom:14px;z-index:50;color:var(--ink-faint);font:11px var(--font-small);pointer-events:none}`;

  function install(name) {
    const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    const pill = document.createElement('div'); pill.className = 'mo-pill ui lx-nolight';
    pill.innerHTML = `<button type="button" id="mo-play">Play the story</button><button type="button" id="mo-step">Step</button><button type="button" id="mo-reset">Reset</button><button type="button" id="mo-reduce" aria-pressed="false">Reduce motion</button><span id="mo-say" aria-live="polite">${mq.matches ? 'Reduced motion is on (system)' : ''}</span>`;
    document.body.appendChild(pill);
    const tag = document.createElement('div'); tag.className = 'mo-tag'; tag.textContent = `prototype controls · ${name}`; document.body.appendChild(tag);
    pill.querySelector('#mo-play').onclick = play;
    pill.querySelector('#mo-step').onclick = () => { stop(); if (!doStep()) say('Story done · Reset to replay'); };
    pill.querySelector('#mo-reset').onclick = reset;
    pill.querySelector('#mo-reduce').onclick = e => { forced = !forced; e.currentTarget.setAttribute('aria-pressed', forced); cancelAll(); };
  }

  window.Motion = { reduced, animate, ghost, drop, embers, travel, cancelAll, install, tok, EASE_OUT, EASE_IN };
})();
