// PQ-4: every user-facing string belongs here.
export const strings = {
  appName: 'Lantern', scaffold: 'Light up what you’re working through.',
  foundation: 'The v0.1.0 foundation is ready. Study, Welcome and Gallery follow in M3–M4.',
  fake: 'Browser · fake tutor', desktop: 'Desktop · Claude Code',
  moreOptions: 'More options', saveFailed: 'Could not save. Retry',
  diskReloaded: 'Subject reloaded after a change on disk.',
  conflict: 'A local copy was saved because the subject also changed on disk.',
  readOnly: 'This file was created by a newer Lantern version and is read-only.'
  , welcome: 'Welcome', study: 'Study', gallery: 'Gallery', learn: 'Learn', settings: 'Settings',
  graphNavigation: 'Graph navigation', previousView: 'Previous view', recenter: 'Recenter',
  treeLayout: 'Tree layout', freeLayout: 'Free layout', zoomIn: 'Zoom in', zoomOut: 'Zoom out', untitledQuestion: 'Untitled question',
  darkNode: 'This node is still dark.', lightUp: 'Light it up', lighting: 'Lighting…',
  dismissedNotice: 'Dismissed. It will not be proposed again.', restore: 'Restore', dismiss: 'Dismiss',
  whereNext: 'Where to go next', axes: 'Axes to explore', dialogue: 'Dialogue',
  send: 'Send', check: 'Test me', understood: 'I get it', notSure: 'Not sure anymore', cancel: 'Cancel',
  composer: 'Ask about this, or answer the tutor… (Ctrl+Enter to send)',
  edit: 'Edit', save: 'Save', editExplanation: 'Edit explanation', editLabels: 'Edit title and hook',
  previousVersion: 'Previous version', revert: 'Revert to previous', keepCurrent: 'Keep current',
  previous: 'Previous', current: 'Current', ownNode: 'Add my own node', title: 'Title', hook: 'Hook', add: 'Add',
  delete: 'Delete', deleteNode: 'Delete this node?', deleteHistory: 'Their generation records stay in the log. This cannot be undone.',
  generationCancelled: 'A generation is running here and will be cancelled.',
  tutorFailed: 'The tutor could not answer.', retry: 'Retry', details: 'Details',
  waitingDesign: 'Welcome design is in progress.', galleryStub: 'Gallery follows the Welcome design.',
  loading: 'Loading…', textLinks: 'Text links', legend: 'Legend', notes: 'Corrections',
  openState: 'open', litState: 'lit', demonstratedState: 'demonstrated', selfState: 'self-declared', dismissedState: 'dismissed', branchState: 'question',
  lightingNode: (title: string) => `Lighting ${title}`, optionsReady: (count: number) => `${count} options ready`, largeGraph: 'Free layout is off for large graphs',
  askSelection: 'Ask about this', nodeSelection: 'Make it a node', copy: 'Copy code', copied: 'Copied',
  diagramFailed: 'Diagram could not be drawn', providerBusy: 'A generation is running',
  showTokens: 'Show token stats', displayName: 'Display name', appliesNext: 'Applies to your next message',
  errorKinds: {
    'not-installed': 'Claude Code is not installed.', 'not-logged-in': 'Claude Code is installed but not signed in.',
    'usage-limit': 'Your Claude usage limit was reached.', 'model-unknown': 'The selected model is not available.',
    network: 'Could not reach Claude. Check your connection.', 'process-crashed': 'Claude Code stopped unexpectedly.',
    protocol: 'Claude Code gave an answer Lantern could not read.', cancelled: ''
  },
  editedBy: (name: string) => `edited by ${name}`, writtenBy: (name: string) => `written by ${name}`,
  dismissedCount: (n: number) => `Dismissed (${n})`, directionsCount: (n: number) => `Only ${n} directions came back`,
  headerStats: (lit: number, understood: number, dark: number) => `${lit} lit · ${understood} understood · ${dark} dark`,
  deleteDescription: (title: string, count: number) => `“${title}” and its ${count-1} descendants (${count} nodes in all) will be removed.`,
  understoodLost: (n: number) => `${n} understood nodes will be lost.`
  , tone: 'Tone', customTone: 'Custom tone', advanced: 'Advanced', contextBudget: 'Map context budget',
  newSubjectsHint: 'Applies to new subjects.', contextBudgetHint: 'Applies to the map in your next generation. The CLI baseline is separate.',
  collapseGraph: 'Collapse graph', collapsePanel: 'Collapse panel', restoreGraph: 'Restore graph', restorePanel: 'Restore panel',
  general: 'General', provider: 'Provider', appearance: 'Appearance', defaultModel: 'Default model', defaultEffort: 'Default effort',
  libraryFolder: 'Library folder', reduceMotion: 'Reduce motion', followSystem: 'Follow system', alwaysReduce: 'Always reduce',
  shortcuts: 'Keyboard shortcuts', close: 'Close', settingsRecovered: 'Unreadable settings were backed up and reset to defaults.',
  libraryUnavailable: 'Your library folder is unavailable.', openConflict: 'Open conflict copy',
  checkAgain: 'Check again', testProvider: 'Test', notTested: 'Not tested yet'
  , changeLibrary:'Change…', revealLibrary:'Reveal library in Explorer', finishGeneration:'Finish or cancel the running generation first',
  libraryChanged:(path:string)=>`Library switched to ${path}.`, collisionsRenamed:(count:number)=>`${count} colliding subject ids were renamed.`,
  transferLibrary:'Bring your subjects to this library?', transferHint:'Move copies and verifies every file before removing originals. Copy keeps the originals. Leave them switches folders only.',
  moveSubjects:'Move', copySubjects:'Copy', leaveSubjects:'Leave them', resetDefaults:'Reset to defaults', confirmReset:'Reset this section to its defaults?',
  invalidName:'Use 1–40 characters.', invalidModel:'Use 1–100 letters, numbers, dots, underscores, colons or hyphens.', invalidBudget:'Use a whole number from 2000 to 100000.',
  found:'Found', notFound:'Not found', signedIn:'Signed in', notSignedIn:'Not signed in'
  , chooseModel:'Choose a model',copyDetails:'Copy details'
  , understoodByYou:'understood by you',preparing:'preparing',jumpLatest:'Jump to latest'
  , nodeKinds:{subject:'subject',axis:'axis',deeper:'go deeper',application:'application',adjacent:'adjacent idea',exercise:'exercise',question:'from a question',own:'own'}
  , transferRecovered:'An interrupted library transfer was recovered. Your subjects are safe.'
  , installInstructions: 'Install Claude Code from the setup page, then return to Lantern and choose Check again.', installClaude: 'Install Claude Code',
  signinInstructions: 'Start Claude Code once outside Lantern and follow its browser sign-in with your Claude account. Then return here and choose Check again.',
  shortcutTable: 'Arrow keys — parent / first child / previous or next sibling\nHome — focus the root\nEnter on a graph node — light it, or focus the panel\nCtrl+Enter — send; save an edit\nEsc — close overlay, popover or dialog; cancel edit; cancel generation\nCtrl+1 / Ctrl+2 / Ctrl+3 — Welcome / Study / Gallery\nAlt+A / Alt+N with selected text — Ask / Make it a node\n? — show or hide shortcuts\nCtrl+, — Settings'
};
