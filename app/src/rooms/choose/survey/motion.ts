import type { Settings } from '../../../frame/settings';

/** GV-100: reduced motion is the OS setting or Appearance → Always reduce. */
export const reducedMotion = (settings: Settings): boolean =>
  settings.appearance.reduceMotion === 'on' || (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);
export const EASE_OUT = 'cubic-bezier(.2,.7,.2,1)', EASE_IN = 'cubic-bezier(.5,0,.8,.4)';
/** Whether an animation may run now: motion is allowed and the window is visible (a hidden window finishes instantly). */
export const mayMove = (settings: Settings): boolean => !reducedMotion(settings) && typeof document !== 'undefined' && !document.hidden;
