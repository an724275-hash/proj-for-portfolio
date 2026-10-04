export class SwipeGesture {
  start(x,y) {this.x=x;this.y=y;this.done=false;}
  move(x,y) {
    if(this.done || this.x===undefined) return 0;
    const dx=x-this.x,dy=this.y-y;
    if(Math.abs(dx)>12 && Math.abs(dx)>Math.abs(dy)*1.2) {this.done=true;return 0;}
    if(Math.abs(dy)<28 || Math.abs(dy)<Math.abs(dx)*1.2) return 0;
    this.done=true;
    return Math.sign(dy);
  }
}
