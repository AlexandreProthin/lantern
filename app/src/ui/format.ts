/** Keep the resolved id in storage; shorten only its display label. */
export { modelName as modelLabel } from '../core/models';
export function durationLabel(ms:number):string {
  const seconds=Math.round(ms/1000);return seconds<60?`${seconds} s`:`${Math.floor(seconds/60)} min ${seconds%60} s`;
}
