/* =====================================================================
   1  GRUNDLAGEN
   ===================================================================== */
const VERSION = '1.7.1';
const W = 1280, H = 800;              // Weltgröße in Pixeln (eine Strecke = ein Bildschirm)
const PANEL = 260;                    // Breite der Seitenleiste
const CW = W + PANEL;                 // Canvas-Gesamtbreite
const CELL = 4;                       // Rasterzelle in Pixeln
const GW = W / CELL, GH = H / CELL;   // Rastergröße 320 x 200
const DT = 1 / 120;                   // fester Physikschritt
const LINE_STEP = 6;                  // Punktabstand der KI-Linie
const PIT_LIMIT = 95;                 // Tempolimit Boxengasse (px/s)
const LAT = 620;                      // Grundwert Seitenhaftung (px/s²)
const MAX_CARS = 8;
let RK = 1;                            // Zeichenauflösung der Bühne (wird in resize() gesetzt)

const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
function wrapAngle(a) { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; }

/** Deterministischer Zufallsgenerator (für reproduzierbare Strecken). */
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
/** Ganzzahl-Hash → [0,1) für Bodentexturen. */
function hash2(x, y) {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
/** Weiches Wertrauschen für großflächige Farbvariationen. */
function vnoise(x, y, s) {
  const fx = x / s, fy = y / s, ix = Math.floor(fx), iy = Math.floor(fy);
  const tx = fx - ix, ty = fy - iy;
  const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
  const a = hash2(ix, iy), b = hash2(ix + 1, iy), c = hash2(ix, iy + 1), d = hash2(ix + 1, iy + 1);
  return lerp(lerp(a, b, sx), lerp(c, d, sx), sy);
}
/** Zeitformat m:ss.mmm */
function fmtTime(sec) {
  if (sec == null || !isFinite(sec)) return '–:––.–––';
  const m = Math.floor(sec / 60), s = sec - m * 60;
  return m + ':' + (s < 10 ? '0' : '') + s.toFixed(3);
}
/** Prüft, ob sich Strecke AB und CD schneiden. */
function segIntersect(ax, ay, bx, by, cx, cy, dx, dy) {
  const d1x = bx - ax, d1y = by - ay, d2x = dx - cx, d2y = dy - cy;
  const den = d1x * d2y - d1y * d2x;
  if (Math.abs(den) < 1e-9) return false;
  const t = ((cx - ax) * d2y - (cy - ay) * d2x) / den;
  const u = ((cx - ax) * d1y - (cy - ay) * d1x) / den;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}
/** Kleiner Wrapper um localStorage mit Fehlertoleranz. */
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
  del(k) { try { localStorage.removeItem(k); } catch (e) { /* ignorieren */ } }
};
const escapeHtml = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* =====================================================================
   2  OBERFLÄCHEN
   ===================================================================== */
const S = { ASPHALT: 0, GRASS: 1, SAND: 2, GRAVEL: 3, SNOW: 4, ICE: 5, WATER: 6, PIT: 7, CURB: 8, DIRT: 9, CONCRETE: 10, LAVA: 11, ASH: 12, OIL: 13 };
// grip: Haftungsfaktor, drag: Rollwiderstand (1/s), speed: Faktor auf Höchsttempo
const SURF = [
  { name: 'Asphalt', grip: 1.00, drag: 0.10, speed: 1.00, col: [80, 84, 94], vr: 9, track: true },
  { name: 'Gras', grip: 0.62, drag: 1.00, speed: 0.80, col: [76, 140, 64], vr: 20 },
  { name: 'Sand', grip: 0.50, drag: 1.65, speed: 0.70, col: [222, 190, 128], vr: 16 },
  { name: 'Kies', grip: 0.45, drag: 2.30, speed: 0.60, col: [152, 146, 136], vr: 36 },
  { name: 'Schnee', grip: 0.58, drag: 0.55, speed: 0.88, col: [234, 240, 248], vr: 9 },
  { name: 'Eis', grip: 0.24, drag: 0.07, speed: 1.00, col: [170, 214, 240], vr: 7 },
  { name: 'Wasser', grip: 0.00, drag: 3.00, speed: 0.20, col: [38, 96, 168], vr: 10, oob: true },
  { name: 'Boxengasse', grip: 1.00, drag: 0.10, speed: 1.00, col: [62, 66, 76], vr: 6, track: true, pit: true },
  { name: 'Curbs', grip: 0.95, drag: 0.16, speed: 1.00, col: [214, 44, 44], vr: 0, track: true },
  { name: 'Schotter', grip: 0.74, drag: 0.32, speed: 0.93, col: [150, 122, 92], vr: 18, track: true, loose: true },
  { name: 'Beton', grip: 0.9, drag: 0.22, speed: 0.95, col: [146, 146, 142], vr: 10 },
  { name: 'Lava', grip: 0.00, drag: 3.00, speed: 0.20, col: [232, 82, 24], vr: 30, oob: true, lava: true },
  { name: 'Vulkanasche', grip: 0.52, drag: 1.3, speed: 0.74, col: [62, 56, 56], vr: 14 },
  { name: 'Ölfleck', grip: 0.16, drag: 0.06, speed: 1.00, col: [30, 30, 36], vr: 6, track: true }
];
/** Lose Untergründe (für Rallye- und Formel-Fahrzeuge relevant). */
const LOOSE = new Set([S.GRASS, S.SAND, S.GRAVEL, S.SNOW, S.ICE, S.DIRT, S.ASH]);
/** Gehört die Oberfläche zur eigentlichen Fahrbahn? */
const isTrackSurf = s => s === S.ASPHALT || s === S.CURB || s === S.PIT || s === S.DIRT || s === S.OIL;

