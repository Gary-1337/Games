/* =====================================================================
   6c  AUTOMODELLE
   Jede Karosserie ist ein kleines 3D-Netz: Rumpf und Kabine werden aus
   Querschnitten „geloftet“ (schräge Hauben, geneigte Scheiben), Anbauteile
   sind Quader. Jede Fläche hat eine Normale und wird je nach Fahrtrichtung
   beleuchtet (Sonne von links hinten, Glanzlicht auf Lack, Himmel im Glas).
   Alle Maße lokal: +x = vorne, +y = rechts, z = Höhe.
   ===================================================================== */
const vnorm = v => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const CAR_L = vnorm([-0.5, -0.62, 0.62]);                 // Richtung zur Sonne
const CAR_V = vnorm([0, VIEW.ZS, VIEW.T]);                // Richtung zur Kamera
const CAR_H = vnorm([CAR_L[0] + CAR_V[0], CAR_L[1] + CAR_V[1], CAR_L[2] + CAR_V[2]]);
let CAR_DETAIL = 1;                                       // 0 = ohne Kleinteile (Felgenspeichen, Fugen)
/** Feste Materialien: [r, g, b, Glanz] */
const CAR_MAT = {
  black: [24, 26, 30, 0.25], dark: [48, 51, 58, 0.2], tire: [30, 31, 35, 0.08], rim: [196, 201, 210, 0.7], chrome: [214, 219, 226, 1],
  white: [242, 242, 238, 0.4], carbon: [36, 38, 45, 0.5], seat: [58, 50, 46, 0.05], steel: [128, 134, 144, 0.5], box: [232, 233, 236, 0.15],
  bed: [38, 40, 46, 0.05], amber: [255, 170, 40, 0.3]
};

