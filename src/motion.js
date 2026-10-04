export const clamp = (value, low = 0, high = 1) => Math.min(high, Math.max(low, Number.isFinite(value) ? value : low));
export const mix = (a, b, t) => a + (b - a) * t;
export const smooth = (t) => { t = clamp(t); return t * t * (3 - 2 * t); };

// Scene coordinates are independent of frame rate and scroll direction.
export function sceneState(progress, mobile = false) {
  const frames = mobile ? [
    { x:0, y:-.05, scale:.88, rx:-.2, ry:-.3, rz:-.3, explode:0 },
    { x:0, y:-.4, scale:.62, rx:.12, ry:-1.0, rz:-.3, explode:1 },
    { x:0, y:-.65, scale:.94, rx:-.15, ry:.3, rz:.2, explode:0 },
    { x:0, y:0, scale:.72, rx:.05, ry:-.22, rz:0, explode:0 },
  ] : [
    { x:.1, y:-.15, scale:1.15, rx:-.28, ry:-.58, rz:-.38, explode:0 },
    { x:1.7, y:0, scale:.9, rx:.15, ry:-1.05, rz:-.35, explode:1 },
    { x:2.4, y:-.8, scale:1.18, rx:-.4, ry:.4, rz:.4, explode:0 },
    { x:1.8, y:.05, scale:1.06, rx:.05, ry:-.25, rz:.07, explode:0 },
  ];
  const p = clamp(progress, 0, 3);
  const index = Math.min(2, Math.floor(p));
  const t = smooth(clamp((p - index - .12) / .75));
  return Object.fromEntries(Object.keys(frames[0]).map(key => [key, mix(frames[index][key], frames[index + 1][key], t)]));
}

export function chapterProgress(scrollY, anchors) {
  if (!anchors.length || scrollY <= anchors[0]) return 0;
  for (let i = 0; i < anchors.length - 1; i++) {
    if (scrollY < anchors[i + 1]) return i + clamp((scrollY - anchors[i]) / Math.max(1, anchors[i + 1] - anchors[i]));
  }
  return anchors.length - 1;
}

export function mobileSlot(progress, anchors) {
  const centers=[365,520,550,435];
  const p=clamp(progress,0,3);
  const i=Math.min(2,Math.floor(p));
  return mix(anchors[i]+centers[i],anchors[i+1]+centers[i+1],smooth(p-i));
}
