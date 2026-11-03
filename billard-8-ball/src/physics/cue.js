// @ts-check
// Übersetzt Spieler-Eingaben (Richtung, Kraft 0..1, Trefferpunkt im Einheitskreis, Queue-Winkel)
// in physikalische Stoßparameter.

/**
 * @typedef {Object} Shot
 * @property {number} angle      Stoßrichtung in rad (Tischebene)
 * @property {number} power      0..1
 * @property {number} spinX      -1 (links) .. 1 (rechts), Einheitskreis = Sicherheitsradius
 * @property {number} spinY      -1 (Draw/unten) .. 1 (Follow/oben)
 * @property {number} elevation  Queue-Winkel in Grad (0 = waagrecht, >0 = Massé)
 */

/** Kraft-Kurve: feine Dosierung bei kleinen Stößen. */
export function powerToSpeed(power, params) {
  const p = Math.min(1, Math.max(0, power));
  return params.minCueSpeed + (params.maxCueSpeed - params.minCueSpeed) * Math.pow(p, 1.6);
}

export function speedToPower(speed, params) {
  const t = (speed - params.minCueSpeed) / (params.maxCueSpeed - params.minCueSpeed);
  return Math.min(1, Math.max(0, Math.pow(Math.max(0, t), 1 / 1.6)));
}

/** Begrenzt den Trefferpunkt auf den Einheitskreis. */
export function clampSpin(x, y) {
  const r = Math.hypot(x, y);
  return r > 1 ? { x: x / r, y: y / r } : { x, y };
}

/**
 * @param {Shot} shot
 * @param {import('./constants.js').PhysicsParams} params
 * @param {number} R Kugelradius
 * @param {{miscue?:boolean, rng?:() => number}} [opts]
 */
export function shotToStrike(shot, params, R, opts = {}) {
  const sp = clampSpin(shot.spinX, shot.spinY);
  let a = sp.x * params.maxTip * R;
  let b = sp.y * params.maxTip * R;
  let speed = powerToSpeed(shot.power, params);
  let angle = shot.angle;
  let miscue = false;
  if (opts.miscue && opts.rng) {
    const off = Math.hypot(sp.x, sp.y);
    if (off > 0.8 && shot.power > 0.55) {
      const chance = ((off - 0.8) / 0.2) * ((shot.power - 0.55) / 0.45) * 0.85;
      if (opts.rng() < chance) {
        miscue = true;
        speed *= 0.3 + 0.2 * opts.rng();
        angle += (opts.rng() - 0.5) * 0.15;
        a *= 0.3; b *= 0.3;
      }
    }
  }
  const elevation = (Math.min(80, Math.max(0, shot.elevation)) * Math.PI) / 180;
  return { angle, speed, a, b, elevation, miscue };
}
