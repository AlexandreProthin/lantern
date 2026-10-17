import type { RoomCompanion } from '../../frame/room';
/** RS-3, CO-21 to CO-23: Learn's lines for Amber. As agreed 2026-10-17 (agent_wiki/plans/v0-4-0-amber-lines.md). */
export const learnCompanion: RoomCompanion = {
  about: 'bring a subject and a tutor explains it as a graph of nodes, lighting one node at a time; you choose where to go next, ask questions, test yourself, and mark what you understand.',
  tips: [
    { id: 'learn.arrows', text: 'Arrow keys walk the graph: left to the parent, right to a child, up and down between siblings.' },
    { id: 'learn.enter', text: 'Press Enter on a dark node to light it up.' },
    { id: 'learn.check', text: '*Test me* asks you a question about the node. *I get it* marks it understood on your word.' },
    { id: 'learn.node', text: 'Select a passage and press Alt+N: it becomes a node of its own.' },
    { id: 'learn.direction', text: 'Shift+Enter in the Welcome field adds a direction: where to start, or where to head.' },
    { id: 'learn.dismiss', text: 'Dismiss a direction you don’t want; it won’t be proposed again, and *Restore* brings it back.' },
    { id: 'learn.search', text: 'Ctrl+F in Study searches every node of the subject.' },
    { id: 'learn.divider', text: 'Drag the divider to give the graph or the panel more room; double-click it to reset.' }
  ],
  guide: {
    welcome: [
      'Bring a subject: type it and press Enter.',
      'Add a direction: Shift+Enter in the field.',
      'No idea yet? *Suggest 3 subjects*.',
      'Pick up a recent subject: click its card, or Ctrl+2 for the latest.'
    ],
    study: [
      'Walk the graph: arrow keys; Home goes back to the root.',
      'Light a dark node: Enter, or *Light it up*.',
      'Ask the tutor or answer it: type in the panel, Ctrl+Enter sends.',
      'Check yourself: *Test me*, or *I get it*.',
      'Turn a selection into a question or a node: Alt+A, Alt+N; ask me about it: Alt+D.',
      'Find a node: Ctrl+F.'
    ],
    gallery: [
      'Move through your subjects: arrow keys; Enter opens one.',
      'Sort and filter: the controls above the grid.',
      'Rename: *Rename*, then Enter to save.',
      'Delete: the Delete key, then confirm.'
    ]
  }
};
