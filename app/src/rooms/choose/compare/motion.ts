/** Compare's motion (agent_design/choose-compare/RECIPE.md, r006-03): event-driven, instant under reduced motion (GV-100). */
export const RESIZE_MS = 240, FOLD_MS = 204, EASE = 'cubic-bezier(.3,.6,.3,1)';
export const reduced = () => typeof matchMedia === 'function' && (matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.reduceMotion === 'on');

/** The CSS timing curve as a function of time, for Svelte's `tick`. */
function bezier(x1: number, y1: number, x2: number, y2: number) {
  const at = (a: number, b: number, t: number) => 3 * a * (1 - t) ** 2 * t + 3 * b * (1 - t) * t * t + t ** 3;
  return (x: number) => {
    let lo = 0, hi = 1;
    for (let i = 0; i < 24; i++) { const mid = (lo + hi) / 2; if (at(x1, x2, mid) < x) lo = mid; else hi = mid; }
    return at(y1, y2, (lo + hi) / 2);
  };
}
const ease = bezier(0.3, 0.6, 0.3, 1);

/** A row (a band, a criterion, a group bar) grows from zero height and folds back: each cell's content wrapper (`.w`) is clipped and eased. */
export function rowFx(node: HTMLElement, { out = false } = {}) {
  if (reduced()) return { duration: 0 };
  const wraps = [...node.querySelectorAll<HTMLElement>(':scope > th > .w, :scope > td > .w')], heights = wraps.map(w => w.getBoundingClientRect().height);
  return { duration: out ? FOLD_MS : RESIZE_MS, easing: ease, tick: (t: number) => {
    const live = t > 0 && t < 1;
    if (live) node.dataset.fx = '1'; else delete node.dataset.fx;
    node.style.setProperty('--fx', String(t));
    wraps.forEach((w, i) => { w.style.height = live ? `${heights[i] * t}px` : t === 0 ? '0px' : ''; w.style.overflow = t < 1 ? 'hidden' : ''; });
  } };
}
/** A value arrives, is edited or reverted: the cell cross-fades (opacity .25 to 1, 200 ms). */
export function valueFx(_node: HTMLElement) {
  return reduced() ? { duration: 0 } : { duration: 200, css: (t: number) => `opacity:${0.25 + 0.75 * t}` };
}
/** A card yields to another: it fades out in 140 ms; the new one fades in over the band's easing. */
export function cardFx(_node: HTMLElement, { out = false } = {}) {
  return reduced() ? { duration: 0 } : { duration: out ? 140 : RESIZE_MS, css: (t: number) => `opacity:${t}` };
}

/** The band stays open while its cards change: its cells ease from their old height to the new one. */
export function keep(node: HTMLElement) {
  if (typeof ResizeObserver === 'undefined') return;
  const last = new Map<Element, number>();
  const observer = new ResizeObserver(entries => {
    for (const e of entries) {
      const w = e.target as HTMLElement, h = e.borderBoxSize?.[0]?.blockSize ?? w.getBoundingClientRect().height, before = last.get(w);
      last.set(w, h);
      if (before === undefined || Math.abs(before - h) < 2 || node.dataset.fx || reduced() || w.getAnimations().length) continue;
      w.animate([{ height: `${before}px`, overflow: 'hidden' }, { height: `${h}px`, overflow: 'hidden' }], { duration: RESIZE_MS, easing: EASE });
    }
  });
  node.querySelectorAll('.w').forEach(w => observer.observe(w));
  return { destroy: () => observer.disconnect() };
}

/** Columns ease to their new widths: measure before a change of selection, animate from those widths after it. */
export class ColumnFlip {
  private widths: number[] = [];
  constructor(private cells: () => HTMLElement[]) {}
  before(): void { this.widths = this.cells().map(c => c.getBoundingClientRect().width); }
  after(): void {
    const cells = this.cells();
    if (reduced() || cells.length !== this.widths.length) return;
    cells.forEach((c, i) => {
      const from = this.widths[i], to = c.getBoundingClientRect().width;
      if (from === undefined || Math.abs(from - to) < 2) return;
      c.animate([{ minWidth: `${from}px`, width: `${from}px` }, { minWidth: `${to}px`, width: `${to}px` }], { duration: RESIZE_MS, easing: EASE });
    });
  }
}
