// Builds the unsigned preview installer without touching a release installer of the same version.
// tauri build always writes bundle/nsis/Lantern_<version>_x64-setup.exe, the file a release build
// signs and the local update folder serves, so a release file there is set aside for the build,
// the preview is moved to bundle/preview/ under its own name, and the release file is put back.
// Usage: node scripts/installer-preview.mjs (npm run installer:preview)
import { existsSync, mkdirSync, readFileSync, renameSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const app = join(dirname(fileURLToPath(import.meta.url)), '..');
const { version } = JSON.parse(readFileSync(join(app, 'package.json'), 'utf8'));
const bundle = join(app, 'src-tauri/target/release/bundle');
const built = join(bundle, 'nsis', `Lantern_${version}_x64-setup.exe`);
const aside = `${built}.release`;
const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
const preview = join(bundle, 'preview', `Lantern_${version}-preview-${stamp}_x64-setup.exe`);

if (existsSync(aside)) throw new Error(`${aside} is left from an earlier run; put it back as ${built} first.`);
const hadRelease = existsSync(built);
if (hadRelease) renameSync(built, aside);
let status = 1;
try {
  status = spawnSync('npx', ['tauri', 'build', '--bundles', 'nsis', '--config', 'src-tauri/tauri.preview.conf.json'], { cwd: app, stdio: 'inherit', shell: true }).status ?? 1;
  if (status === 0) { mkdirSync(dirname(preview), { recursive: true }); renameSync(built, preview); console.log(`Preview installer: ${preview}`); }
} finally {
  if (hadRelease) renameSync(aside, built);
}
process.exit(status);
