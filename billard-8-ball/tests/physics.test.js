import { test, assert, approx, equal } from './harness.js';
import { Simulation } from '../src/physics/simulation.js';
import { shotToStrike } from '../src/physics/cue.js';
import { setupRack } from '../src/game/rack.js';
import { createRng } from '../src/physics/rng.js';

/** Simulation mit nur den angegebenen Kugeln {id: [x, y]}. */
function simWith(positions) {
  const sim = new Simulation();
  for (const b of sim.balls) sim.removeBall(b.id);
  for (const [id, [x, y]] of Object.entries(positions)) sim.placeBall(Number(id), x, y);
  sim.resetLog();
  return sim;
}

function shoot(sim, angle, power, spinX = 0, spinY = 0, elevation = 0) {
  sim.strike(shotToStrike({ angle, power, spinX, spinY, elevation }, sim.p, sim.R));
}

function allZero(b) {
  return b.vx === 0 && b.vy === 0 && b.wx === 0 && b.wy === 0 && b.wz === 0;
}

test('Gerader Stoß ohne Spin: Sliding → Rolling bei 5/7 v0, bleibt auf der Linie, endet exakt in Ruhe', () => {
  const sim = simWith({ 0: [-1, 0] });
  shoot(sim, 0, 0.1);
  const cue = sim.balls[0];
  const v0 = cue.vx;
  assert(v0 > 0, 'Kugel bewegt sich');
  assert(cue.wy === 0 && cue.wx === 0 && cue.wz === 0, 'Mittiger Stoß ohne Spin');
  let rollSpeed = null;
  for (let i = 0; i < 20000 && !sim.isAtRest(); i++) {
    sim.step();
    if (rollSpeed === null && Math.abs(cue.vx - sim.R * cue.wy) < 1e-9 && cue.vx > 0) rollSpeed = cue.vx;
    assert(cue.y === 0, 'keine seitliche Abweichung');
  }
  assert(rollSpeed !== null, 'Rollbedingung erreicht');
  approx(rollSpeed / v0, 5 / 7, 0.01, 'Rollgeschwindigkeit');
  assert(sim.isAtRest(), 'Ruhe erreicht');
  assert(allZero(cue), 'alle Geschwindigkeiten exakt null');
  assert(cue.x > -0.6, 'Kugel ist gerollt');
});

/** Stößt voll auf Kugel 1 und nimmt den Objektball nach dem Kontakt vom Tisch,
 *  damit nur das Verhalten der Spielkugel gemessen wird. */
function fullHitThenCueOnly(cueX, power, spinY) {
  const sim = simWith({ 0: [cueX, 0], 1: [0, 0] });
  shoot(sim, 0, power, 0, spinY);
  let vBefore = 0;
  for (let i = 0; i < 20000 && sim.log.firstContact === null; i++) { vBefore = sim.balls[0].vx; sim.step(); }
  equal(sim.log.firstContact, 1, 'erster Kontakt');
  const objV = sim.balls[1].vx;
  const cueVAfter = sim.balls[0].vx;
  sim.removeBall(1);
  sim.runUntilRest();
  return { sim, vBefore, cueVAfter, objV, contactX: -2 * sim.R };
}

test('Draw: Spielkugel läuft nach vollem Objektball-Kontakt zurück', () => {
  const { sim, objV, contactX } = fullHitThenCueOnly(-0.5, 0.5, -0.9);
  assert(objV > 0.5, 'Objektball läuft vorwärts');
  assert(sim.balls[0].x < contactX - 0.3, `Spielkugel zurückgezogen (x=${sim.balls[0].x.toFixed(3)})`);
  assert(allZero(sim.balls[0]), 'Ruhe');
});

test('Follow: Spielkugel läuft nach vollem Kontakt nach', () => {
  const { sim, contactX } = fullHitThenCueOnly(-0.5, 0.3, 0.9);
  assert(sim.balls[0].x > contactX + 0.2, `Spielkugel folgt (x=${sim.balls[0].x.toFixed(3)})`);
});

test('Stopp-Stoß (Stun): Spielkugel stoppt am Kontakt', () => {
  const { sim, vBefore, cueVAfter, contactX } = fullHitThenCueOnly(-0.25, 0.5, 0);
  assert(Math.abs(cueVAfter) < 0.05 * vBefore, `fast keine Restgeschwindigkeit (${cueVAfter.toFixed(3)})`);
  assert(Math.abs(sim.balls[0].x - contactX) < 0.12, `Spielkugel nahe Kontakt (x=${sim.balls[0].x.toFixed(3)})`);
});

test('Side Spin verändert den Abprallwinkel an der Bande', () => {
  const vxAfter = (spinX) => {
    const sim = simWith({ 0: [0.4, 0] });
    shoot(sim, Math.PI / 2, 0.25, spinX, 0);
    for (let i = 0; i < 6000; i++) {
      sim.step();
      if (sim.events.some((e) => e.type === 'cushion')) break;
    }
    assert(sim.events.some((e) => e.type === 'cushion'), 'Bande getroffen');
    assert(sim.balls[0].vy < 0, 'prallt zurück');
    return sim.balls[0].vx;
  };
  const center = vxAfter(0), right = vxAfter(0.8), left = vxAfter(-0.8);
  assert(Math.abs(center) < 1e-9, `mittig: kein seitlicher Abprall (${center})`);
  assert(right > 0.05, `rechter Effet → nach rechts (${right.toFixed(3)})`);
  assert(left < -0.05, `linker Effet → nach links (${left.toFixed(3)})`);
  approx(right, -left, 1e-9, 'symmetrisch');
});

