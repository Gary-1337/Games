// @ts-check
// Deterministische Billard-Simulation mit Fixed-Timestep.
//
// Modell (z zeigt nach oben, Kugelmittelpunkt auf Höhe R):
//  - Jede Kugel hat Position (x, y), Geschwindigkeit (vx, vy) und Winkelgeschwindigkeit (wx, wy, wz).
//  - Kontaktpunkt mit dem Filz liegt bei r = (0, 0, -R); seine Gleitgeschwindigkeit ist
//    u = v + w × r = (vx - R·wy, vy + R·wx).
//  - Sliding (|u| > 0): Gleitreibung µs·m·g wirkt entgegen u und erzeugt Drehmoment; u nimmt mit
//    7/2·µs·g ab. Ist u = 0 erreicht, geht die Kugel exakt in Rolling über.
//  - Rolling: Rollwiderstand µr·g bremst, w bleibt an v gekoppelt (wy = vx/R, wx = -vy/R).
//  - Side-Spin wz wird durch Bohrreibung abgebaut.
//  - Kugel-Kugel-Stöße werden pro Schritt ereignisbasiert (exakter Time-of-Impact) aufgelöst,
//    damit beim Break mit 16 Kugeln nichts tunnelt. Impuls mit Restitution entlang der Normalen,
//    Coulomb-Reibung tangential (Throw + Spinübertragung).
//  - Banden: Kontakt an der Bandennase oberhalb des Kugelzentrums; Restitution + Reibung,
//    dadurch verändert Side-Spin den Abprallwinkel und Topspin wird teilweise abgebaut.

import { BALL_RADIUS, BALL_MASS, GRAVITY, DT, DEFAULT_PARAMS, BALL_COUNT } from './constants.js?v=1.0.1';
import { createTable } from './table.js?v=1.0.1';

/**
 * @typedef {Object} Ball
 * @property {number} id
 * @property {number} x @property {number} y
 * @property {number} px @property {number} py   Position vor dem letzten Schritt (Interpolation)
 * @property {number} vx @property {number} vy
 * @property {number} wx @property {number} wy @property {number} wz
 * @property {number[]} q  Orientierung als Quaternion [x, y, z, w]
 * @property {boolean} onTable
 * @property {number} pocket  Taschenindex oder -1
 *
 * @typedef {Object} ShotLog
 * @property {number|null} firstContact   erste von der Spielkugel berührte Kugel
 * @property {boolean} railAfterContact   irgendeine Kugel traf nach dem ersten Kontakt eine Bande
 * @property {number[]} railBalls         Objektbälle, die eine Bande berührten
 * @property {{id:number, pocket:number, t:number}[]} pocketed
 * @property {number[]} offTable
 *
 * @typedef {{type:'ball'|'cushion'|'pocket', v:number, id:number}} SimEvent
 */

const REST_EPS = 1e-5;

/** @param {number} id @returns {Ball} */
function makeBall(id) {
  return { id, x: 0, y: 0, px: 0, py: 0, vx: 0, vy: 0, wx: 0, wy: 0, wz: 0, q: [0, 0, 0, 1], onTable: true, pocket: -1 };
}

export class Simulation {
  /**
   * @param {import('./table.js').Table} [table]
   * @param {import('./constants.js').PhysicsParams} [params]
   */
  constructor(table = createTable(), params = DEFAULT_PARAMS) {
    this.table = table;
    this.p = params;
    this.R = BALL_RADIUS;
    this.m = BALL_MASS;
    this.I = 0.4 * BALL_MASS * BALL_RADIUS * BALL_RADIUS;
    /** @type {Ball[]} */
    this.balls = [];
    for (let i = 0; i < BALL_COUNT; i++) this.balls.push(makeBall(i));
    this.time = 0;
    /** @type {SimEvent[]} */
    this.events = [];
    this.recordEvents = true;
    /** @type {ShotLog} */
    this.log = this.emptyLog();
  }

  /** @returns {ShotLog} */
  emptyLog() {
    return { firstContact: null, railAfterContact: false, railBalls: [], pocketed: [], offTable: [] };
  }

  resetLog() {
    this.log = this.emptyLog();
    this.time = 0;
  }

  /** Kugel auf den Tisch setzen und vollständig beruhigen. */
  placeBall(id, x, y) {
    const b = this.balls[id];
    b.x = b.px = x;
    b.y = b.py = y;
    b.vx = b.vy = b.wx = b.wy = b.wz = 0;
    b.onTable = true;
    b.pocket = -1;
  }

