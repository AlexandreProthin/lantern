// UP-42, UP-62: write latest.json for a signed build, to upload next to the installer on the GitHub release,
// and with --out copy both into a local update folder.
// Usage (after `tauri build --bundles nsis` with TAURI_SIGNING_PRIVATE_KEY set):
//   node scripts/make-latest-json.mjs ["notes"] [--out <folder>]
import { copyFileSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
const args = process.argv.slice(2);
const outAt = args.indexOf('--out');
const out = outAt >= 0 ? args[outAt + 1] : undefined;
if (outAt >= 0 && !out) { console.error('--out needs a folder'); process.exit(1); }
const notes = args.filter((_, i) => outAt < 0 || (i !== outAt && i !== outAt + 1))[0];
const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const folder = join(root, 'src-tauri', 'target', 'release', 'bundle', 'nsis');
const installer = `Lantern_${version}_x64-setup.exe`;
if (!readdirSync(folder).includes(`${installer}.sig`)) {
  console.error(`Missing ${installer}.sig in ${folder}. Build with TAURI_SIGNING_PRIVATE_KEY set (and the preview overlay NOT used).`);
  process.exit(1);
}
const signature = readFileSync(join(folder, `${installer}.sig`), 'utf8').trim();
const url = `https://github.com/AlexandreProthin/lantern/releases/download/v${version}/${installer}`;
const latest = { version, notes: notes ?? `Lantern ${version}`, pub_date: new Date().toISOString(), platforms: { 'windows-x86_64': { signature, url } } };
writeFileSync(join(folder, 'latest.json'), JSON.stringify(latest, null, 2) + '\n');
console.log(`Wrote ${join(folder, 'latest.json')}\nUpload it and ${installer} to release v${version}.`);
if (out) {
  const target = resolve(out);
  mkdirSync(target, { recursive: true });
  for (const file of [installer, 'latest.json']) copyFileSync(join(folder, file), join(target, file));
  console.log(`Copied ${installer} and latest.json to ${target} (local update folder, UP-62).`);
}
