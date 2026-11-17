// GV-90..92, GV-50: every light the map shows in motion (the comet and its dust, a growing branch's tip
// and the sparks of its arrival, a link preview's bead) is drawn on one canvas over the map, instead of
// SVG groups with drop-shadow filters inside the edges layer (each of which redrew every edge per frame).

/** What can be drawn: each is a small picture made once from the room's tokens, then stamped. */
export type SparkKind = 'comet' | 'tip' | 'dust' | 'mote' | 'spark' | 'bead';
/** A light at a map position (world units), with its opacity and a scale of its picture. */
export interface Spark { kind: SparkKind; x: number; y: number; alpha: number; scale?: number }
/** The map's transform on screen (as d3-zoom: screen = x + k · world) and its size in CSS pixels. */
export interface EmberView { x: number; y: number; k: number; w: number; h: number }
/** A node's disc, which hides what passes under it as the SVG edges were hidden. */
export interface Disc { x: number; y: number; r: number }

type Ring = { r: number; token: string };
/** Each picture as the SVG drew it: rings from the outside in, and the drop-shadow it had (CSS blur, px). */
export const sparkShapes: Record<SparkKind, { rings: Ring[]; shadow?: number }> = {
  comet: { rings: [{ r: 16, token: '--glow-far' }, { r: 9, token: '--glow-near' }, { r: 3, token: '--node-lit' }] },
  tip: { rings: [{ r: 12, token: '--glow-far' }, { r: 6, token: '--glow-near' }, { r: 2.5, token: '--node-lit' }] },
  dust: { rings: [{ r: 3, token: '--glow-near' }, { r: 1.15, token: '--node-lit' }], shadow: 2 },
  mote: { rings: [{ r: 3, token: '--glow-near' }, { r: .7, token: '--node-lit' }], shadow: 2 },
  spark: { rings: [{ r: 1.2, token: '--node-lit' }] },
  bead: { rings: [{ r: 3, token: '--node-lit' }], shadow: 4 }
};
/** Pixels per map unit in the pictures: sharp up to a 3× zoom at 1.5× device pixels. */
const RES = 4;

/** How many of each kind a frame draws: the canvas carries them as data-<kind> for tests and traces. */
export function countKinds(sparks: Iterable<Spark>) {
  const out: Partial<Record<SparkKind, number>> = {};
  for (const s of sparks) out[s.kind] = (out[s.kind] ?? 0) + 1;
  return out;
}

export class EmberCanvas {
  private owners = new Map<string, Spark[]>();
  private queued = false;
  private sprites: Partial<Record<SparkKind, { image: HTMLCanvasElement; half: number }>> = {};
  private shown: Partial<Record<SparkKind, number>> = {};
  constructor(private canvas: () => HTMLCanvasElement | undefined, private view: () => EmberView, private discs: () => Disc[] = () => []) {}

  /** What one effect shows this frame; an empty list takes it off. Draws once per task, whatever the number of effects. */
  set(owner: string, sparks: Spark[]) {
    if (!sparks.length && !this.owners.has(owner)) return;
    if (sparks.length) this.owners.set(owner, sparks); else this.owners.delete(owner);
    if (!this.queued) { this.queued = true; queueMicrotask(this.paint); }
  }
  clear(owner?: string) {
    if (owner) this.set(owner, []);
    else { this.owners.clear(); this.paint(); }
  }
  get active() { return this.owners.size > 0; }

  private paint = () => {
    this.queued = false;
    const canvas = this.canvas(); if (!canvas) return;
    const sparks = [...this.owners.values()].flat();
    this.mark(canvas, countKinds(sparks));
    if (!sparks.length) { if (!canvas.hidden) { canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height); canvas.hidden = true; } this.sprites = {}; return; }
    const v = this.view(), ratio = Math.min(2, devicePixelRatio || 1);
    const w = Math.max(1, Math.round(v.w * ratio)), h = Math.max(1, Math.round(v.h * ratio));
    // The size is set only when it changes: setting it clears and reallocates the canvas.
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    canvas.hidden = false;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, w, h);
    ctx.setTransform(ratio * v.k, 0, 0, ratio * v.k, ratio * v.x, ratio * v.y);
    // The opaque discs hid the lights passing under them; a clip keeps that.
    const near = this.discs().filter(d => { const sx = v.x + d.x * v.k, sy = v.y + d.y * v.k, r = d.r * v.k; return sx > -r && sy > -r && sx < v.w + r && sy < v.h + r; });
    if (near.length) {
      ctx.save(); ctx.beginPath();
      ctx.rect(-v.x / v.k, -v.y / v.k, v.w / v.k, v.h / v.k);
      for (const d of near) { ctx.moveTo(d.x + d.r, d.y); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2); }
      ctx.clip('evenodd');
    }
    for (const s of sparks) {
      if (s.alpha <= 0) continue;
      const sprite = this.sprite(s.kind, canvas), half = sprite.half * (s.scale ?? 1);
      ctx.globalAlpha = Math.min(1, s.alpha);
      ctx.drawImage(sprite.image, s.x - half, s.y - half, half * 2, half * 2);
    }
    ctx.globalAlpha = 1;
    if (near.length) ctx.restore();
  };
  private mark(canvas: HTMLCanvasElement, counts: Partial<Record<SparkKind, number>>) {
    for (const kind of Object.keys(sparkShapes) as SparkKind[]) {
      const n = counts[kind];
      if (n === this.shown[kind]) continue;
      if (n) canvas.dataset[kind] = String(n); else delete canvas.dataset[kind];
    }
    this.shown = counts;
  }
  /** The pictures are made when an effect starts, from the tokens then: no style is read per frame. */
  private sprite(kind: SparkKind, canvas: HTMLCanvasElement) {
    const made = this.sprites[kind]; if (made) return made;
    const css = getComputedStyle(canvas), shape = sparkShapes[kind];
    const half = shape.rings[0].r + (shape.shadow ?? 0) * 2, size = Math.ceil(half * 2 * RES);
    const image = document.createElement('canvas'); image.width = image.height = size;
    const ctx = image.getContext('2d')!; ctx.scale(RES, RES);
    if (shape.shadow) { ctx.shadowColor = css.getPropertyValue('--glow-near').trim(); ctx.shadowBlur = shape.shadow * 2 * RES; }
    for (const ring of shape.rings) {
      ctx.fillStyle = css.getPropertyValue(ring.token).trim() || '#fff';
      ctx.beginPath(); ctx.arc(half, half, ring.r, 0, Math.PI * 2); ctx.fill();
    }
    return this.sprites[kind] = { image, half };
  }
}
