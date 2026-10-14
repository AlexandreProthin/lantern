/* Shared kit for the choose-gallery wireframes: the subject model (CR-25 stats, what is missing, sorting, filtering,
   relative dates), the Choose frame (header, scenario switcher), and the flows every proposal shares (open, rename,
   delete with its confirm dialog, keyboard, empty state). Only the gallery's mechanism differs per proposal.
   GALLERY_KIT.mount({ id, title, css, defaults, render }) — render(el, ctx) draws everything under the header. */
(() => {
  const D = window.CHOOSE_GALLERY_DATA;
  const NOW = Date.parse(D.meta.now);
  const DAY = 864e5;
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const clone = o => JSON.parse(JSON.stringify(o));
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const STATUSES = ['exploring', 'decided', 'bought'];

  const fmt = {
    date(iso) { const d = new Date(iso); return `${d.getUTCDate()} ${MON[d.getUTCMonth()]}${d.getUTCFullYear() !== new Date(NOW).getUTCFullYear() ? ' ' + d.getUTCFullYear() : ''}`; },
    time(iso) { const d = new Date(iso); return `${fmt.date(iso)}, ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`; },
    rel(iso) {
      const t = Date.parse(iso), today = Math.floor(NOW / DAY), day = Math.floor(t / DAY), n = today - day;
      return n <= 0 ? 'today' : n === 1 ? 'yesterday' : n < 7 ? `${n} days ago` : fmt.date(iso);
    },
    hours(iso) { const h = Math.round((NOW - Date.parse(iso)) / 36e5); return h < 1 ? 'just now' : h < 24 ? `${h} h ago` : fmt.rel(iso); },
    k(n) { return n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'k' : String(n); }
  };

  const model = {
    stats(s) {
      const c = s.criteria, p = s.products;
      return { needs: s.needs.total, answered: s.needs.answered, criteria: c.must + c.nice + c.open + c.irrelevant,
        must: c.must, nice: c.nice, open: c.open, irrelevant: c.irrelevant,
        shortlisted: p.shortlisted + (s.chosen ? 1 : 0), candidates: p.candidate, rejected: p.rejected };
    },
    // CR-25, through statsSummary
    summary(s) { const t = model.stats(s); return `${t.needs} need${t.needs === 1 ? '' : 's'} · ${t.criteria} criteri${t.criteria === 1 ? 'on' : 'a'} · ${t.shortlisted} shortlisted`; },
    // the board's completeness rule (CR-61), as a list
    missing(s) {
      if (s.status !== 'exploring') return [];
      const t = model.stats(s), m = [];
      if (!t.needs) m.push('Tell the room what you need');
      for (let i = 0; i < t.needs - t.answered; i++) m.push('An open need');
      if (!t.must) m.push(t.criteria ? 'No must criterion' : 'No criteria yet');
      for (let i = 0; i < t.open; i++) m.push('A criterion to rank');
      if (t.shortlisted < 2) m.push(t.shortlisted ? 'Shortlist one more' : 'Nothing shortlisted');
      if (s.compareGaps) m.push(`${s.compareGaps} empty Compare cell${s.compareGaps > 1 ? 's' : ''}`);
      return m;
    },
    ready: s => s.status === 'exploring' && model.missing(s).length === 0,
    // a decided subject whose product was later un-chosen: the last history entry says so
    unchosen(s) { const h = s.history[s.history.length - 1]; return h && h.unchosen ? h : null; },
    since(s) { return s.history[s.history.length - 1].at; },
    decidedAt: s => [...s.history].reverse().find(h => h.status === 'decided')?.at,
    boughtAt: s => [...s.history].reverse().find(h => h.status === 'bought')?.at,
    // settled share, for sorting by "closest to a decision"
    nearness(s) { if (s.status !== 'exploring') return 2 + STATUSES.indexOf(s.status); return 1 / (1 + model.missing(s).length); }
  };

  const SORTS = {
    lastOpened: { label: 'Last opened', key: s => -Date.parse(s.lastOpened) },
    created: { label: 'Created', key: s => -Date.parse(s.createdAt) },
    status: { label: 'Status', key: s => STATUSES.indexOf(s.status) * 1e13 - Date.parse(s.lastOpened) / 1e3 },
    nearest: { label: 'Closest to a decision', key: s => -model.nearness(s) },
    title: { label: 'Name', key: s => s.title.toLowerCase() }
  };

  /* A static board thumbnail (B/W): the subject on the left, then three columns — needs (filled = answered), criteria
     (solid = must, ring = nice, dotted = to rank, faint = irrelevant), products (ring = shortlisted, dotted = candidate,
     crossed = rejected, big solid = chosen). Columns cap at 8 with a +n. */
  function thumb(s, w = 160, h = 72) {
    const t = model.stats(s), cols = [], cap = 8;
    cols.push([...Array(t.answered).fill('fill'), ...Array(t.needs - t.answered).fill('open')]);
    cols.push([...Array(t.must).fill('fill'), ...Array(t.nice).fill('ring'), ...Array(t.open).fill('open'), ...Array(t.irrelevant).fill('faint')]);
    cols.push([...(s.chosen ? ['chosen'] : []), ...Array(s.products.shortlisted).fill('ring'), ...Array(t.candidates).fill('open'), ...Array(t.rejected).fill('x')]);
    const rx = 12, ry = h / 2, xs = [w * .38, w * .62, w * .86];
    let g = '';
    cols.forEach((col, ci) => {
      const shown = col.slice(0, cap), n = shown.length, gap = Math.min(9, (h - 12) / Math.max(1, n));
      shown.forEach((k, i) => {
        const x = xs[ci], y = ry + (i - (n - 1) / 2) * gap, r = k === 'chosen' ? 4.6 : 2.6;
        g += `<line x1="${rx + 5}" y1="${ry}" x2="${x}" y2="${y}" stroke="currentColor" stroke-opacity=".18" stroke-width=".7"/>`;
        if (k === 'fill' || k === 'chosen') g += `<circle cx="${x}" cy="${y}" r="${r}" fill="currentColor"/>`;
        else if (k === 'ring') g += `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="currentColor" stroke-width="1.1"/>`;
        else if (k === 'open') g += `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="currentColor" stroke-width=".9" stroke-dasharray="1.2 1.2"/>`;
        else if (k === 'faint') g += `<circle cx="${x}" cy="${y}" r="${r}" fill="currentColor" fill-opacity=".25"/>`;
        else g += `<path d="M${x - 2.4} ${y - 2.4}l4.8 4.8M${x + 2.4} ${y - 2.4}l-4.8 4.8" stroke="currentColor" stroke-opacity=".5" stroke-width="1"/>`;
      });
      if (col.length > cap) g += `<text x="${xs[ci] + 6}" y="${h - 3}" font-size="8" fill="currentColor" fill-opacity=".6">+${col.length - cap}</text>`;
      if (!col.length) g += `<line x1="${xs[ci] - 3}" y1="${ry}" x2="${xs[ci] + 3}" y2="${ry}" stroke="currentColor" stroke-opacity=".3"/>`;
    });
    g += `<circle cx="${rx}" cy="${ry}" r="5.5" fill="none" stroke="currentColor" stroke-width="1.4"/>`;
    return `<svg class="thumb" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true">${g}</svg>`;
  }

  const CSS = `
  :root { --fg: #fff; --bg: #000; --mute: rgba(255,255,255,.62); --faint: rgba(255,255,255,.36); --hair: rgba(255,255,255,.28); --fill: rgba(255,255,255,.07); }
  * { box-sizing: border-box; }
  html, body { margin: 0; height: 100%; overflow: hidden; background: var(--bg); color: var(--fg); font: 13px/1.4 system-ui, 'Segoe UI', sans-serif; }
  button, input, select { font: inherit; color: inherit; }
  button, select { background: var(--bg); border: 1px solid var(--hair); border-radius: 4px; padding: 4px 9px; cursor: pointer; }
  button:hover, select:hover { border-color: var(--fg); } button.on { background: var(--fg); color: var(--bg); border-color: var(--fg); }
  button:disabled { opacity: .4; cursor: default; }
  button:focus-visible, input:focus-visible, select:focus-visible, [tabindex]:focus-visible { outline: 2px solid var(--fg); outline-offset: 2px; }
  input[type=search], input.rn { background: var(--bg); border: 1px solid var(--hair); border-radius: 4px; padding: 4px 8px; }
  input.rn[aria-invalid=true] { border-color: var(--fg); border-style: dashed; }
  .mute { color: var(--mute); } .faint { color: var(--faint); } .num { font-variant-numeric: tabular-nums; }
  .ell { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
  .app { position: fixed; inset: 0; display: grid; grid-template-rows: 48px 1fr; }
  .head { display: flex; align-items: center; gap: 12px; padding: 0 14px; border-bottom: 1px solid var(--hair); white-space: nowrap; overflow: hidden; }
  .head .room { font-weight: 600; border: 1px solid var(--hair); border-radius: 999px; padding: 2px 10px; } .head nav { display: flex; gap: 4px; }
  .head nav span { border: 1px solid var(--hair); border-radius: 4px; padding: 2px 8px; } .head nav span.cur { border-color: var(--fg); background: var(--fill); }
  .head nav span.off { opacity: .35; } .head .sp { flex: 1; }
  .body { min-height: 0; position: relative; overflow: hidden; }
  .st { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; border: 1px solid var(--hair); border-radius: 999px; padding: 0 7px; white-space: nowrap; line-height: 18px; }
  .st::before { content: ''; width: 7px; height: 7px; border-radius: 50%; border: 1px dashed var(--fg); }
  .st[data-s=decided]::before { border: 1.5px solid var(--fg); } .st[data-s=bought]::before { background: var(--fg); border-color: var(--fg); }
  .st[data-s=bought] { border-color: var(--fg); }
  .thumb { display: block; color: var(--fg); max-width: 100%; height: auto; }
  .empty { height: 100%; display: grid; place-content: center; text-align: center; gap: 10px; color: var(--mute); }
  .empty b { color: var(--fg); font-size: 16px; font-weight: 600; } .empty .lead { max-width: 380px; }
  .nomatch { padding: 40px 0; text-align: center; color: var(--mute); } .nomatch a { color: var(--fg); cursor: pointer; text-decoration: underline; }
  .proto { position: fixed; left: 50%; bottom: 10px; transform: translateX(-50%); z-index: 50; display: flex; gap: 4px; flex-wrap: wrap; justify-content: center;
    padding: 4px; border: 1px dashed var(--hair); border-radius: 999px; background: var(--bg); max-width: calc(100vw - 24px); font-size: 12px; }
  .proto button { border-radius: 999px; padding: 2px 10px; }
  .tag { position: fixed; right: 10px; bottom: 10px; z-index: 49; font-size: 11px; color: var(--faint); }
  .toast { position: fixed; left: 50%; top: 60px; transform: translateX(-50%); z-index: 70; background: var(--bg); border: 1px solid var(--fg); padding: 8px 14px; border-radius: 4px; max-width: calc(100vw - 32px); }
  .scrim { position: fixed; inset: 0; z-index: 60; background: rgba(0,0,0,.7); display: grid; place-items: center; padding: 16px; }
  .dlg { background: var(--bg); border: 1px solid var(--fg); padding: 18px 20px; max-width: 440px; width: 100%; display: grid; gap: 10px; }
  .dlg h2 { margin: 0; font-size: 15px; overflow-wrap: anywhere; } .dlg p { margin: 0; color: var(--mute); } .dlg .row { display: flex; justify-content: flex-end; gap: 8px; margin-top: 6px; }
  @media (max-width: 640px) { .head nav span:not(.cur) { display: none; } }`;

  function mount(P) {
    const st = Object.assign({ scenario: 'typical', sort: 'lastOpened', dir: 1, status: 'all', q: '', sel: null, renaming: null, confirm: null, toast: '' }, P.defaults || {});
    const pool = clone(D.subjects);
    let subjects = [];
    const loadScenario = id => { const ids = D.scenarios.find(x => x.id === id).ids; subjects = pool.filter(s => ids.includes(s.id)); };
    loadScenario(st.scenario);

    document.title = `Choose gallery ${P.id} — ${P.title}`;
    const style = document.createElement('style'); style.textContent = CSS + (P.css || ''); document.head.appendChild(style);
    document.body.innerHTML = `<div class="app"><header class="head"></header><main class="body"></main></div><div class="proto"></div><div class="tag">${esc(P.id)} · ${esc(P.title)}</div><div id="ov"></div>`;
    const head = document.querySelector('.head'), body = document.querySelector('.body'), proto = document.querySelector('.proto'), ov = document.getElementById('ov');
    let toastT;

    const byText = s => !st.q || s.title.toLowerCase().includes(st.q.toLowerCase());
    function sorted(list, sortKey = st.sort, dir = st.dir) {
      const k = SORTS[sortKey].key;
      return [...list].sort((a, b) => { const x = k(a), y = k(b); return (x < y ? -1 : x > y ? 1 : a.title.localeCompare(b.title)) * dir; });
    }
    function ctx() {
      const matching = subjects.filter(byText);
      const counts = { all: matching.length }; STATUSES.forEach(k => counts[k] = matching.filter(s => s.status === k).length);
      const list = sorted(matching.filter(s => st.status === 'all' || s.status === st.status));
      const groups = STATUSES.map(k => ({ status: k, items: sorted(matching.filter(s => s.status === k)), total: subjects.filter(s => s.status === k).length }));
      return { st, set, subjects, list, groups, counts, total: subjects.length, sorted, model, fmt, esc, thumb, SORTS, STATUSES, act,
        sel: subjects.find(s => s.id === st.sel) || null,
        title: (s, cls = '') => st.renaming === s.id
          ? `<input class="rn ${cls}" data-k="rename" data-rename="${s.id}" value="${esc(s.title)}" maxlength="120" aria-label="New name">`
          : `<span class="ttl ${cls}" title="${esc(s.title)}">${esc(s.title)}</span>`,
        statusChip: s => `<span class="st" data-s="${s.status}">${s.status}</span>`,
        noMatch() {
          const what = st.q ? `No subject matches "${esc(st.q)}"${st.status !== 'all' ? ` in ${st.status}` : ''}` : `No ${st.status} subject yet`;
          return `<div class="nomatch">${what}. <a data-clear>${st.q ? 'Clear filter' : 'Show all'}</a></div>`;
        } };
    }

    function set(patch) { Object.assign(st, patch); draw(); }
    function toast(msg) { st.toast = msg; drawOverlay(); clearTimeout(toastT); toastT = setTimeout(() => { st.toast = ''; drawOverlay(); }, 2200); }
    const act = {
      open(id) { const s = subjects.find(x => x.id === id); if (!s) return; s.lastOpened = D.meta.now; toast(`Opens “${s.title}” in Survey, last focus restored.`); draw(); },
      startRename(id) { set({ sel: id, renaming: id }); const i = body.querySelector('[data-rename]'); i?.focus(); i?.select(); },
      rename(id, v) { const s = subjects.find(x => x.id === id), t = v.trim(); if (!t) return false; s.title = t.slice(0, 120); set({ renaming: null }); return true; },
      askDelete(id) { set({ sel: id, confirm: id }); },
      remove(id) { subjects = subjects.filter(s => s.id !== id); const i = pool.findIndex(s => s.id === id); if (i >= 0) pool.splice(i, 1); set({ confirm: null, sel: null }); },
      reveal(id) { const s = subjects.find(x => x.id === id); toast(`Shows “${s.title}”'s file in Explorer.`); },
      // prototype only: the board's Un-choose on a decided subject, to watch it move
      unchoose() {
        const s = subjects.find(x => x.status === 'decided'); if (!s) return toast('No decided subject in this scenario.');
        const name = s.chosen.name; s.chosen = null; s.status = 'exploring'; s.products.shortlisted++;
        s.history.push({ status: 'exploring', at: D.meta.now, product: name, unchosen: true });
        set({ sel: s.id }); toast(`“${s.title}”: ${name} un-chosen on the board; the subject is exploring again.`);
      }
    };

    function drawHead() {
      head.innerHTML = `<span class="room">Choose</span><nav><span>Welcome</span><span class="${subjects.length ? '' : 'off'}">Survey</span><span class="cur">Gallery</span></nav><span class="sp"></span><span class="faint">Ctrl+3</span>`;
    }
    function drawProto() {
      proto.innerHTML = D.scenarios.map(x => `<button class="${x.id === st.scenario ? 'on' : ''}" data-scn="${x.id}">${esc(x.label)}</button>`).join('') +
        `<button data-unchoose title="Simulate Un-choose on the board">Un-choose one</button>`;
    }
    function drawOverlay() {
      let h = st.toast ? `<div class="toast" role="status">${esc(st.toast)}</div>` : '';
      const s = subjects.find(x => x.id === st.confirm);
      if (s) {
        const t = model.stats(s);
        h += `<div class="scrim"><div class="dlg" role="alertdialog" aria-modal="true" aria-labelledby="dlgT">
          <h2 id="dlgT">Delete “${esc(s.title)}”?</h2>
          <p>${s.nodes} nodes · ${model.summary(s)}${s.chosen ? ` · chose ${esc(s.chosen.name)}` : ''}, ${fmt.k(s.tokens.in + s.tokens.out)} tokens of history. The file goes to the Recycle Bin.</p>
          ${s.running ? '<p><b>A generation is running and will be cancelled.</b></p>' : ''}
          <div class="row"><button data-cancel>Cancel</button><button data-confirm>Delete</button></div></div></div>`;
      }
      ov.innerHTML = h;
      if (s) ov.querySelector('[data-cancel]').focus();
    }
    function draw() {
      const a = document.activeElement, k = a?.dataset?.k, sel = k && a.selectionStart != null ? [a.selectionStart, a.selectionEnd] : null;
      const scroll = [...body.querySelectorAll('[data-scroll]')].map(e => [e.dataset.scroll, e.scrollTop]);
      drawHead(); drawProto();
      if (!subjects.length) {
        body.innerHTML = `<div class="empty"><b>No choices yet</b><span class="lead">Every product you choose with the room lands here, with how far along it is: exploring, decided or bought.</span><div><button data-welcome>Start one</button></div></div>`;
      } else P.render(body, ctx());
      scroll.forEach(([n, t]) => { const e = body.querySelector(`[data-scroll="${n}"]`); if (e) e.scrollTop = t; });
      if (k) { const e = body.querySelector(`[data-k="${k}"]`); if (e) { e.focus(); if (sel && e.setSelectionRange) e.setSelectionRange(...sel); } }
      else if (st.sel && !st.confirm && document.activeElement === document.body) body.querySelector(`[data-id="${st.sel}"]`)?.focus({ preventScroll: true });
      drawOverlay();
    }

    let qT;
    document.addEventListener('input', e => {
      if (e.target.dataset.k === 'q') { clearTimeout(qT); const v = e.target.value; qT = setTimeout(() => set({ q: v, sel: null }), 150); }
    });
    document.addEventListener('change', e => {
      const t = e.target;
      if (t.dataset.sortsel != null) set({ sort: t.value });
      if (t.dataset.statussel != null) set({ status: t.value, sel: null });
    });
    document.addEventListener('click', e => {
      const t = e.target, c = sel => t.closest(sel);
      if (c('[data-scn]')) { loadScenario(c('[data-scn]').dataset.scn); return set({ scenario: c('[data-scn]').dataset.scn, sel: null, q: '', status: 'all', renaming: null }); }
      if (c('[data-unchoose]')) return act.unchoose();
      if (c('[data-welcome]')) return toast('Goes to Welcome: What do you want to choose?');
      if (c('[data-cancel]') || (t.classList.contains('scrim'))) { set({ confirm: null }); return; }
      if (c('[data-confirm]')) return act.remove(st.confirm);
      if (c('[data-clear]')) return set({ q: '', status: 'all' });
      if (c('[data-status]')) return set({ status: c('[data-status]').dataset.status, sel: null });
      if (c('[data-sort]')) { const k = c('[data-sort]').dataset.sort; return set(k === st.sort ? { dir: -st.dir } : { sort: k, dir: 1 }); }
      if (c('[data-dir]')) return set({ dir: -st.dir });
      if (c('[data-open]')) return act.open(c('[data-open]').dataset.open);
      if (c('[data-rn]')) return act.startRename(c('[data-rn]').dataset.rn);
      if (c('[data-del]')) return act.askDelete(c('[data-del]').dataset.del);
      if (c('[data-reveal]')) return act.reveal(c('[data-reveal]').dataset.reveal);
      if (c('[data-rename]') || c('input, select, button, .keep, .proto')) return;
      const card = c('[data-id]');
      if (card) { if (st.sel !== card.dataset.id) set({ sel: card.dataset.id, renaming: null }); }
      else if (c('.body') && st.sel) set({ sel: null, renaming: null });
    });
    document.addEventListener('dblclick', e => { const card = e.target.closest('[data-id]'); if (card && !e.target.closest('input, button')) act.open(card.dataset.id); });
    document.addEventListener('focusout', e => {
      const i = e.target; if (!i.dataset?.rename || st.renaming !== i.dataset.rename) return;
      setTimeout(() => { if (st.renaming === i.dataset.rename && !act.rename(i.dataset.rename, i.value)) set({ renaming: null }); }, 0);
    });
    document.addEventListener('keydown', e => {
      const t = e.target;
      if (st.confirm) { if (e.key === 'Escape') set({ confirm: null }); return; }
      if (t.dataset?.rename) {
        if (e.key === 'Enter') { if (!act.rename(t.dataset.rename, t.value)) t.setAttribute('aria-invalid', 'true'); e.preventDefault(); }
        if (e.key === 'Escape') { set({ renaming: null }); }
        return;
      }
      if (t.dataset?.k === 'q') { if (e.key === 'Escape') { t.value = ''; set({ q: '' }); } return; }
      if (t.matches('input, select, textarea')) return;
      const cards = [...body.querySelectorAll('[data-id]')].filter(x => x.offsetParent);
      const cur = cards.find(x => x.dataset.id === st.sel);
      if (e.key === 'Enter' && cur) { e.preventDefault(); return act.open(st.sel); }
      if (e.key === 'F2' && cur) { e.preventDefault(); return act.startRename(st.sel); }
      if (e.key === 'Delete' && cur) { e.preventDefault(); return act.askDelete(st.sel); }
      if (e.key === 'Escape' && st.sel) return set({ sel: null });
      const nav = { ArrowLeft: 'l', ArrowRight: 'r', ArrowUp: 'u', ArrowDown: 'd', Home: 'h', End: 'e' }[e.key];
      if (!nav || !cards.length || t.closest('.proto')) return;
      e.preventDefault();
      let next;
      if (!cur || nav === 'h') next = cards[0];
      else if (nav === 'e') next = cards[cards.length - 1];
      else if (nav === 'l' || nav === 'r') { const i = cards.indexOf(cur); next = cards[Math.max(0, Math.min(cards.length - 1, i + (nav === 'r' ? 1 : -1)))]; }
      else { // nearest card in that vertical direction, by geometry, so the same keys work in lanes, grids and lists
        const r = cur.getBoundingClientRect(), cx = r.left + r.width / 2, dn = nav === 'd';
        next = cards.filter(x => { const q = x.getBoundingClientRect(); return dn ? q.top >= r.bottom - 2 : q.bottom <= r.top + 2; })
          .sort((a, b) => { const A = a.getBoundingClientRect(), B = b.getBoundingClientRect(), d = q => Math.abs((dn ? q.top - r.bottom : r.top - q.bottom)) * 3 + Math.abs(q.left + q.width / 2 - cx); return d(A) - d(B); })[0] || cur;
      }
      st.sel = next.dataset.id; draw(); body.querySelector(`[data-id="${st.sel}"]`)?.focus(); body.querySelector(`[data-id="${st.sel}"]`)?.scrollIntoView({ block: 'nearest' });
    });
    draw();
  }

  window.GALLERY_KIT = { mount, model, fmt, thumb, esc, SORTS, STATUSES };
})();
