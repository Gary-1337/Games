// @ts-check
// Queue: Spitze sitzt am gewählten Trefferpunkt, Neigung = Queue-Winkel, Rückzug = Kraft.
import * as THREE from '../../vendor/three.module.js?v=1.0.1';
import { RAIL_TOP } from './tableMesh.js?v=1.0.1';

const BASE_TILT = 0.035; // leicht angehobener Griff, wie beim echten Stoß
const CLEARANCE = RAIL_TOP + 0.017; // Rahmenoberkante + Queue-Radius + Luft

export class CueStick {
  /** @param {number} R @param {import('../physics/table.js').Table} table */
  constructor(R, table) {
    this.R = R;
    this.table = table;
    this.root = new THREE.Group();
    this.pivot = new THREE.Group();
    this.stick = new THREE.Group();
    this.root.add(this.pivot);
    this.pivot.add(this.stick);
    const seg = (r0, r1, len, color, from, rough = 0.5) => {
      const g = new THREE.CylinderGeometry(r1, r0, len, 16, 1);
      g.rotateZ(Math.PI / 2); // Achse entlang x; r0 an +x (Spitze)
      const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0.05 }));
      m.position.x = -(from + len / 2);
      this.stick.add(m);
    };
    seg(0.0062, 0.0062, 0.012, 0x2b6fd6, 0, 0.9); // Leder
    seg(0.0063, 0.0064, 0.022, 0xf4f1e8, 0.012, 0.3); // Ferrule
    seg(0.0064, 0.0105, 0.82, 0xe6c58f, 0.034, 0.35); // Schaft (Ahorn)
    seg(0.0105, 0.0112, 0.04, 0x111111, 0.854, 0.4); // Joint
    seg(0.0112, 0.0145, 0.52, 0x4a1f0f, 0.894, 0.35); // Griff
    seg(0.0145, 0.0148, 0.04, 0x151515, 1.414, 0.6); // Gummi
    this.root.visible = false;
  }

  /**
   * @param {{x:number, y:number, angle:number, elevation:number, spinX:number, spinY:number, pull:number, maxTip:number}} s
   */
  set(s) {
    const R = this.R;
    const a = s.spinX * s.maxTip * R, b = s.spinY * s.maxTip * R;
    const c = Math.sqrt(Math.max(0, R * R - a * a - b * b));
    this.root.visible = true;
    this.root.position.set(s.x, R, -s.y);
    this.root.rotation.set(0, s.angle, 0);
    this.pivot.position.set(-c, b, a);
    const tilt = Math.max((s.elevation * Math.PI) / 180 + BASE_TILT, this.minTilt(s.x, s.y, s.angle, R + b, c + s.pull));
    this.pivot.rotation.set(0, 0, -tilt);
    this.stick.position.x = -0.004 - s.pull;
  }

  /**
   * Kleinster Neigungswinkel, bei dem der Queue über Bande und Rahmen hinter der Kugel liegt.
   * Gesucht wird der Abstand zur Bandennase entlang der Rückwärtsrichtung des Queues.
   * @param {number} tipH Höhe der Queue-Spitze @param {number} tipBack Abstand Spitze ↔ Kugelmitte (horizontal)
   */
  minTilt(x, y, angle, tipH, tipBack) {
    const { Lx, Ly } = this.table;
    const bx = -Math.cos(angle), by = -Math.sin(angle);
    let d = Infinity;
    if (bx > 1e-6) d = Math.min(d, (Lx - x) / bx);
    else if (bx < -1e-6) d = Math.min(d, (-Lx - x) / bx);
    if (by > 1e-6) d = Math.min(d, (Ly - y) / by);
    else if (by < -1e-6) d = Math.min(d, (-Ly - y) / by);
    const run = Math.max(0.01, d - tipBack);
    return Math.min(1.4, Math.atan2(Math.max(0, CLEARANCE - tipH), run));
  }

  hide() { this.root.visible = false; }
}
