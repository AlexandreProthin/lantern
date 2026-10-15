/* Shared kit for the choose-board wireframes: the scenario model (counts, what is missing, completeness, state
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
  :root { --fg: #fff; --bg: #000; --mute: rgba(255,255,255,.6); --faint: rgba(255,255,255,.35); --hair: rgba(255,255,255,.28); --fill: rgba(255,255,255,.07); }
  * { box-sizing: border-box; }
  html, body { margin: 0; height: 100%; overflow: hidden; background: var(--bg); color: var(--fg); font: 13px/1.4 system-ui, 'Segoe UI', sans-serif; }
  button, input, textarea { font: inherit; color: inherit; }
  button { background: var(--bg); border: 1px solid var(--hair); border-radius: 4px; padding: 4px 9px; cursor: pointer; }
  button:hover { border-color: var(--fg); } button.on { background: var(--fg); color: var(--bg); border-color: var(--fg); }
  button:focus-visible, input:focus-visible { outline: 2px solid var(--fg); outline-offset: 2px; }
  .mono { font-family: ui-monospace, 'Cascadia Mono', Consolas, monospace; }
  .mute { color: var(--mute); } .faint { color: var(--faint); }
  .app { position: fixed; inset: 0; display: grid; grid-template-rows: 48px 1fr; }
  .head { display: flex; align-items: center; gap: 12px; padding: 0 14px; border-bottom: 1px solid var(--hair); white-space: nowrap; overflow: hidden; }
  .head .room { font-weight: 600; } .head nav { display: flex; gap: 4px; } .head nav span { border: 1px solid var(--hair); border-radius: 4px; padding: 2px 8px; }
  .head nav span.cur { border-color: var(--fg); } .head .subj { overflow: hidden; text-overflow: ellipsis; max-width: 32vw; }
  .main { display: flex; min-height: 0; position: relative; }
  .graph { position: relative; flex: 1 1 56%; min-width: 0; overflow: hidden; }
  .graph svg { position: absolute; inset: 0; width: 100%; height: 100%; }
  .graph .lbl { position: absolute; left: 12px; bottom: 10px; color: var(--faint); font-size: 11px; }
  .divider { flex: 0 0 1px; background: var(--hair); }
  .panel { flex: 0 0 38%; min-width: 0; padding: 18px 22px; overflow: auto; border-left: 1px solid var(--hair); }
  .panel .ph { border: 1px dashed var(--hair); padding: 12px; color: var(--mute); margin-bottom: 12px; }
  .panel h1 { font-size: 18px; margin: 4px 0 10px; } .panel .line { height: 8px; background: var(--fill); margin: 8px 0; border-radius: 2px; }
  .panel .reco { border: 1px solid var(--fg); padding: 12px; margin-top: 14px; }
  .proto { position: fixed; left: 50%; bottom: 10px; transform: translateX(-50%); z-index: 50; display: flex; gap: 4px; flex-wrap: wrap; justify-content: center;
    padding: 4px; border: 1px solid var(--hair); border-radius: 999px; background: var(--bg); max-width: calc(100vw - 24px); font-size: 12px; }
  .proto button { border-radius: 999px; border-color: transparent; }
  .tag { position: fixed; right: 12px; bottom: 54px; z-index: 50; color: var(--faint); font-size: 11px; pointer-events: none; }
  .st { display: inline-block; border: 1px solid var(--hair); border-radius: 999px; padding: 0 7px; font-size: 11px; }
  .st[data-s='decided'], .st[data-s='ready'] { border-color: var(--fg); } .st[data-s='bought'] { background: var(--fg); color: var(--bg); }
  .seg { display: inline-flex; border: 1px solid var(--hair); border-radius: 4px; overflow: hidden; }
  .seg button { border: 0; border-radius: 0; padding: 2px 7px; font-size: 11px; } .seg button + button { border-left: 1px solid var(--hair); }
  .edit { border: 0; border-bottom: 1px dashed var(--hair); background: transparent; padding: 1px 0; width: 100%; }
  .edit:focus { border-bottom-color: var(--fg); outline: none; }
  @media (max-width: 760px) { .main { flex-direction: column; } .panel { flex-basis: 40%; border-left: 0; border-top: 1px solid var(--hair); } .head .stats { display: none; } }
  @media (prefers-reduced-motion: reduce) { * { transition: none !important; animation: none !important; } }`;

  function graphSvg(nodes) {
    // root at the top, the rest on a second row; enough to show the board's neighbour
    const n = nodes.length - 1, xs = nodes.map((_, i) => i ? 10 + 80 * (i - .5) / Math.max(1, n) : 50), ys = nodes.map((_, i) => i ? 52 : 26);
    let s = '<svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">';
    nodes.forEach((_, i) => { if (i) s += `<line x1="50" y1="26" x2="${xs[i]}" y2="52" stroke="rgba(255,255,255,.3)" stroke-width=".2"/>`; });
    nodes.forEach(([t, look], i) => {
      const fill = look === 'settled' ? '#fff' : '#000', dash = look === 'open' ? 'stroke-dasharray=".6 .6"' : '';
      s += `<circle cx="${xs[i]}" cy="${ys[i]}" r="2.6" fill="${fill}" stroke="#fff" stroke-width=".25" ${dash}/>`;
      s += `<text x="${xs[i]}" y="${ys[i] + 6}" fill="rgba(255,255,255,.8)" font-size="2.1" text-anchor="middle">${esc(t.length > 22 ? t.slice(0, 21) + '…' : t)}</text>`;
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
      app.innerHTML = `<header class="head"><span class="room">◎ Choose</span><nav><span>⌂</span><span class="cur">⌘ Survey</span><span>▤</span><span>▦</span></nav>
          <span class="subj">${esc(s.subject)}</span><span class="stats mute">${stats}</span></header>
        <div class="main" data-slot="${opts.slot}" data-expanded="${expanded}">
          <div class="graph">${graphSvg(s.graph)}<span class="lbl">graph</span></div>
          <div class="panel"><div class="ph">Reading panel: the focused node (unchanged from Learn)</div><h1>${esc(s.graph[s.graph.length > 1 ? 1 : 0][0])}</h1>
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
