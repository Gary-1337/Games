// @ts-check
// Chillige Bar-Musik, live per WebAudio erzeugt (keine Audiodateien): Lo-Fi-Jazz mit
// Rhodes-Akkorden (ii–V–I–vi), weichem Bass, Besen-Schlagzeug, sparsamer Melodie und Knistern.

const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

// Takte: [Bassgrundton, Akkordtöne] – Dm9, G13, Cmaj9, Am9 und eine Variante mit Fmaj7/E7
const PROGRESSIONS = [
  [[38, [53, 57, 60, 64]], [43, [53, 59, 64, 69]], [36, [52, 55, 59, 62]], [45, [55, 60, 64, 71]]],
  [[41, [52, 57, 60, 64]], [40, [50, 56, 59, 62]], [45, [55, 60, 64, 67]], [43, [53, 59, 62, 65]]],
];
// Melodietöne: C-Dur-Pentatonik + Septimen, zweite Oktave
const LEAD = [72, 74, 76, 79, 81, 83, 84, 86, 88];
const SWING = 0.62; // Lage der Off-Beat-Achtel innerhalb eines Schlags

export class BarMusic {
  /**
   * @param {AudioContext} ctx
   * @param {AudioNode} destination
   * @param {AudioBuffer} noise
   */
  constructor(ctx, destination, noise) {
    this.ctx = ctx;
    this.noise = noise;
    this.volume = 0.45;
    this.tempo = 74;
    this.out = ctx.createGain();
    this.out.gain.value = 0;
    const warm = ctx.createBiquadFilter();
    warm.type = 'lowpass';
    warm.frequency.value = 3800;
    this.out.connect(warm);
    warm.connect(destination);
    // kleiner Raumhall über eine Feedback-Verzögerung
    this.bus = ctx.createGain();
    this.bus.connect(this.out);
    const delay = ctx.createDelay(1);
    delay.delayTime.value = 0.27;
    const fb = ctx.createGain();
    fb.gain.value = 0.28;
    const wet = ctx.createGain();
    wet.gain.value = 0.22;
    const damp = ctx.createBiquadFilter();
    damp.type = 'lowpass';
    damp.frequency.value = 1800;
    this.bus.connect(delay);
    delay.connect(damp);
    damp.connect(fb);
    fb.connect(delay);
    damp.connect(wet);
    wet.connect(this.out);
    // Rhodes etwas weicher filtern
    this.keys = ctx.createBiquadFilter();
    this.keys.type = 'lowpass';
    this.keys.frequency.value = 2000;
    this.keys.connect(this.bus);
    this.timer = 0;
    this.beat = 0;
    this.next = 0;
    /** @type {AudioBufferSourceNode|null} */
    this.crackle = null;
  }

  get playing() { return this.timer !== 0; }

  start() {
    if (this.timer) return;
    const t = this.ctx.currentTime;
    this.next = t + 0.15;
    this.beat = 0;
    this.out.gain.cancelScheduledValues(t);
    this.out.gain.setValueAtTime(this.out.gain.value, t);
    this.out.gain.linearRampToValueAtTime(this.volume, t + 2);
    this.timer = window.setInterval(() => this.schedule(), 60);
    this.startCrackle();
  }

  stop() {
    if (!this.timer) return;
    const t = this.ctx.currentTime;
    this.out.gain.cancelScheduledValues(t);
    this.out.gain.setValueAtTime(this.out.gain.value, t);
    this.out.gain.linearRampToValueAtTime(0, t + 0.6);
    clearInterval(this.timer);
    this.timer = 0;
    const c = this.crackle;
    this.crackle = null;
    if (c) c.stop(t + 0.7);
  }

  setVolume(v) {
    this.volume = v;
    if (!this.timer) return;
    const t = this.ctx.currentTime;
    this.out.gain.cancelScheduledValues(t);
    this.out.gain.setTargetAtTime(v, t, 0.1);
  }

  schedule() {
    const beatLen = 60 / this.tempo;
    // Lookahead: alles planen, was in den nächsten 300 ms beginnt
    while (this.next < this.ctx.currentTime + 0.3) {
      this.playBeat(this.beat, this.next, beatLen);
      this.next += beatLen;
      this.beat++;
    }
  }

