// @ts-check
// CPU-Gegner. Leicht/Mittel arbeiten rein geometrisch (Geisterkugel, freie Korridore, Schnittwinkel).
// Schwer simuliert zusätzlich eine stark begrenzte Anzahl Kandidaten-Stöße (≤ 24), um Positionsspiel,
// Spin und Safeties zu bewerten. Die Ausführung ist in allen Stufen mit Streuung versehen.

import { castCueBall, corridorClear } from '../physics/raycast.js?v=1.0.2';
import { speedToPower, shotToStrike } from '../physics/cue.js?v=1.0.2';
import { gaussian } from '../physics/rng.js?v=1.0.2';
import { legalTargets, evaluateShot, applyOutcome } from './rules.js?v=1.0.2';

export const CPU_LEVELS = {
  easy: { label: 'Leicht', aimSigma: 0.02, powerSigma: 0.16, pickTop: 3, blunder: 0.12, spin: false, sims: 0 },
  medium: { label: 'Mittel', aimSigma: 0.0075, powerSigma: 0.07, pickTop: 1, blunder: 0.03, spin: true, sims: 0 },
  hard: { label: 'Schwer', aimSigma: 0.0026, powerSigma: 0.035, pickTop: 1, blunder: 0, spin: true, sims: 24 },
};

/**
 * @typedef {{id:number, pocket:number, angle:number, score:number, dCG:number, dTP:number, cosCut:number}} Candidate
 */

/** @param {import('../physics/simulation.js').Simulation} sim */
export function objectBallsOnTable(sim) {
  return sim.balls.filter((b) => b.onTable && b.id !== 0).map((b) => b.id);
}

/**
 * Alle direkten Einlochversuche für die angegebenen Zielkugeln, bewertet nach Schwierigkeit.
 * @param {import('../physics/simulation.js').Simulation} sim
 * @param {number[]} targets
 * @returns {Candidate[]}
 */
export function findCandidates(sim, targets) {
  const R = sim.R, t = sim.table;
  const cue = sim.balls[0];
  /** @type {Candidate[]} */
  const out = [];
  for (const id of targets) {
    const T = sim.balls[id];
    if (!T.onTable) continue;
    for (let k = 0; k < t.pockets.length; k++) {
      const P = t.pockets[k];
      let dx = P.aimX - T.x, dy = P.aimY - T.y;
      const dTP = Math.hypot(dx, dy);
      dx /= dTP; dy /= dTP;
      const approach = dx * P.axisX + dy * P.axisY;
      if (approach < (P.kind === 'side' ? 0.6 : 0.45)) continue;
      const gx = T.x - dx * 2 * R, gy = T.y - dy * 2 * R;
      if (Math.abs(gx) > t.Lx - R + 0.002 || Math.abs(gy) > t.Ly - R + 0.002) continue;
      let cx = gx - cue.x, cy = gy - cue.y;
      const dCG = Math.hypot(cx, cy);
      if (dCG < 1e-4) continue;
      cx /= dCG; cy /= dCG;
      const cosCut = cx * dx + cy * dy;
      if (cosCut < 0.22) continue;
      const hit = castCueBall(sim, cue.x, cue.y, cx, cy, 0);
      if (!hit || hit.type !== 'ball' || hit.id !== id) continue;
      if (!corridorClear(sim, T.x, T.y, P.aimX, P.aimY, 2 * R - 0.002, [0, id])) continue;
      const score = (cosCut * cosCut * (0.55 + 0.45 * approach)) / (1 + 0.45 * dCG + 0.8 * dTP);
      out.push({ id, pocket: k, angle: Math.atan2(cy, cx), score, dCG, dTP, cosCut });
    }
  }
  out.sort((a, b) => b.score - a.score);
  return out;
}

/** Grobe Kraftschätzung aus Distanzen und Schnittwinkel. */
export function estimatePower(c, params) {
  const g = 9.81, mr = params.muRoll;
  const vObj = Math.sqrt(2 * mr * g * (c.dTP + 0.3)) * 1.2 + 0.2;
  const vObj0 = vObj * 1.4;
  const vContact = vObj0 / (Math.max(0.3, c.cosCut) * 0.975);
  const vCue = Math.sqrt(vContact * vContact + 2 * mr * g * c.dCG) * (c.dCG > 0.4 ? 1.3 : 1.1);
  return Math.min(0.92, Math.max(0.1, speedToPower(vCue / 1.5, params)));
}

/** Bester geometrischer Score für einen Spieler (Positionsbewertung). */
function bestScoreFor(sim, match, player) {
  const targets = legalTargets(match, player, objectBallsOnTable(sim));
  const c = findCandidates(sim, targets);
  return c.length ? c[0].score : 0;
}

function cloneMatch(match) {
  return JSON.parse(JSON.stringify(match));
}

