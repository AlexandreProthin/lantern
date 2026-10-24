import { expect, test } from 'vitest';
import { addChooseChild, answerNeed, newChooseSubject, setState, tasks } from './rules';
import { taskPrompt } from './prompts';

const today = '2026-10-15';
function printer() {
  const v = newChooseSubject('3D printer', { tone: 'curious', model: 'opus', effort: 'medium', locale: { country: 'FR', currency: 'EUR' }, needsNote: 'budget about 500 €' }, 'Alex').rooms.choose;
  setState(v, v.rootId, 'lit'); v.nodes[v.rootId].content = 'Printers.\n\n\n\nFor home.';
  const add = (kind: Parameters<typeof addChooseChild>[2]['kind'], title: string, parent = v.rootId, hook = '') => addChooseChild(v, parent, { title, hook, kind, createdBy: 'model' }).id;
  const need = add('need', 'What will you print?', v.rootId, 'size'), crit = add('criterion', 'Build volume', v.rootId, 'size of parts'), fam = add('family', 'Enclosed', v.rootId, 'closed'), p = add('product', 'Bambu A1', fam), concept = add('concept', 'Enclosure');
  answerNeed(v, need, 'figurines', 'Alex'); setState(v, crit, 'must'); setState(v, p, 'shortlisted');
  v.nodes[fam].content = 'Closed boxes.'; v.nodes[fam].dialogue = [{ role: 'user', text: 'Noise?', at: v.nodes[fam].createdAt, author: { kind: 'user', by: 'Alex' } }];
  return { v, root: v.rootId, need, crit, fam, p, concept };
}

test('DC-22: every Choose layer is a verbatim part of the prompt, in the order of the prompt, and TASK ends it', () => {
  const t = printer();
  for (const task of tasks) {
    for (const focus of [t.root, t.fam, t.p, t.crit, t.concept]) {
      let p: ReturnType<typeof taskPrompt>;
      try { p = taskPrompt(t.v, task, focus, { today, web: task === 'find' || task === 'fill' || task === 'check' }); } catch { continue; }
      expect(p.layers[0].name, `${task} on ${focus}`).toBe('SUBJECT'); expect(p.layers.at(-1)!.name).toBe('TASK');
      for (const layer of p.layers) expect(p.prompt, `${task}: ${layer.name}`).toContain(layer.text);
      expect(p.prompt.endsWith(p.layers.at(-1)!.text)).toBe(true);
      const at = p.layers.filter(l => l.name !== 'TASK').map(l => p.prompt.indexOf(l.text));
      expect(at).toEqual([...at].sort((a, b) => a - b));
    }
  }
  const light = taskPrompt(t.v, 'light', t.concept, { today, web: false });
  expect(light.layers.map(l => l.name)).toEqual(['SUBJECT', 'LOCALE', 'NEEDS', 'BOARD', 'MAP', 'PATH', 'PARENT', 'TASK']);
  expect(light.template).toBe('light'); expect(taskPrompt(t.v, 'light', t.crit, { today, web: false }).template).toBe('explain');
});
