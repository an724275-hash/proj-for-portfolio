import './style.css';
import { SoundEngine } from './audio.js';
import { chapterProgress, clamp, mix, sceneState, mobileSlot } from './motion.js';

const $ = selector => document.querySelector(selector);
const chapters = [...document.querySelectorAll('.chapter')];
const links = [...document.querySelectorAll('.chapter-nav a')];
const audio = new SoundEngine();
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let motion = !reduced.matches;
let scene = null;
let renderFailed = false;
let anchors = [];
let requested = false;
let current = 0;
let target = 0;
let previousTime = 0;
let framesLeft = 4;
let lastPlaying = false;
let finish = 'silver';
const stage = $('.stage');
const shadow = $('.stage-shadow');
const wave = $('#waveform');
const waveContext = wave.getContext('2d');
const samples = new Float32Array(1024);

function updateAudioUI() {
  const playing = audio.playing;
  $('#sound').setAttribute('aria-pressed', String(playing));
  $('#sound-label').textContent = playing ? 'Выключить звук' : 'Включить звук';
  $('.play-symbol').textContent = playing ? '■' : '▶';
  $('#audio-state').textContent = playing ? 'Сигнал включён' : 'Звук выключен';
  lastPlaying = playing;
}

function drawWave() {
  if (!waveContext) return;
  const width = wave.width, height = wave.height;
  waveContext.clearRect(0,0,width,height);
  waveContext.lineWidth = 1.5;
  waveContext.strokeStyle = '#e8e3d9';
  waveContext.beginPath();
  audio.getWaveform(samples);
  for(let i=0;i<width;i++) {
    const sample=motion ? samples[Math.floor(i/width*samples.length)] : 0;
    const y=height*.5+sample*height*1.6;
    if(i===0) waveContext.moveTo(i,y); else waveContext.lineTo(i,y);
  }
  waveContext.stroke();
}

function requestFrame() {
  framesLeft=Math.max(framesLeft,3);
  if (!requested && !document.hidden) { requested=true; requestAnimationFrame(frame); }
}

function frame(now) {
  requested=false;
  if(document.hidden) return;
  const dt=Math.min(.05,(now-previousTime)/1000 || .016);
  previousTime=now;
  current=motion?mix(current,target,1-Math.exp(-dt*9)):Math.round(target);
  const mobile=innerWidth<=650;
  let mobileOffset=0;
  if(mobile) {
    // On phones the object occupies its own editorial slot and cannot cover the controls.
    const screenCenter=mobileSlot(target, anchors)-scrollY;
    const desired=(.5-screenCenter/innerHeight)*6.24;
    mobileOffset=desired-sceneState(current,true).y;
  }
  const footerTop=$('footer').getBoundingClientRect().top;
  stage.style.opacity=String(clamp(footerTop/innerHeight));
  shadow.style.opacity=String(clamp(1-current*1.4));
  if(!scene) {
    const poster=$('.fallback-object');
    poster.style.opacity=String(clamp(1-target*2));
    poster.style.top=`${Math.max(-600,innerHeight*.5-scrollY)}px`;
  }
  if(scene && !renderFailed) {
    try { scene.render(current,audio.getEnergy(),now/1000,motion,mobileOffset); }
    catch(error) { fallback('Не удалось отобразить 3D. Показан постер; звук и управление доступны.'); console.error(error); }
  }
  if(lastPlaying!==audio.playing) updateAudioUI();
  drawWave();
  framesLeft--;
  if(audio.playing || Math.abs(current-target)>.0005 && motion || framesLeft>0) {
    requested=true;requestAnimationFrame(frame);
  }
}

function measure() {
  anchors=chapters.map(section=>section.offsetTop);
  target=chapterProgress(scrollY,anchors);
  scene?.resize();
  wave.width=Math.max(1,Math.round(wave.clientWidth* Math.min(devicePixelRatio,2)));
  wave.height=80;
  scrollChanged();
}

