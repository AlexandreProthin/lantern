import { beforeEach, describe, expect, it, vi } from 'vitest';

const calls: { folder: string; name: string; text: string; append: boolean }[] = [];
let failAfter = Infinity;
vi.mock('../host', () => ({ native: true, remote: false, backend: true }));
vi.mock('../ipc', () => ({
  invoke: vi.fn(async (command: string, args: { folder: string; name: string; text: string; append: boolean }) => {
    if (command !== 'debug_log_write') throw new Error(command);
    if (calls.length >= failAfter) throw 'Disk full';
    calls.push(args); return `${args.folder}\\${args.name}`;
  }),
}));

const { recorder, saveLog } = await import('./recorder');
const { trace } = await import('./trace.svelte');

describe('debug recorder', () => {
  beforeEach(() => { calls.length = 0; failAfter = Infinity; recorder.stop(); trace.setEnabled(true); trace.clear(); });

  it('DC-42: header once, then each completed entry in order; a restart keeps the same file', async () => {
    recorder.start('C:\\logs');
    trace.action('learn', 'lit a node'); trace.event('frame·save', 'saved');
    await recorder.settled();
    expect(recorder.active).toBe(true);
    expect(calls.map(c => c.append)).toEqual([true, true, true]);
    expect(calls[0].text.startsWith('# Lantern debug log')).toBe(true);
    expect(calls[1].text).toContain('· action · learn · lit a node'); expect(calls[2].text).toContain('· event · frame·save · saved');
    expect(calls[0].name).toMatch(/^lantern-debug-\d{4}-\d{2}-\d{2}-\d{6}\.md$/);
    recorder.stop(); trace.action('learn', 'not recorded'); recorder.start('C:\\logs'); trace.action('learn', 'again');
    await recorder.settled();
    expect(calls).toHaveLength(4); expect(calls[3].text).toContain('again');
    expect(new Set(calls.map(c => c.name)).size).toBe(1);
    expect(recorder.file).toBe(`C:\\logs\\${calls[0].name}`);
  });

  it('DC-42: a failed write stops recording and shows one error line', async () => {
    recorder.start('C:\\other'); failAfter = calls.length + 1; // header ok, then the disk fills up
    trace.action('learn', 'one'); trace.action('learn', 'two');
    await recorder.settled();
    expect(recorder.active).toBe(false); expect(recorder.error).toBe('Disk full');
    const errors = trace.entries.filter(e => e.kind === 'error');
    expect(errors).toHaveLength(1); expect(errors[0]).toMatchObject({ origin: 'debug·record', summary: 'Recording stopped', detail: 'Disk full' });
  });

  it('DC-41: Save writes a new file with every entry', async () => {
    trace.action('learn', 'lit');
    const path = await saveLog('C:\\logs', trace.entries);
    expect(calls).toHaveLength(1); expect(calls[0].append).toBe(false);
    expect(calls[0].text).toContain('· action · learn · lit'); expect(path).toBe(`C:\\logs\\${calls[0].name}`);
  });
});
