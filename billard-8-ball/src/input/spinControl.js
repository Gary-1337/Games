// @ts-check
// Runde „Cue-Ball Control“: Trefferpunkt innerhalb des Sicherheitsradius verschieben.
// Doppeltipp setzt auf die Mitte zurück, Pfeiltasten bei Fokus verschieben fein.

export class SpinControl {
  /**
   * @param {HTMLElement} el  Container (.spin-ball)
   * @param {HTMLElement} dot
   * @param {(x:number, y:number) => void} onChange  x rechts +, y oben +
   * @param {() => boolean} enabled
   */
  constructor(el, dot, onChange, enabled) {
    this.el = el; this.dot = dot; this.onChange = onChange; this.enabled = enabled;
    this.x = 0; this.y = 0;
    this.id = -1;
    this.lastTap = 0;
    el.addEventListener('pointerdown', (e) => {
      if (!this.enabled()) return;
      e.preventDefault();
      const now = performance.now();
      if (now - this.lastTap < 300) { this.set(0, 0, true); this.lastTap = 0; return; }
      this.lastTap = now;
      this.id = e.pointerId;
      el.setPointerCapture(e.pointerId);
      this.fromEvent(e);
    });
    el.addEventListener('pointermove', (e) => { if (e.pointerId === this.id) { e.preventDefault(); this.fromEvent(e); } });
    const end = (e) => { if (e.pointerId === this.id) this.id = -1; };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    el.addEventListener('keydown', (e) => {
      const step = 0.1;
      const k = { ArrowUp: [0, step], ArrowDown: [0, -step], ArrowLeft: [-step, 0], ArrowRight: [step, 0] }[e.key];
      if (k) { e.preventDefault(); this.set(this.x + k[0], this.y + k[1], true); }
      if (e.key === '0' || e.key === 'Enter') this.set(0, 0, true);
    });
  }

  /** @param {PointerEvent} e */
  fromEvent(e) {
    const r = this.el.getBoundingClientRect();
    const rad = r.width / 2;
    const x = (e.clientX - r.left - rad) / (rad * 0.82);
    const y = -(e.clientY - r.top - rad) / (rad * 0.82);
    this.set(x, y, true);
  }

  set(x, y, notify = false) {
    const l = Math.hypot(x, y);
    if (l > 1) { x /= l; y /= l; }
    this.x = x; this.y = y;
    this.dot.style.transform = `translate(${x * 41}%, ${-y * 41}%)`;
    if (notify) this.onChange(x, y);
  }
}
