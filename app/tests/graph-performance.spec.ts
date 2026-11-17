import { test, expect, type Page } from '@playwright/test';

// GV-110..114, GV-14, GV-62: what a big map costs to open, to grow and to zoom, on 117 nodes (a course: a subject,
// 9 modules, their lessons) and 300 nodes (three children each). It runs by default with generous budgets, so a
// regression of several times shows anywhere; LANTERN_PERF=1 applies the strict ones, for an idle machine.
const strict = process.env.LANTERN_PERF === '1';

type Node = { id: string; parents: string[]; title: string; hook: string; kind: string; state: string; content: string;
  author: { kind: string; by: string }; dialogue: never[]; createdAt: string; createdBy: string };
/** A Learn subject of `n` lit nodes, each with about 3 KB of text like a real lesson. `course`: 9 modules under the
 * subject and the lessons spread over them; otherwise each node has three children. */
function subject(n: number, course: boolean) {
  const filler = 'This mechanism connects what we can observe to how it works. '.repeat(55);
  const at = (i: number) => new Date(Date.UTC(2026, 0, 1, 0, 0, i)).toISOString();
  const nodes: Record<string, Node> = {}, ids: string[] = [];
  for (let i = 0; i < n; i++) {
    const id = 'n' + String(i).padStart(7, '0');
    const parent = i === 0 ? [] : course ? [ids[i <= 9 ? 0 : 1 + (i - 10) % 9]] : [ids[Math.floor((i - 1) / 3)]];
    nodes[id] = { id, parents: parent, title: i === 0 ? `Synthetic ${n}` : course && i <= 9 ? `M${i}. Module ${i}` : `Concept number ${i} of the course`,
      hook: 'A short hook', kind: i === 0 ? 'subject' : 'deeper', state: 'lit', content: filler, author: { kind: 'user', by: 'x' },
      dialogue: [], createdAt: at(i), createdBy: 'user' };
    ids.push(id);
  }
  return { format: 'lantern/2', id: `synthetic-${n}`, title: `Synthetic ${n}`, createdAt: at(0),
    rooms: { learn: { model: 'opus', effort: 'medium', data: { tone: 'curious' }, focusId: ids[0], rootId: ids[0], log: [], nodes } } };
}

