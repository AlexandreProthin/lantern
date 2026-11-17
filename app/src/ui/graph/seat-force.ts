// GV-14: when a free map grows, only the new nodes move. They find their seats among the nodes already there,
// which push them away (charge), keep their distance (collision) and hold them on their edges (links), and do
// not move themselves. One force does all three, for the new nodes only: a tick costs new × all, not all².
export interface Body { id: string; x?: number; y?: number; vx?: number; vy?: number }
export interface SeatOptions { charge: number; collide: number; linkDistance: number; linkStrength: number; centre: number }

/** A d3-force force: moves the bodies being seated, against every body of the map (`all`) and along `links`. */
export function seatForce(all: () => Iterable<Body>, links: () => Iterable<{ source: Body; target: Body }>, o: SeatOptions) {
  let seating: Body[] = [], moving = new Set<Body>();
  function force(alpha: number) {
    const bodies = [...all()], reach = o.collide * 2;
    for (const s of seating) {
      const sx = s.x ?? 0, sy = s.y ?? 0;
      let vx = s.vx ?? 0, vy = s.vy ?? 0;
      for (const p of bodies) {
        if (p === s) continue;
        // A pair of new nodes shares each push; a node already there takes none of it.
        const share = moving.has(p) ? .5 : 1;
        let dx = (p.x ?? 0) - sx, dy = (p.y ?? 0) - sy;
        if (!dx && !dy) { dx = (s.id < p.id ? -1 : 1) * 1e-3; dy = 1e-3; }
        const l2 = Math.max(1, dx * dx + dy * dy);
        // Charge (as d3's many-body, exact): strength / distance, along the line between them.
        const w = o.charge * alpha / l2 * share;
        vx += dx * w; vy += dy * w;
        // Collision: two discs closer than twice the radius are pushed apart.
        if (l2 < reach * reach) {
          const l = Math.sqrt(l2), k = (reach - l) / l * share;
          vx -= dx * k * .5; vy -= dy * k * .5;
        }
      }
      // A little pull to the centre, as the free layout's x/y forces.
      vx -= sx * o.centre * alpha; vy -= sy * o.centre * alpha;
      s.vx = vx; s.vy = vy;
    }
    // Links: a spring to the link distance, all of it on the new end.
    for (const { source, target } of links()) {
      const a = moving.has(source), b = moving.has(target); if (!a && !b) continue;
      const dx = (target.x ?? 0) + (target.vx ?? 0) - (source.x ?? 0) - (source.vx ?? 0);
      const dy = (target.y ?? 0) + (target.vy ?? 0) - (source.y ?? 0) - (source.vy ?? 0);
      const l = Math.hypot(dx, dy) || 1, k = (l - o.linkDistance) / l * alpha * o.linkStrength;
      const toTarget = a && b ? .5 : b ? 1 : 0;
      if (b) { target.vx = (target.vx ?? 0) - dx * k * toTarget; target.vy = (target.vy ?? 0) - dy * k * toTarget; }
      if (a) { source.vx = (source.vx ?? 0) + dx * k * (1 - toTarget); source.vy = (source.vy ?? 0) + dy * k * (1 - toTarget); }
    }
  }
  force.initialize = (nodes: Body[]) => { seating = nodes; moving = new Set(nodes); };
  return force;
}
