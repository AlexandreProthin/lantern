<script lang="ts">
  // Learn's graph: the shared graph (ui/graph) with Learn's glyphs, legend, node attributes and menu.
  import type { LearnSession } from './session';
  import Graph from '../../ui/graph/Graph.svelte';
  import type { GraphRoomView, MenuAction } from '../../ui/graph/types';
  import { strings } from '../../ui/strings';
  import type { Settings } from '../../frame/settings';
  import type { LibrarySpaces } from '../../frame/library-spaces';
  import { graphLinks } from './graph-links';
  import { nodeActions, runNodeAction, type NodeActionId, type PanelRequest } from './actions';
  import { understoodBy } from './rules';

  let { session, revision, settings, preferencesChanged, navigate = () => {}, visible = true, openInPanel = () => {}, library, linkPreview = null }: { library?: LibrarySpaces; linkPreview?: string | null; session: LearnSession; revision: number; settings: Settings; preferencesChanged: () => void; navigate?: (space: string) => void; visible?: boolean; openInPanel?: (kind: PanelRequest['kind'], nodeId: string) => void } = $props();

  const room: GraphRoomView = {
    className: 'learn-graph',
    scene: { spawnTasks: ['intro', 'light', 'more'], ghost: { kind: 'deeper', state: 'open' } },
    links: graphLinks,
    dataAttrs: n => ({ 'data-understood': understoodBy(n) ?? undefined }),
    labelExtra: n => understoodBy(n) ? ' · ' + (understoodBy(n) === 'self' ? strings.understoodByYou : strings.demonstratedState) : '',
    quiet: n => n.state === 'dismissed',
    untitled: strings.untitledQuestion,
    menuActions: nodeActions,
    runMenuAction(action: MenuAction, nodeId) {
      if (action.toPanel) openInPanel(action.id as PanelRequest['kind'], nodeId); else runNodeAction(session, action.id as Exclude<NodeActionId, 'rewrite' | 'own' | 'delete'>, nodeId);
    },
    enter(nodeId) {
      if (session.focus.state === 'open' && !session.running) { void session.run('light', nodeId); return true; }
      return false;
    }
  };
</script>
{#snippet glyph(n: { state: string; kind: string; pending?: string })}
  <svg class="status" viewBox="0 0 18 18" aria-hidden="true" style:visibility={n.pending ? 'hidden' : 'visible'}>
    {#if n.state === 'understood'}
      <path d="m3 9 4 4 8-9" fill="none" stroke="currentColor" stroke-width="1.5" />
    {:else if n.kind === 'question'}
      <path d="M9 4 14 9 9 14 4 9Z" fill={n.state === 'lit' ? 'currentColor' : 'none'} stroke="currentColor" />
    {:else}
      <circle cx="9" cy="9" r="4" fill={n.state === 'lit' ? 'currentColor' : 'none'} stroke="currentColor" />
    {/if}
  </svg>
{/snippet}
{#snippet legend()}
  <span><i class="key" data-state="open"></i>{strings.openState}</span>
  <span><i class="key" data-state="lit"></i>{strings.litState}</span>
  <span><i class="key" data-state="understood"></i>{strings.demonstratedState}</span>
  <span><i class="key self"></i>{strings.selfState}</span>
  <span><i class="key dismissed"></i>{strings.dismissedState}</span>
  <span><i class="key branch"></i>{strings.branchState}</span>
{/snippet}
<Graph {session} {room} {glyph} {legend} {revision} {settings} {preferencesChanged} {visible} {library} {linkPreview} />
<style>
  .status { display:block; width:18px; height:18px; }
  .key { display:inline-block; width:10px; height:10px; border-radius:50%; margin-right:6px; vertical-align:-1px; border:1px solid var(--node-open); }
  .key[data-state='open'] { border-style:dotted; }
  .key[data-state='lit'] { background:var(--surface-2); border-color:var(--node-lit); box-shadow:0 0 6px 1px var(--glow-near); }
  .key[data-state='understood'] { background:var(--node-understood); border-color:var(--node-understood); }
  .key.self { border:2px solid var(--node-understood); }
  .key.dismissed { opacity:.35; border-style:dotted; }
  .key.branch { width:7px; height:7px; border-radius:0; transform:rotate(45deg); margin:0 8px 0 2px; }
  /* Node states (LR-*): the shared graph draws the disc, Learn colours it. */
  :global(.graph.learn-graph .node[data-state='open'] .disc) { border-style:dotted; }
  :global(.graph.learn-graph .node[data-state='lit'] .disc) { background:var(--surface-2); border-color:var(--node-lit); color:var(--node-lit); box-shadow:0 0 14px 2px var(--glow-near),0 0 38px 9px var(--glow-far); }
  :global(.graph.learn-graph .node[data-state='understood'] .disc) { background:var(--node-understood); border-color:var(--node-understood); color:var(--accent-ink); }
  :global(.graph.learn-graph .node[data-state='understood'][data-understood='self'] .disc) { background:var(--bg); border-width:2px; color:var(--node-understood); }
  :global(.graph.learn-graph .node[data-state='dismissed']) { opacity:.35; }
  :global(.graph.learn-graph .node[data-state='dismissed'] .disc) { border-style:dotted; box-shadow:none; }
  :global(.graph.learn-graph .node:not([data-state='open']):hover .disc) { border-color:var(--focus); }
</style>
