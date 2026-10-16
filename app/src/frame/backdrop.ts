// RS-34: the ambient backdrop, the final `backdrop` design (agent_design/backdrop/RECIPE.md,
// r005-03 "Calm orbits, amber only"). Values are the recipe's; colours come from room tokens.
export type Rgb = [number, number, number];
export interface Preset { cx: number; cy: number; sx: number; sy: number; gain: number; dust: number; lamp: number }

/** Orbit anchor (cx, cy), stretch (sx, sy), strength, share of motes shown and pointer lantern, per space. */
export const backdropPresets: Record<string, Preset> = {
  welcome: { cx: .5, cy: .45, sx: 1.0, sy: 1.0, gain: 1, dust: 1, lamp: .8 },
  study: { cx: .5, cy: .5, sx: 1.9, sy: 1.7, gain: .55, dust: .5, lamp: .4 },
  gallery: { cx: .5, cy: .06, sx: 1.4, sy: .45, gain: .8, dust: .75, lamp: .6 }
};
export const presetFor = (space: string): Preset => backdropPresets[space] ?? backdropPresets.welcome;

/** glow: halo radius (fraction of width) · rx, ry: orbit radii · tilt: swing towards you · per: seconds per
 *  turn (negative = clockwise) · ph: start angle · depth: parallax · a: strength. */
export const backdropLights = [
  { token: '--accent', glow: .30, rx: .20, ry: .13, tilt: .4, per: 80, ph: 0.0, depth: .6, a: .24 },
  { token: '--path-muted', glow: .40, rx: .36, ry: .22, tilt: .3, per: -96, ph: 2.2, depth: .35, a: .20 },
  { token: '--line', glow: .48, rx: .42, ry: .30, tilt: .2, per: 120, ph: 4.0, depth: .2, a: .30 },
  { token: '--node-lit', glow: .11, rx: .11, ry: .08, tilt: .6, per: -52, ph: 1.1, depth: .8, a: .10 },
  { token: '--glow-far', glow: .22, rx: .30, ry: .26, tilt: .5, per: 70, ph: 3.3, depth: .5, a: .10 }
] as const;

export const backdropLayers = [
  { key: 'far', n: 80, depth: .25, size: [.6, 1.0], alpha: [.30, .60], rise: 1 / 260 },
  { key: 'mid', n: 34, depth: .55, size: [1.1, 1.6], alpha: [.45, .85], rise: 1 / 170 },
  { key: 'near', n: 9, depth: 1.0, size: [2.0, 2.8], alpha: [.55, .90], rise: 1 / 110 }
] as const;

export const backdropMotion = {
  FRAME_MS: 1000 / 30, MAX_DT_S: .1,
  PRESET_RATE: .7, PAN_RATE: 2.2, POINTER_RATE: .9, LAMP_RATE: .7,
  LIT_RISE_S: 1.4, LIT_FADE_S: 3.8, LIT_FLARE: .2, LIT_LIGHT: .7, LIT_POOL_ALPHA: .05, LIT_PUSH_PX: 6, LIT_REACH: .18,
  ZOOM_MIN: .5, ZOOM_MAX: 2.5,
  /** Covers the CSS room-token fade (.45s in app.css) with a frame to spare. */
  ROOM_FADE_MS: 520,
  /** The lights' pan parallax is bounded to this many widths, so a long pan never sends them off screen. */
  PAN_LIMIT: 1
} as const;
export const LIT_LIFE_S = backdropMotion.LIT_RISE_S + backdropMotion.LIT_FADE_S;

const smooth = (x: number) => x * x * (3 - 2 * x);
const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));

/** A lit node's reaction: eases in over 1.4 s, then out over 3.8 s. */
export function envelope(age: number) {
  const { LIT_RISE_S: rise, LIT_FADE_S: fade } = backdropMotion;
  if (age < 0) return 0;
  if (age < rise) return smooth(age / rise);
  return Math.max(0, 1 - smooth(Math.min(1, (age - rise) / fade)));
}

