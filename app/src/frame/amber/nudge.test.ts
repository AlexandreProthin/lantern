import { expect, test } from 'vitest';
import type { RoomVisit } from '../../core/model';
import { addChild } from '../../core/graph';
import { addChooseChild, answerNeed, newChooseSubject, setState } from '../../rooms/choose/rules';
import { chooseCompanion } from '../../rooms/choose/companion';
import { newLearnSubject } from '../../rooms/learn/rules';
import { learnCompanion } from '../../rooms/learn/companion';
import { NUDGE_GAP, NUDGE_QUIET, mayNudge, nudgeKey, pickNudge, stillHolds, typingNow } from './nudge';
import type { NudgeMoment, NudgeRule } from './nudge';
import { emptyAmberState, markNudgeSeen, parseAmberState } from './state';

const free: NudgeMoment = { on: true, generating: false, typing: false, busy: false, sessionNudged: false, sinceLast: Infinity };
const visit = () => newLearnSubject('Tides').rooms.learn;
const rules: NudgeRule[] = [
  { id: 'r.study', space: 'study', line: v => Object.keys(v.nodes).length ? 'Study line.' : null },
  { id: 'r.other', space: 'study', line: () => 'Other line.' },
  { id: 'r.survey', space: 'survey', line: () => 'Survey line.' },
];

test('CO-38: a nudge waits for a quiet moment: never while generating, typing, busy, twice in one opening or within the gap', () => {
  expect(mayNudge(free)).toBe(true);
  for (const blocked of [{ on: false }, { generating: true }, { typing: true }, { busy: true }, { sessionNudged: true }, { sinceLast: NUDGE_GAP - 1 }])
    expect(mayNudge({ ...free, ...blocked }), JSON.stringify(blocked)).toBe(false);
  expect(mayNudge({ ...free, sinceLast: NUDGE_GAP })).toBe(true);
  const v = visit();
  expect(pickNudge(rules, 'study', 'tides', v, emptyAmberState(), { ...free, generating: true })).toBeNull();
  expect(pickNudge(rules, 'study', 'tides', v, emptyAmberState(), { ...free, on: false })).toBeNull();
});
test('CO-37, CO-39: the first rule of the space that holds and was never said for this subject; seen ones are skipped', () => {
  const v = visit();
  expect(pickNudge(rules, 'study', 'tides', v, emptyAmberState(), free)).toEqual({ key: 'r.study/tides', text: 'Study line.' });
  expect(pickNudge(rules, 'survey', 'tides', v, emptyAmberState(), free)?.key).toBe('r.survey/tides');
  expect(pickNudge(rules, 'welcome', 'tides', v, emptyAmberState(), free)).toBeNull();
  const seen = markNudgeSeen(emptyAmberState(), 'r.study/tides');
  expect(pickNudge(rules, 'study', 'tides', v, seen, free)?.key).toBe('r.other/tides');
  // Seen for one subject only.
  expect(pickNudge(rules, 'study', 'ocean', v, seen, free)?.key).toBe('r.study/ocean');
  expect(pickNudge(undefined, 'study', 'tides', v, seen, free)).toBeNull();
});
test('CO-39: a seen nudge is kept in Amber\'s state, once, in the id alphabet; the oldest go past 200', () => {
  expect(nudgeKey('learn.untested', 'Les marées é')).toBe('learn.untested/Les-mar-es--');
  expect(nudgeKey('r', 'x'.repeat(200))).toHaveLength(80);
  const once = markNudgeSeen(markNudgeSeen(emptyAmberState(), 'a/b'), 'a/b');
  expect(once.seenNudges).toEqual(['a/b']);
  expect(parseAmberState(JSON.parse(JSON.stringify(once))).seenNudges).toEqual(['a/b']);
  expect(parseAmberState({ spots: {}, seenTips: [], seenNudges: ['ok/1', 'bad nudge!', 3, 'ok/1'] }).seenNudges).toEqual(['ok/1']);
  expect(parseAmberState({ spots: {}, seenTips: [], seenNudges: [] }).seenNudges).toBeUndefined();
  let many = emptyAmberState(); for (let i = 0; i < 205; i++) many = markNudgeSeen(many, `n/${i}`);
  expect(many.seenNudges).toHaveLength(200); expect(many.seenNudges?.[0]).toBe('n/5');
});
test('CO-38: typing is a key within the quiet time or a field with text in it', () => {
  expect(typingNow(1000, 1000 + NUDGE_QUIET - 1, null)).toBe(true);
  expect(typingNow(1000, 1000 + NUDGE_QUIET, null)).toBe(false);
  expect(typingNow(-Infinity, 5000, 'half a question')).toBe(true);
  expect(typingNow(-Infinity, 5000, '   ')).toBe(false);
  expect(typingNow(1000, 1400, null, 300)).toBe(false);
});

