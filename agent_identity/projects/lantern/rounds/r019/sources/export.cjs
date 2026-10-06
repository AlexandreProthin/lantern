// Exports lantern-identity-v0.2-review from package/runtime/sources (single source of truth).
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const sharp=require('C:/Users/alexp/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root=path.resolve(__dirname,'..'),pkg=path.join(root,'package');global.window=global;
for(const f of ['body.js','motion.js','favicons.js','system.js','styles.js'])vm.runInThisContext(fs.readFileSync(path.join(pkg,'runtime/sources',f),'utf8'));
const M=LanternMotion,I=LanternIdentity,S=LanternSystem,out=[];
const CTX={neutral:'on-dark',learn:'on-learn',light:'on-light'};
async function asset(svg,stem,sizes){fs.writeFileSync(path.join(pkg,stem+'.svg'),svg);for(const n of sizes){const file=stem+'-'+n+'.png';await sharp(Buffer.from(svg),{density:Math.max(72,n*1.2)}).resize(n,n,{fit:'contain',background:'#00000000'}).png().toFile(path.join(pkg,file));const m=await sharp(path.join(pkg,file)).metadata();assert(m.width===n&&m.height===n&&m.hasAlpha);out.push({path:file,width:n,height:n,alpha:true});}}
(async()=>{
 for(const n of [16,24,32,48])for(const ctx of ['neutral','light']){
  await asset(I.favicon(n,ctx,true),`exports/favicon/ember-${CTX[ctx]}-${n}`,[n]);
  await asset(I.favicon(n,ctx,false),`exports/favicon/mono-${CTX[ctx]}-${n}`,[n]);
 }
 for(const ctx of Object.keys(CTX))await asset(I.mark(ctx,'mark-'+ctx),`exports/mark/mark-${CTX[ctx]}`,[64,128,256,512]);
 for(const ctx of Object.keys(CTX)){M.context=ctx;for(let i=0;i<6;i++)await asset(M.svg(i,M.still(i),`c${i}-${ctx}`),`exports/companion/gesture-${String(i+1).padStart(2,'0')}-${CTX[ctx]}`,[64,128,256]);}
 // System boards, one per background.
 for(const ctx of Object.keys(CTX)){M.context=ctx;const bg=S.CTX[ctx].bg,ink=ctx==='light'?'#292018':'#eeeeee';
  let s=`<svg xmlns="http://www.w3.org/2000/svg" width="1040" height="760"><rect width="1040" height="760" fill="${bg}"/><text x="30" y="42" fill="${ink}" font-family="Segoe UI" font-size="24">LANTERN / IDENTITY v0.2 — REVIEW · ${ctx}</text><text x="30" y="92" fill="${ink}" font-family="Segoe UI" font-size="15">Ember favicon 16 · 24 · 32 · 48 px (native PNG) · mono 32</text>`;
  let x=35;for(const n of [16,24,32,48]){s+=`<image x="${x}" y="${150-n}" width="${n}" height="${n}" href="data:image/png;base64,${fs.readFileSync(path.join(pkg,`exports/favicon/ember-${CTX[ctx==='learn'?'neutral':ctx]}-${n}-${n}.png`)).toString('base64')}"/>`;x+=n+28;}
  s+=`<image x="${x+10}" y="118" width="32" height="32" href="data:image/png;base64,${fs.readFileSync(path.join(pkg,`exports/favicon/mono-${CTX[ctx==='learn'?'neutral':ctx]}-32-32.png`)).toString('base64')}"/>`;
  s+=I.mark(ctx,'bm-'+ctx).replace('<svg ','<svg x="790" y="40" width="150" height="160" ')+`<text x="830" y="215" fill="${ink}" font-family="Segoe UI" font-size="13">mark (face-free)</text>`;
  for(let i=0;i<6;i++){const X=25+i%3*335,Y=240+Math.floor(i/3)*250;s+=`<text x="${X}" y="${Y}" fill="${ink}" font-family="Segoe UI" font-size="16">${M.specs[i].name}</text>`+M.svg(i,M.still(i),`b${i}-${ctx}`).replace('<svg ',`<svg x="${X+40}" y="${Y+8}" width="180" height="200" `);}
  await sharp(Buffer.from(s+'</svg>')).png().toFile(path.join(root,`evidence/system-board-${ctx}.png`));}
 fs.writeFileSync(path.join(root,'evidence/export-verification.json'),JSON.stringify({checks:['PNG dimensions match declared square size','PNG alpha channel present','SVG renderable by sharp/librsvg'],count:out.length,exports:out},null,2));
 console.log('exports',out.length);
})().catch(e=>{console.error(e);process.exit(1)});
