// DC-40..DC-42, DC-44: picking the log folder, Save and Record. Rust writes the files (`debug_log_write`),
// which a remote device cannot call (not in the NW-20 allowlist); the browser build downloads Save instead.
import { invoke } from '../ipc';
import { native } from '../host';
import { trace, type TraceEntry } from './trace.svelte';
import { strings } from '../../ui/strings';
import { entryMarkdown, logFileName, logHeader, logMarkdown } from './markdown';

const ORIGIN = 'debug·record';
const message = (e: unknown) => e instanceof Error ? e.message : String(e);
const write = (folder: string, name: string, text: string, append: boolean) => invoke<string>('debug_log_write', { folder, name, text, append });

/** DC-40: the folder picker (the same one as the library's); null when cancelled or without a desktop. */
export async function pickLogFolder(start?: string): Promise<string | null> {
  if (!native) return null;
  return invoke<string | null>('pick_library', { title: strings.logFolder, start: start || null });
}

/** DC-41: writes every entry to a new file; resolves to its path (the browser build: downloads it, resolves to its name). */
export async function saveLog(folder: string, entries: TraceEntry[]): Promise<string> {
  const now = new Date(), name = logFileName(now);
  const text = logMarkdown(entries, { version: __APP_VERSION__, startedAt: now });
  // Two saves within one second would share a name: the next free second is taken (the file is never overwritten).
  if (native) for (let i = 0; ; i++) {
    try { return await write(folder, i ? logFileName(new Date(now.getTime() + i * 1000)) : name, text, false); }
    catch (e) { if (i >= 5 || !/file exists|already exists|os error (80|17)\b/i.test(message(e))) throw e; }
  }
  const url = URL.createObjectURL(new Blob([text], { type: 'text/markdown' }));
  const link = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return name;
}

/** DC-42: appends each completed entry to `lantern-debug-<session start>.md`, in order. */
export class Recorder {
  active = $state(false);
  /** The session file's path (kept after a stop, so it can still be shown). */
  file = $state('');
  error = $state('');
  /** First start in this launch: one file per launch. */
  private session: Date | null = null;
  /** Folders whose session file already holds the header. */
  private headed = new Set<string>();
  private unsubscribe: (() => void) | null = null;
  private chain: Promise<void> = Promise.resolve();
  /** Bumped by stop(), so appends queued by an earlier run are dropped. */
  private run = 0;

  start(folder: string): void {
    this.stop();
    this.error = '';
    if (!native) { this.error = 'Recording needs the desktop app: this build cannot write files.'; return; }
    if (!folder) { this.error = 'Pick a log folder first.'; return; }
    this.session ??= new Date();
    const name = logFileName(this.session), run = this.run;
    this.file = `${folder.replace(/[\\/]+$/, '')}${folder.includes('\\') ? '\\' : '/'}${name}`;
    this.active = true;
    if (!this.headed.has(folder)) {
      this.headed.add(folder);
      this.enqueue(run, folder, name, logHeader({ version: __APP_VERSION__, startedAt: this.session }));
    }
    this.unsubscribe = trace.onComplete(entry => {
      if (entry.kind === 'error' && entry.origin === ORIGIN) return; // never record our own failure line
      this.enqueue(run, folder, name, '\n' + entryMarkdown(entry));
    });
  }

  stop(): void {
    this.unsubscribe?.(); this.unsubscribe = null;
    this.active = false; this.run++;
  }

  private enqueue(run: number, folder: string, name: string, text: string) {
    this.chain = this.chain.then(async () => {
      if (run !== this.run) return;
      try { this.file = await write(folder, name, text, true); }
      catch (e) {
        if (run !== this.run) return;
        const why = message(e);
        if (text.startsWith('# ')) this.headed.delete(folder);
        this.stop(); this.error = why;
        trace.error(ORIGIN, 'Recording stopped', why);
      }
    });
  }

  /** Resolves once every queued append has been tried (tests). */
  settled(): Promise<void> { return this.chain; }
}

export const recorder = new Recorder();