/* =====================================================================
   3  STRECKENMODELL
   Track = { v, id, name, theme, grid(Uint8Array GWxGH), objects[], checkpoints[],
             start[], aiLine[], pit{path[],box{x,y,w,h,a}}|null }
   checkpoints[0] ist immer die Start-/Ziellinie.
   ===================================================================== */
const OBJ_DEF = {
  tree: { name: 'Baum', w: 30, h: 30, round: true },
  tires: { name: 'Reifenstapel', w: 18, h: 18, round: true },
  house: { name: 'Haus', w: 52, h: 40 },
  wall: { name: 'Mauer', w: 64, h: 10 },
  rail: { name: 'Leitplanke', w: 64, h: 5 },
  stand: { name: 'Tribüne', w: 96, h: 34 },
  banner: { name: 'Werbebande', w: 60, h: 4 },
  fence: { name: 'Zaun', w: 64, h: 3 },
  bush: { name: 'Busch', w: 20, h: 20, round: true },
  rock: { name: 'Stein', w: 18, h: 18, round: true },
  flag: { name: 'Flagge', w: 6, h: 6, round: true },
  lamp: { name: 'Laterne', w: 5, h: 5, round: true },
  container: { name: 'Container', w: 48, h: 18 },
  ramp: { name: 'Rampe', w: 44, h: 34, z: 12 },
  gate: { name: 'Schranke', w: 44, h: 4 },
  bridge: { name: 'Brücke', w: 120, h: 70, z: 30 }
};
/* ---------- Höhenkarte ----------
   Stützpunkte im Abstand HM px (161 x 101), Höhe in Pixeln (0–127).
   Zwischenwerte bilinear. Wird für Physik (Steigung, Sprünge, Klippen) und Darstellung genutzt. */
