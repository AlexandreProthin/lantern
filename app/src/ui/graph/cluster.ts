// GV-15: the shape of the tree the free layout reads: each node's depth and how many nodes hang under it.
// Links to the modules (depth 1) are long and links inside a module short, so modules read as groups.
import { graphMotion } from './graphMotion';

export interface TreeShape { depth: Map<string, number>; descendants: Map<string, number>; maxDepth: number }

/** Depths from the root and descendant counts, over each node's first parent; one pass, cycles cut. */
export function treeShape(nodes: Iterable<{ id: string; parents: string[] }>): TreeShape {
  const parent = new Map<string, string | undefined>();
  for (const n of nodes) parent.set(n.id, n.parents[0]);
  const depth = new Map<string, number>(), descendants = new Map<string, number>();
  const depthOf = (id: string): number => {
    const known = depth.get(id); if (known !== undefined) return known;
    // Walk up to a node of known depth (or the top), then fill the way back down.
    const way: string[] = []; let at: string | undefined = id; const seen = new Set<string>();
    while (at !== undefined && !depth.has(at) && !seen.has(at)) { seen.add(at); way.push(at); const up = parent.get(at); at = up !== undefined && parent.has(up) ? up : undefined; }
    let d = at !== undefined && depth.has(at) ? depth.get(at)! + 1 : 0;
    for (let i = way.length - 1; i >= 0; i--) depth.set(way[i], d++);
    return depth.get(id)!;
  };
  let maxDepth = 0;
  for (const id of parent.keys()) { maxDepth = Math.max(maxDepth, depthOf(id)); descendants.set(id, 0); }
  // Deepest first, each node adds itself and its descendants to its parent.
  for (const id of [...parent.keys()].sort((a, b) => depth.get(b)! - depth.get(a)!)) {
    const up = parent.get(id);
    if (up !== undefined && descendants.has(up) && depth.get(up)! < depth.get(id)!) descendants.set(up, descendants.get(up)! + 1 + descendants.get(id)!);
  }
  return { depth, descendants, maxDepth };
}

const { cluster } = graphMotion;
/** The length of the link that ends at a node of this depth with this many nodes under it. */
export function linkLength(depth: number, descendants: number): number {
  return (depth <= 1 ? cluster.module : cluster.inner) + cluster.perDescendant * Math.sqrt(descendants);
}
/** How hard a node pushes the others: the root and modules hard, a leaf lightly (it stays near its module). */
export function chargeOf(depth: number, descendants: number): number {
  return depth <= 1 ? cluster.moduleCharge : descendants ? cluster.branchCharge : cluster.leafCharge;
}