/** Frame intervals and long tasks, collected from the page's first script on. */
const probe = () => {
  const w = window as unknown as { frames: number[]; long: number[] }; w.frames = []; w.long = []; let last = 0;
  const loop = (now: number) => { if (last) w.frames.push(now - last); last = now; requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
  try { new PerformanceObserver(list => { for (const e of list.getEntries()) w.long.push(Math.round(e.duration)); }).observe({ entryTypes: ['longtask'] }); } catch { /* no long tasks here */ }
};
const take = (page: Page) => page.evaluate(() => {
  const w = window as unknown as { frames: number[]; long: number[] }, frames = w.frames.splice(0).sort((a, b) => a - b), long = w.long.splice(0);
  return { median: frames[frames.length >> 1] ?? 0, frames: frames.length, long: long.length, longSum: long.reduce((a, b) => a + b, 0) };
});
const positions = (page: Page) => page.evaluate(() => Object.fromEntries([...document.querySelectorAll<HTMLElement>('.graph .node[data-id]')]
  .map(n => [n.dataset.id!, [parseFloat(n.style.left), parseFloat(n.style.top)]])));

/** Budgets: [default, strict]. The default ones allow for the dev server and a headless browser drawing without a
 * GPU on a busy machine (frames of about 100 ms there, most of them long tasks, so long tasks during zoom are only
 * counted strictly); the strict ones hold on an idle laptop with the production build's margin. */
const budgets = {
  117: { open: [30000, 3500], openLong: [40, 6], more: [30000, 3500], zoom: [400, 20], zoomLong: [Infinity, 3] },
  300: { open: [40000, 5000], openLong: [60, 8], more: [40000, 4000], zoom: [500, 34], zoomLong: [Infinity, 10] }
} as const;
const limit = (pair: readonly [number, number]) => strict ? pair[1] : pair[0];

for (const [n, course] of [[117, true], [300, false]] as const) {
  test(`GV-110/GV-14/GV-62: ${n} nodes open, grow and zoom within budget`, async ({ page }) => {
    test.setTimeout(240000);
    const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
    const b = budgets[n], s = subject(n, course);
    await page.goto('/');
    await page.evaluate(s => {
      localStorage.clear();
      localStorage.setItem(`lantern.subject.${s.id}`, JSON.stringify(s));
      localStorage.setItem('lantern.recents', JSON.stringify([s.id]));
      localStorage.setItem('lantern.settings', JSON.stringify({ companion: { show: false } }));
    }, s);
    await page.addInitScript(probe);

    // Opening: the layout runs to rest before it is shown (GV-112).
    const t0 = Date.now();
    await page.goto('/?study=1&resume=1');
    await expect(page.locator('.graph .node[data-id]')).toHaveCount(n, { timeout: 60000 });
    await expect(page.locator('.graph')).toHaveAttribute('data-settled', 'true', { timeout: 60000 });
    const openMs = Date.now() - t0, open = await take(page);

    // GV-62: on the fitted map the titles are hidden, except the focus, the route to it and the modules.
    await page.getByRole('button', { name: 'Recenter', exact: true }).click();
    await expect(page.locator('.world.tiny')).toHaveCount(1);
    const titles = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('.graph .node[data-id]')].map(el => {
      const name = el.querySelector<HTMLElement>('.name')!;
      return { landmark: el.classList.contains('landmark'), shown: getComputedStyle(name).visibility === 'visible', height: name.getBoundingClientRect().height };
    }));
    const landmarks = titles.filter(t => t.landmark);
    // The subject (focused, so on the route) and its modules: 9 in the course, 3 in the tree.
    expect(landmarks.length).toBe(course ? 10 : 4);
    expect(landmarks.every(t => t.shown && t.height >= 15)).toBe(true);
    expect(titles.filter(t => !t.landmark && t.shown).length).toBeLessThanOrEqual(1);

    // Zoom on the settled map.
    await page.waitForTimeout(800); await take(page);
    await page.evaluate(() => new Promise<void>(resolve => {
      const host = document.querySelector('.graph')!, rect = host.getBoundingClientRect(); let i = 0;
      const frame = () => { host.dispatchEvent(new WheelEvent('wheel', { deltaY: i % 40 < 20 ? -40 : 40, clientX: rect.x + rect.width / 2, clientY: rect.y + rect.height / 2, bubbles: true, cancelable: true }));
        if (++i < 120) requestAnimationFrame(frame); else resolve(); };
      requestAnimationFrame(frame);
    }));
    const zoom = await take(page);

    // More options on the focused node: three nodes grow; the map they join stays where it is (GV-14).
    await page.getByRole('button', { name: 'Recenter', exact: true }).click(); await page.waitForTimeout(600);
    const before = await positions(page);
    const t1 = Date.now();
    await page.locator('.panel .actions button', { hasText: 'More options' }).first().click();
    await expect(page.locator('.graph .node[data-id]')).toHaveCount(n + 3, { timeout: 60000 });
    await expect(page.locator('.graph')).toHaveAttribute('data-settled', 'true', { timeout: 60000 });
    const moreMs = Date.now() - t1, more = await take(page), after = await positions(page);
    const moved = Object.keys(before).filter(id => after[id] && Math.hypot(after[id][0] - before[id][0], after[id][1] - before[id][1]) > 40).length;

    console.log(`${n} nodes: open ${openMs} ms (long tasks ${open.long}, ${open.longSum} ms) · zoom median ${zoom.median.toFixed(1)} ms (long ${zoom.long}) · ` +
      `More options ${moreMs} ms (median frame ${more.median.toFixed(1)} ms, long ${more.long}), ${moved} of ${n} nodes moved over 40 px`);
    expect(errors).toEqual([]);
    expect(moved).toBeLessThan(n * .1);
    expect(openMs).toBeLessThan(limit(b.open)); expect(open.long).toBeLessThanOrEqual(limit(b.openLong));
    expect(zoom.median).toBeLessThan(limit(b.zoom)); expect(zoom.long).toBeLessThanOrEqual(limit(b.zoomLong));
    expect(moreMs).toBeLessThan(limit(b.more));
  });
}

