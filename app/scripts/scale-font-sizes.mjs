// SE-60 (text size): every UI font size in the app's styles follows `--text-scale` (set per text size in
// app.css). Rewrites `font-size: 13px` as `font-size: calc(13px * var(--text-scale))`, and the size in a `font:`
// shorthand the same way, in `.css` files and in the `<style>` blocks of `.svelte` files under src/.
// Idempotent: a size already in calc() is left alone. Files and rules that keep fixed sizes (the graph's
// geometry, the reading text, which follows `--reading-scale`) are listed below and edited by hand.
// Usage: node scripts/scale-font-sizes.mjs [--check]
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const root = join(import.meta.dirname, '..', 'src');
/** Kept by hand: the shared graph scales its tools and legend but not its nodes (graph geometry). */
const skip = new Set(['ui/graph/Graph.svelte']);
const scaled = n => `calc(${n}px * var(--text-scale))`;

export function scaleCss(css) {
  return css
    .replace(/(font-size\s*:\s*)([0-9]*\.?[0-9]+)px/g, (_, lead, n) => lead + scaled(n))
    .replace(/(font\s*:\s*(?:(?:normal|italic|oblique|bold|[1-9]00|[1-9][0-9]0)\s+)*)([0-9]*\.?[0-9]+)px/g, (_, lead, n) => lead + scaled(n));
}
export function scaleSvelte(source) {
  return source.replace(/(<style[^>]*>)([\s\S]*?)(<\/style>)/g, (_, open, css, close) => open + scaleCss(css) + close);
}

function* files(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* files(path);
    else if (/\.(svelte|css)$/.test(name)) yield path;
  }
}

if (process.argv[1] && import.meta.filename === process.argv[1]) {
  const check = process.argv.includes('--check'), changed = [];
  for (const path of files(root)) {
    const rel = relative(root, path).split(sep).join('/');
    if (skip.has(rel)) continue;
    const before = readFileSync(path, 'utf8'), after = path.endsWith('.css') ? scaleCss(before) : scaleSvelte(before);
    if (after === before) continue;
    changed.push(rel);
    if (!check) writeFileSync(path, after);
  }
  if (check && changed.length) { console.error(`Fixed font sizes left in:\n${changed.join('\n')}`); process.exit(1); }
  console.log(check ? 'Every font size follows --text-scale.' : `Scaled ${changed.length} files.`);
}
