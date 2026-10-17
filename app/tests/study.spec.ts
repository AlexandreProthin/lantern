import { test, expect } from '@playwright/test';
test('PQ-22: Study fake loop, edits, dismiss/restore and restart persistence', async ({page}) => {
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/?study=1&subject=Ocean%20tides');
  const panel=page.locator('.panel');
  await expect(panel.getByRole('button',{name:'Mechanism 1',exact:false})).toBeVisible();
  await panel.getByRole('button',{name:'Mechanism 1',exact:false}).click();
  await expect(panel.getByText('This node is still dark.')).toBeVisible();
  await panel.getByRole('button',{name:'Dismiss',exact:true}).click();
  await expect(panel.getByText('Dismissed. It will not be proposed again.')).toBeVisible();
  await panel.getByRole('button',{name:'Restore',exact:true}).click();
  await panel.getByRole('button',{name:'Light it up',exact:true}).click();
  await expect(panel.getByRole('button',{name:'Test me',exact:true})).toBeEnabled();
  await panel.getByRole('button',{name:'Edit explanation',exact:true}).click();
  await panel.getByRole('textbox',{name:'Edit explanation',exact:true}).fill('**Corrected by me.** The Moon stretches the oceans.');
  await panel.getByRole('button',{name:'Save',exact:true}).click();
  await expect(panel.getByText('edited by Learner',{exact:true})).toBeVisible();
  await expect(panel.getByRole('button',{name:'Previous version',exact:true})).toBeVisible();
  await panel.getByRole('button',{name:'Test me',exact:true}).click();
  await expect(panel.getByRole('button',{name:'Test me',exact:true})).toBeEnabled();
  const composer=panel.getByRole('textbox',{name:'Ask about this, or answer the tutor… (Ctrl+Enter to send)'});
  await composer.fill('The near and far sides are stretched in opposite directions.');await composer.press('Control+Enter');
  await expect(panel.locator('.meta')).toContainText('demonstrated');
  await expect.poll(()=>page.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('lantern.subject.')).map(k=>localStorage.getItem(k)).join(''))).toContain('demonstrated');
  await page.goto('/?study=1&resume=1');
  await expect(page.locator('.panel .meta')).toContainText('demonstrated');
  await expect(page.locator('.panel').getByText('Corrected by me.',{exact:true})).toBeVisible();
  await expect(page.locator('.panel').getByRole('button',{name:'Previous version',exact:true})).toBeVisible();
  await page.screenshot({path:'test-results/study-flow.png',fullPage:true});expect(errors).toEqual([]);
});
test('PQ-22/LR-36: cancel discards the streamed root and logs cancellation', async ({page}) => {
  await page.goto('/?study=1&subject=Cancellation&delay=500');
  const panel=page.locator('.panel');
  await expect(panel.getByRole('button',{name:'Cancel',exact:true})).toBeVisible();
  await expect(page.locator('.node[data-pending="waiting"]')).toHaveCount(3);
  await panel.getByRole('button',{name:'Cancel',exact:true}).click();
  await expect(panel.getByRole('button',{name:'Light it up',exact:true})).toBeVisible();
  await expect(page.locator('.node[data-pending]')).toHaveCount(0);
  await expect.poll(()=>page.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('lantern.subject.')).map(k=>localStorage.getItem(k)).join(''))).toContain('cancelled');
});
test('GV-92/94/96: pending bodies reveal in place and stay out of saved state', async ({page}) => {
  const errors:string[]=[]; page.on('pageerror',e=>errors.push(e.message));
  // Record pending bodies as they appear: with a short fake delay they can resolve before a locator polls.
  await page.addInitScript(()=>{const seen:{el:Element;hidden:string|null}[]=[];(window as any).__pendingSeen=seen;
    new MutationObserver(()=>document.querySelectorAll('.node[data-pending="waiting"]').forEach(el=>{if(!seen.some(s=>s.el===el))seen.push({el,hidden:el.getAttribute('aria-hidden')});}))
      .observe(document,{subtree:true,childList:true,attributes:true,attributeFilter:['data-pending']});});
  const seen=():Promise<{hidden:string|null;connected:boolean;pending:string|null;text:string}[]>=>page.evaluate(()=>(window as any).__pendingSeen.map((s:any)=>({hidden:s.hidden,connected:s.el.isConnected,pending:s.el.dataset.pending??null,text:s.el.textContent})));
  await page.goto('/?study=1&subject=Spawn&delay=60');
  await expect.poll(async()=>(await seen()).length).toBe(3);
  await expect(page.locator('.node[data-pending]')).toHaveCount(0);
  const revealed=await seen();
  for(const s of revealed){expect(s.hidden).toBe('true');expect(s).toMatchObject({connected:true,pending:null});}
  expect(new Set(revealed.map(s=>s.text.trim())).size).toBe(3);expect(revealed.map(s=>s.text).join()).toContain('Mechanism 1');
  await expect.poll(()=>page.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('lantern.subject.')).map(k=>localStorage.getItem(k)).join(''))).toContain('Mechanism 1');
  expect(await page.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('lantern.subject.')).map(k=>localStorage.getItem(k)).join(''))).not.toContain('pending-');
  await page.getByRole('button',{name:'Tree layout',exact:true}).click();
  await page.locator('.panel').getByRole('button',{name:'Mechanism 1',exact:false}).click();
  await page.locator('.panel').getByRole('button',{name:'Light it up',exact:true}).click();
  await expect.poll(async()=>(await seen()).length).toBe(6);
  await expect(page.locator('.node[data-pending]')).toHaveCount(0);
  expect(errors).toEqual([]);
});
test('GV-90/91/92: sequential branch tips, breathing, completion particles and reduced motion', async ({page}) => {
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/?study=1&subject=Branch%20motion&delay=200');
  const pending=page.locator('.node[data-pending="waiting"]');
  await expect(pending).toHaveCount(3);
  await expect(page.locator('.spawn-tip')).toHaveCount(1);
  await expect(pending.nth(0)).toHaveAttribute('data-spawn-phase','breathing');
  await expect(pending.nth(1)).toHaveAttribute('data-spawn-phase','growing');
  expect(await pending.nth(1).evaluate(el=>getComputedStyle(el).visibility)).toBe('hidden');
  await expect(page.locator('.node[data-pending="waiting"][data-spawn-phase="breathing"]')).toHaveCount(3);
  await expect(page.locator('.spawn-tip')).toHaveCount(0);
  expect(await pending.first().locator('.disc').evaluate(el=>getComputedStyle(el).animationName)).toContain('breathe');
  await expect.poll(()=>page.locator('.spawn-particle').count(),{intervals:[50],timeout:10000}).toBeGreaterThan(0);
  await page.screenshot({path:'test-results/spawn-completion.png'});
  await expect(page.locator('.spawn-light')).toHaveCount(0);
  await expect(page.locator('.node[data-pending]')).toHaveCount(0);
  // System reduction applies immediately, including to an in-flight growth sequence.
  await page.locator('.panel').getByRole('button',{name:'Mechanism 1',exact:false}).click();
  await page.locator('.panel').getByRole('button',{name:'Light it up',exact:true}).click();
  await expect(page.locator('.spawn-tip')).toHaveCount(1);
  await page.emulateMedia({reducedMotion:'reduce'});
  await expect(page.locator('.spawn-light')).toHaveCount(0);
  await expect(pending.first()).toBeVisible();
  await expect(page.locator('.node[data-pending]')).toHaveCount(0);
  await expect(page.locator('.spawn-particle')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('NP-55: math geometry, Mermaid labels, code and escaped untrusted HTML', async ({page}) => {
  const errors:string[]=[]; page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/?study=1&subject=Rendering');
  const panel=page.locator('.panel');
  await expect(panel.getByRole('button',{name:'Test me',exact:true})).toBeEnabled();
  await panel.getByRole('button',{name:'Edit explanation',exact:true}).click();
  await panel.getByRole('textbox',{name:'Edit explanation',exact:true}).fill('A fraction: $\\frac{a}{b}$, a law $1/r^2$, prices $5 and $10.\n\n```mermaid\nflowchart LR\nA[Moon] --> B[Ocean]\n```\n\n```javascript\nconst tide = 1;\n```\n\n<img src="https://example.invalid/leak" onerror="window.__lanternXss=1">\n\n[unsafe](javascript:alert(1))');
  await panel.getByRole('button',{name:'Save',exact:true}).click();
  await expect(panel.locator('.katex .vlist').first()).toBeVisible();
  expect(await panel.locator('.katex [style]').count()).toBeGreaterThan(0);
  await expect(panel.locator('[data-mermaid] svg')).toBeVisible();
  await expect(panel.locator('[data-mermaid]')).toContainText('Moon');
  await expect(panel.locator('[data-mermaid] foreignObject')).toHaveCount(0);
  // B1: Mermaid's stylesheet (with its url(#gradient)) survives sanitising, so labels stay readable.
  await expect(panel.locator('[data-mermaid] svg style')).toHaveCount(1);
  expect(await panel.locator('[data-mermaid] svg text').first().evaluate(t=>getComputedStyle(t).fill)).not.toBe('rgb(0, 0, 0)');
  // B5: a digit after `$` opens math; prices stay text.
  await expect(panel.locator('.katex')).toHaveCount(2);
  await expect(panel.locator('.md').first()).toContainText('prices $5 and $10');
  await expect(panel.locator('.hljs-keyword')).toContainText('const');
  await expect(panel.locator('img')).toHaveCount(0);
  await expect(panel.locator('a[href^="javascript:"]')).toHaveCount(0);
  expect(await page.evaluate(()=>(window as any).__lanternXss)).toBeUndefined();
  expect(errors).toEqual([]);
});
test('GV-55: node menu offers the panel actions, runs them or hands them to the panel', async ({page}) => {
  await page.goto('/?study=1&subject=Node%20menu');
  const panel=page.locator('.panel'), menu=page.locator('.node-menu');
  await expect(panel.getByRole('button',{name:'Test me',exact:true})).toBeEnabled();
  const items=()=>menu.getByRole('menuitem').evaluateAll(b=>b.map(x=>x.textContent));
  // Open node: same actions as the panel, focus moves to the node and into the menu.
  const dark=page.locator('.graph .node[data-state="open"]').first();
  await dark.click({button:'right'});
  expect(await items()).toEqual(['Light it up','Dismiss','Delete']);
  await expect(menu.getByRole('menuitem',{name:'Light it up'})).toBeFocused();
  await expect(panel.getByText('This node is still dark.')).toBeVisible();
  await page.keyboard.press('ArrowDown');await expect(menu.getByRole('menuitem',{name:'Dismiss'})).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(menu).toHaveCount(0);await expect(dark).toBeFocused();
  await expect(panel.getByRole('button',{name:'Cancel',exact:true})).toHaveCount(0);
  // Dismiss runs directly; Restore is then offered.
  await dark.click({button:'right'});await menu.getByRole('menuitem',{name:'Dismiss'}).click();
  await expect(page.locator('.graph .node[data-state="dismissed"]')).toHaveCount(1);
  await page.locator('.graph .node[data-state="dismissed"]').click({button:'right'});
  expect(await items()).toEqual(['Restore','Delete']);
  // Delete opens the panel's confirmation dialog.
  await menu.getByRole('menuitem',{name:'Delete'}).click();
  await expect(page.getByRole('dialog')).toContainText('Delete');
  await page.getByRole('dialog').getByRole('button',{name:'Cancel',exact:true}).click();
  // Root: no Delete; Add my own node opens the panel form.
  await page.locator('.graph .node[data-state="lit"]').first().click({button:'right'});
  expect(await items()).toEqual(['More options','Add my own node']);
  await menu.getByRole('menuitem',{name:'Add my own node'}).click();
  await expect(panel.getByRole('textbox',{name:'Title',exact:true})).toBeFocused();
  // A press outside closes it.
  await page.locator('.graph .node[data-state="lit"]').first().click({button:'right'});
  await page.locator('.graph').click({position:{x:30,y:300}});
  await expect(menu).toHaveCount(0);
});
test('GV-44/56: hovering a node link previews the connection; Open reports in the browser', async ({page}) => {
  await page.goto('/?study=1&subject=Link%20preview');
  const panel=page.locator('.panel');
  await expect(panel.getByRole('button',{name:'Test me',exact:true})).toBeEnabled();
  // Light a child so a grandchild exists: the root's link to it is not a tree edge.
  const child=await page.locator('.graph .node[data-state="open"]').first().getAttribute('data-id');
  await page.locator(`.graph .node[data-id="${child}"]`).click();
  await panel.getByRole('button',{name:'Light it up',exact:true}).click();
  await expect(panel.getByRole('button',{name:'Test me',exact:true})).toBeEnabled();
  let grandchild='';
  await expect.poll(async()=>grandchild=await page.evaluate(id=>{
    for(const key of Object.keys(localStorage).filter(k=>k.startsWith('lantern.subject.'))){
      const nodes=JSON.parse(localStorage.getItem(key)!).rooms.learn.nodes as Record<string,{parents:string[]}>;
      const found=Object.entries(nodes).find(([,n])=>n.parents[0]===id);if(found)return found[0];
    }
    return '';
  },child)).not.toBe('');
  await page.locator('.graph .node[data-state="lit"]').first().click();
  const root=await page.locator('.graph .node[aria-pressed="true"]').getAttribute('data-id');
  expect(root).not.toBe(child);
  await panel.getByRole('button',{name:'Edit explanation',exact:true}).click();
  await panel.getByRole('textbox',{name:'Edit explanation',exact:true}).fill(`See [the child](node:${child}) and [further](node:${grandchild}).`);
  await panel.getByRole('button',{name:'Save',exact:true}).click();
  // Child: the light rides the tree edge (no temporary curve), then goes away.
  await panel.locator('.node-link',{hasText:'the child'}).hover();
  await expect(page.locator('.edges .link-preview circle')).toHaveCount(1);
  await expect(page.locator('.edges .link-preview .preview-curve')).toHaveCount(0);
  await expect(page.locator('.edges .link-preview')).toHaveCount(0,{timeout:3000});
  // Grandchild (not adjacent): a temporary curve; leaving the link stops it.
  await panel.locator('.node-link',{hasText:'further'}).hover();
  await expect(page.locator('.edges .link-preview .preview-curve')).toHaveCount(1);
  await panel.locator('h1, h2').first().hover();
  await expect(page.locator('.edges .link-preview')).toHaveCount(0);
  // GV-56: Open above the legend; in the browser both gestures explain that Explorer needs the desktop app.
  const open=page.locator('.graph').getByRole('button',{name:'Open',exact:true});
  await open.click();await expect(page.locator('.file-note')).toContainText('desktop app');
  await open.click({button:'right'});await expect(page.locator('.file-note')).toContainText('desktop app');
  const [o,l]=await Promise.all([open.boundingBox(),page.locator('.graph').getByRole('button',{name:'Legend',exact:true}).boundingBox()]);
  expect(o!.y+o!.height).toBeLessThanOrEqual(l!.y);expect(Math.abs(o!.height-l!.height)).toBeLessThan(1);
});
test('v0.1.1 B4/I1/I2: subject menu closes outside, offers the model list; graph controls', async ({page}) => {
  await page.goto('/?study=1&subject=Menu%20check');
  await expect(page.locator('.panel').getByRole('button',{name:'Test me',exact:true})).toBeEnabled();
  // I1: the graph repeats neither Welcome nor Gallery; I2: zoom out, recenter, zoom in.
  await expect(page.locator('.graph').getByRole('button',{name:'Welcome',exact:true})).toHaveCount(0);
  await expect(page.locator('.graph').getByRole('button',{name:'Gallery',exact:true})).toHaveCount(0);
  expect(await page.locator('.zoom-controls button').evaluateAll(b=>b.map(x=>x.getAttribute('aria-label')))).toEqual(['Zoom out','Recenter','Zoom in']);
  // B4 and SE-48 in the subject menu.
  await page.locator('header .subject-field .title').click();
  const menu=page.locator('.subject-menu');
  await expect(menu.locator('#subject-model option')).toHaveCount(11);
  await menu.locator('#subject-model').selectOption('claude-haiku-4-5');
  await expect.poll(()=>page.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('lantern.subject.')).map(k=>localStorage.getItem(k)).join(''))).toContain('claude-haiku-4-5');
  await page.locator('.graph').click({position:{x:40,y:300}});
  await expect(menu).toHaveCount(0);
  await page.locator('header .subject-field .title').click();await expect(menu).toBeVisible();
  await page.locator('.panel').click({position:{x:300,y:220}});
  await expect(menu).toHaveCount(0);
});

test('GV-57: Ctrl+F searches nodes, Enter steps through matches, Esc closes', async ({page}) => {
  const errors:string[]=[]; page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/?study=1&subject=Tidal%20forces');
  await expect(page.locator('.panel').getByRole('button',{name:'Mechanism 1',exact:false})).toBeVisible();
  // A node still growing in (GV-90) is hidden and cannot take focus; let the spawn finish.
  await expect(page.locator('.node[data-spawn-phase], .node[data-pending]')).toHaveCount(0);
  await page.keyboard.press('Control+f');
  const field=page.getByRole('textbox',{name:'Search nodes',exact:true});
  await expect(field).toBeFocused();
  await field.fill('DIRECTION');
  const count=page.getByRole('search').getByRole('status');
  await expect(count).toHaveText('4 matches'); // the root's explanation mentions "direction" too
  await expect(page.locator('.node.match')).toHaveCount(4);
  await field.fill('direction 2');
  await expect(count).toHaveText('1 match');
  await expect(page.locator('.node.unmatched')).toHaveCount(3);
  await field.press('Enter');
  await expect(count).toHaveText('1 of 1');
  await expect(page.locator('.node[aria-pressed="true"]')).toHaveAttribute('title',/Application 1/);
  await field.fill('Direction');await field.press('Enter');
  await expect(page.locator('.node[aria-pressed="true"]')).toHaveAttribute('title',/Experiment 1/);
  await expect(count).toHaveText('4 of 4');
  await field.press('Enter');
  await expect(count).toHaveText('1 of 4');
  await field.press('Shift+Enter');
  await expect(count).toHaveText('4 of 4');
  await field.fill('expérience absente');
  await expect(page.getByRole('search').getByRole('status')).toHaveText('No matches');
  await field.press('Escape');
  await expect(field).toHaveCount(0);
  await expect(page.locator('.node.unmatched, .node.match')).toHaveCount(0);
  await expect(page.locator('.node[aria-pressed="true"]')).toBeFocused();
  await expect(page.locator('.panel').getByRole('button',{name:'Cancel',exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'Search nodes',exact:true}).click();
  await expect(field).toBeFocused();
  expect(errors).toEqual([]);
});
