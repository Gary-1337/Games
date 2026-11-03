// @ts-check
// Untere Steuerzone: horizontal wischen = zielen, vertikal ziehen = Kraft aufladen (Loslassen stößt)
// bzw. Queue-Winkel im Winkel-Modus. Die Achse wird nach den ersten Pixeln fixiert, damit ein
// Ziel-Wisch nie versehentlich einen Stoß auslöst.

const AXIS_LOCK_PX = 10;
const LONG_PRESS_MS = 480;

/**
 * @typedef {Object} AimPadHandlers
 * @property {() => boolean} enabled
 * @property {() => 'power'|'angle'} mode
 * @property {() => boolean} fine
 * @property {(dAngle:number) => void} aim
 * @property {(power:number) => void} power
 * @property {(power:number) => void} shoot
 * @property {() => void} cancel
 * @property {(dDeg:number) => void} elevation
 * @property {() => void} longPress
 */

export class AimPad {
  /** @param {HTMLElement} el @param {AimPadHandlers} h */
  constructor(el, h) {
    this.el = el;
    this.h = h;
    this.id = -1;
    this.axis = /** @type {null|'h'|'v'} */ (null);
    this.x0 = 0; this.y0 = 0; this.lastX = 0; this.lastY = 0;
    this.power = 0;
    this.timer = 0;
    el.addEventListener('pointerdown', (e) => this.down(e));
    el.addEventListener('pointermove', (e) => this.move(e));
    el.addEventListener('pointerup', (e) => this.up(e, false));
    el.addEventListener('pointercancel', (e) => this.up(e, true));
    el.addEventListener('lostpointercapture', (e) => { if (e.pointerId === this.id) this.up(e, true); });
  }

  /** @param {PointerEvent} e */
  down(e) {
    if (this.id !== -1 || !this.h.enabled()) return;
    e.preventDefault();
    this.id = e.pointerId;
    this.el.setPointerCapture(e.pointerId);
    this.x0 = this.lastX = e.clientX;
    this.y0 = this.lastY = e.clientY;
    this.axis = null;
    this.power = 0;
    this.el.classList.add('active');
    clearTimeout(this.timer);
    this.timer = window.setTimeout(() => {
      if (this.id !== -1 && this.axis === null) this.h.longPress();
    }, LONG_PRESS_MS);
  }

  /** @param {PointerEvent} e */
  move(e) {
    if (e.pointerId !== this.id) return;
    e.preventDefault();
    const dx = e.clientX - this.x0, dy = e.clientY - this.y0;
    if (!this.axis) {
      if (Math.hypot(dx, dy) < AXIS_LOCK_PX) return;
      this.axis = Math.abs(dx) >= Math.abs(dy) ? 'h' : 'v';
      clearTimeout(this.timer);
    }
    if (this.axis === 'h') {
      const sens = this.h.fine() ? 0.00035 : 0.0045;
      this.h.aim(-(e.clientX - this.lastX) * sens);
    } else if (this.h.mode() === 'power') {
      const range = Math.max(130, this.el.clientHeight * 1.15);
      this.power = Math.min(1, Math.max(0, dy / range));
      this.h.power(this.power);
    } else {
      this.h.elevation(-(e.clientY - this.lastY) * 0.25);
    }
    this.lastX = e.clientX;
    this.lastY = e.clientY;
  }

  /** @param {PointerEvent} e @param {boolean} cancelled */
  up(e, cancelled) {
    if (e.pointerId !== this.id) return;
    clearTimeout(this.timer);
    this.id = -1;
    this.el.classList.remove('active');
    const wasPower = this.axis === 'v' && this.h.mode() === 'power';
    this.axis = null;
    if (wasPower) {
      if (!cancelled && this.power >= 0.03 && this.h.enabled()) this.h.shoot(this.power);
      else this.h.cancel();
    }
    this.power = 0;
  }
}
