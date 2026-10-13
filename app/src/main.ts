import { mount } from 'svelte';
import './ui/app.css';
import Shell from './frame/Shell.svelte';
import { rooms } from './rooms';
// RS-30: first paint in the first room's palette; the shell switches to the last used room.
document.documentElement.dataset.room = rooms[0].id;
mount(Shell, { target: document.getElementById('app')! });
