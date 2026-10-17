import type { RoomDefinition } from '../../frame/room';
import { strings } from '../../ui/strings';
import { stats } from './stats';
import { learnSummary, newLearnSubject, validateLearn } from './rules';
import { learnSettings, learnSettingsDefaults, validateLearnSettings } from './settings';
import { LearnSession } from './session';
import { promptVersion } from './prompts';
import { FakeProvider } from './fake-provider';
import Welcome from './Welcome.svelte';
import Gallery from './Gallery.svelte';
import Study from './Study.svelte';
import LearnSettings from './LearnSettings.svelte';
import SubjectMenu from './SubjectMenu.svelte';
import { learnCompanion } from './companion';
import { glyphs } from '../../ui/glyphs';
export const learnRoom: RoomDefinition = {
  id:'learn', name:strings.learn, accent:{ '--accent':'#e8b66e' },
  spaces:[{ id:'welcome',label:strings.welcome,icon:glyphs.welcome,shortcutIndex:1,component:Welcome },{id:'study',label:strings.study,icon:glyphs.study,shortcutIndex:2,component:Study},{id:'gallery',label:strings.gallery,icon:glyphs.gallery,shortcutIndex:3,component:Gallery}],
  defaultSpace:'study', settingsMenu:LearnSettings,
  settings:{ defaults:learnSettingsDefaults, validate:validateLearnSettings },
  defaultTone:settings => learnSettings(settings).defaultTone,
  prompts:{ version:promptVersion, createSession:(subject,provider,save,render,settings) => new LearnSession(subject,provider,save,render,settings.user.displayName,learnSettings(settings).contextBudget) },
  applySettings(session, settings) { const learn = session as LearnSession; learn.displayName = settings.user.displayName; learn.budgetTokens = learnSettings(settings).contextBudget; },
  fakeProvider:(delay, error) => new FakeProvider(delay, error),
  nodeKinds:Object.fromEntries(['subject','axis','deeper','application','adjacent','exercise','question','own'].map(kind => [kind,{label:kind,glyph:kind === 'question' ? '◇' : '○'}])),
  nodeStates:{open:{label:'open',glyph:'○'},lit:{label:'lit',glyph:'●'},understood:{label:'understood',glyph:'✓'},dismissed:{label:'dismissed',glyph:'◌'}},
  legend:[{label:'open',glyph:'○'},{label:'lit',glyph:'●'},{label:'demonstrated',glyph:'✓'},{label:'self-declared',glyph:'✓'},{label:'dismissed',glyph:'◌'},{label:'question',glyph:'◇'}],
  statsSummary(subject) { const s = stats(subject.rooms.learn); return {text:strings.headerStats(s.lit,s.understood,s.dark),tooltip:`${s.input} in / ${s.output} out`}; },
  newSubject:(title,tone,settings,direction) => newLearnSubject(title,{tone,model:settings.provider.defaultModel,effort:settings.provider.defaultEffort,direction},settings.user.displayName),
  validate:validateLearn, summarize:learnSummary, subjectMenu:SubjectMenu, companion:learnCompanion
};
