import { describe, expect, it } from 'vitest';
import { entryMarkdown, fence, logFileName, logMarkdown } from './markdown';
import type { CallEntry, NoteEntry } from './trace.svelte';
import { zeroUsage } from '../provider';

const at = new Date(2026, 9, 23, 14, 5, 2, 7).getTime();
const call = (over: Partial<CallEntry> = {}): CallEntry => ({
  id: 1, at, kind: 'call', origin: 'learn·light', requestId: 'r1', model: 'claude-opus', effort: 'low', web: true,
  system: 'SYS', prompt: 'SUBJECT: tides\n\nTASK: light', stream: [], status: 'ok', missingLayers: [], endedAt: at + 2400, ...over,
});

describe('debug log markdown', () => {
  it('DC-43: a fence is longer than any run of backticks inside', () => {
    expect(fence('plain')).toBe('```\nplain\n```');
    expect(fence('a ``` b\n')).toBe('````\na ``` b\n````');
    expect(fence('x `````` y', 'json')).toBe('```````json\nx `````` y\n```````');
    expect(fence('one ` two ``')).toBe('```\none ` two ``\n```');
  });

  it('DC-21, DC-43: a call with layers, stats, tools and a parse, sections in order', () => {
    const md = entryMarkdown(call({
      tag: { origin: 'learn·light', subjectId: 's1', nodeId: 'n2', promptVersion: 'light-3', layers: [{ name: 'SUBJECT', text: 'SUBJECT: tides' }, { name: 'GHOST', text: 'missing' }], stats: { map: 'reduced' } },
      missingLayers: ['GHOST'],
      stream: [{ kind: 'text', text: 'Searching' }, { kind: 'tool', name: 'WebSearch', detail: 'tides', at: at + 1200 }, { kind: 'text', text: 'Tides ```rise```.' }],
      parsed: { visible: 'Tides rise.' },
      completion: { text: 'Tides rise.', model: 'claude-opus', usage: { ...zeroUsage(), input: 1200, output: 340 }, durationMs: 2400, outcome: 'ok', costUsd: 0.0123, toolCalls: { WebSearch: 1 } },
    }));
    expect(md.split('\n')[0]).toBe('## 14:05:02.007 · call · learn·light · claude-opus/low · web · ok · 1200 → 340 tokens · 2.4 s');
    const order = ['### Origin', '### Request', '### System prompt', '### Context', '#### SUBJECT · 14 chars', '#### GHOST', '#### Stats', '### Prompt', '### Stream', '### Parsed', '### Result'].map(h => md.indexOf(h));
    expect(order.every(i => i > 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(md).toContain('> **Warning:** not found in the prompt: `GHOST`');
    expect(md).toContain('- Subject: `s1`'); expect(md).toContain('- Prompt version: `light-3`');
    expect(md.indexOf('Searching')).toBeLessThan(md.indexOf('- **WebSearch** tides (+1.2 s)'));
    expect(md.indexOf('- **WebSearch** tides')).toBeLessThan(md.indexOf('````\nTides ```rise```.\n````'));
    expect(md).toContain('- Cost: $0.0123'); expect(md).toContain('- Tools: WebSearch ×1');
    expect(md).toContain('"visible": "Tides rise."');
  });

  it('an error call shows the error kind and details, no context section', () => {
    const md = entryMarkdown(call({ status: 'error', web: false, error: { kind: 'usage-limit', details: 'limit hit\nretry later' } }));
    expect(md.split('\n')[0]).toBe('## 14:05:02.007 · call · learn·light · claude-opus/low · error · 2.4 s');
    expect(md).toContain('- Error: usage-limit'); expect(md).toContain('```\nlimit hit\nretry later\n```');
    expect(md).not.toContain('### Context'); expect(md).toContain('_(nothing streamed)_');
  });

  it('a note: one heading line and its detail as a fence', () => {
    const note: NoteEntry = { id: 2, at, kind: 'event', origin: 'frame·save', summary: 'Saved\nsubject', detail: { id: 's1', ms: 12 } };
    expect(entryMarkdown(note)).toBe('## 14:05:02.007 · event · frame·save · Saved subject\n\n```json\n{\n  "id": "s1",\n  "ms": 12\n}\n```\n');
    expect(entryMarkdown({ ...note, detail: undefined })).toBe('## 14:05:02.007 · event · frame·save · Saved subject\n');
    expect(entryMarkdown({ ...note, detail: 'text' })).toContain('```\ntext\n```');
  });

  it('DC-41: the header and the file name', () => {
    const start = new Date(2026, 9, 23, 9, 3, 4);
    const md = logMarkdown([call()], { version: '0.9.1', startedAt: start });
    expect(md.startsWith('# Lantern debug log\n\n- Version: 0.9.1\n- Date: 2026-10-23 09:03:04\n\n## 14:05:02.007 · call')).toBe(true);
    expect(logFileName(start)).toBe('lantern-debug-2026-10-23-090304.md');
  });
});
