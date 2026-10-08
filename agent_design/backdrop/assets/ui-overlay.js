/* Lantern UI replica for the backdrop proposals (round 4 on).
   A static copy of the Learn room's Welcome, Study (graph + panel) and Gallery screens, from
   app/src/rooms/learn/*.svelte, app/src/frame/Shell.svelte and app/src/ui/app.css, drawn over the backdrop canvases.
   Content comes from ../backdrop-data.js (window.BACKDROP_DATA).

   Talks to the proposal page through DOM events:
     listens  lx:screen  {detail: 'welcome' | 'graph' | 'gallery'}   the page's screen switcher changed
     sends    lx:light   {detail: {x, y}}                             a node was lit; the backdrop reacts there
     sends    lx:anchor  {detail: {x, y} | null}                      where the UI's focus is (field, focused node, hovered card)
   Pages mark nothing themselves: elements with .lx-hit swallow pointer input, .lx-scroll swallows the wheel,
   .lx-nolight takes drags (pan) but a click there does not light the backdrop.

   LX_UI.mount({ glass }) — glass: true turns header, panel and cards into frosted glass over the backdrop. */
(() => {
  const D = window.BACKDROP_DATA;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const CSS = `
  .lx { position: fixed; inset: 0; z-index: 5; pointer-events: none; color: var(--ink);
    font: 15px/1.4 'Segoe UI Variable Text', 'Segoe UI', system-ui, sans-serif;
    --node-open: #969ca7; --node-lit: #ffe1aa; --node-understood: #e8b66e; --path-muted: #6f5c42;
    --glow-near: rgba(255, 199, 118, .34); --glow-far: rgba(255, 182, 88, .15); --error-ink: #f0a598;
    --ink-faint: color-mix(in srgb, var(--ink-mute) 62%, var(--bg));
    --lx-surface: var(--surface); --lx-line: var(--line); --lx-blur: none; }
  .lx.glass { --lx-surface: color-mix(in srgb, var(--surface) 55%, transparent); --lx-line: rgba(174, 179, 191, .16);
    --lx-blur: blur(20px) saturate(135%); }
  .lx .lx-hit, .lx .lx-scroll { pointer-events: auto; }
  .lx button { font: inherit; color: var(--ink); background: var(--surface); border: 1px solid var(--line); border-radius: 7px; padding: 7px 14px; cursor: pointer; }
  .lx button:hover { background: var(--surface-2); border-color: var(--accent); }
  .lx button.primary { background: var(--accent); border-color: var(--accent); color: var(--accent-ink); font-weight: 600; }

  /* shell header */
  .lx-head { position: absolute; left: 0; right: 0; top: 0; height: 56px; box-sizing: border-box; display: flex; align-items: center; gap: 12px;
    padding: 0 16px; border-bottom: 1px solid var(--lx-line); background: var(--lx-surface); backdrop-filter: var(--lx-blur); -webkit-backdrop-filter: var(--lx-blur); }
  .lx-head button { background: none; padding: 5px 9px; min-width: 32px; }
  .lx-head .mark { border: 0; padding: 4px 6px; display: flex; } .lx-head .room { color: var(--accent); font-size: 13px; }
  .lx-head nav { display: flex; gap: 4px; } .lx-head nav button[aria-current='page'] { border-color: var(--accent); color: var(--accent); }
  .lx-head .subject { border: 0; max-width: 35vw; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .lx-head .gear { margin-left: auto; }
  .lx-screen { position: absolute; left: 0; right: 0; top: 56px; bottom: 0; display: none; }
  .lx[data-screen='welcome'] .lx-welcome, .lx[data-screen='graph'] .lx-study, .lx[data-screen='gallery'] .lx-gallery { display: block; }

  /* welcome */
  .lx-welcome .wrap { max-width: 760px; margin: 0 auto; padding: 18vh 24px 96px; display: flex; flex-direction: column; gap: 20px; }
  .lx-welcome .ask { position: relative; }
  .lx-welcome .ask:before { content: ''; position: absolute; width: min(560px, 100%); height: 240px; top: -100px; left: 50%; transform: translateX(-50%);
    background: radial-gradient(ellipse, var(--glow-far), transparent 70%); pointer-events: none; }
  .lx-welcome .subj { position: relative; display: block; width: 100%; box-sizing: border-box; border: 0; border-bottom: 1px solid color-mix(in srgb, var(--accent) 45%, var(--line));
    background: transparent; color: var(--ink); font: 350 38px/1.25 'Segoe UI Variable Display', 'Segoe UI', system-ui, sans-serif; letter-spacing: -.01em;
    padding: 6px 0 14px; text-align: center; caret-color: var(--accent); outline: none; }
  .lx-welcome .subj::placeholder { color: var(--ink-faint); }
  .lx-welcome .subj:focus { border-bottom-color: var(--accent); }
  .lx-welcome .example { margin: -8px 0 0; text-align: center; font-size: 12px; color: var(--ink-faint); }
  .lx-welcome .example kbd { font: inherit; color: var(--ink-mute); }
  .lx-welcome .row { display: flex; flex-direction: column; align-items: center; gap: 14px; margin-top: 6px; }
  .lx-welcome .pickers { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 12px; }
  .lx-welcome .tones { display: flex; } .lx-welcome .tones span { padding: 5px 10px; font-size: 12px; color: var(--ink-mute); border-radius: 999px; cursor: pointer; }
  .lx-welcome .tones span.on { background: var(--surface-2); color: var(--node-lit); }
  .lx-welcome .model { font-size: 11px; color: var(--ink-mute); display: flex; gap: 8px; align-items: center; } .lx-welcome .model b { font-weight: 400; font-size: 12px; }
  .lx-welcome .suggest, .lx-welcome .browse { border: 0; background: transparent; font-size: 12px; color: var(--ink-mute); padding: 2px; }
  .lx-welcome .suggest { text-decoration: underline; text-underline-offset: 3px; }
  .lx-welcome .suggest:hover, .lx-welcome .browse:hover { color: var(--accent); background: transparent; }
  .lx-welcome .shelf { margin-top: 15vh; display: flex; flex-direction: column; gap: 18px; }
  .lx-welcome .shelf h2 { margin: 0; text-align: center; font-size: 11px; font-weight: 600; color: var(--ink-faint); }
  .lx-welcome .cards { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 28px; }
  .lx-welcome .card { display: flex; flex-direction: column; gap: 10px; padding: 0; border: 0; background: transparent; text-align: left; opacity: .7; }
  .lx-welcome .card:hover { opacity: 1; background: transparent; } .lx-welcome .card:hover .thumb { filter: drop-shadow(0 0 12px var(--glow-far)); }
  .lx-welcome .card h3 { font-size: 16px; font-weight: 600; margin: 0; }
  .lx-welcome .meta { display: flex; justify-content: space-between; font-size: 12px; color: var(--ink-faint); } .lx-welcome .meta b { font-weight: 400; color: var(--ink-mute); }
  .lx-welcome .cont { font-size: 12px; color: var(--ink-mute); text-decoration: underline; text-underline-offset: 3px; }
  .lx-welcome .browse { align-self: center; padding: 6px; }

  /* thumbnails */
  .lx .thumb { aspect-ratio: 16 / 9; width: 100%; background: var(--lx-surface); backdrop-filter: var(--lx-blur); -webkit-backdrop-filter: var(--lx-blur); border-radius: 8px; overflow: hidden; }
  .lx .thumb svg { display: block; width: 100%; height: 100%; }
  .lx .thumb line { stroke: var(--path-muted); stroke-width: 1; } .lx .thumb circle { stroke-width: 1; }
  .lx .thumb .open { fill: var(--bg); stroke: var(--node-open); stroke-dasharray: 1.2 1.5; }
  .lx .thumb .lit { fill: var(--surface-2); stroke: var(--node-lit); } .lx .thumb .understood { fill: var(--node-understood); stroke: var(--node-understood); }

  /* study: graph + divider + panel */
  .lx-study { display: none; }
  .lx[data-screen='graph'] .lx-study { display: flex; }
  .lx-graph { position: relative; width: calc(56% - 4px); height: 100%; overflow: hidden; cursor: grab; pointer-events: auto; }
  .lx-graph:active { cursor: grabbing; }
  .lx-world { position: absolute; left: 0; top: 0; transform-origin: 0 0; will-change: transform; }
  .lx-edges { position: absolute; left: 0; top: 0; width: 1px; height: 1px; overflow: visible; pointer-events: none; }
  .lx-edges path { fill: none; stroke: var(--path-muted); stroke-width: 1; } .lx-edges path.route { stroke: var(--accent); }
  .lx-node { position: absolute; width: 150px; padding: 8px !important; margin: 0; background: none !important; border: 0 !important; border-radius: 0;
    display: flex; flex-direction: column; align-items: center; gap: 14px; transform: translate(-50%, -30px); color: inherit; }
  .lx-node .disc { display: grid; place-items: center; width: 44px; height: 44px; flex-shrink: 0; border: 1px solid var(--node-open); border-radius: 50%;
    background: var(--bg); color: var(--node-open); box-sizing: border-box; transition: box-shadow .5s, background .5s, border-color .5s; }
  .lx-node .name { display: block; font-size: 13px; line-height: 1.5; text-align: center; color: var(--ink); }
  .lx-node:focus { outline: none; }
  .lx-node:hover .name { text-decoration: underline; text-underline-offset: 4px; }
  .lx-node[data-state='open'] .disc { border-style: dotted; }
  .lx-node[data-state='lit'] .disc { background: var(--surface-2); border-color: var(--node-lit); color: var(--node-lit);
    box-shadow: 0 0 14px 2px var(--glow-near), 0 0 38px 9px var(--glow-far); }
  .lx-node[data-state='understood'] .disc { background: var(--node-understood); border-color: var(--node-understood); color: var(--accent-ink); }
  .lx-node[aria-pressed='true'] .disc { outline: 1px solid var(--focus); outline-offset: 6px; }
  .lx-node svg { width: 18px; height: 18px; }
  .lx-graph .ctl { position: absolute; display: flex; gap: 8px; z-index: 2; }
  .lx-graph .ctl button { background: var(--lx-surface); backdrop-filter: var(--lx-blur); -webkit-backdrop-filter: var(--lx-blur); font-size: 13px; padding: 6px 11px; }
  .lx-graph .layout { right: 20px; top: 16px; } .lx-graph .zoom { right: 20px; bottom: 20px; } .lx-graph .corner { left: 20px; bottom: 20px; }
  .lx-divider { width: 8px; flex: 0 0 8px; background: var(--lx-line); }
  .lx-panel { flex: 1; min-width: 0; height: 100%; display: flex; flex-direction: column; background: var(--lx-surface); backdrop-filter: var(--lx-blur); -webkit-backdrop-filter: var(--lx-blur); }
  .lx-panel .scroll { padding: 20px 28px 32px; flex: 1; overflow: auto; }
  .lx-panel .crumbs { display: flex; gap: 5px; align-items: center; font-size: 12px; color: var(--ink-mute); }
  .lx-panel .meta { font-size: 11px; color: var(--ink-mute); margin-top: 12px; }
  .lx-panel .chip { border: 1px solid var(--line); border-radius: 8px; padding: 2px 6px; color: var(--node-lit); }
  .lx-panel .chip[data-state='understood'] { color: var(--node-understood); border-color: var(--node-understood); } .lx-panel .chip[data-state='open'] { color: var(--ink-mute); }
  .lx-panel h1 { font-size: 24px; font-weight: 600; margin: 12px 0; } .lx-panel h2 { font-size: 13px; color: var(--ink-mute); font-weight: 500; margin: 20px 0 10px; }
  .lx-panel .hook { font-style: italic; color: var(--ink-mute); } .lx-panel p { line-height: 1.6; }
  .lx-panel .option { display: grid; text-align: left; width: 100%; margin: 8px 0; gap: 5px; } .lx-panel .option span { color: var(--ink-mute); font-size: 12px; }
  .lx-panel .turn { padding: 10px 14px; margin: 10px 0; } .lx-panel .turn.tutor { border-left: 2px solid var(--accent); }
  .lx-panel .turn.learner { margin-left: 30px; background: var(--surface-2); border-radius: 8px; }
  .lx-panel footer { padding: 12px 20px; border-top: 1px solid var(--lx-line); }
  .lx-panel footer textarea { width: 100%; box-sizing: border-box; resize: none; font: inherit; color: var(--ink); background: color-mix(in srgb, var(--bg) 60%, transparent);
    border: 1px solid var(--line); border-radius: 7px; padding: 8px 10px; }
  .lx-panel footer .actions { display: flex; gap: 6px; margin-top: 8px; } .lx-panel footer .actions button { font-size: 12px; }

  /* gallery */
  .lx-gallery { box-sizing: border-box; overflow: auto; padding: 32px clamp(24px, 4vw, 64px) 64px; }
  .lx-gallery h1 { margin: 0; font-size: 24px; font-weight: 350; }
  .lx-gallery .toolbar { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; margin-bottom: 28px; pointer-events: auto; }
  .lx-gallery .toolbar > span { color: var(--ink-mute); font-size: 12px; margin-right: auto; }
  .lx-gallery .toolbar label { display: flex; align-items: center; gap: 8px; font-size: 12px; }
  .lx-gallery .toolbar .sel, .lx-gallery .toolbar .filter { font-size: 13px; padding: 6px 10px; border: 1px solid var(--line); border-radius: 7px; background: var(--lx-surface); color: var(--ink-mute); }
  .lx-gallery .toolbar .filter { min-width: 190px; }
  .lx-gallery .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 22px; max-width: 1600px; align-items: start; }
  @media (min-width: 1024px) { .lx-gallery .grid { grid-template-columns: repeat(3, minmax(260px, 1fr)); } }
  @media (min-width: 1400px) { .lx-gallery .grid { grid-template-columns: repeat(4, minmax(260px, 1fr)); } }
  .lx-gallery .card { padding: 18px; border: 1px solid var(--lx-line); border-radius: 12px; background: var(--lx-surface); backdrop-filter: var(--lx-blur); -webkit-backdrop-filter: var(--lx-blur);
    min-width: 0; cursor: pointer; }
  .lx-gallery .card.selected { outline: 2px solid var(--focus); outline-offset: 2px; }
  .lx-gallery .card:hover .thumb { filter: drop-shadow(0 0 8px var(--glow-far)); }
  .lx-gallery .card .thumb { background: color-mix(in srgb, var(--bg) 55%, transparent); }
  .lx-gallery h2 { font-size: 16px; margin: 14px 0 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .lx-gallery .progress { height: 2px; background: var(--line); margin-bottom: 16px; } .lx-gallery .progress span { display: block; height: 100%; background: var(--node-understood); }
  .lx-gallery dl { display: grid; gap: 7px; margin: 0; font-size: 12px; } .lx-gallery dl > div { display: flex; justify-content: space-between; }
  .lx-gallery dt { color: var(--ink-mute); } .lx-gallery dd { margin: 0; font-variant-numeric: tabular-nums; }
  .lx-gallery .span, .lx-gallery .model { font-size: 12px; color: var(--ink-mute); margin: 12px 0 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  /* the proposal's own prototype controls move into the header, its label to the bottom-left */
  .ui { top: 10px !important; bottom: auto !important; z-index: 30 !important; padding: 3px !important; }
  .ui .hint { display: none; }
  .tag { top: 64px !important; left: 14px !important; z-index: 30; font-size: 11px; }
  @media (max-width: 760px) { .lx-welcome .subj { font-size: 26px; } .lx-welcome .cards { grid-template-columns: 1fr; } .lx-welcome .wrap { padding-top: 10vh; }
    .lx-study { flex-direction: column; } .lx-graph { width: 100%; height: 55%; } .lx-divider { display: none; } }
  `;

  const MARK = `<svg viewBox="0 0 28 28" width="28" height="28" aria-hidden="true"><circle cx="14" cy="15" r="7" fill="none" stroke="#e8b66e" stroke-width="1.4"/>
    <circle cx="14" cy="15" r="2.6" fill="#ffe1aa"/><path d="M10 7.5h8M14 4v3.5" stroke="#e8b66e" stroke-width="1.4" stroke-linecap="round"/></svg>`;
  const ICON = { understood: '<svg viewBox="0 0 18 18"><path d="M4.5 9.5l3 3 6-7" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
                 lit: '<svg viewBox="0 0 18 18"><circle cx="9" cy="9" r="3" fill="currentColor"/></svg>', open: '' };

  function thumb(tree) {
    // breadth-first rows, leaves spread evenly: close to the app's treePositions at thumbnail scale
    const depth = tree.map(([p]) => 0), kids = tree.map(() => []);
    tree.forEach(([p], i) => { if (p >= 0) { depth[i] = depth[p] + 1; kids[p].push(i); } });
    const x = [], leaves = []; (function walk(i) { if (!kids[i].length) leaves.push(i); kids[i].forEach(walk); })(0);
    leaves.forEach((l, k) => x[l] = k * 40);
    (function place(i) { kids[i].forEach(place); if (kids[i].length) x[i] = (x[kids[i][0]] + x[kids[i].at(-1)]) / 2; })(0);
    const xs = x, ys = depth.map(d => d * 18), minX = Math.min(...xs), maxX = Math.max(...xs), maxY = Math.max(...ys);
    const w = Math.max(40, maxX - minX + 16), h = Math.max(22.5, maxY + 16), W = Math.max(w, h * 16 / 9), H = Math.max(h, w * 9 / 16);
    const vb = `${(minX + maxX) / 2 - W / 2} ${maxY / 2 - H / 2} ${W} ${H}`;
    let s = `<svg viewBox="${vb}">`;
    tree.forEach(([p], i) => { if (p >= 0) s += `<line x1="${xs[p]}" y1="${ys[p]}" x2="${xs[i]}" y2="${ys[i]}"/>`; });
    tree.forEach(([, st], i) => { s += `<circle cx="${xs[i]}" cy="${ys[i]}" r="3" class="${st}"/>`; });
    return `<div class="thumb">${s}</svg></div>`;
  }

  function mount(opts = {}) {
    const style = document.createElement('style'); style.textContent = CSS; document.head.appendChild(style);
    const root = document.createElement('div'); root.className = 'lx' + (opts.glass ? ' glass' : ''); root.dataset.screen = 'welcome';
    const S = D.subjects, G = D.graph, Pn = D.panel;
    const nodes = new Map(G.nodes.map(n => [n.id, { ...n }]));
    let focus = G.focus;

    root.innerHTML = `
      <header class="lx-head lx-hit"><button class="mark" data-go="welcome" aria-label="Welcome">${MARK}</button><span class="room">Learn</span>
        <nav><button data-go="welcome" aria-label="Welcome">⌂</button><button data-go="graph" aria-label="Study">⌘</button><button data-go="gallery" aria-label="Gallery">▦</button></nav>
        <button class="subject">${esc(G.subject)}</button><button class="gear" aria-label="Settings">⚙</button></header>
      <section class="lx-screen lx-welcome"><div class="wrap">
        <div class="ask"><input class="subj lx-hit" placeholder="What do you want to learn?" aria-label="What do you want to learn?"></div>
        <p class="example">For example, ocean tides, jazz harmony, or how cities grow. <kbd>Shift+Enter</kbd> adds a direction.</p>
        <div class="row"><div class="pickers"><div class="tones lx-hit">${['ELI5', 'Curious', 'Student', 'Engineer', 'Expert', 'Custom'].map((t, i) => `<span class="${i === 1 ? 'on' : ''}">${t}</span>`).join('')}</div>
          <div class="model">Model <b>Opus 5.5 ▾</b></div></div><button class="suggest lx-hit">Suggest 3 subjects</button></div>
        <section class="shelf"><h2>Pick up the light</h2><div class="cards">
          ${S.slice(0, 3).map((s, i) => `<button class="card lx-hit" data-card="${i}">${thumb(s.thumb)}<h3>${esc(s.title)}</h3><div class="meta"><b>${s.understood} / ${s.total}</b><span>${esc(s.lastOpened)}</span></div><span class="cont">Continue</span></button>`).join('')}
        </div><button class="browse lx-hit" data-go="gallery">Browse all ${S.length}</button></section>
      </div></section>
      <section class="lx-screen lx-study">
        <div class="lx-graph lx-nolight"><div class="lx-world"><svg class="lx-edges"></svg></div>
          <nav class="ctl layout lx-hit"><button>Tidy layout</button></nav>
          <nav class="ctl zoom lx-hit"><button data-z="out">−</button><button data-z="reset">⌖</button><button data-z="in">+</button></nav>
          <div class="ctl corner lx-hit"><button>Open</button><button>Legend</button></div></div>
        <div class="lx-divider lx-hit"></div>
        <aside class="lx-panel lx-hit lx-scroll"><div class="scroll">
          <nav class="crumbs">${Pn.crumbs.map(esc).join(' <span>›</span> ')}</nav>
          <div class="meta">${esc(Pn.kind)} · <span class="chip" data-state="${Pn.state}">${Pn.state}</span> · Opus 5.5</div>
          <h1 class="ptitle">${esc(Pn.title)}</h1><p class="hook">${esc(Pn.hook)}</p>
          ${Pn.body.map(p => `<p>${esc(p)}</p>`).join('')}
          <h2>Go deeper</h2>${Pn.deeper.map(o => `<button class="option"><strong>${esc(o.title)}</strong><span>${esc(o.hook)}</span></button>`).join('')}
          ${Pn.turns.map(t => `<div class="turn ${t.role}">${esc(t.text)}</div>`).join('')}
        </div><footer><textarea rows="2" placeholder="Ask about this…"></textarea><div class="actions"><button class="primary">Send</button><button>Test me</button><button>I get it</button></div></footer></aside>
      </section>
      <section class="lx-screen lx-gallery lx-scroll">
        <div class="toolbar"><h1>Gallery</h1><span>${S.length} subjects</span><label>Sort <span class="sel">Last opened ▾</span></label><button>↓</button><span class="filter">Filter subjects</span></div>
        <div class="grid">${S.map((s, i) => `<div class="card lx-hit${i === 0 ? ' selected' : ''}" data-card="${i}">${thumb(s.thumb)}<h2>${esc(s.title)}</h2>
          <div class="progress"><span style="width:${Math.round(s.understood / s.total * 100)}%"></span></div>
          <dl><div><dt>Nodes</dt><dd>${s.total}</dd></div><div><dt>Lit</dt><dd>${s.lit}</dd></div><div><dt>Understood</dt><dd>${s.understood}</dd></div></dl>
          <p class="span">Created ${new Date(s.created).toLocaleDateString()} → ${esc(s.lastOpened)}</p><p class="model">${esc(s.model)}</p></div>`).join('')}</div>
      </section>`;
    document.body.appendChild(root);

    const $ = sel => root.querySelector(sel), graph = $('.lx-graph'), world = $('.lx-world'), edges = $('.lx-edges');
    // graph nodes
    for (const n of nodes.values()) {
      const b = document.createElement('button'); b.className = 'lx-node lx-hit'; b.dataset.id = n.id;
      b.style.left = n.x + 'px'; b.style.top = n.y + 'px';
      b.innerHTML = `<span class="disc"></span><span class="name">${esc(n.title)}</span>`;
      world.appendChild(b); n.el = b;
    }
    function routeTo(id) { const r = new Set(); for (let n = nodes.get(id); n; n = nodes.get(n.parent)) r.add(n.id); return r; }
    function paint() {
      const route = routeTo(focus);
      edges.innerHTML = [...nodes.values()].filter(n => n.parent).map(n => {
        const p = nodes.get(n.parent), my = (p.y + n.y) / 2;
        return `<path class="${route.has(n.id) ? 'route' : ''}" d="M${p.x} ${p.y}C${p.x} ${my} ${n.x} ${my} ${n.x} ${n.y}"/>`;
      }).join('');
      for (const n of nodes.values()) {
        n.el.dataset.state = n.state; n.el.setAttribute('aria-pressed', n.id === focus);
        n.el.querySelector('.disc').innerHTML = ICON[n.state];
      }
      const f = nodes.get(focus);
      $('.ptitle').textContent = f.title;
      const chip = $('.lx-panel .chip'); chip.dataset.state = f.state; chip.textContent = f.state;
    }
    paint();

    // view: pan and zoom the graph like the app (instant), while the backdrop follows with depth
    const V = { x: 0, y: 0, z: 1 };
    function place() {
      const r = graph.getBoundingClientRect();
      world.style.transform = `translate(${r.width / 2 + V.x}px, ${r.height / 2 + V.y}px) scale(${V.z})`;
      anchor();
    }
    let drag = null;
    graph.addEventListener('pointerdown', e => { if (e.target.closest('.lx-hit')) return; drag = { x: e.clientX, y: e.clientY }; });
    addEventListener('pointermove', e => { if (!drag) return; V.x += e.clientX - drag.x; V.y += e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY; place(); });
    addEventListener('pointerup', () => drag = null);
    addEventListener('wheel', e => {
      if (root.dataset.screen !== 'graph' || (e.target.closest && e.target.closest('.lx-scroll'))) return;
      V.z = Math.min(2.5, Math.max(.5, V.z * Math.exp(-e.deltaY * .0012))); place();
    }, { passive: true });
    root.querySelectorAll('[data-z]').forEach(b => b.onclick = () => {
      if (b.dataset.z === 'reset') { V.x = V.y = 0; V.z = 1; } else V.z = Math.min(2.5, Math.max(.5, V.z * (b.dataset.z === 'in' ? 1.2 : 1 / 1.2)));
      place();
    });
    addEventListener('keydown', e => { if ((e.key === 'r' || e.key === 'R') && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') { V.x = V.y = 0; V.z = 1; place(); } });

    // learning events: clicking a node focuses it and lights it one step (open → lit → understood)
    function lightNode(n) {
      if (n.state === 'open') n.state = 'lit'; else if (n.state === 'lit') n.state = 'understood';
      focus = n.id; paint();
      const r = n.el.querySelector('.disc').getBoundingClientRect();
      document.dispatchEvent(new CustomEvent('lx:light', { detail: { x: r.left + r.width / 2, y: r.top + r.height / 2 } }));
      anchor();
    }
    world.addEventListener('click', e => { const b = e.target.closest('.lx-node'); if (b) lightNode(nodes.get(b.dataset.id)); });
    // on Graph, the page's "Light a node" lights a real node rather than a random point
    document.addEventListener('click', e => {
      if (root.dataset.screen !== 'graph' || !e.target.closest || !e.target.closest('#light')) return;
      e.stopImmediatePropagation(); e.preventDefault();
      const pool = [...nodes.values()].filter(n => n.state !== 'understood');
      lightNode(pool.length ? pool[Math.floor(Math.random() * pool.length)] : nodes.get('root'));
    }, true);

    // screens
    function show(s) {
      root.dataset.screen = s;
      root.querySelectorAll('nav [data-go]').forEach(b => b.dataset.go === s ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current'));
      $('.subject').style.display = s === 'welcome' ? 'none' : '';
      V.x = V.y = 0; V.z = 1; requestAnimationFrame(place);
    }
    root.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => { const t = document.querySelector(`.ui [data-s="${b.dataset.go}"]`); if (t) t.click(); }));
    document.addEventListener('lx:screen', e => show(e.detail));
    root.querySelectorAll('.lx-welcome .tones span').forEach(t => t.onclick = () => { root.querySelectorAll('.lx-welcome .tones span').forEach(x => x.classList.toggle('on', x === t)); });
    root.querySelectorAll('.lx-gallery .card').forEach(c => c.onclick = () => root.querySelectorAll('.lx-gallery .card').forEach(x => x.classList.toggle('selected', x === c)));

    // where the UI's attention is, for pages that centre their light on it
    let hovered = null;
    root.querySelectorAll('[data-card]').forEach(c => { c.addEventListener('pointerenter', () => { hovered = c; anchor(); }); c.addEventListener('pointerleave', () => { hovered = null; anchor(); }); });
    function anchor() {
      const s = root.dataset.screen; let el = null;
      if (s === 'welcome') el = hovered && hovered.closest('.lx-welcome') ? hovered.querySelector('.thumb') : $('.lx-welcome .subj');
      else if (s === 'graph') el = nodes.get(focus).el.querySelector('.disc');
      else if (hovered && hovered.closest('.lx-gallery')) el = hovered.querySelector('.thumb');
      let detail = null;
      if (el) { const r = el.getBoundingClientRect(); if (r.width) detail = { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
      document.dispatchEvent(new CustomEvent('lx:anchor', { detail }));
    }
    addEventListener('resize', () => place());
    show('welcome');
  }

  window.LX_UI = { mount };
})();
