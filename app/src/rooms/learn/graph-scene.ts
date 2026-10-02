import type { GraphNode, RoomVisit } from '../../core/model';
import type { Running } from './session';
import { graphMotion } from './graphMotion';
export interface SceneNode extends GraphNode { pending?: 'waiting' | 'shrinking'; slot?: number }
/** GV-90..96: ephemeral bodies and stable DOM keys; never enters the subject model. */
export class GraphScene {
  private active: { controller: AbortController; parent: string; before: Set<string>; slots: SceneNode[] } | null = null;
  private shrinking: { node: SceneNode; expires: number }[] = [];
  private aliases = new Map<string, string>();
  transfers: { from: string; to: string }[] = [];
  remaining = 0;
  completedCount:number|null=null;
  key(id: string): string { return this.aliases.get(id) ?? id; }
  update(visit: RoomVisit, running: Running | null, at: number, reduced: boolean): Record<string, SceneNode> {
    this.transfers = [];
    this.completedCount=null;
    if (this.active && this.active.controller !== running?.controller) {
      const arrived = Object.values(visit.nodes).filter(n => n.createdBy === 'tutor' && n.parents[0] === this.active!.parent && !this.active!.before.has(n.id));
      this.completedCount=arrived.length;
      this.active.slots.forEach((slot, index) => {
        const node = arrived[index];
        if (node) { this.aliases.set(node.id, slot.id); this.transfers.push({ from: slot.id, to: node.id }); }
        else if (!reduced && visit.nodes[slot.parents[0]]) this.shrinking.push({ node: { ...slot, pending: 'shrinking' }, expires: at + graphMotion.SPAWN_SHRINK_MS });
      });
      this.active = null;
    }
    if (running && !this.active && ['intro', 'light', 'more'].includes(running.task)) {
      const parent = visit.nodes[running.nodeId];
      if (parent) this.active = { controller: running.controller, parent: parent.id, before: new Set(Object.keys(visit.nodes)),
        slots: Array.from({ length: graphMotion.SPAWN_COUNT }, (_, slot) => ({ ...parent,
          id: `pending-${crypto.randomUUID()}`, parents: [parent.id], title: '', hook: '', content: '', dialogue: [],
          kind: 'deeper', state: 'open', understoodBy: null, pending: 'waiting', slot })) };
    }
    this.shrinking = reduced ? [] : this.shrinking.filter(s => s.expires > at && visit.nodes[s.node.parents[0]]);
    this.remaining = this.shrinking.length ? Math.max(1, Math.min(...this.shrinking.map(s => s.expires - at))) : 0;
    for (const id of this.aliases.keys()) if (!visit.nodes[id]) this.aliases.delete(id);
    return { ...visit.nodes, ...Object.fromEntries([...this.active?.slots ?? [], ...this.shrinking.map(s => s.node)].map(n => [n.id, n])) };
  }
}
