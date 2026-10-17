import type { RoomCompanion } from '../../frame/room';
/** RS-3, CO-21 to CO-23: Choose's lines for Amber. As agreed 2026-10-17 (agent_wiki/plans/v0-4-0-amber-lines.md). */
export const chooseCompanion: RoomCompanion = {
  about: 'say what you want to buy; the room maps your needs, the criteria and candidate products as a graph, researches products on the web with sources, compares a shortlist side by side, and recommends one.',
  tips: [
    { id: 'choose.needs', text: 'Tell me your needs early: the Welcome field takes a budget, a use, a limit.' },
    { id: 'choose.rank', text: 'Rank each criterion *Must*, *Nice to have* or *Irrelevant*; the recommendation follows your ranks.' },
    { id: 'choose.shortlist', text: '*Shortlist* a product and it becomes a column in Compare, filled with sourced values.' },
    { id: 'choose.sources', text: 'Click a value in Compare to see where it came from.' },
    { id: 'choose.recommend', text: '*Recommend* works at any time: it says what’s still missing and how sure it is.' },
    { id: 'choose.check', text: '*Check this* asks for a second look at a product or a value.' },
    { id: 'choose.board', text: 'The board beside the graph counts your needs, criteria and shortlist at a glance.' },
    { id: 'choose.web', text: 'Turn off *Use the web* in Settings → Choose room for answers from the model’s knowledge only.' }
  ],
  // CO-35: while a generation waits for its first words (*more* was not in the drafted table; it takes Learn's line).
  waiting: {
    intro: title => `Sizing up ${title}…`, light: title => `Lighting up ${title}…`, more: () => 'Looking for more directions…', reply: () => 'Thinking it over…',
    find: () => 'Looking for products…', fill: () => 'Filling in Compare…', check: title => `Checking ${title}…`, recommend: () => 'Weighing your options…'
  },
  // CO-13: Study's three resting positions, just above the controls in each corner (legend, zoom, composer).
  rests: {
    survey: [
      { id: 'graph-left', label: 'Bottom left of the graph', anchor: '.study:not(.hidden) .graph-side', side: 'left', inset: { x: 16, y: 132 } },
      { id: 'graph-right', label: 'Bottom right of the graph', anchor: '.study:not(.hidden) .graph-side', side: 'right', inset: { x: 16, y: 72 } },
      { id: 'panel-right', label: 'Bottom right of the reading panel', anchor: '.study:not(.hidden) aside.panel', side: 'right', inset: { x: 24, y: 140 } }
    ]
  },
  guide: {
    welcome: [
      'Say what you want to buy: type it and press Enter.',
      'Add what you already know (budget, use, limits): Shift+Enter in the field.',
      'Pick up a recent decision: click its card, or Ctrl+2 for the latest.'
    ],
    survey: [
      'Walk the graph: arrow keys; Home goes back to the root.',
      'Answer a need, rank a criterion: in the panel, *Answer*, *Must*, *Nice to have*, *Irrelevant*.',
      'Find candidates: *Find products*.',
      'Keep or drop a product: *Shortlist*, *Reject*.',
      'Ask for a verdict: *Recommend*, at any time.',
      'Open the board: the counter rail beside the graph.'
    ],
    compare: [
      'See where a value comes from: click it, or Enter on it.',
      'Fill the empty cells: *Fill Compare*.',
      'Correct a value: open its card and edit it.',
      'Decide: *Choose* a product, then *Mark as bought*.'
    ],
    gallery: [
      'Move through your decisions: arrow keys; Enter opens one.',
      'Filter by name or status: the controls above the grid.',
      'Delete: the Delete key, then confirm.'
    ]
  }
};
