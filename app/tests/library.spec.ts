import { test, expect } from '@playwright/test';
import { newLearnSubject } from '../src/rooms/learn/rules';
import { addChild } from '../src/core/graph';

test('WG-2/3/5/60..67: create, return, continue, rename and recycle through the library', async ({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/');
  await page.getByRole('textbox',{name:'What do you want to learn?'}).fill('Ocean tides');
  await page.locator('#welcome-model').selectOption('sonnet');
  await page.getByRole('radio',{name:'Engineer',exact:true}).check();
  // WG-10: the button shows only while the field has focus; it then submits like Enter.
  await expect(page.getByRole('button',{name:'Carry the lantern in'})).toBeHidden();
  await page.getByRole('textbox',{name:'What do you want to learn?'}).focus();
  await page.getByRole('button',{name:'Carry the lantern in'}).click();
  await expect(page.locator('.panel').getByRole('button',{name:'Test me',exact:true})).toBeEnabled();
  const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k=>k.startsWith('lantern.subject.'))!)!));
  expect(stored.rooms.learn.model).toBe('sonnet');expect(stored.rooms.learn.data.tone).toBe('engineer');
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('lantern.settings')!).provider.defaultModel)).toBe('opus');
  await page.locator('.panel').getByRole('button',{name:'Mechanism 1',exact:false}).click();
  await page.keyboard.press('Control+1');
  await expect(page.locator('header nav button')).toHaveCount(3);
  await expect(page.locator('header nav').getByRole('button',{name:'Study',exact:true})).toBeEnabled();
  await expect(page.locator('#welcome-model')).toHaveValue('opus');
  await expect(page.locator('.welcome .card')).toContainText('Ocean tides');
  await page.screenshot({path:'test-results/welcome-d1.png',fullPage:true,animations:'disabled'});
  await page.locator('.welcome .card').click();
  await expect(page.locator('.panel').getByText('This node is still dark.')).toBeVisible();
  await page.keyboard.press('Control+3');
  const card=page.getByRole('option',{name:'Ocean tides',exact:true});await card.click();
  await expect(card.locator('.details')).toContainText('Engineer');
  await card.press('F2');await card.getByRole('textbox',{name:'Rename',exact:true}).fill('');await card.getByRole('textbox',{name:'Rename',exact:true}).press('Enter');
  await expect(card.getByRole('alert')).toBeVisible();
  await card.getByRole('textbox',{name:'Rename',exact:true}).fill('Tides renamed');await card.getByRole('textbox',{name:'Rename',exact:true}).press('Enter');
  const renamed=page.getByRole('option',{name:'Tides renamed',exact:true});await expect(renamed).toBeVisible();
  expect(await page.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('lantern.subject.')))).toEqual([`lantern.subject.${stored.id}`]);
  await page.screenshot({path:'test-results/gallery-d1.png',fullPage:true,animations:'disabled'});
  await renamed.focus();await renamed.press('Delete');
  await expect(page.getByRole('dialog').getByRole('button',{name:'Cancel',exact:true})).toBeFocused();
  await page.getByRole('dialog').getByRole('button',{name:'Delete',exact:true}).click();
  await expect(page.getByRole('heading',{name:'No subjects yet'})).toBeVisible();
  expect(await page.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('lantern.subject.')))).toEqual([]);
  expect(await page.evaluate(()=>Object.keys(localStorage).some(k=>k.startsWith('lantern.recycled.')))).toBe(true);
  await page.keyboard.press('Control+2');await expect(page.getByRole('heading',{name:'No subjects yet'})).toBeVisible();
  expect(errors).toEqual([]);
});

