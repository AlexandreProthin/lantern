<script lang="ts">
  // Learn's reading panel: the shared panel (ui/Panel) with Learn's states, rules, actions and notices.
  import { tick, untrack } from 'svelte';
  import Panel from '../../ui/Panel.svelte';
  import type { PanelNotice, PanelRoomView } from '../../ui/panel-types';
  import { strings } from '../../ui/strings';
  import { errorMessage } from '../../ui/error-message';
  import { addLearnChild, editLearnText, setState, understoodBy } from './rules';
  import type { LearnSession, SessionNotice } from './session';
  import { nodeActions, runNodeAction, type NodeActionId, type PanelRequest } from './actions';
  let { session, revision, showTokens = true, request = null, preview }: { session: LearnSession; revision: number; showTokens?: boolean; request?: PanelRequest | null; preview?: (id: string | null) => void } = $props();
  const kindLabels: Record<string, string> = strings.nodeKinds;
  const room: PanelRoomView = {
    className: 'learn-panel', untitled: strings.untitledQuestion,
    tasks: { stream: ['intro', 'light', 'rewrite'], spawn: ['intro', 'light', 'more'], dialogue: ['reply', 'check'] },
    kindLabel: kind => kindLabels[kind],
    stateLabel: node => understoodBy(node) === 'self' ? strings.selfState : understoodBy(node) === 'demonstrated' ? strings.demonstratedState : node.state,
    frozen: (node, busy) => busy || node.state === 'dismissed',
    dormant: node => node.state === 'dismissed' || node.state === 'open',
    conversable: node => node.state === 'lit' || node.state === 'understood',
    nextHeading: (node, visit) => node.id === visit.rootId ? strings.axes : strings.whereNext,
    optionTag: child => child.state === 'open' ? kindLabels[child.kind] : child.state,
    setAside: child => child.state === 'dismissed',
    restore: (visit, id) => setState(visit, id, 'open'),
    editText: (target, text, by) => editLearnText(target, text, by),
    addChild: (visit, parentId, own) => { addLearnChild(visit, parentId, { title: own.title, hook: own.hook, kind: 'own', createdBy: 'user', author: { kind: 'user', by: own.by } }); },
    actions: nodeActions,
    runAction: (id, nodeId) => id === 'rewrite' ? openRewrite(nodeId) : runNodeAction(session, id as Exclude<NodeActionId, 'rewrite' | 'own' | 'delete'>, nodeId),
    deleteNote: (visit, ids) => { const lost = ids.filter(id => visit.nodes[id].state === 'understood').length; return lost ? strings.understoodLost(lost) : ''; },
    inlineActions: ['light', 'restore']
  };
  // LR-45: *Rewrite explanation* asks what should change (optional), then streams the new text in place.
  let rewriting = $state<string | null>(null), rewriteNote = $state('');
  function openRewrite(nodeId: string) {
    rewriting = nodeId; rewriteNote = '';
    tick().then(() => document.querySelector<HTMLInputElement>('.learn-panel .rewrite input')?.focus());
  }
  function rewrite(nodeId: string) {
    const note = rewriteNote.trim(); rewriting = null; rewriteNote = '';
    void session.run('rewrite', nodeId, note || undefined);
  }
  let handledRequest = 0;
  $effect(() => {
    const r = request; if (!r || r.kind !== 'rewrite' || r.seq <= handledRequest) return;
    handledRequest = r.seq; untrack(() => openRewrite(r.nodeId));
  });
</script>
{#snippet placeholder(node: { id: string; state: string }, ctx: { running: unknown; perform: (fn: () => void) => void })}
  {#if node.state === 'dismissed'}
    <p>{strings.dismissedNotice}</p><button onclick={() => ctx.perform(() => setState(session.visit, node.id, 'open'))}>{strings.restore}</button>
  {:else}
    <p>{strings.darkNode}</p><button class="primary" disabled={!!ctx.running} onclick={() => session.run('light', node.id)}>{strings.lightUp}</button>
  {/if}
{/snippet}
{#snippet body(node: { id: string }, ctx: { running: unknown; busy: boolean })}
  {#if rewriting === node.id && !ctx.busy}
    <form class="rewrite" onsubmit={e => { e.preventDefault(); rewrite(node.id); }}>
      <input aria-label={strings.rewriteNote} placeholder={strings.rewriteNote} bind:value={rewriteNote} maxlength="300"
        onkeydown={e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); rewriting = null; } }} />
      <div><button type="submit" class="primary" disabled={!!ctx.running}>{strings.rewriteGo}</button><button type="button" onclick={() => rewriting = null}>{strings.cancel}</button></div>
    </form>
  {/if}
{/snippet}
{#snippet notice(n: PanelNotice, ctx: { running: unknown })}
  {@const note = n as SessionNotice}
  {#if note.kind === 'directions'}{strings.directionsCount(note.count!)}<button disabled={!!ctx.running} onclick={() => note.retry()}>{strings.moreOptions}</button>
  {:else}<strong>{strings.tutorFailed}</strong><p>{errorMessage(note.error!)}</p><details><summary>{strings.details}</summary><pre>{note.error!.details}</pre></details><button disabled={!!ctx.running} onclick={() => note.retry()}>{strings.retry}</button>{/if}
{/snippet}
{#snippet footer(node: { id: string; state: string }, ctx: { running: unknown; busy: boolean; perform: (fn: () => void) => void })}
  <button disabled={!!ctx.running} onclick={() => session.run('check', node.id)}>{strings.check}</button><button disabled={ctx.busy} onclick={() => ctx.perform(() => setState(session.visit, node.id, node.state === 'understood' ? 'lit' : 'understood', node.state === 'understood' ? null : 'self'))}>{node.state === 'understood' ? strings.notSure : strings.understood}</button>
{/snippet}
<Panel {session} {room} {placeholder} {notice} {footer} {body} {revision} {showTokens} {request} {preview} />
<style>
  .rewrite { display:grid; gap:8px; margin:12px 0; } .rewrite div { display:flex; gap:6px; }
  :global(.panel.learn-panel .state-chip[data-state='understood']) { color:var(--node-understood); border-color:var(--node-understood); }
  :global(.panel.learn-panel .state-chip[data-state='lit']) { color:var(--node-lit); }
  :global(.panel.learn-panel .state-chip[data-state='dismissed']) { opacity:.35; }
</style>
