// @ts-check
// Baut den Tisch (Filz, Banden, Holzrahmen, Taschen, Diamanten) aus der Physik-Geometrie.
// Physik (x, y) → Three (x, -y) über Shape-Rotation um -90° um die x-Achse.
import * as THREE from '../../vendor/three.module.js?v=1.0.2';
import { makeFeltTexture, makeWoodTexture } from './textures.js?v=1.0.2';

const RAIL_OUT = 0.13; // Holzrahmen außerhalb der Banden
const CUSHION_H = 0.042;
export const RAIL_TOP = 0.046;

/**
 * Umriss der Spielfläche bis zur Bandenrückseite; an den Taschen werden Kreisbögen ausgespart.
 * @param {import('../physics/table.js').Table} t
 * @param {boolean} outward  true: Bogen um die Tasche herum (Holz), false: Bogen zur Tischseite (Filz)
 */
function innerContour(t, outward, path, rr = t.holeR + 0.006, arcs = null) {
  const X = t.Lx + t.W, Y = t.Ly + t.W;
  // Taschen in Umlaufrichtung (gegen den Uhrzeigersinn ab unten links): BL, BS, BR, TR, TS, TL
  const order = [3, 4, 5, 2, 1, 0];
  /** Schnittpunkte des Taschenkreises mit den Bandenrückseiten-Linien */
  const pts = [];
  for (const k of order) {
    const p = t.pockets[k];
    if (p.kind === 'side') {
      const dy = Math.abs(Math.sign(p.y) * Y - p.y);
      const dx = Math.sqrt(Math.max(0, rr * rr - dy * dy));
      const sy = Math.sign(p.y) * Y;
      // Richtung entlang der Kante: unten (y<0) von links nach rechts, oben von rechts nach links
      const a = p.y < 0 ? [-dx, sy] : [dx, sy];
      const b = p.y < 0 ? [dx, sy] : [-dx, sy];
      pts.push({ p, a, b });
    } else {
      const sx = Math.sign(p.x), sy = Math.sign(p.y);
      const dyE = Math.abs(sy * Y - p.y), dxE = Math.abs(sx * X - p.x);
      const onH = [p.x - sx * Math.sqrt(rr * rr - dyE * dyE), sy * Y]; // auf der langen Kante
      const onV = [sx * X, p.y - sy * Math.sqrt(rr * rr - dxE * dxE)]; // auf der kurzen Kante
      // CCW-Umlauf: unten: V→H? Bestimme Reihenfolge je Ecke
      let a, b;
      if (sy < 0 && sx < 0) { a = onV; b = onH; } // BL: kommt von der linken Kante, geht auf die untere
      else if (sy < 0 && sx > 0) { a = onH; b = onV; } // BR
      else if (sy > 0 && sx > 0) { a = onV; b = onH; } // TR
      else { a = onH; b = onV; } // TL
      pts.push({ p, a, b });
    }
  }
  pts.forEach((e, i) => {
    if (i === 0) path.moveTo(e.a[0], e.a[1]);
    else path.lineTo(e.a[0], e.a[1]);
    const a0 = Math.atan2(e.a[1] - e.p.y, e.a[0] - e.p.x);
    const a1 = Math.atan2(e.b[1] - e.p.y, e.b[0] - e.p.x);
    // Umlauf gegen den Uhrzeigersinn: Filz nimmt den Bogen zur Tischmitte (im Uhrzeigersinn),
    // der Holzrahmen den äußeren Bogen
    path.absarc(e.p.x, e.p.y, rr, a0, a1, !outward);
    if (arcs) arcs.push({ p: e.p, a0, a1 });
  });
  path.closePath();
  return path;
}

