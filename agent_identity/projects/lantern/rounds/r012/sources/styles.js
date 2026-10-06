(function(g){
const styles=[
 {id:'r012-c01',name:'Amber ember',outer:'#c94b16',mid:'#ffac38',core:'#fff2b3',frame:'#9b7254',halo:.20,blur:6},
 {id:'r012-c02',name:'Soft golden flame',outer:'#d77a2a',mid:'#ffd477',core:'#fff8d8',frame:'#a88b68',halo:.14,blur:8},
 {id:'r012-c03',name:'Deep hearth',outer:'#a63219',mid:'#ff8633',core:'#ffe7a1',frame:'#986450',halo:.25,blur:5}
];
function svg(k,t=0,gesture=0){
 const M=g.LanternMotion,s=styles[k],id=s.id,z=M.pose(gesture,t);
 let out=M.svg(gesture,z,id,g.LanternBody);
 const paths=[...out.matchAll(/<path d="M [^"]+"\/>/g)];
 const flame=paths.find(x=>x[0].includes('C 32 88 40 91 50 91'))[0];
 const shape=flame.match(/d="([^"]+)"/)[1];
 const defs=`<radialGradient id="${id}-depth" cx="42%" cy="72%" r="70%"><stop stop-color="${s.core}"/><stop offset=".42" stop-color="${s.mid}"/><stop offset="1" stop-color="${s.outer}"/></radialGradient><radialGradient id="${id}-light"><stop stop-color="${s.mid}" stop-opacity="${s.halo}"/><stop offset="1" stop-color="${s.mid}" stop-opacity="0"/></radialGradient><linearGradient id="${id}-inner" x1="0" y1="1" x2=".3" y2="0"><stop stop-color="${s.core}"/><stop offset="1" stop-color="${s.mid}"/></linearGradient><clipPath id="${id}-clip"><path d="${shape}"/></clipPath><filter id="${id}-blur" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="${s.blur}"/></filter>`;
 const layers=`<path d="${shape}" fill="${s.mid}" opacity=".27" filter="url(#${id}-blur)"/><path d="${shape}" fill="url(#${id}-depth)"/><g clip-path="url(#${id}-clip)"><path d="M48 46 C42 59 53 62 47 69 C39 77 39 88 50 91 C63 91 66 81 57 72 C51 65 57 57 48 46Z" fill="${s.mid}" opacity=".74"/><path d="M49 65 C45 74 46 77 43 82 C42 89 49 92 53 90 C60 87 54 79 53 76Z" fill="url(#${id}-inner)" opacity=".94"/></g>`;
 out=out.replace(flame,layers).replace('<defs>','<defs>'+defs).replace('<g fill="currentColor">',`<ellipse cx="50" cy="68" rx="60" ry="53" fill="url(#${id}-light)"/><g fill="${s.frame}">`);
 // A restrained reflected warm rim, kept inside the accepted base footprint.
 out=out.replace('</svg>',`<path d="M29 92 H71" stroke="${s.mid}" stroke-opacity=".45" stroke-width="1" stroke-linecap="round"/></svg>`);
 return out;
}
g.FlameStyles={styles,svg};
})(typeof window!=='undefined'?window:globalThis);

