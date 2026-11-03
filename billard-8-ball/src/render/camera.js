// @ts-check
// Orbit-Kamera um einen Zielpunkt auf dem Tisch, mit weicher Nachführung.
import * as THREE from '../../vendor/three.module.js';

const DEG = Math.PI / 180;
const HALF_X = 1.46, HALF_Y = 0.83; // Tisch inkl. Rahmen

export class CameraRig {
  /** @param {THREE.PerspectiveCamera} camera */
  constructor(camera) {
    this.camera = camera;
    this.aspect = 1;
    this.cur = { yaw: Math.PI, pitch: 62 * DEG, dist: 3, tx: 0, ty: 0 };
    this.goal = { ...this.cur };
    this.follow = null; // {x, y} → Ziel wird teilweise zur Spielkugel gezogen
    this.userAdjusted = false;
  }

  defaultYaw() {
    return this.aspect < 1 ? Math.PI : -Math.PI / 2;
  }

  /** Abstand, bei dem der ganze Tisch sichtbar ist. */
  fitDistance(yaw, pitch) {
    const tv = Math.tan((this.camera.fov * DEG) / 2);
    const th = tv * this.aspect;
    const cy = Math.abs(Math.cos(yaw)), sy = Math.abs(Math.sin(yaw));
    const vExt = cy * HALF_X + sy * HALF_Y;
    const hExt = sy * HALF_X + cy * HALF_Y;
    const sp = Math.sin(pitch), cp = Math.cos(pitch);
    const dV = (vExt * sp) / tv + vExt * cp * 0.9;
    const dH = hExt / th + vExt * cp * 0.75;
    return Math.max(dV, dH) * 1.03;
  }

  reset(immediate = false) {
    const yaw = this.defaultYaw(), pitch = 60 * DEG;
    this.goal = { yaw, pitch, dist: this.fitDistance(yaw, pitch), tx: 0, ty: 0 };
    this.userAdjusted = false;
    if (immediate) this.cur = { ...this.goal };
  }

  topView() {
    const yaw = this.defaultYaw(), pitch = 89.4 * DEG;
    this.goal = { yaw, pitch, dist: this.fitDistance(yaw, pitch), tx: 0, ty: 0 };
    this.userAdjusted = true;
  }

  /** Replay-Perspektive: flach von der Seite. */
  replayView(x, y, angle) {
    this.goal = { yaw: angle + Math.PI * 0.8, pitch: 24 * DEG, dist: 1.5, tx: x, ty: y };
  }

  setAspect(a) {
    const changedOrientation = (a < 1) !== (this.aspect < 1);
    this.aspect = a;
    this.camera.aspect = a;
    this.camera.updateProjectionMatrix();
    if (changedOrientation || !this.userAdjusted) this.reset(true);
  }

  rotate(dYaw) { this.goal.yaw += dYaw; this.cur.yaw += dYaw; this.userAdjusted = true; }
  tilt(dPitch) {
    this.goal.pitch = Math.min(89.4 * DEG, Math.max(12 * DEG, this.goal.pitch + dPitch));
    this.userAdjusted = true;
  }
  zoom(factor) {
    this.goal.dist = Math.min(7, Math.max(0.45, this.goal.dist * factor));
    this.userAdjusted = true;
  }

  /** @param {number} dt */
  update(dt) {
    const k = 1 - Math.exp(-dt * 9);
    const g = this.goal, c = this.cur;
    let tx = g.tx, ty = g.ty;
    if (this.follow) { tx = g.tx * 0.6 + this.follow.x * 0.4; ty = g.ty * 0.6 + this.follow.y * 0.4; }
    c.yaw += (g.yaw - c.yaw) * k;
    c.pitch += (g.pitch - c.pitch) * k;
    c.dist += (g.dist - c.dist) * k;
    c.tx += (tx - c.tx) * k * 0.6;
    c.ty += (ty - c.ty) * k * 0.6;
    const h = c.dist * Math.cos(c.pitch);
    this.camera.position.set(c.tx + h * Math.cos(c.yaw), c.dist * Math.sin(c.pitch), -(c.ty + h * Math.sin(c.yaw)));
    this.camera.lookAt(c.tx, 0, -c.ty);
  }
}
