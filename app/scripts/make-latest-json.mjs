// UP-42: write latest.json for a signed build, to upload next to the installer on the GitHub release.
// Usage (after `tauri build --bundles nsis` with TAURI_SIGNING_PRIVATE_KEY set): node scripts/make-latest-json.mjs [notes]
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
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
const latest = { version, notes: process.argv[2] ?? `Lantern ${version}`, pub_date: new Date().toISOString(), platforms: { 'windows-x86_64': { signature, url } } };
writeFileSync(join(folder, 'latest.json'), JSON.stringify(latest, null, 2) + '\n');
console.log(`Wrote ${join(folder, 'latest.json')}\nUpload it and ${installer} to release v${version}.`);
