import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [svelte()],
  clearScreen: false,
  server: {
    port: 1430,
    strictPort: true,
    watch: { ignored: ['**/src-tauri/**'] }
  }
});
