// Web demo only, loaded on the first generation: the scripted tutor with every prepared subject.
// ?demoFast skips the model-like wait (tests and captures).
import { prepared, ScriptedTutor } from './tutor';
import { tcpScript } from '../../demo/learn-tcp';
import { blenderScript } from '../../demo/learn-blender';

const fast = new URLSearchParams(location.search).has('demoFast');
export const demoTutor = new ScriptedTutor([tcpScript, blenderScript].map(prepared), fast ? () => 40 : undefined, fast ? 1 : undefined);
