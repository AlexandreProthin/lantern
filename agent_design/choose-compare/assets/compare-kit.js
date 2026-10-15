/* Shared kit for the choose-compare wireframes: scenarios, state changes and the Compare frame (header, web banner,
   toolbar, research progress, scenario switcher). Every proposal reads ../choose-compare-data.js and the same rules;
   only the table's mechanism differs.
   COMPARE_KIT.mount({ id, title, css, render }) — render(el, ctx) draws the table into el, with
   ctx = { s, rows, hidden, showIrr, cell(p, c), act, esc, kindLabel, research } */
(() => {
  const D = window.CHOOSE_COMPARE_DATA;
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const clone = o => JSON.parse(JSON.stringify(o));
  const kindLabel = { spec: 'manufacturer', measured: 'measured', opinion: 'opinion', sponsored: 'sponsored', model: 'model knowledge' };

  const CSS = `
  :root { --fg: #fff; --bg: #000; --mute: rgba(255,255,255,.6); --faint: rgba(255,255,255,.35); --hair: rgba(255,255,255,.28); --fill: rgba(255,255,255,.07); }
  * { box-sizing: border-box; }
  html, body { margin: 0; height: 100%; overflow: hidden; background: var(--bg); color: var(--fg); font: 13px/1.4 system-ui, 'Segoe UI', sans-serif; }
  button, input, textarea { font: inherit; color: inherit; }
  button { background: var(--bg); border: 1px solid var(--hair); border-radius: 4px; padding: 3px 9px; cursor: pointer; }
  button:hover { border-color: var(--fg); } button.on { background: var(--fg); color: var(--bg); border-color: var(--fg); }
  button:focus-visible, input:focus-visible, [tabindex]:focus-visible { outline: 2px solid var(--fg); outline-offset: 2px; }
  .mute { color: var(--mute); } .faint { color: var(--faint); }
  .app { position: fixed; inset: 0; display: grid; grid-template-rows: 48px auto auto minmax(0, 1fr); }
  .head { display: flex; align-items: center; gap: 12px; padding: 0 14px; border-bottom: 1px solid var(--hair); white-space: nowrap; overflow: hidden; }
  .head .room { font-weight: 600; } .head nav { display: flex; gap: 4px; } .head nav span { border: 1px solid var(--hair); border-radius: 4px; padding: 2px 8px; }
  .head nav span.cur { border-color: var(--fg); } .head .subj { overflow: hidden; text-overflow: ellipsis; }
  .banner { padding: 6px 14px; border-bottom: 1px dashed var(--hair); font-size: 12px; }
  .bar { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; padding: 10px 14px; border-bottom: 1px solid var(--hair); }
  .bar h1 { margin: 0; font-size: 16px; font-weight: 600; } .bar .sp { flex: 1; }
  .research { display: flex; gap: 10px; align-items: center; font-size: 12px; border: 1px dashed var(--fg); padding: 3px 10px; border-radius: 4px; }
  .research .spin { display: inline-block; width: 9px; height: 9px; border: 1px solid var(--fg); border-radius: 50%; border-right-color: transparent; animation: spin 1s linear infinite; }
  @keyframes spin { to { transform: rotate(1turn); } }
  .stage { position: relative; min-height: 0; overflow: hidden; }
  .proto { position: fixed; left: 50%; bottom: 10px; transform: translateX(-50%); z-index: 50; display: flex; gap: 4px; flex-wrap: wrap; justify-content: center;
    padding: 4px; border: 1px solid var(--hair); border-radius: 999px; background: var(--bg); max-width: calc(100vw - 24px); font-size: 12px; }
  .proto button { border-radius: 999px; border-color: transparent; }
  .tag { position: fixed; right: 12px; bottom: 54px; z-index: 50; color: var(--faint); font-size: 11px; pointer-events: none; }
  .k { display: inline-block; font-size: 10px; letter-spacing: .04em; text-transform: uppercase; border: 1px solid var(--hair); border-radius: 3px; padding: 0 4px; line-height: 15px; white-space: nowrap; }
  .k[data-k='measured'] { border-color: var(--fg); } .k[data-k='opinion'] { border-style: dashed; font-style: italic; }
  .k[data-k='sponsored'] { text-decoration: line-through; } .k[data-k='model'] { border-style: dotted; }
  .k[data-k='user'] { background: var(--fg); color: var(--bg); border-color: var(--fg); }
  .edit { border: 0; border-bottom: 1px dashed var(--hair); background: transparent; padding: 1px 0; width: 100%; }
  .edit:focus { border-bottom-color: var(--fg); outline: none; }
  @media (prefers-reduced-motion: reduce) { .research .spin { animation: none; border-right-color: var(--fg); border-style: dashed; } }`;

  function mount(opts) {
    const st = document.createElement('style'); st.textContent = CSS + (opts.css || ''); document.head.appendChild(st);
    const app = document.createElement('div'); app.className = 'app'; document.body.appendChild(app);
    const proto = document.createElement('div'); proto.className = 'proto'; document.body.appendChild(proto);
    const tag = document.createElement('div'); tag.className = 'tag'; tag.textContent = `${opts.id} · ${opts.title}`; document.body.appendChild(tag);
    const states = Object.fromEntries(D.scenarios.map(x => [x.id, clone(x)]));
    let s, showIrr = false, step = 0, timer = null, ui = {};

    const cell = (p, c) => s.cells[`${p.id}:${c.id}`] || { value: null, status: 'none', sources: [] };
    const act = {
      edit(p, c, v) {
        const x = cell(p, c); v = v.trim();
        if (!v || v === (x.room ?? x.value)) { if (x.status === 'edited') act.revert(p, c); else draw(); return; }
        if (x.status !== 'edited') { x.room = x.value; x.roomStatus = x.status; }
        x.value = v; x.status = 'edited'; x.user = { value: v, date: '2026-10-14' }; s.cells[`${p.id}:${c.id}`] = x; draw();
      },
      revert(p, c) { const x = cell(p, c); if (x.status !== 'edited') return; x.value = x.room; x.status = x.roomStatus || 'ok'; delete x.user; delete x.room; draw(); },
      check(p, c) { const x = cell(p, c); x.prev = clone(x); x.status = 'filling'; startResearch([`Checking: ${p.name}, ${c.name}`, 'Searching for an independent measurement', 'Reading a review']); },
      choose(p) { s.products.forEach(q => { if (q.state === 'chosen') q.state = 'shortlisted'; }); p.state = 'chosen'; s.status = 'decided'; draw(); },
      unchoose(p) { p.state = 'shortlisted'; s.status = 'exploring'; draw(); },
      drop(p) { s.products.splice(s.products.indexOf(p), 1); draw(); },
      toggleIrr() { showIrr = !showIrr; draw(); },
      ui, draw: () => draw()
    };
    function startResearch(steps) {
      s.progress = steps; step = 0; s.started = 'just now'; clearInterval(timer);
      timer = setInterval(() => { step++; if (step >= s.progress.length) finishResearch(); else tick(); }, 1400); draw();
    }
    function finishResearch() {
      clearInterval(timer); timer = null;
      Object.entries(s.cells).forEach(([k, x]) => { if (x.status !== 'filling') return;
        if (x.prev) { const p = x.prev; delete x.prev; Object.assign(x, p, { checked: '2026-10-14' }); x.sources = [...p.sources, { kind: 'measured', name: 'Independent review (check)', date: '2026-10-14', value: 'confirms' }]; return; }
        x.value = 'Filled by research'; x.status = 'ok'; x.sources = [{ kind: 'spec', name: 'Manufacturer specifications', date: '2026-10-14' }]; });
      s.products.forEach(p => delete p.filling); s.criteria.forEach(c => delete c.filling); delete s.progress; draw();
    }
    function load(id) { clearInterval(timer); timer = null; s = states[id]; showIrr = false; step = 0; for (const k in ui) delete ui[k]; draw();
      if (s.progress) timer = setInterval(() => { step = (step + 1) % s.progress.length; tick(); }, 1600); }
    // only the progress line changes while research runs, so an open editor keeps its focus
    function tick() { const r = app.querySelector('.rtext'); if (r) r.textContent = `${s.progress[step % s.progress.length]} · started ${s.started}`; }

    function draw() {
      const order = { must: 0, nice: 1, irrelevant: 2 };
      const crit = [...s.criteria].sort((a, b) => order[a.state] - order[b.state]);
      const rows = crit.filter(c => c.state !== 'irrelevant' || showIrr), hidden = crit.filter(c => c.state === 'irrelevant').length;
      const shortlisted = s.products.length;
      app.innerHTML = `<header class="head"><span class="room">◎ Choose</span><nav><span>⌂</span><span>⌘</span><span class="cur">▤ Compare</span><span>▦</span></nav>
          <span class="subj">${esc(s.subject)}</span><span class="mute">${shortlisted} shortlisted${s.status === 'decided' ? ' · decided' : ''}</span></header>
        ${s.web ? '<div class="banner-slot"></div>' : `<div class="banner">Use the web is off: values come from the model's knowledge (to ${esc(s.modelDate)}), not checked against current sources. <button>Turn the web on</button></div>`}
        <div class="bar"><h1>Compare</h1>
          ${s.progress ? `<span class="research"><span class="spin" aria-hidden="true"></span><span class="rtext" aria-live="polite">${esc(s.progress[step % s.progress.length])} · started ${esc(s.started)}</span><button data-stop>Cancel</button><button data-done>Finish (prototype)</button></span>` : ''}
          <span class="sp"></span>${hidden ? `<button data-irr class="${showIrr ? 'on' : ''}">${showIrr ? 'Hide' : 'Show'} irrelevant (${hidden})</button>` : ''}</div>
        <div class="stage"></div>`;
      opts.render(app.querySelector('.stage'), { s, rows, hidden, showIrr, cell, act, esc, kindLabel, research: !!s.progress });
      app.querySelector('[data-irr]')?.addEventListener('click', act.toggleIrr);
      app.querySelector('[data-done]')?.addEventListener('click', finishResearch);
      app.querySelector('[data-stop]')?.addEventListener('click', () => { Object.values(s.cells).forEach(x => { if (x.status === 'filling') { if (x.prev) { Object.assign(x, x.prev); delete x.prev; } else x.status = 'none'; } });
        s.products.forEach(p => delete p.filling); s.criteria.forEach(c => delete c.filling); delete s.progress; clearInterval(timer); draw(); });
      proto.innerHTML = D.scenarios.map(x => `<button data-sc="${x.id}" class="${states[x.id] === s ? 'on' : ''}">${esc(x.label)}</button>`).join('') + '<button data-reset>Reset</button>';
      proto.querySelectorAll('[data-sc]').forEach(b => b.onclick = () => load(b.dataset.sc));
      proto.querySelector('[data-reset]').onclick = () => { states[s.id] = clone(D.scenarios.find(x => x.id === s.id)); load(s.id); };
    }
    load('three');
  }
  window.COMPARE_KIT = { mount, esc, kindLabel };
})();
