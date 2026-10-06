// Renders r016 evidence: per-proposition draft-vs-proposal boards in three contexts plus native PNGs.
const fs=require('fs'),path=require('path'),vm=require('vm');
const sharp=require('C:/Users/alexp/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const c={};c.window=c;vm.createContext(c);for(const f of ['body.js','motion.js','favicons.js','system.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,f),'utf8'),c);
const S=c.LanternSystem,ev=path.join(__dirname,'..','evidence');
const strip=s=>s.replace(/^<svg[^>]*>/,'').replace(/<\/svg>$/,'');
const place=(svg,x,y,w,h,vb)=>`<svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="${vb||svg.match(/viewBox="([^"]+)"/)[1]}">${strip(svg)}</svg>`;
const ink=ctx=>ctx==='light'?'#2a2018':'#dddddd';
let uid=0;const U=()=>'b'+(uid++);
// One row: draft | proposal at given sizes, for a given render function.
function board(ctx,rows,file,W=1100){
 let y=20,body='';
 for(const r of rows){
  body+=`<text x="20" y="${y+16}" font-family="Segoe UI,sans-serif" font-size="15" fill="${ink(ctx)}">${r.label}</text>`;y+=28;
  let x=20;const H=Math.max(...r.sizes);
  for(const [tag,fn] of [['draft',r.draft],['proposal',r.prop]]){
   body+=`<text x="${x}" y="${y+12}" font-family="Segoe UI,sans-serif" font-size="11" fill="${ink(ctx)}" opacity=".6">${tag}</text>`;
   let xx=x;for(const s of r.sizes){body+=place(fn(U()),xx,y+18+(H-s),s,s);xx+=s+14;}
   x=xx+40;
  }
  y+=H+40;
 }
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${y}"><rect width="100%" height="100%" fill="${S.CTX[ctx].bg}"/>${body}</svg>`;
 return sharp(Buffer.from(svg)).png().toFile(path.join(ev,file));
}
const A=(o)=>u=>S.actor({uid:u,face:true,...o});
(async()=>{
 for(const ctx of ['neutral','learn','light']){
  const rows=[
   {label:'c01 Lit frame — companion',sizes:[64,128,200],draft:A({ctx}),prop:A({ctx,lit:1})},
   {label:'c02 Ember favicon',sizes:[16,24,32,48],draft:u=>S.favicon(16,{ctx}),prop:u=>S.favicon(16,{ctx,ember:1})},
   {label:'c03 App tile (mark)',sizes:[32,48,96,160],draft:A({ctx,face:false}),prop:u=>S.tile({uid:u})},
   {label:'c04 Flat mid tier + weighted frame',sizes:[32,48,64],draft:A({ctx,face:false}),prop:A({ctx,face:false,flat:1,thick:1})},
   {label:'c06 Ground light — few steps / landed',sizes:[128,200],draft:A({ctx,pose:c.LanternMotion.still(2),gesture:2}),prop:A({ctx,pose:c.LanternMotion.still(2),gesture:2,ground:1})},
   {label:'c07 Context tuning',sizes:[64,128,200],draft:A({ctx}),prop:A({ctx,tuned:1})},
   {label:'Combined c01+c06+c07 vs draft',sizes:[64,128,200],draft:A({ctx}),prop:A({ctx,lit:1,ground:1,tuned:1})},
  ];
  // favicon row needs its own size per cell
  rows[1].draft=null;rows[1].prop=null;
  const fav=rows.splice(1,1)[0];
  await board(ctx,rows,`board-${ctx}.png`);
  let x=20,body='';
  for(const [tag,ember] of [['draft',0],['proposal',1]]){body+=`<text x="${x}" y="20" font-family="Segoe UI,sans-serif" font-size="11" fill="${ink(ctx)}" opacity=".6">${tag}</text>`;for(const s of [16,24,32,48]){body+=place(S.favicon(s,{ctx,ember}),x,30+48-s,s,s);x+=s+14}x+=40}
  await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="460" height="90"><rect width="100%" height="100%" fill="${S.CTX[ctx].bg}"/>${body}</svg>`)).png().toFile(path.join(ev,`favicon-${ctx}.png`));
 }
 console.log('done');
})();
