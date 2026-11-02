/* =====================================================================
   6  STRECKEN-GRAFIK
   ===================================================================== */
/** Prozedurale Farbe einer Oberfläche an Pixel (x,y). out = [r,g,b] */
function surfColor(s, x, y, theme, out) {
  const sf = SURF[s];
  const nz = hash2(x, y) - 0.5, big = vnoise(x, y, 26) - 0.5;
  let r = sf.col[0], g = sf.col[1], b = sf.col[2], k = nz * sf.vr + big * sf.vr * 1.3;
  switch (s) {
    case S.ASPHALT: {
      k = nz * 8 + big * 9 + (vnoise(x, y, 7) - 0.5) * 6;
      const sp = hash2(x >> 1, y >> 1);
      if (sp > 0.975) k += 16; else if (sp < 0.02) k -= 12;
      break;
    }
    case S.PIT: k = nz * 6 + big * 5; break;
    case S.CURB: {
      const on = (((x + y) >> 3) & 1) === 1;
      if (on) { r = 238; g = 238; b = 236; }
      k = nz * 5;
      break;
    }
    case S.GRASS: {
      if (theme === 'city') { r -= 6; g -= 8; b -= 2; }
      k += (((x + y * 0.3) >> 5) & 1) ? 6 : -6;                 // Mähstreifen
      const h = hash2(x * 3 + 7, y * 5 + 1);
      if (h > 0.93) k += 14; else if (h < 0.06) k -= 16;        // Grashalme
      if (h > 0.9988 && theme !== 'city') { r = 250; g = 240; b = 120; k = 0; }   // Blümchen
      else if (h < 0.0008) { r = 250; g = 250; b = 250; k = 0; }
      break;
    }
    case S.SAND: {
      k += Math.sin(x * 0.13 + Math.sin(y * 0.045) * 3) * 6 + Math.sin(x * 0.031 - y * 0.02) * 4;
      if (hash2(x, y) > 0.985) k -= 22;
      break;
    }
    case S.GRAVEL: {
      const st = hash2(x >> 1, y >> 1);
      k = (st - 0.5) * 52 + nz * 12;
      if (st > 0.96) { r = 200; g = 192; b = 178; }
      break;
    }
    case S.SNOW: {
      k += Math.sin(x * 0.05 + y * 0.02) * 2 + (vnoise(x, y, 11) - 0.5) * 6; b += 4;
      if (hash2(x, y) > 0.997) k += 18;                          // Glitzern
      break;
    }
    case S.ICE: k += Math.sin((x - y) * 0.07) * 6 + (hash2(x, y >> 2) > 0.985 ? 30 : 0) + (vnoise(x, y, 18) - 0.5) * 12; break;
    case S.LAVA: {
      // glühende Lava mit dunkler Kruste
      const cr = vnoise(x, y, 9) + (vnoise(x + 300, y, 22) - 0.5) * 0.6;
      if (cr > 0.62) { r = 52; g = 34; b = 30; k = nz * 10; }
      else { const hot = clamp((0.62 - cr) * 3, 0, 1); r = 200 + 55 * hot; g = 60 + 150 * hot * hot; b = 20 + 40 * hot * hot * hot; k = nz * 12; }
      break;
    }
    case S.ASH: { k += (hash2(x >> 1, y >> 1) - 0.5) * 18; if (hash2(x, y) > 0.992) { r = 120; g = 60; b = 40; k = 0; } break; }
    case S.OIL: { const sh = Math.sin(x * 0.21 + y * 0.13) * 0.5 + 0.5; r = 26 + sh * 30; g = 24 + sh * 14 + (1 - sh) * 22; b = 34 + (1 - sh) * 40; k = nz * 4; break; }
    case S.WATER: k += Math.sin(x * 0.07 + Math.sin(y * 0.05) * 2) * 8 + Math.sin(y * 0.11 + x * 0.02) * 5; break;
  }
  out[0] = r + k; out[1] = g + k; out[2] = b + k;
  return out;
}
const smooth01 = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
/**
 * Schreibt die Bodenpixel eines Bereichs in ein ImageData-Array.
 * Die Zelltypen werden bilinear gewichtet → weiche, runde Kanten statt Treppenstufen.
 * dist (optional): { out, inn } Abstandsfelder für Schmutz am Fahrbahnrand.
 */
