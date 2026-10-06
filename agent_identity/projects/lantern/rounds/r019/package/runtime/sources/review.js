'use strict';
const M=window.LanternMotion,grid=document.getElementById('grid'),$=id=>document.getElementById(id);
let timeline=0,running=false,paused=false,hidden=false,last=0,only=-1,poses=M.specs.map((_,i)=>M.initial(i)),transition=null;
const systemReduced=matchMedia('(prefers-reduced-motion: reduce)');$('reduced').checked=systemReduced.matches;
grid.innerHTML=M.specs.map((s,i)=>`<article><h2>${String(i+1).padStart(2,'0')} / ${s.name}</h2><div class="caption">${s.meaning} · ${(s.duration/1000).toFixed(1)} s</div><div class="stage"><div class="actor" id="actor-${i}"></div></div><button type="button" data-play="${i}">Lire ce geste</button></article>`).join('');
function draw(){poses.forEach((z,i)=>$('actor-'+i).innerHTML=hidden?'':M.svg(i,z,'review-'+i));$('clock').value=(timeline/1000).toFixed(2).replace('.',',')+' s';$('time').value=String(timeline);$('pause').disabled=!running&&!paused;$('pause').textContent=paused?'Reprendre':'Pause';}
function report(text){$('status').textContent=text;}
function cancel(){running=false;paused=false;transition=null;last=0;}
function play(index=-1){cancel();hidden=false;$('hide').textContent='Masquer';only=index;timeline=0;if($('reduced').checked){poses=poses.map((z,i)=>index<0||index===i?M.still(i):z);draw();report('Mouvement réduit — pose d’arrivée, sans déplacement.');return;}running=true;poses=poses.map((z,i)=>index<0||index===i?M.initial(i):z);draw();report('Lecture unique — arrêt à la fin du geste.');}
function interrupt(){cancel();if(hidden){report('Masqué — aucun mouvement.');return;}if($('reduced').checked){poses=M.specs.map((_,i)=>M.still(i));draw();report('Interrompu — poses statiques.');return;}const target=M.specs.map((_,i)=>M.still(i));for(const i of [2,4,5]){target[i].x=poses[i].x;target[i].y=poses[i].y;target[i].feet=poses[i].feet;}transition={from:poses.map(z=>({...z})),to:target,elapsed:0};running=true;report('Interruption — stabilisation en 180 ms.');}
function tick(now){const dt=last?Math.min(now-last,64):0;last=now;if(running){if(transition){transition.elapsed+=dt;poses=transition.from.map((z,i)=>M.mix(z,transition.to[i],transition.elapsed/180));if(transition.elapsed>=180){running=false;transition=null;report('Interrompu — poses statiques.');}}else{timeline=Math.min(3600,timeline+dt);poses=poses.map((z,i)=>only<0||only===i?M.pose(i,timeline):z);const end=only<0?3600:M.specs[only].duration;if(timeline>=end){running=false;report('Terminé — immobile.');}}draw();}requestAnimationFrame(tick);}
$('play').onclick=()=>play();grid.onclick=e=>{const b=e.target.closest('[data-play]');if(b)play(Number(b.dataset.play));};
$('pause').onclick=()=>{if(running){running=false;paused=true;report('Pause — position conservée.');}else if(paused){running=true;paused=false;last=0;report('Lecture reprise.');}draw();};$('stop').onclick=interrupt;
$('static').onclick=()=>{cancel();poses=M.specs.map((_,i)=>M.still(i));draw();report('Poses statiques — mêmes possibilités de posture.');};
$('hide').onclick=()=>{cancel();hidden=!hidden;$('hide').textContent=hidden?'Afficher':'Masquer';if(!hidden)poses=M.specs.map((_,i)=>M.still(i));draw();report(hidden?'Masqué — aucun mouvement.':'Affiché immobile — aucune reprise automatique.');};
$('reduced').onchange=()=>{cancel();poses=M.specs.map((_,i)=>M.still(i));draw();report($('reduced').checked?'Mouvement réduit — poses statiques.':'Mouvement complet disponible — lecture à la demande.');};
systemReduced.addEventListener('change',e=>{if(e.matches){$('reduced').checked=true;$('reduced').onchange();}});
function identity(){const c=M.context,I=window.LanternIdentity,cell=(svg,n,l)=>`<span style="display:inline-flex;flex-direction:column;align-items:center;gap:4px;font-size:12px">${svg.replace('<svg ',`<svg width="${n}" height="${n}" `)}${l}</span>`;
 $('identity').innerHTML=[16,24,32,48].map(n=>cell(I.favicon(n,c,true),n,n+' px')).join('')+cell(I.favicon(32,c,false),32,'mono 32')+cell(I.mark(c,'mark-review'),96,'marque');}
$('ctx').onchange=()=>{M.context=$('ctx').value;document.body.className=M.context==='neutral'?'':M.context;identity();draw();};identity();
$('size').onchange=()=>document.querySelectorAll('.actor').forEach(e=>e.style.width=$('size').value+'px');
$('time').oninput=()=>{cancel();only=-1;timeline=Number($('time').value);poses=M.specs.map((_,i)=>M.pose(i,timeline,$('reduced').checked));draw();report('Position choisie — immobile.');};
document.addEventListener('visibilitychange',()=>{if(document.hidden){cancel();draw();report('Lecture arrêtée lorsque la page est masquée.');}});
window.LanternReview={sample:t=>{$('time').value=t;$('time').oninput();},state:()=>({timeline,running,paused,hidden,reduced:$('reduced').checked,poses:poses.map(z=>({...z})),transition:!!transition})};
if($('reduced').checked)poses=M.specs.map((_,i)=>M.still(i));draw();requestAnimationFrame(tick);
