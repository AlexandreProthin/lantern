import { expect, test } from 'vitest';
import { atRest, backdropLayers, backdropLights, backdropMotion, colorsFrom, createMotes, cssEase, envelope, LIT_LIFE_S, mixColors, mixRgb,
  parseColor, placeLights, presetFor, roomTokens, type Rgb, type View } from './backdrop';
import { defaultSettings, validateSettings } from './settings';

const view: View = { w: 1000, h: 800, panX: 0, panY: 0, zoom: 1, px: .5, py: .5 };
const colors = backdropLights.map((): Rgb => [0, 0, 0]);

test('RS-34: colours are read from the room tokens as app.css writes them', () => {
  expect(parseColor('#e8b66e')).toEqual([232, 182, 110]);
  expect(parseColor(' #fff ')).toEqual([255, 255, 255]);
  expect(parseColor('rgba(255, 182, 88, 0.15)')).toEqual([255, 182, 88]);
  expect(parseColor('var(--x)')).toBeNull();
});

test('RS-34: a lit node eases in over 1.4 s and is gone after 5.2 s', () => {
  expect(envelope(0)).toBe(0);
  expect(envelope(1.4)).toBe(1);
  expect(envelope(.7)).toBeGreaterThan(0);
  expect(envelope(3)).toBeLessThan(1);
  expect(envelope(LIT_LIFE_S)).toBe(0);
  expect(LIT_LIFE_S).toBeCloseTo(5.2);
});

test('RS-34: each space has its own anchor, unknown spaces fall back to Welcome', () => {
  expect(presetFor('study').gain).toBe(.55);
  expect(presetFor('gallery').cy).toBe(.06);
  expect(presetFor('elsewhere')).toBe(presetFor('welcome'));
});

test('RS-34: the lights start where the recipe puts them and orbit back', () => {
  const at0 = placeLights(0, presetFor('welcome'), view, [], colors);
  expect(at0[0].x).toBeCloseTo(700); expect(at0[0].y).toBeCloseTo(360);
  const turn = placeLights(80, presetFor('welcome'), view, [], colors);
  expect(turn[0].x).toBeCloseTo(at0[0].x); expect(turn[0].y).toBeCloseTo(at0[0].y);
});

test('RS-34: a lit node brightens a nearby light by at most 20 %', () => {
  const calm = placeLights(0, presetFor('welcome'), view, [], colors)[0];
  const lit = placeLights(0, presetFor('welcome'), view, [{ x: calm.x, y: calm.y, e: 1, age: 1.4 }, { x: calm.x, y: calm.y, e: 1, age: 1.4 }], colors)[0];
  expect(lit.a / calm.a).toBeCloseTo(1.2);
});

test('RS-34: a long graph pan never sends the lights off screen', () => {
  const far = placeLights(0, presetFor('study'), { ...view, panX: 50000 }, [], colors);
  const bounded = placeLights(0, presetFor('study'), { ...view, panX: 1000 }, [], colors);
  far.forEach((light, i) => expect(light.x).toBeCloseTo(bounded[i].x));
});

test('RS-34: motes are seeded, so the reduced-motion still frame is stable', () => {
  const a = createMotes(), b = createMotes();
  expect(a.map(layer => layer.length)).toEqual(backdropLayers.map(layer => layer.n));
  expect(a).toEqual(b);
  expect(a.flat().every(m => m.x >= 0 && m.x < 1 && m.y >= 0 && m.y < 1)).toBe(true);
});

test('RS-34: a room fade reads where it ends once, from the room’s own rule, and eases there', () => {
  const rule = (selectorText: string, values: Record<string, string>) => ({ selectorText,
    style: Object.assign(Object.keys(values), { getPropertyValue: (name: string) => values[name] ?? '' }) });
  const sheet = { cssRules: [
    rule(":root[data-room='learn']", { '--accent': '#e8b66e', '--bg': '#101827' }),
    { cssRules: [rule(":root[data-room='choose']", { '--accent': '#5cc6bd', color: 'red' })] },
    rule(':root[data-room-fade]', { '--accent': '#000' })
  ] } as unknown as CSSStyleSheet;
  const foreign = { get cssRules(): CSSRuleList { throw new Error('cross-origin'); } } as unknown as CSSStyleSheet;
  const choose = roomTokens('choose', [foreign, sheet]);
  expect([...choose]).toEqual([['--accent', '#5cc6bd']]);
  const from = colorsFrom(name => ({ '--accent': '#e8b66e' } as Record<string, string>)[name]), to = colorsFrom(name => choose.get(name));
  expect(to.lights[0]).toEqual([92, 198, 189]); expect(to.bg).toEqual([16, 24, 39]);
  expect(mixColors(from, to, 0)).toEqual(from); expect(mixColors(from, to, 1)).toEqual(to);
  expect(mixColors(from, to, .5).lights[0]).toEqual(mixRgb([232, 182, 110], [92, 198, 189], .5));
  expect(cssEase(0)).toBe(0); expect(cssEase(1)).toBe(1); expect(cssEase(2)).toBe(1);
  expect(cssEase(.5)).toBeCloseTo(.8, 1);
});

test('RS-34: the backdrop rests once nothing eases any more, and wakes when something moves or is lit', () => {
  const P = presetFor('study'), still = { pan: { x: 10, y: 0, k: 1 }, sPan: { x: 10, y: 0, k: 1 }, pointer: { x: .5, y: .5 }, sPointer: { x: .5, y: .5 },
    lamp: { x: 500, y: 400 }, w: 1000, h: 800, P: { ...P }, target: P, lits: 0, fading: false };
  expect(atRest(still)).toBe(true);
  expect(atRest({ ...still, sPan: { x: 4, y: 0, k: 1 } })).toBe(false);
  expect(atRest({ ...still, pointer: { x: .7, y: .5 } })).toBe(false);
  expect(atRest({ ...still, lamp: { x: 480, y: 400 } })).toBe(false);
  expect(atRest({ ...still, P: presetFor('welcome') })).toBe(false);
  expect(atRest({ ...still, lits: 1 })).toBe(false);
  expect(atRest({ ...still, fading: true })).toBe(false);
  expect(backdropMotion.IDLE_FRAME_MS).toBeGreaterThan(backdropMotion.FRAME_MS);
});

test('RS-34: the backdrop setting defaults on and rejects non-booleans', () => {
  expect(defaultSettings().appearance.backdrop).toBe(true);
  expect(validateSettings({ appearance: { backdrop: false } }).appearance.backdrop).toBe(false);
  expect(validateSettings({ appearance: { backdrop: 'no' } }).appearance.backdrop).toBe(true);
});
