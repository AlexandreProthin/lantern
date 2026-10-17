// Captures the README images from the demo subjects, in the web build (fake provider).
// Needs the dev server (npm run dev, port 1431) and ffmpeg on PATH. Run from app/: npx tsx demo/capture.ts
// Writes ../docs/images/learn-study.png, choose-compare.png and learn-flow.gif.
import { chromium } from '@playwright/test';
import type { Browser, Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tcpScript } from './learn-tcp';

const fastRetransmitReply = tcpScript.light['Fast retransmit'].trim();

const BASE = 'http://localhost:1431';
const images = fileURLToPath(new URL('../../docs/images/', import.meta.url));
const subject = (file: string) => JSON.parse(readFileSync(new URL(`./subjects/${file}.json`, import.meta.url), 'utf8'));
const tcp = subject('how-tcp-congestion-control-works-demo'), keyboard = subject('quiet-mechanical-keyboard-demo');
const ffmpeg = (...args: string[]) => execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...args], { stdio: 'inherit' });

/** Seeds one subject into the web build's storage, with Amber's first-run notes already seen. */
async function seed(page: Page, s: { id: string }, room: 'learn' | 'choose', extra: Record<string, unknown> = {}) {
  await page.addInitScript(({ s, room, extra }) => {
    if (sessionStorage.getItem('demo.seeded')) return;
    localStorage.clear();
    localStorage.setItem(`lantern.subject.${s.id}`, JSON.stringify(s));
    localStorage.setItem('lantern.recents', JSON.stringify([s.id]));
    localStorage.setItem('lantern.settings', JSON.stringify({ format: 'lantern-settings/1', ui: { lastRoom: room }, ...extra }));
    localStorage.setItem('lantern.companion', JSON.stringify({ spots: {}, seenTips: [], lastVersion: '0.4.0', lastGreeting: 'greet.1' }));
    sessionStorage.setItem('demo.seeded', '1');
  }, { s, room, extra });
}

/** Drags the graph sideways from an empty corner, so the leftmost branch is not cut. */
async function pan(page: Page, dx: number) {
  await page.mouse.move(160, 150); await page.mouse.down();
  await page.mouse.move(160 + dx, 150, { steps: 12 }); await page.mouse.up(); await page.waitForTimeout(600);
}

async function learnStill(browser: Browser) {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2, colorScheme: 'dark' });
  await seed(page, tcp, 'learn');
  await page.goto(`${BASE}/?study=1&resume=1`);
  await page.locator('[data-id="aimd"]').waitFor();
  await page.waitForTimeout(7000); // let the graph settle
  await pan(page, 90);
  const raw = join(work, 'learn.png');
  await page.screenshot({ path: raw });
  ffmpeg('-i', raw, '-vf', 'scale=1800:-1:flags=lanczos', join(images, 'learn-study.png'));
  await page.close();
}

async function chooseStill(browser: Browser) {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2, colorScheme: 'dark' });
  await seed(page, keyboard, 'choose', { companion: { show: false } }); // Amber's bubble would cover a column
  await page.goto(`${BASE}/?chooseRoom&study=1&resume=1`);
  await page.getByRole('button', { name: 'Compare', exact: true }).click();
  const table = page.locator('main.compare table');
  await table.waitFor(); await page.waitForTimeout(1500);
  const box = (await table.boundingBox())!;
  const raw = join(work, 'choose.png');
  await page.screenshot({ path: raw, clip: { x: 0, y: 0, width: 1600, height: Math.ceil(box.y + box.height + 24) } });
  ffmpeg('-i', raw, '-vf', 'scale=1600:-1:flags=lanczos', join(images, 'choose-compare.png'));
  await page.close();
}

