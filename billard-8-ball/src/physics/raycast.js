// @ts-check
// Geometrische Abfragen für Zielhilfe und CPU (keine Zeitintegration).

/**
 * Strahl gegen Kreis. @returns {number} Abstand t ≥ 0 oder Infinity
 */
function rayCircle(ox, oy, dx, dy, cx, cy, r) {
  const fx = ox - cx, fy = oy - cy;
  const b = fx * dx + fy * dy;
  const c = fx * fx + fy * fy - r * r;
  if (c < 0) return b < 0 ? 0 : Infinity;
  const disc = b * b - c;
  if (disc < 0) return Infinity;
  const t = -b - Math.sqrt(disc);
  return t >= 0 ? t : Infinity;
}

/**
 * Wirft die Spielkugel (Radius R) entlang (dx, dy) und findet das erste Hindernis.
 * @param {import('./simulation.js').Simulation} sim
 * @returns {{type:'ball', id:number, t:number, gx:number, gy:number} | {type:'cushion', t:number, gx:number, gy:number, nx:number, ny:number} | null}
 */
export function castCueBall(sim, ox, oy, dx, dy, ignoreId = 0) {
  const R = sim.R;
  let best = Infinity, bestId = -1;
  for (const b of sim.balls) {
    if (!b.onTable || b.id === ignoreId) continue;
    const t = rayCircle(ox, oy, dx, dy, b.x, b.y, 2 * R);
    if (t < best) { best = t; bestId = b.id; }
  }
  let cush = Infinity, cnx = 0, cny = 0;
  for (const s of sim.table.segments) {
    const ex = s.bx - s.ax, ey = s.by - s.ay;
    const len = Math.hypot(ex, ey);
    const tx = ex / len, ty = ey / len;
    // beide Normalen der Kapsel testen
    for (const sgn of [1, -1]) {
      const nx = -ty * sgn, ny = tx * sgn;
      const denom = dx * nx + dy * ny;
      if (denom >= 0) continue;
      const px = s.ax + nx * R, py = s.ay + ny * R;
      const t = ((px - ox) * nx + (py - oy) * ny) / denom;
      if (t < 0 || t >= cush) continue;
      const hx = ox + dx * t - px, hy = oy + dy * t - py;
      const u = hx * tx + hy * ty;
      if (u >= 0 && u <= len) { cush = t; cnx = nx; cny = ny; }
    }
    for (const [cx, cy] of [[s.ax, s.ay], [s.bx, s.by]]) {
      const t = rayCircle(ox, oy, dx, dy, cx, cy, R);
      if (t < cush) {
        cush = t;
        const hx = ox + dx * t - cx, hy = oy + dy * t - cy;
        const l = Math.hypot(hx, hy) || 1;
        cnx = hx / l; cny = hy / l;
      }
    }
  }
  if (bestId < 0 && cush === Infinity) return null;
  if (best <= cush) return { type: 'ball', id: bestId, t: best, gx: ox + dx * best, gy: oy + dy * best };
  return { type: 'cushion', t: cush, gx: ox + dx * cush, gy: oy + dy * cush, nx: cnx, ny: cny };
}

/**
 * Ist der Korridor von A nach B frei? (Abstand aller Kugelmittelpunkte zur Strecke ≥ clearance)
 * @param {import('./simulation.js').Simulation} sim
 * @param {number[]} ignore
 */
export function corridorClear(sim, ax, ay, bx, by, clearance, ignore) {
  const ex = bx - ax, ey = by - ay;
  const len2 = ex * ex + ey * ey || 1e-12;
  for (const b of sim.balls) {
    if (!b.onTable || ignore.includes(b.id)) continue;
    let t = ((b.x - ax) * ex + (b.y - ay) * ey) / len2;
    if (t < 0 || t > 1) {
      // Endpunkte nur berücksichtigen, wenn die Kugel direkt am Ziel liegt
      t = t < 0 ? 0 : 1;
    }
    const cx = ax + ex * t, cy = ay + ey * t;
    if ((b.x - cx) ** 2 + (b.y - cy) ** 2 < clearance * clearance) return false;
  }
  return true;
}