function learnWith(lit: number) {
  const v: RoomVisit = visit();
  for (let i = 0; i < 4; i++) addChild(v, v.rootId, { title: `N${i}`, kind: 'axis', state: i < lit ? 'lit' : 'open', createdBy: 'model' });
  return v;
}
const lineOf = (rules: readonly NudgeRule[] | undefined, id: string, v: RoomVisit) => rules!.find(r => r.id === id)!.line(v);
test('CO-37: Learn says three lit nodes, none tested, until one is tested', () => {
  expect(lineOf(learnCompanion.nudges, 'learn.untested', learnWith(2))).toBeNull();
  const v = learnWith(3);
  expect(lineOf(learnCompanion.nudges, 'learn.untested', v)).toBe('Three nodes lit, none tested yet. *Test me* asks you a question about the one you’re reading.');
  expect(lineOf(learnCompanion.nudges, 'learn.untested', learnWith(4))).toMatch(/^Four nodes lit/);
  // A test asked, or a node demonstrated, ends it (and `stillHolds` takes the nudge away).
  const key = nudgeKey('learn.untested', 'tides');
  expect(stillHolds(learnCompanion.nudges, key, 'tides', v)).toBe(true);
  v.log.push({ id: 'g', nodeId: v.rootId, task: 'check', model: 'opus', effort: 'medium', promptVersion: '1', startedAt: '', durationMs: 1, usage: { input: 0, output: 0, thinking: 0, cacheRead: 0, cacheWrite: 0 }, outcome: 'ok' });
  expect(stillHolds(learnCompanion.nudges, key, 'tides', v)).toBe(false);
  const w = learnWith(3), n = Object.values(w.nodes).find(x => x.state === 'lit')!; n.state = 'understood'; n.data = { understoodBy: 'demonstrated' };
  expect(lineOf(learnCompanion.nudges, 'learn.untested', w)).toBeNull();
});

function choose() {
  const s = newChooseSubject('Printer', { tone: 'engineer', model: 'opus', effort: 'medium', locale: { country: 'FR', currency: 'EUR' }, needsNote: '' }, 'A');
  const v = s.rooms.choose; setState(v, v.rootId, 'lit');
  const add = (kind: Parameters<typeof addChooseChild>[2]['kind'], title: string) => addChooseChild(v, v.rootId, { title, kind, createdBy: 'model' }).id;
  return { v, add };
}
test('CO-37: Choose says two needs unanswered once products are weighed, and empty Compare cells', () => {
  const { v, add } = choose();
  const n1 = add('need', 'Use'); add('need', 'Who'); add('need', 'Where');
  expect(lineOf(chooseCompanion.nudges, 'choose.needs', v)).toBeNull();   // nothing weighed yet
  const p1 = add('product', 'A'), p2 = add('product', 'B'); setState(v, p1, 'shortlisted'); setState(v, p2, 'shortlisted');
  expect(lineOf(chooseCompanion.nudges, 'choose.needs', v)).toBe('Three needs are still unanswered, so a recommendation would have to guess them. Answer them in the panel.');
  answerNeed(v, n1, 'figurines', 'A');
  expect(lineOf(chooseCompanion.nudges, 'choose.needs', v)).toMatch(/^Two needs/);
  expect(lineOf(chooseCompanion.nudges, 'choose.cells', v)).toBeNull();   // no must criterion: no cell to fill
  for (const t of ['Volume', 'Noise']) setState(v, add('criterion', t), 'must');
  expect(lineOf(chooseCompanion.nudges, 'choose.cells', v)).toBe('Four cells in Compare are still empty. *Fill Compare* looks them up.');
  expect(chooseCompanion.nudges!.map(r => r.space)).toEqual(['survey', 'compare']);
});