function fillGround(t, data, x0, y0, x1, y1, dist) {
  const g = t.grid, theme = t.theme, shade = hillShade(t);
  x0 = clamp(x0 | 0, 0, W); x1 = clamp(Math.ceil(x1), 0, W); y0 = clamp(y0 | 0, 0, H); y1 = clamp(Math.ceil(y1), 0, H);
  const cellOf = (cx, cy) => g[clamp(cy, 0, GH - 1) * GW + clamp(cx, 0, GW - 1)];
  const c1 = [0, 0, 0], c2 = [0, 0, 0];
  const types = [0, 0, 0, 0], wts = [0, 0, 0, 0];
  for (let y = y0; y < y1; y++) {
    const gy = (y + 0.5) / CELL - 0.5, iy = Math.floor(gy), fy = gy - iy;
    for (let x = x0; x < x1; x++) {
      const gx = (x + 0.5) / CELL - 0.5, ix = Math.floor(gx), fx = gx - ix;
      // Gewichte der vier umliegenden Zellen nach Typ zusammenfassen
      let n = 0;
      const add = (ty, w) => { for (let k = 0; k < n; k++) if (types[k] === ty) { wts[k] += w; return; } types[n] = ty; wts[n] = w; n++; };
      add(cellOf(ix, iy), (1 - fx) * (1 - fy)); add(cellOf(ix + 1, iy), fx * (1 - fy));
      add(cellOf(ix, iy + 1), (1 - fx) * fy); add(cellOf(ix + 1, iy + 1), fx * fy);
      let d = 0, d2 = -1;
      for (let k = 1; k < n; k++) if (wts[k] > wts[d]) d = k;
      for (let k = 0; k < n; k++) if (k !== d && (d2 < 0 || wts[k] > wts[d2])) d2 = k;
      const sd = types[d];
      surfColor(sd, x, y, theme, c1);
      let r = c1[0], gg = c1[1], b = c1[2];
      if (d2 >= 0) {
        const sd2 = types[d2], w = wts[d] / (wts[d] + wts[d2]);
        surfColor(sd2, x, y, theme, c2);
        const a = smooth01(0.38, 0.62, w) * 0.5 + 0.5;            // weicher Übergang
        r = c2[0] + (r - c2[0]) * a; gg = c2[1] + (gg - c2[1]) * a; b = c2[2] + (b - c2[2]) * a;
        // weiße Randlinie (Fahrbahnbegrenzung) bzw. gelbe Linie an der Boxengasse
        let tw = 0; for (let k = 0; k < n; k++) if (isTrackSurf(types[k]) && types[k] !== S.CURB) tw += wts[k];
        if (tw > 0.5 && tw < 0.7 && (sd === S.ASPHALT || sd === S.PIT) && !isTrackSurf(sd2)) {
          const lc = sd === S.PIT ? [245, 205, 50] : [236, 236, 232];
          const la = 1 - Math.abs(tw - 0.6) / 0.1;
          r = lerp(r, lc[0], la); gg = lerp(gg, lc[1], la); b = lerp(b, lc[2], la);
        }
        // Schaum am Ufer, dunkle Fuge zwischen Naturböden
        if (sd === S.WATER || sd2 === S.WATER) { const f = 1 - Math.abs(w - 0.55) * 4; if (f > 0) { r += 40 * f; gg += 40 * f; b += 40 * f; } }
        else if (!isTrackSurf(sd) && !isTrackSurf(sd2)) { const f = 1 - Math.abs(w - 0.5) * 3; if (f > 0) { r -= 12 * f; gg -= 12 * f; b -= 12 * f; } }
      }
      // Schmutz/Abrieb nahe der Fahrbahnkante
      if (dist) {
        const ci = clamp(Math.floor(y / CELL), 0, GH - 1) * GW + clamp(Math.floor(x / CELL), 0, GW - 1);
        if (sd === S.ASPHALT) { const e = dist.inn[ci]; if (e < 10) { const f = (1 - e / 10) * 0.22; r = lerp(r, 120, f); gg = lerp(gg, 108, f); b = lerp(b, 92, f); } }
        else if (sd === S.GRASS || sd === S.SNOW || sd === S.SAND) { const e = dist.out[ci]; if (e < 9) { const f = (1 - e / 9) * 0.25; r = lerp(r, sd === S.SNOW ? 170 : 128, f); gg = lerp(gg, sd === S.SNOW ? 170 : 112, f); b = lerp(b, sd === S.SNOW ? 175 : 84, f); } }
      }
      if (shade) { const k = sampleV(shade, x, y); r *= k; gg *= k; b *= k; }
      const i = (y * W + x) * 4;
      data[i] = clamp(r, 0, 255); data[i + 1] = clamp(gg, 0, 255); data[i + 2] = clamp(b, 0, 255); data[i + 3] = 255;
    }
  }
}
/** Schattierung der Höhenkarte (Licht von links hinten) je Stützpunkt; null bei flachem Gelände. */
function hillShade(t) {
  const hm = t.hm; if (!hm) return null;
  let any = false; for (let i = 0; i < hm.length; i++) if (hm[i] > 0.01) { any = true; break; }
  if (!any) return null;
  const out = new Float32Array(HMW * HMH), L = [-0.5, -0.62, 0.6], ll = Math.hypot(...L), flat = L[2] / ll;
  for (let gy = 0; gy < HMH; gy++) for (let gx = 0; gx < HMW; gx++) {
    const hx = (hm[gy * HMW + Math.min(HMW - 1, gx + 1)] - hm[gy * HMW + Math.max(0, gx - 1)]) / (2 * HM);
    const hy = (hm[Math.min(HMH - 1, gy + 1) * HMW + gx] - hm[Math.max(0, gy - 1) * HMW + gx]) / (2 * HM);
    const nl = Math.hypot(hx, hy, 1), d = (-hx * L[0] - hy * L[1] + L[2]) / (nl * ll);
    out[gy * HMW + gx] = clamp(1 + (d / flat - 1) * 2.4, 0.5, 1.3);
  }
  return out;
}
/** Bilineares Auslesen eines Stützpunkt-Feldes. */
function sampleV(a, x, y) {
  const gx = clamp(x / HM, 0, HMW - 1.001), gy = clamp(y / HM, 0, HMH - 1.001), ix = gx | 0, iy = gy | 0, fx = gx - ix, fy = gy - iy, i = iy * HMW + ix;
  return (a[i] * (1 - fx) + a[i + 1] * fx) * (1 - fy) + (a[i + HMW] * (1 - fx) + a[i + HMW + 1] * fx) * fy;
}
/** Abstandsfeld innerhalb der Fahrbahn (Pixel bis zur nächsten Nicht-Fahrbahn-Zelle). */
function insideDistanceField(t) {
  const inv = { grid: t.grid.map(v => isTrackSurf(v) ? S.GRASS : S.ASPHALT) };
  return trackDistanceField(inv);
}
/** Erzeugt einen Boden-Canvas für eine Strecke. */
function makeGround(t, withDirt) {
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  const img = g.createImageData(W, H);
  fillGround(t, img.data, 0, 0, W, H, withDirt ? { out: trackDistanceField(t), inn: insideDistanceField(t) } : null);
  g.putImageData(img, 0, 0);
  return { canvas: c, ctx: g, img };
}
/** Aktualisiert einen Bodenbereich (Editor). */
function updateGround(gr, t, x0, y0, x1, y1) {
  x0 = clamp(Math.floor(x0 / CELL) * CELL - CELL, 0, W); y0 = clamp(Math.floor(y0 / CELL) * CELL - CELL, 0, H);
  x1 = clamp(Math.ceil(x1 / CELL) * CELL + CELL, 0, W); y1 = clamp(Math.ceil(y1 / CELL) * CELL + CELL, 0, H);
  if (x1 <= x0 || y1 <= y0) return;
  fillGround(t, gr.img.data, x0, y0, x1, y1);
  gr.ctx.putImageData(gr.img, 0, 0, x0, y0, x1 - x0, y1 - y0);
}

