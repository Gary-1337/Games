/* =====================================================================
   6b  SCHRÄGE ANSICHT (Pseudo-3D)
   Die Physik bleibt flach (x, y). Für die Darstellung wird der Boden leicht
   gekippt und perspektivisch verjüngt; Objekte und Autos bekommen eine Höhe z.
   ===================================================================== */
const VIEW = { T: 0.88, SB: 0.86, ZS: 0.95 };
VIEW.Y0 = H - 6 - VIEW.T * H * (VIEW.SB + (1 - VIEW.SB) / 2);   // Bildschirmzeile der hinteren Weltkante
const projS = y => VIEW.SB + (1 - VIEW.SB) * clamp(y / H, -0.3, 1.3);
const projY = y => VIEW.Y0 + VIEW.T * (VIEW.SB * y + (1 - VIEW.SB) * y * y / (2 * H));
/** Welt (x, y, Höhe z) → Bildschirm [X, Y] */
let ZB = 0;          // Basishöhe für das gerade gezeichnete Objekt (Gelände unter dem Objekt)
function P(x, y, z = 0) { const s = projS(y); return [W / 2 + (x - W / 2) * s, projY(y) - (z + ZB) * VIEW.ZS * s]; }

/* ---------- Farbhilfen ---------- */
const rgbCache = new Map();
function rgbOf(c) {
  let v = rgbCache.get(c);
  if (!v) { const n = parseInt(c.slice(1), 16); v = [(n >> 16) & 255, (n >> 8) & 255, n & 255]; rgbCache.set(c, v); }
  return v;
}
const mul = (rgb, f) => 'rgb(' + clamp(Math.round(rgb[0] * f), 0, 255) + ',' + clamp(Math.round(rgb[1] * f), 0, 255) + ',' + clamp(Math.round(rgb[2] * f), 0, 255) + ')';
const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

/* ---------- Geometrie-Grundformen ---------- */
function polyArea(p) { let a = 0; for (let i = 0; i < p.length; i++) { const j = (i + 1) % p.length; a += p[i][0] * p[j][1] - p[j][0] * p[i][1]; } return a; }
/** Sorgt für einheitlichen Umlaufsinn (positive Fläche bei y nach unten). */
const cw = p => polyArea(p) < 0 ? p.slice().reverse() : p;
function fillPoly(ctx, pts, style) {
  ctx.fillStyle = style; ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath(); ctx.fill();
}
/** Lokales Vieleck (um 0,0) → Welt. */
function toWorld(loc, x, y, a) { const ca = Math.cos(a), sa = Math.sin(a); return loc.map(([lx, ly]) => [x + lx * ca - ly * sa, y + lx * sa + ly * ca]); }
function rectLoc(x0, y0, x1, y1) { return [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]; }
function circleLoc(r, k = 10) { const p = []; for (let i = 0; i < k; i++) { const a = i / k * Math.PI * 2; p.push([Math.cos(a) * r, Math.sin(a) * r]); } return p; }
/**
 * Prisma: Grundfläche foot (Welt, positive Fläche) von Höhe z0 bis z1.
 * Sichtbar sind nur Seiten, die zur Kamera (Bildschirm unten) zeigen, plus die Oberseite.
 * side/top: [r,g,b] oder CSS-String; side wird je nach Ausrichtung schattiert.
 */
function prism(ctx, foot, z0, z1, top, side, onFace) {
  const n = foot.length;
  const T = foot.map(p => P(p[0], p[1], z1));
  if (side) {
    const B = foot.map(p => P(p[0], p[1], z0));
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n, ex = foot[j][0] - foot[i][0], ey = foot[j][1] - foot[i][1];
      const l = Math.hypot(ex, ey) || 1, nx = ey / l, ny = -ex / l;
      if (ny <= 0.03) continue;
      const st = typeof side === 'string' ? side : mul(side, 0.74 - 0.2 * nx);
      fillPoly(ctx, [B[i], B[j], T[j], T[i]], st);
      if (onFace) onFace(foot[i], foot[j], z0, z1, nx, ny);
    }
  }
  if (top) fillPoly(ctx, T, typeof top === 'string' ? top : mul(top, 1));
  return T;
}
/** Viereck auf einer senkrechten Wand zwischen den Fußpunkten a→b, Anteil u0..u1, Höhe z0..z1. */
function wallQuad(ctx, a, b, u0, u1, z0, z1, style) {
  const ax = lerp(a[0], b[0], u0), ay = lerp(a[1], b[1], u0), bx = lerp(a[0], b[0], u1), by = lerp(a[1], b[1], u1);
  fillPoly(ctx, [P(ax, ay, z0), P(bx, by, z0), P(bx, by, z1), P(ax, ay, z1)], style);
}
/** Zeichnet Text auf eine senkrechte Wand (für Werbebanden). */
function wallText(ctx, a, b, z0, z1, text, color, bg) {
  let A = P(a[0], a[1], z0), B = P(b[0], b[1], z0), C = P(a[0], a[1], z1);
  if (B[0] < A[0]) { const D = P(b[0], b[1], z1); [A, B, C] = [B, A, D]; }
  const fw = 60, fh = 10;
  ctx.save();
  ctx.transform((B[0] - A[0]) / fw, (B[1] - A[1]) / fw, (A[0] - C[0]) / fh, (A[1] - C[1]) / fh, C[0], C[1]);   // relativ zur aktuellen Transformation (Zoom/Auflösung)
  if (bg) { ctx.fillStyle = bg; ctx.fillRect(0, 0, fw, fh); }
  ctx.fillStyle = color; ctx.font = '700 7px "Chakra Petch",sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, fw / 2, fh / 2 + 0.5);
  ctx.restore();
}

/* ---------- Sprites (vorgerenderte Baumkronen, Büsche) ---------- */
const spriteCache = new Map();
function sprite(key, r, fn) {
  let c = spriteCache.get(key);
  if (!c) {
    const sz = Math.ceil(r * 2 * 3 + 6);
    c = document.createElement('canvas'); c.width = c.height = sz;
    const g = c.getContext('2d'); g.translate(sz / 2, sz / 2); g.scale(3, 3);
    fn(g, r); spriteCache.set(key, c);
  }
  return c;
}
function drawSprite(ctx, spr, x, y, z) {
  const [X, Y] = P(x, y, z), s = projS(y), w = spr.width / 3 * s;
  ctx.drawImage(spr, X - w / 2, Y - w / 2, w, w);
}
/** Laubkrone von oben: viele Blattbüschel, links oben im Licht, rechts unten im Schatten. layer 0 = unten/dunkel, 1 = Spitze/hell */
function canopySprite(theme, r, v, layer = 0) {
  return sprite('can' + theme + Math.round(r * 2) + '_' + v + '_' + layer, r, (g, r) => {
    const hues = theme === 'city' ? [[47, 108, 54], [58, 112, 50], [42, 98, 60]] : theme === 'desert' ? [[74, 140, 60], [96, 142, 58], [70, 128, 66]] : [[50, 124, 48], [72, 134, 44], [40, 110, 58], [86, 138, 50]];
    const base = hues[v % hues.length].map(c => c * (layer ? 1.12 : 0.92));
    const rng = mulberry32(v * 97 + Math.round(r) + layer * 13);
    if (!layer) { g.fillStyle = mul(base, 0.5); g.beginPath(); g.arc(0.7, 1.2, r * 0.96, 0, 7); g.fill(); }
    // Büschel: zuerst die schattigen (rechts unten), zuletzt die hellen (links oben)
    const lobes = [];
    for (let i = 0; i < 11; i++) { const a = rng() * 6.283, d = r * (0.15 + 0.5 * rng()); lobes.push([Math.cos(a) * d, Math.sin(a) * d, r * (0.3 + rng() * 0.2)]); }
    lobes.sort((p, q) => (q[0] + q[1]) - (p[0] + p[1]));
    for (const [x, y, rr] of lobes) {
      const lit = clamp(0.5 - (x + y) / (r * 1.6), 0, 1);
      const gr = g.createRadialGradient(x - rr * 0.35, y - rr * 0.4, rr * 0.05, x, y, rr);
      gr.addColorStop(0, mul([base[0] + 26, base[1] + 14, base[2]], 0.95 + lit * 0.6)); gr.addColorStop(0.55, mul(base, 0.8 + lit * 0.38)); gr.addColorStop(1, mul(base, 0.52 + lit * 0.24));
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, rr, 0, 7); g.fill();
    }
    // Blätter: helle Tupfer im Licht, dunkle im Schatten
    for (let i = 0; i < 46; i++) {
      const a = rng() * 6.283, d = r * 0.82 * Math.sqrt(rng()), x = Math.cos(a) * d, y = Math.sin(a) * d, lit = (x + y) < 0;
      g.fillStyle = lit ? 'rgba(236,250,170,' + (0.10 + rng() * 0.16) + ')' : 'rgba(8,40,20,' + (0.05 + rng() * 0.09) + ')';
      g.beginPath(); g.ellipse(x, y, 0.5 + rng() * 0.9, 0.35 + rng() * 0.5, rng() * 3, 0, 7); g.fill();
    }
  });
}
function pineSprite(r, layer) {
  return sprite('pine' + Math.round(r * 2) + '_' + layer, r, (g, r) => {
    const cols = [[26, 66, 46], [34, 84, 58], [46, 104, 72]][layer];
    const k = 9, star = (rad, inner, ox, oy) => { g.beginPath(); for (let i = 0; i <= k * 2; i++) { const a = i / (k * 2) * Math.PI * 2 + layer * 0.35, q = i % 2 ? rad * inner : rad; g.lineTo(Math.cos(a) * q + ox, Math.sin(a) * q + oy); } g.fill(); };
    g.fillStyle = mul(cols, 0.6); star(r, 0.6, 0.7, 1);
    const gr = g.createLinearGradient(-r, -r, r, r); gr.addColorStop(0, mul(cols, 1.35)); gr.addColorStop(0.5, mul(cols, 1)); gr.addColorStop(1, mul(cols, 0.68));
    g.fillStyle = gr; star(r * 0.96, 0.58, 0, 0);
    // Schnee auf den Astspitzen, im Licht kräftiger
    for (let i = 0; i < k; i++) { const a = i / k * Math.PI * 2 + layer * 0.35, lit = Math.cos(a) + Math.sin(a) < 0.2; g.fillStyle = lit ? 'rgba(255,255,255,.94)' : 'rgba(206,222,244,.86)'; g.beginPath(); g.ellipse(Math.cos(a) * r * 0.64, Math.sin(a) * r * 0.64 - 0.4, r * 0.19, r * 0.11, a, 0, 7); g.fill(); }
    if (layer === 2) { g.fillStyle = 'rgba(255,255,255,.95)'; g.beginPath(); g.arc(-0.3, -0.3, r * 0.3, 0, 7); g.fill(); }
  });
}
function palmSprite(r) {
  return sprite('palm' + Math.round(r), r, (g, r) => {
    const k = 8;
    for (let i = 0; i < k; i++) {
      g.save(); g.rotate(i / k * Math.PI * 2 + 0.3);
      const grd = g.createLinearGradient(0, 0, r, 0); grd.addColorStop(0, '#2f6e2c'); grd.addColorStop(1, i % 2 ? '#6fbf55' : '#58a845');
      g.fillStyle = grd; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(r * 0.5, -r * 0.28, r, 0); g.quadraticCurveTo(r * 0.5, r * 0.12, 0, 0); g.fill();
      g.restore();
    }
    g.fillStyle = '#7a5530'; g.beginPath(); g.arc(0, 0, r * 0.14, 0, 7); g.fill();
  });
}
function bushSprite(theme, r, v) {
  return sprite('bush' + theme + Math.round(r) + '_' + v, r, (g, r) => {
    const base = theme === 'desert' ? [125, 138, 62] : theme === 'snow' ? [60, 92, 70] : [62, 125, 52];
    const rng = mulberry32(v * 31 + 5);
    for (let i = 0; i < 6; i++) {
      const a = rng() * 6.28, d = r * 0.4 * rng(), rr = r * (0.42 + rng() * 0.2);
      const gr = g.createRadialGradient(Math.cos(a) * d - rr * 0.3, Math.sin(a) * d - rr * 0.3, 0, Math.cos(a) * d, Math.sin(a) * d, rr);
      gr.addColorStop(0, mul(base, 1.35)); gr.addColorStop(1, mul(base, 0.7));
      g.fillStyle = gr; g.beginPath(); g.arc(Math.cos(a) * d, Math.sin(a) * d, rr, 0, 7); g.fill();
    }
    if (theme === 'snow') { g.fillStyle = 'rgba(255,255,255,.8)'; g.beginPath(); g.arc(-r * 0.2, -r * 0.25, r * 0.35, 0, 7); g.fill(); }
    else if (theme !== 'desert') for (let i = 0; i < 4; i++) { g.fillStyle = ['#ffd23e', '#ff6fb5', '#ffffff'][i % 3]; g.beginPath(); g.arc((rng() - 0.5) * r, (rng() - 0.5) * r, 0.9, 0, 7); g.fill(); }
  });
}

