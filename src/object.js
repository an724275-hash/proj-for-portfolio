import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

function lathe(profile, material, segments = 128) {
  const geometry = new THREE.LatheGeometry(profile.map(([r, z]) => new THREE.Vector2(r, z)), segments);
  geometry.rotateX(-Math.PI / 2);
  return new THREE.Mesh(geometry, material);
}

function torus(radius, tube, material) {
  return new THREE.Mesh(new THREE.TorusGeometry(radius, tube, radius<.1?6:8, radius<.1?16:radius<.7?64:112), material);
}

function batchStatic(group, exclude = new Set()) {
  group.updateMatrixWorld(true);
  const byMaterial=new Map();
  const originals=new Set();
  const inverse=group.matrixWorld.clone().invert();
  for(const child of [...group.children]) {
    if(exclude.has(child)) continue;
    child.traverse(node=>{
      if(!node.isMesh) return;
      const geometry=node.geometry.clone().applyMatrix4(inverse.clone().multiply(node.matrixWorld));
      if(!byMaterial.has(node.material)) byMaterial.set(node.material,[]);
      byMaterial.get(node.material).push(geometry);
      originals.add(node.geometry);
    });
    group.remove(child);
  }
  for(const [material,geometries] of byMaterial) {
    group.add(new THREE.Mesh(mergeGeometries(geometries),material));
    for(const geometry of geometries) geometry.dispose();
  }
  for(const geometry of originals) geometry.dispose();
}

function brushedMap() {
  const size = 128;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const value = Math.round(155 + 20 * Math.sin(y * 12.9898) + 5 * Math.sin(x * 3.71 + y));
    const i = (y * size + x) * 4;
    data[i] = data[i + 1] = data[i + 2] = value; data[i + 3] = 255;
  }
  const texture = new THREE.DataTexture(data, size, size);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3);
  texture.needsUpdate = true;
  return texture;
}

