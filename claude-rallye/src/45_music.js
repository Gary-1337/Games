/* =====================================================================
   7b  MUSIK (WebAudio-Sequenzer, alle Stücke werden live synthetisiert)
   Jedes Stück: Tempo, Tonart, zwei Akkordfolgen (A/B), Stil (Schlagzeug-, Bass-, Arpeggio-Muster).
   Die Melodie wird je Stück aus einem Zufallsstartwert erzeugt und folgt den Akkorden.
   ===================================================================== */
const SCALES = { minor: [0, 2, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10], major: [0, 2, 4, 5, 7, 9, 11], phryg: [0, 1, 3, 5, 7, 8, 10] };
const SONGS = [
  { id: 'menu', name: 'Boxengasse bei Nacht', bpm: 96, root: 57, scale: 'minor', A: [0, 5, 3, 4], B: [5, 3, 0, 4], style: 'chill', seed: 7 },
  { id: 'drive', name: 'Vollgas', bpm: 138, root: 52, scale: 'minor', A: [0, 5, 6, 4], B: [3, 0, 6, 4], style: 'rock', seed: 11 },
  { id: 'neon', name: 'Neonring', bpm: 118, root: 50, scale: 'minor', A: [0, 5, 2, 6], B: [3, 4, 0, 0], style: 'synth', seed: 23 },
  { id: 'gravel', name: 'Schotterpiste', bpm: 150, root: 55, scale: 'dorian', A: [0, 3, 0, 4], B: [6, 3, 4, 4], style: 'breaks', seed: 31 },
  { id: 'frost', name: 'Gletscherfunk', bpm: 112, root: 53, scale: 'dorian', A: [0, 3, 1, 4], B: [5, 3, 0, 4], style: 'funk', seed: 43 },
  { id: 'derby', name: 'Blechschaden', bpm: 168, root: 52, scale: 'phryg', A: [0, 1, 0, 6], B: [3, 1, 0, 0], style: 'punk', seed: 59 },
  { id: 'podium', name: 'Siegerehrung', bpm: 104, root: 55, scale: 'major', A: [0, 4, 5, 3], B: [0, 3, 4, 4], style: 'chill', seed: 71 }
];
/** Muster je Stil (16 Schritte je Takt). bass: [Schritt, Oktave, Länge in Schritten]; lead: Notendichte; arp: Arpeggio an/aus */
const STYLES = {
  chill:  { kick: [0, 8, 10], snare: [12], hat: [2, 6, 10, 14], open: [], bass: [[0, 0, 6], [6, 0, 2], [8, 0, 6], [14, 1, 2]], lead: 0.3, arp: false, leadWave: 'triangle', pad: true, swing: 0.1 },
  rock:   { kick: [0, 6, 8, 11], snare: [4, 12], hat: [0, 2, 4, 6, 8, 10, 12, 14], open: [14], bass: [[0, 0, 2], [2, 0, 2], [4, 0, 2], [6, 0, 2], [8, 0, 2], [10, 0, 2], [12, 0, 2], [14, 1, 2]], lead: 0.5, arp: false, leadWave: 'sawtooth', pad: false, swing: 0 },
  synth:  { kick: [0, 4, 8, 12], snare: [4, 12], hat: [2, 6, 10, 14], open: [], bass: [[0, 0, 1], [2, 1, 1], [4, 0, 1], [6, 1, 1], [8, 0, 1], [10, 1, 1], [12, 0, 1], [14, 1, 1]], lead: 0.4, arp: true, leadWave: 'square', pad: true, swing: 0 },
  breaks: { kick: [0, 10], snare: [4, 12], ghost: [7, 15], hat: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], open: [], bass: [[0, 0, 3], [3, 0, 1], [10, 0, 3], [14, 1, 2]], lead: 0.45, arp: true, leadWave: 'sawtooth', pad: true, swing: 0 },
  funk:   { kick: [0, 3, 8, 10], snare: [4, 12], ghost: [6, 15], hat: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], open: [6], bass: [[0, 0, 1], [3, 1, 1], [4, 0, 1], [7, 0, 1], [10, 1, 1], [11, 0, 1], [14, 0, 2]], lead: 0.4, arp: false, leadWave: 'square', pad: true, swing: 0.12 },
  punk:   { kick: [0, 4, 8, 12], snare: [2, 6, 10, 14], hat: [0, 2, 4, 6, 8, 10, 12, 14], open: [], bass: [[0, 0, 1], [1, 0, 1], [2, 0, 1], [3, 0, 1], [4, 0, 1], [5, 0, 1], [6, 0, 1], [7, 0, 1], [8, 0, 1], [9, 0, 1], [10, 0, 1], [11, 0, 1], [12, 0, 1], [13, 0, 1], [14, 0, 1], [15, 0, 1]], lead: 0.55, arp: false, leadWave: 'sawtooth', pad: false, swing: 0 }
};
/** Ablauf in 8-Takt-Blöcken; nach dem Intro wird ab Index 1 wiederholt. */
const FORM = ['intro', 'A', 'B', 'A', 'break', 'B'];
const midiHz = m => 440 * Math.pow(2, (m - 69) / 12);