test('WG-4/8/13: suggestions fill without submitting; provider failure can retry',async({page})=>{
  await page.goto('/?error=network');
  await page.getByRole('button',{name:'Suggest 3 subjects',exact:true}).click();
  await expect(page.locator('.welcome').getByRole('alert')).toContainText('Could not reach Claude');
  await page.locator('.welcome').getByRole('button',{name:'Retry',exact:true}).click();
  await expect(page.locator('.chipbtn')).toHaveCount(3);await page.locator('.chipbtn').first().click();
  await expect(page.getByRole('textbox',{name:'What do you want to learn?'})).not.toHaveValue('');
  expect(await page.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('lantern.subject.')))).toEqual([]);
  await page.getByRole('textbox',{name:'What do you want to learn?'}).press('Escape');
  await expect(page.getByRole('button',{name:'Carry the lantern in'})).toBeDisabled();
  await page.locator('#welcome-model').selectOption('other');await page.getByRole('textbox',{name:'Model',exact:true}).fill('invalid model');
  await expect(page.getByRole('button',{name:'Suggest 3 subjects',exact:true})).toBeDisabled();
});

test('WG-9..11/RS-19: the direction opens with Shift+Enter, is validated, stored and edited in the subject menu',async({page})=>{
  await page.goto('/');
  const subject=page.getByRole('textbox',{name:'What do you want to learn?'}),direction=page.getByRole('textbox',{name:'Direction, optional'});
  const carry=page.getByRole('button',{name:'Carry the lantern in'});
  await expect(subject).toBeFocused();await expect(carry).toBeVisible();await expect(carry).toBeDisabled();
  await expect(direction).toBeHidden();
  await subject.fill('Granular synthesis');await subject.press('Shift+Enter');
  await expect(direction).toBeFocused();
  // Esc closes and clears it, back in the subject; Backspace in an empty one does the same.
  await direction.fill('temporary');await direction.press('Escape');
  await expect(direction).toBeHidden();await expect(subject).toBeFocused();
  await subject.press('Shift+Enter');await expect(direction).toHaveValue('');await direction.press('Backspace');
  await expect(direction).toBeHidden();await expect(subject).toBeFocused();
  // Limit: a counter from 400, the reason and a disabled submit over 500.
  await subject.press('Shift+Enter');await direction.fill('x'.repeat(520));
  await expect(page.locator('.dmeta')).toHaveText('520 / 500');await expect(page.locator('.why')).toHaveText('The direction is 20 characters over the 500 limit.');
  await expect(carry).toBeDisabled();
  await direction.press('Enter');expect(await page.evaluate(()=>Object.keys(localStorage).some(k=>k.startsWith('lantern.subject.')))).toBe(false);
  await direction.fill('Start from one grain,\nthen clouds.');await expect(page.locator('.dmeta')).toHaveText('');await expect(carry).toBeEnabled();
  // A blank subject keeps it disabled whatever the direction holds.
  await subject.fill('');await expect(page.locator('.why')).toHaveText('Add a subject to carry the lantern in; the direction alone is not enough.');await expect(carry).toBeDisabled();
  await subject.fill('Granular synthesis');await page.keyboard.press('ArrowDown');await expect(direction).toBeFocused();
  // Leaving the field hides the button but keeps a direction that holds text.
  await page.getByRole('radio',{name:'Student',exact:true}).check();
  await expect(carry).toBeHidden();await expect(direction).toHaveValue('Start from one grain,\nthen clouds.');
  await direction.focus();await direction.press('Enter');
  await expect(page.locator('.panel').getByRole('button',{name:'Test me',exact:true})).toBeEnabled();
  const stored=()=>page.evaluate(()=>JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k=>k.startsWith('lantern.subject.'))!)!).rooms.learn);
  expect((await stored()).data.direction).toBe('Start from one grain,\nthen clouds.');await expect.poll(async()=>(await stored()).log[0]?.promptVersion).toBe('learn-2');
  // RS-19: edited in the subject menu, applied on blur; emptying it removes the direction.
  await page.locator('header .subject').click();
  const menuDirection=page.locator('.subject-menu textarea.direction');
  await expect(menuDirection).toHaveValue('Start from one grain,\nthen clouds.');
  await menuDirection.fill('Only the maths.');await page.locator('.subject-menu').getByRole('textbox',{name:'Title',exact:true}).focus();
  await expect.poll(async()=>(await stored()).data.direction).toBe('Only the maths.');
  await menuDirection.fill('');await page.locator('.subject-menu').getByRole('textbox',{name:'Title',exact:true}).focus();
  await expect.poll(async()=>'direction' in (await stored()).data).toBe(false);
  // An empty direction closes when focus leaves Welcome's field.
  await page.keyboard.press('Escape');await page.keyboard.press('Control+1');
  await subject.focus();await subject.fill('Another');await subject.press('Shift+Enter');await expect(direction).toBeFocused();
  await page.getByRole('radio',{name:'Expert',exact:true}).check();await expect(direction).toBeHidden();
});