const HM = 8, HMW = W / HM + 1, HMH = H / HM + 1;
const newHeights = () => new Float32Array(HMW * HMH);
/** Geländehöhe an Weltkoordinate (bilinear). */
function terrainH(t, x, y) {
  const hm = t.hm; if (!hm) return 0;
  const gx = clamp(x / HM, 0, HMW - 1.001), gy = clamp(y / HM, 0, HMH - 1.001);
  const ix = gx | 0, iy = gy | 0, fx = gx - ix, fy = gy - iy, i = iy * HMW + ix;
  return (hm[i] * (1 - fx) + hm[i + 1] * fx) * (1 - fy) + (hm[i + HMW] * (1 - fx) + hm[i + HMW + 1] * fx) * fy;
}
/** Höhen-Pinsel: mode 'up' | 'down' | 'smooth' | 'flat'. */
function paintHeight(t, x, y, r, mode, amt, target) {
  if (!t.hm) t.hm = newHeights();
  const hm = t.hm, x0 = Math.max(0, Math.floor((x - r) / HM)), x1 = Math.min(HMW - 1, Math.ceil((x + r) / HM));
  const y0 = Math.max(0, Math.floor((y - r) / HM)), y1 = Math.min(HMH - 1, Math.ceil((y + r) / HM));
  const src = mode === 'smooth' ? hm.slice() : null;
  for (let gy = y0; gy <= y1; gy++) for (let gx = x0; gx <= x1; gx++) {
    const d = Math.hypot(gx * HM - x, gy * HM - y) / r; if (d >= 1) continue;
    const w = (1 - d * d) * (1 - d * d), i = gy * HMW + gx;
    if (mode === 'up') hm[i] = Math.min(127, hm[i] + amt * w);
    else if (mode === 'down') hm[i] = Math.max(0, hm[i] - amt * w);
    else if (mode === 'flat') hm[i] = lerp(hm[i], target, Math.min(1, w * amt / 4));
    else {
      let sum = 0, n = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const qx = gx + dx, qy = gy + dy; if (qx < 0 || qy < 0 || qx >= HMW || qy >= HMH) continue; sum += src[qy * HMW + qx]; n++; }
      hm[i] = lerp(hm[i], sum / n, Math.min(1, w * amt / 4));
    }
  }
}
/** Lokale Koordinaten eines Punktes relativ zu einem gedrehten Objekt. */
function localOf(o, x, y) {
  const ca = o.ca != null ? o.ca : Math.cos(o.a), sa = o.sa != null ? o.sa : Math.sin(o.a), dx = x - o.x, dy = y - o.y;
  return [dx * ca + dy * sa, -dx * sa + dy * ca];
}
/** Schranke: 0 = geschlossen, 1 = offen. Zyklus 7 s (offen 3,5 s, schließt, zu 1,9 s, öffnet). */
function gateOpenness(o, time) {
  const ph = ((Math.floor(o.x * 7 + o.y * 13) >>> 0) % 70) / 10, u = (time + ph) % 7;
  if (u < 3.5) return 1; if (u < 4.3) return 1 - (u - 3.5) / 0.8; if (u < 6.2) return 0; return (u - 6.2) / 0.8;
}
/** Brücke, deren Grundfläche (plus Rand) den Punkt enthält, sonst null. list = Objektliste */
function bridgeIn(list, x, y, margin = 0) {
  for (const o of list) {
    if (o.t !== 'bridge') continue;
    const [lx, ly] = localOf(o, x, y);
    if (Math.abs(lx) <= o.w / 2 + margin && Math.abs(ly) <= o.h / 2 + margin) return o;
  }
  return null;
}
/** Höhe einer Rampe an (x,y) relativ zum Gelände, 0 außerhalb. */
function rampHeight(o, x, y) {
  const [lx, ly] = localOf(o, x, y);
  if (Math.abs(ly) > o.h / 2 || lx < -o.w / 2 || lx > o.w / 2) return 0;
  return o.z * (lx + o.w / 2) / o.w;
}
/** Schüttet die Zufahrten einer Brücke auf (Steigung 1:5), jeweils in Achsrichtung außerhalb der Enden. */
function embankBridge(t, b) {
  if (!t.hm) t.hm = newHeights();
  const ca = Math.cos(b.a), sa = Math.sin(b.a), R = b.z / 0.18, hw = b.h / 2 + 6;
  for (let gy = 0; gy < HMH; gy++) for (let gx = 0; gx < HMW; gx++) {
    const x = gx * HM, y = gy * HM, dx = x - b.x, dy = y - b.y;
    const lx = dx * ca + dy * sa, ly = -dx * sa + dy * ca, out = Math.abs(lx) - b.w / 2;
    if (out < -4 || out > R + 24 || Math.abs(ly) > hw + 24) continue;
    let target = b.z * clamp(1 - Math.max(0, out) / R, 0, 1);
    const side = Math.abs(ly) > hw ? 1 - (Math.abs(ly) - hw) / 24 : 1;
    target *= clamp(side, 0, 1);
    const i = gy * HMW + gx;
    if (target > t.hm[i]) t.hm[i] = target;
  }
}
/** Höhenkarte → Base64 (Halbpixel-Auflösung). */
function encodeHeights(hm) {
  let bin = '', any = false;
  for (let i = 0; i < hm.length; i++) { const v = clamp(Math.round(hm[i] * 2), 0, 255); if (v) any = true; bin += String.fromCharCode(v); }
  return any ? btoa(bin) : null;
}
function decodeHeights(b64) {
  const hm = newHeights();
  try { const bin = atob(b64); for (let i = 0; i < hm.length && i < bin.length; i++) hm[i] = bin.charCodeAt(i) / 2; } catch (e) { /* ungültig → flach */ }
  return hm;
}
const THEMES = { meadow: 'Wiese', city: 'Stadt', desert: 'Wüste', snow: 'Schnee' };

