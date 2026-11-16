/* =====================================================================
   7b  COCKPIT-ANSICHT – Sicht hinter dem Lenkrad (nur Einzelspieler)
   Eigener WebGL2-Renderer: Der Boden ist die fertige Streckengrafik
   (race.layers.flat) auf dem Höhenraster, Objekte und Autos sind 3D-Netze
   (die Autos aus CAR3D), dazu Himmel, Berge am Horizont, Nebel, Licht und
   Rückspiegel. Darüber wird das Cockpit der Fahrzeugklasse in 2D gezeichnet.
   Koordinaten wie im Spiel: x nach rechts (Osten), y nach unten (Süden), z nach oben.
   ===================================================================== */
const COCKPIT_CAM = 3;
const isCockpitCam = () => Options.data.camera === COCKPIT_CAM;
const CP_MH = 110;                         // Zusatzstreifen unter dem Bild, in den die Spiegel gerendert werden
/** Augenpunkt je Karosserie (lokal: +x vorne, +y rechts, z Höhe) */
const CP_EYE = {
  coupe: [-0.6, -1.5, 7.8], wedge: [-0.6, -1.4, 6.1], buggy: [-1.4, 0, 10.0], rally: [-1.2, -1.6, 9.2], formula: [-0.8, 0, 6.7],
  pickup: [1.2, -1.8, 10.8], truck: [10.4, -2.4, 14.8], muscle: [-2.6, -1.6, 9.0], ev: [0.2, -1.5, 7.5], kart: [-2.2, 0, 9.0]
};

/* ---------- Vektoren und Matrizen (spaltenweise wie in WebGL) ---------- */
const v3sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const v3cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const v3dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const M4 = {
  id() { const m = new Float32Array(16); m[0] = m[5] = m[10] = m[15] = 1; return m; },
  persp(fy, asp, n, f) { const t = 1 / Math.tan(fy / 2), m = new Float32Array(16); m[0] = t / asp; m[5] = t; m[10] = (f + n) / (n - f); m[11] = -1; m[14] = 2 * f * n / (n - f); return m; },
  mulA(a, b) { const o = new Float32Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s; } return o; },
  /** Blick von e in Richtung f; r = physikalisch rechts, u = oben */
  view(e, f, r, u) { return new Float32Array([r[0], u[0], -f[0], 0, r[1], u[1], -f[1], 0, r[2], u[2], -f[2], 0, -v3dot(r, e), -v3dot(u, e), v3dot(f, e), 1]); },
  /** Auto/Objekt: Scherung (Nick/Roll wie in der 2D-Ansicht), Drehung um z, Verschiebung */
  model(x, y, z, a, pitch = 0, roll = 0) { const ca = Math.cos(a), sa = Math.sin(a); return new Float32Array([ca, sa, pitch, 0, -sa, ca, roll, 0, 0, 0, 1, 0, x, y, z, 1]); }
};

