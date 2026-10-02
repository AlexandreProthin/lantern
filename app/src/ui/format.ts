/** Keep the resolved id in storage; shorten only its display label. */
export function modelLabel(id:string):string {
  const match=/^claude-(opus|sonnet|haiku)-(\d{1,2})(?:-(\d{1,2})(?=-|$))?/i.exec(id);
  if(!match)return id;
  return `${match[1][0].toUpperCase()}${match[1].slice(1)} ${match[2]}${match[3]?'.'+match[3]:''}`;
}
export function durationLabel(ms:number):string {
  const seconds=Math.round(ms/1000);return seconds<60?`${seconds} s`:`${Math.floor(seconds/60)} min ${seconds%60} s`;
}
