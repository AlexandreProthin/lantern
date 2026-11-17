import type { CompanionParts } from '../../assets/identity/companion/lantern';
/**
 * v0.8.0: Amber's drawing is put in the page once (`companionTemplate`) and each pose only sets the attributes of
 * the parts it moves (`companionParts`), and only those that changed: no SVG string, no parsing, no new filter or
 * gradients per frame. lantern.test.ts checks that the template so updated is the accepted drawing.
 */
export class CompanionDrawing {
  private readonly eyes: Element[]; private readonly flames: Element[]; private readonly inner: Element[];
  private readonly body: Element | null; private readonly line: Element | null; private readonly halo: Element | null;
  private readonly glow: Element | null; private readonly feet: Element | null; private readonly feetPath: Element | null;
  private readonly last = new Map<Element, Record<string, string>>();
  constructor(root: ParentNode) {
    const all = (part: string) => [...root.querySelectorAll(`[data-part~="${part}"]`)], one = (part: string) => root.querySelector(`[data-part~="${part}"]`);
    this.eyes = all('eye'); this.flames = all('flame'); this.inner = all('inner');
    this.body = one('body'); this.line = one('line'); this.halo = one('halo'); this.glow = one('glow'); this.feet = one('feet');
    this.feetPath = this.feet?.querySelector('path') ?? null;
  }
  private set(el: Element | null | undefined, name: string, value: string) {
    if (!el) return;
    let seen = this.last.get(el); if (!seen) { seen = {}; this.last.set(el, seen); }
    if (seen[name] === value) return;
    seen[name] = value; el.setAttribute(name, value);
  }
  apply(p: CompanionParts) {
    this.set(this.body, 'transform', p.body);
    this.set(this.eyes[0], 'cx', String(p.eyes.left)); this.set(this.eyes[1], 'cx', String(p.eyes.right));
    for (const eye of this.eyes) this.set(eye, 'ry', String(p.eyes.ry));
    this.set(this.line, 'display', p.line ? 'inline' : 'none');
    // Folded feet are not drawn at all: no path is left behind.
    this.set(this.feet, 'display', p.feet ? 'inline' : 'none'); this.set(this.feet, 'opacity', String(p.feet?.opacity ?? 0));
    this.set(this.feetPath, 'd', p.feet?.d ?? '');
    for (const flame of this.flames) this.set(flame, 'd', p.flame);
    this.set(this.inner[0], 'd', p.inner[0]); this.set(this.inner[1], 'd', p.inner[1]);
    this.set(this.glow, 'opacity', p.glow);
    this.set(this.halo, 'rx', String(p.halo.rx)); this.set(this.halo, 'ry', String(p.halo.ry));
  }
}
