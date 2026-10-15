/* Frozen base for the colour round (request revision 3) and after: everything except where the light falls.
   - Structure: r001-01 (Learn's threshold: question field, capsule, tone + model, locale line, a shelf of three
     cards, Browse all n), with r001-02's direction and need starters opened by Shift+Enter inside the capsule.
   - Form: Learn's Welcome as shipped (agent_design/welcome-context/RECIPE.md, "Form"): rest = 38 px Display 350
     centred on its underline; capsule = radius 32, padding 4/6/4/28, subject 22 px, button docked at the right;
     two-part card = radius 24, padding 8/8/8/24, hairline, direction 15 px, tail with counter and button. The
     example line moves left under the subject in the capsule. The recent cards are choose-gallery's resting card
     (status band, one-line title, steps bar, pick line, CR-25 stats) with Learn's Continue link.
   - Type: Learn's Welcome type (Segoe UI Variable Display / Text / Small, sentence case), which is also
     choose-board's and choose-gallery's final type.
   - Tokens: the accepted Choose palette (CR-70), plus choose-board's helpers. The gallery's card colours
     (r003-01, final) are part of the base so Welcome and Gallery cards are one family.
   Every colour below is a token or a mix of tokens; each proposal adds only where the accent and light go. */
(() => {
  const K = window.WELCOME_KIT, { C, D, S, esc, fill } = K;

  const css = `
  :root {
    --bg: #101827; --surface: #172132; --surface-2: #1f3034; --ink: #f3e9dc; --ink-mute: #aeb3bf; --line: #3b4558;
    --accent: #5cc6bd; --accent-ink: #0d211f; --focus: #b6efe6; --node-open: #969ca7; --node-lit: #c8f3ea; --node-understood: #5cc6bd;
    --glow-near: rgba(118,222,206,.32); --glow-far: rgba(84,204,188,.15); --path-muted: #3e625d; --code: #0c1320; --error: #d86a5a; --error-ink: #f0a598;
    --glass: color-mix(in srgb, var(--surface) 55%, transparent); --glass-line: color-mix(in srgb, var(--ink-mute) 16%, transparent);
    --glass-blur: blur(20px) saturate(135%); --ink-faint: color-mix(in srgb, var(--ink-mute) 62%, var(--bg));
    --line-strong: color-mix(in srgb, var(--line) 65%, var(--ink-mute));
    --fg: var(--ink); --mute: var(--ink-mute); --faint: var(--ink-faint); --hair: var(--glass-line); --fill: color-mix(in srgb, var(--ink) 6%, transparent);
    --font-text: 'Segoe UI Variable Text', 'Segoe UI', system-ui, sans-serif;
    --font-display: 'Segoe UI Variable Display', 'Segoe UI', system-ui, sans-serif;
    --font-small: 'Segoe UI Variable Small', 'Segoe UI', system-ui, sans-serif;
    color-scheme: dark; }
  html, body { background: var(--bg); color: var(--ink); font: 14px/1.5 var(--font-text); }
  #frame, .proto { position: relative; z-index: 1; }
  #frame { flex: 1; display: flex; flex-direction: column; min-height: 0; }
  button, select { color: var(--ink); font-family: var(--font-small); }
  :focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }
  select option { background: var(--surface); }
  .proto { background: color-mix(in srgb, var(--code) 80%, transparent); border-bottom: 1px dashed var(--line); color: var(--ink-faint); }
  .proto b { color: var(--ink-mute); } .proto select { background: var(--surface); border-color: var(--line); }
  .toast { background: var(--surface); border: 1px solid var(--line); border-radius: 8px; color: var(--ink-mute); font-family: var(--font-small); }
  .toast b { color: var(--ink); }

  /* header: RS-12 / RS-20, the Choose look of choose-board and choose-gallery */
  .head { flex: 0 0 56px; background: var(--glass); backdrop-filter: var(--glass-blur); -webkit-backdrop-filter: var(--glass-blur); border-bottom: 1px solid var(--glass-line); font-family: var(--font-small); gap: 14px; }
  .head .mark { color: var(--accent); font-size: 22px; }
  .head .room { border: 0; padding: 0; color: var(--accent); font-weight: 600; font-size: 13px; }
  .head nav button { background: none; border: 1px solid transparent; border-radius: 7px; padding: 4px 9px; color: var(--ink-mute); font-size: 12px; }
  .head nav button:hover:not(:disabled) { border-color: var(--line); }
  .head nav button[aria-current=page] { border-color: var(--accent); color: var(--accent); background: none; }
  .head nav button:disabled { opacity: .35; }
  .head .gear { background: none; border: 0; color: var(--ink-mute); }

  /* the column (Learn's Welcome) */
  .wrap { max-width: 760px; margin: 0 auto; padding: 18vh 24px 96px; display: flex; flex-direction: column; gap: 20px; }
  .wrap.first { padding-top: 24vh; }
  .lede { font-size: 16px; line-height: 1.7; color: var(--ink-mute); text-align: center; margin: 0 0 12px; }
  .ask { position: relative; display: flex; flex-direction: column; gap: 0; }
  .cap { position: relative; display: flex; flex-direction: column; border: 1px solid transparent; border-radius: 0; padding: 0; }
  .cap .row1 { display: flex; align-items: center; gap: 10px; }
  .subj { flex: 1; min-width: 0; border: 0; background: transparent; color: var(--ink); font: 350 38px/1.25 var(--font-display); letter-spacing: -.01em; padding: 6px 0 14px; text-align: center; outline: none; }
  .subj::placeholder, .dirf::placeholder { color: var(--ink-faint); }
  .subj:disabled { opacity: .5; }
  .cap.on { border-radius: 32px; padding: 4px 6px 4px 28px; }
  .cap.on .subj { text-align: left; font: 400 22px/1.25 var(--font-text); letter-spacing: 0; padding: 8px 0; }
  .cap.two { border-radius: 24px; padding: 8px 8px 8px 24px; }
  .hair, .dirf, .starters, .tail { display: none; }
  .cap.two .hair, .cap.two .dirf { display: block; } .cap.two .starters, .cap.two .tail { display: flex; }
  .cap.two .row1 .primary { display: none; }
  .hair { height: 1px; margin: 6px 16px 0 0; }
  .dirf { width: 100%; border: 0; background: transparent; color: var(--ink); resize: none; overflow: hidden; font: 15px/1.5 var(--font-text); padding: 10px 16px 6px 0; outline: none; }
  .starters { flex-wrap: wrap; align-items: center; gap: 6px; padding: 4px 16px 6px 0; }
  .starters .hint { font: 11px var(--font-small); color: var(--ink-faint); margin-right: 2px; }
  .starters button { border-radius: 999px; padding: 3px 10px; font: 12px var(--font-small); cursor: pointer; }
  .tail { align-items: center; justify-content: space-between; gap: 12px; padding-top: 4px; }
  .counter { font: 11px var(--font-small); color: var(--ink-faint); font-variant-numeric: tabular-nums; }
  .counter.over { color: var(--error-ink); text-decoration: none; }
  .primary { flex: 0 0 auto; padding: 12px 28px; border-radius: 999px; font: 600 14px var(--font-text); border: 1px solid transparent; cursor: pointer; white-space: nowrap; }
  .cap .primary:disabled { background: var(--surface-2); color: var(--ink-faint); border-color: var(--line); box-shadow: none; opacity: 1; cursor: default; }
  .row1 .primary { display: none; } .cap.focus:not(.two) .row1 .primary { display: inline-block; }
  .tail .primary { visibility: hidden; } .cap.focus .tail .primary { visibility: visible; }
  .example { margin: 12px 0 0; text-align: center; font: 12px var(--font-small); color: var(--ink-faint); }
  .example kbd { font: inherit; color: var(--ink-mute); }
  .wrap.capsule .example { text-align: left; font-size: 11px; padding-left: 29px; }
  .wrap.capsule.two .example { padding-left: 25px; }
  .why { margin: 6px 0 0; font: 12px var(--font-small); color: var(--ink-mute); text-align: center; }
  .wrap.capsule .why { text-align: left; padding-left: 29px; }
  .why.over { color: var(--error-ink); text-decoration: none; }
  .inline-msg { text-align: center; font: 12px var(--font-small); color: var(--ink-mute); }
  .inline-msg button { background: none; border: 0; padding: 0; color: var(--ink); text-decoration: underline; text-underline-offset: 3px; font: inherit; cursor: pointer; }
  .row { display: flex; flex-direction: column; align-items: center; gap: 10px; margin-top: 6px; }
  .pickers { gap: 12px; color: var(--ink-mute); font: 11px var(--font-small); }
  .tones button { border: 0; background: none; color: var(--ink-mute); padding: 5px 10px; font: 12px var(--font-small); border-radius: 999px; }
  .pickers select { border: 0; background: transparent; color: var(--ink-mute); font: 12px var(--font-small); padding: 5px 6px; }
  .locale { font: 11px var(--font-small); color: var(--ink-faint); text-align: center; }
  .locale button { background: none; border: 0; padding: 0; color: var(--ink-faint); font: inherit; text-decoration: underline; text-underline-offset: 3px; cursor: pointer; }

  /* the shelf: choose-gallery's resting card, at Learn's shelf place */
  .shelf { margin: 15vh auto 0; width: min(920px, calc(100vw - 32px)); align-self: center; display: flex; flex-direction: column; gap: 18px; }
  .shelf h2 { margin: 0; text-align: center; font: 600 11px var(--font-small); color: var(--ink-faint); }
  .cards { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 24px; }
  .card { position: relative; display: flex; flex-direction: column; gap: 12px; padding: 0 0 16px; border-radius: 12px; cursor: pointer; min-width: 0;
    background: var(--glass); backdrop-filter: var(--glass-blur); -webkit-backdrop-filter: var(--glass-blur); border: 1px solid var(--glass-line); transition: opacity .2s, border-color .2s; }
  .card > .ttl, .card > .steps, .card > .pick, .card > .foot { margin: 0 20px; }
  .card .top { display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 8px 20px; border-radius: 12px 12px 0 0; font: 11px/1.45 var(--font-small); border-bottom: 1px solid var(--glass-line); }
  .card .top .st { border: 0; padding: 0; font: 600 11px var(--font-small); background: none; color: inherit; display: inline-flex; align-items: center; gap: 6px; }
  .card .top .st::before { content: ''; width: 7px; height: 7px; border-radius: 50%; box-sizing: border-box; }
  .card .when { color: var(--ink-faint); white-space: nowrap; }
  .card .ttl { font: 400 13px/1.45 var(--font-text); color: var(--ink-mute); margin-top: 6px !important; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .steps { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
  .step { display: grid; gap: 2px; min-width: 0; }
  .step i { display: block; height: 4px; border-radius: 2px; position: relative; overflow: hidden; background: var(--fill); }
  .step i b { position: absolute; inset: 0 auto 0 0; border-radius: 2px; }
  .step span, .step em { font: 11px var(--font-small); font-style: normal; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .step span { color: var(--ink-faint); } .step em { color: var(--ink-mute); font-variant-numeric: tabular-nums; }
  .pick { font: 600 18px/1.25 var(--font-display); color: var(--ink-mute); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .pick b { font-weight: 600; color: var(--ink); } .pick .verb { display: block; font: 400 11px/1.45 var(--font-small); color: var(--ink-faint); }
  .pick .price { font: 400 13px var(--font-text); color: var(--ink-mute); }
  .pick.ready b::before { content: '◆ '; font-size: .8em; }
  .foot { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; border-top: 1px solid var(--glass-line); padding-top: 10px; font: 11px/1.45 var(--font-small); color: var(--ink-faint); }
  .foot .stats { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .foot .cont { flex: 0 0 auto; background: none; border: 0; padding: 0; font: 12px var(--font-small); color: var(--ink-mute); text-decoration: underline; text-underline-offset: 3px; cursor: pointer; }
  /* the gallery's card colours (choose-gallery r003-01, final) */
  .card .top { color: var(--accent); border-bottom-color: color-mix(in srgb, var(--accent) 35%, transparent); }
  .card .top .st::before { border: 1px dashed var(--accent); }
  .card:has(.pick.ready) .top { background: color-mix(in srgb, var(--accent) 18%, transparent); }
  .card[data-s=decided] .top { background: var(--surface-2); color: var(--focus); border-bottom-color: transparent; }
  .card[data-s=decided] .top .st::before { border: 1.5px solid var(--focus); }
  .card[data-s=decided] .when { color: color-mix(in srgb, var(--focus) 70%, transparent); }
  .card[data-s=bought] .top { background: var(--accent); color: var(--accent-ink); border-bottom-color: transparent; }
  .card[data-s=bought] .top .st::before { background: var(--accent-ink); border: 0; }
  .card[data-s=bought] .when { color: color-mix(in srgb, var(--accent-ink) 75%, transparent); }
  .card:hover { border-color: color-mix(in srgb, var(--accent) 35%, transparent); }
  .step i b { background: color-mix(in srgb, var(--accent) 55%, transparent); } .step.full i b { background: var(--accent); }
  .pick.ready b { color: var(--accent); }
  .browse { align-self: center; background: none; border: 0; padding: 6px; font: 12px var(--font-small); color: var(--ink-mute); text-decoration: underline; text-underline-offset: 3px; cursor: pointer; }
  .browse:hover { color: var(--ink); }
  .nolib { margin-top: 15vh; }
  @media (max-width: 760px) { .subj { font-size: 26px; } .cards { grid-template-columns: 1fr; } .wrap, .wrap.first { padding-top: 10vh; } }
  @media (prefers-reduced-motion: reduce) { * { transition: none !important; } }`;

  function steps(s) {
    const b = K.board(s);
    const v = [`${b[0].done}/${b[0].of}`, `${b[1].done}/${b[1].of}`, `${s.shortlisted}`, s.pick ? (s.status === 'bought' ? 'bought' : 'chosen') : '—'];
    const lab = ['Needs', 'Criteria', 'Shortlist', 'Pick'];
    return `<div class="steps" aria-hidden="true">${b.map((x, i) => {
      const f = x.of ? Math.min(1, x.done / x.of) : 0;
      return `<div class="step${f >= 1 ? ' full' : ''}"><i><b style="width:${Math.round(f * 100)}%"></b></i><span>${lab[i]}</span><em>${v[i]}</em></div>`;
    }).join('')}</div>`;
  }
  function pick(s) {
    if (s.pick) return `<div class="pick" title="${esc(s.pick)}"><span class="verb">${s.status === 'bought' ? 'Bought' : 'Chose'}</span> <b>${esc(s.pick)}</b>${s.price ? ` <span class="price">· ${esc(s.price)}</span>` : ''}</div>`;
    const m = s.missing.length;
    return m ? `<div class="pick miss" title="${esc(s.missing.join(' · '))}"><span class="verb">No pick yet</span> <b>${m} missing</b></div>`
      : '<div class="pick ready"><span class="verb">No pick yet</span> <b>Ready</b> <span class="price">· the room can recommend</span></div>';
  }
  const card = (s) => `<article class="card" data-s="${s.status}" data-open="${s.id}" tabindex="0" title="${esc(s.title)}">
      <div class="top"><span class="st">${s.status}</span><span class="when" title="${esc(s.lastOpenedExact)}">opened ${esc(s.lastOpened)}</span></div>
      <div class="ttl">${esc(s.title)}</div>${steps(s)}${pick(s)}
      <div class="foot"><span class="stats">${esc(K.stats(s))}</span><button class="cont" data-open="${s.id}">${C.continue}</button></div></article>`;

  function render({ sc, subjects, first, locale }) {
    const starters = D.starters.map((s, i) => `<button type="button" data-st="${i}">+ ${esc(s.label)}${s.label === 'Budget' ? ` (${S.currencySymbol})` : ''}</button>`).join('');
    const field = `<div class="ask"><div class="cap" id="cap">
        <div class="row1"><input class="subj" id="subj" maxlength="${C.titleLimit}" placeholder="${esc(C.question)}" aria-label="${esc(C.question)}"${sc.library ? ' autofocus' : ' disabled'}>
          <button class="primary" id="go1" disabled>${C.submit}</button></div>
        <div class="hair"></div>
        <textarea class="dirf" id="dir" rows="1" placeholder="${esc(fill(C.directionPlaceholder))}" aria-label="Your budget and needs"></textarea>
        <div class="starters" role="group" aria-label="Add a need"><span class="hint">Add</span>${starters}</div>
        <div class="tail"><span class="counter" id="cnt"></span><button class="primary" id="go2" disabled>${C.submit}</button></div>
      </div></div>
      <div class="example">${esc(C.example)} <kbd>Shift+Enter</kbd> adds your budget and needs.</div>
      <div class="why" id="why"></div>`;
    if (!sc.library) return `<div class="wrap">${field}<div class="inline-msg nolib">${esc(C.libraryUnavailable)} <button data-settings="Library">Open Settings</button></div></div>`;
    return `<div class="wrap${first ? ' first' : ''}" id="wrap">
      ${first ? `<p class="lede">${esc(C.firstRun)}</p>` : ''}
      ${field}
      ${sc.cli ? '' : `<div class="inline-msg">${esc(C.cliNotReady)} <button data-settings="Provider">Open Settings → Provider</button></div>`}
      <div class="row">${K.pickers()}<div class="locale">${esc(locale)} · <button data-settings="Choose room">change</button></div></div>
      ${subjects.length ? `<section class="shelf" aria-label="${esc(C.recentTitle)}"><h2>${esc(C.recentTitle)}</h2><div class="cards">${subjects.map(card).join('')}</div>
        <button class="browse" data-browse>${fill(C.browseAll, { n: sc.total })}</button></section>` : ''}
    </div>`;
  }

  function wire() {
    const wrap = document.getElementById('wrap'), cap = document.getElementById('cap'), subj = document.getElementById('subj'), dir = document.getElementById('dir');
    if (!wrap || subj.disabled) return;
    document.querySelectorAll('.card').forEach((c) => c.addEventListener('keydown', (e) => { if (e.key === 'Enter') c.click(); }));
    const go = [document.getElementById('go1'), document.getElementById('go2')];
    const upd = () => {
      const r = K.check(subj.value, dir.value);
      go.forEach((b) => (b.disabled = !r.ok));
      const cnt = document.getElementById('cnt'); cnt.textContent = r.counter; cnt.classList.toggle('over', r.over);
      const why = document.getElementById('why'); why.textContent = r.why; why.classList.toggle('over', r.over);
      const focus = cap.contains(document.activeElement), two = cap.classList.contains('two');
      const on = focus || !!subj.value || two;
      cap.classList.toggle('on', on); cap.classList.toggle('focus', focus);
      wrap.classList.toggle('capsule', on); wrap.classList.toggle('two', two);
      dir.style.height = '0'; dir.style.height = dir.scrollHeight + 'px';
    };
    const openDir = () => { cap.classList.add('two'); upd(); dir.focus(); };
    const closeDir = () => { dir.value = ''; cap.classList.remove('two'); subj.focus(); upd(); };
    subj.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.shiftKey) { e.preventDefault(); openDir(); }
      else if (e.key === 'Enter') { e.preventDefault(); K.submit(subj.value, dir.value); }
      else if (e.key === 'Escape') { subj.value = ''; upd(); }
      else if (e.key === 'ArrowDown' && cap.classList.contains('two')) { e.preventDefault(); dir.focus(); }
    });
    dir.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); K.submit(subj.value, dir.value); }
      else if (e.key === 'Escape' || (e.key === 'Backspace' && !dir.value)) { e.preventDefault(); closeDir(); }
      else if (e.key === 'ArrowUp' && dir.selectionStart === 0) { e.preventDefault(); subj.focus(); }
    });
    document.querySelectorAll('[data-st]').forEach((b) => b.addEventListener('click', () => {
      const st = D.starters[+b.dataset.st], ins = fill(st.insert);
      const v = dir.value, at = dir.selectionStart ?? v.length;
      const sep = at && !/[\s,]$/.test(v.slice(0, at)) ? ', ' : '';
      dir.value = v.slice(0, at) + sep + ins + v.slice(at);
      const caret = at + sep.length + ins.length - (st.caretBack || 0);
      dir.focus(); dir.setSelectionRange(caret, caret); upd();
    }));
    go.forEach((b) => b.addEventListener('click', () => K.submit(subj.value, dir.value)));
    ['input', 'focusin'].forEach((ev) => cap.addEventListener(ev, upd));
    cap.addEventListener('focusout', () => setTimeout(() => {
      if (!cap.contains(document.activeElement) && !dir.value.trim()) cap.classList.remove('two');
      upd();
    }));
    upd();
  }

  window.COLOR_BASE = { css, render, wire };
})();
