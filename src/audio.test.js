import test from 'node:test';
import assert from 'node:assert/strict';
import { SoundEngine } from './audio.js';

class Param {
  value = 0;
  cancelAndHoldAtTime() {}
  linearRampToValueAtTime(value) { this.value = value; }
}
class Node {
  gain = new Param(); frequency = new Param(); detune = new Param(); Q = new Param();
  connect() {}
  disconnect() { this.disconnected = true; }
  start() { this.started = true; }
  stop() { this.stopped = true; }
  getFloatTimeDomainData(target) { target.fill(0.1); }
}
class Context {
  static instances = [];
  currentTime = 0; sampleRate = 100; state = 'suspended'; destination = {};
  constructor() { Context.instances.push(this); }
  createGain() { return new Node(); }
  createAnalyser() { return new Node(); }
  createBiquadFilter() { return new Node(); }
  createOscillator() { return new Node(); }
  createBufferSource() { return new Node(); }
  createBuffer(channels, length) { return { getChannelData: () => new Float32Array(length) }; }
  async resume() { this.state = 'running'; }
  async suspend() { this.state = 'suspended'; }
  async close() { this.state = 'closed'; }
}
globalThis.AudioContext = Context;

test('lazy audio, parameter bounds, silent waveform before explicit start', async () => {
  const count = Context.instances.length;
  const engine = new SoundEngine();
  engine.setFrequency(500);
  engine.setVolume(-1);
  engine.setPreset('drift');
  assert.equal(Context.instances.length, count);
  assert.equal(engine.frequency, 220);
  assert.equal(engine.volume, 0);
  assert.equal(engine.getEnergy(), 0);
  assert.deepEqual([...engine.getWaveform(new Float32Array(3))], [0, 0, 0]);
  assert.throws(() => engine.setFrequency(NaN), TypeError);
  assert.throws(() => engine.setPreset('invalid'), RangeError);
  await engine.dispose();
});

test('all presets generate sound, crossfade and report actual analyzer data', async () => {
  const engine = new SoundEngine();
  assert.equal(await engine.setPlaying(true), true);
  assert.ok(Math.abs(engine.getEnergy() - 0.5) < 0.00001);
  const first = engine.voice;
  engine.setPreset('drift');
  assert.equal(first.gain.gain.value, 0);
  engine.setPreset('grain');
  assert.ok(engine.voice.sources.some(source => source.loop));
  engine.setFrequency(200);
  assert.equal(engine.voice.pitched[0].source.frequency.value, 200);
  await engine.setPlaying(false);
  assert.equal(engine.context.state, 'suspended');
  assert.equal(engine.voice, null);
  assert.ok(first.sources.every(source => source.stopped));
  assert.equal(engine.getEnergy(), 0);
  await engine.dispose();
});

test('rapid off/on cannot let an old stop kill the active voice', async () => {
  const engine = new SoundEngine();
  await engine.setPlaying(true);
  const pendingStop = engine.setPlaying(false);
  await engine.setPlaying(true);
  await pendingStop;
  assert.equal(engine.playing, true);
  assert.equal(engine.context.state, 'running');
  assert.ok(engine.voice);
  await engine.dispose();
  assert.equal(engine.context.state, 'closed');
  assert.equal(await engine.setPlaying(true), false);
});

test('dispose during a fade resolves pending callers and disconnects every source', async () => {
  const engine = new SoundEngine();
  await engine.setPlaying(true);
  const voice = engine.voice;
  const pending = engine.setPlaying(false);
  await engine.dispose();
  await pending;
  assert.ok(voice.sources.every(source => source.stopped && source.disconnected));
});

test('hidden page stops sound and never automatically resumes it', async () => {
  const engine = new SoundEngine();
  await engine.setPlaying(true);
  globalThis.document = { hidden: true };
  engine.visibilityHandler();
  assert.equal(engine.playing, false);
  globalThis.document.hidden = false;
  engine.visibilityHandler();
  assert.equal(engine.playing, false);
  delete globalThis.document;
  await engine.dispose();
});

test('preset changed during stop fade is respected by an immediate restart', async () => {
  const engine = new SoundEngine();
  await engine.setPlaying(true);
  const pending = engine.setPlaying(false);
  engine.setPreset('grain');
  await engine.setPlaying(true);
  await pending;
  assert.equal(engine.voice.preset, 'grain');
  assert.ok(engine.voice.sources.some(source => source.loop));
  await engine.dispose();
});

test('browser suspension clears playback intention and does not auto-resume', async () => {
  const engine = new SoundEngine();
  await engine.setPlaying(true);
  engine.context.state = 'suspended';
  engine.context.onstatechange();
  assert.equal(engine.playing, false);
  engine.context.state = 'running';
  engine.context.onstatechange();
  assert.equal(engine.playing, false);
  await engine.dispose();
});

test('late resume after stop does not create an unwanted voice', async () => {
  const engine = new SoundEngine();
  engine._initialize();
  let finishResume;
  engine.context.resume = () => new Promise(resolve => { finishResume = resolve; });
  const starting = engine.setPlaying(true);
  const stopping = engine.setPlaying(false);
  finishResume();
  assert.equal(await starting, false);
  assert.equal(engine.voice, null);
  assert.equal(engine.playing, false);
  await engine.dispose();
  await stopping;
});
