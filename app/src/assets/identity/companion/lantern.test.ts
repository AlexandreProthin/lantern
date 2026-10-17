import { expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { runInNewContext } from 'node:vm';
import { companionSvg, pose, still, mix, GESTURES } from './lantern';

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
