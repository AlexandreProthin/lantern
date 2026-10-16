import type { RoomDefinition } from '../frame/room';
import { learnRoom } from './learn/definition';
import { chooseRoom } from './choose/definition';

/** RS-4: the one list of rooms, in registration order. Choose ships with v0.3.0. */
export const rooms: readonly RoomDefinition[] = [learnRoom, chooseRoom];
/** Development builds opened with ?sampleRoom add a sample third room, to test the frame with more rooms
 * (RS-5, RS-12, RS-23). Release builds drop the import: import.meta.env.DEV is false there. */
export async function roomsWithDevSample(): Promise<readonly RoomDefinition[]> {
  const query = new URLSearchParams(location.search);
  /** ?singleRoom keeps Learn alone, so the one-room frame (RS-5) stays testable. */
  if (import.meta.env.DEV && query.has('singleRoom')) return [learnRoom];
  if (import.meta.env.DEV && query.has('sampleRoom')) return [...rooms, (await import('./sample/definition')).sampleRoom];
  return rooms;
}
