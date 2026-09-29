<script lang="ts">
  import {
    forceCollide,
    forceLink,
    forceManyBody,
    forceSimulation,
    forceX,
    forceY,
    type SimulationLinkDatum,
    type SimulationNodeDatum
  } from 'd3-force';
  import { select } from 'd3-selection';
  import { zoom, zoomIdentity, type ZoomTransform } from 'd3-zoom';
  import { onMount } from 'svelte';
  import type { Session } from './session.svelte';

  let { session }: { session: Session } = $props();

  interface SimNode extends SimulationNodeDatum {
    id: string;
  }
  type SimLink = SimulationLinkDatum<SimNode> & { source: SimNode; target: SimNode };

  const simNodes = new Map<string, SimNode>();
  let simLinks: SimLink[] = [];
  let tick = $state(0);
  let transform = $state<ZoomTransform>(zoomIdentity);
  let width = $state(800);
  let height = $state(600);
  let svg: SVGSVGElement;

  const sim = forceSimulation<SimNode>()
    .force('charge', forceManyBody().strength(-500))
    .force('collide', forceCollide(42))
    .force('x', forceX(0).strength(0.02))
    .force('y', forceY(0).strength(0.02))
    .alphaDecay(0.03)
    .on('tick', () => tick++);

  // Keep the simulation in step with the subject's nodes. New nodes spawn next to their parent.
  $effect(() => {
    const nodes = Object.values(session.subject.nodes);
    let changed = false;
    for (const n of nodes) {
      if (simNodes.has(n.id)) continue;
      const p = n.parentId ? simNodes.get(n.parentId) : undefined;
      const a = Math.random() * Math.PI * 2;
      const sn: SimNode = { id: n.id, x: (p?.x ?? 0) + Math.cos(a) * 30, y: (p?.y ?? 0) + Math.sin(a) * 30 };
      if (n.id === session.subject.rootId) {
        sn.fx = 0;
        sn.fy = 0;
      }
      simNodes.set(n.id, sn);
      changed = true;
    }
    for (const id of [...simNodes.keys()]) {
      if (!session.subject.nodes[id]) {
        simNodes.delete(id);
        changed = true;
      }
    }
    if (!changed) return;
    simLinks = nodes
      .filter((n) => n.parentId && simNodes.has(n.parentId))
      .map((n) => ({ source: simNodes.get(n.parentId!)!, target: simNodes.get(n.id)! }));
    sim.nodes([...simNodes.values()]);
    sim.force('link', forceLink<SimNode, SimLink>(simLinks).distance(95).strength(0.8));
    sim.alpha(0.9).restart();
  });

  const view = $derived.by(() => {
    tick;
    const nodes = session.subject.nodes;
    return {
      links: simLinks.map((l) => ({
        key: `${l.source.id}-${l.target.id}`,
        x1: l.source.x ?? 0,
        y1: l.source.y ?? 0,
        x2: l.target.x ?? 0,
        y2: l.target.y ?? 0,
        lit: nodes[l.target.id]?.state !== 'open'
      })),
      nodes: [...simNodes.values()]
        .filter((sn) => nodes[sn.id])
        .map((sn) => ({ ...nodes[sn.id], x: sn.x ?? 0, y: sn.y ?? 0 }))
    };
  });

  const label = (t: string, full: boolean) => (full || t.length <= 26 ? t : `${t.slice(0, 25)}…`);

  onMount(() => {
    const z = zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.25, 3])
      .on('zoom', (e) => (transform = e.transform));
    select(svg).call(z).on('dblclick.zoom', null);
    return () => sim.stop();
  });
</script>