async function learnGif(browser: Browser) {
  const size = { width: 1280, height: 800 };
  const context = await browser.newContext({ viewport: size, colorScheme: 'dark', recordVideo: { dir: work, size } });
  const page = await context.newPage();
  // The scripted tutor: the fake provider asks window.__lanternDemo first, so "Fast retransmit" streams written text.
  await page.route('**/src/rooms/learn/fake-provider.ts*', async route => {
    const response = await route.fetch(), body = await response.text();
    const patched = body.replace('const text = this.response ??', 'const text = globalThis.__lanternDemo?.(req.prompt) ?? this.response ??')
      .replace(/model: ["']fake-tutor["'], usage/, "model: 'claude-opus-5-5', usage");
    if (patched.split('claude-opus-5-5').length !== 2 || !patched.includes('__lanternDemo')) throw new Error('fake-provider.ts changed: update the scripted tutor patch in demo/capture.ts');
    await route.fulfill({ response, body: patched });
  });
  await page.addInitScript(reply => {
    // Freeze the drifting backdrop (it reads this query from script): every frame changing would bloat the GIF.
    const match = matchMedia.bind(window);
    window.matchMedia = query => query === '(prefers-reduced-motion: reduce)' ? { ...match(query), matches: true, addEventListener() {}, removeEventListener() {} } as MediaQueryList : match(query);
    (globalThis as any).__lanternDemo = (prompt: string) => prompt.includes('The learner chose: "Fast retransmit"') ? reply : undefined;
    // Video has no pointer: draw one that follows the mouse.
    addEventListener('DOMContentLoaded', () => {
      const dot = document.createElement('div');
      dot.style.cssText = 'position:fixed;z-index:99999;width:18px;height:18px;margin:-9px 0 0 -9px;border-radius:50%;background:rgba(255,255,255,.85);box-shadow:0 0 0 3px rgba(0,0,0,.35);pointer-events:none;transition:transform .12s;left:-40px;top:-40px';
      document.body.append(dot);
      addEventListener('mousemove', e => { dot.style.left = `${e.clientX}px`; dot.style.top = `${e.clientY}px`; }, true);
      addEventListener('mousedown', () => dot.style.transform = 'scale(.7)', true);
      addEventListener('mouseup', () => dot.style.transform = '', true);
    });
  }, fastRetransmitReply);
  await seed(page, { ...tcp, rooms: { learn: { ...tcp.rooms.learn, focusId: 'loss' } } }, 'learn');
  const start = Date.now();
  await page.goto(`${BASE}/?study=1&resume=1&delay=55`);
  await page.locator('[data-id="fastrx"]').waitFor();
  await page.waitForTimeout(6000); // settle; trimmed from the GIF below
  const trim = (Date.now() - start) / 1000 - 0.8;
  await page.mouse.move(size.width * 0.75, size.height * 0.6);
  const glide = async (target: ReturnType<Page['locator']>) => {
    const b = (await target.boundingBox())!;
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 28 }); await page.waitForTimeout(250);
    await page.mouse.down(); await page.waitForTimeout(90); await page.mouse.up();
  };
  await page.waitForTimeout(500);
  await glide(page.locator('[data-id="fastrx"]'));
  await page.waitForTimeout(1100);
  await glide(page.getByRole('button', { name: 'Light it up' }));
  await page.getByText('SACK: say exactly what is missing').first().waitFor({ timeout: 20000 });
  await page.waitForTimeout(2800);
  await glide(page.getByRole('button', { name: 'I get it' }));
  await page.waitForTimeout(2600);
  const video = await page.video()!.path();
  await context.close();
  const filters = `trim=start=${trim.toFixed(2)},setpts=PTS-STARTPTS,fps=12,scale=960:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle`;
  ffmpeg('-i', video, '-filter_complex', filters, join(images, 'learn-flow.gif'));
}

const work = mkdtempSync(join(tmpdir(), 'lantern-shots-'));
const browser = await chromium.launch();
try {
  await learnStill(browser);
  await chooseStill(browser);
  await learnGif(browser);
  for (const f of readdirSync(images)) console.log(`docs/images/${f}`);
} finally { await browser.close(); rmSync(work, { recursive: true, force: true }); }