/* ---------- Objekte mit Höhe ---------- */
const HOUSE_WALL = { meadow: [[232, 222, 202], [214, 200, 176]], city: [[206, 198, 186], [186, 178, 168], [168, 158, 150]], desert: [[228, 200, 156]], snow: [[150, 104, 66], [170, 120, 78]] };
const HOUSE_ROOF = { meadow: [[176, 72, 52], [150, 64, 50], [92, 104, 124]], city: [[88, 96, 112], [160, 70, 56], [118, 108, 98]], desert: [[200, 160, 110]], snow: [[244, 248, 252]] };
/** Höhe eines Objekts (für Schatten und Sortierung). */
function objHeight(o) {
  return { tree: o.w * 1.1, tires: 9, house: o.pit ? 15 : 18 + (o.w > 52 ? 4 : 0) + 10, wall: 12, rail: 8, stand: 32, banner: 8, fence: 12, bush: o.w * 0.5, rock: o.w * 0.4, flag: 34,
    lamp: 36, container: containerStack(o) * 16, ramp: o.z || 12, bridge: (o.z || 30) + 6, gate: 12 }[o.t] || 10;
}
const containerStack = o => (Math.floor(o.x * 13 + o.y * 7) >>> 0) % 3 === 0 ? 2 : 1;
const CONTAINER_COL = [[178, 60, 48], [44, 96, 160], [52, 128, 80], [214, 128, 40], [120, 124, 132]];
/** Lokale Koordinaten eines Objekts → Bildschirm. */
function objQ(o, lx, ly, z) { const ca = Math.cos(o.a), sa = Math.sin(o.a); return P(o.x + lx * ca - ly * sa, o.y + lx * sa + ly * ca, z); }
/** Grundriss eines Objekts in Weltkoordinaten (für Schatten). */
function objFoot(o) {
  if (o.t === 'rock') return cw(rockPoly(o));
  if (OBJ_DEF[o.t] && OBJ_DEF[o.t].round) return toWorld(circleLoc(o.t === 'tree' ? Math.max(2.5, o.w * 0.09) : o.w / 2, 10), o.x, o.y, 0);
  return toWorld(rectLoc(-o.w / 2, -Math.max(1.5, o.h / 2), o.w / 2, Math.max(1.5, o.h / 2)), o.x, o.y, o.a);
}
const SHADOW_DIR = [0.55, 0.38];      // Schattenversatz je Höheneinheit (Sonne links hinten)
/** Schatten eines Objekts auf eine flache Weltebene (schwarz, Deckkraft wird später gesetzt). */
function drawShadowFlat(g, o) {
  const h = objHeight(o);
  g.fillStyle = '#000';
  if (o.t === 'tree' || o.t === 'bush') {
    const r = o.w / 2, zc = o.t === 'tree' ? o.w * 0.75 : o.w * 0.25;
    g.beginPath(); g.ellipse(o.x + SHADOW_DIR[0] * zc, o.y + SHADOW_DIR[1] * zc, r * 1.05, r * 0.9, 0.5, 0, 7); g.fill();
    if (o.t === 'tree') { g.lineWidth = Math.max(2, o.w * 0.12); g.strokeStyle = '#000'; g.beginPath(); g.moveTo(o.x, o.y); g.lineTo(o.x + SHADOW_DIR[0] * zc, o.y + SHADOW_DIR[1] * zc); g.stroke(); }
    return;
  }
  if (o.t === 'flag' || o.t === 'lamp') { g.lineWidth = 2; g.strokeStyle = '#000'; g.beginPath(); g.moveTo(o.x, o.y); g.lineTo(o.x + SHADOW_DIR[0] * h, o.y + SHADOW_DIR[1] * h); g.stroke(); return; }
  if (o.t === 'bridge') {
    const f = objFoot(o), dx = SHADOW_DIR[0] * o.z * 0.35, dy = SHADOW_DIR[1] * o.z * 0.35;
    g.beginPath(); f.forEach(([x, y], i) => i ? g.lineTo(x + dx, y + dy) : g.moveTo(x + dx, y + dy)); g.closePath(); g.fill();
    return;
  }
  if (o.t === 'ramp') {
    const ca = Math.cos(o.a), sa = Math.sin(o.a), W2 = (lx, ly) => [o.x + lx * ca - ly * sa, o.y + lx * sa + ly * ca];
    const pts = [W2(-o.w / 2, -o.h / 2), W2(o.w / 2, -o.h / 2), W2(o.w / 2, o.h / 2), W2(-o.w / 2, o.h / 2)];
    pts[1] = [pts[1][0] + SHADOW_DIR[0] * o.z, pts[1][1] + SHADOW_DIR[1] * o.z]; pts[2] = [pts[2][0] + SHADOW_DIR[0] * o.z, pts[2][1] + SHADOW_DIR[1] * o.z];
    g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.fill();
    return;
  }
  const f = objFoot(o);
  for (let k = 0; k <= 6; k++) {
    const dx = SHADOW_DIR[0] * h * k / 6, dy = SHADOW_DIR[1] * h * k / 6;
    g.beginPath(); f.forEach(([x, y], i) => i ? g.lineTo(x + dx, y + dy) : g.moveTo(x + dx, y + dy)); g.closePath(); g.fill();
  }
}
/** Zeichnet ein Objekt in der schrägen Ansicht. */
function drawObject3D(ctx, o, theme, time) {
  const seed = Math.floor(o.x * 13 + o.y * 7) >>> 0;
  switch (o.t) {
    case 'tree': {
      const r = o.w / 2;
      if (theme === 'snow') {
        prism(ctx, toWorld(circleLoc(Math.max(2, o.w * 0.08), 6), o.x, o.y, 0), 0, o.w * 0.3, [92, 62, 38], [92, 62, 38]);
        drawSprite(ctx, pineSprite(r, 0), o.x, o.y, o.w * 0.35);
        drawSprite(ctx, pineSprite(r * 0.74, 1), o.x, o.y, o.w * 0.7);
        drawSprite(ctx, pineSprite(r * 0.46, 2), o.x, o.y, o.w * 1.05);
      } else if (theme === 'desert') {
        const top = o.w * 1.05, [X0, Y0] = P(o.x, o.y, 0), [X1, Y1] = P(o.x + 2, o.y - 1, top), s = projS(o.y);
        ctx.strokeStyle = '#7a5a36'; ctx.lineWidth = Math.max(2, o.w * 0.1) * s; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(X0, Y0); ctx.quadraticCurveTo(X0 + 3 * s, (Y0 + Y1) / 2, X1, Y1); ctx.stroke();
        ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.lineWidth = 1; for (let k = 1; k < 6; k++) { const yy = lerp(Y0, Y1, k / 6); ctx.beginPath(); ctx.moveTo(X0 - 2 * s, yy); ctx.lineTo(X0 + 3 * s, yy); ctx.stroke(); }
        drawSprite(ctx, palmSprite(r), o.x + 2, o.y - 1, top);
      } else {
        prism(ctx, toWorld(circleLoc(Math.max(2.2, o.w * 0.09), 6), o.x, o.y, 0), 0, o.w * 0.5, [96, 66, 40], [96, 66, 40]);
        drawSprite(ctx, canopySprite(theme, r, seed % 4, 0), o.x, o.y, o.w * 0.72);
        drawSprite(ctx, canopySprite(theme, r * 0.62, seed % 4, 1), o.x - r * 0.1, o.y - r * 0.06, o.w * 1.0);
      }
      break;
    }
    case 'bush': drawSprite(ctx, bushSprite(theme, o.w / 2, seed % 3), o.x, o.y, o.w * 0.25); break;
    case 'rock': {
      const base = theme === 'desert' ? [168, 118, 78] : theme === 'snow' ? [132, 136, 146] : [140, 142, 148];
      const T = prism(ctx, cw(rockPoly(o)), 0, o.w * 0.4, mul(base, 1.08), base);
      if (theme === 'snow') { ctx.globalAlpha = 0.85; fillPoly(ctx, T.map(([X, Y], i) => [X + (T[0][0] - X) * 0.25, Y + (T[0][1] - Y) * 0.25]), '#f5f8fc'); ctx.globalAlpha = 1; }
      break;
    }
    case 'tires': {
      const f = toWorld(circleLoc(o.w / 2, 12), o.x, o.y, 0), band = (seed & 1) ? [226, 60, 60] : [238, 238, 238];
      prism(ctx, f, 0, 3.8, null, [30, 31, 34]);
      prism(ctx, f, 3.8, 5.2, null, band);
      prism(ctx, f, 5.2, 9, [28, 29, 32], [30, 31, 34]);
      fillPoly(ctx, toWorld(circleLoc(o.w * 0.22, 10), o.x, o.y, 0).map(p => P(p[0], p[1], 9)), '#4a4d55');
      break;
    }
    case 'wall': {
      const base = theme === 'desert' ? [190, 152, 112] : [170, 174, 180];
      const loc = rectLoc(-o.w / 2, -o.h / 2, o.w / 2, o.h / 2), f = toWorld(loc, o.x, o.y, o.a);
      prism(ctx, f, 0, 12, mul(base, 1.12), base, (a, b) => {
        ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.lineWidth = 1;
        const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
        for (let u = 10; u < L; u += 10) { const t = u / L, [X0, Y0] = P(lerp(a[0], b[0], t), lerp(a[1], b[1], t), 0), [X1, Y1] = P(lerp(a[0], b[0], t), lerp(a[1], b[1], t), 12); ctx.beginPath(); ctx.moveTo(X0, Y0); ctx.lineTo(X1, Y1); ctx.stroke(); }
      });
      break;
    }
    case 'rail': {
      for (let u = -o.w / 2 + 3; u < o.w / 2; u += 12) prism(ctx, toWorld(rectLoc(u - 0.8, -0.8, u + 0.8, 0.8), o.x, o.y, o.a), 0, 7, [70, 76, 86], [70, 76, 86]);
      prism(ctx, toWorld(rectLoc(-o.w / 2, -1.2, o.w / 2, 1.2), o.x, o.y, o.a), 4.2, 8.2, [228, 233, 240], [196, 204, 214], (a, b, z0, z1) => wallQuad(ctx, a, b, 0, 1, 5.8, 6.6, 'rgba(90,100,112,.55)'));
      break;
    }
    case 'fence': {
      const f = toWorld(rectLoc(-o.w / 2, -1, o.w / 2, 1), o.x, o.y, o.a);
      prism(ctx, f, 0, 12, null, 'rgba(176,186,198,0.28)', (a, b) => {
        ctx.strokeStyle = 'rgba(200,208,218,.55)'; ctx.lineWidth = 0.7;
        for (let k = 0; k <= 12; k++) { const t = k / 12, [X0, Y0] = P(lerp(a[0], b[0], t), lerp(a[1], b[1], t), 0), [X1, Y1] = P(lerp(a[0], b[0], t), lerp(a[1], b[1], t), 12); ctx.beginPath(); ctx.moveTo(X0, Y0); ctx.lineTo(X1, Y1); ctx.stroke(); }
        for (const z of [4, 8, 12]) { const [X0, Y0] = P(a[0], a[1], z), [X1, Y1] = P(b[0], b[1], z); ctx.beginPath(); ctx.moveTo(X0, Y0); ctx.lineTo(X1, Y1); ctx.stroke(); }
      });
      for (let u = -o.w / 2; u <= o.w / 2 + 0.1; u += o.w / 2) prism(ctx, toWorld(rectLoc(u - 0.8, -0.8, u + 0.8, 0.8), o.x, o.y, o.a), 0, 13, [110, 118, 128], [110, 118, 128]);
      break;
    }
    case 'banner': {
      const bc = BANNER_COLS[(o.c || 0) % BANNER_COLS.length];
      const f = toWorld(rectLoc(-o.w / 2, -1.2, o.w / 2, 1.2), o.x, o.y, o.a);
      prism(ctx, f, 0, 8, '#e9edf2', rgbOf(bc[0]), (a, b, z0, z1, nx, ny) => { if (ny > 0.3) wallText(ctx, a, b, 0, 8, bc[1], '#fff', null); });
      break;
    }
    case 'cpflag': {
      // Fahnenmast mit Wimpel und Nummer; nächster Checkpoint (Spieler 1) grün und pulsierend
      const s = projS(o.y), hl = !!o.hl, h = 36;
      const [X0, Y0] = P(o.x, o.y, 0), [X1, Y1] = P(o.x, o.y, h);
      ctx.strokeStyle = '#e8ebef'; ctx.lineWidth = 2 * s; ctx.beginPath(); ctx.moveTo(X0, Y0); ctx.lineTo(X1, Y1); ctx.stroke();
      const col = hl ? (Math.sin((time || 0) * 8) > -0.3 ? '#3bea7a' : '#1f9a50') : '#ff8a2b';
      const pts = [];
      for (let k = 0; k <= 5; k++) { const u = k / 5, wv = Math.sin((time || 0) * 7 - u * 4 + o.x) * 1.6 * u; pts.push(P(o.x + u * 16, o.y + wv, h - u * 5)); }
      for (let k = 5; k >= 0; k--) { const u = k / 5, wv = Math.sin((time || 0) * 7 - u * 4 + o.x) * 1.6 * u; pts.push(P(o.x + u * 16, o.y + wv, h - 12 + u * 5)); }
      fillPoly(ctx, pts, col);
      const [NX, NY] = P(o.x + 5.5, o.y, h - 6.2);
      ctx.fillStyle = '#111'; ctx.font = '700 ' + (8 * s).toFixed(1) + 'px "Chakra Petch",sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(o.k), NX, NY + 0.3);
      if (hl) { const g = ctx.createRadialGradient(X0, Y0, 0, X0, Y0, 10 * s); g.addColorStop(0, 'rgba(59,234,122,.5)'); g.addColorStop(1, 'rgba(59,234,122,0)'); ctx.fillStyle = g; ctx.fillRect(X0 - 10 * s, Y0 - 10 * s, 20 * s, 20 * s); }
      break;
    }
    case 'gate': {
      // Pfosten + Schlagbaum (rot-weiß), hebt sich je nach Zustand
      const op = gateOpenness(o, time || 0), lift = op * 1.35, s = projS(o.y);
      const ca = Math.cos(o.a), sa = Math.sin(o.a), px = o.x - ca * (o.w / 2 + 3), py = o.y - sa * (o.w / 2 + 3);
      prism(ctx, toWorld(rectLoc(-2.5, -2.5, 2.5, 2.5), px, py, o.a), 0, 11, [230, 230, 232], [170, 170, 176]);
      const L = o.w + 2, ex = px + ca * Math.cos(lift) * L, ey = py + sa * Math.cos(lift) * L, ez = 9 + Math.sin(lift) * L;
      const A = P(px, py, 9), B = P(ex, ey, ez);
      ctx.lineCap = 'butt'; ctx.lineWidth = 3.2 * s;
      for (let k = 0; k < 6; k++) {
        const u0 = k / 6, u1 = (k + 1) / 6;
        ctx.strokeStyle = k % 2 ? '#f4f4f4' : '#e0262b'; ctx.beginPath();
        ctx.moveTo(A[0] + (B[0] - A[0]) * u0, A[1] + (B[1] - A[1]) * u0); ctx.lineTo(A[0] + (B[0] - A[0]) * u1, A[1] + (B[1] - A[1]) * u1); ctx.stroke();
      }
      const lamp = P(px, py, 12.5); ctx.fillStyle = op < 0.5 ? '#ff3030' : '#3bea7a'; ctx.beginPath(); ctx.arc(lamp[0], lamp[1], 2 * s, 0, 7); ctx.fill();
      break;
    }
    case 'flag': {
      const [X0, Y0] = P(o.x, o.y, 0), [X1, Y1] = P(o.x, o.y, 34), s = projS(o.y);
      ctx.strokeStyle = '#d9dde3'; ctx.lineWidth = 1.4 * s; ctx.beginPath(); ctx.moveTo(X0, Y0); ctx.lineTo(X1, Y1); ctx.stroke();
      const top = [], bot = [];
      for (let k = 0; k <= 6; k++) {
        const u = k / 6, wv = Math.sin(time * 6 - u * 4 + seed) * 2.2 * u;
        top.push(P(o.x + u * 14, o.y + wv, 34)); bot.push(P(o.x + u * 14, o.y + wv, 25));
      }
      const pts = top.concat(bot.reverse());
      fillPoly(ctx, pts, (o.c || 0) ? '#16181d' : '#ff6a2b');
      if (o.c) { ctx.fillStyle = '#f4f4f4'; for (let k = 0; k < 6; k++) for (let j = 0; j < 2; j++) if ((k + j) % 2) { const a = P(o.x + k * 14 / 6, o.y, 34 - j * 4.5), b = P(o.x + (k + 1) * 14 / 6, o.y, 34 - (j + 1) * 4.5); ctx.fillRect(a[0], a[1], b[0] - a[0], b[1] - a[1]); } }
      break;
    }
    case 'stand': drawStand(ctx, o, seed); break;
    case 'lamp': {
      prism(ctx, toWorld(rectLoc(-0.9, -0.9, 0.9, 0.9), o.x, o.y, o.a), 0, 34, [70, 76, 86], [70, 76, 86]);
      prism(ctx, toWorld(rectLoc(-0.5, -0.6, 9, 0.6), o.x, o.y, o.a), 33.5, 35, [80, 86, 96], [80, 86, 96]);
      prism(ctx, toWorld(rectLoc(6.5, -1.8, 10.5, 1.8), o.x, o.y, o.a), 32, 34.5, [60, 64, 72], [255, 240, 200]);
      break;
    }
    case 'container': {
      const c = CONTAINER_COL[(o.c || 0) % CONTAINER_COL.length], n = containerStack(o);
      for (let k = 0; k < n; k++) {
        const col = k ? CONTAINER_COL[((o.c || 0) + 2) % CONTAINER_COL.length] : c;
        prism(ctx, toWorld(rectLoc(-o.w / 2, -o.h / 2, o.w / 2, o.h / 2), o.x, o.y, o.a), k * 16, k * 16 + 15.5, mul(col, 1.15), col, (a, b, z0, z1) => {
          const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
          ctx.strokeStyle = 'rgba(0,0,0,.2)'; ctx.lineWidth = 0.8;
          for (let u = 3; u < L; u += 3.5) { const t = u / L, A = P(lerp(a[0], b[0], t), lerp(a[1], b[1], t), z0 + 1), B = P(lerp(a[0], b[0], t), lerp(a[1], b[1], t), z1 - 1); ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.stroke(); }
        });
      }
      break;
    }
    case 'ramp': drawRamp(ctx, o); break;
    case 'bridge': drawBridge(ctx, o); break;
    case 'house': drawHouse(ctx, o, theme, seed); break;
  }
}
/** Sprungrampe: schräge Holzfläche, Warnstreifen an der Kante. Basishöhe = ZB. */
function drawRamp(ctx, o) {
  const w = o.w, h = o.h, z = o.z || 12, ca = Math.cos(o.a), sa = Math.sin(o.a);
  const Q = (lx, ly, zz) => objQ(o, lx, ly, zz);
  // Seiten (Dreiecke) und Stirnseite, nur wenn zur Kamera gewandt
  for (const sd of [-1, 1]) { const ny = sd * ca; if (ny > 0.03) fillPoly(ctx, [Q(-w / 2, sd * h / 2, 0), Q(w / 2, sd * h / 2, 0), Q(w / 2, sd * h / 2, z)], mul([120, 86, 52], 0.7 - 0.2 * (-sd * sa))); }
  if (sa > 0.03) fillPoly(ctx, [Q(w / 2, -h / 2, 0), Q(w / 2, h / 2, 0), Q(w / 2, h / 2, z), Q(w / 2, -h / 2, z)], mul([110, 78, 48], 0.75));
  fillPoly(ctx, [Q(-w / 2, -h / 2, 0), Q(w / 2, -h / 2, z), Q(w / 2, h / 2, z), Q(-w / 2, h / 2, 0)], mul([176, 132, 84], 1.05 - 0.1 * ca));
  ctx.strokeStyle = 'rgba(60,40,20,.35)'; ctx.lineWidth = 0.8;
  for (let k = 1; k < 6; k++) { const u = -w / 2 + k * w / 6, zz = z * k / 6, A = Q(u, -h / 2, zz), B = Q(u, h / 2, zz); ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.stroke(); }
  // Warnstreifen an der Abrisskante
  const n = Math.max(4, Math.round(h / 6));
  for (let k = 0; k < n; k++) {
    const y0 = -h / 2 + k * h / n, y1 = y0 + h / n;
    fillPoly(ctx, [Q(w / 2 - 5, y0, z * (w - 5) / w), Q(w / 2, y0, z), Q(w / 2, y1, z), Q(w / 2 - 5, y1, z * (w - 5) / w)], k % 2 ? '#1b1b1b' : '#ffcc22');
  }
}
/** Brücke: Fahrbahndeck mit Geländer, Widerlager bzw. Pfeiler. Höhe absolut (ZB = 0). */
function drawBridge(ctx, o) {
  const w = o.w, h = o.h, z = o.z || 30, ca = Math.cos(o.a), sa = Math.sin(o.a);
  const foot = (x0, y0, x1, y1) => toWorld(rectLoc(x0, y0, x1, y1), o.x, o.y, o.a);
  const Q = (lx, ly, zz) => objQ(o, lx, ly, zz);
  const conc = [168, 168, 162];
  // Pfeiler / Widerlager
  const water = o.water;
  if (water) for (const u of [-w / 4, w / 4]) prism(ctx, foot(u - 3, -h / 2 + 6, u + 3, h / 2 - 6), 0, z - 5, mul(conc, 1.05), conc);
  for (const sd of [-1, 1]) {
    const ex = o.x + ca * sd * w / 2, ey = o.y + sa * sd * w / 2;
    if (o.endH == null || o.endH[sd > 0 ? 1 : 0] < z - 8) prism(ctx, foot(sd > 0 ? w / 2 - 5 : -w / 2, -h / 2, sd > 0 ? w / 2 : -w / 2 + 5, h / 2), 0, z - 5, mul(conc, 1.05), conc);
  }
  // Deck
  prism(ctx, foot(-w / 2, -h / 2, w / 2, h / 2), z - 5, z, [74, 78, 86], [150, 150, 146]);
  // Markierungen
  for (const sd of [-1, 1]) fillPoly(ctx, [Q(-w / 2, sd * (h / 2 - 6), z), Q(w / 2, sd * (h / 2 - 6), z), Q(w / 2, sd * (h / 2 - 7.5), z), Q(-w / 2, sd * (h / 2 - 7.5), z)], 'rgba(235,235,230,.85)');
  for (let u = -w / 2 + 4; u < w / 2 - 8; u += 14) fillPoly(ctx, [Q(u, -0.7, z), Q(u + 7, -0.7, z), Q(u + 7, 0.7, z), Q(u, 0.7, z)], 'rgba(235,235,230,.8)');
  // Geländer (hinteres zuerst)
  const sides = [-1, 1].sort((a, b) => (a * ca) - (b * ca));
  for (const sd of sides) {
    const y0 = sd * (h / 2 - 2), y1 = sd * (h / 2);
    for (let u = -w / 2 + 2; u <= w / 2 - 2; u += 10) prism(ctx, foot(u - 0.7, Math.min(y0, y1), u + 0.7, Math.max(y0, y1)), z, z + 6, [90, 96, 108], [90, 96, 108]);
    prism(ctx, foot(-w / 2, Math.min(y0, y1), w / 2, Math.max(y0, y1)), z + 4.5, z + 6.5, [214, 220, 228], [176, 184, 194]);
  }
}
function drawHouse(ctx, o, theme, seed) {
  const w = o.w, h = o.h;
  if (o.pit) {
    const f = toWorld(rectLoc(-w / 2, -h / 2, w / 2, h / 2), o.x, o.y, o.a);
    const T = prism(ctx, f, 0, 15, [128, 136, 150], [178, 184, 194], (a, b, z0, z1, nx, ny) => {
      if (ny < 0.3) return;
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.floor(L / 30));
      for (let k = 0; k < n; k++) { wallQuad(ctx, a, b, (k + 0.15) / n, (k + 0.85) / n, 0, 10, '#3a404b'); wallQuad(ctx, a, b, (k + 0.15) / n, (k + 0.85) / n, 8.6, 10, '#ffcd32'); }
    });
    const c = P(o.x, o.y, 15);
    ctx.fillStyle = '#ffcd32'; ctx.font = '700 ' + Math.round(9 * projS(o.y)) + 'px "Chakra Petch",sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('PIT', c[0], c[1]);
    return;
  }
  const walls = (HOUSE_WALL[theme] || HOUSE_WALL.meadow), roofs = (HOUSE_ROOF[theme] || HOUSE_ROOF.meadow);
  const wc = walls[seed % walls.length], rc = roofs[(seed >> 3) % roofs.length];
  const hw = 16 + (w > 52 ? 4 : 0), ridge = hw + 10;
  const f = toWorld(rectLoc(-w / 2, -h / 2, w / 2, h / 2), o.x, o.y, o.a);
  // Wände mit Fenstern und Tür
  prism(ctx, f, 0, hw, null, wc, (a, b, z0, z1, nx, ny) => {
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.floor(L / 12));
    for (let k = 0; k < n; k++) {
      const u0 = (k + 0.3) / n, u1 = (k + 0.7) / n;
      if (k === 0 && L > 30 && (seed & 1)) wallQuad(ctx, a, b, u0, u1, 0, 9, '#6b4a33');
      else { wallQuad(ctx, a, b, u0, u1, hw * 0.45, hw * 0.8, '#2d3a4a'); wallQuad(ctx, a, b, u0, u1, hw * 0.45, hw * 0.52, 'rgba(255,255,255,.35)'); }
    }
  });
  // Satteldach entlang der langen Seite (lokal x), mit Überstand
  const ov = 2.5, ca = Math.cos(o.a), sa = Math.sin(o.a);
  const W2 = (lx, ly) => [o.x + lx * ca - ly * sa, o.y + lx * sa + ly * ca];
  const pf = (lx, ly, z) => { const q = W2(lx, ly); return P(q[0], q[1], z); };
  // Giebeldreiecke
  for (const sx of [-1, 1]) {
    const nxw = sx * ca, nyw = sx * sa;              // Außennormale des Giebels
    if (nyw > 0.03) fillPoly(ctx, [pf(sx * w / 2, -h / 2, hw), pf(sx * w / 2, h / 2, hw), pf(sx * w / 2, 0, ridge)], mul(wc, 0.74 - 0.2 * nxw));
  }
  const faceF = [pf(-w / 2 - ov, h / 2 + ov, hw - 1), pf(w / 2 + ov, h / 2 + ov, hw - 1), pf(w / 2 + ov, 0, ridge), pf(-w / 2 - ov, 0, ridge)];
  const faceB = [pf(-w / 2 - ov, -h / 2 - ov, hw - 1), pf(w / 2 + ov, -h / 2 - ov, hw - 1), pf(w / 2 + ov, 0, ridge), pf(-w / 2 - ov, 0, ridge)];
  const frontFacesCam = ca > 0 ? true : ca < 0 ? false : true;   // Normale der lokalen +y-Dachfläche: (-sin a, cos a)
  const lightF = 1.08 - 0.25 * (-sa), lightB = 1.08 - 0.25 * sa;
  const first = frontFacesCam ? [faceB, lightB] : [faceF, lightF], second = frontFacesCam ? [faceF, lightF] : [faceB, lightB];
  fillPoly(ctx, first[0], mul(rc, clamp(first[1], 0.7, 1.25)));
  fillPoly(ctx, second[0], mul(rc, clamp(second[1], 0.7, 1.25)));
  // Dachziegel-Linien auf der vorderen Fläche
  ctx.strokeStyle = 'rgba(0,0,0,.12)'; ctx.lineWidth = 0.8;
  const sf = second[0];
  for (let k = 1; k < 4; k++) { const t = k / 4; ctx.beginPath(); ctx.moveTo(lerp(sf[0][0], sf[3][0], t), lerp(sf[0][1], sf[3][1], t)); ctx.lineTo(lerp(sf[1][0], sf[2][0], t), lerp(sf[1][1], sf[2][1], t)); ctx.stroke(); }
  ctx.strokeStyle = mul(rc, 0.6); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(sf[2][0], sf[2][1]); ctx.lineTo(sf[3][0], sf[3][1]); ctx.stroke();
  // Schornstein
  if (seed % 3 === 0) prism(ctx, toWorld(rectLoc(w * 0.18, -h * 0.25, w * 0.18 + 4, -h * 0.25 + 4), o.x, o.y, o.a), hw + 4, ridge + 4, [120, 70, 56], [140, 80, 64]);
}
function drawStand(ctx, o, seed) {
  const w = o.w, h = o.h, ca = Math.cos(o.a), sa = Math.sin(o.a), rows = 4, rh = h / rows;
  const W2 = (lx, ly) => [o.x + lx * ca - ly * sa, o.y + lx * sa + ly * ca];
  // Reihen von hinten (lokal -y, hoch) nach vorne – nach Bildschirmtiefe sortiert
  const list = [];
  for (let r = 0; r < rows; r++) {
    const y0 = h / 2 - (r + 1) * rh, y1 = h / 2 - r * rh;
    const c = W2(0, (y0 + y1) / 2);
    list.push({ r, y0, y1, key: c[1] });
  }
  list.push({ wall: true, key: W2(0, -h / 2)[1] });
  list.sort((a, b) => a.key - b.key);
  const time = Game.race ? Game.race.time : 0;
  for (const it of list) {
    if (it.wall) { prism(ctx, toWorld(rectLoc(-w / 2, -h / 2 - 2, w / 2, -h / 2), o.x, o.y, o.a), 0, 30, [92, 100, 116], [120, 128, 144]); continue; }
    const z = (it.r + 1) * 6;
    prism(ctx, toWorld(rectLoc(-w / 2, it.y0, w / 2, it.y1), o.x, o.y, o.a), 0, z, it.r % 2 ? [150, 158, 172] : [170, 178, 192], [120, 128, 142]);
    // Zuschauer
    for (let i = 0; i < w / 4.6; i++) {
      if (hash2(i + seed, it.r) < 0.22) continue;
      const lx = -w / 2 + 2.4 + i * 4.6, q = W2(lx, (it.y0 + it.y1) / 2);
      const jump = Math.max(0, Math.sin(time * 7 + i * 1.7 + it.r)) * 1.2;
      const body = P(q[0], q[1], z + 1.8 + jump), head = P(q[0], q[1], z + 4.2 + jump), s = projS(q[1]);
      ctx.fillStyle = CROWD[(i * 7 + it.r * 3 + seed) % CROWD.length]; ctx.fillRect(body[0] - 1.3 * s, body[1] - 1.3 * s, 2.6 * s, 2.8 * s);
      ctx.fillStyle = '#f0c8a0'; ctx.beginPath(); ctx.arc(head[0], head[1], 1.15 * s, 0, 7); ctx.fill();
    }
  }
  // Dach über den hinteren Reihen
  ctx.globalAlpha = 0.9;
  prism(ctx, toWorld(rectLoc(-w / 2 - 2, -h / 2 - 2, w / 2 + 2, -h / 2 + h * 0.45), o.x, o.y, o.a), 30, 31.5, [214, 220, 230], [160, 168, 180]);
  ctx.globalAlpha = 1;
}