/** Baut das Netz eines Fahrzeugs aus der Beschreibung d. */
function carBuild(d) {
  const st = d.hull, z0 = d.z0;
  const at = (x, k) => {
    if (x >= st[0][0]) return st[0][k] || 0;
    for (let i = 0; i < st.length - 1; i++) if (x >= st[i + 1][0]) { const u = (st[i][0] - x) / (st[i][0] - st[i + 1][0]); return lerp(st[i][k] || 0, st[i + 1][k] || 0, u); }
    return st[st.length - 1][k] || 0;
  };
  const hw = x => at(x, 1), hz = x => at(x, 2);
  const deckZ = (x, y) => hz(x) + at(x, 3) * (1 - Math.min(1, Math.abs(y) / (hw(x) * 0.84 + 0.01)));
  const M = { pre: [], hull: [], deck: [], gh: [], post: [], wheels: [], front: st[0][0], rear: st[st.length - 1][0], hz, hw, def: d };
  const face = (ph, p, m, C, o) => {
    let nx = 0, ny = 0, nz = 0, cx = 0, cy = 0, cz = 0;
    for (let i = 0; i < p.length; i++) {
      const a = p[i], b = p[(i + 1) % p.length];
      nx += (a[1] - b[1]) * (a[2] + b[2]); ny += (a[2] - b[2]) * (a[0] + b[0]); nz += (a[0] - b[0]) * (a[1] + b[1]);
      cx += a[0]; cy += a[1]; cz += a[2];
    }
    const l = Math.hypot(nx, ny, nz); if (l < 1e-6) return null;
    nx /= l; ny /= l; nz /= l; cx /= p.length; cy /= p.length; cz /= p.length;
    if (C && nx * (cx - C[0]) + ny * (cy - C[1]) + nz * (cz - C[2]) < 0) { nx = -nx; ny = -ny; nz = -nz; }
    const f = Object.assign({ t: 0, p, n: [nx, ny, nz], c: [cx, cy, cz], m }, o);
    (Array.isArray(ph) ? ph : M[ph]).push(f); return f;
  };
  const avg = pts => { const c = [0, 0, 0]; for (const p of pts) { c[0] += p[0]; c[1] += p[1]; c[2] += p[2]; } return c.map(v => v / pts.length); };
  /** Fläche zwischen aufeinanderfolgenden Ringen; matOf(i, j) = Material des Streifens j im Abschnitt i. */
  const loft = (ph, rings, matOf, caps) => {
    for (let i = 0; i < rings.length - 1; i++) {
      const A = rings[i], B = rings[i + 1], C = avg(A.concat(B));
      for (let j = 0; j < A.length - 1; j++) face(ph, [A[j], B[j], B[j + 1], A[j + 1]], matOf(i, j), C);
    }
    const all = avg(rings.flat());
    if (caps && caps[0]) face(ph, rings[0].slice(), caps[0], all);
    if (caps && caps[1]) face(ph, rings[rings.length - 1].slice(), caps[1], all);
  };
  const ring = (s, zl) => { const [x, w, zb, cr = 0] = s, h = zb - zl; return [[x, w * 0.9, zl], [x, w, zl + h * 0.42], [x, w * 0.97, zl + h * 0.84], [x, w * 0.84, zb], [x, 0, zb + cr], [x, -w * 0.84, zb], [x, -w * 0.97, zl + h * 0.84], [x, -w, zl + h * 0.42], [x, -w * 0.9, zl]]; };
  const hullOf = (ph, stations, zl, mat, sill, caps) => loft(ph, stations.map(s => ring(s, zl)), (i, j) => (j === 0 || j === 7) ? sill : mat, caps || [mat, mat]);
  /** Quader; mTop = Material der Oberseite (sonst wie die Seiten). */
  const box = (ph, x0, x1, y0, y1, zl, zh, m, mTop, o) => {
    const C = [(x0 + x1) / 2, (y0 + y1) / 2, (zl + zh) / 2];
    const q = (a, b, c, e, mm) => face(ph, [a, b, c, e], mm, C, o);
    q([x0, y0, zh], [x1, y0, zh], [x1, y1, zh], [x0, y1, zh], mTop || m);
    q([x0, y0, zl], [x1, y0, zl], [x1, y0, zh], [x0, y0, zh], m); q([x0, y1, zl], [x1, y1, zl], [x1, y1, zh], [x0, y1, zh], m);
    q([x0, y0, zl], [x0, y1, zl], [x0, y1, zh], [x0, y0, zh], m); q([x1, y0, zl], [x1, y1, zl], [x1, y1, zh], [x1, y0, zh], m);
  };
  /** Aufkleber/Fläche auf dem Deck (folgt Hauben- und Heckneigung). */
  const deck = (xa, xb, y0, y1, m, lift = 0.07, ph = 'deck') => {
    const xs = [xa]; for (const s of st) if (s[0] < xa - 0.01 && s[0] > xb + 0.01) xs.push(s[0]); xs.push(xb);
    for (let i = 0; i < xs.length - 1; i++) {
      const a = xs[i], b = xs[i + 1];
      face(ph, [[a, y0, deckZ(a, y0) + lift], [a, y1, deckZ(a, y1) + lift], [b, y1, deckZ(b, y1) + lift], [b, y0, deckZ(b, y0) + lift]], m, [(a + b) / 2, 0, -50]);
    }
  };
  const line = (ph, a, b, w, m, n) => M[ph].push({ t: 1, a, b, w, m, n: vnorm(n), c: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2] });
  const ball = (ph, c, r, m, visor) => M[ph].push({ t: 2, c, r, m, n: [0, 0, 1], visor });
  /** Kabine: Frontscheibe xa→xb, Dach xb→xc, Heckscheibe xc→xd. */
  const cabin = g => {
    const { xa, xb, xc, xd, wb, wr, zr, roof = 'paint', ph = 'gh' } = g, wr2 = g.wr2 || wr;
    const zb = g.zb != null ? (() => g.zb) : (x => hz(x) - 0.05), w = x => g.zb != null ? wb : Math.min(wb, hw(x) * 0.86);
    const C = [(xb + xc) / 2, 0, zb((xb + xc) / 2)];
    const bA = s => [xa, s * w(xa), zb(xa)], bB = s => [xb, s * w(xb), zb(xb)], bC = s => [xc, s * w(xc), zb(xc)], bD = s => [xd, s * w(xd), zb(xd)];
    const tB = s => [xb, s * wr, zr], tC = s => [xc, s * wr2, zr - (g.drop || 0)];
    face(ph, [bA(-1), bA(1), tB(1), tB(-1)], 'glass', C);
    face(ph, [bD(-1), bD(1), tC(1), tC(-1)], g.rear || 'glass', C);
    face(ph, [tB(-1), tB(1), tC(1), tC(-1)], roof, C);
    for (const s of [-1, 1]) {
      face(ph, [bA(s), bB(s), tB(s)], 'glass', C);
      face(ph, [bB(s), bC(s), tC(s), tB(s)], g.side || 'glass', C);
      face(ph, [bC(s), bD(s), tC(s)], g.side || 'glass', C);
      const n = [0, s * 0.75, 0.66], pw = g.pillar || 0.55;
      line(ph, bA(s), tB(s), pw, 'paint', [0.4, s * 0.6, 0.6]); line(ph, tB(s), tC(s), pw, 'paint', [0, s * 0.35, 0.9]);
      line(ph, bD(s), tC(s), pw * 1.3, 'paint', [-0.4, s * 0.6, 0.6]);
      if (g.bpillar !== false) { const xm = g.bx != null ? g.bx : lerp(xb, xc, 0.45); line(ph, [xm, s * w(xm), zb(xm)], [xm, s * lerp(wr, wr2, 0.45), zr - (g.drop || 0) * 0.45], pw, 'paint', n); }
    }
    line(ph, tB(-1), tB(1), 0.45, 'paint', [0.3, 0, 0.9]); line(ph, tC(-1), tC(1), 0.45, 'paint', [-0.3, 0, 0.9]);
    M.roofZ = zr; M.roofX = (xb + xc) / 2;
  };
  /** Rad: Mitte (x, y außen), Radius r, Breite b. front = lenkbar. */
  const wheel = (x, yo, r, b, front, rimM) => {
    const s = Math.sign(yo), w = { x, y: yo - s * b / 2, r, s, front, open: !!d.open, pre: [], disc: [] }, K = 10;
    const tp = (t, yy) => [r * Math.cos(t), yy, r + r * Math.sin(t)];
    for (let k = 0; k < K; k++) {
      const t0 = k / K * Math.PI * 2, t1 = (k + 1) / K * Math.PI * 2, tm = (t0 + t1) / 2;
      if (!d.open) continue;                                                // unter dem Kotflügel nicht sichtbar
      face(w.pre, [tp(t0, -b / 2), tp(t1, -b / 2), tp(t1, b / 2), tp(t0, b / 2)], 'tire', [0, 0, r]);
    }
    const disc = (rad, off, m, kk = K, o) => { const p = []; for (let k = 0; k < kk; k++) p.push([rad * Math.cos(k / kk * 6.2832), s * (b / 2 + off), r + rad * Math.sin(k / kk * 6.2832)]); face(w.disc, p, m, [0, 0, r], o); };
    disc(r, 0, 'tire'); disc(r * 0.66, 0.04, rimM || 'rim', 8); disc(r * 0.2, 0.08, 'dark', 6, { hub: 1 });
    if (d.open) { const p = []; for (let k = 0; k < K; k++) p.push([r * Math.cos(k / K * 6.2832), -s * b / 2, r + r * Math.sin(k / K * 6.2832)]); face(w.pre, p, 'tire', [0, 0, r]); const q = p.map(v => [(v[0]) * 0.6, v[1] - s * 0.04, r + (v[2] - r) * 0.6]); face(w.pre, q, 'black', [0, 0, r]); }
    w.spokeR = r * 0.62; w.yo = s * (b / 2 + 0.06);
    M.wheels.push(w);
  };
  d.build({ M, face, loft, hullOf, box, deck, line, ball, cabin, wheel, hw, hz, deckZ, st, z0 });
  // Radhäuser auf der Karosserieseite
  for (const w of M.wheels) if (!w.open) {
    const R = w.r + 0.55, y = w.s * (hw(w.x) + 0.03), p = [];
    for (let k = 0; k <= 8; k++) { const t = k / 8 * Math.PI; p.push([w.x + R * Math.cos(t), y, w.r + R * Math.sin(t)]); }
    p.push([w.x - R, y, z0 * 0.7], [w.x + R, y, z0 * 0.7]);
    w.arch = face([], p, 'black', [w.x, 0, w.r]);
  }
  // Umriss für den Schatten
  M.outline = st.map(s => [s[0], s[1] * 0.96]).concat(st.slice().reverse().map(s => [s[0], -s[1] * 0.96]));
  M.top = Math.max(M.roofZ || 0, ...st.map(s => s[2])) + (d.tall || 0);
  return M;
}

