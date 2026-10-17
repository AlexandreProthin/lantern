import { describe, expect, it } from 'vitest';
import { barFit, cubicBezier, filterRows } from './topbar';
import type { PaletteRow } from './topbar';

// A Choose-sized capsule: 480 px with its words, 300 px folded to glyphs; stats 220 px; window controls on the right.
const measures = (width: number, stats = 220) => ({ width, capLeft: 56, capWords: 480, capGlyphs: 300, stats, statsRight: width - 138 - 14 });

describe('top bar collapse (RS-18)', () => {
  it('keeps everything at full width', () => {
    expect(barFit(measures(1920))).toEqual({ tokenHover: true, stats: true, words: true, fieldPct: 34 });
  });
  it('drops the stats, then the words, then narrows the field as the window narrows', () => {
    const levels = [1920, 1700, 1500, 1300, 1100].map(w => barFit(measures(w)));
    const rank = (f: ReturnType<typeof barFit>) => Number(!f.stats) + Number(!f.words) + Number(f.fieldPct === 28);
    expect(levels.map(rank)).toEqual([...levels.map(rank)].sort());
    for (const f of levels) {
      if (!f.words) expect(f.stats).toBe(false);
      if (f.fieldPct === 28) expect(f.words).toBe(false);
      if (!f.stats) expect(f.tokenHover).toBe(false);
    }
  });
  it('is fully collapsed at the window minimum, 1024 px', () => {
    expect(barFit(measures(1024))).toEqual({ tokenHover: false, stats: false, words: false, fieldPct: 28 });
  });
  it('keeps the words when only the stats were in the way, and ignores stats that are not there', () => {
    expect(barFit({ ...measures(1150), capWords: 300 })).toMatchObject({ stats: false, words: true, fieldPct: 34 });
    expect(barFit({ ...measures(1150, 0), capWords: 300 })).toMatchObject({ words: true, fieldPct: 34 });
  });
});

describe('panel easing', () => {
  it('solves cubic-bezier at the ends and is monotonic', () => {
    const ease = cubicBezier(.2, .8, .2, 1);
    expect(ease(0)).toBe(0); expect(ease(1)).toBe(1);
    const samples = Array.from({ length: 11 }, (_, i) => ease(i / 10));
    expect(samples).toEqual([...samples].sort((a, b) => a - b));
    expect(ease(.5)).toBeGreaterThan(.8);
  });
});

describe('palette filter (RS-15)', () => {
  const rows: PaletteRow[] = [{ key: 'subject:a', group: 'subjects', label: 'Plate tectonics' }, { key: 'room:choose', group: 'rooms', label: 'Choose' },
    { key: 'settings', group: 'settings', label: 'Settings' }];
  it('keeps every row with no text, and matches labels case-insensitively', () => {
    expect(filterRows(rows, '  ')).toHaveLength(3);
    expect(filterRows(rows, 'TECT').map(r => r.key)).toEqual(['subject:a']);
    expect(filterRows(rows, 'o').map(r => r.key)).toEqual(['subject:a', 'room:choose']);
  });
});
