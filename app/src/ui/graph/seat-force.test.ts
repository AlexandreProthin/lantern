import { expect, test } from 'vitest';
import { forceSimulation } from 'd3-force';
import { seatForce, type Body } from './seat-force';
import { graphMotion } from './graphMotion';

const options = { charge: graphMotion.charge, collide: graphMotion.collide, linkDistance: graphMotion.linkDistance, linkStrength: .8, centre: .02 };

/** A settled ring of 12 nodes around a root, and three new nodes all starting next to one of them. */
function map() {
  const root: Body = { id: 'root', x: 0, y: 0 };
  const ring: Body[] = Array.from({ length: 12 }, (_, i) => ({ id: `r${i}`, x: Math.cos(i / 12 * 2 * Math.PI) * 260, y: Math.sin(i / 12 * 2 * Math.PI) * 260 }));
  const parent = ring[0];
  const fresh: Body[] = [0, 1, 2].map(i => ({ id: `n${i}`, x: (parent.x ?? 0) + 30 + i, y: (parent.y ?? 0) + i * 2 }));
  const all = [root, ...ring, ...fresh];
  const links = [...ring.map(target => ({ source: root, target })), ...fresh.map(target => ({ source: parent, target }))];
  return { all, ring, fresh, parent, links };
}

test('GV-14: a growing map seats only its new nodes; the others do not move', () => {
  const { all, ring, fresh, parent, links } = map();
  const before = all.filter(b => !fresh.includes(b)).map(b => [b.x, b.y]);
  const sim = forceSimulation(fresh as never[]).alphaDecay(graphMotion.SEAT_DECAY).alpha(graphMotion.GROW_ALPHA).stop()
    .force('seat', seatForce(() => all, () => links, options));
  let ticks = 0;
  while (sim.alpha() > sim.alphaMin()) { sim.tick(); ticks++; }
  expect(ticks).toBeLessThan(120);
  expect(all.filter(b => !fresh.includes(b)).map(b => [b.x, b.y])).toEqual(before);
  for (const n of fresh) {
    const toParent = Math.hypot((n.x ?? 0) - (parent.x ?? 0), (n.y ?? 0) - (parent.y ?? 0));
    expect(toParent).toBeGreaterThan(graphMotion.collide);
    expect(toParent).toBeLessThan(graphMotion.linkDistance * 2.5);
    // No new node sits on another node's disc.
    for (const other of all) if (other !== n) expect(Math.hypot((n.x ?? 0) - (other.x ?? 0), (n.y ?? 0) - (other.y ?? 0))).toBeGreaterThan(44);
  }
  // They spread out instead of piling up.
  expect(Math.hypot((fresh[0].x ?? 0) - (fresh[2].x ?? 0), (fresh[0].y ?? 0) - (fresh[2].y ?? 0))).toBeGreaterThan(60);
  expect(ring).toHaveLength(12);
});

test('GV-14: a new node on top of another is pushed off it, whichever way', () => {
  const a: Body = { id: 'a', x: 0, y: 0 }, b: Body = { id: 'b', x: 0, y: 0 };
  const sim = forceSimulation([b] as never[]).alpha(.3).stop().force('seat', seatForce(() => [a, b], () => [], options));
  for (let i = 0; i < 40; i++) sim.tick();
  expect(Math.hypot(b.x ?? 0, b.y ?? 0)).toBeGreaterThan(44);
  expect([a.x, a.y]).toEqual([0, 0]);
});
