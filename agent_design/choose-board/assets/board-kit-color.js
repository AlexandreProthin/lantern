/* Colour-round copy of board-kit.js: the same model and frame, drawn in the room tokens (Choose palette, CR-70)
   with glass over the backdrop. Earlier rounds keep using board-kit.js unchanged.
   Original note: shared kit for the choose-board wireframes: the scenario model (counts, what is missing, completeness, state
   changes) and the Survey frame around the board (header, graph, reading panel, scenario switcher).
   Every proposal reads the same data (../choose-board-data.js) and the same rules; only the board's mechanism differs.
   BOARD_KIT.mount({ id, title, slot, render }) — slot: 'rail' (between graph and panel) | 'top' (over the graph) |
   'left' (left edge of the graph); render(el, ctx) draws the board, ctx = { s, expanded, setExpanded, act, model, esc }. */
(() => {
  const D = window.CHOOSE_BOARD_DATA;
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const clone = o => JSON.parse(JSON.stringify(o));

  const model = {
    counts(s) {
      const needsAnswered = s.needs.filter(n => n.answer).length;
      const by = st => s.criteria.filter(c => c.state === st).length;
      const shortlisted = s.products.filter(p => p.state === 'shortlisted' || p.state === 'chosen').length;
      return { needs: s.needs.length, needsAnswered, needsOpen: s.needs.length - needsAnswered,
        criteria: s.criteria.length, must: by('must'), nice: by('nice'), irrelevant: by('irrelevant'), criteriaOpen: by('open'),
        shortlisted, candidates: s.products.filter(p => p.state === 'candidate').length,
        chosen: s.products.find(p => p.state === 'chosen') || null };
    },
    // what is still missing before a decision, in the order the user would settle it
    missing(s) {
      const c = model.counts(s), m = [];
      if (!c.needs) m.push({ area: 'needs', text: 'Tell the room what you need' });
      s.needs.filter(n => !n.answer).forEach(n => m.push({ area: 'needs', text: `Answer: ${n.q}`, need: n }));
      if (!c.must) m.push({ area: 'criteria', text: c.criteria ? 'Mark at least one criterion as must' : 'No criteria yet' });
      s.criteria.filter(k => k.state === 'open').forEach(k => m.push({ area: 'criteria', text: `Rank: ${k.name}`, crit: k }));
      if (!c.chosen && c.shortlisted < 2) m.push({ area: 'shortlist', text: c.shortlisted ? 'Shortlist one more product' : 'Shortlist at least 2 products' });
      if (s.compareGaps) m.push({ area: 'compare', text: `${s.compareGaps} Compare cell${s.compareGaps > 1 ? 's' : ''} still empty` });
      return m;
    },
    complete: s => model.missing(s).length === 0,
    stage(s) { if (s.status !== 'exploring') return s.status; return model.complete(s) ? 'ready' : 'open'; }
  };

  const CSS = `
  :root { --glass: color-mix(in srgb, var(--surface) 55%, transparent); --glass-line: color-mix(in srgb, var(--ink-mute) 16%, transparent);
    --glass-blur: blur(20px) saturate(135%); --ink-faint: color-mix(in srgb, var(--ink-mute) 62%, var(--bg)); }
  * { box-sizing: border-box; }
  html, body { margin: 0; height: 100%; overflow: hidden; background: var(--bg); color: var(--ink); font: 13px/1.4 'Segoe UI Variable Text', 'Segoe UI', system-ui, sans-serif; }
  button, input, textarea { font: inherit; color: inherit; }
  button { background: var(--surface); color: var(--ink); border: 1px solid var(--line); border-radius: 7px; padding: 4px 10px; cursor: pointer; }
  button:hover { background: var(--surface-2); border-color: var(--accent); }
  button.on { background: var(--accent); color: var(--accent-ink); border-color: var(--accent); font-weight: 600; }
  button:focus-visible, input:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }
  .mute { color: var(--ink-mute); } .faint { color: var(--ink-faint); }
  .app { position: fixed; inset: 0; z-index: 5; display: grid; grid-template-rows: 56px 1fr; }
  .head { display: flex; align-items: center; gap: 12px; padding: 0 16px; border-bottom: 1px solid var(--glass-line); white-space: nowrap; overflow: hidden;
    background: var(--glass); backdrop-filter: var(--glass-blur); -webkit-backdrop-filter: var(--glass-blur); }
  .head .mark { display: flex; } .head .room { color: var(--accent); font-size: 13px; }
  .head nav { display: flex; gap: 4px; } .head nav span { border: 1px solid transparent; border-radius: 7px; padding: 4px 9px; }
  .head nav span.cur { border-color: var(--accent); color: var(--accent); } .head .subj { overflow: hidden; text-overflow: ellipsis; max-width: 30vw; }
  .head .stats { font-size: 12px; color: var(--ink-mute); }
  .main { display: flex; min-height: 0; position: relative; }
  .graph { position: relative; flex: 1 1 56%; min-width: 0; overflow: hidden; }
  .graph svg { position: absolute; inset: 0; width: 100%; height: 100%; }
  .graph .ge { stroke: var(--path-muted); stroke-width: .2; }
  .graph .gn { stroke-width: .25; fill: var(--bg); stroke: var(--node-open); } .graph .gn.open { stroke-dasharray: .6 .6; }
  .graph .gn.lit { fill: var(--surface-2); stroke: var(--node-lit); filter: drop-shadow(0 0 .8px var(--glow-near)) drop-shadow(0 0 2.2px var(--glow-far)); }
  .graph .gn.settled { fill: var(--node-understood); stroke: var(--node-understood); }
  .graph .gt { fill: var(--ink); font-size: 2.1px; }
  .graph .lbl { display: none; }
  .panel { flex: 0 0 38%; min-width: 0; padding: 20px 28px; overflow: auto; background: var(--glass); backdrop-filter: var(--glass-blur); -webkit-backdrop-filter: var(--glass-blur); border-left: 8px solid var(--glass-line); }
  .panel .ph { font-size: 12px; color: var(--ink-mute); margin-bottom: 12px; }
  .panel h1 { font-size: 24px; font-weight: 600; margin: 4px 0 12px; } .panel .line { height: 8px; background: color-mix(in srgb, var(--ink) 9%, transparent); margin: 10px 0; border-radius: 4px; }
  .panel .reco { border-left: 2px solid var(--accent); padding: 10px 14px; margin-top: 16px; } .panel .reco p { line-height: 1.6; }
  .proto { position: fixed; left: 12px; bottom: 10px; z-index: 50; max-width: 48vw !important; display: flex; gap: 4px; flex-wrap: wrap; justify-content: center;
    padding: 3px; border: 1px solid var(--line); border-radius: 999px; background: color-mix(in srgb, var(--bg) 75%, transparent); backdrop-filter: blur(10px); max-width: calc(100vw - 24px); font-size: 12px; }
  .proto button { border-radius: 999px; border-color: transparent; background: transparent; color: var(--ink-mute); }
  .proto button.on { background: var(--surface-2); color: var(--node-lit); font-weight: 400; }
  .tag { position: fixed; right: 12px; bottom: 54px; z-index: 50; color: var(--ink-faint); font-size: 11px; pointer-events: none; }
  .st { display: inline-block; border: 1px solid var(--line); border-radius: 999px; padding: 0 8px; font-size: 11px; color: var(--ink-mute); }
  .seg { display: inline-flex; border: 1px solid var(--line); border-radius: 7px; overflow: hidden; }
  .seg button { border: 0; border-radius: 0; padding: 2px 7px; font-size: 11px; background: transparent; } .seg button + button { border-left: 1px solid var(--line); }
  .edit { border: 0; border-bottom: 1px dashed var(--glass-line); background: transparent; padding: 1px 0; width: 100%; caret-color: var(--accent); }
  .edit:focus { border-bottom-color: var(--accent); outline: none; } .edit::placeholder { color: var(--ink-faint); }
  @media (max-width: 760px) { .main { flex-direction: column; } .panel { flex-basis: 40%; border-left: 0; } .head .stats, .head .room { display: none; } }
  @media (prefers-reduced-motion: reduce) { * { transition: none !important; animation: none !important; } }`;

  function graphSvg(nodes) {
    const n = nodes.length - 1, xs = nodes.map((_, i) => i ? 10 + 80 * (i - .5) / Math.max(1, n) : 50), ys = nodes.map((_, i) => i ? 52 : 26);
    let s = '<svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">';
    nodes.forEach((_, i) => { if (i) s += `<line class="ge" x1="50" y1="26" x2="${xs[i]}" y2="52"/>`; });
    nodes.forEach(([t, look], i) => {
      s += `<circle class="gn ${look}" cx="${xs[i]}" cy="${ys[i]}" r="2.6"/>`;
      s += `<text class="gt" x="${xs[i]}" y="${ys[i] + 6}" text-anchor="middle">${esc(t.length > 22 ? t.slice(0, 21) + '…' : t)}</text>`;
    });
    return s + '</svg>';
  }

  function mount(opts) {
    const st = document.createElement('style'); st.textContent = CSS + (opts.css || ''); document.head.appendChild(st);
    const app = document.createElement('div'); app.className = 'app'; document.body.appendChild(app);
    const proto = document.createElement('div'); proto.className = 'proto'; document.body.appendChild(proto);
    const tag = document.createElement('div'); tag.className = 'tag'; tag.textContent = `${opts.id} · ${opts.title}`; document.body.appendChild(tag);
    let s, expanded = false, panelNote = null;
    const states = Object.fromEntries(D.scenarios.map(x => [x.id, clone(x)]));

    function load(id) { s = states[id]; expanded = false; panelNote = null; draw(); }
    function setExpanded(v) { expanded = v; draw(); }
    // state changes, shared by every proposal (CR-21 to CR-24)
    const act = {
      answer(n, v) { n.answer = v.trim() || null; draw(); },
      addNeed(q) { if (q.trim()) s.needs.push({ q: q.trim(), answer: null, from: 'card' }); draw(); },
      removeNeed(n) { s.needs.splice(s.needs.indexOf(n), 1); draw(); },
      rank(k, state) { k.state = state; draw(); },
      product(p, state) {
        if (state === 'chosen') s.products.forEach(q => { if (q.state === 'chosen') q.state = 'shortlisted'; });
        p.state = state;
        const c = s.products.some(q => q.state === 'chosen');
        if (!c) s.status = 'exploring'; else if (s.status === 'exploring') s.status = 'decided';
        draw();
      },
      bought() { s.status = 'bought'; draw(); },
      recommend() {
        const m = model.missing(s);
        panelNote = s.recommendation ? `<b>Recommendation</b><p>${esc(s.recommendation)}</p>` :
          `<b>Recommendation (asked early)</b><p class="mute">The room would answer in this panel: its best pick so far, how sure it is, and what is still missing: ${m.map(x => esc(x.text)).join('; ') || 'nothing'}.</p>`;
        draw();
      },
      fillCompare() { s.compareGaps = 0; draw(); }
    };

    function draw() {
      const c = model.counts(s);
      const stats = [c.needs && `${c.needs} needs`, c.criteria && `${c.criteria} criteria`, c.shortlisted && `${c.shortlisted} shortlisted`].filter(Boolean).join(' · ') || 'just started';
      app.innerHTML = `<header class="head"><span class="mark"><svg viewBox="0 0 28 28" width="28" height="28" aria-hidden="true"><circle cx="14" cy="15" r="7" fill="none" style="stroke:var(--accent)" stroke-width="1.4"/><circle cx="14" cy="15" r="2.6" style="fill:var(--node-lit)"/><path d="M10 7.5h8M14 4v3.5" style="stroke:var(--accent)" stroke-width="1.4" stroke-linecap="round"/></svg></span><span class="room">Choose</span><nav><span>⌂</span><span class="cur">⌘</span><span>▤</span><span>▦</span></nav>
          <span class="subj">${esc(s.subject)}</span><span class="stats mute">${stats}</span></header>
        <div class="main" data-slot="${opts.slot}" data-expanded="${expanded}">
          <div class="graph">${graphSvg(s.graph)}<span class="lbl">graph</span></div>
          <div class="panel"><div class="ph">concept · lit · Opus 5.5 (reading panel, as in Learn)</div><h1>${esc(s.graph[s.graph.length > 1 ? 1 : 0][0])}</h1>
            <div class="line"></div><div class="line" style="width:85%"></div><div class="line" style="width:92%"></div><div class="line" style="width:60%"></div>
            ${panelNote ? `<div class="reco">${panelNote}</div>` : ''}</div>
        </div>`;
      const main = app.querySelector('.main'), graph = main.querySelector('.graph'), panel = main.querySelector('.panel');
      const el = document.createElement('div'); el.className = 'board';
      if (opts.slot === 'rail') main.insertBefore(el, panel); else graph.appendChild(el);
      opts.render(el, { s, expanded, setExpanded, act, model, esc, counts: c, missing: model.missing(s), stage: model.stage(s) });
      proto.innerHTML = D.scenarios.map(x => `<button data-sc="${x.id}" class="${states[x.id] === s ? 'on' : ''}">${esc(x.label)}</button>`).join('') + '<button data-reset>Reset</button>';
      proto.querySelectorAll('[data-sc]').forEach(b => b.onclick = () => load(b.dataset.sc));
      proto.querySelector('[data-reset]').onclick = () => { const id = s.id; states[id] = clone(D.scenarios.find(x => x.id === id)); load(id); };
    }
    addEventListener('keydown', e => { if (e.key === 'Escape' && expanded && !/^(INPUT|TEXTAREA)$/.test(e.target.tagName)) setExpanded(false); });
    load('ongoing');
  }
  window.BOARD_KIT = { mount, model, esc };
})();
