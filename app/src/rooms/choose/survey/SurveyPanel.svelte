<script lang="ts">
  // Choose's reading panel: the shared panel (ui/Panel) with Choose's kinds, states and actions (CP-10, CR-21 to CR-24, CR-30, CP-30.4).
  import Panel from '../../../ui/Panel.svelte';
  import type { PanelNotice, PanelRoomView, PanelSession } from '../../../ui/panel-types';
  import { strings } from '../../../ui/strings';
  import { editText } from '../../../core/graph';
  import type { GraphNode } from '../../../core/model';
  import { addChooseChild, ANSWER_LIMIT, answerOf, chooseData, kindOf, rejectedOf, REASON_LIMIT, setState, statusOf } from '../rules';
  import type { ChooseSession, SessionNotice } from '../session';
  import type { Task } from '../rules';
  import { nodeActions, runAction, inlineActions, isRank } from './actions';
  import type { ActionId } from './actions';
  import { kindNames, stateNames, t } from './strings';
  import ProductFacts from './ProductFacts.svelte';

  let { session, revision, showTokens = true, request = null, preview, rejecting, setRejecting }: {
    session: ChooseSession; revision: number; showTokens?: boolean; request?: { kind: 'own' | 'delete'; nodeId: string; seq: number } | null;
    preview?: (id: string | null) => void; rejecting: string | null; setRejecting: (id: string | null) => void;
  } = $props();
  /** The panel sees the main lane; a `light` on a need or criterion is an explanation, which streams but grows nothing. */
  const panelSession: PanelSession = {
    get visit() { return session.visit; }, get notice() { return session.notice; }, get displayName() { return session.displayName; },
    get running() { const r = session.running; return r ? { ...r, task: r.task === 'light' && ['need', 'criterion'].includes(session.visit.nodes[r.nodeId]?.kind) ? 'explain' : r.task } : null; },
    setFocus: id => session.setFocus(id), cancel: () => session.cancel(), touch: () => session.touch(),
    run: (task, nodeId, message) => session.run(task as Task, nodeId, { message }),
  };
  const room: PanelRoomView = {
    className: 'choose-panel', untitled: t.untitled,
    tasks: { stream: ['intro', 'light', 'explain'], spawn: ['intro', 'light', 'more', 'find'], dialogue: ['reply', 'check', 'recommend'] },
    kindLabel: kind => kindNames[kind],
    stateLabel: node => node.kind === 'subject' ? chooseData(session.visit).status : stateNames[node.state],
    frozen: (node, busy) => busy || node.state === 'dismissed',
    dormant: node => node.state === 'dismissed' || !node.content,
    // Dialogue and composer for everything but dismissed nodes and not-yet-lit explanations (reply is allowed on any node, CP-10).
    conversable: node => node.state !== 'dismissed' && !(['subject', 'concept', 'family', 'own'].includes(node.kind) && node.state === 'open'),
    nextHeading: node => node.kind === 'subject' ? t.headings.subject : node.kind === 'family' ? t.headings.family : t.headings.other,
    optionTag: child => child.state === 'open' || child.state === 'candidate' ? kindNames[child.kind] : `${kindNames[child.kind]} · ${stateNames[child.state]}`,
    setAside: child => child.state === 'dismissed',
    restore: (visit, id) => setState(visit, id, 'open'),
    editText: (target, text, by) => editText(target, text, by),
    addChild: (visit, parentId, own) => { addChooseChild(visit, parentId, { title: own.title, hook: own.hook, kind: 'own', createdBy: 'user', author: { kind: 'user', by: own.by } }); },
    actions: (visit, node, running) => nodeActions(visit, node, running, session.useWeb()),
    runAction: (id, nodeId) => { if (id === 'reject') setRejecting(nodeId); else runAction(session, id as ActionId, nodeId); },
    inlineActions,
  };
  const answerDrafts = $state<Record<string, string>>({}), reasonDrafts = $state<Record<string, string>>({});
  const day = (at: string) => at.slice(0, 10);
  /** The call (main lane or research lane) working on this node, for the progress line. */
  function lane(nodeId: string) {
    void revision;
    const main = session.running, research = session.research;
    if (main?.nodeId === nodeId && (main.task === 'find' || main.task === 'check')) return { which: 'main' as const, run: main };
    if (research?.nodeId === nodeId) return { which: 'research' as const, run: research };
    return null;
  }
  const progressText = (run: { web: boolean; progress: { name: string; detail: string } | null }) =>
    !run.web ? t.fromKnowledge : run.progress?.name === 'WebFetch' ? t.reading(run.progress.detail) : t.searching;
  const offerFor = (nodeId: string) => { void revision; return session.needOffer?.nodeId === nodeId ? session.needOffer : null; };
  const recommended = (node: GraphNode) => {
    void revision; const r = session.recommendation;
    return node.id === session.visit.rootId && r?.productId && ['candidate', 'shortlisted'].includes(session.visit.nodes[r.productId]?.state ?? '') ? r : null;
  };
