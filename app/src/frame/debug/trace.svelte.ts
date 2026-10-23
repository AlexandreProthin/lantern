// DC-1..DC-32: the debug trace. One store for the whole app; every hook returns at once while debug mode is off (DC-4).
import type { Completion, InferenceProvider, Request, ToolUse } from '../provider';
import { ProviderError } from '../provider';

export type TraceKind = 'call' | 'action' | 'event' | 'warn' | 'error';
/** DC-21.4: one context block as the caller assembled it. */
export interface TraceLayer { name: string; text: string }
/** DC-21: what a caller attaches to its request so the console can say who asked and how the prompt was built. */
export interface TraceTag {
  /** `area·task`, for example `learn·light`, `amber·ask`, `frame·health`. */
  origin: string;
  subjectId?: string; nodeId?: string; promptVersion?: string;
  layers?: TraceLayer[];
  /** Caller's context statistics (map form, omitted turns…). */
  stats?: Record<string, unknown>;
}
/** DC-21.6: the stream in arrival order; a tool use sits where it happened. */
export type StreamPart = { kind: 'text'; text: string } | { kind: 'tool'; name: string; detail: string; at: number };
export type CallStatus = 'running' | 'ok' | 'cancelled' | 'error';
interface Base { id: number; at: number; origin: string }
export interface CallEntry extends Base {
  kind: 'call'; requestId: string; model?: string; effort?: string; web: boolean;
  system: string; prompt: string; tag?: TraceTag;
  stream: StreamPart[]; status: CallStatus;
  completion?: Completion; error?: { kind: string; details: string };
  /** DC-21.7: set by the caller once it has read the reply. */
  parsed?: Record<string, unknown>;
  /** DC-22: names of layers whose text is not found in the prompt. */
  missingLayers: string[];
  endedAt?: number;
}
export interface NoteEntry extends Base { kind: Exclude<TraceKind, 'call'>; summary: string; detail?: unknown }
export type TraceEntry = CallEntry | NoteEntry;

export const MAX_ENTRIES = 2000;

export class TraceStore {
  enabled = $state(false);
  entries = $state<TraceEntry[]>([]);
  /** DC-16: how many entries were dropped from the front since the last clear. */
  dropped = $state(0);
  /** Bumped on every change, so views can react to in-place stream growth cheaply. */
  revision = $state(0);
  private next = 1;
  private listeners = new Set<(entry: TraceEntry) => void>();
  private pending = new Map<CallEntry, string>();
  private scheduled = false;

  setEnabled(on: boolean) { if (this.enabled === on) return; this.enabled = on; if (!on) this.clear(); }
  clear() { this.entries = []; this.dropped = 0; this.revision++; }
  /** DC-42: called once per entry when it is complete (a call when it ends, a note straight away). */
  onComplete(listener: (entry: TraceEntry) => void): () => void { this.listeners.add(listener); return () => this.listeners.delete(listener); }

  note(kind: NoteEntry['kind'], origin: string, summary: string, detail?: unknown): void {
    if (!this.enabled) return;
    const entry: NoteEntry = { id: this.next++, at: Date.now(), kind, origin, summary, ...(detail === undefined ? {} : { detail }) };
    this.push(entry); this.complete(entry);
  }
  action(origin: string, summary: string, detail?: unknown) { this.note('action', origin, summary, detail); }
  event(origin: string, summary: string, detail?: unknown) { this.note('event', origin, summary, detail); }
  warn(origin: string, summary: string, detail?: unknown) { this.note('warn', origin, summary, detail); }
  error(origin: string, summary: string, detail?: unknown) { this.note('error', origin, summary, detail); }

  /** DC-21.7: a caller reports what it kept from a reply, by request id. */
  parsed(requestId: string, parsed: Record<string, unknown>) {
    if (!this.enabled) return;
    const entry = this.entries.findLast(e => e.kind === 'call' && e.requestId === requestId) as CallEntry | undefined;
    if (entry) { entry.parsed = parsed; this.revision++; }
  }

  /** DC-20: opens a call entry; the provider wrapper feeds it. Returns null while off. */
  begin(request: Request): CallHandle | null {
    if (!this.enabled) return null;
    const tag = request.trace;
    const missing = (tag?.layers ?? []).filter(l => l.text && !request.prompt.includes(l.text) && !request.system.includes(l.text)).map(l => l.name);
    const entry: CallEntry = { id: this.next++, at: Date.now(), kind: 'call', origin: tag?.origin ?? 'unknown', requestId: request.requestId,
      model: request.model, effort: request.effort, web: !!request.web, system: request.system, prompt: request.prompt,
      ...(tag ? { tag: { ...tag, layers: tag.layers?.map(l => ({ ...l })) } } : {}), stream: [], status: 'running', missingLayers: missing };
    this.push(entry);
    const live = this.entries.at(-1) as CallEntry; // the reactive proxy
    return {
      text: chunk => { this.pending.set(live, (this.pending.get(live) ?? '') + chunk); this.schedule(); },
      tool: tool => { this.flush(live); live.stream.push({ kind: 'tool', name: tool.name, detail: tool.detail, at: Date.now() }); this.revision++; },
      done: completion => { this.flush(live); live.completion = completion; live.model = completion.model || live.model; live.status = completion.outcome; live.endedAt = Date.now(); this.revision++; this.complete(live); },
      fail: error => {
        this.flush(live);
        if (error instanceof ProviderError) { live.status = error.kind === 'cancelled' ? 'cancelled' : 'error'; live.error = { kind: error.kind, details: error.details }; live.model = error.model || live.model; }
        else { live.status = 'error'; live.error = { kind: 'exception', details: String(error) }; }
        live.endedAt = Date.now(); this.revision++; this.complete(live);
      },
    };
  }

  private push(entry: TraceEntry) {
    this.entries.push(entry);
    const over = this.entries.length - MAX_ENTRIES;
    if (over > 0) { this.entries.splice(0, over); this.dropped += over; }
    this.revision++;
  }
  private complete(entry: TraceEntry) { const snapshot = $state.snapshot(entry) as TraceEntry; for (const l of this.listeners) { try { l(snapshot); } catch { /* a listener never breaks tracing */ } } }
  private flush(entry: CallEntry) {
    const text = this.pending.get(entry); if (!text) return;
    this.pending.delete(entry);
    const last = entry.stream.at(-1);
    if (last?.kind === 'text') last.text += text; else entry.stream.push({ kind: 'text', text });
  }
  /** DC-16: streamed text applied at most once per frame. */
  private schedule() {
    if (this.scheduled) return; this.scheduled = true;
    const run = () => { this.scheduled = false; for (const e of [...this.pending.keys()]) this.flush(e); this.revision++; };
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(run); else setTimeout(run, 16);
  }
}
export interface CallHandle { text(chunk: string): void; tool(tool: ToolUse): void; done(c: Completion): void; fail(e: unknown): void }

export const trace = new TraceStore();

/** DC-20: the outermost provider wrapper; every call passes here. */
export class TracedProvider implements InferenceProvider {
  constructor(private inner: InferenceProvider, private store: TraceStore = trace) {}
  async stream(request: Request, onText: (chunk: string) => void, onTool?: (tool: ToolUse) => void): Promise<Completion> {
    const handle = this.store.begin(request);
    if (!handle) return this.inner.stream(request, onText, onTool);
    try {
      const result = await this.inner.stream(request, chunk => { handle.text(chunk); onText(chunk); }, tool => { handle.tool(tool); onTool?.(tool); });
      handle.done(result); return result;
    } catch (error) { handle.fail(error); throw error; }
  }
}
