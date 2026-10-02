import { mount } from 'svelte';
import './ui/app.css';
import Shell from './frame/Shell.svelte';
document.documentElement.dataset.room = 'learn';
mount(Shell, { target: document.getElementById('app')! });
