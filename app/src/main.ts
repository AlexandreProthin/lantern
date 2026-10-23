import { mount, unmount } from 'svelte';
import './ui/app.css';
import Shell from './frame/Shell.svelte';
import { rooms } from './rooms';
import { remote } from './frame/host';
// RS-30: first paint in the first room's palette; the shell switches to the last used room.
document.documentElement.dataset.room = rooms[0].id;
const target = document.getElementById('app')!;
// NW-11, NW-32: on another device, the shell waits until this browser is paired.
async function pairedFirst(): Promise<void> {
  const { paired } = await import('./frame/ipc');
  if (await paired().catch(() => false)) { if (location.hash.includes('pair=')) history.replaceState(null, '', location.pathname + location.search); return; }
  const Pair = (await import('./frame/Pair.svelte')).default;
  await new Promise<void>(resolve => { const screen = mount(Pair, { target, props: { paired: () => { void unmount(screen); resolve(); } } }); });
}
// The web demo build seeds its prepared subject before the shell reads the library.
const ready = import.meta.env.VITE_DEMO ? import('./demo/start').then(m => m.startDemo()) : remote ? pairedFirst() : Promise.resolve();
void ready.then(() => mount(Shell, { target }));
