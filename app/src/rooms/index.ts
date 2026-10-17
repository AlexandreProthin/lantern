import type { RoomDefinition } from '../frame/room';
import type { InferenceProvider } from '../frame/provider';
import { learnRoom } from './learn/definition';
import { chooseRoom } from './choose/definition';

/** The web demo build (VITE_DEMO) is Learn alone, answered by prepared text instead of the fake provider. */
const demoLearn: RoomDefinition = { ...learnRoom, fakeProvider: (): InferenceProvider => ({
  stream: async (request, onText) => (await import('../demo/scripts')).demoTutor.stream(request, onText) }) };
/** RS-4: the one list of rooms, in registration order. Choose ships with v0.3.0. */
export const rooms: readonly RoomDefinition[] = import.meta.env.VITE_DEMO ? [demoLearn] : [learnRoom, chooseRoom];
/** Development builds opened with ?sampleRoom add a sample third room, to test the frame with more rooms
 * (RS-5, RS-12, RS-23). Release builds drop the import: import.meta.env.DEV is false there. */
export async function roomsWithDevSample(): Promise<readonly RoomDefinition[]> {
  const query = new URLSearchParams(location.search);
  if (import.meta.env.VITE_DEMO) return rooms;
  /** ?singleRoom keeps Learn alone, so the one-room frame (RS-5) stays testable. */
  if (import.meta.env.DEV && query.has('singleRoom')) return [learnRoom];
  if (import.meta.env.DEV && query.has('sampleRoom')) return [...rooms, (await import('./sample/definition')).sampleRoom];
  return rooms;
}
