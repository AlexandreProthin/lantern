<script lang="ts">
  import { onMount } from 'svelte';
  import { treePositions } from '../../core/layout';
  import { shownIds } from '../../core/visibility';
  import { opensChildren } from './rules';
  import type { SubjectSummary } from '../../frame/catalogue';
  import type { LibrarySpaces, ThumbnailGraph } from '../../frame/library-spaces';
  import { strings } from '../../ui/strings';
  let { summary, library }: { summary: SubjectSummary; library: LibrarySpaces } = $props();
  let host: HTMLDivElement, visible = $state(false), loaded = $state<ThumbnailGraph | null>(null), failed = $state(false);
  // WG-40, GV-120: only the nodes shown by progress; a prepared course does not give itself away.
  const graph = $derived.by(() => { if (!loaded) return null; const shown = shownIds(loaded, opensChildren); return { ...loaded, nodes: Object.fromEntries(Object.entries(loaded.nodes).filter(([id]) => shown.has(id))) }; });
  /** WG-40: the tree as in Study; a tree with too many rows for a 16:9 frame (a prepared course) is drawn around its root instead of as a thin column. */
  const RADIAL_ROWS = 16;
  const points = $derived.by(() => {
    if (!graph || !Object.keys(graph.nodes).length) return new Map<string, { x: number; y: number }>();
    const unit = treePositions(graph, 1, 1), ps = [...unit.values()];
    const minX = Math.min(...ps.map(p => p.x)), depth = Math.max(...ps.map(p => p.x)) - minX, minY = Math.min(...ps.map(p => p.y)), rows = Math.max(...ps.map(p => p.y)) - minY + 1;
    if (rows <= RADIAL_ROWS || !depth) return treePositions(graph, 40, 18);
    const ring = Math.max(16, rows * 6 / (2 * Math.PI * depth * 1.25));
    return new Map([...unit].map(([id, p]) => { const a = (p.y - minY) / rows * 2 * Math.PI - Math.PI / 2, r = (p.x - minX) * ring; return [id, { x: Math.cos(a) * r * 1.5, y: Math.sin(a) * r }]; }));
  });
  const bounds = $derived.by(()=>{
    const ps=[...points.values()]; if(!ps.length)return '-80 -45 160 90';
    const xs=ps.map(p=>p.x),ys=ps.map(p=>p.y),width=Math.max(40,Math.max(...xs)-Math.min(...xs)+16),height=Math.max(22.5,Math.max(...ys)-Math.min(...ys)+16);
    return `${(Math.min(...xs)+Math.max(...xs))/2-Math.max(width,height*16/9)/2} ${(Math.min(...ys)+Math.max(...ys))/2-Math.max(height,width*9/16)/2} ${Math.max(width,height*16/9)} ${Math.max(height,width*9/16)}`;
  });
  $effect(()=>{if(!visible)return; const snapshot=summary;let live=true;failed=false;
    void library.thumbnail(snapshot).then(g=>{if(live)loaded=g;}).catch(()=>{if(live){loaded=null;failed=true;}});
    return ()=>{live=false;};
  });
  onMount(()=>{const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){visible=true;observer.disconnect();}});observer.observe(host);return ()=>observer.disconnect();});
</script>
<div class="thumbnail" bind:this={host}>
  <svg viewBox={bounds} role="img" aria-label={strings.thumbnail}>
    {#if graph}{#each Object.values(graph.nodes) as node}{@const p=points.get(node.id)}{@const parent=points.get(node.parents[0])}
      {#if p && parent}<line x1={parent.x} y1={parent.y} x2={p.x} y2={p.y} />{/if}
    {/each}{#each Object.values(graph.nodes) as node}{@const p=points.get(node.id)}
      {#if p}<circle data-thumb-node={node.id} data-root={node.id===graph.rootId} cx={p.x} cy={p.y} r="3" class={node.state} />{/if}
    {/each}{/if}
  </svg>
  {#if graph?.omitted}<span class="overflow">+{graph.omitted}</span>{/if}
  {#if failed}<span class="failed">{strings.thumbnailFailed}</span>{/if}
</div>
<style>
  .thumbnail{position:relative;aspect-ratio:16/9;width:100%;background:color-mix(in srgb,var(--bg) 55%,transparent);border-radius:var(--radius);overflow:hidden}svg{display:block;width:100%;height:100%}line{stroke:var(--path-muted);stroke-width:1}circle{stroke-width:1}.open{fill:var(--bg);stroke:var(--node-open);stroke-dasharray:1.2 1.5}.lit{fill:var(--surface-2);stroke:var(--node-lit)}.understood{fill:var(--node-understood);stroke:var(--node-understood)}.overflow{position:absolute;right:8px;bottom:5px;font-size:11px;color:var(--ink-mute)}.failed{position:absolute;inset:0;display:grid;place-items:center;font-size:11px;color:var(--ink-mute)}
</style>
