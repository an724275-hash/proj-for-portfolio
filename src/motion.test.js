import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clamp, sceneState, chapterProgress, mobileSlot } from './motion.js';

test('scroll maps to actual section offsets in both directions', () => {
  assert.equal(chapterProgress(600, [0, 1000, 2000, 3000]), .6);
  assert.equal(chapterProgress(-10, [0, 1000]), 0);
  assert.equal(chapterProgress(9999, [0, 1000, 2000, 3000]), 3);
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
  assert.equal(sceneState(3).explode, 0);
  assert.equal(sceneState(Infinity).explode, 0);
  assert.equal(clamp(NaN), 0);
});
test('mobile slot is continuous across chapter and former jump boundaries', () => {
  const anchors=[0,740,1690,2540];
  for(const p of [.68,1,1.68,2,2.68,3]) {
    assert.ok(Math.abs(mobileSlot(p+.0001,anchors)-mobileSlot(p-.0001,anchors))<1);
  }
  assert.equal(mobileSlot(3,anchors),anchors[3]+435);
});
