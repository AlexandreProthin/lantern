import type { RoomDefinition } from '../frame/room';
import { learnRoom } from './learn/definition';

/** RS-4: the one list of rooms, in registration order (Learn, then Choose when it ships). */
export const rooms: readonly RoomDefinition[] = [learnRoom];
/** Development builds opened with ?sampleRoom add a sample second room, to test the frame with
 * two rooms (RS-5, RS-12, RS-23). Release builds drop the import: import.meta.env.DEV is false there. */
export async function roomsWithDevSample(): Promise<readonly RoomDefinition[]> {
  if (import.meta.env.DEV && new URLSearchParams(location.search).has('sampleRoom')) return [...rooms, (await import('./sample/definition')).sampleRoom];
  return rooms;
}
