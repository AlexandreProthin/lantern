<script lang="ts">
  // Choose's graph: the shared graph (ui/graph) with the recipe's node look (CR-20, CR-21), legend, menu and accessible names.
  import type { ChooseSession } from '../session';
  import Graph from '../../../ui/graph/Graph.svelte';
  import type { GraphRoomView, GraphSession, MenuAction } from '../../../ui/graph/types';
  import type { GraphNode } from '../../../core/model';
  import type { Settings } from '../../../frame/settings';
  import type { LibrarySpaces } from '../../../frame/library-spaces';
  import { answerOf, kindOf, rejectedOf } from '../rules';
  import { nodeActions, runAction } from './actions';
  import type { ActionId } from './actions';
  import { BADGE_OF, LOOK, glyphState } from './kinds';
  import { kindDescriptions, kindNames, t } from './strings';
  import { reducedMotion } from './motion';
  import NodeGlyph from './NodeGlyph.svelte';
  import Pictogram from './Pictogram.svelte';
  import BadgeGlyph from './BadgeGlyph.svelte';

  let { session, revision, settings, preferencesChanged, visible = true, library, linkPreview = null, openInPanel, reject }: {
    session: ChooseSession; revision: number; settings: Settings; preferencesChanged: () => void; visible?: boolean; library?: LibrarySpaces; linkPreview?: string | null;
    openInPanel: (kind: 'own' | 'delete', nodeId: string) => void; reject: (nodeId: string) => void;
  } = $props();
  const reduced = () => reducedMotion(settings);
  /** The graph sees the main lane only; a `light` on a need or criterion explains and grows nothing (CP-10). */
  const graphSession: GraphSession = {
    get subject() { return session.subject; }, get visit() { return session.visit; },
    get running() { const r = session.running; return r ? { nodeId: r.nodeId, task: r.task === 'light' && ['need', 'criterion'].includes(session.visit.nodes[r.nodeId]?.kind) ? 'explain' : r.task, controller: r.controller } : null; },
    setFocus: id => session.setFocus(id), busy: id => session.busy(id),
  };
  const room: GraphRoomView = {
    className: 'choose-graph',
    scene: { spawnTasks: ['intro', 'light', 'more', 'find'], ghost: { kind: 'concept', state: 'open' } },
    dataAttrs: n => ({ 'data-kind': n.kind, 'data-look': LOOK[glyphState(n, session.visit)] }),
    labelExtra: (n: GraphNode) => {
      const answer = answerOf(n), rejected = rejectedOf(n);
      return (n.id === session.visit.rootId ? ` · ${glyphState(n, session.visit)}` : '') + (answer ? t.answeredWith(answer.text) : '') + (rejected ? t.rejectedBecause(rejected.reason) : '');
    },
    tooltipExtra: (n: GraphNode) => { const rejected = rejectedOf(n); return rejected ? t.rejectedBecause(rejected.reason) : ''; },
    quiet: n => n.state === 'dismissed' || n.state === 'rejected',
    lights: n => n.state === 'lit' || n.state === 'chosen',
    untitled: t.untitled,
    menuActions: (visit, node) => nodeActions(visit, node, session.running, session.useWeb()),
    runMenuAction(action: MenuAction, nodeId) {
      if (action.toPanel) openInPanel(action.id as 'own' | 'delete', nodeId);
      else if (action.id === 'reject') reject(nodeId);
      else try { runAction(session, action.id as ActionId, nodeId); } catch (e) { console.warn(String(e)); }
    },
    enter(nodeId) {
      const n = session.visit.nodes[nodeId];
      if (n && ['concept', 'own'].includes(kindOf(n)) && n.state === 'open' && !session.running) { void session.run('light', nodeId); return true; }
      return false;
    },
  };
  const kindRows = Object.keys(kindNames);
</script>
{#snippet glyph(n: { id: string; kind: string; state: string; pending?: string })}
  <NodeGlyph kind={n.kind} shown={glyphState(n, session.visit)} pending={!!n.pending} {reduced} />
{/snippet}
{#snippet legend()}
  <span class="rows kinds" role="group" aria-label={t.legendKinds}>
    {#each kindRows as kind (kind)}<span title={kindDescriptions[kind]}><i class="key kind"><Pictogram {kind} /></i>{kindNames[kind]}</span>{/each}
  </span>
  <span class="rows states" role="group" aria-label={t.legendStates}>
    {#each t.legendRows as row (row.state)}<span><i class="key" data-look={LOOK[row.state]} data-state={row.state}>{#if BADGE_OF[row.state]}<BadgeGlyph badge={BADGE_OF[row.state]!} />{/if}</i>{row.label}</span>{/each}
  </span>
{/snippet}
<Graph session={graphSession} {room} {glyph} {legend} {revision} {settings} {preferencesChanged} {visible} {library} {linkPreview} />
<style>
  .rows { display:contents; }
  .key { display:inline-flex; align-items:center; justify-content:center; width:16px; height:16px; margin-right:6px; vertical-align:-3px; border-radius:50%; border:1px solid var(--node-open); box-sizing:border-box; color:var(--node-open); }
  .key.kind { border:0; width:16px; height:16px; } .key.kind :global(.k) { width:16px; height:16px; }
  .key :global(svg) { width:9px; height:9px; }
  .key[data-look='open'] { border-style:dotted; }
  .key[data-look='lit'] { background:var(--surface-2); border-color:var(--node-lit); color:var(--node-lit); box-shadow:0 0 6px 1px var(--glow-near); }
  .key[data-look='settled'] { background:var(--node-understood); border-color:var(--node-understood); color:var(--accent-ink); }
  .key[data-look='quiet'] { border-color:var(--line); color:var(--ink-mute); }
  .key[data-look='faded'] { border-style:dashed; opacity:.5; }
  .key[data-state='chosen'] { box-shadow:0 0 0 2px var(--bg), 0 0 0 3px var(--focus); }
  /* The disc: Learn's 44 px circle (the subject 54 px); the look is drawn by NodeGlyph's layers (CR-21). */
  :global(.graph.choose-graph .node:not([data-pending]) .disc) { border-color:transparent; }
  :global(.graph.choose-graph .node[data-kind='subject']) { transform:translate(-50%, -35px); }
  :global(.graph.choose-graph .node[data-kind='subject'] .disc) { width:54px; height:54px; }
  :global(.graph.choose-graph .node[data-kind='subject'] .name) { font-weight:600; }
  :global(.graph.choose-graph .node[data-state='chosen'][aria-pressed='true'] .disc) { outline-offset:10px; }
  :global(.graph.choose-graph .node:not([data-state='open']):not([data-pending]):hover .layer) { border-color:var(--focus); }
  /* Faded looks keep the title muted; dismissed is struck through (CR-21), at most 35 % opacity (GV). */
  :global(.graph.choose-graph .node[data-look='faded']) { opacity:.35; }
  :global(.graph.choose-graph .node[data-look='faded'] .name), :global(.graph.choose-graph .node[data-look='quiet'] .name) { color:var(--ink-mute); }
  :global(.graph.choose-graph .node[data-state='dismissed'] .name) { text-decoration:line-through; text-decoration-color:var(--ink-mute); }
  :global(.graph.choose-graph .node[data-state='dismissed'] .disc) { box-shadow:none; }
</style>
