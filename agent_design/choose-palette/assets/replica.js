/* Choose room replica for the palette proposals. Adapted from agent_design/backdrop/assets/ui-overlay.js (the app's
   Welcome, Study and Gallery), with Choose's words and every colour read from the room tokens on :root.
   Only colour is under study: layout and type are Learn's. The decision board, Compare, the node glyphs and Choose's
   Welcome are later designs, so they are absent or neutral here (Compare is an inert nav button).
   Content: ../choose-palette-data.js (window.CHOOSE_PALETTE_DATA).
   Events: sends lx:screen, lx:light, lx:tokens, lx:speed (read by backdrop.js).
   CHOOSE_UI.mount({ id, name }) */
(() => {
  const D = window.CHOOSE_PALETTE_DATA;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const TOKENS = ['--bg', '--surface', '--surface-2', '--ink', '--ink-mute', '--line', '--accent', '--accent-ink', '--focus',
    '--node-open', '--node-lit', '--node-understood', '--glow-near', '--glow-far', '--path-muted', '--code', '--error', '--error-ink'];

  const CSS = `
  html, body { margin: 0; height: 100%; overflow: hidden; background: var(--bg); color: var(--ink); }
  .lx { position: fixed; inset: 0; z-index: 5; pointer-events: none; color: var(--ink);
    font: 15px/1.4 'Segoe UI Variable Text', 'Segoe UI', system-ui, sans-serif;
    --ink-faint: color-mix(in srgb, var(--ink-mute) 62%, var(--bg));
    --lx-surface: color-mix(in srgb, var(--surface) 55%, transparent); --lx-line: color-mix(in srgb, var(--ink-mute) 16%, transparent);
    --lx-blur: blur(20px) saturate(135%); }
  .lx .lx-hit, .lx .lx-scroll { pointer-events: auto; }
  .lx button { font: inherit; color: var(--ink); background: var(--surface); border: 1px solid var(--line); border-radius: 7px; padding: 7px 14px; cursor: pointer; }
  .lx button:hover { background: var(--surface-2); border-color: var(--accent); }
  .lx button:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }
  .lx button.primary { background: var(--accent); border-color: var(--accent); color: var(--accent-ink); font-weight: 600; }
  .lx button[disabled] { opacity: .45; cursor: default; }

  .lx-head { position: absolute; left: 0; right: 0; top: 0; height: 56px; box-sizing: border-box; display: flex; align-items: center; gap: 12px;
    padding: 0 16px; border-bottom: 1px solid var(--lx-line); background: var(--lx-surface); backdrop-filter: var(--lx-blur); -webkit-backdrop-filter: var(--lx-blur); }
  .lx-head button { background: none; padding: 5px 9px; min-width: 32px; }
  .lx-head .mark { border: 0; padding: 4px 6px; display: flex; } .lx-head .room { color: var(--accent); font-size: 13px; }
  .lx-head nav { display: flex; gap: 4px; } .lx-head nav button[aria-current='page'] { border-color: var(--accent); color: var(--accent); }
  .lx-head .subject { border: 0; max-width: 30vw; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .lx-head .stats { font-size: 12px; color: var(--ink-mute); white-space: nowrap; }
  .lx-head .gear { margin-left: auto; }
  .lx-screen { position: absolute; left: 0; right: 0; top: 56px; bottom: 0; display: none; }
  .lx[data-screen='welcome'] .lx-welcome, .lx[data-screen='gallery'] .lx-gallery, .lx[data-screen='sheet'] .lx-sheet { display: block; }

  .lx-welcome .wrap { max-width: 760px; margin: 0 auto; padding: 18vh 24px 96px; display: flex; flex-direction: column; gap: 20px; }
  .lx-welcome .ask { position: relative; }
  .lx-welcome .ask:before { content: ''; position: absolute; width: min(560px, 100%); height: 240px; top: -100px; left: 50%; transform: translateX(-50%);
    background: radial-gradient(ellipse, var(--glow-far), transparent 70%); pointer-events: none; }
  .lx-welcome .subj { position: relative; display: block; width: 100%; box-sizing: border-box; border: 0; border-bottom: 1px solid color-mix(in srgb, var(--accent) 45%, var(--line));
    background: transparent; color: var(--ink); font: 350 38px/1.25 'Segoe UI Variable Display', 'Segoe UI', system-ui, sans-serif; letter-spacing: -.01em;
    padding: 6px 0 14px; text-align: center; caret-color: var(--accent); outline: none; }
  .lx-welcome .subj::placeholder { color: var(--ink-faint); } .lx-welcome .subj:focus { border-bottom-color: var(--accent); }
  .lx-welcome .example { margin: -8px 0 0; text-align: center; font-size: 12px; color: var(--ink-faint); }
  .lx-welcome .example kbd { font: inherit; color: var(--ink-mute); }
  .lx-welcome .row { display: flex; flex-direction: column; align-items: center; gap: 14px; margin-top: 6px; }
  .lx-welcome .pickers { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 12px; }
  .lx-welcome .tones { display: flex; } .lx-welcome .tones span { padding: 5px 10px; font-size: 12px; color: var(--ink-mute); border-radius: 999px; cursor: pointer; }
  .lx-welcome .tones span.on { background: var(--surface-2); color: var(--node-lit); }
  .lx-welcome .model { font-size: 11px; color: var(--ink-mute); display: flex; gap: 8px; align-items: center; } .lx-welcome .model b { font-weight: 400; font-size: 12px; }
  .lx-welcome .browse { border: 0; background: transparent; font-size: 12px; color: var(--ink-mute); padding: 6px; align-self: center; }
  .lx-welcome .browse:hover { color: var(--accent); background: transparent; }
  .lx-welcome .shelf { margin-top: 13vh; display: flex; flex-direction: column; gap: 18px; }
  .lx-welcome .shelf h2 { margin: 0; text-align: center; font-size: 11px; font-weight: 600; color: var(--ink-faint); }
  .lx-welcome .cards { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 28px; }
  .lx-welcome .card { display: flex; flex-direction: column; gap: 10px; padding: 0; border: 0; background: transparent; text-align: left; opacity: .75; }
  .lx-welcome .card:hover { opacity: 1; background: transparent; } .lx-welcome .card:hover .thumb { filter: drop-shadow(0 0 12px var(--glow-far)); }
  .lx-welcome .card h3 { font-size: 16px; font-weight: 600; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .lx-welcome .meta { display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: var(--ink-faint); }

  .lx .status { font-size: 11px; padding: 1px 8px; border-radius: 999px; border: 1px solid var(--line); color: var(--ink-mute); white-space: nowrap; }
  .lx .status[data-s='decided'] { border-color: var(--accent); color: var(--accent); }
  .lx .status[data-s='bought'] { background: var(--node-understood); border-color: var(--node-understood); color: var(--accent-ink); }

  .lx .thumb { aspect-ratio: 16 / 9; width: 100%; background: var(--lx-surface); backdrop-filter: var(--lx-blur); -webkit-backdrop-filter: var(--lx-blur); border-radius: 8px; overflow: hidden; }
  .lx .thumb svg { display: block; width: 100%; height: 100%; }
  .lx .thumb line { stroke: var(--path-muted); stroke-width: 1; } .lx .thumb circle { stroke-width: 1; }
  .lx .thumb .open { fill: var(--bg); stroke: var(--node-open); stroke-dasharray: 1.2 1.5; }
  .lx .thumb .lit { fill: var(--surface-2); stroke: var(--node-lit); } .lx .thumb .settled { fill: var(--node-understood); stroke: var(--node-understood); }
  .lx .thumb .faded { fill: var(--bg); stroke: var(--node-open); opacity: .4; }

  .lx-study { display: none; } .lx[data-screen='graph'] .lx-study { display: flex; }
  .lx-graph { position: relative; width: calc(56% - 4px); height: 100%; overflow: hidden; cursor: grab; pointer-events: auto; }
  .lx-graph:active { cursor: grabbing; }
  .lx-world { position: absolute; left: 0; top: 0; transform-origin: 0 0; will-change: transform; }
  .lx-edges { position: absolute; left: 0; top: 0; width: 1px; height: 1px; overflow: visible; pointer-events: none; }
  .lx-edges path { fill: none; stroke: var(--path-muted); stroke-width: 1; } .lx-edges path.route { stroke: var(--accent); }
  .lx-node { position: absolute; width: 120px; padding: 8px !important; margin: 0; background: none !important; border: 0 !important; border-radius: 0;
    display: flex; flex-direction: column; align-items: center; gap: 12px; transform: translate(-50%, -30px); color: inherit; }
  .lx-node .disc { display: grid; place-items: center; width: 44px; height: 44px; flex-shrink: 0; border: 1px solid var(--node-open); border-radius: 50%;
    background: var(--bg); color: var(--node-open); box-sizing: border-box; transition: box-shadow .5s, background .5s, border-color .5s; }
  .lx-node .name { display: block; font-size: 13px; line-height: 1.4; text-align: center; color: var(--ink); }
  .lx-node .kind { display: block; font-size: 10px; color: var(--ink-faint); margin-top: -8px; }
  .lx-node:focus { outline: none; } .lx-node:hover .name { text-decoration: underline; text-underline-offset: 4px; }
  .lx-node[data-look='open'] .disc { border-style: dotted; }
  .lx-node[data-look='lit'] .disc { background: var(--surface-2); border-color: var(--node-lit); color: var(--node-lit); box-shadow: 0 0 14px 2px var(--glow-near), 0 0 38px 9px var(--glow-far); }
  .lx-node[data-look='settled'] .disc { background: var(--node-understood); border-color: var(--node-understood); color: var(--accent-ink); }
  .lx-node[data-look='faded'] { opacity: .45; } .lx-node[data-look='faded'] .disc { border-style: dashed; }
  .lx-node[data-look='faded'] .name { text-decoration: line-through; text-decoration-color: var(--ink-faint); }
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
  .lx-panel h1 { font-size: 24px; font-weight: 600; margin: 12px 0; } .lx-panel h2 { font-size: 13px; color: var(--ink-mute); font-weight: 500; margin: 22px 0 10px; }
  .lx-panel .hook { font-style: italic; color: var(--ink-mute); } .lx-panel p { line-height: 1.6; }
  .lx-panel .facts { display: grid; gap: 8px; }
  .lx-panel .fact { display: grid; gap: 3px; padding: 9px 12px; border: 1px solid var(--lx-line); border-radius: 8px; background: color-mix(in srgb, var(--bg) 35%, transparent); }
  .lx-panel .fact .src { font-size: 11px; color: var(--ink-mute); display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
  .lx-panel .tag { font-size: 10px; letter-spacing: .03em; text-transform: uppercase; padding: 1px 6px; border-radius: 4px; border: 1px solid var(--line); color: var(--ink-mute); }
  .lx-panel .fact[data-k='spec'] .tag { border-color: var(--accent); color: var(--accent); }
  .lx-panel .fact[data-k='opinion'] .txt { font-style: italic; }
  .lx-panel .fact[data-k='sponsored'] .tag { border-color: var(--error); color: var(--error-ink); }
  .lx-panel .fact[data-k='sponsored'] .txt { color: var(--ink-mute); text-decoration: line-through; text-decoration-color: var(--error); }
  .lx-panel .option { display: grid; text-align: left; width: 100%; margin: 8px 0; gap: 5px; } .lx-panel .option span { color: var(--ink-mute); font-size: 12px; }
  .lx-panel .turn { padding: 10px 14px; margin: 10px 0; } .lx-panel .turn.tutor { border-left: 2px solid var(--accent); }
  .lx-panel .turn.user { margin-left: 30px; background: var(--surface-2); border-radius: 8px; }
  .lx-panel .turn .acts { display: flex; gap: 6px; margin-top: 8px; } .lx-panel .turn .acts button { font-size: 12px; padding: 4px 10px; }
  .lx-panel footer { padding: 12px 20px; border-top: 1px solid var(--lx-line); }
  .lx-panel footer textarea { width: 100%; box-sizing: border-box; resize: none; font: inherit; color: var(--ink); background: color-mix(in srgb, var(--bg) 60%, transparent);
    border: 1px solid var(--line); border-radius: 7px; padding: 8px 10px; }
  .lx-panel footer .actions { display: flex; gap: 6px; margin-top: 8px; } .lx-panel footer .actions button { font-size: 12px; }

  .lx-gallery, .lx-sheet { box-sizing: border-box; overflow: auto; padding: 32px clamp(16px, 4vw, 64px) 64px; }
  .lx-gallery h1, .lx-sheet h1 { margin: 0; font-size: 24px; font-weight: 350; }
  .lx-gallery .toolbar { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; margin-bottom: 28px; }
  .lx-gallery .toolbar > span { color: var(--ink-mute); font-size: 12px; margin-right: auto; }
  .lx-gallery .toolbar .sel, .lx-gallery .toolbar .filter { font-size: 13px; padding: 6px 10px; border: 1px solid var(--line); border-radius: 7px; background: var(--lx-surface); color: var(--ink-mute); }
  .lx-gallery .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 22px; max-width: 1600px; align-items: start; }
  @media (min-width: 1024px) { .lx-gallery .grid { grid-template-columns: repeat(3, minmax(240px, 1fr)); } }
  .lx-gallery .card { padding: 18px; border: 1px solid var(--lx-line); border-radius: 12px; background: var(--lx-surface); backdrop-filter: var(--lx-blur); -webkit-backdrop-filter: var(--lx-blur); min-width: 0; cursor: pointer; }
  .lx-gallery .card.selected { outline: 2px solid var(--focus); outline-offset: 2px; }
  .lx-gallery .card:hover .thumb { filter: drop-shadow(0 0 8px var(--glow-far)); }
  .lx-gallery .card .thumb { background: color-mix(in srgb, var(--bg) 55%, transparent); }
  .lx-gallery .ttl { display: flex; align-items: center; gap: 10px; margin: 14px 0 12px; } .lx-gallery h2 { font-size: 16px; margin: 0; flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .lx-gallery dl { display: grid; gap: 7px; margin: 0; font-size: 12px; } .lx-gallery dl > div { display: flex; justify-content: space-between; }
  .lx-gallery dt { color: var(--ink-mute); } .lx-gallery dd { margin: 0; font-variant-numeric: tabular-nums; }
  .lx-gallery .span { font-size: 12px; color: var(--ink-mute); margin: 12px 0 0; }

  .lx-sheet .lede { color: var(--ink-mute); font-size: 13px; margin: 6px 0 24px; max-width: 70ch; }
  .lx-sheet h2 { font-size: 13px; font-weight: 600; color: var(--ink-mute); margin: 28px 0 12px; }
  .lx-sheet .sw { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 10px; max-width: 1400px; }
  .lx-sheet .t { display: grid; grid-template-columns: 1fr 1fr; border: 1px solid var(--lx-line); border-radius: 8px; overflow: hidden; background: var(--lx-surface); backdrop-filter: var(--lx-blur); }
  .lx-sheet .t .c { height: 46px; } .lx-sheet .t .c.learn { border-left: 1px solid var(--lx-line); }
  .lx-sheet .t .n { grid-column: 1 / -1; padding: 7px 10px; font: 12px/1.35 ui-monospace, 'Cascadia Mono', Consolas, monospace; }
  .lx-sheet .t .n small { display: block; color: var(--ink-mute); }
  .lx-sheet table { border-collapse: collapse; font-size: 13px; background: var(--lx-surface); backdrop-filter: var(--lx-blur); border-radius: 8px; overflow: hidden; }
  .lx-sheet th, .lx-sheet td { padding: 7px 12px; border-bottom: 1px solid var(--lx-line); text-align: left; font-variant-numeric: tabular-nums; }
  .lx-sheet th { color: var(--ink-mute); font-weight: 500; } .lx-sheet td.bad { color: var(--error-ink); }
  .lx-sheet .row { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }
  .lx-sheet .looks { display: flex; flex-wrap: wrap; gap: 28px; padding: 18px 22px; border-radius: 10px; background: color-mix(in srgb, var(--bg) 40%, transparent); }
  .lx-sheet .looks .lx-node { position: static; transform: none; width: 110px; }
  .lx-sheet .err { color: var(--error-ink); border: 1px solid var(--error); border-radius: 7px; padding: 8px 12px; font-size: 13px; background: color-mix(in srgb, var(--error) 12%, transparent); }
  .lx-sheet pre { margin: 0; background: var(--code); color: var(--ink); border: 1px solid var(--lx-line); border-radius: 7px; padding: 10px 14px; font: 12px/1.5 ui-monospace, 'Cascadia Mono', Consolas, monospace; }
  .lx-sheet pre b { color: var(--accent); font-weight: 400; }

  .ui { position: fixed; top: 10px; left: 50%; transform: translateX(-50%); z-index: 30; display: flex; gap: 4px; align-items: center; flex-wrap: wrap; justify-content: center;
    padding: 3px; border: 1px solid var(--line); border-radius: 999px; background: color-mix(in srgb, var(--bg) 70%, transparent); backdrop-filter: blur(10px);
    font: 12px/1.3 'Segoe UI Variable Text', 'Segoe UI', system-ui, sans-serif; max-width: calc(100vw - 32px); }
  .ui button { font: inherit; color: var(--ink-mute); background: transparent; border: 0; border-radius: 999px; padding: 6px 10px; cursor: pointer; }
  .ui button:hover { color: var(--ink); } .ui button[aria-pressed='true'] { color: var(--node-lit); background: var(--surface-2); }
  .ui button:focus-visible { outline: 2px solid var(--focus); outline-offset: 1px; }
  .ui .sep { width: 1px; height: 16px; background: var(--line); margin: 0 4px; }
  .tag { position: fixed; top: 64px; left: 14px; z-index: 30; font: 11px 'Segoe UI', system-ui, sans-serif; color: var(--ink-mute); opacity: .6; pointer-events: none; }
  @media (max-width: 900px) { .lx-head .stats, .lx-head .room { display: none; } .ui { top: auto; bottom: 10px; } }
  @media (max-width: 760px) { .lx-welcome .subj { font-size: 26px; } .lx-welcome .cards { grid-template-columns: 1fr; } .lx-welcome .wrap { padding-top: 10vh; }
    .lx-study { flex-direction: column; } .lx-graph { width: 100%; height: 55%; } .lx-divider { display: none; } }
  @media (prefers-reduced-motion: reduce) { .lx-node .disc { transition: none; } }
  `;

  const MARK = `<svg viewBox="0 0 28 28" width="28" height="28" aria-hidden="true"><circle cx="14" cy="15" r="7" fill="none" style="stroke:var(--accent)" stroke-width="1.4"/>
    <circle cx="14" cy="15" r="2.6" style="fill:var(--node-lit)"/><path d="M10 7.5h8M14 4v3.5" style="stroke:var(--accent)" stroke-width="1.4" stroke-linecap="round"/></svg>`;
  const ICON = { settled: '<svg viewBox="0 0 18 18"><path d="M4.5 9.5l3 3 6-7" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
                 lit: '<svg viewBox="0 0 18 18"><circle cx="9" cy="9" r="3" fill="currentColor"/></svg>', open: '', faded: '' };

  function thumb(tree) {
    const depth = tree.map(() => 0), kids = tree.map(() => []);
    tree.forEach(([p], i) => { if (p >= 0) { depth[i] = depth[p] + 1; kids[p].push(i); } });
    const x = [], leaves = []; (function walk(i) { if (!kids[i].length) leaves.push(i); kids[i].forEach(walk); })(0);
    leaves.forEach((l, k) => x[l] = k * 40);
    (function place(i) { kids[i].forEach(place); if (kids[i].length) x[i] = (x[kids[i][0]] + x[kids[i].at(-1)]) / 2; })(0);
    const ys = depth.map(d => d * 18), minX = Math.min(...x), maxX = Math.max(...x), maxY = Math.max(...ys);
    const w = Math.max(40, maxX - minX + 16), h = Math.max(22.5, maxY + 16), W = Math.max(w, h * 16 / 9), H = Math.max(h, w * 9 / 16);
    let s = `<svg viewBox="${(minX + maxX) / 2 - W / 2} ${maxY / 2 - H / 2} ${W} ${H}">`;
    tree.forEach(([p], i) => { if (p >= 0) s += `<line x1="${x[p]}" y1="${ys[p]}" x2="${x[i]}" y2="${ys[i]}"/>`; });
    tree.forEach(([, st], i) => { s += `<circle cx="${x[i]}" cy="${ys[i]}" r="3" class="${st}"/>`; });
    return `<div class="thumb">${s}</svg></div>`;
  }
  const statusLabel = s => ({ exploring: 'Exploring', decided: 'Decided', bought: 'Bought' }[s]);
  const compact = s => [s.needs && `${s.needs} needs`, s.criteria && `${s.criteria} criteria`, s.shortlisted && `${s.shortlisted} shortlisted`].filter(Boolean).join(' · ') || 'just started';

  // contrast (WCAG relative luminance); colours with alpha are composited on --bg
  const parse = v => { v = v.trim(); let m;
    if ((m = v.match(/^#([0-9a-f]{6})$/i))) { const n = parseInt(m[1], 16); return [n >> 16, (n >> 8) & 255, n & 255, 1]; }
    if ((m = v.match(/^rgba?\(([^)]+)\)$/i))) { const p = m[1].split(',').map(parseFloat); return [p[0], p[1], p[2], p[3] ?? 1]; } return null; };
  const lum = c => { const f = x => { x /= 255; return x <= .03928 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4; }; return .2126 * f(c[0]) + .7152 * f(c[1]) + .0722 * f(c[2]); };
  const ratio = (a, b) => { const A = lum(a), B = lum(b); return (Math.max(A, B) + .05) / (Math.min(A, B) + .05); };

  function mount(opts) {
    const style = document.createElement('style'); style.textContent = CSS; document.head.appendChild(style);
    const own = {}; const cs0 = getComputedStyle(document.documentElement); TOKENS.forEach(t => own[t] = cs0.getPropertyValue(t).trim());
    const root = document.createElement('div'); root.className = 'lx'; root.dataset.screen = 'welcome';
    const S = D.subjects, G = D.graph, Pn = D.panel, first = S[0];
    const nodes = new Map(G.nodes.map(n => [n.id, { ...n }]));
    let focus = G.focus;
    const fact = f => `<div class="fact" data-k="${f.kind}"><span class="txt">${esc(f.text)}</span><span class="src"><span class="tag">${f.kind}</span>${esc(f.source)}${f.date ? ' · ' + esc(f.date) : ''}</span></div>`;

    root.innerHTML = `
      <header class="lx-head lx-hit"><button class="mark" data-go="welcome" aria-label="Welcome">${MARK}</button><span class="room">${esc(opts.name)}</span>
        <nav><button data-go="welcome" aria-label="Welcome" title="Welcome">⌂</button><button data-go="graph" aria-label="Survey" title="Survey">⌘</button><button disabled title="Compare (its own design, later)">▤</button><button data-go="gallery" aria-label="Gallery" title="Gallery">▦</button></nav>
        <button class="subject">${esc(G.subject)}</button><span class="stats">${compact(first)}</span><button class="gear" aria-label="Settings">⚙</button></header>
      <section class="lx-screen lx-welcome"><div class="wrap">
        <div class="ask"><input class="subj lx-hit" placeholder="What do you want to choose?" aria-label="What do you want to choose?"></div>
        <p class="example">For example a 3D printer, a road bike or a heat pump. <kbd>Shift+Enter</kbd> adds what you already know.</p>
        <div class="row"><div class="pickers"><div class="tones lx-hit">${['ELI5', 'Curious', 'Student', 'Engineer', 'Expert', 'Custom'].map((t, i) => `<span class="${i === 1 ? 'on' : ''}">${t}</span>`).join('')}</div>
          <div class="model">Model <b>Opus 5.5 ▾</b></div></div></div>
        <section class="shelf"><h2>Continue a choice</h2><div class="cards">
          ${S.slice(0, 3).map((s, i) => `<button class="card lx-hit" data-card="${i}">${thumb(s.thumb)}<h3>${esc(s.title)}</h3><div class="meta"><span>${compact(s)}</span><span class="status" data-s="${s.status}">${statusLabel(s.status)}</span></div></button>`).join('')}
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
          <div class="meta"><span class="pkind">${esc(Pn.kind)}</span> · <span class="chip">${Pn.state}</span> · Opus 5.5</div>
          <h1 class="ptitle">${esc(Pn.title)}</h1><p class="hook">${esc(Pn.hook)}</p>
          ${Pn.body.map(p => `<p>${esc(p)}</p>`).join('')}
          <h2>Facts and sources</h2><div class="facts">${fact(Pn.fact)}${fact(Pn.opinion)}${fact(Pn.sponsored)}</div>
          <h2>Go deeper</h2>${Pn.deeper.map(o => `<button class="option"><strong>${esc(o.title)}</strong><span>${esc(o.hook)}</span></button>`).join('')}
          ${Pn.turns.map((t, i) => `<div class="turn ${t.role}">${esc(t.text)}${i === 0 ? '<div class="acts"><button class="primary">Record need</button><button>Not now</button></div>' : ''}</div>`).join('')}
        </div><footer><textarea rows="2" placeholder="Ask about this…"></textarea><div class="actions"><button class="primary">Send</button><button>Check this</button></div></footer></aside>
      </section>
      <section class="lx-screen lx-gallery lx-scroll">
        <div class="toolbar"><h1>Gallery</h1><span>${S.length} choices</span><span class="sel">Last opened ▾</span><span class="filter">Filter choices</span></div>
        <div class="grid">${S.map((s, i) => `<div class="card lx-hit${i === 0 ? ' selected' : ''}" data-card="${i}">${thumb(s.thumb)}<div class="ttl"><h2>${esc(s.title)}</h2><span class="status" data-s="${s.status}">${statusLabel(s.status)}</span></div>
          <dl><div><dt>Needs</dt><dd>${s.needs}</dd></div><div><dt>Criteria</dt><dd>${s.criteria}</dd></div><div><dt>Shortlisted</dt><dd>${s.shortlisted}</dd></div></dl>
          <p class="span">Created ${new Date(s.created).toLocaleDateString()} → ${esc(s.lastOpened)} · ${esc(s.model)}</p></div>`).join('')}</div>
      </section>
      <section class="lx-screen lx-sheet lx-scroll"><h1>${esc(opts.name)} tokens</h1>
        <p class="lede">The RS-31 set plus the error pair, under <code>data-room="choose"</code>. Each swatch: this palette left, Learn's right. Contrast is computed live; ≥ 4.5 for text, ≥ 3 for large text and outlines.</p>
        <div class="sw"></div>
        <h2>Contrast</h2><table class="ct"><thead><tr><th>Pair</th><th>Ratio</th><th>Learn</th></tr></thead><tbody></tbody></table>
        <h2>Node looks (colour only; Choose's glyphs are a later design)</h2>
        <div class="looks">${['open', 'lit', 'settled', 'faded'].map(l => `<div class="lx-node" data-look="${l}"><span class="disc">${ICON[l]}</span><span class="name">${{ open: 'open', lit: 'lit · candidate', settled: 'answered · must · shortlisted · chosen', faded: 'irrelevant · rejected' }[l]}</span></div>`).join('')}</div>
        <h2>Controls and states</h2>
        <div class="row lx-hit"><button class="primary">Mark as bought</button><button>Shortlist</button><button style="outline:2px solid var(--focus);outline-offset:2px">Focused</button>
          <span class="status" data-s="exploring">Exploring</span><span class="status" data-s="decided">Decided</span><span class="status" data-s="bought">Bought</span>
          <span class="err">The web search failed. Try again or turn off Use the web.</span></div>
        <h2>Code block</h2><pre><b>const</b> volume = 256 * 256 * 256; <span style="color:var(--ink-mute)">// mm³</span></pre>
      </section>`;
    document.body.appendChild(root);

    const ui = document.createElement('div'); ui.className = 'ui';
    ui.innerHTML = `${[['welcome', 'Welcome'], ['graph', 'Survey'], ['gallery', 'Gallery'], ['sheet', 'Tokens']].map(([k, l]) => `<button data-s="${k}" aria-pressed="${k === 'welcome'}">${l}</button>`).join('')}
      <span class="sep"></span><button id="cmp" aria-pressed="false" title="Show Learn's palette in place (L)">Learn ⇄ ${esc(opts.name)}</button><button id="light">Light a node</button><button id="speed" aria-pressed="false">Preview ×8</button>`;
    document.body.appendChild(ui);
    const tag = document.createElement('div'); tag.className = 'tag'; document.body.appendChild(tag);

    const $ = sel => root.querySelector(sel), graph = $('.lx-graph'), world = $('.lx-world'), edges = $('.lx-edges');
    for (const n of nodes.values()) {
      const b = document.createElement('button'); b.className = 'lx-node lx-hit'; b.dataset.id = n.id;
      b.style.left = n.x + 'px'; b.style.top = n.y + 'px';
      b.innerHTML = `<span class="disc"></span><span class="name">${esc(n.title)}</span><span class="kind">${n.kind} · ${n.state}</span>`;
      world.appendChild(b); n.el = b;
    }
    const routeTo = id => { const r = new Set(); for (let n = nodes.get(id); n; n = nodes.get(n.parent)) r.add(n.id); return r; };
    function paint() {
      const route = routeTo(focus);
      edges.innerHTML = [...nodes.values()].filter(n => n.parent).map(n => { const p = nodes.get(n.parent), my = (p.y + n.y) / 2;
        return `<path class="${route.has(n.id) ? 'route' : ''}" d="M${p.x} ${p.y}C${p.x} ${my} ${n.x} ${my} ${n.x} ${n.y}"/>`; }).join('');
      for (const n of nodes.values()) { n.el.dataset.look = n.look; n.el.setAttribute('aria-pressed', n.id === focus); n.el.querySelector('.disc').innerHTML = ICON[n.look];
        n.el.querySelector('.kind').textContent = `${n.kind} · ${n.state}`; }
      const f = nodes.get(focus); $('.ptitle').textContent = f.title; $('.pkind').textContent = f.kind; $('.lx-panel .chip').textContent = f.state;
    }
    paint();

    const V = { x: -60, y: 20, z: .9 };
    const place = () => { const r = graph.getBoundingClientRect(); world.style.transform = `translate(${r.width / 2 + V.x}px, ${r.height / 2 + V.y}px) scale(${V.z})`; };
    let drag = null;
    graph.addEventListener('pointerdown', e => { if (e.target.closest('.lx-hit')) return; drag = { x: e.clientX, y: e.clientY }; });
    addEventListener('pointermove', e => { if (!drag) return; V.x += e.clientX - drag.x; V.y += e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY; place(); });
    addEventListener('pointerup', () => drag = null);
    addEventListener('wheel', e => { if (root.dataset.screen !== 'graph' || (e.target.closest && e.target.closest('.lx-scroll'))) return;
      V.z = Math.min(2.5, Math.max(.4, V.z * Math.exp(-e.deltaY * .0012))); place(); }, { passive: true });
    root.querySelectorAll('[data-z]').forEach(b => b.onclick = () => { if (b.dataset.z === 'reset') { V.x = -60; V.y = 20; V.z = .9; } else V.z = Math.min(2.5, Math.max(.4, V.z * (b.dataset.z === 'in' ? 1.2 : 1 / 1.2))); place(); });

    // a click steps a node's colour: open → lit → settled; the backdrop reacts where it lit
    function lightNode(n) {
      if (n.look === 'open') n.look = 'lit'; else if (n.look === 'lit') n.look = 'settled';
      focus = n.id; paint();
      const r = n.el.querySelector('.disc').getBoundingClientRect();
      document.dispatchEvent(new CustomEvent('lx:light', { detail: { x: r.left + r.width / 2, y: r.top + r.height / 2 } }));
    }
    world.addEventListener('click', e => { const b = e.target.closest('.lx-node'); if (b) lightNode(nodes.get(b.dataset.id)); });

    function show(s) {
      root.dataset.screen = s;
      root.querySelectorAll('nav [data-go]').forEach(b => b.dataset.go === s ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current'));
      $('.subject').style.display = $('.stats').style.display = s === 'graph' ? '' : 'none';
      ui.querySelectorAll('[data-s]').forEach(b => b.setAttribute('aria-pressed', b.dataset.s === s));
      document.dispatchEvent(new CustomEvent('lx:screen', { detail: s }));
      requestAnimationFrame(place); label();
    }
    ui.querySelectorAll('[data-s]').forEach(b => b.onclick = () => show(b.dataset.s));
    root.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => show(b.dataset.go)));
    ui.querySelector('#light').onclick = () => {
      if (root.dataset.screen === 'graph') { const pool = [...nodes.values()].filter(n => n.look === 'open' || n.look === 'lit'); if (pool.length) return lightNode(pool[Math.floor(Math.random() * pool.length)]); }
      document.dispatchEvent(new CustomEvent('lx:light', { detail: { x: innerWidth * (.25 + Math.random() * .5), y: innerHeight * (.25 + Math.random() * .5) } }));
    };
    const speed = ui.querySelector('#speed');
    speed.onclick = () => { const on = speed.getAttribute('aria-pressed') !== 'true'; speed.setAttribute('aria-pressed', on); document.dispatchEvent(new CustomEvent('lx:speed', { detail: on ? 8 : 1 })); };
    const cmp = ui.querySelector('#cmp'), html = document.documentElement;
    function setLearn(on) {
      cmp.setAttribute('aria-pressed', on);
      TOKENS.forEach(t => on ? html.style.setProperty(t, D.learn[t]) : html.style.removeProperty(t));
      document.dispatchEvent(new CustomEvent('lx:tokens')); label();
    }
    cmp.onclick = () => setLearn(cmp.getAttribute('aria-pressed') !== 'true');
    addEventListener('keydown', e => {
      if (/^(INPUT|TEXTAREA)$/.test(e.target.tagName)) return;
      if (e.key === 'l' || e.key === 'L') setLearn(cmp.getAttribute('aria-pressed') !== 'true');
      if (e.key >= '1' && e.key <= '4') show(['welcome', 'graph', 'gallery', 'sheet'][e.key - 1]);
    });
    function label() { tag.textContent = `${opts.id} · ${cmp.getAttribute('aria-pressed') === 'true' ? 'showing Learn for comparison' : opts.title} · 1–4 screens, L Learn`; }
    root.querySelectorAll('.lx-welcome .tones span').forEach(t => t.onclick = () => root.querySelectorAll('.lx-welcome .tones span').forEach(x => x.classList.toggle('on', x === t)));
    root.querySelectorAll('.lx-gallery .card').forEach(c => c.onclick = () => root.querySelectorAll('.lx-gallery .card').forEach(x => x.classList.toggle('selected', x === c)));

    // token sheet: swatches and contrast, from this page's own values and Learn's
    const sw = $('.sw'), bgOf = (vals) => parse(vals['--bg']);
    const flat = (v, vals) => { const c = parse(v), b = bgOf(vals); if (!c) return null; const a = c[3]; return [0, 1, 2].map(i => c[i] * a + b[i] * (1 - a)); };
    sw.innerHTML = TOKENS.map(t => `<div class="t"><div class="c" style="background:${own[t]}"></div><div class="c learn" style="background:${D.learn[t]}"></div>
      <div class="n">${t}<small>${esc(own[t])}${own[t] === D.learn[t] ? ' · same as Learn' : ' · Learn ' + esc(D.learn[t])}</small></div></div>`).join('');
    const surf = vals => { const s = parse(vals['--surface']), b = bgOf(vals); return [0, 1, 2].map(i => s[i] * .55 + b[i] * .45); };
    const pairs = [['--ink', '--bg', 4.5], ['--ink', 'glass', 4.5], ['--ink-mute', '--bg', 4.5], ['--ink-mute', 'glass', 4.5], ['--ink', '--surface-2', 4.5],
      ['--accent-ink', '--accent', 4.5], ['--accent', '--bg', 3], ['--accent', 'glass', 3], ['--node-lit', '--surface-2', 3], ['--node-open', '--bg', 3],
      ['--focus', '--bg', 3], ['--error-ink', '--bg', 4.5], ['--path-muted', '--bg', 1.5]];
    const r = (vals, a, b) => ratio(flat(vals[a], vals), b === 'glass' ? surf(vals) : flat(vals[b], vals));
    $('.ct tbody').innerHTML = pairs.map(([a, b, min]) => { const x = r(own, a, b), y = r(D.learn, a, b);
      return `<tr><td>${a} on ${b === 'glass' ? 'glass surface' : b}</td><td class="${x < min ? 'bad' : ''}">${x.toFixed(2)}</td><td>${y.toFixed(2)}</td></tr>`; }).join('');

    addEventListener('resize', place);
    show('welcome');
  }
  window.CHOOSE_UI = { mount };
})();