/** Reads a token value as written in app.css: #rgb, #rrggbb, rgb() or rgba() (alpha ignored). */
export function parseColor(value: string): Rgb | null {
  const v = value.trim();
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(v);
  if (hex) {
    const h = hex[1].length === 3 ? [...hex[1]].map(c => c + c).join('') : hex[1];
    return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)) as Rgb;
  }
  const rgb = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(v);
  return rgb ? [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])] : null;
}

export interface View { w: number; h: number; panX: number; panY: number; zoom: number; px: number; py: number }
export interface Lit { x: number; y: number; e: number; age: number }
export interface PlacedLight { x: number; y: number; z: number; a: number; glow: number; color: Rgb }

/** Where each light is at time t: an ellipse around the anchor, larger and brighter as it swings towards you. */
export function placeLights(t: number, P: Preset, v: View, lits: Lit[], colors: Rgb[]): PlacedLight[] {
  const panX = clamp(v.panX, -v.w * backdropMotion.PAN_LIMIT, v.w * backdropMotion.PAN_LIMIT);
  const panY = clamp(v.panY, -v.w * backdropMotion.PAN_LIMIT, v.w * backdropMotion.PAN_LIMIT);
  return backdropLights.map((L, i) => {
    const th = 2 * Math.PI * t / L.per + L.ph, z = Math.sin(th) * L.tilt;
    const zoom = 1 + (v.zoom - 1) * .3 * L.depth, near = 1 + .35 * z;
    let x = (P.cx + L.rx * Math.cos(th) * P.sx) * v.w, y = (P.cy + L.ry * Math.sin(th) * P.sy) * v.h;
    x = v.w / 2 + (x - v.w / 2) * zoom + panX * .08 * L.depth - (v.px - .5) * v.w * .03 * L.depth;
    y = v.h / 2 + (y - v.h / 2) * zoom + panY * .08 * L.depth - (v.py - .5) * v.h * .03 * L.depth;
    let flare = 0;
    for (const lit of lits) flare += lit.e * Math.exp(-(((x - lit.x) ** 2 + (y - lit.y) ** 2) / (v.w * .25) ** 2));
    return { x, y, z, color: colors[i], glow: L.glow * v.w * near * zoom,
      a: L.a * P.gain * (.75 + .25 * z) * (1 + backdropMotion.LIT_FLARE * Math.min(1, flare)) };
  });
}

/** How much light falls on a point: the lights, the pointer's lantern and lit nodes. Motes show in proportion. */
export function lightAt(x: number, y: number, lights: PlacedLight[], lamp: { x: number; y: number }, lampGain: number, w: number, lits: Lit[]) {
  let L = 0;
  for (const s of lights) { const dx = (x - s.x) / (s.glow * .55), dy = (y - s.y) / (s.glow * .55); L += 3.2 * s.a * Math.exp(-(dx * dx + dy * dy)); }
  const lx = (x - lamp.x) / (w * .16), ly = (y - lamp.y) / (w * .16);
  L += lampGain * .9 * Math.exp(-(lx * lx + ly * ly));
  for (const lit of lits) { const ex = (x - lit.x) / (w * .14), ey = (y - lit.y) / (w * .14); L += backdropMotion.LIT_LIGHT * lit.e * Math.exp(-(ex * ex + ey * ey)); }
  return L;
}

export interface Mote { x: number; y: number; s: number; a: number; ph: number; wob: number; drift: number; warm: boolean }
/** Motes in world units (0..1, wrapping), seeded so the still frame of reduced motion is stable. */
export function createMotes(seed = 7): Mote[][] {
  let state = seed >>> 0;
  const random = () => { state = (state + 0x6D2B79F5) >>> 0; let r = Math.imul(state ^ (state >>> 15), 1 | state);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; };
  const between = (lo: number, hi: number) => lo + random() * (hi - lo);
  return backdropLayers.map(L => Array.from({ length: L.n }, () => ({
    x: random(), y: random(), s: between(L.size[0], L.size[1]), a: between(L.alpha[0], L.alpha[1]),
    ph: between(0, 6.28), wob: between(30, 80), drift: between(-.3, .3), warm: random() < .7 })));
}