/* ---------- Netz-Bausteine ---------- */
const CPM_NONE = [0, 0, 0, 0];
class MeshB {
  constructor() { this.v = []; this.i = []; }
  vert(p, n, c, paint, m) { const M = m || CPM_NONE; this.v.push(p[0], p[1], p[2], n[0], n[1], n[2], c[0], c[1], c[2], paint || 0, M[0], M[1], M[2], M[3]); return this.v.length / 14 - 1; }
  /** Vieleck; die Normale zeigt von C weg (oder in Richtung want). c = Farbe 0..1 */
  poly(pts, C, c, paint, m, want) {
    let nx = 0, ny = 0, nz = 0;
    for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; nx += (a[1] - b[1]) * (a[2] + b[2]); ny += (a[2] - b[2]) * (a[0] + b[0]); nz += (a[0] - b[0]) * (a[1] + b[1]); }
    const l = Math.hypot(nx, ny, nz); if (l < 1e-9) return;
    let n = [nx / l, ny / l, nz / l];
    if (!want) { let cx = 0, cy = 0, cz = 0; for (const p of pts) { cx += p[0]; cy += p[1]; cz += p[2]; } want = [cx / pts.length - C[0], cy / pts.length - C[1], cz / pts.length - C[2]]; }
    if (v3dot(n, want) < 0) { pts = pts.slice().reverse(); n = [-n[0], -n[1], -n[2]]; }
    const b = pts.map(p => this.vert(p, n, c, paint, m));
    for (let k = 1; k < b.length - 1; k++) this.i.push(b[0], b[k], b[k + 1]);
  }
  /** Quader in Objektkoordinaten (Mitte ox,oy, Drehung a, Boden zb) */
  box(ox, oy, a, zb, x0, x1, y0, y1, z0, z1, c, top) {
    const ca = Math.cos(a), sa = Math.sin(a), Wp = (lx, ly, z) => [ox + lx * ca - ly * sa, oy + lx * sa + ly * ca, zb + z];
    const C = Wp((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    this.poly([Wp(x0, y0, z1), Wp(x1, y0, z1), Wp(x1, y1, z1), Wp(x0, y1, z1)], C, top || c);
    this.poly([Wp(x0, y0, z0), Wp(x1, y0, z0), Wp(x1, y0, z1), Wp(x0, y0, z1)], C, c);
    this.poly([Wp(x0, y1, z0), Wp(x1, y1, z0), Wp(x1, y1, z1), Wp(x0, y1, z1)], C, c);
    this.poly([Wp(x0, y0, z0), Wp(x0, y1, z0), Wp(x0, y1, z1), Wp(x0, y0, z1)], C, c);
    this.poly([Wp(x1, y0, z0), Wp(x1, y1, z0), Wp(x1, y1, z1), Wp(x1, y0, z1)], C, c);
  }
  cyl(x, y, z0, z1, r0, r1, c, seg = 7, top = true, cTop) {
    const C = [x, y, (z0 + z1) / 2];
    for (let k = 0; k < seg; k++) {
      const a = k / seg * 6.2832, b = (k + 1) / seg * 6.2832;
      this.poly([[x + Math.cos(a) * r0, y + Math.sin(a) * r0, z0], [x + Math.cos(b) * r0, y + Math.sin(b) * r0, z0], [x + Math.cos(b) * r1, y + Math.sin(b) * r1, z1], [x + Math.cos(a) * r1, y + Math.sin(a) * r1, z1]].filter((p, i) => r1 > 0.01 || i < 3), C, c);
    }
    if (top && r1 > 0.01) { const p = []; for (let k = 0; k < seg; k++) p.push([x + Math.cos(k / seg * 6.2832) * r1, y + Math.sin(k / seg * 6.2832) * r1, z1]); this.poly(p, C, cTop || c); }
  }
  /** Ellipsoid aus Flächen (flach schattiert); var = Farbstreuung je Fläche, jit = Unregelmäßigkeit */
  blob(x, y, z, rx, ry, rz, c, seg = 8, ring = 5, rng = Math.random, vari = 0, jit = 0, colOf) {
    const P = [];
    for (let i = 0; i <= ring; i++) {
      const ph = i / ring * Math.PI, row = [];
      for (let j = 0; j < seg; j++) {
        const th = j / seg * 6.2832 + (i % 2) * 0.3, k = (i === 0 || i === ring) ? 1 : 1 + (rng() - 0.5) * jit;
        row.push([x + rx * Math.sin(ph) * Math.cos(th) * k, y + ry * Math.sin(ph) * Math.sin(th) * k, z + rz * Math.cos(ph) * k]);
      }
      P.push(row);
    }
    const C = [x, y, z];
    for (let i = 0; i < ring; i++) for (let j = 0; j < seg; j++) {
      const a = P[i][j], b = P[i][(j + 1) % seg], d = P[i + 1][(j + 1) % seg], e = P[i + 1][j];
      const pts = i === 0 ? [a, d, e] : i === ring - 1 ? [a, b, e] : [a, b, d, e];
      const f = 1 + (rng() - 0.5) * vari, cc = colOf ? colOf(pts, C) : c;
      this.poly(pts, C, [cc[0] * f, cc[1] * f, cc[2] * f]);
    }
  }
}
const c255 = a => [a[0] / 255, a[1] / 255, a[2] / 255];
const mulA = (a, k) => [a[0] * k, a[1] * k, a[2] * k];

/* ---------- Autos als Netze (aus den 2D-Modellen in CAR3D) ---------- */
const CP_CARS = {};
function cpCarMesh(shape, own) {
  const key = shape + (own ? '_own' : '');
  if (CP_CARS[key]) return CP_CARS[key];
  const M = CAR3D[shape] || CAR3D.coupe, mb = new MeshB();
  const matOf = m => {
    switch (m) {
      case 'paint': return [[0, 0, 0], 1, [0.85, 0, 0, 0]];
      case 'paint2': return [[0, 0, 0], 0.58, [0.4, 0, 0, 0]];
      case 'accent': return [[0.1, 0.1, 0.1], 1.3, [0.85, 0, 0, 0]];
      case 'suit': return [[0.43, 0.43, 0.43], 0.5, [0, 0, 0, 0]];
      case 'head': return [[1, 0.96, 0.82], 0, [0, 1, 0, 0]];
      case 'cyan': return [[0.75, 0.94, 1], 0, [0, 1, 0, 0]];
      case 'tail': return [[0.6, 0.08, 0.08], 0, [0, 1, 1, 0]];
      case 'glass': return [[0.07, 0.1, 0.15], 0, [1, 0, 0, 1]];
      default: { const b = CAR_MAT[m] || CAR_MAT.dark; return [c255(b), 0, [b[3], 0, 0, 0]]; }
    }
  };
  const add = (list, ox = 0, oy = 0, C = [0, 0, 4]) => {
    for (const f of list) {
      if (f.t === 0) {
        const [c, pt, mt] = matOf(f.m);
        mb.poly(f.p.map(p => [p[0] + ox, p[1] + oy, p[2]]), null, c, pt, mt, f.n);
      } else if (f.t === 1) {
        if (f.m === 'seam' || own) continue;
        const d = v3sub(f.b, f.a), side = vnorm(v3cross(d, f.n)), h = f.w / 2, [c, pt, mt] = matOf(f.m);
        const q = [[f.a[0] - side[0] * h, f.a[1] - side[1] * h, f.a[2] - side[2] * h], [f.b[0] - side[0] * h, f.b[1] - side[1] * h, f.b[2] - side[2] * h], [f.b[0] + side[0] * h, f.b[1] + side[1] * h, f.b[2] + side[2] * h], [f.a[0] + side[0] * h, f.a[1] + side[1] * h, f.a[2] + side[2] * h]];
        mb.poly(q, null, c, pt, mt, f.n);
      } else if (f.t === 2 && !own) {
        const r = f.r, cx = f.c[0], cy = f.c[1], cz = f.c[2];
        mb.blob(cx, cy, cz, r, r, r, [0, 0, 0], 8, 5, () => 0.5, 0, 0);
        // Farben nachträglich setzen: Helm in Lackfarbe, Visier dunkel
        const start = mb.v.length / 14 - 8 * 5 * 4;
        for (let k = Math.max(0, start); k < mb.v.length / 14; k++) {
          const o = k * 14, dx = (mb.v[o] - cx) / r, dz = (mb.v[o + 2] - cz) / r;
          if (f.visor && dx > 0.45 && dz > -0.35 && dz < 0.55) { mb.v[o + 6] = 0.08; mb.v[o + 7] = 0.1; mb.v[o + 8] = 0.14; mb.v[o + 9] = 0; mb.v[o + 13] = 1; mb.v[o + 10] = 1; }
          else { mb.v[o + 6] = mb.v[o + 7] = mb.v[o + 8] = 0; mb.v[o + 9] = 1; mb.v[o + 10] = 0.8; }
        }
      }
    }
  };
  add(M.pre);
  for (const w of M.wheels) { add(w.pre, w.x, w.y); add(w.disc, w.x, w.y); if (w.arch) add([w.arch]); }
  add(M.hull); add(M.deck); add(M.gh); add(M.post);
  return (CP_CARS[key] = mb);
}
function cpShadowMesh(shape) {
  const key = shape + '_sh'; if (CP_CARS[key]) return CP_CARS[key];
  const M = CAR3D[shape] || CAR3D.coupe, mb = new MeshB(), o = M.outline, n = o.length;
  for (let i = 0; i < n; i++) { const a = o[i], b = o[(i + 1) % n]; mb.poly([[0, 0, 0.25], [a[0] * 1.05, a[1] * 1.12, 0.25], [b[0] * 1.05, b[1] * 1.12, 0.25]], null, [0, 0, 0], 0, [0, 1, 0, 0], [0, 0, 1]); }
  return (CP_CARS[key] = mb);
}

/* ---------- Strecke: Objekte, Rand, Berge ---------- */
function cpWorldMesh(race) {
  const t = race.rt.src, rt = race.rt, theme = t.theme, mb = new MeshB();
  const rngAt = (o, k = 0) => mulberry32((Math.floor(o.x * 13 + o.y * 7 + k * 101) >>> 0) + 1);
  const hues = theme === 'city' ? [[47, 108, 54], [58, 112, 50], [42, 98, 60]] : theme === 'desert' ? [[74, 140, 60], [96, 142, 58]] : [[50, 124, 48], [72, 134, 44], [40, 110, 58], [86, 138, 50]];
  const bc = theme === 'city' ? [150, 154, 160] : theme === 'desert' ? [176, 132, 92] : theme === 'snow' ? [210, 216, 226] : [70, 120, 60];
  // Begrenzung rund um die Welt
  const wc = c255(bc), wt = c255(mulA(bc, 1.12));
  mb.box(W / 2, -3, 0, 0, -W / 2 - 4, W / 2 + 4, -3, 3, -2, 8, wc, wt); mb.box(W / 2, H + 3, 0, 0, -W / 2 - 4, W / 2 + 4, -3, 3, -2, 8, wc, wt);
  mb.box(-2, H / 2, 0, 0, -2, 2, -H / 2, H / 2, -2, 8, wc, wt); mb.box(W + 2, H / 2, 0, 0, -2, 2, -H / 2, H / 2, -2, 8, wc, wt);
  // Abstand zur Ideallinie (für die Ausrichtung der Tribünen)
  const trackD = (x, y) => { let b = 1e9; for (let i = 0; i < rt.n; i += 3) b = Math.min(b, (rt.lx[i] - x) ** 2 + (rt.ly[i] - y) ** 2); return b; };
  for (const o of t.objects) {
    const zb = o.t === 'bridge' ? 0 : terrainH(t, o.x, o.y), rng = rngAt(o), a = o.a || 0, ca = Math.cos(a), sa = Math.sin(a);
    const Wp = (lx, ly) => [o.x + lx * ca - ly * sa, o.y + lx * sa + ly * ca];
    switch (o.t) {
      case 'tree': {
        const r = o.w / 2;
        if (theme === 'snow') {
          mb.cyl(o.x, o.y, zb, zb + o.w * 0.35, Math.max(1.5, o.w * 0.07), Math.max(1.2, o.w * 0.05), c255([92, 62, 38]));
          const g = c255([30, 74, 52]);
          [[0.25, 0.75, 1], [0.55, 1.05, 0.74], [0.85, 1.35, 0.46]].forEach(([a0, a1, k], i) => {
            mb.cyl(o.x, o.y, zb + o.w * a0, zb + o.w * a1, r * k, 0, g.map(v => v * (1 + i * 0.12)), 9, false);
            mb.cyl(o.x, o.y, zb + o.w * (a0 + (a1 - a0) * 0.62), zb + o.w * a1, r * k * 0.38, 0, [0.94, 0.96, 1], 9, false);
          });
        } else if (theme === 'desert') {
          const top = o.w * 1.05, tx = o.x + 2, ty = o.y - 1;
          mb.cyl(o.x, o.y, zb, zb + top, Math.max(1.4, o.w * 0.06), Math.max(1, o.w * 0.04), c255([122, 90, 54]), 6, false);
          for (let k = 0; k < 7; k++) {
            const an = k / 7 * 6.2832 + rng(), L = r * (0.9 + rng() * 0.3), dx = Math.cos(an), dy = Math.sin(an), px = -dy, py = dx, wdt = r * 0.16;
            const p0 = [tx, ty, zb + top], p1 = [tx + dx * L * 0.5 + px * wdt, ty + dy * L * 0.5 + py * wdt, zb + top + r * 0.18], p2 = [tx + dx * L, ty + dy * L, zb + top - r * 0.45], p3 = [tx + dx * L * 0.5 - px * wdt, ty + dy * L * 0.5 - py * wdt, zb + top + r * 0.18];
            const g = c255(mulA(hues[k % hues.length], 0.95 + rng() * 0.2));
            mb.poly([p0, p1, p2, p3], null, g, 0, null, [0, 0, 1]); mb.poly([p0, p1, p2, p3], null, g.map(v => v * 0.7), 0, null, [0, 0, -1]);
          }
        } else {
          mb.cyl(o.x, o.y, zb, zb + o.w * 0.6, Math.max(1.6, o.w * 0.08), Math.max(1.2, o.w * 0.06), c255([96, 66, 40]));
          const g = c255(hues[rng() * hues.length | 0]);
          mb.blob(o.x, o.y, zb + o.w * 0.78, r * 1.0, r * 1.0, r * 0.62, g, 9, 5, rng, 0.35, 0.28, (pts, C) => { let z = 0; for (const p of pts) z += p[2]; z /= pts.length; return g.map(v => v * (0.82 + 0.4 * clamp((z - C[2]) / r + 0.4, 0, 1))); });
          mb.blob(o.x - r * 0.15, o.y - r * 0.1, zb + o.w * 1.02, r * 0.62, r * 0.62, r * 0.42, g.map(v => v * 1.12), 7, 4, rng, 0.3, 0.25);
        }
        break;
      }
      case 'bush': { const g = c255(mulA(hues[rng() * hues.length | 0], 0.9)); mb.blob(o.x, o.y, zb + o.w * 0.18, o.w * 0.5, o.w * 0.5, o.w * 0.3, g, 7, 4, rng, 0.3, 0.3); break; }
      case 'rock': { const base = theme === 'desert' ? [168, 118, 78] : theme === 'snow' ? [132, 136, 146] : [140, 142, 148]; mb.blob(o.x, o.y, zb + o.w * 0.08, o.w * 0.5, o.w * 0.45, o.w * 0.36, c255(base), 7, 4, rng, 0.25, 0.4); break; }
      case 'tires': {
        const r = o.w / 2 * 0.92;
        for (let k = 0; k < 3; k++) {
          mb.cyl(o.x, o.y, zb + k * 3.1, zb + k * 3.1 + 1.4, r * 0.94, r, c255([52, 54, 60]), 14, false);
          mb.cyl(o.x, o.y, zb + k * 3.1 + 1.4, zb + k * 3.1 + 2.9, r, r * 0.94, c255([44, 46, 52]), 14, false);
        }
        mb.cyl(o.x, o.y, zb + 9.25, zb + 9.3, r * 0.94, r * 0.94, c255([60, 62, 68]), 14, true, c255([20, 20, 22]));
        mb.cyl(o.x, o.y, zb + 9.3, zb + 9.35, r * 0.5, r * 0.5, c255([20, 20, 22]), 14, true, c255([14, 14, 16]));
        if (rng() < 0.5) mb.cyl(o.x, o.y, zb + 6.2, zb + 6.9, r * 1.005, r * 1.005, [0.9, 0.9, 0.88], 14, false);
        break;
      }
      case 'house': {
        const walls = HOUSE_WALL[theme] || HOUSE_WALL.meadow, roofs = HOUSE_ROOF[theme] || HOUSE_ROOF.meadow;
        const wc2 = c255(walls[rng() * walls.length | 0]), rc = c255(roofs[rng() * roofs.length | 0]);
        const wh = o.pit ? 15 : 18 + (o.w > 52 ? 4 : 0), hw = o.w / 2, hh = o.h / 2;
        mb.box(o.x, o.y, a, zb, -hw, hw, -hh, hh, -2, wh, wc2, o.pit ? c255([120, 124, 132]) : wc2);
        // Fenster
        for (let k = -2; k <= 2; k++) for (const s of [-1, 1]) { const lx = k * hw * 0.36; if (Math.abs(lx) > hw - 5) continue; mb.box(o.x, o.y, a, zb, lx - 2.6, lx + 2.6, s * hh - 0.3, s * hh + 0.3, wh * 0.42, wh * 0.78, c255([44, 56, 74])); }
        if (o.pit) {
          // Boxengarage: offene Tore, Schild
          mb.box(o.x, o.y, a, zb, -hw + 2, hw - 2, -hh - 0.4, -hh + 0.4, 0, wh * 0.68, c255([30, 32, 38]));
        } else {
          const along = o.w >= o.h, rh = 10, C = [o.x, o.y, zb + wh];
          const R = (lx, ly, z) => { const p = Wp(lx, ly); return [p[0], p[1], zb + z]; };
          if (along) {
            mb.poly([R(-hw - 1, -hh - 1, wh), R(hw + 1, -hh - 1, wh), R(hw + 1, 0, wh + rh), R(-hw - 1, 0, wh + rh)], C, rc);
            mb.poly([R(-hw - 1, hh + 1, wh), R(hw + 1, hh + 1, wh), R(hw + 1, 0, wh + rh), R(-hw - 1, 0, wh + rh)], C, rc.map(v => v * 0.82));
            mb.poly([R(-hw, -hh, wh), R(-hw, hh, wh), R(-hw, 0, wh + rh)], C, wc2); mb.poly([R(hw, -hh, wh), R(hw, hh, wh), R(hw, 0, wh + rh)], C, wc2);
          } else {
            mb.poly([R(-hw - 1, -hh - 1, wh), R(-hw - 1, hh + 1, wh), R(0, hh + 1, wh + rh), R(0, -hh - 1, wh + rh)], C, rc);
            mb.poly([R(hw + 1, -hh - 1, wh), R(hw + 1, hh + 1, wh), R(0, hh + 1, wh + rh), R(0, -hh - 1, wh + rh)], C, rc.map(v => v * 0.82));
            mb.poly([R(-hw, -hh, wh), R(hw, -hh, wh), R(0, -hh, wh + rh)], C, wc2); mb.poly([R(-hw, hh, wh), R(hw, hh, wh), R(0, hh, wh + rh)], C, wc2);
          }
        }
        break;
      }
      case 'wall': mb.box(o.x, o.y, a, zb, -o.w / 2, o.w / 2, -o.h / 2, o.h / 2, -2, 12, c255(mulA(bc, theme === 'meadow' ? 1.9 : 0.95)), c255(mulA(bc, theme === 'meadow' ? 2.1 : 1.08))); break;
      case 'rail': {
        for (let lx = -o.w / 2; lx <= o.w / 2 + 0.1; lx += 8) mb.box(o.x, o.y, a, zb, lx - 0.6, lx + 0.6, -0.6, 0.6, -1, 6, c255([90, 94, 102]));
        mb.box(o.x, o.y, a, zb, -o.w / 2, o.w / 2, -o.h / 2, -o.h / 2 + 1, 3, 7, c255([196, 202, 210]), c255([220, 224, 230]));
        break;
      }
      case 'banner': { const pal = [[214, 54, 48], [36, 112, 200], [242, 196, 40], [40, 160, 90], [240, 240, 236]]; mb.box(o.x, o.y, a, zb, -o.w / 2, o.w / 2, -0.8, 0.8, 0, 8, c255(pal[rng() * pal.length | 0])); break; }
      case 'fence': {
        const fc = theme === 'city' ? [120, 126, 136] : [126, 92, 60];
        for (let lx = -o.w / 2; lx <= o.w / 2 + 0.1; lx += 8) mb.box(o.x, o.y, a, zb, lx - 0.6, lx + 0.6, -0.6, 0.6, -1, 12, c255(fc));
        for (const z of [4, 9.5]) mb.box(o.x, o.y, a, zb, -o.w / 2, o.w / 2, -0.35, 0.35, z, z + 1.2, c255(mulA(fc, 1.1)));
        break;
      }
      case 'stand': {
        // Stufen steigen zur streckenabgewandten Seite an
        const A = Wp(0, o.h / 2 + 30), B = Wp(0, -o.h / 2 - 30), sd = trackD(A[0], A[1]) > trackD(B[0], B[1]) ? 1 : -1;
        const hw = o.w / 2, d = o.h / 6, pal = [[230, 60, 50], [40, 110, 210], [250, 210, 60], [240, 240, 240], [50, 170, 90], [30, 30, 36], [250, 140, 40]];
        for (let k = 0; k < 6; k++) {
          const y0 = -sd * o.h / 2 + sd * k * d, y1 = y0 + sd * d, z1 = 3 + k * 4.4;
          mb.box(o.x, o.y, a, zb, -hw, hw, Math.min(y0, y1), Math.max(y0, y1), -1, z1, c255([150, 154, 162]), c255([186, 190, 198]));
          if (k < 5) for (let lx = -hw + 2.5; lx < hw - 1; lx += 3.6) {
            if (rng() < 0.18) continue;
            const yy = (y0 + y1) / 2, c = c255(pal[rng() * pal.length | 0]);
            mb.box(o.x, o.y, a, zb, lx - 0.9, lx + 0.9, yy - 0.9, yy + 0.9, z1, z1 + 2.6, c);
            mb.box(o.x, o.y, a, zb, lx - 0.6, lx + 0.6, yy - 0.6, yy + 0.6, z1 + 2.6, z1 + 3.6, c255([226, 184, 150]));
          }
        }
        const yb = sd * o.h / 2;
        mb.box(o.x, o.y, a, zb, -hw, hw, Math.min(yb, yb + sd * 1.2), Math.max(yb, yb + sd * 1.2), -1, 34, c255([120, 124, 132]));
        mb.box(o.x, o.y, a, zb, -hw - 2, hw + 2, -o.h / 2 - 3, o.h / 2 + 3, 34, 35.5, c255([196, 60, 50]), c255([220, 74, 60]));
        for (const lx of [-hw, 0, hw]) mb.box(o.x, o.y, a, zb, lx - 0.7, lx + 0.7, -sd * o.h / 2 - 0.7, -sd * o.h / 2 + 0.7, -1, 34, c255([90, 94, 102]));
        break;
      }
      case 'flag': {
        mb.cyl(o.x, o.y, zb, zb + 34, 0.7, 0.6, c255([230, 232, 236]), 5);
        const pal = [[214, 54, 48], [36, 112, 200], [242, 196, 40], [40, 160, 90]], c = c255(pal[rng() * pal.length | 0]);
        const q = [[o.x, o.y, zb + 33], [o.x + 9, o.y + 2, zb + 31], [o.x + 9, o.y + 2, zb + 26], [o.x, o.y, zb + 27]];
        mb.poly(q, null, c, 0, null, [-0.2, 1, 0]); mb.poly(q, null, c.map(v => v * 0.8), 0, null, [0.2, -1, 0]);
        break;
      }
      case 'lamp': {
        mb.box(o.x, o.y, a, zb, -0.9, 0.9, -0.9, 0.9, -1, 34, c255([70, 76, 86]));
        mb.box(o.x, o.y, a, zb, -0.5, 9, -0.6, 0.6, 33.5, 35, c255([80, 86, 96]));
        mb.box(o.x, o.y, a, zb, 6.5, 10.5, -1.8, 1.8, 32, 34.5, c255([60, 64, 72]));
        const p = Wp(8.5, 0); const s = mb.v.length; mb.poly([[p[0] - 1.6 * ca + 1.4 * sa, p[1] - 1.6 * sa - 1.4 * ca, zb + 31.9], [p[0] + 1.6 * ca + 1.4 * sa, p[1] + 1.6 * sa - 1.4 * ca, zb + 31.9], [p[0] + 1.6 * ca - 1.4 * sa, p[1] + 1.6 * sa + 1.4 * ca, zb + 31.9], [p[0] - 1.6 * ca - 1.4 * sa, p[1] - 1.6 * sa + 1.4 * ca, zb + 31.9]], null, [1, 0.95, 0.78], 0, [0, 1, 0, 0], [0, 0, -1]);
        break;
      }
      case 'container': {
        const n = containerStack(o);
        for (let k = 0; k < n; k++) {
          const col = c255(k ? CONTAINER_COL[((o.c || 0) + 2) % CONTAINER_COL.length] : CONTAINER_COL[(o.c || 0) % CONTAINER_COL.length]);
          mb.box(o.x, o.y, a, zb, -o.w / 2, o.w / 2, -o.h / 2, o.h / 2, k * 16 - (k ? 0 : 1), k * 16 + 15.5, col, col.map(v => v * 1.12));
          for (let lx = -o.w / 2 + 3; lx < o.w / 2 - 2; lx += 3) mb.box(o.x, o.y, a, zb, lx - 0.4, lx + 0.4, -o.h / 2 - 0.25, o.h / 2 + 0.25, k * 16 + 1, k * 16 + 14.5, col.map(v => v * 0.82));
        }
        break;
      }
      case 'gate': {
        for (const s of [-1, 1]) mb.box(o.x, o.y, a, zb, s * o.w / 2 - 1.2, s * o.w / 2 + 1.2, -1.2, 1.2, -1, 12, c255([200, 60, 50]));
        break;
      }
      case 'bridge': {
        const z = o.z || 30, hw = o.w / 2, hh = o.h / 2;
        mb.box(o.x, o.y, a, 0, -hw, hw, -hh, hh, z - 5, z - 0.05, c255([168, 168, 162]), c255([74, 76, 80]));
        for (const s of [-1, 1]) {
          mb.box(o.x, o.y, a, 0, -hw, hw, s * hh - 1, s * hh + 1, z - 0.05, z + 5, c255([186, 186, 180]));
          for (const k of [-0.28, 0.28]) { const p = Wp(k * o.w, s * hh * 0.6); mb.box(p[0], p[1], a, 0, -3, 3, -3, 3, -10, z - 5, c255([150, 150, 144])); }
        }
        for (let lx = -hw + 6; lx < hw - 4; lx += 14) mb.box(o.x, o.y, a, 0, lx, lx + 7, -0.5, 0.5, z, z + 0.06, [0.92, 0.92, 0.88]);
        break;
      }
    }
  }
  // Rampen: Oberfläche nach rampHeight
  for (const r of rt.ramps) {
    const ca = Math.cos(r.a), sa = Math.sin(r.a), Wp = (lx, ly, h) => [r.x + lx * ca - ly * sa, r.y + lx * sa + ly * ca, r.base + h];
    const hx = r.w / 2, hy = r.h / 2, top = c255([196, 160, 64]), side = c255([120, 100, 70]), C = Wp(0, 0, r.z * 0.3);
    mb.poly([Wp(-hx, -hy, 0), Wp(hx, -hy, r.z), Wp(hx, hy, r.z), Wp(-hx, hy, 0)], C, top);
    mb.poly([Wp(hx, -hy, -2), Wp(hx, hy, -2), Wp(hx, hy, r.z), Wp(hx, -hy, r.z)], C, side);
    for (const s of [-1, 1]) mb.poly([Wp(-hx, s * hy, -2), Wp(hx, s * hy, -2), Wp(hx, s * hy, r.z)], C, side.map(v => v * 0.9));
    for (let k = 1; k < 6; k++) { const lx = -hx + k / 6 * r.w; mb.poly([Wp(lx, -hy, r.z * k / 6 + 0.08), Wp(lx + r.w / 24, -hy, r.z * (k / 6 + 1 / 24) + 0.08), Wp(lx + r.w / 24, hy, r.z * (k / 6 + 1 / 24) + 0.08), Wp(lx, hy, r.z * k / 6 + 0.08)], C, [0.14, 0.14, 0.16]); }
  }
  // Power-up-Felder
  for (const p of race.pads || []) {
    const ca = Math.cos(p.a), sa = Math.sin(p.a), z = terrainH(t, p.x, p.y) + 0.15, Q = (lx, ly) => [p.x + lx * ca - ly * sa, p.y + lx * sa + ly * ca, z];
    for (let k = 0; k < 3; k++) { const x0 = -6 + k * 5; mb.poly([Q(x0, -6), Q(x0 + 4, 0), Q(x0, 6), Q(x0 - 2, 6), Q(x0 + 2, 0), Q(x0 - 2, -6)].reverse(), null, [0.3, 0.85, 1], 0, [0, 1, 0, 0], [0, 0, 1]); }
  }
  return mb;
}
/** Berge/Skyline am Horizont: zwei Ringe weit außerhalb der Welt */
function cpHorizonMesh(race, SC) {
  const t = race.rt.src, theme = THEME_SKY[t.look] ? t.look : t.theme, mb = new MeshB(), rng = mulberry32(t.name.length * 31 + 7);
  const cx = W / 2, cy = H / 2;
  const ring = (R, hMin, hMax, col, seg, style, colTop) => {
    let h0 = null; const hs = [];
    for (let k = 0; k <= seg; k++) {
      if (k === seg) { hs.push(hs[0]); break; }
      let h;
      if (style === 'block') h = rng() < 0.25 ? hMin * 0.4 : hMin + rng() * (hMax - hMin);
      else if (style === 'mesa') h = (Math.floor(k / 3) % 2 ? hMin * 0.4 : hMin + (hMax - hMin) * (0.6 + rng() * 0.4));
      else h = hMin + (hMax - hMin) * (0.5 + 0.5 * Math.sin(k * 0.45 + rng() * 0.8) * Math.sin(k * 0.13 + 1.3)) + rng() * (hMax - hMin) * 0.25;
      hs.push(h);
    }
    for (let k = 0; k < seg; k++) {
      const a0 = k / seg * 6.2832, a1 = (k + 1) / seg * 6.2832, p0 = [cx + Math.cos(a0) * R, cy + Math.sin(a0) * R], p1 = [cx + Math.cos(a1) * R, cy + Math.sin(a1) * R];
      const h1 = style === 'block' ? hs[k] : hs[k + 1], C = [cx, cy, 0], cTop = colTop || col;
      const b0 = mb.vert([p0[0], p0[1], -20], [0, 0, 1], col, 0, [0, 1, 0, 0]), b1 = mb.vert([p1[0], p1[1], -20], [0, 0, 1], col, 0, [0, 1, 0, 0]);
      const k0 = Math.min(1, hs[k] / hMax), k1 = Math.min(1, h1 / hMax);
      const t0 = mb.vert([p0[0], p0[1], hs[k]], [0, 0, 1], mix(col, cTop, k0), 0, [0, 1, 0, 0]), t1 = mb.vert([p1[0], p1[1], h1], [0, 0, 1], mix(col, cTop, k1), 0, [0, 1, 0, 0]);
      mb.i.push(b0, b1, t1, b0, t1, t0);
    }
  };
  const far = c255(SC.far), near = c255(SC.near);
  const style = theme === 'city' ? 'block' : theme === 'desert' ? 'mesa' : 'jag';
  ring(4200, 260, 760, far, 72, style === 'block' ? 'jag' : style, theme === 'snow' || theme === 'meadow' ? mix(far, [0.95, 0.96, 1], 0.55) : null);
  ring(2600, 90, 300, near, 90, style, null);
  return mb;
}
/** Kachel der häufigsten Randfläche (Umland außerhalb der Welt) */
function cpTileCanvas(t, wx) {
  const cnt = new Array(SURF.length).fill(0);
  for (let x = 0; x < GW; x++) { cnt[t.grid[x]]++; cnt[t.grid[(GH - 1) * GW + x]]++; }
  for (let y = 0; y < GH; y++) { cnt[t.grid[y * GW]]++; cnt[t.grid[y * GW + GW - 1]]++; }
  const baseType = cnt.indexOf(Math.max(...cnt)), cv = document.createElement('canvas'); cv.width = cv.height = 128;
  const g = cv.getContext('2d'), im = g.createImageData(128, 128), col = [0, 0, 0], dk = wx.sky === 'rain' ? 0.78 : 0.94;
  SURF_TILE = true;
  for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) { surfColor(baseType, x + 4000, y + 4000, t.theme, col); const i = (y * 128 + x) * 4; im.data[i] = col[0] * dk; im.data[i + 1] = col[1] * dk; im.data[i + 2] = col[2] * dk; im.data[i + 3] = 255; }
  SURF_TILE = false;
  g.putImageData(im, 0, 0);
  return cv;
}