function newTrack(base = S.GRASS) {
  return {
    v: 1, id: 'c_' + Date.now().toString(36), name: 'Neue Strecke', theme: 'meadow', custom: true,
    grid: new Uint8Array(GW * GH).fill(base), hm: newHeights(), objects: [], checkpoints: [], start: [], aiLine: [], pit: null
  };
}
function cloneTrack(t) {
  const o = decodeTrack(JSON.parse(JSON.stringify(encodeTrack(t))));
  return o;
}
/** Zelltyp an Weltkoordinate (außerhalb = Wasser/Out-of-Bounds). */
function cellAt(t, x, y) {
  const cx = Math.floor(x / CELL), cy = Math.floor(y / CELL);
  if (cx < 0 || cy < 0 || cx >= GW || cy >= GH) return S.WATER;
  return t.grid[cy * GW + cx];
}
const r1 = v => Math.round(v * 10) / 10;
/** Strecke → JSON-Objekt (Raster lauflängenkodiert). */
function encodeTrack(t) {
  const rle = [];
  let cur = t.grid[0], n = 0;
  for (let i = 0; i < t.grid.length; i++) {
    if (t.grid[i] === cur) n++;
    else { rle.push(cur, n); cur = t.grid[i]; n = 1; }
  }
  rle.push(cur, n);
  const pt = p => ({ x: r1(p.x), y: r1(p.y) });
  return {
    format: 'claude-rallye-track', v: 1, id: t.id, name: t.name, theme: t.theme,
    grid: { w: GW, h: GH, cell: CELL, rle }, heights: t.hm ? encodeHeights(t.hm) : null,
    objects: t.objects.map(o => { const e = { t: o.t, x: r1(o.x), y: r1(o.y), a: Math.round(o.a * 1000) / 1000, w: o.w, h: o.h }; if (o.c) e.c = o.c; if (o.pit) e.pit = true; if (o.z) e.z = r1(o.z); return e; }),
    checkpoints: t.checkpoints.map(c => ({ x1: r1(c.x1), y1: r1(c.y1), x2: r1(c.x2), y2: r1(c.y2) })),
    start: t.start.map(s => ({ x: r1(s.x), y: r1(s.y), a: Math.round(s.a * 1000) / 1000 })),
    aiLine: t.aiLine.map(pt),
    pit: t.pit ? { path: t.pit.path.map(pt), box: { ...t.pit.box } } : null, arena: t.arena ? true : undefined, look: t.look || undefined,
    shortcuts: t.shortcuts && t.shortcuts.length ? t.shortcuts.map(sc => sc.map(pt)) : undefined
  };
}
/** JSON-Objekt → Strecke (mit Prüfung). Wirft Fehler bei ungültigen Daten. */
function decodeTrack(o) {
  if (!o || typeof o !== 'object' || !o.grid || !Array.isArray(o.grid.rle)) throw new Error('Keine gültige Streckendatei.');
  if (o.grid.w !== GW || o.grid.h !== GH) throw new Error('Falsche Rastergröße.');
  const t = newTrack(S.GRASS);
  let p = 0;
  for (let i = 0; i < o.grid.rle.length; i += 2) {
    const s = o.grid.rle[i] | 0, n = o.grid.rle[i + 1] | 0;
    if (s < 0 || s >= SURF.length) throw new Error('Unbekannte Oberfläche.');
    for (let k = 0; k < n && p < t.grid.length; k++) t.grid[p++] = s;
  }
  t.id = String(o.id || t.id); t.name = String(o.name || 'Importierte Strecke').slice(0, 40);
  t.theme = THEMES[o.theme] ? o.theme : 'meadow';
  const num = v => (typeof v === 'number' && isFinite(v)) ? v : 0;
  t.objects = (o.objects || []).filter(b => OBJ_DEF[b.t]).map(b => { const e = { t: b.t, x: num(b.x), y: num(b.y), a: num(b.a), w: num(b.w) || OBJ_DEF[b.t].w, h: num(b.h) || OBJ_DEF[b.t].h }; if (b.c) e.c = num(b.c) | 0; if (b.pit) e.pit = true; if (b.z || OBJ_DEF[b.t].z) e.z = clamp(num(b.z) || OBJ_DEF[b.t].z, 2, 120); return e; });
  t.hm = typeof o.heights === 'string' ? decodeHeights(o.heights) : newHeights();
  t.checkpoints = (o.checkpoints || []).map(c => ({ x1: num(c.x1), y1: num(c.y1), x2: num(c.x2), y2: num(c.y2) }));
  t.start = (o.start || []).slice(0, MAX_CARS).map(s => ({ x: num(s.x), y: num(s.y), a: num(s.a) }));
  t.aiLine = (o.aiLine || []).map(q => ({ x: num(q.x), y: num(q.y) }));
  t.pit = (o.pit && Array.isArray(o.pit.path) && o.pit.path.length > 2 && o.pit.box) ? {
    path: o.pit.path.map(q => ({ x: num(q.x), y: num(q.y) })),
    box: { x: num(o.pit.box.x), y: num(o.pit.box.y), w: num(o.pit.box.w) || 120, h: num(o.pit.box.h) || 22, a: num(o.pit.box.a) }
  } : null;
  if (o.arena) t.arena = true;
  if (Array.isArray(o.shortcuts)) t.shortcuts = o.shortcuts.filter(Array.isArray).slice(0, 6).map(sc => sc.slice(0, 400).map(q => ({ x: num(q.x), y: num(q.y) }))).filter(sc => sc.length > 3);
  if (typeof o.look === 'string' && /^[a-z]{2,12}$/.test(o.look)) t.look = o.look;
  return t;
}

