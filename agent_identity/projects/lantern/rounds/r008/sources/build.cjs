const fs=require('fs'),path=require('path');
const sharp=require('C:/Users/alexp/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root=path.resolve(__dirname,'..'), project=path.resolve(root,'../..');
const parent=fs.readFileSync(path.join(project,'rounds/r006/sources/r006-c01.svg'),'utf8');
const body=parent.match(/<g fill="currentColor">([\s\S]*)<\/g>/)[1];
const variants=[
 ['01','Attention sans visage','Inclinaison douce, aucun ajout', '', 'rotate(-9 50 92)', '', 'Posture seule; aucune anatomie ajoutée.'],
 ['02','Regard discret','Deux yeux dans la flamme','<ellipse cx="44" cy="74" rx="2.2" ry="3.2"/><ellipse cx="55" cy="73" rx="2.2" ry="3.2"/>','','','Deux contreformes verticales; structure exactement héritée.'],
 ['03','Curiosité latérale','Regard vers une piste','<ellipse cx="47" cy="73" rx="2.2" ry="3.2"/><ellipse cx="58" cy="72" rx="2.2" ry="3.2"/>','rotate(7 50 92)','','Regard décalé et légère inclinaison; comparaison combinée, effet non isolé.'],
 ['04','Calme attentif','Paupières, présence au repos','<path d="M41 74 Q44 71 47 74 M52 74 Q55 71 58 74" fill="none" stroke="black" stroke-width="2.3" stroke-linecap="round"/>','','','Paupières en arcs; possibilité calme ou somnolente à départager.'],
 ['05','Prêt à explorer','Pieds émergents proposés','<ellipse cx="44" cy="74" rx="2.2" ry="3.2"/><ellipse cx="55" cy="73" rx="2.2" ry="3.2"/>','','<path d="M35 96 Q35 107 28 107 M64 96 Q64 107 72 107" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>','Pieds optionnels attachés sous assise, étude posée; aucune marche animée.'],
 ['06','Suspendu, réceptif','Attache par la boucle','<ellipse cx="44" cy="74" rx="2.2" ry="3.2"/><ellipse cx="55" cy="73" rx="2.2" ry="3.2"/>','rotate(-8 50 4)','<path d="M50 -9 V4" fill="none" stroke="currentColor" stroke-width="1.7"/>','Suspension par boucle, pieds rétractés; pose fixe, aucun balancement validé.']
];
function svg(v){return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-10 -12 120 124"><defs><mask id="face"><rect x="-30" y="-30" width="180" height="180" fill="white"/><g fill="black">${v[3]}</g></mask></defs><g fill="currentColor">${v[0]==='06'?v[5]:''}<g transform="${v[4]||'translate(0 0)'}" mask="url(#face)">${body}${v[0]==='06'?'':v[5]}</g></g></svg>`}
function text(x,y,s,size=18,color='#dedede'){return `<text x="${x}" y="${y}" font-family="Segoe UI,Arial,sans-serif" font-size="${size}" fill="${color}">${s}</text>`}
async function png(s,w,h){return sharp(Buffer.from(s.replaceAll('currentColor','#eeeeee'))).resize(w,h).png().toBuffer()}
(async()=>{
 let board=`<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="1020"><rect width="1440" height="1020" fill="#181818"/>${text(54,58,'LANTERN / ÉTUDES DE CARACTÈRE',30)}${text(54,94,'r008 · Phase 3 · Poses fixes · Monochrome de comparaison',18,'#aaa')}`;
 const items=[];
 for(let i=0;i<variants.length;i++){
  const v=variants[i],id='r008-c'+v[0],s=svg(v);fs.writeFileSync(path.join(root,'sources',id+'.svg'),s);
  items.push({id,parent:'r006-c01',title:v[1],mutation:v[6]});
  const x=48+(i%3)*464,y=128+Math.floor(i/3)*388;
  board+=`<rect x="${x}" y="${y}" width="440" height="364" rx="16" fill="#242424"/>`+text(x+22,y+36,v[0]+' / '+v[1],22)+text(x+22,y+66,v[2],16,'#aaa');
  const b=await png(s,240,248);fs.writeFileSync(path.join(root,'evidence',id+'-dark.png'),b);
  board+=`<image x="${x+100}" y="${y+91}" width="240" height="248" href="data:image/png;base64,${b.toString('base64')}"/>`;
  for(const n of [32,48,64,128])for(const dark of [true,false]){
   const col=dark?'#eeeeee':'#181818',bg=dark?'#181818':'#ffffff';
   await sharp(Buffer.from(s.replaceAll('currentColor',col))).resize(n,n).flatten({background:bg}).png().toFile(path.join(root,'evidence',`${id}-${n}-${dark?'dark':'light'}.png`));
  }
 }
 board+=text(54,964,'Ancre favicon conservée : r007-c01 à 16 px · r006-c01 à 24–256 px',18,'#aaa')+text(54,995,'Yeux et pieds optionnels · Aucun choix de palette ou de mouvement',16,'#aaa')+'</svg>';
 fs.writeFileSync(path.join(root,'sources','sheet.svg'),board);
 await sharp(Buffer.from(board)).png().toFile(path.join(root,'sheet.png'));
 // Actual-size evidence: same presentation bounds across hypotheses, both polarities.
 let matrix='<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="540"><rect width="1080" height="540" fill="#ddd"/>'+text(20,30,'Caractère : 32 / 48 / 64 / 128 px · clair et sombre · pixels natifs',20,'#181818');
 for(let i=0;i<variants.length;i++){const id='r008-c'+variants[i][0],y=50+i*78;matrix+=text(20,y+24,id,16,'#181818');let x=150;for(const n of [32,48,64,128]){for(const dark of [false,true]){const b=fs.readFileSync(path.join(root,'evidence',`${id}-${n}-${dark?'dark':'light'}.png`));matrix+=`<image x="${x}" y="${y}" width="${n}" height="${n}" href="data:image/png;base64,${b.toString('base64')}"/>`;x+=n+12;}}}
 matrix=matrix.replace('height="540"','height="880"').replace('height="540"','height="880"');
 // Rows need 128px for the largest sample.
 matrix=matrix.replace(/y="(\d+)"/g,(m,n)=>{const val=Number(n); if(val>=50){const idx=Math.floor((val-50)/78); return `y="${50+idx*134+(val-50)%78}"`;}return m;});
 matrix+='</svg>';fs.writeFileSync(path.join(root,'sources','matrix.svg'),matrix);await sharp(Buffer.from(matrix)).png().toFile(path.join(root,'evidence','matrix.png'));
 fs.writeFileSync(path.join(root,'sources','lineage.json'),JSON.stringify(items,null,2));fs.writeFileSync(path.join(root,'evidence','renderer.json'),JSON.stringify(sharp.versions,null,2));
 console.log('Six SVG studies, one comparison sheet and 48 native character PNGs rendered.');
})().catch(e=>{console.error(e);process.exit(1)});
