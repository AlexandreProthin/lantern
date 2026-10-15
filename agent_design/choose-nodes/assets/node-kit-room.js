/* The room layer for the colour round and after: NodeKit dressed as Choose's Survey.
   - Tokens: the accepted Choose palette (choose-palette r001-01, CR-70) under :root[data-room=choose], plus the
     board's derived --glass, --glass-line, --ink-faint (choose-board r004-03).
   - Type: the app's families and sentence case (choose-board r003-01); node title 13 px / 1.5, 400 (Learn final).
   - Learn's node looks, unchanged (learningnode r004-01 / final): open dotted --node-open on --bg; lit --surface-2,
     --node-lit, glow-near + glow-far; faded .45 and dashed; edges --path-muted; selection --focus 6 px out.
   - The final backdrop (assets/backdrop.js, copied from choose-palette) under the graph, Survey preset.
   A proposal adds only how settled / quiet / chosen / rejected / badges use the tokens.
   NodeKit.mountRoom(design) = NodeKit.mount(design) + this layer. */
(function () {
  const css = `
:root[data-room="choose"]{color-scheme:dark;
  --bg:#101827;--surface:#172132;--surface-2:#1f3034;--ink:#f3e9dc;--ink-mute:#aeb3bf;--line:#3b4558;
  --accent:#5cc6bd;--accent-ink:#0d211f;--focus:#b6efe6;--node-open:#969ca7;--node-lit:#c8f3ea;--node-understood:#5cc6bd;
  --glow-near:rgba(118,222,206,.32);--glow-far:rgba(84,204,188,.15);--path-muted:#3e625d;--code:#0c1320;--error:#d86a5a;--error-ink:#f0a598;
  --glass:color-mix(in srgb,var(--surface) 55%,transparent);--glass-line:color-mix(in srgb,var(--ink-mute) 16%,transparent);
  --glass-blur:blur(20px) saturate(135%);--ink-faint:color-mix(in srgb,var(--ink-mute) 62%,var(--bg));
  --font-text:'Segoe UI Variable Text','Segoe UI',system-ui,sans-serif;--font-display:'Segoe UI Variable Display','Segoe UI',system-ui,sans-serif;
  --font-small:'Segoe UI Variable Small','Segoe UI',system-ui,sans-serif;
  font-family:var(--font-text)}
body{background:var(--bg);color:var(--ink);font:13px/1.5 var(--font-text)}
.kit-head,.kit-survey,.kit-sec{position:relative;z-index:1}
.kit-eyebrow{font:11px/1.45 var(--font-small);color:var(--ink-faint)}
.kit-head h1{font:350 24px/1.1 var(--font-display);margin:6px 0 8px}
.kit-dir{color:var(--ink-mute)}
.kit-survey{border-color:var(--glass-line)}
.kit-panel{background:var(--glass);backdrop-filter:var(--glass-blur);-webkit-backdrop-filter:var(--glass-blur);border-left:1px solid var(--glass-line)}
.kit-panel .k{font:600 11px/1.45 var(--font-small);letter-spacing:0;text-transform:none;color:var(--accent)}
.kit-panel h2{font:350 18px/1.3 var(--font-display)}
.kit-panel dt,.kit-panel .what,.kit-panel .note,.kit-panel h3{color:var(--ink-mute)}
.kit-panel h3{font:600 11px/1.45 var(--font-small)}
.kit-try button{border-color:var(--line);border-radius:999px;font:11px/1.45 var(--font-small);padding:2px 9px}
.kit-try button:hover{border-color:var(--accent)}
.kit-try button[aria-pressed="true"]{background:var(--accent);border-color:var(--accent);color:var(--accent-ink)}
.kit-sec{background:var(--glass);backdrop-filter:var(--glass-blur);-webkit-backdrop-filter:var(--glass-blur);border-bottom:1px solid var(--glass-line)}
.kit-sec h2{font:350 18px/1.3 var(--font-display)}.kit-sec>p{color:var(--ink-mute)}
.kit-row,.kit-lrow{border-top-color:var(--glass-line)}
.kit-row .rk,.kit-cell .cap{font:11px/1.45 var(--font-small);color:var(--ink-faint)}
.kit-legend h3{font:600 11px/1.45 var(--font-small);color:var(--accent)}
.kit-lrow span{color:var(--ink-mute)}
.kit-edges path{stroke:var(--path-muted);stroke-width:1.2}
.kit-edges path.faded{stroke:var(--line);stroke-dasharray:3 4}
.kit-node .t{color:var(--ink)}
.kit-node[aria-pressed="true"] .anchor{outline:1px solid var(--focus);outline-offset:6px}
.kit-node:focus-visible .anchor{outline:1px dashed var(--focus);outline-offset:7px}
.kit-node:hover .anchor{border-color:var(--focus)}
/* Learn's looks */
.anchor{background:var(--bg);border-color:var(--node-open);color:var(--node-open)}
.look-open .anchor{background:var(--bg);border-color:var(--node-open);color:var(--node-open)}
.look-lit .anchor{background:var(--surface-2);border-color:var(--node-lit);color:var(--node-lit);box-shadow:0 0 14px 2px var(--glow-near),0 0 38px 9px var(--glow-far)}
.look-faded .anchor{background:var(--bg);border-color:var(--node-open);color:var(--node-open)}
.look-faded .t{color:var(--ink-mute)}.dismissed .t{text-decoration-color:var(--ink-faint)}
.badge{background:var(--bg);border-color:var(--node-lit);color:var(--node-lit)}`;

  NodeKit.mountRoom = function (design) {
    document.documentElement.dataset.room = 'choose';
    NodeKit.mount(design);
    const kitStyle = document.head.querySelector('style');
    const st = document.createElement('style'); st.textContent = css; kitStyle.after(st);
    document.body.classList.add('lx-scroll'); // page wheel scrolls the page, never zooms the backdrop
    document.querySelectorAll('.kit-head, .kit-panel, .kit-sec').forEach(e => e.classList.add('lx-nolight', 'ui'));
    const s = document.createElement('script'); s.src = '../assets/backdrop.js';
    s.onload = () => document.dispatchEvent(new CustomEvent('lx:screen', { detail: 'graph' }));
    document.body.appendChild(s);
  };
})();
