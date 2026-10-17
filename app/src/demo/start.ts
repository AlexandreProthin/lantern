// Web demo only: puts the prepared TCP subject in the library as a recent project, once per release,
// and adds the demo banner. Runs before the shell mounts, so the library finds the subject.
import { mount } from 'svelte';
import tcp from '../../demo/subjects/how-tcp-congestion-control-works-demo.json';
import DemoBanner from './DemoBanner.svelte';

const SEEDED = 'lantern.demo.seeded';
const DAY = 86_400_000;

export function startDemo(): void {
  try {
    if (localStorage.getItem(SEEDED) !== __APP_VERSION__) {
      localStorage.setItem(`lantern.subject.${tcp.id}`, JSON.stringify(tcp));
      const recents = JSON.parse(localStorage.getItem('lantern.recents') ?? '[]') as string[];
      const opened = JSON.parse(localStorage.getItem('lantern.lastOpenedAt') ?? '{}') as Record<string, string>;
      localStorage.setItem('lantern.recents', JSON.stringify([tcp.id, ...recents.filter(id => id !== tcp.id)]));
      localStorage.setItem('lantern.lastOpenedAt', JSON.stringify({ ...opened, [tcp.id]: opened[tcp.id] ?? new Date(Date.now() - DAY).toISOString() }));
      localStorage.setItem(SEEDED, __APP_VERSION__);
    }
  } catch { /* storage blocked: the demo still opens, with an empty library */ }
  mount(DemoBanner, { target: document.body });
}

/** Forgets everything the demo stored in this browser and starts again. */
export function resetDemo(): void {
  try { for (const k of Object.keys(localStorage)) if (k.startsWith('lantern.')) localStorage.removeItem(k); } catch { /* nothing to clear */ }
  location.reload();
}