const Music = {
  song: null, timer: null, step: 0, nextT: 0, pending: null, duck: 1, motif: null, delay: null,

  /** Stück für ein Rennen wählen (Derby eigenes Stück, sonst nach Umgebung mit etwas Zufall). */
  forRace(cfg, theme) {
    if (cfg.mode === 'derby') return 'derby';
    const byTheme = { snow: 'frost', desert: 'gravel', city: 'neon', meadow: 'drive', volcano: 'derby', beach: 'neon', quarry: 'gravel', alpine: 'frost' }[theme] || 'drive';
    if (Math.random() < 0.35) { const r = ['drive', 'neon', 'gravel', 'frost']; return r[Math.floor(Math.random() * r.length)]; }
    return byTheme;
  },
  play(id) {
    const o = Options.data;
    if (!Sound.ctx) { this.pending = id; return; }
    if (this.song && this.song.id === id && this.timer) return;
    this.stop();
    if (!o.music) { this.pending = id; return; }
    const S0 = SONGS.find(s => s.id === id) || SONGS[0];
    this.song = S0; this.pending = null;
    this.st = STYLES[S0.style]; this.scale = SCALES[S0.scale];
    this.spb = 60 / S0.bpm / 4;                       // Sekunden je Sechzehntel
    this.step = 0; this.nextT = Sound.now() + 0.12;
    this.makeMotif();
    if (!this.delay) {
      const ac = Sound.ctx;
      this.delay = ac.createDelay(1); this.fb = ac.createGain(); this.wet = ac.createGain();
      this.delay.connect(this.fb); this.fb.connect(this.delay); this.delay.connect(this.wet); this.wet.connect(Sound.musicBus);
      this.fb.gain.value = 0.32; this.wet.gain.value = 0.35;
    }
    this.delay.delayTime.value = this.spb * 3;
    this.timer = setInterval(() => this.tick(), 25);
    Sound.applyVolume();
  },
  stop() { if (this.timer) clearInterval(this.timer); this.timer = null; this.song = null; },
  /** Nach Ein-/Ausschalten in den Optionen. */
  refresh() { if (!Options.data.music) { const id = this.song ? this.song.id : this.pending; this.stop(); this.pending = id; } else if (this.pending) this.play(this.pending); Sound.applyVolume(); },
  setDuck(d) { this.duck = d; Sound.applyVolume(); },
  makeMotif() {
    // Zwei Takte Melodie: Rhythmus und Akkordton-Index (folgt später den Akkorden)
    const rng = mulberry32(this.song.seed * 977), dens = this.st.lead, m = [];
    let idx = 2;
    for (let s = 0; s < 32; s++) {
      const strong = s % 4 === 0, p = strong ? dens + 0.25 : s % 2 === 0 ? dens : dens * 0.35;
      if (rng() < p) {
        idx = clamp(idx + Math.floor(rng() * 5) - 2, 0, 6);
        let len = rng() < 0.3 ? 3 : rng() < 0.5 ? 2 : 1;
        m.push({ s, idx, len, pass: !strong && rng() < 0.25 });
      }
    }
    this.motif = m;
  },
  /** Ton aus der Tonleiter: Stufe deg (beliebig groß), Basisnote root. */
  note(deg) { const sc = this.scale, o = Math.floor(deg / 7), d = ((deg % 7) + 7) % 7; return this.song.root + o * 12 + sc[d]; },
  tick() {
    if (!Sound.ctx || !this.song) return;
    while (this.nextT < Sound.now() + 0.12) {
      this.playStep(this.step, this.nextT);
      this.step++;
      const sw = this.st.swing || 0;
      this.nextT += this.spb * (1 + (this.step % 2 === 1 ? sw : -sw));     // Swing: lang-kurz
    }
  },
  playStep(step, t) {
    const S0 = this.song, st = this.st;
    const bar = Math.floor(step / 16), s = step % 16;
    const blk = Math.floor(bar / 8), fi = blk < FORM.length ? blk : 1 + (blk - 1) % (FORM.length - 1);
    const sec = FORM[fi], prog = sec === 'B' ? S0.B : S0.A, deg = prog[bar % 4];
    const lastBar = bar % 8 === 7;
    const drums = sec !== 'break', full = sec === 'A' || sec === 'B';
    // Schlagzeug
    if (drums) {
      if (st.kick.includes(s) && (full || s === 0 || s === 8)) this.kick(t, 0.9);
      if (st.snare.includes(s) && sec !== 'intro') this.snare(t, 0.5);
      if (st.ghost && st.ghost.includes(s) && full) this.snare(t, 0.14);
      if (st.hat.includes(s)) this.hat(t, s % 4 === 0 ? 0.13 : 0.08, st.open.includes(s));
      if (lastBar && s >= 12 && sec === 'B') this.snare(t, 0.12 + (s - 12) * 0.06);     // kleiner Wirbel
    } else if (s === 0 && bar % 2 === 0) this.kick(t, 0.5);
    // Bass
    if (sec !== 'break') for (const [bs, oct, len] of st.bass) if (bs === s) this.bass(t, this.note(deg) - 24 + oct * 12, len * this.spb);
    // Flächen
    if (st.pad && s === 0) this.pad(t, [this.note(deg), this.note(deg + 2), this.note(deg + 4)], this.spb * 16, sec === 'intro' || sec === 'break' ? 0.07 : 0.045);
    if (!st.pad && s === 0 && sec !== 'intro') this.power(t, this.note(deg) - 12, this.spb * 7);
    // Arpeggio
    if (st.arp && (full || sec === 'break') && s % 2 === 0) { const k = [0, 2, 4, 7, 4, 2, 0, 4][(s / 2) % 8]; this.pluck(t, this.note(deg + k) + 12, 0.035); }
    // Melodie (in B und im Break, in A jede zweite Runde)
    const leadOn = sec === 'B' || sec === 'break' || (sec === 'A' && blk % 2 === 1);
    if (leadOn) {
      const ms = (bar % 2) * 16 + s;
      for (const n of this.motif) if (n.s === ms) {
        const tone = n.pass ? this.note(deg + n.idx + 1) : this.note(deg + [0, 2, 4][n.idx % 3] + Math.floor(n.idx / 3) * 7);
        this.lead(t, tone + 12, n.len * this.spb * 0.95);
      }
    }
  },
  /* ---------- Instrumente ---------- */
  out() { return Sound.musicBus; },
  env(g, t, a, peak, d, end = 0.0001) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(end, t + a + d); },
  kick(t, v) {
    const ac = Sound.ctx, o = ac.createOscillator(), g = ac.createGain();
    o.frequency.setValueAtTime(155, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.13);
    this.env(g, t, 0.003, v * 0.9, 0.3); o.connect(g); g.connect(this.out()); o.start(t); o.stop(t + 0.35);
  },
  snare(t, v) {
    const ac = Sound.ctx, n = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    n.buffer = Sound.noiseBuf; f.type = 'bandpass'; f.frequency.value = 1900; f.Q.value = 0.8;
    this.env(g, t, 0.002, v * 0.7, 0.16); n.connect(f); f.connect(g); g.connect(this.out()); n.start(t, Math.random()); n.stop(t + 0.2);
    const o = ac.createOscillator(), og = ac.createGain(); o.type = 'triangle'; o.frequency.setValueAtTime(200, t); o.frequency.exponentialRampToValueAtTime(140, t + 0.08);
    this.env(og, t, 0.002, v * 0.4, 0.08); o.connect(og); og.connect(this.out()); o.start(t); o.stop(t + 0.12);
  },
  hat(t, v, open) {
    const ac = Sound.ctx, n = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    n.buffer = Sound.noiseBuf; f.type = 'highpass'; f.frequency.value = 7200;
    this.env(g, t, 0.001, v, open ? 0.2 : 0.035); n.connect(f); f.connect(g); g.connect(this.out()); n.start(t, Math.random()); n.stop(t + (open ? 0.25 : 0.06));
  },
  bass(t, m, dur) {
    const ac = Sound.ctx, o = ac.createOscillator(), o2 = ac.createOscillator(), f = ac.createBiquadFilter(), g = ac.createGain();
    o.type = 'sawtooth'; o2.type = 'square'; o.frequency.value = midiHz(m); o2.frequency.value = midiHz(m - 12);
    f.type = 'lowpass'; f.Q.value = 6; f.frequency.setValueAtTime(1400, t); f.frequency.exponentialRampToValueAtTime(220, t + Math.min(0.25, dur));
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.22, t + 0.005); g.gain.setValueAtTime(0.2, t + dur * 0.8); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.04);
    o.connect(f); o2.connect(f); f.connect(g); g.connect(this.out()); o.start(t); o2.start(t); o.stop(t + dur + 0.06); o2.stop(t + dur + 0.06);
  },
  pad(t, notes, dur, v) {
    const ac = Sound.ctx, f = ac.createBiquadFilter(), g = ac.createGain();
    f.type = 'lowpass'; f.frequency.value = 1100;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.4); g.gain.setValueAtTime(v, t + dur - 0.2); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.25);
    f.connect(g); g.connect(this.out());
    for (const m of notes) for (const dt of [-8, 8]) { const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = midiHz(m); o.detune.value = dt; o.connect(f); o.start(t); o.stop(t + dur + 0.3); }
  },
  power(t, m, dur) {
    // Verzerrter Powerchord (Rock/Punk)
    const ac = Sound.ctx, f = ac.createBiquadFilter(), g = ac.createGain(), sh = ac.createWaveShaper();
    sh.curve = Sound.shaperCurve(4); f.type = 'lowpass'; f.frequency.value = 2200;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05, t + 0.01); g.gain.setValueAtTime(0.045, t + dur * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    sh.connect(f); f.connect(g); g.connect(this.out());
    for (const k of [0, 7, 12]) { const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = midiHz(m + k); o.detune.value = (Math.random() - 0.5) * 12; o.connect(sh); o.start(t); o.stop(t + dur + 0.05); }
  },
  pluck(t, m, v) {
    const ac = Sound.ctx, o = ac.createOscillator(), f = ac.createBiquadFilter(), g = ac.createGain();
    o.type = 'square'; o.frequency.value = midiHz(m); f.type = 'lowpass'; f.frequency.setValueAtTime(3000, t); f.frequency.exponentialRampToValueAtTime(500, t + 0.12);
    this.env(g, t, 0.003, v, 0.14); o.connect(f); f.connect(g); g.connect(this.out()); g.connect(this.delay); o.start(t); o.stop(t + 0.2);
  },
  lead(t, m, dur) {
    const ac = Sound.ctx, wave = this.st.leadWave, f = ac.createBiquadFilter(), g = ac.createGain();
    f.type = 'lowpass'; f.frequency.value = wave === 'triangle' ? 3000 : 2400; f.Q.value = 2;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.06, t + 0.01); g.gain.setValueAtTime(0.05, t + Math.max(0.02, dur - 0.03)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.08);
    f.connect(g); g.connect(this.out()); g.connect(this.delay);
    for (const dt of [-6, 6]) {
      const o = ac.createOscillator(); o.type = wave; o.frequency.value = midiHz(m); o.detune.value = dt;
      const vib = ac.createOscillator(), vg = ac.createGain(); vib.frequency.value = 5.5; vg.gain.setValueAtTime(0, t); vg.gain.linearRampToValueAtTime(dur > 0.25 ? 7 : 0, t + dur);
      vib.connect(vg); vg.connect(o.detune);
      o.connect(f); o.start(t); vib.start(t); o.stop(t + dur + 0.1); vib.stop(t + dur + 0.1);
    }
  }
};

