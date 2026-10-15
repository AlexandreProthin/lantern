/* The final backdrop (agent_design/backdrop/RECIPE.md, r005-03 "Calm orbits"), with every colour read from the
   room tokens as the app does (app/src/frame/backdrop.ts): spheres --accent, --path-muted, --line, --node-lit,
   --glow-far; motes --node-lit (warm) and --ink-mute (cool); pointer pool --glow-far; lit-node pool --node-lit;
   base --bg; vignette --code. Re-reads the tokens on the 'lx:tokens' event (the Learn ⇄ Choose toggle).
   Screens: welcome | graph (Survey) | gallery | sheet (token sheet, a calm Welcome-like preset). */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mk = id => { const c = document.createElement('canvas'); c.id = id; c.setAttribute('aria-hidden', 'true'); document.body.prepend(c); return c; };
  const dust = mk('dust'), haze = mk('haze');
  const vig = document.createElement('div'); vig.className = 'vignette'; haze.after(dust, vig);
  const st = document.createElement('style');
  st.textContent = `#haze, #dust { position: fixed; inset: 0; width: 100%; height: 100%; display: block; }
    .vignette { position: fixed; inset: 0; pointer-events: none;
      background: radial-gradient(ellipse 80% 75% at 50% 45%, transparent 55%, color-mix(in srgb, var(--code) 40%, transparent) 100%); }`;
  document.head.appendChild(st);
  const hctx = haze.getContext('2d'), dctx = dust.getContext('2d');
  const DPR = Math.min(1.5, devicePixelRatio || 1);
  let W = 0, H = 0;

  function parse(v) {
    v = (v || '').trim(); let m;
    if ((m = v.match(/^#([0-9a-f]{6})$/i))) { const n = parseInt(m[1], 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
    if ((m = v.match(/^rgba?\(([^)]+)\)$/i))) return m[1].split(',').slice(0, 3).map(x => parseFloat(x));
    return null;
  }
  let C = {};
  function readTokens() {
    const cs = getComputedStyle(document.documentElement), t = (n, f) => parse(cs.getPropertyValue(n)) || f;
    C = { bg: t('--bg', [16, 24, 39]), accent: t('--accent', [232, 182, 110]), path: t('--path-muted', [111, 92, 66]),
          line: t('--line', [59, 69, 88]), lit: t('--node-lit', [255, 225, 170]), glow: t('--glow-far', [255, 182, 88]),
          cool: t('--ink-mute', [174, 179, 191]) };
    const sp = c => { const s = document.createElement('canvas'); s.width = s.height = 64;
      const x = s.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32), k = c.join(',');
      g.addColorStop(0, `rgba(${k},1)`); g.addColorStop(.35, `rgba(${k},.55)`); g.addColorStop(1, `rgba(${k},0)`);
      x.fillStyle = g; x.fillRect(0, 0, 64, 64); return s; };
    C.sprWarm = sp(C.lit); C.sprCool = sp(C.cool);
  }
  readTokens();
  document.addEventListener('lx:tokens', readTokens);

  const SPHERES = [
    { c: 'accent', glow: .30, rx: .20, ry: .13, tilt: .4, per: 80,  ph: 0.0, depth: .6,  a: .24 },
    { c: 'path',   glow: .40, rx: .36, ry: .22, tilt: .3, per: -96, ph: 2.2, depth: .35, a: .20 },
    { c: 'line',   glow: .48, rx: .42, ry: .30, tilt: .2, per: 120, ph: 4.0, depth: .2,  a: .30 },
    { c: 'lit',    glow: .11, rx: .11, ry: .08, tilt: .6, per: -52, ph: 1.1, depth: .8,  a: .10 },
    { c: 'glow',   glow: .22, rx: .30, ry: .26, tilt: .5, per: 70,  ph: 3.3, depth: .5,  a: .10 }
  ];
  const PRESETS = {
    welcome: { cx: .5, cy: .45, sx: 1.0, sy: 1.0, gain: 1,   dust: 1,   lamp: .8 },
    graph:   { cx: .5, cy: .5,  sx: 1.9, sy: 1.7, gain: .55, dust: .5,  lamp: .4 },
    gallery: { cx: .5, cy: .06, sx: 1.4, sy: .45, gain: .8,  dust: .75, lamp: .6 },
    sheet:   { cx: .5, cy: .3,  sx: 1.4, sy: .8,  gain: .7,  dust: .6,  lamp: .5 }
  };
  const S = { screen: 'welcome', speed: 1, t: 0, panX: 0, panY: 0, zoom: 1, sPanX: 0, sPanY: 0, sZoom: 1, px: .5, py: .5, spx: .5, spy: .5, events: [] };
  const P = { ...PRESETS.welcome };
  const rnd = (a, b) => a + Math.random() * (b - a);
  const LAYERS = [
    { key: 'far',  n: 80, depth: .25, size: [.6, 1.0], alpha: [.30, .60], rise: 1 / 260 },
    { key: 'mid',  n: 34, depth: .55, size: [1.1, 1.6], alpha: [.45, .85], rise: 1 / 170 },
    { key: 'near', n: 9,  depth: 1.0, size: [2.0, 2.8], alpha: [.55, .90], rise: 1 / 110 }
  ];
  LAYERS.forEach(L => { L.motes = Array.from({ length: L.n }, () => ({ x: Math.random(), y: Math.random(), s: rnd(...L.size), a: rnd(...L.alpha),
    ph: rnd(0, 6.28), wob: rnd(30, 80), drift: rnd(-.3, .3), warm: Math.random() < .7 })); });

  function resize() { W = Math.max(1, innerWidth); H = Math.max(1, innerHeight); haze.width = W; haze.height = H;
    dust.width = W * DPR; dust.height = H * DPR; dctx.setTransform(DPR, 0, 0, DPR, 0, 0); }
  addEventListener('resize', resize); resize();

  let drag = null;
  addEventListener('pointerdown', e => { if (e.target.closest('.ui, .lx-hit')) return; drag = { x: e.clientX, y: e.clientY, moved: 0 }; });
  addEventListener('pointermove', e => { S.px = e.clientX / W; S.py = e.clientY / H;
    if (drag) { const dx = e.clientX - drag.x, dy = e.clientY - drag.y; S.panX += dx; S.panY += dy; drag.moved += Math.abs(dx) + Math.abs(dy); drag.x = e.clientX; drag.y = e.clientY; } });
  addEventListener('pointerup', e => { if (drag && drag.moved < 5 && !e.target.closest('.ui, .lx-hit, .lx-nolight')) light(e.clientX, e.clientY); drag = null; });
  addEventListener('wheel', e => { if (e.target.closest && e.target.closest('.lx-scroll')) return; S.zoom = Math.min(2.5, Math.max(.5, S.zoom * Math.exp(-e.deltaY * .0012))); }, { passive: true });
  function light(x, y) { S.events.push({ x, y, t0: performance.now() / 1000 }); }
  document.addEventListener('lx:light', e => light(e.detail.x, e.detail.y));
  document.addEventListener('lx:screen', e => { S.screen = e.detail; S.panX = S.panY = 0; S.zoom = 1; if (reduce) Object.assign(P, PRESETS[e.detail]); });
  document.addEventListener('lx:speed', e => { S.speed = e.detail; });

  const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${Math.max(0, a)})`;
  const smooth = x => x * x * (3 - 2 * x);
  const envelope = age => reduce ? (age < 2 ? 1 : 0) : age < 1.4 ? smooth(age / 1.4) : Math.max(0, 1 - smooth(Math.min(1, (age - 1.4) / 3.8)));
  function placeSpheres(t, evs) {
    return SPHERES.map(Sp => {
      const th = 6.2832 * t / Sp.per + Sp.ph, z = Math.sin(th) * Sp.tilt, zoom = 1 + (S.sZoom - 1) * .3 * Sp.depth, near = 1 + .35 * z;
      let x = (P.cx + Sp.rx * Math.cos(th) * P.sx) * W, y = (P.cy + Sp.ry * Math.sin(th) * P.sy) * H;
      x = W / 2 + (x - W / 2) * zoom + S.sPanX * .08 * Sp.depth - (S.spx - .5) * W * .03 * Sp.depth;
      y = H / 2 + (y - H / 2) * zoom + S.sPanY * .08 * Sp.depth - (S.spy - .5) * H * .03 * Sp.depth;
      let flare = 0; for (const ev of evs) flare += ev.e * Math.exp(-(((x - ev.x) ** 2 + (y - ev.y) ** 2) / (W * .25) ** 2));
      return { Sp, x, y, z, a: Sp.a * P.gain * (.75 + .25 * z) * (1 + .2 * flare), glow: Sp.glow * W * near * zoom };
    });
  }
  let lampX = W / 2, lampY = H / 2;
  function lightAt(x, y, sph, evs) {
    let L = 0;
    for (const s of sph) { const dx = (x - s.x) / (s.glow * .55), dy = (y - s.y) / (s.glow * .55); L += 3.2 * s.a * Math.exp(-(dx * dx + dy * dy)); }
    const lx = (x - lampX) / (W * .16), ly = (y - lampY) / (W * .16); L += P.lamp * .9 * Math.exp(-(lx * lx + ly * ly));
    for (const ev of evs) { const ex = (x - ev.x) / (W * .14), ey = (y - ev.y) / (W * .14); L += .7 * ev.e * Math.exp(-(ex * ex + ey * ey)); }
    return L;
  }
  let last = performance.now();
  function frame(now) {
    if (innerWidth && innerHeight && (innerWidth !== W || innerHeight !== H)) resize();
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    if (!reduce) S.t += dt * S.speed;
    const kv = 1 - Math.exp(-dt * 2.2);
    S.sPanX += (S.panX - S.sPanX) * kv; S.sPanY += (S.panY - S.sPanY) * kv; S.sZoom += (S.zoom - S.sZoom) * kv;
    if (!reduce) { const kp = 1 - Math.exp(-dt * .9); S.spx += (S.px - S.spx) * kp; S.spy += (S.py - S.spy) * kp; }
    const T = PRESETS[S.screen], kc = 1 - Math.exp(-dt * .7 * (S.speed > 1 ? 3 : 1));
    for (const k in T) P[k] += (T[k] - P[k]) * kc;
    const kl = reduce ? 1 : 1 - Math.exp(-dt * .7); lampX += (S.px * W - lampX) * kl; lampY += (S.py * H - lampY) * kl;
    const nowS = now / 1000, t = S.t;
    S.events = S.events.filter(ev => nowS - ev.t0 < 5.4);
    const evs = S.events.map(ev => ({ x: ev.x, y: ev.y, e: envelope(nowS - ev.t0), age: nowS - ev.t0 }));
    const sph = placeSpheres(t, evs).sort((a, b) => a.z - b.z);

    hctx.globalCompositeOperation = 'source-over'; hctx.fillStyle = rgba(C.bg, 1); hctx.fillRect(0, 0, W, H);
    hctx.globalCompositeOperation = 'screen';
    for (const s of sph) { const g = hctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.glow), c = C[s.Sp.c];
      g.addColorStop(0, rgba(c, s.a)); g.addColorStop(.3, rgba(c, s.a * .5)); g.addColorStop(1, rgba(c, 0)); hctx.fillStyle = g; hctx.fillRect(0, 0, W, H); }
    [[lampX, lampY, W * .2, C.glow, .045 * P.lamp]].concat(evs.map(e => [e.x, e.y, W * (.07 + .04 * Math.min(1, e.age / 2)), C.lit, .05 * e.e]))
      .forEach(([x, y, r, c, a]) => { const g = hctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, rgba(c, a)); g.addColorStop(1, rgba(c, 0)); hctx.fillStyle = g; hctx.fillRect(0, 0, W, H); });

    dctx.clearRect(0, 0, W, H);
    const pdx = S.spx - .5, pdy = S.spy - .5;
    LAYERS.forEach(L => {
      const vis = L.key === 'near' ? Math.max(0, P.dust * 1.6 - .6) : P.dust; if (vis < .01) return;
      const z = 1 + (S.sZoom - 1) * .4 * L.depth;
      const offX = S.sPanX * .25 * L.depth - pdx * W * .03 * L.depth, offY = S.sPanY * .25 * L.depth - pdy * H * .03 * L.depth;
      L.motes.forEach((m, i) => {
        const shown = Math.min(1, Math.max(0, vis * L.n - i)); if (shown <= 0) return;
        const wx = m.x + m.drift * t / 400 + .012 * Math.sin(t * 6.28 / m.wob + m.ph), wy = m.y - t * L.rise + .008 * Math.cos(t * 6.28 / (m.wob * 1.3) + m.ph);
        let x = ((wx * W + offX) % W + W) % W, y = ((wy * H + offY) % H + H) % H;
        x = W / 2 + (x - W / 2) * z; y = H / 2 + (y - H / 2) * z;
        for (const ev of evs) { const ex = x - ev.x, ey = y - ev.y, dd = Math.hypot(ex, ey) + 1, reach = W * .18;
          if (dd < reach) { const push = 6 * L.depth * ev.e * (1 - dd / reach); x += ex / dd * push; y += ey / dd * push; } }
        const tw = .78 + .22 * Math.sin(t * 1.3 + m.ph * 3), a = Math.min(1, m.a * (.3 + lightAt(x, y, sph, evs)) * tw * shown * P.gain);
        if (a < .012) return;
        const col = m.warm ? C.lit : C.cool;
        if (L.key === 'near') { const s = m.s * z * 5; dctx.globalAlpha = a * .35; dctx.drawImage(m.warm ? C.sprWarm : C.sprCool, x - s / 2, y - s / 2, s, s); }
        dctx.globalAlpha = a; dctx.fillStyle = rgba(col, 1); dctx.beginPath(); dctx.arc(x, y, m.s * z, 0, 6.283); dctx.fill();
      });
    });
    dctx.globalAlpha = 1;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