  removeBall(id) {
    const b = this.balls[id];
    b.onTable = false;
    b.vx = b.vy = b.wx = b.wy = b.wz = 0;
  }

  /** @param {Ball} b */
  isMoving(b) {
    return b.vx !== 0 || b.vy !== 0 || b.wx !== 0 || b.wy !== 0;
  }

  isAtRest() {
    for (const b of this.balls) {
      if (b.onTable && (b.vx !== 0 || b.vy !== 0 || b.wx !== 0 || b.wy !== 0 || b.wz !== 0)) return false;
    }
    return true;
  }

  maxSpeed() {
    let s = 0;
    for (const b of this.balls) if (b.onTable) s = Math.max(s, Math.hypot(b.vx, b.vy));
    return s;
  }

  /**
   * Wendet einen Queue-Stoß auf die Spielkugel an.
   * Modell nach Leckie/Greenspan: Queue (Masse M, Geschwindigkeit V0) trifft die Kugel im Punkt
   * (seitlich a, vertikal b) unter dem Erhöhungswinkel θ. Vertikale Geschwindigkeit wird ignoriert
   * (kein Springen), die Winkelgeschwindigkeit bleibt erhalten → Massé bei großem θ.
   * @param {{angle:number, speed:number, a:number, b:number, elevation:number}} s
   *        angle = Stoßrichtung (rad), speed = V0 (m/s), a/b = Trefferpunkt in Metern, elevation (rad)
   */
  strike(s) {
    const { R, m, I, p } = this;
    const ball = this.balls[0];
    const a = s.a, b = s.b;
    const c = Math.sqrt(Math.max(0, R * R - a * a - b * b));
    const ct = Math.cos(s.elevation), st = Math.sin(s.elevation);
    const denom = 1 + m / p.cueMass + (5 / (2 * R * R)) * (a * a + b * b * ct * ct + c * c * st * st - 2 * b * c * ct * st);
    const F = (2 * m * s.speed) / denom;
    // lokales System: x = Stoßrichtung, y = links, z = oben
    const speed = (F * ct) / m;
    const squirt = p.squirt * (a / (R * p.maxTip || R));
    const vxL = speed * Math.cos(squirt);
    const vyL = speed * Math.sin(squirt);
    const wxL = (a * F * st) / I;
    const wyL = (F * (b * ct - c * st)) / I;
    const wzL = (a * F * ct) / I;
    const cs = Math.cos(s.angle), sn = Math.sin(s.angle);
    ball.vx = vxL * cs - vyL * sn;
    ball.vy = vxL * sn + vyL * cs;
    ball.wx = wxL * cs - wyL * sn;
    ball.wy = wxL * sn + wyL * cs;
    ball.wz = wzL;
  }

  /** Ein Fixed-Timestep-Schritt. @param {number} [dt] */
  step(dt = DT) {
    const balls = this.balls;
    const n = balls.length;
    for (let i = 0; i < n; i++) {
      const b = balls[i];
      b.px = b.x;
      b.py = b.y;
      if (b.onTable) this.applyFriction(b, dt);
    }

    // Translation mit ereignisbasierten Kugel-Kugel-Kollisionen innerhalb des Schritts
    let remaining = dt;
    for (let iter = 0; iter < 64 && remaining > 0; iter++) {
      let tMin = remaining, hi = -1, hj = -1;
      for (let i = 0; i < n; i++) {
        const bi = balls[i];
        if (!bi.onTable) continue;
        const mi = bi.vx !== 0 || bi.vy !== 0;
        for (let j = i + 1; j < n; j++) {
          const bj = balls[j];
          if (!bj.onTable) continue;
          if (!mi && bj.vx === 0 && bj.vy === 0) continue;
          const t = this.timeOfImpact(bi, bj, tMin);
          if (t >= 0 && t < tMin) { tMin = t; hi = i; hj = j; }
          else if (t === 0 && hi < 0) { tMin = 0; hi = i; hj = j; }
        }
      }
      this.advance(tMin);
      remaining -= tMin;
      if (hi < 0) break;
      this.collideBalls(balls[hi], balls[hj]);
    }
    if (remaining > 0) this.advance(remaining);

    for (let i = 0; i < n; i++) {
      const b = balls[i];
      if (b.onTable && (b.vx !== 0 || b.vy !== 0)) this.collideCushions(b);
    }
    this.separateOverlaps();
    this.checkPocketsAndBounds();
    for (let i = 0; i < n; i++) {
      const b = balls[i];
      if (b.onTable) this.integrateOrientation(b, dt);
    }
    this.time += dt;
  }