test('Kugel-Kollision: Impulserhaltung und Restitution beim zentralen Stoß', () => {
  const sim = simWith({ 0: [0, 0], 1: [2 * 0.028575, 0] });
  const a = sim.balls[0], b = sim.balls[1];
  a.vx = 2;
  sim.collideBalls(a, b);
  approx(a.vx + b.vx, 2, 1e-12, 'Impuls');
  approx(b.vx - a.vx, 2 * sim.p.eBall, 1e-12, 'Restitution');
  approx(a.vy, 0, 1e-12, 'keine Querbewegung');
});

test('Kugel-Kollision: Schnitt 30° → Objektball entlang der Zentrallinie, ~90°-Regel', () => {
  const R = 0.028575;
  const n = [Math.cos(Math.PI / 6), Math.sin(Math.PI / 6)];
  const sim = simWith({ 0: [0, 0], 1: [n[0] * 2 * R, n[1] * 2 * R] });
  const a = sim.balls[0], b = sim.balls[1];
  a.vx = 2; // Sliding ohne Spin (Stun)
  sim.collideBalls(a, b);
  const objAngle = Math.atan2(b.vy, b.vx);
  const throwDeg = ((Math.PI / 6 - objAngle) * 180) / Math.PI;
  assert(throwDeg > 0.5 && throwDeg < 3.5, `Cut-Induced Throw ${throwDeg.toFixed(2)}° (realistisch 1–3,5°)`);
  const sep = Math.acos((a.vx * b.vx + a.vy * b.vy) / (Math.hypot(a.vx, a.vy) * Math.hypot(b.vx, b.vy)));
  // e < 1 und Throw → etwas unter 90°
  approx(sep * 180 / Math.PI, 85, 5, 'Trennwinkel');
});

test('Break mit 16 Kugeln: stabil, keine Überlappungen, alle Kugeln innerhalb des Tisches, exakte Ruhe', () => {
  const sim = new Simulation();
  setupRack(sim, createRng(7));
  shoot(sim, 0, 1.0);
  sim.runUntilRest(40);
  assert(sim.isAtRest(), 'Ruhe nach dem Break');
  const on = sim.balls.filter((b) => b.onTable);
  for (let i = 0; i < on.length; i++) {
    const b = on[i];
    assert(Math.abs(b.x) <= sim.table.Lx + 0.03 && Math.abs(b.y) <= sim.table.Ly + 0.03, `Kugel ${b.id} auf dem Tisch`);
    assert(allZero(b), `Kugel ${b.id} exakt in Ruhe`);
    for (let j = i + 1; j < on.length; j++) {
      const d = Math.hypot(on[j].x - b.x, on[j].y - b.y);
      assert(d >= 2 * sim.R - 1e-6, `keine Überlappung ${b.id}/${on[j].id}`);
    }
  }
  equal(sim.log.offTable.length, 0, 'nichts vom Tisch');
  assert(sim.log.railBalls.length >= 4 || sim.log.pocketed.length > 0, 'legaler Break');
});

test('Determinismus: gleicher Stoß → identisches Ergebnis', () => {
  const run = () => {
    const sim = new Simulation();
    setupRack(sim, createRng(3));
    shoot(sim, 0.01, 0.9, 0.2, -0.3);
    sim.runUntilRest(40);
    return sim.balls.map((b) => `${b.x},${b.y},${b.onTable}`).join('|');
  };
  equal(run(), run(), 'Endzustand');
});

test('Taschenerkennung: Ecktasche, Mitteltasche und Vorbeirollen an der Mitteltasche', () => {
  const t = new Simulation().table;
  const corner = simWith({ 0: [t.Lx - 0.4, t.Ly - 0.4] });
  shoot(corner, Math.PI / 4, 0.25);
  corner.runUntilRest();
  equal(corner.log.pocketed.length, 1, 'Ecktasche versenkt');
  equal(corner.log.pocketed[0].pocket, 2, 'Taschenindex oben rechts');

  const side = simWith({ 0: [0, 0] });
  shoot(side, -Math.PI / 2, 0.2);
  side.runUntilRest();
  equal(side.log.pocketed[0]?.pocket, 4, 'Mitteltasche unten');

  const rail = simWith({ 0: [-0.8, t.Ly - 0.028575 - 0.002] });
  shoot(rail, 0, 0.12);
  for (let i = 0; i < 20000 && rail.balls[0].onTable && rail.balls[0].x < 0.3 && !rail.isAtRest(); i++) rail.step();
  assert(rail.balls[0].onTable, 'entlang der Bande nicht in die Mitteltasche gefallen');
});

test('Massé: erhöhter Queue mit seitlichem Trefferpunkt krümmt die Bahn', () => {
  const sim = simWith({ 0: [-0.8, 0] });
  shoot(sim, 0, 0.3, 0.8, 0, 60);
  const startVy = sim.balls[0].vy;
  for (let i = 0; i < 300; i++) sim.step();
  assert(Math.abs(sim.balls[0].vy - startVy) > 0.05, 'Querbeschleunigung durch Massé');
});