/** Markierungen: Start/Ziel, Startplätze, Boxengasse. */
function drawMarkings(ctx, t, opt = {}) {
  ctx.save();
  // Boxengasse
  if (t.pit && t.pit.path.length > 2) {
    const p = t.pit.path, b = t.pit.box;
    ctx.save();
    ctx.translate(b.x, b.y); ctx.rotate(b.a);
    ctx.fillStyle = 'rgba(255,205,50,0.10)'; ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h);
    ctx.strokeStyle = '#ffcd32'; ctx.lineWidth = 2; ctx.strokeRect(-b.w / 2, -b.h / 2, b.w, b.h);
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1;
    for (let x = -b.w / 2 + 30; x < b.w / 2 - 4; x += 30) { ctx.beginPath(); ctx.moveTo(x, -b.h / 2); ctx.lineTo(x, b.h / 2); ctx.stroke(); }
    ctx.fillStyle = 'rgba(255,205,50,.9)'; ctx.font = '700 10px "Chakra Petch",sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (Math.abs(wrapAngle(b.a)) > Math.PI / 2) ctx.rotate(Math.PI);   // Schrift nie kopfüber
    ctx.fillText('BOX', 0, 0);
    ctx.restore();
    const gate = (i, label, col) => {
      const tg = tangentAt(p, i, false), nx = -tg.y, ny = tg.x, q = p[i];
      ctx.strokeStyle = col; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(q.x + nx * 13, q.y + ny * 13); ctx.lineTo(q.x - nx * 13, q.y - ny * 13); ctx.stroke();
      ctx.save(); ctx.translate(q.x + nx * 22, q.y + ny * 22);
      ctx.fillStyle = 'rgba(0,0,0,.65)'; ctx.fillRect(-22, -7, 44, 14);
      ctx.fillStyle = col; ctx.font = '700 9px "Chakra Petch",sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(label, 0, 0.5); ctx.restore();
    };
    gate(Math.min(3, p.length - 1), 'BOX IN', '#49e08f');
    gate(Math.max(0, p.length - 4), 'BOX OUT', '#ff5a5a');
  }
  // Start-/Ziellinie (Schachbrett) – nicht in Derby-Arenen
  if (t.checkpoints.length && !t.arena) {
    const c = t.checkpoints[0];
    const len = Math.hypot(c.x2 - c.x1, c.y2 - c.y1), a = Math.atan2(c.y2 - c.y1, c.x2 - c.x1);
    ctx.save(); ctx.translate(c.x1, c.y1); ctx.rotate(a);
    for (let i = 0; i * 5 < len; i++) for (let j = 0; j < 2; j++) {
      ctx.fillStyle = ((i + j) & 1) ? '#111' : '#f4f4f4';
      ctx.fillRect(i * 5, -5 + j * 5, Math.min(5, len - i * 5), 5);
    }
    ctx.restore();
  }
  // Startplätze
  ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 1.5;
  for (const s of t.start) {
    ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.a);
    ctx.beginPath(); ctx.moveTo(14, -8); ctx.lineTo(-13, -8); ctx.moveTo(14, 8); ctx.lineTo(-13, 8); ctx.moveTo(14, -8); ctx.lineTo(14, 8); ctx.stroke();
    ctx.restore();
  }
  // Checkpoints: dezente gestrichelte Linie quer über die Fahrbahn
  if (!t.arena) {
    ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.32)'; ctx.lineWidth = 2; ctx.setLineDash([5, 5]);
    t.checkpoints.forEach((c, k) => { if (k === 0) return; ctx.beginPath(); ctx.moveTo(c.x1, c.y1); ctx.lineTo(c.x2, c.y2); ctx.stroke(); });
    ctx.restore();
  }
  if (opt.checkpoints) drawCheckpointsDebug(ctx, t);
  ctx.restore();
}
function drawCheckpointsDebug(ctx, t) {
  ctx.save(); ctx.lineWidth = 2; ctx.font = '700 11px "Chakra Petch",sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  t.checkpoints.forEach((c, i) => {
    ctx.strokeStyle = i === 0 ? '#fff' : 'rgba(255,215,0,.85)';
    ctx.setLineDash(i === 0 ? [] : [6, 4]);
    ctx.beginPath(); ctx.moveTo(c.x1, c.y1); ctx.lineTo(c.x2, c.y2); ctx.stroke();
    ctx.setLineDash([]);
    const mx = (c.x1 + c.x2) / 2, my = (c.y1 + c.y2) / 2;
    ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.beginPath(); ctx.arc(mx, my, 9, 0, 7); ctx.fill();
    ctx.fillStyle = i === 0 ? '#fff' : '#ffd700'; ctx.fillText(i === 0 ? 'S' : String(i), mx, my + 0.5);
  });
  ctx.restore();
}