</script>
{#snippet placeholder(node: GraphNode, ctx: { running: unknown; perform: (fn: () => void) => void })}
  {#if node.state === 'dismissed'}
    <p>{t.dismissedNotice}</p><button disabled={(ctx.running as { nodeId: string } | null)?.nodeId === node.id} onclick={() => ctx.perform(() => session.undismiss(node.id))}>{t.restore}</button>
  {:else if kindOf(node) === 'subject'}
    <p>{t.notStarted}</p><button class="primary" disabled={!!ctx.running} onclick={() => void session.run('light', node.id).catch(e => console.warn(String(e)))}>{t.lightSubject}</button>
  {:else if node.kind === 'concept' || node.kind === 'own'}
    <p>{t.darkNode}</p><button class="primary" disabled={!!ctx.running} onclick={() => void session.run('light', node.id).catch(e => console.warn(String(e)))}>{t.lightSubject}</button>
  {:else if node.kind === 'family'}
    <p>{t.noProducts}</p>
  {:else if node.kind === 'need' || node.kind === 'criterion'}
    <p class="soft">{t.unexplained}</p>
  {/if}
{/snippet}
{#snippet notice(n: PanelNotice, ctx: { running: unknown })}
  {@const note = n as SessionNotice}
  {#if note.kind === 'directions'}{strings.directionsCount(note.count!)}<button disabled={!!ctx.running} onclick={() => note.retry()}>{strings.moreOptions}</button>
  {:else}<strong>{t.failed}</strong><p>{strings.errorKinds[note.error!.kind]}</p><details><summary>{strings.details}</summary><pre>{note.error!.details}</pre></details><button disabled={!!ctx.running} onclick={() => note.retry()}>{strings.retry}</button>{/if}
{/snippet}
{#snippet body(node: GraphNode, ctx: { running: unknown; busy: boolean; perform: (fn: () => void) => void })}
  {@const working = lane(node.id)}
  {#if working}
    <p class="research" role="status"><span class="step">{progressText(working.run)}</span>
      <button onclick={() => working.which === 'main' ? session.cancel() : session.cancelResearch()}>{t.cancelResearch}</button></p>
  {/if}
  {#if node.kind === 'need' && node.state !== 'dismissed'}
    {@const current = answerOf(node)}
    <section class="answer">
      <h2>{t.yourAnswer}</h2>
      <textarea aria-label={t.yourAnswer} placeholder={t.answerPlaceholder} rows="3" maxlength={ANSWER_LIMIT} value={answerDrafts[node.id] ?? current?.text ?? ''}
        oninput={e => answerDrafts[node.id] = e.currentTarget.value}></textarea>
      <div class="row"><button class="primary" disabled={ctx.busy || !(answerDrafts[node.id] ?? '').trim() || (answerDrafts[node.id] ?? '').trim() === current?.text}
        onclick={() => ctx.perform(() => { session.answer(node.id, answerDrafts[node.id]); delete answerDrafts[node.id]; })}>{t.saveAnswer}</button>
        {#if current}<small>{t.answerBy(current.by, day(current.at))}</small>{/if}</div>
    </section>
  {:else if node.kind === 'criterion' && node.state !== 'dismissed'}
    <section class="ranking">
      <h2>{t.ranking}</h2>
      <div class="seg" role="group" aria-label={t.ranking}>
        {#each ['must', 'nice', 'irrelevant'] as const as rank (rank)}
          <button aria-pressed={node.state === rank} class:on={node.state === rank} disabled={ctx.busy} onclick={() => ctx.perform(() => session.rank(node.id, rank))}>{t.ranks[rank]}</button>
        {/each}
      </div>
      {#if node.state === 'open'}<small>{t.notRanked}</small>{/if}
    </section>
  {:else if node.kind === 'product'}
    {#if node.state === 'chosen'}<p class="pick">{statusOf(session.visit) === 'bought' ? t.boughtNote : t.chosenNote}</p>{/if}
    {#if node.state === 'rejected'}<p class="reason">{t.rejectedBecausePanel(rejectedOf(node)?.reason ?? '')}</p>{/if}
    {#if rejecting === node.id && ['candidate', 'shortlisted'].includes(node.state)}
      <form class="reject" onsubmit={e => { e.preventDefault(); ctx.perform(() => { session.reject(node.id, reasonDrafts[node.id] ?? ''); delete reasonDrafts[node.id]; setRejecting(null); }); }}>
        <label>{t.rejectReason}<input aria-label={t.rejectReason} placeholder={t.reasonPlaceholder} maxlength={REASON_LIMIT} value={reasonDrafts[node.id] ?? ''} oninput={e => reasonDrafts[node.id] = e.currentTarget.value} /></label>
        <div class="row"><button type="submit" class="primary" disabled={!(reasonDrafts[node.id] ?? '').trim()}>{t.confirmReject}</button><button type="button" onclick={() => setRejecting(null)}>{strings.cancel}</button></div>
      </form>
    {/if}
    <ProductFacts {node} />
  {/if}
{/snippet}
{#snippet after(node: GraphNode, ctx: { running: unknown; busy: boolean; perform: (fn: () => void) => void })}
  {@const offer = offerFor(node.id)}
  {#if offer}
    <section class="offer" role="status"><h2>{t.offerHeading}</h2><p>{t.offerBody(offer.question, offer.answer)}</p>
      <div class="row"><button class="primary" onclick={() => ctx.perform(() => session.addOfferedNeed())}>{t.addNeed}</button><button onclick={() => session.ignoreOfferedNeed()}>{t.ignore}</button></div></section>
  {/if}
  {@const rec = recommended(node)}
  {#if rec}
    <section class="recommend"><h2>{t.recommendation}</h2>
      <p class="soft">{rec.confidence}{rec.missing.length ? ` · ${rec.missing.join(', ')}` : ''}</p>
      <button class="primary" disabled={!!ctx.running} onclick={() => ctx.perform(() => session.choose(rec.productId!))}>{t.chooseProduct(session.visit.nodes[rec.productId!].title)}</button></section>
  {/if}
{/snippet}
{#snippet footer(node: GraphNode, ctx: { running: unknown; busy: boolean; perform: (fn: () => void) => void })}
  {#if session.useWeb()}<button title={t.checkTitle} disabled={!!ctx.running} onclick={() => runAction(session, 'check', node.id)}>{t.check}</button>{/if}
{/snippet}
<Panel session={panelSession} {room} {placeholder} notice={notice} {footer} {body} {after} {revision} {showTokens} {request} {preview} />
<style>
  :global(.panel.choose-panel .state-chip[data-state='lit']), :global(.panel.choose-panel .state-chip[data-state='shortlisted']) { color:var(--node-lit); }
  :global(.panel.choose-panel .state-chip[data-state='answered']), :global(.panel.choose-panel .state-chip[data-state='must']), :global(.panel.choose-panel .state-chip[data-state='nice']),
  :global(.panel.choose-panel .state-chip[data-state='chosen']) { color:var(--node-understood); border-color:var(--node-understood); }
  :global(.panel.choose-panel .state-chip[data-state='dismissed']), :global(.panel.choose-panel .state-chip[data-state='rejected']), :global(.panel.choose-panel .state-chip[data-state='irrelevant']) { opacity:.6; }
  h2 { font-size:13px; color:var(--ink-mute); font-weight:500; margin:20px 0 10px; }
  .soft, small { color:var(--ink-mute); font-size:12px; }
  .research { display:flex; align-items:center; gap:12px; margin:14px 0; padding:8px 12px; border:1px solid var(--line); border-radius:8px; color:var(--focus); }
  .research .step { flex:1; } .research button { font-size:12px; }
  textarea, input { width:100%; box-sizing:border-box; }
  .row { display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin-top:8px; }
  .seg { display:inline-flex; border:1px solid var(--accent); border-radius:8px; overflow:hidden; }
  .seg button { border:0; border-radius:0; background:transparent; font-size:12px; color:var(--ink-mute); }
  .seg button + button { border-left:1px solid color-mix(in srgb, var(--accent) 40%, transparent); }
  .seg button.on { background:var(--accent); color:var(--accent-ink); }
  .pick { color:var(--node-understood); } .reason { color:var(--ink-mute); font-style:italic; }
  .reject { display:grid; gap:8px; margin:12px 0; } .reject label { display:grid; gap:6px; font-size:12px; color:var(--ink-mute); }
  .offer, .recommend { padding:12px; border:1px solid var(--accent); border-radius:8px; margin:16px 0; } .offer h2, .recommend h2 { margin-top:0; }
</style>
