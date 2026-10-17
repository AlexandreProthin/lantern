/**
 * CO-12, CO-54: Amber's rope, a small Verlet chain stepped at a fixed rate. The first point is tied to the bar; the
 * last carries Amber, heavier than the rope. While Amber is held, the last point follows the hand and the rope keeps
 * a little slack so it bows; once let go, Amber swings on it and settles under the tie.
 */
export interface Point { x: number; y: number; px: number; py: number }
export const STEP = 1 / 120;
const GRAVITY = 2200, DAMPING = .992, ITERATIONS = 10, SEGMENTS = 8, SLACK = 1.06, END_WEIGHT = .15;

export class Rope {
  points: Point[];
  length: number;
  private held = true;
  constructor(public anchor: { x: number; y: number }, end: { x: number; y: number }, length?: number) {
    this.length = length ?? Math.hypot(end.x - anchor.x, end.y - anchor.y) * SLACK;
    this.points = Array.from({ length: SEGMENTS + 1 }, (_, i) => {
      const t = i / SEGMENTS, x = anchor.x + (end.x - anchor.x) * t, y = anchor.y + (end.y - anchor.y) * t;
      return { x, y, px: x, py: y };
    });
  }
  get end(): Point { return this.points[this.points.length - 1]; }
  /** Held: the end follows the hand, and the rope lengthens or shortens to keep a little slack (CO-12). */
  hold(end: { x: number; y: number }, anchor = this.anchor) {
    this.held = true; this.anchor = anchor;
    this.length = Math.hypot(end.x - anchor.x, end.y - anchor.y) * SLACK;
    this.end.x = this.end.px = end.x; this.end.y = this.end.py = end.y;
  }
  /** Let go: the end keeps the hand's last velocity (px per step) and the rope its length, clamped. */
  release(length: number, velocity = { x: 0, y: 0 }) {
    this.held = false; this.length = length;
    this.end.px = this.end.x - velocity.x; this.end.py = this.end.y - velocity.y;
  }
  step() {
    const segment = this.length / SEGMENTS, last = this.points.length - 1;
    for (let i = 1; i < this.points.length; i++) {
      if (i === last && this.held) continue;
      const p = this.points[i], vx = (p.x - p.px) * DAMPING, vy = (p.y - p.py) * DAMPING;
      p.px = p.x; p.py = p.y; p.x += vx; p.y += vy + GRAVITY * STEP * STEP;
    }
    const first = this.points[0]; first.x = first.px = this.anchor.x; first.y = first.py = this.anchor.y;
    for (let k = 0; k < ITERATIONS; k++) for (let i = 0; i < last; i++) {
      const a = this.points[i], b = this.points[i + 1], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1e-6;
      // A rope only pulls: a segment shorter than its length is left slack.
      if (d <= segment) continue;
      const diff = (d - segment) / d;
      // The tie never moves; held, the end never moves; free, Amber outweighs the rope.
      let wa = i === 0 ? 0 : .5, wb = i + 1 === last ? (this.held ? 0 : END_WEIGHT) : .5;
      if (wa + wb === 0) continue; const sum = wa + wb; wa /= sum; wb /= sum;
      a.x += dx * diff * wa; a.y += dy * diff * wa; b.x -= dx * diff * wb; b.y -= dy * diff * wb;
    }
  }
  /** Amber's tilt in degrees, as a CSS rotation about the tie: negative when it hangs right of the tie, as the rope does. */
  angle(): number { const a = this.points[this.points.length - 2], b = this.end; return Math.atan2(a.x - b.x, b.y - a.y) * 180 / Math.PI; }
  /** Settled: the end barely moves and hangs under the tie. */
  settled(): boolean { const e = this.end; return Math.hypot(e.x - e.px, e.y - e.py) < .02 && Math.abs(e.x - this.anchor.x) < .8; }
  /** A smooth path through the points, for drawing. */
  path(dx = 0, dy = 0): string {
    const p = this.points.map(q => ({ x: q.x - dx, y: q.y - dy }));
    let d = `M${p[0].x.toFixed(1)} ${p[0].y.toFixed(1)}`;
    for (let i = 1; i < p.length - 1; i++) { const mx = (p[i].x + p[i + 1].x) / 2, my = (p[i].y + p[i + 1].y) / 2; d += ` Q${p[i].x.toFixed(1)} ${p[i].y.toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)}`; }
    const e = p[p.length - 1]; return `${d} L${e.x.toFixed(1)} ${e.y.toFixed(1)}`;
  }
}

/** CO-14: flight (*heat and lift*) rises in an arc; a fall (*descent and landing*) accelerates down and lands. */
export function flightPoint(from: { x: number; y: number }, to: { x: number; y: number }, t: number, mode: 'fly' | 'fall'): { x: number; y: number } {
  const u = Math.min(1, Math.max(0, t)), smooth = u * u * (3 - 2 * u);
  if (mode === 'fall') return { x: from.x + (to.x - from.x) * (1 - (1 - u) ** 2), y: from.y + (to.y - from.y) * u * u };
  return { x: from.x + (to.x - from.x) * smooth, y: from.y + (to.y - from.y) * smooth - 36 * Math.sin(Math.PI * u) };
}
/** About 0.9 px per ms, between 350 and 900 ms. */
export const flightDuration = (from: { x: number; y: number }, to: { x: number; y: number }) => Math.max(350, Math.min(900, Math.hypot(to.x - from.x, to.y - from.y) / .9));
