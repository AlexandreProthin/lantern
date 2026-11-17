import type { Page } from '@playwright/test';
import { addChooseChild, newChooseSubject, validateChoose } from '../src/rooms/choose/rules';
import type { Cell } from '../src/rooms/choose/rules';
import { newLearnSubject } from '../src/rooms/learn/rules';
import { addChild } from '../src/core/graph';
import type { Subject } from '../src/core/model';

/** The phone sizes the review measured (NW-40): an iPhone-like 390 × 844 and a small Android 360 × 740. */
export const PHONES = [{ width: 390, height: 844 }, { width: 360, height: 740 }] as const;

/** A Choose subject with three shortlisted products and four ranked criteria, cells of every status. */
export function chooseBoard(): Subject {
  const s = newChooseSubject('3D printer', { tone: 'curious', model: 'opus', effort: 'medium', locale: { country: 'FR', currency: 'EUR' } }, 'Alex'), v = s.rooms.choose;
  v.nodes[v.rootId].state = 'lit';
  const add = (kind: 'criterion' | 'product', title: string, state: string, hook = '') => { const n = addChooseChild(v, v.rootId, { title, kind, hook, createdBy: 'user' }); n.state = state; return n; };
  const [A, B, C] = ['Bambu Lab P1S Combo', 'Prusa Core One', 'Creality K1C'].map(t => add('product', t, 'shortlisted'));
  add('product', 'Elegoo Centauri', 'candidate');
  const price = add('criterion', 'Price', 'must', 'Fits your 500 € budget'), volume = add('criterion', 'Build volume', 'must', 'You want to print large cases'),
    noise = add('criterion', 'Noise', 'must', 'It runs in your flat'), enclosure = add('criterion', 'Enclosure', 'nice', 'Lets you print ABS');
  add('criterion', 'Warranty', 'irrelevant', 'Not a concern');
  price.data = { measure: 'price' };
  const cell = (c: Partial<Cell> & Pick<Cell, 'value' | 'sources'>): Cell => ({ generationId: 'g1', at: '2026-10-15T09:00:00.000Z', ...c });
  A.data = { cells: {
    [price.id]: cell({ value: '699 €', sources: [{ kind: 'shop', name: 'Maker shop', read: '2026-10-12' }] }),
    [volume.id]: cell({ value: '256 × 256 × 256 mm', sources: [{ kind: 'manufacturer', name: 'Maker specs', read: '2026-10-11' }] }),
    [noise.id]: cell({ value: '48 dB', sources: [{ kind: 'measured', name: 'Noise lab', read: '2026-10-08' }], user: { value: '45 dB', at: '2026-10-14T10:00:00.000Z', by: 'Alex' } }) } };
  B.data = { cells: {
    [price.id]: cell({ value: '1 149 €', sources: [{ kind: 'shop', name: 'Other shop', read: '2026-10-10' }] }),
    [volume.id]: cell({ value: '250 mm', disagree: true, note: 'The maker says 256 mm, the review measured 250 mm.', sources: [{ kind: 'manufacturer', name: 'Maker specs', read: '2026-10-11', value: '256 mm' }, { kind: 'measured', name: 'Lab review', read: '2026-10-09', value: '250 mm' }] }) } };
  C.data = { cells: {
    [volume.id]: cell({ value: null, sources: [] }),
    [enclosure.id]: cell({ value: 'Included', sources: [{ kind: 'model', name: 'Model knowledge', read: '2026-10' }] }) } };
  validateChoose(v);
  return s;
}

/** A Learn subject of `modules` modules of `leaves` nodes each: a big map whose nodes are small when fitted. */
export function bigMap(modules = 8, leaves = 14): Subject {
  const s = newLearnSubject('Big map'), v = s.rooms.learn;
  v.nodes[v.rootId].state = 'lit';
  for (let m = 1; m <= modules; m++) {
    const mod = addChild(v, v.rootId, { title: `Module ${m}`, kind: 'axis', state: 'lit', createdBy: 'model' });
    for (let i = 1; i <= leaves; i++) addChild(v, mod.id, { title: `Idea ${m}.${i} with a longer title`, kind: 'axis', state: 'open', createdBy: 'model' });
  }
  return s;
}

/** Puts a subject (and optional settings) in the browser's storage once, before the app reads it (the user's library stays untouched). */
export async function seed(page: Page, subject: Subject, settings: Record<string, unknown> = {}) {
  await page.addInitScript(({ id, subject, settings }) => {
    if (localStorage.getItem('lantern.phone.seeded')) return;
    localStorage.setItem('lantern.settings', JSON.stringify(settings));
    localStorage.setItem(`lantern.subject.${id}`, JSON.stringify(subject)); localStorage.setItem('lantern.recents', JSON.stringify([id]));
    localStorage.setItem('lantern.phone.seeded', '1');
  }, { id: subject.id, subject, settings });
}
