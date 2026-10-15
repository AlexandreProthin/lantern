import { graphMotion } from './graphMotion';

/** Each branch finishes before the next begins. Times belong only to the view. */
export function spawnProgress(start: number, slot: number, now: number): number {
  const elapsed = now - start - slot * (graphMotion.SPAWN_GROW_MS + graphMotion.SPAWN_STAGGER_MS);
  const t = Math.max(0, Math.min(1, elapsed / graphMotion.SPAWN_GROW_MS));
  return 1 - (1 - t) ** 3;
}

interface Branch { start: number; slot: number; complete: boolean; emitted: boolean; head?: SVGGElement }
interface Ember { element: SVGCircleElement; born: number; x: number; y: number; vx: number; vy: number }
const ns = 'http://www.w3.org/2000/svg';

/** Live SVG geometry keeps the leading dot on the branch during physics settling. */
export class SpawnMotion {
  private branches = new Map<string, Branch>();
  private embers: Ember[] = [];
  private frame = 0;
  private layer: SVGGElement | null = null;
  private animations = new Set<Animation>();
  constructor(private host: () => HTMLElement | undefined, private svg: () => SVGSVGElement | undefined,
    private allowed: () => boolean) {}

  add(id: string, slot: number, start: number) {
    if (!this.branches.has(id)) this.branches.set(id, { start, slot, complete: false, emitted: false });
  }
  transfer(from: string, to: string) {
    const branch = this.branches.get(from);
    if (branch) { this.branches.delete(from); branch.complete = true; this.branches.set(to, branch); }
  }
  sync(ids: Set<string>) {
    for (const [id, branch] of this.branches) if (!ids.has(id)) {
      branch.head?.remove(); this.branches.delete(id);
    }
    this.start();
  }
  private start() {
    if (!this.frame && (this.branches.size || this.embers.length)) this.frame = requestAnimationFrame(this.paint);
  }
  /** Hiding/reduced motion finishes geometry immediately and releases all effects. */
  stop() {
    cancelAnimationFrame(this.frame); this.frame = 0;
    for (const animation of this.animations) animation.cancel();
    this.animations.clear();
    this.layer?.remove(); this.layer = null; this.embers = [];
    for (const [id, branch] of this.branches) {
      branch.head = undefined; branch.emitted = true; branch.start = -Infinity;
      const node = this.host()?.querySelector<HTMLElement>(`[data-id="${id}"]`);
      if (node) { if (branch.complete) node.removeAttribute('data-spawn-phase'); else node.dataset.spawnPhase = 'breathing'; }
      const path = this.svg()?.querySelector<SVGPathElement>(`[data-edge="${id}"]`);
      path?.style.removeProperty('stroke-dasharray');
      if (path) path.style.strokeDashoffset = '0';
      if (branch.complete) this.branches.delete(id);
    }
  }
  private paint = (now: number) => {
    this.frame = 0;
    const svg = this.svg(), host = this.host();
    if (!this.allowed() || !svg || !host) { this.stop(); return; }
    if (!this.layer) {
      this.layer = document.createElementNS(ns, 'g'); this.layer.setAttribute('class', 'spawn-light');
      this.layer.setAttribute('aria-hidden', 'true'); svg.append(this.layer);
    }
    let growing = false;
    for (const [id, branch] of this.branches) {
      const path = svg.querySelector<SVGPathElement>(`[data-edge="${id}"]`);
      const node = host.querySelector<HTMLElement>(`[data-id="${id}"]`);
      if (!path || !node) continue;
      const progress = spawnProgress(branch.start, branch.slot, now);
      path.style.strokeDasharray = '1'; path.style.strokeDashoffset = String(1 - progress);
      node.dataset.spawnPhase = progress < 1 ? 'growing' : branch.complete ? 'settled' : 'breathing';
      if (progress > 0 && progress < 1) {
        if (!branch.head) {
          branch.head = document.createElementNS(ns, 'g'); branch.head.setAttribute('class', 'spawn-tip');
          branch.head.innerHTML = '<circle r="12" fill="var(--glow-far)"/><circle r="6" fill="var(--glow-near)"/><circle r="2.5" fill="var(--node-lit)"/>';
          this.layer.append(branch.head);
        }
        const point = path.getPointAtLength(path.getTotalLength() * progress);
        branch.head.setAttribute('transform', `translate(${point.x} ${point.y})`);
      } else { branch.head?.remove(); branch.head = undefined; }
      if (progress < 1) growing = true;
      else if (branch.complete) {
        if (!branch.emitted) {
          const point = path.getPointAtLength(path.getTotalLength());
          for (let i = 0; i < graphMotion.SPAWN_PARTICLES; i++) {
            const angle = i / graphMotion.SPAWN_PARTICLES * Math.PI * 2;
            const element = document.createElementNS(ns, 'circle');
            element.setAttribute('r', '1.2'); element.setAttribute('fill', 'var(--node-lit)');
            element.setAttribute('class', 'spawn-particle'); this.layer.append(element);
            const speed = graphMotion.SPAWN_PARTICLE_SPEED * (0.65 + (i % 3) * 0.175);
            this.embers.push({ element, born: now, x: point.x + Math.cos(angle) * 24,
              y: point.y + Math.sin(angle) * 24, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed });
          }
        }
        node.removeAttribute('data-spawn-phase');
        this.animate(node.querySelector('.disc'), [{ transform: 'scale(1.06)' }, { transform: 'scale(1)' }]);
        this.animate(node.querySelector('.name'), [{ opacity: 0 }, { opacity: 1 }]);
        path.style.removeProperty('stroke-dasharray'); path.style.removeProperty('stroke-dashoffset');
        this.branches.delete(id);
      }
    }
    this.embers = this.embers.filter(p => {
      const age = now - p.born, t = age / graphMotion.SPAWN_PARTICLE_LIFE_MS;
      if (t >= 1) { p.element.remove(); return false; }
      p.element.setAttribute('cx', String(p.x + p.vx * age / 1000));
      p.element.setAttribute('cy', String(p.y + p.vy * age / 1000));
      p.element.setAttribute('opacity', String(0.8 * (1 - t) ** 2));
      return true;
    });
    if (growing || this.embers.length) this.start();
    else { this.layer.remove(); this.layer = null; }
  };
  private animate(element: Element | null, frames: Keyframe[]) {
    if (!element) return;
    const animation = element.animate(frames, { duration: graphMotion.SPAWN_REVEAL_MS, easing: 'ease-out' });
    this.animations.add(animation);
    animation.onfinish = animation.oncancel = () => this.animations.delete(animation);
  }
}
