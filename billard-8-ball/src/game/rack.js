// @ts-check
// Aufbau des 8-Ball-Racks: Spitze auf dem Fußpunkt, 8 in der Mitte der dritten Reihe,
// hintere Ecken eine Volle und eine Halbe.

/**
 * @param {import('../physics/simulation.js').Simulation} sim
 * @param {() => number} rng
 */
export function setupRack(sim, rng) {
  const R = sim.R;
  const t = sim.table;
  const D = 2 * R + 0.0002;
  const dx = (D * Math.sqrt(3)) / 2;
  const shuffle = (arr) => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };
  const solids = shuffle([2, 3, 4, 5, 6, 7]);
  const stripes = shuffle([9, 10, 11, 12, 13, 14, 15]);
  const cornerSolid = solids.pop();
  const cornerStripe = stripes.pop();
  const rest = shuffle([...solids, ...stripes]);
  const solidLeft = rng() < 0.5;

  /** @type {Record<string, number>} */
  const slots = { '0,0': 1, '2,1': 8, '4,0': solidLeft ? cornerSolid : cornerStripe, '4,4': solidLeft ? cornerStripe : cornerSolid };
  for (let k = 0; k < 5; k++) {
    for (let j = 0; j <= k; j++) {
      const key = `${k},${j}`;
      const id = slots[key] ?? rest.pop();
      const jitter = () => (rng() - 0.5) * 0.00008;
      sim.placeBall(id, t.footSpot.x + k * dx + jitter(), (j - k / 2) * D + jitter());
    }
  }
  sim.placeBall(0, t.headSpot.x, 0);
  for (const b of sim.balls) {
    // zufällige Orientierung, damit die Nummern unterschiedlich liegen
    const u1 = rng(), u2 = rng(), u3 = rng();
    const s1 = Math.sqrt(1 - u1), s2 = Math.sqrt(u1);
    b.q = [s1 * Math.sin(2 * Math.PI * u2), s1 * Math.cos(2 * Math.PI * u2), s2 * Math.sin(2 * Math.PI * u3), s2 * Math.cos(2 * Math.PI * u3)];
  }
  sim.resetLog();
}
