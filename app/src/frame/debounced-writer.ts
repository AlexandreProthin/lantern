import { cloneJson } from '../core/model';
/** Serialized app-side settings writes. A failed write stays pending for explicit retry. */
export class DebouncedWriter<T> {
  private pending: T | undefined;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private running: Promise<void> | undefined;
  constructor(private write: (value: T) => Promise<void>, private error: (error: unknown) => void, private delay = 300) {}
  schedule(value: T) {
    this.pending = cloneJson(value); clearTimeout(this.timer);
    this.timer = setTimeout(() => { this.flush().catch(this.error); }, this.delay);
  }
  async flush(): Promise<void> {
    clearTimeout(this.timer); if (this.running) { await this.running; if (this.pending !== undefined) return this.flush(); return; }
    if (this.pending === undefined) return;
    const value = this.pending; this.pending = undefined;
    this.running = this.write(value);
    try { await this.running; } catch (e) { if (this.pending === undefined) this.pending = value; throw e; }
    finally { this.running = undefined; }
    if (this.pending !== undefined) return this.flush();
  }
}
