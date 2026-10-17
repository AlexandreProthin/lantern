// Writes the demo subjects to demo/subjects/*.json after checking them with the app's own validation.
// Run from app/: npx tsx demo/build.ts
import { mkdirSync, writeFileSync } from 'node:fs';
import { parseSubject } from '../src/core/model';
import type { Subject } from '../src/core/model';
import { validateLearn } from '../src/rooms/learn/rules';
import { validateChoose } from '../src/rooms/choose/rules';
import { tcpSubject } from './learn-tcp';
import { buildKeyboardSubject } from './choose-keyboard';

const out = new URL('./subjects/', import.meta.url);
mkdirSync(out, { recursive: true });
function write(subject: Subject) {
  const checked = parseSubject(JSON.parse(JSON.stringify(subject)));
  if (checked.rooms.learn) validateLearn(checked.rooms.learn);
  if (checked.rooms.choose) validateChoose(checked.rooms.choose);
  writeFileSync(new URL(`${subject.id}.json`, out), JSON.stringify(subject, null, 2) + '\n');
  console.log(`wrote demo/subjects/${subject.id}.json`);
}
write(tcpSubject);
write(buildKeyboardSubject());
