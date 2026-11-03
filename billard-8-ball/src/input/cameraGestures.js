// @ts-check
// Gesten auf dem Tischbereich: 1 Finger = Kamera drehen (oder Spielkugel bei Ball in Hand ziehen),
// 2 Finger = Pinch-Zoom + Neigen, Tipp = Zielrichtung setzen, Doppeltipp = Kamera zurücksetzen.
// Mausrad zoomt, rechte Maustaste neigt.

/**
 * @typedef {Object} CameraHandlers
 * @property {(dx:number) => void} rotate
 * @property {(dy:number) => void} tilt
 * @property {(factor:number) => void} zoom
 * @property {(x:number, y:number) => void} tap
 * @property {() => void} doubleTap
 * @property {(x:number, y:number) => boolean} dragStart   true = Geste übernommen (Ball in Hand)
 * @property {(x:number, y:number) => void} dragMove
 * @property {() => void} dragEnd
 */

export class CameraGestures {
  /** @param {HTMLElement} el @param {CameraHandlers} h */
  constructor(el, h) {
    this.el = el;
    this.h = h;
    /** @type {Map<number, {x:number, y:number, x0:number, y0:number, t0:number}>} */
    this.pts = new Map();
    this.mode = /** @type {''|'cam'|'drag'|'multi'} */ ('');
    this.moved = false;
    this.lastTap = 0;
    this.pinch = 0;
    this.mid = { x: 0, y: 0 };
    this.button = 0;
    el.addEventListener('pointerdown', (e) => this.down(e));
    el.addEventListener('pointermove', (e) => this.move(e));
    el.addEventListener('pointerup', (e) => this.up(e));
    el.addEventListener('pointercancel', (e) => this.up(e, true));
    el.addEventListener('wheel', (e) => { e.preventDefault(); this.h.zoom(Math.exp(e.deltaY * 0.0012)); }, { passive: false });
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  local(e) {
    const r = this.el.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  /** @param {PointerEvent} e */
  down(e) {
    e.preventDefault();
    this.el.setPointerCapture(e.pointerId);
    const p = this.local(e);
    this.pts.set(e.pointerId, { ...p, x0: p.x, y0: p.y, t0: performance.now() });
    if (this.pts.size === 1) {
      this.button = e.button;
      this.moved = false;
      this.mode = e.button === 0 && this.h.dragStart(p.x, p.y) ? 'drag' : 'cam';
    } else if (this.pts.size === 2) {
      if (this.mode === 'drag') this.h.dragEnd();
      this.mode = 'multi';
      this.moved = true;
      const [a, b] = [...this.pts.values()];
      this.pinch = Math.hypot(a.x - b.x, a.y - b.y);
      this.mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    }
  }

  /** @param {PointerEvent} e */
  move(e) {
    const pt = this.pts.get(e.pointerId);
    if (!pt) return;
    e.preventDefault();
    const p = this.local(e);
    const dx = p.x - pt.x, dy = p.y - pt.y;
    pt.x = p.x; pt.y = p.y;
    if (Math.hypot(p.x - pt.x0, p.y - pt.y0) > 8) this.moved = true;
    if (this.mode === 'drag') this.h.dragMove(p.x, p.y);
    else if (this.mode === 'cam' && this.moved) {
      if (this.button === 2) this.h.tilt(dy * 0.006);
      else this.h.rotate(dx * 0.0065);
    } else if (this.mode === 'multi' && this.pts.size >= 2) {
      const [a, b] = [...this.pts.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      if (this.pinch > 0 && dist > 0) this.h.zoom(this.pinch / dist);
      this.h.tilt((mid.y - this.mid.y) * 0.006);
      this.h.rotate((mid.x - this.mid.x) * 0.004);
      this.pinch = dist;
      this.mid = mid;
    }
  }

  /** @param {PointerEvent} e */
  up(e, cancelled = false) {
    const pt = this.pts.get(e.pointerId);
    if (!pt) return;
    this.pts.delete(e.pointerId);
    if (this.mode === 'drag') { this.h.dragEnd(); this.mode = ''; return; }
    if (this.pts.size === 0) {
      if (!cancelled && !this.moved && this.mode === 'cam' && this.button === 0 && performance.now() - pt.t0 < 350) {
        const now = performance.now();
        if (now - this.lastTap < 320) { this.h.doubleTap(); this.lastTap = 0; }
        else { this.lastTap = now; this.h.tap(pt.x, pt.y); }
      }
      this.mode = '';
    } else if (this.pts.size === 1) {
      // zurück zu Ein-Finger-Drehung ohne Sprung
      this.mode = 'cam';
    }
  }
}
