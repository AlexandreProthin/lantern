import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vitest/config';
import pkg from './package.json' with { type: 'json' };
export default defineConfig({
  plugins: [svelte()], clearScreen: false, define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  server: { port: 1431, strictPort: true, watch: { ignored: ['**/src-tauri/**'] } },
  test: { include: ['src/**/*.test.ts'] }
});
