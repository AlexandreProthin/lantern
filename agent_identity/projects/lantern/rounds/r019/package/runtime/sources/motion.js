(function(global){
 'use strict';
 const specs=[
  {id:'r011-c01',name:'Repos disponible',parent:'r010-c01',duration:2400,meaning:'Présence attentive',trigger:'Disponibilité — repos sans boucle',fallback:'Regard neutre'},
  {id:'r011-c02',name:'Curiosité',parent:'r010-c02',duration:1800,meaning:'Une piste attire l’attention',trigger:'Réaction ponctuelle demandée',fallback:'Inclinaison légère, regard latéral'},
  {id:'r011-c03',name:'Quelques pas',parent:'r010-c03',duration:3200,meaning:'Déplacement court',trigger:'Destination choisie par l’utilisateur',fallback:'Pieds posés à destination'},
  {id:'r011-c04',name:'Suspension',parent:'r010-c04',duration:3600,meaning:'Stabilisation après accrochage',trigger:'Attache choisie à la boucle',fallback:'Suspendu immobile'},
  {id:'r011-c05',name:'Chauffe et envol',parent:'r010-c05',duration:3200,meaning:'Élévation douce',trigger:'Flottement explicitement demandé',fallback:'Flottant immobile'},
  {id:'r011-c06',name:'Descente et pose',parent:'r010-c06',duration:3000,meaning:'Retour à un appui stable',trigger:'Retour au sol demandé',fallback:'Pieds posés'}
 ];
 const clamp=x=>Math.min(1,Math.max(0,x)),ease=x=>{x=clamp(x);return x*x*(3-2*x)},segment=(t,a,b)=>ease((t-a)/(b-a));
 function pose(i,t,reduced=false){
  const s=specs[i],u=clamp(t/s.duration),z={x:0,y:0,angle:0,pivot:94,feet:0,step:0,gaze:0,lid:0,line:0};
  if(reduced)return still(i);
  if(i===0){z.lid=Math.sin(Math.PI*clamp((u-.3)/.13))**2;if(u<.3||u>.43)z.lid=0;}
  if(i===1){const a=segment(u,0,.28)*(1-segment(u,.68,1));z.angle=6*a;z.gaze=3*a;}
  if(i===2){const a=segment(u,.18,.86),f=segment(u,0,.18);z.x=-12+24*a;z.feet=f;z.y=-8*f;const travel=Math.sin(Math.PI*clamp((u-.18)/.68));z.step=Math.sin(4*Math.PI*a)*travel;z.y-=.9*travel*Math.abs(Math.sin(4*Math.PI*a));z.angle=1.2*z.step;}
  if(i===3){z.line=1;z.pivot=4;z.angle=7*Math.sin(4*Math.PI*u)*Math.exp(-3*u)*(1-ease(u));}
  if(i===4){z.y=-17*segment(u,.25,.85);z.angle=1.5*Math.sin(2*Math.PI*u)*Math.sin(Math.PI*u);}
  if(i===5){z.y=-17+9*segment(u,0,.7);z.feet=segment(u,.45,.78);const settle=Math.sin(Math.PI*clamp((u-.72)/.28));z.y+=1.2*settle;}
  z.flameTime=t;
  return z;
 }
 function still(i){const z={x:0,y:0,angle:0,pivot:94,feet:0,step:0,gaze:0,lid:0,line:0};if(i===1){z.angle=3;z.gaze=3;}if(i===2){z.x=12;z.y=-8;z.feet=1;}if(i===3){z.line=1;z.pivot=4;}if(i===4)z.y=-17;if(i===5){z.y=-8;z.feet=1;}return z;}
 function initial(i){return pose(i,0);}
 function mix(a,b,t){const z={};for(const key of Object.keys(a))z[key]=a[key]+((b[key]||0)-a[key])*ease(t);return z;}
 function svg(i,z,uid='actor',body=global.LanternBody||''){
  const eye=3.2*(1-.85*z.lid),mask=`${uid}-face`,line=z.line?'<path d="M50 -16 V4" fill="none" stroke="currentColor" stroke-width="1.7"/>':'';
  const footA=-2.5*Math.max(0,z.step),footB=-2.5*Math.max(0,-z.step);
  const feet=z.feet?`<g opacity="${z.feet}"><path d="M35 96 V${96+11*z.feet+footA} H28 M65 96 V${96+11*z.feet+footB} H72" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></g>`:'';
  const t=z.flameTime||0, a=2*Math.PI*t/1200;
  // Smooth periodic contour drift, pinned lower bowl; eyes and frame stay fixed.
  const dx=1.15*Math.sin(a)+.35*Math.sin(2*a), dy=.8*(Math.sin(a+Math.PI/3)-Math.sin(Math.PI/3));
  const flame=`<path d="M ${49+dx} ${30+dy} C ${38+.65*dx} ${35+dy} ${53+dx} ${41+dy} ${46+.7*dx} 51 C ${43+.5*dx} 56 31 67 32 78 C 32 88 40 91 50 91 C 64 91 71 83 64 73 C 56 62 ${64+.6*dx} 56 ${60+.8*dx} ${47+dy} C ${57+dx} ${41+dy} ${47+dx} ${40+dy} ${49+dx} ${30+dy} Z"/>`;
  const livingBody=body.replace(/<path d="M 49 30[^>]*\/>/,flame);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-20 -24 140 148" role="img" aria-label="${specs[i].name}"><defs><mask id="${mask}"><rect x="-40" y="-40" width="200" height="220" fill="white"/><ellipse cx="${44+z.gaze}" cy="74" rx="2.2" ry="${eye}" fill="black"/><ellipse cx="${55+z.gaze}" cy="73" rx="2.2" ry="${eye}" fill="black"/></mask></defs><g fill="currentColor">${line}<g transform="translate(${z.x} ${z.y}) rotate(${z.angle} 50 ${z.pivot})"><g mask="url(#${mask})">${livingBody}</g>${feet}</g></g></svg>`;
 }
 const api={specs,pose,still,initial,mix,svg};if(typeof module!=='undefined')module.exports=api;global.LanternMotion=api;
})(typeof window!=='undefined'?window:globalThis);

