const fs=require('fs'),path=require('path'),{spawn}=require('child_process');
const sharp=require('C:/Users/alexp/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const M=require('./motion.js'),root=path.resolve(__dirname,'..');
const data=fs.readFileSync(path.join(__dirname,'body.js'),'utf8');const body=JSON.parse(data.slice('window.LanternBody='.length).trim().replace(/;$/,''));
function text(x,y,s,n=17){return `<text x="${x}" y="${y}" font-family="Segoe UI,Arial,sans-serif" font-size="${n}" fill="#eeeeee">${s}</text>`}
function board(t,reduced=false){let s='<svg xmlns="http://www.w3.org/2000/svg" width="960" height="720"><rect width="960" height="720" fill="#181818"/>'+text(24,39,'LANTERN / PREMIÈRES ÉTUDES DE MOUVEMENT',24)+text(24,69,reduced?'Poses de remplacement — mouvement réduit':'Six gestes finis · rythme proposé · '+(t/1000).toFixed(1)+' s');for(let i=0;i<6;i++){const x=22+(i%3)*314,y=94+Math.floor(i/3)*276;const z=reduced?M.still(i):M.pose(i,t);s+=`<rect x="${x}" y="${y}" width="300" height="258" rx="12" fill="#242424"/>`+text(x+14,y+30,String(i+1).padStart(2,'0')+' / '+M.specs[i].name,18);s+=M.svg(i,z,'frame-'+i,body).replace('<svg ',`<svg x="${x+52}" y="${y+43}" width="196" height="207" `).replaceAll('currentColor','#eeeeee');}return s+text(24,683,'La répétition sert à la comparaison ; la proposition interactive s’arrête après chaque geste.',14)+'</svg>';}
(async()=>{
 fs.writeFileSync(path.join(root,'sources/specs.json'),JSON.stringify(M.specs,null,2));
 for(let i=0;i<6;i++){fs.writeFileSync(path.join(root,'sources',M.specs[i].id+'-static.svg'),M.svg(i,M.still(i),'static-'+i,body));for(const n of [32,64,128])for(const dark of [false,true]){await sharp(Buffer.from(M.svg(i,M.pose(i,Math.min(1400,M.specs[i].duration/2)),'native-'+i,body).replaceAll('currentColor',dark?'#eee':'#181818'))).resize(n,n).flatten({background:dark?'#181818':'#fff'}).png().toFile(path.join(root,'evidence',`${M.specs[i].id}-${n}-${dark?'dark':'light'}.png`));}}
 for(const t of [0,600,1400,2400,3600])await sharp(Buffer.from(board(t))).png().toFile(path.join(root,'evidence','motion-'+t+'.png'));
 await sharp(Buffer.from(board(3600,true))).png().toFile(path.join(root,'evidence','reduced.png'));
 fs.writeFileSync(path.join(root,'evidence/renderer.json'),JSON.stringify(sharp.versions,null,2));
 const args=['-hide_banner','-loglevel','error','-y','-f','image2pipe','-framerate','20','-i','pipe:0','-vf','split[a][b];[a]palettegen=stats_mode=full[p];[b][p]paletteuse=dither=bayer','-loop','0',path.join(root,'motion-preview.gif')];
 const proc=spawn('C:/Users/alexp/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg.Essentials_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-8.1.1-essentials_build/bin/ffmpeg.exe',args,{windowsHide:true,stdio:['pipe','ignore','pipe']});let err='';proc.stderr.on('data',b=>err+=b);const done=new Promise((resolve,reject)=>{proc.on('error',reject);proc.on('close',n=>n===0?resolve():reject(new Error(err)))});
 for(let f=0;f<100;f++){const t=Math.min(3600,Math.max(0,f*50-500));const b=await sharp(Buffer.from(board(t))).png().toBuffer();if(!proc.stdin.write(b))await new Promise(resolve=>proc.stdin.once('drain',resolve));}
 proc.stdin.end();await done;console.log('GIF comparison, sampled frames, 36 native mid-gesture tests and static fallbacks rendered.');
})().catch(e=>{console.error(e);process.exit(1)});
