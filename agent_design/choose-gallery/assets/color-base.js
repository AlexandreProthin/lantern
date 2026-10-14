/* Frozen base for the colour round (request revision 4) and after: everything except where the light falls.
   - Tokens: the accepted Choose palette (CR-70, agent_design/choose-palette/RECIPE.md), binding, plus the helpers
     choose-board uses (--glass, --glass-line, --glass-blur, --ink-faint).
   - Type: choose-board's final type (r003-01): Segoe UI Variable Text / Display / Small, sentence case,
     scale 11 / 12 / 13 / 15 / 18 / 24 / 30 / 38 px, leading 1.1 / 1.45 / 1.65.
   - Form: r002-03 (status band, pick line as the largest text, steps bar, the selected card lifting over the grid)
     at r002-01's card size (min 300 px, 24 px gutters, 40 px page margins, 12 px radius, 20 px inner margins).
   - The kit's wireframe variables (--fg, --mute, --faint, --hair, --fill) are re-pointed at the room tokens.
   Every colour below is a token or a mix of tokens; each proposal adds only where the accent and light go. */
(() => {
  const css = `
  :root {
    --bg: #101827; --surface: #172132; --surface-2: #1f3034; --ink: #f3e9dc; --ink-mute: #aeb3bf; --line: #3b4558;
    --accent: #5cc6bd; --accent-ink: #0d211f; --focus: #b6efe6; --node-open: #969ca7; --node-lit: #c8f3ea; --node-understood: #5cc6bd;
    --glow-near: rgba(118,222,206,.32); --glow-far: rgba(84,204,188,.15); --path-muted: #3e625d; --code: #0c1320; --error: #d86a5a; --error-ink: #f0a598;
    --glass: color-mix(in srgb, var(--surface) 55%, transparent); --glass-line: color-mix(in srgb, var(--ink-mute) 16%, transparent);
    --glass-blur: blur(20px) saturate(135%); --ink-faint: color-mix(in srgb, var(--ink-mute) 62%, var(--bg));
    --line-strong: color-mix(in srgb, var(--line) 65%, var(--ink-mute));
    --fg: var(--ink); --mute: var(--ink-mute); --faint: var(--ink-faint); --hair: var(--glass-line); --fill: color-mix(in srgb, var(--ink) 6%, transparent);
    --font-text: 'Segoe UI Variable Text', 'Segoe UI', system-ui, sans-serif;
    --font-display: 'Segoe UI Variable Display', 'Segoe UI', system-ui, sans-serif;
    --font-small: 'Segoe UI Variable Small', 'Segoe UI', system-ui, sans-serif;
    --step--1: 11px; --step-0: 12px; --step-1: 13px; --step-2: 15px; --step-3: 18px; --step-4: 24px; --step-5: 30px; --step-6: 38px;
    color-scheme: dark; }
  html, body { background: var(--bg); color: var(--ink); font: var(--step-1)/1.45 var(--font-text); }
  button, select { background: transparent; border: 1px solid var(--line); color: var(--ink); border-radius: 999px; font-family: var(--font-small); }
  button:hover, select:hover { border-color: var(--line-strong); }
  button:focus-visible, input:focus-visible, select:focus-visible, [tabindex]:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }
  select option { background: var(--surface); }
  .app { z-index: 1; }
  .head { background: var(--glass); backdrop-filter: var(--glass-blur); -webkit-backdrop-filter: var(--glass-blur); border-bottom: 1px solid var(--glass-line); font-family: var(--font-small); }
  .head .room { border: 0; padding: 0; color: var(--accent); font-weight: 600; } .head nav span { border: 1px solid transparent; border-radius: 7px; padding: 4px 9px; color: var(--ink-mute); }
  .head nav span.cur { border-color: var(--accent); color: var(--accent); background: none; } .head .faint { color: var(--ink-faint); font-size: var(--step--1); }
  .proto { background: color-mix(in srgb, var(--bg) 75%, transparent); backdrop-filter: blur(10px); border: 1px solid var(--line); font-family: var(--font-small); }
  .proto button { border: 0; color: var(--ink-mute); } .proto button.on { background: var(--surface-2); color: var(--node-lit); }
  .tag { color: var(--ink-faint); bottom: 54px; right: 12px; }
  .toast { background: var(--surface); border-color: var(--line); border-radius: 8px; }
  .scrim { background: color-mix(in srgb, var(--code) 70%, transparent); }
  .dlg { background: var(--surface); border: 1px solid var(--line); border-radius: 12px; padding: 22px 24px; }
  .dlg h2 { font: 350 var(--step-4)/1.1 var(--font-display); } .dlg p { color: var(--ink-mute); } .dlg p b { color: var(--error-ink); font-weight: 600; }
  .dlg [data-confirm] { background: var(--error); border-color: var(--error); color: var(--code); font-weight: 600; }
  .empty b { font: 350 var(--step-4)/1.1 var(--font-display); color: var(--ink); } .empty .lead { color: var(--ink-mute); }
  .empty button { background: var(--accent); color: var(--accent-ink); border-color: var(--accent); font-weight: 600; padding: 7px 16px; }

  /* toolbar */
  .bar { padding: 24px 40px 16px; gap: 14px; }
  .tabs { gap: 6px; } .tab { padding: 5px 13px; font-size: var(--step-0); color: var(--ink-mute); } .tab .n { font-size: var(--step--1); color: var(--ink-faint); }
  .tab .tl-l { font-weight: 400; }
  .bar input { width: 220px; max-width: 100%; border-radius: 999px; padding: 6px 14px; background: var(--glass); border: 1px solid var(--line); color: var(--ink); caret-color: var(--accent); font-family: var(--font-text); }
  .bar input::placeholder { color: var(--ink-faint); }
  .sortl { color: var(--ink-faint); font: var(--step-0) var(--font-small); } .sortl select { padding: 4px 10px; } .dirb { padding: 4px 10px; }
  .count { color: var(--ink-faint); font: var(--step-0) var(--font-small); }

  /* grid at r002-01's size */
  .scroll { padding: 8px 40px 130px; }
  .grid { grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 24px; }
  @media (min-width: 1500px) { .grid { grid-template-columns: repeat(4, 1fr); } }

  /* the card (r002-03's slots and hierarchy) */
  .card { background: var(--glass); backdrop-filter: var(--glass-blur); -webkit-backdrop-filter: var(--glass-blur); border: 1px solid var(--glass-line); border-radius: 12px; padding: 0 0 20px; gap: 12px; }
  .card > .ttl, .card > .steps, .card > .pick, .card > .stats, .card > .rn { margin: 0 20px; }
  .card .top { padding: 8px 20px; border-radius: 12px 12px 0 0; font: var(--step--1)/1.45 var(--font-small); border-bottom: 1px solid var(--glass-line); }
  .card .top .st { border: 0; padding: 0; font: 600 var(--step--1) var(--font-small); color: inherit; }
  .card .when { color: var(--ink-faint); }
  .card .ttl { font: 400 var(--step-1)/1.45 var(--font-text); color: var(--ink-mute); margin-top: 6px !important; }
  .pick { font: 600 var(--step-3)/1.25 var(--font-display); color: var(--ink-mute); }
  .pick b { font-weight: 600; color: var(--ink); } .pick .verb { display: block; font: 400 var(--step--1)/1.45 var(--font-small); color: var(--ink-faint); }
  .pick .price { font: 400 var(--step-1) var(--font-text); color: var(--ink-mute); } .pick .run { font: 400 var(--step-0) var(--font-small); color: var(--ink-mute); }
  .pick.ready b::before { content: '◆ '; font-size: .8em; } .pick.back b { text-decoration: line-through; text-decoration-thickness: 1px; color: var(--ink-mute); font-weight: 350; }
  .steps { gap: 8px; } .step i { height: 4px; border-radius: 2px; background: var(--fill); } .step i b { border-radius: 2px; }
  .step span { font: var(--step--1) var(--font-small); color: var(--ink-faint); } .step em { font: var(--step--1) var(--font-small); color: var(--ink-mute); font-variant-numeric: tabular-nums; }
  .stats { font: var(--step--1)/1.45 var(--font-small); color: var(--ink-faint); border-top: 1px solid var(--glass-line); padding-top: 10px; }

  /* the selected card lifts over the grid at card width (r002-03) */
  .grid:has(.card.sel) .card:not(.sel) { opacity: .45; transition: opacity .2s; }
  .card.sel { z-index: 5; border-color: transparent; background: transparent; backdrop-filter: none; -webkit-backdrop-filter: none; }
  .card.sel .rest { visibility: hidden; display: grid; gap: 12px; } .card.sel .rest > * { margin: 0 20px; } .card.sel .rest > .top { margin: 0; }
  .lift { position: absolute; top: -10px; left: -12px; right: -12px; border-radius: 14px; display: grid; gap: 12px; padding-bottom: 22px;
    background: color-mix(in srgb, var(--surface) 92%, transparent); backdrop-filter: var(--glass-blur); -webkit-backdrop-filter: var(--glass-blur);
    border: 1px solid var(--line); box-shadow: 0 24px 60px color-mix(in srgb, var(--code) 80%, transparent); }
  .lift > .top { padding: 10px 22px !important; border-radius: 14px 14px 0 0; }
  .lift > .ttl, .lift > .rn { margin: 4px 22px 0; font: 350 var(--step-4)/1.1 var(--font-display); color: var(--ink); }
  .lift .uf { margin: 0 22px; gap: 18px; }
  .pk { gap: 3px; } .pk .verb { font: var(--step--1) var(--font-small); color: var(--ink-faint); } .pk b { font: 600 var(--step-3)/1.25 var(--font-display); color: var(--ink); }
  .pk .fact { font: var(--step-0)/1.45 var(--font-text); color: var(--ink-mute); } .pk .price { font: var(--step-2) var(--font-text); color: var(--ink); margin-top: 4px; }
  .pk .src { font: var(--step--1)/1.45 var(--font-small); color: var(--ink-faint); }
  .acts button { padding: 5px 13px; font-size: var(--step-0); } .acts [data-del]:hover { border-color: var(--error); color: var(--error-ink); }
  .sec { border-top: 1px solid var(--glass-line); padding-top: 12px; } .sec h3 { font: 600 var(--step--1) var(--font-small); color: var(--ink-mute); }
  .vt { gap: 12px; } .vt::before { background: var(--line); }
  .vt li { font: var(--step-1)/1.45 var(--font-text); } .vt li::before { border: 1.5px solid var(--node-open); background: var(--surface); }
  .vt li.u::before { border-style: dashed; } .vt small { font: var(--step--1) var(--font-small); color: var(--ink-faint); }
  dl { font: var(--step-0)/1.65 var(--font-text); gap: 0 14px; } dt { color: var(--ink-faint); font-family: var(--font-small); } dd { font-variant-numeric: tabular-nums; }
  .sec .dir { font: var(--step-1)/1.65 var(--font-text); color: var(--ink-mute); }
  /* inline rename, as the board's .edit: no box, a teal underline, teal selection. The selector out-ranks the
     wireframe kit's input.rn box (fixed 2026-10-15 after the user spotted a boxed, blue-selected field in r004-02) */
  .card input.rn { display: block; width: calc(100% - 44px); background: transparent; border: 0; border-bottom: 1px solid var(--accent); border-radius: 0;
    color: var(--ink); caret-color: var(--accent); padding: 2px 0 4px; outline: none; box-shadow: 0 6px 12px -10px var(--glow-near); }
  .card input.rn:focus-visible { outline: none; } .card input.rn::selection { background: color-mix(in srgb, var(--accent) 38%, transparent); color: var(--ink); }
  .card input.rn[aria-invalid=true] { border-bottom-color: var(--error); }
  .nomatch { color: var(--ink-mute); } .nomatch a { color: var(--accent); }
  @media (max-width: 640px) { .bar, .scroll { padding-left: 16px; padding-right: 16px; } .grid { grid-template-columns: 1fr; gap: 16px; } .bar input { width: 100%; } .lift { left: -4px; right: -4px; } }
  @media (prefers-reduced-motion: reduce) { * { transition: none !important; } }`;
  window.COLOR_BASE = { css };
})();
