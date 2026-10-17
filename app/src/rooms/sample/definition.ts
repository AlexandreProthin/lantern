import type { RoomDefinition, RoomSession } from '../../frame/room';
import { createSubject } from '../../core/model';
import { FakeProvider } from '../learn/fake-provider';
import SampleSpace from './SampleSpace.svelte';
import SampleSettings from './SampleSettings.svelte';
import SampleMenu from './SampleMenu.svelte';
import './sample.css';
import { glyphs } from '../../ui/glyphs';

/** A development-only second room for the frame's tests (see rooms/index.ts). No prompts, no generation. */
export const sampleRoom: RoomDefinition = {
  id:'sample', name:'Sample', accent:{ '--accent':'#4fc1c0' },
  spaces:[{ id:'welcome',label:'Welcome',icon:glyphs.welcome,shortcutIndex:1,component:SampleSpace },{ id:'gallery',label:'Gallery',icon:glyphs.gallery,shortcutIndex:2,component:SampleSpace }],
  defaultSpace:'welcome', settingsMenu:SampleSettings,
  settings:{ defaults:{ note:'' }, validate:stored => ({ note:'', ...stored, ...(typeof stored.note === 'string' ? {} : { note:'' }) }) },
  defaultTone:() => 'curious',
  prompts:{ version:'sample-0', createSession:(subject, _provider, save, render): RoomSession => ({ subject, running:null,
    setFocus(id) { subject.rooms.sample.focusId = id; save(); render(); }, cancel() {}, touch() { save(); render(); }, async initialize() {} }) },
  applySettings() {}, fakeProvider:(delay, error) => new FakeProvider(delay, error),
  nodeKinds:{ subject:{ label:'subject', glyph:'○' } }, nodeStates:{ open:{ label:'open', glyph:'○' } }, legend:[],
  statsSummary:subject => ({ text:`${Object.keys(subject.rooms.sample.nodes).length} nodes`, tooltip:'' }),
  newSubject:(title, _tone, settings) => createSubject(title, 'sample', { model:settings.provider.defaultModel, effort:settings.provider.defaultEffort, data:{}, root:{ kind:'subject', state:'open' } }, settings.user.displayName),
  validate() {}, summarize:visit => ({ total:Object.values(visit.states).reduce((sum, n) => sum + n, 0) }), subjectMenu:SampleMenu
};
