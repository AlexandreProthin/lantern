(function(g){
const styles=[
 {id:'r012-c01-reference',name:'Accepted Amber ember',outer:'#c94b16',mid:'#ffac38',core:'#fff2b3',frame:'#9b7254',halo:.20,blur:6},
 {id:'r013-c01',name:'Living inner layers',outer:'#c94b16',mid:'#ffac38',core:'#fff2b3',frame:'#9b7254',halo:.20,blur:6}
];
function svg(k,t=0,gesture=0){
 const M=g.LanternMotion,s=styles[k],id=s.id,z=M.pose(gesture,t);
 let out=M.svg(gesture,z,id,g.LanternBody);
 const paths=[...out.matchAll(/<path d="M [^"]+"\/>/g)];
 const flame=paths.find(x=>x[0].includes('C 32 88 40 91 50 91'))[0];
 const shape=flame.match(/d="([^"]+)"/)[1];
 const defs=`<radialGradient id="${id}-depth" cx="42%" cy="72%" r="70%"><stop stop-color="${s.core}"/><stop offset=".42" stop-color="${s.mid}"/><stop offset="1" stop-color="${s.outer}"/></radialGradient><radialGradient id="${id}-light"><stop stop-color="${s.mid}" stop-opacity="${s.halo}"/><stop offset="1" stop-color="${s.mid}" stop-opacity="0"/></radialGradient><linearGradient id="${id}-inner" x1="0" y1="1" x2=".3" y2="0"><stop stop-color="${s.core}"/><stop offset="1" stop-color="${s.mid}"/></linearGradient><clipPath id="${id}-clip"><path d="${shape}"/></clipPath><filter id="${id}-blur" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="${s.blur}"/></filter>`;
 // Zero at rest; phase-offset curves share a 2400 ms seamless cycle.
 const a=2*Math.PI*t/2400, m=k===1?.9*Math.sin(a):0,
 c=k===1?.55*(Math.sin(a+Math.PI/3)-Math.sin(Math.PI/3)):0,
 h=k===1?.8*(Math.sin(a+Math.PI/2)-1):0;
 const layers=`<path d="${shape}" fill="${s.mid}" opacity=".27" filter="url(#${id}-blur)"/><path d="${shape}" fill="url(#${id}-depth)"/><g clip-path="url(#${id}-clip)"><path d="M${48+m} ${46+h} C${42+m} 59 ${53+m} 62 ${47+m*.6} 69 C39 77 39 88 50 91 C63 91 66 81 ${57+m*.4} 72 C${51+m} 65 ${57+m} 57 ${48+m} ${46+h}Z" fill="${s.mid}" opacity=".74"/><path d="M${49+c} ${65+h*.5} C${45+c} 74 ${46+c} 77 43 82 C42 89 49 92 53 90 C60 87 ${54+c} 79 ${53+c} 76Z" fill="url(#${id}-inner)" opacity=".94"/></g>`;
 out=out.replace(flame,layers).replace('<defs>','<defs>'+defs).replace('<g fill="currentColor">',`<ellipse cx="50" cy="68" rx="60" ry="53" fill="url(#${id}-light)"/><g fill="${s.frame}">`);
 // A restrained reflected warm rim, kept inside the accepted base footprint.
 out=out.replace('</svg>',`<path d="M29 92 H71" stroke="${s.mid}" stroke-opacity=".45" stroke-width="1" stroke-linecap="round"/></svg>`);
 return out;
}
g.FlameStyles={styles,svg};
})(typeof window!=='undefined'?window:globalThis);