/** @returns {{sim: import('../physics/simulation.js').Simulation, out: import('./rules.js').ShotOutcome}} */
function simulateShot(sim, match, shot) {
  const s = sim.clone();
  s.resetLog();
  s.strike(shotToStrike(shot, s.p, s.R));
  s.runUntilRest(14);
  const out = evaluateShot(match, s.log, objectBallsOnTable(sim));
  return { sim: s, out };
}

function scoreOutcome(res, match) {
  const me = match.current;
  const { out } = res;
  if (out.winner === me) return 1000;
  if (out.winner !== null) return -1000;
  if (out.foul) return -300;
  const m2 = cloneMatch(match);
  applyOutcome(m2, out);
  if (out.continueTurn) return 100 + 120 * bestScoreFor(res.sim, m2, me);
  return -150 * bestScoreFor(res.sim, m2, m2.current);
}

/**
 * Platzierung bei Ball in Hand.
 * @param {import('../physics/simulation.js').Simulation} sim
 * @param {import('./rules.js').Match} match
 * @param {boolean} kitchen
 */
export function choosePlacement(sim, match, kitchen, rng) {
  const t = sim.table, R = sim.R;
  const test = sim.clone();
  const targets = legalTargets(match, match.current, objectBallsOnTable(sim));
  let best = null, bestScore = -1;
  const tryPos = (x, y) => {
    if (!test.isValidCuePlacement(x, y, kitchen)) return;
    test.placeBall(0, x, y);
    const c = findCandidates(test, targets);
    const s = c.length ? c[0].score : 0;
    if (s > bestScore) { bestScore = s; best = { x, y }; }
  };
  if (!kitchen) {
    for (const id of targets) {
      const T = sim.balls[id];
      for (const P of t.pockets) {
        let dx = P.aimX - T.x, dy = P.aimY - T.y;
        const l = Math.hypot(dx, dy); dx /= l; dy /= l;
        for (const dist of [0.2, 0.35]) {
          for (const off of [0, 0.3, -0.3]) {
            const c = Math.cos(off), s = Math.sin(off);
            const ux = dx * c - dy * s, uy = dx * s + dy * c;
            tryPos(T.x - dx * 2 * R - ux * dist, T.y - dy * 2 * R - uy * dist);
          }
        }
      }
    }
  }
  if (!best || kitchen) {
    for (let i = 0; i < 5; i++) {
      for (let j = 0; j < 7; j++) {
        const x = kitchen ? -t.Lx + 0.12 + i * ((t.Lx / 2 - 0.14) / 4) : -t.Lx + 0.15 + i * (t.Lx * 2 - 0.3) / 4;
        tryPos(x, -t.Ly + 0.1 + j * ((t.Ly * 2 - 0.2) / 6));
      }
    }
  }
  if (!best) {
    const p = sim.findFreeSpot(t.headSpot.x, (rng() - 0.5) * 0.2, 0);
    best = { x: p.x, y: p.y };
  }
  return best;
}

/**
 * Plant einen Stoß. Generator, damit die Berechnung über mehrere Frames verteilt werden kann.
 * @param {import('../physics/simulation.js').Simulation} sim
 * @param {import('./rules.js').Match} match
 * @param {keyof typeof CPU_LEVELS} level
 * @param {() => number} rng
 * @returns {Generator<void, {place:{x:number,y:number}|null, shot:import('../physics/cue.js').Shot}>}
 */
export function* planCpuShot(sim, match, level, rng) {
  const L = CPU_LEVELS[level] || CPU_LEVELS.medium;
  const work = sim.clone();
  let place = null;
  if (match.ballInHand !== 'none') {
    if (match.isBreak) {
      place = { x: sim.table.headSpot.x, y: (rng() - 0.5) * 0.3 };
    } else {
      place = choosePlacement(work, match, match.ballInHand === 'kitchen', rng);
    }
    work.placeBall(0, place.x, place.y);
    yield;
  }
  const cue = work.balls[0];

  /** @type {import('../physics/cue.js').Shot} */
  let shot;
  if (match.isBreak) {
    const apex = work.balls.reduce((a, b) => (b.onTable && b.id !== 0 && b.x < a.x ? b : a), { x: Infinity, y: 0 });
    shot = { angle: Math.atan2(apex.y - cue.y, apex.x - cue.x), power: level === 'easy' ? 0.82 : 0.95, spinX: 0, spinY: -0.1, elevation: 0 };
  } else {
    const targets = legalTargets(match, match.current, objectBallsOnTable(work));
    const cands = findCandidates(work, targets);
    yield;
    if (L.sims > 0) {
      shot = yield* planHard(work, match, cands, targets, L, rng);
    } else if (cands.length) {
      const pick = cands[Math.min(cands.length - 1, Math.floor(rng() * L.pickTop))];
      shot = basicShot(pick, work, L.spin);
    } else {
      shot = fallbackShot(work, targets, rng);
    }
  }

  // Ausführungsfehler
  shot = { ...shot };
  shot.angle += gaussian(rng) * L.aimSigma;
  shot.power = Math.min(1, Math.max(0.05, shot.power * (1 + gaussian(rng) * L.powerSigma)));
  if (rng() < L.blunder) {
    shot.angle += gaussian(rng) * 0.05;
    shot.power = Math.min(1, shot.power * (0.6 + 0.8 * rng()));
  }
  return { place, shot };
}