interface Colors { bg: Rgb; warm: Rgb; cool: Rgb; glow: Rgb; lit: Rgb; lights: Rgb[] }
const rgba = (c: Rgb, a: number) => `rgba(${c[0]},${c[1]},${c[2]},${Math.max(0, a)})`;

/** Draws the backdrop on two canvases: the lights at CSS-pixel resolution, the motes at up to 1.5× DPR. */
export class Backdrop {
  private t = 0; private space = 'welcome'; private P: Preset = { ...presetFor('welcome') };
  private pan = { x: 0, y: 0, k: 1 }; private sPan = { x: 0, y: 0, k: 1 };
  private pointerAt = { x: .5, y: .5 }; private sPointer = { x: .5, y: .5 }; private lamp = { x: 0, y: 0 };
  private lits: { x: number; y: number; t0: number }[] = [];
  private started = false; private fadeUntil = 0; private frame = 0; private lastDraw = 0; private w = 1; private h = 1; private ratio = 1;
  private colors!: Colors; private sprites!: { warm: HTMLCanvasElement; cool: HTMLCanvasElement };
  private readonly motes = createMotes();
  constructor(private haze: HTMLCanvasElement, private dust: HTMLCanvasElement, private reduced: () => boolean) {}

  start() { this.readColors(); this.started = true; this.resize(); this.refresh(); }
  /** Re-evaluates whether to loop: call after reduced motion or window visibility changes. */
  refresh() {
    if (!this.started) return;
    if (this.reduced()) { this.halt(); this.still(); this.draw(performance.now() / 1000); }
    else if (document.hidden) this.halt();
    else if (!this.frame) { this.lastDraw = performance.now() - backdropMotion.FRAME_MS; this.frame = requestAnimationFrame(this.tick); }
  }
  /** The room changed: its tokens repaint the haze, lights and motes. They fade in CSS
   * (data-room-fade), so the loop keeps reading them until that fade is over. */
  recolor() {
    if (!this.started) return;
    this.readColors(); this.fadeUntil = performance.now() + backdropMotion.ROOM_FADE_MS;
    if (this.reduced()) this.refresh();
  }
  setSpace(space: string) {
    this.space = space; this.pan = { x: 0, y: 0, k: 1 };
    if (this.reduced()) this.refresh();
  }
  pointer(x: number, y: number) { this.pointerAt = { x: x / this.w, y: y / this.h }; }
  /** Graph pan/zoom in Study, as a delta in pixels and a zoom ratio. */
  panBy(dx: number, dy: number, ratio: number) {
    if (this.space !== 'study') return;
    this.pan = { x: this.pan.x + dx, y: this.pan.y + dy, k: clamp(this.pan.k * ratio, backdropMotion.ZOOM_MIN, backdropMotion.ZOOM_MAX) };
  }
  /** A node became lit at this screen position. */
  light(x: number, y: number) { if (!this.reduced()) this.lits.push({ x, y, t0: performance.now() / 1000 }); }
  resize() {
    this.w = Math.max(1, innerWidth); this.h = Math.max(1, innerHeight); this.ratio = Math.min(1.5, devicePixelRatio || 1);
    this.haze.width = Math.ceil(this.w); this.haze.height = Math.ceil(this.h);
    this.dust.width = Math.ceil(this.w * this.ratio); this.dust.height = Math.ceil(this.h * this.ratio);
    if (this.started && this.reduced()) { this.still(); this.draw(performance.now() / 1000); }
  }
  dispose() { this.halt(); }

