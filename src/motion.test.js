import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clamp, sceneState, mobileCenter, WheelGesture } from './motion.js';

test('one trackpad gesture produces one step even with a long momentum tail', () => {
  const wheel=new WheelGesture();
  assert.equal(wheel.step(6,0),0);
  assert.equal(wheel.step(12,20),1);
  for(let t=40;t<2000;t+=20) assert.equal(wheel.step(20,t),0);
  assert.equal(wheel.step(-30,2300),-1);
});
test('scene state remains finite throughout transitions on narrow and wide layouts', () => {
  for (const mobile of [false, true]) for (let p = -1; p < 5; p += .01) {
    const state = sceneState(p, mobile);
    assert.ok(Object.values(state).every(Number.isFinite));
    assert.ok(state.scale > 0);
    assert.ok(state.explode >= 0 && state.explode <= 1);
  }
});
test('assembly returns closed in the instrument', () => {
  assert.equal(sceneState(1).explode, 1);
  assert.equal(sceneState(5).explode, 0);
  assert.equal(sceneState(Infinity).explode, 0);
  assert.equal(clamp(NaN), 0);
});
test('mobile object position is continuous across every scene', () => {
  for(const p of [0,1,2,3,4,5]) {
    assert.ok(Math.abs(mobileCenter(p+.0001,844)-mobileCenter(p-.0001,844))<1);
  }
  assert.equal(mobileCenter(5,844),270);
});
test('wheel cooldown prevents two quick separate clicks skipping a scene',()=>{
  const wheel=new WheelGesture();
  assert.equal(wheel.step(120,0),1);
  assert.equal(wheel.step(120,300),0);
  assert.equal(wheel.step(120,1000),1);
});
test('overflow scroll consumes its entire gesture including the momentum at the edge',()=>{
  const wheel=new WheelGesture();
  wheel.consume(0);wheel.consume(20);
  for(let t=40;t<1200;t+=20) assert.equal(wheel.step(30,t),0);
  assert.equal(wheel.step(30,1500),1);
});