/* ---------- Shader ---------- */
const CP_LIGHT = `
uniform vec3 uSun, uSunC, uAmb, uEye, uFogC, uHP, uHD; uniform vec2 uFogD; uniform float uNight, uFogMul;
uniform vec4 uLamp[24]; uniform int uNL;
vec3 light(vec3 base, vec3 n, vec3 p, float spec, float glass) {
  vec3 V = normalize(uEye - p);
  float d = max(dot(n, uSun), 0.0);
  vec3 c = base * (uAmb + uSunC * d);
  vec3 H = normalize(uSun + V);
  c += uSunC * pow(max(dot(n, H), 0.0), 40.0) * spec * 0.7;
  if (glass > 0.5) { float fr = 0.12 + 0.55 * pow(1.0 - max(dot(n, V), 0.0), 2.0); c = mix(c, uFogC, fr); }
  if (uNight > 0.0) {
    vec3 L = p - uHP; float dist = length(L); vec3 l = L / max(dist, 0.001);
    float cone = smoothstep(0.80, 0.95, dot(l, uHD)) * clamp(1.0 - dist / 380.0, 0.0, 1.0);
    c += base * cone * uNight * 1.7 * max(dot(n, -l), 0.3);
    for (int i = 0; i < 24; i++) { if (i >= uNL) break; vec3 q = p - uLamp[i].xyz; float dd = length(q); c += base * vec3(1.0, 0.86, 0.6) * uNight * 1.3 * clamp(1.0 - dd / 90.0, 0.0, 1.0) * max(dot(n, -q / max(dd, 0.001)), 0.35); }
  }
  return c;
}
vec3 fog(vec3 c, vec3 p) { float f = clamp((length(p - uEye) - uFogD.x) / (uFogD.y - uFogD.x), 0.0, 1.0) * uFogMul; return mix(c, uFogC, f); }
`;
const CP_VS_LIT = `#version 300 es
layout(location=0) in vec3 aPos; layout(location=1) in vec3 aNrm; layout(location=2) in vec3 aCol; layout(location=3) in float aPaint; layout(location=4) in vec4 aMat;
uniform mat4 uVP, uM; uniform vec3 uColor;
out vec3 vN, vCol, vW; out vec4 vMat;
void main() { vec4 w = uM * vec4(aPos, 1.0); vW = w.xyz; vN = mat3(uM) * aNrm; vCol = aCol + uColor * aPaint; vMat = aMat; gl_Position = uVP * w; }`;
const CP_FS_LIT = `#version 300 es
precision highp float;
${CP_LIGHT}
in vec3 vN, vCol, vW; in vec4 vMat; uniform float uBrake, uAlpha; out vec4 o;
void main() {
  vec3 n = normalize(vN); if (!gl_FrontFacing) n = -n;
  vec3 c;
  if (vMat.y > 0.5) { c = vCol * (1.0 + uNight * 0.5); if (vMat.z > 0.5) c = vCol * (0.75 + 0.9 * uBrake + 0.6 * uNight); }
  else c = light(vCol, n, vW, vMat.x, vMat.w);
  o = vec4(fog(c, vW), uAlpha);
}`;
const CP_VS_TER = `#version 300 es
layout(location=0) in vec3 aPos; layout(location=1) in vec3 aNrm; layout(location=2) in vec2 aUV;
uniform mat4 uVP; out vec3 vN, vW; out vec2 vUV;
void main() { vW = aPos; vN = aNrm; vUV = aUV; gl_Position = uVP * vec4(aPos, 1.0); }`;
const CP_FS_TER = `#version 300 es
precision highp float;
${CP_LIGHT}
in vec3 vN, vW; in vec2 vUV; uniform sampler2D uTex, uDet; out vec4 o;
void main() {
  vec3 base = texture(uTex, vUV).rgb;
  float dt = texture(uDet, vW.xy / 22.0).r;
  base *= 0.82 + 0.36 * dt;
  o = vec4(fog(light(base, normalize(vN), vW, 0.0, 0.0), vW), 1.0);
}`;
const CP_VS_SKY = `#version 300 es
layout(location=0) in vec2 aP; out vec2 vP; void main() { vP = aP; gl_Position = vec4(aP, 0.9999, 1.0); }`;
const CP_FS_SKY = `#version 300 es
precision highp float;
in vec2 vP; uniform vec3 uF, uR, uU, uTop, uBot, uSun; uniform vec2 uTan; uniform float uSunVis; out vec4 o;
void main() {
  vec3 d = normalize(uF + uR * vP.x * uTan.x + uU * vP.y * uTan.y);
  vec3 c = mix(uBot, uTop, smoothstep(-0.02, 0.5, d.z));
  float s = max(dot(d, uSun), 0.0);
  c += vec3(1.0, 0.95, 0.82) * (smoothstep(0.9993, 0.9996, s) * 1.6 + pow(s, 14.0) * 0.28) * uSunVis;
  o = vec4(c, 1.0);
}`;

