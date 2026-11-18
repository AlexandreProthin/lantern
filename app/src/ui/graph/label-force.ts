// GV-15: nodes keep apart by what they draw: the disc and the title under it, not a circle around the disc.
// A node's box is measured once from its title (a 134 px column of 13 px text, at most 3 lines, GV-24) and two
// boxes closer than a small gap are pushed apart along the axis where they overlap least.
import { graphMotion } from './graphMotion';

/** A node's footprint around its disc centre: half its width, and how far it reaches up and down. */
export interface LabelBox { hw: number; top: number; bottom: number }
interface Body { id: string; x?: number; y?: number; vx?: number; vy?: number; fx?: number | null; fy?: number | null }

const DISC = 44, GAP = 14, LINE = 19.5, COLUMN = 134, LINES = 3;
/** Nothing but the disc (the subject's root keeps its title, but a body with no title has none). */
export const discBox: LabelBox = { hw: DISC / 2, top: -DISC / 2, bottom: DISC / 2 };
/** A waiting placeholder keeps room for the title it will get (two lines, the full column). */
export const placeholderBox: LabelBox = { hw: COLUMN / 2, top: -DISC / 2, bottom: DISC / 2 + GAP + 2 * LINE };

/** About the width of 13 px system text when no canvas can measure it. */
export const estimateWidth = (text: string) => text.length * 6.6;
let context: CanvasRenderingContext2D | null | undefined;
/** The title's width as drawn (13 px system-ui), or an estimate where there is no canvas (tests). */
export function measureTitle(text: string): number {
  if (context === undefined) { try { context = typeof document !== 'undefined' ? document.createElement('canvas').getContext('2d') : null; } catch { context = null; } if (context) context.font = '13px system-ui, sans-serif'; }
  return context ? context.measureText(text).width : estimateWidth(text);
}

/** The box of a title: words wrapped greedily in the column (a word longer than it breaks anywhere), clamped to 3 lines. */
export function labelBox(title: string, measure: (text: string) => number = measureTitle): LabelBox {
  const words = title.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return discBox;
  const space = measure(' ');
  let lines = 1, line = 0, widest = 0;
  for (const word of words) {
    let w = measure(word);
    if (line && line + space + w <= COLUMN) { line += space + w; }
    else {
      if (line) lines++;
      while (w > COLUMN) { lines++; widest = COLUMN; w -= COLUMN; }
      line = w;
    }
    widest = Math.max(widest, line);
  }
  lines = Math.min(LINES, lines);
  return { hw: Math.max(DISC / 2, Math.min(COLUMN, widest) / 2), top: -DISC / 2, bottom: DISC / 2 + GAP + lines * LINE };
}

/** Whether two boxes overlap (with the gaps). */
export function overlaps(ax: number, ay: number, a: LabelBox, bx: number, by: number, b: LabelBox, gapX = 0, gapY = 0): boolean {
  return Math.abs(ax - bx) < a.hw + b.hw + gapX && Math.min(ay + a.bottom, by + b.bottom) - Math.max(ay + a.top, by + b.top) + gapY > 0;
}

/**
 * How far box `a` at (ax, ay) must move away from box `b` at (bx, by), or null when they are apart. Two boxes keep
 * out of a rounded rectangle around each other (a superellipse on the sum of their sizes and the gaps),
 * and the way out is straight along the line between their centres: no side is preferred, so siblings ring their
 * parent instead of stacking in columns.
 */
export function separation(ax: number, ay: number, a: LabelBox, bx: number, by: number, b: LabelBox, gapX: number, gapY: number): { x: number; y: number } | null {
  const rx = a.hw + b.hw + gapX, dx = ax - bx;
  if (Math.abs(dx) >= rx) return null;
  const ry = (a.bottom - a.top + b.bottom - b.top) / 2 + gapY;
  const dy = (ay + (a.top + a.bottom) / 2) - (by + (b.top + b.bottom) / 2);
  if (Math.abs(dy) >= ry) return null;
  const power = graphMotion.label.power, nx = Math.abs(dx / rx), ny = Math.abs(dy / ry), d = (nx ** power + ny ** power) ** (1 / power);
  if (d >= 1) return null;
  // Two centres in the same place leave in a fixed direction, so the pair never stalls.
  if (d < 1e-6) return { x: ax <= bx && ay <= by ? -rx * .5 : rx * .5, y: 0 };
  const k = Math.min(1 / d - 1, 4);
  return { x: dx * k, y: dy * k };
}

/**
 * A d3-force force: no two nodes' boxes closer than the gap. A sweep along x finds the pairs (sort, then only
 * neighbours within reach), so a tick costs about n log n. A fixed node (`fx`, the root or a pinned node) takes
 * none of the push.
 */
export function labelCollide(box: (b: Body) => LabelBox, strength = .7) {
  let nodes: Body[] = [], boxes: LabelBox[] = [], order: number[] = [];
  const { gapX, gapY } = graphMotion.label;
  function force() {
    const n = nodes.length; if (n < 2) return;
    boxes = nodes.map(box);
    const px = nodes.map(b => (b.x ?? 0) + (b.vx ?? 0)), py = nodes.map(b => (b.y ?? 0) + (b.vy ?? 0));
    if (order.length !== n) order = nodes.map((_, i) => i);
    order.sort((i, j) => px[i] - px[j]);
    let widest = 0; for (const b of boxes) widest = Math.max(widest, b.hw);
    for (let a = 0; a < n; a++) {
      const i = order[a], reach = px[i] + boxes[i].hw + widest + gapX;
      for (let c = a + 1; c < n; c++) {
        const j = order[c]; if (px[j] >= reach) break;
        const s = separation(px[i], py[i], boxes[i], px[j], py[j], boxes[j], gapX, gapY); if (!s) continue;
        const fi = nodes[i].fx != null, fj = nodes[j].fx != null; if (fi && fj) continue;
        const wi = fi ? 0 : fj ? 1 : .5, wj = 1 - wi;
        const kx = s.x * strength, ky = s.y * strength;
        nodes[i].vx = (nodes[i].vx ?? 0) + kx * wi; nodes[i].vy = (nodes[i].vy ?? 0) + ky * wi;
        nodes[j].vx = (nodes[j].vx ?? 0) - kx * wj; nodes[j].vy = (nodes[j].vy ?? 0) - ky * wj;
        px[i] += kx * wi; py[i] += ky * wi; px[j] -= kx * wj; py[j] -= ky * wj;
      }
    }
  }
  force.initialize = (all: Body[]) => { nodes = all; order = []; };
  return force;
}
