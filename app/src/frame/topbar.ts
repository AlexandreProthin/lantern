// The accepted top bar (agent_design/top-bar/RECIPE.md, r005-02 "Gliding marker"): its RS-18 collapse
// and the field panel's grow and fold. Pure helpers, so the layout rules can be tested without a DOM.
import type { TransitionConfig } from 'svelte/transition';

/** RECIPE: gaps 14 px; the field is 34 % of the width, 28 % once narrowed. */
export const BAR_GAP = 14, FIELD_PCT = 34, FIELD_NARROW_PCT = 28, MIN_WIDTH = 1024;
export interface BarFit { tokenHover: boolean; stats: boolean; words: boolean; fieldPct: number }
/** Measured in px: where the capsule starts, its width with and without the space words, the stats' width
 * and the x where the stats must end (the window controls' left edge, less the bar's padding). */
export interface BarMeasures { width: number; capLeft: number; capWords: number; capGlyphs: number; stats: number; statsRight: number }

const LEVELS: BarFit[] = [
  { tokenHover: true, stats: true, words: true, fieldPct: FIELD_PCT },
  { tokenHover: false, stats: false, words: true, fieldPct: FIELD_PCT },
  { tokenHover: false, stats: false, words: false, fieldPct: FIELD_PCT },
  { tokenHover: false, stats: false, words: false, fieldPct: FIELD_NARROW_PCT },
];
/**
 * RS-18: the first collapse level at which nothing touches the centred field, in the spec's order: the token
 * hover goes with the stats (losing the hover alone frees no room), then the space words fold, then the field
 * narrows. At the window's minimum width (1024 px) the bar is fully collapsed, as the recipe draws it.
 */
export function barFit(m: BarMeasures): BarFit {
  if (m.width <= MIN_WIDTH) return LEVELS[LEVELS.length - 1];
  for (const level of LEVELS) {
    const field = m.width * level.fieldPct / 100, left = (m.width - field) / 2, right = left + field;
    const capsule = m.capLeft + (level.words ? m.capWords : m.capGlyphs) + BAR_GAP <= left;
    const stats = !level.stats || m.stats === 0 || m.statsRight - m.stats - BAR_GAP >= right;
    if (capsule && stats) return level;
  }
  return LEVELS[LEVELS.length - 1];
}

/** CSS cubic-bezier(x1, y1, x2, y2) as a function of progress, solved for x by bisection. */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  const at = (a: number, b: number, s: number) => 3 * a * s * (1 - s) ** 2 + 3 * b * s * s * (1 - s) + s ** 3;
  return (t: number) => {
    if (t <= 0) return 0; if (t >= 1) return 1;
    let lo = 0, hi = 1, s = t;
    for (let i = 0; i < 24; i++) { s = (lo + hi) / 2; if (at(x1, x2, s) < t) lo = s; else hi = s; }
    return at(y1, y2, s);
  };
}
const glide = cubicBezier(.2, .8, .2, 1), easeIn = cubicBezier(.42, 0, 1, 1);
/** RECIPE motion: the marker glides in 240 ms; the panel opens in 220 ms and folds in 160 ms. */
export const BAR_MS = { marker: 240, open: 220, fadeIn: 80, close: 160, fadeOutDelay: 40, fadeOut: 120 } as const;

/** The panel drawn at `p` (0 = the field's pill at the panel's top, risen 16 px; 1 = the whole panel). */
function frame(node: HTMLElement, field: number, p: number, opacity: number) {
  const w = node.offsetWidth, h = node.offsetHeight, side = Math.max(0, (w - field) / 2) * (1 - p), bottom = Math.max(0, h - 34) * (1 - p);
  return `opacity:${opacity};clip-path:inset(0 ${side}px ${bottom}px ${side}px round ${17 + (6 - 17) * p}px);translate:0 ${-16 * (1 - p)}px;`;
}
/** RS-15: the panel grows out of the field. */
export function growPanel(node: HTMLElement, { field, reduced }: { field: number; reduced: boolean }): TransitionConfig {
  return { duration: reduced ? 0 : BAR_MS.open, css: t => frame(node, field, glide(t), Math.min(1, t * BAR_MS.open / BAR_MS.fadeIn)) };
}
/** …and folds back into it, fading after 40 ms. */
export function foldPanel(node: HTMLElement, { field, reduced }: { field: number; reduced: boolean }): TransitionConfig {
  return { duration: reduced ? 0 : BAR_MS.close, css: t => {
    const elapsed = (1 - t) * BAR_MS.close, fade = Math.min(1, Math.max(0, (elapsed - BAR_MS.fadeOutDelay) / BAR_MS.fadeOut));
    return frame(node, field, 1 - easeIn(1 - t), 1 - easeIn(fade));
  } };
}
/** The frame's reduced-motion rule (GV-100): the system setting or Settings › Appearance. */
export const reducedMotion = () => typeof matchMedia === 'function'
  && (matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.reduceMotion === 'on');

/** RS-15 palette: one row per choice; `filter` keeps the rows whose label contains the text, case-insensitive. */
export interface PaletteRow { key: string; group: 'subjects' | 'rooms' | 'settings'; label: string; hint?: string; current?: boolean }
export function filterRows(rows: readonly PaletteRow[], text: string): PaletteRow[] {
  const needle = text.trim().toLocaleLowerCase();
  return needle ? rows.filter(r => r.label.toLocaleLowerCase().includes(needle)) : [...rows];
}