/** Rechteck mit abgerundeten Ecken (halbe Breite/Höhe). */
function roundedRect(hx, hy, r) {
  const s = new THREE.Shape();
  s.moveTo(-hx + r, -hy);
  s.lineTo(hx - r, -hy);
  s.absarc(hx - r, -hy + r, r, -Math.PI / 2, 0, false);
  s.lineTo(hx, hy - r);
  s.absarc(hx - r, hy - r, r, 0, Math.PI / 2, false);
  s.lineTo(-hx + r, hy);
  s.absarc(-hx + r, hy - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(-hx, -hy + r);
  s.absarc(-hx + r, -hy + r, r, Math.PI, Math.PI * 1.5, false);
  return s;
}

// Bandenquerschnitt: [Tiefe hinter der Nase (m), Höhe (m)] – Nase auf Physik-Höhe 36 mm
const CUSHION_PROFILE = [
  [0.007, 0], [0.003, 0.016], [0.0005, 0.03], [0, 0.0355], [0.0015, 0.0392], [0.006, 0.0412], [0.014, 0.0418],
  [1, CUSHION_H], [1, 0],
];

/**
 * Bande als Profil-Loft: jede Profillinie verläuft zwischen den beiden Backen, die von der Nase
 * schräg nach hinten laufen – so passen die Enden exakt zu den Taschenbacken der Physik.
 * @param {number[][]} c [Backe1, Nase1, Nase2, Backe2] @param {number} W
 */
function cushionGeometry(c, W) {
  const [J1, N1, N2, J2] = c;
  const at = (N, J, u) => [N[0] + (J[0] - N[0]) * u, N[1] + (J[1] - N[1]) * u];
  const prof = CUSHION_PROFILE.map(([d, h]) => [d === 1 ? 1 : d / W, h]);
  const pos = [], idx = [];
  for (const [u, hgt] of prof) {
    const a = at(N1, J1, u), b = at(N2, J2, u);
    pos.push(a[0], hgt, -a[1], b[0], hgt, -b[1]);
  }
  for (let i = 0; i < prof.length - 1; i++) {
    const a = i * 2, b = a + 1, c2 = a + 2, d = a + 3;
    idx.push(a, c2, b, b, c2, d);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  // Normalen ggf. zur Spielfläche drehen (Wicklung hängt von der Bandenrichtung ab)
  const n = geo.attributes.normal;
  const mx = (N1[0] + N2[0]) / 2, my = (N1[1] + N2[1]) / 2;
  const toCenter = [-mx, my]; // Three-Koordinaten (x, z) Richtung Tischmitte
  if (n.getX(6) * toCenter[0] + n.getZ(6) * toCenter[1] < 0) {
    for (let i = 0; i < idx.length; i += 3) [idx[i + 1], idx[i + 2]] = [idx[i + 2], idx[i + 1]];
    geo.setIndex(idx);
    geo.computeVertexNormals();
  }
  // Stirnseiten (Endkappen)
  const capPos = [];
  for (const side of [0, 1]) {
    const pts = prof.map((_, i) => [pos[(i * 2 + side) * 3], pos[(i * 2 + side) * 3 + 1], pos[(i * 2 + side) * 3 + 2]]);
    const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length, cy = pts.reduce((s, p) => s + p[1], 0) / pts.length, cz = pts.reduce((s, p) => s + p[2], 0) / pts.length;
    for (let i = 0; i < pts.length; i++) capPos.push(cx, cy, cz, ...pts[i], ...pts[(i + 1) % pts.length]);
  }
  const cap = new THREE.BufferGeometry();
  cap.setAttribute('position', new THREE.Float32BufferAttribute(capPos, 3));
  cap.computeVertexNormals();
  const merged = mergeSimple(geo.toNonIndexed(), cap);
  return merged;
}

/** Zwei nicht-indizierte Geometrien (position + normal) zusammenführen. */
function mergeSimple(a, b) {
  const g = new THREE.BufferGeometry();
  for (const name of ['position', 'normal']) {
    const x = a.attributes[name].array, y = b.attributes[name].array;
    const arr = new Float32Array(x.length + y.length);
    arr.set(x); arr.set(y, x.length);
    g.setAttribute(name, new THREE.BufferAttribute(arr, 3));
  }
  // einfache planare UVs für die Filztextur
  const p = g.attributes.position.array, uv = new Float32Array((p.length / 3) * 2);
  for (let i = 0, j = 0; i < p.length; i += 3, j += 2) { uv[j] = p[i] * 3 + p[i + 1] * 3; uv[j + 1] = p[i + 2] * 3; }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}

/** @param {import('../physics/table.js').Table} t */
export function buildTable(t) {
  const group = new THREE.Group();
  const flat = (geo) => { geo.rotateX(-Math.PI / 2); return geo; };

  const feltTex = makeFeltTexture();
  feltTex.repeat.set(3, 3);
  const felt = new THREE.MeshStandardMaterial({ color: 0xffffff, map: feltTex, roughness: 0.92, metalness: 0 });
  const cushionMat = new THREE.MeshStandardMaterial({ color: 0xd8e8dc, map: feltTex, roughness: 0.85, side: THREE.DoubleSide });
  const woodTex = makeWoodTexture();
  woodTex.repeat.set(2, 6);
  const wood = new THREE.MeshStandardMaterial({ color: 0xffffff, map: woodTex, roughness: 0.42, metalness: 0.05 });
  const darkWood = new THREE.MeshStandardMaterial({ color: 0x3a1d0e, roughness: 0.6 });
  const black = new THREE.MeshBasicMaterial({ color: 0x050505, side: THREE.DoubleSide });

  // Filz
  const feltShape = innerContour(t, false, new THREE.Shape());
  const feltMesh = new THREE.Mesh(flat(new THREE.ShapeGeometry(feltShape, 24)), felt);
  group.add(feltMesh);

  // Banden mit echtem Querschnitt (Gummi-Nase, schräge Oberseite)
  for (const c of t.cushions) group.add(new THREE.Mesh(cushionGeometry(c, t.W), cushionMat));

  // Holzrahmen mit abgerundeten Außenecken, gefasten Kanten und Taschenausschnitten
  const X = t.Lx + t.W + RAIL_OUT, Y = t.Ly + t.W + RAIL_OUT;
  const BEVEL = 0.009;
  const rail = roundedRect(X - BEVEL, Y - BEVEL, 0.07);
  const arcs = [];
  // Ausschnitt um die Fase größer, damit die Taschenöffnung gleich groß bleibt
  rail.holes.push(innerContour(t, true, new THREE.Path(), t.holeR + 0.006 + BEVEL, arcs));
  const railGeo = new THREE.ExtrudeGeometry(rail, {
    depth: 0.08, bevelEnabled: true, bevelThickness: BEVEL, bevelSize: BEVEL, bevelSegments: 4, curveSegments: 28,
  });
  railGeo.rotateX(-Math.PI / 2);
  railGeo.translate(0, RAIL_TOP - 0.08 - BEVEL, 0);
  group.add(new THREE.Mesh(railGeo, wood));

  // Leder-Taschenkränze auf dem Rahmen
  const leather = new THREE.MeshStandardMaterial({ color: 0x1b1310, roughness: 0.55, metalness: 0.1 });
  for (const { p, a0, a1 } of arcs) {
    let span = a1 - a0;
    while (span <= 0) span += Math.PI * 2;
    const geo = new THREE.TorusGeometry(t.holeR + 0.012, 0.011, 8, 32, span);
    geo.rotateZ(a0);
    geo.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(geo, leather);
    m.scale.y = 0.55;
    m.position.set(p.x, RAIL_TOP - 0.004, -p.y);
    group.add(m);
    // Taschenschlund innen auskleiden, damit kein Holz im Loch sichtbar ist (Zylinderwinkel θ = π/2 + φ)
    const linerH = RAIL_TOP + 0.12;
    const liner = new THREE.Mesh(new THREE.CylinderGeometry(t.holeR + 0.0055, t.holeR + 0.0055, linerH, 24, 1, true, Math.PI / 2 + a0, span), black);
    liner.position.set(p.x, RAIL_TOP - 0.002 - linerH / 2, -p.y);
    group.add(liner);
  }

  // Zarge (abgerundet) mit dunkler Zierleiste
  const apronShape = roundedRect(X - 0.03, Y - 0.03, 0.06);
  const apronGeo = new THREE.ExtrudeGeometry(apronShape, { depth: 0.16, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 3, curveSegments: 16 });
  apronGeo.rotateX(-Math.PI / 2);
  apronGeo.translate(0, -0.25, 0);
  group.add(new THREE.Mesh(apronGeo, darkWood));
  const trimGeo = new THREE.ExtrudeGeometry(roundedRect(X - 0.015, Y - 0.015, 0.065), { depth: 0.012, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 2, curveSegments: 16 });
  trimGeo.rotateX(-Math.PI / 2);
  trimGeo.translate(0, -0.27, 0);
  group.add(new THREE.Mesh(trimGeo, wood));

  // gedrechselte Beine
  const legProfile = [[0, -0.62], [0.075, -0.62], [0.08, -0.6], [0.06, -0.57], [0.045, -0.45], [0.05, -0.38], [0.04, -0.35],
    [0.045, -0.2], [0.065, -0.14], [0.07, -0.08], [0, -0.08]].map(([r, y]) => new THREE.Vector2(r, y));
  const legGeo = new THREE.LatheGeometry(legProfile, 20);
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
    const leg = new THREE.Mesh(legGeo, darkWood);
    leg.position.set(sx * (X - 0.2), -0.2, sy * (Y - 0.17));
    group.add(leg);
  }

  // Taschen: Trichter nach unten
  const holeGeo = new THREE.CylinderGeometry(t.holeR + 0.008, t.holeR - 0.006, 0.12, 28, 1, true);
  const discGeo = flat(new THREE.CircleGeometry(t.holeR + 0.008, 28));
  for (const p of t.pockets) {
    const h = new THREE.Mesh(holeGeo, black);
    h.position.set(p.x, -0.06, -p.y);
    group.add(h);
    const d = new THREE.Mesh(discGeo, black);
    d.position.set(p.x, -0.004, -p.y);
    group.add(d);
  }

  // Diamanten
  const diaMat = new THREE.MeshStandardMaterial({ color: 0xf2efe6, roughness: 0.3, metalness: 0.2 });
  const diaGeo = flat(new THREE.CircleGeometry(0.008, 4));
  const off = t.W + RAIL_OUT * 0.5;
  for (let k = 1; k < 8; k++) {
    if (k === 4) continue;
    const x = -t.Lx + (2 * t.Lx * k) / 8;
    for (const sy of [-1, 1]) {
      const d = new THREE.Mesh(diaGeo, diaMat);
      d.position.set(x, RAIL_TOP + 0.0005, -sy * (t.Ly + off));
      group.add(d);
    }
  }
  for (let k = 1; k < 4; k++) {
    const y = -t.Ly + (2 * t.Ly * k) / 4;
    for (const sx of [-1, 1]) {
      const d = new THREE.Mesh(diaGeo, diaMat);
      d.position.set(sx * (t.Lx + off), RAIL_TOP + 0.0005, -y);
      group.add(d);
    }
  }

  // Kopflinie (dezent) und Fußpunkt
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.12, depthWrite: false });
  const head = new THREE.Mesh(flat(new THREE.PlaneGeometry(0.003, 2 * t.Ly)), lineMat);
  head.position.set(t.headStringX, 0.0006, 0);
  group.add(head);
  const spot = new THREE.Mesh(flat(new THREE.CircleGeometry(0.006, 12)), lineMat);
  spot.position.set(t.footSpot.x, 0.0006, 0);
  group.add(spot);

  // Boden
  const floor = new THREE.Mesh(flat(new THREE.PlaneGeometry(14, 14)), new THREE.MeshStandardMaterial({ color: 0x1a1d22, roughness: 1 }));
  floor.position.y = -0.85;
  group.add(floor);

  return group;
}
