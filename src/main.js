import './style.css';
import './glass.css';
import { SoundEngine } from './audio.js';
import { clamp, mix, sceneState, mobileCenter } from './motion.js';
import { createPager } from './pager.js';

const $ = selector => document.querySelector(selector);
const chapters = [...document.querySelectorAll('.chapter')];
const links = [...document.querySelectorAll('.chapter-nav a')];
const audio = new SoundEngine();
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let motion = !reduced.matches;
let scene = null;
let renderFailed = false;
let strikeAt = -Infinity;
let rotation = Math.PI;
let lightAngle = -35;
let requested = false;
let current = 0;
let target = 0;
let initialized = false;
let previousTime = 0;
let framesLeft = 4;
let lastPlaying = false;
let finish = 'silver';
const shadow = $('.stage-shadow');
const wave = $('#waveform');
const waveContext = wave.getContext('2d');
const samples = new Float32Array(1024);
document.querySelectorAll('input[type="range"]').forEach(input=>{
  const update=()=>input.style.setProperty('--fill',`${(Number(input.value)-Number(input.min))/(Number(input.max)-Number(input.min))*100}%`);
  input.addEventListener('input',update);update();
});
for(const chapter of chapters) {
  const content=document.createElement('div');
  content.className='scene-content';
  content.append(...chapter.childNodes);
  chapter.append(content);
  chapter.addEventListener('scroll',requestFrame,{passive:true});
}

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
    const screenCenter=mobileCenter(current,Math.max(760,innerHeight))-chapters[target].scrollTop;
    const desired=(.5-screenCenter/innerHeight)*6.24;
    mobileOffset=desired-sceneState(current,true).y;
  }
  shadow.style.opacity=String(clamp(1-current*1.4));
  if(!scene) {
    const poster=$('.fallback-object');
    poster.style.opacity=String(clamp(1-target*2));
    poster.style.top='50%';
  }
  if(scene && !renderFailed) {
    const strike=motion?Math.exp(-(now-strikeAt)/480)*clamp(1-Math.abs(current-4)):0;
    try { scene.render(current,Math.max(audio.getEnergy(),strike),now/1000,motion,mobileOffset,{rotation,lightAngle}); }
    catch(error) { fallback('Не удалось отобразить 3D. Звуковой инструмент доступен отдельно.'); console.error(error); }
  }
  if(lastPlaying!==audio.playing) updateAudioUI();
  drawWave();
  framesLeft--;
  if(audio.playing || motion&&(Math.abs(current-target)>.0005 || now-strikeAt<2800) || framesLeft>0) {
    requested=true;requestAnimationFrame(frame);
  }
}

function measure() {
  scene?.resize();
  wave.width=Math.max(1,Math.round(wave.clientWidth* Math.min(devicePixelRatio,2)));
  wave.height=80;
  requestFrame();
}

function sceneChanged(active) {
  target=active;
  if(!initialized) {current=active;initialized=true;}
  links.forEach((link,i)=>i===active?link.setAttribute('aria-current','location'):link.removeAttribute('aria-current'));
  document.body.classList.toggle('dark-current',[1,3,5].includes(active));
  if(active!==5&&audio.playing) {void audio.setPlaying(false);updateAudioUI();}
  requestFrame();
}

function applyMotion() {
  document.documentElement.classList.toggle('motion-off',!motion);
  requestFrame();
}
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
$('#rotation').addEventListener('input',event=>{
  rotation=Number(event.target.value)*Math.PI/180;
  $('#rotation-value').textContent=`${event.target.value}°`;requestFrame();
});
$('#light').addEventListener('input',event=>{
  lightAngle=Number(event.target.value);
  $('#light-value').textContent=`${event.target.value}°`;requestFrame();
});
$('#strike').addEventListener('click',()=>{
  strikeAt=performance.now();
  $('#strike-status').textContent=motion?'Импульс передан мембране.':'Анимация отключена настройкой уменьшения движения в системе.';
  requestFrame();
});
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
  document.querySelectorAll('.detail-control input,.surface-controls input,.surface-controls button,#strike').forEach(control=>{control.disabled=true;});
  $('#strike-status').textContent='Для импульса нужна работающая 3D-сцена.';
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
createPager(chapters,sceneChanged);
measure();applyMotion();
document.fonts.ready.then(measure);
// Dynamic import lets the editorial page and audio survive an unavailable 3D renderer.
import('./scene.js').then(({createScene})=>{
  scene=createScene($('#scene'));
  scene.setFinish(finish);
  document.body.classList.add('webgl-ready');
  $('#scene-status').textContent='';
  measure();
}).catch(error=>{
  fallback('3D недоступно. Звук работает отдельно; постер есть на первом экране.');
  console.warn('TENSION: 3D fallback',error.message);
});
