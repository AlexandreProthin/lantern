import { test, expect } from '@playwright/test';

/** SE-30: the Library folder field is editable and shares the picker's validation flow (desktop commands faked in the page). */
test('SE-30: typed library path validates, offers Move/Copy/Leave, and invalid input leaves the library unchanged', async ({page})=>{
  await page.addInitScript(()=>{
    const calls:{cmd:string;args:any}[]=[];(window as any).__calls=calls;
    (window as any).__TAURI_INTERNALS__={metadata:{currentWindow:{label:'main'},currentWebview:{label:'main',windowLabel:'main'}},
      transformCallback:()=>1,unregisterCallback:()=>{},convertFileSrc:(s:string)=>s,
      invoke:async(cmd:string,args:any)=>{calls.push({cmd,args});
        switch(cmd){
          case 'load_settings':return {document:{format:'lantern-settings/1',library:{path:'C:\\Users\\me\\Documents\\Lantern'}},readOnly:false,recovered:false,defaultLibrary:'C:\\Users\\me\\Documents\\Lantern',defaultName:'Me'};
          case 'list_subjects':return [];
          case 'read_state':return {format:'lantern-state/1',recents:[],lastOpenedAt:{}};
          case 'import_poc':return [];
          case 'provider_status':return {kind:'found',path:'claude',version:'1'};
          case 'validate_library':if(!/^[A-Za-z]:\\/.test(args.path))throw 'Library path must be absolute';return args.path;
          case 'pick_library':return 'D:\\Picked';
          case 'switch_library':return {path:args.destination,collisions:[],transferred:0};
          default:return null;
        }}};
  });
  await page.goto('/');
  await page.locator('header').getByRole('button',{name:'Settings',exact:true}).click();
  const field=page.getByRole('textbox',{name:'Library folder'});
  await expect(field).toHaveValue('C:\\Users\\me\\Documents\\Lantern');
  await field.fill('relative\\folder');await field.press('Enter');
  await expect(page.getByRole('alert')).toContainText('must be absolute');
  await expect(page.locator('.confirmation')).toHaveCount(0);
  await field.fill('E:\\Typed');await page.getByRole('button',{name:'Apply path'}).click();
  await expect(page.locator('.confirmation')).toContainText('E:\\Typed');
  await page.locator('.confirmation').getByRole('button',{name:'Cancel'}).click();
  await page.getByRole('button',{name:'Browse…'}).click();
  await expect(page.locator('.confirmation')).toContainText('D:\\Picked');
  expect(await page.evaluate(()=>(window as any).__calls.find((c:any)=>c.cmd==='pick_library').args.start)).toBe('C:\\Users\\me\\Documents\\Lantern');
  await page.locator('.confirmation').getByRole('button',{name:'Leave them'}).click();
  await expect.poll(()=>page.evaluate(()=>(window as any).__calls.some((c:any)=>c.cmd==='switch_library'&&c.args.destination==='D:\\Picked'&&c.args.mode==='leave'))).toBe(true);
});
