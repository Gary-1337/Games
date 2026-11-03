// @ts-check
// Physikalische Konstanten in SI-Einheiten (Meter, Sekunden, Kilogramm).

export const BALL_RADIUS = 0.028575; // 57,15 mm Durchmesser (Pool-Standard)
export const BALL_MASS = 0.17; // kg
export const GRAVITY = 9.81; // m/s²
export const PHYSICS_HZ = 600; // Fixed-Timestep der Simulation
export const DT = 1 / PHYSICS_HZ;
export const BALL_COUNT = 16;

/**
 * @typedef {Object} PhysicsParams
 * @property {number} muSlide      Gleitreibung Kugel–Filz (Sliding)
 * @property {number} muRoll       Rollwiderstand Kugel–Filz (Rolling)
 * @property {number} muSpin       Bohrreibung (Abbau des Side-Spins um die Hochachse)
 * @property {number} eBall        Restitution Kugel–Kugel
 * @property {number} muBall       Reibung Kugel–Kugel, Grundwert bei hoher Gleitgeschwindigkeit
 * @property {number} muBallB      zusätzlicher Reibungsanteil bei langsamer Gleitgeschwindigkeit
 * @property {number} muBallC      Abklingrate (s/m) des Zusatzanteils: µ = a + b·e^(-c·v)
 * @property {number} eCushionMax  Restitution Bande bei langsamem Aufprall
 * @property {number} eCushionMin  Untergrenze Restitution Bande
 * @property {number} eCushionSlope Abnahme der Restitution je m/s Normalgeschwindigkeit
 * @property {number} muCushion    Reibung Kugel–Bande
 * @property {number} cushionHeight Höhe der Bandennase über dem Tisch (m)
 * @property {number} cueMass      Masse des Queues (kg)
 * @property {number} minCueSpeed  Queue-Geschwindigkeit bei 0 % Kraft (m/s)
 * @property {number} maxCueSpeed  Queue-Geschwindigkeit bei 100 % Kraft (m/s)
 * @property {number} squirt       Squirt-Winkel (rad) bei maximalem seitlichem Trefferpunkt
 * @property {number} maxTip       Sicherheitsradius des Trefferpunkts als Anteil von R
 */

/** @type {Readonly<PhysicsParams>} */
export const DEFAULT_PARAMS = Object.freeze({
  muSlide: 0.2,
  muRoll: 0.01,
  muSpin: 0.012,
  eBall: 0.95,
  muBall: 0.00995,
  muBallB: 0.108,
  muBallC: 1.088,
  eCushionMax: 0.9,
  eCushionMin: 0.62,
  eCushionSlope: 0.045,
  muCushion: 0.2,
  cushionHeight: 0.0363,
  cueMass: 0.54,
  minCueSpeed: 0.12,
  maxCueSpeed: 6.0,
  squirt: 0.035,
  maxTip: 0.5,
});