/* ---------- Fahrzeugbeschreibungen ---------- */
const CAR_DEFS = {
  // Sportcoupé
  coupe: { z0: 1.5, hull: [[12.3, 3.4, 3.5], [11.5, 5.2, 4.1, 0.2], [9, 5.9, 4.7, 0.45], [4.6, 6, 5.6, 0.5], [-5, 6.1, 5.9, 0.2], [-9.6, 6, 6.0, 0.15], [-11.6, 5.4, 5.6, 0.1], [-12.2, 4.2, 4.9]],
    build(b) {
      b.hullOf('hull', b.st, b.z0, 'paint', 'black');
      b.deck(11.4, -11.4, -1.0, 1.0, 'accent');
      for (const s of [-1, 1]) {
        b.deck(11.6, 10.1, s * 2.4, s * 4.6, 'head', 0.09); b.deck(-10.9, -11.7, s * 2.0, s * 4.9, 'tail', 0.09);
        b.box('post', 4.2, 5.2, s * 5.9, s * 6.9, 6.0, 6.9, 'paint');
        b.line('hull', [2.6, s * 6.12, 2.6], [2.9, s * 5.9, 5.5], 0.3, 'seam', [0, s, 0.1]); b.line('hull', [-4.6, s * 6.15, 2.6], [-4.4, s * 5.95, 5.7], 0.3, 'seam', [0, s, 0.1]);
        b.wheel(7.3, s * 6.05, 2.55, 1.9, true); b.wheel(-7.3, s * 6.15, 2.6, 2.1, false);
      }
      b.face('hull', [[12.34, -2.6, 2.0], [12.34, 2.6, 2.0], [12.34, 2.2, 3.1], [12.34, -2.2, 3.1]], 'black', [0, 0, 3]);
      b.cabin({ xa: 5.4, xb: 1.8, xc: -4.4, xd: -9.2, wb: 5.0, wr: 3.7, zr: 9.6 });
      b.deck(1.8, -4.4, -1.0, 1.0, 'accent', 0, 'post'); for (const f of b.M.post.slice(-1)) f.p.forEach(p => p[2] = 9.66);
      b.box('post', -11.2, -12.5, -5.2, 5.2, 6.1, 6.7, 'paint2', 'paint');
      b.M.num = [-1.3, 9.7];
    } },
  // Supersportwagen (Keilform)
  wedge: { z0: 1.2, hull: [[13.4, 2.8, 2.3], [12.2, 5.0, 2.9, 0.1], [8, 5.7, 3.7, 0.25], [3, 5.9, 4.5, 0.3], [-4, 6.2, 5.1, 0.2], [-10.4, 6.3, 5.3, 0.1], [-12.5, 5.5, 4.8]],
    build(b) {
      b.box('pre', 13.9, 11.5, -5.6, 5.6, 0.7, 1.3, 'carbon');
      b.hullOf('hull', b.st, b.z0, 'paint', 'carbon');
      b.deck(12.6, -12, -0.7, 0.7, 'accent');
      for (const s of [-1, 1]) {
        b.deck(12.2, 9.6, s * 3.2, s * 4.5, 'head', 0.09); b.deck(-11.4, -12.3, s * 1.6, s * 5.0, 'tail', 0.09);
        b.face('hull', [[-1.5, s * 6.2, 2.2], [-5.5, s * 6.32, 2.2], [-5.5, s * 6.2, 4.3], [-2.6, s * 6.1, 3.6]], 'black', [0, 0, 3]);
        b.box('post', 3.4, 4.3, s * 5.7, s * 6.7, 4.9, 5.6, 'paint');
        for (let i = 0; i < 3; i++) b.deck(-5.6 - i * 1.5, -6.3 - i * 1.5, s * 1.4, s * 4.4, 'black', 0.08);
        b.wheel(7.4, s * 5.9, 2.5, 2.0, true); b.wheel(-8, s * 6.4, 2.75, 2.5, false);
        b.box('post', -10.6, -11.6, s * 3.6, s * 4.3, 5.2, 8.2, 'carbon');
        b.box('post', -9.9, -13.4, s * 6.6, s * 7.0, 7.4, 9.4, 'paint2');
      }
      b.cabin({ xa: 5.6, xb: 0.8, xc: -3.2, xd: -7.4, wb: 4.7, wr: 3.2, zr: 7.7, bpillar: false });
      b.box('post', -10.2, -13.2, -6.7, 6.7, 8.1, 8.7, 'paint2', 'paint');
      b.M.num = [8.3, 0];
    } },
  // Offroad-Buggy mit Überrollkäfig
  buggy: { z0: 3, open: true, tall: 6, hull: [[10.2, 3.2, 5.0], [8.6, 4.6, 6.0, 0.2], [3, 5, 6.7, 0.2], [-6, 5, 6.9], [-9.4, 4.4, 6.7], [-10.2, 3.4, 6.1]],
    build(b) {
      for (const s of [-1, 1]) { b.line('pre', [6.8, s * 3.5, 4], [6.8, s * 6.2, 3.3], 0.8, 'steel', [0, 0, 1]); b.line('pre', [-6.8, s * 3.5, 4], [-6.8, s * 6.2, 3.3], 0.8, 'steel', [0, 0, 1]); }
      b.hullOf('hull', b.st, b.z0, 'paint', 'paint2');
      b.deck(2.6, -5.2, -3.4, 3.4, 'black');
      b.box('deck', 0.2, -4.4, -2.9, 2.9, 5.6, 7.4, 'seat');
      b.box('deck', 9.9, 10.7, -3.6, 3.6, 3.6, 4.4, 'steel');
      for (const s of [-1, 1]) {
        b.deck(9.4, 8.2, s * 1.6, s * 3.6, 'head', 0.1);
        b.wheel(6.8, s * 8.4, 3.3, 2.5, true, 'steel'); b.wheel(-6.8, s * 8.6, 3.5, 2.8, false, 'steel');
        const A = [2.8, s * 3.6, 6.9], B = [1, s * 3.3, 12.4], C = [-5, s * 3.3, 12.4], D = [-8, s * 3.6, 6.9], n = [0, s * 0.6, 0.7];
        b.line('post', A, B, 0.85, 'dark', n); b.line('post', B, C, 0.85, 'dark', [0, s * 0.3, 0.9]); b.line('post', C, D, 0.85, 'dark', n); b.line('post', [-2, s * 3.5, 6.9], [-2, s * 3.3, 12.4], 0.7, 'dark', n);
      }
      b.line('post', [1, -3.3, 12.4], [1, 3.3, 12.4], 0.85, 'dark', [0, 0, 1]); b.line('post', [-5, -3.3, 12.4], [-5, 3.3, 12.4], 0.85, 'dark', [0, 0, 1]);
      b.box('post', 0.6, -0.4, -2.6, 2.6, 12.5, 13.3, 'black'); for (const y of [-1.7, -0.6, 0.6, 1.7]) b.face('post', [[0.62, y - 0.4, 12.6], [0.62, y + 0.4, 12.6], [0.62, y + 0.4, 13.25], [0.62, y - 0.4, 13.25]], 'head', [0, 0, 12.9]);
      b.ball('post', [-1.8, 0, 9.6], 1.9, 'paint', true);
      b.box('post', -6.4, -9.2, -2.8, 2.8, 6.9, 8.8, 'steel', 'dark');
      b.box('post', -7, -8.2, -3.6, 3.6, 8.9, 9.5, 'chrome');
      b.M.num = [6.2, 0];
    } },
  // Rallye-Kompaktwagen
  rally: { z0: 2.1, hull: [[11.3, 3.8, 4.5], [10.5, 5.4, 5.2, 0.2], [7.5, 5.8, 5.9, 0.3], [4.8, 5.9, 6.6, 0.4], [-9.6, 5.9, 7.0, 0.1], [-11, 5.3, 6.6]],
    build(b) {
      b.hullOf('hull', b.st, b.z0, 'paint', 'black');
      for (const s of [-1, 1]) {
        b.deck(10.9, -10.6, s * 1.5, s * 2.7, 'white');
        b.deck(10.6, 9.3, s * 3.3, s * 4.9, 'head', 0.09); b.deck(-10.1, -10.9, s * 3.0, s * 4.9, 'tail', 0.09);
        b.face('hull', [[2.6, s * 5.98, 3.4], [-4.2, s * 6.0, 3.4], [-4.2, s * 5.92, 6.2], [2.6, s * 5.9, 6.0]], 'white', [0, 0, 4]);
        b.box('pre', -9.2, -9.8, s * 4.6, s * 6.2, 0.5, 3.2, 'black');
        b.box('post', 3.8, 4.8, s * 5.8, s * 6.8, 7.0, 7.9, 'paint');
        b.wheel(6.8, s * 6.0, 2.75, 2.0, true, 'white'); b.wheel(-6.8, s * 6.05, 2.75, 2.0, false, 'white');
      }
      b.face('hull', [[11.34, -2.8, 2.6], [11.34, 2.8, 2.6], [11.34, 2.4, 4.0], [11.34, -2.4, 4.0]], 'black', [0, 0, 3]);
      for (const y of [-2.4, -0.8, 0.8, 2.4]) { b.box('deck', 9.6, 10.6, y - 0.65, y + 0.65, 5.2, 6.6, 'black'); b.face('deck', [[10.63, y - 0.55, 5.5], [10.63, y + 0.55, 5.5], [10.63, y + 0.55, 6.5], [10.63, y - 0.55, 6.5]], 'head', [0, 0, 6]); }
      b.cabin({ xa: 5.6, xb: 2.6, xc: -7.4, xd: -10.0, wb: 5.0, wr: 3.9, zr: 11.2, bx: -1.8 });
      for (const s of [-1, 1]) { b.deck(2.6, -7.4, s * 1.5, s * 2.7, 'white', 0, 'post'); b.M.post[b.M.post.length - 1].p.forEach(p => p[2] = 11.26); }
      b.box('post', 1.6, -1.6, -1.2, 1.2, 11.2, 12.5, 'black');
      b.box('post', -7.2, -9.6, -4.3, 4.3, 11.3, 11.9, 'paint2', 'paint');
      b.M.num = [-4, 11.3];
    } },
  // Formelwagen
  formula: { z0: 1.0, open: true, hull: [[15.6, 0.8, 2.1], [12, 1.3, 3.0], [6, 1.9, 4.0], [3, 2.5, 4.7], [1.6, 5.0, 4.4], [-6, 5.2, 4.4], [-9.5, 3.4, 4.0], [-12.2, 1.8, 3.4]],
    build(b) {
      b.box('pre', 13.4, 16.2, -7.3, 7.3, 0.9, 1.5, 'paint2', 'paint'); b.box('pre', 13.2, 15.4, -7.4, -6.9, 0.9, 3.2, 'carbon'); b.box('pre', 13.2, 15.4, 6.9, 7.4, 0.9, 3.2, 'carbon');
      b.box('pre', 12, -11, -4.6, 4.6, 0.6, 1.0, 'carbon');
      for (const s of [-1, 1]) {
        b.line('pre', [9.6, s * 1.6, 3.2], [8.6, s * 5.6, 3.2], 0.5, 'carbon', [0, 0, 1]); b.line('pre', [7.2, s * 1.9, 3.2], [8.4, s * 5.6, 2.6], 0.5, 'carbon', [0, 0, 1]);
        b.line('pre', [-7.4, s * 3.6, 3.4], [-8, s * 5.4, 3.2], 0.6, 'carbon', [0, 0, 1]);
        b.wheel(8.5, s * 8.3, 2.9, 2.5, true, 'dark'); b.wheel(-8, s * 8.6, 3.0, 3.2, false, 'dark');
      }
      b.hullOf('hull', b.st, b.z0, 'paint', 'carbon');
      b.deck(15, 4, -0.5, 0.5, 'accent');
      b.deck(2.2, -3.6, -1.5, 1.5, 'black');
      for (const s of [-1, 1]) { b.face('hull', [[1.56, s * 2.7, 1.8], [1.56, s * 4.7, 1.8], [1.56, s * 4.5, 4.0], [1.56, s * 2.7, 4.0]], 'black', [0, 0, 3]); b.deck(0.6, -5.4, s * 3.1, s * 4.5, 'accent'); }
      b.hullOf('post', [[-3.2, 1.5, 7.8], [-6, 1.2, 7.0], [-10.6, 0.5, 5.0]], 4.3, 'paint', 'paint');
      b.face('post', [[-3.16, -0.9, 6.0], [-3.16, 0.9, 6.0], [-3.16, 0.7, 7.5], [-3.16, -0.7, 7.5]], 'black', [-20, 0, 6]);
      b.ball('post', [-1.0, 0, 6.3], 1.8, 'paint', true);
      b.line('post', [3.4, 0, 5.0], [0.8, 0, 7.6], 0.6, 'carbon', [0, 0, 1]); b.line('post', [0.8, 0, 7.6], [-2.6, -1.7, 7.4], 0.6, 'carbon', [0, 0, 1]); b.line('post', [0.8, 0, 7.6], [-2.6, 1.7, 7.4], 0.6, 'carbon', [0, 0, 1]);
      for (const s of [-1, 1]) b.box('post', -10.4, -13.8, s * 5.6, s * 6.0, 3.6, 9.6, 'paint2');
      b.box('post', -10.8, -13.6, -5.6, 5.6, 8.4, 9.0, 'paint2', 'paint'); b.box('post', -12.2, -13.7, -5.6, 5.6, 6.6, 7.0, 'carbon');
      b.face('post', [[-12.25, -0.8, 2.6], [-12.25, 0.8, 2.6], [-12.25, 0.8, 3.6], [-12.25, -0.8, 3.6]], 'tail', [0, 0, 3]);
      b.M.num = [9, 0]; b.M.numS = 0.62;
    } },
  // Pick-up
  pickup: { z0: 2.8, hull: [[11.5, 4.4, 6.4], [10.7, 6.0, 7.2, 0.2], [5.8, 6.4, 7.8, 0.35], [-11, 6.4, 7.8], [-11.6, 5.9, 7.5]],
    build(b) {
      b.box('pre', 12.4, 11.2, -5.4, 5.4, 2.6, 4.2, 'chrome');
      b.hullOf('hull', b.st, b.z0, 'paint', 'black');
      b.deck(-3.4, -10.8, -5.3, 5.3, 'bed'); for (let i = 0; i < 5; i++) b.deck(-3.6, -10.6, -4.2 + i * 2 - 0.12, -4.2 + i * 2 + 0.12, 'dark', 0.09);
      for (const s of [-1, 1]) {
        b.deck(11.0, 9.6, s * 3.4, s * 5.4, 'head', 0.09); b.deck(-10.6, -11.4, s * 4.6, s * 5.8, 'tail', 0.09);
        b.line('hull', [-3.2, s * 6.42, 3.6], [-3.2, s * 6.25, 7.6], 0.3, 'seam', [0, s, 0.1]); b.line('hull', [3.4, s * 6.42, 3.6], [3.4, s * 6.25, 7.6], 0.3, 'seam', [0, s, 0.1]);
        b.box('post', 5.0, 6.1, s * 6.3, s * 7.5, 8.2, 9.3, 'black');
        b.wheel(7.2, s * 6.5, 3.2, 2.3, true, 'steel'); b.wheel(-7.4, s * 6.5, 3.2, 2.3, false, 'steel');
      }
      b.face('hull', [[11.54, -3.4, 3.8], [11.54, 3.4, 3.8], [11.54, 3.2, 6.0], [11.54, -3.2, 6.0]], 'black', [0, 0, 3]);
      b.cabin({ xa: 6.6, xb: 4.2, xc: -1.6, xd: -3.0, wb: 5.6, wr: 4.7, zr: 12.8, bx: 1.2 });
      for (const s of [-1, 1]) b.box('post', -3.4, -4.3, s * 4.9, s * 5.7, 7.8, 12.2, 'black');
      b.box('post', -3.3, -4.4, -5.7, 5.7, 12.2, 13.0, 'black'); for (const y of [-3.6, -1.2, 1.2, 3.6]) b.face('post', [[-3.28, y - 0.7, 12.3], [-3.28, y + 0.7, 12.3], [-3.28, y + 0.7, 12.95], [-3.28, y - 0.7, 12.95]], 'head', [-20, 0, 12]);
      b.M.num = [1.3, 12.9];
    } },
  // Renntruck
  truck: { z0: 3.4, hull: [[15.3, 6.3, 7.0], [14.7, 7.3, 7.4], [-15, 7.3, 7.4], [-15.6, 6.9, 7.2]],
    build(b) {
      b.box('pre', 16, 14.8, -7, 7, 2.4, 4.4, 'steel');
      b.hullOf('hull', b.st, b.z0, 'dark', 'black');
      for (const s of [-1, 1]) { b.wheel(10, s * 7.4, 3.7, 2.6, true, 'steel'); b.wheel(-6.2, s * 7.4, 3.7, 2.8, false, 'steel'); b.wheel(-11.4, s * 7.4, 3.7, 2.8, false, 'steel'); }
      // Fahrerhaus
      b.hullOf('deck', [[15.2, 6.9, 12.2], [6.6, 6.9, 12.2]], 7.3, 'paint', 'paint');
      b.face('deck', [[15.24, -5.4, 7.8], [15.24, 5.4, 7.8], [15.24, 5.0, 10.4], [15.24, -5.0, 10.4]], 'black', [0, 0, 9]);
      for (const s of [-1, 1]) { b.face('deck', [[15.26, s * 4.2, 8.0], [15.26, s * 6.2, 8.0], [15.26, s * 6.2, 9.2], [15.26, s * 4.2, 9.2]], 'head', [0, 0, 9]); b.box('post', 13.4, 14.6, s * 7.0, s * 8.4, 12.4, 14.4, 'black'); }
      b.cabin({ xa: 15.0, xb: 13.6, xc: 7.4, xd: 6.8, wb: 6.6, wr: 6.2, zr: 16.4, zb: 12.2, bpillar: false, rear: 'paint', ph: 'deck' });
      b.loft('deck', [[[13.4, 5.6, 16.4], [13.4, -5.6, 16.4]], [[7.6, 6.2, 18.6], [7.6, -6.2, 18.6]], [[7.4, 6.2, 16.4], [7.4, -6.2, 16.4]]], () => 'paint2', null);
      for (const s of [-1, 1]) { b.face('deck', [[13.4, s * 5.6, 16.4], [7.6, s * 6.2, 18.6], [7.4, s * 6.2, 16.4]], 'paint2', [10, 0, 17]); b.line('post', [6.0, s * 6.4, 7.4], [6.0, s * 6.4, 19], 0.9, 'chrome', [0, s, 0.3]); }
      // Koffer
      b.box('post', 5.4, -15.4, -7.4, 7.4, 7.4, 18.2, 'box', 'box');
      for (const s of [-1, 1]) { b.face('post', [[4.2, s * 7.44, 11.4], [-14.2, s * 7.44, 11.4], [-14.2, s * 7.44, 14.6], [4.2, s * 7.44, 14.6]], 'paint', [0, 0, 12]); b.face('post', [[4.6, s * 5.2, 18.24], [-14.6, s * 5.2, 18.24], [-14.6, s * 6.6, 18.24], [4.6, s * 6.6, 18.24]], 'paint', [0, 0, 0]); }
      b.face('post', [[-15.44, -6.6, 8.2], [-15.44, -0.2, 8.2], [-15.44, -0.2, 17.6], [-15.44, -6.6, 17.6]], 'white', [0, 0, 12]); b.face('post', [[-15.44, 6.6, 8.2], [-15.44, 0.2, 8.2], [-15.44, 0.2, 17.6], [-15.44, 6.6, 17.6]], 'white', [0, 0, 12]);
      for (const s of [-1, 1]) b.face('post', [[-15.46, s * 5.6, 7.5], [-15.46, s * 7.2, 7.5], [-15.46, s * 7.2, 8.1], [-15.46, s * 5.6, 8.1]], 'tail', [0, 0, 8]);
      b.M.num = [-5, 18.3]; b.M.numS = 1.5; b.M.roofZ = 18.2;
    } },
  // Muscle-Car
  muscle: { z0: 1.6, hull: [[13.3, 4.8, 4.7], [12.5, 6.0, 5.3, 0.1], [8, 6.4, 5.9, 0.5], [1.6, 6.4, 6.2, 0.4], [-8.5, 6.4, 6.2, 0.1], [-12.2, 6.2, 6.0], [-13, 5.4, 5.5]],
    build(b) {
      b.box('pre', 13.9, 12.9, -5.6, 5.6, 1.9, 3.0, 'chrome'); b.box('pre', -12.8, -13.6, -5.8, 5.8, 2.2, 3.2, 'chrome');
      b.hullOf('hull', b.st, b.z0, 'paint', 'black');
      for (const s of [-1, 1]) {
        b.deck(12.6, -12.4, s * 0.5, s * 2.1, 'white');
        b.deck(12.7, 11.6, s * 2.6, s * 3.7, 'head', 0.09); b.deck(12.7, 11.6, s * 4.1, s * 5.2, 'head', 0.09);
        b.deck(-11.8, -12.8, s * 1.4, s * 5.4, 'tail', 0.09);
        b.line('hull', [0.6, s * 6.44, 2.6], [0.8, s * 6.25, 5.9], 0.3, 'seam', [0, s, 0.1]); b.line('hull', [-6, s * 6.44, 2.6], [-5.8, s * 6.25, 5.9], 0.3, 'seam', [0, s, 0.1]);
        b.box('post', 1.2, 2.2, s * 6.2, s * 7.2, 6.4, 7.2, 'chrome');
        b.wheel(8, s * 6.4, 2.7, 2.1, true, 'chrome'); b.wheel(-7.6, s * 6.5, 2.95, 2.6, false, 'chrome');
      }
      b.face('hull', [[13.34, -4.2, 2.9], [13.34, 4.2, 2.9], [13.34, 4.0, 4.4], [13.34, -4.0, 4.4]], 'black', [0, 0, 3]);
      b.box('deck', 9.4, 5, -1.7, 1.7, 5.9, 7.6, 'black'); b.face('deck', [[9.43, -1.3, 6.5], [9.43, 1.3, 6.5], [9.43, 1.3, 7.4], [9.43, -1.3, 7.4]], 'steel', [0, 0, 7]);
      b.cabin({ xa: 2.6, xb: -0.4, xc: -6, xd: -9.8, wb: 5.3, wr: 3.9, zr: 9.6, bx: -3.4 });
      for (const s of [-1, 1]) { b.deck(-0.4, -6, s * 0.5, s * 2.1, 'white', 0, 'post'); b.M.post[b.M.post.length - 1].p.forEach(p => p[2] = 9.66); }
      b.box('post', -11.6, -13.1, -6, 6, 6.1, 7.0, 'paint2', 'paint');
      b.M.num = [8.5, 0]; b.M.numOff = 1;
    } },
  // Elektro-Limousine
  ev: { z0: 1.5, hull: [[12.7, 3.2, 3.7], [11.7, 5.2, 4.4, 0.3], [8.6, 5.9, 5.0, 0.5], [5.6, 6, 5.4, 0.5], [-8, 6, 5.6, 0.3], [-11.2, 5.6, 5.4, 0.1], [-12.1, 4.4, 4.9]],
    build(b) {
      b.hullOf('hull', b.st, b.z0, 'paint', 'dark');
      b.deck(11.9, 11.2, -4.6, 4.6, 'cyan', 0.09); b.deck(-11.0, -11.7, -5.0, 5.0, 'tail', 0.09);
      for (const s of [-1, 1]) {
        b.line('hull', [2, s * 6.04, 2.4], [2.2, s * 5.85, 5.2], 0.3, 'seam', [0, s, 0.1]); b.line('hull', [-5, s * 6.04, 2.4], [-4.8, s * 5.85, 5.3], 0.3, 'seam', [0, s, 0.1]);
        b.line('hull', [6, s * 6.0, 4.3], [-9, s * 6.0, 4.5], 0.35, 'cyan', [0, s, 0.2]);
        b.box('post', 6.6, 7.4, s * 5.8, s * 6.7, 5.6, 6.3, 'paint');
        b.wheel(7.4, s * 6.05, 2.6, 1.9, true, 'white'); b.wheel(-7.4, s * 6.05, 2.6, 1.9, false, 'white');
      }
      b.cabin({ xa: 8.2, xb: 3.6, xc: -4.8, xd: -10.4, wb: 5.0, wr: 3.8, zr: 9.3, roof: 'glass', pillar: 0.7 });
      b.M.num = [-0.6, 9.4];
    } },
  // Kart
  kart: { z0: 0.8, open: true, tall: 5, hull: [[9.3, 2.4, 2.0], [7.6, 4.6, 2.2], [-7.5, 4.8, 2.2], [-8.6, 3.6, 2.2]],
    build(b) {
      b.hullOf('hull', b.st, b.z0, 'dark', 'dark');
      b.line('hull', [-8.9, -5, 1.8], [-8.9, 5, 1.8], 0.8, 'steel', [0, 0, 1]);
      for (const s of [-1, 1]) {
        b.wheel(5.8, s * 7.0, 1.75, 1.7, true, 'paint'); b.wheel(-6.2, s * 7.5, 1.95, 2.3, false, 'paint');
        b.hullOf('deck', [[3.4, 1.0, 4.2], [-4.2, 1.2, 4.4]].map(q => q), 2.2, 'paint', 'paint2'); b.M.deck.slice(-18).forEach(f => { f.p = f.p.map(p => [p[0], p[1] + s * 4.5, p[2]]); f.c = [f.c[0], f.c[1] + s * 4.5, f.c[2]]; });
      }
      b.hullOf('deck', [[10, 2.0, 2.8], [8.6, 3.2, 4.2], [6.6, 3.0, 4.4]], 1.6, 'paint', 'paint2');
      b.face('deck', [[9.2, -1.2, 3.75], [9.2, 1.2, 3.75], [7.4, 1.2, 4.45], [7.4, -1.2, 4.45]], 'white', [8, 0, -20]);
      b.box('deck', -4.8, -7.4, 1.6, 4.4, 2.2, 5.0, 'steel', 'chrome');
      b.box('deck', -1.2, -5.2, -2.3, 2.3, 2.2, 3.6, 'seat'); b.box('deck', -4.4, -5.4, -2.5, 2.5, 3.6, 7.0, 'seat');
      b.line('post', [5.4, 0, 2.6], [1.6, 0, 6.2], 0.6, 'steel', [0, 0, 1]); b.line('post', [1.6, -1.5, 6.3], [1.6, 1.5, 6.3], 0.9, 'black', [0, 0, 1]);
      b.box('post', -1.4, -4.2, -1.9, 1.9, 3.6, 7.6, 'suit');
      b.line('post', [-2, -1.9, 7], [1.4, -1.4, 6.3], 0.9, 'suit', [0, 0, 1]); b.line('post', [-2, 1.9, 7], [1.4, 1.4, 6.3], 0.9, 'suit', [0, 0, 1]);
      b.ball('post', [-2.6, 0, 9.3], 2.0, 'paint', true);
    } }
};
const CAR3D = {};
for (const k in CAR_DEFS) CAR3D[k] = carBuild(CAR_DEFS[k]);

