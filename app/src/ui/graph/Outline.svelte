<script lang="ts">
  // GV-140..144: the visit's tree as an indented list, inside the shared graph (both rooms). It draws the nodes the
  // graph would draw (visibility, collapse and filters already applied by the caller), with the room's glyph, the
  // title, and the hook on hover or focus. Keys are the graph's (the caller's `onkey`); a click focuses the node.
  import type { Snippet } from 'svelte';
  import type { GraphNode, RoomVisit } from '../../core/model';
  import type { SceneNode } from './graph-scene';
  import { strings } from '../strings';
  import Icon from '../Icon.svelte';

  let { visit, ids, children, collapsed, hidden, foldable, fold, focus, onkey, glyph, dataAttrs, labelExtra, untitled, busy, bottom = 0 }: {
    visit: RoomVisit; ids: Set<string>; children: Map<string, string[]>; collapsed: Set<string>; hidden: Map<string, number>;
    foldable: (id: string) => boolean; fold: (id: string, fold: boolean) => void; focus: (id: string) => void; onkey: (e: KeyboardEvent) => void;
    glyph: Snippet<[SceneNode]>; dataAttrs?: (node: SceneNode) => Record<string, string | undefined>; labelExtra?: (node: GraphNode) => string;
    untitled: string; busy: (id: string) => boolean; bottom?: number;
  } = $props();
  const title = (t: string) => t || untitled;
  const kids = (id: string) => (children.get(id) ?? []).filter(child => ids.has(child));
  /** The rows at the top: the root, or under *focus plus neighbours* each visible node whose parent is not (GV-143). */
  const tops = $derived(ids.has(visit.rootId) ? [visit.rootId] : Object.keys(visit.nodes).filter(id => ids.has(id) && !ids.has(visit.nodes[id].parents[0] ?? '')));
</script>

{#snippet row(id: string, depth: number)}
  {@const n = visit.nodes[id]}
  {@const below = kids(id)}
  {@const focused = id === visit.focusId}
  {@const folded = collapsed.has(id)}
  <li role="none">
    <div class="line" style:--depth={depth}>
      {#if foldable(id)}
        <button class="fold icon-button bare" tabindex="-1" aria-hidden="true" onclick={() => fold(id, !folded)}><Icon name={folded ? 'chevronRight' : 'chevronDown'} size={12} /></button>
      {:else}<span class="fold"></span>{/if}
      <button class="outline-row" role="treeitem" data-id={id} data-state={n.state} tabindex={focused ? 0 : -1}
        aria-level={depth + 1} aria-selected={focused} aria-expanded={foldable(id) ? !folded : undefined}
        aria-label="{title(n.title)} · {n.kind} · {n.state}{labelExtra?.(n) ?? ''}{hidden.get(id) ? ' · ' + strings.hiddenCount(hidden.get(id)!) : ''}"
        class:busy={busy(id)} onclick={() => focus(id)} onkeydown={onkey}>
        <span class="node glyph-cell" data-state={n.state} {...dataAttrs?.(n)} aria-hidden="true"><span class="disc">{@render glyph(n)}</span></span>
        <span class="text">
          <span class="title">{title(n.title)}{#if hidden.get(id)}<span class="count">+{hidden.get(id)}</span>{/if}</span>
          {#if n.hook}<span class="hook">{n.hook}</span>{/if}
        </span>
      </button>
    </div>
    {#if below.length}<ul role="group">{#each below as child (child)}{@render row(child, depth + 1)}{/each}</ul>{/if}
  </li>
{/snippet}

<div class="outline" style:padding-bottom="{bottom + 16}px">
  <ul role="tree" aria-label={strings.outlineLabel(title(visit.nodes[visit.rootId]?.title ?? ''))}>
    {#each tops as id (id)}{@render row(id, 0)}{/each}
  </ul>
</div>

<style>
  .outline { position:absolute; inset:0; overflow:auto; padding:56px 16px 16px; box-sizing:border-box; cursor:auto; }
  ul { list-style:none; margin:0; padding:0; }
  .line { display:flex; align-items:flex-start; gap:2px; padding-left:calc(var(--depth) * 20px); }
  .fold { flex:none; width:24px; height:32px; display:inline-flex; align-items:center; justify-content:center; padding:0; color:var(--ink-mute); }
  .outline-row { flex:1; min-width:0; display:flex; align-items:flex-start; gap:10px; text-align:left; padding:5px 10px 5px 4px; border:0; border-radius:var(--radius);
    background:none; color:var(--ink); font-weight:400; font-size:calc(14px * var(--text-scale)); line-height:1.4; max-width:640px; }
  .outline-row:hover { background:var(--hover); }
  .outline-row[aria-selected='true'] { background:color-mix(in srgb, var(--accent) 14%, transparent); }
  .outline-row[aria-selected='true'] .title { font-weight:600; }
  .outline-row:focus-visible { outline:2px solid var(--focus); outline-offset:-2px; }
  .outline-row.busy .disc { animation:pulse 1.2s ease-in-out infinite; }
  @keyframes pulse { 50% { opacity:.5; } }
  /* The room's node-state rules (`.graph.<room> .node[data-state] .disc`) colour this small disc as on the map. */
  .glyph-cell { flex:none; position:relative; display:inline-flex; transform:none !important; opacity:1; margin-top:1px; }
  .glyph-cell .disc { box-sizing:border-box; width:22px !important; height:22px !important; border-radius:50%; border:1px solid var(--node-open); background:var(--bg);
    color:var(--node-open); display:grid; place-items:center; box-shadow:none !important; overflow:visible; }
  .glyph-cell .disc :global(svg) { width:14px; height:14px; }
  .glyph-cell :global(.end-cap) { right:-5px; bottom:2px; width:8px; }
  .outline-row[data-state='dismissed'] .text { opacity:.45; }
  .text { display:flex; flex-direction:column; min-width:0; }
  .title { overflow-wrap:anywhere; }
  .count { margin-left:8px; font-size:calc(11px * var(--text-scale)); color:var(--ink-mute); }
  /* GV-141: the hook appears on hover or focus, under the title. */
  .hook { display:none; font-family:var(--font-reading); font-style:italic; font-size:calc(13px * var(--reading-scale)); color:var(--ink-mute); }
  .outline-row:hover .hook, .outline-row:focus-visible .hook, .outline-row[aria-selected='true'] .hook { display:block; }
  @media (max-width: 719px) { .outline { padding-top:64px; } .outline-row { min-height:40px; font-size:calc(16px * var(--text-scale)); } .fold { height:40px; } }
</style>
