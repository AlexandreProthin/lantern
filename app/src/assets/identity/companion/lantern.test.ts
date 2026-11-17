import { expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { runInNewContext } from 'node:vm';
import { companionParts, companionSvg, companionTemplate, pose, still, mix, GESTURE, GESTURES } from './lantern';
import type { CompanionParts, Pose } from './lantern';

// CO-54: the port keeps the accepted renderer's output exactly; the release's own sources run beside it.
const SOURCES = join(__dirname, '../../../../../agent_identity/projects/lantern/final/lantern-identity-v0.2/runtime/sources');
function release() {
  const window: Record<string, any> = {};
  const context = { window, globalThis: window, Math, Object, Error };
  for (const file of ['body.js', 'motion.js', 'system.js', 'styles.js']) runInNewContext(readFileSync(join(SOURCES, file), 'utf8'), context);
  window.LanternMotion.context = 'learn';
  return window;
}
test('every gesture, at the start, mid-way, the end and still, renders byte-identical to the release (learn tokens)', () => {
  const g = release();
  for (let i = 0; i < GESTURES.length; i++) {
    for (const t of [0, 377, GESTURES[i].duration / 2, GESTURES[i].duration]) {
      expect(pose(i, t)).toEqual(g.LanternMotion.pose(i, t));
      expect(companionSvg(i, pose(i, t), `a${i}`)).toBe(g.LanternMotion.svg(i, g.LanternMotion.pose(i, t), `a${i}`));
    }
    expect(still(i)).toEqual(g.LanternMotion.still(i));
    expect(companionSvg(i, still(i), 's')).toBe(g.LanternMotion.svg(i, g.LanternMotion.still(i), 's'));
    expect(mix(pose(i, 100), still(i), .4)).toEqual(g.LanternMotion.mix(g.LanternMotion.pose(i, 100), g.LanternMotion.still(i), .4));
  }
});
test('CO-55: room tokens touch only the halo and the light on the frame; the flame keeps its colours', () => {
  const plain = companionSvg(3, still(3), 'r'), room = companionSvg(3, still(3), 'r', 'learn', true);
  expect(room).toContain('stop-color:var(--amber-halo,#ffac38)'); expect(room).toContain('stop-color:var(--amber-lit-near,#efc08c)');
  expect(room).toContain('stop-color:var(--amber-lit-far,#86624a)'); expect(room).toContain('pointer-events="none"');
  const flameOnly = (svg: string) => svg.replace(/<radialGradient id="r-(light|lit)".*?<\/radialGradient>/g, '').replace(' pointer-events="none"', '');
  expect(flameOnly(room)).toBe(flameOnly(plain));
});

// v0.8.0: the template plus the parts of a pose is the same drawing as companionSvg for that pose.
/** What frame/amber/drawing.ts does to the DOM, done to the markup. */
function applied(template: string, p: CompanionParts): string {
  let eye = 0, inner = 0;
  return template
    .replace(/<ellipse data-part="eye" cx="[^"]*"( cy="7[34]" rx="2.2") ry="[^"]*"/g, (_, rest) => `<ellipse cx="${eye++ ? p.eyes.right : p.eyes.left}"${rest} ry="${p.eyes.ry}"`)
    .replace(/<path data-part="line"[^>]*\/>/, m => p.line ? m.replace(' data-part="line"', '') : '')
    .replace(/<g data-part="body" transform="[^"]*"/, `<g transform="${p.body}"`)
    .replace(/<ellipse data-part="halo" cx="50" cy="68" rx="[^"]*" ry="[^"]*"/, `<ellipse cx="50" cy="68" rx="${p.halo.rx}" ry="${p.halo.ry}"`)
    .replace(/<path data-part="flame glow" d="[^"]*"( fill="[^"]*") opacity="[^"]*"/, `<path d="${p.flame}"$1 opacity="${p.glow}"`)
    .replace(/<path data-part="flame" d="[^"]*"/g, `<path d="${p.flame}"`)
    .replace(/<path data-part="inner" d="[^"]*"/g, () => `<path d="${p.inner[inner++]}"`)
    .replace(/<g data-part="feet" opacity="[^"]*"><path d="[^"]*"([^>]*)\/><\/g>/, (_, rest) => p.feet ? `<g opacity="${p.feet.opacity}"><path d="${p.feet.d}"${rest}/></g>` : '');
}
test('v0.8.0: the marked template, updated with a pose\'s parts, draws exactly what companionSvg draws for that pose', () => {
  const poses: Pose[] = [];
  for (let i = 0; i < GESTURES.length; i++) for (const t of [0, 377, 1111, GESTURES[i].duration / 2]) poses.push(pose(i, t));
  poses.push({ ...still(GESTURE.suspension), gaze: 2.4, lid: .45, angle: -5.5, flameTime: 8123 }, { ...still(GESTURE.landing), feet: .3, step: .6 });
  for (const ctx of ['learn', 'neutral'] as const) {
    const template = companionTemplate('t', ctx);
    expect(template).toContain('aria-hidden="true"'); expect(template.match(/data-part="flame/g)).toHaveLength(3);
    for (const z of poses) expect(applied(template, companionParts(z))).toBe(companionSvg(GESTURE.suspension, z, 't', ctx, true).replace(/ role="img" aria-label="[^"]*"/, ' aria-hidden="true"'));
  }
});
test('CO-54: a flare brightens the glow and widens the halo; none is the release\'s drawing', () => {
  const calm = companionParts(still(GESTURE.suspension)), lit = companionParts({ ...still(GESTURE.suspension), flare: 1 });
  expect(calm.glow).toBe('.27'); expect(calm.halo).toEqual({ rx: 60, ry: 53 });
  expect(Number(lit.glow)).toBeGreaterThan(.6); expect(lit.halo.rx).toBeGreaterThan(70); expect(lit.flame).toBe(calm.flame);
});
