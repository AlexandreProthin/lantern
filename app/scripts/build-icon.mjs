// Builds src-tauri/icons/icon.ico from the accepted identity release (rooms-spaces RS-53).
// Each size is the release's own PNG export, stored as a PNG entry; nothing is resampled here.
// Usage: node scripts/build-icon.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const app = join(dirname(fileURLToPath(import.meta.url)), '..');
const release = join(app, '..', 'agent_identity/projects/lantern/final/lantern-identity-v0.2/exports');
const sources = [
  [16, 'favicon/ember-on-dark-16-16.png'],
  [24, 'favicon/ember-on-dark-24-24.png'],
  [32, 'favicon/ember-on-dark-32-32.png'],
  [48, 'favicon/ember-on-dark-48-48.png'],
  [64, 'mark/mark-on-dark-64.png'],
  [256, 'mark/mark-on-dark-256.png'],
];

const images = sources.map(([size, file]) => {
  const png = readFileSync(join(release, file));
  const width = png.readUInt32BE(16), height = png.readUInt32BE(20);
  if (png.readUInt32BE(0) !== 0x89504e47 || width !== size || height !== size) throw new Error(`${file}: expected a ${size}px PNG`);
  return { size, png };
});

// ICONDIR (6 bytes) + one ICONDIRENTRY (16 bytes) per image, then the PNG payloads.
const header = Buffer.alloc(6 + 16 * images.length);
header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(images.length, 4);
let offset = header.length;
images.forEach(({ size, png }, i) => {
  const e = 6 + 16 * i;
  header.writeUInt8(size === 256 ? 0 : size, e); header.writeUInt8(size === 256 ? 0 : size, e + 1);
  header.writeUInt8(0, e + 2); header.writeUInt8(0, e + 3);
  header.writeUInt16LE(1, e + 4); header.writeUInt16LE(32, e + 6);
  header.writeUInt32LE(png.length, e + 8); header.writeUInt32LE(offset, e + 12);
  offset += png.length;
});
const out = join(app, 'src-tauri/icons/icon.ico');
writeFileSync(out, Buffer.concat([header, ...images.map(i => i.png)]));
console.log(`icon.ico: ${images.map(i => i.size).join(', ')} px, ${offset} bytes`);
