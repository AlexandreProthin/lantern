import { graphMotion } from './graphMotion';
export const travelDuration = (length: number) => Math.max(160, Math.min(650, length / graphMotion.route.speed * 1000));
export function emberFan(index: number, count: number, heading: number) {
  const variation = (Math.sin((index + 1) * 7.13) + 1) / 2;
  const angle = count === 1 ? heading : heading + (index / (count - 1) - 0.5) * Math.PI * 1.4;
  const speed = 28 + variation * 38;
  return { angle, vx: Math.cos(angle)*speed, vy: Math.sin(angle)*speed,
    life: graphMotion.route.lifeMin + (graphMotion.route.lifeMax-graphMotion.route.lifeMin)*variation };
}
export function emberTrail(serial: number, tx: number, ty: number) {
  const scatter=Math.sin(serial*2.39996),variation=(Math.sin(serial*7.13)+1)/2;
  return { vx:-tx*24-ty*scatter*graphMotion.route.drift,vy:-ty*24+tx*scatter*graphMotion.route.drift,
    life:graphMotion.route.lifeMin+(graphMotion.route.lifeMax-graphMotion.route.lifeMin)*variation };
}
type Point = { x: number; y: number };
type Dust = Point & { born: number; life: number; vx: number; vy: number };
/** D1 fixed overlay. Behaviour never waits on requestAnimationFrame. */
export class WelcomeEmbers {
  private dust: Dust[]=[];
  private trips: {a:Point;b:Point;start:number;duration:number;emitted:number;serial:number}[]=[];
  private frame=0;
  private thinking?:ReturnType<typeof setInterval>;
  private timers=new Set<ReturnType<typeof setTimeout>>();
  constructor(private canvas: HTMLCanvasElement,private allowed:()=>boolean){}
  center(el:Element):Point{const r=el.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};}
  fan(p:Point,count:number=graphMotion.BURST,heading=-Math.PI/2){if(!this.allowed())return;const born=performance.now();
    for(let i=0;i<count;i++)this.dust.push({...p,born,...emberFan(i,count,heading)});this.start();}
  travel(a:Point,b:Point){const duration=travelDuration(Math.hypot(b.x-a.x,b.y-a.y));if(!this.allowed())return 0;
    this.trips.push({a,b,start:performance.now(),duration,emitted:0,serial:0});this.start();return duration;}
  arrival(field:Element){this.later(()=>{if(!this.allowed())return;const r=field.getBoundingClientRect();this.travel({x:r.left,y:r.bottom},{x:r.left+r.width/2,y:r.bottom});},650);}
  async handoff(field:Element,button:Element){
    if(!this.allowed())return;const r=field.getBoundingClientRect();const duration=this.travel({x:r.left+r.width/2,y:r.bottom},this.center(button));
    await new Promise(resolve=>setTimeout(resolve,duration+260));
  }
  busy(element:Element,on:boolean){clearInterval(this.thinking);if(on)this.thinking=setInterval(()=>this.fan(this.center(element),1),90);}
  private later(fn:()=>void,ms:number){const timer=setTimeout(()=>{this.timers.delete(timer);fn();},ms);this.timers.add(timer);}
  private start(){if(!this.frame)this.frame=requestAnimationFrame(this.paint);}
  private paint=(now:number)=>{
    this.frame=0;if(!this.allowed()){this.clear();return;}
    const ctx=this.canvas.getContext('2d');if(!ctx)return;
    const ratio=devicePixelRatio||1;this.canvas.width=innerWidth*ratio;this.canvas.height=innerHeight*ratio;ctx.scale(ratio,ratio);
    const css=getComputedStyle(this.canvas),cream=css.getPropertyValue('--node-lit').trim(),amber=css.getPropertyValue('--accent').trim();
    this.trips=this.trips.filter(trip=>{
      const t=Math.min(1,(now-trip.start)/trip.duration),x=trip.a.x+(trip.b.x-trip.a.x)*t,y=trip.a.y+(trip.b.y-trip.a.y)*t;
      const length=Math.hypot(trip.b.x-trip.a.x,trip.b.y-trip.a.y)||1;
      if(now-trip.emitted>=graphMotion.route.emitEvery&&this.dust.length<graphMotion.route.cap){this.dust.push({x,y,born:now,...emberTrail(++trip.serial,(trip.b.x-trip.a.x)/length,(trip.b.y-trip.a.y)/length)});trip.emitted=now;}
      ctx.globalAlpha=1;ctx.fillStyle=cream;ctx.shadowColor=amber;ctx.shadowBlur=12;ctx.beginPath();ctx.arc(x,y,3,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
      if(t===1)this.fan(trip.b);return t<1;
    });
    this.dust=this.dust.filter(p=>{const age=now-p.born,t=age/p.life;if(t>=1)return false;
      ctx.globalAlpha=(1-t)**1.8;ctx.fillStyle=t<.4?cream:amber;ctx.beginPath();ctx.arc(p.x+p.vx*age/1000,p.y+p.vy*age/1000,1.2*(1-t*.65),0,Math.PI*2);ctx.fill();return true;});
    if(this.trips.length||this.dust.length)this.start();
  };
  clear(){cancelAnimationFrame(this.frame);this.frame=0;this.dust=[];this.trips=[];this.canvas.getContext('2d')?.clearRect(0,0,this.canvas.width,this.canvas.height);}
  dispose(){this.clear();clearInterval(this.thinking);for(const t of this.timers)clearTimeout(t);this.timers.clear();}
}