test('WG-53..55/68: gallery filter survives navigation and detailed usage respects settings',async({page})=>{
  const subjects=['Alpha','Beta','Gamma'].map(title=>newLearnSubject(title));
  await page.addInitScript(subjects=>{for(const s of subjects)localStorage.setItem(`lantern.subject.${s.id}`,JSON.stringify(s));},subjects);
  await page.goto('/');await page.keyboard.press('Control+3');
  await page.getByRole('textbox',{name:'Filter subjects'}).fill('BET');
  await expect(page.locator('.grid').getByRole('option')).toHaveCount(1);
  await page.keyboard.press('Control+1');await page.keyboard.press('Control+3');
  await expect(page.getByRole('textbox',{name:'Filter subjects'})).toHaveValue('BET');
  await page.getByRole('textbox',{name:'Filter subjects'}).press('Escape');await expect(page.locator('.grid').getByRole('option')).toHaveCount(3);
  await page.getByRole('option',{name:'Alpha',exact:true}).click();
  await expect(page.locator('.selected .details')).toContainText('0 in / 0 out');
  await page.locator('header').getByRole('button',{name:'Settings',exact:true}).click();
  const dialog=page.getByRole('dialog');await dialog.getByRole('button',{name:'Appearance',exact:true}).click();
  await dialog.getByRole('checkbox',{name:'Show token stats'}).uncheck();await dialog.getByRole('button',{name:'Close',exact:true}).click();
  await expect(page.locator('.selected .details')).not.toContainText('0 in / 0 out');
  await expect(page.locator('.selected .details')).toContainText('Generations');
});

test('WG-41/66: previews are capped and deleting a running subject cannot resurrect it',async({page})=>{
  const subject=newLearnSubject('Large map');const visit=subject.rooms.learn;visit.nodes[visit.rootId].state='lit';
  for(let i=0;i<69;i++)addChild(visit,visit.rootId,{title:`Node ${i}`,hook:'',kind:'axis',state: 'open', createdBy: 'model'});
  await page.addInitScript(subject=>localStorage.setItem(`lantern.subject.${subject.id}`,JSON.stringify(subject)),subject);
  await page.goto('/?delay=300');await expect(page.locator('.welcome circle')).toHaveCount(60);await expect(page.locator('.welcome .overflow')).toHaveText('+10');
  await page.getByRole('textbox',{name:'What do you want to learn?'}).fill('Cancel and delete');await page.getByRole('button',{name:'Carry the lantern in'}).click();
  await expect(page.locator('.panel').getByRole('button',{name:'Cancel',exact:true})).toBeVisible();
  await page.keyboard.press('Control+3');const card=page.getByRole('option',{name:'Cancel and delete',exact:true});await card.click();await card.press('Delete');
  await expect(page.getByRole('dialog')).toContainText('A generation is running');await page.getByRole('dialog').getByRole('button',{name:'Delete',exact:true}).click();
  await expect(card).toHaveCount(0);await page.waitForTimeout(1200);
  const titles=await page.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('lantern.subject.')).map(k=>JSON.parse(localStorage.getItem(k)!).title));
  expect(titles).toEqual(['Large map']);await page.keyboard.press('Control+2');await expect(page.locator('.panel')).toBeVisible();
});

test('D1: handoff is timer driven even when animation frames stop',async({page})=>{
  await page.goto('/');await page.getByRole('textbox',{name:'What do you want to learn?'}).fill('Background handoff');
  await page.getByRole('button',{name:'Carry the lantern in'}).evaluate((button:HTMLButtonElement)=>{
    window.requestAnimationFrame=()=>0;button.click();
  });
  await expect(page.locator('.panel')).toBeVisible();
  await expect(page.locator('.panel').getByRole('button',{name:'Test me',exact:true})).toBeEnabled();
});
