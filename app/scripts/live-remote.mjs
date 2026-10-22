// NW live check: the page a paired phone gets from Lantern on the network.
// Usage: node scripts/live-remote.mjs <token> [base]   (the app runs with the server on, debug build)
import { chromium } from '@playwright/test';
const [token, base = 'https://localhost:4317'] = process.argv.slice(2);
if (!token) { console.error('usage: node scripts/live-remote.mjs <token> [base]'); process.exit(2); }
const browser = await chromium.launch();
const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const page = await context.newPage();
const errors = []; page.on('pageerror', e => errors.push(e.message));
const check = (name, ok) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}`); if (!ok) process.exitCode = 1; };

await page.goto(base);
await page.getByRole('heading', { name: 'Pair this device with Lantern' }).waitFor();
check('an unpaired browser sees the pairing screen', true);
await page.getByLabel('Pairing code').fill('WRONG123');
await page.getByRole('button', { name: 'Pair' }).click();
await page.getByRole('alert').waitFor();
check('a wrong code is refused on the screen', /wrong|Too many/.test(await page.getByRole('alert').innerText()));
await page.screenshot({ path: 'test-results/live-pair.png' });

const host = new URL(base).hostname;
await context.addCookies([{ name: 'lantern_device', value: token, domain: host, path: '/', secure: true, httpOnly: true, sameSite: 'Strict' }]);
await page.goto(base);
await page.locator('header .subject-field').waitFor();
check('a paired browser gets the shell', true);
check('no window controls on a device', await page.locator('header .controls, .window-controls').count() === 0);
await page.getByRole('button', { name: 'Settings' }).click();
const dialog = page.locator('dialog.settings');
await dialog.waitFor();
check('no Network section on a device', await dialog.getByRole('button', { name: 'Network', exact: true }).count() === 0);
check('the library is managed on the desktop', await dialog.getByText('managed on the computer running Lantern').isVisible());
check('Settings shows the desktop\'s name', (await dialog.getByLabel('Display name').inputValue()).length > 0);
await page.screenshot({ path: 'test-results/live-settings.png' });
await dialog.getByRole('button', { name: 'Close' }).click();
check('no horizontal scroll', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
await page.screenshot({ path: 'test-results/live-home.png' });
check('no page errors', errors.length === 0);
if (errors.length) console.log(errors);
await browser.close();