  /** @param {number} t */
  advance(t) {
    if (t <= 0) return;
    for (const b of this.balls) {
      if (!b.onTable) continue;
      b.x += b.vx * t;
      b.y += b.vy * t;
    }
  }

  /**
   * Zeit bis zur Berührung zweier Kugeln bei konstanter Geschwindigkeit, -1 wenn keine.
   * @param {Ball} bi @param {Ball} bj @param {number} maxT
   */
  timeOfImpact(bi, bj, maxT) {
    const px = bj.x - bi.x, py = bj.y - bi.y;
    const vx = bj.vx - bi.vx, vy = bj.vy - bi.vy;
    const bq = px * vx + py * vy;
    if (bq >= 0) return -1; // entfernen sich
    const D = 2 * this.R;
    const c = px * px + py * py - D * D;
    if (c <= 0) return 0; // berühren/überlappen und nähern sich
    const a = vx * vx + vy * vy;
    const disc = bq * bq - a * c;
    if (disc < 0) return -1;
    const t = (-bq - Math.sqrt(disc)) / a;
    return t <= maxT ? t : -1;
  }

  /** @param {Ball} b @param {number} dt */
  applyFriction(b, dt) {
    const { R, p } = this;
    const ux = b.vx - R * b.wy;
    const uy = b.vy + R * b.wx;
    const ulen = Math.hypot(ux, uy);
    if (ulen > REST_EPS) {
      // Sliding: Reibung verändert Translation und Rotation
      const dv = p.muSlide * GRAVITY * dt;
      let dvx, dvy;
      const finish = 3.5 * dv >= ulen;
      if (finish) { dvx = -ux / 3.5; dvy = -uy / 3.5; }
      else { dvx = (-dv * ux) / ulen; dvy = (-dv * uy) / ulen; }
      b.vx += dvx;
      b.vy += dvy;
      b.wx += (2.5 * dvy) / R;
      b.wy -= (2.5 * dvx) / R;
      if (finish) { b.wx = -b.vy / R; b.wy = b.vx / R; }
    } else {
      const speed = Math.hypot(b.vx, b.vy);
      if (speed > 0) {
        const dec = p.muRoll * GRAVITY * dt;
        if (speed <= dec || speed < REST_EPS) { b.vx = 0; b.vy = 0; }
        else { const k = (speed - dec) / speed; b.vx *= k; b.vy *= k; }
      }
      // Rollbedingung exakt halten bzw. Ruhe herstellen
      b.wx = -b.vy / R;
      b.wy = b.vx / R;
      if (b.vx === 0 && b.vy === 0) { b.wx = 0; b.wy = 0; }
    }
    if (b.wz !== 0) {
      const dz = ((2.5 * p.muSpin * GRAVITY) / R) * dt;
      if (Math.abs(b.wz) <= dz) b.wz = 0;
      else b.wz -= Math.sign(b.wz) * dz;
    }
  }

  /** @param {Ball} bi @param {Ball} bj */
  collideBalls(bi, bj) {
    const { R, m, I, p } = this;
    let nx = bj.x - bi.x, ny = bj.y - bi.y;
    const d = Math.hypot(nx, ny) || 1e-9;
    nx /= d; ny /= d;
    // Kontaktpunktgeschwindigkeiten (ri = R·n, rj = -R·n)
    const cix = bi.vx - bi.wz * R * ny, ciy = bi.vy + bi.wz * R * nx, ciz = R * (bi.wx * ny - bi.wy * nx);
    const cjx = bj.vx + bj.wz * R * ny, cjy = bj.vy - bj.wz * R * nx, cjz = -R * (bj.wx * ny - bj.wy * nx);
    const rx = cix - cjx, ry = ciy - cjy, rz = ciz - cjz;
    const vn = rx * nx + ry * ny;
    if (vn <= 0) return;
    const Jn = ((1 + p.eBall) * m * vn) / 2;
    // Impuls auf i
    let Px = -Jn * nx, Py = -Jn * ny, Pz = 0;
    const tx = rx - vn * nx, ty = ry - vn * ny, tz = rz;
    const tl = Math.hypot(tx, ty, tz);
    if (tl > 1e-9) {
      // geschwindigkeitsabhängige Kugel-Kugel-Reibung (Alciatore): langsame Stöße werfen stärker
      const mu = p.muBall + p.muBallB * Math.exp(-p.muBallC * tl);
      const Jt = Math.min(mu * Jn, (m * tl) / 7);
      Px -= (Jt * tx) / tl; Py -= (Jt * ty) / tl; Pz -= (Jt * tz) / tl;
    }
    bi.vx += Px / m; bi.vy += Py / m;
    bj.vx -= Px / m; bj.vy -= Py / m;
    // Δw = (r × P) / I ; ri = R·n, für j: rj = -R·n und Pj = -P → gleiches Kreuzprodukt
    const ax = (R * ny * Pz) / I, ay = (-R * nx * Pz) / I, az = (R * (nx * Py - ny * Px)) / I;
    bi.wx += ax; bi.wy += ay; bi.wz += az;
    bj.wx += ax; bj.wy += ay; bj.wz += az;

    if (this.log.firstContact === null) {
      if (bi.id === 0) this.log.firstContact = bj.id;
      else if (bj.id === 0) this.log.firstContact = bi.id;
    }
    if (this.recordEvents) this.events.push({ type: 'ball', v: vn, id: bi.id });
  }

