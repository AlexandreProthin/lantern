import { invoke } from './ipc';
import { getCurrentWindow, availableMonitors, primaryMonitor, PhysicalPosition, PhysicalSize } from '@tauri-apps/api/window';
import { DebouncedWriter } from './debounced-writer';
export interface WindowMemory { x:number;y:number;width:number;height:number;maximized:boolean }
interface MonitorArea { position:{x:number;y:number};size:{width:number;height:number} }
/** RS-51: a disconnected display must not strand the window offscreen. */
export function visibleBounds(input:unknown, monitors:MonitorArea[], primary:MonitorArea): WindowMemory|null {
  const v=input as WindowMemory;
  if(!v||![v.x,v.y,v.width,v.height].every(Number.isFinite)||v.width<100||v.height<100)return null;
  const visible=monitors.some(m=>v.x+v.width>m.position.x+100&&v.x<m.position.x+m.size.width-100&&v.y+40>m.position.y&&v.y<m.position.y+m.size.height-40);
  const width=Math.min(Math.max(v.width,1024),primary.size.width),height=Math.min(Math.max(v.height,640),primary.size.height);
  return {...v,width,height,maximized:v.maximized===true,
    x:visible?v.x:Math.round(primary.position.x+(primary.size.width-width)/2),y:visible?v.y:Math.round(primary.position.y+(primary.size.height-height)/2)};
}
export async function rememberWindow(input:unknown, error:(e:unknown)=>void) {
  const window=getCurrentWindow(), monitors=await availableMonitors(), primary=await primaryMonitor()??monitors[0];
  let normal:WindowMemory|undefined;
  if(primary){const bounds=visibleBounds(input,monitors,primary);if(bounds){normal=bounds;await window.setSize(new PhysicalSize(bounds.width,bounds.height));await window.setPosition(new PhysicalPosition(bounds.x,bounds.y));if(bounds.maximized)await window.maximize();}}
  const writer=new DebouncedWriter<WindowMemory>(value=>invoke('save_window_state',{bounds:value}),error);
  let disposed=false;
  async function capture() {
    if(disposed||await window.isMinimized())return;
    const maximized=await window.isMaximized();
    if(!maximized){const [position,size]=await Promise.all([window.outerPosition(),window.innerSize()]);normal={...position,width:size.width,height:size.height,maximized:false};}
    if(normal)writer.schedule({...normal,maximized});
  }
  const moved=await window.onMoved(()=>void capture().catch(error)),resized=await window.onResized(()=>void capture().catch(error));
  await capture();
  return {flush:async()=>{await capture();await writer.flush();},dispose:()=>{disposed=true;moved();resized();}};
}
