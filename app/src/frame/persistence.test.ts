import { expect, test, vi } from 'vitest';
import { newLearnSubject } from '../rooms/learn/rules';
import { SubjectPersistence } from './persistence';
import type { Loaded, SaveResult, Storage } from './persistence';
const stamp = { size: 1, modifiedNs: '1', hash: 'one' };
test('ST-21: debounce coalesces edits; close flushes the newest snapshot', async () => {
  vi.useFakeTimers(); const save = vi.fn(async (): Promise<SaveResult> => ({ kind: 'saved', stamp }));
  const storage: Storage = { save, load: vi.fn() };
  const p = new SubjectPersistence(storage, 'library', null, vi.fn(), vi.fn());
  const s = newLearnSubject('First'); p.schedule(s); s.title = 'Second'; p.schedule(s);
  await vi.advanceTimersByTimeAsync(299); expect(save).not.toHaveBeenCalled();
  await p.close(); expect(save).toHaveBeenCalledTimes(1); expect(save.mock.calls[0]).toBeDefined();
  expect(p.hasUnsavedChanges).toBe(false); vi.useRealTimers();
});
test('ST-22: failed save retains data, reports error and allows explicit retry', async () => {
  vi.useFakeTimers(); let fail = true; const error = vi.fn();
  const save = vi.fn(async (): Promise<SaveResult> => { if (fail) throw new Error('Disk full'); return { kind: 'saved', stamp }; });
  const p = new SubjectPersistence({ save, load: vi.fn() }, 'library', null, vi.fn(), error);
  p.schedule(newLearnSubject('Tides')); await vi.advanceTimersByTimeAsync(300);
  expect(error).toHaveBeenCalledOnce(); expect(p.hasUnsavedChanges).toBe(true);
  fail = false; await p.flush(); expect(p.hasUnsavedChanges).toBe(false); vi.useRealTimers();
});
test('ST-24..26: conflict opens disk version; clean refresh emits reload', async () => {
  const s = newLearnSubject('Tides'); const loaded: Loaded = { subject: s, stamp, readOnly: false };
  const disk = { ...loaded, subject: { ...s, title: 'External' }, stamp: { ...stamp, hash: 'two' } };
  const result = vi.fn();
  const p = new SubjectPersistence({ load: async () => disk, save: async () => ({ kind: 'conflict', loaded: disk, conflictPath: 'copy.json' }) }, 'library', loaded, result, vi.fn());
  await p.refresh(); expect(result).toHaveBeenCalledWith({ kind: 'reloaded', loaded: disk });
  s.title = 'Local'; p.schedule(s); await p.close(); expect(result.mock.lastCall?.[0].kind).toBe('conflict');
});
test('ST-21: edits during an in-flight save are serialized behind its updated receipt', async () => {
  let finish!: (result: SaveResult) => void;
  const save = vi.fn<Storage['save']>().mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }))
    .mockResolvedValue({ kind: 'saved', stamp: { ...stamp, hash: 'two' } });
  const p = new SubjectPersistence({ save, load: vi.fn() }, 'library', null, vi.fn(), vi.fn());
  const s = newLearnSubject('Tides'); p.schedule(s); const flushing = p.flush();
  s.title = 'Updated'; p.schedule(s); finish({ kind: 'saved', stamp }); await flushing;
  expect(save).toHaveBeenCalledTimes(2); expect(save.mock.calls[1][2]).toEqual(stamp);
  expect(save.mock.calls[1][1].title).toBe('Updated'); await p.close();
});
test('ST-27: a focus-only change is not copied now, is coalesced, and is written on the last saved version', async () => {
  vi.useFakeTimers();
  const s = newLearnSubject('Tides'); const v = s.rooms.learn;
  v.nodes.child = { ...v.nodes[v.rootId], id: 'child', parents: [v.rootId], title: 'Child' };
  const save = vi.fn<Storage['save']>(async () => ({ kind: 'saved', stamp }));
  const changed = vi.fn(async () => false);
  const p = new SubjectPersistence({ save, load: vi.fn(), changed }, 'library', { subject: structuredClone(s), stamp, readOnly: false }, vi.fn(), vi.fn());
  v.focusId = 'child'; p.focus(s); v.focusId = v.rootId; p.focus(s); v.focusId = 'child'; p.focus(s);
  await vi.advanceTimersByTimeAsync(1999); expect(save).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(1); expect(save).toHaveBeenCalledOnce();
  expect(save.mock.calls[0][1].rooms.learn.focusId).toBe('child');
  // An unsaved, unchecked edit never rides on a focus-only write.
  v.nodes.child.title = 'Edited without a save'; v.focusId = v.rootId; p.focus(s); await p.flush();
  expect(save).toHaveBeenCalledTimes(2); expect(save.mock.calls[1][1].rooms.learn.nodes.child.title).toBe('Child');
  expect(save.mock.calls[1][1].rooms.learn.focusId).toBe(v.rootId);
  vi.useRealTimers();
});
test('ST-27: focus rides on a pending save; one write', async () => {
  vi.useFakeTimers();
  const s = newLearnSubject('Tides'); const v = s.rooms.learn; v.nodes.child = { ...v.nodes[v.rootId], id: 'child', parents: [v.rootId], title: 'Child' };
  const save = vi.fn<Storage['save']>(async () => ({ kind: 'saved', stamp }));
  const p = new SubjectPersistence({ save, load: vi.fn(), changed: async () => false }, 'library', { subject: structuredClone(s), stamp, readOnly: false }, vi.fn(), vi.fn());
  v.nodes.child.title = 'Renamed'; p.schedule(s); v.focusId = 'child'; p.focus(s);
  await vi.advanceTimersByTimeAsync(3000);
  expect(save).toHaveBeenCalledOnce();
  expect(save.mock.calls[0][1].rooms.learn.focusId).toBe('child'); expect(save.mock.calls[0][1].rooms.learn.nodes.child.title).toBe('Renamed');
  vi.useRealTimers();
});
test('ST-25, ST-27: the poll reads the file only when its stamp changed; a focus-only change gives way to an outside edit', async () => {
  const s = newLearnSubject('Tides'); s.rooms.learn.nodes.child = { ...s.rooms.learn.nodes[s.rooms.learn.rootId], id: 'child', parents: [s.rooms.learn.rootId], title: 'Child' };
  const loaded: Loaded = { subject: structuredClone(s), stamp, readOnly: false };
  const disk: Loaded = { subject: { ...structuredClone(s), title: 'External' }, stamp: { ...stamp, size: 2, hash: 'two' }, readOnly: false };
  let outside = false; const load = vi.fn(async () => outside ? disk : loaded); const save = vi.fn<Storage['save']>(); const result = vi.fn();
  const p = new SubjectPersistence({ load, save, changed: async () => outside }, 'library', loaded, result, vi.fn());
  await p.refresh(); await p.refresh(); expect(load).not.toHaveBeenCalled();
  s.rooms.learn.focusId = 'child'; p.focus(s); outside = true;
  await p.flush();
  expect(save).not.toHaveBeenCalled(); expect(load).toHaveBeenCalledOnce();
  expect(result).toHaveBeenCalledWith({ kind: 'reloaded', loaded: disk });
});
