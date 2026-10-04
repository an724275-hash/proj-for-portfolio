import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createObject } from './object.js';

test('every part has finite positions and normals, and valid indices', () => {
  const object=createObject();
  let meshes=0;
  object.root.traverse(node=>{
    if(!node.geometry) return;
    meshes++;
    const {position,normal}=node.geometry.attributes;
    assert.ok([...position.array].every(Number.isFinite));
    assert.ok([...normal.array].every(Number.isFinite));
    if(node.geometry.index) assert.ok([...node.geometry.index.array].every(i=>i<position.count));
  });
  assert.ok(meshes>5 && meshes<20, 'static parts should be batched into fewer than 20 draw meshes');
  object.dispose();
});

test('exploded layers reassemble, motion can be disabled and materials switch', () => {
  const object=createObject();
  const [basket,magnet,membrane,front]=object.root.children;
  object.update(1,.5,1,true);
  assert.equal(front.position.z,1.08);
  assert.equal(magnet.position.z,-.58);
  assert.equal(basket.position.z,0);
  object.update(0,1,2,false);
  assert.equal(front.position.z,0);
  assert.equal(membrane.position.z,0);
  object.setFinish('graphite');
  assert.equal(front.children[0].material.color.getHex(),0x474b49);
  object.setFinish('silver');
  assert.equal(front.children[0].material.color.getHex(),0xc9c9c4);
  object.dispose();
});
