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
  import { travelDuration, emberFan, emberTrail } from './embers';
  import { strings } from '../../ui/strings';
  import type { Settings } from '../../frame/settings';
  import { GraphScene, type SceneNode } from './graph-scene';
  import { graphLinks } from './graph-links';
  import { SpawnMotion } from './spawn-motion';

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
  const scene = new GraphScene();
  let sceneNodes: Record<string, SceneNode> = {};
  let cleanupTimer: ReturnType<typeof setTimeout> | undefined;
  let transientRevision = $state(0);
  let announcement=$state('');
  const openedAt=Date.now();
  let simLinks: SimLink[] = [];
  let tick = $state(0);
  let transform = $state<ZoomTransform>(zoomIdentity);
  let width = $state(800);
  let height = $state(600);
  const layout = $derived<Layout>(settings.ui.graphLayout === 'tree' || Object.keys(session.visit.nodes).length > 800 ? 'tree' : 'force');
  let host: HTMLDivElement;
  let edgesSvg: SVGSVGElement;
  let zoomer: ZoomBehavior<HTMLDivElement, unknown>;
  const spawn = new SpawnMotion(() => host, () => edgesSvg, () => !motionReduced() && visible && !document.hidden);
  let panFrame=0;
  let halfRate=$state(false),settlingFrame=0,lastTick=0,slowSince=0;
  function halfStep(){let skip=false;
    function frame(){if(!visible||motionReduced())return;
      skip=!skip;if(!skip){sim.tick();tick++;}
      if(sim.alpha()>sim.alphaMin())settlingFrame=requestAnimationFrame(frame);else settlingFrame=0;
    }
    cancelAnimationFrame(settlingFrame);settlingFrame=requestAnimationFrame(frame);
  }
  function stopPan(){cancelAnimationFrame(panFrame);panFrame=0;}
  function moveView(target:ZoomTransform,duration:number) {
    if(!zoomer)return;stopPan();
    if(motionReduced()){select(host).call(zoomer.transform,target);return;}
    const from=transform,started=performance.now();
    function frame(at:number){const t=Math.min(1,(at-started)/duration),ease=t*t*(3-2*t);
      select(host).call(zoomer.transform,zoomIdentity.translate(from.x+(target.x-from.x)*ease,from.y+(target.y-from.y)*ease).scale(from.k+(target.k-from.k)*ease));
      if(t<1)panFrame=requestAnimationFrame(frame);else panFrame=0;}
    panFrame=requestAnimationFrame(frame);
  }
  function panToFocus(){const node=simNodes.get(session.visit.focusId);if(!node||!visible||width<100||height<100)return;
    const x=(node.x??0)*transform.k+transform.x+width/2,y=(node.y??0)*transform.k+transform.y+height/2;
    const dx=x<75?75-x:x>width-75?width-75-x:0,dy=y<40?40-y:y>height-100?height-100-y:0;
    if(dx||dy)moveView(zoomIdentity.translate(transform.x+dx,transform.y+dy).scale(transform.k),graphMotion.FOCUS_PAN_MS);
  }

  const sim = forceSimulation<SimNode>()
    .alphaDecay(0.03)
    .on('tick', () => {
      const at=performance.now();
      if(lastTick&&at-lastTick>graphMotion.FRAME_BUDGET_MS){if(!slowSince)slowSince=at;else if(at-slowSince>=graphMotion.SLOW_SETTLING_MS){sim.stop();halfRate=true;halfStep();}}
      else slowSince=0;
      lastTick=at;tick++;
    });
  const settled=$derived.by(()=>{tick;return sim.alpha()<=sim.alphaMin();});

  function childrenOf(id: string): string[] {
    return Object.values(session.visit.nodes)
      .filter((n) => n.parents[0] === id)
      .map((n) => n.id);
  }

  /** The design's tree: depth columns, leaves on rows, parents centred on their children. */
  function treeTargets(): Map<string, { x: number; y: number }> {
    return treePositions({ ...session.visit, nodes: sceneNodes });
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
    cancelAnimationFrame(settlingFrame);lastTick=0;slowSince=0;
    if (motionReduced()) { sim.stop(); sim.alpha(1); for (let i=0;i<300;i++) sim.tick(); tick++; }
    else if (visible) {sim.alpha(.9);if(halfRate)halfStep();else sim.restart();}
  }

  // Keep the simulation in step with the subject's nodes. New nodes spawn next to their parent.
  $effect(() => {
    revision; transientRevision; settings.appearance.reduceMotion;
    sceneNodes = untrack(() => scene.update(session.visit, session.running, performance.now(), motionReduced()));
    untrack(()=>{if(session.running&&['intro','light','more'].includes(session.running.task))announcement=strings.lightingNode(session.visit.nodes[session.running.nodeId]?.title??'');
      else if(scene.completedCount!==null)announcement=strings.optionsReady(scene.completedCount);});
    clearTimeout(cleanupTimer);
    if (scene.remaining) cleanupTimer = setTimeout(() => transientRevision++, scene.remaining);
    const nodes = Object.values(sceneNodes);
    untrack(() => {
      for (const n of nodes) if (n.pending === 'waiting') spawn.add(n.id, n.slot ?? 0, performance.now());
      for (const transfer of scene.transfers) spawn.transfer(transfer.from, transfer.to);
      spawn.sync(new Set(nodes.filter(n => n.pending !== 'shrinking').map(n => n.id)));
    });
    let changed = false;
    for (const transfer of scene.transfers) {
      const body = simNodes.get(transfer.from);
      if (body) { simNodes.delete(transfer.from); body.id = transfer.to; simNodes.set(transfer.to, body); changed = true; }
    }
    for (const n of nodes) {
      if (simNodes.has(n.id)) continue;
      const p = n.parents[0] ? simNodes.get(n.parents[0]) : undefined;
      const a = Math.atan2(initialPosition(n.id).y, initialPosition(n.id).x);
      simNodes.set(n.id, { id: n.id, x: (p?.x ?? 0) + Math.cos(a) * 30, y: (p?.y ?? 0) + Math.sin(a) * 30 });
      changed = true;
    }
    for (const id of [...simNodes.keys()]) {
      if (!sceneNodes[id]) {
        simNodes.delete(id);
        changed = true;
      }
    }
    untrack(() => tick++);
    if (!changed) return;
    simLinks = nodes
      .filter((n) => n.parents[0] && simNodes.has(n.parents[0]))
      .map((n) => ({ source: simNodes.get(n.parents[0]!)!, target: simNodes.get(n.id)! }));
    untrack(applyLayout);
  });

  $effect(() => {
    const l = layout;
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
  const references = $derived.by(() => {
    revision;
    return graphLinks(session.visit);
  });

  const view = $derived.by(() => {
    tick; revision;
    const nodes = sceneNodes;
    const tree = layout === 'tree';
    return {
      references: references.flatMap(link => {
        const a = simNodes.get(link.from), b = simNodes.get(link.to);
        const x1=a?.x??0,y1=a?.y??0,x2=b?.x??0,y2=b?.y??0;
        return a && b ? [{ id:link.id, d: `M${x1} ${y1} Q${(x1+x2)/2-(y2-y1)*.08} ${(y1+y2)/2+(x2-x1)*.08} ${x2} ${y2}` }] : [];
      }),
      edges: simLinks.map((l) => {
        const x1 = l.source.x ?? 0,
          y1 = l.source.y ?? 0,
          x2 = l.target.x ?? 0,
          y2 = l.target.y ?? 0;
        const mx = (x1 + x2) / 2;
        return {
          id: l.target.id,
          pending: nodes[l.target.id]?.pending === 'waiting',
          d: tree ? `M${x1} ${y1} C${mx} ${y1} ${mx} ${y2} ${x2} ${y2}` : `M${x1} ${y1} L${x2} ${y2}`,
          onRoute: route.has(l.target.id)
        };
      }),
      nodes: [...simNodes.values()]
        .filter((sn) => nodes[sn.id])
        .map((sn) => ({ ...nodes[sn.id], x: sn.x ?? 0, y: sn.y ?? 0,
          backX: (simNodes.get(nodes[sn.id].parents[0])?.x ?? 0) - (sn.x ?? 0),
          backY: (simNodes.get(nodes[sn.id].parents[0])?.y ?? 0) - (sn.y ?? 0) }))
    };
  });

  const title = (t: string) => t || strings.untitledQuestion;

  // ---- Back / reset -------------------------------------------------------------------

  let backStack = $state<string[]>([]);
  let prevFocus = untrack(() => session.visit.focusId);
  let goingBack = false;
  const viewMemory=new Map<string,{transform:ZoomTransform;history:string[]}>();
  let shownSubject=untrack(()=>session.subject.id);
  $effect(()=>{revision;const id=session.subject.id;untrack(()=>{
    if(id===shownSubject)return;
    viewMemory.set(shownSubject,{transform,history:[...backStack]});shownSubject=id;
    const memory=viewMemory.get(id);backStack=memory?.history??[];prevFocus=session.visit.focusId;lastRoute=route;stopTravel();stopPan();
    afterUpdate().then(()=>{if(!zoomer)return;if(memory)select(host).call(zoomer.transform,memory.transform);else setTimeout(reset,500);});
  });});

  $effect(() => {
    revision;
    const f = session.visit.focusId;
    untrack(() => {
      if (f === prevFocus) return;
      if (!goingBack) backStack.push(prevFocus);
      goingBack = false;
      prevFocus = f;
      afterUpdate().then(()=>requestAnimationFrame(panToFocus));
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
    moveView(zoomIdentity.translate(-(minX+maxX)/2*scale, -(minY+maxY)/2*scale).scale(scale),graphMotion.RECENTER_MS);
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
    if (motionReduced() || !visible || document.hidden || session.visit.nodes[id]?.state==='dismissed') return;
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
      const duration = travelDuration(edge.getTotalLength());
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
      const motion = emberTrail(serial, p.tx, p.ty);
      trail.push({
        el: particle(serial % 4 !== 0),
        x: p.x,
        y: p.y,
        born: elapsed,
        ...motion,
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
        const motion = emberFan(i, BURST, heading);
        const angle = motion.angle;
        embers.push({
          el: particle(i % 4 !== 0),
          x: (sn.x ?? 0) + Math.cos(angle) * radius,
          y: (sn.y ?? 0) + Math.sin(angle) * radius,
          born: elapsed,
          ...motion,
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
      const ids = [...r].reverse().filter((id) => session.visit.nodes[id]?.parents[0] && session.visit.nodes[id]?.state !== 'dismissed' && !lastRoute.has(id));
      lastRoute = r;
      if (ids.length) afterUpdate().then(() => requestAnimationFrame(() => travel(ids)));
    });
  });

  $effect(() => { settings.appearance.reduceMotion;untrack(()=>{
    stopPan();if(motionReduced()){spawn.stop();stopTravel();sim.stop();cancelAnimationFrame(settlingFrame);for(let i=0;sim.alpha()>sim.alphaMin()&&i<300;i++)sim.tick();tick++;}
    else if(visible&&sim.alpha()>sim.alphaMin()){if(halfRate)halfStep();else sim.restart();}
  }); });
  $effect(() => { if (!visible) { spawn.stop();sim.stop();cancelAnimationFrame(settlingFrame);stopTravel();stopPan(); } else if (sim.alpha() > sim.alphaMin() && !motionReduced()) {if(halfRate)halfStep();else sim.restart();} });
  function onNodeKey(e: KeyboardEvent) {
    const target = keyboardTarget(session.visit, session.visit.focusId, e.key);
    if (['Home','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)) {
      e.preventDefault(); session.setFocus(target); afterUpdate().then(() => host.querySelector<HTMLButtonElement>(`[data-id="${target}"]`)?.focus());
    } else if (e.key === 'Enter') {
      e.preventDefault(); if (session.focus.state === 'open' && !session.running) void session.run('light', session.visit.focusId);
      else document.querySelector<HTMLElement>('.panel')?.focus();
    }
  }
  onMount(() => {
    zoomer = zoom<HTMLDivElement, unknown>()
      .scaleExtent([0.1, 3])
      .on('start',e=>{if(e.sourceEvent)stopPan();})
      .on('zoom', (e) => (transform = e.transform));
    select(host).call(zoomer).on('dblclick.zoom', null);
    const onMotion = () => { if (motionReduced()) { spawn.stop();stopTravel(); } applyLayout(); };
    const initialFit = setTimeout(reset, 500);
    const onVisibility = () => { if(document.hidden) { spawn.stop();stopTravel(); } };
    reducedMotion.addEventListener('change', onMotion);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearTimeout(initialFit); clearTimeout(cleanupTimer);stopPan();cancelAnimationFrame(settlingFrame);
      sim.stop();
      spawn.stop();
      stopTravel();
      reducedMotion.removeEventListener('change', onMotion);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  });
</script>

<div class="graph" class:degraded={halfRate} data-settled={settled} data-reduced={motionReduced()} bind:this={host} bind:clientWidth={width} bind:clientHeight={height}
  style="--grow:{graphMotion.SPAWN_GROW_MS}ms;--stagger:{graphMotion.SPAWN_STAGGER_MS}ms;--breathe:{graphMotion.PENDING_BREATHE_PERIOD_MS}ms;--shrink:{graphMotion.SPAWN_SHRINK_MS}ms;--reveal:{graphMotion.SPAWN_REVEAL_MS}ms;--pulse:{graphMotion.BUSY_PULSE_PERIOD_MS}ms;--opacity-low:{graphMotion.PENDING_BREATHE_OPACITY[0]};--opacity-high:{graphMotion.PENDING_BREATHE_OPACITY[1]}">
  <div
    class="world"
    class:tiny={transform.k < graphMotion.hideTitlesBelow}
    style="transform: translate3d({transform.x + width / 2}px, {transform.y + height / 2}px, 0) scale({transform.k})"
  >
    <!-- Edges sit under the nodes: the opaque circles cut the lines at their rims. -->
    <svg class="edges" bind:this={edgesSvg} aria-hidden="true">
      {#if settings.ui.textLinks}{#each view.references as e (e.id)}<path class="reference" d={e.d} />{/each}{/if}
      {#each view.edges as e (e.id)}
        <path data-edge={e.id} d={e.d} pathLength="1" class:route={e.onRoute}
          data-spawn-pending={e.pending ? 'true' : undefined} />
      {/each}
    </svg>
    {#each view.nodes as n (scene.key(n.id))}
      {@const focused = n.id === session.visit.focusId}
      {@const busy = session.busy(n.id)}
      <button
        tabindex={focused && !n.pending ? 0 : -1}
        disabled={!!n.pending}
        aria-hidden={n.pending ? 'true' : undefined}
        onkeydown={onNodeKey}
        class="node"
        class:busy
        class:pulsing={busy}
        class:muted={!route.has(n.id)}
        data-id={n.id}
        data-state={n.state}
        data-understood={n.understoodBy}
        data-pending={n.pending}
        data-growing={!n.pending&&scene.key(n.id)===n.id&&Date.parse(n.createdAt)>openedAt ? 'true' : undefined}
        style="left: {n.x}px; top: {n.y}px;--slot:{n.slot ?? 0};--back-x:{n.backX}px;--back-y:{n.backY}px"
        aria-pressed={focused}
        aria-label="{title(n.title)} · {n.kind} · {n.state}{n.understoodBy ? ' · '+(n.understoodBy==='self'?strings.understoodByYou:strings.demonstratedState) : ''}{busy ? ' · '+strings.preparing : ''}"
        title="{title(n.title)} · {n.state}"
        onclick={() => session.setFocus(n.id)}
      >
        <span class="disc">
          <svg class="status" viewBox="0 0 18 18" aria-hidden="true" style:visibility={n.pending ? 'hidden' : 'visible'}>
            {#if n.state === 'understood'}
              <path d="m3 9 4 4 8-9" fill="none" stroke="currentColor" stroke-width="1.5" />
            {:else if n.kind === 'question'}
              <path d="M9 4 14 9 9 14 4 9Z" fill={n.state === 'lit' ? 'currentColor' : 'none'} stroke="currentColor" />
            {:else}
              <circle cx="9" cy="9" r="4" fill={n.state === 'lit' ? 'currentColor' : 'none'} stroke="currentColor" />
            {/if}
          </svg>
        </span>
        <span class="name">{n.pending ? '' : title(n.title)}</span>
      </button>
    {/each}
  </div>
  <span class="sr-only" aria-live="polite">{announcement}</span>
  {#if Object.keys(session.visit.nodes).length > 800}<div class="large-notice" role="status">{strings.largeGraph}</div>{/if}

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
      aria-pressed={layout==='tree'}
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
    will-change:transform;
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
  .edges path.reference { stroke-dasharray:1 5; opacity:.45; }
  .edges path[data-spawn-pending] { stroke-dasharray:1; stroke-dashoffset:1; }
  .graph[data-reduced='true'] .edges path[data-spawn-pending] { stroke-dashoffset:0; }
  .tiny .name { visibility:hidden; }
  .degraded .node .disc { box-shadow:none; }
  .large-notice { position:absolute; top:60px; left:20px; color:var(--ink-mute); font-size:12px; }
  .sr-only { position:absolute; width:1px; height:1px; overflow:hidden; clip-path:inset(50%); }
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
  .node.pulsing .disc { animation:busy-pulse var(--pulse) ease-in-out infinite; }
  .node[data-pending='waiting'] .disc { border:1.5px dotted var(--node-lit); animation:breathe var(--breathe) ease-in-out infinite; }
  .node:global([data-spawn-phase='growing']) { visibility:hidden; }
  .node[data-pending='waiting']:not(:global([data-spawn-phase='breathing'])) { visibility:hidden; }
  .graph[data-reduced='true'] .node[data-pending='waiting'] { visibility:visible; }
  .node:global([data-spawn-phase='breathing']) .disc { animation:arrive var(--reveal) ease-out, breathe var(--breathe) ease-in-out infinite; }
  .node[data-pending] {opacity:1;cursor:default;}
  .node[data-pending='shrinking'] .disc { border:1.5px dotted var(--path-muted); animation:shrink var(--shrink) ease-in both; }
  .node[data-growing='true'] .disc { animation:grow var(--grow) ease-out; }
  .node:not([data-pending]) .name { animation:reveal var(--reveal) ease-out; }
  @keyframes grow { from { transform:scale(0); } to { transform:scale(1); } }
  @keyframes breathe { 0%,100% { opacity:var(--opacity-low); box-shadow:0 0 6px 1px var(--glow-far); } 50% { opacity:var(--opacity-high); box-shadow:0 0 18px 4px var(--glow-near),0 0 32px 6px var(--glow-far); } }
  @keyframes arrive { from { transform:scale(.75); } to { transform:scale(1); } }
  @keyframes shrink { to { transform:translate(var(--back-x),var(--back-y)) scale(0); opacity:0; } }
  @keyframes reveal { from { opacity:0; } to { opacity:1; } }
  @keyframes busy-pulse { 50% { box-shadow:0 0 20px 5px var(--glow-near),0 0 46px 11px var(--glow-far); } }
  .graph[data-reduced='true'] .node .disc, .graph[data-reduced='true'] .node .name { animation:none; }

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
    .node .disc, .node .name { animation:none !important; }
    :global(.traveler) {
      display: none;
    }
  }
</style>