/** Zeichnet ein Auto. o: { x, y, a, z, gz, pitch, roll, color, shape, steer, damage, brake, alpha, ghost, num, lights } */
function drawCar3D(ctx, o) {
  const M = CAR3D[o.shape] || CAR3D.coupe;
  const ca = Math.cos(o.a), sa = Math.sin(o.a), base = o.z || 0, gz = o.gz != null ? o.gz : base;
  const pitch = o.pitch || 0, roll = o.roll || 0, ghost = !!o.ghost, dmg = o.damage || 0;
  const col0 = ghost ? [190, 230, 255] : rgbOf(o.color), dk = 1 - dmg * 0.28;
  const col = [col0[0] * dk, col0[1] * dk, col0[2] * dk];
  const prevA = ctx.globalAlpha, prevZB = ZB, alpha = prevA * (o.alpha != null ? o.alpha : 1);
  ZB = 0; ctx.globalAlpha = alpha;
  const sc = projS(o.y);
  const Q = (lx, ly, lz) => P(o.x + lx * ca - ly * sa, o.y + lx * sa + ly * ca, base + lz + lx * pitch + ly * roll);
  // Schatten: weicher Wurfschatten + dunkler Kontaktschatten direkt unter dem Wagen
  if (!ghost) {
    const hh = Math.max(0, base - gz), k = Math.max(0.25, 1 - hh / 70), top = M.top;
    const G = (lx, ly, dx, dy) => P(o.x + lx * ca - ly * sa + dx, o.y + lx * sa + ly * ca + dy, gz);
    ctx.globalAlpha = alpha * k;
    fillPoly(ctx, M.outline.map(([lx, ly]) => G(lx * 1.04, ly * 1.08, top * 0.42 + hh * 0.55, top * 0.3 + hh * 0.38)), 'rgba(0,0,0,.22)');
    fillPoly(ctx, M.outline.map(([lx, ly]) => G(lx * 1.02, ly * 1.05, 1.2 + hh * 0.55, 0.9 + hh * 0.38)), 'rgba(0,0,0,.30)');
    ctx.globalAlpha = alpha;
  }
  const glassBase = ghost ? [120, 160, 190] : [20, 28, 40], sky = o.lights ? [50, 62, 92] : [150, 192, 230];
  const brakeC = o.brake ? [255, 48, 40] : (o.lights ? [205, 34, 30] : [132, 22, 22]);
  /** Farbe einer Fläche mit Material m und Welt-Normale (nx, ny, nz). */
  const shadeOf = (m, nx, ny, nz) => {
    let b, gl, kk = 1;
    switch (m) {
      case 'paint': b = col; gl = 0.85; break;
      case 'paint2': b = col; gl = 0.4; kk = 0.58; break;
      case 'accent': b = [Math.min(255, col[0] * 1.3 + 26), Math.min(255, col[1] * 1.3 + 26), Math.min(255, col[2] * 1.3 + 26)]; gl = 0.85; break;
      case 'suit': b = [col[0] * 0.5 + 110, col[1] * 0.5 + 110, col[2] * 0.5 + 110]; gl = 0; break;
      case 'head': return o.lights ? '#fffbe6' : '#fff3c4';
      case 'cyan': return o.lights ? '#eafcff' : '#bdf0ff';
      case 'tail': return 'rgb(' + brakeC[0] + ',' + brakeC[1] + ',' + brakeC[2] + ')';
      case 'seam': return 'rgba(0,0,0,.38)';
      case 'glass': {
        const d = Math.max(0, nx * CAR_L[0] + ny * CAR_L[1] + nz * CAR_L[2]), v = Math.max(0, ny * CAR_V[1] + nz * CAR_V[2]);
        const fr = 0.16 + 0.6 * (1 - v) * (1 - v), sp = Math.pow(Math.max(0, nx * CAR_H[0] + ny * CAR_H[1] + nz * CAR_H[2]), 36) * 235;
        const q = 0.7 + 0.4 * d;
        return 'rgb(' + Math.min(255, glassBase[0] * q + sky[0] * fr + sp | 0) + ',' + Math.min(255, glassBase[1] * q + sky[1] * fr + sp | 0) + ',' + Math.min(255, glassBase[2] * q + sky[2] * fr + sp | 0) + ')';
      }
      default: b = CAR_MAT[m] || CAR_MAT.dark; gl = b[3];
    }
    if (ghost) { b = [190, 230, 255]; gl = 0.2; }
    const d = Math.max(0, nx * CAR_L[0] + ny * CAR_L[1] + nz * CAR_L[2]);
    const k = (0.6 + 0.5 * d + 0.06 * nz) * kk, sp = gl * Math.pow(Math.max(0, nx * CAR_H[0] + ny * CAR_H[1] + nz * CAR_H[2]), 26) * 215;
    return 'rgb(' + Math.min(255, b[0] * k + sp | 0) + ',' + Math.min(255, b[1] * k + sp | 0) + ',' + Math.min(255, b[2] * k + sp | 0) + ')';
  };
  const buf = [];
  /** Zeichnet eine Liste von Teilen, von hinten nach vorne sortiert. wt = Radtransformation (optional). */
  const drawList = (list, wt) => {
    buf.length = 0;
    for (const f of list) {
      let nx = f.n[0], ny = f.n[1], cx = f.c[0], cy = f.c[1];
      const nz = f.n[2];
      if (wt) { const t = nx * wt.c - ny * wt.s; ny = nx * wt.s + ny * wt.c; nx = t; const u = wt.x + cx * wt.c - cy * wt.s; cy = wt.y + cx * wt.s + cy * wt.c; cx = u; }
      const wx = nx * ca - ny * sa, wy = nx * sa + ny * ca;
      if (f.t !== 2 && wy * CAR_V[1] + nz * CAR_V[2] <= (f.t === 1 ? -0.25 : 0.015)) continue;
      buf.push({ f, k: (cx * sa + cy * ca) * CAR_V[1] + f.c[2] * CAR_V[2], wx, wy });
    }
    if (buf.length > 1) buf.sort((a, b) => a.k - b.k);
    for (const it of buf) {
      const f = it.f;
      if (f.t === 0) {
        if (f.hub && !CAR_DETAIL) continue;
        const p = f.p, st = shadeOf(f.m, it.wx, it.wy, f.n[2]);
        ctx.fillStyle = st; ctx.beginPath();
        for (let i = 0; i < p.length; i++) {
          let x = p[i][0], y = p[i][1];
          if (wt) { const u = wt.x + x * wt.c - y * wt.s; y = wt.y + x * wt.s + y * wt.c; x = u; }
          const q = Q(x, y, p[i][2]); i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]);
        }
        ctx.closePath(); ctx.fill();
      } else if (f.t === 1) {
        if (f.m === 'seam' && !CAR_DETAIL) continue;
        const a = Q(f.a[0], f.a[1], f.a[2]), b = Q(f.b[0], f.b[1], f.b[2]);
        ctx.strokeStyle = shadeOf(f.m, it.wx, it.wy, f.n[2]); ctx.lineWidth = f.w * sc; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
      } else {
        const [X, Y] = Q(f.c[0], f.c[1], f.c[2]), r = f.r * sc;
        const g = ctx.createRadialGradient(X - r * 0.4, Y - r * 0.5, 0, X, Y, r);
        g.addColorStop(0, '#ffffff'); g.addColorStop(0.3, 'rgb(' + (col[0] | 0) + ',' + (col[1] | 0) + ',' + (col[2] | 0) + ')'); g.addColorStop(1, 'rgb(' + (col[0] * 0.45 | 0) + ',' + (col[1] * 0.45 | 0) + ',' + (col[2] * 0.45 | 0) + ')');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(X, Y, r, 0, 7); ctx.fill();
        if (f.visor) { const [VX, VY] = Q(f.c[0] + f.r * 0.62, f.c[1], f.c[2] + f.r * 0.1); ctx.fillStyle = '#141a22'; ctx.beginPath(); ctx.ellipse(VX, VY, f.r * 0.5 * sc, f.r * 0.42 * sc, 0, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(190,225,255,.55)'; ctx.beginPath(); ctx.arc(VX - r * 0.12, VY - r * 0.12, r * 0.13, 0, 7); ctx.fill(); }
      }
    }
  };
  // Räder vorbereiten (Lenkeinschlag vorne)
  const steer = (o.steer || 0) * 0.45, spin = (o.x * ca + o.y * sa);
  const wts = M.wheels.map(w => { const st = w.front ? steer : 0; return { w, x: w.x, y: w.y, c: Math.cos(st), s: Math.sin(st), near: (w.x * sa + w.y * ca) > 0 }; });
  const wheelDisc = wt => {
    drawList(wt.w.disc, wt);
    if (!CAR_DETAIL || ghost) return;
    // Speichen (drehen sich mit dem zurückgelegten Weg)
    const w = wt.w, ny = w.s, nwy = (-ny * wt.s) * sa + (ny * wt.c) * ca;
    if (nwy * CAR_V[1] <= 0.015) return;
    ctx.strokeStyle = 'rgba(20,22,26,.7)'; ctx.lineWidth = 0.42 * sc; ctx.beginPath();
    const ph = spin / w.r;
    for (let i = 0; i < 5; i++) {
      const t = ph + i * 1.2566, lx = Math.cos(t) * w.spokeR, lz = w.r + Math.sin(t) * w.spokeR;
      const a = Q(wt.x - w.yo * wt.s, wt.y + w.yo * wt.c, w.r), b = Q(wt.x + lx * wt.c - w.yo * wt.s, wt.y + lx * wt.s + w.yo * wt.c, lz);
      ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
    }
    ctx.stroke();
  };
  drawList(M.pre);
  if (!ghost) {
    // Unterlage in Lackfarbe: verdeckt die haarfeinen Fugen zwischen den Flächen
    const zl = M.def.z0 + 0.3, base2 = M.def.open && M.def.z0 < 1 ? 'dark' : 'paint2';
    ctx.fillStyle = shadeOf(base2, 0, 0, 1); ctx.beginPath();
    for (const zz of [zl, -1]) { M.outline.forEach(([lx, ly], i) => { const q = Q(lx, ly * 0.98, zz < 0 ? M.hz(lx) - 0.2 : zz); i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); }); ctx.closePath(); }
    ctx.fill();
  }
  if (M.def.open) { for (const wt of wts) if (!wt.near) { drawList(wt.w.pre, wt); wheelDisc(wt); } }
  else for (const wt of wts) drawList(wt.w.pre, wt);
  drawList(M.hull);
  if (!M.def.open) for (const wt of wts) { if (wt.w.arch) drawList([wt.w.arch]); wheelDisc(wt); }
  drawList(M.deck);
  drawList(M.gh);
  if (M.def.open) for (const wt of wts) if (wt.near) { drawList(wt.w.pre, wt); wheelDisc(wt); }
  drawList(M.post);
  // Bremslicht-Schein
  if (o.brake && !ghost) {
    const [X, Y] = Q(M.rear - 1, 0, M.hz(M.rear));
    const g = ctx.createRadialGradient(X, Y, 0, X, Y, 7.5); g.addColorStop(0, 'rgba(255,40,40,.4)'); g.addColorStop(1, 'rgba(255,40,40,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(X, Y, 7.5, 0, 7); ctx.fill();
  }
  // Startnummer
  if (o.num != null && !ghost && M.num) {
    const nx = M.num[0], onRoof = M.num[1] > 0, nz = onRoof ? M.num[1] : M.hz(nx) + 0.5, [X, Y] = Q(nx, 0, nz + 0.05), ns = sc * (M.numS || 1);
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(X, Y, 2.7 * ns, 2.3 * ns, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#111'; ctx.font = '700 ' + (4.1 * ns).toFixed(1) + 'px "Chakra Petch",sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(o.num), X, Y + 0.3);
  }
  // Schaden: Kratzer und Dellen
  if (dmg > 0.4 && !ghost) {
    ctx.strokeStyle = 'rgba(20,20,20,.55)'; ctx.lineWidth = 0.8;
    const zz = x => M.hz(x) + 0.3, a = Q(M.front - 5, -3, zz(M.front - 5)), b = Q(M.front - 2, -1, zz(M.front - 2)), c = Q(M.front - 4, 2, zz(M.front - 4));
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.stroke();
    if (dmg > 0.7) { const d = Q(M.rear + 2, 2, zz(M.rear + 2)), e = Q(M.rear + 5, -1, zz(M.rear + 5)); ctx.beginPath(); ctx.moveTo(d[0], d[1]); ctx.lineTo(e[0], e[1]); ctx.stroke(); }
  }
  ctx.globalAlpha = prevA; ZB = prevZB;
}
/** Vorderkante eines Autos (für Scheinwerferkegel). */
const carFront = shape => (CAR3D[shape] || CAR3D.coupe).front;
