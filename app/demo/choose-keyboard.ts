// Demo subject for the Choose room: "A quiet mechanical keyboard for an open office".
// Products and sources are generic archetypes on purpose: no real brand, shop or reviewer appears.
import { cloneJson } from '../src/core/model';
import type { Author, Generation, Subject } from '../src/core/model';
import { addChooseChild, answerNeed, newChooseSubject, rejectProduct, setPriceCriterion, setState, validateChoose } from '../src/rooms/choose/rules';
import type { Cell, Source } from '../src/rooms/choose/rules';

const MODEL = 'claude-opus-5-5';

/** Builds with a fixed clock and fixed ids, so rebuilding gives the same file. */
export function buildKeyboardSubject(): Subject {
  const realNow = Date.now, realUuid = crypto.randomUUID.bind(crypto);
  let clock = Date.parse('2026-10-14T08:30:00.000Z'), seq = 0;
  Date.now = () => (clock += 45_000);
  crypto.randomUUID = () => `${(++seq).toString(16).padStart(8, '0')}-0000-4000-8000-000000000000` as `${string}-${string}-${string}-${string}-${string}`;
  try { return build(); } finally { Date.now = realNow; crypto.randomUUID = realUuid; }
}

function build(): Subject {
  const s = newChooseSubject('A quiet mechanical keyboard for an open office', { tone: 'curious', model: 'opus', effort: 'medium', locale: { country: 'FR', currency: 'EUR' } }, 'Alex');
  s.id = 'quiet-mechanical-keyboard-demo';
  const v = s.rooms.choose, root = v.nodes[v.rootId];
  const generation = (nodeId: string, task: string, output: number, web = false): Author => {
    const id = `g${String(v.log.length + 1).padStart(2, '0')}`, startedAt = new Date(Date.now()).toISOString();
    v.log.push({ id, nodeId, task, model: MODEL, effort: 'medium', promptVersion: 'choose-1', startedAt, durationMs: web ? 38_000 : 6000,
      usage: { input: 3100, output, thinking: 0, cacheRead: 2200, cacheWrite: 0 }, outcome: 'ok', data: { tone: 'curious', web } } as Generation);
    return { kind: 'model', model: MODEL, effort: 'medium', generationId: id };
  };

  root.state = 'lit';
  root.content = 'A mechanical keyboard can be quiet enough for an open office, but the switch matters far more than the brand. **Silent switches** dampen the bottom-out and the return, **foam** inside the case removes the hollow ring, and a **low-profile** design shortens the travel altogether. Let us pin down what you need first, then compare a few real candidates side by side.';
  root.author = generation(root.id, 'intro', 180);

  const child = (kind: 'need' | 'concept' | 'criterion' | 'product', title: string, hook = '') => addChooseChild(v, v.rootId, { title, hook, kind, createdBy: 'model' });
  for (const [question, answer] of [
    ['Where will you type?', 'Open-plan office, colleagues within two metres.'],
    ['What do you type most?', 'Long documents and code, several hours a day.'],
    ['What budget feels right?', 'Around 150 €, a bit more if it is clearly better.']
  ]) answerNeed(v, child('need', question).id, answer, 'Alex');
  const switches = child('concept', 'Linear, tactile or clicky', 'Three switch families, three very different noises');
  setState(v, switches.id, 'lit');
  switches.content = '**Clicky** switches add a click on purpose: avoid them here. **Tactile** ones have a bump you feel but barely hear. **Linear** ones are smooth, and their *silent* versions are the quietest of all.';
  switches.author = generation(switches.id, 'light', 120);
  child('concept', 'Foam, gaskets and plate', 'What the case does to the sound');

  const criterion = (title: string, rank: 'must' | 'nice' | 'irrelevant', hook: string) => { const c = child('criterion', title, hook); setState(v, c.id, rank); return c; };
  const noise = criterion('Noise', 'must', 'Colleagues sit within two metres');
  const price = criterion('Price', 'must', 'Around 150 €');
  const feel = criterion('Typing feel', 'must', 'Hours of writing a day');
  const layout = criterion('Layout', 'nice', 'Arrow keys and an F-row for code');
  const wireless = criterion('Wireless', 'nice', 'One cable less on the desk');
  criterion('Hot-swap sockets', 'irrelevant', 'You will not change switches');
  setPriceCriterion(v, price.id);

  const product = (title: string, hook: string) => child('product', title, hook);
  const silent65 = product('Silent 65% board', 'Compact, silent linear switches, dense foam');
  const lowTkl = product('Low-profile TKL', 'Short travel, tactile, laptop-like height');
  const gasket75 = product('Gasket 75% board', 'Soft gasket mount, silent tactile switches');
  product('Full-size office board', 'Number pad, plain design, membrane-quiet');
  const clicky = product('Clicky retro board', 'Classic blue switches, heavy metal case');
  for (const p of [silent65, lowTkl, gasket75]) setState(v, p.id, 'shortlisted');
  rejectProduct(v, clicky.id, 'Clicky switches: far too loud for an open office.');

  const fill = generation(v.rootId, 'fill', 900, true);
  const src = (kind: Source['kind'], name: string, read: string, value?: string): Source => ({ kind, name, read, ...(value ? { value } : {}) });
  const cell = (c: Partial<Cell> & Pick<Cell, 'value' | 'sources'>): Cell => ({ generationId: fill.kind === 'model' ? fill.generationId : '', at: '2026-10-14T09:10:00.000Z', ...c });
  const maker = (read: string, value?: string) => src('manufacturer', "Maker's spec sheet", read, value);
  const shop = (read: string) => src('shop', 'Online shop', read);
  silent65.data = { cells: {
    [noise.id]: cell({ value: '38 dB(A)', disagree: true, note: 'The maker claims 35 dB(A); an independent test measured 38 dB(A).', sources: [maker('2026-10-12', '35 dB(A)'), src('measured', 'Independent sound test', '2026-10-09', '38 dB(A)')] }),
    [price.id]: cell({ value: '129 €', sources: [shop('2026-10-13')] }),
    [feel.id]: cell({ value: 'Silent linear, light 45 g', sources: [maker('2026-10-12')] }),
    [layout.id]: cell({ value: '65%: arrows, no F-row', sources: [maker('2026-10-12')] }),
    [wireless.id]: cell({ value: 'Bluetooth and 2.4 GHz', sources: [maker('2026-10-12')] }) } };
  lowTkl.data = { cells: {
    [noise.id]: cell({ value: '41 dB(A)', sources: [src('measured', 'Independent sound test', '2026-10-09')] }),
    [price.id]: cell({ value: '149 €', sources: [shop('2026-10-13')] }),
    [feel.id]: cell({ value: 'Tactile, short 3 mm travel', sources: [maker('2026-10-11'), src('opinion', 'Typists forum thread', '2026-10-06')] }),
    [layout.id]: cell({ value: 'Tenkeyless: arrows and F-row', sources: [maker('2026-10-11')] }),
    [wireless.id]: cell({ value: 'Bluetooth', sources: [maker('2026-10-11')] }) } };
  gasket75.data = { cells: {
    [noise.id]: cell({ value: '40 dB(A)', sources: [src('sponsored', 'Sponsored review', '2026-10-04')] }),
    [price.id]: cell({ value: '165 €', sources: [shop('2026-10-13')], user: { value: '159 €', at: '2026-10-14T18:20:00.000Z', by: 'Alex' } }),
    [feel.id]: cell({ value: 'Silent tactile, soft and springy', sources: [src('opinion', 'Typists forum thread', '2026-10-06')] }),
    [layout.id]: cell({ value: '75%: arrows and F-row', sources: [maker('2026-10-10')] }),
    [wireless.id]: cell({ value: null, sources: [] }) } };

  validateChoose(v);
  return cloneJson(s);
}