/* ---------- Szene: Hintergrund, gekippter Boden, Lichtstimmung ---------- */
const THEME_SKY = {
  meadow: ['#7fb6e6', '#cfe6f2', [96, 142, 88], [70, 118, 70]],
  city: ['#8aa9c8', '#d5dfe8', [120, 132, 148], [92, 104, 120]],
  desert: ['#e8a868', '#f6dcb0', [196, 140, 92], [170, 110, 70]],
  snow: ['#9cc2ea', '#e6f0fa', [160, 176, 198], [120, 138, 162]],
  volcano: ['#6e3a32', '#d98c5c', [84, 58, 54], [52, 40, 40]],
  beach: ['#4fb0f2', '#d4f1fc', [64, 150, 200], [214, 196, 150]],
  quarry: ['#98b4cc', '#e4e8ea', [150, 146, 140], [118, 112, 106]],
  alpine: ['#74ade6', '#d8ecf8', [104, 136, 120], [74, 106, 82]]
};
/** Zeichnet eine Welt-Ebene (W×H) gekippt in den Bildschirm – in Streifen. */
function drawProjectedLayer(ctx, src, step = 4, rs = 1) {
  for (let y = 0; y < H; y += step) {
    const s = projS(y + step / 2), y0 = projY(y), y1 = projY(y + step);
    ctx.drawImage(src, 0, y * rs, W * rs, step * rs, W / 2 - W / 2 * s, y0, W * s, y1 - y0 + 0.7);
  }
}
/** Himmels- und Silhouettenfarben je Stil, Wetter und Tageszeit. */
function skyColors(theme, wx) {
  const sk = THEME_SKY[theme] || THEME_SKY.meadow;
  let top = rgbOf(sk[0]), bot = rgbOf(sk[1]), far = sk[2], near = sk[3];
  if (wx.sky === 'cloudy') { top = mix(top, [124, 133, 144], 0.55); bot = mix(bot, [190, 196, 204], 0.5); far = mix(far, [120, 126, 134], 0.3); }
  if (wx.sky === 'rain') { top = [92, 100, 112]; bot = [150, 158, 168]; far = mix(far, [96, 102, 112], 0.45); near = mix(near, [80, 86, 96], 0.35); }
  if (wx.time === 'dusk') { top = mix(top, [62, 52, 110], 0.75); bot = mix(bot, [250, 160, 96], 0.7); far = mix(far, [96, 64, 96], 0.5).map(v => v * 0.8); near = mix(near, [70, 46, 70], 0.5).map(v => v * 0.75); }
  if (wx.time === 'night') { top = [6, 10, 24]; bot = [28, 38, 66]; far = far.map(v => v * 0.26); near = near.map(v => v * 0.2); }
  return { top, bot, far, near };
}
const css = c => 'rgb(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ')';
const cssA = (c, a) => 'rgba(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ',' + a + ')';
const DYN_OBJ = new Set(['flag', 'stand', 'bridge', 'gate']);
/** Hat die Strecke nennenswerte Höhen? */
function hasHeights(t) { if (!t.hm) return false; for (let i = 0; i < t.hm.length; i++) if (t.hm[i] > 0.5) return true; return false; }
/**
 * Projiziert den flachen Boden mit Höhen in den Bildschirm (Spalten von hinten nach vorne).
 * Abfallende Kanten zur Kamera hin werden als dunklere Böschung gezeichnet.
 */
