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
