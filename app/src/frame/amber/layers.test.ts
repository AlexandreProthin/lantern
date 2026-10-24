import { expect, test } from 'vitest';
import { amberRequest } from './prompt';
import type { AmberHelp } from './prompt';

const help: AmberHelp = { about: 'About.', shortcuts: 'Ctrl+J — Ask Amber', guide: [{ room: 'Learn', space: 'Study', lines: ['Light a dark node: Enter.'] }], tips: ['Tip one.'] };
test('DC-22: Amber\'s layers are verbatim parts of the system (HELP) and the prompt (the rest)', () => {
  const full = amberRequest(help, { room: 'Learn', space: 'Study', subject: { title: 'Tides', focus: { title: 'Spring tides', explanation: 'Big ones.' } } },
    [{ question: 'Neap?', answer: 'Weak.', category: 'subject' }], 'And spring?', 'spring tide');
  expect(full.layers.map(l => l.name)).toEqual(['HELP', 'WHERE', 'SUBJECT', 'CHAT', 'MESSAGE']);
  expect(full.system).toContain(full.layers[0].text);
  for (const layer of full.layers.slice(1)) expect(full.prompt).toContain(layer.text);
  const bare = amberRequest(help, { room: 'Choose', space: 'Welcome' }, [], 'Hi');
  expect(bare.layers.map(l => l.name)).toEqual(['HELP', 'WHERE', 'SUBJECT', 'MESSAGE']);
});
