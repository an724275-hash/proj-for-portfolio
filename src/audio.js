const PRESETS = new Set(['pulse', 'drift', 'grain']);
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/** Local synthesizer. No microphone, network requests, or audio before setPlaying(true). */
export class SoundEngine {
  constructor() {
    this.context = null;
    this.preset = 'pulse';
    this.frequency = 110;
    this.volume = 0.18;
    this.playing = false;
    this.disposed = false;
    this.voice = null;
    this.revision = 0;
    this.suspendRequests = 0;
    this.retired = new Map();
    this.stopTimer = null;
    this.settleStop = null;
    this.visibilityHandler = () => {
      if (globalThis.document?.hidden) void this.setPlaying(false);
    };
    globalThis.document?.addEventListener('visibilitychange', this.visibilityHandler);
  }

  _ramp(parameter, value, seconds = 0.06) {
    const now = this.context.currentTime;
    if (parameter.cancelAndHoldAtTime) parameter.cancelAndHoldAtTime(now);
    else {
      parameter.cancelScheduledValues(now);
      parameter.setValueAtTime(parameter.value, now);
    }
    parameter.linearRampToValueAtTime(value, now + seconds);
  }

  _initialize() {
    if (this.context) return;
    const AudioContext = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AudioContext) throw new Error('Web Audio is unavailable in this browser.');
    this.context = new AudioContext();
    this.context.onstatechange = () => {
      if (!this.disposed && !this.suspendRequests && this.playing && this.context.state !== 'running') {
        // Browser/OS interruption requires a new explicit play gesture.
        void this.setPlaying(false);
      }
    };
    this.master = this.context.createGain();
    this.master.gain.value = 0;
    this.analyser = this.context.createAnalyser();
    this.analyser.fftSize = 1024;
    this.analyser.smoothingTimeConstant = 0.75;
    this.samples = new Float32Array(this.analyser.fftSize);
    this.master.connect(this.analyser);
    this.analyser.connect(this.context.destination);
  }

  _createVoice() {
    const ctx = this.context;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.connect(this.master);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = this.preset === 'grain' ? 1100 : 1600;
    filter.Q.value = 0.6;
    filter.connect(gain);
    const nodes = [gain, filter];
    const sources = [];
    const pitched = [];
    const oscillator = (type, ratio, level, detune = 0) => {
      const source = ctx.createOscillator();
      source.type = type;
      source.frequency.value = this.frequency * ratio;
      source.detune.value = detune;
      const amplitude = ctx.createGain();
      amplitude.gain.value = level;
      source.connect(amplitude);
      amplitude.connect(filter);
      nodes.push(source, amplitude);
      sources.push(source);
      pitched.push({ source, ratio });
      source.start();
    };
    if (this.preset === 'pulse') {
      oscillator('sine', 1, 0.58);
      oscillator('square', 0.5, 0.12);
      oscillator('sine', 2, 0.12, 4);
    } else if (this.preset === 'drift') {
      oscillator('triangle', 1, 0.3, -7);
      oscillator('triangle', 1, 0.3, 7);
      oscillator('sine', 1.5, 0.15);
    } else {
      oscillator('sine', 1, 0.38);
      const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.32;
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;
      noise.connect(filter);
      noise.start();
      sources.push(noise);
      nodes.push(noise);
    }
    // Slow movement is audible, rather than a purely decorative visual pulse.
    const lfo = ctx.createOscillator();
    const depth = ctx.createGain();
    lfo.frequency.value = { pulse: 2.4, drift: 0.16, grain: 5.8 }[this.preset];
    depth.gain.value = { pulse: 100, drift: 450, grain: 700 }[this.preset];
    lfo.connect(depth);
    depth.connect(filter.frequency);
    lfo.start();
    sources.push(lfo);
    nodes.push(lfo, depth);
    this._ramp(gain.gain, 1);
    return { gain, nodes, sources, pitched, preset: this.preset };
  }

  _destroyVoice(voice) {
    if (!voice) return;
    for (const source of voice.sources) {
      try { source.stop(); } catch { /* Already stopped. */ }
    }
    for (const node of voice.nodes) node.disconnect();
  }

  _cancelStop() {
    clearTimeout(this.stopTimer);
    this.stopTimer = null;
    this.settleStop?.(false);
    this.settleStop = null;
  }

  async setPlaying(value) {
    if (this.disposed) return false;
    const playing = Boolean(value);
    const revision = ++this.revision;
    this.playing = playing;
    this._cancelStop();
    if (playing) {
      try {
        this._initialize();
        // Invoke resume immediately inside the caller's click / key gesture.
        await this.context.resume();
        if (this.disposed || revision !== this.revision || !this.playing) return false;
        if (this.voice && this.voice.preset !== this.preset) {
          const previous = this.voice;
          this._ramp(previous.gain.gain, 0);
          const timer = setTimeout(() => {
            this._destroyVoice(previous);
            this.retired.delete(previous);
          }, 100);
          this.retired.set(previous, timer);
          this.voice = null;
        }
        if (!this.voice) this.voice = this._createVoice();
        this._ramp(this.master.gain, this.volume);
        return true;
      } catch (error) {
        if (revision === this.revision) this.playing = false;
        throw error;
      }
    }
    if (!this.context) return false;
    this._ramp(this.master.gain, 0);
    return new Promise((resolve) => {
      this.settleStop = resolve;
      this.stopTimer = setTimeout(async () => {
        this.stopTimer = null;
        this.settleStop = null;
        if (this.disposed || revision !== this.revision) return resolve(false);
        this._destroyVoice(this.voice);
        this.voice = null;
        this.suspendRequests++;
        try {
          await this.context.suspend();
          // An explicit click may have raced with suspend's asynchronous completion.
          if (!this.disposed && this.playing) await this.context.resume();
        } catch { /* Closing or unavailable contexts are already silent. */ }
        finally { this.suspendRequests--; }
        resolve(false);
      }, 100);
    });
  }

  setPreset(preset) {
    if (!PRESETS.has(preset)) throw new RangeError('Unknown sound preset.');
    if (this.disposed || preset === this.preset) return;
    this.preset = preset;
    if (!this.voice || !this.playing) return;
    const previous = this.voice;
    this.voice = this._createVoice();
    this._ramp(previous.gain.gain, 0);
    const timer = setTimeout(() => {
      this._destroyVoice(previous);
      this.retired.delete(previous);
    }, 100);
    this.retired.set(previous, timer);
  }

  setFrequency(hz) {
    if (!Number.isFinite(hz)) throw new TypeError('Frequency must be finite.');
    this.frequency = clamp(hz, 55, 220);
    for (const { source, ratio } of this.voice?.pitched || []) {
      this._ramp(source.frequency, this.frequency * ratio);
    }
  }

  setVolume(value) {
    if (!Number.isFinite(value)) throw new TypeError('Volume must be finite.');
    this.volume = clamp(value, 0, 1);
    if (this.context && !this.disposed) this._ramp(this.master.gain, this.playing ? this.volume : 0);
  }

  getWaveform(target) {
    if (!(target instanceof Float32Array)) throw new TypeError('Expected Float32Array.');
    if (!this.analyser || !this.playing || this.context.state !== 'running') target.fill(0);
    else this.analyser.getFloatTimeDomainData(target);
    return target;
  }

  getEnergy() {
    if (!this.samples || !this.playing || this.disposed) return 0;
    this.getWaveform(this.samples);
    let sum = 0;
    for (const sample of this.samples) sum += sample * sample;
    return clamp(Math.sqrt(sum / this.samples.length) * 5, 0, 1);
  }

  async dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.playing = false;
    this.revision++;
    this._cancelStop();
    globalThis.document?.removeEventListener('visibilitychange', this.visibilityHandler);
    this._destroyVoice(this.voice);
    this.voice = null;
    for (const [voice, timer] of this.retired) {
      clearTimeout(timer);
      this._destroyVoice(voice);
    }
    this.retired.clear();
    if (this.context) this.context.onstatechange = null;
    if (this.context && this.context.state !== 'closed') await this.context.close();
  }
}
