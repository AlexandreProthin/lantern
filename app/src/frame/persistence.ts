import { invoke } from './ipc';
import { parseSubject, cloneJson } from '../core/model';
import type { Subject } from '../core/model';
import { trace } from './debug/trace.svelte';
export interface Stamp { size: number; modifiedNs: string; hash: string }
export interface Loaded { subject: Subject; stamp: Stamp; readOnly: boolean }
export type SaveResult = { kind: 'saved'; stamp: Stamp } | { kind: 'reloaded'; loaded: Loaded }
  | { kind: 'conflict'; loaded: Loaded; conflictPath: string };
export interface Storage {
  load(library: string, id: string): Promise<Loaded>;
  save(library: string, subject: Subject, expected: Stamp | null, dirty: boolean): Promise<SaveResult>;
  /** ST-27: whether the file differs from `stamp`, without reading it (desktop: size and modification time). Absent: load and compare. */
  changed?(library: string, id: string, stamp: Stamp): Promise<boolean>;
}
export const desktopStorage: Storage = {
  async load(library, id) {
    const loaded = await invoke<Loaded>('load_subject', { library, id });
    if (!loaded.readOnly) parseSubject(loaded.subject); return loaded;
  },
  save: (library, subject, expected, dirty) => invoke('save_subject', { library, subject, expected, dirty }),
  async changed(library, id, stamp) {
    const now = await invoke<{ size: number; modifiedNs: string }>('subject_stamp', { library, id });
    return now.size !== stamp.size || now.modifiedNs !== stamp.modifiedNs;
  }
};
/** ST-27: a focus-only change waits this long for more (or for a real change, which carries it). */
export const FOCUS_SAVE_MS = 2000;
/** `subject` with each visit's focus taken from `live`, where that node exists; the rest is shared, not copied. */
function withFocus(subject: Subject, live: Subject): Subject {
  let rooms: Subject['rooms'] | undefined;
  for (const [id, visit] of Object.entries(subject.rooms)) {
    const focusId = live.rooms[id]?.focusId;
    if (focusId && focusId !== visit.focusId && Object.hasOwn(visit.nodes, focusId)) (rooms ??= { ...subject.rooms })[id] = { ...visit, focusId };
  }
  return rooms ? { ...subject, rooms } : subject;
}
/** ST-21/22/24..26: serialized, debounced writes. Errors retain pending data for retry.
 * A controller owns one subject; switching subjects must await flush first.
 * Callbacks expose save errors, reload toast, and conflict banner to the frame.
 */
export class SubjectPersistence {
  private timer: ReturnType<typeof setTimeout> | undefined;
  private pending: Subject | undefined;
  /** ST-27: the session's subject after a focus-only change, not yet written. */
  private focused: Subject | undefined;
  private running: Promise<void> | undefined;
  private revision = 0;
  private closed = false;
  constructor(private storage: Storage, private library: string, private loaded: Loaded | null,
    private onResult: (result: SaveResult) => void, private onError: (error: unknown) => void, private delay = 300,
    private validate: (subject: Subject) => void = () => {}, private focusDelay = FOCUS_SAVE_MS) {}
  schedule(subject: Subject): void {
    if (this.closed || this.loaded?.readOnly) throw new Error('Subject is read-only');
    if (this.loaded && subject.id !== this.loaded.subject.id) throw new Error('Persistence controller belongs to another subject');
    const checked = parseSubject(subject); this.validate(checked);
    this.pending = cloneJson(checked); this.revision++; this.focused = undefined;
    this.later(this.delay);
  }
  /**
   * ST-27: only the focus moved. Nothing is parsed, validated or copied now; the focus rides on the next save, or is
   * written alone after `focusDelay` of quiet, on the last saved version (so it never carries unchecked changes).
   */
  focus(subject: Subject): void {
    if (this.closed || this.loaded?.readOnly) return;
    // A save in flight took its snapshot: a new revision makes the moved focus follow it.
    if (this.pending) { const next = withFocus(this.pending, subject); if (next !== this.pending) { this.pending = next; this.revision++; } return; }
    this.focused = subject;
    this.later(this.focusDelay);
  }
  private later(delay: number): void {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => { this.flush().catch(error => { trace.error('frame', 'Subject save failed', { subjectId: this.loaded?.subject.id, error: String(error) }); this.onError(error); }); }, delay);
  }
  async flush(): Promise<void> {
    clearTimeout(this.timer);
    if (this.running) { await this.running; if (this.pending || this.focused) return this.flush(); return; }
    if (!this.pending && this.focused) {
      this.running = this.focusOnly();
      try { await this.running; } finally { this.running = undefined; }
    }
    if (!this.pending) return;
    const snapshot = this.pending, revision = this.revision;
    this.running = (async () => {
      const result = await this.storage.save(this.library, snapshot, this.loaded?.stamp ?? null, true);
      if (result.kind === 'saved') {
        this.loaded = { subject: snapshot, stamp: result.stamp, readOnly: false };
        if (revision === this.revision) this.pending = undefined;
      } else {
        // Rust has preserved the submitted version; preserve any edits made while
        // the conflict save was in flight as another conflict copy before reloading.
        if (revision !== this.revision && this.pending) {
          await this.storage.save(this.library, this.pending, this.loaded?.stamp ?? null, true);
        }
        this.pending = undefined; this.loaded = result.loaded;
      }
      // DC-31: saves and conflicts; the conflict copy's path stays out of the trace.
      if (result.kind === 'saved') trace.event('frame', 'Subject saved', { subjectId: snapshot.id });
      else if (result.kind === 'conflict') trace.warn('frame', 'Subject save conflict: a copy was kept and the file reloaded', { subjectId: snapshot.id });
      else trace.event('frame', 'Subject reloaded from disk', { subjectId: snapshot.id });
      this.onResult(result);
    })();
    try { await this.running; } finally { this.running = undefined; }
    if (this.pending) return this.flush();
  }
  /** A focus-only write. If the file changed outside meanwhile, it reloads instead (ST-25): a focus is no reason for a conflict copy. */
  private async focusOnly(): Promise<void> {
    const live = this.focused!; this.focused = undefined;
    if (!this.loaded) return;
    if (await this.changedOnDisk()) { if (!this.pending) await this.reload(); return; }
    // A real change scheduled meanwhile carries the focus already.
    if (this.pending) return;
    const next = withFocus(this.loaded.subject, live);
    if (next !== this.loaded.subject) { this.pending = next; this.revision++; }
  }
  private async changedOnDisk(): Promise<boolean> {
    if (!this.loaded) return false;
    if (!this.storage.changed) return true;
    return this.storage.changed(this.library, this.loaded.subject.id, this.loaded.stamp);
  }
  private async reload(): Promise<void> {
    const next = await this.storage.load(this.library, this.loaded!.subject.id);
    if (next.stamp.hash !== this.loaded!.stamp.hash) {
      this.loaded = next; this.focused = undefined; trace.event('frame', 'Subject changed on disk, reloaded', { subjectId: next.subject.id }); this.onResult({ kind: 'reloaded', loaded: next });
    } else this.loaded = next;
  }
  /** ST-25, ST-27: about once a second; the file is read only when its stamp says it changed. */
  async refresh(): Promise<void> {
    if (this.pending) { await this.flush(); return; }
    if (!this.loaded || this.running) return;
    if (await this.changedOnDisk()) await this.reload();
  }
  async close(): Promise<void> { await this.flush(); this.closed = true; clearTimeout(this.timer); }
  get hasUnsavedChanges(): boolean { return !!this.pending; }
}
