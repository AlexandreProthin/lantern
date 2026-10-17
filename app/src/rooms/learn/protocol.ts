import type { RoomVisit } from '../../core/model';
import type { NodeKind } from './rules';
export type Task = 'intro' | 'light' | 'more' | 'reply' | 'check' | 'suggest';
export interface Option { title: string; hook: string; kind?: NodeKind }
export const clip = (text: string, max: number) => text.length > max ? text.slice(0, max) + '…' : text;
/** TP-32 is shared by streaming and final storage. No raw block can flash in the panel. */
export function visibleText(raw: string): string {
  let text = raw.split(/<options>|<branch>/, 1)[0].replace(/<understood\s*\/>/g, '');
  text = text.trimEnd();
  const fences = text.match(/^[ \t]*```[^\n]*$/gm) ?? [];
  if (fences.length % 2) text = text.replace(/(?:^|\n)[ \t]*```[^\n]*[ \t]*$/, '');
  const last = text.lastIndexOf('<'), tail = text.slice(last);
  if (last >= 0 && !tail.includes('>') && ['<options>', '<branch>', '<understood/>', '<understood />'].some(tag => tag.startsWith(tail))) text = text.slice(0, last);
  return text.trim();
}
function decode(raw: string): unknown {
  return JSON.parse(raw.split('\n').filter(line => !line.trimStart().startsWith('```')).join('\n'));
}
function option(value: unknown, fallback?: NodeKind): Option | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  if (typeof v.title !== 'string' || !v.title.trim()) return null;
  const kinds = ['axis', 'deeper', 'application', 'adjacent', 'exercise'];
  return { title: clip(v.title.trim(), 80), hook: typeof v.hook === 'string' ? clip(v.hook.trim().replace(/\s*\n\s*/g, ' '), 160) : '',
    ...(fallback ? { kind: kinds.includes(v.kind as string) ? v.kind as NodeKind : fallback } : {}) };
}
export function parseReply(raw: string, task: Task, pendingCheck = false) {
  const text = visibleText(raw), options: Option[] = [];
  let optionsValid = false, branch: Option | null = null;
  if (['intro', 'light', 'more', 'suggest'].includes(task)) {
    for (const match of raw.matchAll(/<options>([\s\S]*?)<\/options>/g)) {
      try {
        const values = decode(match[1]); if (!Array.isArray(values)) continue;
        optionsValid = true;
        options.push(...values.map(v => option(v, task === 'suggest' ? undefined : task === 'intro' ? 'axis' : 'deeper')).filter((v): v is Option => !!v)); break;
      } catch { /* First block that parses wins (TP-31). */ }
    }
    // TP-31 (amended 2026-10-17): a block never closed still counts when a complete array is the last thing in the reply.
    const open = raw.lastIndexOf('<options>');
    if (!optionsValid && open >= 0 && !raw.includes('</options>', open)) {
      try {
        const values = decode(raw.slice(open + '<options>'.length));
        if (Array.isArray(values)) { optionsValid = true; options.push(...values.map(v => option(v, task === 'suggest' ? undefined : task === 'intro' ? 'axis' : 'deeper')).filter((v): v is Option => !!v)); }
      } catch { /* Cut short: still invalid (TP-34). */ }
    }
  }
  if (task === 'reply') {
    const match = raw.match(/<branch>([\s\S]*?)<\/branch>/);
    if (match) try { branch = option(decode(match[1])); } catch { /* Usable prose survives malformed JSON. */ }
  }
  const understood = task === 'reply' && pendingCheck && /<understood\s*\/>/.test(raw);
  return { text: task === 'more' || task === 'suggest' ? '' : text, options, optionsValid, branch, understood,
    emptyError: ['intro', 'light', 'reply', 'check'].includes(task) && !text };
}
/** Parse links without changing stored text; the renderer resolves existence at render time. */
export function nodeLinks(text: string, visit: RoomVisit) {
  return [...text.matchAll(/\[([^\]]+)\]\(node:([^\s)]+)\)/g)].map(m => ({ label: m[1], id: m[2], exists: Object.hasOwn(visit.nodes, m[2]), index: m.index }));
}
