// GV-14: when a free map grows, only the new nodes move. They find their seats among the nodes already there,
// which push them away (charge), keep their distance (collision) and hold them on their edges (links), and do
// not move themselves. One force does all three, for the new nodes only: a tick costs new × all, not all².
// GV-17: a dragged node's branch is seated the same way, around the node held under the pointer.
import { separation, type LabelBox } from './label-force';
import { graphMotion } from './graphMotion';

export interface Body { id: string; x?: number; y?: number; vx?: number; vy?: number; fx?: number | null; fy?: number | null }
type Link = { source: Body; target: Body };
export interface SeatOptions {
  /** A body's push (d3's many-body strength): one for all, or per body. */
  charge: number | ((b: Body) => number);
  /** Collision: discs of this radius, or (GV-15) each body's disc-and-title box. */
  collide: number; box?: (b: Body) => LabelBox;
  linkDistance: number | ((link: Link) => number); linkStrength: number; centre: number;
}

/** A d3-force force: moves the bodies being seated, against every body of the map (`all`) and along `links`. */
export function seatForce(all: () => Iterable<Body>, links: () => Iterable<Link>, o: SeatOptions) {
  let seating: Body[] = [], moving = new Set<Body>();
  const charge = typeof o.charge === 'number' ? () => o.charge as number : o.charge;
  const distance = typeof o.linkDistance === 'number' ? () => o.linkDistance as number : o.linkDistance;
  const { gapX, gapY } = graphMotion.label;
  function force(alpha: number) {
    const bodies = [...all()], reach = o.collide * 2;
    const boxes = o.box ? new Map(bodies.map(b => [b, o.box!(b)])) : null;
    for (const s of seating) {
      if (s.fx != null) continue;
      const sx = s.x ?? 0, sy = s.y ?? 0;
      let vx = s.vx ?? 0, vy = s.vy ?? 0;
      for (const p of bodies) {
        if (p === s) continue;
        // A pair of moving nodes shares each push; a node that stays takes none of it.
        const share = moving.has(p) && p.fx == null ? .5 : 1;
        let dx = (p.x ?? 0) - sx, dy = (p.y ?? 0) - sy;
        if (!dx && !dy) { dx = (s.id < p.id ? -1 : 1) * 1e-3; dy = 1e-3; }
        const l2 = Math.max(1, dx * dx + dy * dy);
        // Charge (as d3's many-body, exact): strength / distance, along the line between them.
        const w = charge(p) * alpha / l2 * share;
        vx += dx * w; vy += dy * w;
        if (boxes) {
          // Collision on the boxes: out of the other's box by the shorter way.
          const ahead = share < 1 ? 1 : 0;
          const out = separation(sx + vx, sy + vy, boxes.get(s)!, (p.x ?? 0) + (p.vx ?? 0) * ahead, (p.y ?? 0) + (p.vy ?? 0) * ahead, boxes.get(p)!, gapX, gapY);
          if (out) { vx += out.x * .7 * share; vy += out.y * .7 * share; }
        } else if (l2 < reach * reach) {
          // Collision: two discs closer than twice the radius are pushed apart.
          const l = Math.sqrt(l2), k = (reach - l) / l * share;
          vx -= dx * k * .5; vy -= dy * k * .5;
        }
      }
      // A little pull to the centre, as the free layout's x/y forces.
      vx -= sx * o.centre * alpha; vy -= sy * o.centre * alpha;
      s.vx = vx; s.vy = vy;
    }
    // Links: a spring to the link distance, all of it on the moving end.
    for (const link of links()) {
      const { source, target } = link;
      const a = moving.has(source) && source.fx == null, b = moving.has(target) && target.fx == null; if (!a && !b) continue;
      const dx = (target.x ?? 0) + (target.vx ?? 0) - (source.x ?? 0) - (source.vx ?? 0);
      const dy = (target.y ?? 0) + (target.vy ?? 0) - (source.y ?? 0) - (source.vy ?? 0);
      const l = Math.hypot(dx, dy) || 1, k = (l - distance(link)) / l * alpha * o.linkStrength;
      const toTarget = a && b ? .5 : b ? 1 : 0;
      if (b) { target.vx = (target.vx ?? 0) - dx * k * toTarget; target.vy = (target.vy ?? 0) - dy * k * toTarget; }
      if (a) { source.vx = (source.vx ?? 0) + dx * k * (1 - toTarget); source.vy = (source.vy ?? 0) + dy * k * (1 - toTarget); }
    }
  }
  force.initialize = (nodes: Body[]) => { seating = nodes; moving = new Set(nodes); };
  return force;
}
