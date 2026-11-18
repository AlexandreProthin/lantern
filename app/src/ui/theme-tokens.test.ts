import { expect, test } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { scaleCss } from '../../scripts/scale-font-sizes.mjs';

// SE-61: every room writes the same tokens for both themes, and the light theme's text passes WCAG AA.
const src = join(import.meta.dirname, '..');
const css = ['ui/app.css', 'rooms/choose/choose.css', 'rooms/sample/sample.css'].map(f => readFileSync(join(src, f), 'utf8')).join('\n');
/** The custom properties of every rule whose selector is exactly `selector`. */
function tokens(selector: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const [, sel, body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (sel.replace(/\/\*[\s\S]*?\*\//g, '').trim().replace(/"/g, "'") !== selector) continue;
    for (const [, name, value] of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);?/g)) out.set(name, value.trim());
  }
  return out;
}
const hex = (h: string) => [0, 2, 4].map(i => parseInt(h.replace('#', '').slice(i, i + 2), 16));
const luminance = (c: string) => { const [r, g, b] = hex(c).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return .2126 * r + .7152 * g + .0722 * b; };
const contrast = (a: string, b: string) => { const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p); return (x + .05) / (y + .05); };

for (const room of ['learn', 'choose', 'sample']) {
  test(`SE-61: the ${room} room has a light token for every dark one`, () => {
    const dark = tokens(`:root[data-room='${room}']`), light = tokens(`:root[data-theme='light'][data-room='${room}']`);
    expect(dark.size).toBeGreaterThan(10);
    const missing = [...dark.keys()].filter(name => !light.has(name) && !['--error', '--error-ink'].includes(name));
    expect(missing).toEqual([]);
  });
  test(`SE-61: the ${room} room's light text passes WCAG AA`, () => {
    const t = tokens(`:root[data-theme='light'][data-room='${room}']`);
    for (const [ink, ground] of [['--ink', '--bg'], ['--ink', '--surface'], ['--ink', '--surface-2'], ['--ink-mute', '--bg'], ['--ink-mute', '--surface'],
      ['--ink-mute', '--surface-2'], ['--accent', '--bg'], ['--accent', '--surface'], ['--accent-ink', '--accent'], ['--ink', '--code']])
      expect(contrast(t.get(ink)!, t.get(ground)!), `${ink} on ${ground}`).toBeGreaterThanOrEqual(4.5);
    for (const [name, value] of t) if (name.startsWith('--code-')) expect(contrast(value, t.get('--code')!), name).toBeGreaterThanOrEqual(4.5);
  });
}
test('SE-61: the light error colours and code colours are readable', () => {
  const errors = tokens(`:root[data-theme='light'][data-room]`), learn = tokens(`:root[data-theme='light'][data-room='learn']`);
  expect(contrast(errors.get('--error-ink')!, learn.get('--bg')!)).toBeGreaterThanOrEqual(4.5);
  const code = new Map([...tokens(`:root[data-theme='light'][data-room='learn']`)].filter(([n]) => n.startsWith('--code-')));
  expect(code.size).toBe(7);
  for (const [name, value] of code) expect(contrast(value, learn.get('--code')!), name).toBeGreaterThanOrEqual(4.5);
});
test('SE-61: the dark theme keeps its tokens (unchanged values)', () => {
  const learn = tokens(`:root[data-room='learn']`);
  expect(learn.get('--bg')).toBe('#101827'); expect(learn.get('--accent')).toBe('#e8b66e'); expect(learn.get('--ink')).toBe('#f3e9dc');
});

// SE-60: every UI font size scales with the text size; the script that keeps it so is idempotent.
test('SE-60: every font size in the styles follows --text-scale or --reading-scale', () => {
  const fixed: string[] = [];
  const walk = (dir: string): void => { for (const name of readdirSync(dir)) { const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else if (/\.(svelte|css)$/.test(name) && !path.endsWith(join('graph', 'Graph.svelte'))) {
      const text = readFileSync(path, 'utf8'), styles = name.endsWith('.css') ? text : [...text.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n');
      if (scaleCss(styles) !== styles) fixed.push(path);
    } } };
  walk(src);
  expect(fixed).toEqual([]);
  expect(scaleCss('a{font-size:12px}')).toBe('a{font-size:calc(12px * var(--text-scale))}');
  expect(scaleCss(scaleCss('a{font:600 12px/1.4 x}'))).toBe('a{font:600 calc(12px * var(--text-scale))/1.4 x}');
});
