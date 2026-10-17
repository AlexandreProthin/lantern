// The companion renderer of the accepted identity release, ported to TypeScript from
// agent_identity/projects/lantern/final/lantern-identity-v0.2/runtime/sources (body.js, motion.js, system.js `actor`,
// styles.js `svg`). Only the options the product uses are kept: face, lit frame, tuned tokens (IMPLEMENTATION.md).
// companion.test.ts checks that its output is byte-identical to the release's for every gesture.

/** body.js: the frame, the flame, the loop and the base, in the 100-unit master grid. */
export const BODY = '<path d="M 47 21 C 35 32 14 46 15 65 C 15 78 20 88 25 93 L 29 92 C 22 84 22 76 23 66 C 24 50 37 34 49 23 Z"/><path d="M 51 21 C 64 34 85 49 85 65 C 85 78 80 88 75 93 L 71 92 C 78 83 78 75 77 66 C 76 50 63 34 51 23 Z"/><path d="M 49 30 C 38 35 53 41 46 51 C 43 56 31 67 32 78 C 32 88 40 91 50 91 C 64 91 71 83 64 73 C 56 62 64 56 60 47 C 57 41 47 40 49 30 Z"/><path fill-rule="evenodd" d="M42 14 a8 10 0 1 0 16 0 a8 10 0 1 0 -16 0 M45 13 a5 6 0 1 0 10 0 a5 6 0 1 0 -10 0"/><rect x="24" y="90" width="52" height="8" rx="4"/>';

/** The six accepted gestures (D0017), in the release's order. */
export const GESTURES = [
  { id: 'r011-c01', name: 'Repos disponible', duration: 2400 },
  { id: 'r011-c02', name: 'Curiosité', duration: 1800 },
  { id: 'r011-c03', name: 'Quelques pas', duration: 3200 },
  { id: 'r011-c04', name: 'Suspension', duration: 3600 },
  { id: 'r011-c05', name: 'Chauffe et envol', duration: 3200 },
  { id: 'r011-c06', name: 'Descente et pose', duration: 3000 }
] as const;
export const GESTURE = { rest: 0, curiosity: 1, steps: 2, suspension: 3, lift: 4, landing: 5 } as const;

export interface Pose { x: number; y: number; angle: number; pivot: number; feet: number; step: number; gaze: number; lid: number; line: number; flameTime?: number }
const clamp = (x: number) => Math.min(1, Math.max(0, x)), ease = (x: number) => { x = clamp(x); return x * x * (3 - 2 * x); };
const segment = (t: number, a: number, b: number) => ease((t - a) / (b - a));
const rest = (): Pose => ({ x: 0, y: 0, angle: 0, pivot: 94, feet: 0, step: 0, gaze: 0, lid: 0, line: 0 });

/** motion.js `pose`: gesture i at time t (ms). */
export function pose(i: number, t: number, reduced = false): Pose {
  const s = GESTURES[i], u = clamp(t / s.duration), z = rest();
  if (reduced) return still(i);
  if (i === 0) { z.lid = Math.sin(Math.PI * clamp((u - .3) / .13)) ** 2; if (u < .3 || u > .43) z.lid = 0; }
  if (i === 1) { const a = segment(u, 0, .28) * (1 - segment(u, .68, 1)); z.angle = 6 * a; z.gaze = 3 * a; }
  if (i === 2) { const a = segment(u, .18, .86), f = segment(u, 0, .18); z.x = -12 + 24 * a; z.feet = f; z.y = -8 * f; const travel = Math.sin(Math.PI * clamp((u - .18) / .68)); z.step = Math.sin(4 * Math.PI * a) * travel; z.y -= .9 * travel * Math.abs(Math.sin(4 * Math.PI * a)); z.angle = 1.2 * z.step; }
  if (i === 3) { z.line = 1; z.pivot = 4; z.angle = 7 * Math.sin(4 * Math.PI * u) * Math.exp(-3 * u) * (1 - ease(u)); }
  if (i === 4) { z.y = -17 * segment(u, .25, .85); z.angle = 1.5 * Math.sin(2 * Math.PI * u) * Math.sin(Math.PI * u); }
  if (i === 5) { z.y = -17 + 9 * segment(u, 0, .7); z.feet = segment(u, .45, .78); const settle = Math.sin(Math.PI * clamp((u - .72) / .28)); z.y += 1.2 * settle; }
  z.flameTime = t;
  return z;
}
/** motion.js `still`: the static (reduced-motion) destination of gesture i. */
export function still(i: number): Pose {
  const z = rest();
  if (i === 1) { z.angle = 3; z.gaze = 3; } if (i === 2) { z.x = 12; z.y = -8; z.feet = 1; } if (i === 3) { z.line = 1; z.pivot = 4; } if (i === 4) z.y = -17; if (i === 5) { z.y = -8; z.feet = 1; }
  return z;
}
/** motion.js `mix`: eased blend from a to b (the 180 ms interrupt). */
export function mix(a: Pose, b: Pose, t: number): Pose {
  const z = {} as Record<string, number>;
  for (const key of Object.keys(a) as (keyof Pose)[]) z[key] = (a[key] ?? 0) + ((b[key] ?? 0) - (a[key] ?? 0)) * ease(t);
  return z as unknown as Pose;
}

