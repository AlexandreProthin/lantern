const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert'),crypto=require('crypto');
const sharp=require('C:/Users/alexp/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root=path.resolve(__dirname,'..'),pkg=path.join(root,'package');global.window=global;for(const f of ['body.js','motion.js','styles.js'])vm.runInThisContext(fs.readFileSync(path.join(pkg,'runtime/sources',f),'utf8'));
const exportedAssets=[];
async function asset(svg,stem,sizes){fs.writeFileSync(path.join(pkg,stem+'.svg'),svg);for(const n of sizes){const file=stem+'-'+n+'.png';await sharp(Buffer.from(svg)).resize(n,n,{fit:'contain',background:'#00000000'}).png().toFile(path.join(pkg,file));const m=await sharp(path.join(pkg,file)).metadata();assert(m.width===n&&m.height===n&&m.hasAlpha);exportedAssets.push({path:file,width:n,height:n,alpha:true});}}
(async()=>{
for(const n of [16,24,32,48])for(const tone of ['light','dark']){const source=fs.readFileSync(path.join(__dirname,n===16?'favicon-optical-16.svg':'favicon-master.svg'),'utf8');await asset(source.replaceAll('currentColor',tone==='light'?'#eeeeee':'#181818'),`exports/favicon/favicon-${tone}-${n}`,[n]);}
let mark=FlameStyles.svg(1,0).replace(/<ellipse[^>]*fill="black"\/>/g,'');await asset(mark,'exports/mark/amber-ember',[64,128,256,512]);
for(let i=0;i<6;i++)await asset(LanternMotion.svg(i,LanternMotion.still(i),'export-'+i),`exports/companion/gesture-${String(i+1).padStart(2,'0')}`,[64,128,256]);
let sheet='<svg xmlns="http://www.w3.org/2000/svg" width="1040" height="740"><rect width="1040" height="740" fill="#181818"/><text x="30" y="42" fill="#eee" font-family="Segoe UI" font-size="25">LANTERN / IDENTITY SYSTEM — REVIEW</text>';
for(let i=0;i<6;i++){const x=25+i%3*335,y=220+Math.floor(i/3)*240;sheet+=`<text x="${x}" y="${y}" fill="#ddd" font-family="Segoe UI" font-size="17">${LanternMotion.specs[i].name}</text>`+LanternMotion.svg(i,LanternMotion.still(i),'board-'+i).replace('<svg ',`<svg x="${x+40}" y="${y+8}" width="180" height="190" `);}
sheet+='<text x="30" y="100" fill="#ddd" font-family="Segoe UI" font-size="17">Native monochrome favicon / 16 · 24 · 32 · 48 px</text>';let x=35;for(const n of [16,24,32,48]){const f=`exports/favicon/favicon-light-${n}-${n}.png`;sheet+=`<image x="${x}" y="130" width="${n}" height="${n}" href="data:image/png;base64,${fs.readFileSync(path.join(pkg,f)).toString('base64')}"/>`;x+=n+32;}sheet+=mark.replace('<svg ','<svg x="800" y="55" width="140" height="148" ')+'</svg>';
await sharp(Buffer.from(sheet)).png().toFile(path.join(root,'evidence/system-board.png'));fs.writeFileSync(path.join(root,'evidence/export-verification.json'),JSON.stringify({checks:['PNG dimensions match declared square size','PNG alpha channel present','SVG renderable'],exports:exportedAssets},null,2));console.log('Transparent favicon, mark and six static companion export families verified.');
})().catch(e=>{console.error(e);process.exit(1)});

