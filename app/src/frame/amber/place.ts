/** CO-10, CO-11, CO-17: where Amber hangs, in window pixels. Pure, so the rules are unit-tested. */
export const BAR = 56;
/** IDENTITY.md: the companion is shown at 64 px or more (face legible); 72 px wide, the release's 140 × 148 frame. */
export const AMBER_W = 72, AMBER_H = Math.round(AMBER_W * 148 / 140);
/** Pixels per unit of the actor's viewBox (-20 -24 140 148). */
export const UNIT = AMBER_W / 140;
/** The suspension line starts 8 units under the viewBox top (`M50 -16`); the rope ties on there, at the centre. */
export const TIE_Y = 8 * UNIT, TIE_X = 70 * UNIT;
export const HANG_COUNT = 10, DEFAULT_SPOT = 'hang-9';
/** CO-11: the rope is 0 to 160 px; hanging Amber starts on a short one. */
export const ROPE_MIN = 0, ROPE_MAX = 160, ROPE_DEFAULT = 14;
const EDGE = 16, CONTROLS_GAP = 14;

export interface Spot { id: string; kind: 'hang'; index: number; left: number; top: number; rope: number }

/** CO-11: ten positions equally spaced along the bar, never over the window controls (138 px on the desktop). */
export function hangSpots(width: number, controls: number): Spot[] {
  const min = EDGE, max = Math.max(min, width - controls - (controls ? CONTROLS_GAP : EDGE) - AMBER_W);
  return Array.from({ length: HANG_COUNT }, (_, index) => ({
    id: `hang-${index}`, kind: 'hang' as const, index, left: Math.round(min + (max - min) * index / (HANG_COUNT - 1)),
    top: BAR + ROPE_DEFAULT - TIE_Y, rope: ROPE_DEFAULT
  }));
}
/** A saved spot that no longer exists (an older or newer app) falls back to the default. */
export function spotById(spots: readonly Spot[], id: string | undefined): Spot {
  return spots.find(s => s.id === id) ?? spots.find(s => s.id === DEFAULT_SPOT) ?? spots[spots.length - 1];
}
/** CO-20: the bubble opens under Amber, toward the middle of the window, inside it. */
export function bubbleBox(spot: Spot, width: number, bubbleWidth: number): { left: number; top: number } {
  const centre = spot.left + AMBER_W / 2, left = centre > width / 2 ? spot.left + AMBER_W - bubbleWidth : spot.left;
  return { left: Math.max(8, Math.min(width - bubbleWidth - 8, left)), top: spot.top + AMBER_H + 6 };
}
