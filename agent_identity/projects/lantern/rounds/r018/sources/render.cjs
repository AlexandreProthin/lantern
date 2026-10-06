// r018 evidence: time strips per variant and physics-response frames, on neutral/Learn/light.
const fs=require('fs'),path=require('path'),vm=require('vm');
const sharp=require('C:/Users/alexp/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const c={};c.window=c;vm.createContext(c);for(const f of ['body.js','motion.js','favicons.js','flame.js','system.js','variants.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,f),'utf8'),c);
const S=c.LanternSystem,V=c.R018,ev=path.join(__dirname,'..','evidence');
const strip=s=>s.replace(/^<svg[^>]*>/,'').replace(/<\/svg>$/,'');
const place=(svg,x,y,w)=>`<svg x="${x}" y="${y}" width="${w}" height="${w}" viewBox="-20 -24 140 148">${strip(svg)}</svg>`;
let n=0;
async function board(ctx,file,cells,times,size){
 const ink=ctx==='light'?'#2a2018':'#dddddd',W=40+times.length*(size+10)+150;let y=16,b='';
 for(const [label,opts] of cells){b+=`<text x="16" y="${y+size/2}" font-family="Segoe UI" font-size="13" fill="${ink}">${label}</text>`;
  times.forEach(([gi,t,pose],i)=>{b+=place(S.actor({uid:'e'+(n++),face:true,lit:1,tuned:1,ctx,gesture:gi,t,pose,...opts}),170+i*(size+10),y,size)});y+=size+12;}
 b+=`<g font-family="Segoe UI" font-size="11" fill="${ink}" opacity=".6">${times.map(([gi,t],i)=>`<text x="${170+i*(size+10)}" y="${y+4}">${t} ms${gi?' g'+(gi+1):''}</text>`).join('')}</g>`;
 await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${y+16}"><rect width="100%" height="100%" fill="${S.CTX[ctx].bg}"/>${b}</svg>`)).png().toFile(path.join(ev,file));
}
(async()=>{
 const cells=[...c.R018_REFS.map(v=>[v.id,v.physics?{physics:v.physics}:{}]),...V.map(v=>[v.id+' '+v.short,{physics:v.physics}])];
 const time=[0,400,800,1200,1600,2000,2400,2800].map(t=>[0,t]);
 for(const ctx of ['neutral','learn','light'])await board(ctx,`time-${ctx}.png`,cells,time,120);
 // physics response: curiosity tilt peak, walking mid-stride, rising, descending
 await board('learn','response-learn.png',cells,[[1,700],[2,1400],[2,2200],[4,1500],[5,800],[3,500]],120);
 await board('learn','small-learn.png',cells,time.slice(0,4),48);
 console.log('done');
})();
