import type { AmberCategory } from './log';
const OPEN = '<category>', CLOSE = '</category>', CATEGORIES: readonly AmberCategory[] = ['app', 'subject', 'general'];
/** Longest a well-formed tag can be before we stop waiting for it. */
const LIMIT = OPEN.length + 'subject'.length + CLOSE.length + 8;

/**
 * CO-42: the reply starts with <category>app|subject|general</category>. Text is held until the tag closes
 * (the caller shows *thinking* meanwhile), then released. A missing or broken tag counts as `general`,
 * `tagOk` false, and the held text is released as the answer.
 */
export class CategoryGate {
  private held = '';
  category: AmberCategory | null = null;
  tagOk = false;
  get open(): boolean { return this.category !== null; }
  /** Returns the text to show now ('' while waiting). */
  push(chunk: string): string {
    if (this.open) return chunk;
    this.held += chunk;
    const text = this.held.trimStart();
    if (!text) return '';
    if (!(OPEN.startsWith(text) || text.startsWith(OPEN))) return this.broken(text);
    const end = text.indexOf(CLOSE);
    if (end < 0) return text.length > LIMIT ? this.broken(text) : '';
    const name = text.slice(OPEN.length, end).trim().toLowerCase() as AmberCategory;
    const rest = text.slice(end + CLOSE.length).replace(/^\s+/, '');
    this.held = '';
    if (CATEGORIES.includes(name)) { this.category = name; this.tagOk = true; } else { this.category = 'general'; this.tagOk = false; }
    return rest;
  }
  /** At the end of the stream: whatever is still held is the answer. */
  finish(): string { return this.open ? '' : this.broken(this.held.trimStart()); }
  private broken(text: string): string { this.held = ''; this.category = 'general'; this.tagOk = false; return text; }
}

/** The answer of a whole reply, for the evals and stored turns. */
export function splitReply(raw: string): { category: AmberCategory; tagOk: boolean; answer: string } {
  const gate = new CategoryGate(), answer = (gate.push(raw) + gate.finish()).trim();
  return { category: gate.category ?? 'general', tagOk: gate.tagOk, answer };
}
