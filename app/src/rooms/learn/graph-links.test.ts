import {expect,test} from 'vitest';
import { newLearnSubject } from './rules';
import {addChild} from '../../core/graph';
import {graphLinks} from './graph-links';
test('GV-40: all content/dialogue links deduplicate and exclude unknown ids and tree edges',()=>{
  const v=newLearnSubject('Tides').rooms.learn;v.nodes[v.rootId].state='lit';
  const a=addChild(v,v.rootId,{title:'Moon',kind:'axis',state: 'open', createdBy: 'model'}),b=addChild(v,v.rootId,{title:'Ocean',kind:'axis',state: 'open', createdBy: 'model'});
  a.content=`[o](node:${b.id}) [duplicate](node:${b.id}) [parent](node:${v.rootId}) [unknown](node:missing)`;
  b.content=`[back](node:${a.id}) [self](node:${b.id})`;
  expect(graphLinks(v)).toHaveLength(1);expect(new Set([graphLinks(v)[0].from,graphLinks(v)[0].to])).toEqual(new Set([a.id,b.id]));
});
