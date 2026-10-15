import type { SourceKind } from '../rules';

// PQ-4: Choose's Survey strings. Shared wording (Cancel, Retry, Restore, More options...) comes from ui/strings.
export const kindNames: Record<string, string> = { subject: 'subject', concept: 'concept', need: 'need', criterion: 'criterion', family: 'family', product: 'product', own: 'own' };
export const kindDescriptions: Record<string, string> = {
  subject: 'What is being chosen', concept: 'Something to understand to choose well', need: 'A question to you', criterion: 'Something to compare on',
  family: 'A group of similar products', product: 'A real model', own: 'Added by you',
};
export const stateNames: Record<string, string> = { open: 'open', lit: 'lit', answered: 'answered', must: 'must', nice: 'nice to have', irrelevant: 'irrelevant', candidate: 'candidate',
  shortlisted: 'shortlisted', chosen: 'chosen', rejected: 'rejected', dismissed: 'dismissed', exploring: 'exploring', decided: 'decided', bought: 'bought' };
export const sourceNames: Record<SourceKind, string> = { manufacturer: 'manufacturer', measured: 'measured', shop: 'shop', opinion: 'opinion', sponsored: 'sponsored', model: 'model knowledge' };

export const t = {
  // legend
  legendKinds: 'Kinds', legendStates: 'States',
  legendRows: [
    { state: 'open', badge: '', label: 'open / candidate' }, { state: 'lit', badge: '', label: 'lit' }, { state: 'answered', badge: 'answered', label: 'answered' },
    { state: 'must', badge: 'must', label: 'must' }, { state: 'nice', badge: 'nice', label: 'nice to have' }, { state: 'irrelevant', badge: 'irrelevant', label: 'irrelevant' },
    { state: 'shortlisted', badge: 'shortlisted', label: 'shortlisted' }, { state: 'chosen', badge: 'chosen', label: 'chosen' }, { state: 'rejected', badge: 'rejected', label: 'rejected' },
    { state: 'dismissed', badge: '', label: 'dismissed' },
  ],
  untitled: 'Untitled',
  rejectedBecause: (reason: string) => ` · rejected: ${reason}`,
  answeredWith: (text: string) => ` · ${text}`,
  // panel
  notStarted: 'Not started yet.', lightSubject: 'Light it up', darkNode: 'This node is still dark.', unexplained: 'Not explained yet.',
  noProducts: 'No products found yet.', dismissedNotice: 'Dismissed. It will not be proposed again.',
  headings: { subject: 'Where to start', family: 'Products', other: 'Where to go next' },
  explain: 'Explain', find: 'Find products', more: 'More options', own: 'Add my own node', dismiss: 'Dismiss', delete: 'Delete', restore: 'Restore',
  shortlist: 'Shortlist', remove: 'Remove', reject: 'Reject', choose: 'Choose', unchoose: 'Un-choose', bought: 'Mark as bought',
  rankAs: { must: 'Mark as must', nice: 'Mark as nice to have', irrelevant: 'Mark as irrelevant' },
  check: 'Check this', checkTitle: 'Fact-check this node on the web',
  yourAnswer: 'Your answer', answerPlaceholder: 'Your answer, in your words', saveAnswer: 'Save answer', answerBy: (by: string, at: string) => `Answered by ${by || 'you'} · ${at}`,
  ranking: 'How much does it matter to you?', ranks: { must: 'Must', nice: 'Nice to have', irrelevant: 'Irrelevant' }, notRanked: 'Not ranked yet.',
  facts: 'Facts', noFacts: 'No facts yet. Use Find products on its family, or Check this.',
  priceNote: (date: string) => `an indication, seen ${date}, not a promise`,
  readOn: (date: string) => `read ${date}`, readIn: (month: string) => `from ${month}`, notUsed: 'not used',
  rejectReason: 'Why reject it?', reasonPlaceholder: 'Your reason', confirmReject: 'Reject', rejectedBecausePanel: (reason: string) => `Rejected: ${reason}`,
  chosenNote: 'This is your pick.', boughtNote: 'Marked as bought.',
  searching: 'Searching…', reading: (host: string) => `Reading ${host}…`, fromKnowledge: 'Working from the model’s knowledge…', filling: 'Filling Compare cells…',
  cancelResearch: 'Cancel', offerHeading: 'Add this to your needs?', offerBody: (question: string, answer: string) => `${question} — ${answer}`, addNeed: 'Add to needs', ignore: 'Ignore',
  recommendation: 'Recommendation', chooseProduct: (title: string) => `Choose ${title}`,
  failed: 'The tutor could not answer.',
  // rail
  rail: 'Decision board', boardTitle: 'Board', needsLabel: 'needs', mustLabel: (nice: number) => `must · ${nice} nice`, shortlistLabel: 'shortlist', pickLabel: 'pick',
  missingCount: (n: number) => `${n} missing`, complete: 'complete', recommend: 'Recommend', recommendReady: 'Recommend ›', recommendNow: (n: number) => `Recommend now (${n} missing)`, recommendOffer: 'Ready: get the recommendation',
  openBoard: 'Open the decision board', closeBoard: 'Close the decision board',
  // board
  boardHeading: 'Decision board', backToGraph: 'Back to graph', stillMissing: 'Still missing:', nothingMissing: 'Nothing missing.', fillCompare: 'Fill Compare',
  needsCard: 'Needs', inYourWords: 'In your words', notePlaceholder: 'Budget, who it’s for, what you already know…',
  noNeeds: 'No needs yet. The room asks as they become meaningful; tell it what you need in your words above.',
  criteriaCard: 'Criteria', noCriteria: 'No criteria yet: they appear as you explore.',
  groups: { must: 'Must', nice: 'Nice to have', open: 'To rank', irrelevant: 'Irrelevant' },
  segment: { must: 'must', nice: 'nice', irrelevant: 'irr.' },
  shortlistCard: 'Shortlist and pick', shortlistCount: (shortlisted: number, candidates: number) => `${shortlisted} shortlisted · ${candidates} candidate${candidates === 1 ? '' : 's'}`,
  noBoardProducts: 'No products yet. They come from the graph (families, products) and from research.',
  boughtDone: 'Bought ✓', rejectedList: 'Rejected', pick: 'Pick',
  // missing items
  missing: {
    answer: (title: string) => `Answer: ${title}`, noMust: 'Mark at least one criterion as must', noCriteria: 'No criteria yet', rank: (title: string) => `Rank: ${title}`,
    shortlist2: 'Shortlist at least 2 products', shortlist1: 'Shortlist one more product', cells: (n: number) => `${n} Compare cell${n === 1 ? '' : 's'} still empty`,
  },
  stages: { exploring: 'exploring', ready: 'ready', decided: 'decided', bought: 'bought' },
  error: (what: string) => what,
};