export function createObject() {
  const root = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color:0xc9c9c4, metalness:1, roughness:.3, roughnessMap:brushedMap() });
  const edge = new THREE.MeshStandardMaterial({ color:0xe4e2d9, metalness:1, roughness:.19 });
  const black = new THREE.MeshStandardMaterial({ color:0x222422, roughness:.48, metalness:.65 });
  const rubber = new THREE.MeshStandardMaterial({ color:0x101110, roughness:.65, metalness:.04 });
  const red = new THREE.MeshStandardMaterial({ color:0x8f1008, roughness:.58, metalness:.05, side:THREE.DoubleSide });
  const copper = new THREE.MeshStandardMaterial({ color:0xa4532a, roughness:.32, metalness:1 });
  const front = new THREE.Group();
  const membrane = new THREE.Group();
  const basket = new THREE.Group();
  const magnet = new THREE.Group();
  root.add(basket, magnet, membrane, front);

  // Continuous machined cross-section, with a rolled outer lip and recessed seating.
  front.add(lathe([[1.36,-.19],[1.39,-.22],[1.49,-.22],[1.53,-.18],[1.55,-.1],[1.55,.04],[1.53,.09],[1.46,.11],[1.38,.08],[1.34,.02],[1.34,-.12],[1.36,-.19]], metal));
  for (const r of [1.39,1.44,1.5]) { const seam = torus(r,.006,edge); seam.position.z=.225; front.add(seam); }
  const bezel = torus(1.325,.055,black); bezel.position.z=.09; front.add(bezel);
  const seal = torus(1.255,.07,rubber); seal.position.z=.075; membrane.add(seal);

  // The cone's radial corrugation is geometry, so it retains a silhouette at grazing angles.
  const coneProfile = [];
  for (let i = 0; i <= 90; i++) {
    const r = .26 + i / 90 * .96;
    const depth = -.06 + (1.22-r) * .38 + .014 * Math.sin(i * .82);
    coneProfile.push([r, depth]);
  }
  const cone = lathe(coneProfile, red);
  cone.position.z=.1;
  membrane.add(cone);
  for (let i = 0; i < 3; i++) { const ring = torus(1.16 + i * .028,.018,red); ring.position.z=.12; membrane.add(ring); }
  const cap = lathe([[0,-.01],[.12,-.005],[.27,.035],[.38,.1],[.42,.17],[.4,.2]], edge);
  cap.position.z=-.11;
  membrane.add(cap);
  const capEdge = torus(.4,.012,black); capEdge.position.z=-.3; membrane.add(capEdge);

  // Bolt heads sit in dark washers; slots give scale to the object.
  for (let i = 0; i < 8; i++) {
    const angle = i * Math.PI / 4 + Math.PI / 8;
    const screw = new THREE.Group();
    screw.position.set(Math.cos(angle)*1.455,Math.sin(angle)*1.455,.24);
    screw.add(torus(.039,.009,black));
    const head = new THREE.Mesh(new THREE.CylinderGeometry(.031,.033,.018,12),edge);
    head.rotation.x=Math.PI/2;
    screw.add(head);
    const slot = new THREE.Mesh(new THREE.BoxGeometry(.04,.007,.003),rubber);
    slot.position.z=.012; slot.rotation.z=angle+.3; screw.add(slot);
    front.add(screw);
  }

  basket.add(lathe([[1.35,.09],[1.39,.12],[1.38,.29],[1.29,.34],[1.16,.38],[1.1,.34],[1.14,.25],[1.32,.2],[1.35,.09]],black));
  const rear = lathe([[.59,.62],[.65,.59],[.73,.62],[.73,.79],[.67,.84],[.56,.82],[.55,.69],[.59,.62]],metal);
  basket.add(rear);
  const ribGeo = new THREE.BoxGeometry(.085,.075,.73);
  for (let i = 0; i < 24; i++) {
    const a=i/24*Math.PI*2;
    const rib=new THREE.Mesh(ribGeo,black);
    rib.position.set(Math.cos(a)*.985,Math.sin(a)*.985,-.48);
    rib.rotation.set(Math.sin(a)*-.74,Math.cos(a)*.74,-a);
    basket.add(rib);
  }
  magnet.add(lathe([[0,.76],[.48,.76],[.57,.8],[.6,.87],[.6,1.08],[.55,1.12],[0,1.12]],black));
  for(let i=0;i<9;i++) { const fin=torus(.588,.014,metal); fin.position.z=-.85-i*.024; magnet.add(fin); }
  const rearDisc=new THREE.Mesh(new THREE.CircleGeometry(.51,96),metal); rearDisc.position.z=-1.126; rearDisc.rotation.y=Math.PI; magnet.add(rearDisc);
  const coilGroup=new THREE.Group();
  for(let i=0;i<18;i++) {const coil=torus(.325,.013,copper); coil.position.z=-.35-i*.021; coilGroup.add(coil);}
  membrane.add(coilGroup);

  // A small asymmetric terminal block prevents the silhouette reading as generic stacked rings.
  const terminal=new THREE.Mesh(new THREE.BoxGeometry(.34,.2,.28),black); terminal.position.set(.45,-.61,-.7); basket.add(terminal);
  for(const x of [.37,.52]) {const pin=new THREE.Mesh(new THREE.BoxGeometry(.065,.12,.03),copper);pin.position.set(x,-.72,-.66);basket.add(pin);}

  const baseCone = cone.geometry.attributes.position.array.slice();
  batchStatic(front);
  batchStatic(basket);
  batchStatic(magnet);
  batchStatic(membrane,new Set([cone]));
  return {
    root,
    setFinish(value) { metal.color.set(value==='graphite'?0x474b49:0xc9c9c4); metal.roughness=value==='graphite'?.45:.3; },
    update(explode, energy, time, moving) {
      front.position.z=explode*1.08;
      membrane.position.z=explode*.42;
      magnet.position.z=-explode*.58;
      const vibration=moving?energy:0;
      membrane.position.z+=vibration*Math.sin(time*30)*.075;
      if(vibration>.001 || cone.userData.deformed) {
        const positions=cone.geometry.attributes.position;
        for(let i=0;i<positions.count;i++) {
          const j=i*3, r=Math.hypot(baseCone[j],baseCone[j+1]);
          positions.array[j+2]=baseCone[j+2]+Math.sin(r*16-time*22)*vibration*.026;
        }
        positions.needsUpdate=true;
        cone.userData.deformed=vibration>.001;
      }
    },
    dispose() { root.traverse(node=>node.geometry?.dispose()); for(const mat of [metal,edge,black,rubber,red,copper]) {mat.roughnessMap?.dispose();mat.dispose();} },
  };
}
