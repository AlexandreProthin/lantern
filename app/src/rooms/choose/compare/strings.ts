/** Compare's texts (CR-50, CR-51, agent_design/choose-compare/RECIPE.md). */
export const strings = {
  title: 'Compare', shortlisted: (n: number) => `${n} shortlisted`, unfoldAll: '▸ unfold all evidence', foldAll: '▾ fold all evidence',
  unfoldAllLabel: 'Unfold the evidence of every criterion', foldAllLabel: 'Fold the evidence of every criterion',
  groups: { must: 'Must', nice: 'Nice to have', irrelevant: 'Irrelevant' },
  showIrrelevant: (n: number) => `Show irrelevant (${n})`, hideIrrelevant: (n: number) => `Hide irrelevant (${n})`,
  choose: 'Choose', remove: 'Remove', chosen: 'Chosen', unchoose: 'Un-choose',
  fillCompare: 'Fill Compare', cancel: 'Cancel', retry: 'Retry',
  starting: 'Starting…', searching: (query: string) => `Searching… ${query}`, reading: (host: string) => `Reading ${host}…`,
  filling: (n: number) => `Researching ${n} ${n === 1 ? 'cell' : 'cells'}`, checking: 'Checking…', checkFailed: 'The check failed.',
  webOff: "Use the web is off: values come from the model's knowledge, not checked against current sources.", webOn: 'Turn the web on',
  noneFound: 'No source found', researching: 'Researching…', notFilled: 'Not filled yet', noSources: 'no sources yet',
  priceCaution: (date: string) => `an indication, not a promise · seen ${date}`, priceCard: 'A price is an indication at that date, not a promise.',
  yours: 'yours', roomValue: "The room's value:", nothingFound: 'nothing found', notUsed: 'not used', read: 'read',
  evidenceFor: (name: string) => `Evidence for ${name}`, checkRow: 'Check this row', checkThis: 'Check this', saveMine: 'Save as mine', revert: "Revert to the room's",
  yourValue: 'your value…', yourValueFor: (product: string, criterion: string) => `Your value for ${product}, ${criterion}`, fold: 'Fold',
  researchingCard: 'Researching: sources appear here as they are read.', noSource: 'No source.', noCell: 'Nothing here yet. Fill Compare, Check this, or type your own value.',
  oneProduct: (names: string[], more: number) => names.length
    ? `Shortlist more to compare: ${names.join(', ')}${more ? ` and ${more} more` : ''} ${names.length + more === 1 ? 'is a candidate' : 'are candidates'} in the Survey.`
    : 'Shortlist more products in the Survey to compare them.',
  openSurvey: 'Open the Survey', emptyTitle: 'Nothing to compare yet', emptyBody: 'Shortlist products in the Survey: each one becomes a column here, filled with sourced values.',
  noCriteria: 'No ranked criteria yet. Mark criteria Must or Nice to have in the Survey to compare on them.',
  kinds: { manufacturer: 'manufacturer', measured: 'measured', shop: 'shop', opinion: 'opinion', sponsored: 'sponsored', model: 'model knowledge' },
  edited: (n: number) => `✎ ${n}`, summaryFilling: (n: number) => `… ${n}`,
};
