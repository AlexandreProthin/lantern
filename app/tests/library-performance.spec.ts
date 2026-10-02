import { test, expect } from '@playwright/test';
import { createSubject } from '../src/core/model';
test('WG-43: cached 50-subject Gallery renders in under 500 ms', async ({page})=>{
  test.skip(process.env.LANTERN_PERF!=='1','Idle-machine performance gate; separate from builds and provider calls');
  const subjects=Array.from({length:50},(_,i)=>createSubject(`Subject ${String(i).padStart(2,'0')}`));
  await page.addInitScript(subjects=>{for(const subject of subjects)localStorage.setItem(`lantern.subject.${subject.id}`,JSON.stringify(subject));},subjects);
  await page.goto('/');await expect(page.getByRole('textbox',{name:'What do you want to learn?'})).toBeVisible();
  const elapsed=await page.evaluate(()=>new Promise<number>(resolve=>{
    const start=performance.now();
    const observer=new MutationObserver(()=>{
      if(document.querySelectorAll('.gallery:not(.hidden) [data-card-id]').length===50){observer.disconnect();requestAnimationFrame(()=>resolve(performance.now()-start));}
    });observer.observe(document.body,{subtree:true,attributes:true,childList:true});
    window.dispatchEvent(new KeyboardEvent('keydown',{key:'3',ctrlKey:true,bubbles:true}));
  }));
  console.log(`WG-43 browser 50-subject Gallery: ${elapsed.toFixed(1)} ms`);expect(elapsed).toBeLessThan(500);
});
