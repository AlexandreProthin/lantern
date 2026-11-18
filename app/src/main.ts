import { mount, unmount } from 'svelte';
import './ui/app.css';
import Shell from './frame/Shell.svelte';
import { rooms } from './rooms';
import { remote } from './frame/host';
import { applyAppearance } from './frame/theme.svelte';
import { textSizes, themes, type TextSize, type Theme } from './frame/settings';
// RS-30: first paint in the first room's palette; the shell switches to the last used room.
document.documentElement.dataset.room = rooms[0].id;
// SE-60/61: in the browser build the stored text size and theme are known now, so the first paint already
// uses them; the desktop's settings arrive with the shell, which applies them the same way.
try {
  const appearance = (JSON.parse(localStorage.getItem('lantern.settings') ?? '{}') as { appearance?: { textSize?: unknown; theme?: unknown } }).appearance ?? {};
  applyAppearance(textSizes.includes(appearance.textSize as TextSize) ? appearance.textSize as TextSize : 'default', themes.includes(appearance.theme as Theme) ? appearance.theme as Theme : 'dark');
} catch { applyAppearance('default', 'dark'); }
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
