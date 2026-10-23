// DC-43: the debug log as Markdown that reads like the console. Pure functions; Save, Record and Copy share them.
import type { CallEntry, NoteEntry, TraceEntry } from './trace.svelte';
import { estimateTokens } from '../context-fit';

const pad = (n: number, width = 2) => String(n).padStart(width, '0');
/** DC-10: `HH:MM:SS.mmm`, local time. */
export const clock = (at: number) => { const d = new Date(at); return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`; };
const day = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const oneLine = (text: string) => text.replace(/\s*[\r\n]+\s*/g, ' ').trim();

/** DC-43: a fenced block whose fence is longer than any run of backticks inside the text. */
export function fence(text: string, lang = ''): string {
  const longest = Math.max(0, ...(text.match(/`+/g) ?? []).map(run => run.length));
  const marks = '`'.repeat(Math.max(3, longest + 1));
  return `${marks}${lang}\n${text}${text.endsWith('\n') ? '' : '\n'}${marks}`;
}
const block = (text: string) => text ? fence(text) : '_(empty)_';
function json(value: unknown): string {
  if (typeof value === 'string') return fence(value);
  try { return fence(JSON.stringify(value, null, 2) ?? String(value), 'json'); } catch { return fence(String(value)); }
}
const seconds = (ms: number) => ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(1)} s`;
const duration = (e: CallEntry) => e.completion?.durationMs || (e.endedAt !== undefined ? e.endedAt - e.at : undefined);
const sizes = (text: string) => `${text.length} chars · ≈${estimateTokens(text)} tokens`;

/** DC-13: what a call's header line shows. */
function callSummary(e: CallEntry): string {
  const effort = e.completion?.resolvedEffort ?? e.effort;
  const parts = [`${e.model || 'default'}${effort ? `/${effort}` : ''}`];
  if (e.web) parts.push('web');
  parts.push(e.status);
  if (e.completion) parts.push(`${e.completion.usage.input} → ${e.completion.usage.output} tokens${e.completion.usageEstimated ? ' (estimated)' : ''}`);
  const ms = duration(e); if (ms !== undefined) parts.push(seconds(ms));
  return parts.join(' · ');
}

function callBody(e: CallEntry): string[] {
  const out: string[] = [];
  const tag = e.tag;
  // 1. Origin
  out.push('### Origin', '', `- Origin: \`${e.origin}\``);
  if (tag?.subjectId) out.push(`- Subject: \`${tag.subjectId}\``);
  if (tag?.nodeId) out.push(`- Node: \`${tag.nodeId}\``);
  // 2. Request
  out.push('', '### Request', '', `- Model: ${e.requestedModel || 'default'}`);
  if (e.model && e.model !== e.requestedModel) out.push(`- Resolved model: ${e.model}`);
  if (e.completion?.servedModel) out.push(`- Served model: ${e.completion.servedModel}`);
  out.push(`- Effort: ${e.effort ?? 'default'}${e.completion?.resolvedEffort && e.completion.resolvedEffort !== e.effort ? ` (resolved: ${e.completion.resolvedEffort})` : ''}`);
  out.push(`- Web: ${e.web ? 'yes' : 'no'}`, `- Request id: \`${e.requestId}\``);
  if (tag?.promptVersion) out.push(`- Prompt version: \`${tag.promptVersion}\``);
  // 3. System prompt
  out.push('', '### System prompt', '', block(e.system));
  // 4. Context
  const layers = tag?.layers ?? [];
  if (layers.length || tag?.stats || e.missingLayers.length) {
    out.push('', '### Context');
    if (e.missingLayers.length) out.push('', `> **Warning:** not found in the prompt: ${e.missingLayers.map(n => `\`${n}\``).join(', ')}. The context view differs from what was sent.`);
    for (const layer of layers) out.push('', `#### ${layer.name} · ${sizes(layer.text)}`, '', block(layer.text));
    if (tag?.stats) out.push('', '#### Stats', '', json(tag.stats));
  }
  // 5. Prompt
  out.push('', '### Prompt', '', `${sizes(e.prompt)}`, '', block(e.prompt));
  // 6. Stream
  out.push('', '### Stream', '');
  if (!e.stream.length) out.push('_(nothing streamed)_');
  for (const part of e.stream) {
    if (part.kind === 'text') out.push(fence(part.text), '');
    else out.push(`- **${part.name}** ${part.detail} (+${seconds(part.at - e.at)})`, '');
  }
  if (e.stream.length) out.pop();
  // 7. Parsed
  if (e.parsed) out.push('', '### Parsed', '', json(e.parsed));
  // 8. Result
  out.push('', '### Result', '', `- Outcome: ${e.status}`);
  if (e.error) {
    out.push(`- Error: ${e.error.kind}`);
    if (e.error.details) out.push('', block(e.error.details), '');
  }
  const c = e.completion;
  if (c) {
    const u = c.usage;
    out.push(`- Usage${c.usageEstimated ? ' (estimated)' : ''}: input ${u.input}, output ${u.output}, thinking ${u.thinking}, cache read ${u.cacheRead}, cache write ${u.cacheWrite}`);
    if (c.costUsd !== undefined) out.push(`- Cost: $${c.costUsd.toFixed(4)}`);
    if (c.toolCalls && Object.keys(c.toolCalls).length) out.push(`- Tools: ${Object.entries(c.toolCalls).map(([name, n]) => `${name} ×${n}`).join(', ')}`);
  }
  const ms = duration(e); if (ms !== undefined) out.push(`- Duration: ${seconds(ms)}`);
  if (out.at(-1) === '') out.pop();
  return out;
}

function noteBody(e: NoteEntry): string[] { return e.detail === undefined ? [] : [json(e.detail)]; }

/** DC-43: one entry: a `##` heading (time, kind, origin, summary), then the DC-21 sections for a call. */
export function entryMarkdown(entry: TraceEntry): string {
  const summary = entry.kind === 'call' ? callSummary(entry) : oneLine(entry.summary);
  const lines = [`## ${clock(entry.at)} · ${entry.kind} · ${entry.origin} · ${summary}`];
  const body = entry.kind === 'call' ? callBody(entry) : noteBody(entry);
  if (body.length) lines.push('', ...body);
  return lines.join('\n') + '\n';
}

/** DC-43: the header, written once at the top of a file. */
export function logHeader(meta: { version: string; startedAt: Date }): string {
  const d = meta.startedAt;
  return `# Lantern debug log\n\n- Version: ${meta.version}\n- Date: ${day(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}\n`;
}

/** DC-41: the header and every entry. */
export function logMarkdown(entries: TraceEntry[], meta: { version: string; startedAt: Date }): string {
  return [logHeader(meta), ...entries.map(entryMarkdown)].join('\n');
}

/** DC-41/DC-42: `lantern-debug-YYYY-MM-DD-HHMMSS.md`, local time (the shape Rust accepts, DC-44). */
export const logFileName = (d: Date) => `lantern-debug-${day(d)}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}.md`;
