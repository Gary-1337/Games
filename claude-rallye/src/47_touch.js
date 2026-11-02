/* =====================================================================
   8b  TOUCH-STEUERUNG (Handy/Tablet)
   Links: Lenken (Finger links/rechts der Mitte), rechts: Bremse | Gas. Mehrere Finger gleichzeitig.
   Oben links: Pause, darunter Reset. Nur für Spieler 1.
   ===================================================================== */
const Touch = {
  active: false, el: null, state: { up: false, down: false, left: false, right: false, reset: false, cp: false }, ptr: new Map(),
  /** Touch-Gerät erkannt? */
  detect() { try { return (navigator.maxTouchPoints || 0) > 0 || matchMedia('(pointer: coarse)').matches; } catch (e) { return false; } },
  /** Einstellung: 0 = automatisch, 1 = immer an, 2 = aus */
  enabled() { const m = Options.data.touch || 0; return m === 1 || (m === 0 && this.detect()); },
  init() {
    const el = document.createElement('div'); el.id = 'touch';
    el.innerHTML = `<div class="tz" id="tz-steer"><div class="tb" data-k="left">◀</div><div class="tb" data-k="right">▶</div></div>
      <div class="tz" id="tz-pedal"><div class="tb" data-k="down">BREMSE<small>Box: Tanken</small></div><div class="tb gas" data-k="up">GAS</div></div>
      <div class="tsmall" id="t-pause">Ⅱ</div><div class="tsmall" id="t-reset">↺</div><div class="tsmall" id="t-cp">⚑</div>`;
    $('stage').appendChild(el); this.el = el;
    // Zonen: welcher Knopf liegt unter dem Finger? (Finger dürfen zwischen Knöpfen gleiten)
    const zoneKey = (zone, e) => {
      const r = zone.getBoundingClientRect(), u = (e.clientX - r.left) / r.width;
      return zone.id === 'tz-steer' ? (u < 0.5 ? 'left' : 'right') : (u < 0.45 ? 'down' : 'up');
    };
    for (const zone of el.querySelectorAll('.tz')) {
      const down = e => { e.preventDefault(); Sound.init(); try { zone.setPointerCapture(e.pointerId); } catch (er) { /* ohne Capture weiter */ } this.ptr.set(e.pointerId, zoneKey(zone, e)); this.sync(); };
      const move = e => { if (!this.ptr.has(e.pointerId)) return; e.preventDefault(); this.ptr.set(e.pointerId, zoneKey(zone, e)); this.sync(); };
      const up = e => { this.ptr.delete(e.pointerId); this.sync(); };
      zone.addEventListener('pointerdown', down); zone.addEventListener('pointermove', move);
      zone.addEventListener('pointerup', up); zone.addEventListener('pointercancel', up); zone.addEventListener('lostpointercapture', up);
    }
    $('t-pause').addEventListener('pointerdown', e => { e.preventDefault(); if (Game.paused) Game.resume(); else Game.pause(); });
    const cpb = $('t-cp');
    cpb.addEventListener('pointerdown', e => { e.preventDefault(); this.state.cp = true; cpb.classList.add('on'); });
    for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) cpb.addEventListener(ev, () => { this.state.cp = false; cpb.classList.remove('on'); });
    const rs = $('t-reset');
    rs.addEventListener('pointerdown', e => { e.preventDefault(); this.state.reset = true; rs.classList.add('on'); });
    for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) rs.addEventListener(ev, () => { this.state.reset = false; rs.classList.remove('on'); });
  },
  sync() {
    const k = new Set(this.ptr.values()), s = this.state;
    s.up = k.has('up'); s.down = k.has('down'); s.left = k.has('left'); s.right = k.has('right');
    for (const b of this.el.querySelectorAll('.tb')) b.classList.toggle('on', k.has(b.dataset.k));
  },
  /** Jedes Bild: Overlay nur im laufenden Rennen mit Spieler zeigen. */
  update() {
    if (!this.el) return;
    const show = this.enabled() && Game.state === 'race' && !!Game.race && Game.race.cars.some(c => c.human === 0) && !Game.paused;
    if (show !== this.active) {
      this.active = show; this.el.classList.toggle('on', show);
      if (!show) { this.ptr.clear(); this.sync(); this.state.reset = false; }
    }
  }
};
