import { expect,test } from 'vitest';
import {visibleBounds} from './window-memory';
test('RS-51: disconnected display centers on primary, valid secondary stays put',()=>{
  const primary={position:{x:0,y:0},size:{width:1920,height:1080}},secondary={position:{x:-1920,y:0},size:{width:1920,height:1080}};
  const memory={x:3000,y:2000,width:1280,height:720,maximized:true};
  expect(visibleBounds(memory,[primary],primary)).toEqual({...memory,x:320,y:180});
  expect(visibleBounds({...memory,x:-1800,y:100},[primary,secondary],primary)?.x).toBe(-1800);
  expect(visibleBounds({x:NaN},[primary],primary)).toBeNull();
});
