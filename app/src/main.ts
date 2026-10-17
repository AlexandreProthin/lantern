import { mount } from 'svelte';
import './ui/app.css';
import Shell from './frame/Shell.svelte';
import { rooms } from './rooms';
// RS-30: first paint in the first room's palette; the shell switches to the last used room.
document.documentElement.dataset.room = rooms[0].id;
// The web demo build seeds its prepared subject before the shell reads the library.
const ready = import.meta.env.VITE_DEMO ? import('./demo/start').then(m => m.startDemo()) : Promise.resolve();
void ready.then(() => mount(Shell, { target: document.getElementById('app')! }));
