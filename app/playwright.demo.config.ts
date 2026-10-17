import { defineConfig } from '@playwright/test';
// The web demo's end-to-end check, run against the built site (npm run build:demo first): npm run test:demo.
// Kept apart from playwright.config.ts, whose dev server is the normal web build.
export default defineConfig({
  testDir: './demo', testMatch: '*.spec.ts', use: { baseURL: 'http://127.0.0.1:1433' },
  webServer: { command: 'npx vite preview --mode demo --host 127.0.0.1 --port 1433 --strictPort', url: 'http://127.0.0.1:1433', reuseExistingServer: !process.env.CI }
});