function basicShot(c, sim, useSpin) {
  let spinY = 0;
  if (useSpin) {
    // gerade Stöße mit Rückläufer (kein Nachlaufen in die Tasche), sonst leichter Nachlauf
    spinY = c.cosCut > 0.96 ? (c.dCG > 0.9 ? -0.5 : -0.35) : 0.18;
  }
  return { angle: c.angle, power: estimatePower(c, sim.p), spinX: 0, spinY, elevation: 0 };
}

/** Kein direkter Stoß: Kugel der eigenen Gruppe möglichst voll anspielen. */
function fallbackShot(sim, targets, rng) {
  const cue = sim.balls[0];
  let best = null, bestD = Infinity;
  for (const id of targets) {
    const b = sim.balls[id];
    const dx = b.x - cue.x, dy = b.y - cue.y, d = Math.hypot(dx, dy);
    const hit = castCueBall(sim, cue.x, cue.y, dx / d, dy / d, 0);
    const clear = hit && hit.type === 'ball' && hit.id === id;
    const cost = d + (clear ? 0 : 10);
    if (cost < bestD) { bestD = cost; best = { angle: Math.atan2(dy, dx), d }; }
  }
  if (!best) return { angle: rng() * Math.PI * 2, power: 0.4, spinX: 0, spinY: 0, elevation: 0 };
  return { angle: best.angle, power: Math.min(0.6, 0.3 + best.d * 0.12), spinX: 0, spinY: 0, elevation: 0 };
}

/** Schwer: begrenzte Vorausberechnung weniger Kandidaten inkl. Safety und Kick. */
function* planHard(sim, match, cands, targets, L, rng) {
  let budget = L.sims;
  let best = null, bestScore = -Infinity;
  const consider = (shot) => {
    if (budget-- <= 0) return;
    const res = simulateShot(sim, match, shot);
    const s = scoreOutcome(res, match);
    if (s > bestScore) { bestScore = s; best = shot; }
  };
  const spins = [{ x: 0, y: 0 }, { x: 0, y: 0.35 }, { x: 0, y: -0.45 }];
  for (const c of cands.slice(0, 4)) {
    const p = estimatePower(c, sim.p);
    for (const sp of spins) {
      consider({ angle: c.angle, power: p, spinX: sp.x, spinY: sp.y, elevation: 0 });
      yield;
    }
  }
  if (best && bestScore > 100) {
    for (const k of [1.25, 0.8]) {
      consider({ ...best, power: Math.min(1, best.power * k) });
      yield;
    }
    for (const sx of [0.35, -0.35]) {
      consider({ ...best, spinX: sx });
      yield;
    }
  }
  if (bestScore < 100) {
    // Safety: eigene Kugel dünn/voll und sanft anspielen, Gegner schlecht hinterlassen
    const cue = sim.balls[0];
    for (const id of targets.slice(0, 4)) {
      const b = sim.balls[id];
      const base = Math.atan2(b.y - cue.y, b.x - cue.x);
      const d = Math.hypot(b.x - cue.x, b.y - cue.y);
      for (const off of [0, 0.6 * Math.asin(Math.min(1, (2 * sim.R) / d))]) {
        consider({ angle: base + off, power: Math.min(0.5, 0.22 + d * 0.08), spinX: 0, spinY: -0.2, elevation: 0 });
        yield;
      }
    }
    // Kick über eine Bande (Spiegelung der Zielkugel)
    if (bestScore <= -300) {
      const t = sim.table, R = sim.R;
      for (const id of targets.slice(0, 2)) {
        const b = sim.balls[id];
        const mirrors = [[b.x, 2 * (t.Ly - R) - b.y], [b.x, -2 * (t.Ly - R) - b.y], [2 * (t.Lx - R) - b.x, b.y], [-2 * (t.Lx - R) - b.x, b.y]];
        for (const [mx, my] of mirrors) {
          consider({ angle: Math.atan2(my - cue.y, mx - cue.x), power: 0.5, spinX: 0, spinY: 0, elevation: 0 });
          yield;
        }
      }
    }
  }
  if (!best) return fallbackShot(sim, targets, rng);
  return best;
}
