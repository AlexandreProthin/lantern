<script lang="ts">
  // CR-14, CR-31, CR-61, choose-board recipe r005-02: the decision board, opened in place of the graph, full height.
  import { onMount, untrack } from 'svelte';
  import type { Settings } from '../../../frame/settings';
  import { answerOf, chooseData, facts, nodesOfKind, rejectedOf, REASON_LIMIT, NOTE_LIMIT, ANSWER_LIMIT } from '../rules';
  import type { ChooseSession } from '../session';
  import { board } from '../stats';
  import { missingItems, stageOf } from './missing';
  import { EASE_IN, EASE_OUT, mayMove } from './motion';
  import { strings } from '../../../ui/strings';
  import { stateNames, t } from './strings';

  let { session, revision, settings, closing, onclose, onclosed, recommend }: {
    session: ChooseSession; revision: number; settings: Settings; closing: boolean; onclose: () => void; onclosed: () => void; recommend: () => void;
  } = $props();
  const model = $derived.by(() => {
    revision; const v = session.visit, b = board(v);
    const needs = nodesOfKind(v, 'need').filter(n => n.state !== 'dismissed');
    const products = nodesOfKind(v, 'product'), rank = (s: string) => ['chosen', 'shortlisted', 'candidate'].indexOf(s);
    return { v, b, miss: missingItems(v), stage: stageOf(v), needs: [...needs.filter(n => n.state === 'open'), ...needs.filter(n => n.state === 'answered')],
      criteria: nodesOfKind(v, 'criterion').filter(n => n.state !== 'dismissed'),
      live: products.filter(p => p.state !== 'rejected').sort((a, c) => rank(a.state) - rank(c.state)), rejected: products.filter(p => p.state === 'rejected'),
      note: chooseData(v).needsNote ?? '', canFind: v.nodes[v.rootId].state === 'lit', status: chooseData(v).status };
  });
  const busy = $derived.by(() => { revision; return !!session.running; });
  const b = $derived(model.b), miss = $derived(model.miss), stage = $derived(model.stage);
  const groups = [['must', 'must'], ['nice', 'nice'], ['open', 'open'], ['irrelevant', 'irrelevant']] as const;
  const factOf = (id: string) => { const f = facts(model.v.nodes[id]); return (f.find(x => x.label.trim().toLowerCase() === 'price') ?? f[0]); };
  let sheet: HTMLElement, error = $state(''), rejectId = $state<string | null>(null), reason = $state('');
  const answerDrafts = $state<Record<string, string>>({});
  function attempt(fn: () => void) { try { fn(); error = ''; } catch (e) { error = String(e); } }
  const lane = $derived.by(() => {
    revision; const main = session.running, research = session.research;
    if (main && (main.task === 'find' || main.task === 'check')) return { cancel: () => session.cancel(), run: main };
    return research ? { cancel: () => session.cancelResearch(), run: research } : null;
  });
  const progress = (run: { web: boolean; progress: { name: string; detail: string } | null }) => !run.web ? t.fromKnowledge : run.progress?.name === 'WebFetch' ? t.reading(run.progress.detail) : t.searching;

  // Motion (recipe): unfolds from the rail's edge, sections 40 ms apart; folds back in 240 ms; the chosen card fills; Recommend fills when complete.
  onMount(() => {
    if (!mayMove(settings)) return;
    sheet.animate([{ clipPath: 'inset(0 0 0 100%)' }, { clipPath: 'inset(0 0 0 0)' }], { duration: 320, easing: EASE_OUT });
    [...sheet.querySelectorAll('.top, .missing, .card, .short')].forEach((x, i) =>
      x.animate([{ opacity: 0, transform: 'translateX(16px)' }, { opacity: 1, transform: 'none' }], { duration: 220, delay: 120 + 40 * i, easing: EASE_OUT, fill: 'backwards' }));
  });
  $effect(() => {
    if (!closing) return;
    untrack(() => {
      let fired = false; const done = () => { if (!fired) { fired = true; onclosed(); } };
      if (!mayMove(settings)) return done();
      sheet.animate([{ clipPath: 'inset(0 0 0 0)' }, { clipPath: 'inset(0 0 0 100%)' }], { duration: 240, easing: EASE_IN, fill: 'forwards' }).onfinish = done;
      setTimeout(done, 450);
    });
  });
  let previous: { chosen: string | null; stage: string; status: string } | null = null;
  $effect(() => {
    const chosen = b.chosen?.id ?? null, now = stage, status = model.status;
    untrack(() => {
      const old = previous; previous = { chosen, stage: now, status };
      if (!old || !mayMove(settings) || !sheet) return;
      if (chosen && chosen !== old.chosen) sheet.querySelector('.prod.chosen')?.animate([{ clipPath: 'inset(0 100% 0 0 round 10px)' }, { clipPath: 'inset(0 0 0 0 round 10px)' }], { duration: 360, easing: EASE_OUT });
      if (now === 'ready' && old.stage !== 'ready') sheet.querySelector('button[data-rec]')?.animate([{ clipPath: 'inset(0 100% 0 0 round 999px)' }, { clipPath: 'inset(0 0 0 0 round 999px)' }], { duration: 360, easing: EASE_OUT, fill: 'backwards' });
      if (status !== old.status) sheet.querySelector('.st')?.animate([{ opacity: 0, transform: 'translateX(-8px)' }, { opacity: 1, transform: 'none' }], { duration: 220, easing: EASE_OUT });
    });
  });
  function saveAnswer(id: string, e: Event) {
    const input = e.currentTarget as HTMLInputElement, text = input.value.trim(), current = answerOf(model.v.nodes[id])?.text ?? '';
    if (!text || text === current) { input.value = current; return; }
    attempt(() => session.answer(id, text));
  }
  function saveNote(e: Event) { attempt(() => session.setNeedsNote((e.currentTarget as HTMLTextAreaElement).value)); }
  function rejectNow(id: string) { attempt(() => { session.reject(id, reason); rejectId = null; reason = ''; }); }
