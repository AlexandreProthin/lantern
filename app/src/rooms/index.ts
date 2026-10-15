import type { RoomDefinition } from '../frame/room';
import { learnRoom } from './learn/definition';

/** RS-4: the one list of rooms, in registration order (Learn, then Choose when it ships). */
export const rooms: readonly RoomDefinition[] = [learnRoom];
/** Development builds opened with ?sampleRoom add a sample second room, to test the frame with
 * two rooms (RS-5, RS-12, RS-23). Release builds drop the import: import.meta.env.DEV is false there. */
export async function roomsWithDevSample(): Promise<readonly RoomDefinition[]> {
  const query = new URLSearchParams(location.search);
  if (import.meta.env.DEV && query.has('sampleRoom')) return [...rooms, (await import('./sample/definition')).sampleRoom];
  /** v0.2.0 B4: the Choose room is reachable in development builds with ?chooseRoom until its acceptance (B5). */
  if (import.meta.env.DEV && query.has('chooseRoom')) return [...rooms, (await import('./choose/definition')).chooseRoom];
  return rooms;
}
