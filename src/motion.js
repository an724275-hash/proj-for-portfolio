export const clamp = (value, low = 0, high = 1) => Math.min(high, Math.max(low, Number.isFinite(value) ? value : low));
export const mix = (a, b, t) => a + (b - a) * t;
export const smooth = t => { t=clamp(t); return t*t*(3-2*t); };
const desktop = [
  [.1,-.15,1.15,-.28,-.58,-.38,0],
  [1.7,0,.9,.15,-1.05,-.35,1],
  [1.7,-.05,1.08,-.2,Math.PI,.2,0],
  [2.15,-.35,1.45,-.2,-.6,-.35,0],
  [2.4,-.8,1.18,-.4,.4,.4,0],
  [1.8,.05,1.06,.05,-.25,.07,0],
];
const phone = [
  [0,0,.82,-.2,-.3,-.3,0],
  [0,0,.57,.12,-1,-.3,1],
  [0,0,.76,-.2,Math.PI,.2,0],
  [0,0,1,-.2,-.6,-.35,0],
  [0,0,.72,-.15,.3,.2,0],
  [0,0,.42,.05,-.22,0,0],
];
export function sceneState(progress, mobile=false) {
  const frames=mobile?phone:desktop;
  const p=clamp(progress,0,frames.length-1), i=Math.min(frames.length-2,Math.floor(p));
  const t=smooth(p-i);
  return Object.fromEntries(['x','y','scale','rx','ry','rz','explode'].map((key,k)=>[key,mix(frames[i][k],frames[i+1][k],t)]));
}
export function mobileCenter(progress,height) {
  const centers=[height*.52,height*.57,height*.54,height*.54,height*.63,270];
  const p=clamp(progress,0,5),i=Math.min(4,Math.floor(p));
  return mix(centers[i],centers[i+1],smooth(p-i));
}
// A trackpad momentum tail belongs to the same gesture, not the next page.
export class WheelGesture {
  sum=0; last=-Infinity; lockedUntil=0; consumed=false;
  consume(now) {this.last=now;this.sum=0;this.consumed=true;}
  step(delta, now) {
    const quiet=now-this.last>180;
    this.last=now;
    if(quiet) {this.sum=0;this.consumed=false;}
    if(now<this.lockedUntil || this.consumed || !Number.isFinite(delta)) return 0;
    if(Math.sign(delta)!==Math.sign(this.sum)) this.sum=0;
    this.sum+=delta;
    if(Math.abs(this.sum)<18) return 0;
    this.consumed=true;this.lockedUntil=now+850;
    return Math.sign(this.sum);
  }
}