  /** @param {Ball} b */
  collideCushions(b) {
    const R = this.R;
    for (const s of this.table.segments) {
      const ex = s.bx - s.ax, ey = s.by - s.ay;
      const len2 = ex * ex + ey * ey;
      let t = ((b.x - s.ax) * ex + (b.y - s.ay) * ey) / len2;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const cx = s.ax + ex * t, cy = s.ay + ey * t;
      let nx = b.x - cx, ny = b.y - cy;
      const d = Math.hypot(nx, ny);
      if (d >= R || d === 0) continue;
      nx /= d; ny /= d;
      b.x = cx + nx * R;
      b.y = cy + ny * R;
      this.cushionImpulse(b, nx, ny);
    }
  }

  /** @param {Ball} b @param {number} nx @param {number} ny  Normale zeigt von der Bande zur Kugel */
  cushionImpulse(b, nx, ny) {
    const { R, m, I, p } = this;
    const vn = b.vx * nx + b.vy * ny;
    if (vn >= 0) return;
    const speedN = -vn;
    const e = Math.min(p.eCushionMax, Math.max(p.eCushionMin, p.eCushionMax - p.eCushionSlope * speedN));
    const Jn = (1 + e) * m * speedN;
    const sinPhi = Math.min(0.9, Math.max(0, (p.cushionHeight - R) / R));
    const cosPhi = Math.sqrt(1 - sinPhi * sinPhi);
    const rx = -R * cosPhi * nx, ry = -R * cosPhi * ny, rz = R * sinPhi;
    const ux = b.vx + (b.wy * rz - b.wz * ry);
    const uy = b.vy + (b.wz * rx - b.wx * rz);
    const uz = b.wx * ry - b.wy * rx;
    const un = ux * nx + uy * ny;
    const tx = ux - un * nx, ty = uy - un * ny, tz = uz;
    const tl = Math.hypot(tx, ty, tz);
    let Px = Jn * nx, Py = Jn * ny, Pz = 0;
    if (tl > 1e-9) {
      const Jt = Math.min(p.muCushion * Jn, (2 / 7) * m * tl);
      Px -= (Jt * tx) / tl; Py -= (Jt * ty) / tl; Pz -= (Jt * tz) / tl;
    }
    b.vx += Px / m;
    b.vy += Py / m;
    b.wx += (ry * Pz - rz * Py) / I;
    b.wy += (rz * Px - rx * Pz) / I;
    b.wz += (rx * Py - ry * Px) / I;

    if (this.log.firstContact !== null) this.log.railAfterContact = true;
    if (b.id !== 0 && !this.log.railBalls.includes(b.id)) this.log.railBalls.push(b.id);
    if (this.recordEvents) this.events.push({ type: 'cushion', v: speedN, id: b.id });
  }

  separateOverlaps() {
    const D = 2 * this.R;
    const balls = this.balls;
    for (let i = 0; i < balls.length; i++) {
      const a = balls[i];
      if (!a.onTable) continue;
      for (let j = i + 1; j < balls.length; j++) {
        const b = balls[j];
        if (!b.onTable) continue;
        const dx = b.x - a.x, dy = b.y - a.y;
        const d2 = dx * dx + dy * dy;
        if (d2 >= D * D) continue;
        const d = Math.sqrt(d2) || 1e-9;
        const push = (D - d) / 2 + 1e-9;
        const nx = d2 > 0 ? dx / d : 1, ny = d2 > 0 ? dy / d : 0;
        a.x -= nx * push; a.y -= ny * push;
        b.x += nx * push; b.y += ny * push;
      }
    }
  }

