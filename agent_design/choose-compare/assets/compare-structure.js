/* Compare's structure, frozen for the form rounds: r002-01 (sourced cells + evidence band, from r001-01 and r001-03)
   with the click rules of request revision 3 (user, 2026-10-14):
   - a click on a criterion (first column) unfolds that row's band: every product's evidence card; again folds it.
     A click on the column header ("n shortlisted") unfolds or folds every row.
   - a click on a product cell unfolds only that cell's card, in a band under its row; again folds it.
     Any unfolded rows fold first (if the clicked cell is in an unfolded row, only its card stays open).
   - the card holds the evidence and the edit field (cells are no longer edited in place).
   Markup and behaviour only; each form proposal styles it with its own CSS. Do not change per proposal.
   window.COMPARE_RENDER(el, ctx) for COMPARE_KIT.mount. */
(() => {
  const day = d => /^\d{4}-\d\d-\d\d$/.test(d) ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : d;
  const GROUP = { must: 'Must', nice: 'Nice to have', irrelevant: 'Irrelevant' };

  window.COMPARE_RENDER = function (el, { s, rows, cell, act, esc, kindLabel }) {
    const ui = act.ui, P = s.products; ui.rows = ui.rows || new Set();
    const summary = c => {
      const xs = P.map(p => cell(p, c)), n = {}; xs.forEach(x => x.sources.forEach(z => n[z.kind] = (n[z.kind] || 0) + 1));
      const parts = ['spec', 'measured', 'opinion', 'model'].filter(k => n[k]).map(k => `${n[k]} ${kindLabel[k]}`);
      const cnt = st => xs.filter(x => x.status === st).length;
      return [...parts, cnt('disagree') && `≠ ${cnt('disagree')}`, cnt('none') && `? ${cnt('none')}`, cnt('edited') && `✎ ${cnt('edited')}`, cnt('filling') && `… ${cnt('filling')}`].filter(Boolean).join(' · ') || 'no sources yet';
    };
    const tags = x => {
      const used = x.sources.filter(z => z.kind !== 'sponsored'), spons = x.sources.filter(z => z.kind === 'sponsored');
      return `<span class="srcs">${used.map(z => `<span class="tagline"><span class="k" data-k="${z.kind}">${kindLabel[z.kind]}</span><span class="sn">${esc(z.name)} · ${esc(day(z.date))}</span></span>`).join('')}
        ${spons.map(z => `<span class="tagline"><span class="k" data-k="sponsored">sponsored</span><span class="sn">${esc(z.name)}: not used</span></span>`).join('')}</span>`;
    };
    const src = z => `<div class="src ${z.kind}"><span class="sv">${esc(z.value || '—')}</span><span class="meta"><span class="k" data-k="${z.kind}">${kindLabel[z.kind]}</span>${esc(z.name)} · read ${esc(day(z.date))}${z.kind === 'sponsored' ? ' · not used' : ''}</span></div>`;
    const card = (p, c) => { const x = cell(p, c), key = `${p.id}:${c.id}`;
      return `<div class="card" data-card="${key}"><div class="ch"><b>${esc(p.name)}</b><span>${esc(c.name)}</span>${ui.item === key ? `<button class="fold" data-fold aria-label="Fold">✕</button>` : ''}</div>
        ${x.status === 'edited' ? `<div class="yours"><span class="k" data-k="user">yours</span> ${esc(x.value)}${x.user.note ? ' · ' + esc(x.user.note) : ''}<br><span class="mute">the room's: ${esc(x.room)}</span></div>` : ''}
        ${x.note ? `<div class="note">${esc(x.note)}</div>` : ''}
        <div class="srclist">${x.status === 'filling' ? '<div class="mute">Researching: sources appear here as they are read.</div>' : x.sources.map(src).join('') || '<div class="mute">No source.</div>'}</div>
        ${x.kind === 'price' ? '<div class="pricenote">A price is an indication at that date, not a promise.</div>' : ''}
        <div class="ed"><input class="edit" data-in="${key}" value="${esc(x.status === 'edited' ? x.value : '')}" placeholder="your value…" aria-label="Your value for ${esc(p.name)}, ${esc(c.name)}">
          <div class="row"><button data-save="${key}">Save as mine</button>${x.status === 'edited' ? `<button data-revert="${key}">Revert to the room's</button>` : ''}${s.web && x.status !== 'filling' ? `<button data-check="${key}">Check this</button>` : ''}</div></div></div>`; };
    const td = (p, c) => {
      const x = cell(p, c), key = `${p.id}:${c.id}`;
      let b = x.status === 'filling' ? '<span class="v none">Researching…</span>' : x.status === 'none' ? '<span class="v none">No source found</span>' : `<span class="v">${esc(x.value)}</span>`;
      if (x.status !== 'filling') {
        if (x.kind === 'price' && x.sources[0]) b += `<span class="price">an indication, not a promise · seen ${esc(day(x.sources[0].date))}</span>`;
        if (x.status === 'edited') b += `<span class="srcs"><span class="tagline"><span class="k" data-k="user">yours</span><span class="sn">${esc(day(x.user.date))}</span></span></span><span class="room">The room's value: <s>${esc(x.room)}</s></span>`;
        if (x.note && x.status !== 'edited') b += `<span class="note">${esc(x.note)}</span>`;
        b += tags(x);
      }
      const open = ui.item === key || ui.rows.has(c.id);
      return `<td class="${x.status} ${p.state === 'chosen' ? 'chosen' : ''} ${ui.item === key ? 'item' : ''} ${open ? 'open' : ''}" data-cell="${key}" tabindex="0" aria-expanded="${open}">${b}</td>`;
    };
    let lastState = null;
    const body = rows.map(c => { let g = ''; if (c.state !== lastState) { lastState = c.state; g = `<tr class="grp"><th colspan="${P.length + 1}">${GROUP[c.state]}</th></tr>`; }
      const full = ui.rows.has(c.id), itemHere = ui.item && ui.item.endsWith(':' + c.id), band = full || itemHere;
      const head = `<th data-row="${c.id}" tabindex="0" aria-expanded="${full}"><span class="tw">${full ? '▾' : '▸'}</span><span class="cn">${esc(c.name)}</span>${c.filling ? ' <span class="mute">· researching…</span>' : ''}<span class="why">${esc(c.why)}</span><span class="sum">${summary(c)}</span></th>`;
      const bandRow = band ? `<tr class="ev ${full ? 'full' : 'single'}"><th>${full ? `Evidence for ${esc(c.name)}${s.web ? `<button data-checkrow="${c.id}">Check this row</button>` : ''}` : ''}</th>${P.map(p => { const k = `${p.id}:${c.id}`;
        return `<td class="${p.state === 'chosen' ? 'chosen' : ''}">${full || ui.item === k ? card(p, c) : ''}</td>`; }).join('')}</tr>` : '';
      return g + `<tr class="crow ${c.state === 'irrelevant' ? 'irr' : ''} ${band ? 'banded' : ''}">${head}${P.map(p => td(p, c)).join('')}</tr>${bandRow}`; }).join('');
    const allOpen = rows.length && rows.every(c => ui.rows.has(c.id));
    el.innerHTML = `<div class="scroll"><table><thead><tr><th class="corner" data-all tabindex="0" aria-label="${allOpen ? 'Fold' : 'Unfold'} the evidence of every criterion"><span class="cnt">${P.length} shortlisted</span><small>${allOpen ? '▾ fold all evidence' : '▸ unfold all evidence'}</small></th>${P.map(p => `<th class="prod ${p.state === 'chosen' ? 'chosen' : ''} ${p.filling ? 'filling' : ''}"><span class="pn">${p.state === 'chosen' ? '✓ ' : ''}${esc(p.name)}</span>
      <div class="acts">${p.state === 'chosen' ? '<span class="chosen-l">Chosen</span><button data-un="' + p.id + '">Un-choose</button>' : `<button data-ch="${p.id}">Choose</button><button data-drop="${p.id}">Remove</button>`}</div></th>`).join('')}
      ${s.candidates ? `<th class="prod"><div class="more">Shortlist more to compare: ${s.candidates.map(esc).join(', ')} are candidates in the board.</div></th>` : ''}</tr></thead><tbody>${body}</tbody></table></div>`;

    const sc = el.querySelector('.scroll'); if (ui.scroll) [sc.scrollLeft, sc.scrollTop] = ui.scroll; sc.onscroll = () => ui.scroll = [sc.scrollLeft, sc.scrollTop];
    const find = k => { const [pid, cid] = k.split(':'); return [P.find(p => p.id === pid), s.criteria.find(c => c.id === cid)]; };
    const key = (e, f) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); f(); } };
    const refocus = sel => el.querySelector(sel)?.focus();
    el.querySelectorAll('[data-row]').forEach(h => { const id = h.dataset.row, tog = () => {
        if (ui.rows.has(id)) ui.rows.delete(id); else { ui.rows.add(id); if (ui.item && ui.item.endsWith(':' + id)) ui.item = null; }
        act.draw(); refocus(`[data-row="${id}"]`); };
      h.onclick = e => { if (!e.target.closest('button')) tog(); }; h.onkeydown = e => key(e, tog); });
    const all = el.querySelector('[data-all]'), togAll = () => { if (allOpen) ui.rows.clear(); else { rows.forEach(c => ui.rows.add(c.id)); ui.item = null; } act.draw(); refocus('[data-all]'); };
    all.onclick = togAll; all.onkeydown = e => key(e, togAll);
    el.querySelectorAll('td[data-cell]').forEach(t => { const k = t.dataset.cell, go = () => {
        if (ui.item === k && !ui.rows.size) ui.item = null;               // its card was the only one open: fold it
        else { ui.rows.clear(); ui.item = k; }                           // fold unfolded rows; only this card stays open
        act.draw(); refocus(`td[data-cell="${k}"]`); };
      t.onclick = go; t.onkeydown = e => { key(e, go); if (e.key === 'Escape' && ui.item) { ui.item = null; act.draw(); refocus(`td[data-cell="${k}"]`); } }; });
    el.querySelector('[data-fold]')?.addEventListener('click', () => { const k = ui.item; ui.item = null; act.draw(); refocus(`td[data-cell="${k}"]`); });
    el.querySelectorAll('[data-save]').forEach(b => { const k = b.dataset.save, inp = el.querySelector(`[data-in="${k}"]`), save = () => act.edit(...find(k), inp.value);
      b.onclick = save; inp.onkeydown = e => { if (e.key === 'Enter') save(); }; });
    el.querySelectorAll('[data-revert]').forEach(b => b.onclick = () => act.revert(...find(b.dataset.revert)));
    el.querySelectorAll('[data-check]').forEach(b => b.onclick = () => act.check(...find(b.dataset.check)));
    el.querySelectorAll('[data-checkrow]').forEach(b => b.onclick = e => { e.stopPropagation(); const c = s.criteria.find(q => q.id === b.dataset.checkrow);
      P.slice(1).forEach(p => { const x = cell(p, c); if (x.status !== 'filling') { x.prev = JSON.parse(JSON.stringify(x)); x.status = 'filling'; } }); act.check(P[0], c); });
    el.querySelectorAll('[data-ch]').forEach(b => b.onclick = () => act.choose(P.find(p => p.id === b.dataset.ch)));
    el.querySelectorAll('[data-un]').forEach(b => b.onclick = () => act.unchoose(P.find(p => p.id === b.dataset.un)));
    el.querySelectorAll('[data-drop]').forEach(b => b.onclick = () => { if (ui.item && ui.item.startsWith(b.dataset.drop + ':')) ui.item = null; act.drop(P.find(p => p.id === b.dataset.drop)); });
  };
})();