/* ---------- Renderer ---------- */
const Cockpit = {
  gl: null, cv: null, failed: false, res: null, gear: 0,
  /** WebGL2 bereitstellen; false, wenn der Browser es nicht kann */
  init() {
    if (this.gl) return true;
    if (this.failed) return false;
    try {
      const cv = document.createElement('canvas'); cv.width = 16; cv.height = 16;
      const gl = cv.getContext('webgl2', { antialias: true, alpha: false, depth: true });
      if (!gl) { this.failed = true; return false; }
      const prog = (vs, fs) => {
        const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
        const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
        if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
        const U = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
        for (let i = 0; i < n; i++) { const nm = gl.getActiveUniform(p, i).name.replace('[0]', ''); U[nm] = gl.getUniformLocation(p, nm); }
        return { p, U };
      };
      this.pLit = prog(CP_VS_LIT, CP_FS_LIT); this.pTer = prog(CP_VS_TER, CP_FS_TER); this.pSky = prog(CP_VS_SKY, CP_FS_SKY);
      this.ani = gl.getExtension('EXT_texture_filter_anisotropic');
      // Vollbild-Dreieck für den Himmel
      this.skyVao = gl.createVertexArray(); gl.bindVertexArray(this.skyVao);
      const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0); gl.bindVertexArray(null);
      this.cv = cv; this.gl = gl; this.cars = {};
      this.det = this._tex(gl, grainTile(), true);
      return true;
    } catch (e) { console.warn('Cockpit-Ansicht nicht verfügbar:', e); this.failed = true; this.gl = null; return false; }
  },
  _tex(gl, src, repeat) {
    const tx = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tx);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    const wr = repeat ? gl.REPEAT : gl.CLAMP_TO_EDGE; gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wr); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wr);
    if (this.ani) gl.texParameterf(gl.TEXTURE_2D, this.ani.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, gl.getParameter(this.ani.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
    return tx;
  },
  upload(mb) {
    const gl = this.gl, vao = gl.createVertexArray(); gl.bindVertexArray(vao);
    const vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mb.v), gl.STATIC_DRAW);
    const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(mb.i), gl.STATIC_DRAW);
    const S = 56; [[0, 3, 0], [1, 3, 12], [2, 3, 24], [3, 1, 36], [4, 4, 40]].forEach(([l, n, o]) => { gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, n, gl.FLOAT, false, S, o); });
    gl.bindVertexArray(null);
    return { vao, vb, ib, n: mb.i.length };
  },
  free(m) { if (!m) return; const gl = this.gl; gl.deleteVertexArray(m.vao); gl.deleteBuffer(m.vb); gl.deleteBuffer(m.ib); },
  /** Gelände als Netz über dem Höhenraster, Textur = race.layers.flat */
  terrainMesh(t) {
    const gl = this.gl, hm = t.hm, h = (gx, gy) => hm ? hm[clamp(gy, 0, HMH - 1) * HMW + clamp(gx, 0, HMW - 1)] : 0;
    const v = new Float32Array(HMW * HMH * 8), idx = [];
    for (let gy = 0; gy < HMH; gy++) for (let gx = 0; gx < HMW; gx++) {
      const o = (gy * HMW + gx) * 8, nx = -(h(gx + 1, gy) - h(gx - 1, gy)) / (2 * HM), ny = -(h(gx, gy + 1) - h(gx, gy - 1)) / (2 * HM), l = Math.hypot(nx, ny, 1);
      v[o] = gx * HM; v[o + 1] = gy * HM; v[o + 2] = h(gx, gy); v[o + 3] = nx / l; v[o + 4] = ny / l; v[o + 5] = 1 / l; v[o + 6] = gx * HM / W; v[o + 7] = gy * HM / H;
      if (gx < HMW - 1 && gy < HMH - 1) { const i = gy * HMW + gx; idx.push(i, i + 1, i + HMW + 1, i, i + HMW + 1, i + HMW); }
    }
    return this.terUpload(v, idx);
  },
  farGroundMesh() {
    const E = 9000, v = new Float32Array([-E, -E, -0.6, 0, 0, 1, -E / 128, -E / 128, W + E, -E, -0.6, 0, 0, 1, (W + E) / 128, -E / 128, W + E, H + E, -0.6, 0, 0, 1, (W + E) / 128, (H + E) / 128, -E, H + E, -0.6, 0, 0, 1, -E / 128, (H + E) / 128]);
    return this.terUpload(v, [0, 1, 2, 0, 2, 3]);
  },
  terUpload(v, idx) {
    const gl = this.gl, vao = gl.createVertexArray(); gl.bindVertexArray(vao);
    const vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, v, gl.STATIC_DRAW);
    const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(idx), gl.STATIC_DRAW);
    [[0, 3, 0], [1, 3, 12], [2, 2, 24]].forEach(([l, n, o]) => { gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, n, gl.FLOAT, false, 32, o); });
    gl.bindVertexArray(null);
    return { vao, vb, ib, n: idx.length };
  },
  /** Ressourcen für ein Rennen anlegen (oder nach einem Szenen-Neubau die Bodentextur erneuern) */
  prepare(race) {
    const gl = this.gl, R = this.res;
    if (R && R.race === race) {
      if (R.flat !== race.layers.flat) { gl.deleteTexture(R.tex); R.tex = this._tex(gl, race.layers.flat, false); R.flat = race.layers.flat; }
      return R;
    }
    if (R) { gl.deleteTexture(R.tex); gl.deleteTexture(R.tile); for (const k of ['ter', 'far', 'world', 'hor']) this.free(R[k]); }
    const t = race.rt.src, wx = race.weather, look = THEME_SKY[t.look] ? t.look : THEME_SKY[t.theme] ? t.theme : 'meadow', SC = skyColors(look, wx);
    const lamps = t.objects.filter(o => o.t === 'lamp').slice(0, 24).map(o => [o.x + Math.cos(o.a) * 8.5, o.y + Math.sin(o.a) * 8.5, terrainH(t, o.x, o.y) + 28]);
    this.res = {
      race, flat: race.layers.flat, SC, lamps,
      tex: this._tex(gl, race.layers.flat, false), tile: this._tex(gl, cpTileCanvas(t, wx), true),
      ter: this.terrainMesh(t), far: this.farGroundMesh(), world: this.upload(cpWorldMesh(race)), hor: this.upload(cpHorizonMesh(race, SC))
    };
    return this.res;
  },
  carVao(shape, own) {
    const k = shape + (own ? '_own' : '');
    return this.cars[k] || (this.cars[k] = this.upload(cpCarMesh(shape, own)));
  },
  shadowVao(shape) { const k = shape + '_sh'; return this.cars[k] || (this.cars[k] = this.upload(cpShadowMesh(shape))); },
  unit(k) {
    if (this.cars[k]) return this.cars[k];
    const mb = new MeshB();
    if (k === 'pubox') { mb.box(0, 0, 0, 0, -5, 5, -5, 5, -5, 5, [1, 0.69, 0.18], [1, 0.8, 0.3]); mb.box(0, 0, 0, 0, -5.2, 5.2, -1.2, 1.2, -5.2, 5.2, [1, 1, 1]); }
    else if (k === 'slick') { const p = []; for (let i = 0; i < 14; i++) p.push([Math.cos(i / 14 * 6.2832) * 15, Math.sin(i / 14 * 6.2832) * 11, 0.2]); mb.poly(p, null, [0.06, 0.06, 0.09], 0, [0.9, 0, 0, 1], [0, 0, 1]); }
    else if (k === 'gatebar') { mb.box(0, 0, 0, 0, 0, 1, -0.7, 0.7, -0.7, 0.7, [0.95, 0.95, 0.95]); for (let i = 0; i < 4; i++) mb.box(0, 0, 0, 0, 0.12 + i * 0.25, 0.24 + i * 0.25, -0.75, 0.75, -0.75, 0.75, [0.85, 0.15, 0.12]); }
    else if (k === 'pennant') { const q = [[0, 0, 36], [9, 0, 33], [0, 0, 30]]; mb.poly(q, null, [0, 0, 0], 1, [0, 1, 0, 0], [0, 1, 0]); mb.poly(q, null, [0, 0, 0], 1, [0, 1, 0, 0], [0, -1, 0]); mb.cyl(0, 0, 0, 36, 0.6, 0.5, [0.92, 0.93, 0.95], 5); }
    return (this.cars[k] = this.upload(mb));
  },
  /** Ist die Cockpit-Ansicht für dieses Rennen aktiv? */
  active(race) {
    return isCockpitCam() && race && race.mode !== 'demo' && race.cars.filter(c => c.human >= 0).length === 1 && this.init();
  },
  /** Licht und Nebel je Wetter/Tageszeit */
  env(race) {
    const wx = race.weather, SC = this.res.SC;
    let amb = [0.55, 0.56, 0.6], sunC = [0.56, 0.54, 0.5], fog = [700, 2600], night = 0, sunVis = 1;
    if (wx.sky === 'cloudy') { amb = [0.78, 0.8, 0.84]; sunC = [0.24, 0.24, 0.24]; fog = [500, 2200]; sunVis = 0.15; }
    if (wx.sky === 'rain') { amb = [0.68, 0.7, 0.76]; sunC = [0.12, 0.12, 0.12]; fog = [180, 1300]; sunVis = 0; }
    if (wx.snow) fog = [140, 1000];
    if (wx.time === 'dusk') { amb = amb.map((v, i) => v * [0.62, 0.52, 0.6][i]); sunC = [0.62, 0.38, 0.22]; night = 0.35; sunVis *= 0.6; }
    if (wx.time === 'night') { amb = [0.16, 0.18, 0.28]; sunC = [0.03, 0.03, 0.05]; fog = [200, 1500]; night = 1; sunVis = 0; }
    return { amb, sunC, fog, night, sunVis, fogC: c255(SC.bot), top: c255(SC.top), bot: c255(SC.bot) };
  },
  /** Eine Ansicht rendern (Hauptbild oder Spiegel). vp = [x, y, w, h] in Pixeln (y von unten) */
  view(race, cam, vp, fovy, mirror, ownShape) {
    const gl = this.gl, R = this.res, E = this.envNow;
    gl.viewport(vp[0], vp[1], vp[2], vp[3]); gl.scissor(vp[0], vp[1], vp[2], vp[3]);
    gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT);
    const asp = vp[2] / vp[3], tanY = Math.tan(fovy / 2), tanX = tanY * asp;
    const r = mirror ? [-cam.r[0], -cam.r[1], -cam.r[2]] : cam.r;
    // Himmel
    gl.disable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE);
    gl.useProgram(this.pSky.p); const S = this.pSky.U;
    gl.uniform3fv(S.uF, cam.f); gl.uniform3fv(S.uR, r); gl.uniform3fv(S.uU, cam.u); gl.uniform2f(S.uTan, tanX, tanY);
    gl.uniform3fv(S.uTop, E.top); gl.uniform3fv(S.uBot, E.bot); gl.uniform3fv(S.uSun, this.sun); gl.uniform1f(S.uSunVis, E.sunVis);
    gl.bindVertexArray(this.skyVao); gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.enable(gl.DEPTH_TEST); gl.depthMask(true);
    let P = M4.persp(fovy, asp, 0.35, 9000);
    if (mirror) { P = M4.mulA(new Float32Array([-1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]), P); }
    const VP = M4.mulA(P, M4.view(cam.e, cam.f, cam.r, cam.u));
    const common = U => {
      gl.uniformMatrix4fv(U.uVP, false, VP); gl.uniform3fv(U.uSun, this.sun); gl.uniform3fv(U.uSunC, E.sunC); gl.uniform3fv(U.uAmb, E.amb); gl.uniform3fv(U.uEye, cam.e);
      gl.uniform3fv(U.uFogC, E.fogC); gl.uniform2f(U.uFogD, E.fog[0], E.fog[1]); gl.uniform1f(U.uNight, E.night); gl.uniform1f(U.uFogMul, 1);
      gl.uniform3fv(U.uHP, cam.hp); gl.uniform3fv(U.uHD, cam.hd);
      gl.uniform1i(U.uNL, E.night > 0 ? R.lamps.length : 0); if (R.lamps.length && U.uLamp) gl.uniform4fv(U.uLamp, new Float32Array(R.lamps.flatMap(l => [l[0], l[1], l[2], 0])));
    };
    // Boden
    gl.useProgram(this.pTer.p); common(this.pTer.U);
    gl.uniform1i(this.pTer.U.uTex, 0); gl.uniform1i(this.pTer.U.uDet, 1);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.det); gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, R.tile); gl.bindVertexArray(R.far.vao); gl.drawElements(gl.TRIANGLES, R.far.n, gl.UNSIGNED_INT, 0);
    gl.bindTexture(gl.TEXTURE_2D, R.tex); gl.bindVertexArray(R.ter.vao); gl.drawElements(gl.TRIANGLES, R.ter.n, gl.UNSIGNED_INT, 0);
    // Objekte, Horizont, Autos
    gl.useProgram(this.pLit.p); const U = this.pLit.U; common(U);
    const draw = (m, M, col = [0, 0, 0], brake = 0, alpha = 1) => { gl.uniformMatrix4fv(U.uM, false, M); gl.uniform3fv(U.uColor, col); gl.uniform1f(U.uBrake, brake); gl.uniform1f(U.uAlpha, alpha); gl.bindVertexArray(m.vao); gl.drawElements(gl.TRIANGLES, m.n, gl.UNSIGNED_INT, 0); };
    const I = M4.id();
    draw(R.world, I);
    gl.uniform1f(U.uFogMul, 0.25); draw(R.hor, I); gl.uniform1f(U.uFogMul, 1);
    // bewegliche Teile der Strecke
    for (const o of race.layers.dyn) {
      if (o.t === 'gate') { const op = gateOpenness(o, race.time), M = M4.model(o.x - Math.cos(o.a) * o.w / 2, o.y - Math.sin(o.a) * o.w / 2, (o.zb || 0) + 9, o.a, op * 3, 0); M[0] *= o.w; M[1] *= o.w; M[2] *= o.w; draw(this.unit('gatebar'), M); }
      else if (o.t === 'cpflag') { const hl = !!o.hl, col = hl ? (Math.sin(race.time * 8) > -0.3 ? [0.23, 0.92, 0.48] : [0.12, 0.6, 0.31]) : [1, 0.54, 0.17]; draw(this.unit('pennant'), M4.model(o.x, o.y, o.zb || 0, 0), col); }
    }
    if (race.powerups) {
      for (const b of race.boxes) if (!(b.t > 0)) draw(this.unit('pubox'), M4.model(b.x, b.y, PU.zAt(race, b.x, b.y) + 7 + Math.sin(race.time * 3 + b.spin) * 1.5, race.time * 1.6 + b.spin));
      for (const s of race.slicks) draw(this.unit('slick'), M4.model(s.x, s.y, terrainH(race.rt.src, s.x, s.y), s.a || 0));
    }
    gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK); gl.frontFace(mirror ? gl.CCW : gl.CW);
    const views = race.cars.map(c => carView(c, race));
    for (const v of views) {
      const own = v.car === cam.car, M = M4.model(v.x, v.y, v.z, v.a, v.pitch || 0, v.roll || 0);
      draw(this.carVao(v.shape, own && !mirror), M, c255(rgbOf(v.color)).map(x => x * (1 - (v.damage || 0) * 0.28)), v.brake ? 1 : 0, 1);
    }
    gl.disable(gl.CULL_FACE);
    // Schatten und Geist (durchscheinend)
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false);
    gl.enable(gl.POLYGON_OFFSET_FILL); gl.polygonOffset(-2, -4);
    if (race.weather.time !== 'night') for (const v of views) { if (v.alpha < 0.3) continue; draw(this.shadowVao(v.shape), M4.model(v.x, v.y, v.gz != null ? v.gz : v.z, v.a), [0, 0, 0], 0, 0.32 * Math.max(0.2, 1 - Math.max(0, v.z - v.gz) / 60)); }
    gl.disable(gl.POLYGON_OFFSET_FILL);
    const gv = race.mode === 'trial' ? ghostView(race) : null;
    if (gv) draw(this.carVao(gv.shape, false), M4.model(gv.x, gv.y, gv.z, gv.a), [0.75, 0.9, 1], 0, 0.4);
    gl.disable(gl.BLEND); gl.depthMask(true);
    gl.bindVertexArray(null);
  },
  /** Kamera am Augenpunkt des Autos */
  camera(race, car, off = [0, 0, 0], yaw = 0, back = false) {
    const v = carView(car, race), E = CP_EYE[v.shape] || CP_EYE.coupe, ca = Math.cos(v.a), sa = Math.sin(v.a);
    const lx = E[0] + off[0], ly = E[1] + off[1], lz = E[2] + off[2];
    const sp = clamp(carSpeed(car) / car.cls.maxSpeed, 0, 1.2);
    const rough = { [S.GRAVEL]: 1, [S.DIRT]: 0.8, [S.SAND]: 0.7, [S.GRASS]: 0.55, [S.SNOW]: 0.45, [S.ASH]: 0.8 }[car.surf] || 0.08;
    const bob = car.air ? 0 : (Math.sin(race.time * 47 + car.seed) * 0.6 + Math.sin(race.time * 29) * 0.4) * rough * sp * 0.35;
    const e = [v.x + lx * ca - ly * sa, v.y + lx * sa + ly * ca, v.z + lz + lx * (v.pitch || 0) + ly * (v.roll || 0) + bob];
    const a = v.a + yaw + (back ? Math.PI : 0), dz = back ? -(v.pitch || 0) : (v.pitch || 0);
    const f = vnorm([Math.cos(a), Math.sin(a), dz]);
    const r0 = [-Math.sin(a), Math.cos(a), back ? -(v.roll || 0) : (v.roll || 0)];
    const u = vnorm(v3cross(f, r0)), r = vnorm(v3cross(u, f));
    return { e, f, u, r, car, hp: [v.x + ca * 10, v.y + sa * 10, v.z + 4], hd: vnorm([ca, sa, -0.08 + (v.pitch || 0)]), sp, v };
  },
  /** Komplettes Bild: 3D-Welt, Spiegel und Cockpit */
  draw(ctx, race) {
    const car = race.cars.find(c => c.human >= 0), gl = this.gl;
    const q = Gfx.level(), s = Math.max(1, Math.min(RK, q === 2 ? 2 : q === 1 ? 1.5 : 1));
    const w = Math.round(W * s), h = Math.round(H * s), mh = Math.round(CP_MH * s);
    if (this.cv.width !== w || this.cv.height !== h + mh) { this.cv.width = w; this.cv.height = h + mh; }
    this.prepare(race);
    this.envNow = this.env(race); this.sun = vnorm([-0.55, -0.38, 1.0]);
    if (race.weather.time === 'dusk') this.sun = vnorm([0.8, -0.5, 0.28]);
    gl.enable(gl.SCISSOR_TEST);
    const cam = this.camera(race, car), fov = (50 + 7 * Math.min(1, cam.sp)) * Math.PI / 180;
    this.view(race, cam, [0, mh, w, h], fov, false);
    // Spiegel in den Streifen unter dem Bild rendern
    const st = CP_STYLE[car.cls.shape] || CP_STYLE.coupe, mirrors = [];
    if (st.mirror === 'center') { this.view(race, this.camera(race, car, [0, 1.2, 0.6], 0, true), [0, 0, Math.round(330 * s), Math.round(88 * s)], 15 * Math.PI / 180, true); mirrors.push([0, 330, 88]); }
    else if (st.mirror === 'sides') {
      const sw = st.mw || 150, sh = st.mh || 92, side = st.my || 6;
      const yw = st.frame === 'truck' ? 0.22 : 0.12;
      this.view(race, this.camera(race, car, [1, -side, -0.5], -yw, true), [0, 0, Math.round(sw * s), Math.round(sh * s)], 22 * Math.PI / 180, true);
      this.view(race, this.camera(race, car, [1, side, -0.5], yw, true), [Math.round((sw + 10) * s), 0, Math.round(sw * s), Math.round(sh * s)], 22 * Math.PI / 180, true);
      mirrors.push([0, sw, sh], [sw + 10, sw, sh]);
    }
    gl.disable(gl.SCISSOR_TEST);
    ctx.drawImage(this.cv, 0, 0, w, h, 0, 0, W, H);
    cpWeatherFx(ctx, race, cam);
    drawCockpit(ctx, race, car, cam, (k, dx, dy, dw, dh) => {
      const m = mirrors[k]; if (!m) return;
      ctx.drawImage(this.cv, Math.round(m[0] * s), h + mh - Math.round(m[2] * s), Math.round(m[1] * s), Math.round(m[2] * s), dx, dy, dw, dh);
    });
    cpHud(ctx, race, car);
  }
};