  private halt() { cancelAnimationFrame(this.frame); this.frame = 0; }
  private readColors() {
    const css = getComputedStyle(document.documentElement);
    const token = (name: string, fallback: Rgb) => parseColor(css.getPropertyValue(name)) ?? fallback;
    const bg = token('--bg', [16, 24, 39]);
    this.colors = { bg, warm: token('--node-lit', [255, 225, 170]), cool: token('--ink-mute', [174, 179, 191]),
      glow: token('--glow-far', [255, 182, 88]), lit: token('--node-lit', [255, 225, 170]),
      lights: backdropLights.map(L => token(L.token, bg)) };
    const sprite = (c: Rgb) => {
      const s = document.createElement('canvas'); s.width = s.height = 64;
      const x = s.getContext('2d')!, g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, rgba(c, 1)); g.addColorStop(.35, rgba(c, .55)); g.addColorStop(1, rgba(c, 0));
      x.fillStyle = g; x.fillRect(0, 0, 64, 64); return s;
    };
    this.sprites = { warm: sprite(this.colors.warm), cool: sprite(this.colors.cool) };
  }
  /** Reduced motion: the space's preset at rest, no pointer, pan or lit node. */
  private still() {
    this.P = { ...presetFor(this.space) }; this.pan = { x: 0, y: 0, k: 1 }; this.sPan = { ...this.pan };
    this.pointerAt = { x: .5, y: .5 }; this.sPointer = { ...this.pointerAt }; this.lamp = { x: this.w / 2, y: this.h / 2 }; this.lits = [];
  }
  private tick = (now: number) => {
    this.frame = requestAnimationFrame(this.tick);
    if (now - this.lastDraw < backdropMotion.FRAME_MS - 1) return;
    const dt = Math.min(backdropMotion.MAX_DT_S, (now - this.lastDraw) / 1000); this.lastDraw = now;
    if (now < this.fadeUntil) this.readColors();
    this.advance(dt); this.draw(now / 1000);
  };
  private advance(dt: number) {
    const m = backdropMotion, ease = (rate: number) => 1 - Math.exp(-dt * rate);
    this.t += dt;
    const kp = ease(m.PAN_RATE);
    this.sPan = { x: this.sPan.x + (this.pan.x - this.sPan.x) * kp, y: this.sPan.y + (this.pan.y - this.sPan.y) * kp, k: this.sPan.k + (this.pan.k - this.sPan.k) * kp };
    const kq = ease(m.POINTER_RATE);
    this.sPointer = { x: this.sPointer.x + (this.pointerAt.x - this.sPointer.x) * kq, y: this.sPointer.y + (this.pointerAt.y - this.sPointer.y) * kq };
    const target = presetFor(this.space), kc = ease(m.PRESET_RATE);
    for (const key of Object.keys(target) as (keyof Preset)[]) this.P[key] += (target[key] - this.P[key]) * kc;
    const kl = ease(m.LAMP_RATE);
    this.lamp = { x: this.lamp.x + (this.pointerAt.x * this.w - this.lamp.x) * kl, y: this.lamp.y + (this.pointerAt.y * this.h - this.lamp.y) * kl };
  }
  private draw(nowS: number) {
    const { w: W, h: H, P, colors } = this, hctx = this.haze.getContext('2d'), dctx = this.dust.getContext('2d');
    if (!hctx || !dctx) return;
    this.lits = this.lits.filter(l => nowS - l.t0 < LIT_LIFE_S);
    const lits: Lit[] = this.lits.map(l => ({ x: l.x, y: l.y, age: nowS - l.t0, e: envelope(nowS - l.t0) }));
    const view: View = { w: W, h: H, panX: this.sPan.x, panY: this.sPan.y, zoom: this.sPan.k, px: this.sPointer.x, py: this.sPointer.y };
    const lights = placeLights(this.t, P, view, lits, colors.lights).sort((a, b) => a.z - b.z);

    // The lights' halos over --bg.
    hctx.globalCompositeOperation = 'source-over'; hctx.fillStyle = rgba(colors.bg, 1); hctx.fillRect(0, 0, W, H);
    hctx.globalCompositeOperation = 'screen';
    // A gradient is transparent beyond its radius, so it fills only its own box: same picture, far less work.
    const pool = (x: number, y: number, r: number, c: Rgb, a: number, mid = false) => {
      r = Math.max(1, r);
      const x0 = Math.max(0, Math.floor(x - r)), y0 = Math.max(0, Math.floor(y - r)), x1 = Math.min(W, Math.ceil(x + r)), y1 = Math.min(H, Math.ceil(y + r));
      if (x1 <= x0 || y1 <= y0 || a <= 0) return;
      const g = hctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, rgba(c, a)); if (mid) g.addColorStop(.3, rgba(c, a * .5)); g.addColorStop(1, rgba(c, 0));
      hctx.fillStyle = g; hctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    };
    for (const s of lights) pool(s.x, s.y, s.glow, s.color, s.a, true);
    pool(this.lamp.x, this.lamp.y, W * .2, colors.glow, .045 * P.lamp);
    for (const l of lits) pool(l.x, l.y, W * (.07 + .04 * Math.min(1, l.age / 2)), colors.lit, backdropMotion.LIT_POOL_ALPHA * l.e);
    hctx.globalCompositeOperation = 'source-over';

    // Motes: they only show where light falls.
    dctx.setTransform(this.ratio, 0, 0, this.ratio, 0, 0); dctx.clearRect(0, 0, W, H);
    const t = this.t, pdx = this.sPointer.x - .5, pdy = this.sPointer.y - .5;
    backdropLayers.forEach((L, li) => {
      const vis = L.key === 'near' ? Math.max(0, P.dust * 1.6 - .6) : P.dust; if (vis < .01) return;
      const z = 1 + (this.sPan.k - 1) * .4 * L.depth;
      const offX = this.sPan.x * .25 * L.depth - pdx * W * .03 * L.depth, offY = this.sPan.y * .25 * L.depth - pdy * H * .03 * L.depth;
      this.motes[li].forEach((m, i) => {
        const shown = clamp(vis * L.n - i, 0, 1); if (shown <= 0) return;
        const wx = m.x + m.drift * t / 400 + .012 * Math.sin(t * 6.28 / m.wob + m.ph);
        const wy = m.y - t * L.rise + .008 * Math.cos(t * 6.28 / (m.wob * 1.3) + m.ph);
        let x = ((wx * W + offX) % W + W) % W, y = ((wy * H + offY) % H + H) % H;
        x = W / 2 + (x - W / 2) * z; y = H / 2 + (y - H / 2) * z;
        for (const l of lits) {
          const ex = x - l.x, ey = y - l.y, dd = Math.hypot(ex, ey) + 1, reach = W * backdropMotion.LIT_REACH;
          if (dd < reach) { const push = backdropMotion.LIT_PUSH_PX * L.depth * l.e * (1 - dd / reach); x += ex / dd * push; y += ey / dd * push; }
        }
        const twinkle = .78 + .22 * Math.sin(t * 1.3 + m.ph * 3);
        const a = Math.min(1, m.a * (.3 + lightAt(x, y, lights, this.lamp, P.lamp, W, lits)) * twinkle * shown * P.gain);
        if (a < .012) return;
        const color = m.warm ? colors.warm : colors.cool;
        if (L.key === 'near') {
          const s = m.s * z * 5; dctx.globalAlpha = a * .35;
          dctx.drawImage(m.warm ? this.sprites.warm : this.sprites.cool, x - s / 2, y - s / 2, s, s);
        }
        dctx.globalAlpha = a; dctx.fillStyle = rgba(color, 1);
        dctx.beginPath(); dctx.arc(x, y, m.s * z, 0, 2 * Math.PI); dctx.fill();
      });
    });
    dctx.globalAlpha = 1;
  }
}
