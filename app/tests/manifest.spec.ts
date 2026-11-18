import { test, expect } from '@playwright/test';
// NW-44: the page links a web manifest that makes Lantern installable on a phone; no service worker.
test('NW-44: the manifest is linked, served and names its icons', async ({ page, request }) => {
  await page.goto('/');
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(href).toBe('/manifest.webmanifest');
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute('href', '/icons/apple-touch-icon.png');
  const response = await request.get(href!);
  expect(response.ok()).toBe(true);
  const manifest = await response.json();
  expect(manifest).toMatchObject({ name: 'Lantern', start_url: '/', display: 'standalone', background_color: '#101827', theme_color: '#101827' });
  const sizes = manifest.icons.map((icon: { sizes: string }) => icon.sizes);
  expect(sizes).toEqual(expect.arrayContaining(['192x192', '512x512']));
  expect(manifest.icons.some((icon: { purpose?: string }) => icon.purpose === 'maskable')).toBe(true);
  for (const icon of [...manifest.icons, { src: '/icons/apple-touch-icon.png' }]) {
    const image = await request.get(icon.src);
    expect(image.ok(), icon.src).toBe(true);
    expect(image.headers()['content-type']).toContain('image/png');
  }
  expect(await page.evaluate(() => navigator.serviceWorker?.getRegistrations().then(r => r.length) ?? 0)).toBe(0);
});
