import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createPager} from './pager.js';

test('touch paging owns scene gestures but preserves inputs and overflow panels',()=>{
  const saved=new Map(['document','window','location','HTMLElement','getComputedStyle','addEventListener'].map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
  const listeners={};
  class Element {
    scrollTop=0;scrollHeight=760;clientHeight=660;parentElement=null;
    classList={add(){},toggle(){}};
    setAttribute(){} contains(){return false;} focus(){}
    closest(selector){return selector==='input,textarea,select,[contenteditable=true]'&&this.input?this:selector==='.console,.detail-control,.surface-controls'&&this.panel?this:null;}
  }
  const body=new Element(),scene=new Element(),panel=new Element(),input=new Element();
  scene.parentElement=body;panel.parentElement=scene;panel.panel=true;input.input=true;
  const listen=(name,fn)=>(listeners[name]??=[]).push(fn);
  const emit=(name,event)=>listeners[name]?.forEach(fn=>fn(event));
  try {
    globalThis.HTMLElement=Element;
    globalThis.document={body,documentElement:{classList:{add(){}}},addEventListener:listen,activeElement:body};
    globalThis.window={history:{pushState(){}}};globalThis.location={hash:''};
    globalThis.getComputedStyle=()=>({overflowY:'auto'});globalThis.addEventListener=listen;
    const chapters=Array.from({length:6},(_,i)=>Object.assign(new Element(),{id:String(i)}));
    const pager=createPager(chapters,()=>{});
    const start=(target)=>emit('touchstart',{target,touches:[{clientX:100,clientY:300}]});
    let prevented=0;
    const move=y=>emit('touchmove',{touches:[{clientX:100,clientY:y}],cancelable:true,preventDefault(){prevented++;}});
    start(scene);move(265);
    assert.equal(pager.index,1,'scene swipe must not spend its first gesture scrolling decorative overflow');
    move(180);assert.equal(pager.index,1,'one scene per gesture');assert.ok(prevented);
    emit('touchend',{changedTouches:[{clientX:100,clientY:180}]});assert.equal(pager.index,1);
    start(panel);move(230);assert.equal(pager.index,1,'overflow controls remain native');
    start(input);move(230);assert.equal(pager.index,1,'range drag must not page');
    start(scene);move(340);assert.equal(pager.index,0,'fresh reverse swipe works immediately');
    start(scene);emit('touchstart',{target:scene,touches:[{},{}]});move(200);assert.equal(pager.index,0,'pinch cancels paging');
  } finally {
    for(const [key,descriptor] of saved) if(descriptor) Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];
  }
});