/* ---------- Malwerkzeuge auf dem Raster ---------- */
/** Kreisstempel. only: Set erlaubter Ziel-Typen (null = alle); not: Set geschützter Typen. */
function paintDisc(t, x, y, r, s, only = null, not = null) {
  const c0x = Math.max(0, Math.floor((x - r) / CELL)), c1x = Math.min(GW - 1, Math.floor((x + r) / CELL));
  const c0y = Math.max(0, Math.floor((y - r) / CELL)), c1y = Math.min(GH - 1, Math.floor((y + r) / CELL));
  const rr = r * r;
  for (let cy = c0y; cy <= c1y; cy++) {
    const py = cy * CELL + CELL / 2 - y;
    for (let cx = c0x; cx <= c1x; cx++) {
      const px = cx * CELL + CELL / 2 - x;
      if (px * px + py * py > rr) continue;
      const i = cy * GW + cx, cur = t.grid[i];
      if (only && !only.has(cur)) continue;
      if (not && not.has(cur)) continue;
      t.grid[i] = s;
    }
  }
}
/** Stempelt entlang einer Polylinie. */
function paintAlong(t, pts, r, s, closed, only, not) {
  const n = pts.length;
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    const d = dist(a.x, a.y, b.x, b.y), k = Math.max(1, Math.ceil(d / (CELL * 0.75)));
    for (let j = 0; j < k; j++) paintDisc(t, lerp(a.x, b.x, j / k), lerp(a.y, b.y, j / k), r, s, only, not);
  }
  if (!closed && n) paintDisc(t, pts[n - 1].x, pts[n - 1].y, r, s, only, not);
}
/** Füllwerkzeug (4er-Nachbarschaft). */
function floodFill(t, x, y, s) {
  const cx = Math.floor(x / CELL), cy = Math.floor(y / CELL);
  if (cx < 0 || cy < 0 || cx >= GW || cy >= GH) return;
  const from = t.grid[cy * GW + cx];
  if (from === s) return;
  const stack = [cy * GW + cx];
  while (stack.length) {
    const i = stack.pop();
    if (t.grid[i] !== from) continue;
    t.grid[i] = s;
    const x0 = i % GW, y0 = (i / GW) | 0;
    if (x0 > 0) stack.push(i - 1);
    if (x0 < GW - 1) stack.push(i + 1);
    if (y0 > 0) stack.push(i - GW);
    if (y0 < GH - 1) stack.push(i + GW);
  }
}
/** Abstandsfeld (in Pixeln) von jeder Zelle zur nächsten Fahrbahnzelle (Chamfer 3-4). */
function trackDistanceField(t) {
  const INF = 1e9, d = new Float32Array(GW * GH);
  for (let i = 0; i < d.length; i++) d[i] = isTrackSurf(t.grid[i]) ? 0 : INF;
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
    const i = y * GW + x; let v = d[i];
    if (x > 0) v = Math.min(v, d[i - 1] + 3);
    if (y > 0) { v = Math.min(v, d[i - GW] + 3); if (x > 0) v = Math.min(v, d[i - GW - 1] + 4); if (x < GW - 1) v = Math.min(v, d[i - GW + 1] + 4); }
    d[i] = v;
  }
  for (let y = GH - 1; y >= 0; y--) for (let x = GW - 1; x >= 0; x--) {
    const i = y * GW + x; let v = d[i];
    if (x < GW - 1) v = Math.min(v, d[i + 1] + 3);
    if (y < GH - 1) { v = Math.min(v, d[i + GW] + 3); if (x < GW - 1) v = Math.min(v, d[i + GW + 1] + 4); if (x > 0) v = Math.min(v, d[i + GW - 1] + 4); }
    d[i] = v;
  }
  for (let i = 0; i < d.length; i++) d[i] = d[i] / 3 * CELL;
  return d;
}
const dfAt = (df, x, y) => {
  const cx = Math.floor(x / CELL), cy = Math.floor(y / CELL);
  if (cx < 0 || cy < 0 || cx >= GW || cy >= GH) return 0;
  return df[cy * GW + cx];
};