<div class="graph" bind:clientWidth={width} bind:clientHeight={height}>
  <svg bind:this={svg} {width} {height}>
    <defs>
      <radialGradient id="glow">
        <stop offset="0%" stop-color="var(--lantern)" stop-opacity="0.55" />
        <stop offset="100%" stop-color="var(--lantern)" stop-opacity="0" />
      </radialGradient>
    </defs>
    <g transform="translate({transform.x + width / 2},{transform.y + height / 2}) scale({transform.k})">
      {#each view.links as l (l.key)}
        <line x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} class:lit={l.lit} />
      {/each}
      {#each view.nodes as n (n.id)}
        {@const r = n.kind === 'subject' ? 18 : n.kind === 'axis' ? 13 : 10}
        {@const focused = n.id === session.subject.focusId}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <g
          class="node {n.state}"
          class:focused
          class:busy={session.busy(n.id)}
          class:branch={n.kind === 'question'}
          transform="translate({n.x},{n.y})"
          onclick={() => session.setFocus(n.id)}
          role="button"
          tabindex="-1"
        >
          {#if n.state !== 'open'}<circle class="halo" r={r * (n.state === 'understood' ? 4 : 3)} />{/if}
          {#if focused}<circle class="ring" r={r + 6} />{/if}
          <circle class="core" {r} />
          {#if n.state === 'understood'}<path class="tick" d="M{-r / 2.6},0 L{-r / 9},{r / 3} L{r / 2.4},{-r / 3}" />{/if}
          <text y={r + 15}>{label(n.title, focused)}</text>
        </g>
      {/each}
    </g>
  </svg>
  <div class="legend">
    <span><i class="dot open"></i>open</span>
    <span><i class="dot lit"></i>lit</span>
    <span><i class="dot understood"></i>understood</span>
  </div>
</div>

<style>
  .graph {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
  }
  svg {
    position: absolute;
    inset: 0;
    display: block;
    cursor: grab;
  }
  svg:active {
    cursor: grabbing;
  }
  line {
    stroke: var(--line);
    stroke-width: 1.2;
    stroke-dasharray: 3 4;
  }
  line.lit {
    stroke: var(--line-lit);
    stroke-dasharray: none;
  }
  .node {
    cursor: pointer;
  }
  .node .halo {
    fill: url(#glow);
    pointer-events: none;
  }
  .node .core {
    fill: var(--wall);
    stroke: var(--open);
    stroke-width: 1.5;
    stroke-dasharray: 2 2.5;
    transition: fill 0.4s;
  }
  .node.branch .core {
    stroke: var(--branch);
  }
  .node.lit .core {
    fill: var(--lantern);
    stroke: var(--lantern-hot);
    stroke-dasharray: none;
  }
  .node.understood .core {
    fill: var(--lantern-hot);
    stroke: #fff6dc;
    stroke-width: 2;
    stroke-dasharray: none;
  }
  .node .tick {
    fill: none;
    stroke: var(--wall);
    stroke-width: 2.4;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .node .ring {
    fill: none;
    stroke: var(--text);
    stroke-width: 1.5;
    opacity: 0.8;
  }
  .node text {
    fill: var(--muted);
    font-size: 11.5px;
    text-anchor: middle;
    pointer-events: none;
    paint-order: stroke;
    stroke: var(--wall);
    stroke-width: 4px;
  }
  .node.lit text,
  .node.understood text,
  .node.focused text {
    fill: var(--text);
  }
  .node:hover .core {
    stroke: var(--text);
  }
  .node.busy .core {
    animation: flicker 1.1s ease-in-out infinite;
    stroke: var(--lantern);
    stroke-dasharray: none;
  }
  @keyframes flicker {
    0%,
    100% {
      fill: var(--wall);
    }
    50% {
      fill: var(--lantern);
    }
  }
  .legend {
    position: absolute;
    left: 16px;
    bottom: 12px;
    display: flex;
    gap: 14px;
    font-size: 12px;
    color: var(--muted);
  }
  .dot {
    display: inline-block;
    width: 9px;
    height: 9px;
    border-radius: 50%;
    margin-right: 5px;
    vertical-align: -1px;
  }
  .dot.open {
    border: 1.5px dashed var(--open);
  }
  .dot.lit {
    background: var(--lantern);
  }
  .dot.understood {
    background: var(--lantern-hot);
    box-shadow: 0 0 6px var(--lantern);
  }
</style>
