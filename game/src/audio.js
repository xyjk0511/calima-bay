// Procedural Web Audio synthesizer for Calima Bay: Sunset Syndicate.
// Generates dynamic vehicle engine hum, CBPD sirens, punchy gunshots, hitmarker ticks,
// cash pickup chimes, grenade bounces, explosions, and 4 procedural FM Radio stations (100% offline).

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

    if (weaponId === 'baton') {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(240, now);
      osc.frequency.exponentialRampToValueAtTime(95, now + 0.09);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.32, now);
      g.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.connect(g);
      g.connect(this.master);
      osc.start(now);
      osc.stop(now + 0.11);
      return;
    }

    const dur = weaponId === 'shotgun' ? 0.22 : weaponId === 'carbine' ? 0.13 : 0.1;
    const bufferSize = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value =
      weaponId === 'shotgun' ? 380 : weaponId === 'smg' ? 1320 : weaponId === 'pistol' ? 980 : 760;

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(weaponId === 'shotgun' ? 0.6 : 0.48, now);
    g.gain.exponentialRampToValueAtTime(0.01, now + dur);

    noise.connect(filter);
    filter.connect(g);
    g.connect(this.master);
    noise.start(now);

    // Punchy low-end transient thump
    const kick = this.ctx.createOscillator();
    kick.type = 'triangle';
    kick.frequency.setValueAtTime(weaponId === 'shotgun' ? 145 : 195, now);
    kick.frequency.exponentialRampToValueAtTime(48, now + 0.075);
    const kg = this.ctx.createGain();
    kg.gain.setValueAtTime(0.34, now);
    kg.gain.exponentialRampToValueAtTime(0.008, now + 0.08);
    kick.connect(kg);
    kg.connect(this.master);
    kick.start(now);
    kick.stop(now + 0.085);
  }

  playHitConfirm(isKill = false, isHeadshot = false) {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    const baseFreq = isHeadshot ? 1680 : isKill ? 1320 : 980;
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * (isKill ? 1.38 : 0.82), now + 0.065);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(isKill ? 0.34 : 0.22, now);
    g.gain.exponentialRampToValueAtTime(0.005, now + 0.075);
    osc.connect(g);
    g.connect(this.master);
    osc.start(now);
    osc.stop(now + 0.08);

    if (isKill) {
      const osc2 = this.ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(isHeadshot ? 2150 : 1760, now + 0.045);
      const g2 = this.ctx.createGain();
      g2.gain.setValueAtTime(0.24, now + 0.045);
      g2.gain.exponentialRampToValueAtTime(0.005, now + 0.14);
      osc2.connect(g2);
      g2.connect(this.master);
      osc2.start(now + 0.045);
      osc2.stop(now + 0.15);
    }
  }

  playCashPickup() {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    const notes = [880, 1175];
    notes.forEach((f, idx) => {
      const t = now + idx * 0.055;
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.22, t);
      g.gain.exponentialRampToValueAtTime(0.005, t + 0.16);
      osc.connect(g);
      g.connect(this.master);
      osc.start(t);
      osc.stop(t + 0.17);
    });
  }

  playGrenadeBounce() {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(85, now + 0.07);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.24, now);
    g.gain.exponentialRampToValueAtTime(0.005, now + 0.08);
    osc.connect(g);
    g.connect(this.master);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  playExplosion() {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    const dur = 0.72;
    const bufferSize = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.34));
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(360, now);
    lp.frequency.exponentialRampToValueAtTime(55, now + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.82, now);
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
