import { describe, expect, it } from 'vitest';
import cases from './library-search.cases.json';
import { fold, groupHits, marks, searchLibrary, snippet, PER_SUBJECT, type SearchableSubject } from './library-search';

const subjects = cases.subjects as unknown as SearchableSubject[];
describe('library search (WG-80..86)', () => {
  for (const { query, hits } of cases.cases) it(`"${query}" finds ${hits.length} node(s), as the Rust search does`, () => {
    expect(searchLibrary(subjects, query).map(h => [h.subjectId, h.nodeId, h.field])).toEqual(hits);
  });

  it('gives a snippet around the words found, on one line', () => {
    const [hit] = searchLibrary(subjects, 'near side');
    expect(hit.nodeId).toBe('n1'); expect(hit.field).toBe('content');
    expect(hit.snippet).toContain('pulls the near side of the ocean. It also');
    expect(snippet('a '.repeat(80) + 'needle and more', 160, 6)).toMatch(/^….*needle and more$/);
    // A title hit shows the hook as its line.
    expect(searchLibrary(subjects, 'moon')[0].snippet).toBe('The pull that lifts the sea');
  });

  it('folds case and accents, keeping offsets', () => {
    expect(fold('Étude Des MARÉES')).toBe('etude des marees');
    expect(fold('a😀B')).toBe('a😀b');
  });

  it('caps the results, in total and per subject', () => {
    const big: SearchableSubject = { id: 'big', title: 'Big', rooms: { choose: { rootId: 'r', nodes: Object.fromEntries(
      Array.from({ length: 30 }, (_, i) => [`n${i}`, { title: `Topic ${i}`, state: 'lit', parents: i ? ['r'] : [] }]).concat([['r', { title: 'Topic root', state: 'lit', parents: [] }]])) } } };
    expect(searchLibrary([big], 'topic')).toHaveLength(PER_SUBJECT);
    expect(searchLibrary([big, { ...big, id: 'big2' }, { ...big, id: 'big3' }], 'topic', 12)).toHaveLength(12);
  });

  it('marks the words found in a line, accents folded', () => {
    expect(marks('Étude des marées', 'etude maree')).toEqual([{ text: 'Étude', hit: true }, { text: ' des ', hit: false }, { text: 'marée', hit: true }, { text: 's', hit: false }]);
    expect(marks('plain', 'x')).toEqual([{ text: 'plain', hit: false }]);
  });

  it('groups the results by subject and room', () => {
    const groups = groupHits(searchLibrary(subjects, 'gravity'));
    expect(groups.map(g => [g.subjectId, g.room, g.hits.length])).toEqual([['printer', 'choose', 1], ['ocean-tides', 'learn', 2]]);
  });
});
