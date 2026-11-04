import { cloneJson } from '../core/model';
import type { RoomVisit } from '../core/model';

/** RS-62: how many steps one subject keeps; each holds a whole visit's graph. */
export const UNDO_LIMIT = 50;
interface Step { state: string; focusId: string }
/** RS-61: what a step restores. The log, the model and the effort stay as they are; focus moves with the step but is no change of its own. */
const stateOf = (visit: RoomVisit) => JSON.stringify({ nodes: visit.nodes, data: visit.data });
const stepOf = (visit: RoomVisit): Step => ({ state: stateOf(visit), focusId: visit.focusId });

/**
 * RS-60 to RS-64: undo and redo for one room visit, in memory for the session. The frame shows it every saved
 * state, so it needs no help from the rooms' actions. A step is whatever one save changed.
 */
export class UndoHistory {
  private past: Step[] = [];
  private future: Step[] = [];
  private current: Step;
  constructor(visit: RoomVisit, private limit = UNDO_LIMIT) { this.current = stepOf(visit); }

  /** Called after every save. A new state becomes a step and ends what could be redone. */
  observe(visit: RoomVisit): void {
    const state = stateOf(visit);
    if (state === this.current.state) { this.current.focusId = visit.focusId; return; }
    this.past.push(this.current); if (this.past.length > this.limit) this.past.shift();
    this.future = [];
    this.current = { state, focusId: visit.focusId };
  }
  /** The visit one step back, for the caller to swap in; null when there is none. */
  undo(visit: RoomVisit): RoomVisit | null { return this.move(visit, this.past, this.future); }
  redo(visit: RoomVisit): RoomVisit | null { return this.move(visit, this.future, this.past); }
  /** RS-63: the subject changed outside this session, so the old steps no longer lead anywhere true. */
  reset(visit: RoomVisit): void { this.past = []; this.future = []; this.current = stepOf(visit); }

  private move(visit: RoomVisit, from: Step[], to: Step[]): RoomVisit | null {
    const step = from.pop(); if (!step) return null;
    to.push(this.current); this.current = step;
    const { nodes, data } = JSON.parse(step.state) as Pick<RoomVisit, 'nodes' | 'data'>;
    const { data: _, ...rest } = cloneJson(visit);
    return { ...rest, nodes, ...(data === undefined ? {} : { data }), focusId: Object.hasOwn(nodes, step.focusId) ? step.focusId : visit.rootId };
  }
}
