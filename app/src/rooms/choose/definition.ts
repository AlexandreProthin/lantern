import type { RoomDefinition } from '../../frame/room';
import type { Settings } from '../../frame/settings';
import { learnSettings } from '../learn/settings';
import { newChooseSubject, validateChoose } from './rules';
import { chooseSettings, chooseSettingsDefaults, localeOf, validateChooseSettings } from './settings';
import { headerStats } from './stats';
import { chooseSummary } from './summary';
import { ChooseSession } from './session';
import { promptVersion } from './prompts';
import { ChooseFakeProvider } from './fake-provider';
import Welcome from './Welcome.svelte';
import Survey from './Survey.svelte';
import Compare from './Compare.svelte';
import Gallery from './Gallery.svelte';
import ChooseSettings from './ChooseSettings.svelte';
import SubjectMenu from './SubjectMenu.svelte';
import './choose.css';
import { glyphs } from '../../ui/glyphs';

const kind = (label: string, glyph: string) => ({ label, glyph });
/** CR-11: Welcome, Survey, Compare, Gallery; Survey by default. Registered in development builds only until B5 (rooms/index.ts). */
export const chooseRoom: RoomDefinition = {
  id: 'choose', name: 'Choose', accent: { '--accent': '#5cc6bd' },
  spaces: [{ id: 'welcome', label: 'Welcome', icon: glyphs.welcome, shortcutIndex: 1, component: Welcome }, { id: 'survey', label: 'Survey', icon: glyphs.survey, shortcutIndex: 2, component: Survey },
    { id: 'compare', label: 'Compare', icon: glyphs.compare, shortcutIndex: 3, component: Compare }, { id: 'gallery', label: 'Gallery', icon: glyphs.gallery, shortcutIndex: 4, component: Gallery }],
  defaultSpace: 'survey', settingsMenu: ChooseSettings,
  settings: { defaults: chooseSettingsDefaults(), validate: validateChooseSettings },
  defaultTone: settings => chooseSettings(settings).defaultTone,
  prompts: { version: promptVersion, createSession: (subject, provider, save, render, settings) => {
    let current: Settings = settings;
    const session = new ChooseSession(subject, provider, save, render, settings.user.displayName, learnSettings(settings).contextBudget, () => chooseSettings(current).useWeb);
    (session as ChooseSession & { applySettings?: (s: Settings) => void }).applySettings = s => { current = s; };
    return session;
  } },
  applySettings(session, settings) {
    const choose = session as ChooseSession & { applySettings?: (s: Settings) => void };
    choose.displayName = settings.user.displayName; choose.budgetTokens = learnSettings(settings).contextBudget; choose.applySettings?.(settings);
  },
  fakeProvider: (delay, error) => new ChooseFakeProvider(delay, error),
  // CR-20, CR-21: the menu and legend glyphs; the graph draws the recipe's pictograms (slice 5).
  nodeKinds: { subject: kind('subject', '◎'), concept: kind('concept', 'i'), need: kind('need', '?'), criterion: kind('criterion', '⚖'), family: kind('family', '⁂'), product: kind('product', '▣'), own: kind('own', '✎') },
  nodeStates: { open: kind('open', '○'), lit: kind('lit', '●'), answered: kind('answered', '✓'), must: kind('must', '!'), nice: kind('nice', '+'), irrelevant: kind('irrelevant', '–'),
    candidate: kind('candidate', '○'), shortlisted: kind('shortlisted', '◆'), chosen: kind('chosen', '★'), rejected: kind('rejected', '×'), dismissed: kind('dismissed', '◌') },
  legend: [],
  statsSummary(subject) { const s = headerStats(subject.rooms.choose); const n = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;
    return { text: `${n(s.needs, 'need', 'needs')} · ${n(s.criteria, 'criterion', 'criteria')} · ${s.shortlisted} shortlisted`, tooltip: '' }; },
  newSubject: (title, tone, settings, direction) => newChooseSubject(title, { tone, model: settings.provider.defaultModel, effort: settings.provider.defaultEffort,
    locale: localeOf(chooseSettings(settings)), needsNote: direction }, settings.user.displayName),
  validate: validateChoose, summarize: chooseSummary, subjectMenu: SubjectMenu,
};