/* =====================================================================
   7c  KOMMENTATOR (Sprachausgabe des Browsers, deutsch)
   ===================================================================== */
const Speaker = {
  last: {}, voice: null, busyT: 0,
  ok() { return typeof speechSynthesis !== 'undefined' && Options.data.commentary === true && Options.data.sound; },
  /** Deutsche Stimmen, männliche und natürliche zuerst. */
  voices() {
    if (typeof speechSynthesis === 'undefined') return [];
    const MALE = /conrad|killian|florian|jonas|stefan|markus|yannick|viktor|martin|hans|klaus|thomas|ralf|bernd|male|mann/i;
    const FEMALE = /katja|amala|seraphina|ingrid|hedda|anna|petra|helena|marlene|vicki|female|frau|google deutsch/i;
    const vs = (speechSynthesis.getVoices() || []).filter(v => /^de/i.test(v.lang));
    const score = v => (MALE.test(v.name) ? 100 : FEMALE.test(v.name) ? 0 : 40) + (/natural|online|neural|premium|enhanced/i.test(v.name) ? 20 : 0) + (/de-(DE|AT)/i.test(v.lang) ? 3 : 0);
    return vs.map(v => ({ v, male: MALE.test(v.name), female: FEMALE.test(v.name), score: score(v) })).sort((a, b) => b.score - a.score);
  },
  pickVoice() {
    if (this.voice) return this.voice;
    const list = this.voices(), want = Options.data.voiceName;
    const hit = want && list.find(x => x.v.name === want);
    const best = hit || list[0];
    this.voice = best ? best.v : null;
    this.female = best ? !best.male && (best.female || !hit) && !best.male : false;
    return this.voice;
  },
  /** Ansage; key + gap verhindern Wiederholungen, prio 2 unterbricht laufende Ansagen. */
  say(text, key = text, gap = 5, prio = 1) {
    if (!this.ok()) return;
    const now = performance.now() / 1000;
    if (this.last[key] && now - this.last[key] < gap) return;
    if (prio < 2 && speechSynthesis.speaking && now < this.busyT) return;
    this.last[key] = now;
    try {
      if (prio >= 2) speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'de-DE'; const v = this.pickVoice(); if (v) u.voice = v;
      u.rate = 1.12; u.pitch = this.female ? 0.72 : 0.95;      // keine männliche Stimme vorhanden → tiefer sprechen u.volume = Math.min(1, (Options.data.volume || 70) / 100 + 0.2);
      speechSynthesis.speak(u); this.busyT = now + 2.2;
    } catch (e) { /* Sprachausgabe nicht verfügbar */ }
  },
  pick(a) { return a[Math.floor(Math.random() * a.length)]; },
  stop() { try { if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel(); } catch (e) { /* egal */ } }
};
if (typeof speechSynthesis !== 'undefined') try { speechSynthesis.onvoiceschanged = () => { Speaker.voice = null; Speaker.pickVoice(); if (typeof UI !== 'undefined' && UI.current === 'scr-options') UI.options(); }; } catch (e) { /* egal */ }
