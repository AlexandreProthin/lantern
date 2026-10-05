const fs=require('fs'),path=require('path');
const sharp=require('C:/Users/alexp/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root=path.resolve(__dirname,'..'),project=path.resolve(root,'../..');
const master=fs.readFileSync(path.join(project,'rounds/r006/sources/r006-c01.svg'),'utf8');
const body=master.match(/<g fill="currentColor">([\s\S]*)<\/g>/)[1];
const eyes='<ellipse cx="44" cy="74" rx="2.2" ry="3.2"/><ellipse cx="55" cy="73" rx="2.2" ry="3.2"/>';
const items=[
 {id:'01',parent:'r008-c01',title:'Repos sans visage',caption:'Présence minimale',face:'',pose:'',extra:''},
 {id:'02',parent:'r008-c02',title:'Repos attentif',caption:'Regard discret dans la flamme',face:eyes,pose:'',extra:''},
 {id:'03',parent:'r008-c03',title:'Curiosité',caption:'Inclinaison et regard latéral',face:'<ellipse cx="47" cy="73" rx="2.2" ry="3.2"/><ellipse cx="58" cy="72" rx="2.2" ry="3.2"/>',pose:'rotate(7 50 94)',extra:''},
 {id:'04',parent:'r008-c04',title:'Calme',caption:'Paupières, structure au repos',face:'<path d="M41 74 Q44 71 47 74 M52 74 Q55 71 58 74" fill="none" stroke="black" stroke-width="2.3" stroke-linecap="round"/>',pose:'',extra:''},
 {id:'05',parent:'r008-c05',title:'Appui sur les pieds',caption:'Base relevée, deux appuis',face:eyes,pose:'translate(0 -8)',extra:'<path d="M35 96 V107 H28 M65 96 V107 H72" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>'},
 {id:'06',parent:'r008-c06',title:'Suspension',caption:'Pivot sur la boucle, pieds absents',face:eyes,pose:'rotate(-8 50 4)',extra:'',support:'<path d="M50 -9 V4" fill="none" stroke="currentColor" stroke-width="1.7"/>'},
 {id:'07',parent:'r008-c02',title:'Profil / hypothèse',caption:'Projection étroite, un seul œil',face:'<ellipse cx="56" cy="73" rx="3" ry="3.2"/>',pose:'translate(50 0) scale(.55 1) translate(-50 0)',extra:''},
 {id:'08',parent:'r008-c01',title:'Dos / hypothèse',caption:'Flamme visible, aucun visage',face:'',pose:'translate(100 0) scale(-1 1)',extra:''}
];
function source(v){return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-10 -12 120 124"><defs><mask id="face"><rect x="-30" y="-30" width="180" height="180" fill="white"/><g fill="black">${v.face}</g></mask></defs><g fill="currentColor">${v.support||''}<g transform="${v.pose||'translate(0 0)'}"><g mask="url(#face)">${body}</g>${v.extra}</g></g></svg>`}
function text(x,y,s,size=18,c='#eee'){return `<text x="${x}" y="${y}" fill="${c}" font-family="Segoe UI,Arial,sans-serif" font-size="${size}">${s}</text>`}
const anchorPaths=['rounds/r007/sources/r007-c01-16.svg','rounds/r006/sources/r006-c01.svg'];
async function render(svg,w,h,col,bg){let pipe=sharp(Buffer.from(svg.replaceAll('currentColor',col))).resize(w,h);if(bg)pipe=pipe.flatten({background:bg});return pipe.png().toBuffer()}
(async()=>{
 let sheet=`<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000"><rect width="1600" height="1000" fill="#181818"/>${text(42,53,'LANTERN / COHÉRENCE DES POSES',30)}${text(42,87,'r009 · Phase 3 · Une famille, huit études statiques',18,'#aaa')}`;
 let matrix=`<svg xmlns="http://www.w3.org/2000/svg" width="1120" height="1220"><rect width="1120" height="1220" fill="#ddd"/>${text(20,30,'Caractère : 32 / 48 / 64 / 128 px · clair et sombre · pixels natifs',20,'#181818')}`;
 for(let i=0;i<items.length;i++){
  const v=items[i],id='r009-c'+v.id,s=source(v);fs.writeFileSync(path.join(root,'sources',id+'.svg'),s);
  const x=38+(i%4)*390,y=118+Math.floor(i/4)*385;
  sheet+=`<rect x="${x}" y="${y}" width="370" height="365" rx="16" fill="#242424"/>${text(x+18,y+36,v.id+' / '+v.title,21)}${text(x+18,y+67,v.caption,15,'#aaa')}`;
  const hero=await render(s,240,248,'#eeeeee');fs.writeFileSync(path.join(root,'evidence',id+'-hero.png'),hero);
  sheet+=`<image x="${x+65}" y="${y+90}" width="240" height="248" href="data:image/png;base64,${hero.toString('base64')}"/>`;
  const yy=54+i*140;matrix+=text(18,yy+25,id,16,'#181818');let xx=160;
  for(const n of [32,48,64,128])for(const dark of [false,true]){
   const b=await render(s,n,n,dark?'#eeeeee':'#181818',dark?'#181818':'#fff');
   fs.writeFileSync(path.join(root,'evidence',`${id}-${n}-${dark?'dark':'light'}.png`),b);
   matrix+=`<image x="${xx}" y="${yy}" width="${n}" height="${n}" href="data:image/png;base64,${b.toString('base64')}"/>`;xx+=n+12;
  }
 }
 matrix+=text(20,1200,'32 px : détails fragiles · Profil/dos : hypothèses graphiques, volume à confirmer',16,'#181818')+'</svg>';
 sheet+=text(42,933,'Invariants : cadre souple · flamme asymétrique · assise · boucle de suspension',18,'#aaa')+text(42,967,'Favicon neutre conservé · Les vues 07/08 proposent une lecture en profondeur à discuter',17,'#aaa')+'</svg>';
 for(const [name,s] of [['sheet',sheet],['matrix',matrix]]){fs.writeFileSync(path.join(root,'sources',name+'.svg'),s);await sharp(Buffer.from(s)).png().toFile(path.join(root,name==='sheet'?'sheet.png':'evidence/matrix.png'));}
 let anchors=`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="180"><rect width="600" height="180" fill="#ddd"/>${text(18,28,'Ancres acceptées — sources inchangées',20,'#181818')}`;let ax=20;
 for(const n of [16,24,32,48]){anchors+=text(ax,55,n+' px',14,'#181818');const s=fs.readFileSync(path.join(project,anchorPaths[n===16?0:1]),'utf8');for(const dark of [false,true]){const b=await render(s,n,n,dark?'#fff':'#181818',dark?'#181818':'#fff');fs.writeFileSync(path.join(root,'evidence',`anchor-${n}-${dark?'dark':'light'}.png`),b);anchors+=`<image x="${ax}" y="72" width="${n}" height="${n}" href="data:image/png;base64,${b.toString('base64')}"/>`;ax+=n+12;}ax+=28;}
 anchors+='</svg>';await sharp(Buffer.from(anchors)).png().toFile(path.join(root,'evidence/anchors.png'));
 fs.writeFileSync(path.join(root,'sources/lineage.json'),JSON.stringify(items.map(v=>({...v,id:'r009-c'+v.id})),null,2));fs.writeFileSync(path.join(root,'evidence/renderer.json'),JSON.stringify(sharp.versions,null,2));console.log('r009 rendered: 8 studies, 64 character tests, 8 unchanged-anchor diagnostics.');
})().catch(e=>{console.error(e);process.exit(1)});
