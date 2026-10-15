// WG-9/10: the Welcome field's capsule, ported from the welcome-context final (r004-01 "Ride, settle",
// agent_design/welcome-context/RECIPE.md). The DOM stays persistent; only classes, inline positions
// and Web Animations change. Every state change completes on timers, never on `finished` promises.
export type Shape = 'rest' | 'cap' | 'two';
export interface CapsuleParts {
  ask: HTMLElement; cap: HTMLElement; top: HTMLElement; subj: HTMLElement; dir: HTMLTextAreaElement;
  dock: HTMLElement; lower: HTMLElement; hair: HTMLElement; btn: HTMLElement; wrap: HTMLElement; hint: HTMLElement;
}
const EASE = 'cubic-bezier(.2,.8,.2,1)', EXIT = 'cubic-bezier(.4,0,1,1)';
export const CAPSULE_MS = { card: 380, subject: 260, slide: 240, close: 110 } as const;

export class Capsule {
  private shape: Shape | null = null;
  private shown = false;
  private natural = { w: 0, h: 0 };
  private timers: ReturnType<typeof setTimeout>[] = [];
  constructor(private parts: CapsuleParts, private reduced: () => boolean) { this.measure(); }

  /** The button's natural size sizes the dock and the tail slot (--bw/--bh). */
  measure() {
    const { btn, cap } = this.parts;
    this.natural = { w: btn.offsetWidth, h: btn.offsetHeight };
    cap.style.setProperty('--bw', `${this.natural.w}px`); cap.style.setProperty('--bh', `${this.natural.h}px`);
  }

  apply(shape: Shape, show: boolean, instant = false) {
    if (shape === this.shape && show === this.shown) return;
    const p = this.parts, prev = { shape: this.shape, shown: this.shown };
    this.shape = shape; this.shown = show;
    const from = prev.shown ? this.current() : null, before = this.snapshot();
    const hintBefore = { left: p.hint.getBoundingClientRect().left, size: parseFloat(getComputedStyle(p.hint).fontSize) };
    this.kill();
    p.cap.classList.toggle('on', shape !== 'rest'); p.cap.classList.toggle('two', shape === 'two'); p.cap.classList.toggle('focused', show);
    p.wrap.classList.toggle('capsule', shape !== 'rest'); p.wrap.classList.toggle('two', shape === 'two');
    this.autosize();
    const after = this.snapshot(), to = show ? this.target(shape) : null;
    if (to) this.place(to);
    if (instant || this.reduced() || prev.shape === null) { p.btn.classList.toggle('show', show); return; }
    this.glideHint(hintBefore);
    this.morph(before, after, prev.shape, shape);
    if (show && !prev.shown) {
      p.btn.classList.add('show');
      p.btn.animate([{ clipPath: 'inset(0 0 0 100% round 999px)', transform: 'translateX(16px)' }, { clipPath: 'inset(0 0 0 0 round 999px)', transform: 'none' }], { duration: CAPSULE_MS.slide, easing: EASE });
    } else if (show && from && to && prev.shape !== shape) {
      // The button is pinned to the card's corner and rides it; it stops dead at its dock.
      p.btn.animate([{ left: `${from.x}px`, top: `${from.y}px` }, { left: `${to.x}px`, top: `${to.y}px` }], { duration: CAPSULE_MS.card, easing: EASE });
    } else if (!show && from) {
      this.place(from);
      const ms = CAPSULE_MS.slide * .7;
      p.btn.animate([{ clipPath: 'inset(0 0 0 0 round 999px)', transform: 'none' }, { clipPath: 'inset(0 0 0 100% round 999px)', transform: 'translateX(16px)' }], { duration: ms, easing: EXIT, fill: 'forwards' });
      this.later(() => { if (!this.shown) { p.btn.classList.remove('show'); p.btn.getAnimations().forEach(a => a.cancel()); } }, ms);
    }
  }

  /** The direction grew or shrank: the card follows, and a docked button shifts by the same amount. */
  resized() {
    const p = this.parts, before = p.dir.offsetHeight; this.autosize();
    const delta = p.dir.offsetHeight - before;
    if (delta && this.shown && this.shape === 'two') p.btn.style.top = `${parseFloat(p.btn.style.top || '0') + delta}px`;
  }

  /** Closing fades the direction first (110 ms), then the caller reshapes the card. */
  fadeLower(done: () => void) {
    if (this.reduced() || this.shape !== 'two') { done(); return; }
    this.parts.lower.animate([{ opacity: 1 }, { opacity: 0 }], { duration: CAPSULE_MS.close, fill: 'forwards' });
    this.later(() => { this.parts.lower.getAnimations().forEach(a => a.cancel()); done(); }, CAPSULE_MS.close);
  }

