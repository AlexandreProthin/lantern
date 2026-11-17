import type { RoomVisit } from '../../core/model';
/**
 * CO-59 (added 2026-11-17): Amber's reactions to the learner, read from the open subject between two moments: a node
 * reaching one of the room's flare states (understood, chosen), nodes new to the graph, the focus moving. Pure and
 * cheap: one pass over the nodes, at most a few times a second (Amber coalesces the subject's revisions).
 */
export interface Glimpse { subject: string; focus: string; states: Map<string, string> }
export type Reaction = { kind: 'flare' | 'glance' | 'look'; node: string };
export function glimpse(subject: string, visit: RoomVisit): Glimpse {
  const states = new Map<string, string>();
  for (const id in visit.nodes) states.set(id, visit.nodes[id].state);
  return { subject, focus: visit.focusId, states };
}
/**
 * What Amber reacts to between two glimpses, the strongest first: a flare beats a glance at new nodes, which beats a
 * look toward the focus. Nothing on the first glimpse of a subject (opening one is not something to react to).
 */
export function reaction(before: Glimpse | null, after: Glimpse, flare: readonly string[]): Reaction | null {
  if (!before || before.subject !== after.subject) return null;
  let added: string | null = null;
  for (const [id, state] of after.states) {
    const was = before.states.get(id);
    if (was === undefined) { added ??= id; continue; }
    if (was !== state && flare.includes(state)) return { kind: 'flare', node: id };
  }
  if (added) return { kind: 'glance', node: added };
  if (after.focus && after.focus !== before.focus) return { kind: 'look', node: after.focus };
  return null;
}
/** How long each reaction lasts, in ms. */
export const REACTION_MS = { flare: 1400, glance: 1300, look: 1100 } as const;
/** CO-59: the flare's strength over its time: a quick rise, then it fades. */
export function flareAt(t: number): number {
  if (t <= 0 || t >= REACTION_MS.flare) return 0;
  const rise = 180;
  if (t < rise) { const u = t / rise; return u * u * (3 - 2 * u); }
  const u = (t - rise) / (REACTION_MS.flare - rise); return (1 - u) * (1 - u);
}
/** CO-59: Amber dozes after this long without the pointer, a key or a change to the subject. */
export const DOZE_AFTER = 3 * 60_000;
/** Where to look for a point on the page from Amber's centre: -1 (left) to 1 (right), full beyond 120 px. */
export const lookToward = (centre: { x: number; y: number }, point: { x: number; y: number }) => Math.max(-1, Math.min(1, (point.x - centre.x) / 120));