/* ---------- Polylinien ---------- */
/** Zentripetaler Catmull-Rom-Punkt (vermeidet Schleifen). */
function crPoint(p0, p1, p2, p3, u) {
  const d = (p, q) => Math.max(1e-4, Math.pow(Math.hypot(q.x - p.x, q.y - p.y), 0.5));
  const t0 = 0, t1 = t0 + d(p0, p1), t2 = t1 + d(p1, p2), t3 = t2 + d(p2, p3);
  const tt = t1 + (t2 - t1) * u;
  const L = (a, b, ta, tb) => { const w = (tt - ta) / (tb - ta); return { x: a.x + (b.x - a.x) * w, y: a.y + (b.y - a.y) * w }; };
  const A1 = L(p0, p1, t0, t1), A2 = L(p1, p2, t1, t2), A3 = L(p2, p3, t2, t3);
  const B1 = L(A1, A2, t0, t2), B2 = L(A2, A3, t1, t3);
  return L(B1, B2, t1, t2);
}
/** Geschlossener Spline durch Kontrollpunkte, gleichmäßig abgetastet. */
function splineClosed(ctrl, step) {
  const n = ctrl.length, out = [];
  for (let i = 0; i < n; i++) {
    const p0 = ctrl[(i - 1 + n) % n], p1 = ctrl[i], p2 = ctrl[(i + 1) % n], p3 = ctrl[(i + 2) % n];
    const k = Math.max(4, Math.ceil(dist(p1.x, p1.y, p2.x, p2.y) / 2));
    for (let j = 0; j < k; j++) out.push(crPoint(p0, p1, p2, p3, j / k));
  }
  return resample(out, step, true);
}
/** Offener Spline (für Boxengassen). */
function splineOpen(ctrl, step) {
  const n = ctrl.length, out = [];
  for (let i = 0; i < n - 1; i++) {
    const p0 = ctrl[Math.max(0, i - 1)], p1 = ctrl[i], p2 = ctrl[i + 1], p3 = ctrl[Math.min(n - 1, i + 2)];
    const q0 = (i === 0) ? { x: 2 * p1.x - p2.x, y: 2 * p1.y - p2.y } : p0;
    const q3 = (i === n - 2) ? { x: 2 * p2.x - p1.x, y: 2 * p2.y - p1.y } : p3;
    const k = Math.max(4, Math.ceil(dist(p1.x, p1.y, p2.x, p2.y) / 2));
    for (let j = 0; j < k; j++) out.push(crPoint(q0, p1, p2, q3, j / k));
  }
  out.push({ x: ctrl[n - 1].x, y: ctrl[n - 1].y });
  return resample(out, step, false);
}
/** Gleichmäßige Neuabtastung einer Polylinie. */
function resample(pts, step, closed) {
  if (pts.length < 2) return pts.slice();
  const src = closed ? pts.concat([pts[0]]) : pts;
  const out = [{ x: src[0].x, y: src[0].y }];
  let carry = 0;
  for (let i = 0; i < src.length - 1; i++) {
    const a = src[i], b = src[i + 1];
    const seg = dist(a.x, a.y, b.x, b.y);
    let pos = step - carry;
    while (pos <= seg) {
      const w = pos / seg;
      out.push({ x: a.x + (b.x - a.x) * w, y: a.y + (b.y - a.y) * w });
      pos += step;
    }
    carry = seg - (pos - step);
  }
  if (closed) {
    const l = out[out.length - 1];
    if (dist(l.x, l.y, out[0].x, out[0].y) < step * 0.5) out.pop();
  } else {
    const l = src[src.length - 1], o = out[out.length - 1];
    if (dist(l.x, l.y, o.x, o.y) > step * 0.3) out.push({ x: l.x, y: l.y });
  }
  return out;
}
/** Chaikin-Glättung (für freihand gezeichnete Linien). */
function chaikin(pts, closed, it = 2) {
  let p = pts;
  for (let k = 0; k < it; k++) {
    const o = [], n = p.length;
    if (!closed) o.push(p[0]);
    for (let i = 0; i < (closed ? n : n - 1); i++) {
      const a = p[i], b = p[(i + 1) % n];
      o.push({ x: a.x * 0.75 + b.x * 0.25, y: a.y * 0.75 + b.y * 0.25 }, { x: a.x * 0.25 + b.x * 0.75, y: a.y * 0.25 + b.y * 0.75 });
    }
    if (!closed) o.push(p[n - 1]);
    p = o;
  }
  return p;
}
function tangentAt(pts, i, closed) {
  const n = pts.length;
  const a = closed ? pts[(i - 1 + n) % n] : pts[Math.max(0, i - 1)];
  const b = closed ? pts[(i + 1) % n] : pts[Math.min(n - 1, i + 1)];
  const l = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  return { x: (b.x - a.x) / l, y: (b.y - a.y) / l };
}
function nearestIndex(pts, x, y) {
  let best = 0, bd = Infinity;
  for (let i = 0; i < pts.length; i++) {
    const d = (pts[i].x - x) ** 2 + (pts[i].y - y) ** 2;
    if (d < bd) { bd = d; best = i; }
  }
  return best;
}
function polyLength(pts, closed) {
  let l = 0;
  for (let i = 0; i < pts.length - (closed ? 0 : 1); i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    l += dist(a.x, a.y, b.x, b.y);
  }
  return l;
}