/** motion.js `svg`: the unstyled actor (the living outer contour, the eyes mask, the feet and the suspension line). */
export function rawSvg(i: number, z: Pose, uid = 'actor', body = BODY): string {
  const eye = 3.2 * (1 - .85 * z.lid), mask = `${uid}-face`, line = z.line ? '<path d="M50 -16 V4" fill="none" stroke="currentColor" stroke-width="1.7"/>' : '';
  const footA = -2.5 * Math.max(0, z.step), footB = -2.5 * Math.max(0, -z.step);
  const feet = z.feet ? `<g opacity="${z.feet}"><path d="M35 96 V${96 + 11 * z.feet + footA} H28 M65 96 V${96 + 11 * z.feet + footB} H72" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></g>` : '';
  const t = z.flameTime || 0, a = 2 * Math.PI * t / 1200;
  const dx = 1.15 * Math.sin(a) + .35 * Math.sin(2 * a), dy = .8 * (Math.sin(a + Math.PI / 3) - Math.sin(Math.PI / 3));
  const flame = `<path d="M ${49 + dx} ${30 + dy} C ${38 + .65 * dx} ${35 + dy} ${53 + dx} ${41 + dy} ${46 + .7 * dx} 51 C ${43 + .5 * dx} 56 31 67 32 78 C 32 88 40 91 50 91 C 64 91 71 83 64 73 C 56 62 ${64 + .6 * dx} 56 ${60 + .8 * dx} ${47 + dy} C ${57 + dx} ${41 + dy} ${47 + dx} ${40 + dy} ${49 + dx} ${30 + dy} Z"/>`;
  const livingBody = body.replace(/<path d="M 49 30[^>]*\/>/, flame);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-20 -24 140 148" role="img" aria-label="${GESTURES[i].name}"><defs><mask id="${mask}"><rect x="-40" y="-40" width="200" height="220" fill="white"/><ellipse cx="${44 + z.gaze}" cy="74" rx="2.2" ry="${eye}" fill="black"/><ellipse cx="${55 + z.gaze}" cy="73" rx="2.2" ry="${eye}" fill="black"/></mask></defs><g fill="currentColor">${line}<g transform="translate(${z.x} ${z.y}) rotate(${z.angle} 50 ${z.pivot})"><g mask="url(#${mask})">${livingBody}</g>${feet}</g></g></svg>`;
}

/** system.js tokens (sRGB): the flame for every background, and the per-background tuning (D0022). */
export const T = { outer: '#c94b16', mid: '#ffac38', core: '#fff2b3', frame: '#9b7254', halo: .20, blur: 6 };
export const CTX = {
  neutral: { bg: '#181818', frame: '#9b7254', outer: '#c94b16', halo: .20, lit: ['#ebbb88', '#7a573f'] },
  learn: { bg: '#101827', frame: '#a57a5a', outer: '#c94b16', halo: .24, lit: ['#efc08c', '#86624a'] },
  light: { bg: '#f4eee3', frame: '#6e4a32', outer: '#b8410f', halo: 0, lit: ['#9a6a44', '#5e3f2a'] }
} as const;
export type Context = keyof typeof CTX;
const FLAME_KEY = 'C 32 88 40 91 50 91';
const FRAME_PATHS = /<path d="M (47|51) 21[^"]*"\/>|<path fill-rule="evenodd"[^>]*\/>|<rect x="24" y="90"[^>]*\/>/g;

/**
 * styles.js `svg` = system.js `actor` with face, lit frame and tuned tokens: the accepted companion.
 * `roomTokens` (CO-55) lets the halo and the light on the frame follow CSS variables set per room
 * (`--amber-halo`, `--amber-lit-near`, `--amber-lit-far`, falling back to the identity's colours) and keeps
 * the halo out of hit testing (CO-17). The flame and the body never change.
 */
export function companionSvg(i: number, z: Pose, uid: string, ctx: Context = 'learn', roomTokens = false): string {
  const id = uid, tun = CTX[ctx], outer = tun.outer, frame = tun.frame, halo = tun.halo;
  let out = rawSvg(i, z, id, BODY);
  const flame = [...out.matchAll(/<path d="M [^"]+"\/>/g)].find(x => x[0].includes(FLAME_KEY))![0];
  const shape = flame.match(/d="([^"]+)"/)![1];
  const ft = z.flameTime || 0, a = 2 * Math.PI * ft / 2400,
    m = .9 * Math.sin(a), c = .55 * (Math.sin(a + Math.PI / 3) - Math.sin(Math.PI / 3)), h = .8 * (Math.sin(a + Math.PI / 2) - 1);
  const haloStop = roomTokens ? `style="stop-color:var(--amber-halo,${T.mid})"` : `stop-color="${T.mid}"`;
  let defs = `<radialGradient id="${id}-depth" cx="42%" cy="72%" r="70%"><stop stop-color="${T.core}"/><stop offset=".42" stop-color="${T.mid}"/><stop offset="1" stop-color="${outer}"/></radialGradient><radialGradient id="${id}-light"><stop ${haloStop} stop-opacity="${halo}"/><stop offset="1" ${haloStop} stop-opacity="0"/></radialGradient><linearGradient id="${id}-inner" x1="0" y1="1" x2=".3" y2="0"><stop stop-color="${T.core}"/><stop offset="1" stop-color="${T.mid}"/></linearGradient><clipPath id="${id}-clip"><path d="${shape}"/></clipPath><filter id="${id}-blur" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="${T.blur}"/></filter>`;
  const layers = `<path d="${shape}" fill="${T.mid}" opacity=".27" filter="url(#${id}-blur)"/><path d="${shape}" fill="url(#${id}-depth)"/><g clip-path="url(#${id}-clip)"><path d="M${48 + m} ${46 + h} C${42 + m} 59 ${53 + m} 62 ${47 + m * .6} 69 C39 77 39 88 50 91 C63 91 66 81 ${57 + m * .4} 72 C${51 + m} 65 ${57 + m} 57 ${48 + m} ${46 + h}Z" fill="${T.mid}" opacity=".74"/><path d="M${49 + c} ${65 + h * .5} C${45 + c} 74 ${46 + c} 77 43 82 C42 89 49 92 53 90 C60 87 ${54 + c} 79 ${53 + c} 76Z" fill="url(#${id}-inner)" opacity=".94"/></g>`;
  out = out.replace(flame, layers);
  // c01 lit frame: the frame receives the flame's light, warm near it, darker away.
  const [near, far] = tun.lit;
  const nearStop = roomTokens ? `style="stop-color:var(--amber-lit-near,${near})"` : `stop-color="${near}"`, farStop = roomTokens ? `style="stop-color:var(--amber-lit-far,${far})"` : `stop-color="${far}"`;
  defs += `<radialGradient id="${id}-lit" gradientUnits="userSpaceOnUse" cx="50" cy="70" r="38"><stop offset=".3" ${nearStop}/><stop offset="1" ${farStop}/></radialGradient>`;
  const frameFill = `url(#${id}-lit)`;
  out = out.replace(FRAME_PATHS, x => x.replace(/^<(path|rect)/, `<$1 fill="${frameFill}"`));
  out = out.replace('<defs>', '<defs>' + defs).replace('<g fill="currentColor">', `<g fill="${frame}">`);
  if (halo > 0) out = out.replace('<g mask=', `<ellipse cx="50" cy="68" rx="60" ry="53" fill="url(#${id}-light)"${roomTokens ? ' pointer-events="none"' : ''}/><g mask=`);
  out = out.replace(/(<rect x="24" y="90"[^>]*\/>)/, `$1<path d="M29 92 H71" stroke="${T.mid}" stroke-opacity=".45" stroke-width="1" stroke-linecap="round"/>`);
  return out.replaceAll('currentColor', frame);
}
