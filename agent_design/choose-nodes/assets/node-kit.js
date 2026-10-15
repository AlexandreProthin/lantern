/* choose-nodes shared kit: page frame, tree layout, selection, reading panel, state sheet and legend.
   A proposal calls NodeKit.mount(design) where design = {
     id, title, direction,
     renderNode(node, {bare, sample}) -> HTML; must contain one element with class "anchor" (edges attach to it),
     legend: [{heading, rows: [{node: {kind, state|status}, name, text}]}],
     edgeClass(node, nodes) -> extra class for the edge into node (optional),
     colWidth (optional, px)
   }
     onStateChange(changes, {canvas}) -> motion hook after a state change (optional; motion rounds),
     phase (optional, eyebrow label)
   Everything here is shared on purpose: only the node encoding differs between proposals. */
(function () {
  const D = window.CHOOSE_NODES_DATA;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const KIND = {
    subject: ['Subject', 'The root: what is being chosen'],
    concept: ['Concept', 'Something to understand to choose well; a trade-off is a concept'],
    need: ['Need', 'A question to the user, answered by them; feeds the criteria'],
    criterion: ['Criterion', 'Something to compare on, with why it matters for this user'],
    family: ['Family', 'A group of similar products'],
    product: ['Product', 'A real model, with key facts and sources'],
    own: ['Own', 'Added by the user, as in Learn'],
  };
  const stateOf = n => (n.kind === 'subject' ? n.status : n.state);
  const sheetFor = kind => D.stateSheet.find(r => r.kind === kind);

  const css = `
:root{color-scheme:dark;--bg:#111;--ink:#eee;--mute:#9a9a9a;--line:#555;--faint:#2c2c2c;font-family:system-ui,sans-serif}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font-size:14px;line-height:1.5}
button{font:inherit;color:inherit}
.kit-head{padding:22px 24px 12px;max-width:1100px}
.kit-eyebrow{font:12px ui-monospace,Consolas,monospace;color:var(--mute);margin:0}
.kit-head h1{font-size:20px;font-weight:600;margin:4px 0 6px}
.kit-dir{color:var(--mute);margin:0;max-width:86ch}
.kit-survey{display:grid;grid-template-columns:minmax(0,1fr) 300px;border-top:1px solid var(--line);border-bottom:1px solid var(--line);height:min(82vh,860px)}
.kit-graph{position:relative;overflow:auto}
.kit-canvas{position:relative;margin:24px}
.kit-edges{position:absolute;left:0;top:0;pointer-events:none;overflow:visible}
.kit-edges path{fill:none;stroke:#6a6a6a;stroke-width:1}
.kit-edges path.faded{stroke:#3d3d3d;stroke-dasharray:3 4}
.kit-node{position:absolute;left:0;top:0;background:none;border:0;padding:0;margin:0;text-align:left;cursor:pointer}
.kit-node:focus-visible{outline:none}
.kit-node:focus-visible .anchor{outline:1px dashed #fff;outline-offset:7px}
.kit-node[aria-pressed="true"] .anchor{outline:1px solid #fff;outline-offset:6px}
.kit-panel{border-left:1px solid var(--line);padding:18px 18px 28px;overflow:auto}
.kit-panel .k{font:11px ui-monospace,Consolas,monospace;letter-spacing:.06em;text-transform:uppercase;color:var(--mute);margin:0}
.kit-panel h2{font-size:17px;font-weight:600;margin:4px 0 12px;overflow-wrap:anywhere}
.kit-panel dl{display:grid;grid-template-columns:auto 1fr;gap:4px 12px;margin:0 0 14px}
.kit-panel dt{color:var(--mute)}.kit-panel dd{margin:0;overflow-wrap:anywhere}
.kit-panel h3{font-size:12px;font-weight:600;margin:18px 0 8px;color:var(--mute)}
.kit-panel .what{color:var(--mute);margin:0}
.kit-try{display:flex;flex-wrap:wrap;gap:6px}
.kit-try button{background:none;border:1px solid var(--line);border-radius:3px;padding:2px 8px;cursor:pointer;font-size:12px}
.kit-try button[aria-pressed="true"]{border-color:#fff;background:#fff;color:#111}
.kit-panel .note{font-size:12px;color:var(--mute);margin:8px 0 0}
.kit-panel ul{margin:0;padding-left:18px}
.kit-sec{padding:22px 24px;border-bottom:1px solid var(--faint)}
.kit-sec h2{font-size:15px;font-weight:600;margin:0 0 4px}
.kit-sec>p{color:var(--mute);margin:0 0 16px;max-width:86ch}
.kit-sheet{display:grid;gap:0;overflow-x:auto}
.kit-row{display:grid;grid-template-columns:110px repeat(5,minmax(170px,1fr));border-top:1px solid var(--faint);min-width:960px}
.kit-row>div{padding:14px 10px}
.kit-row .rk{font:12px ui-monospace,Consolas,monospace;color:var(--mute);padding-top:18px}
.kit-cell .cap{display:block;font:11px ui-monospace,Consolas,monospace;color:var(--mute);margin-top:8px}
.kit-cell .nodebox{position:relative}
.kit-legend{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:8px 40px}
.kit-legend h3{font-size:12px;font-weight:600;color:var(--mute);margin:8px 0 6px;grid-column:1/-1}
.kit-lrow{display:grid;grid-template-columns:64px 1fr;gap:12px;align-items:center;padding:6px 0;border-top:1px solid var(--faint)}
.kit-lrow .g{display:grid;place-items:center;min-height:52px}
.kit-lrow b{font-weight:600}.kit-lrow span{color:var(--mute)}
@media(max-width:760px){.kit-head{padding:18px 16px 10px}.kit-survey{grid-template-columns:1fr;height:auto}.kit-graph{height:68vh}.kit-panel{border-left:0;border-top:1px solid var(--line)}.kit-sec{padding:18px 16px}}
@media(prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}`;

  function mount(design) {
    const style = document.createElement('style'); style.textContent = css; document.head.prepend(style);
    const nodes = D.nodes.map(n => ({ ...n }));
    const byId = new Map(nodes.map(n => [n.id, n]));
    const kids = id => nodes.filter(n => n.parentId === id);
    const depthOf = n => (n.parentId ? depthOf(byId.get(n.parentId)) + 1 : 0);
    const colW = design.colWidth || 250;
    let selected = 's';

    document.body.innerHTML = `
<header class="kit-head"><p class="kit-eyebrow">choose-nodes · ${esc(design.id)} · ${esc(design.phase || 'wireframe')} · subject “${esc(D.subject)}”</p>
<h1>${esc(design.title)}</h1><p class="kit-dir">${esc(design.direction)}</p></header>
<section class="kit-survey" aria-label="Survey: graph and reading panel">
  <div class="kit-graph"><div class="kit-canvas" id="canvas"><svg class="kit-edges" id="edges" aria-hidden="true"></svg><div id="nodes"></div></div></div>
  <aside class="kit-panel" id="panel" aria-live="polite"></aside>
</section>
<section class="kit-sec" aria-labelledby="sheet-h"><h2 id="sheet-h">Every state, kind by kind</h2>
<p>CR-21 in full. Each cell is the same node drawing as on the graph, with a sample title. Selection is not a state: it never changes the data.</p>
<div class="kit-sheet" id="sheet"></div></section>
<section class="kit-sec" aria-labelledby="legend-h"><h2 id="legend-h">Legend rows</h2>
<p>What the room's legend lists (CR-20: each kind has its own glyph and legend row), followed by the state rows.</p>
<div class="kit-legend" id="legend"></div></section>`;

    const $ = id => document.getElementById(id);

    function label(n) {
      const s = stateOf(n);
      let t = `${n.title} · ${KIND[n.kind][0].toLowerCase()} · ${s}`;
      if (n.answer && s === 'answered') t += ` · ${n.answer}`;
      if (n.reason && s === 'rejected') t += ` · ${n.reason}`;
      return t;
    }

    function renderGraph() {
      $('nodes').innerHTML = nodes.map(n =>
        `<button class="kit-node" data-id="${n.id}" data-kind="${n.kind}" data-state="${stateOf(n)}" aria-pressed="${n.id === selected}" aria-label="${esc(label(n))}" title="${esc(label(n))}">${design.renderNode(n, {})}</button>`).join('');
      $('nodes').querySelectorAll('.kit-node').forEach(b => b.addEventListener('click', () => select(b.dataset.id)));
      layout();
    }

    function layout() {
      const els = new Map([...$('nodes').querySelectorAll('.kit-node')].map(e => [e.dataset.id, e]));
      const info = new Map();
      for (const [id, e] of els) {
        const r = e.getBoundingClientRect(), a = e.querySelector('.anchor').getBoundingClientRect();
        info.set(id, { h: r.height, w: r.width, ay: a.top - r.top + a.height / 2, ax: a.left - r.left, aw: a.width });
      }
      const GAP = 18, top = new Map(), colBottom = [];
      const bump = (d, v) => { colBottom[d] = Math.max(colBottom[d] ?? 0, v); };
      function shift(id, d, dy) {
        top.set(id, top.get(id) + dy); bump(d, top.get(id) + info.get(id).h + GAP);
        kids(id).forEach(k => shift(k.id, d + 1, dy));
      }
      function place(id, d) {
        const ch = kids(id), i = info.get(id);
        let t;
        if (!ch.length) t = colBottom[d] ?? 0;
        else {
          ch.forEach(c => place(c.id, d + 1));
          const f = ch[0], l = ch[ch.length - 1];
          t = (top.get(f.id) + info.get(f.id).ay + top.get(l.id) + info.get(l.id).ay) / 2 - i.ay;
        }
        const min = colBottom[d] ?? 0;
        if (t < min) { const dy = min - t; t = min; ch.forEach(c => shift(c.id, d + 1, dy)); }
        top.set(id, t); bump(d, t + i.h + GAP);
      }
      place('s', 0);
      let W = 0, H = 0;
      for (const n of nodes) {
        const e = els.get(n.id), x = depthOf(n) * colW, y = top.get(n.id);
        e.style.transform = `translate(${x}px,${y}px)`;
        W = Math.max(W, x + info.get(n.id).w); H = Math.max(H, y + info.get(n.id).h);
      }
      const c = $('canvas'); c.style.width = W + 'px'; c.style.height = H + 'px';
      const svg = $('edges'); svg.setAttribute('width', W); svg.setAttribute('height', H);
      svg.innerHTML = nodes.filter(n => n.parentId).map(n => {
        const p = byId.get(n.parentId), pi = info.get(p.id), ci = info.get(n.id);
        const x1 = depthOf(p) * colW + pi.ax + pi.aw, y1 = top.get(p.id) + pi.ay;
        const x2 = depthOf(n) * colW + ci.ax, y2 = top.get(n.id) + ci.ay, mx = (x1 + x2) / 2;
        const cls = (design.edgeClass && design.edgeClass(n, nodes)) || (stateOf(n) === 'dismissed' ? 'faded' : '');
        return `<path class="${cls}" d="M${x1} ${y1}C${mx} ${y1} ${mx} ${y2} ${x2} ${y2}"/>`;
      }).join('');
    }

    function renderPanel() {
      const n = byId.get(selected), s = stateOf(n), row = sheetFor(n.kind);
      const dl = [['State', n.kind === 'subject' ? `${s} (status)` : s]];
      if (n.answer) dl.push(['Answer', n.answer]);
      if (n.why) dl.push(['Why', n.why]);
      if (n.fact) dl.push(['Fact', n.fact]);
      if (n.reason) dl.push(['Reason', n.reason]);
      if (s === 'dismissed') dl.push(['From', n.dismissedFrom]);
      const dismissed = kids(n.id).filter(k => k.state === 'dismissed');
      $('panel').innerHTML = `<p class="k">${KIND[n.kind][0]}</p><h2>${esc(n.title)}</h2>
<dl>${dl.map(([a, b]) => `<dt>${a}</dt><dd>${esc(b)}</dd>`).join('')}</dl>
<p class="what">${KIND[n.kind][1]}.</p>
<h3>Try a state <span style="font-weight:400">(prototype only)</span></h3>
<div class="kit-try">${row.states.map(st => `<button type="button" data-st="${st}" aria-pressed="${st === s}">${st}</button>`).join('')}</div>
${row.note ? `<p class="note">${esc(row.note)}</p>` : ''}
${dismissed.length ? `<h3>Dismissed (${dismissed.length})</h3><ul>${dismissed.map(k => `<li>${esc(k.title)}</li>`).join('')}</ul>` : ''}`;
      $('panel').querySelectorAll('.kit-try button').forEach(b => b.addEventListener('click', () => setState(n, b.dataset.st)));
    }

    function setState(n, st, extra) {
      // snapshot for design.onStateChange (motion): every node whose state or status changes is reported once
      const prev = new Map(nodes.map(o => [o.id, stateOf(o)]));
      const html = new Map([...$('nodes').querySelectorAll('.kit-node')].map(e => [e.dataset.id, e.innerHTML]));
      if (extra) Object.assign(n, extra);
      if (n.kind === 'subject') n.status = st;
      else {
        const before = n.state;
        if (st === 'dismissed') n.dismissedFrom = before === 'dismissed' ? n.dismissedFrom : before;
        if (st === 'rejected' && !n.reason) n.reason = 'the reason the user gives when rejecting';
        n.state = st;
        if (n.kind === 'product') {
          if (st === 'chosen') nodes.forEach(o => { if (o !== n && o.kind === 'product' && o.state === 'chosen') o.state = 'shortlisted'; }); // CR-22: never auto-reject
          const subj = byId.get('s'), any = nodes.some(o => o.kind === 'product' && o.state === 'chosen');
          if (any && subj.status === 'exploring') subj.status = 'decided';
          if (!any) subj.status = 'exploring';
        }
      }
      refresh();
      const changes = nodes.filter(o => prev.get(o.id) !== stateOf(o)).map(o => ({
        node: o, from: prev.get(o.id), to: stateOf(o), oldHTML: html.get(o.id),
        el: $('nodes').querySelector(`[data-id="${o.id}"]`) }));
      // the acted-on node first, then the others (an un-chosen product, the subject's status)
      changes.sort((a, b) => (b.node === n) - (a.node === n));
      if (changes.length && design.onStateChange) design.onStateChange(changes, { canvas: $('canvas') });
    }

    function select(id) { selected = id; refresh(); }
    function refresh() {
      // family summaries, for designs that print them
      nodes.filter(n => n.kind === 'family').forEach(f => {
        const ps = kids(f.id).filter(k => k.kind === 'product'), c = st => ps.filter(p => p.state === st).length;
        f.summary = { products: ps.length, chosen: c('chosen'), shortlisted: c('shortlisted'), rejected: c('rejected') };
      });
      renderGraph(); renderPanel();
    }

    function sample(kind, st) {
      const n = { id: `x-${kind}-${st}`, kind, title: D.sampleTitles[kind] };
      if (kind === 'subject') n.status = st; else n.state = st;
      if (st === 'answered') n.answer = 'about 500 €';
      if (kind === 'criterion') n.why = 'it stands in a bedroom';
      if (st === 'rejected') n.reason = 'too loud for a bedroom';
      if (st === 'dismissed') n.dismissedFrom = kind === 'product' ? 'candidate' : 'open';
      if (kind === 'family') n.summary = { products: 4, chosen: 0, shortlisted: 1, rejected: 1 };
      return n;
    }

    $('sheet').innerHTML = D.stateSheet.map(r => `<div class="kit-row"><div class="rk">${r.kind}</div>${r.states.map(st =>
      `<div class="kit-cell"><div class="nodebox" data-kind="${r.kind}" data-state="${st}">${design.renderNode(sample(r.kind, st), { sample: true })}</div><span class="cap">${st}</span></div>`).join('')}</div>`).join('');

    $('legend').innerHTML = design.legend.map(sec => `<h3>${esc(sec.heading)}</h3>${sec.rows.map(r => {
      const n = sample(r.node.kind, r.node.state || r.node.status);
      return `<div class="kit-lrow"><div class="g" data-kind="${n.kind}" data-state="${stateOf(n)}">${design.renderNode(n, { bare: true })}</div><div><b>${esc(r.name)}</b><br><span>${esc(r.text)}</span></div></div>`;
    }).join('')}`).join('');

    refresh();
    window.addEventListener('resize', () => layout());
    // prototype API for the motion rounds' story player
    NodeKit.api = {
      set: (id, st, extra) => { selected = id; setState(byId.get(id), st, extra); },
      select, get: id => byId.get(id), el: id => $('nodes').querySelector(`[data-id="${id}"]`),
      graph: () => document.querySelector('.kit-graph'), canvas: () => $('canvas'),
      reset() { nodes.splice(0, nodes.length, ...D.nodes.map(n => ({ ...n }))); byId.clear(); nodes.forEach(n => byId.set(n.id, n)); selected = 's'; refresh(); },
    };
  }

  window.NodeKit = { mount, esc, stateOf, KIND };
})();
