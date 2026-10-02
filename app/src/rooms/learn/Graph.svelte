<script lang="ts">
  // The Learn room graph, styled after the final learning-node design
  // (agent_design/learningnode/RECIPE.md): uniform circle nodes with a status glyph,
  // the focused node's route to the subject in amber, and a light dot with embers
  // travelling along newly highlighted edges. Layout is physics by default, or the
  // design's left-to-right tree.
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
  import { zoom, zoomIdentity, type ZoomBehavior, type ZoomTransform } from 'd3-zoom';
  import { onMount, tick as afterUpdate, untrack } from 'svelte';
  import type { LearnSession } from './session';
  import { initialPosition, treePositions, keyboardTarget } from '../../core/layout';
  import { graphMotion } from './graphMotion';
  import { strings } from '../../ui/strings';
  import type { Settings } from '../../frame/settings';

  let { session, revision, settings, preferencesChanged, navigate = () => {}, visible = true }: { session: LearnSession; revision: number; settings: Settings; preferencesChanged: () => void; navigate?: (space: string) => void; visible?: boolean } = $props();

  interface SimNode extends SimulationNodeDatum {
    id: string;
  }
  type SimLink = SimulationLinkDatum<SimNode> & { source: SimNode; target: SimNode };
  type Layout = 'force' | 'tree';

  const COL = 240;
  const ROW = 96;
  const DISC = 44;

  const simNodes = new Map<string, SimNode>();
  let simLinks: SimLink[] = [];
  let tick = $state(0);
  let transform = $state<ZoomTransform>(zoomIdentity);
  let width = $state(800);
  let height = $state(600);
  const layout = $derived<Layout>(settings.ui.graphLayout === 'tree' || Object.keys(session.visit.nodes).length > 800 ? 'tree' : 'force');
  let host: HTMLDivElement;
  let edgesSvg: SVGSVGElement;
  let zoomer: ZoomBehavior<HTMLDivElement, unknown>;

  const sim = forceSimulation<SimNode>()
    .alphaDecay(0.03)
    .on('tick', () => tick++);

  function childrenOf(id: string): string[] {
    return Object.values(session.visit.nodes)
      .filter((n) => n.parents[0] === id)
      .map((n) => n.id);
  }

  /** The design's tree: depth columns, leaves on rows, parents centred on their children. */
  function treeTargets(): Map<string, { x: number; y: number }> {
    return treePositions(session.visit);
  }

  function applyLayout() {
    const root = simNodes.get(session.visit.rootId);
    sim.nodes([...simNodes.values()]);
    if (layout === 'tree') {
      const t = treeTargets();
      if (root) root.fx = root.fy = null;
      sim
        .force('charge', null)
        .force('collide', null)
        .force('link', null)
        .force('x', forceX<SimNode>((d) => t.get(d.id)?.x ?? 0).strength(0.2))
        .force('y', forceY<SimNode>((d) => t.get(d.id)?.y ?? 0).strength(0.2));
    } else {
      if (root) {
        root.fx = 0;
        root.fy = 0;
      }
      sim
        .force('charge', forceManyBody().strength(graphMotion.charge))
        .force('collide', forceCollide(graphMotion.collide))
        .force('link', forceLink<SimNode, SimLink>(simLinks).distance(graphMotion.linkDistance).strength(0.8))
        .force('x', forceX(0).strength(0.02))
        .force('y', forceY(0).strength(0.02));
    }
    if (motionReduced()) { sim.stop(); sim.alpha(1); for (let i=0;i<300;i++) sim.tick(); tick++; }
    else if (visible) sim.alpha(0.9).restart();
  }

  // Keep the simulation in step with the subject's nodes. New nodes spawn next to their parent.
  $effect(() => {
    revision;
    const nodes = Object.values(session.visit.nodes);
    let changed = false;
    for (const n of nodes) {
      if (simNodes.has(n.id)) continue;
      const p = n.parents[0] ? simNodes.get(n.parents[0]) : undefined;
      const a = Math.atan2(initialPosition(n.id).y, initialPosition(n.id).x);
      simNodes.set(n.id, { id: n.id, x: (p?.x ?? 0) + Math.cos(a) * 30, y: (p?.y ?? 0) + Math.sin(a) * 30 });
      changed = true;
    }
    for (const id of [...simNodes.keys()]) {
      if (!session.visit.nodes[id]) {
        simNodes.delete(id);
        changed = true;
      }
    }
    if (!changed) return;
    simLinks = nodes
      .filter((n) => n.parents[0] && simNodes.has(n.parents[0]))
      .map((n) => ({ source: simNodes.get(n.parents[0]!)!, target: simNodes.get(n.id)! }));
    untrack(applyLayout);
  });

  $effect(() => {
    const l = layout;
    settings.appearance.reduceMotion;
    untrack(applyLayout);
  });

  /** The focused node and its ancestors up to the subject. */
  function routeOf(id: string): Set<string> {
    const ids = new Set<string>();
    let cur: string | null = id;
    while (cur && session.visit.nodes[cur] && !ids.has(cur)) {
      ids.add(cur);
      cur = session.visit.nodes[cur].parents[0];
    }
    return ids;
  }
  const route = $derived.by(() => { revision; return routeOf(session.visit.focusId); });

  const view = $derived.by(() => {
    tick; revision;
    const nodes = session.visit.nodes;
    const tree = layout === 'tree';
    return {
      edges: simLinks.map((l) => {
        const x1 = l.source.x ?? 0,
          y1 = l.source.y ?? 0,
          x2 = l.target.x ?? 0,
          y2 = l.target.y ?? 0;
        const mx = (x1 + x2) / 2;
        return {
          id: l.target.id,
          d: tree ? `M${x1} ${y1} C${mx} ${y1} ${mx} ${y2} ${x2} ${y2}` : `M${x1} ${y1} L${x2} ${y2}`,
          onRoute: route.has(l.target.id)
        };
      }),
      nodes: [...simNodes.values()]
        .filter((sn) => nodes[sn.id])
        .map((sn) => ({ ...nodes[sn.id], x: sn.x ?? 0, y: sn.y ?? 0 }))
    };
  });

  const title = (t: string) => t || strings.untitledQuestion;

  // ---- Back / reset -------------------------------------------------------------------

  let backStack = $state<string[]>([]);
  let prevFocus = untrack(() => session.visit.focusId);
  let goingBack = false;

  $effect(() => {
    revision;
    const f = session.visit.focusId;
    untrack(() => {
      if (f === prevFocus) return;
      if (!goingBack) backStack.push(prevFocus);
      goingBack = false;
      prevFocus = f;
    });
  });

  function back() {
    let id: string | undefined;
    while ((id = backStack.pop()) && !session.visit.nodes[id]);
    if (!id || id === session.visit.focusId) return;
    goingBack = true;
    session.setFocus(id);
  }

  function reset() {
    const positions = [...simNodes.values()]; if (!positions.length || !zoomer || width < 100 || height < 100) return;
    const minX = Math.min(...positions.map(n => (n.x ?? 0)-75)), maxX = Math.max(...positions.map(n => (n.x ?? 0)+75));
    const minY = Math.min(...positions.map(n => (n.y ?? 0)-30)), maxY = Math.max(...positions.map(n => (n.y ?? 0)+95));
    const scale = Math.max(.1, Math.min(1, (width-96)/(maxX-minX), (height-96)/(maxY-minY)));
    select(host).call(zoomer.transform, zoomIdentity.translate(-(minX+maxX)/2*scale, -(minY+maxY)/2*scale).scale(scale));
  }

  // ---- Motion: a light dot travels outward along newly highlighted edges -------------

  const comet = graphMotion.route;
  const BURST = graphMotion.BURST;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const motionReduced = () => reducedMotion.matches || settings.appearance.reduceMotion === 'on';
  const ns = 'http://www.w3.org/2000/svg';
  let travelFrame = 0;
  let traveler: SVGGElement | null = null;
  const nodeGlows = new Set<Animation>();

  function stopTravel() {
    cancelAnimationFrame(travelFrame);
    travelFrame = 0;
    traveler?.remove();
    traveler = null;
    nodeGlows.forEach((a) => a.cancel());
    nodeGlows.clear();
  }

  const disc = (id: string) => host?.querySelector<HTMLElement>(`[data-id="${id}"] .disc`);

  function pulseNode(id: string) {
    if (motionReduced() || !visible || document.hidden) return;
    const el = disc(id);
    if (!el) return;
    const style = getComputedStyle(el);
    const base = { boxShadow: style.boxShadow, borderColor: style.borderColor };
    const tokens = getComputedStyle(document.documentElement);
    const v = (name: string) => tokens.getPropertyValue(name).trim();
    const peak = {
      boxShadow: `0 0 20px 5px ${v('--glow-near')},0 0 46px 11px ${v('--glow-far')}`,
      borderColor: v('--node-lit'),
      offset: 0.28
    };
    const a = el.animate([{ ...base, offset: 0 }, peak, { ...base, offset: 1 }], {
      duration: comet.glow,
      easing: 'ease-out'
    });
    nodeGlows.add(a);
    a.onfinish = a.oncancel = () => nodeGlows.delete(a);
  }

  interface Segment {
    id: string;
    edge: SVGPathElement;
    start: number;
    end: number;
    duration: number;
  }
  interface Particle {
    el: SVGGElement;
    x: number;
    y: number;
    born: number;
    life: number;
    vx: number;
    vy: number;
    bright: number;
  }

  // Edges can move while the dot travels (physics layout), so positions are sampled
  // from the live path each frame as a fraction of its current length.
  function pointAt(edge: SVGPathElement, t: number) {
    const len = edge.getTotalLength();
    const d = t * len;
    const p = edge.getPointAtLength(d);
    const a = edge.getPointAtLength(Math.max(0, d - 1));
    const b = edge.getPointAtLength(Math.min(len, d + 1));
    const l = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    return { x: p.x, y: p.y, tx: (b.x - a.x) / l, ty: (b.y - a.y) / l };
  }

  function travel(ids: string[]) {
    stopTravel();
    if (motionReduced() || !visible || document.hidden || !ids.length || !edgesSvg) return;
    let time = 0;
    const raw = ids
      .map((id) => edgesSvg.querySelector<SVGPathElement>(`[data-edge="${id}"]`))
      .filter((e): e is SVGPathElement => !!e && e.getTotalLength() > 0);
    if (!raw.length) return;
    const timeline: Segment[] = raw.map((edge, i) => {
      const duration = Math.max(160, Math.min(650, (edge.getTotalLength() / comet.speed) * 1000));
      const start = time;
      const end = start + duration;
      time = end + (i < raw.length - 1 ? comet.pause : 0);
      return { id: edge.dataset.edge!, edge, start, end, duration };
    });

    // Passing glow just before each crossing; one ember fan per traversed node.
    const glowCues: { id: string; at: number }[] = [];
    const burstCues: { id: string; at: number; seg: Segment; t: number }[] = [];
    const seenGlow = new Set<string>();
    const seenBurst = new Set<string>();
    for (const seg of timeline) {
      const source = session.visit.nodes[seg.id]?.parents[0];
      if (source && !seenGlow.has(source)) glowCues.push({ id: source, at: seg.start });
      if (!seenGlow.has(seg.id)) glowCues.push({ id: seg.id, at: Math.max(seg.start, seg.end - 45) });
      if (source) seenGlow.add(source);
      seenGlow.add(seg.id);
      for (const [id, at, t] of [
        [source, seg.start, 0],
        [seg.id, seg.end, 1]
      ] as const) {
        if (!id || seenBurst.has(id)) continue;
        burstCues.push({ id, at, seg, t });
        seenBurst.add(id);
      }
    }

    const layer = document.createElementNS(ns, 'g');
    layer.setAttribute('class', 'traveler');
    layer.setAttribute('aria-hidden', 'true');
    const dust = document.createElementNS(ns, 'g');
    const head = document.createElementNS(ns, 'g');
    head.innerHTML =
      '<circle r="16" fill="var(--glow-far)"/><circle r="9" fill="var(--glow-near)"/><circle r="3" fill="var(--node-lit)"/>';
    layer.append(dust, head);
    traveler = layer;
    edgesSvg.append(layer);

    let trail: Particle[] = [];
    let embers: Particle[] = [];
    let started: number | null = null;
    let lastEmission = -Infinity;
    let serial = 0;
    let glowIndex = 0;
    let burstIndex = 0;

    function particle(small: boolean) {
      const el = document.createElementNS(ns, 'g');
      el.setAttribute('class', 'comet-dust');
      el.innerHTML = `<circle r="3" fill="var(--glow-near)"/><circle r="${small ? 0.7 : 1.15}" fill="var(--node-lit)"/>`;
      dust.append(el);
      return el;
    }

    function emitTrail(p: ReturnType<typeof pointAt>, elapsed: number) {
      if (trail.length >= comet.cap) return;
      serial++;
      // Deterministic, sparse scatter keeps repeated runs consistent.
      const scatter = Math.sin(serial * 2.39996);
      const variation = (Math.sin(serial * 7.13) + 1) / 2;
      trail.push({
        el: particle(serial % 4 !== 0),
        x: p.x,
        y: p.y,
        born: elapsed,
        life: comet.lifeMin + (comet.lifeMax - comet.lifeMin) * variation,
        vx: -p.tx * 24 - p.ty * scatter * comet.drift,
        vy: -p.ty * 24 + p.tx * scatter * comet.drift,
        bright: serial % 4 === 0 ? 0.65 : 0.4
      });
    }

    function emitNode(cue: (typeof burstCues)[number], elapsed: number) {
      const sn = simNodes.get(cue.id);
      if (!sn) return;
      const dir = pointAt(cue.seg.edge, cue.t);
      const heading = Math.atan2(dir.ty, dir.tx);
      // Begin at the rim so the opaque circle does not hide the emission.
      const radius = DISC / 2 + 2;
      for (let i = 0; i < BURST; i++) {
        const variation = (Math.sin((i + 1) * 7.13) + 1) / 2;
        const angle = heading + (i / (BURST - 1) - 0.5) * Math.PI * 1.4;
        const speed = 28 + variation * 38;
        embers.push({
          el: particle(i % 4 !== 0),
          x: (sn.x ?? 0) + Math.cos(angle) * radius,
          y: (sn.y ?? 0) + Math.sin(angle) * radius,
          born: elapsed,
          life: comet.lifeMin + (comet.lifeMax - comet.lifeMin) * variation,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          bright: i % 4 === 0 ? 0.65 : 0.4
        });
      }
    }

    function paint(list: Particle[], elapsed: number) {
      return list.filter((p) => {
        const age = elapsed - p.born;
        if (age >= p.life) {
          p.el.remove();
          return false;
        }
        const t = age / p.life;
        p.el.setAttribute(
          'transform',
          `translate(${p.x + (p.vx * age) / 1000} ${p.y + (p.vy * age) / 1000}) scale(${1 - t * 0.65})`
        );
        p.el.setAttribute(
          'opacity',
          String(p.bright * Math.min(1, t / 0.15) * (1 - t) ** 1.8 * (0.85 + 0.15 * Math.sin(Math.PI * t * 4)))
        );
        return true;
      });
    }

    function sample(elapsed: number) {
      for (let i = 0; i < timeline.length; i++) {
        const s = timeline[i];
        if (elapsed <= s.end) return { seg: s, t: Math.max(0, (elapsed - s.start) / s.duration), moving: elapsed >= s.start };
        if (i < timeline.length - 1 && elapsed < timeline[i + 1].start) return { seg: s, t: 1, moving: false };
      }
      return null;
    }

    function frame(now: number) {
      if (traveler !== layer) return;
      if (motionReduced() || !visible || document.hidden || !layer.isConnected) return stopTravel();
      if (started === null) started = now;
      const elapsed = now - started;
      while (glowIndex < glowCues.length && elapsed >= glowCues[glowIndex].at) pulseNode(glowCues[glowIndex++].id);
      while (burstIndex < burstCues.length && elapsed >= burstCues[burstIndex].at) emitNode(burstCues[burstIndex++], elapsed);
      const s = sample(elapsed);
      if (s) {
        const p = pointAt(s.seg.edge, s.t);
        head.setAttribute('transform', `translate(${p.x} ${p.y})`);
        if (s.moving && elapsed - lastEmission >= comet.emitEvery) {
          emitTrail(p, elapsed);
          lastEmission = elapsed;
        }
      } else head.setAttribute('opacity', '0');
      trail = paint(trail, elapsed);
      embers = paint(embers, elapsed);
      // Let the arrival glow and remaining particles finish, then release everything.
      if (!s && !trail.length && !embers.length && !nodeGlows.size) return stopTravel();
      travelFrame = requestAnimationFrame(frame);
    }
    const first = pointAt(timeline[0].edge, 0);
    head.setAttribute('transform', `translate(${first.x} ${first.y})`);
    travelFrame = requestAnimationFrame(frame);
  }

  // Only a change of focus that lights new edges plays the effect. The initial display,
  // re-selecting a node, or returning to an ancestor already on the route do not.
  let lastRoute = untrack(() => route);
  $effect(() => {
    const r = route;
    untrack(() => {
      const ids = [...r].reverse().filter((id) => session.visit.nodes[id]?.parents[0] && !lastRoute.has(id));
      lastRoute = r;
      if (ids.length) afterUpdate().then(() => requestAnimationFrame(() => travel(ids)));
    });
  });

  $effect(() => { settings.appearance.reduceMotion; if (motionReduced()) untrack(stopTravel); });
  $effect(() => { if (!visible) { sim.stop(); stopTravel(); } else if (sim.alpha() > sim.alphaMin() && !motionReduced()) sim.restart(); });
  function onNodeKey(e: KeyboardEvent) {
    const target = keyboardTarget(session.visit, session.visit.focusId, e.key);
    if (['Home','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)) {
      e.preventDefault(); session.setFocus(target); afterUpdate().then(() => host.querySelector<HTMLButtonElement>(`[data-id="${target}"]`)?.focus());
    } else if (e.key === 'Enter') {
      e.preventDefault(); if (session.focus.state === 'open' && !session.running) void session.run('light', session.visit.focusId);
      else document.querySelector<HTMLElement>('.panel textarea')?.focus();
    }
  }
  onMount(() => {
    zoomer = zoom<HTMLDivElement, unknown>()
      .scaleExtent([0.1, 3])
      .on('zoom', (e) => (transform = e.transform));
    select(host).call(zoomer).on('dblclick.zoom', null);
    const onMotion = () => { if (motionReduced()) stopTravel(); applyLayout(); };
    const initialFit = setTimeout(reset, 500);
    const onVisibility = () => document.hidden && stopTravel();
    reducedMotion.addEventListener('change', onMotion);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearTimeout(initialFit);
      sim.stop();
      stopTravel();
      reducedMotion.removeEventListener('change', onMotion);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  });
</script>

<div class="graph" bind:this={host} bind:clientWidth={width} bind:clientHeight={height}>
  <div
    class="world"
    style="transform: translate({transform.x + width / 2}px, {transform.y + height / 2}px) scale({transform.k})"
  >
    <!-- Edges sit under the nodes: the opaque circles cut the lines at their rims. -->
    <svg class="edges" bind:this={edgesSvg} aria-hidden="true">
      {#each view.edges as e (e.id)}
        <path data-edge={e.id} d={e.d} class:route={e.onRoute} />
      {/each}
    </svg>
    {#each view.nodes as n (n.id)}
      {@const focused = n.id === session.visit.focusId}
      {@const busy = session.busy(n.id)}
      <button
        tabindex={focused ? 0 : -1}
        onkeydown={onNodeKey}
        class="node"
        class:busy
        class:muted={!route.has(n.id)}
        data-id={n.id}
        data-state={n.state}
        data-understood={n.understoodBy}
        style="left: {n.x}px; top: {n.y}px"
        aria-pressed={focused}
        aria-label="{title(n.title)} · {n.kind === 'question' ? 'branch · ' : ''}{n.state}{busy ? ' · preparing' : ''}"
        title="{title(n.title)} · {n.state}"
        onclick={() => session.setFocus(n.id)}
      >
        <span class="disc">
          <svg class="status" viewBox="0 0 18 18" aria-hidden="true">
            {#if n.state === 'understood'}
              <path d="m3 9 4 4 8-9" fill="none" stroke="currentColor" stroke-width="1.5" />
            {:else if n.kind === 'question'}
              <path d="M9 4 14 9 9 14 4 9Z" fill={n.state === 'lit' ? 'currentColor' : 'none'} stroke="currentColor" />
            {:else}
              <circle cx="9" cy="9" r="4" fill={n.state === 'lit' ? 'currentColor' : 'none'} stroke="currentColor" />
            {/if}
          </svg>
        </span>
        <span class="name">{title(n.title)}</span>
      </button>
    {/each}
  </div>

  <nav class="controls" aria-label={strings.graphNavigation}>
    <button onclick={() => navigate('welcome')} aria-label={strings.welcome} title={strings.welcome}>⌂</button>
    <button onclick={() => navigate('gallery')} aria-label={strings.gallery} title={strings.gallery}>▦</button>
    <button onclick={back} disabled={!backStack.length} aria-label={strings.previousView} title={strings.previousView}>
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" aria-hidden="true"><path d="m7 3-5 5 5 5M2 8h12" /></svg>
    </button>
  </nav>
  <nav class="controls layout-controls">
    <button
      onclick={() => { settings.ui.graphLayout = layout === 'force' ? 'tree' : 'free'; preferencesChanged(); }}
      aria-label={layout === 'force' ? 'Tree layout' : 'Free layout'}
      title={layout === 'force' ? 'Tree layout' : 'Free layout'}
    >
      {#if layout === 'force'}
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" aria-hidden="true">
          <circle cx="3" cy="8" r="1.6" /><circle cx="13" cy="3.5" r="1.6" /><circle cx="13" cy="12.5" r="1.6" />
          <path d="M4.6 8C8 8 8 3.5 11.4 3.5M4.6 8C8 8 8 12.5 11.4 12.5" />
        </svg>
      {:else}
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" aria-hidden="true">
          <circle cx="8" cy="8" r="1.6" /><circle cx="3" cy="3.5" r="1.6" /><circle cx="13.5" cy="5" r="1.6" /><circle cx="5" cy="13" r="1.6" />
          <path d="m6.8 6.8-2.6-2.2M9.6 7.5l2.4-1.5M7 9.4l-1.2 2.2" />
        </svg>
      {/if}
    </button>
  </nav>

  <nav class="zoom-controls">
    <button onclick={reset} aria-label={strings.recenter} title={strings.recenter}>⌖</button>
    <button onclick={() => select(host).call(zoomer.scaleBy, 1.2)} aria-label={strings.zoomIn} title={strings.zoomIn}>+</button>
    <button onclick={() => select(host).call(zoomer.scaleBy, 1/1.2)} aria-label={strings.zoomOut} title={strings.zoomOut}>−</button>
  </nav>
  <div class="legend">
    <button aria-expanded={!settings.ui.legendCollapsed} onclick={() => { settings.ui.legendCollapsed = !settings.ui.legendCollapsed; preferencesChanged(); }}>{strings.legend}</button>
    {#if !settings.ui.legendCollapsed}
      <span><i class="key" data-state="open"></i>{strings.openState}</span>
      <span><i class="key" data-state="lit"></i>{strings.litState}</span>
      <span><i class="key" data-state="understood"></i>{strings.demonstratedState}</span>
      <span><i class="key self"></i>{strings.selfState}</span>
      <span><i class="key dismissed"></i>{strings.dismissedState}</span>
      <span><i class="key branch"></i>{strings.branchState}</span>
      <label><input type="checkbox" bind:checked={settings.ui.textLinks} onchange={preferencesChanged} />{strings.textLinks}</label>
    {/if}
  </div>
</div>

<style>
  .graph {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
    cursor: grab;
    background: var(--bg);
    font-family: system-ui, sans-serif;
  }
  .graph:active {
    cursor: grabbing;
  }
  .world {
    position: absolute;
    left: 0;
    top: 0;
    transform-origin: 0 0;
  }
  .edges {
    position: absolute;
    left: 0;
    top: 0;
    width: 1px;
    height: 1px;
    overflow: visible;
    pointer-events: none;
  }
  .edges path {
    fill: none;
    stroke: var(--path-muted);
    stroke-width: 1;
  }
  .edges path.route {
    stroke: var(--accent);
  }
  :global(.comet-dust) {
    filter: drop-shadow(0 0 2px var(--glow-near));
  }

  .node {
    position: absolute;
    width: 150px;
    padding: 8px;
    margin: 0;
    background: none;
    border: 0;
    border-radius: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
    /* The disc centre sits on the node's coordinates. */
    transform: translate(-50%, -30px);
    color: inherit;
  }
  .node:hover:not(:disabled) {
    background: none;
  }
  .node:focus-visible {
    outline: none;
  }
  .disc {
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    flex-shrink: 0;
    border: 1px solid var(--node-open);
    border-radius: 50%;
    background: var(--bg);
    color: var(--node-open);
    position: relative;
  }
  .status {
    display: block;
    width: 18px;
    height: 18px;
  }
  .name {
    display: block;
    font-size: 13px;
    line-height: 1.5;
    font-weight: 400;
    text-align: center;
    overflow-wrap: anywhere;
    max-width: 100%;
    color: var(--ink); display:-webkit-box; -webkit-line-clamp:3; line-clamp:3; -webkit-box-orient:vertical; overflow:hidden;
  }
  .node.muted .name {
    color: var(--ink-mute);
  }
  .node:hover .name {
    text-decoration: underline;
    text-underline-offset: 4px;
  }

  .node[data-state='open'] .disc {
    border-style: dotted;
  }
  .node[data-state='lit'] .disc {
    background: var(--surface-2);
    border-color: var(--node-lit);
    color: var(--node-lit);
    box-shadow:
      0 0 14px 2px var(--glow-near),
      0 0 38px 9px var(--glow-far);
  }
  .node[data-state='understood'] .disc {
    background: var(--node-understood);
    border-color: var(--node-understood);
    color: var(--accent-ink);
  }
  .node[data-state='understood'][data-understood='self'] .disc { background:var(--bg); border-width:2px; color:var(--node-understood); }
  .node[data-state='dismissed'] { opacity:.35; }
  .node[data-state='dismissed'] .disc { border-style:dotted; box-shadow:none; }
  .node:not([data-state='open']):hover .disc {
    border-color: var(--focus);
  }
  .node[aria-pressed='true'] .disc,
  .node:focus-visible .disc {
    outline: 1px solid var(--focus);
    outline-offset: 6px;
  }
  .node.busy[data-state] .disc {
    border-style: dashed;
  }

  .zoom-controls { position:absolute; right:20px; bottom:20px; display:flex; gap:8px; z-index:2; }
  .controls {
    position: absolute;
    z-index: 2;
    right: 20px;
    top: 16px;
    display: flex;
    gap: 8px;
  }
  .layout-controls { left:auto; right:20px; }
  .controls button {
    background: var(--surface);
    border: 1px solid var(--line);
    color: var(--ink-mute);
    width: 32px;
    height: 32px;
    padding: 0;
    border-radius: 50%;
    display: grid;
    place-items: center;
  }
  .controls button:hover:not(:disabled) {
    background: var(--surface-2);
    border-color: var(--line);
    color: var(--accent);
  }
  .controls svg {
    width: 14px;
    height: 14px;
  }

  .legend {
    position: absolute;
    left: 16px;
    bottom: 12px;
    display: flex;
    gap: 14px;
    font-size: 12px;
    color: var(--ink-mute);
    pointer-events: auto; flex-wrap:wrap; max-width:calc(100% - 170px); align-items:center;
  }
  .key {
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    margin-right: 6px;
    vertical-align: -1px;
    border: 1px solid var(--node-open);
  }
  .key[data-state='open'] {
    border-style: dotted;
  }
  .key[data-state='lit'] {
    background: var(--surface-2);
    border-color: var(--node-lit);
    box-shadow: 0 0 6px 1px var(--glow-near);
  }
  .key[data-state='understood'] {
    background: var(--node-understood);
    border-color: var(--node-understood);
  }
  .key.self { border:2px solid var(--node-understood); }
  .key.dismissed { opacity:.35; border-style:dotted; }
  .legend button { padding:3px 8px; font-size:12px; }
  .legend label { display:flex; align-items:center; gap:4px; }
  .key.branch {
    width: 7px;
    height: 7px;
    border-radius: 0;
    transform: rotate(45deg);
    margin: 0 8px 0 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    :global(.traveler) {
      display: none;
    }
  }
</style>