  playBeat(n, t, L) {
    const b = n % 4;
    const bar = Math.floor(n / 4);
    const prog = PROGRESSIONS[Math.floor(bar / 4) % 2];
    const [root, chord] = prog[bar % 4];
    const [nextRoot] = prog[(bar + 1) % 4];
    const off = t + L * SWING;

    // Schlagzeug
    if (b === 0) this.kick(t, 0.5);
    if (b === 2 && Math.random() < 0.6) this.kick(off, 0.3);
    if (b === 1 || b === 3) this.brush(t, 0.07);
    this.hat(t, 0.025);
    this.hat(off, 0.04);

    // Bass
    if (b === 0) this.bass(root, t, L * 1.6);
    if (b === 2) this.bass(root + 7, t, L * 0.9);
    if (b === 3) this.bass(nextRoot + (Math.random() < 0.5 ? -1 : 2), off, L * 0.35);

    // Akkorde
    if (b === 0) this.rhodes(chord, t + 0.01, L * 1.8, 1);
    if (b === 2) this.rhodes(chord, off, L * 1.3, 0.7);

    // sparsame Melodie
    if (Math.random() < 0.3) {
      const note = LEAD[Math.floor(Math.random() * LEAD.length)];
      this.lead(note, Math.random() < 0.5 ? t : off, L * (0.5 + Math.random() * 0.8));
    }
  }

  env(target, t, peak, attack, dur, release = 0.25) {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(peak * 0.3, t + dur);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + release);
    g.connect(target);
    return g;
  }

  osc(type, freq, t, end, dest) {
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    o.connect(dest);
    o.start(t);
    o.stop(end);
    return o;
  }

  rhodes(notes, t, dur, vel) {
    for (const m of notes) {
      const f = mtof(m);
      const g = this.env(this.keys, t, 0.05 * vel, 0.01, dur, 0.5);
      this.osc('sine', f, t, t + dur + 0.6, g);
      // „Glocken“-Oberton, klingt schnell ab
      const bell = this.ctx.createGain();
      bell.gain.setValueAtTime(0.25, t);
      bell.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      bell.connect(g);
      this.osc('sine', f * 2, t, t + 0.4, bell);
    }
  }

  bass(m, t, dur) {
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 320;
    lp.connect(this.out);
    const g = this.env(lp, t, 0.32, 0.015, dur, 0.15);
    this.osc('triangle', mtof(m), t, t + dur + 0.2, g);
  }

  lead(m, t, dur) {
    const g = this.env(this.bus, t, 0.035, 0.03, dur, 0.4);
    const o = this.osc('sine', mtof(m), t, t + dur + 0.5, g);
    const lfo = this.ctx.createOscillator();
    const depth = this.ctx.createGain();
    lfo.frequency.value = 5;
    depth.gain.value = mtof(m) * 0.004;
    lfo.connect(depth);
    depth.connect(o.frequency);
    lfo.start(t);
    lfo.stop(t + dur + 0.5);
  }

  kick(t, v) {
    const g = this.env(this.out, t, v * 0.6, 0.004, 0.06, 0.18);
    const o = this.osc('sine', 110, t, t + 0.3, g);
    o.frequency.setValueAtTime(110, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
  }

  noiseHit(t, type, freq, q, peak, attack, decay, dest = this.out) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    src.connect(f);
    f.connect(this.env(dest, t, peak, attack, decay * 0.5, decay));
    src.start(t, Math.random() * 0.3);
    src.stop(t + attack + decay * 1.6);
  }

  brush(t, v) { this.noiseHit(t, 'bandpass', 2600, 0.7, v, 0.02, 0.2, this.bus); }
  hat(t, v) { this.noiseHit(t, 'highpass', 7500, 0.7, v, 0.002, 0.04); }

  startCrackle() {
    const ctx = this.ctx;
    const len = ctx.sampleRate * 3;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() < 0.0006 ? (Math.random() * 2 - 1) : (Math.random() * 2 - 1) * 0.02;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 1200;
    const g = ctx.createGain();
    g.gain.value = 0.05;
    src.connect(hp);
    hp.connect(g);
    g.connect(this.out);
    src.start();
    this.crackle = src;
  }
}
