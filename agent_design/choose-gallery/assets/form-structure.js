/* The frozen structure from round 2 on (r001-02 + r001-03 + r001-01, request revision 3), shared by every form
   proposal so only composition, density and hierarchy differ:
   toolbar = status tabs with counts · name filter · sort + direction · count (r001-02);
   resting card = status · last opened / title (one line) / board thumbnail / pick line / CR-25 stats (r001-02);
   selected card = unfolds in place at card width (r001-01), title wraps in full, then the pick (or what is missing),
   the actions, the status history as a vertical timeline (r001-03) in place of the thumbnail, the board's numbers,
   the direction and the subject's figures.
   FORM_STRUCTURE.render(el, c, { unfold: 'grow' | 'span' | 'float', thumb: 'dots' | 'steps', thumbSize: [w, h] }) */
(() => {
  // a four-step decision bar (needs, criteria, shortlist, pick): the same content as the dots, as progress
  function steps(c, s) {
    const t = c.model.stats(s);
    const cells = [
      ['Needs', t.needs ? t.answered / t.needs : 0, `${t.answered}/${t.needs}`],
      ['Criteria', t.criteria ? (t.criteria - t.open) / t.criteria : 0, `${t.criteria - t.open}/${t.criteria}`],
      ['Shortlist', Math.min(t.shortlisted, 2) / 2, String(t.shortlisted)],
      ['Pick', s.chosen ? 1 : 0, s.status === 'bought' ? 'bought' : s.chosen ? 'chosen' : '—']];
    return `<div class="steps" aria-hidden="true">${cells.map(([l, f, v]) => `<div class="step ${f >= 1 ? 'full' : f > 0 ? 'part' : ''}"><i><b style="width:${Math.round(f * 100)}%"></b></i><span>${l}</span><em class="num">${v}</em></div>`).join('')}</div>`;
  }

  function render(el, c, opt) {
    const { st, esc, fmt, model } = c;
    const [tw, th] = opt.thumbSize || [220, 64];
    const tab = (k, label, n) => `<button class="tab ${st.status === k ? 'on' : ''}" data-status="${k}" aria-pressed="${st.status === k}">${k === 'all' ? '' : `<span class="st dot" data-s="${k}"></span>`}<span class="tl-l">${label}</span><span class="n num">${n}</span></button>`;
    const pickLine = s => {
      if (s.chosen) return `<div class="pick has" title="${esc(s.chosen.name)}"><span class="verb">${s.status === 'bought' ? 'Bought' : 'Chose'}</span> <b>${esc(s.chosen.name)}</b> <span class="price">· ${esc(s.chosen.price)}</span></div>`;
      const un = model.unchosen(s), m = model.missing(s), run = s.running ? '<span class="run">generating…</span>' : '';
      if (un) return `<div class="pick back"><span class="verb">No pick</span> <b>${esc(un.product)}</b> <span class="price">un-chosen ${fmt.hours(un.at)}</span>${run}</div>`;
      return `<div class="pick ${m.length ? 'miss' : 'ready'}">${m.length ? `<span class="verb">No pick yet</span> <b>${m.length} missing</b>` : '<b>Ready</b> <span class="price">· the room can recommend</span>'}${run}</div>`;
    };
    const visual = s => opt.thumb === 'steps' ? steps(c, s) : `<div class="th">${c.thumb(s, tw, th)}</div>`;
    const timeline = s => `<ul class="vt">${[...s.history].reverse().map(h => `<li class="${h.unchosen ? 'u' : h.status === 'exploring' ? 'e' : h.status[0]}"><span>${h.unchosen ? `Un-chose ${esc(h.product)}; exploring again` : h.status === 'exploring' ? 'Started exploring' : h.status === 'decided' ? `Chose ${esc(h.product)}` : `Marked ${esc(h.product)} as bought`}</span><small title="${fmt.time(h.at)}">${fmt.time(h.at)}</small></li>`).join('')}</ul>`;
    const unfolded = s => {
      const t = model.stats(s), m = model.missing(s);
      return `<div class="uf keep">
        ${s.chosen ? `<div class="pk"><span class="verb">${s.status === 'bought' ? 'Bought' : 'Chosen'}</span><b>${esc(s.chosen.name)}</b><span class="fact">${esc(s.chosen.fact)}</span><span class="price">${esc(s.chosen.price)}</span><span class="src">seen at ${esc(s.chosen.priceSource)}, ${fmt.date(s.chosen.priceSeenAt)} — an indication, not a promise</span></div>`
          : `<div class="pk none"><span class="verb">No pick yet</span>${m.length ? `<b>${m.length} missing</b><span class="fact">${esc(m.join(' · '))}</span>` : '<b>Ready</b><span class="fact">The board is complete: the room can recommend.</span>'}${s.running ? '<span class="fact">A generation is running.</span>' : ''}</div>`}
        <div class="acts"><button class="pri" data-open="${s.id}">Open in Survey</button><button data-rn="${s.id}">Rename</button><button data-reveal="${s.id}">Reveal</button><button data-del="${s.id}">Delete…</button></div>
        <section class="sec hist"><h3>History</h3>${timeline(s)}</section>
        <section class="sec"><h3>Board</h3><dl>
          <dt>Needs</dt><dd class="num">${t.answered} of ${t.needs} answered</dd>
          <dt>Criteria</dt><dd class="num">${t.must} must · ${t.nice} nice · ${t.open} to rank · ${t.irrelevant} irrelevant</dd>
          <dt>Products</dt><dd class="num">${t.shortlisted} shortlisted · ${t.candidates} candidates · ${t.rejected} rejected</dd>
          <dt>Compare</dt><dd>${s.compareGaps ? `${s.compareGaps} empty cells` : 'filled'}</dd></dl></section>
        ${s.direction ? `<section class="sec"><h3>Direction</h3><p class="dir">“${esc(s.direction)}”</p></section>` : ''}
        <section class="sec"><h3>Subject</h3><dl>
          <dt>Created</dt><dd>${fmt.date(s.createdAt)}</dd><dt>Opened</dt><dd>${fmt.time(s.lastOpened)}</dd>
          <dt>Nodes</dt><dd class="num">${s.nodes}</dd><dt>Tone</dt><dd>${esc(s.tone)}</dd><dt>Model</dt><dd>${esc(s.model)}</dd>
          <dt>Generations</dt><dd class="num">${s.generations}${s.running ? ' · one running' : ''}</dd><dt>Tokens</dt><dd class="num">${fmt.k(s.tokens.in)} in / ${fmt.k(s.tokens.out)} out</dd></dl></section>
      </div>`;
    };
    const resting = s => `<div class="top"><span class="st" data-s="${s.status}">${s.status}</span><span class="when" title="${fmt.time(s.lastOpened)}">opened ${fmt.rel(s.lastOpened)}</span></div>
      ${c.title(s)}${visual(s)}${pickLine(s)}<div class="stats num">${model.summary(s)}</div>`;
    const card = (s, i) => {
      const sel = st.sel === s.id;
      const inner = !sel ? resting(s)
        : opt.unfold === 'float' ? `<div class="rest" aria-hidden="true">${resting({ ...s, id: '_' })}</div><div class="lift"><div class="top"><span class="st" data-s="${s.status}">${s.status}</span><span class="when">opened ${fmt.rel(s.lastOpened)}</span></div>${c.title(s)}${unfolded(s)}</div>`
        : `<div class="top"><span class="st" data-s="${s.status}">${s.status}</span><span class="when">opened ${fmt.rel(s.lastOpened)}</span></div>${c.title(s)}${unfolded(s)}`;
      return `<article class="card ${sel ? 'sel' : ''} st-${s.status}" data-id="${s.id}" tabindex="${sel || (!st.sel && !i) ? 0 : -1}" aria-selected="${sel}" aria-expanded="${sel}">${inner}</article>`;
    };
    el.innerHTML = `<div class="wrap" data-unfold="${opt.unfold}">
      <div class="bar"><div class="tabs" role="group" aria-label="Filter by status">${tab('all', 'All', c.counts.all)}${tab('exploring', 'Exploring', c.counts.exploring)}${tab('decided', 'Decided', c.counts.decided)}${tab('bought', 'Bought', c.counts.bought)}</div>
        <span class="sp"></span>
        <input type="search" data-k="q" placeholder="Filter by name" value="${esc(st.q)}" aria-label="Filter by name">
        <label class="sortl"><span>Sort</span> <select data-sortsel>${Object.entries(c.SORTS).map(([k, v]) => `<option value="${k}" ${k === st.sort ? 'selected' : ''}>${v.label}</option>`).join('')}</select></label>
        <button class="dirb" data-dir aria-label="Reverse order">${st.dir > 0 ? '↓' : '↑'}</button>
        <span class="count num">${c.list.length === c.total ? c.total : `${c.list.length} of ${c.total}`}</span></div>
      <div class="scroll" data-scroll="grid">${c.list.length ? `<div class="grid" role="listbox" aria-label="Choose subjects">${c.list.map(card).join('')}</div>` : c.noMatch()}</div></div>`;
  }

  // neutral base for the structure's parts; every proposal sets the form on top of it
  const css = `
  .wrap { height: 100%; display: grid; grid-template-rows: auto 1fr; }
  .bar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; } .bar .sp { flex: 1; }
  .tabs { display: flex; } .tab { display: inline-flex; gap: 6px; align-items: center; }
  .st.dot { border: 0; padding: 0; font-size: 0; }
  .scroll { overflow: auto; position: relative; }
  .grid { display: grid; position: relative; }
  .card { display: grid; align-content: start; min-width: 0; cursor: default; position: relative; }
  .card .top { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
  .card .when { white-space: nowrap; }
  .card .ttl { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .card.sel .ttl { white-space: normal; overflow-wrap: anywhere; } .card .rn { width: 100%; }
  .th .thumb { width: 100%; }
  .pick { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; } .pick .run::before { content: ' · '; }
  .steps { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; }
  .step { display: grid; gap: 2px; min-width: 0; } .step i { display: block; height: 4px; position: relative; overflow: hidden; } .step i b { position: absolute; inset: 0 auto 0 0; }
  .step span, .step em { font-style: normal; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .uf { display: grid; gap: 14px; min-width: 0; }
  .pk { display: grid; gap: 2px; } .pk b { overflow-wrap: anywhere; }
  .acts { display: flex; gap: 6px; flex-wrap: wrap; }
  .sec h3 { margin: 0 0 6px; } .sec .dir { margin: 0; overflow-wrap: anywhere; }
  .vt { list-style: none; margin: 0; padding: 0 0 0 16px; display: grid; gap: 10px; position: relative; }
  .vt::before { content: ''; position: absolute; left: 4px; top: 6px; bottom: 6px; width: 1px; }
  .vt li { position: relative; display: grid; } .vt li::before { content: ''; position: absolute; left: -16px; top: 4px; width: 9px; height: 9px; border-radius: 50%; box-sizing: border-box; }
  .vt small { display: block; }
  dl { margin: 0; display: grid; grid-template-columns: auto 1fr; gap: 3px 12px; } dd { margin: 0; overflow-wrap: anywhere; }
  .nomatch { padding: 48px 0; }`;

  window.FORM_STRUCTURE = { render, steps, css };
})();
