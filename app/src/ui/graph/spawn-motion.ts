import { graphMotion } from './graphMotion';
import type { EmberCanvas, Spark } from './ember-canvas';

/** Each branch finishes before the next begins. Times belong only to the view. */
export function spawnProgress(start: number, slot: number, now: number): number {
  const elapsed = now - start - slot * (graphMotion.SPAWN_GROW_MS + graphMotion.SPAWN_STAGGER_MS);
  const t = Math.max(0, Math.min(1, elapsed / graphMotion.SPAWN_GROW_MS));
  return 1 - (1 - t) ** 3;
}

/** The sparks a branch throws when it arrives at (x, y): a ring just outside the disc, flying out. */
export function arrivalSparks(x: number, y: number, born: number) {
  return Array.from({ length: graphMotion.SPAWN_PARTICLES }, (_, i) => {
    const angle = i / graphMotion.SPAWN_PARTICLES * Math.PI * 2, speed = graphMotion.SPAWN_PARTICLE_SPEED * (0.65 + (i % 3) * 0.175);
    return { born, x: x + Math.cos(angle) * 24, y: y + Math.sin(angle) * 24, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed };
  });
}

interface Branch { start: number; slot: number; complete: boolean; emitted: boolean }
interface Ember { born: number; x: number; y: number; vx: number; vy: number }

/** Live SVG geometry keeps the leading dot on the branch during physics settling; the lights are drawn on the map's ember canvas. */
export class SpawnMotion {
  private branches = new Map<string, Branch>();
  private embers: Ember[] = [];
  private frame = 0;
  private animations = new Set<Animation>();
  constructor(private host: () => HTMLElement | undefined, private svg: () => SVGSVGElement | undefined,
    private allowed: () => boolean, private lights: EmberCanvas) {}

  add(id: string, slot: number, start: number) {
    if (!this.branches.has(id)) this.branches.set(id, { start, slot, complete: false, emitted: false });
  }
  transfer(from: string, to: string) {
    const branch = this.branches.get(from);
    if (branch) { this.branches.delete(from); branch.complete = true; this.branches.set(to, branch); }
  }
  sync(ids: Set<string>) {
    for (const id of this.branches.keys()) if (!ids.has(id)) this.branches.delete(id);
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
    this.embers = []; this.lights.clear('spawn');
    for (const [id, branch] of this.branches) {
      branch.emitted = true; branch.start = -Infinity;
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
    let growing = false;
    const sparks: Spark[] = [];
    for (const [id, branch] of this.branches) {
      const path = svg.querySelector<SVGPathElement>(`[data-edge="${id}"]`);
      const node = host.querySelector<HTMLElement>(`[data-id="${id}"]`);
      if (!path || !node) continue;
      const progress = spawnProgress(branch.start, branch.slot, now);
      path.style.strokeDasharray = '1'; path.style.strokeDashoffset = String(1 - progress);
      const phase = progress < 1 ? 'growing' : branch.complete ? 'settled' : 'breathing';
      if (node.dataset.spawnPhase !== phase) node.dataset.spawnPhase = phase;
      if (progress > 0 && progress < 1) {
        const point = path.getPointAtLength(path.getTotalLength() * progress);
        sparks.push({ kind: 'tip', x: point.x, y: point.y, alpha: 1 });
      }
      if (progress < 1) growing = true;
      else if (branch.complete) {
        if (!branch.emitted) {
          const point = path.getPointAtLength(path.getTotalLength());
          this.embers.push(...arrivalSparks(point.x, point.y, now));
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
      if (t >= 1) return false;
      sparks.push({ kind: 'spark', x: p.x + p.vx * age / 1000, y: p.y + p.vy * age / 1000, alpha: 0.8 * (1 - t) ** 2 });
      return true;
    });
    this.lights.set('spawn', sparks);
    if (growing || this.embers.length) this.start();
  };
  private animate(element: Element | null, frames: Keyframe[]) {
    if (!element) return;
    const animation = element.animate(frames, { duration: graphMotion.SPAWN_REVEAL_MS, easing: 'ease-out' });
    this.animations.add(animation);
    animation.onfinish = animation.oncancel = () => this.animations.delete(animation);
  }
}
