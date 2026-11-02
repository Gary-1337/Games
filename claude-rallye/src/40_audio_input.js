/* =====================================================================
   7  AUDIO (WebAudio-Synthese, keine Sounddateien)
   ===================================================================== */
/** Motorklang je Klasse. idle/max: Zündfrequenz (Hz) Leerlauf/Höchstdrehzahl; gears: Gänge; cut: Filterbereich;
    sub: Unterton; whine: Oberton; grit: Rauschanteil; lumpy: Blubbern; drive: Verzerrung; turbo/pops: Turbopfeifen/Fehlzündungen */
const ENGINE_PROFILES = {
  blitz:    { idle: 38, max: 210, gears: 6, wave: 'sawtooth', sub: 0.35, whine: 0.18, cut: [700, 3600], q: 3, grit: 0.12, lumpy: 0.05, drive: 2.2, vol: 0.95, turbo: false, pops: false },
  allround: { idle: 30, max: 150, gears: 5, wave: 'sawtooth', sub: 0.45, whine: 0.06, cut: [520, 2300], q: 2, grit: 0.14, lumpy: 0.12, drive: 1.8, vol: 1.0, turbo: false, pops: false },
  brummer:  { idle: 21, max: 92, gears: 4, wave: 'sawtooth', sub: 0.7, whine: 0, cut: [300, 1250], q: 4, grit: 0.22, lumpy: 0.65, drive: 2.6, vol: 1.2, turbo: false, pops: false },
  rally:    { idle: 32, max: 165, gears: 5, wave: 'sawtooth', sub: 0.45, whine: 0.05, cut: [480, 2600], q: 2.5, grit: 0.2, lumpy: 0.18, drive: 2.4, vol: 1.0, turbo: true, pops: true },
  formula:  { idle: 70, max: 330, gears: 7, wave: 'sawtooth', sub: 0.2, whine: 0.35, cut: [1100, 5200], q: 5, grit: 0.06, lumpy: 0, drive: 1.5, vol: 1.2, turbo: false, pops: false },
  truck:    { idle: 16, max: 72, gears: 6, wave: 'sawtooth', sub: 0.8, whine: 0, cut: [260, 1100], q: 3, grit: 0.32, lumpy: 0.3, drive: 2.8, vol: 1.3, turbo: true, pops: false },
  muscle:   { idle: 19, max: 105, gears: 4, wave: 'sawtooth', sub: 0.75, whine: 0, cut: [320, 1500], q: 4, grit: 0.22, lumpy: 0.85, drive: 3.2, vol: 1.25, turbo: false, pops: true },
  ev:       { idle: 30, max: 520, gears: 1, wave: 'sine', sub: 0, whine: 0.25, cut: [2400, 6000], q: 1, grit: 0.015, lumpy: 0, drive: 1, vol: 0.55, turbo: false, pops: false, electric: true },
  buggy:    { idle: 34, max: 175, gears: 4, wave: 'square', sub: 0.4, whine: 0.05, cut: [600, 2600], q: 2, grit: 0.28, lumpy: 0.3, drive: 2.6, vol: 0.9, turbo: false, pops: true },
  kart:     { idle: 58, max: 230, gears: 1, wave: 'square', sub: 0.25, whine: 0.1, cut: [900, 3800], q: 1.5, grit: 0.3, lumpy: 0.2, drive: 3, vol: 0.8, turbo: false, pops: false }
};
const Sound = {
  ctx: null, master: null, sfx: null, noiseBuf: null, skid: null, engines: new Map(),
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain(); this.master.connect(this.ctx.destination);
      this.sfx = this.ctx.createGain(); this.sfx.connect(this.master);
      this.engBus = this.ctx.createGain(); this.engBus.connect(this.master);
      this.musicBus = this.ctx.createGain(); this.musicBus.connect(this.master);
      const len = this.ctx.sampleRate * 2, buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.noiseBuf = buf;
      // Dauerhaftes Reifenquietschen, Lautstärke wird geregelt
      const src = this.ctx.createBufferSource(); src.buffer = buf; src.loop = true;
      const bp = this.ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1800; bp.Q.value = 6;
      const g = this.ctx.createGain(); g.gain.value = 0;
      src.connect(bp); bp.connect(g); g.connect(this.sfx); src.start();
      this.skid = g;
      this.applyVolume();
      if (Music.pending) Music.play(Music.pending);
    } catch (e) { this.ctx = null; }
  },
  applyVolume() {
    if (!this.ctx) return;
    const o = Options.data;
    this.master.gain.value = o.sound ? o.volume / 100 * 0.8 : 0;
    if (this.musicBus) this.musicBus.gain.setTargetAtTime(o.music ? (o.musicVol / 100) * 0.55 * (Music.duck || 1) : 0, this.now(), 0.15);
  },
  now() { return this.ctx ? this.ctx.currentTime : 0; },
  beep(freq, dur = 0.15, type = 'square', vol = 0.18, delay = 0) {
    if (!this.ctx) return;
    const t = this.now() + delay, o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.sfx); o.start(t); o.stop(t + dur + 0.02);
  },
  noise(dur, freq, vol, type = 'lowpass') {
    if (!this.ctx) return;
    const t = this.now(), s = this.ctx.createBufferSource(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
    s.buffer = this.noiseBuf; s.playbackRate.value = 0.6 + Math.random() * 0.6;
    f.type = type; f.frequency.value = freq;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.sfx); s.start(t, Math.random()); s.stop(t + dur + 0.05);
  },
  crash(strength) { this.noise(0.18 + strength * 0.25, 500 + strength * 900, clamp(strength, 0.05, 1) * 0.5); this.beep(70 + Math.random() * 30, 0.12, 'sine', clamp(strength, 0, 1) * 0.25); },
  splash() { this.noise(0.6, 900, 0.35, 'bandpass'); },
  sizzle() { this.noise(0.9, 4200, 0.3, 'highpass'); this.noise(0.4, 300, 0.3); },
  thunder() {
    if (!this.ctx) return;
    const t = this.now() + 0.3 + Math.random() * 0.6, s = this.ctx.createBufferSource(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
    s.buffer = this.noiseBuf; s.playbackRate.value = 0.35; f.type = 'lowpass'; f.frequency.value = 260;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.5, t + 0.08); g.gain.exponentialRampToValueAtTime(0.001, t + 2.6);
    s.connect(f); f.connect(g); g.connect(this.sfx); s.start(t); s.stop(t + 2.8);
  },
  countdown(go) { if (go) { this.beep(880, 0.5, 'square', 0.2); this.beep(1320, 0.5, 'triangle', 0.12); } else this.beep(440, 0.22, 'square', 0.18); },
  service() { this.beep(1200, 0.06, 'square', 0.08); this.beep(1500, 0.06, 'square', 0.08, 0.07); },
  lap(best) { this.beep(best ? 1046 : 784, 0.12, 'triangle', 0.15); this.beep(best ? 1568 : 1046, 0.18, 'triangle', 0.15, 0.1); },
  finish() { [523, 659, 784, 1046, 784, 1046].forEach((f, i) => this.beep(f, 0.22, 'triangle', 0.16, i * 0.12)); },
  click() { this.beep(660, 0.04, 'square', 0.05); },
  setSkid(level) {
    if (!this.skid) return;
    this.skid.gain.setTargetAtTime(clamp(level, 0, 1) * 0.07, this.now(), 0.05);
  },
  /** Motoren aller Autos (Spieler + KI) für ein Bild aktualisieren: Klang je Klasse, Drehzahl mit Gängen,
      Stereo-Panorama, Lautstärke nach Entfernung und Doppler-Effekt für vorbeifahrende Autos. */
  updateEngines(race, dt) {
    if (!this.ctx) return;
    const o = Options.data, on = race.state !== 'done' && o.engine;
    const humans = race.cars.filter(c => c.human >= 0);
    // Hörer: einziger Spieler = sein Auto, sonst Bildmitte
    const L = humans.length === 1 ? { x: humans[0].x, y: humans[0].y, vx: humans[0].vx, vy: humans[0].vy, solo: humans[0] } : { x: W / 2, y: H / 2, vx: 0, vy: 0, solo: null };
    // Hörbare KI: die nächsten 5
    const ai = o.aiEngines === false ? [] : race.cars.filter(c => c.human < 0 && !c.wreck && c.sink <= 0)
      .map(c => [c, (c.x - L.x) ** 2 + (c.y - L.y) ** 2]).sort((a, b) => a[1] - b[1]).slice(0, 5).map(a => a[0]);
    const want = new Set(humans.concat(ai));
    const t = this.now();
    for (const c of race.cars) {
      let e = this.engines.get(c.id);
      const audible = on && want.has(c) && !c.wreck;
      if (!audible) { if (e) e.out.gain.setTargetAtTime(0, t, 0.08); continue; }
      if (!e) { e = this.makeEngine(c.cls.id); this.engines.set(c.id, e); }
      this.driveEngine(e, c, race, L, dt, t);
    }
  },
  makeEngine(clsId) {
    const P = ENGINE_PROFILES[clsId] || ENGINE_PROFILES.allround, ac = this.ctx;
    const o1 = ac.createOscillator(), o2 = ac.createOscillator(), o3 = ac.createOscillator();
    o1.type = P.wave; o2.type = 'square'; o2.detune.value = 7; o3.type = 'sawtooth';
    const g1 = ac.createGain(), g2 = ac.createGain(), g3 = ac.createGain();
    g1.gain.value = 0.55; g2.gain.value = P.sub; g3.gain.value = P.whine;
    // Rauhigkeit: gefiltertes Rauschen
    const ns = ac.createBufferSource(); ns.buffer = this.noiseBuf; ns.loop = true;
    const nf = ac.createBiquadFilter(); nf.type = 'bandpass'; nf.Q.value = 1.4; nf.frequency.value = 300;
    const ng = ac.createGain(); ng.gain.value = 0;
    const mix = ac.createGain();
    o1.connect(g1); o2.connect(g2); o3.connect(g3); g1.connect(mix); g2.connect(mix); g3.connect(mix); ns.connect(nf); nf.connect(ng); ng.connect(mix);
    const sh = ac.createWaveShaper(); sh.curve = this.shaperCurve(P.drive);
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = P.q; lp.frequency.value = P.cut[0];
    // Ungleichmäßiges Blubbern (V8): Amplitudenmodulation mit halber Zündfrequenz
    const am = ac.createGain(); am.gain.value = 1;
    const lfo = ac.createOscillator(), lfoG = ac.createGain(); lfo.type = 'sine'; lfoG.gain.value = P.lumpy * 0.5; lfo.connect(lfoG); lfoG.connect(am.gain);
    const vg = ac.createGain(); vg.gain.value = 0;
    // Turbo-Pfeifen
    const tb = ac.createOscillator(), tg = ac.createGain(); tb.type = 'sine'; tg.gain.value = 0; tb.connect(tg);
    const pan = ac.createStereoPanner ? ac.createStereoPanner() : null;
    const out = ac.createGain(); out.gain.value = 0;
    mix.connect(sh); sh.connect(lp); lp.connect(am); am.connect(vg); vg.connect(out); tg.connect(out);
    if (pan) { out.connect(pan); pan.connect(this.engBus || this.master); } else out.connect(this.engBus || this.master);
    for (const n of [o1, o2, o3, lfo, tb]) n.start();
    ns.start(0, Math.random());
    return { P, o1, o2, o3, ns, nf, ng, lp, lfo, vg, tb, tg, pan, out, rpm: 0.1, gear: 0, shiftT: 0, lastThr: 0, popT: 0 };
  },
  shaperCurve(k) {
    const n = 512, c = new Float32Array(n);
    for (let i = 0; i < n; i++) { const x = i / (n - 1) * 2 - 1; c[i] = Math.tanh(x * k) / Math.tanh(k); }
    return c;
  },
  driveEngine(e, c, race, L, dt, t) {
    const P = e.P, running = race.state === 'running' || race.state === 'ending';
    const v = clamp(Math.abs(fwdSpeed(c)) / c.cls.maxSpeed, 0, 1.1);
    const thr = c.finished && c.human >= 0 ? 0.3 : c.thr;
    // --- Gang und Drehzahl ---
    const n = P.gears, top = g => Math.pow((g + 1) / n, 0.8) * 1.04;
    if (n > 1) {
      if (e.gear < n - 1 && v > top(e.gear) * 0.97) { e.gear++; e.shiftT = 0.09; if (P.pops && thr > 0.5 && c.human >= 0) this.pop(e, 0.5); }
      else if (e.gear > 0 && v < top(e.gear - 1) * 0.8) e.gear--;
    } else e.gear = 0;
    let target = P.electric ? v * 0.95 : n > 1 ? v / top(e.gear) : 0.3 + 0.7 * v;
    const spin = c.air || (c.slip > 90 && thr > 0.5) || c.sink > 0;
    if (spin) target = Math.max(target, 0.75 + thr * 0.2);
    if (!running && c.thr > 0) target = Math.max(target, 0.2 + c.thr * 0.6);   // Gasstöße in der Startaufstellung
    if (!P.electric) target = Math.max(target, 0.08 + thr * 0.12);
    e.rpm += (clamp(target, 0, 1.02) - e.rpm) * Math.min(1, dt * (target > e.rpm ? 9 : 6));
    if (e.shiftT > 0) e.shiftT -= dt;
    // Gaswegnehmen bei hoher Drehzahl → Fehlzündungen (Rallye)
    if (P.pops && e.lastThr > 0.6 && thr < 0.2 && e.rpm > 0.55 && Math.random() < 0.7) this.pop(e, c.human >= 0 ? 0.6 : 0.3);
    e.lastThr = thr;
    const f = P.idle + (P.max - P.idle) * e.rpm;
    // --- Raum: Panorama, Entfernung, Doppler ---
    let gain = P.vol * (0.5 + 0.5 * thr) * (e.shiftT > 0 ? 0.55 : 1) * (P.electric ? 0.15 + 0.85 * Math.min(1, v * 2) : 1), pan = 0, dop = 1;
    if (c !== L.solo) {
      const dx = c.x - L.x, dy = c.y - L.y, d = Math.hypot(dx, dy) || 1;
      pan = clamp(dx / 520, -0.9, 0.9);
      if (L.solo || c.human < 0) gain *= (c.human >= 0 ? 1 : 0.6) / (1 + d / 170);
      const vr = ((c.vx - L.vx) * -dx + (c.vy - L.vy) * -dy) / d;     // Annäherungsgeschwindigkeit
      dop = clamp(1 / (1 - vr / 900), 0.78, 1.28);
    }
    if (!P.electric && e.rpm > 0.985 && thr > 0.5) gain *= (Math.sin(race.time * 70) > 0 ? 1 : 0.55);   // Begrenzer
    const F = f * dop, k = 0.03;
    e.o1.frequency.setTargetAtTime(F, t, k); e.o2.frequency.setTargetAtTime(F * 0.5, t, k); e.o3.frequency.setTargetAtTime(F * 2, t, k);
    e.lfo.frequency.setTargetAtTime(F * 0.5, t, k);
    e.nf.frequency.setTargetAtTime(F * 3, t, k); e.ng.gain.setTargetAtTime(P.grit * (0.3 + thr), t, 0.05);
    e.lp.frequency.setTargetAtTime(P.cut[0] + (P.cut[1] - P.cut[0]) * (0.25 * e.rpm + 0.75 * thr * e.rpm + 0.2 * thr), t, 0.05);
    e.vg.gain.setTargetAtTime(0.08 * gain, t, 0.03);
    e.out.gain.setTargetAtTime(1, t, 0.05);
    if (e.pan) e.pan.pan.setTargetAtTime(pan, t, 0.05);
    const boost = P.turbo ? clamp(thr * (e.rpm - 0.3) * 1.4, 0, 1) : 0;
    e.tb.frequency.setTargetAtTime((1800 + boost * 2600) * dop, t, 0.08); e.tg.gain.setTargetAtTime(boost * 0.006 * gain, t, 0.1);
  },
  /** Kurzer Knall aus dem Auspuff (Fehlzündung). */
  pop(e, vol) {
    const now = this.now();
    if (now - e.popT < 0.07) return; e.popT = now;
    const s = this.ctx.createBufferSource(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
    s.buffer = this.noiseBuf; f.type = 'lowpass'; f.frequency.value = 900 + Math.random() * 700;
    g.gain.setValueAtTime(vol * 0.35, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    s.connect(f); f.connect(g); g.connect(e.out); s.start(now, Math.random()); s.stop(now + 0.08);
  },
  stopEngines() {
    const t = this.now();
    for (const e of this.engines.values()) {
      try { e.out.gain.setTargetAtTime(0, t, 0.03); for (const n of [e.o1, e.o2, e.o3, e.lfo, e.tb, e.ns]) n.stop(t + 0.15); setTimeout(() => { try { e.out.disconnect(); } catch (er) { /* schon getrennt */ } }, 300); }
      catch (er) { /* bereits gestoppt */ }
    }
    this.engines.clear();
    this.setSkid(0);
  }
};

/* =====================================================================
   8  EINGABE (Tastatur für 4 Spieler + Gamepad API)
   ===================================================================== */
const KEYMAP = [
  { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight', reset: 'KeyR', label: 'Pfeiltasten', resetLabel: 'R', cp: 'Space', cpLabel: 'Leertaste' },
  { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD', reset: 'KeyQ', label: 'W A S D', resetLabel: 'Q', cp: 'KeyE', cpLabel: 'E' },
  { up: 'KeyI', down: 'KeyK', left: 'KeyJ', right: 'KeyL', reset: 'KeyU', label: 'I J K L', resetLabel: 'U', cp: 'KeyO', cpLabel: 'O' },
  { up: 'Numpad8', down: 'Numpad5', left: 'Numpad4', right: 'Numpad6', reset: 'Numpad7', label: 'Num 8 5 4 6', resetLabel: 'Num 7', cp: 'Numpad9', cpLabel: 'Num 9' }
];
const Input = {
  keys: new Set(),
  taps: new Set(),        // kurz angetippte Tasten bis zum nächsten Auslesen merken
  prev: [{}, {}, {}, {}],
  padPrevPause: [false, false, false, false],
  padsBlocked: false,
  soloWasd: false,       // Einzelspieler: Spieler 1 darf zusätzlich WASD nutzen
  /** Gamepads lesen. In eingebetteten Seiten (iframe) kann der Browser den Zugriff verbieten –
      dann wird die Gamepad-Abfrage dauerhaft abgeschaltet statt das Spiel anzuhalten. */
  pads() {
    if (this.padsBlocked || !navigator.getGamepads) return [];
    try { return Array.from(navigator.getGamepads()).filter(Boolean); }
    catch (e) { this.padsBlocked = true; return []; }
  },
  /** Liest den Zustand von Spieler p (Tastatur + ggf. Gamepad Nr. p). */
  read(p) {
    const k = KEYMAP[p], K = this.keys;
    const T0 = this.taps;
    let up = K.has(k.up), down = K.has(k.down), left = K.has(k.left), right = K.has(k.right), reset = K.has(k.reset) || T0.has(k.reset), cpr = K.has(k.cp) || T0.has(k.cp);
    T0.delete(k.reset); T0.delete(k.cp);
    if (p === 0 && this.soloWasd) {
      const w = KEYMAP[1];
      up = up || K.has(w.up); down = down || K.has(w.down); left = left || K.has(w.left); right = right || K.has(w.right); reset = reset || K.has(w.reset) || T0.has(w.reset); cpr = cpr || K.has(w.cp) || T0.has(w.cp); T0.delete(w.reset); T0.delete(w.cp);
    }
    if (p === 0 && Touch.active) { const T = Touch.state; up = up || T.up; down = down || T.down; left = left || T.left; right = right || T.right; reset = reset || T.reset; cpr = cpr || T.cp; }
    let thr = up ? 1 : 0, brk = down ? 1 : 0, steer = (right ? 1 : 0) - (left ? 1 : 0);
    let pause = false;
    const pad = this.pads()[p];
    if (pad) {
      const ax = pad.axes[0] || 0;
      const b = i => pad.buttons[i] ? pad.buttons[i].value : 0;
      const pr = i => pad.buttons[i] ? pad.buttons[i].pressed : false;
      if (Math.abs(ax) > 0.15) steer = clamp(steer + (ax - Math.sign(ax) * 0.15) / 0.85, -1, 1);
      if (pr(14)) { steer = -1; left = true; }
      if (pr(15)) { steer = 1; right = true; }
      thr = Math.max(thr, b(7), pr(0) ? 1 : 0); brk = Math.max(brk, b(6), pr(1) ? 1 : 0);
      if (thr > 0.3) up = true; if (brk > 0.3) down = true;
      if (Math.abs(ax) > 0.5) { if (ax < 0) left = true; else right = true; }
      if (pr(3)) reset = true;
      if (pr(2)) cpr = true;
      if (pr(9) && !this.padPrevPause[p]) pause = true;
      this.padPrevPause[p] = pr(9);
    }
    const pv = this.prev[p];
    const edge = { left: left && !pv.left, right: right && !pv.right, down: down && !pv.down, reset: reset && !pv.reset, cp: cpr && !pv.cpr };
    this.prev[p] = { left, right, down, reset, cpr };
    return { thr, brk, steer, edge, pause };
  }
};
window.addEventListener('keydown', e => {
  const tag = e.target && e.target.tagName;
  if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
  Input.keys.add(e.code); Input.taps.add(e.code);
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code) || e.code.startsWith('Numpad')) e.preventDefault();
  Sound.init();
  Game.onKey(e);
});
window.addEventListener('keyup', e => Input.keys.delete(e.code));
window.addEventListener('blur', () => Input.keys.clear());
window.addEventListener('pointerdown', () => Sound.init());
