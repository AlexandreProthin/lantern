import type { Storage, Stamp, Loaded } from './persistence';
import { parseSubject } from '../core/model';
import type { Subject } from '../core/model';
const key = (id: string) => `lantern.subject.${id}`;
const stamp = (text: string): Stamp => ({ size: text.length, modifiedNs: '0', hash: text });
/** Browser app-side surrogate for fake-provider tests; never used for desktop library I/O. */
export const browserStorage: Storage = {
  async load(_, id) {
    const raw = localStorage.getItem(key(id)); if (!raw) throw new Error('Subject not found');
    return { subject: parseSubject(JSON.parse(raw)), stamp: stamp(raw), readOnly: false };
  },
  async save(_, subject, expected, dirty) {
    const raw = localStorage.getItem(key(subject.id));
    if ((raw ? stamp(raw).hash : null) !== (expected?.hash ?? null)) {
      if (!raw) throw new Error('Subject removed externally');
      const loaded: Loaded = { subject: parseSubject(JSON.parse(raw)), stamp: stamp(raw), readOnly: false };
      if (!dirty) return { kind: 'reloaded', loaded };
      const conflictPath = key(subject.id) + `.conflict-${Date.now()}`; localStorage.setItem(conflictPath, JSON.stringify(subject));
      return { kind: 'conflict', loaded, conflictPath };
    }
    const text = JSON.stringify(subject); if (dirty) localStorage.setItem(key(subject.id), text);
    return { kind: 'saved', stamp: stamp(text) };
  }
};
export function browserSubjects(): Subject[] {
  const subjects: Subject[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)!;
    if (!k.startsWith('lantern.subject.') || k.includes('.conflict-')) continue;
    try { subjects.push(parseSubject(JSON.parse(localStorage.getItem(k)!))); } catch { /* unreadable entries stay on disk */ }
  }
  return subjects;
}
