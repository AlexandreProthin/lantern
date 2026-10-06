// r017 — procedural flame physics. Replaces the r011/r013 sideways-drifting contour.
// Hypothesis: the "ghost" reading comes from (1) a whole-body sideways sway like a sheet,
// (2) a round blob bottom with a single tip, (3) a soft milky edge glow. Real flames are
// pinned at the root, carry turbulence upward, stay vertical when the holder tilts and
// lag behind its movement; tongues lick and detach at the top.
// Deterministic: every frequency is k/9.6 s, so the flame loops seamlessly every 9.6 s.
(function(g){
'use strict';
const ROOT=91,H0=61,TAU=2*Math.PI,P=9.6;
const f=k=>k/P;
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
const PROFILES={
 // c01/c02: close to the accepted rounded bowl, to isolate motion.
 bowl:s=>s<.2?17.5*Math.sqrt(s/.2):17.5*Math.pow((1-s)/.8,1.55),
 // c03/c04: candle teardrop, narrow root, widest near the eyes, long taper.
 tear:s=>15*Math.pow(Math.sin(Math.PI*Math.pow(s,.55)),.9)
};
// Centerline sway and size at height s (0 root .. 1 tip) and time tau (seconds).
function field(s,tau,phys,lag=0){
 const tt=tau-lag, e=Math.pow(s,1.7);
 const sway=e*(2.0*Math.sin(TAU*f(5)*tt-2.2*s)+.9*Math.sin(TAU*f(13)*tt-4.5*s+1.3)+.35*Math.sin(TAU*f(36)*tt-9*s+.4));
 const accent=-1.4*s*s+1.2*Math.sin(Math.PI*s*1.5)*s; // accepted asymmetric hook
 return sway+accent+phys.lean*Math.pow(s,1.5);
}
function height(tau,phys){return H0*(1+.045*Math.sin(TAU*f(11)*tau)+.025*Math.sin(TAU*f(29)*tau+1))*phys.stretch}
// Closed smooth contour through sampled sides (Catmull-Rom -> cubic Bezier).
function contour(o){
 const {tau,phys,profile,scale=1,hscale=1,lag=0,cx=50,root=ROOT}=o,N=16,L=[],R=[];
 const H=height(tau-lag,phys)*hscale;
 for(let i=0;i<=N;i++){
  const s=i/N, w=profile(s)*scale*(1+.05*Math.sin(TAU*f(7)*(tau-lag)-3*s)), x=cx+field(s,tau,phys,lag), y=root-s*H;
  R.push([x+w,y]);L.push([x-w,y]);
 }
 const pts=[...R,...L.reverse().slice(1)];
 return smooth(pts);
}
function smooth(p){
 const n=p.length,q=i=>p[(i+n)%n];let d=`M ${p[0][0].toFixed(2)} ${p[0][1].toFixed(2)}`;
 for(let i=0;i<n;i++){const a=q(i-1),b=q(i),c=q(i+1),e=q(i+2);
  d+=` C ${(b[0]+(c[0]-a[0])/6).toFixed(2)} ${(b[1]+(c[1]-a[1])/6).toFixed(2)} ${(c[0]-(e[0]-b[0])/6).toFixed(2)} ${(c[1]-(e[1]-b[1])/6).toFixed(2)} ${c[0].toFixed(2)} ${c[1].toFixed(2)}`;}
 return d+' Z';
}
// Small teardrop for tongues, wisps and the like.
function drop(x,y,w,h,tilt=0){
 const P=[];for(let i=0;i<=10;i++){const s=i/10,ww=w*Math.pow(Math.sin(Math.PI*Math.pow(s,.6)),.9);P.push([x+ww+tilt*s*h,y-s*h]);}
 const Lp=[];for(let i=10;i>=1;i--){const s=i/10,ww=w*Math.pow(Math.sin(Math.PI*Math.pow(s,.6)),.9);Lp.push([x-ww+tilt*s*h,y-s*h]);}
 return smooth([...P,...Lp]);
}
const frac=x=>x-Math.floor(x);
// Physical response of the flame to the lantern's own motion (viewBox units per ms).
function response(z,prev,dt){
 if(!prev||!dt)return {lean:0,stretch:1,counter:-(z.angle||0)*.9};
 const vx=((z.x||0)-(prev.x||0))/dt, vy=((z.y||0)-(prev.y||0))/dt;
 return {lean:clamp(-vx*350,-5,5),stretch:clamp(1+vy*15,.8,1.2),counter:-(z.angle||0)*.9};
}
// o: {variant:{profile,tongues,wisps,embers,hot}, tau, phys, id, T}
function layers(o){
 const {variant:v,tau,phys,id,T,outer}=o,prof=PROFILES[v.profile],out=[],defs=[];
 const body=contour({tau,phys,profile:prof});
 const mid=contour({tau,phys,profile:prof,scale:.64,hscale:.74,lag:.08});
 const core=contour({tau,phys,profile:prof,scale:.38,hscale:.46,lag:.16});
 const H=height(tau,phys),tipX=50+field(1,tau,phys),tipY=ROOT-H;
 let extra='';
 if(v.tongues){
  // Two side tongues: emerge, climb the edge, pinch off, fade. Mostly absent (calm).
  [[-1,4.8,.1],[1,3.2,.62]].forEach(([side,per,ph])=>{
   const u=frac(tau/per+ph);if(u>.55)return;
   const grow=Math.sin(Math.PI*Math.min(1,u/.3)/2), s0=.42+.35*u, w0=prof(s0);
   const x=50+field(s0,tau,phys)+side*w0*.55, y=ROOT-s0*H+3;
   const detach=Math.max(0,(u-.3)/.25), op=1-detach;
   extra+=`<path d="${drop(x,y-detach*16,3.4*grow*(1-.45*detach),15*grow,side*.3)}" fill="${v.hot?`url(#${id}-heat)`:T.mid}" opacity="${op.toFixed(3)}"/>`;
  });
 }
 if(v.wisps){
  // A small piece of the tip separates and rises every 4.8 s, gone in ~1.4 s.
  const u=frac(tau/4.8+.37);if(u<.3){const k=u/.3;
   extra+=`<path d="${drop(tipX+1.5*Math.sin(TAU*k),tipY+2-k*16,2.2*(1-.6*k),7*(1-.4*k))}" fill="${v.hot?outer:T.mid}" opacity="${(.9*(1-k)).toFixed(3)}"/>`;}
 }
 if(v.embers){
  // Rare sparks: two, staggered, each visible under half its cycle.
  [[4.8,0],[9.6,.5]].forEach(([per,ph],i)=>{const u=frac(tau/per+ph);if(u>.45)return;const k=u/.45;
   const x=tipX+(i?3:-2)+3*Math.sin(TAU*(k*1.3+i*.4)),y=tipY+8-k*34;
   extra+=`<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${(.9*(1-.5*k)).toFixed(2)}" fill="${T.core}" opacity="${(1-k).toFixed(3)}"/><circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${(2.4*(1-.5*k)).toFixed(2)}" fill="${T.mid}" opacity="${(.25*(1-k)).toFixed(3)}"/>`;});
 }
 if(v.hot){
  // Crisper edge: tip cools and thins, root is the hottest point; little milky blur.
  defs.push(`<linearGradient id="${id}-heat" gradientUnits="userSpaceOnUse" x1="0" y1="${ROOT}" x2="0" y2="${ROOT-H}"><stop offset="0" stop-color="${T.mid}"/><stop offset=".35" stop-color="${outer}"/><stop offset=".85" stop-color="${outer}"/><stop offset="1" stop-color="#9a2c0c" stop-opacity=".75"/></linearGradient><radialGradient id="${id}-root" gradientUnits="userSpaceOnUse" cx="50" cy="${ROOT-4}" r="${H*.55}"><stop stop-color="${T.core}"/><stop offset=".55" stop-color="${T.mid}"/><stop offset="1" stop-color="${T.mid}" stop-opacity="0"/></radialGradient>`);
  out.push(`<path d="${body}" fill="${T.mid}" opacity=".12" filter="url(#${id}-blur)"/>`,extra,`<path d="${body}" fill="url(#${id}-heat)"/>`,
   `<path d="${mid}" fill="url(#${id}-root)" opacity=".95"/>`,`<path d="${core}" fill="${T.core}" opacity=".9"/>`);
 } else {
  out.push(`<path d="${body}" fill="${T.mid}" opacity=".27" filter="url(#${id}-blur)"/>`,extra,`<path d="${body}" fill="url(#${id}-depth)"/>`,
   `<path d="${mid}" fill="${T.mid}" opacity=".74"/>`,`<path d="${core}" fill="url(#${id}-inner)" opacity=".94"/>`);
 }
 const rot=`rotate(${phys.counter.toFixed(2)} 50 ${ROOT})`;
 return {svg:`<g transform="${rot}">${out.join('')}</g>`,defs:defs.join('')};
}
g.FlamePhysics={layers,response,contour,PROFILES,PERIOD:P*1000};
})(typeof window!=='undefined'?window:globalThis);