function scrollChanged() {
  target=chapterProgress(scrollY,anchors);
  const active=clamp(Math.floor(chapterProgress(scrollY+innerHeight*.4,anchors)),0,3);
  links.forEach((link,i)=>i===active?link.setAttribute('aria-current','location'):link.removeAttribute('aria-current'));
  links.forEach(link=>{
    const rect=link.getBoundingClientRect();
    const below=chapters.findIndex(section=>{const r=section.getBoundingClientRect();return rect.y+rect.height/2>=r.top && rect.y+rect.height/2<r.bottom;});
    link.classList.toggle('dark-scene',below===1||below===3);
  });
  requestFrame();
}

function applyMotion() {
  $('#motion').setAttribute('aria-pressed',String(!motion));
  $('#motion').textContent=`Движение: ${motion?'вкл':'выкл'}`;
  document.documentElement.classList.toggle('motion-off',!motion);
  requestFrame();
}
$('#motion').addEventListener('click',()=>{motion=!motion;applyMotion();});
reduced.addEventListener('change',event=>{motion=!event.matches;applyMotion();});
$('#sound').addEventListener('click',async()=>{
  try {
    const promise=audio.setPlaying(!audio.playing);
    updateAudioUI();requestFrame();
    await promise;
    updateAudioUI();requestFrame();
  } catch {
    updateAudioUI();
    $('#audio-state').textContent='Звук недоступен в этом браузере';
  }
});
document.querySelectorAll('[data-preset]').forEach(button=>button.addEventListener('click',()=>{
  audio.setPreset(button.dataset.preset);
  document.querySelectorAll('[data-preset]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));
  requestFrame();
}));
$('#frequency').addEventListener('input',event=>{
  audio.setFrequency(Number(event.target.value));
  $('#frequency-value').textContent=`${event.target.value} Гц`;
  requestFrame();
});
$('#volume').addEventListener('input',event=>{
  audio.setVolume(Number(event.target.value)/100);
  $('#volume-value').textContent=`${event.target.value}%`;
  requestFrame();
});
document.querySelectorAll('[data-finish]').forEach(button=>button.addEventListener('click',()=>{
  finish=button.dataset.finish;
  scene?.setFinish(finish);
  document.querySelectorAll('[data-finish]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));
  $('.fallback-object').style.filter=finish==='graphite'?'brightness(.65)':'none';
  requestFrame();
}));
addEventListener('scroll',scrollChanged,{passive:true});
addEventListener('resize',measure,{passive:true});
addEventListener('pointermove',event=>{
  if(!motion || event.pointerType==='touch') return;
  scene?.pointer(event.clientX/innerWidth*2-1,event.clientY/innerHeight*2-1);
  requestFrame();
},{passive:true});
document.addEventListener('visibilitychange',()=>{
  if(document.hidden) {void audio.setPlaying(false);updateAudioUI();}
  else {previousTime=performance.now();requestFrame();}
});
addEventListener('pagehide',()=>{void audio.setPlaying(false);});

function fallback(message) {
  renderFailed=true;
  document.body.classList.add('graphics-fallback');
  try {scene?.dispose();} catch { /* Fallback remains usable after a lost graphics context. */ }
  scene=null;
  document.body.classList.remove('webgl-ready');
  $('#scene-status').textContent=message;
  $('#scene').style.display='none';
  measure();
}
$('#scene').addEventListener('webglcontextlost',event=>{
  event.preventDefault();
  fallback('3D остановлено браузером. Обнови страницу, чтобы вернуть сцену.');
});
measure();applyMotion();scrollChanged();
document.fonts.ready.then(measure);
// Dynamic import lets the editorial page and audio survive an unavailable 3D renderer.
import('./scene.js').then(({createScene})=>{
  scene=createScene($('#scene'));
  scene.setFinish(finish);
  document.body.classList.add('webgl-ready');
  $('#scene-status').textContent='';
  measure();
}).catch(error=>{
  fallback('3D недоступно. Показан постер; звук и управление доступны.');
  console.warn('TENSION: 3D fallback',error.message);
});
