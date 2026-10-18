/** Keep the resolved id in storage; shorten only its display label. */
/** CE-25, CE-56: an endpoint model names its endpoint and says it is not evaluated. */
export { endpointAwareName as modelLabel } from './model-choices.svelte';
export function durationLabel(ms:number):string {
  const seconds=Math.round(ms/1000);return seconds<60?`${seconds} s`:`${Math.floor(seconds/60)} min ${seconds%60} s`;
}
