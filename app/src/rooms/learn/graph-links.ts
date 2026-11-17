import type { GraphNode, RoomVisit } from '../../core/model';
import { nodeLinks } from './protocol';
/** The ids a node's text links to, kept while the text is the same: a map's text is scanned once, not on every change. */
const scanned=new Map<string,{text:string;ids:string[]}>();
const noNodes={nodes:{}} as unknown as RoomVisit;
function linkedIds(node:GraphNode):string[] {
  const text=node.dialogue.length?[node.content,...node.dialogue.map(t=>t.text)].join('\n'):node.content, kept=scanned.get(node.id);
  if(kept&&kept.text===text)return kept.ids;
  const ids=text.includes('](node:')?[...new Set(nodeLinks(text,noNodes).map(l=>l.id))]:[];
  if(scanned.size>5000)scanned.clear();
  scanned.set(node.id,{text,ids});return ids;
}
/** GV-40: every stored text relation, deduplicated as an unordered pair. */
export function graphLinks(visit:RoomVisit): {id:string;from:string;to:string}[] {
  const pairs=new Map<string,{id:string;from:string;to:string}>();
  for(const node of Object.values(visit.nodes)) for(const linked of linkedIds(node)) {
    if(!Object.hasOwn(visit.nodes,linked)||linked===node.id||linked===node.parents[0]||visit.nodes[linked].parents[0]===node.id)continue;
    const [from,to]=[node.id,linked].sort(),id=`${from}:${to}`;pairs.set(id,{id,from,to});
  }
  return [...pairs.values()];
}
