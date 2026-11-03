// @ts-check
// Synthetische Sounds über WebAudio (keine Downloads, sofort verfügbar).
import { BarMusic } from './music.js?v=1.0.2';

export class Sound {
  constructor() {
    /** @type {BarMusic|null} */
    this.music = null;
    this.musicOn = false;
    this.musicVolume = 0.225;
    /** @type {AudioContext|null} */
    this.ctx = null;
    this.master = null;
    this.noise = null;
    this.enabled = true;
    this.volume = 0.8;
    this.budget = 0;
  }

  /** Muss aus einer Nutzergeste heraus aufgerufen werden (iOS/Android Autoplay-Regeln). */
  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || /** @type {any} */ (window).webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.volume;
    this.master.connect(this.ctx.destination);
    const len = this.ctx.sampleRate * 0.5;
    this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.music = new BarMusic(this.ctx, this.ctx.destination, this.noise);
    this.setMusic(this.musicOn, this.musicVolume);
  }

  /** Hintergrundmusik an/aus und Lautstärke; startet erst nach der ersten Nutzergeste. */
  setMusic(on, volume) {
    this.musicOn = on;
    this.musicVolume = volume;
    if (!this.music) return;
    this.music.setVolume(volume * 0.6);
    if (on && volume > 0) this.music.start();
    else this.music.stop();
  }

  setVolume(v) {
    this.volume = v;
    if (this.master) this.master.gain.value = v;
  }

  suspend() { this.ctx?.suspend(); }
  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); }

  /** Pro Frame aufrufen: begrenzt gleichzeitige Sounds. */
  frame() { this.budget = 6; }

  ok() {
    if (!this.enabled || !this.ctx || !this.master || this.ctx.state !== 'running') return false;
    if (this.budget <= 0) return false;
    this.budget--;
    return true;
  }

  env(gain, t0, attack, decay) {
    const g = /** @type {AudioContext} */ (this.ctx).createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + decay);
    g.connect(/** @type {GainNode} */ (this.master));
    return g;
  }

  tone(freq, gain, decay, type = 'sine', when = 0, slideTo = 0) {
    const ctx = /** @type {AudioContext} */ (this.ctx);
    const t0 = ctx.currentTime + when;
    const o = ctx.createOscillator();
    o.type = /** @type {OscillatorType} */ (type);
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + decay);
    o.connect(this.env(gain, t0, 0.002, decay));
    o.start(t0);
    o.stop(t0 + decay + 0.05);
  }

  burst(freq, q, gain, decay, when = 0) {
    const ctx = /** @type {AudioContext} */ (this.ctx);
    const t0 = ctx.currentTime + when;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = freq;
    f.Q.value = q;
    src.connect(f);
    f.connect(this.env(gain, t0, 0.001, decay));
    src.start(t0, Math.random() * 0.3);
    src.stop(t0 + decay + 0.05);
  }

  cue(power) {
    if (!this.ok()) return;
    const g = 0.15 + power * 0.5;
    this.burst(2400, 2, g, 0.05);
    this.tone(900, g * 0.4, 0.04, 'triangle');
  }

  ball(v) {
    if (v < 0.03 || !this.ok()) return;
    // dumpfer „Klack“: tiefere Grundtöne, kurzer Ausklang, Rauschanteil im Mittenbereich
    const g = Math.min(0.85, 0.05 + v * 0.2);
    this.tone(1150 + Math.random() * 150, g * 0.42, 0.032);
    this.tone(540 + Math.random() * 60, g * 0.32, 0.05);
    this.burst(1300, 1.1, g * 0.4, 0.022);
  }

  cushion(v) {
    if (v < 0.05 || !this.ok()) return;
    const g = Math.min(0.7, 0.05 + v * 0.18);
    this.burst(260, 1.2, g, 0.09);
    this.tone(140, g * 0.5, 0.08, 'sine');
  }

  pocket() {
    if (!this.ok()) return;
    this.tone(110, 0.5, 0.25, 'sine', 0, 70);
    this.burst(900, 2, 0.3, 0.06, 0.05);
    this.burst(700, 2, 0.22, 0.06, 0.12);
  }

  foul() {
    if (!this.ok()) return;
    this.tone(220, 0.25, 0.18, 'square', 0, 180);
    this.tone(165, 0.25, 0.25, 'square', 0.2, 130);
  }

  win() {
    if (!this.ok()) return;
    [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.25, 0.3, 'triangle', i * 0.12));
  }

  tick() {
    if (!this.ok()) return;
    this.tone(1800, 0.05, 0.02, 'sine');
  }
}