/** Zeichnet ein Objekt. layer: 'shadow' | 'base' | 'top' */
function drawObject(ctx, o, theme, layer) {
  ctx.save();
  ctx.translate(o.x, o.y);
  const seed = Math.floor(o.x * 13 + o.y * 7);
  if (o.t === 'gate') {
    if (layer === 'base') { ctx.rotate(o.a); for (let k = 0; k < 6; k++) { ctx.fillStyle = k % 2 ? '#f4f4f4' : '#e0262b'; ctx.fillRect(-o.w / 2 + k * o.w / 6, -2, o.w / 6, 4); } ctx.fillStyle = '#ddd'; ctx.fillRect(-o.w / 2 - 6, -3, 5, 6); }
    ctx.restore(); return;
  }
  if (o.t === 'tree') {
    const r = o.w / 2;
    if (layer === 'shadow') { ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(r * 0.35, r * 0.45, r, r * 0.9, 0, 0, 7); ctx.fill(); }
    else if (layer === 'base') { ctx.fillStyle = theme === 'desert' ? '#7a5a34' : '#5a3d22'; ctx.beginPath(); ctx.arc(0, 0, Math.max(3, r * 0.22), 0, 7); ctx.fill(); }
    else if (layer === 'top') {
      ctx.rotate(o.a);
      if (theme === 'desert') {
        // Palme: Wedel von oben
        const k = 7;
        for (let i = 0; i < k; i++) {
          ctx.save(); ctx.rotate(i / k * Math.PI * 2);
          ctx.fillStyle = i % 2 ? '#3f8f3a' : '#56a845';
          ctx.beginPath(); ctx.ellipse(r * 0.5, 0, r * 0.55, r * 0.17, 0, 0, 7); ctx.fill();
          ctx.strokeStyle = 'rgba(20,60,20,.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(r, 0); ctx.stroke();
          ctx.restore();
        }
        ctx.fillStyle = '#6b4a2a'; ctx.beginPath(); ctx.arc(0, 0, r * 0.15, 0, 7); ctx.fill();
      } else if (theme === 'snow') {
        // Tanne: Sternringe mit Schnee
        for (let ring = 0; ring < 3; ring++) {
          const rr = r * (1 - ring * 0.3), pts = 8;
          ctx.fillStyle = ['#1f4d33', '#2a6343', '#34784f'][ring];
          ctx.beginPath();
          for (let i = 0; i <= pts * 2; i++) { const a = i / (pts * 2) * Math.PI * 2, q = i % 2 ? rr * 0.62 : rr; ctx.lineTo(Math.cos(a) * q, Math.sin(a) * q); }
          ctx.fill();
        }
        ctx.fillStyle = 'rgba(255,255,255,.85)';
        for (let i = 0; i < 6; i++) { const a = i * 1.05 + seed, q = r * (0.3 + (i % 3) * 0.2); ctx.beginPath(); ctx.arc(Math.cos(a) * q, Math.sin(a) * q, r * 0.13, 0, 7); ctx.fill(); }
      } else {
        // Laubbaum: drei Kronen-Blobs
        const c1 = theme === 'city' ? ['#2f6e36', '#3b8443', '#4f9d55'] : ['#2e7a32', '#3d9440', '#56b057'];
        ctx.fillStyle = c1[0]; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
        ctx.fillStyle = c1[1];
        for (let i = 0; i < 4; i++) { const a = i * 1.57 + seed * 0.1; ctx.beginPath(); ctx.arc(Math.cos(a) * r * 0.4, Math.sin(a) * r * 0.4, r * 0.55, 0, 7); ctx.fill(); }
        ctx.fillStyle = c1[2]; ctx.beginPath(); ctx.arc(-r * 0.25, -r * 0.25, r * 0.4, 0, 7); ctx.fill();
      }
    }
  } else if (o.t === 'tires') {
    const r = o.w / 2;
    if (layer === 'shadow') { ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.arc(2, 3, r, 0, 7); ctx.fill(); }
    else if (layer === 'base') {
      ctx.fillStyle = '#18191c'; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
      ctx.strokeStyle = (seed & 1) ? '#e23b3b' : '#f2f2f2'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(0, 0, r * 0.72, 0, 7); ctx.stroke();
      ctx.fillStyle = '#3a3c42'; ctx.beginPath(); ctx.arc(0, 0, r * 0.38, 0, 7); ctx.fill();
    }
  } else if (o.t === 'house') {
    ctx.rotate(o.a);
    const w = o.w, h = o.h;
    if (layer === 'shadow') { ctx.fillStyle = 'rgba(0,0,0,.32)'; ctx.fillRect(-w / 2 + 5, -h / 2 + 6, w, h); }
    else if (layer === 'base') {
      const roofs = theme === 'desert' ? ['#d8b07a', '#c99b62'] : theme === 'snow' ? ['#f2f6fb', '#d9e2ee'] : o.pit ? ['#6f7a8c', '#5d6676'] :
        [['#b5523b', '#9a4330'], ['#4f6d8f', '#405b78'], ['#8a7b6c', '#76695c'], ['#a3473f', '#8a3a33']][seed & 3];
      ctx.fillStyle = roofs[0]; ctx.fillRect(-w / 2, -h / 2, w, h / 2);
      ctx.fillStyle = roofs[1]; ctx.fillRect(-w / 2, 0, w, h / 2);
      ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 1; ctx.strokeRect(-w / 2 + 0.5, -h / 2 + 0.5, w - 1, h - 1);
      ctx.beginPath(); ctx.moveTo(-w / 2, 0); ctx.lineTo(w / 2, 0); ctx.stroke();
      if (o.pit) {
        if (Math.abs(wrapAngle(o.a)) > Math.PI / 2) ctx.rotate(Math.PI);
        ctx.fillStyle = '#ffcd32'; ctx.font = '700 9px "Chakra Petch",sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('PIT', 0, -h / 4); ctx.fillText('PIT', 0, h / 4);
      } else if (theme === 'snow') {
        ctx.fillStyle = '#8b6a4c'; ctx.fillRect(w / 4, -h / 2 + 3, 5, 5);
      } else { ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(w / 4, -h / 2 + 4, 6, 6); }
    }
  } else if (o.t === 'wall') {
    ctx.rotate(o.a);
    if (layer === 'shadow') { ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(-o.w / 2 + 3, -o.h / 2 + 4, o.w, o.h); }
    else if (layer === 'base') {
      ctx.fillStyle = theme === 'desert' ? '#b9936a' : '#9aa0a8'; ctx.fillRect(-o.w / 2, -o.h / 2, o.w, o.h);
      ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.lineWidth = 1;
      for (let x = -o.w / 2 + 10; x < o.w / 2; x += 10) { ctx.beginPath(); ctx.moveTo(x, -o.h / 2); ctx.lineTo(x, o.h / 2); ctx.stroke(); }
      ctx.strokeRect(-o.w / 2 + 0.5, -o.h / 2 + 0.5, o.w - 1, o.h - 1);
    }
  } else if (o.t === 'rail') {
    ctx.rotate(o.a);
    if (layer === 'shadow') { ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(-o.w / 2 + 2, -o.h / 2 + 3, o.w, o.h); }
    else if (layer === 'base') {
      ctx.fillStyle = '#c9d0d9'; ctx.fillRect(-o.w / 2, -o.h / 2, o.w, o.h);
      ctx.fillStyle = '#7d8794'; ctx.fillRect(-o.w / 2, -0.5, o.w, 1);
      for (let x = -o.w / 2 + 4; x < o.w / 2; x += 12) ctx.fillRect(x - 1, -o.h / 2, 2, o.h);
    }
  } else if (o.t === 'stand') {
    ctx.rotate(o.a);
    if (layer === 'shadow') { ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(-o.w / 2 + 6, -o.h / 2 + 6, o.w, o.h); }
    else if (layer === 'base') {
      for (let r = 0; r < 4; r++) { ctx.fillStyle = r % 2 ? '#8a93a3' : '#a3acbb'; ctx.fillRect(-o.w / 2, o.h / 2 - (r + 1) * o.h / 4, o.w, o.h / 4); }
      for (let i = 0; i < o.w / 4; i++) for (let r = 0; r < 4; r++) if (hash2(i + seed, r) > 0.3) { ctx.fillStyle = CROWD[(i * 7 + r * 3 + seed) % CROWD.length]; ctx.fillRect(-o.w / 2 + i * 4 + 1, o.h / 2 - (r + 1) * o.h / 4 + 2, 2.5, 2.5); }
      ctx.fillStyle = '#5b6474'; ctx.fillRect(-o.w / 2, -o.h / 2, o.w, 3);
    }
  } else if (o.t === 'banner' || o.t === 'fence') {
    ctx.rotate(o.a);
    if (layer === 'base') {
      ctx.fillStyle = o.t === 'fence' ? '#9aa3ad' : BANNER_COLS[(o.c || 0) % BANNER_COLS.length][0];
      ctx.fillRect(-o.w / 2, -Math.max(1.5, o.h / 2), o.w, Math.max(3, o.h));
    }
  } else if (o.t === 'bush') {
    if (layer === 'shadow') { ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.arc(3, 3, o.w / 2, 0, 7); ctx.fill(); }
    else if (layer === 'base') { ctx.fillStyle = theme === 'desert' ? '#7d8a3f' : theme === 'snow' ? '#3d5a45' : '#3f7d34'; ctx.beginPath(); ctx.arc(0, 0, o.w / 2, 0, 7); ctx.fill(); }
  } else if (o.t === 'rock') {
    if (layer === 'shadow') { ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.arc(2, 2, o.w / 2, 0, 7); ctx.fill(); }
    else if (layer === 'base') { ctx.fillStyle = theme === 'desert' ? '#a5764e' : '#8b8f96'; ctx.beginPath(); rockPoly(o).forEach(([x, y], i) => i ? ctx.lineTo(x - o.x, y - o.y) : ctx.moveTo(x - o.x, y - o.y)); ctx.fill(); }
  } else if (o.t === 'flag') {
    if (layer === 'base') { ctx.fillStyle = '#ddd'; ctx.beginPath(); ctx.arc(0, 0, 2.5, 0, 7); ctx.fill(); ctx.fillStyle = (o.c || 0) ? '#111' : '#ff6a2b'; ctx.fillRect(1, -3, 9, 6); }
  } else if (o.t === 'lamp') {
    ctx.rotate(o.a);
    if (layer === 'base') { ctx.fillStyle = '#5a606c'; ctx.beginPath(); ctx.arc(0, 0, 2.5, 0, 7); ctx.fill(); ctx.fillRect(0, -0.8, 9, 1.6); ctx.fillStyle = '#ffe9a0'; ctx.fillRect(7, -2, 4, 4); }
  } else if (o.t === 'container') {
    ctx.rotate(o.a);
    if (layer === 'base') { const c = CONTAINER_COL[(o.c || 0) % CONTAINER_COL.length]; ctx.fillStyle = 'rgb(' + c + ')'; ctx.fillRect(-o.w / 2, -o.h / 2, o.w, o.h); ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.strokeRect(-o.w / 2 + 0.5, -o.h / 2 + 0.5, o.w - 1, o.h - 1); }
  } else if (o.t === 'ramp') {
    ctx.rotate(o.a);
    if (layer === 'base') {
      const gr = ctx.createLinearGradient(-o.w / 2, 0, o.w / 2, 0); gr.addColorStop(0, '#8a6440'); gr.addColorStop(1, '#d8a868');
      ctx.fillStyle = gr; ctx.fillRect(-o.w / 2, -o.h / 2, o.w, o.h);
      ctx.fillStyle = '#ffcc22'; ctx.fillRect(o.w / 2 - 4, -o.h / 2, 4, o.h);
      ctx.fillStyle = '#222'; ctx.beginPath(); ctx.moveTo(-6, -5); ctx.lineTo(6, 0); ctx.lineTo(-6, 5); ctx.fill();
    }
  } else if (o.t === 'bridge') {
    ctx.rotate(o.a);
    if (layer === 'shadow') { ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(-o.w / 2 + 6, -o.h / 2 + 6, o.w, o.h); }
    else if (layer === 'top') {
      ctx.globalAlpha *= 0.82;
      ctx.fillStyle = '#4c5058'; ctx.fillRect(-o.w / 2, -o.h / 2, o.w, o.h);
      ctx.fillStyle = '#c9d0d9'; ctx.fillRect(-o.w / 2, -o.h / 2, o.w, 3); ctx.fillRect(-o.w / 2, o.h / 2 - 3, o.w, 3);
      ctx.fillStyle = 'rgba(255,255,255,.8)'; for (let u = -o.w / 2 + 4; u < o.w / 2 - 6; u += 14) ctx.fillRect(u, -0.7, 7, 1.4);
      ctx.fillStyle = '#ffcd32'; ctx.font = '700 10px "Chakra Petch",sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('Höhe ' + Math.round(o.z || 30), 0, -o.h / 4);
    }
  }
  ctx.restore();
}
const CROWD = ['#ff4d4d', '#3ea6ff', '#ffd23e', '#ffffff', '#46d68a', '#ff8a3d', '#c46bff', '#20262f', '#f2c8a0', '#ff6fb5'];
const BANNER_COLS = [['#ff6a2b', 'TURBOFIX'], ['#2f6fd6', 'GRIPMAX'], ['#1fa35a', 'KOLBEN & CO'], ['#d6342f', 'BLITZÖL']];
/** Unregelmäßiges Vieleck für Steine (deterministisch je Position). */
function rockPoly(o) {
  const pts = [], k = 7, seed = Math.floor(o.x * 13 + o.y * 7);
  for (let i = 0; i < k; i++) {
    const a = o.a + i / k * Math.PI * 2, r = o.w / 2 * (0.75 + 0.25 * hash2(seed, i));
    pts.push([o.x + Math.cos(a) * r, o.y + Math.sin(a) * r * 0.85]);
  }
  return pts;
}
/** Baut die statischen Ebenen einer Strecke: Boden + Markierungen + Objekte, sowie die Baumkronen-Ebene. */
function buildTrackLayers(t, opt = {}) {
  const gr = makeGround(t);
  const st = document.createElement('canvas'); st.width = W; st.height = H;
  const g = st.getContext('2d');
  g.drawImage(gr.canvas, 0, 0);
  drawMarkings(g, t, opt);
  for (const o of t.objects) drawObject(g, o, t.theme, 'shadow');
  for (const o of t.objects) drawObject(g, o, t.theme, 'base');
  const top = document.createElement('canvas'); top.width = W; top.height = H;
  const tg = top.getContext('2d');
  for (const o of t.objects) drawObject(tg, o, t.theme, 'top');
  return { ground: gr, static: st, top };
}
/** Vorschaubild (für Menüs), zwischengespeichert. */
const previewCache = {};
function trackPreview(id, tObj) {
  const t = tObj || getTrack(id); if (!t) return null;
  const key = id + ':' + (t.custom ? JSON.stringify(encodeTrack(t)).length : 'b');
  if (previewCache[key]) return previewCache[key];
  // Vorschau in der schrägen Ansicht (ohne Autos)
  const L = buildScene(t, null, {}, { sky: 'clear', time: 'day' });
  const full = document.createElement('canvas'); full.width = W; full.height = H;
  const fg = full.getContext('2d');
  fg.drawImage(L.scene, 0, 0);
  for (const o of L.dyn) { ZB = o.zb || 0; drawObject3D(fg, o, L.theme, 0); }
  ZB = 0; fg.drawImage(L.overlay, 0, 0);
  const c = document.createElement('canvas'); c.width = 448; c.height = 280;
  const g = c.getContext('2d');
  g.imageSmoothingQuality = 'high';
  g.drawImage(full, 0, 0, 448, 280);
  previewCache[key] = c;
  return c;
}
