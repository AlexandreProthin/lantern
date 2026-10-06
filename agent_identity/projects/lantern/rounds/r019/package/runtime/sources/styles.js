// v0.2 styling entry point (replaces r015 styles.js). Load after body.js, motion.js, favicons.js, system.js.
// Accepted look: r013-c01 Amber ember flame (D0019/D0020/D0024) + lit frame (D0021) + per-background tokens (D0022).
(function(g){
const M=g.LanternMotion,S=g.LanternSystem;
if(M.rawSvg)throw new Error('styles.js loaded twice');
M.rawSvg=M.svg;
M.context='neutral'; // 'neutral' | 'learn' | 'light' — pick the token set for the surface behind the actor
M.svg=(i,z,uid)=>S.actor({gesture:i,pose:z,uid,face:true,lit:true,tuned:true,ctx:M.context});
// Face-free mark and favicons share the same tokens.
g.LanternIdentity={
 mark:(ctx='neutral',uid='mark')=>S.actor({gesture:0,pose:M.still(0),uid,face:false,lit:true,tuned:true,ctx}),
 favicon:(size,ctx='neutral',ember=true)=>S.favicon(size,{ctx,ember}),
 contexts:Object.keys(S.CTX)
};
})(typeof window!=='undefined'?window:globalThis);
