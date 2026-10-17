import { GESTURES, GESTURE, mix, pose, still } from '../../assets/identity/companion/lantern';
import type { Pose } from '../../assets/identity/companion/lantern';
/**
 * CO-50 to CO-57: what Amber's pose is at a moment. The six accepted gestures come from the identity release
 * unchanged; the new motions (grabbed and dangling, thinking, working, eyes following) are designed here (CO-54) and
 * only move what the identity lets move: the tilt, the gaze, the lids, a small bob, the flame's clock. The
 * silhouette, the face and the flame tokens never change.
 */
export interface Act { gesture: number; start: number; from?: Pose; offset?: number }
export interface Mood {
  /** Ask Amber is waiting for its answer (CO-42). */
  thinking: boolean;
  /** A generation the user started waits for its first words (CO-35). */
  working: boolean;
  /** Eyes toward the pointer, -1 (left) to 1 (right), 0 when it is far (CO-51). */
  look: number;
  /** Extra tilt in degrees: dangling from the hand, or leaning toward the selection card (CO-45). */
  lean: number;
  /** The living flame (CO-52); false while calm (CO-53) or with reduced motion. */
  flame: boolean;
}
/** CO-56: the 180 ms stabilisation of an interrupted gesture (IMPLEMENTATION.md). */
export const INTERRUPT = 180;
/**
 * Settling down (the user, 2026-10-17): after landing or a few steps, the feet fold in and Amber sits on its base.
 * Not one of the release's gestures; designed here from its feet and height (CO-54).
 */
export const RETRACT = 100, RETRACT_MS = 450;
const duration = (gesture: number) => gesture === RETRACT ? RETRACT_MS : GESTURES[gesture].duration;
const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));

/** A gesture is over when its time has run out. */
export const actDone = (act: Act | null, now: number) => !act || now - act.start + (act.offset ?? 0) >= duration(act.gesture);

/**
 * Starts a gesture. One already playing is interrupted: the new one blends from the pose it had reached over 180 ms.
 * `offset` starts a gesture part-way (the landing's settle after a fall).
 */
export function startAct(gesture: number, now: number, current: Pose | null, offset = 0): Act {
  return { gesture, start: now, offset, ...(current ? { from: { ...current } } : {}) };
}

/**
 * The pose: the base (hanging, resting, flying or falling) with the playing gesture laid over it, then the moods.
 * Reduced motion (`reduced`) gives the still base: no gesture, no flame, no eyes (CO-56).
 */
export function compose(base: Pose, act: Act | null, mood: Mood, now: number, reduced = false): Pose {
  if (reduced) return { ...base, flameTime: 0 };
  const z: Pose = { ...base };
  if (act && !actDone(act, now)) {
    const t = now - act.start + (act.offset ?? 0), g = act.gesture === RETRACT ? still(GESTURE.landing) : pose(act.gesture, t);
    if (act.gesture === RETRACT) { const e = t / RETRACT_MS, k = e * e * (3 - 2 * e); z.feet = 1 - k; z.y = g.y * (1 - k); }
    else if (act.gesture === GESTURE.rest) z.lid = g.lid;
    else if (act.gesture === GESTURE.curiosity) { z.angle += g.angle * (z.line ? .7 : 1); z.gaze += g.gaze; }
    else if (act.gesture === GESTURE.suspension) z.angle += g.angle;
    // A few steps in: the release's walk, ending where the resting pose stands (its x ends at 12).
    else if (act.gesture === GESTURE.steps) { z.x = g.x - 12; z.y = g.y; z.feet = g.feet; z.step = g.step; z.angle += g.angle; }
    else if (act.gesture === GESTURE.landing) { z.y = g.y; z.feet = g.feet; }
    else if (act.gesture === GESTURE.lift) { z.y = g.y; z.angle += g.angle; }
    if (act.from && now - act.start < INTERRUPT) Object.assign(z, mix(act.from, z, (now - act.start) / INTERRUPT));
  }
  // Thinking: the eyes wander slowly, half-lidded, a slight sway, as if turning the question over.
  if (mood.thinking) { z.gaze += 2.2 * Math.sin(now / 640); z.angle += 1.4 * Math.sin(now / 910); z.lid = Math.max(z.lid, .3); }
  // Working: tending its flame, lids lowered toward it, a small bob; the flame runs a little faster.
  if (mood.working) { z.lid = Math.max(z.lid, .45); z.y -= 1.2 * Math.abs(Math.sin(now / 420)); z.angle += .9 * Math.sin(now / 840); }
  z.gaze = clamp(z.gaze + 3 * mood.look, -3.5, 3.5);
  z.angle += mood.lean;
  z.flameTime = mood.flame || mood.working || mood.thinking ? now * (mood.working ? 1.6 : 1) : 0;
  return z;
}

/** CO-50: the base pose for where Amber is. */
export const hangingBase = (): Pose => still(GESTURE.suspension);
/** Resting at the bottom: sitting on its base, feet folded in (the identity's still pose). */
export const restingBase = (): Pose => still(GESTURE.rest);
/** The gestures that end standing at a resting spot, after which Amber settles down. */
export const endsStanding = (gesture: number) => gesture === GESTURE.landing || gesture === GESTURE.steps;
/** CO-14: flying is the release's *heat and lift*, falling its *descent and landing*, both run along the move. */
export function flightBase(mode: 'fly' | 'fall', progress: number): Pose {
  const u = clamp(progress, 0, 1);
  return mode === 'fly' ? pose(GESTURE.lift, u * GESTURES[GESTURE.lift].duration) : pose(GESTURE.landing, u * .7 * GESTURES[GESTURE.landing].duration);
}
/** After a fall, the landing's last part plays at the spot: the feet settle. */
export const LANDING_SETTLE = .7 * GESTURES[GESTURE.landing].duration;
/**
 * Grabbed and dangling: hanging from the hand by its loop, the feet half out, the body trailing behind the hand's
 * sideways speed (px/ms). Positive degrees turn clockwise, so the body swings left of the loop when the hand goes right.
 */
export function dangle(previous: number, handSpeed: number, dt: number): number {
  const target = clamp(handSpeed * 18, -16, 16), k = 1 - Math.exp(-dt / 90);
  return previous + (target - previous) * k;
}
export function grabbedBase(): Pose { const z = still(GESTURE.suspension); z.feet = .5; return z; }
/** CO-51: the eyes turn toward the pointer within about 240 px, more as it comes closer. */
export function lookAt(centre: { x: number; y: number }, pointer: { x: number; y: number } | null): number {
  if (!pointer) return 0;
  const dx = pointer.x - centre.x, d = Math.hypot(dx, pointer.y - centre.y);
  return d > 240 ? 0 : clamp(dx / 80, -1, 1) * Math.min(1, (240 - d) / 80);
}
