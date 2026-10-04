import { clamp, WheelGesture } from './motion.js';

export function createPager(chapters, onChange) {
  let index=-1, touch=null;
  const wheel=new WheelGesture();
  const controls='input,textarea,select,button,[contenteditable=true]';
  function go(next,{history=true,focus=false}={}) {
    next=clamp(next,0,chapters.length-1);
    if(next===index) return;
    index=next;
    chapters[index].scrollTop=0;
    chapters.forEach((chapter,i)=>{
      chapter.inert=i!==index;
      chapter.classList.toggle('is-active',i===index);
      chapter.setAttribute('aria-hidden',String(i!==index));
    });
    if(history) window.history.pushState(null,'',`#${chapters[index].id}`);
    onChange(index);
    if(focus || chapters.some((c,i)=>i!==index&&c.contains(document.activeElement))) {
      chapters[index].setAttribute('tabindex','-1');
      chapters[index].focus({preventScroll:true});
    }
  }
  function hashChanged() {
    const next=chapters.findIndex(c=>`#${c.id}`===location.hash);
    go(next<0?0:next,{history:false});
  }
  function scrollable(target,delta) {
    for(let node=target;node instanceof HTMLElement && node!==document.body;node=node.parentElement) {
      if(node.scrollHeight>node.clientHeight+2 && /auto|scroll/.test(getComputedStyle(node).overflowY)) {
        if(delta>0&&node.scrollTop+node.clientHeight<node.scrollHeight-2 || delta<0&&node.scrollTop>2) return true;
      }
    }
    return false;
  }
  document.documentElement.classList.add('paged');
  document.addEventListener('click',event=>{
    const link=event.target.closest('a[href^="#"]');
    if(!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const next=chapters.findIndex(c=>`#${c.id}`===link.getAttribute('href'));
    if(next<0) return;
    event.preventDefault();go(next,{focus:true});
  });
  addEventListener('wheel',event=>{
    if(event.ctrlKey || Math.abs(event.deltaX)>Math.abs(event.deltaY)) return;
    const delta=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?innerHeight:1);
    if(scrollable(event.target,delta)) {wheel.consume(performance.now());return;}
    event.preventDefault();
    const direction=wheel.step(delta,performance.now());
    if(direction) go(index+direction);
  },{passive:false});
  document.addEventListener('keydown',event=>{
    if(event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || event.target.closest(controls)) return;
    const direction=['ArrowDown','PageDown',' '].includes(event.key)?(event.shiftKey?-1:1):['ArrowUp','PageUp'].includes(event.key)?-1:0;
    if(direction&&scrollable(event.target,direction)) return;
    if(direction || ['Home','End'].includes(event.key)) {
      event.preventDefault();go(event.key==='Home'?0:event.key==='End'?chapters.length-1:index+direction,{focus:true});
    }
  });
  document.addEventListener('touchstart',event=>{
    if(event.touches.length!==1 || event.target.closest(controls)) {touch=null;return;}
    const t=event.touches[0];touch={x:t.clientX,y:t.clientY,canDown:scrollable(event.target,1),canUp:scrollable(event.target,-1)};
  },{passive:true});
  document.addEventListener('touchend',event=>{
    if(!touch || !event.changedTouches.length) return;
    const t=event.changedTouches[0],dy=touch.y-t.clientY,dx=touch.x-t.clientX;
    if(Math.abs(dy)>45&&Math.abs(dy)>Math.abs(dx)*1.2&&!(dy>0?touch.canDown:touch.canUp)) go(index+Math.sign(dy));
    touch=null;
  },{passive:true});
  document.addEventListener('touchcancel',()=>{touch=null;},{passive:true});
  addEventListener('hashchange',hashChanged);
  addEventListener('popstate',hashChanged);
  hashChanged();
  return {go,get index(){return index;}};
}
