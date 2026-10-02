import type { RoomDefinition } from '../../frame/room';
import { createSubject } from '../../core/model';
import { stats } from '../../core/stats';
import { strings } from '../../ui/strings';
import { LearnSession } from './session';
import { promptVersion } from './prompts';
import Welcome from './Welcome.svelte';
import Gallery from './Gallery.svelte';
import Study from './Study.svelte';
import LearnSettings from './LearnSettings.svelte';
export const learnRoom: RoomDefinition = {
  id:'learn', name:strings.learn, accent:{ '--accent':'#e8b66e' },
  spaces:[{ id:'welcome',label:strings.welcome,icon:'⌂',shortcutIndex:1,component:Welcome },{id:'study',label:strings.study,icon:'⌘',shortcutIndex:2,component:Study},{id:'gallery',label:strings.gallery,icon:'▦',shortcutIndex:3,component:Gallery}],
  defaultSpace:'study', settingsMenu:LearnSettings,
  prompts:{ version:promptVersion, createSession:(subject,provider,save,render,settings) => new LearnSession(subject,provider,save,render,settings.user.displayName,settings.learn.contextBudget) },
  nodeKinds:Object.fromEntries(['subject','axis','deeper','application','adjacent','exercise','question','own'].map(kind => [kind,{label:kind,glyph:kind === 'question' ? '◇' : '○'}])),
  nodeStates:{open:{label:'open',glyph:'○'},lit:{label:'lit',glyph:'●'},understood:{label:'understood',glyph:'✓'},dismissed:{label:'dismissed',glyph:'◌'}},
  legend:[{label:'open',glyph:'○'},{label:'lit',glyph:'●'},{label:'demonstrated',glyph:'✓'},{label:'self-declared',glyph:'✓'},{label:'dismissed',glyph:'◌'},{label:'question',glyph:'◇'}],
  statsSummary(subject) { const s = stats(subject.rooms.learn); return {text:strings.headerStats(s.lit,s.understood,s.dark),tooltip:`${s.input} in / ${s.output} out`}; },
  newSubject:(title,tone,settings) => createSubject(title,'learn',{tone,model:settings.provider.defaultModel,effort:settings.provider.defaultEffort},settings.user.displayName)
};
