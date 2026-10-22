import { invoke } from './ipc';
import { parseSubject, cloneJson } from '../core/model';
import type { Subject } from '../core/model';
export interface Stamp { size: number; modifiedNs: string; hash: string }
export interface Loaded { subject: Subject; stamp: Stamp; readOnly: boolean }
export type SaveResult = { kind: 'saved'; stamp: Stamp } | { kind: 'reloaded'; loaded: Loaded }
  | { kind: 'conflict'; loaded: Loaded; conflictPath: string };
export interface Storage {
  load(library: string, id: string): Promise<Loaded>;
  save(library: string, subject: Subject, expected: Stamp | null, dirty: boolean): Promise<SaveResult>;
}
export const desktopStorage: Storage = {
  async load(library, id) {
    const loaded = await invoke<Loaded>('load_subject', { library, id });
    if (!loaded.readOnly) parseSubject(loaded.subject); return loaded;
  },
  save: (library, subject, expected, dirty) => invoke('save_subject', { library, subject, expected, dirty })
};
/** ST-21/22/24..26: serialized, debounced writes. Errors retain pending data for retry.
 * A controller owns one subject; switching subjects must await flush first.
 * Callbacks expose save errors, reload toast, and conflict banner to the frame.
 */
export class SubjectPersistence {
  private timer: ReturnType<typeof setTimeout> | undefined;
  private pending: Subject | undefined;
  private running: Promise<void> | undefined;
  private revision = 0;
  private closed = false;
  constructor(private storage: Storage, private library: string, private loaded: Loaded | null,
    private onResult: (result: SaveResult) => void, private onError: (error: unknown) => void, private delay = 300,
    private validate: (subject: Subject) => void = () => {}) {}
  schedule(subject: Subject): void {
    if (this.closed || this.loaded?.readOnly) throw new Error('Subject is read-only');
    if (this.loaded && subject.id !== this.loaded.subject.id) throw new Error('Persistence controller belongs to another subject');
    const checked = parseSubject(subject); this.validate(checked);
    this.pending = cloneJson(checked); this.revision++;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => { this.flush().catch(this.onError); }, this.delay);
  }
  async flush(): Promise<void> {
    clearTimeout(this.timer);
    if (this.running) { await this.running; if (this.pending) return this.flush(); return; }
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
      this.onResult(result);
    })();
    try { await this.running; } finally { this.running = undefined; }
    if (this.pending) return this.flush();
  }
  async refresh(): Promise<void> {
    if (this.pending) { await this.flush(); return; }
    if (!this.loaded) return;
    const next = await this.storage.load(this.library, this.loaded.subject.id);
    if (next.stamp.hash !== this.loaded.stamp.hash) {
      this.loaded = next; this.onResult({ kind: 'reloaded', loaded: next });
    } else this.loaded = next;
  }
  async close(): Promise<void> { await this.flush(); this.closed = true; clearTimeout(this.timer); }
  get hasUnsavedChanges(): boolean { return !!this.pending; }
}
