/** CO-10 to CO-16: where Amber hangs or rests, in window pixels. Pure, so the rules are unit-tested. */
import type { RestSpec } from '../room';
export const BAR = 56;
/** IDENTITY.md: the companion is shown at 64 px or more (face legible); 72 px wide, the release's 140 × 148 frame. */
export const AMBER_W = 72, AMBER_H = Math.round(AMBER_W * 148 / 140);
/** Pixels per unit of the actor's viewBox (-20 -24 140 148). */
export const UNIT = AMBER_W / 140;
/** The suspension line starts 8 units under the viewBox top (`M50 -16`); the rope ties on there, at the centre. */
export const TIE_Y = 8 * UNIT, TIE_X = 70 * UNIT;
/** Standing (the landing pose, feet out): the feet touch the ground 123 units under the viewBox top. */
export const FEET_Y = 123 * UNIT;
export const HANG_COUNT = 10, DEFAULT_SPOT = 'hang-9';
/** CO-11: the rope is 0 to 160 px; hanging Amber starts on a short one. */
export const ROPE_MIN = 0, ROPE_MAX = 160, ROPE_DEFAULT = 14;
const EDGE = 16, CONTROLS_GAP = 14;

export interface Spot {
  id: string; kind: 'hang' | 'rest'; label: string;
  /** Amber's box. */
  left: number; top: number;
  /** Hanging: the rope's length and where it ties on the bar. */
  rope: number; anchorX: number;
  /** Resting: where the feet stand. */
  ground: number;
}
export interface Rect { left: number; top: number; right: number; bottom: number; width: number; height: number }

export const clampRope = (rope: number) => Math.round(Math.max(ROPE_MIN, Math.min(ROPE_MAX, rope)));
/** A saved hanging spot carries its rope length when it is not the default: `hang-3:42`. */
export function parseSpotId(id: string | undefined): { base: string; rope?: number } {
  const m = /^(hang-\d):(\d{1,3})$/.exec(id ?? '');
  return m ? { base: m[1], rope: clampRope(Number(m[2])) } : { base: id ?? '' };
}
export const hangId = (index: number, rope: number) => rope === ROPE_DEFAULT ? `hang-${index}` : `hang-${index}:${clampRope(rope)}`;

function hang(index: number, left: number, rope: number, label: string): Spot {
  return { id: hangId(index, rope), kind: 'hang', label, left, top: BAR + rope - TIE_Y, rope, anchorX: left + TIE_X, ground: 0 };
}
/** CO-11: ten positions equally spaced along the bar, never over the window controls (138 px on the desktop). */
export function hangSpots(width: number, controls: number, label: (n: number) => string = n => `hang ${n}`): Spot[] {
  const min = EDGE, max = Math.max(min, width - controls - (controls ? CONTROLS_GAP : EDGE) - AMBER_W);
  return Array.from({ length: HANG_COUNT }, (_, index) => hang(index, Math.round(min + (max - min) * index / (HANG_COUNT - 1)), ROPE_DEFAULT, label(index + 1)));
}
/** Standing with the feet on `ground`, its box's left at `left`. */
export function rest(id: string, label: string, left: number, ground: number): Spot {
  return { id: `rest-${id}`, kind: 'rest', label, left: Math.round(left), top: Math.round(ground - FEET_Y), rope: 0, anchorX: 0, ground: Math.round(ground) };
}
/**
 * CO-13, RS-3: a room's bottom resting positions, each in a corner of an element of the space. An anchor that is
 * missing or too small (a collapsed side) gives no spot; with none at all, the space's two bottom corners.
 */
export function restSpots(specs: readonly RestSpec[] | undefined, find: (anchor: string) => Rect | null, spaces: Rect, labels: { left: string; right: string }): Spot[] {
  const corner = (id: string, label: string, r: Rect, side: 'left' | 'right', x: number, y: number) =>
    rest(id, label, side === 'left' ? r.left + x : r.right - x - AMBER_W, r.bottom - y);
  const found = (specs ?? []).flatMap(s => { const r = find(s.anchor); return r && r.width >= AMBER_W + 2 * (s.inset?.x ?? EDGE) && r.height >= AMBER_H * 2 ? [corner(s.id, s.label, r, s.side, s.inset?.x ?? EDGE, s.inset?.y ?? EDGE)] : []; });
  return found.length ? found : [corner('left', labels.left, spaces, 'left', EDGE, EDGE), corner('right', labels.right, spaces, 'right', EDGE, EDGE)];
}
/** A saved spot that no longer exists (another layout, an older app) falls back to the default; a saved rope is kept. */
export function spotById(spots: readonly Spot[], id: string | undefined): Spot {
  const { base, rope } = parseSpotId(id);
  const found = spots.find(s => s.id === base);
  if (found && found.kind === 'hang' && rope !== undefined) return hang(Number(base.slice(5)), found.left, rope, found.label);
  return found ?? spots.find(s => s.id === DEFAULT_SPOT) ?? spots[0];
}
/** Where a spot's hint is drawn, and what "nearest" measures from: the tie under the bar, or the feet on the ground. */
export const hintPoint = (s: Spot) => s.kind === 'hang' ? { x: s.anchorX, y: BAR } : { x: s.left + AMBER_W / 2, y: s.ground };
/** CO-14: the nearest spot to Amber's box at (left, top), measured from its centre. */
export function nearest(spots: readonly Spot[], left: number, top: number): Spot {
  const cx = left + AMBER_W / 2, cy = top + AMBER_H / 2;
  return spots.reduce((best, s) => {
    const d = Math.hypot(s.left + AMBER_W / 2 - cx, s.top + AMBER_H / 2 - cy), b = Math.hypot(best.left + AMBER_W / 2 - cx, best.top + AMBER_H / 2 - cy);
    return d < b ? s : best;
  });
}
/**
 * CO-12: released within the top quarter of the window, Amber hangs from the nearest point of the bar on a rope
 * as long as the drop allows (0 to 160 px); anywhere else it goes to the nearest resting position (CO-14).
 */
export function dropTarget(hangs: readonly Spot[], rests: readonly Spot[], left: number, top: number, windowHeight: number): Spot {
  const tieY = top + TIE_Y;
  if (tieY < windowHeight / 4 || !rests.length) {
    const near = hangs.reduce((best, s) => Math.abs(s.anchorX - (left + TIE_X)) < Math.abs(best.anchorX - (left + TIE_X)) ? s : best);
    const index = Number(near.id.slice(5).split(':')[0]);
    return hang(index, near.left, clampRope(tieY - BAR), near.label);
  }
  return nearest(rests, left, top);
}
/** CO-20: the bubble opens toward the middle of the window: under a hanging Amber, above a resting one. */
export function bubbleBox(spot: Spot, width: number, bubbleWidth: number, height: number): { left: number; top?: number; bottom?: number } {
  const centre = spot.left + AMBER_W / 2, left = centre > width / 2 ? spot.left + AMBER_W - bubbleWidth : spot.left;
  const x = Math.max(8, Math.min(width - bubbleWidth - 8, left));
  return spot.kind === 'hang' ? { left: x, top: spot.top + AMBER_H + 6 } : { left: x, bottom: Math.max(8, height - spot.top + 6) };
}
