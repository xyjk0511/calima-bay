// Procedural Web Audio synthesizer for Calima Bay: Sunset Syndicate.
// Generates dynamic vehicle engine hum, CBPD sirens, gunshots, explosions,
// UI chimes, and 4 playable procedural FM Radio stations (100% offline).

import { RADIO_STATIONS } from './config.js';

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.engineOsc = null;
    this.engineGain = null;
    this.sirenOsc = null;
    this.sirenGain = null;
    this.radioIndex = 0;
    this.radioTimer = 0;
    this.radioStep = 0;
    this.muted = false;
  }

  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return;
    }
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    this.ctx = new AudioCtx();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.28;
    this.master.connect(this.ctx.destination);

    // Continuous engine oscillator
    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.value = 55;
    const engineFilter = this.ctx.createBiquadFilter();
    engineFilter.type = 'lowpass';
    engineFilter.frequency.value = 260;
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0.0;
    this.engineOsc.connect(engineFilter);
    engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.master);
    this.engineOsc.start();

    // Continuous CBPD siren oscillator
    this.sirenOsc = this.ctx.createOscillator();
    this.sirenOsc.type = 'triangle';
    this.sirenOsc.frequency.value = 640;
    this.sirenGain = this.ctx.createGain();
    this.sirenGain.gain.value = 0.0;
    this.sirenOsc.connect(this.sirenGain);
    this.sirenGain.connect(this.master);
    this.sirenOsc.start();
  }

  get currentStation() {
    return RADIO_STATIONS[this.radioIndex % RADIO_STATIONS.length];
  }

  cycleRadio() {
    this.radioIndex = (this.radioIndex + 1) % RADIO_STATIONS.length;
    this.playChime(520);
    return this.currentStation;
  }

  playShot(weaponId) {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    const dur = weaponId === 'shotgun' ? 0.19 : 0.11;
    const bufferSize = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.28));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = weaponId === 'shotgun' ? 420 : weaponId === 'smg' ? 1200 : 840;

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.45, now);
    g.gain.exponentialRampToValueAtTime(0.01, now + dur);

    noise.connect(filter);
    filter.connect(g);
    g.connect(this.master);
    noise.start(now);
  }

  playExplosion() {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    const dur = 0.65;
    const bufferSize = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.35));
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(340, now);
    lp.frequency.exponentialRampToValueAtTime(65, now + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.75, now);
    g.gain.exponentialRampToValueAtTime(0.01, now + dur);
    src.connect(lp);
    lp.connect(g);
    g.connect(this.master);
    src.start(now);
  }

  playChime(freq = 660) {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.28, now + 0.14);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.18, now);
    g.gain.exponentialRampToValueAtTime(0.005, now + 0.22);
    osc.connect(g);
    g.connect(this.master);
    osc.start(now);
    osc.stop(now + 0.24);
  }

  update(dt, elapsed, player, police, isPlaying) {
    if (!this.ctx || this.muted || !isPlaying) {
      if (this.engineGain) this.engineGain.gain.value = 0;
      if (this.sirenGain) this.sirenGain.gain.value = 0;
      return;
    }

    // Engine hum scales with speed & nitro
    if (player.vehicle) {
      const spd = player.vehicle.speed;
      this.engineOsc.frequency.value = 52 + spd * 2.5 + (player.vehicle.nitroActive ? 45 : 0);
      this.engineGain.gain.value = 0.08 + Math.min(0.12, spd * 0.0025);
    } else {
      this.engineGain.gain.value = 0;
    }

    // CBPD siren wail when wanted
    if (police.stars > 0 && police.units.length > 0) {
      const wail = Math.sin(elapsed * 4.5) * 180 + 760;
      this.sirenOsc.frequency.value = wail;
      this.sirenGain.gain.value = 0.045;
    } else {
      this.sirenGain.gain.value = 0;
    }

    // Procedural FM Radio synth bassline while driving
    if (player.vehicle) {
      const st = this.currentStation;
      const stepDur = 60 / st.bpm / 2;
      this.radioTimer += dt;
      if (this.radioTimer >= stepDur) {
        this.radioTimer -= stepDur;
        this._playRadioNote(st, this.radioStep++);
      }
    }
  }

  _playRadioNote(station, step) {
    const now = this.ctx.currentTime;
    const semi = station.scale[step % station.scale.length];
    const freq = station.root * Math.pow(2, semi / 12) * (step % 4 === 0 ? 0.5 : 1);
    const osc = this.ctx.createOscillator();
    osc.type = station.wave;
    osc.frequency.setValueAtTime(freq, now);
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 720;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.05, now);
    g.gain.exponentialRampToValueAtTime(0.002, now + 0.18);
    osc.connect(lp);
    lp.connect(g);
    g.connect(this.master);
    osc.start(now);
    osc.stop(now + 0.2);
  }
}
