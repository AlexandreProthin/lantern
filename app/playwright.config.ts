import { defineConfig } from '@playwright/test';
// LANTERN_PORT (default 1431) lets parallel checkouts each run their own dev server; an existing server is reused only on that port.
const url = `http://127.0.0.1:${process.env.LANTERN_PORT ?? 1431}`;
export default defineConfig({
  testDir: './tests', use: { baseURL: url },
  webServer: { command: 'npm run dev -- --host 127.0.0.1', url, reuseExistingServer: !process.env.CI, env: { VITE_PROVIDER: 'fake' } }
});