test('GV-110: idle-machine 500-node pan and zoom frame budget',async({page})=>{
  test.skip(process.env.LANTERN_PERF!=='1','Run separately on an idle machine with LANTERN_PERF=1');
  test.setTimeout(60000);
  await page.goto('/');
  const baseline=await page.evaluate(()=>new Promise<number>(resolve=>{let last=0;const samples:number[]=[];
    function frame(now:number){if(last)samples.push(now-last);last=now;if(samples.length<60)requestAnimationFrame(frame);else resolve(samples.sort((a,b)=>a-b)[30]);}requestAnimationFrame(frame);
  }));console.log(`GV-110: empty-view frame median=${baseline.toFixed(2)}ms`);
  await page.evaluate(async()=>{
    // Browser dev harness imports the same domain operations used by Study.
    const {newLearnSubject}=await import('/src/rooms/learn/rules.ts' as string);
    const {addChild}=await import('/src/core/graph.ts' as string);
    const s=newLearnSubject('500-node performance'),v=s.rooms.learn;v.nodes[v.rootId].state='lit';
    for(let i=1;i<500;i++)addChild(v,v.rootId,{title:`Node ${i}`,kind:'axis',state: 'open', createdBy: 'model'});
    localStorage.setItem(`lantern.subject.${s.id}`,JSON.stringify(s));localStorage.setItem('lantern.recents',JSON.stringify([s.id]));
    localStorage.setItem('lantern.settings',JSON.stringify({appearance:{reduceMotion:'on'}}));
  });
  await page.goto('/?study=1&resume=1');await expect(page.locator('.node')).toHaveCount(500);
  // Wait for layout to stop changing rather than assuming a fixed settlement time.
  await expect(page.locator('.graph')).toHaveAttribute('data-settled','true',{timeout:45000});
  // Pre-settle the fixture, then measure pan/zoom with normal motion restored.
  await page.getByRole('button',{name:'Settings',exact:true}).click();
  await page.getByRole('dialog').getByRole('button',{name:'Appearance',exact:true}).click();
  await page.getByRole('dialog').getByRole('combobox',{name:'Reduce motion'}).selectOption('system');
  await page.getByRole('dialog').getByRole('button',{name:'Close',exact:true}).click();
  await expect(page.locator('.graph')).toHaveAttribute('data-reduced','false');
  const before=await page.locator('.node').last().getAttribute('style');
  const cdp=await page.context().newCDPSession(page);await cdp.send('Performance.enable');
  const initialMetrics=await cdp.send('Performance.getMetrics');
  const intervals=await page.evaluate(()=>new Promise<number[]>(resolve=>{
    const host=document.querySelector('.graph')!,rect=host.getBoundingClientRect(),samples:number[]=[];let last=0;
    function frame(now:number){if(last)samples.push(now-last);last=now;
      host.dispatchEvent(new WheelEvent('wheel',{deltaY:samples.length%2?1:-1,clientX:rect.x+rect.width/2,clientY:rect.y+rect.height/2,bubbles:true,cancelable:true}));
      if(samples.length<120)requestAnimationFrame(frame);else resolve(samples);}
    requestAnimationFrame(frame);
  }));
  const sorted=[...intervals].sort((a,b)=>a-b),median=sorted[60],p95=sorted[114];
  const finalMetrics=await cdp.send('Performance.getMetrics');
  for(const name of ['ScriptDuration','RecalcStyleDuration','LayoutDuration','TaskDuration']) {
    console.log(`${name}: ${((finalMetrics.metrics.find((m:any)=>m.name===name)?.value??0)-(initialMetrics.metrics.find((m:any)=>m.name===name)?.value??0)).toFixed(3)}s`);
  }
  console.log(`GV-110: 500 nodes, frame median=${median.toFixed(2)}ms p95=${p95.toFixed(2)}ms`);
  test.skip(baseline>=20,'The empty browser view is below 60 Hz; this machine cannot verify the 60 fps requirement');
  expect(median).toBeLessThan(20);expect(p95).toBeLessThan(34);
  expect(await page.locator('.node').last().getAttribute('style')).toBe(before);
});
