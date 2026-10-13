import { test,expect } from '@playwright/test';
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