  reposition() { if (this.shown && this.shape) this.place(this.target(this.shape)); }
  dispose() { this.kill(); }

  private autosize() {
    const d = this.parts.dir;
    if (this.shape === 'two') { d.style.height = 'auto'; d.style.height = `${d.scrollHeight}px`; } else d.style.height = '';
  }
  private later(fn: () => void, ms: number) { this.timers.push(setTimeout(fn, ms)); }
  private kill() {
    const p = this.parts;
    for (const el of [p.cap, p.subj, p.dock, p.lower, p.hair, p.btn, p.hint]) el.getAnimations().forEach(a => a.cancel());
    this.timers.forEach(clearTimeout); this.timers = []; p.cap.classList.remove('anim');
  }
  private snapshot() {
    const c = getComputedStyle(this.parts.cap), s = getComputedStyle(this.parts.subj);
    return { h: this.parts.cap.offsetHeight, pad: c.padding, rad: c.borderRadius, bc: c.borderColor, bbc: c.borderBottomColor, bg: c.backgroundColor,
      fs: s.fontSize, sp: s.padding, dw: `${this.parts.dock.offsetWidth}px` };
  }
  private target(shape: Shape) {
    const { cap, top } = this.parts, cs = getComputedStyle(cap), { w, h } = this.natural;
    const x = cap.offsetLeft + cap.offsetWidth - 1 - parseFloat(cs.paddingRight) - w;
    const y = shape === 'two' ? cap.offsetTop + cap.offsetHeight - 1 - parseFloat(cs.paddingBottom) - h : cap.offsetTop + top.offsetTop + (top.offsetHeight - h) / 2;
    return { x, y };
  }
  private current() {
    const a = this.parts.ask.getBoundingClientRect(), r = this.parts.btn.getBoundingClientRect();
    return { x: r.x - a.x, y: r.y - a.y };
  }
  private place(at: { x: number; y: number }) { this.parts.btn.style.left = `${at.x}px`; this.parts.btn.style.top = `${at.y}px`; }
  /** FLIP of the hint's text box: it glides to its new inset and size with the card. */
  private glideHint(before: { left: number; size: number }) {
    const hint = this.parts.hint, dx = before.left - hint.getBoundingClientRect().left, scale = before.size / parseFloat(getComputedStyle(hint).fontSize);
    if (Math.abs(dx) < .5 && Math.abs(scale - 1) < .005) return;
    hint.animate([{ transform: `translateX(${dx}px) scale(${scale})` }, { transform: 'none' }], { duration: CAPSULE_MS.card, easing: EASE });
  }
  private morph(o: ReturnType<Capsule['snapshot']>, n: ReturnType<Capsule['snapshot']>, from: Shape | null, to: Shape) {
    const p = this.parts;
    if (o.h !== n.h || o.pad !== n.pad || o.rad !== n.rad || o.bg !== n.bg || o.bc !== n.bc) {
      p.cap.classList.add('anim');
      p.cap.animate([{ height: `${o.h}px`, padding: o.pad, borderRadius: o.rad, borderColor: o.bc, borderBottomColor: o.bbc, backgroundColor: o.bg },
        { height: `${n.h}px`, padding: n.pad, borderRadius: n.rad, borderColor: n.bc, borderBottomColor: n.bbc, backgroundColor: n.bg }], { duration: CAPSULE_MS.card, easing: EASE });
      this.later(() => p.cap.classList.remove('anim'), CAPSULE_MS.card);
    }
    // A brief opacity dip hides the centre-to-left realignment of the subject.
    if (o.fs !== n.fs) p.subj.animate([{ fontSize: o.fs, padding: o.sp, opacity: 1 }, { opacity: .15, offset: .35 }, { fontSize: n.fs, padding: n.sp, opacity: 1 }], { duration: CAPSULE_MS.subject, easing: EASE });
    if (o.dw !== n.dw) p.dock.animate([{ width: o.dw }, { width: n.dw }], { duration: CAPSULE_MS.slide, easing: EASE });
    if (to === 'two' && from !== 'two') {
      p.lower.animate([{ opacity: 0, transform: 'translateY(-6px)' }, { opacity: 1, transform: 'none' }], { duration: 240, delay: CAPSULE_MS.card * .33, fill: 'backwards', easing: 'ease-out' });
      p.hair.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: CAPSULE_MS.card * .76, delay: CAPSULE_MS.card * .19, fill: 'backwards', easing: EASE });
    }
  }
}
