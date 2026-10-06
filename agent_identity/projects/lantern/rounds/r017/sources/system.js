// r017 — r016 system renderer plus optional flame physics (o.physics, see flame.js).
// r016 — combinable system propositions on top of the r015 draft.
// Requires body.js and motion.js (copied unchanged from r015 runtime).
// Draft rendering (all options off) reproduces r015 styles.js / r013-c01.
(function(g){
'use strict';
const T={outer:'#c94b16',mid:'#ffac38',core:'#fff2b3',frame:'#9b7254',halo:.20,blur:6};
// c07 per-background tuning; draft uses T everywhere.
const CTX={
 neutral:{bg:'#181818',frame:'#9b7254',outer:'#c94b16',halo:.20,lit:['#ebbb88','#7a573f']},
 learn:{bg:'#101827',frame:'#a57a5a',outer:'#c94b16',halo:.24,lit:['#efc08c','#86624a']},
 light:{bg:'#f4eee3',frame:'#6e4a32',outer:'#b8410f',halo:0,lit:['#9a6a44','#5e3f2a']}
};
const FLAME_KEY='C 32 88 40 91 50 91';
const FRAME_PATHS=/<path d="M (47|51) 21[^"]*"\/>|<path fill-rule="evenodd"[^>]*\/>|<rect x="24" y="90"[^>]*\/>/g;

// o: {gesture,t,pose,uid,face,ctx,lit,ground,tuned,flat,thick}
function actor(o){
 const M=g.LanternMotion,gi=o.gesture||0,t=o.t||0,id=o.uid||'a';
 const z=o.pose||M.pose(gi,t), ctx=CTX[o.ctx||'neutral'], tun=o.tuned?ctx:null;
 const outer=tun?tun.outer:T.outer, frame=tun?tun.frame:T.frame, halo=tun?tun.halo:T.halo;
 let out=M.svg(gi,z,id,g.LanternBody);
 const flame=[...out.matchAll(/<path d="M [^"]+"\/>/g)].find(x=>x[0].includes(FLAME_KEY))[0];
 const shape=flame.match(/d="([^"]+)"/)[1];
 const ft=z.flameTime||0,a=2*Math.PI*ft/2400,
  m=.9*Math.sin(a), c=.55*(Math.sin(a+Math.PI/3)-Math.sin(Math.PI/3)), h=.8*(Math.sin(a+Math.PI/2)-1);
 let defs=`<radialGradient id="${id}-depth" cx="42%" cy="72%" r="70%"><stop stop-color="${T.core}"/><stop offset=".42" stop-color="${T.mid}"/><stop offset="1" stop-color="${outer}"/></radialGradient><radialGradient id="${id}-light"><stop stop-color="${T.mid}" stop-opacity="${halo}"/><stop offset="1" stop-color="${T.mid}" stop-opacity="0"/></radialGradient><linearGradient id="${id}-inner" x1="0" y1="1" x2=".3" y2="0"><stop stop-color="${T.core}"/><stop offset="1" stop-color="${T.mid}"/></linearGradient><clipPath id="${id}-clip"><path d="${shape}"/></clipPath><filter id="${id}-blur" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="${T.blur}"/></filter>`;
 let layers;
 if(o.flat){
  // c04 flat tier: same layer geometry, solid fills, no blur/halo.
  layers=`<path d="${shape}" fill="${outer}"/><g clip-path="url(#${id}-clip)"><path d="M${48+m} ${46+h} C${42+m} 59 ${53+m} 62 ${47+m*.6} 69 C39 77 39 88 50 91 C63 91 66 81 ${57+m*.4} 72 C${51+m} 65 ${57+m} 57 ${48+m} ${46+h}Z" fill="${T.mid}"/><path d="M${49+c} ${65+h*.5} C${45+c} 74 ${46+c} 77 43 82 C42 89 49 92 53 90 C60 87 ${54+c} 79 ${53+c} 76Z" fill="${T.core}"/></g>`;
 } else {
  layers=`<path d="${shape}" fill="${T.mid}" opacity=".27" filter="url(#${id}-blur)"/><path d="${shape}" fill="url(#${id}-depth)"/><g clip-path="url(#${id}-clip)"><path d="M${48+m} ${46+h} C${42+m} 59 ${53+m} 62 ${47+m*.6} 69 C39 77 39 88 50 91 C63 91 66 81 ${57+m*.4} 72 C${51+m} 65 ${57+m} 57 ${48+m} ${46+h}Z" fill="${T.mid}" opacity=".74"/><path d="M${49+c} ${65+h*.5} C${45+c} 74 ${46+c} 77 43 82 C42 89 49 92 53 90 C60 87 ${54+c} 79 ${53+c} 76Z" fill="url(#${id}-inner)" opacity=".94"/></g>`;
 }
 if(o.physics){
  const F=g.FlamePhysics, prev=o.pose?null:M.pose(gi,Math.max(0,t-40)), phys=F.response(z,prev,o.pose?0:Math.min(40,t));
  const r=F.layers({variant:o.physics,tau:(z.flameTime||0)/1000,phys,id,T,outer});
  layers=r.svg;defs+=r.defs;
 }
 out=out.replace(flame,layers);
 // c01 lit frame: frame receives the flame's light, warm near it, darker away.
 let frameFill=frame;
 if(o.lit){
  const [near,far]=(tun||CTX.neutral).lit;
  defs+=`<radialGradient id="${id}-lit" gradientUnits="userSpaceOnUse" cx="50" cy="70" r="38"><stop offset=".3" stop-color="${near}"/><stop offset="1" stop-color="${far}"/></radialGradient>`;
  frameFill=`url(#${id}-lit)`;
 }
 if(o.thick)out=out.replace(FRAME_PATHS,x=>x.replace('/>',` stroke="${frameFill}" stroke-width="1.8" stroke-linejoin="round"/>`));
 if(o.lit)out=out.replace(FRAME_PATHS,x=>x.replace(/^<(path|rect)/,`<$1 fill="${frameFill}"`));
 if(!o.face)out=out.replace(/<ellipse cx="[^"]+" cy="7[34]"[^>]*fill="black"\/>/g,'');
 // c06 ground light: warm pool under the base, fading with altitude; outside the actor transform.
 if(o.ground){
  const alt=Math.max(0,-(z.y||0)-(z.feet?8*z.feet:0)), k=Math.max(0,1-alt/22), gy=99+11*(z.feet||0);
  defs+=`<radialGradient id="${id}-pool"><stop stop-color="${T.mid}" stop-opacity="${((o.ctx==='light'&&tun)?.12:.24)*k}"/><stop offset="1" stop-color="${T.mid}" stop-opacity="0"/></radialGradient>`;
  out=out.replace('<g fill="currentColor">',`<ellipse cx="${50+(z.x||0)}" cy="${gy}" rx="${30+6*(1-k)}" ry="5" fill="url(#${id}-pool)"/><g fill="currentColor">`);
 }
 out=out.replace('<defs>','<defs>'+defs).replace('<g fill="currentColor">',`<g fill="${frame}">`);
 if(halo>0)out=out.replace('<g mask=',`<ellipse cx="50" cy="68" rx="60" ry="53" fill="url(#${id}-light)"/><g mask=`);
 if(!o.flat)out=out.replace(/(<rect x="24" y="90"[^>]*\/>)/,`$1<path d="M29 92 H71" stroke="${T.mid}" stroke-opacity=".45" stroke-width="1" stroke-linecap="round"/>`);
 return out.replaceAll('currentColor',frame);
}

// Favicons. Draft: monochrome ink. c02 ember: ink frame + flat amber flame.
function favicon(size,o){
 const tone=o.ctx==='light'?'#181818':'#eeeeee';
 const src=(size===16?g.FAVICON16:g.FAVICON).replace(/^<svg[^>]*>/,'').replace(/<\/svg>$/,'');
 let inner=src.replaceAll('currentColor',tone);
 if(o.ember){
  const flameColor=o.ctx==='light'?'#d0561a':'#f39a3a';
  inner=inner.replace(/<path d="M 49 30[^"]*"/,x=>x+` fill="${flameColor}"`);
 }
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}">${inner}</svg>`;
}

// c03 app tile: warm-black rounded square carrying its own darkness and glow.
function tile(o){
 const id=o.uid||'tile';
 const inner=actor({...o,face:false,ctx:'neutral',tuned:false,uid:id+'-m'}).replace(/^<svg[^>]*>/,'').replace(/<\/svg>$/,'');
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><radialGradient id="${id}-bg" cx="50%" cy="58%" r="62%"><stop stop-color="#4a2c18"/><stop offset=".6" stop-color="#21170f"/><stop offset="1" stop-color="#140f0b"/></radialGradient></defs><rect x="2" y="2" width="96" height="96" rx="22" fill="url(#${id}-bg)"/><rect x="2.5" y="2.5" width="95" height="95" rx="21.5" fill="none" stroke="#ffffff" stroke-opacity=".07"/><svg x="5" y="4" width="90" height="94" viewBox="-20 -24 140 148">${inner}</svg></svg>`;
}

g.LanternSystem={T,CTX,actor,favicon,tile};
})(typeof window!=='undefined'?window:globalThis);
