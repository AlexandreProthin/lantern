import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vitest/config';
import pkg from './package.json' with { type: 'json' };
// `--mode demo` (npm run build:demo, .env.demo) builds the static web demo: relative paths so it works
// under any folder (GitHub Pages serves it at /lantern/), its own output folder, and a description.
const demoDescription = 'Lantern web demo: learn with an AI tutor on a graph of ideas. Prepared answers, nothing leaves your browser.';
// LANTERN_PORT moves the dev server off 1431, so several checkouts can run their browser tests at once.
const port = Number(process.env.LANTERN_PORT ?? 1431);
export default defineConfig(({ mode }) => ({
  plugins: [svelte(), ...(mode === 'demo' ? [{ name: 'demo-html', transformIndexHtml: (html: string) =>
    html.replace('<title>Lantern</title>', `<title>Lantern · Web demo</title><meta name="description" content="${demoDescription}"/>`) }] : [])],
  base: mode === 'demo' ? './' : '/', clearScreen: false, define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  build: mode === 'demo' ? { outDir: 'dist-demo' } : {},
  server: { port, strictPort: true, watch: { ignored: ['**/src-tauri/**'] } },
  test: { include: ['src/**/*.test.ts'] }
}));
