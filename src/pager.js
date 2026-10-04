import { clamp, WheelGesture } from './motion.js';
import { SwipeGesture } from './swipe.js';

export function createPager(chapters, onChange) {
  let index=-1, touch=null;
  const wheel=new WheelGesture();
  const swipe=new SwipeGesture();
  let suppressClickUntil=0;
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
    if(performance.now()<suppressClickUntil && event.detail!==0) {event.preventDefault();event.stopImmediatePropagation();}
  },true);
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
    if(event.touches.length!==1 || event.target.closest('input,textarea,select,[contenteditable=true]')) {touch=null;return;}
    const t=event.touches[0];
    // Only settings panels retain native overflow. A swipe on the scene always pages.
    const panel=event.target.closest('.console,.detail-control,.surface-controls');
    touch={x:t.clientX,y:t.clientY,paged:false,native:!!panel&&(scrollable(event.target,1)||scrollable(event.target,-1))};
    swipe.start(t.clientX,t.clientY);
  },{passive:true});
  document.addEventListener('touchmove',event=>{
    if(!touch || event.touches.length!==1) {touch=null;return;}
    if(touch.native) return;
    const t=event.touches[0];
    if(!touch.paged && Math.abs(t.clientX-touch.x)>Math.abs(t.clientY-touch.y)*1.2) {swipe.move(t.clientX,t.clientY);return;}
    if(event.cancelable) event.preventDefault();
    const direction=swipe.move(t.clientX,t.clientY);
    if(direction) {touch.paged=true;suppressClickUntil=performance.now()+450;go(index+direction);}
  },{passive:false});
  document.addEventListener('touchend',event=>{
    if(!touch || !event.changedTouches.length) return;
    const t=event.changedTouches[0],direction=touch.native?0:swipe.move(t.clientX,t.clientY);
    if(direction) {suppressClickUntil=performance.now()+450;go(index+direction);}
    if(touch.paged) suppressClickUntil=performance.now()+450;
    touch=null;
  },{passive:true});
  document.addEventListener('touchcancel',()=>{touch=null;},{passive:true});
  addEventListener('hashchange',hashChanged);
  addEventListener('popstate',hashChanged);
  hashChanged();
  return {go,get index(){return index;}};
}
