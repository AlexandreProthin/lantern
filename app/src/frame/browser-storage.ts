import type { Storage, Stamp, Loaded } from './persistence';
import { convertV1, parseSubject, visitSummary } from '../core/model';
import type { Subject } from '../core/model';
import type { LibraryState, SubjectSummary } from './catalogue';
const key = (id: string) => `lantern.subject.${id}`;
const stamp = (text: string): Stamp => ({ size: text.length, modifiedNs: '0', hash: text });
/** Browser app-side surrogate for fake-provider tests; never used for desktop library I/O. */
export const browserStorage: Storage = {
  async load(_, id) {
    const raw = localStorage.getItem(key(id)); if (!raw) throw new Error('Subject not found');
    return { subject: parseSubject(convertV1(JSON.parse(raw))), stamp: stamp(raw), readOnly: false };
  },
  async save(_, subject, expected, dirty) {
    const raw = localStorage.getItem(key(subject.id));
    if ((raw ? stamp(raw).hash : null) !== (expected?.hash ?? null)) {
      if (!raw) throw new Error('Subject removed externally');
      const loaded: Loaded = { subject: parseSubject(convertV1(JSON.parse(raw))), stamp: stamp(raw), readOnly: false };
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
    try { subjects.push(parseSubject(convertV1(JSON.parse(localStorage.getItem(k)!)))); } catch { /* unreadable entries stay on disk */ }
  }
  return subjects;
}
export function browserSummaries(): SubjectSummary[] {
  return browserSubjects().map(subject => {
    const raw = localStorage.getItem(key(subject.id))!;
    return { id: subject.id, title: subject.title, path: key(subject.id), createdAt: subject.createdAt,
      rooms: Object.fromEntries(Object.entries(subject.rooms).map(([room, visit]) => [room, visitSummary(visit)])),
      modifiedNs: raw, size: raw.length };
  });
}
export function browserLibraryState(): LibraryState {
  try { return { recents: JSON.parse(localStorage.getItem('lantern.recents') ?? '[]'),
    lastOpenedAt: JSON.parse(localStorage.getItem('lantern.lastOpenedAt') ?? '{}') }; }
  catch { return { recents: [], lastOpenedAt: {} }; }
}
export function browserRecordOpen(id: string, at: string): LibraryState {
  const state = browserLibraryState(); state.recents = [id, ...state.recents.filter(s => s !== id)]; state.lastOpenedAt[id] = at;
  localStorage.setItem('lantern.recents', JSON.stringify(state.recents));
  localStorage.setItem('lantern.lastOpenedAt', JSON.stringify(state.lastOpenedAt)); return state;
}
export function browserDelete(id: string): void {
  const raw = localStorage.getItem(key(id)); if (raw) localStorage.setItem(`lantern.recycled.${id}.${Date.now()}`, raw);
  localStorage.removeItem(key(id)); const state = browserLibraryState();
  state.recents = state.recents.filter(s => s !== id); delete state.lastOpenedAt[id];
  localStorage.setItem('lantern.recents', JSON.stringify(state.recents));
  localStorage.setItem('lantern.lastOpenedAt', JSON.stringify(state.lastOpenedAt));
}