  checkPocketsAndBounds() {
    const t = this.table;
    const limX = t.Lx + t.W + 0.02, limY = t.Ly + t.W + 0.02;
    for (const b of this.balls) {
      if (!b.onTable) continue;
      for (let k = 0; k < t.pockets.length; k++) {
        const pk = t.pockets[k];
        const dx = b.x - pk.x, dy = b.y - pk.y;
        if (dx * dx + dy * dy < pk.r * pk.r) {
          const v = Math.hypot(b.vx, b.vy);
          this.removeBall(b.id);
          b.pocket = k;
          this.log.pocketed.push({ id: b.id, pocket: k, t: this.time });
          if (this.recordEvents) this.events.push({ type: 'pocket', v, id: b.id });
          break;
        }
      }
      if (b.onTable && (Math.abs(b.x) > limX || Math.abs(b.y) > limY)) {
        this.removeBall(b.id);
        this.log.offTable.push(b.id);
      }
    }
  }

  /** @param {Ball} b @param {number} dt */
  integrateOrientation(b, dt) {
    const w = Math.hypot(b.wx, b.wy, b.wz);
    if (w === 0) return;
    const half = 0.5 * w * dt;
    const s = Math.sin(half) / w;
    const dx = b.wx * s, dy = b.wy * s, dz = b.wz * s, dw = Math.cos(half);
    const [qx, qy, qz, qw] = b.q;
    const nx = dw * qx + dx * qw + dy * qz - dz * qy;
    const ny = dw * qy - dx * qz + dy * qw + dz * qx;
    const nz = dw * qz + dx * qy - dy * qx + dz * qw;
    const nw = dw * qw - dx * qx - dy * qy - dz * qz;
    const l = Math.hypot(nx, ny, nz, nw);
    b.q[0] = nx / l; b.q[1] = ny / l; b.q[2] = nz / l; b.q[3] = nw / l;
  }

  /** Simuliert bis zur Ruhe (oder maxTime). @returns {number} simulierte Zeit */
  runUntilRest(maxTime = 30) {
    const start = this.time;
    while (!this.isAtRest() && this.time - start < maxTime) this.step();
    return this.time - start;
  }

  /**
   * Prüft, ob die Spielkugel an (x, y) platziert werden darf.
   * @param {number} x @param {number} y @param {boolean} kitchenOnly  nur hinter der Kopflinie
   */
  isValidCuePlacement(x, y, kitchenOnly) {
    const t = this.table, R = this.R;
    if (Math.abs(x) > t.Lx - R || Math.abs(y) > t.Ly - R) return false;
    if (kitchenOnly && x > t.headStringX) return false;
    for (const b of this.balls) {
      if (b.id === 0 || !b.onTable) continue;
      if ((b.x - x) ** 2 + (b.y - y) ** 2 < (2 * R + 0.0005) ** 2) return false;
    }
    return true;
  }

  /** Freie Position nahe (x, y) entlang der Längsachse (zum Wiederaufsetzen). */
  findFreeSpot(x, y, ignoreId = -1) {
    const R = this.R, t = this.table;
    const free = (px, py) => this.balls.every((b) => b.id === ignoreId || !b.onTable || (b.x - px) ** 2 + (b.y - py) ** 2 >= (2 * R + 0.001) ** 2);
    for (let k = 0; k < 400; k++) {
      const off = (k >> 1) * 0.004 * (k % 2 === 0 ? 1 : -1);
      const px = x + off;
      if (Math.abs(px) < t.Lx - R && free(px, y)) return { x: px, y };
    }
    for (let k = 0; k < 200; k++) {
      const py = y + ((k >> 1) * 0.006) * (k % 2 === 0 ? 1 : -1);
      if (Math.abs(py) < t.Ly - R && free(x, py)) return { x, y: py };
    }
    return { x, y };
  }

  snapshot() {
    return {
      time: this.time,
      balls: this.balls.map((b) => ({ ...b, q: [...b.q] })),
      log: JSON.parse(JSON.stringify(this.log)),
    };
  }

  /** @param {ReturnType<Simulation['snapshot']>} snap */
  restore(snap) {
    this.time = snap.time;
    snap.balls.forEach((s, i) => Object.assign(this.balls[i], { ...s, q: [...s.q] }));
    this.log = JSON.parse(JSON.stringify(snap.log));
    this.events.length = 0;
  }

  clone() {
    const c = new Simulation(this.table, this.p);
    c.restore(this.snapshot());
    c.recordEvents = false;
    return c;
  }
}
