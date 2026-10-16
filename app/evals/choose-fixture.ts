// The *3D printer* subject the choose-1 evals (CP-60) start from; also used to rebuild a subject from a run.
import type { Effort } from '../src/core/model';
import { addChooseChild, answerNeed, newChooseSubject, setPriceCriterion, setState } from '../src/rooms/choose/rules';
import type { Cell, NodeKind, Source } from '../src/rooms/choose/rules';

// The fixture of CP-60: needs answered, criteria ranked, 3 shortlisted with their must cells filled.
const READ = '2026-10-10', src = (name: string, url: string, kind: Source['kind'] = 'manufacturer'): Source => ({ kind, name, url, read: READ });
const cell = (value: string, sources: Source[], extra: Partial<Cell> = {}): Cell => ({ value, sources, generationId: 'fixture', at: '2026-10-10T10:00:00.000Z', ...extra });
export function printer(title = '3D printer', options: { openNeed?: boolean; fourth?: boolean; noise?: boolean } = {}, model = 'opus', effort: Effort = 'medium') {
  const s = newChooseSubject(title, { tone: 'curious', model, effort, locale: { country: 'FR', currency: 'EUR' }, needsNote: 'Budget about 500 €, figurines and toys for my kids.' }, 'Alex');
  const v = s.rooms.choose, root = v.rootId, ids: Record<string, string> = {};
  setState(v, root, 'lit'); const by = { kind: 'user' as const, by: 'fixture' }; v.nodes[root].author = by; v.nodes[root].content = 'A home 3D printer melts plastic filament layer by layer. What decides a choice here: build volume, how much tinkering it needs, and price.';
  const add = (key: string, kind: NodeKind, t: string, hook = '', parent = root) => { ids[key] = addChooseChild(v, parent, { title: t, hook, kind, createdBy: 'model' }).id; return ids[key]; };
  add('budget', 'need', 'How much can you spend?', 'The budget sets the class of printer.'); answerNeed(v, ids.budget, 'About 500 €', 'Alex');
  add('use', 'need', 'What will you print?', 'Small figurines need fine detail; toys need strength.'); answerNeed(v, ids.use, 'Figurines and toys for my kids, at home', 'Alex');
  if (options.openNeed) add('space', 'need', 'Where will it stand?', 'Noise and fumes matter in a living room.');
  add('volume', 'criterion', 'Build volume', 'Toys need room; figurines do not.'); setState(v, ids.volume, 'must');
  add('ease', 'criterion', 'Ease of use', 'You want to print, not tinker.'); setState(v, ids.ease, 'must');
  add('price', 'criterion', 'Price', 'About 500 € all in.'); setState(v, ids.price, 'must'); setPriceCriterion(v, ids.price);
  add('noise', 'criterion', 'Noise', 'It runs at home for hours.'); setState(v, ids.noise, 'nice');
  add('multi', 'criterion', 'Multi-colour printing', 'Not needed for now.'); setState(v, ids.multi, 'irrelevant');
  add('heated', 'concept', 'Heated bed', 'Why the first layer sticks.');
  add('family', 'family', 'Bed slingers around 300 €', 'Open frame, the bed moves.'); setState(v, ids.family, 'lit');
  v.nodes[ids.family].author = by;
  v.nodes[ids.family].content = 'Open-frame printers whose bed moves back and forth: cheap, simple, a bit loud.';
  const products: [string, string, string, string, string][] = [['a1', 'Bambu Lab A1', '256 × 256 × 256 mm', 'Auto-calibration, guided setup', '349 €'], ['mk4s', 'Prusa MK4S', '250 × 210 × 220 mm', 'Kit or assembled; very reliable', '799 €'], ['k1c', 'Creality K1C', '220 × 220 × 250 mm', 'Enclosed, fast, ready out of the box', '399 €']];
  for (const [key, t, volume, ease, price] of products) {
    add(key, 'product', t, '', ids.family); setState(v, ids[key], 'shortlisted');
    const maker = src(`${t.split(' ')[0]} specs`, `https://example.com/${key}`);
    v.nodes[ids[key]].data = { facts: [{ label: 'Price', value: price, sources: [{ ...maker, kind: 'shop', name: 'Maker shop' }] }], cells: {
      [ids.volume]: cell(volume, [maker]), [ids.ease]: cell(ease, [src('Tom\'s Hardware', 'https://www.tomshardware.com', 'measured')]), [ids.price]: cell(price, [{ ...maker, kind: 'shop', name: 'Maker shop' }]),
      ...(options.noise ? {} : { [ids.noise]: cell('about 48 dB', [src('Tom\'s Hardware', 'https://www.tomshardware.com', 'measured')]) }) } };
  }
  // CP-60 case 7: the user corrected one cell.
  const k1c = v.nodes[ids.k1c]; (k1c.data!.cells as Record<string, Cell>)[ids.volume].user = { value: '220 × 220 × 240 mm', at: '2026-10-11T09:00:00.000Z', by: 'Alex' };
  if (options.fourth) { add('centauri', 'product', 'Elegoo Centauri Carbon', '', ids.family); setState(v, ids.centauri, 'shortlisted'); }
  return { s, v, ids };
}