/* =====================================================================
   4  AUTO-WERKZEUGE (Checkpoints, KI-Linie, Startplätze)
   ===================================================================== */
/** Oberflächenfamilie: Fahrbahn (0), Wasser (-1) oder eigene Familie. */
const surfFamily = s => isTrackSurf(s) ? 0 : (SURF[s].oob ? -1 : 10 + s);
/** Läuft vom Punkt aus in Richtung (dx,dy), bis die Fahrbahn endet. Kleine Lücken (≤24 px) werden überbrückt. */
function raycastEdge(t, x, y, dx, dy, fam, maxD = 150) {
  let last = 0, gap = 0;
  for (let d = 0; d <= maxD; d += 2) {
    const s = cellAt(t, x + dx * d, y + dy * d);
    if (SURF[s].oob && fam !== -1) break;
    if (surfFamily(s) === fam) { last = d; gap = 0; }
    else { gap += 2; if (gap > 24) break; }
  }
  return Math.max(last, 10) + 6;
}
/** Checkpoint quer zur Linie an Index i. */
function checkpointAt(t, line, i) {
  const p = line[i], tg = tangentAt(line, i, true), nx = -tg.y, ny = tg.x;
  const fam = surfFamily(cellAt(t, p.x, p.y));
  const a = raycastEdge(t, p.x, p.y, nx, ny, fam), b = raycastEdge(t, p.x, p.y, -nx, -ny, fam);
  return { x1: p.x + nx * a, y1: p.y + ny * a, x2: p.x - nx * b, y2: p.y - ny * b };
}
/** Dreht die KI-Linie so, dass Index 0 an der Start-/Ziellinie liegt. */
function alignLineToStart(t) {
  if (!t.aiLine.length || !t.checkpoints.length) return;
  const c = t.checkpoints[0];
  const i0 = nearestIndex(t.aiLine, (c.x1 + c.x2) / 2, (c.y1 + c.y2) / 2);
  t.aiLine = t.aiLine.slice(i0).concat(t.aiLine.slice(0, i0));
}
/** Richtet eine gezeichnete Start-/Ziellinie quer zur KI-Linie aus und zieht sie über die volle Fahrbahnbreite. */
function snapStartLine(t) {
  if (!t.checkpoints.length || t.aiLine.length < 20) return;
  const c = t.checkpoints[0];
  const i = nearestIndex(t.aiLine, (c.x1 + c.x2) / 2, (c.y1 + c.y2) / 2);
  if (dist(t.aiLine[i].x, t.aiLine[i].y, (c.x1 + c.x2) / 2, (c.y1 + c.y2) / 2) > 120) return;
  t.checkpoints[0] = checkpointAt(t, t.aiLine, i);
}
/** Checkpoints automatisch entlang der KI-Linie setzen (Start-/Ziellinie bleibt erhalten). */
function autoCheckpoints(t) {
  if (t.aiLine.length < 20) return 'Für automatische Checkpoints wird eine KI-Linie benötigt.';
  const line = resample(t.aiLine, LINE_STEP, true);
  t.aiLine = line;
  if (!t.checkpoints.length) t.checkpoints = [checkpointAt(t, line, 0)];
  else snapStartLine(t);
  alignLineToStart(t);
  const L = polyLength(t.aiLine, true);
  const n = clamp(Math.round(L / 260), 6, 24);
  const cps = [t.checkpoints[0]];
  const N = t.aiLine.length;
  // Nicht an Kreuzungen (Brücken) setzen: Punkt muss weit weg von anderen Streckenabschnitten liegen
  const nearOther = i => { const p = t.aiLine[i]; if (bridgeIn(t.objects, p.x, p.y, 40) || SURF[cellAt(t, p.x, p.y)].oob) return true; for (let j = 0; j < N; j++) { let di = Math.abs(i - j); di = Math.min(di, N - di); if (di > 30 && dist(p.x, p.y, t.aiLine[j].x, t.aiLine[j].y) < 80) return true; } return false; };
  for (let k = 1; k < n; k++) {
    let i = Math.round(k * N / n) % N;
    for (let tries = 0; tries < 40 && nearOther(i); tries++) i = (i + 1) % N;
    cps.push(checkpointAt(t, t.aiLine, i));
  }
  t.checkpoints = cps;
  return null;
}
/** KI-Linie aus den Mittelpunkten der Checkpoints berechnen. */
function autoAiLine(t) {
  if (t.checkpoints.length < 3) return 'Für eine automatische KI-Linie werden mindestens 3 Checkpoints benötigt.';
  const mids = t.checkpoints.map(c => ({ x: (c.x1 + c.x2) / 2, y: (c.y1 + c.y2) / 2 }));
  t.aiLine = splineClosed(mids, LINE_STEP);
  alignLineToStart(t);
  return null;
}
/** Startplätze hinter der Startlinie erzeugen (2 versetzte Reihen). */
function autoStart(t) {
  if (!t.checkpoints.length) return 'Zuerst eine Start-/Ziellinie setzen.';
  if (t.aiLine.length < 20) { const e = autoAiLine(t); if (e) return 'Für die Fahrtrichtung wird eine KI-Linie benötigt.'; }
  const c = t.checkpoints[0];
  const mx = (c.x1 + c.x2) / 2, my = (c.y1 + c.y2) / 2;
  const i0 = nearestIndex(t.aiLine, mx, my), tg = tangentAt(t.aiLine, i0, true);
  const nx = -tg.y, ny = tg.x;
  const half = Math.hypot(c.x2 - c.x1, c.y2 - c.y1) / 2;
  const lat = clamp(half * 0.45, 9, 18);
  const a = Math.atan2(tg.y, tg.x);
  t.start = [];
  for (let i = 0; i < MAX_CARS; i++) {
    const row = Math.floor(i / 2), side = (i % 2) ? 1 : -1;
    const back = 26 + row * 36 + (i % 2) * 18;
    t.start.push({ x: mx - tg.x * back + nx * side * lat, y: my - tg.y * back + ny * side * lat, a });
  }
  return null;
}
/** Boxenbereich mittig auf einem Boxengassen-Pfad. */
function boxFromPath(path) {
  const L = polyLength(path, false);
  let acc = 0, i0 = 0, i1 = path.length - 1;
  for (let i = 0; i < path.length - 1; i++) {
    const d = dist(path[i].x, path[i].y, path[i + 1].x, path[i + 1].y);
    if (acc <= L * 0.3) i0 = i;
    if (acc <= L * 0.7) i1 = i + 1;
    acc += d;
  }
  const a = path[i0], b = path[i1];
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, w: Math.max(40, dist(a.x, a.y, b.x, b.y)), h: 22, a: Math.atan2(b.y - a.y, b.x - a.x) };
}
/** Prüft die Strecke auf Renntauglichkeit. Liefert Liste von Problemen. */
function validateTrack(t) {
  const p = [];
  if (!t.checkpoints.length) p.push('Start-/Ziellinie fehlt.');
  if (t.aiLine.length < 20 && t.checkpoints.length < 3) p.push('KI-Linie fehlt (zeichnen oder aus Checkpoints berechnen).');
  if (t.checkpoints.length < 3 && t.aiLine.length < 20) p.push('Mindestens 3 Checkpoints nötig.');
  // Jeder Checkpoint muss die KI-Linie kreuzen, sonst ist er für die KI unerreichbar
  if (t.aiLine.length >= 20) {
    const L = t.aiLine, n = L.length;
    t.checkpoints.forEach((c, k) => {
      let hit = false;
      for (let i = 0; i < n && !hit; i++) { const a = L[i], b = L[(i + 1) % n]; hit = segIntersect(a.x, a.y, b.x, b.y, c.x1, c.y1, c.x2, c.y2); }
      if (!hit) p.push((k === 0 ? 'Start-/Ziellinie' : 'Checkpoint ' + k) + ' kreuzt die KI-Linie nicht.');
    });
  }
  return p;
}
/** Ergänzt fehlende Automatik-Daten vor einem Rennen. */
function completeTrack(t) {
  if (t.aiLine.length < 20 && t.checkpoints.length >= 3) autoAiLine(t);
  if (t.checkpoints.length < 3 && t.aiLine.length >= 20) autoCheckpoints(t);
  if (t.start.length < MAX_CARS && t.checkpoints.length) {
    // Manuell gesetzte Startplätze behalten, fehlende automatisch ergänzen
    const manual = t.start.slice();
    if (!autoStart(t)) {
      const autos = t.start;
      t.start = manual.slice();
      for (const s of autos) {
        if (t.start.length >= MAX_CARS) break;
        if (t.start.every(m => dist(m.x, m.y, s.x, s.y) > 20)) t.start.push(s);
      }
    } else t.start = manual;
  }
}