function splatTerrain(c, t, F, rs = 1) {
  // rs: Auflösungsfaktor (2 = doppelt so scharf für die Zoom-Kamera); Rechnung in Pixeln der Zielauflösung
  const WW = W * rs, HH = H * rs, zs = VIEW.ZS * rs;
  const src = F.getContext('2d').getImageData(0, 0, WW, HH).data;
  const img = c.getImageData(0, 0, WW, HH), out = img.data;
  const src32 = new Uint32Array(src.buffer), out32 = new Uint32Array(out.buffer);   // ganze Pixel in einem Schritt kopieren
  let hRow = new Float32Array(WW), hNext = new Float32Array(WW);
  // Höhenzeile schnell füllen: erst die beiden Rasterzeilen der Höhenkarte mischen, dann quer interpolieren (statt terrainH je Pixel)
  const hm = t.hm, colH = new Float32Array(HMW), gxs = new Float32Array(WW);
  for (let x = 0; x < WW; x++) gxs[x] = clamp((x + 0.5) / rs / HM, 0, HMW - 1.001);
  const fillRow = (arr, y) => {
    if (!hm) { arr.fill(0); return; }
    const gy = clamp((y + 0.5) / rs / HM, 0, HMH - 1.001), iy = gy | 0, fy = gy - iy, o = iy * HMW;
    for (let i = 0; i < HMW; i++) colH[i] = hm[o + i] * (1 - fy) + hm[o + HMW + i] * fy;
    for (let x = 0; x < WW; x++) { const gx = gxs[x], ix = gx | 0, fx = gx - ix; arr[x] = colH[ix] * (1 - fx) + colH[ix + 1] * fx; }
  };
  fillRow(hRow, 0);
  for (let y = 0; y < HH; y++) {
    if (y + 1 < HH) fillRow(hNext, y + 1); else hNext.set(hRow);
    const wy = y / rs, s = projS(wy + 0.5 / rs), s1 = projS(wy + 1.5 / rs), py = projY(wy) * rs, py1 = projY(wy + 1 / rs) * rs, step = py1 - py;
    for (let x = 0; x < WW; x++) {
      const X = Math.floor(WW / 2 + (x + 0.5 - WW / 2) * s);
      if (X < 0 || X >= WW) continue;
      const top = py - hRow[x] * zs * s, bot = py1 - hNext[x] * zs * s1;
      const y0 = Math.floor(top), y1 = Math.max(y0 + 1, Math.ceil(bot)), cliff = bot - top - step > 1.5 * rs, edge = top + step + 0.5;
      const sp = y * WW + x, si = sp * 4, Ya = y0 < 0 ? 0 : y0, Yb = y1 > HH ? HH : y1;
      if (!cliff) { const px = src32[sp]; for (let Y = Ya; Y < Yb; Y++) out32[Y * WW + X] = px; continue; }
      for (let Y = Ya; Y < Yb; Y++) {
        if (Y <= edge) { out32[Y * WW + X] = src32[sp]; continue; }
        const k = 0.62 - Math.min(0.15, (Y - edge) * 0.01 / rs), di = (Y * WW + X) * 4;
        out[di] = src[si] * k; out[di + 1] = src[si + 1] * k; out[di + 2] = src[si + 2] * k; out[di + 3] = 255;
      }
    }
    [hRow, hNext] = [hNext, hRow];
  }
  c.putImageData(img, 0, 0);
}
/** Kachel mit feinem Korn (mittleres Grau ± Rauschen) – bringt Schärfe in den hochgerechneten Boden. */
let grainC = null;
function grainTile() {
  if (grainC) return grainC;
  grainC = document.createElement('canvas'); grainC.width = grainC.height = 192;
  const g = grainC.getContext('2d'), im = g.createImageData(192, 192), r = mulberry32(77);
  for (let i = 0; i < 192 * 192; i++) { const v = 128 + (r() - 0.5) * 78 + (r() > 0.97 ? 34 : 0); im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = v; im.data[i * 4 + 3] = 255; }
  g.putImageData(im, 0, 0);
  return grainC;
}
/** Kleinteile abseits der Fahrbahn: Grasbüschel, Blumen, Steine, Schneewehen (als Vektoren → auch im Zoom scharf). */
function groundDetails(g, t, out) {
  const rng = mulberry32(t.name.length * 53 + 11), flowers = t.theme !== 'city' && t.theme !== 'snow' && t.theme !== 'volcano';
  g.save(); g.lineCap = 'round';
  for (let i = 0; i < 2600; i++) {
    const x = 6 + rng() * (W - 12), y = 6 + rng() * (H - 12), ci = clamp(Math.floor(y / CELL), 0, GH - 1) * GW + clamp(Math.floor(x / CELL), 0, GW - 1);
    const s = t.grid[ci], q = rng(), far = out ? out[ci] : 99;
    if (far < 7) continue;
    if (s === S.GRASS) {
      if (q < 0.74) {
        // Grasbüschel: ein paar Halme, heller oder dunkler als der Rasen
        const lit = rng() > 0.45, n = 3 + (rng() * 3 | 0), len = 1.8 + rng() * 2.4;
        g.strokeStyle = lit ? 'rgba(150,200,96,0.55)' : 'rgba(28,74,30,0.5)'; g.lineWidth = 0.55; g.beginPath();
        for (let k = 0; k < n; k++) { const a = -1.57 + (k - (n - 1) / 2) * 0.42 + (rng() - 0.5) * 0.3; g.moveTo(x + (k - n / 2) * 0.5, y); g.lineTo(x + (k - n / 2) * 0.5 + Math.cos(a) * len, y + Math.sin(a) * len); }
        g.stroke();
      } else if (q < 0.9 && flowers && far > 14) {
        const col = ['#fff8d8', '#ffd84a', '#ff8fc0', '#ffffff', '#c9a0ff'][rng() * 5 | 0], n = 3 + (rng() * 5 | 0);
        for (let k = 0; k < n; k++) { const fx = x + (rng() - 0.5) * 9, fy = y + (rng() - 0.5) * 6; g.fillStyle = 'rgba(20,60,24,.35)'; g.beginPath(); g.arc(fx + 0.3, fy + 0.4, 0.75, 0, 7); g.fill(); g.fillStyle = col; g.beginPath(); g.arc(fx, fy, 0.7, 0, 7); g.fill(); g.fillStyle = 'rgba(255,200,40,.9)'; g.beginPath(); g.arc(fx, fy, 0.25, 0, 7); g.fill(); }
      } else if (q > 0.97) { g.fillStyle = 'rgba(64,50,36,.35)'; g.beginPath(); g.ellipse(x, y, 2 + rng() * 3, 1.2 + rng() * 1.6, rng() * 3, 0, 7); g.fill(); }   // kahle Stelle
    } else if (s === S.SAND || s === S.GRAVEL || s === S.ASH) {
      if (q < 0.5) {
        const rr = 0.7 + rng() * 1.5, dk = s === S.ASH;
        g.fillStyle = 'rgba(0,0,0,.22)'; g.beginPath(); g.ellipse(x + 0.6, y + 0.6, rr * 1.15, rr * 0.8, 0.4, 0, 7); g.fill();
        g.fillStyle = dk ? '#4c4444' : s === S.SAND ? '#b9a07a' : '#8f8a82'; g.beginPath(); g.ellipse(x, y, rr * 1.1, rr * 0.8, rng() * 3, 0, 7); g.fill();
        g.fillStyle = 'rgba(255,255,255,.3)'; g.beginPath(); g.ellipse(x - rr * 0.3, y - rr * 0.25, rr * 0.45, rr * 0.3, 0, 0, 7); g.fill();
      } else if (s === S.SAND && q < 0.62 && t.theme === 'desert') {
        g.strokeStyle = 'rgba(150,128,70,.6)'; g.lineWidth = 0.5; g.beginPath(); for (let k = 0; k < 5; k++) { const a = -1.57 + (k - 2) * 0.5; g.moveTo(x, y); g.lineTo(x + Math.cos(a) * 3.2, y + Math.sin(a) * 3.2); } g.stroke();   // dürres Büschel
      }
    } else if (s === S.SNOW && q < 0.2) {
      const rw = 3 + rng() * 6;
      g.fillStyle = 'rgba(150,176,214,.22)'; g.beginPath(); g.ellipse(x + 0.8, y + 0.9, rw, rw * 0.36, 0.2, 0, 7); g.fill();
      g.fillStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.ellipse(x, y, rw, rw * 0.34, 0.2, 0, 7); g.fill();
    }
  }
  g.restore();
}
/** Himmel: Sonne mit Schein und Wolken (je nach Wetter und Tageszeit). */
function drawSky(c, hz, wx, SC, rng) {
  if (wx.time === 'night') return;
  if (wx.time === 'day' && wx.sky === 'clear') {
    const sx = W * 0.17, sy = hz * 0.36;
    const gl = c.createRadialGradient(sx, sy, 0, sx, sy, 150); gl.addColorStop(0, 'rgba(255,250,224,0.85)'); gl.addColorStop(0.07, 'rgba(255,246,206,0.55)'); gl.addColorStop(0.3, 'rgba(255,240,200,0.14)'); gl.addColorStop(1, 'rgba(255,240,200,0)');
    c.fillStyle = gl; c.fillRect(sx - 150, 0, 300, hz + 6);
    c.fillStyle = '#fffdf0'; c.beginPath(); c.arc(sx, sy, 8.5, 0, 7); c.fill();
  }
  const n = wx.sky === 'clear' ? 5 : 13, dusk = wx.time === 'dusk';
  const lit = dusk ? [255, 196, 160] : wx.sky === 'rain' ? [176, 182, 192] : wx.sky === 'cloudy' ? [226, 230, 236] : [255, 255, 255];
  const dark = dusk ? [150, 96, 128] : wx.sky === 'rain' ? [112, 118, 130] : wx.sky === 'cloudy' ? [164, 172, 184] : [206, 220, 236];
  for (let i = 0; i < n; i++) {
    const cx = (i + rng()) / n * W, cy = 12 + rng() * (hz - 52), w = 34 + rng() * (wx.sky === 'clear' ? 46 : 90), h = w * (0.2 + rng() * 0.1);
    const puffs = []; for (let k = 0; k < 7; k++) { const u = k / 6; puffs.push([cx + (u - 0.5) * w * 1.6, cy - Math.sin(u * Math.PI) * h * (0.6 + rng() * 0.6), h * (0.55 + Math.sin(u * Math.PI) * 0.6 + rng() * 0.2)]); }
    c.save(); c.globalAlpha = wx.sky === 'clear' ? 0.9 : 0.95;
    c.beginPath(); c.rect(cx - w * 1.4, 0, w * 2.8, cy + h * 0.55); c.clip();       // flache Unterseite
    c.fillStyle = css(dark); for (const [x, y, r] of puffs) { c.beginPath(); c.arc(x + 1, y + 2.5, r, 0, 7); c.fill(); }
    c.fillStyle = css(lit); for (const [x, y, r] of puffs) { c.beginPath(); c.arc(x - 0.5, y - 1, r * 0.92, 0, 7); c.fill(); }
    c.restore();
  }
}
/** Baut alle statischen Ebenen eines Rennens in der schrägen Ansicht. wx = { sky, time, snow } */
function buildScene(t, rt, opt = {}, wx = { sky: 'clear', time: 'day' }) {
  const theme = THEME_SKY[t.theme] ? t.theme : 'meadow', look = t.look && THEME_SKY[t.look] ? t.look : theme, SC = skyColors(look, wx);
  const RS = opt.rs || 1;          // Auflösung der Bodenebene und Szene (2 für die Zoom-Kamera)
  // 1) Flache Welt: Boden mit Schmutzrändern, Gummispur, Markierungen, Schatten
  const gr = cachedGround(t, rt);
  let F = gr.canvas, g = gr.ctx;
  if (RS > 1) {
    // Boden pixelgenau hochrechnen (keine Unschärfe), Linien/Markierungen danach in voller Auflösung
    const F2 = document.createElement('canvas'); F2.width = W * RS; F2.height = H * RS;
    // weich hochrechnen (runde Kanten statt Klötzchen) und feines Korn in voller Auflösung darüberlegen
    const g2 = F2.getContext('2d'); g2.imageSmoothingEnabled = true; g2.imageSmoothingQuality = 'high'; g2.drawImage(F, 0, 0, W * RS, H * RS);
    g2.globalCompositeOperation = 'overlay'; g2.globalAlpha = 0.55; g2.fillStyle = g2.createPattern(grainTile(), 'repeat'); g2.fillRect(0, 0, W * RS, H * RS);
    g2.globalCompositeOperation = 'source-over'; g2.globalAlpha = 1;
    g2.setTransform(RS, 0, 0, RS, 0, 0); F = F2; g = g2;
  }
  if (rt) {
    g.save(); g.lineJoin = 'round'; g.lineCap = 'round';
    g.beginPath(); for (let i = 0; i <= rt.n; i++) { const k = i % rt.n; i ? g.lineTo(rt.lx[k], rt.ly[k]) : g.moveTo(rt.lx[k], rt.ly[k]); }
    g.strokeStyle = 'rgba(25,25,28,0.10)'; g.lineWidth = 16; g.stroke();
    g.strokeStyle = 'rgba(25,25,28,0.08)'; g.lineWidth = 7; g.stroke();
    // Fahrspuren auf losem Untergrund: zwei eingefahrene Rillen mit hellem Mittelsteg
    const rut = (off, style, lw) => {
      g.beginPath(); let pen = false;
      for (let i = 0; i <= rt.n; i++) {
        const k = i % rt.n, x = rt.lx[k] - rt.ty[k] * off, y = rt.ly[k] + rt.tx[k] * off;
        if (cellAt(t, x, y) !== S.DIRT) { pen = false; continue; }
        pen ? g.lineTo(x, y) : g.moveTo(x, y); pen = true;
      }
      g.strokeStyle = style; g.lineWidth = lw; g.stroke();
    };
    rut(-4.6, 'rgba(58,40,26,0.20)', 3.4); rut(4.6, 'rgba(58,40,26,0.20)', 3.4);
    rut(-4.6, 'rgba(40,28,20,0.16)', 1.3); rut(4.6, 'rgba(40,28,20,0.16)', 1.3);
    rut(0, 'rgba(214,190,150,0.10)', 3);
    g.restore();
  }
  groundDetails(g, t, gr.out);
  drawMarkings(g, t, opt);
  const shc = document.createElement('canvas'); shc.width = W; shc.height = H;
  const sg = shc.getContext('2d');
  if (wx.time !== 'night') for (const o of t.objects) drawShadowFlat(sg, o);
  g.globalAlpha = wx.sky === 'clear' ? 0.34 : 0.17; g.filter = 'blur(' + (wx.sky === 'clear' ? 1.3 : 3) * RS + 'px)'; g.drawImage(shc, 0, 0); g.filter = 'none'; g.globalAlpha = 1;
  // Nässe, Pfützen, Neuschnee
  if (wx.sky === 'rain' && !wx.snow) {
    g.globalCompositeOperation = 'multiply'; g.fillStyle = 'rgb(196,202,212)'; g.fillRect(0, 0, W, H); g.globalCompositeOperation = 'source-over';
    for (const p of (rt && rt.puddles) || []) {
      g.save(); g.translate(p.x, p.y); g.rotate(p.a); g.scale(1, 0.7);
      const pg = g.createRadialGradient(0, 0, p.r * 0.2, 0, 0, p.r);
      pg.addColorStop(0, cssA(SC.bot, 0.75)); pg.addColorStop(0.75, cssA(SC.top, 0.55)); pg.addColorStop(1, 'rgba(40,46,56,0)');
      g.fillStyle = pg; g.beginPath(); g.arc(0, 0, p.r, 0, 7); g.fill();
      g.restore();
    }
  } else if (wx.snow) { g.fillStyle = 'rgba(255,255,255,0.14)'; g.fillRect(0, 0, W, H); }

  // 2) Bildschirm-Szene: Himmel, Horizont-Silhouetten, Umland, Boden
  const sc = document.createElement('canvas'); sc.width = W * RS; sc.height = H * RS;
  const c = sc.getContext('2d'); c.setTransform(RS, 0, 0, RS, 0, 0);
  const hz = VIEW.Y0;
  const skyG = c.createLinearGradient(0, 0, 0, hz + 10); skyG.addColorStop(0, css(SC.top)); skyG.addColorStop(1, css(SC.bot));
  c.fillStyle = skyG; c.fillRect(0, 0, W, hz + 12);
  const rng = mulberry32(t.name.length * 31 + 7);
  drawSky(c, hz, wx, SC, mulberry32(t.name.length * 17 + 3));
  if (wx.time === 'night') for (let i = 0; i < 90; i++) { c.fillStyle = 'rgba(255,255,255,' + (0.3 + rng() * 0.6) + ')'; c.fillRect(rng() * W, rng() * (hz - 10), 1.2, 1.2); }
  if (wx.time === 'dusk') { const sx = W * 0.78, sy = hz - 18, sg2 = c.createRadialGradient(sx, sy, 0, sx, sy, 60); sg2.addColorStop(0, 'rgba(255,230,170,1)'); sg2.addColorStop(0.25, 'rgba(255,190,110,.8)'); sg2.addColorStop(1, 'rgba(255,150,90,0)'); c.fillStyle = sg2; c.fillRect(sx - 60, sy - 60, 120, 120); }
  if (wx.time === 'night') { c.fillStyle = 'rgba(240,240,220,.9)'; c.beginPath(); c.arc(W * 0.18, hz * 0.35, 9, 0, 7); c.fill(); c.fillStyle = css(SC.top); c.beginPath(); c.arc(W * 0.18 + 4, hz * 0.35 - 2, 8, 0, 7); c.fill(); }
  {
    const hc = document.createElement('canvas'); hc.width = W * RS; hc.height = H * RS;
    const hg = hc.getContext('2d'); hg.setTransform(RS, 0, 0, RS, 0, 0);
    drawHorizon(hg, look, hz, rng, [0, 0, SC.far, SC.near], wx);
    const dim = wx.time === 'night' ? 'rgba(4,8,20,0.62)' : wx.time === 'dusk' ? 'rgba(70,36,70,0.32)' : wx.sky === 'rain' ? 'rgba(90,98,110,0.35)' : null;
    if (dim) { hg.globalCompositeOperation = 'source-atop'; hg.fillStyle = dim; hg.fillRect(0, 0, W, H); }
    if (wx.time === 'night' && theme === 'city') { hg.globalCompositeOperation = 'source-over'; const r2 = mulberry32(9); for (let i = 0; i < 160; i++) { hg.fillStyle = 'rgba(255,220,140,' + (0.4 + r2() * 0.5) + ')'; hg.fillRect(r2() * W, hz - 8 - r2() * 90, 2.5, 3.5); } }
    c.drawImage(hc, 0, 0, W, H);
  }
  // Umland: Kachel der häufigsten Randfläche
  const cnt = new Array(SURF.length).fill(0);
  for (let x = 0; x < GW; x++) { cnt[t.grid[x]]++; cnt[t.grid[(GH - 1) * GW + x]]++; }
  for (let y = 0; y < GH; y++) { cnt[t.grid[y * GW]]++; cnt[t.grid[y * GW + GW - 1]]++; }
  const baseType = cnt.indexOf(Math.max(...cnt));
  const tile = document.createElement('canvas'); tile.width = tile.height = 96;
  const tg = tile.getContext('2d'), ti = tg.createImageData(96, 96), col = [0, 0, 0];
  SURF_TILE = true;
  const dk = wx.sky === 'rain' ? 0.78 : 0.92;
  for (let y = 0; y < 96; y++) for (let x = 0; x < 96; x++) { surfColor(baseType, x + 4000, y + 4000, t.theme, col); const i = (y * 96 + x) * 4; ti.data[i] = col[0] * dk; ti.data[i + 1] = col[1] * dk; ti.data[i + 2] = col[2] * dk; ti.data[i + 3] = 255; }
  tg.putImageData(ti, 0, 0); SURF_TILE = false;
  c.save(); c.beginPath(); c.rect(0, hz, W, H - hz); c.clip();
  c.fillStyle = c.createPattern(tile, 'repeat'); c.fillRect(0, hz, W, H - hz);
  c.restore();
  if (hasHeights(t)) splatTerrain(c, t, F, RS); else drawProjectedLayer(c, F, 2, RS);
  // Begrenzungsmauer hinten und seitlich
  const bc = theme === 'city' ? [150, 154, 160] : theme === 'desert' ? [176, 132, 92] : theme === 'snow' ? [210, 216, 226] : [70, 120, 60];
  ZB = 0;
  prism(c, [[0, -6], [W, -6], [W, 0], [0, 0]], 0, 8, mul(bc, 1.1), bc);
  for (const x of [-4, W]) fillPoly(c, [P(x, 0, 8), P(x + 4, 0, 8), P(x + 4, H, 8), P(x, H, 8)], mul(bc, 0.95));
  // Statische Objekte einbacken (Bäume, Häuser …) – bewegte/überdeckende bleiben dynamisch
  const objs = t.objects.map(o => o.t === 'bridge' ? prepBridge(t, o) : o).sort((a, b) => a.y - b.y);
  const baked = objs.filter(o => !DYN_OBJ.has(o.t)), dyn = objs.filter(o => DYN_OBJ.has(o.t));
  for (const o of baked) { o.zb = terrainH(t, o.x, o.y); ZB = o.zb; drawObject3D(c, o, t.theme, 0); }
  for (const o of dyn) o.zb = o.t === 'bridge' ? 0 : terrainH(t, o.x, o.y);
  ZB = 0;
  // 3) Lichtstimmung (Dunst hinten, Farbton, Vignette)
  const ov = document.createElement('canvas'); ov.width = W; ov.height = H;
  const o2 = ov.getContext('2d');
  const haze = o2.createLinearGradient(0, hz - 10, 0, hz + 300);
  haze.addColorStop(0, cssA(SC.bot, wx.time === 'night' ? 0.2 : 0.38)); haze.addColorStop(1, cssA(SC.bot, 0));
  o2.fillStyle = haze; o2.fillRect(0, hz - 10, W, 320);
  let tint = { meadow: 'rgba(255,224,160,0.05)', city: 'rgba(90,110,140,0.06)', desert: 'rgba(255,150,60,0.08)', snow: 'rgba(120,170,255,0.06)' }[theme];
  if (wx.sky === 'rain') tint = 'rgba(50,60,80,0.14)'; else if (wx.sky === 'cloudy') tint = 'rgba(70,80,96,0.08)';
  if (wx.time === 'dusk') tint = 'rgba(255,120,60,0.10)';
  o2.fillStyle = tint; o2.fillRect(0, 0, W, H);
  if (wx.time === 'day' && wx.sky === 'clear') {
    // Sonnenlicht von links hinten: warm im Licht, kühl im Vordergrund rechts
    const sun = o2.createLinearGradient(0, hz, W, H);
    sun.addColorStop(0, 'rgba(255,232,170,0.11)'); sun.addColorStop(0.5, 'rgba(255,232,170,0)'); sun.addColorStop(1, 'rgba(24,40,90,0.09)');
    o2.fillStyle = sun; o2.fillRect(0, hz - 10, W, H);
  }
  const vg = o2.createRadialGradient(W / 2, H * 0.55, H * 0.35, W / 2, H * 0.55, H * 0.95);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.30)');
  o2.fillStyle = vg; o2.fillRect(0, 0, W, H);
  // 4) Beleuchtung für Abend/Nacht: Dunkelheit mit ausgesparten Laternen-Lichtkegeln
  let lightBase = null, glow = null;
  const lamps = t.objects.filter(o => o.t === 'lamp');
  if (wx.time === 'night' || wx.time === 'dusk') {
    lightBase = document.createElement('canvas'); lightBase.width = W; lightBase.height = H;
    const l = lightBase.getContext('2d');
    l.fillStyle = wx.time === 'night' ? 'rgba(4,8,24,0.76)' : 'rgba(36,20,46,0.34)'; l.fillRect(0, 0, W, H);
    glow = document.createElement('canvas'); glow.width = W; glow.height = H;
    const gl = glow.getContext('2d');
    l.globalCompositeOperation = 'destination-out';
    for (const o of lamps) {
      const ca = Math.cos(o.a), sa = Math.sin(o.a), px = o.x + ca * 18, py = o.y + sa * 18, gzz = terrainH(t, px, py);
      const [X, Y] = P(px, py, gzz), r = 78 * projS(py);
      l.save(); l.translate(X, Y); l.scale(1, VIEW.T);
      const lg = l.createRadialGradient(0, 0, 0, 0, 0, r); lg.addColorStop(0, 'rgba(0,0,0,0.95)'); lg.addColorStop(0.55, 'rgba(0,0,0,0.5)'); lg.addColorStop(1, 'rgba(0,0,0,0)');
      l.fillStyle = lg; l.beginPath(); l.arc(0, 0, r, 0, 7); l.fill(); l.restore();
      const [HX, HY] = P(o.x + ca * 8.5, o.y + sa * 8.5, terrainH(t, o.x, o.y) + 33);
      const hg = gl.createRadialGradient(HX, HY, 0, HX, HY, 14); hg.addColorStop(0, 'rgba(255,240,200,0.9)'); hg.addColorStop(1, 'rgba(255,220,150,0)');
      gl.fillStyle = hg; gl.beginPath(); gl.arc(HX, HY, 14, 0, 7); gl.fill();
      const pg = gl.createRadialGradient(X, Y, 0, X, Y, r * 0.8); pg.addColorStop(0, 'rgba(255,220,160,0.10)'); pg.addColorStop(1, 'rgba(255,220,160,0)');
      gl.fillStyle = pg; gl.fillRect(X - r, Y - r, 2 * r, 2 * r);
    }
    // Boxengebäude und Tribünen leicht beleuchtet
    for (const o of t.objects) if ((o.t === 'house' && o.pit) || o.t === 'stand') {
      const [X, Y] = P(o.x, o.y, terrainH(t, o.x, o.y)), r = Math.max(o.w, 60) * 0.8;
      l.save(); l.translate(X, Y); l.scale(1, 0.6);
      const lg = l.createRadialGradient(0, 0, 0, 0, 0, r); lg.addColorStop(0, 'rgba(0,0,0,0.7)'); lg.addColorStop(1, 'rgba(0,0,0,0)');
      l.fillStyle = lg; l.beginPath(); l.arc(0, 0, r, 0, 7); l.fill(); l.restore();
    }
  }
  // 5) Wolkenschatten (bewölkt/Regen)
  let clouds = null;
  if (wx.sky !== 'clear') {
    clouds = document.createElement('canvas'); clouds.width = W * 2; clouds.height = H;
    const cg = clouds.getContext('2d'), cr = mulberry32(5);
    for (let i = 0; i < 26; i++) {
      const x = cr() * W * 2, y = cr() * H, r = 80 + cr() * 140;
      for (const dx of [0, -W * 2, W * 2]) { const gg = cg.createRadialGradient(x + dx, y, 0, x + dx, y, r); gg.addColorStop(0, 'rgba(10,16,30,0.20)'); gg.addColorStop(1, 'rgba(10,16,30,0)'); cg.fillStyle = gg; cg.fillRect(x + dx - r, y - r, r * 2, r * 2); }
    }
  }
  return { scene: sc, overlay: ov, flat: F, baked, dyn, theme: t.theme, t, lightBase, glow, clouds, wx, rs: RS };
}
/** Brücke für die Darstellung vorbereiten: Sortierschlüssel (Vorderkante), Wasser darunter, Geländehöhe an den Enden. */
function prepBridge(t, o) {
  const b = { ...o }, ca = Math.cos(o.a), sa = Math.sin(o.a);
  const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([u, v]) => o.y + u * o.w / 2 * sa + v * o.h / 2 * ca);
  b.key = Math.max(...corners);
  b.water = cellAt(t, o.x, o.y) === S.WATER;
  b.endH = [-1, 1].map(sd => terrainH(t, o.x + ca * sd * (o.w / 2 + 6), o.y + sa * sd * (o.w / 2 + 6)));
  return b;
}
function hexA(hex, a) { const [r, g, b] = rgbOf(hex); return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')'; }
/** Silhouetten am Horizont je nach Stil. */
function drawHorizon(c, theme, hz, rng, sky, wx = {}) {
  const far = sky[2], near = sky[3];
  const ridge = (base, amp, step, color, jag) => {
    c.fillStyle = color; c.beginPath(); c.moveTo(0, hz + 4);
    let y = base;
    for (let x = 0; x <= W + step; x += step) { y = clamp(y + (rng() - 0.5) * jag, base - amp, base); c.lineTo(x, hz - (hz - y)); }
    c.lineTo(W, hz + 4); c.closePath(); c.fill();
  };
  if (theme === 'volcano') {
    // Vulkankegel mit glühendem Krater und Rauchfahne
    for (const [x0, hgt, wd] of [[W * 0.22, 120, 260], [W * 0.7, 90, 200], [W * 0.95, 60, 150]]) {
      c.fillStyle = mul(far, 0.95); c.beginPath(); c.moveTo(x0 - wd, hz + 2); c.lineTo(x0 - 22, hz - hgt); c.lineTo(x0 + 22, hz - hgt); c.lineTo(x0 + wd, hz + 2); c.fill();
      const g = c.createRadialGradient(x0, hz - hgt, 0, x0, hz - hgt, 40); g.addColorStop(0, 'rgba(255,150,60,.9)'); g.addColorStop(1, 'rgba(255,90,30,0)');
      c.fillStyle = g; c.fillRect(x0 - 40, hz - hgt - 40, 80, 80);
      c.fillStyle = 'rgba(255,120,40,.85)'; c.fillRect(x0 - 18, hz - hgt - 1, 36, 3);
      for (let i = 0; i < 9; i++) { c.fillStyle = 'rgba(60,52,52,' + (0.35 - i * 0.03) + ')'; c.beginPath(); c.arc(x0 + i * 14 + rng() * 8, hz - hgt - 16 - i * 13, 12 + i * 4, 0, 7); c.fill(); }
    }
    ridge(hz - 10, 12, 10, mul(near, 1), 7);
  } else if (theme === 'beach') {
    // Meer mit Inseln
    c.fillStyle = 'rgb(56,140,196)'; c.fillRect(0, hz - 14, W, 18);
    c.fillStyle = 'rgba(255,255,255,.35)'; for (let i = 0; i < 40; i++) c.fillRect(rng() * W, hz - 12 + rng() * 14, 6 + rng() * 12, 1);
    for (const [x0, wd, hgt] of [[W * 0.15, 90, 24], [W * 0.62, 60, 16]]) { c.fillStyle = mul(far, 0.8); c.beginPath(); c.ellipse(x0, hz - 14, wd, hgt, 0, Math.PI, 0); c.fill(); }
    ridge(hz - 2, 4, 12, mul(near, 1), 3);
  } else if (theme === 'quarry') {
    // Abgestufte Felswände
    let x = 0;
    while (x < W) { const w2 = 60 + rng() * 120, h2 = 40 + rng() * 70; for (let k = 0; k < 3; k++) { c.fillStyle = mul(far, 0.9 + k * 0.06); c.fillRect(x + k * 8, hz - h2 + k * h2 / 3, w2 - k * 16, h2 / 3 + 4); } x += w2 - 10; }
    ridge(hz - 6, 8, 10, mul(near, 1), 5);
  } else if (theme === 'alpine') {
    // Grüne Berge mit kleinen Schneefeldern, Dorf am Hang
    for (const [col, hmax, cnt] of [[mul(far, 1.05), 130, 6], [mul(near, 1.05), 90, 8]]) {
      for (let i = 0; i < cnt; i++) {
        const x = rng() * W, hgt = hmax * (0.5 + rng() * 0.5), wd = hgt * (1.3 + rng());
        c.fillStyle = col; c.beginPath(); c.moveTo(x - wd, hz + 2); c.lineTo(x, hz - hgt); c.lineTo(x + wd, hz + 2); c.fill();
        if (hgt > 90) { c.fillStyle = 'rgba(255,255,255,.85)'; c.beginPath(); c.moveTo(x - wd * 0.12, hz - hgt * 0.88); c.lineTo(x, hz - hgt); c.lineTo(x + wd * 0.12, hz - hgt * 0.88); c.fill(); }
      }
    }
    for (let i = 0; i < 26; i++) { const x = rng() * W, y = hz - 6 - rng() * 30; c.fillStyle = 'rgba(240,236,228,.8)'; c.fillRect(x, y, 5, 4); c.fillStyle = 'rgba(150,60,50,.85)'; c.fillRect(x - 1, y - 2, 7, 2); }
    ridge(hz - 10, 10, 8, mul([60, 100, 66], 1), 6);
  } else if (theme === 'snow') {
    // Berge mit Schneekappen
    for (const [col, hmax, cnt] of [[mul(far, 1.05), 110, 7], [mul(near, 1), 80, 9]]) {
      for (let i = 0; i < cnt; i++) {
        const x = rng() * W, hgt = hmax * (0.5 + rng() * 0.5), wd = hgt * (1.4 + rng());
        c.fillStyle = col; c.beginPath(); c.moveTo(x - wd, hz + 2); c.lineTo(x, hz - hgt); c.lineTo(x + wd, hz + 2); c.fill();
        c.fillStyle = 'rgba(255,255,255,.92)'; c.beginPath(); c.moveTo(x - wd * 0.28, hz - hgt * 0.72); c.lineTo(x, hz - hgt); c.lineTo(x + wd * 0.28, hz - hgt * 0.72); c.lineTo(x + wd * 0.1, hz - hgt * 0.66); c.lineTo(x - wd * 0.06, hz - hgt * 0.76); c.fill();
      }
    }
    ridge(hz - 12, 14, 8, mul([60, 96, 76], 1), 6);
  } else if (theme === 'desert') {
    for (let i = 0; i < 6; i++) {
      const x = rng() * W, hgt = 30 + rng() * 50, wd = 50 + rng() * 120;
      c.fillStyle = mul(far, 0.95 + rng() * 0.1); c.beginPath(); c.moveTo(x - wd, hz + 2); c.lineTo(x - wd * 0.7, hz - hgt); c.lineTo(x + wd * 0.7, hz - hgt); c.lineTo(x + wd, hz + 2); c.fill();
      c.fillStyle = 'rgba(0,0,0,.08)'; c.fillRect(x - wd * 0.7, hz - hgt, wd * 1.4, 4);
    }
    ridge(hz - 8, 10, 14, mul(near, 1), 5);
  } else if (theme === 'city') {
    let x = -10;
    while (x < W) {
      const bw = 24 + rng() * 50, bh = 30 + rng() * 80;
      c.fillStyle = mul(far, 0.85 + rng() * 0.25); c.fillRect(x, hz - bh, bw, bh + 4);
      c.fillStyle = 'rgba(255,240,190,.35)';
      for (let wy = hz - bh + 6; wy < hz - 4; wy += 8) for (let wx = x + 4; wx < x + bw - 4; wx += 7) if (rng() > 0.55) c.fillRect(wx, wy, 3, 4);
      x += bw + rng() * 6;
    }
    ridge(hz - 6, 8, 10, mul(near, 0.9), 4);
  } else {
    ridge(hz - 46, 40, 16, mul(far, 1.05), 18);
    ridge(hz - 24, 22, 10, mul(near, 1), 12);
    // Baumreihe
    c.fillStyle = mul([52, 96, 52], 1);
    for (let x = 0; x < W; x += 7) { const r = 5 + rng() * 6; c.beginPath(); c.arc(x, hz - 4 - rng() * 4, r, 0, 7); c.fill(); }
  }
}
