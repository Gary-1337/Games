// @ts-check
// Tischgeometrie: Spielfläche, Banden (als Liniensegmente) und Taschen.
// Koordinaten: x entlang der langen Seite, y entlang der kurzen Seite, Ursprung in der Tischmitte.

/**
 * @typedef {{ax:number, ay:number, bx:number, by:number}} Segment
 * @typedef {{x:number, y:number, r:number, kind:'corner'|'side', axisX:number, axisY:number, aimX:number, aimY:number}} Pocket
 * @typedef {ReturnType<typeof createTable>} Table
 */

export function createTable() {
  const Lx = 1.27; // halbe Länge der Spielfläche (9-ft-Tisch: 2,54 m)
  const Ly = 0.635; // halbe Breite (1,27 m) → 2:1
  const W = 0.05; // Bandenbreite (Nase bis Holzrahmen)
  const cornerGap = 0.082; // Ecktaschen-Maul ≈ 116 mm (cornerGap·√2)
  const sideGap = 0.0635; // Mitteltaschen-Maul 127 mm
  const sideTaper = 0.01; // Mitteltaschen verengen sich leicht nach innen
  const holeR = 0.062; // Fangradius der Taschen (Ballmittelpunkt)
  const s2 = Math.SQRT1_2;

  /** Banden als Polylinien (Backenende → Nase → Nase → Backenende), zur Spielfläche zeigend. */
  const cushions = [];
  for (const sy of [1, -1]) {
    for (const sx of [-1, 1]) {
      cushions.push([
        [sx * (Lx - cornerGap + W), sy * (Ly + W)],
        [sx * (Lx - cornerGap), sy * Ly],
        [sx * sideGap, sy * Ly],
        [sx * (sideGap - sideTaper), sy * (Ly + W)],
      ]);
    }
  }
  for (const sx of [-1, 1]) {
    cushions.push([
      [sx * (Lx + W), Ly - cornerGap + W],
      [sx * Lx, Ly - cornerGap],
      [sx * Lx, -(Ly - cornerGap)],
      [sx * (Lx + W), -(Ly - cornerGap + W)],
    ]);
  }

  /** @type {Segment[]} */
  const segments = [];
  for (const c of cushions) {
    for (let i = 0; i < c.length - 1; i++) {
      segments.push({ ax: c[i][0], ay: c[i][1], bx: c[i + 1][0], by: c[i + 1][1] });
    }
  }

  const co = 0.012 * s2;
  /** @param {number} sx @param {number} sy @returns {Pocket} */
  const corner = (sx, sy) => ({
    x: sx * (Lx + co), y: sy * (Ly + co), r: holeR, kind: 'corner',
    axisX: sx * s2, axisY: sy * s2,
    aimX: sx * (Lx - 0.012), aimY: sy * (Ly - 0.012),
  });
  /** @param {number} sy @returns {Pocket} */
  const side = (sy) => ({
    x: 0, y: sy * (Ly + 0.04), r: holeR, kind: 'side',
    axisX: 0, axisY: sy,
    aimX: 0, aimY: sy * (Ly + 0.004),
  });
  /** Index: 0 oben links, 1 oben Mitte, 2 oben rechts, 3 unten links, 4 unten Mitte, 5 unten rechts */
  const pockets = [corner(-1, 1), side(1), corner(1, 1), corner(-1, -1), side(-1), corner(1, -1)];

  return {
    Lx, Ly, W, cornerGap, sideGap, holeR,
    cushions, segments, pockets,
    headStringX: -Lx / 2,
    headSpot: { x: -Lx / 2, y: 0 },
    footSpot: { x: Lx / 2, y: 0 },
  };
}
