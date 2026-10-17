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
  import { LANDING_SETTLE, RETRACT, actDone, compose, dangle, endsStanding, flightBase, grabbedBase, hangingBase, lookAt, restingBase, startAct } from './motion';
  import type { Act } from './motion';
  import { cutNotes, greetingMs } from './greeting';
  import type { Greeting } from './greeting';
  import AskChat from './AskChat.svelte';
  import Emphasis from './Emphasis.svelte';
  import GuideLines from './GuideLines.svelte';
  /**
   * The companion (companion spec): hangs from the top bar (CO-10, CO-11) or rests at the bottom (CO-13); grabbed, it
   * follows the hand, on its rope within the top quarter of the window (CO-12), and when let go it swings, flies or falls
   * to the nearest spot (CO-14), kept per space (CO-15). A click or Enter opens its bubble (CO-20); right-click, the
   * context-menu key or Shift+F10 its menu (CO-16, CO-58). Clicks beside its drawn shape pass through (CO-17).
   * Gestures (CO-50): attention on hover or focus, curiosity on a click, suspension or a few steps when it appears,
   * lift and landing for its flights; the flame lives between them (CO-52), the eyes follow a near pointer (CO-51),
   * and the new motions (CO-54): dangling from the hand, thinking, working, leaning toward a selection card. Calm in
   * the room's calm spaces (CO-53). Reduced motion: still poses, every move straight to its spot (CO-56).
   */
  let { room, space, desktop, amberState, saveState, chat, revision, hide, openSettings, thinking = false, working = false, lean = null, greeting = null, waiting = null, greeted = () => {}, openRelease = () => {} }: {
    room: RoomDefinition; space: string; desktop: boolean; amberState: AmberState; saveState: (s: AmberState) => void;
    chat: AmberChat; revision: number; hide: () => void; openSettings: () => void;
    /** Ask Amber or a selection card is waiting for its answer (CO-42). */ thinking?: boolean;
    /** A generation the user started waits for its first words (CO-35). */ working?: boolean;
    /** The selection card's centre, to lean toward (CO-45). */ lean?: { x: number; y: number } | null;
    /** CO-30, CO-31: the launch greeting, said once; `greeted` when it has faded. */ greeting?: Greeting | null; greeted?: () => void;
    /** CO-35: what is happening while a generation waits for its first words. */ waiting?: string | null;
    openRelease?: (version: string) => void;
  } = $props();
  // CO-30, CO-31: the greeting fades after about 6 s; hovering it pauses the fade; long notes are cut, a click shows them all.
  let expanded = $state(false), sayHover = $state(false), fading = $state(false), remaining = 0, sayTimer: ReturnType<typeof setTimeout> | undefined, sayStarted = 0;
  const notes = $derived(greeting?.kind === 'update' && greeting.notes ? cutNotes(greeting.notes) : null);
  function startFade(ms: number) { clearTimeout(sayTimer); remaining = ms; sayStarted = performance.now(); sayTimer = setTimeout(endGreeting, ms); }
  function endGreeting() { fading = true; sayTimer = setTimeout(() => { fading = false; expanded = false; greeted(); }, reduced ? 0 : 400); }
  function pauseFade() { sayHover = true; if (fading) { fading = false; startFade(1500); } clearTimeout(sayTimer); remaining = Math.max(1500, remaining - (performance.now() - sayStarted)); }
  function resumeFade() { sayHover = false; startFade(remaining); }
  let shownGreeting = $state.raw<Greeting | null>(null);
  $effect(() => { if (greeting && greeting !== shownGreeting && ready && !waiting) { shownGreeting = greeting; expanded = false; startFade(greetingMs(greeting, notes?.short ?? greeting.text)); } });
  $effect(() => () => clearTimeout(sayTimer));
  /** What Amber says now: the waiting line first (CO-35), else the greeting; nothing while its bubble or menu is open. */
  const saying = $derived(waiting ? 'waiting' : greeting && shownGreeting === greeting ? 'greeting' : null);
  const BUBBLE_W = 340, SAY_W = 300, CONTROLS = 138, GRAB = 5, SWING_MAX = 6000, THROW = 6;
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
  // Gestures and moods (CO-50 to CO-54).
  let act = $state.raw<Act | null>(null), hovered = $state(false), pointer: { x: number; y: number } | null = null, look = 0, tilt = 0, lastFrame = 0;
  const calmSpace = $derived(room.companion?.calm?.includes(space) ?? false);
  /** CO-53: in a calm space Amber is still unless it is hovered, clicked, grabbed, asked or working. */
  const flameLive = $derived(!calmSpace || hovered || bubble || motion.kind !== 'still' || thinking || working || !!act);
  const leanSign = $derived(lean ? Math.sign(lean.x - (spot.left + AMBER_W / 2)) || 1 : 0);
  const view = $derived.by(() => {
    void frame;
    const m = motion, now = performance.now();
    let base: Pose, left: number, top: number, angle = 0, rope: string | null = null, hanging = true;
    if (m.kind === 'drag') { base = grabbedBase(); left = m.left; top = m.top; rope = m.rope?.path() ?? null; }
    else if (m.kind === 'swing') { base = hangingBase(); left = m.rope.end.x - TIE_X; top = m.rope.end.y - TIE_Y; angle = m.rope.angle(); rope = m.rope.path(); }
    else if (m.kind === 'flight') {
      const u = (now - m.start) / m.duration, p = flightPoint(m.from, { x: m.to.left, y: m.to.top }, u, m.mode);
      base = flightBase(m.mode, u); left = p.x; top = p.y; hanging = false;
    } else {
      hanging = spot.kind === 'hang'; base = hanging ? hangingBase() : restingBase(); left = spot.left; top = spot.top;
      rope = hanging ? `M${spot.anchorX} ${BAR} L${spot.anchorX} ${spot.top + TIE_Y}` : null;
    }
    // CO-45: lean toward the selection card (hanging from the loop, the body swings toward it; standing, it tips).
    const leanDeg = leanSign * 6 * (hanging ? -1 : 1);
    const z = compose(base, act, { thinking, working, look: leanSign || look, lean: tilt + leanDeg, flame: flameLive }, now, reduced);
    return { left, top, angle, pose: z, rope };
  });
  // CO-55: the identity's warm flame and body; the halo and the light on the frame follow the room's --amber-* tokens.
  // The flame's clock is bucketed to about 30 frames a second, so a living flame redraws at most that often.
  const poseKey = (z: Pose) => [z.x, z.y, z.angle, z.feet, z.step, z.gaze, z.lid, z.line, z.pivot].map(v => v.toFixed(2)).join() + ':' + Math.floor((z.flameTime ?? 0) / 33);
  // The drawing (an SVG with a blur filter) is rebuilt at most about 30 times a second; only the position runs every frame.
  let lastKey = '', lastSvg = '', drawnAt = -Infinity;
  const svg = $derived.by(() => {
    const key = poseKey(view.pose), now = performance.now();
    if (key !== lastKey && (now - drawnAt >= 32 || motion.kind === 'still' && !act)) { lastKey = key; drawnAt = now; lastSvg = companionSvg(GESTURE.suspension, view.pose, uid, 'learn', true); }
    return lastSvg;
  });
  let reduced = $state(reducedMotion());
  $effect(() => { const media = matchMedia('(prefers-reduced-motion: reduce)'), update = () => reduced = reducedMotion();
    const observer = new MutationObserver(update); observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-reduce-motion'] });
    media.addEventListener('change', update); return () => { media.removeEventListener('change', update); observer.disconnect(); }; });
  /** Plays a gesture (CO-50), interrupting one in progress over 180 ms (CO-56); nothing with reduced motion. */
  function play(gesture: number, offset = 0) { if (reduced || document.hidden) return; const now = performance.now(); act = startAct(gesture, now, act && !actDone(act, now) ? view.pose : null, offset); run(); }
  // CO-50: when it appears it hangs (suspension) or, at the bottom, takes a few steps in; on each space it opens on.
  let appeared = '';
  $effect(() => { if (!ready) return; const key = `${room.id}/${space}`; if (key === appeared) return; appeared = key; play(spot.kind === 'hang' ? GESTURE.suspension : GESTURE.steps); });
  // Moods that animate keep the loop running.
  $effect(() => { if (thinking || working || lean || flameLive) run(); });
  const target = $derived(motion.kind === 'drag' ? dropTarget(hangs, rests, motion.left, motion.top, height) : null);

  function loop(now: number) {
    const m = motion, dt = lastNow ? Math.min(64, now - lastNow) : 16; lastNow = now;
    if (m.kind === 'swing') {
      m.acc += dt / 1000;
      let steps = 0; while (m.acc >= STEP && steps < 16) { m.rope.step(); m.acc -= STEP; steps++; }
      if (m.rope.settled() || now - m.start > SWING_MAX) { commit(m.to); }
    } else if (m.kind === 'flight') { if (now - m.start >= m.duration) arrive(m); }
    else if (m.kind === 'drag') { if (m.rope) for (let i = 0; i < 2; i++) m.rope.step(); tilt = dangle(tilt, hand, dt); hand *= Math.exp(-dt / 120); }
    if (m.kind !== 'drag') tilt = dangle(tilt, 0, dt);
    // CO-51: the eyes ease toward the pointer.
    const centre = { x: view.left + AMBER_W / 2, y: view.top + AMBER_H / 2 }, target = reduced ? 0 : lookAt(centre, pointer);
    look += (target - look) * (1 - Math.exp(-dt / 110)); if (Math.abs(look - target) < .01) look = target;
    // Landed or stepped in at a resting spot: the feet fold in and Amber sits down.
    if (act && actDone(act, now)) { const ended = act.gesture; act = endsStanding(ended) && motion.kind === 'still' && spot.kind === 'rest' && !reduced ? { gesture: RETRACT, start: now } : null; }
    const busy = motion.kind !== 'still' || !!act || Math.abs(tilt) > .05 || look !== target || (!reduced && (thinking || working || !!lean || flameLive));
    // Only motion needs every frame; a living flame, the eyes and the moods redraw about 30 times a second.
    if (motion.kind !== 'still' || now - lastFrame >= 32) { frame++; lastFrame = now; }
    raf = busy && !document.hidden ? requestAnimationFrame(loop) : 0;
  }
  let hand = 0;
  /** CO-14: at the end of a flight, a fall finishes its landing at the spot; a flight up to the bar settles on the rope. */
  function arrive(m: Extract<Motion, { kind: 'flight' }>) {
    commit(m.to);
    if (m.to.kind === 'hang') play(GESTURE.suspension); else play(GESTURE.landing, m.mode === 'fall' ? LANDING_SETTLE : 0);
  }
  let lastNow = 0;
  function run() { if (!raf && !document.hidden) { lastNow = 0; raf = requestAnimationFrame(loop); } }
  function commit(to: Spot) { motion = { kind: 'still' }; saveState(setSpot(amberState, room.id, space, to.id)); run(); }
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
    if (e.button !== 0) return;
    grab = { x: e.clientX, y: e.clientY, dx: e.clientX - view.left, dy: e.clientY - view.top, id: e.pointerId }; dragged = false;
    // Swinging or in flight, Amber can be caught at once, where it is (the user, 2026-10-17); a swing keeps its rope.
    const m = motion;
    if (m.kind === 'swing' || m.kind === 'flight') {
      const rope = m.kind === 'swing' ? m.rope : null;
      rope?.hold({ x: view.left + TIE_X, y: view.top + TIE_Y }, rope.anchor);
      act = null; dragged = true; motion = { kind: 'drag', left: view.left, top: view.top, vx: 0, vy: 0, at: performance.now(), rope }; run();
    }
  }
  function move(e: PointerEvent) {
    pointer = { x: e.clientX, y: e.clientY };
    if (!reduced && !raf && lookAt({ x: view.left + AMBER_W / 2, y: view.top + AMBER_H / 2 }, pointer) !== look) run();
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
    hand = hand * (1 - k) + (left - m.left) / dt * k;
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
  function visibility() {
    if (document.hidden) { const m = motion; grab = null; act = null; if (m.kind === 'swing' || m.kind === 'flight') commit(m.to); else if (m.kind === 'drag') commit(spot); }
    else run();
  }

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
  function click() { if (dragged) { dragged = false; return; } if (motion.kind !== 'still') return; if (bubble) closeBubble(); else { play(GESTURE.curiosity); void open(); } }
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
<button bind:this={button} class="amber" class:held={motion.kind === 'drag'} data-spot={spot.id} data-motion={motion.kind} data-act={act ? act.gesture : ''} aria-label={strings.amberName} title={strings.amberTitle} aria-haspopup="dialog" aria-expanded={bubble}
  style:left={`${view.left}px`} style:top={`${view.top}px`} style:width={`${AMBER_W}px`} style:height={`${AMBER_H}px`}
  style:transform={view.angle ? `rotate(${view.angle}deg)` : undefined} style:transform-origin={`${TIE_X}px ${TIE_Y}px`}
  onpointerover={() => { if (!hovered) { hovered = true; if (!act) play(GESTURE.rest); } }} onpointerout={e => { if (!button?.contains(e.relatedTarget as Node)) hovered = false; }}
  onfocus={() => { if (!act) play(GESTURE.rest); }} onpointerdown={down} onclick={click} oncontextmenu={e => { e.preventDefault(); void openMenu(); }} onkeydown={buttonKey}>{@html svg}<svg class="hit" viewBox="-20 -24 140 148" aria-hidden="true"><path d={HIT} /></svg></button>
{/if}
{#if saying && ready && !bubble && !menu && motion.kind === 'still'}{@const at = bubbleBox(spot, width, SAY_W, height)}
  <div class="say" class:fading role="status" aria-live="polite" data-testid="amber-says" style:left={`${at.left}px`} style:top={at.top !== undefined ? `${at.top}px` : undefined} style:bottom={at.bottom !== undefined ? `${at.bottom}px` : undefined} style:width={`${SAY_W}px`}
    onpointerenter={() => { if (saying === 'greeting') pauseFade(); }} onpointerleave={() => { if (saying === 'greeting' && sayHover) resumeFade(); }}>
    {#if saying === 'waiting'}<p>{waiting}</p>
    {:else if greeting}<p>{greeting.text}</p>
      {#if greeting.kind === 'update'}
        {#if notes}<p class="notes">{expanded ? greeting.notes : notes.short}</p>{#if notes.cut && !expanded}<button class="quiet" onclick={() => { expanded = true; remaining = Math.max(remaining, 15000); }}>{strings.showAllNotes}</button>{/if}{/if}
        <button class="quiet link" onclick={() => openRelease(greeting.version)}>{strings.fullReleaseNotes}</button>
      {/if}
    {/if}
  </div>
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
  .say { position:fixed; z-index:9; display:grid; gap:6px; padding:10px 14px; box-sizing:border-box; max-height:min(60vh,480px); overflow:auto;
    background:var(--surface); border:1px solid var(--line); border-radius:12px; box-shadow:0 10px 28px rgba(0,0,0,.3); font-size:14px; line-height:1.5; transition:opacity .4s; }
  .say.fading { opacity:0; } .say p { margin:0; } .say .notes { white-space:pre-wrap; color:var(--ink-mute); font-size:13px; }
  .say .quiet { justify-self:start; background:none; border:0; padding:0; font-size:13px; color:var(--accent); }
  @media (prefers-reduced-motion: reduce) { .say { transition:none; } }
  .bubble:focus { outline:none; } .tip { margin:0; } h3 { margin:0; font-size:14px; font-weight:600; }
  .row { display:flex; gap:8px; flex-wrap:wrap; } .row button { font-size:13px; } .row [aria-pressed='true'] { border-color:var(--accent); }
  .menu { position:fixed; z-index:9; display:grid; gap:2px; min-width:220px; max-height:60vh; overflow:auto; padding:6px; background:var(--surface); border:1px solid var(--line); border-radius:8px; box-shadow:0 10px 28px rgba(0,0,0,.35); }
  .menu button { text-align:left; border:0; background:none; padding:6px 10px; border-radius:6px; font-size:13px; }
  .menu button:hover, .menu button:focus { background:var(--surface-2); outline:none; } .menu [aria-checked='true'] { color:var(--accent); }
</style>