</script>
<section class="board-sheet" aria-label={t.boardHeading} bind:this={sheet}>
  <div class="sheet">
    <div class="top">
      <h2>{t.boardHeading}</h2><span class="st" data-s={stage}>{t.stages[stage]}</span><span class="sp"></span>
      {#if model.status === 'exploring'}<button data-rec class:on={stage === 'ready'} disabled={busy} onclick={recommend}>{stage === 'ready' ? t.recommendOffer : t.recommendNow(miss.length)}</button>{/if}
      <button data-close onclick={onclose}>{t.backToGraph} ✕</button>
    </div>
    {#if lane}<p class="research" role="status"><span>{progress(lane.run)}</span><button onclick={lane.cancel}>{t.cancelResearch}</button></p>{/if}
    <div class="missing" class:none={!miss.length}>
      {#if miss.length}<b>{t.stillMissing}</b> {#each miss as m, i (i)}<span>{m.text}</span>{/each}{#if b.missing.cells.length}<button data-fill onclick={() => session.fillCompare()}>{t.fillCompare}</button>{/if}
      {:else}{t.nothingMissing}{/if}
    </div>
    {#if error}<p class="error" role="alert">{error}</p>{/if}
    <div class="cols">
      <section class="card needs"><h3>{t.needsCard} <span>{b.needsAnswered}/{b.needsTotal}</span></h3>
        <label class="note"><span class="q">{t.inYourWords}</span>
          <textarea aria-label={t.inYourWords} placeholder={t.notePlaceholder} rows="2" maxlength={NOTE_LIMIT} value={model.note} onchange={saveNote}></textarea></label>
        {#if !model.needs.length}<p class="mute">{t.noNeeds}</p>{/if}
        {#each model.needs as n (n.id)}
          <div class="need" class:open={n.state === 'open'}>
            <button class="q link" onclick={() => session.setFocus(n.id)}>{n.title}</button>
            <input class="edit" aria-label={n.title} placeholder={t.answerPlaceholder} maxlength={ANSWER_LIMIT} value={answerDrafts[n.id] ?? answerOf(n)?.text ?? ''}
              oninput={e => answerDrafts[n.id] = e.currentTarget.value} onchange={e => { saveAnswer(n.id, e); delete answerDrafts[n.id]; }} />
          </div>
        {/each}
      </section>
      <section class="card criteria"><h3>{t.criteriaCard} <span>{b.criteria}</span></h3>
        {#if !model.criteria.length}<p class="mute">{t.noCriteria}</p>{/if}
        {#each groups as [state, key] (key)}
          {@const list = model.criteria.filter(c => c.state === state)}
          {#if list.length}
            <div class="grp" class:irr={state === 'irrelevant'} class:must={state === 'must'}><h4>{t.groups[state]}</h4>
              {#each list as k (k.id)}
                <div class="crit"><span><button class="link" onclick={() => session.setFocus(k.id)}>{k.title}</button><span class="why">{k.hook}</span></span>
                  <span class="seg" role="group" aria-label={k.title}>{#each ['must', 'nice', 'irrelevant'] as const as x (x)}<button class:on={k.state === x} aria-pressed={k.state === x} onclick={() => attempt(() => session.rank(k.id, x))}>{t.segment[x]}</button>{/each}</span>
                </div>
              {/each}
            </div>
          {/if}
        {/each}
      </section>
    </div>
    <section class="card short"><h3>{t.shortlistCard} <span>{t.shortlistCount(b.shortlisted, model.live.filter(p => p.state === 'candidate').length)}</span>
      {#if model.canFind}<button class="small" disabled={busy} onclick={() => void session.run('find', model.v.rootId).catch(e => error = String(e))}>{t.find}</button>{/if}</h3>
      {#if !model.live.length}<p class="mute">{t.noBoardProducts}</p>{/if}
      <div class="prods">
        {#each model.live as p (p.id)}
          {@const fact = factOf(p.id)}
          <div class="prod {p.state}" data-product={p.id}>
            <button class="name link" onclick={() => session.setFocus(p.id)}>{p.title}</button><span class="mute">{fact ? `${fact.label}: ${fact.value}` : p.hook}</span><span class="faint">{stateNames[p.state]}</span>
            <div class="acts">
              {#if p.state === 'candidate'}<button onclick={() => attempt(() => session.shortlist(p.id))}>{t.shortlist}</button><button onclick={() => { rejectId = p.id; reason = ''; }}>{t.reject}</button>{/if}
              {#if p.state === 'shortlisted'}<button onclick={() => attempt(() => session.choose(p.id))}>{t.choose}</button><button onclick={() => attempt(() => session.unshortlist(p.id))}>{t.remove}</button><button onclick={() => { rejectId = p.id; reason = ''; }}>{t.reject}</button>{/if}
              {#if p.state === 'chosen' && model.status !== 'bought'}<button class="on" onclick={() => attempt(() => session.bought())}>{t.bought}</button><button onclick={() => attempt(() => session.unchoose(p.id))}>{t.unchoose}</button>{/if}
              {#if p.state === 'chosen' && model.status === 'bought'}<b>{t.boughtDone}</b>{/if}
            </div>
            {#if rejectId === p.id}
              <form class="reject" onsubmit={e => { e.preventDefault(); rejectNow(p.id); }}>
                <input aria-label={t.rejectReason} placeholder={t.reasonPlaceholder} maxlength={REASON_LIMIT} bind:value={reason} />
                <button type="submit" disabled={!reason.trim()}>{t.confirmReject}</button><button type="button" onclick={() => rejectId = null}>{strings.cancel}</button>
              </form>
            {/if}
          </div>
        {/each}
      </div>
      {#if model.rejected.length}<div class="rej">{t.rejectedList}: {#each model.rejected as p, i (p.id)}{i ? ', ' : ''}{p.title} ({rejectedOf(p)?.reason}) <button class="small" onclick={() => attempt(() => session.restore(p.id))}>{t.restore}</button>{/each}</div>{/if}
    </section>
  </div>
</section>
<style>
  .board-sheet { --ink-faint:color-mix(in srgb, var(--ink-mute) 62%, var(--bg)); position:absolute; inset:0; z-index:2; display:flex; flex-direction:column; min-height:0; overflow:hidden;
    background:var(--glass); backdrop-filter:var(--glass-blur); -webkit-backdrop-filter:var(--glass-blur); border-top:2px solid var(--accent); font:400 13px/1.45 'Segoe UI Variable Text','Segoe UI',system-ui,sans-serif; }
  .sheet { flex:1; overflow:auto; padding:32px 40px 80px; }
  .top { display:flex; align-items:baseline; gap:14px; flex-wrap:wrap; } .sp { flex:1; }
  h2 { margin:0; font:350 24px/1.2 'Segoe UI Variable Display','Segoe UI',system-ui,sans-serif; letter-spacing:-.01em; color:var(--ink); }
  .top button, .missing button, .small { border-radius:999px; font:400 12px 'Segoe UI Variable Text','Segoe UI',system-ui,sans-serif; padding:6px 14px; }
  .small { padding:2px 10px; font-size:11px; }
  .top button[data-rec] { background:transparent; border-color:var(--accent); color:var(--accent); }
  .top button[data-rec].on { background:var(--accent); color:var(--accent-ink); box-shadow:0 0 24px 6px var(--glow-far); }
  .st { border:1px solid var(--accent); border-radius:999px; padding:1px 10px; font:400 11px 'Segoe UI Variable Small','Segoe UI',system-ui,sans-serif; color:var(--accent); }
  .st[data-s='ready'] { background:color-mix(in srgb, var(--accent) 18%, transparent); } .st[data-s='decided'] { background:var(--surface-2); color:var(--focus); border-color:var(--focus); }
  .st[data-s='bought'] { background:var(--accent); color:var(--accent-ink); }
  .research { display:flex; gap:12px; align-items:center; margin:14px 0 0; color:var(--focus); } .research button { font-size:12px; padding:2px 10px; }
  .missing { margin:14px 0 34px; font:400 13px/1.65 'Segoe UI Variable Text','Segoe UI',system-ui,sans-serif; color:var(--ink); }
  .missing b { font-weight:600; color:var(--focus); margin-right:6px; }
  .missing span { text-decoration:underline; text-decoration-color:var(--focus); text-underline-offset:4px; } .missing span::after { content:' · '; color:var(--ink-faint); display:inline-block; text-decoration:none; } .missing span:last-of-type::after { content:''; }
  .missing button { margin-left:10px; }
  .error { color:var(--error-ink); }
  .cols { display:grid; grid-template-columns:1fr 1fr; gap:0; }
  .cols .card + .card { border-left:1px solid color-mix(in srgb, var(--accent) 30%, transparent); padding-left:36px; } .cols .card:first-child { padding-right:36px; }
  h3 { margin:0 0 18px; font:600 11px 'Segoe UI Variable Small','Segoe UI',system-ui,sans-serif; color:var(--accent); display:flex; gap:10px; align-items:center; }
  .mute { color:var(--ink-mute); font-size:12px; } .faint { color:var(--ink-faint); }
  .note { display:grid; gap:4px; margin-bottom:20px; } .note .q { font:400 12px 'Segoe UI Variable Small','Segoe UI',system-ui,sans-serif; color:var(--ink-mute); }
  textarea, input { box-sizing:border-box; width:100%; background:transparent; color:var(--ink); border:0; border-bottom:1px solid var(--glass-line); font:400 15px/1.35 'Segoe UI Variable Text','Segoe UI',system-ui,sans-serif; padding:4px 0; border-radius:0; outline:none; resize:vertical; }
  textarea:focus, input:focus { border-bottom-color:var(--accent); }
  .need { display:grid; padding:0 0 16px; } .need .q { font:400 12px 'Segoe UI Variable Small','Segoe UI',system-ui,sans-serif; color:var(--ink-mute); text-align:left; }
  .need .edit { border-bottom-color:transparent; } .need .edit:hover { border-bottom-color:var(--glass-line); } .need .edit:focus { border-bottom-color:var(--accent); }
  .need.open .q { color:var(--focus); } .need.open .q::before { content:'○ '; }
  .link { all:unset; cursor:pointer; box-sizing:border-box; } .link:hover { text-decoration:underline; text-underline-offset:3px; } .link:focus-visible { outline:1px solid var(--focus); outline-offset:2px; }
  .grp { margin-bottom:22px; } .grp h4 { margin:0 0 8px; font:600 15px 'Segoe UI Variable Text','Segoe UI',system-ui,sans-serif; color:var(--ink); } .grp.must h4 { color:var(--accent); }
  .grp.irr { opacity:.5; }
  .crit { display:flex; align-items:center; justify-content:space-between; gap:10px; padding:6px 0; font-size:13px; } .crit .why { display:block; font:400 11px/1.35 'Segoe UI Variable Small','Segoe UI',system-ui,sans-serif; color:var(--ink-faint); margin-top:2px; }
  .seg { display:inline-flex; border:1px solid var(--accent); border-radius:8px; overflow:hidden; flex:none; }
  .seg button { border:0; border-radius:0; background:transparent; color:var(--ink-mute); font:400 11px 'Segoe UI Variable Small','Segoe UI',system-ui,sans-serif; padding:3px 8px; }
  .seg button + button { border-left:1px solid color-mix(in srgb, var(--accent) 40%, transparent); } .seg button.on { background:var(--accent); color:var(--accent-ink); }
  .short { margin-top:40px; border-top:1px solid color-mix(in srgb, var(--accent) 30%, transparent); padding-top:26px; }
  .prods { display:grid; }
  .prod { display:grid; grid-template-columns:minmax(140px, 1fr) 2fr auto auto; align-items:baseline; gap:18px; padding:14px 0; border-bottom:1px solid var(--glass-line); }
  .prod .name { font:350 18px/1.2 'Segoe UI Variable Display','Segoe UI',system-ui,sans-serif; color:var(--ink); } .prod.shortlisted .name, .prod.chosen .name { font-weight:600; }
  .prod .mute, .prod .faint { font:400 12px 'Segoe UI Variable Text','Segoe UI',system-ui,sans-serif; }
  .prod .acts { display:flex; gap:6px; flex-wrap:wrap; } .prod .acts button { border-radius:999px; font:400 11px 'Segoe UI Variable Small','Segoe UI',system-ui,sans-serif; }
  .prod .reject { grid-column:1 / -1; display:flex; gap:8px; align-items:center; } .prod .reject input { flex:1; font-size:13px; } .prod .reject button { border-radius:999px; font-size:11px; }
  .prod.chosen { background:var(--accent); color:var(--accent-ink); border-radius:10px; padding:14px 16px; margin:8px 0; border-bottom-color:transparent; }
  .prod.chosen .name { color:var(--accent-ink); } .prod.chosen .name::before { content:'● '; }
  .prod.chosen .mute, .prod.chosen .faint { color:color-mix(in srgb, var(--accent-ink) 75%, var(--accent)); }
  .prod.chosen button:not(.link) { background:var(--accent-ink); color:var(--accent); border-color:var(--accent-ink); } .prod.chosen button.on { background:var(--bg); color:var(--focus); }
  .rej { margin-top:14px; font:400 12px 'Segoe UI Variable Text','Segoe UI',system-ui,sans-serif; color:var(--ink-faint); }
  @media (max-width:760px) { .cols { grid-template-columns:1fr; } .cols .card + .card { border-left:0; padding-left:0; } .cols .card:first-child { padding-right:0; } .prod { grid-template-columns:1fr; gap:4px; } .sheet { padding:20px; } }
</style>