/* ---------- Cockpits (2D über dem 3D-Bild) ---------- */
/** Stil je Karosserie: Rahmen, Armaturen, Lenkrad, Spiegel */
const CP_STYLE = {
  coupe: { roof: 40, frame: 'closed', pl: [[-60, 560], [40, 560], [130, 0], [40, 0]], pr: [[1080, 600], [1150, 600], [1280, 160], [1280, 70]], dash: 628, pod: 1, gauges: 'analog2', wheel: 'sport', wr: 195, wy: 742, rot: 1.6, mirror: 'center', trim: [44, 46, 52] },
  wedge: { roof: 92, frame: 'closed', pl: [[-80, 520], [10, 520], [260, 0], [170, 0]], pr: [[1030, 560], [1100, 560], [1280, 250], [1280, 160]], dash: 640, pod: 0, gauges: 'digital', wheel: 'flat', wr: 185, wy: 748, rot: 1.25, mirror: 'center', trim: [30, 32, 36], carbon: 1 },
  buggy: { roof: 0, frame: 'cage', dash: 690, pod: 0, gauges: 'plate', wheel: 'sport', wr: 165, wy: 752, rot: 1.5, mirror: 'center', trim: [60, 62, 66] },
  rally: { roof: 44, frame: 'closed', cage: 1, pl: [[-60, 540], [40, 540], [150, 0], [60, 0]], pr: [[1090, 590], [1160, 590], [1280, 190], [1280, 100]], dash: 622, pod: 1, gauges: 'rally', wheel: 'deep', wr: 180, wy: 745, rot: 1.35, mirror: 'center', trim: [38, 40, 44], shifter: 1 },
  formula: { roof: 0, frame: 'formula', dash: 2000, gauges: 'none', wheel: 'formula', wr: 175, wy: 735, rot: 1.0, mirror: 'sides', mw: 150, mh: 80, my: 7, trim: [26, 28, 32] },
  pickup: { roof: 30, frame: 'closed', pl: [[-40, 520], [50, 520], [110, 0], [20, 0]], pr: [[1100, 560], [1170, 560], [1280, 120], [1280, 40]], dash: 600, pod: 1, gauges: 'analog2', wheel: 'four', wr: 210, wy: 752, rot: 1.9, mirror: 'center', trim: [70, 66, 60], chrome: 1 },
  truck: { roof: 26, frame: 'truck', pl: [[-20, 470], [50, 470], [70, 0], [0, 0]], pr: [[1220, 470], [1280, 470], [1280, 0], [1260, 0]], dash: 590, pod: 0, gauges: 'truck', wheel: 'truck', wr: 250, wy: 770, rot: 2.3, mirror: 'sides', mw: 110, mh: 170, my: 12, trim: [56, 58, 64] },
  muscle: { roof: 50, frame: 'closed', pl: [[-50, 560], [50, 560], [170, 0], [80, 0]], pr: [[1070, 600], [1140, 600], [1280, 200], [1280, 110]], dash: 618, pod: 1, gauges: 'pods', wheel: 'wood', wr: 200, wy: 750, rot: 1.9, mirror: 'center', trim: [70, 44, 30], chrome: 1 },
  ev: { roof: 18, frame: 'closed', glassRoof: 1, pl: [[-50, 560], [30, 560], [120, 0], [40, 0]], pr: [[1090, 610], [1150, 610], [1280, 170], [1280, 90]], dash: 650, pod: 0, gauges: 'screen', wheel: 'yoke', wr: 170, wy: 745, rot: 1.4, mirror: 'center', trim: [210, 212, 214], light: 1 },
  kart: { roof: 0, frame: 'open', dash: 2000, gauges: 'none', wheel: 'kart', wr: 120, wy: 740, rot: 0.9, mirror: 'none', trim: [40, 40, 44] }
};
function cpGauge(ctx, x, y, r, frac, txt, sub, red, night, ring) {
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = night ? '#0b0f16' : '#101318'; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
  ctx.lineWidth = r * 0.09; ctx.strokeStyle = ring || '#3a3f48'; ctx.stroke();
  const a0 = Math.PI * 0.75, a1 = Math.PI * 2.25;
  ctx.strokeStyle = night ? '#ffb46a' : '#e6e9ee'; ctx.lineWidth = 1.6;
  for (let i = 0; i <= 10; i++) { const a = lerp(a0, a1, i / 10), k = i % 2 ? 0.86 : 0.78; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * k, Math.sin(a) * r * k); ctx.lineTo(Math.cos(a) * r * 0.93, Math.sin(a) * r * 0.93); ctx.stroke(); }
  if (red) { ctx.strokeStyle = '#e8402f'; ctx.lineWidth = r * 0.07; ctx.beginPath(); ctx.arc(0, 0, r * 0.88, lerp(a0, a1, red), a1); ctx.stroke(); }
  const a = lerp(a0, a1, clamp(frac, 0, 1.05));
  ctx.strokeStyle = '#ff5a2a'; ctx.lineWidth = r * 0.06; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-Math.cos(a) * r * 0.12, -Math.sin(a) * r * 0.12); ctx.lineTo(Math.cos(a) * r * 0.82, Math.sin(a) * r * 0.82); ctx.stroke();
  ctx.fillStyle = '#2a2e36'; ctx.beginPath(); ctx.arc(0, 0, r * 0.12, 0, 7); ctx.fill();
  ctx.fillStyle = night ? '#ffcf9a' : '#f2f4f7'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = '700 ' + Math.round(r * 0.34) + 'px "Chakra Petch",sans-serif'; ctx.fillText(txt, 0, r * 0.45);
  if (sub) { ctx.font = '600 ' + Math.round(r * 0.16) + 'px "Chakra Petch",sans-serif'; ctx.fillStyle = '#8a92a0'; ctx.fillText(sub, 0, r * 0.7); }
  ctx.restore();
}
function cpPoly(ctx, pts, fill) { ctx.fillStyle = fill; ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.fill(); }
/** Gang und Drehzahl für die Anzeige */
function cpRpm(car) {
  const sh = car.cls.shape, n = sh === 'ev' || sh === 'kart' ? 1 : sh === 'truck' ? 8 : sh === 'formula' || sh === 'wedge' ? 7 : 6;
  const v = clamp(Math.abs(fwdSpeed(car)) / car.cls.maxSpeed, 0, 1.1), top = g => Math.pow((g + 1) / n, 0.8) * 1.04;
  let g = car.cpGear || 0;
  if (n > 1) { if (g < n - 1 && v > top(g) * 0.97) g++; else if (g > 0 && v < top(g - 1) * 0.8) g--; } else g = 0;
  car.cpGear = g;
  let rpm = n > 1 ? v / top(g) : 0.25 + 0.75 * v;
  if (car.air || (car.slip > 90 && car.thr > 0.5)) rpm = Math.max(rpm, 0.8 + car.thr * 0.15);
  if (Math.abs(fwdSpeed(car)) < 3) rpm = 0.12 + car.thr * 0.5;
  return { g: fwdSpeed(car) < -5 ? 'R' : String(g + 1), rpm: clamp(rpm, 0, 1.05), kmh: Math.round(Math.abs(fwdSpeed(car)) * 0.85), n };
}
function drawCockpit(ctx, race, car, cam, blitMirror) {
  const st = CP_STYLE[car.cls.shape] || CP_STYLE.coupe, night = race.weather.time !== 'day', tr = st.trim;
  const T = (k, a = 1) => 'rgba(' + (tr[0] * k | 0) + ',' + (tr[1] * k | 0) + ',' + (tr[2] * k | 0) + ',' + a + ')';
  const R = cpRpm(car), steer = car.steerVis * st.rot;
  // Bewegung: Kopf wird bei Querbeschleunigung leicht mitgenommen
  const lat = clamp((car.av || 0) * carSpeed(car) / 2500, -1, 1), jx = lat * 14, jy = (car.air ? -6 : 0);
  ctx.save(); ctx.translate(jx, jy);
  // --- Rahmen ---
  if (st.frame === 'closed' || st.frame === 'truck') {
    if (st.roof) { const g = ctx.createLinearGradient(0, 0, 0, st.roof); g.addColorStop(0, T(st.light ? 0.9 : 0.75)); g.addColorStop(1, T(st.light ? 0.75 : 0.55)); ctx.fillStyle = st.glassRoof ? 'rgba(20,26,34,.55)' : g; ctx.fillRect(-40, -20, W + 80, st.roof + 20); ctx.fillStyle = T(0.4); ctx.fillRect(-40, st.roof - 3, W + 80, 4); }
    for (const p of [st.pl, st.pr]) { cpPoly(ctx, p, T(0.7)); ctx.strokeStyle = T(1.25, 0.6); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(p[1][0], p[1][1]); ctx.lineTo(p[2][0], p[2][1]); ctx.stroke(); }
    if (st.cage) for (const p of [[[90, 600], [190, 0]], [[1150, 640], [1280, 260]]]) { ctx.strokeStyle = '#2b2e34'; ctx.lineWidth = 22; ctx.lineCap = 'butt'; ctx.beginPath(); ctx.moveTo(...p[0]); ctx.lineTo(...p[1]); ctx.stroke(); ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(p[0][0] - 5, p[0][1]); ctx.lineTo(p[1][0] - 5, p[1][1]); ctx.stroke(); }
    if (st.frame === 'truck') { ctx.fillStyle = T(0.7); ctx.fillRect(935, st.roof, 26, st.dash - st.roof); }
  } else if (st.frame === 'cage') {
    const tube = (a, b, w) => { ctx.lineCap = 'round'; ctx.strokeStyle = '#26292e'; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke(); ctx.strokeStyle = 'rgba(255,255,255,.16)'; ctx.lineWidth = w * 0.22; ctx.beginPath(); ctx.moveTo(a[0] - w * 0.2, a[1]); ctx.lineTo(b[0] - w * 0.2, b[1]); ctx.stroke(); };
    tube([60, 820], [250, -20], 34); tube([1220, 820], [1030, -20], 34); tube([-20, 40], [1300, 40], 30);
  } else if (st.frame === 'formula') {
    // Helmrand und Halo
    const vg = ctx.createRadialGradient(W / 2, H * 0.48, H * 0.42, W / 2, H * 0.48, H * 0.86); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.92)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#17191d'; ctx.lineWidth = 34; ctx.lineCap = 'butt';
    ctx.beginPath(); ctx.moveTo(60, -10); ctx.quadraticCurveTo(W / 2, 170, W - 60, -10); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(70, 4); ctx.quadraticCurveTo(W / 2, 160, W - 70, 4); ctx.stroke();
    cpPoly(ctx, [[W / 2 - 16, 80], [W / 2 + 16, 80], [W / 2 + 26, 330], [W / 2 - 26, 330]], '#17191d');
    // Seitenkästen in Lackfarbe
    const sc = shade(car.color, 0.85);
    cpPoly(ctx, [[0, 470], [170, 520], [300, 640], [330, 800], [0, 800]], sc); cpPoly(ctx, [[W, 470], [W - 170, 520], [W - 300, 640], [W - 330, 800], [W, 800]], sc);
    cpPoly(ctx, [[0, 470], [170, 520], [176, 534], [0, 488]], 'rgba(255,255,255,.25)'); cpPoly(ctx, [[W, 470], [W - 170, 520], [W - 176, 534], [W, 488]], 'rgba(255,255,255,.25)');
  }
  // --- Armaturen ---
  if (st.dash < 1000) {
    const y = st.dash, g = ctx.createLinearGradient(0, y - 40, 0, H);
    g.addColorStop(0, st.light ? '#d8d9db' : T(0.95)); g.addColorStop(0.25, st.light ? '#b9babd' : T(0.6)); g.addColorStop(1, st.light ? '#8b8c90' : T(0.35));
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-40, y + 20); ctx.quadraticCurveTo(W / 2, y - 26, W + 40, y + 20); ctx.lineTo(W + 40, H + 20); ctx.lineTo(-40, H + 20); ctx.closePath(); ctx.fill();
    if (st.carbon) { ctx.save(); ctx.clip(); ctx.globalAlpha = 0.12; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; for (let x = -800; x < W; x += 9) { ctx.beginPath(); ctx.moveTo(x, y - 40); ctx.lineTo(x + 800, H); ctx.stroke(); } ctx.restore(); }
    if (st.chrome) { ctx.strokeStyle = 'rgba(230,234,240,.7)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-40, y + 26); ctx.quadraticCurveTo(W / 2, y - 20, W + 40, y + 26); ctx.stroke(); }
    if (st.pod) { const cx = 640; ctx.fillStyle = T(0.8); ctx.beginPath(); ctx.ellipse(cx, y + 18, 230, 74, 0, Math.PI, 0); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.07)'; ctx.beginPath(); ctx.ellipse(cx, y + 14, 220, 66, 0, Math.PI * 1.05, Math.PI * 1.95); ctx.fill(); }
    // Mittelkonsole mit Lüftung
    ctx.fillStyle = st.light ? '#a7a8ab' : T(0.5); rr(ctx, 930, y + 30, 230, 120, 12); ctx.fill();
    ctx.fillStyle = st.light ? '#6c6d72' : '#15171b'; for (let i = 0; i < 2; i++) { rr(ctx, 948 + i * 108, y + 46, 88, 30, 6); ctx.fill(); }
  }
  // Anzeigen hinter dem Lenkrad
  const gy = Math.min(st.dash + 64, 720), fuel = race.rules.fuelOn ? car.fuel / 100 : 1;
  switch (st.gauges) {
    case 'analog2':
      cpGauge(ctx, 560, gy, 64, R.kmh / 320, String(R.kmh), 'km/h', 0, night, st.chrome ? '#c9ced6' : null);
      cpGauge(ctx, 720, gy, 64, R.rpm, R.g, '×1000/min', 0.82, night, st.chrome ? '#c9ced6' : null);
      break;
    case 'pods':
      cpGauge(ctx, 520, gy + 6, 50, fuel, Math.round(fuel * 100) + '%', 'Tank', 0, night, '#d7dbe2');
      cpGauge(ctx, 640, gy - 6, 62, R.kmh / 320, String(R.kmh), 'km/h', 0, night, '#d7dbe2');
      cpGauge(ctx, 760, gy + 6, 50, R.rpm, R.g, 'U/min', 0.85, night, '#d7dbe2');
      break;
    case 'digital': case 'rally': {
      const w = st.gauges === 'rally' ? 250 : 300, x = 640 - w / 2, y = gy - 48;
      ctx.fillStyle = '#07090c'; rr(ctx, x, y, w, 92, 8); ctx.fill(); ctx.strokeStyle = '#2a2f37'; ctx.lineWidth = 3; ctx.stroke();
      const n = 14; for (let i = 0; i < n; i++) { const on = R.rpm >= (i + 1) / n * 0.95; ctx.fillStyle = on ? (i < 8 ? '#3bea7a' : i < 12 ? '#ff3b3b' : '#4aa3ff') : '#1b2028'; ctx.beginPath(); ctx.arc(x + 16 + i * (w - 32) / (n - 1), y + 13, 5, 0, 7); ctx.fill(); }
      ctx.fillStyle = '#f2f4f7'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '700 46px "Chakra Petch",sans-serif'; ctx.fillText(R.g, 640, y + 56);
      ctx.font = '700 24px "Chakra Petch",sans-serif'; ctx.textAlign = 'left'; ctx.fillText(String(R.kmh), x + 14, y + 58); ctx.font = '600 11px "Chakra Petch",sans-serif'; ctx.fillStyle = '#8a92a0'; ctx.fillText('km/h', x + 14, y + 78);
      ctx.textAlign = 'right'; ctx.fillStyle = fuel < 0.15 ? '#ff8a3d' : '#f2f4f7'; ctx.font = '700 20px "Chakra Petch",sans-serif'; ctx.fillText(Math.round(fuel * 100) + '%', x + w - 14, y + 58); ctx.font = '600 11px "Chakra Petch",sans-serif'; ctx.fillStyle = '#8a92a0'; ctx.fillText('Tank', x + w - 14, y + 78);
      break;
    }
    case 'plate': {
      ctx.fillStyle = '#9aa0a8'; rr(ctx, 470, st.dash - 20, 340, 120, 10); ctx.fill(); ctx.fillStyle = '#62676f'; for (const [x, y] of [[480, st.dash - 10], [800, st.dash - 10], [480, st.dash + 90], [800, st.dash + 90]]) { ctx.beginPath(); ctx.arc(x, y, 4, 0, 7); ctx.fill(); }
      cpGauge(ctx, 565, st.dash + 40, 46, R.kmh / 300, String(R.kmh), 'km/h', 0, night); cpGauge(ctx, 715, st.dash + 40, 46, R.rpm, R.g, 'U/min', 0.8, night);
      break;
    }
    case 'truck':
      for (let i = 0; i < 4; i++) cpGauge(ctx, 420 + i * 92, gy + (i === 1 || i === 2 ? -8 : 6), i === 1 || i === 2 ? 50 : 36, [fuel, R.kmh / 260, R.rpm, 0.55][i], [Math.round(fuel * 100) + '%', String(R.kmh), R.g, '8'][i], ['Diesel', 'km/h', 'U/min', 'bar'][i], i === 2 ? 0.85 : 0, night);
      break;
    case 'screen': {
      ctx.fillStyle = '#0c0e12'; rr(ctx, 850, st.dash - 120, 300, 180, 14); ctx.fill(); ctx.strokeStyle = '#9fa2a7'; ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = '#eaf6ff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '700 58px "Chakra Petch",sans-serif'; ctx.fillText(String(R.kmh), 1000, st.dash - 50);
      ctx.font = '600 14px "Chakra Petch",sans-serif'; ctx.fillStyle = '#8fd8ff'; ctx.fillText('km/h · Akku ' + Math.round(fuel * 100) + '%', 1000, st.dash + 6);
      ctx.fillStyle = '#1d2a36'; rr(ctx, 880, st.dash + 26, 240, 10, 5); ctx.fill(); ctx.fillStyle = '#38c4ff'; rr(ctx, 880, st.dash + 26, 240 * fuel, 10, 5); ctx.fill();
      break;
    }
  }
  // --- Lenkrad mit Händen ---
  const wx = 640, wy = st.wy, wr = st.wr;
  ctx.save(); ctx.translate(wx, wy); ctx.rotate(steer);
  const rim = st.wheel === 'wood' ? '#6b3a1e' : '#1a1c20', grip = (a, len) => { ctx.strokeStyle = rim; ctx.lineWidth = wr * 0.17; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(0, 0, wr, a - len, a + len); ctx.stroke(); };
  const glove = a => { const x = Math.cos(a) * wr, y = Math.sin(a) * wr; ctx.save(); ctx.translate(x, y); ctx.rotate(a + Math.PI / 2); ctx.fillStyle = '#16181c'; rr(ctx, -wr * 0.16, -wr * 0.13, wr * 0.32, wr * 0.3, wr * 0.08); ctx.fill(); ctx.fillStyle = car.color; rr(ctx, -wr * 0.14, wr * 0.14, wr * 0.28, wr * 0.09, 3); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.12)'; rr(ctx, -wr * 0.12, -wr * 0.1, wr * 0.24, wr * 0.06, 3); ctx.fill(); ctx.restore(); };
  switch (st.wheel) {
    case 'formula': {
      const w2 = wr * 1.05, h2 = wr * 0.48;
      ctx.fillStyle = '#121418'; rr(ctx, -w2, -h2, w2 * 2, h2 * 1.6, 18); ctx.fill();
      ctx.fillStyle = '#1f2228'; rr(ctx, -w2 - 26, -h2 * 0.7, 44, h2 * 1.5, 18); ctx.fill(); rr(ctx, w2 - 18, -h2 * 0.7, 44, h2 * 1.5, 18); ctx.fill();
      ctx.fillStyle = '#05070a'; rr(ctx, -70, -h2 + 22, 140, 64, 6); ctx.fill();
      ctx.fillStyle = '#f2f4f7'; ctx.font = '700 40px "Chakra Petch",sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(R.g, 0, -h2 + 52); ctx.font = '700 14px "Chakra Petch",sans-serif'; ctx.fillText(R.kmh + ' km/h', 0, -h2 + 78);
      for (let i = 0; i < 15; i++) { const on = R.rpm >= (i + 1) / 15 * 0.95; ctx.fillStyle = on ? (i < 5 ? '#3bea7a' : i < 10 ? '#ff3b3b' : '#4aa3ff') : '#22262d'; ctx.beginPath(); ctx.arc(-w2 + 40 + i * (w2 * 2 - 80) / 14, -h2 + 9, 5, 0, 7); ctx.fill(); }
      [[-100, -10, '#ffcd32'], [-100, 26, '#3a8dff'], [100, -10, '#ff5a2a'], [100, 26, '#3bea7a']].forEach(([x, y, c]) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, 9, 0, 7); ctx.fill(); });
      glove(Math.PI); glove(0);
      break;
    }
    case 'yoke': {
      ctx.strokeStyle = '#1a1c20'; ctx.lineWidth = wr * 0.17; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(-wr, -wr * 0.3); ctx.lineTo(-wr, wr * 0.35); ctx.quadraticCurveTo(-wr, wr * 0.55, -wr * 0.6, wr * 0.55); ctx.lineTo(wr * 0.6, wr * 0.55); ctx.quadraticCurveTo(wr, wr * 0.55, wr, wr * 0.35); ctx.lineTo(wr, -wr * 0.3); ctx.stroke();
      ctx.fillStyle = '#2a2d33'; rr(ctx, -wr * 0.95, -wr * 0.1, wr * 1.9, wr * 0.32, 14); ctx.fill(); ctx.fillStyle = '#c9ccd2'; ctx.beginPath(); ctx.arc(0, wr * 0.06, wr * 0.13, 0, 7); ctx.fill();
      glove(Math.PI); glove(0);
      break;
    }
    case 'truck': {
      ctx.scale(1, 0.55); ctx.strokeStyle = '#202227'; ctx.lineWidth = wr * 0.11; ctx.beginPath(); ctx.arc(0, 0, wr, 0, 7); ctx.stroke();
      ctx.lineWidth = wr * 0.14; for (const a of [Math.PI * 0.5, Math.PI * 0.15, Math.PI * 0.85]) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * wr, Math.sin(a) * wr); ctx.stroke(); }
      ctx.fillStyle = '#2b2e34'; ctx.beginPath(); ctx.arc(0, 0, wr * 0.3, 0, 7); ctx.fill(); ctx.fillStyle = '#c9ccd2'; ctx.beginPath(); ctx.arc(0, 0, wr * 0.1, 0, 7); ctx.fill();
      glove(Math.PI * 1.05); glove(-Math.PI * 0.05);
      break;
    }
    default: {
      const spokes = st.wheel === 'four' ? [Math.PI * 0.25, Math.PI * 0.75, Math.PI * 1.25, Math.PI * 1.75] : st.wheel === 'kart' ? [0, Math.PI] : [0, Math.PI, Math.PI * 0.5];
      ctx.lineCap = 'round';
      for (const a of spokes) { ctx.strokeStyle = st.wheel === 'wood' ? '#c8ccd2' : '#26292f'; ctx.lineWidth = wr * (st.wheel === 'wood' ? 0.08 : 0.16); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * wr * 0.95, Math.sin(a) * wr * 0.95); ctx.stroke(); }
      ctx.strokeStyle = rim; ctx.lineWidth = wr * (st.wheel === 'kart' ? 0.13 : 0.12); ctx.beginPath();
      if (st.wheel === 'flat') { ctx.arc(0, 0, wr, Math.PI * 0.2, Math.PI * 0.8, true); ctx.lineTo(-Math.cos(Math.PI * 0.2) * wr, Math.sin(Math.PI * 0.2) * wr); ctx.closePath(); } else ctx.arc(0, 0, wr, 0, 7);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.1)'; ctx.lineWidth = wr * 0.03; ctx.beginPath(); ctx.arc(0, 0, wr * 1.02, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
      if (st.wheel === 'deep' || st.wheel === 'sport') { ctx.strokeStyle = st.wheel === 'deep' ? '#ffcd32' : '#e8402f'; ctx.lineWidth = wr * 0.125; ctx.beginPath(); ctx.arc(0, 0, wr, -Math.PI / 2 - 0.05, -Math.PI / 2 + 0.05); ctx.stroke(); }
      ctx.fillStyle = st.wheel === 'wood' ? '#c8ccd2' : '#202328'; ctx.beginPath(); ctx.arc(0, 0, wr * (st.wheel === 'kart' ? 0.16 : 0.24), 0, 7); ctx.fill();
      ctx.fillStyle = car.color; ctx.beginPath(); ctx.arc(0, 0, wr * 0.08, 0, 7); ctx.fill();
      grip(Math.PI, 0.35); grip(0, 0.35);
      glove(Math.PI); glove(0);
    }
  }
  ctx.restore();
  if (st.shifter) { const x = 930, y = 800, k = clamp(R.rpm, 0, 1); ctx.strokeStyle = '#30343b'; ctx.lineWidth = 12; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x + 30, y + 20); ctx.lineTo(x + 6 - k * 8, y - 150); ctx.stroke(); ctx.fillStyle = '#16181c'; ctx.beginPath(); ctx.arc(x + 4 - k * 8, y - 160, 20, 0, 7); ctx.fill(); ctx.fillStyle = car.color; ctx.beginPath(); ctx.arc(x + 4 - k * 8, y - 160, 8, 0, 7); ctx.fill(); }
  // --- Rückspiegel ---
  if (st.mirror === 'center') {
    const x = 780, y = st.frame === 'cage' ? 62 : st.roof + 8, w = 300, h = 80;
    ctx.fillStyle = '#16181c'; ctx.fillRect(x + w / 2 - 6, st.roof - 10, 12, 20);
    ctx.save(); rr(ctx, x - 6, y - 6, w + 12, h + 12, 16); ctx.fillStyle = '#15171b'; ctx.fill(); rr(ctx, x, y, w, h, 12); ctx.clip(); blitMirror(0, x, y, w, h); ctx.fillStyle = 'rgba(160,190,220,.08)'; ctx.fillRect(x, y, w, h); ctx.restore();
  } else if (st.mirror === 'sides') {
    const mw = st.mw, mh2 = st.mh, ys = st.frame === 'formula' ? 520 : 300, xl = st.frame === 'formula' ? 70 : 8, xr = st.frame === 'formula' ? W - 70 - mw : W - 8 - mw;
    [[0, xl], [1, xr]].forEach(([k, x]) => { ctx.save(); rr(ctx, x - 6, ys - 6, mw + 12, mh2 + 12, 12); ctx.fillStyle = st.frame === 'formula' ? shade(car.color, 0.7) : '#15171b'; ctx.fill(); rr(ctx, x, ys, mw, mh2, 8); ctx.clip(); blitMirror(k, x, ys, mw, mh2); ctx.fillStyle = 'rgba(160,190,220,.08)'; ctx.fillRect(x, ys, mw, mh2); ctx.restore(); });
  }
  ctx.restore();
}
/** Regen/Schnee auf der Scheibe bzw. vor dem Helm */
function cpWeatherFx(ctx, race, cam) {
  const wx = race.weather; if (wx.sky !== 'rain') return;
  const t = race.time, rng = mulberry32(5), sp = cam.sp;
  ctx.save();
  if (wx.snow) {
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    for (let i = 0; i < 160; i++) { const u = (rng() + t * (0.25 + sp * 0.9) * (0.6 + rng())) % 1, a = rng() * 6.283, d = Math.pow(u, 2.2); const x = W / 2 + Math.cos(a) * d * 900, y = H * 0.42 + Math.sin(a) * d * 600; ctx.beginPath(); ctx.arc(x, y, 0.6 + d * 4, 0, 7); ctx.fill(); }
  } else {
    ctx.strokeStyle = 'rgba(200,215,235,.35)'; ctx.lineWidth = 1.2;
    for (let i = 0; i < 120; i++) { const u = (rng() + t * 2.6 * (0.8 + rng() * 0.4)) % 1, x = rng() * W, y = u * H; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 3 - sp * 6, y + 16 + sp * 14); ctx.stroke(); }
    // Tropfen auf der Scheibe
    for (let i = 0; i < 46; i++) { const x = rng() * W, y = rng() * H * 0.75, r = 2 + rng() * 5, life = (t * 0.7 + rng()) % 1, dx = -sp * life * 120; ctx.fillStyle = 'rgba(210,225,245,' + (0.18 * (1 - life)) + ')'; ctx.beginPath(); ctx.ellipse(x + dx, y - life * sp * 40, r, r * 0.8, 0, 0, 7); ctx.fill(); }
  }
  ctx.restore();
}
/** Meldungen und Boxenmenü mittig (statt über dem Auto) */
function cpHud(ctx, race, c) {
  let y = 150;
  const line = (txt, bg, fg, sz) => { label(ctx, W / 2, y, txt, bg, fg, sz); y += sz + 12; };
  if (c.msgT > 0) line(c.msg, 'rgba(0,0,0,.75)', c.msgCol || '#fff', 15);
  if (c.wrong && !c.finished) line('FALSCHE RICHTUNG', 'rgba(200,30,40,.9)', '#fff', 15);
  if (c.missedCp) line('CHECKPOINT ' + c.nextCp + ' VERPASST · Reset in ' + Math.max(1, Math.ceil(5 - (c.missedT || 0))) + ' s', 'rgba(200,120,0,.92)', '#fff', 14);
  if (c.draft > 0.45 && !c.finished) line('≋ WINDSCHATTEN', 'rgba(0,0,0,.6)', '#8fd8ff', 12);
  if (c.resetMsg > 0 && !c.service.cur) line('RESET', 'rgba(0,0,0,.7)', '#ffd23e', 13);
  if (race.rules.fuelOn && c.fuel <= 0 && !c.finished) line('TANK LEER', 'rgba(0,0,0,.75)', '#ff8a3d', 13);
  if (c.inBox && !c.finished) drawPitMenu(ctx, c, race, W / 2, y + 6);
  if (race.mode === 'elim' && race.state === 'running') {
    const act = race.cars.filter(k => !k.out && !k.finished);
    if (act.length > 1 && act.reduce((a, b) => b.key < a.key ? b : a) === c) label(ctx, W / 2, 112, 'DU BIST LETZTER', 'rgba(200,30,40,.9)', '#fff', 13);
  }
}
