/* choose-welcome wireframe kit: the frame around Welcome (prototype bar, header per RS-12/RS-20 with the
   four Choose spaces of CR-11), the scenario switcher, and helpers every proposal shares (status, board
   counts, pickers, direction limit, submit). Reads window.CHOOSE_WELCOME_DATA. Wireframe look only:
   black and white, system type, hairlines. */
(function () {
  const D = window.CHOOSE_WELCOME_DATA;
  const S = D.settings, C = D.copy;
  const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fill = (t, v = {}) => String(t)
    .replace(/\{currency\}/g, S.currencySymbol).replace(/\{country\}/g, S.country)
    .replace(/\{(\w+)\}/g, (m, k) => (k in v ? v[k] : m));

  const BASE_CSS = `
  :root { --fg: #fff; --bg: #000; --mute: rgba(255,255,255,.6); --faint: rgba(255,255,255,.35); --hair: rgba(255,255,255,.28); --fill: rgba(255,255,255,.07); color-scheme: dark; }
  * { box-sizing: border-box; }
  html, body { margin: 0; min-height: 100%; background: var(--bg); color: var(--fg); font: 14px/1.45 system-ui, 'Segoe UI', sans-serif; }
  body { display: flex; flex-direction: column; min-height: 100vh; }
  button, input, select, textarea { font: inherit; color: inherit; }
  button { background: var(--bg); border: 1px solid var(--hair); border-radius: 4px; padding: 4px 10px; cursor: pointer; }
  button:hover:not(:disabled) { border-color: var(--fg); }
  button:disabled { opacity: .4; cursor: default; }
  button.primary { background: var(--fg); color: var(--bg); border-color: var(--fg); font-weight: 600; border-radius: 999px; padding: 9px 20px; }
  button.primary:disabled { background: var(--bg); color: var(--faint); border-color: var(--hair); opacity: 1; }
  button.link { border: 0; padding: 0; background: none; text-decoration: underline; text-underline-offset: 3px; color: var(--mute); }
  button.link:hover:not(:disabled) { color: var(--fg); }
  :focus-visible { outline: 2px solid var(--fg); outline-offset: 2px; }
  select { background: var(--bg); border: 1px solid var(--hair); border-radius: 4px; padding: 3px 6px; }
  .mute { color: var(--mute); } .faint { color: var(--faint); }
  .mono { font-family: ui-monospace, 'Cascadia Mono', Consolas, monospace; }
  .proto { display: flex; flex-wrap: wrap; gap: 6px 14px; align-items: center; padding: 6px 14px; border-bottom: 1px dashed var(--hair); font: 11px ui-monospace, Consolas, monospace; color: var(--mute); }
  .proto b { color: var(--fg); font-weight: 600; }
  .proto select { font-size: 11px; padding: 1px 4px; }
  .head { flex: 0 0 48px; display: flex; align-items: center; gap: 12px; padding: 0 14px; border-bottom: 1px solid var(--hair); white-space: nowrap; overflow: hidden; }
  .head .mark { font-size: 18px; }
  .head .room { font-weight: 600; border: 1px solid var(--hair); border-radius: 999px; padding: 1px 10px; }
  .head nav { display: flex; gap: 4px; }
  .head nav button { padding: 2px 8px; }
  .head nav button[aria-current=page] { border-color: var(--fg); background: var(--fill); }
  .head .gear { margin-left: auto; }
  .space { flex: 1; position: relative; overflow: auto; }
  .st { display: inline-block; border: 1px solid var(--hair); border-radius: 999px; padding: 0 8px; font-size: 11px; line-height: 18px; white-space: nowrap; }
  .st[data-s='decided'] { border-color: var(--fg); }
  .st[data-s='bought'] { background: var(--fg); color: var(--bg); border-color: var(--fg); }
  .bar { display: flex; gap: 3px; } .bar i { flex: 1; height: 6px; border: 1px solid var(--hair); }
  .bar i.part { background: linear-gradient(90deg, var(--mute) var(--p), transparent var(--p)); }
  .bar i.full { background: var(--fg); border-color: var(--fg); }
  .bar-legend { display: flex; gap: 3px; font-size: 10px; color: var(--faint); } .bar-legend span { flex: 1; }
  .pickers { display: flex; flex-wrap: wrap; gap: 10px 14px; align-items: center; justify-content: center; font-size: 12px; color: var(--mute); }
  .tones { display: flex; flex-wrap: wrap; gap: 2px; }
  .tones button { border-radius: 999px; padding: 2px 9px; font-size: 12px; border-color: transparent; }
  .tones button[aria-pressed=true] { border-color: var(--fg); }
  .notice { border: 1px dashed var(--fg); padding: 8px 12px; font-size: 13px; }
  .notice button.link { color: var(--fg); }
  .counter { font-size: 11px; color: var(--faint); font-variant-numeric: tabular-nums; }
  .counter.over, .why.over { color: var(--fg); text-decoration: underline wavy; }
  .why { font-size: 12px; color: var(--mute); }
  .why:empty { display: none; }
  .toast { position: fixed; left: 50%; bottom: 18px; transform: translateX(-50%); max-width: calc(100vw - 32px); border: 1px solid var(--fg); background: var(--bg); padding: 8px 14px; font-size: 12px; z-index: 20; }
  .toast[hidden] { display: none; }
  .clamp2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  @media (prefers-reduced-motion: reduce) { * { transition: none !important; animation: none !important; } }
  `;

  function scenario() {
    const id = (location.hash.match(/s=(\w+)/) || [])[1];
    return D.scenarios.find((s) => s.id === id) || D.scenarios[0];
  }
  const byId = (id) => D.subjects.find((s) => s.id === id);

  /* Decision progress of a subject, as the board counts it (choose-board). */
  function board(s) {
    const ranked = s.criteria.must + s.criteria.nice + s.criteria.irrelevant;
    const crit = ranked + s.criteria.open;
    return [
      { key: 'needs', label: 'needs', done: s.needs.answered, of: s.needs.total },
      { key: 'criteria', label: 'criteria', done: ranked, of: crit },
      { key: 'shortlist', label: 'shortlist', done: Math.min(s.shortlisted, 2), of: 2 },
      { key: 'pick', label: 'pick', done: s.pick ? 1 : 0, of: 1 },
    ];
  }
  function boardBar(s, legend) {
    const segs = board(s).map((b) => {
      if (b.of && b.done >= b.of) return '<i class="full"></i>';
      if (b.done) return `<i class="part" style="--p:${Math.round((100 * b.done) / b.of)}%"></i>`;
      return '<i></i>';
    }).join('');
    const leg = legend ? `<div class="bar-legend">${board(s).map((b) => `<span>${b.label}</span>`).join('')}</div>` : '';
    return `<div class="bar" title="${esc(board(s).map((b) => `${b.label} ${b.done}/${b.of}`).join(' · '))}">${segs}</div>${leg}`;
  }
  function stats(s) {
    const st = [];
    if (s.needs.total) st.push(`${s.needs.answered}/${s.needs.total} needs`);
    const crit = s.criteria.must + s.criteria.nice + s.criteria.irrelevant + s.criteria.open;
    if (crit) st.push(`${crit} criteria`);
    if (s.shortlisted) st.push(`${s.shortlisted} shortlisted`);
    return st.join(' · ') || 'nothing settled yet';
  }
  const statusPill = (s) => `<span class="st" data-s="${s.status}">${s.status}</span>`;
  function outcome(s) {
    if (s.status === 'bought') return `Bought <b>${esc(s.pick)}</b>`;
    if (s.status === 'decided') return `Chose <b>${esc(s.pick)}</b> · not bought yet`;
    const n = s.missing.length;
    return n ? `${n} thing${n > 1 ? 's' : ''} missing before a decision` : 'Ready for a recommendation';
  }
  const opened = (s) => `<span title="${esc(s.lastOpenedExact)}">${esc(s.lastOpened)}</span>`;

  function pickers() {
    const tones = S.tones.map((t) => `<button type="button" aria-pressed="${t === S.defaultTone}" data-tone="${t}">${t}</button>`).join('');
    const models = S.models.map((m) => `<option value="${m.id}"${m.id === S.defaultModel ? ' selected' : ''}>${m.label}${m.id === S.defaultModel ? ' (default)' : ''}</option>`).join('');
    return `<div class="pickers"><div class="tones" role="group" aria-label="Tone">${tones}</div>
      <label>Model <select class="model">${models}<option value="other">Other id…</option></select></label></div>`;
  }

  /* Direction limits (WG-9) and the blank-subject rule (WG-10), shared by every proposal. */
  function check(subject, direction) {
    const sc = scenario();
    const n = direction.length, lim = C.directionLimit;
    const r = { ok: true, why: '', counter: '', over: false };
    if (n >= C.directionCounterFrom) r.counter = `${n} / ${lim}`;
    if (n > lim) { r.ok = false; r.over = true; r.why = fill(C.overLimit, { n: n - lim }); }
    else if (!subject.trim()) { r.ok = false; if (direction.trim()) r.why = C.blankSubject; }
    if (!sc.cli) r.ok = false;
    return r;
  }

  let toastTimer;
  function toast(msg) {
    const t = document.querySelector('.toast');
    t.innerHTML = msg; t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => (t.hidden = true), 3200);
  }
  function submit(subject, direction) {
    const r = check(subject, direction);
    if (!r.ok) return false;
    const tone = document.querySelector('.tones [aria-pressed=true]')?.dataset.tone || S.defaultTone;
    const model = document.querySelector('select.model')?.value || S.defaultModel;
    toast(`→ Survey: new subject <b>${esc(subject.trim().slice(0, C.titleLimit))}</b> · ${tone} · ${model}${direction.trim() ? ` · needs: “${esc(direction.trim().slice(0, 80))}${direction.trim().length > 80 ? '…' : ''}”` : ''}`);
    return true;
  }
  function open(id) {
    const s = byId(id);
    toast(`→ ${s.status === 'exploring' ? 'Survey' : 'Survey (board open on the pick)'}: <b>${esc(s.title)}</b>, last focus restored`);
  }

  function header(sc) {
    const none = !sc.subjects.length;
    const sp = [['⌂', 'Welcome', 1], ['⌘', 'Survey', 2], ['▥', 'Compare', 3], ['▦', 'Gallery', 4]];
    const nav = sp.map(([g, n, k], i) => `<button type="button" title="${n} (Ctrl+${k})" ${i === 0 ? 'aria-current="page"' : ''}${i > 0 && none ? ' disabled' : ''}>${g} ${n}</button>`).join('');
    return `<header class="head"><span class="mark" title="Welcome">◎</span><span class="room" title="Rooms (Ctrl+Shift+1, 2)">Choose ▾</span><nav aria-label="Spaces">${nav}</nav><button class="gear" title="Settings">⚙</button></header>`;
  }

  function mount(p) {
    document.head.insertAdjacentHTML('beforeend', `<style>${BASE_CSS}${p.css || ''}</style>`);
    document.body.innerHTML = `<div class="proto"><b>${esc(p.id)} · ${esc(p.title)}</b><label>State <select id="sc">${D.scenarios.map((s) => `<option value="${s.id}">${esc(s.label)}</option>`).join('')}</select></label><span>prototype bar · not part of the design</span></div><div id="frame"></div><div class="toast" hidden></div>`;
    const sel = document.getElementById('sc');
    function render() {
      const sc = scenario();
      sel.value = sc.id;
      S.useWeb = sc.useWeb !== false;
      const ctx = {
        sc, subjects: sc.subjects.map(byId), first: sc.library && !sc.total,
        locale: fill(S.useWeb ? C.locale : C.localeOffline, { currency: S.currency }),
      };
      document.getElementById('frame').innerHTML = header(sc) + `<main class="space">${p.render(ctx)}</main>`;
      document.querySelectorAll('.tones button').forEach((b) => b.addEventListener('click', () => {
        document.querySelectorAll('.tones button').forEach((x) => x.setAttribute('aria-pressed', x === b));
      }));
      document.querySelectorAll('[data-open]').forEach((el) => el.addEventListener('click', (e) => { e.stopPropagation(); open(el.dataset.open); }));
      document.querySelectorAll('[data-browse]').forEach((el) => el.addEventListener('click', () => toast('→ Gallery (Ctrl+4): every Choose subject with its status')));
      document.querySelectorAll('[data-settings]').forEach((el) => el.addEventListener('click', () => toast(`→ Settings → ${esc(el.dataset.settings)}`)));
      p.wire && p.wire(ctx);
    }
    sel.addEventListener('change', () => { location.hash = 's=' + sel.value; });
    addEventListener('hashchange', render);
    render();
  }

  window.WELCOME_KIT = { D, S, C, esc, fill, mount, board, boardBar, stats, statusPill, outcome, opened, pickers, check, submit, toast };
})();
