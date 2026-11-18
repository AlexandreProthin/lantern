<script lang="ts">
  // The rooms' shared graph (PS-5), styled after the learning-node design
  // (agent_design/learningnode/RECIPE.md): uniform circle nodes, the focused node's route to the
  // subject in amber, and a light dot with embers travelling along newly highlighted edges. Layout is
  // physics by default, or the left-to-right tree. The room supplies the disc's contents, the legend,
  // the menu's actions and node attributes (types.ts).
  import {
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
  import { initialPosition, treePositions, keyboardTarget } from '../../core/layout';
  import { graphMotion } from './graphMotion';
  import { travelDuration, emberFan, emberTrail } from '../embers';
  import { strings } from '../strings';
  import Icon from '../Icon.svelte';
  import { actionIcons } from '../icons';
  import type { Settings } from '../../frame/settings';
  import type { LibrarySpaces } from '../../frame/library-spaces';
  import { remote } from '../../frame/host';
  import { phone } from '../phone.svelte';
  import { GraphScene, type SceneNode } from './graph-scene';
  import { SpawnMotion } from './spawn-motion';
  import { seatForce } from './seat-force';
  import { labelCollide, labelBox, discBox, placeholderBox, type LabelBox } from './label-force';
  import { treeShape, linkLength, chargeOf, type TreeShape } from './cluster';
  import { EmberCanvas, type Spark } from './ember-canvas';
  import { searchNodes, stepMatch } from './graph-search';
  import { backdropLight, backdropPan } from '../../frame/backdrop-signals';
  import type { GraphRoomView, GraphSession, GraphSnippets, MenuAction } from './types';
  import { childMap, collapsedAncestors, drawnIds, hiddenCounts, nearestShown, shownIds } from '../../core/visibility';
  import { collapseStore } from '../../frame/collapse-store';
  import { pinStore, type Pins } from '../../frame/pin-store';
  import type { RoomVisit } from '../../core/model';

  let { session, room, glyph, legend, revision, settings, preferencesChanged, visible = true, library, linkPreview = null }: GraphSnippets & { library?: LibrarySpaces; linkPreview?: string | null; session: GraphSession; room: GraphRoomView; revision: number; settings: Settings; preferencesChanged: () => void; visible?: boolean } = $props();

  interface SimNode extends SimulationNodeDatum {
    id: string;
  }
  type SimLink = SimulationLinkDatum<SimNode> & { source: SimNode; target: SimNode };
  type Layout = 'force' | 'tree';

  const COL = 240;
  const ROW = 96;
  const DISC = 44;

  const simNodes = new Map<string, SimNode>();

  // ---- Visibility and collapse (GV-120..136) -----------------------------------------------
  // Shown: the room's progress rule. Drawn: shown, with no collapsed ancestor. The scene, layouts and keys see drawn nodes.
  let collapsedIds = $state<string[]>([]);
  const collapsed = $derived(new Set(collapsedIds));
  const projection = $derived.by(() => {
    revision;
    const v = session.visit, children = childMap(v), shown = shownIds(v, room.opens, children), drawn = drawnIds(v, shown, collapsed, children);
    return { children, shown, drawn, hidden: hiddenCounts(v, shown, drawn, collapsed, children) };
  });
  /** The visit as the graph draws it. */
  function drawnVisit(): RoomVisit {
    const v = session.visit, drawn = projection.drawn;
    return { ...v, nodes: Object.fromEntries(Object.entries(v.nodes).filter(([id]) => drawn.has(id))) };
  }
  function setCollapsed(ids: string[]) {
    collapsedIds = ids;
    void collapseStore.save(session.subject.id, ids).catch(() => {});
  }
  /** GV-136: the subject's folds come back from the app state; ids gone from the subject are dropped. */
  $effect(() => {
    const subject = session.subject.id;
    untrack(() => {
      collapsedIds = [];
      void collapseStore.load(subject).then(ids => {
        if (session.subject.id !== subject) return;
        const kept = ids.filter(id => Object.hasOwn(session.visit.nodes, id));
        if (kept.length !== ids.length) setCollapsed(kept); else collapsedIds = kept;
      }).catch(() => {});
    });
  });
  /** A node with shown children can fold. */
  const foldable = (id: string) => (projection.children.get(id) ?? []).some(child => projection.shown.has(child));
  /** GV-132: on the root, fold every level, so each opens one at a time. */
  function collapseAll() { setCollapsed([...projection.shown].filter(foldable)); }
  function expandAll() { setCollapsed([]); }
  function foldNode(id: string, fold: boolean) {
    if (id === session.visit.rootId) { if (fold) collapseAll(); else expandAll(); return; }
    setCollapsed(fold ? [...collapsedIds.filter(c => c !== id), id] : collapsedIds.filter(c => c !== id));
  }
  // GV-122: the focus is always shown. GV-134: focusing a node, or a generation starting on one, unfolds the way to it.
  $effect(() => {
    revision; collapsedIds;
    untrack(() => {
      const v = session.visit, { shown } = projection;
      if (!Object.hasOwn(v.nodes, v.focusId)) return;
      if (!shown.has(v.focusId)) { session.setFocus(nearestShown(v, shown, v.focusId)); return; }
      const open = new Set(collapsedAncestors(v, collapsed, v.focusId));
      const running = session.running;
      if (running && collapsed.has(running.nodeId) && room.scene.spawnTasks.includes(running.task)) open.add(running.nodeId);
      if (open.size) setCollapsed(collapsedIds.filter(id => !open.has(id)));
    });
  });
  const scene = new GraphScene(untrack(() => room.scene));
  let sceneNodes: Record<string, SceneNode> = {};
  let cleanupTimer: ReturnType<typeof setTimeout> | undefined;
  let transientRevision = $state(0);
  let announcement=$state('');
  const openedAt=Date.now();
  let simLinks: SimLink[] = [];
  /** `tick`: positions moved. `shape`: the set of nodes and edges changed. */
  let tick = $state(0), shape = $state(0);
  let laidSubject = '';
  let transform = $state<ZoomTransform>(zoomIdentity);
  let phoneLegend = $state(false);
  const legendShown = $derived(phone.current ? phoneLegend : !settings.ui.legendCollapsed);
  let width = $state(800);
  let height = $state(600);
  const layout = $derived<Layout>(settings.ui.graphLayout === 'tree' || Object.keys(session.visit.nodes).length > 800 ? 'tree' : 'force');
  let host: HTMLDivElement;
  let edgesSvg: SVGSVGElement;
  let zoomer: ZoomBehavior<HTMLDivElement, unknown>;
  let embersCanvas = $state<HTMLCanvasElement>();
  /** One canvas over the map for every light in motion; the drawn nodes' discs hide what passes under them. */
  const lights = new EmberCanvas(() => embersCanvas, () => ({ x: transform.x + width / 2, y: transform.y + height / 2, k: transform.k, w: width, h: height }),
    () => view.nodes.filter(n => !n.pending).flatMap(n => { const p = simNodes.get(n.id); return p ? [{ x: p.x ?? 0, y: p.y ?? 0, r: DISC / 2 }] : []; }));
  const spawn = new SpawnMotion(() => host, () => edgesSvg, () => !motionReduced() && visible && !document.hidden, lights);
  let panFrame=0;
  /** `transform` is relative to the view's centre (the world is drawn at +width/2, +height/2); d3-zoom's own
      transform is relative to the corner, so a pinch, a wheel or the ± buttons zoom around the right point. */
  const toZoom=(t:ZoomTransform)=>zoomIdentity.translate(t.x+width/2,t.y+height/2).scale(t.k);
  function setView(t:ZoomTransform){select(host).call(zoomer.transform,toZoom(t));}
  /** The view moved a moment ago (a gesture, a pan to the focus): see `.world.moving`. */
  let viewMoving=$state(false),viewRest=0;
  function viewMoved(){viewMoving=true;clearTimeout(viewRest);viewRest=window.setTimeout(()=>{viewMoving=false;},graphMotion.VIEW_REST_MS);}
  // A resize moves the centre: d3-zoom's copy follows, so the next gesture starts from what is shown.
  $effect(()=>{width;height;untrack(()=>{if(!zoomer||panFrame)return;setView(transform);});});
  // ---- The simulation's clock ------------------------------------------------------------
  // The simulation steps by elapsed time (one step per 60th of a second, up to three a frame), so it settles as fast
  // on a 120 Hz screen as on a slow one. Positions are written straight to the elements (`paint`), outside Svelte.
  const STEP_MS=1000/60;
  /** Frames stay slow for a while: the glow goes until the layout rests (GV-110). */
  let degraded=$state(false),simFrame=0,lastStep=0,stepDebt=0,slowSince=0;
  /** This map was slow to move once: it starts the next move already lightened, not after a slow second. */
  let slowMap=false;
  function stopSim(){cancelAnimationFrame(simFrame);simFrame=0;}
  function runSim(){if(simFrame||!visible||motionReduced()||sim.alpha()<=sim.alphaMin())return;lastStep=0;stepDebt=STEP_MS;if(slowMap)degraded=true;simFrame=requestAnimationFrame(stepSim);}
  function rested(){slowSince=0;release();if(degraded){degraded=false;paintRefs();}}
  /** New nodes still finding their seats (GV-14); while `seatOnly`, only they are simulated and drawn again. */
  const seating=new Set<string>();let seatOnly=false;
  /** The layout rests: the next growth seats only its own nodes. */
  function release(){seating.clear();seatOnly=false;}
  function stepSim(at:number){simFrame=0;
    if(!visible||motionReduced())return;
    const elapsed=lastStep?at-lastStep:0;
    if(elapsed>graphMotion.FRAME_BUDGET_MS){if(!slowSince)slowSince=at;else if(at-slowSince>=graphMotion.SLOW_SETTLING_MS)degraded=slowMap=true;}else slowSince=0;
    lastStep=at;stepDebt=Math.min(stepDebt+elapsed,STEP_MS*3);
    let stepped=false;
    while(stepDebt>=STEP_MS&&sim.alpha()>sim.alphaMin()){sim.tick();stepDebt-=STEP_MS;stepped=true;}
    if(stepped)moved();
    if(sim.alpha()>sim.alphaMin())simFrame=requestAnimationFrame(stepSim);else rested();
  }
  /** Runs the layout to rest at once, with nothing drawn in between. */
  function settleNow(){stopSim();for(let i=0;sim.alpha()>sim.alphaMin()&&i<graphMotion.SETTLE_TICKS;i++)sim.tick();release();degraded=false;moved();}

  // ---- Positions, written to the elements ---------------------------------------------------
  const nodeEls=new Map<string,HTMLElement>(),edgeEls=new Map<string,SVGPathElement>(),refEls=new Map<string,SVGPathElement>();
  const px=(v:number|undefined)=>Math.round((v??0)*10)/10;
  function placeNode(id:string,el:HTMLElement){const p=simNodes.get(id);if(!p)return;
    el.style.left=`${px(p.x)}px`;el.style.top=`${px(p.y)}px`;
    if(sceneNodes[id]?.pending==='shrinking'){const back=simNodes.get(sceneNodes[id].parents[0]);
      el.style.setProperty('--back-x',`${px((back?.x??0)-(p.x??0))}px`);el.style.setProperty('--back-y',`${px((back?.y??0)-(p.y??0))}px`);}
  }
  function edgePath(l:SimLink){const x1=px(l.source.x),y1=px(l.source.y),x2=px(l.target.x),y2=px(l.target.y),mx=(x1+x2)/2;
    return layout==='tree'?`M${x1} ${y1} C${mx} ${y1} ${mx} ${y2} ${x2} ${y2}`:`M${x1} ${y1} L${x2} ${y2}`;}
  function placeEdge(id:string,el:SVGPathElement){const l=simLinks.find(l=>l.target.id===id);if(l)el.setAttribute('d',edgePath(l));}
  function placeRef(link:{from:string;to:string},el:SVGPathElement){const a=simNodes.get(link.from),b=simNodes.get(link.to);if(a&&b)el.setAttribute('d',linkCurve(a,b));}
  /** Text-link lines are the costly part of a big map in motion (hundreds of dotted curves): the slow-frame fallback leaves them out until the layout rests (GV-112). */
  function paintRefs(){if(refEls.size)for(const link of references){const el=refEls.get(link.id);if(el)placeRef(link,el);}}
  function paint(){
    // Seating, the rest of the map has not moved: only the new nodes and their lines are written.
    if(seatOnly){
      for(const id of seating){const el=nodeEls.get(id);if(el)placeNode(id,el);}
      for(const l of simLinks)if(seating.has(l.target.id)||seating.has(l.source.id)){const el=edgeEls.get(l.target.id);if(el)el.setAttribute('d',edgePath(l));}
      if(!degraded&&refEls.size)for(const link of references)if(seating.has(link.from)||seating.has(link.to)){const el=refEls.get(link.id);if(el)placeRef(link,el);}
      return;
    }
    for(const [id,el] of nodeEls)placeNode(id,el);
    for(const l of simLinks){const el=edgeEls.get(l.target.id);if(el)el.setAttribute('d',edgePath(l));}
    if(!degraded)paintRefs();
  }
  /** Positions changed: draw them, and let what follows them (the menu, `settled`) know. */
  function moved(){paint();tick++;}
  /** Each element is placed as it mounts, and again when its node changes (a waiting disc becomes the node that arrived). */
  function nodeRef(el:HTMLElement,id:string){nodeEls.set(id,el);placeNode(id,el);
    return{update(next:string){if(nodeEls.get(id)===el)nodeEls.delete(id);id=next;nodeEls.set(id,el);placeNode(id,el);},destroy(){if(nodeEls.get(id)===el)nodeEls.delete(id);}};}
  function edgeRef(el:SVGPathElement,id:string){edgeEls.set(id,el);placeEdge(id,el);
    return{update(next:string){if(edgeEls.get(id)===el)edgeEls.delete(id);id=next;edgeEls.set(id,el);placeEdge(id,el);},destroy(){if(edgeEls.get(id)===el)edgeEls.delete(id);}};}
  function refRef(el:SVGPathElement,link:{id:string;from:string;to:string}){refEls.set(link.id,el);placeRef(link,el);
    return{update(next:{id:string;from:string;to:string}){if(refEls.get(link.id)===el)refEls.delete(link.id);link=next;refEls.set(link.id,el);placeRef(link,el);},destroy(){if(refEls.get(link.id)===el)refEls.delete(link.id);}};}
  function stopPan(){cancelAnimationFrame(panFrame);panFrame=0;}
  function moveView(target:ZoomTransform,duration:number) {
    if(!zoomer)return;stopPan();
    if(motionReduced()){setView(target);return;}
    const from=transform,started=performance.now();
    function frame(at:number){const t=Math.min(1,(at-started)/duration),ease=t*t*(3-2*t);
      setView(zoomIdentity.translate(from.x+(target.x-from.x)*ease,from.y+(target.y-from.y)*ease).scale(from.k+(target.k-from.k)*ease));
      if(t<1)panFrame=requestAnimationFrame(frame);else panFrame=0;}
    panFrame=requestAnimationFrame(frame);
  }
  function panToFocus(){const node=simNodes.get(session.visit.focusId);if(!node||!visible||width<100||height<100)return;
    const x=(node.x??0)*transform.k+transform.x+width/2,y=(node.y??0)*transform.k+transform.y+height/2;
    const dx=x<75?75-x:x>width-75?width-75-x:0,dy=y<40?40-y:y>height-100?height-100-y:0;
    if(dx||dy)moveView(zoomIdentity.translate(transform.x+dx,transform.y+dy).scale(transform.k),graphMotion.FOCUS_PAN_MS);
  }

  // d3 starts its own timer on creation; this view steps the simulation itself (`stepSim`).
  const sim = forceSimulation<SimNode>().alphaDecay(0.03).stop();
  const settled=$derived.by(()=>{tick;return sim.alpha()<=sim.alphaMin();});

  // ---- What the free layout reads of the tree (GV-15) -------------------------------------
  /** Depths and branch sizes of the drawn nodes, taken again whenever nodes come or go. */
  let shape3 = $state.raw<TreeShape>({ depth: new Map(), descendants: new Map(), maxDepth: 0 });
  const titleBoxes = new Map<string, LabelBox>();
  /** A node's disc and title (GV-15): a waiting placeholder keeps room for its coming title; one shrinking away needs none. */
  function boxOf(b: { id: string }): LabelBox {
    const n = sceneNodes[b.id];
    if (!n || n.pending === 'shrinking') return discBox;
    if (n.pending === 'waiting') return placeholderBox;
    const text = title(n.title);
    let box = titleBoxes.get(text); if (!box) titleBoxes.set(text, box = labelBox(text));
    return box;
  }
  const linkAt = (l: { target: { id: string } }) => linkLength(shape3.depth.get(l.target.id) ?? 2, shape3.descendants.get(l.target.id) ?? 0);
  const chargeAt = (b: { id: string }) => chargeOf(shape3.depth.get(b.id) ?? 2, shape3.descendants.get(b.id) ?? 0);

  // ---- Dragging and pins (GV-17) ------------------------------------------------------------
  // A node dragged in the free layout stays where it is dropped (pinned). Only it and its branch move meanwhile, as
  // new nodes are seated (GV-14): the rest of the map does not warm up. Pins are one reader's view, kept per subject
  // in the app state (as folds, GV-136), not in the subject file.
  let pins = $state<Pins>({}), pinsFor = $state('');
  $effect(() => {
    const subject = session.subject.id;
    untrack(() => {
      void pinStore.load(subject).catch((): Pins => ({})).then(loaded => {
        if (session.subject.id !== subject) return;
        const kept = Object.fromEntries(Object.entries(loaded).filter(([id]) => Object.hasOwn(session.visit.nodes, id) && id !== session.visit.rootId));
        pins = kept; pinsFor = subject;
        if (Object.keys(kept).length !== Object.keys(loaded).length) savePins();
      });
    });
  });
  function savePins() { void pinStore.save(session.subject.id, $state.snapshot(pins) as Pins).catch(() => {}); }
  const draggable = (id: string, pending: boolean) => layout === 'force' && !pending && id !== session.visit.rootId;
  /** The node and its branch (its drawn descendants that are not pinned themselves), at most a few dozen. */
  function branchOf(id: string): string[] {
    const out = [id];
    for (let i = 0; i < out.length && out.length < 60; i++) for (const child of projection.children.get(out[i]) ?? []) if (simNodes.has(child) && !pins[child]) out.push(child);
    return out;
  }
  /** Seats only these nodes against the still map (GV-14), warmed to `alpha`. */
  function seatOnlyThese(ids: string[], alpha: number) {
    stopSim(); slowSince = 0;
    seating.clear(); for (const id of ids) seating.add(id);
    seatOnly = true;
    sim.nodes(ids.map(id => simNodes.get(id)!)).alphaDecay(graphMotion.SEAT_DECAY)
      .force('charge', null).force('collide', null).force('link', null).force('x', null).force('y', null)
      .force('seat', seatForce(() => simNodes.values(), () => simLinks,
        { charge: chargeAt, collide: graphMotion.collide, box: boxOf, linkDistance: linkAt, linkStrength: .8, centre: .02 }));
    sim.alpha(Math.max(sim.alpha(), alpha));
  }
  let drag: { id: string; pointer: number; x0: number; y0: number; armed: boolean; active: boolean; hold?: ReturnType<typeof setTimeout>; dx: number; dy: number } | null = null;
  let dragging = $state(false), dragClick = false;
  const toWorld = (clientX: number, clientY: number) => { const r = host.getBoundingClientRect();
    return { x: (clientX - r.left - width / 2 - transform.x) / transform.k, y: (clientY - r.top - height / 2 - transform.y) / transform.k }; };
  /** A press on a node may become a drag: a mouse or pen once it moves a few pixels, a touch once it has rested first (a quick swipe pans). */
  function dragDown(e: PointerEvent, id: string, pending: boolean) {
    dragClick = false; cancelDrag();
    if (!draggable(id, pending) || e.button !== 0 || !e.isPrimary) return;
    const touch = e.pointerType === 'touch';
    drag = { id, pointer: e.pointerId, x0: e.clientX, y0: e.clientY, armed: !touch, active: false, dx: 0, dy: 0 };
    if (touch) { const d = drag; d.hold = setTimeout(() => { d.armed = true; }, graphMotion.DRAG_HOLD_MS); }
  }
  function dragMove(e: PointerEvent) {
    const d = drag; if (!d || e.pointerId !== d.pointer) return;
    if (!d.active) {
      if (Math.hypot(e.clientX - d.x0, e.clientY - d.y0) <= graphMotion.DRAG_THRESHOLD) return;
      if (!d.armed) { cancelDrag(); return; }
      const body = simNodes.get(d.id); if (!body) { cancelDrag(); return; }
      d.active = true; dragging = true; pressEnd();
      try { nodeEls.get(d.id)?.setPointerCapture(e.pointerId); } catch { /* the pointer is gone already */ }
      const at = toWorld(d.x0, d.y0); d.dx = (body.x ?? 0) - at.x; d.dy = (body.y ?? 0) - at.y;
      body.fx = body.x; body.fy = body.y;
      // In the middle of a full layout the node is simply held; at rest only its branch moves.
      if (seatOnly || sim.alpha() <= sim.alphaMin()) seatOnlyThese([...new Set([...(seatOnly ? seating : []), ...branchOf(d.id)])], graphMotion.DRAG_ALPHA);
      sim.alphaTarget(graphMotion.DRAG_ALPHA);
    }
    e.preventDefault();
    const body = simNodes.get(d.id); if (!body) return;
    const at = toWorld(e.clientX, e.clientY);
    body.fx = body.x = at.x + d.dx; body.fy = body.y = at.y + d.dy;
    if (motionReduced() || !visible) moved(); else { runSim(); if (!simFrame) moved(); }
  }
  /** Dropped: the node is pinned where it is and its branch comes to rest. */
  function dragUp(e: PointerEvent) {
    const d = drag; if (!d || e.pointerId !== d.pointer) return;
    drag = null; clearTimeout(d.hold);
    if (!d.active) return;
    dragging = false; dragClick = true;
    const body = simNodes.get(d.id);
    sim.alphaTarget(0);
    if (body && body.fx != null && body.fy != null) { pins = { ...pins, [d.id]: [Math.round(body.fx * 10) / 10, Math.round(body.fy * 10) / 10] }; savePins(); }
    if (motionReduced()) settleNow(); else runSim();
  }
  function cancelDrag() {
    const d = drag; drag = null; if (!d) return;
    clearTimeout(d.hold);
    if (d.active) { dragging = false; sim.alphaTarget(0); const body = simNodes.get(d.id); if (body && !pins[d.id]) body.fx = body.fy = null; runSim(); }
  }
  /** Released (double-click, or the node menu): the node finds a seat again near where it is, with its branch. */
  function unpin(id: string) {
    if (!pins[id]) return;
    const rest = { ...pins }; delete rest[id]; pins = rest; savePins();
    const body = simNodes.get(id); if (!body || layout !== 'force') return;
    body.fx = body.fy = null;
    if (!seatOnly && sim.alpha() > sim.alphaMin()) { runSim(); return; }
    seatOnlyThese([...new Set([...(seatOnly ? seating : []), ...branchOf(id)])], graphMotion.GROW_ALPHA);
    if (motionReduced()) settleNow(); else runSim();
  }
  /** A touch resting on a node to drag it does not also pan the map (d3-zoom listens to touches on the view). */
  function holdTouch(el: HTMLElement) {
    const stop = (e: TouchEvent) => { if (drag?.armed && e.touches.length === 1 && nodeEls.get(drag.id) === el) { e.stopPropagation(); if (e.cancelable) e.preventDefault(); } };
    el.addEventListener('touchmove', stop, { passive: false });
    return { destroy() { el.removeEventListener('touchmove', stop); } };
  }

  // ---- Opening reveal (GV-16) ---------------------------------------------------------------
  // The settled map comes in from the subject outward, a depth at a time: CSS animations with a delay per depth,
  // no script per frame. A map opened out of sight plays it when first shown; none under reduced motion.
  let revealing = $state(false), revealStep = $state(0), revealDue = false, revealTimer: ReturnType<typeof setTimeout> | undefined;
  function startReveal() {
    clearTimeout(revealTimer); revealing = false; revealDue = false;
    if (motionReduced()) return;
    if (!visible) { revealDue = true; return; }
    revealStep = Math.round((graphMotion.OPEN_REVEAL_MS - graphMotion.OPEN_REVEAL_NODE_MS) / Math.max(1, shape3.maxDepth));
    revealing = true;
    revealTimer = setTimeout(() => { revealing = false; }, graphMotion.OPEN_REVEAL_MS + 100);
  }
  $effect(() => { if (visible && revealDue) untrack(startReveal); });
  $effect(() => { if (settings.appearance.reduceMotion === 'on') untrack(() => { clearTimeout(revealTimer); revealing = revealDue = false; }); });

  /** The design's tree: depth columns, leaves on rows, parents centred on their children. */
  function treeTargets(): Map<string, { x: number; y: number }> {
    return treePositions({ ...session.visit, nodes: sceneNodes });
  }

  /**
   * `open`: a subject's first layout runs to rest before it is shown, so the map appears in place. `grow`: nodes
   * came or went in a map already at rest, so it warms only a little and the rest of the map stays where it is.
   * `layout`: a switch between Free and Tree, animated in full.
   */
  function applyLayout(kind: 'open' | 'grow' | 'layout' = 'layout', changed = 0) {
    const root = simNodes.get(session.visit.rootId);
    // GV-14: a free map that grows (and is not in the middle of a full layout) moves only its new nodes: they find
    // their seats among the others, which stay where they are. A first layout, a layout switch and the tree layout
    // move every node.
    const fullRun = !seatOnly && sim.alpha() > sim.alphaMin();
    if (kind === 'grow' && layout === 'force' && !fullRun) {
      for (const id of seating) if (!simNodes.has(id)) seating.delete(id);
      stopSim(); slowSince = 0;
      // Nodes only went (or a waiting node became the one that arrived, in place): nothing to settle.
      if (!seating.size) { seatOnly = false; sim.alpha(0); moved(); return; }
      seatOnly = false; moved();   // the whole map once (a node that shrinks back needs its way home)
      seatOnly = true;
      sim.nodes([...seating].map(id => simNodes.get(id)!)).alphaDecay(graphMotion.SEAT_DECAY)
        .force('charge', null).force('collide', null).force('link', null).force('x', null).force('y', null)
        .force('seat', seatForce(() => simNodes.values(), () => simLinks,
          { charge: chargeAt, collide: graphMotion.collide, box: boxOf, linkDistance: linkAt, linkStrength: .8, centre: .02 }));
      sim.alpha(Math.max(sim.alpha(), changed > graphMotion.GROW_MANY ? graphMotion.GROW_ALPHA_MANY : graphMotion.GROW_ALPHA));
      if (motionReduced()) settleNow(); else runSim();
      return;
    }
    seatOnly = false; seating.clear();
    sim.nodes([...simNodes.values()]).alphaDecay(0.03).alphaTarget(0).force('seat', null);
    if (layout === 'tree') {
      const t = treeTargets();
      // GV-17: the tree layout ignores pins.
      for (const body of simNodes.values()) body.fx = body.fy = null;
      sim
        .force('charge', null)
        .force('collide', null)
        .force('link', null)
        .force('x', forceX<SimNode>((d) => t.get(d.id)?.x ?? 0).strength(0.2))
        .force('y', forceY<SimNode>((d) => t.get(d.id)?.y ?? 0).strength(0.2));
    } else {
      // GV-17: pinned nodes hold their place; the root holds the centre.
      for (const body of simNodes.values()) { const pin = pins[body.id]; body.fx = pin ? pin[0] : null; body.fy = pin ? pin[1] : null; }
      if (root) {
        root.fx = 0;
        root.fy = 0;
      }
      // GV-15: long links to the modules, short ones inside them; collision on each node's disc and title.
      sim
        .force('charge', forceManyBody<SimNode>().strength(chargeAt))
        .force('collide', labelCollide(boxOf))
        .force('link', forceLink<SimNode, SimLink>(simLinks).distance(linkAt).strength(0.8))
        .force('x', forceX(0).strength(0.02))
        .force('y', forceY(0).strength(0.02));
    }
    stopSim();slowSince=0;
    if (kind === 'open' || motionReduced()) { sim.alpha(1); settleNow(); if (kind === 'open') { needsFit = true; startReveal(); } }
    else { sim.alpha(kind === 'grow' ? Math.max(sim.alpha(), changed > graphMotion.GROW_MANY ? graphMotion.GROW_ALPHA_MANY : graphMotion.GROW_ALPHA) : .9); moved(); runSim(); }
  }

  // Keep the simulation in step with the subject's nodes. New nodes spawn next to their parent.
  $effect(() => {
    revision; transientRevision; settings.appearance.reduceMotion;
    projection;
    sceneNodes = untrack(() => scene.update(drawnVisit(), session.running, performance.now(), motionReduced()));
    untrack(()=>{if(session.running&&room.scene.spawnTasks.includes(session.running.task))announcement=strings.lightingNode(session.visit.nodes[session.running.nodeId]?.title??'');
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
      if (body) { simNodes.delete(transfer.from); body.id = transfer.to; simNodes.set(transfer.to, body); changed = true;
        if (seating.delete(transfer.from)) seating.add(transfer.to); }
    }
    // A subject's first nodes all arrive together: the whole layout is new (`open`).
    const subjectId = untrack(() => session.subject.id), opening = subjectId !== laidSubject;
    // GV-17: a subject's pins are in place before its first layout runs, so it settles around them.
    if (opening && pinsFor !== subjectId) { if (simNodes.size) { simNodes.clear(); simLinks = []; untrack(() => shape++); } return; }
    if (opening) { laidSubject = subjectId; simNodes.clear(); slowMap = false; }
    let count = 0;
    for (const n of nodes) {
      if (simNodes.has(n.id)) continue;
      // GV-14: a new node starts beyond its parent, on the side away from the grandparent, so the map it joins barely moves.
      const p = n.parents[0] ? simNodes.get(n.parents[0]) : undefined, g = p ? simNodes.get(sceneNodes[n.parents[0]]?.parents[0]) : undefined;
      const spread = Math.atan2(initialPosition(n.id).y, initialPosition(n.id).x);
      const outward = !opening && p && g && (p.x !== g.x || p.y !== g.y);
      const a = outward ? Math.atan2((p.y ?? 0) - (g.y ?? 0), (p.x ?? 0) - (g.x ?? 0)) + spread / 2.4 : spread, d = outward ? 70 : 30;
      const pin = layout === 'force' && n.id !== session.visit.rootId ? untrack(() => pins[n.id]) : undefined;
      simNodes.set(n.id, pin ? { id: n.id, x: pin[0], y: pin[1], fx: pin[0], fy: pin[1] } : { id: n.id, x: (p?.x ?? 0) + Math.cos(a) * d, y: (p?.y ?? 0) + Math.sin(a) * d });
      if (!opening && !pin) seating.add(n.id);
      changed = true; count++;
    }
    for (const id of [...simNodes.keys()]) {
      if (!sceneNodes[id]) {
        simNodes.delete(id);
        changed = true; count++;
      }
    }
    untrack(() => shape++);
    if (!changed) return;
    simLinks = nodes
      .filter((n) => n.parents[0] && simNodes.has(n.parents[0]))
      .map((n) => ({ source: simNodes.get(n.parents[0]!)!, target: simNodes.get(n.id)! }));
    shape3 = treeShape(nodes);
    untrack(() => applyLayout(opening ? 'open' : 'grow', count));
  });

  let laidLayout: Layout | undefined;
  $effect(() => {
    const l = layout;
    // The first run is the opening itself (the effect above); only a real switch re-lays the map.
    untrack(() => { if (laidLayout !== undefined && laidLayout !== l) applyLayout('layout'); laidLayout = l; });
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
    return room.links?.(session.visit) ?? [];
  });

  /** What is drawn, without positions: those are written by `paint`, so a tick re-renders nothing here. */
  const view = $derived.by(() => {
    shape; revision;
    const nodes = sceneNodes;
    return {
      references: references.filter(link => simNodes.has(link.from) && simNodes.has(link.to)),
      edges: simLinks.map((l) => ({ id: l.target.id, pending: nodes[l.target.id]?.pending === 'waiting', onRoute: route.has(l.target.id) })),
      nodes: [...simNodes.values()].filter((sn) => nodes[sn.id]).map((sn) => nodes[sn.id])
    };
  });

  const title = (t: string) => t || room.untitled;

  // ---- Node menu (GV-55) ---------------------------------------------------------------

  let menu = $state<string | null>(null), menuEl = $state<HTMLDivElement>(), menuHeight = $state(0);
  const menuNode = $derived(menu ? view.nodes.find(n => n.id === menu && !n.pending) : undefined);
  const menuActions = $derived.by(() => { revision; const node = menu ? session.visit.nodes[menu] : undefined; return node ? room.menuActions(session.visit, node, session.running) : []; });
  /** GV-55, GV-130..132: the view's own items, after the shared list; not in the panel. */
  const viewActions = $derived.by((): MenuAction[] => {
    if (!menu || !session.visit.nodes[menu]) return [];
    // GV-17: a pinned node can be released here as by a double-click.
    const pin: MenuAction[] = layout === 'force' && pins[menu] ? [{ id: 'unpin', label: strings.releasePin, disabled: false }] : [];
    return [...pin, ...foldActions(menu)];
  });
  function foldActions(menu: string): MenuAction[] {
    if (menu === session.visit.rootId) return [
      ...([...projection.shown].some(id => foldable(id) && !collapsed.has(id)) ? [{ id: 'collapse', label: strings.collapseAll, disabled: false }] : []),
      ...(collapsedIds.length ? [{ id: 'expand', label: strings.expandAll, disabled: false }] : [])];
    if (collapsed.has(menu)) return [{ id: 'expand', label: strings.expandNodes, disabled: false }];
    return foldable(menu) ? [{ id: 'collapse', label: strings.collapseNodes, disabled: false }] : [];
  }
  function chooseViewAction(action: MenuAction) { const id = menu!; closeMenu(true); if (action.id === 'unpin') unpin(id); else foldNode(id, action.id === 'collapse'); }
  // Anchored to the node, so it follows the pan that focusing starts.
  const menuAt = $derived.by(() => { tick; const at = menuNode ? simNodes.get(menuNode.id) : undefined; return at ? {
    x: Math.max(8, Math.min(width - 200, transform.x + width / 2 + (at.x ?? 0) * transform.k + 18)),
    y: Math.max(8, Math.min(height - menuHeight - 8, transform.y + height / 2 + (at.y ?? 0) * transform.k - 12)) } : null; });
  $effect(() => { if (menu && (!menuNode || !visible)) untrack(() => closeMenu(false)); });
  /** NW-41: a touch held still for half a second opens the node menu, as a right click does; the tap that ends it does not also select. */
  let press: { timer: ReturnType<typeof setTimeout>; x: number; y: number } | null = null, pressedMenu = false;
  function pressStart(e: PointerEvent, id: string, pending: boolean) {
    if (e.pointerType !== 'touch' || pending) return;
    pressEnd(); pressedMenu = false;
    press = { x: e.clientX, y: e.clientY, timer: setTimeout(() => { press = null; if (drag?.active) return; cancelDrag(); if (menu !== id) { pressedMenu = true; openMenu(e, id); } }, 500) };
  }
  function pressMove(e: PointerEvent) { if (press && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 8) pressEnd(); }
  function pressEnd() { if (press) clearTimeout(press.timer); press = null; }
  function openMenu(e: MouseEvent, id: string) {
    e.preventDefault(); session.setFocus(id); menu = id;
    afterUpdate().then(() => menuEl?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus());
  }
  function closeMenu(refocus: boolean) {
    const id = menu; menu = null;
    if (refocus && id) afterUpdate().then(() => host.querySelector<HTMLButtonElement>(`[data-id="${id}"]`)?.focus());
  }
  function chooseAction(action: MenuAction) {
    const id = menu!; closeMenu(!action.toPanel);
    room.runMenuAction(action, id);
  }
  function menuKey(e: KeyboardEvent) {
    const items = [...menuEl!.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')], at = items.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeMenu(true); }
    else if (e.key === 'Tab') closeMenu(false);
    else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); items[(at + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus(); }
    else if (e.key === 'Home' || e.key === 'End') { e.preventDefault(); items[e.key === 'Home' ? 0 : items.length - 1]?.focus(); }
  }
  function menuOutside(e: PointerEvent) { if (menu && !(e.target instanceof Element && e.target.closest('.node-menu'))) closeMenu(false); }

  // ---- Link preview (GV-44) ---------------------------------------------------------------

  let previewFrame = 0, previewLayer: SVGGElement | object | null = null;
  function stopPreview() { cancelAnimationFrame(previewFrame); previewFrame = 0; if (previewLayer instanceof SVGGElement) previewLayer.remove(); previewLayer = null; lights.clear('preview'); }
  $effect(() => { const to = linkPreview; untrack(() => { stopPreview(); if (to) playPreview(session.visit.focusId, to); }); });
  $effect(() => { if (!visible) untrack(stopPreview); });
  // Same curve and orientation (sorted ids) as the text-link line, so the light rides on it when shown.
  function linkCurve(a: SimNode, b: SimNode) {
    const x1 = a.x ?? 0, y1 = a.y ?? 0, x2 = b.x ?? 0, y2 = b.y ?? 0;
    return `M${x1} ${y1} Q${(x1+x2)/2-(y2-y1)*.08} ${(y1+y2)/2+(x2-x1)*.08} ${x2} ${y2}`;
  }
  function playPreview(from: string, to: string) {
    const nodes = session.visit.nodes;
    if (from === to || !nodes[from] || !nodes[to] || motionReduced() || !visible || document.hidden || !edgesSvg) return;
    const toChild = nodes[to].parents[0] === from, toParent = nodes[from].parents[0] === to;
    const [first, second] = [from, to].sort();
    const tree = toChild || toParent ? edgesSvg.querySelector<SVGPathElement>(`[data-edge="${toChild ? to : from}"]`) : null;
    if ((toChild || toParent) && !tree) return;
    // A text link gets a temporary dotted curve in the edges layer; the bead itself is drawn on the ember canvas.
    let path = tree, layer: SVGGElement | object = {};
    if (!path) {
      const curve = document.createElementNS(ns, 'g'); curve.setAttribute('class', 'link-preview'); curve.setAttribute('aria-hidden', 'true');
      path = document.createElementNS(ns, 'path'); path.setAttribute('class', 'preview-curve'); curve.append(path);
      edgesSvg.append(curve); layer = curve;
    }
    previewLayer = layer;
    // A tree edge runs parent -> child; a text-link curve runs from the smaller id.
    const reverse = tree ? toParent : from !== first;
    const reshape = () => { const a = simNodes.get(first), b = simNodes.get(second); if (a && b && !tree) path!.setAttribute('d', linkCurve(a, b)); };
    reshape();
    const duration = travelDuration(path.getTotalLength()) * 1.6, start = performance.now();
    const step = (now: number) => {
      if (!previewLayer || previewLayer !== layer) return;
      reshape();
      const t = Math.min(1, (now - start) / duration), eased = 1 - (1 - t) ** 2;
      const p = pointAt(path!, reverse ? 1 - eased : eased), alpha = Math.min(1, t / .15, (1 - t) / .2 + .25);
      lights.set('preview', [{ kind: 'bead', x: p.x, y: p.y, alpha }]);
      if (layer instanceof SVGGElement) layer.style.opacity = String(alpha);
      if (t < 1) previewFrame = requestAnimationFrame(step);
      else { pulseNode(to); stopPreview(); }
    };
    previewFrame = requestAnimationFrame(step);
  }

  // ---- Search (GV-57) ------------------------------------------------------------------

  let searchOpen = $state(false), searchText = $state(''), searchQuery = $state(''), searchPicked = $state(false), searchField = $state<HTMLInputElement>();
  let searchTimer: ReturnType<typeof setTimeout> | undefined;
  const searchOptions = $derived({ shown: projection.shown, sealed: room.sealed, children: projection.children });
  const matches = $derived.by(() => { revision; return searchNodes(session.visit, searchQuery, searchOptions); });
  const matchSet = $derived(new Set(matches));
  const searching = $derived(searchOpen && !!searchQuery.trim());
  const matchAt = $derived(searchPicked ? matches.indexOf(session.visit.focusId) : -1);
  const matchCount = $derived(!matches.length ? strings.noNodeMatches : matchAt >= 0 ? strings.matchOf(matchAt + 1, matches.length) : strings.matchCount(matches.length));
  function openSearch() { searchOpen = true; afterUpdate().then(() => { searchField?.focus(); searchField?.select(); }); }
  function typeSearch(text: string) { searchText = text; searchPicked = false; clearTimeout(searchTimer); searchTimer = setTimeout(() => searchQuery = text, 150); }
  function resetSearch() { clearTimeout(searchTimer); searchOpen = false; searchText = searchQuery = ''; searchPicked = false; }
  // Focus the node before the field goes, so focus never falls to the body in between.
  function closeSearch() { host.querySelector<HTMLButtonElement>(`[data-id="${session.visit.focusId}"]`)?.focus(); resetSearch(); }
  function searchKey(e: KeyboardEvent) {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeSearch(); }
    else if (e.key === 'Enter') {
      e.preventDefault(); clearTimeout(searchTimer); searchQuery = searchText;
      const id = stepMatch(searchNodes(session.visit, searchText, searchOptions), session.visit.focusId, e.shiftKey ? -1 : 1);
      if (id) { session.setFocus(id); searchPicked = true; }
    }
  }
  function windowKey(e: KeyboardEvent) {
    if (visible && e.ctrlKey && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'f') { e.preventDefault(); openSearch(); }
  }

  // ---- Open / copy path (GV-56) ----------------------------------------------------------

  let fileNote = $state(''), fileNoteTimer: ReturnType<typeof setTimeout> | undefined;
  function noteFile(text: string) { fileNote = text; clearTimeout(fileNoteTimer); fileNoteTimer = setTimeout(() => fileNote = '', 2500); }
  const message = (e: unknown) => e instanceof Error ? e.message : String(e);
  async function openFile() {
    try { if (!library) throw new Error(strings.explorerDesktop); await library.reveal(session.subject.id); noteFile(strings.folderOpened); } catch (e) { noteFile(message(e)); }
  }
  async function copyFilePath(e: MouseEvent) {
    e.preventDefault();
    try { if (!library) throw new Error(strings.explorerDesktop); await navigator.clipboard.writeText(await library.filePath(session.subject.id)); noteFile(strings.pathCopied); } catch (err) { noteFile(message(err)); }
  }

  // ---- View memory / reset ------------------------------------------------------------

  let prevFocus = untrack(() => session.visit.focusId);
  const viewMemory=new Map<string,{transform:ZoomTransform}>();
  let shownSubject=untrack(()=>session.subject.id);
  $effect(()=>{revision;const id=session.subject.id;untrack(()=>{
    if(id===shownSubject)return;
    viewMemory.set(shownSubject,{transform});shownSubject=id;resetSearch();
    const memory=viewMemory.get(id);prevFocus=session.visit.focusId;lastRoute=route;stopTravel();stopPan();
    // The new subject is laid out at rest already (`open`): its remembered view comes back, or it is fitted at once.
    afterUpdate().then(()=>{if(!zoomer)return;if(memory){needsFit=false;setView(memory.transform);}else needsFit=true;});
  });});
  /** A subject shown for the first time is fitted as soon as the view has a size, with no travel. */
  let needsFit=$state(false),mounted=$state(false);
  $effect(()=>{width;height;if(needsFit&&visible&&mounted)untrack(()=>{if(host.clientWidth<100||host.clientHeight<100)return;needsFit=false;reset(false);});});

  $effect(() => {
    revision;
    const f = session.visit.focusId;
    untrack(() => {
      if (f === prevFocus) return;
      prevFocus = f;
      afterUpdate().then(()=>requestAnimationFrame(panToFocus));
    });
  });


  /** The legend and the file row sit over the map's bottom edge; the fit keeps the map above them (RS-35). */
  let cornerHeight = $state(0);
  function reset(animate = true) {
    // The element's own size: the bound `width` and `height` arrive a frame after mount.
    const width = host?.clientWidth ?? 0, height = host?.clientHeight ?? 0;
    const positions = [...simNodes.values()]; if (!positions.length || !zoomer || width < 100 || height < 100) return;
    const minX = Math.min(...positions.map(n => (n.x ?? 0)-75)), maxX = Math.max(...positions.map(n => (n.x ?? 0)+75));
    const minY = Math.min(...positions.map(n => (n.y ?? 0)-30)), maxY = Math.max(...positions.map(n => (n.y ?? 0)+95));
    const below = Math.min(cornerHeight, height / 3);
    let scale = Math.max(.1, Math.min(1, (width-96)/(maxX-minX), (height-96-below)/(maxY-minY)));
    let x = (minX+maxX)/2, y = (minY+maxY)/2;
    // NW-40: a phone never fits a map so small that no title can be read; it shows the part around the focused node.
    const focus = simNodes.get(session.visit.focusId);
    if (phone.current && scale < graphMotion.hideTitlesBelow && focus) { scale = graphMotion.hideTitlesBelow; x = focus.x ?? 0; y = focus.y ?? 0; }
    const target = zoomIdentity.translate(-x*scale, -y*scale - below/2).scale(scale);
    if (animate) moveView(target,graphMotion.RECENTER_MS); else { stopPan(); setView(target); }
  }

  // ---- Motion: a light dot travels outward along newly highlighted edges -------------

  const comet = graphMotion.route;
  const BURST = graphMotion.BURST;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const motionReduced = () => reducedMotion.matches || settings.appearance.reduceMotion === 'on';
  const ns = 'http://www.w3.org/2000/svg';
  let travelFrame = 0;
  let traveler: object | null = null;
  const nodeGlows = new Set<Animation>();

  function stopTravel() {
    cancelAnimationFrame(travelFrame);
    travelFrame = 0;
    lights.clear('travel');
    traveler = null;
    nodeGlows.forEach((a) => a.cancel());
    nodeGlows.clear();
  }

  const disc = (id: string) => host?.querySelector<HTMLElement>(`[data-id="${id}"] .disc`);

  function pulseNode(id: string) {
    if (motionReduced() || !visible || document.hidden || (session.visit.nodes[id] && room.quiet?.(session.visit.nodes[id]))) return;
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
    kind: 'dust' | 'mote';
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

    const layer = {};
    traveler = layer;

    let trail: Particle[] = [];
    let embers: Particle[] = [];
    let started: number | null = null;
    let lastEmission = -Infinity;
    let serial = 0;
    let glowIndex = 0;
    let burstIndex = 0;
    let head: Spark | null = null;

    function emitTrail(p: ReturnType<typeof pointAt>, elapsed: number) {
      if (trail.length >= comet.cap) return;
      serial++;
      // Deterministic, sparse scatter keeps repeated runs consistent.
      const motion = emberTrail(serial, p.tx, p.ty);
      trail.push({
        kind: serial % 4 !== 0 ? 'mote' : 'dust',
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
          kind: i % 4 !== 0 ? 'mote' : 'dust',
          x: (sn.x ?? 0) + Math.cos(angle) * radius,
          y: (sn.y ?? 0) + Math.sin(angle) * radius,
          born: elapsed,
          ...motion,
          bright: i % 4 === 0 ? 0.65 : 0.4
        });
      }
    }

    function paint(list: Particle[], elapsed: number, out: Spark[]) {
      return list.filter((p) => {
        const age = elapsed - p.born;
        if (age >= p.life) return false;
        const t = age / p.life;
        out.push({ kind: p.kind, x: p.x + (p.vx * age) / 1000, y: p.y + (p.vy * age) / 1000, scale: 1 - t * 0.65,
          alpha: p.bright * Math.min(1, t / 0.15) * (1 - t) ** 1.8 * (0.85 + 0.15 * Math.sin(Math.PI * t * 4)) });
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
      if (motionReduced() || !visible || document.hidden || !edgesSvg?.isConnected) return stopTravel();
      if (started === null) started = now;
      const elapsed = now - started;
      while (glowIndex < glowCues.length && elapsed >= glowCues[glowIndex].at) pulseNode(glowCues[glowIndex++].id);
      while (burstIndex < burstCues.length && elapsed >= burstCues[burstIndex].at) emitNode(burstCues[burstIndex++], elapsed);
      const s = sample(elapsed);
      if (s) {
        const p = pointAt(s.seg.edge, s.t);
        head = { kind: 'comet', x: p.x, y: p.y, alpha: 1 };
        if (s.moving && elapsed - lastEmission >= comet.emitEvery) {
          emitTrail(p, elapsed);
          lastEmission = elapsed;
        }
      } else head = null;
      const sparks: Spark[] = [];
      trail = paint(trail, elapsed, sparks);
      embers = paint(embers, elapsed, sparks);
      if (head) sparks.push(head);
      lights.set('travel', sparks);
      // Let the arrival glow and remaining particles finish, then release everything.
      if (!s && !trail.length && !embers.length && !nodeGlows.size) return stopTravel();
      travelFrame = requestAnimationFrame(frame);
    }
    const first = pointAt(timeline[0].edge, 0);
    head = { kind: 'comet', x: first.x, y: first.y, alpha: 1 };
    lights.set('travel', [head]);
    travelFrame = requestAnimationFrame(frame);
  }

  // Only a change of focus that lights new edges plays the effect. The initial display,
  // re-selecting a node, or returning to an ancestor already on the route do not.
  let lastRoute = untrack(() => route);
  $effect(() => {
    const r = route;
    untrack(() => {
      const ids = [...r].reverse().filter((id) => session.visit.nodes[id]?.parents[0] && !(session.visit.nodes[id] && room.quiet?.(session.visit.nodes[id])) && !lastRoute.has(id));
      lastRoute = r;
      if (ids.length) afterUpdate().then(() => requestAnimationFrame(() => travel(ids)));
    });
  });

  // RS-34: a node that becomes lit warms the backdrop where it sits on screen.
  let litSubject = '', litSeen = new Set<string>();
  $effect(() => {
    revision;
    untrack(() => {
      const lit = Object.entries(session.visit.nodes).filter(([, n]) => room.lights ? room.lights(n) : n.state === 'lit').map(([id]) => id);
      if (session.subject.id !== litSubject) { litSubject = session.subject.id; litSeen = new Set(lit); return; }
      for (const id of lit) {
        if (litSeen.has(id)) continue;
        litSeen.add(id);
        const p = simNodes.get(id);
        if (!visible || !p || !host) continue;
        const r = host.getBoundingClientRect();
        backdropLight(r.left + width / 2 + transform.x + (p.x ?? 0) * transform.k, r.top + height / 2 + transform.y + (p.y ?? 0) * transform.k);
      }
    });
  });
  $effect(() => { settings.appearance.reduceMotion;untrack(()=>{
    stopPan();if(motionReduced()){spawn.stop();stopTravel();settleNow();}
    else runSim();
  }); });
  $effect(() => { if (!visible) { spawn.stop();stopSim();stopTravel();stopPan(); } else untrack(runSim); });
  function onNodeKey(e: KeyboardEvent) {
    // GV-70: moves go over drawn nodes; Right on a folded node unfolds it and goes to its first shown child.
    const focus = session.visit.focusId;
    let target = keyboardTarget(drawnVisit(), focus, e.key);
    if (e.key === 'ArrowRight' && collapsed.has(focus)) { foldNode(focus, false); target = (projection.children.get(focus) ?? []).find(id => projection.shown.has(id)) ?? focus; }
    if (['Home','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)) {
      e.preventDefault(); session.setFocus(target); afterUpdate().then(() => host.querySelector<HTMLButtonElement>(`[data-id="${target}"]`)?.focus());
    } else if (e.key === 'Enter') {
      e.preventDefault(); if (!room.enter(session.visit.focusId)) document.querySelector<HTMLElement>('.panel')?.focus();
    }
  }
  onMount(() => {
    zoomer = zoom<HTMLDivElement, unknown>()
      .scaleExtent([0.1, 3])
      .filter(e => (!e.ctrlKey || e.type === 'wheel') && !e.button && !(e.type === 'mousedown' && e.target instanceof Element && e.target.closest('.node[data-draggable]')))
      .on('start',e=>{if(e.sourceEvent)stopPan();})
      .on('zoom', (e) => { const t = zoomIdentity.translate(e.transform.x - width / 2, e.transform.y - height / 2).scale(e.transform.k); backdropPan(t.x - transform.x, t.y - transform.y, t.k / transform.k); transform = t; viewMoved(); });
    select(host).call(zoomer).on('dblclick.zoom', null);
    setView(transform);
    const onMotion = () => { if (motionReduced()) { spawn.stop();stopTravel();settleNow(); } else runSim(); };
    needsFit = true; mounted = true;
    const onVisibility = () => { if(document.hidden) { spawn.stop();stopTravel(); } };
    reducedMotion.addEventListener('change', onMotion);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearTimeout(cleanupTimer);stopPan();stopSim();
      spawn.stop();
      stopTravel();
      reducedMotion.removeEventListener('change', onMotion);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  });
</script>

<svelte:window onpointerdowncapture={menuOutside} onkeydown={windowKey} onpointermove={dragMove} onpointerup={dragUp} onpointercancel={cancelDrag} />
<div class="graph {room.className}" class:degraded class:revealing class:dragging data-settled={settled} data-reduced={motionReduced()} bind:this={host} bind:clientWidth={width} bind:clientHeight={height}
  style="--grow:{graphMotion.SPAWN_GROW_MS}ms;--stagger:{graphMotion.SPAWN_STAGGER_MS}ms;--breathe:{graphMotion.PENDING_BREATHE_PERIOD_MS}ms;--shrink:{graphMotion.SPAWN_SHRINK_MS}ms;--reveal:{graphMotion.SPAWN_REVEAL_MS}ms;--pulse:{graphMotion.BUSY_PULSE_PERIOD_MS}ms;--opacity-low:{graphMotion.PENDING_BREATHE_OPACITY[0]};--opacity-high:{graphMotion.PENDING_BREATHE_OPACITY[1]};--reveal-step:{revealStep}ms;--reveal-node:{graphMotion.OPEN_REVEAL_NODE_MS}ms;--reveal-all:{graphMotion.OPEN_REVEAL_MS - graphMotion.SPAWN_REVEAL_MS}ms">
  <div
    class="world"
    class:tiny={transform.k < graphMotion.hideTitlesBelow}
    class:moving={viewMoving}
    style="transform: translate3d({transform.x + width / 2}px, {transform.y + height / 2}px, 0) scale({transform.k});--k:{transform.k};--inv:{transform.k < graphMotion.hideTitlesBelow ? Math.round(100 / transform.k) / 100 : 1}"
  >
    <!-- Edges sit under the nodes: the opaque circles cut the lines at their rims. -->
    <svg class="edges" bind:this={edgesSvg} aria-hidden="true">
      {#if settings.ui.textLinks}<g class="references">{#each view.references as e (e.id)}<path class="reference" use:refRef={e} />{/each}</g>{/if}
      {#each view.edges as e (e.id)}
        <path data-edge={e.id} use:edgeRef={e.id} pathLength="1" class:route={e.onRoute} style:--depth={shape3.depth.get(e.id) ?? 1}
          data-spawn-pending={e.pending ? 'true' : undefined} />
      {/each}
    </svg>
    <!-- The nodes in their own box: a zoom step restyles the world and this box, not every node (GV-110). -->
    <div class="nodes">
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
        class:landmark={route.has(n.id) || n.parents[0] === session.visit.rootId}
        class:match={searching && matchSet.has(n.id)}
        class:unmatched={searching && !n.pending && !matchSet.has(n.id)}
        data-id={n.id}
        data-state={n.state}
        data-pending={n.pending}
        {...room.dataAttrs?.(n)}
        data-growing={!n.pending&&scene.key(n.id)===n.id&&Date.parse(n.createdAt)>openedAt ? 'true' : undefined}
        use:nodeRef={n.id}
        use:holdTouch
        data-draggable={draggable(n.id, !!n.pending) ? '' : undefined}
        class:pinned={layout === 'force' && !!pins[n.id]}
        style:--slot={n.slot ?? 0}
        style:--depth={shape3.depth.get(n.id) ?? 0}
        aria-pressed={focused}
        aria-label="{title(n.title)} · {n.kind} · {n.state}{room.labelExtra?.(n) ?? ''}{projection.hidden.get(n.id) ? ' · '+strings.hiddenCount(projection.hidden.get(n.id)!) : ''}{busy ? ' · '+strings.preparing : ''}"
        title="{title(n.title)} · {n.state}{room.tooltipExtra?.(n) ?? ''}{layout === 'force' && pins[n.id] ? ' · ' + strings.pinnedHint : ''}"
        onclick={() => { if (pressedMenu) { pressedMenu = false; return; } if (dragClick) { dragClick = false; return; } session.setFocus(n.id); }}
        ondblclick={() => { if (layout === 'force' && pins[n.id]) unpin(n.id); }}
        oncontextmenu={(e) => { if (n.pending) return; if (menu === n.id) { e.preventDefault(); return; } openMenu(e, n.id); }}
        onpointerdown={(e) => { pressStart(e, n.id, !!n.pending); dragDown(e, n.id, !!n.pending); }} onpointermove={pressMove} onpointerup={pressEnd} onpointercancel={pressEnd}
        aria-haspopup="menu"
      >
        <span class="disc">{@render glyph(n)}{#if layout === 'force' && pins[n.id] && !n.pending}<span class="pin-mark" aria-hidden="true"><Icon name="pin" size={10} /></span>{/if}{#if !n.pending && projection.hidden.get(n.id)}<span class="folded" aria-hidden="true">+{projection.hidden.get(n.id)}</span>{/if}</span>
        <span class="name">{n.pending ? '' : title(n.title)}</span>
      </button>
    {/each}
    </div>
  </div>
  <canvas class="embers" bind:this={embersCanvas} aria-hidden="true" hidden></canvas>
  <span class="sr-only" aria-live="polite">{announcement}</span>
  {#if menu && menuAt}
    <div class="node-menu menu-surface" role="menu" tabindex="-1" aria-label={strings.nodeActions(title(session.visit.nodes[menu]?.title ?? ''))} bind:this={menuEl} bind:offsetHeight={menuHeight}
      style="left:{menuAt.x}px;top:{menuAt.y}px" onkeydown={menuKey}>
      <!-- GV-55: one drawn icon per action, the first action marked as the node's main one, Delete apart. -->
      {#each menuActions.filter(a => a.id !== 'delete') as action, i (action.id)}<button role="menuitem" class:lead={i === 0} disabled={action.disabled} title={action.title} onclick={() => chooseAction(action)}>{#if actionIcons[action.id]}<Icon name={actionIcons[action.id]} />{:else}<span class="icon-slot"></span>{/if}{action.label}</button>{/each}
      {#if viewActions.length}<hr />{#each viewActions as action (action.id)}<button role="menuitem" class="view-action" onclick={() => chooseViewAction(action)}><Icon name={actionIcons[action.id] ?? 'foldAll'} />{action.label}</button>{/each}{/if}
      {#each menuActions.filter(a => a.id === 'delete') as action (action.id)}<hr /><button role="menuitem" class="danger" disabled={action.disabled} title={action.title} onclick={() => chooseAction(action)}><Icon name="trash" />{action.label}</button>{/each}
    </div>
  {/if}
  {#if Object.keys(session.visit.nodes).length > 800}<div class="large-notice" role="status">{strings.largeGraph}</div>{/if}

  <nav class="controls layout-controls">
    <!-- GV-58: fold or unfold the whole graph, as the root's menu does. -->
    {#if collapsedIds.length}
      <button class="fold-all icon-button" onclick={expandAll} aria-label={strings.expandAll} title={strings.expandAll}><Icon name="unfoldAll" size={14} /></button>
    {:else}
      <button class="fold-all icon-button" onclick={collapseAll} disabled={![...projection.shown].some(foldable)} aria-label={strings.collapseAll} title={strings.collapseAll}><Icon name="foldAll" size={14} /></button>
    {/if}
    {#if searchOpen}
      <div class="search" role="search">
        <input bind:this={searchField} value={searchText} aria-label={strings.searchNodes} placeholder={strings.searchNodes} spellcheck="false"
          oninput={e => typeSearch(e.currentTarget.value)} onkeydown={searchKey} />
        {#if searchQuery.trim()}<span class="search-count" role="status">{matchCount}</span>{/if}
        <button class="icon-button bare" onclick={closeSearch} aria-label={strings.closeSearch} title={strings.closeSearch}><Icon name="close" size={14} /></button>
      </div>
    {:else}
      <button class="icon-button" onclick={openSearch} aria-label={strings.searchNodes} title={strings.searchHint}><Icon name="search" size={14} /></button>
    {/if}
    <button class="icon-button"
      onclick={() => { settings.ui.graphLayout = layout === 'force' ? 'tree' : 'free'; preferencesChanged(); }}
      aria-pressed={layout==='tree'}
      aria-label={layout === 'force' ? strings.treeLayout : strings.freeLayout}
      title={layout === 'force' ? strings.treeLayout : strings.freeLayout}
    >
      {#if layout === 'force'}
        <svg class="icon" style="width:14px;height:14px" viewBox="0 0 16 16" aria-hidden="true">
          <circle cx="3" cy="8" r="1.6" /><circle cx="13" cy="3.5" r="1.6" /><circle cx="13" cy="12.5" r="1.6" />
          <path d="M4.6 8C8 8 8 3.5 11.4 3.5M4.6 8C8 8 8 12.5 11.4 12.5" />
        </svg>
      {:else}
        <svg class="icon" style="width:14px;height:14px" viewBox="0 0 16 16" aria-hidden="true">
          <circle cx="8" cy="8" r="1.6" /><circle cx="3" cy="3.5" r="1.6" /><circle cx="13.5" cy="5" r="1.6" /><circle cx="5" cy="13" r="1.6" />
          <path d="m6.8 6.8-2.6-2.2M9.6 7.5l2.4-1.5M7 9.4l-1.2 2.2" />
        </svg>
      {/if}
    </button>
  </nav>

  <nav class="zoom-controls">
    <button class="icon-button" onclick={() => select(host).call(zoomer.scaleBy, 1/1.2)} aria-label={strings.zoomOut} title={strings.zoomOut}><Icon name="minus" size={14} /></button>
    <button class="icon-button" onclick={() => reset()} aria-label={strings.recenter} title={strings.recenter}><Icon name="recenter" size={14} /></button>
    <button class="icon-button" onclick={() => select(host).call(zoomer.scaleBy, 1.2)} aria-label={strings.zoomIn} title={strings.zoomIn}><Icon name="plus" size={14} /></button>
  </nav>
  <div class="corner" bind:offsetHeight={cornerHeight}>
  <div class="file-row">
    <!-- NW-31: the subject's file is on the computer running Lantern, out of a paired device's reach. -->
    {#if !remote}<button class="open-file legend-chip" title={strings.openFileHint} onclick={openFile} oncontextmenu={copyFilePath}>{strings.openFile}</button>{/if}
    {#if fileNote}<span class="file-note" role="status">{fileNote}</span>{/if}
  </div>
  <div class="legend" class:shown={legendShown}>
    <!-- NW-40: on a phone the legend starts folded each time, whatever the desktop keeps. -->
    <button class="legend-chip" aria-expanded={legendShown} onclick={() => { if (phone.current) phoneLegend = !phoneLegend; else { settings.ui.legendCollapsed = !settings.ui.legendCollapsed; preferencesChanged(); } }}>{strings.legend}</button>
    {#if legendShown}
      {@render legend()}
      <label class="text-links"><input type="checkbox" bind:checked={settings.ui.textLinks} onchange={preferencesChanged} />{strings.textLinks}</label>
    {/if}
  </div>
  </div>
</div>

<style>
  .graph {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
    cursor: grab;
    /* RS-34: the backdrop shows through the graph's ground. */
    background: transparent;
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
    /* No `will-change` at rest: it keeps the layer at its first resolution, and titles blur when zoomed in. */
  }
  /* While the view moves the layer is kept as drawn (no raster per step); it is drawn again, sharp, once the view rests.
     Kept all the time, it would be drawn at full size even on a small fitted map, which slows every growth. */
  .world.moving { will-change: transform; }
  /* The inverse of the zoom, for the titles kept readable on a small map. It does not inherit: a zoom step
     restyles the few nodes that ask for it (`--inv: inherit`), not every element of the map (GV-110). */
  @property --inv { syntax: '<number>'; inherits: false; initial-value: 1; }
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
  /* One opacity for the group, not one per line: hundreds of translucent paths are hundreds of offscreen passes. */
  .edges .references { opacity:.45; animation:reveal var(--reveal) ease-out; }
  .edges path.reference { stroke-dasharray:1 5; }
  .degraded .edges .references { display:none; }
  .edges :global(.link-preview) { pointer-events:none; }
  .edges :global(.link-preview .preview-curve) { stroke:var(--node-lit); stroke-dasharray:1 5; opacity:.5; }
  /* GV-114: the lights in motion, over the map; the canvas is the view's size, never the world's. */
  .embers { position:absolute; inset:0; width:100%; height:100%; pointer-events:none; }
  .embers[hidden], .graph[data-reduced='true'] .embers { display:none; }
  .edges path[data-spawn-pending] { stroke-dasharray:1; stroke-dashoffset:1; }
  .graph[data-reduced='true'] .edges path[data-spawn-pending] { stroke-dashoffset:0; }
  .tiny .name { visibility:hidden; }
  /* A fitted map is often too small for titles (GV-62): the focused node, the one under the pointer, the route to the
     focus and the modules (the root's children) keep theirs, at reading size. Only these ask for `--inv`. */
  .nodes { position:absolute; left:0; top:0; --inv:inherit; }
  .tiny .node.landmark { --inv:inherit; }
  .tiny .node[aria-pressed='true'], .tiny .node:hover { z-index:2; --inv:inherit; }
  .tiny .node.landmark .name, .tiny .node[aria-pressed='true'] .name, .tiny .node:hover:not(:disabled) .name { --inv:inherit; visibility:visible; transform:scale(var(--inv)); transform-origin:50% 0; text-shadow:0 0 6px var(--bg),0 0 2px var(--bg); }
  .tiny .node.landmark:not([aria-pressed='true']):not(:hover) { z-index:1; }
  /* While the view moves, the edges are their own layer: the world's layer is not cut up anew on every step. */
  .world.moving .edges { will-change: transform; }
  .degraded .node .disc { box-shadow:none; }
  .large-notice { position:absolute; top:60px; left:20px; color:var(--ink-mute); font-size:12px; }
  .sr-only { position:absolute; width:1px; height:1px; overflow:hidden; clip-path:inset(50%); }
  .node {
    position: absolute;
    left: 0;
    top: 0;
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
    position: relative;
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

  .node.unmatched { opacity:.3; }
  .node.match .disc { outline:1.5px solid var(--accent); outline-offset:3px; }
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
  /* GV-16: the opening reveal. Each node fades and grows about its disc centre (the origin is the node's own point),
     a depth step later than its parent; each edge draws out from its parent as its node comes; text links last. */
  .graph.revealing .node { transform-origin:0 0; animation:open-node var(--reveal-node) cubic-bezier(.2,.7,.3,1) backwards; animation-delay:calc(var(--depth) * var(--reveal-step)); }
  .graph.revealing .edges path[data-edge]:not([data-spawn-pending]) { stroke-dasharray:1; animation:open-edge var(--reveal-node) ease-out backwards; animation-delay:calc((var(--depth) - 1) * var(--reveal-step)); }
  .graph.revealing .edges .references { animation:reveal var(--reveal) ease-out var(--reveal-all) backwards; }
  @keyframes open-node { from { opacity:0; scale:.5; } }
  @keyframes open-edge { from { stroke-dashoffset:1; } to { stroke-dashoffset:0; } }
  @keyframes grow { from { transform:scale(0); } to { transform:scale(1); } }
  @keyframes breathe { 0%,100% { opacity:var(--opacity-low); box-shadow:0 0 6px 1px var(--glow-far); } 50% { opacity:var(--opacity-high); box-shadow:0 0 18px 4px var(--glow-near),0 0 32px 6px var(--glow-far); } }
  @keyframes arrive { from { transform:scale(.75); } to { transform:scale(1); } }
  @keyframes shrink { to { transform:translate(var(--back-x),var(--back-y)) scale(0); opacity:0; } }
  @keyframes reveal { from { opacity:0; } to { opacity:1; } }
  @keyframes busy-pulse { 50% { box-shadow:0 0 20px 5px var(--glow-near),0 0 46px 11px var(--glow-far); } }
  .graph[data-reduced='true'] .node .disc, .graph[data-reduced='true'] .node .name { animation:none; }

  /* GV-55: the menu's look is the app's (app.css .menu-surface): icon column, main action first, Delete apart. */
  .node-menu { position:absolute; z-index:4; }
  .node-menu .lead { font-weight:500; }
  .node-menu .lead :global(.icon) { color:var(--accent); }
  .icon-slot { width:16px; flex:none; }
  /* GV-17: a dragged node; a pinned one carries a small pin above its disc, on the left, in the quiet ink. */
  .graph.dragging, .graph.dragging .node { cursor:grabbing; }
  .node[data-draggable]:active { cursor:grabbing; }
  .pin-mark { position:absolute; right:calc(100% - 4px); top:-8px; display:grid; place-items:center; width:14px; height:14px; border-radius:50%; background:var(--bg); color:var(--ink-mute); pointer-events:none; }
  .degraded .pin-mark, .tiny .pin-mark { display:none; }
  /* GV-133: how many shown nodes a fold hides; text, so it reads without colour. */
  .folded { position:absolute; left:calc(100% + 3px); top:-6px; font-size:10px; line-height:14px; padding:0 4px; border:1px solid var(--line); border-radius:7px; background:var(--surface); color:var(--ink-mute); white-space:nowrap; pointer-events:none; }
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
  /* RS-38: the graph tools are the app's icon buttons (circles, solid surface). */
  .search { display:flex; align-items:center; gap:6px; height:32px; box-sizing:border-box; padding:0 2px 0 12px; background:var(--surface); border:1px solid var(--line); border-radius:var(--radius-pill); }
  .search input { width:200px; border:0; padding:0; background:none; color:var(--ink); font-size:13px; outline:none; box-shadow:none; }
  .search-count { font-size:12px; color:var(--ink-mute); white-space:nowrap; }
  .search .icon-button { width:26px; height:26px; }

  .corner { position:absolute; left:16px; bottom:12px; display:flex; flex-direction:column; align-items:flex-start; gap:8px; max-width:calc(100% - 170px); }
  .file-row { display:flex; align-items:center; gap:10px; font-size:12px; color:var(--ink-mute); }
  .file-note { color:var(--accent); }
  .legend {
    display: flex;
    gap: 14px;
    font-size: 12px;
    color: var(--ink-mute);
    pointer-events: auto; flex-wrap:wrap; align-items:center;
  }
  /* RS-35: open, the legend has its own ground, so the map never shows through its rows. */
  .legend.shown { padding:6px 12px 6px 0; border-radius:var(--radius-surface); background:var(--surface); box-shadow:0 0 0 1px var(--line); }
  /* RS-35: folded, the legend is one chip (a pill). */
  .legend-chip { padding:3px 12px; font-size:12px; font-weight:400; color:var(--ink-mute); background:var(--surface); border-color:var(--line); border-radius:var(--radius-pill); }
  .legend.shown .legend-chip { background:none; border-color:transparent; }
  .open-file { align-self:flex-start; }
  .legend .text-links { gap:6px; }
  .legend .text-links input { width:14px; height:14px; }
  .legend label { display:flex; align-items:center; gap:4px; }
  /* NW-41, NW-42: on a phone the controls take a finger, the search field does not zoom the page, and the corner clears the zoom buttons. */
  @media (max-width: 719px) {
    .controls { right:12px; top:12px; } .controls > button, .zoom-controls button { width:40px; height:40px; }
    .zoom-controls { right:12px; bottom:calc(12px + env(safe-area-inset-bottom)); }
    .search { height:40px; border-radius:20px; } .search input { width:min(46vw, 200px); font-size:16px; }
    .corner { left:12px; bottom:calc(12px + env(safe-area-inset-bottom)); max-width:calc(100% - 180px); }
    .legend-chip, .open-file { padding:8px 14px; font-size:13px; }
    .node-menu > button { padding:12px 14px; font-size:15px; }
  }
  /* NW-41 (amended 2026-11-18): on touch a node takes a finger however small the map is drawn: a hit circle on the disc,
     at least 36 px on screen, invisible, outside the layout; the drawn disc and the positions do not change. */
  @media (pointer: coarse) {
    .node::before { content:''; position:absolute; left:50%; top:30px; width:max(60px, calc(36px / var(--k, 1))); aspect-ratio:1; border-radius:50%; transform:translate(-50%, -50%); }
  }
  @media (prefers-reduced-motion: reduce) {
    .node, .node .disc, .node .name, .edges path, .edges .references { animation:none !important; }
    .embers, :global(.link-preview) {
      display: none;
    }
  }
</style>
