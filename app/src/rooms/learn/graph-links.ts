import type { RoomVisit } from '../../core/model';
import { nodeLinks } from './protocol';
/** GV-40: every stored text relation, deduplicated as an unordered pair. */
export function graphLinks(visit:RoomVisit): {id:string;from:string;to:string}[] {
  const pairs=new Map<string,{id:string;from:string;to:string}>();
  for(const node of Object.values(visit.nodes)) for(const link of nodeLinks([node.content,...node.dialogue.map(t=>t.text)].join('\n'),visit)) {
    if(!link.exists||link.id===node.id||link.id===node.parents[0]||visit.nodes[link.id].parents[0]===node.id)continue;
    const [from,to]=[node.id,link.id].sort(),id=`${from}:${to}`;pairs.set(id,{id,from,to});
  }
  return [...pairs.values()];
}
