import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createObject } from './object.js';
import { sceneState, mix, clamp } from './motion.js';

export function createScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, alpha:true, powerPreference:'high-performance' });
  renderer.setClearColor(0x000000,0);
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.1;
  const scene=new THREE.Scene();
  const environment=new RoomEnvironment();
  const pmrem=new THREE.PMREMGenerator(renderer);
  const env=pmrem.fromScene(environment,.035);
  scene.environment=env.texture;
  environment.dispose(); pmrem.dispose();
  const camera=new THREE.PerspectiveCamera(34,1,.1,100);
  camera.position.set(0,0,9);
  const key=new THREE.DirectionalLight(0xfff6e7,2.3); key.position.set(-3,5,6); scene.add(key);
  const rim=new THREE.DirectionalLight(0xffffff,1.5); rim.position.set(5,1,2); scene.add(rim);
  const fill=new THREE.DirectionalLight(0xd2d9e1,.7); fill.position.set(-3,-2,1); scene.add(fill);
  const object=createObject(); scene.add(object.root);
  let width=1,height=1,mobile=false;
  let pointer={x:0,y:0};
  function resize() {
    width=document.documentElement.clientWidth; height=innerHeight; mobile=width<=650;
    renderer.setSize(width,height,false);
    camera.aspect=width/height;
    camera.position.z=mobile?10.2:9;
    camera.updateProjectionMatrix();
  }
  resize();
  function render(progress,energy,time,moving,mobileOffset=0,inspection={rotation:Math.PI,lightAngle:-35}) {
    const state=sceneState(progress,mobile);
    const aspect=width/height;
    const narrowScale=mobile?Math.min(1,width/420)*800/height:Math.min(1,aspect/1.5);
    object.root.position.set(state.x*(mobile?1:Math.min(1,aspect/1.65)),state.y+mobileOffset,0);
    object.root.scale.setScalar(state.scale*narrowScale);
    const inspectWeight=clamp(1-Math.abs(progress-2));
    const surfaceWeight=clamp(1-Math.abs(progress-3));
    const angle=mix(-35,inspection.lightAngle,surfaceWeight)*Math.PI/180;
    key.position.set(Math.sin(angle)*8,5,Math.cos(angle)*8);
    object.root.rotation.set(state.rx+(moving?pointer.y*.07:0),state.ry+(inspection.rotation-Math.PI)*inspectWeight+(moving?pointer.x*.13:0),state.rz);
    object.update(state.explode,energy,time,moving);
    renderer.render(scene,camera);
  }
  return {
    resize, render,
    pointer(x,y) {pointer.x=mix(pointer.x,x,.3);pointer.y=mix(pointer.y,y,.3);},
    setFinish:object.setFinish,
    stats:()=>({calls:renderer.info.render.calls,triangles:renderer.info.render.triangles}),
    dispose(){object.dispose();env.dispose();renderer.dispose();},
  };
}
