<script lang="ts">
  import { tick } from 'svelte';
  import { strings } from '../../ui/strings';
  import type { RoomDefinition } from '../room';
  import { companionSvg, still, GESTURE } from '../../assets/identity/companion/lantern';
  import type { Pose } from '../../assets/identity/companion/lantern';
  import { reducedMotion } from '../topbar';
  import type { AmberChat } from './chat';
  import type { AmberState } from './state';
  import { markTipSeen, nextTip, setSpot, spotOf } from './state';
  import { AMBER_H, AMBER_W, BAR, TIE_X, TIE_Y, bubbleBox, dropTarget, hangSpots, hintPoint, restSpots, spotById } from './place';
  import type { Spot } from './place';
  import { Rope, STEP, flightDuration, flightPoint } from './rope';
  import AskChat from './AskChat.svelte';
  import Emphasis from './Emphasis.svelte';
  import GuideLines from './GuideLines.svelte';
  /**
   * The companion (companion spec): hangs from the top bar (CO-10, CO-11) or rests at the bottom (CO-13); grabbed, it
   * follows the hand, on its rope within the top quarter of the window (CO-12), and when let go it swings, flies or falls
   * to the nearest spot (CO-14), kept per space (CO-15). A click or Enter opens its bubble (CO-20); right-click, the
   * context-menu key or Shift+F10 its menu (CO-16, CO-58). Clicks beside its drawn shape pass through (CO-17).
   * Reduced motion: every move goes straight to the spot (CO-56). Gestures and the living flame: v0.4.0 slice 7.
   */
  let { room, space, desktop, amberState, saveState, chat, revision, hide, openSettings }: {
    room: RoomDefinition; space: string; desktop: boolean; amberState: AmberState; saveState: (s: AmberState) => void;
    chat: AmberChat; revision: number; hide: () => void; openSettings: () => void;
  } = $props();
  const BUBBLE_W = 340, CONTROLS = 138, GRAB = 5, SWING_MAX = 6000, THROW = 6;
  /** CO-17: the lantern's silhouette (loop, frame and the flame inside it, in the actor's units) takes the pointer; the halo around it does not. */
  const HIT = 'M42 3 H58 V22 C70 34 86 47 86 65 C86 79 81 89 77 99 H23 C19 89 14 79 14 65 C14 47 30 34 42 22 Z';
  let width = $state(innerWidth), height = $state(innerHeight), bubble = $state(false), mode = $state<'tip' | 'guide'>('tip'), tipId = $state<string>(), menu = $state<null | 'main' | 'move'>(null);
  let button = $state<HTMLButtonElement>(), bubbleEl = $state<HTMLElement>(), menuEl = $state<HTMLElement>(), askChat = $state<ReturnType<typeof AskChat>>();
  const uid = `amber-${Math.random().toString(36).slice(2, 8)}`;

  // CO-11, CO-13: the hanging spots along the bar, and this space's resting spots measured from the page.
  const hangs = $derived(hangSpots(width, desktop ? CONTROLS : 0, strings.amberSpotHang));
  let rests = $state.raw<Spot[]>([]), measured = $state(false);
  function measure() {
    const spaces = document.querySelector('.spaces'); if (!spaces) return;
    const find = (selector: string) => { for (const el of document.querySelectorAll(selector)) { const r = el.getBoundingClientRect(); if (r.width && r.height) return r; } return null; };
    const next = restSpots(room.companion?.rests?.[space], find, spaces.getBoundingClientRect(), { left: strings.amberRestLeft, right: strings.amberRestRight });
    if (JSON.stringify(next) !== JSON.stringify(rests)) rests = next;
    // The space draws its parts after Amber (Study's graph once the subject is in): measure again when they appear or resize.
    const anchors = (room.companion?.rests?.[space] ?? []).flatMap(spec => [...document.querySelectorAll(spec.anchor)]);
    if (!measured || anchors.length !== observed) {
      observer?.disconnect(); observer = new ResizeObserver(() => remeasure());
      observer.observe(spaces); for (const el of anchors) observer.observe(el); observed = anchors.length;
      mutations?.disconnect(); mutations = new MutationObserver(() => remeasure()); mutations.observe(spaces, { childList: true, subtree: true });
    }
    measured = true;
  }
  let observer: ResizeObserver | undefined, mutations: MutationObserver | undefined, observed = -1, pendingMeasure = 0;
  function remeasure() { cancelAnimationFrame(pendingMeasure); pendingMeasure = requestAnimationFrame(measure); }
  $effect(() => { space; room; width; height; measured = false; observed = -1; void tick().then(remeasure); return () => { observer?.disconnect(); mutations?.disconnect(); cancelAnimationFrame(pendingMeasure); }; });
  const spots = $derived([...hangs, ...rests]);
  const saved = $derived(spotOf(amberState, room.id, space));
  // Until the resting spots are measured, a saved resting spot waits rather than flashing at the default.
  const spot = $derived(spotById(spots, saved));
  let gaveUp = $state(false);
  $effect(() => { space; room; gaveUp = false; const t = setTimeout(() => gaveUp = true, 1500); return () => clearTimeout(t); });
  const ready = $derived(!saved?.startsWith('rest-') || rests.some(r => r.id === saved) || (measured && gaveUp));

  // Motion: still at the spot, held by the hand, swinging on the rope, or flying or falling to a spot.
  type Motion = { kind: 'still' }
    | { kind: 'drag'; left: number; top: number; vx: number; vy: number; at: number; rope: Rope | null }
    | { kind: 'swing'; rope: Rope; to: Spot; start: number; acc: number }
    | { kind: 'flight'; from: { x: number; y: number }; to: Spot; start: number; duration: number; mode: 'fly' | 'fall' };
  let motion = $state.raw<Motion>({ kind: 'still' }), frame = $state(0), raf = 0, grab: { x: number; y: number; dx: number; dy: number; id: number } | null = null, dragged = false;
  const view = $derived.by(() => {
    void frame;
    const m = motion;
    if (m.kind === 'drag') return { left: m.left, top: m.top, angle: 0, pose: still(GESTURE.suspension), rope: m.rope?.path() ?? null };
    if (m.kind === 'swing') return { left: m.rope.end.x - TIE_X, top: m.rope.end.y - TIE_Y, angle: m.rope.angle(), pose: still(GESTURE.suspension), rope: m.rope.path() };
    if (m.kind === 'flight') {
      const p = flightPoint(m.from, { x: m.to.left, y: m.to.top }, (performance.now() - m.start) / m.duration, m.mode);
      return { left: p.x, top: p.y, angle: 0, pose: still(m.mode === 'fly' ? GESTURE.lift : GESTURE.rest), rope: null };
    }
    return { left: spot.left, top: spot.top, angle: 0, pose: still(spot.kind === 'rest' ? GESTURE.landing : GESTURE.suspension),
      rope: spot.kind === 'hang' ? `M${spot.anchorX} ${BAR} L${spot.anchorX} ${spot.top + TIE_Y}` : null };
  });
  // CO-55: the identity's warm flame and body; the halo and the light on the frame follow the room's --amber-* tokens.
  const poseKey = (z: Pose) => `${z.x},${z.y},${z.feet},${z.line}`;
  let lastKey = '', lastSvg = '';
  const svg = $derived.by(() => { const key = poseKey(view.pose); if (key !== lastKey) { lastKey = key; lastSvg = companionSvg(GESTURE.suspension, view.pose, uid, 'learn', true); } return lastSvg; });
  const target = $derived(motion.kind === 'drag' ? dropTarget(hangs, rests, motion.left, motion.top, height) : null);

  function loop(now: number) {
    const m = motion;
    if (m.kind === 'swing') {
      m.acc += (lastNow ? Math.min(64, now - lastNow) : 16) / 1000; lastNow = now;
      let steps = 0; while (m.acc >= STEP && steps < 16) { m.rope.step(); m.acc -= STEP; steps++; }
      if (m.rope.settled() || now - m.start > SWING_MAX) { commit(m.to); return; }
    } else if (m.kind === 'flight') { if (now - m.start >= m.duration) { commit(m.to); return; } }
    else if (m.kind === 'drag' && m.rope) { for (let i = 0; i < 2; i++) m.rope.step(); }
    else if (m.kind === 'still') { raf = 0; return; }
    frame++; raf = requestAnimationFrame(loop);
  }
  let lastNow = 0;
  function run() { if (!raf) { lastNow = 0; raf = requestAnimationFrame(loop); } }
  function commit(to: Spot) { cancelAnimationFrame(raf); raf = 0; motion = { kind: 'still' }; saveState(setSpot(amberState, room.id, space, to.id)); }
  /** CO-14, CO-16: go to a spot: straight with reduced motion (CO-56), else a swing onto a rope or a flight or fall. */
  function goTo(to: Spot, from = { x: view.left, y: view.top }, rope: Rope | null = null, velocity = { x: 0, y: 0 }) {
    if (reducedMotion()) { commit(to); return; }
    if (to.kind === 'hang' && from.y + TIE_Y < height / 4) {
      const r = rope ?? new Rope({ x: to.anchorX, y: BAR }, { x: from.x + TIE_X, y: from.y + TIE_Y });
      r.anchor = { x: to.anchorX, y: BAR }; r.release(Math.max(1, to.rope), velocity);
      motion = { kind: 'swing', rope: r, to, start: performance.now(), acc: 0 }; run(); return;
    }
    const goal = { x: to.left, y: to.top };
    if (Math.hypot(goal.x - from.x, goal.y - from.y) < 1) { commit(to); return; }
    motion = { kind: 'flight', from, to, start: performance.now(), duration: flightDuration(from, goal), mode: goal.y < from.y || to.kind === 'hang' ? 'fly' : 'fall' }; run();
  }

  // CO-12: grab and drag. A press becomes a drag after a few pixels; otherwise it is a click.
  function down(e: PointerEvent) {
    if (e.button !== 0 || motion.kind !== 'still') return;
    grab = { x: e.clientX, y: e.clientY, dx: e.clientX - view.left, dy: e.clientY - view.top, id: e.pointerId }; dragged = false;
  }
  function move(e: PointerEvent) {
    if (!grab || e.pointerId !== grab.id) return;
    if (motion.kind !== 'drag') {
      if (Math.hypot(e.clientX - grab.x, e.clientY - grab.y) < GRAB) return;
      closeBubble(); menu = null; dragged = true; remeasure();
      motion = { kind: 'drag', left: view.left, top: view.top, vx: 0, vy: 0, at: performance.now(), rope: null };
    }
    const m = motion as Extract<Motion, { kind: 'drag' }>;
    const left = Math.max(0, Math.min(width - AMBER_W, e.clientX - grab.dx)), top = Math.max(BAR - TIE_Y, Math.min(height - AMBER_H, e.clientY - grab.dy));
    const tie = { x: left + TIE_X, y: top + TIE_Y }, near = dropTarget(hangs, [], left, top, height);
    // Within the top quarter the rope lengthens and shortens to follow; lower down Amber is off its rope.
    let rope = m.rope;
    if (tie.y < height / 4) { if (!rope) rope = new Rope({ x: near.anchorX, y: BAR }, tie); rope.hold(tie, { x: near.anchorX, y: BAR }); } else rope = null;
    // The hand's speed in px per ms, smoothed, for the throw on release.
    const now = performance.now(), dt = Math.max(8, now - m.at), k = .4;
    motion = { kind: 'drag', left, top, vx: m.vx * (1 - k) + (left - m.left) / dt * k, vy: m.vy * (1 - k) + (top - m.top) / dt * k, at: now, rope }; run(); frame++;
  }
  function up(e: PointerEvent) {
    if (!grab || e.pointerId !== grab.id) return;
    grab = null; const m = motion; if (m.kind !== 'drag') return;
    // A throw carries into the swing, per rope step, and never more than a gentle push.
    const cap = (v: number) => Math.max(-THROW, Math.min(THROW, v * STEP * 1000));
    goTo(dropTarget(hangs, rests, m.left, m.top, height), { x: m.left, y: m.top }, m.rope, { x: cap(m.vx), y: cap(m.vy) });
  }
  function cancelDrag() { if (motion.kind === 'drag') { grab = null; goTo(spot); } }
  // CO-57: nothing runs while the window is hidden; a move in progress ends at its spot and is not replayed.
  function visibility() { if (document.hidden) { const m = motion; grab = null; if (m.kind === 'swing' || m.kind === 'flight') commit(m.to); else if (m.kind === 'drag') commit(spot); } }

  const pool = $derived([...strings.amberTips, ...(room.companion?.tips ?? [])]);
  const tip = $derived(pool.find(t => t.id === tipId));
  const guide = $derived(room.companion?.guide[space] ?? []);
  const box = $derived(bubbleBox(spot, width, BUBBLE_W, height));
  /** CO-21: the next tip, unseen first; it is remembered as seen once shown. */
  function showNextTip() {
    const id = nextTip(pool.map(t => t.id), amberState, tipId); tipId = id; mode = 'tip';
    if (id) saveState(markTipSeen(amberState, id));
  }
  /** CO-20, CO-41: opens the bubble; Ctrl+J also focuses the Ask field. */
  export async function open(focusAsk = false) {
    menu = null;
    if (!bubble) { bubble = true; showNextTip(); }
    await tick(); if (focusAsk) askChat?.focus(); else bubbleEl?.focus();
  }
  function click() { if (dragged) { dragged = false; return; } if (motion.kind !== 'still') return; if (bubble) closeBubble(); else void open(); }
  function closeBubble(refocus = false) { bubble = false; chat.close(); if (refocus) button?.focus(); }
  async function openMenu() { closeBubble(); remeasure(); menu = 'main'; await tick(); menuEl?.querySelector<HTMLElement>('[role^=menuitem]')?.focus(); }
  function closeMenu() { menu = null; button?.focus(); }
  function moveTo(to: Spot) { closeMenu(); goTo(to); }
  function buttonKey(e: KeyboardEvent) { if (e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10')) { e.preventDefault(); void openMenu(); } }
  function menuKey(e: KeyboardEvent) {
    const items = [...(menuEl?.querySelectorAll<HTMLElement>('[role^=menuitem]') ?? [])], at = items.indexOf(document.activeElement as HTMLElement);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); items[(at + (e.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length]?.focus(); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); if (menu === 'move') { menu = 'main'; void tick().then(() => menuEl?.querySelector<HTMLElement>('[role^=menuitem]')?.focus()); } else closeMenu(); }
  }
  // CO-20: Esc or a press outside closes the bubble (and forgets its chat, CO-44); the same for the menu.
  function outside(e: PointerEvent) {
    if (!(e.target instanceof Node)) return;
    if (bubble && !bubbleEl?.contains(e.target) && !button?.contains(e.target)) closeBubble();
    if (menu && !menuEl?.contains(e.target)) menu = null;
  }
  function windowKey(e: KeyboardEvent) { if (e.key === 'Escape' && motion.kind === 'drag') { e.preventDefault(); e.stopPropagation(); cancelDrag(); } }
  $effect(() => () => { chat.close(); cancelAnimationFrame(raf); });
</script>
<svelte:window bind:innerWidth={width} bind:innerHeight={height} onpointerdowncapture={outside} onpointermove={move} onpointerup={up} onpointercancel={up} onkeydowncapture={windowKey} />
<svelte:document onvisibilitychange={visibility} />
{#if motion.kind === 'drag'}
  <!-- CO-14: while Amber is held, its spots are hinted; the one it would go to is lit. -->
  <svg class="hints" aria-hidden="true" width={width} height={height}>
    {#each spots as s (s.id)}{@const p = hintPoint(s)}{@const lit = target ? (target.kind === s.kind && (s.kind === 'rest' ? target.id === s.id : Math.abs(target.anchorX - s.anchorX) < 1)) : false}
      {#if s.kind === 'hang'}<circle cx={p.x} cy={p.y + 3} r={lit ? 4 : 2.5} class:lit />{:else}<ellipse cx={p.x} cy={p.y} rx={lit ? 26 : 20} ry={lit ? 5 : 4} class:lit />{/if}
    {/each}
  </svg>
{/if}
{#if ready}
{#if view.rope}<svg class="rope" aria-hidden="true" width={width} height={height}><path d={view.rope} /></svg>{/if}
<button bind:this={button} class="amber" class:held={motion.kind === 'drag'} data-spot={spot.id} data-motion={motion.kind} aria-label={strings.amberName} title={strings.amberTitle} aria-haspopup="dialog" aria-expanded={bubble}
  style:left={`${view.left}px`} style:top={`${view.top}px`} style:width={`${AMBER_W}px`} style:height={`${AMBER_H}px`}
  style:transform={view.angle ? `rotate(${-view.angle}deg)` : undefined} style:transform-origin={`${TIE_X}px ${TIE_Y}px`}
  onpointerdown={down} onclick={click} oncontextmenu={e => { e.preventDefault(); void openMenu(); }} onkeydown={buttonKey}>{@html svg}<svg class="hit" viewBox="-20 -24 140 148" aria-hidden="true"><path d={HIT} /></svg></button>
{/if}
{#if bubble}
  <div class="bubble" role="dialog" aria-label={strings.amberName} tabindex="-1" bind:this={bubbleEl} style:left={`${box.left}px`} style:top={box.top !== undefined ? `${box.top}px` : undefined} style:bottom={box.bottom !== undefined ? `${box.bottom}px` : undefined} style:width={`${BUBBLE_W}px`}
    onkeydown={e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeBubble(true); } }}>
    {#if mode === 'tip'}<p class="tip">{#if tip}<Emphasis text={tip.text} />{/if}</p>
    {:else}<h3>{strings.whatCanIDo}</h3><GuideLines lines={guide} />{/if}
    <div class="row"><button onclick={showNextTip}>{strings.nextTip}</button>{#if guide.length}<button aria-pressed={mode === 'guide'} onclick={() => mode = 'guide'}>{strings.whatCanIDo}</button>{/if}</div>
    <AskChat bind:this={askChat} {chat} {revision} close={() => closeBubble(true)} {openSettings} autofocus={false} />
  </div>
{/if}
{#if menu}
  <div class="menu" role="menu" tabindex="-1" aria-label={strings.amberName} bind:this={menuEl} onkeydown={menuKey} style:left={`${Math.max(8, Math.min(width - 250, spot.left))}px`}
    style:top={spot.kind === 'hang' ? `${spot.top + AMBER_H + 6}px` : undefined} style:bottom={spot.kind === 'rest' ? `${height - spot.top + 6}px` : undefined}>
    {#if menu === 'main'}
      <button role="menuitem" aria-haspopup="menu" onclick={async () => { menu = 'move'; await tick(); menuEl?.querySelector<HTMLElement>('[aria-checked=true]')?.focus(); }}>{strings.moveTo}</button>
      <button role="menuitem" onclick={() => { menu = null; hide(); }}>{strings.hideAmber}</button>
    {:else}
      {#each spots as s (s.id)}<button role="menuitemradio" aria-checked={s.kind === spot.kind && (s.kind === 'rest' ? s.id === spot.id : s.anchorX === spot.anchorX)} onclick={() => moveTo(s)}>{s.label}</button>{/each}
    {/if}
  </div>
{/if}
<style>
  /* Above the spaces, under the header's menus, the toasts and every popover (CO-17). */
  .amber, .rope, .hints { position:fixed; z-index:1; }
  .rope, .hints { left:0; top:0; pointer-events:none; overflow:visible; }
  .rope path { stroke:var(--amber-lit-far, #86624a); stroke-width:1.6; fill:none; stroke-linecap:round; }
  .hints circle, .hints ellipse { fill:var(--amber-halo, #ffac38); opacity:.35; transition:opacity .12s; } .hints .lit { opacity:.85; }
  /* Only the drawn shape takes the pointer; the halo and the box around it let clicks through. */
  .amber { padding:0; margin:0; border:0; background:none; min-width:0; pointer-events:none; cursor:grab; border-radius:12px; touch-action:none; }
  .amber.held { cursor:grabbing; }
  .amber :global(svg) { display:block; width:100%; height:100%; pointer-events:none; overflow:visible; }
  .amber :global(svg path), .amber :global(svg rect) { pointer-events:visiblePainted; }
  .amber :global(defs *) { pointer-events:none; }
  .hit { position:absolute; inset:0; } .hit path { fill:transparent; pointer-events:visiblePainted; }
  .amber:hover:not(:disabled), .amber:active { background:none; border:0; box-shadow:none; }
  .amber:focus-visible { outline:2px solid var(--focus); outline-offset:2px; }
  .bubble { position:fixed; z-index:9; display:grid; gap:10px; padding:14px 16px; box-sizing:border-box; max-height:min(70vh,560px); overflow:auto;
    background:var(--surface); border:1px solid var(--line); border-radius:12px; box-shadow:0 12px 32px rgba(0,0,0,.35); font-size:14px; line-height:1.5; }
  .bubble:focus { outline:none; } .tip { margin:0; } h3 { margin:0; font-size:14px; font-weight:600; }
  .row { display:flex; gap:8px; flex-wrap:wrap; } .row button { font-size:13px; } .row [aria-pressed='true'] { border-color:var(--accent); }
  .menu { position:fixed; z-index:9; display:grid; gap:2px; min-width:220px; max-height:60vh; overflow:auto; padding:6px; background:var(--surface); border:1px solid var(--line); border-radius:8px; box-shadow:0 10px 28px rgba(0,0,0,.35); }
  .menu button { text-align:left; border:0; background:none; padding:6px 10px; border-radius:6px; font-size:13px; }
  .menu button:hover, .menu button:focus { background:var(--surface-2); outline:none; } .menu [aria-checked='true'] { color:var(--accent); }
</style>
