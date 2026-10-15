/* The counter rail's structure, frozen from r001-01 (wireframe, accepted in revision 3) for the form rounds.
   Markup and behaviour only; every form proposal styles it with its own CSS. Do not change per proposal. */
window.RAIL_RENDER = function (el, { s, expanded, setExpanded, act, esc, counts: c, missing, stage }) {
    const by = a => missing.filter(m => m.area === a || (a === 'shortlist' && m.area === 'compare'));
    const tip = a => by(a).length ? `<div class="tip">${by(a).map(m => esc(m.text)).join('<br>')}</div>` : '';
    const ready = stage === 'ready';
    if (!expanded) {
      el.innerHTML = `<div class="rail" role="button" tabindex="0" aria-label="Open the decision board">
        <div class="ttl">BOARD</div><div><span class="st" data-s="${stage === 'open' ? 'exploring' : stage}">${stage === 'open' ? 'exploring' : stage}</span></div>
        <div class="ctr ${by('needs').length ? 'miss' : ''}"><b>${c.needsAnswered}<span class="faint">/${c.needs}</span></b><small>needs</small>${tip('needs')}</div>
        <div class="ctr ${by('criteria').length ? 'miss' : ''}"><b>${c.must}</b><small>must · ${c.nice} nice</small>${tip('criteria')}</div>
        <div class="ctr ${by('shortlist').length ? 'miss' : ''}"><b>${c.shortlisted}</b><small>shortlist</small>${tip('shortlist')}</div>
        <div class="ctr"><b>${c.chosen ? '✓' : '—'}</b><small>${c.chosen ? esc(c.chosen.name) : 'pick'}</small></div>
        <div class="gap"></div>
        <div class="miss-n">${missing.length ? missing.length + ' missing' : (c.chosen ? s.status : 'complete')}</div>
        ${s.status === 'exploring' ? `<button class="rec ${ready ? 'on' : ''}" data-rec>${ready ? 'Recommend ›' : 'Recommend'}</button>` : ''}</div>`;
      const rail = el.querySelector('.rail');
      rail.onclick = e => { if (e.target.closest('[data-rec]')) return; setExpanded(true); };
      rail.onkeydown = e => { if (e.key === 'Enter') setExpanded(true); };
      el.querySelector('[data-rec]')?.addEventListener('click', () => act.recommend());
      return;
    }
    const groups = [['must', 'Must'], ['nice', 'Nice to have'], ['open', 'To rank'], ['irrelevant', 'Irrelevant']];
    const prods = s.products.filter(p => p.state !== 'rejected'), rejected = s.products.filter(p => p.state === 'rejected');
    el.innerHTML = `<div class="sheet">
      <div class="top"><h2>Decision board</h2><span class="st" data-s="${stage === 'open' ? 'exploring' : stage}">${stage === 'open' ? 'exploring' : stage}</span><span class="sp"></span>
        ${s.status === 'exploring' ? `<button data-rec class="${ready ? 'on' : ''}">${ready ? 'Ready: get the recommendation' : `Recommend now (${missing.length} missing)`}</button>` : ''}
        <button data-close>Back to graph ✕</button></div>
      <div class="missing ${missing.length ? '' : 'none'}">${missing.length ? '<b>Still missing:</b> ' + missing.map(m => `<span>${esc(m.text)}</span>`).join('') + (s.compareGaps ? '<button data-fill>Fill Compare</button>' : '') : 'Nothing missing.'}</div>
      <div class="cols">
        <section class="card"><h3>Needs <span>${c.needsAnswered}/${c.needs}</span></h3>
          ${s.needs.length ? '' : '<p class="mute">No needs yet. The room asks as they become meaningful; you can also add one.</p>'}
          ${s.needs.map((n, i) => `<div class="need ${n.answer ? '' : 'open'}"><span class="q">${esc(n.q)}</span><input class="edit" data-n="${i}" value="${esc(n.answer || '')}" placeholder="your answer"><button class="x" data-del="${i}" title="Remove">✕</button></div>`).join('')}
          <div class="add"><input class="edit" data-add placeholder="Add a need or constraint…"><button data-addb>Add</button></div></section>
        <section class="card"><h3>Criteria <span>${c.criteria}</span></h3>
          ${s.criteria.length ? '' : '<p class="mute">No criteria yet: they appear as you explore.</p>'}
          ${groups.map(([g, l]) => { const ks = s.criteria.filter(k => k.state === g); return ks.length ? `<div class="grp ${g === 'irrelevant' ? 'irr' : ''}"><h4>${l}</h4>${ks.map(k => `<div class="crit"><span>${esc(k.name)}<span class="why">${esc(k.why)}</span></span>
            <span class="seg">${['must', 'nice', 'irrelevant'].map(x => `<button class="${k.state === x ? 'on' : ''}" data-k="${s.criteria.indexOf(k)}" data-v="${x}">${x === 'irrelevant' ? 'irr.' : x}</button>`).join('')}</span></div>`).join('')}</div>` : ''; }).join('')}</section>
      </div>
      <section class="card short"><h3>Shortlist and pick <span>${c.shortlisted} shortlisted · ${c.candidates} candidate${c.candidates === 1 ? '' : 's'}</span></h3>
        ${prods.length ? '' : '<p class="mute">No products yet. They come from the graph (families, products) and from research.</p>'}
        <div class="prods">${prods.map(p => { const i = s.products.indexOf(p); return `<div class="prod ${p.state}"><b>${esc(p.name)}</b><span class="mute">${esc(p.fact)}</span><span class="faint">${p.state}</span><div class="acts">
          ${p.state === 'candidate' ? `<button data-p="${i}" data-v="shortlisted">Shortlist</button><button data-p="${i}" data-v="rejected">Reject</button>` : ''}
          ${p.state === 'shortlisted' ? `<button data-p="${i}" data-v="chosen">Choose</button><button data-p="${i}" data-v="rejected">Reject</button>` : ''}
          ${p.state === 'chosen' && s.status !== 'bought' ? `<button class="on" data-bought>Mark as bought</button><button data-p="${i}" data-v="shortlisted">Un-choose</button>` : ''}
          ${p.state === 'chosen' && s.status === 'bought' ? '<b>Bought ✓</b>' : ''}</div></div>`; }).join('')}</div>
        ${rejected.length ? `<div class="rej">Rejected: ${rejected.map(p => `${esc(p.name)} (${esc(p.reason)})`).join(', ')}</div>` : ''}
        ${s.recommendation && s.status !== 'exploring' ? `<p class="mute" style="margin-top:12px">Recommendation: ${esc(s.recommendation)}</p>` : ''}</section>
    </div>`;
    el.querySelector('[data-close]').onclick = () => setExpanded(false);
    el.querySelectorAll('[data-rec]').forEach(b => b.onclick = () => act.recommend());
    el.querySelector('[data-fill]')?.addEventListener('click', () => act.fillCompare());
    el.querySelectorAll('[data-n]').forEach(i => i.onchange = () => act.answer(s.needs[+i.dataset.n], i.value));
    el.querySelectorAll('[data-del]').forEach(b => b.onclick = () => act.removeNeed(s.needs[+b.dataset.del]));
    const add = el.querySelector('[data-add]'); el.querySelector('[data-addb]').onclick = () => act.addNeed(add.value);
    add.onkeydown = e => { if (e.key === 'Enter') act.addNeed(add.value); };
    el.querySelectorAll('[data-k]').forEach(b => b.onclick = () => act.rank(s.criteria[+b.dataset.k], b.dataset.v));
    el.querySelectorAll('[data-p]').forEach(b => b.onclick = () => act.product(s.products[+b.dataset.p], b.dataset.v));
    el.querySelector('[data-bought]')?.addEventListener('click', () => act.bought());
  };
