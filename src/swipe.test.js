import {test} from 'node:test';
import assert from 'node:assert/strict';
import {SwipeGesture} from './swipe.js';
test('short vertical gesture advances once before touchend',()=>{
  const s=new SwipeGesture();s.start(100,300);
  assert.equal(s.move(103,287),0);
  assert.equal(s.move(105,271),1);
  assert.equal(s.move(105,200),0);
});
test('new gesture responds immediately in reverse direction',()=>{
  const s=new SwipeGesture();s.start(100,300);assert.equal(s.move(100,260),1);
  s.start(100,200);assert.equal(s.move(101,232),-1);
});
test('tap and horizontal drag never change scenes',()=>{
  const s=new SwipeGesture();s.start(100,300);assert.equal(s.move(101,302),0);
  assert.equal(s.move(140,300),0);assert.equal(s.move(140,100),0);
});
