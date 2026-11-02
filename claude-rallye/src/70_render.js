/* =====================================================================
   12  DARSTELLUNG: Autos, Rennszene, Seitenleiste (HUD)
   ===================================================================== */
function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const r = clamp(Math.round(((n >> 16) & 255) * f), 0, 255), g = clamp(Math.round(((n >> 8) & 255) * f), 0, 255), b = clamp(Math.round((n & 255) * f), 0, 255);
  return 'rgb(' + r + ',' + g + ',' + b + ')';
}
function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

/** Zeichnet ein Auto (Draufsicht). Ausrichtung: +x = vorne. */
function drawCarShape(ctx, x, y, a, color, shape, opt = {}) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(a);
  if (opt.scale) ctx.scale(opt.scale, opt.scale);
  const steer = (opt.steer || 0) * 0.45, dmg = opt.damage || 0;
  ctx.globalAlpha = opt.alpha != null ? opt.alpha : 1;
  if (!opt.noShadow) { ctx.fillStyle = 'rgba(0,0,0,.35)'; rr(ctx, -11, -5, 24, 13, 4); ctx.fill(); }
  // Räder
  ctx.fillStyle = '#121214';
  const wheel = (wx, wy, rot) => { ctx.save(); ctx.translate(wx, wy); ctx.rotate(rot); ctx.fillRect(-3, -1.6, 6, 3.2); ctx.restore(); };
  const wy = shape === 'buggy' ? 7 : 5.6;
  wheel(-7, -wy, 0); wheel(-7, wy, 0); wheel(7, -wy, steer); wheel(7, wy, steer);
  const dark = shade(color, 0.62), light = shade(color, 1.25);
  ctx.lineWidth = 1; ctx.strokeStyle = dark;
  if (shape === 'wedge') {
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.moveTo(13, 0); ctx.lineTo(7, -5); ctx.lineTo(-10, -6); ctx.lineTo(-12, -4.5); ctx.lineTo(-12, 4.5); ctx.lineTo(-10, 6); ctx.lineTo(7, 5); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = dark; ctx.fillRect(-13, -6.5, 3, 13);                       // Heckflügel
    ctx.fillStyle = '#1b2230'; ctx.beginPath(); ctx.ellipse(-1, 0, 4.5, 2.8, 0, 0, 7); ctx.fill();   // Cockpit
    ctx.fillStyle = light; ctx.fillRect(3, -0.8, 8, 1.6);
  } else if (shape === 'buggy') {
    ctx.fillStyle = color; rr(ctx, -10, -5.5, 21, 11, 4); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#2a2d33'; ctx.lineWidth = 1.4; rr(ctx, -6, -4, 9, 8, 2); ctx.stroke();   // Überrollbügel
    ctx.fillStyle = '#1b2230'; ctx.fillRect(-4.5, -2.6, 6, 5.2);
    ctx.fillStyle = light; ctx.fillRect(6, -3.5, 3.5, 7);
  } else {
    ctx.fillStyle = color; rr(ctx, -11.5, -5.8, 24, 11.6, 3.5); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#1b2230';
    ctx.beginPath(); ctx.moveTo(5, -4.4); ctx.lineTo(7.6, -3.6); ctx.lineTo(7.6, 3.6); ctx.lineTo(5, 4.4); ctx.closePath(); ctx.fill();   // Frontscheibe
    ctx.fillRect(-7.5, -3.8, 2.2, 7.6);
    ctx.fillStyle = light; rr(ctx, -5, -4, 9.5, 8, 2); ctx.fill();               // Dach
    ctx.fillStyle = '#fff6c4'; ctx.fillRect(11, -4.8, 1.2, 2.2); ctx.fillRect(11, 2.6, 1.2, 2.2);
  }
  if (dmg > 0.35) {
    ctx.strokeStyle = 'rgba(20,20,20,.7)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-6, -4); ctx.lineTo(-2, -1); ctx.lineTo(-4, 2); ctx.stroke();
    if (dmg > 0.65) { ctx.beginPath(); ctx.moveTo(4, 3.5); ctx.lineTo(8, 0.5); ctx.moveTo(-9, 3); ctx.lineTo(-6, 5); ctx.stroke(); }
  }
  ctx.restore();
}
/** Darstellungsparameter eines Autos für die schräge Ansicht. */
function carView(car, race) {
  const d = race.rules.dmgOn ? car.damage / 100 : 0;
  const wob = d > 0.6 && carSpeed(car) > 20 && !car.air ? Math.sin(race.time * 38 + car.seed) * (d - 0.6) * 0.18 : 0;
  let alpha = car.alpha, z = car.z;
  if (car.sink > 0) { z -= (1 - car.sink / 0.8) * 7; alpha *= clamp(car.sink / 0.8, 0.25, 1); }
  if (car.freeze > 0 && car.resetMsg > 0 && !car.service.cur) alpha *= 0.5 + 0.5 * Math.abs(Math.sin(race.time * 12));
  const gz = car.level === 1 && car.bridge ? car.bridge.z : terrainH(race.rt, car.x, car.y);
  return { x: car.x, y: car.y, a: car.a + wob, z, gz: Math.min(gz, z), pitch: car.pitch, roll: car.roll, color: car.wreck ? shade(car.color, 0.4) : car.color, shape: car.cls.shape, steer: car.steerVis, damage: d,
    brake: car.brk > 0.2 && fwdSpeed(car) > 5, alpha, num: car.id + 1, level: car.level, lights: race.weather.time !== 'day', car };
}
/** Ghost-Position im Zeitfahren (oder null). */
function ghostView(race) {
  const g = race.ghost; if (!g || !g.frames || g.frames.length < 6) return null;
  const car = race.cars.find(c => c.human >= 0); if (!car || car.lap < 1 || car.finished || race.state !== 'running') return null;
  const tl = race.t - car.lapStart, f = tl * 30, i = Math.floor(f), n = g.frames.length / 3;
  if (i >= n - 1) return null;
  const u = f - i, A = i * 3, B = (i + 1) * 3, fr = g.frames;
  const cls = CLASSES.find(c => c.id === g.cls) || CLASSES[1];
  const x = lerp(fr[A], fr[B], u), y = lerp(fr[A + 1], fr[B + 1], u);
  const z = g.z ? lerp(g.z[i], g.z[i + 1], u) : groundZ(race.rt, x, y, 0);
  return { x, y, z, gz: z, a: fr[A + 2] + wrapAngle(fr[B + 2] - fr[A + 2]) * u, shape: cls.shape, ghost: true, alpha: 0.45, color: '#bfe8ff', level: 0 };
}
function label(ctx, x, y, text, bg, fg = '#fff', size = 11) {
  ctx.font = '700 ' + size + 'px "Chakra Petch",sans-serif';
  const w = ctx.measureText(text).width + 8;
  ctx.fillStyle = bg; rr(ctx, x - w / 2, y - size / 2 - 3, w, size + 5, 3); ctx.fill();
  ctx.fillStyle = fg; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, x, y + 0.5);
}
/** Sortierschlüssel für die Zeichenreihenfolge (Brücken: Autos darunter vorher, darauf nachher). */
function viewKey(v, bridges) {
  for (const b of bridges) {
    const [lx, ly] = localOf(b, v.x, v.y);
    if (Math.abs(lx) <= b.w / 2 + 14 && Math.abs(ly) <= b.h / 2 + 14) return v.level === 1 ? b.key + 0.01 + v.y * 1e-6 : b.key - 0.01 - (1000 - v.y) * 1e-6;
  }
  return v.y;
}
/** Komplette Rennszene in der schrägen Ansicht. */
/** Kamera (nur Einzelspieler): folgt dem Auto mit Zoom, schüttelt bei harten Treffern. */
function updateCamera(race) {
  const humans = race.cars.filter(c => c.human >= 0);
  const z = camZoom();
  if (race.mode === 'demo' || humans.length !== 1 || z <= 1) { race.cam = null; return null; }
  const c = humans[0], cam = race.cam || (race.cam = { x: 0, y: 0, shake: 0, t: race.time, init: false });
  const dt = clamp(race.time - cam.t, 0, 0.1); cam.t = race.time;
  const look = 0.32, [tx, ty] = P(c.x + c.vx * look, c.y + c.vy * look, c.z);
  if (!cam.init) { cam.x = tx; cam.y = ty; cam.init = true; }
  const k = 1 - Math.exp(-dt * 5);
  cam.x += (tx - cam.x) * k; cam.y += (ty - cam.y) * k;
  cam.shake = Math.max(0, cam.shake - dt * 2.2);
  const vw = W / z, vh = H / z, sh = cam.shake * cam.shake * 9;
  cam.z = z; cam.vw = vw; cam.vh = vh;
  cam.x0 = clamp(cam.x - vw / 2 + (Math.random() - 0.5) * sh, 0, W - vw);
  cam.y0 = clamp(cam.y - vh / 2 + (Math.random() - 0.5) * sh, 0, H - vh);
  return cam;
}
function drawRace(ctx, race) {
  const cam = updateCamera(race);
  if (cam) {
    // Welt direkt vergrößert zeichnen (Vektorgrafik bleibt scharf, Szene liegt in doppelter Auflösung vor)
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
    ctx.setTransform(cam.z, 0, 0, cam.z, -cam.x0 * cam.z, -cam.y0 * cam.z);
  }
  const L = race.layers, wx = race.weather;
  ctx.drawImage(L.scene, 0, 0, W, H);
  ctx.drawImage(race.skid, 0, 0, W, H);
  if (race.powerups) PU.drawGround(ctx, race);
  // Autos + dynamische Objekte (Brücken, Tribünen, Flaggen) nach Tiefe
  const bridges = L.dyn.filter(o => o.t === 'bridge');
  const items = race.cars.map(c => { const v = carView(c, race); return { k: viewKey(v, bridges), car: v }; });
  if (race.mode === 'trial') { const g = ghostView(race); if (g) items.push({ k: viewKey(g, bridges), car: g }); }
  const p1 = race.cars.find(c => c.human === 0);
  for (const o of L.dyn) { if (o.t === 'cpflag') o.hl = !!(p1 && !p1.finished && p1.nextCp === o.k); items.push({ k: o.t === 'bridge' ? o.key : o.y, obj: o }); }
  items.sort((a, b) => a.k - b.k);
  for (const it of items) {
    if (it.obj) { ZB = it.obj.zb || 0; drawObject3D(ctx, it.obj, L.theme, race.time); ZB = 0; continue; }
    const v = it.car;
    drawCar3D(ctx, v);
    // eingebackene Objekte, die vor dem Auto stehen und es überdecken, erneut zeichnen
    for (const o of L.baked) {
      if (o.y <= v.y || o.y - v.y > objRadius(o) + objHeight(o) + 30 || Math.abs(o.x - v.x) > objRadius(o) + 22) continue;
      if (o.t === 'ramp' && (v.z - o.zb) > 2) continue;
      ZB = o.zb; drawObject3D(ctx, o, L.theme, race.time); ZB = 0;
    }
  }
  ZB = 0;
  if (race.powerups) { PU.drawBoxes(ctx, race); PU.drawCarFx(ctx, race); }
  Particles.draw(ctx);
  drawWeather(ctx, race);
  ctx.drawImage(L.overlay, 0, 0);
  if (race.mode === 'demo') { if (cam) ctx.restore(); return; }
  if (cam) {
    // Beschriftungen: Schrift nur mäßig mitvergrößern
    const lz = Math.sqrt(cam.z);
    ctx.setTransform(lz, 0, 0, lz, 0, 0);
    race.camMap = (X, Y) => [((X - cam.x0) * cam.z) / lz, ((Y - cam.y0) * cam.z) / lz];
  } else race.camMap = null;
  const map = (X, Y) => race.camMap ? race.camMap(X, Y) : [X, Y];
  if (cam && race.state === 'running') { const lz = Math.sqrt(cam.z); drawEdgeArrows(ctx, race, map, W / lz, H / lz); }
  // Beschriftungen und Hinweise an menschlichen Autos
  for (const c of race.cars) {
    if (c.human < 0) continue;
    const [sx, sy] = map(...P(c.x, c.y, c.z + 16));
    const y0 = sy - 6;
    label(ctx, sx, y0, 'P' + (c.human + 1), c.color, '#000', 10);
    let ty = y0 - 15;
    if (c.msgT > 0) { label(ctx, sx, ty, c.msg, 'rgba(0,0,0,.75)', c.msgCol || '#fff', 12); ty -= 16; }
    if (c.draft > 0.45 && !c.finished) { label(ctx, sx, ty, '≋ WINDSCHATTEN', 'rgba(0,0,0,.6)', '#8fd8ff', 9); ty -= 14; }
    if (c.wrong && !c.finished) { label(ctx, sx, ty, 'FALSCHE RICHTUNG', 'rgba(200,30,40,.9)', '#fff', 11); ty -= 16; }
    if (c.resetMsg > 0 && !c.service.cur) { label(ctx, sx, ty, 'RESET', 'rgba(0,0,0,.7)', '#ffd23e', 10); ty -= 16; }
    if (race.rules.fuelOn && c.fuel <= 0 && !c.finished) { label(ctx, sx, ty, 'TANK LEER', 'rgba(0,0,0,.75)', '#ff8a3d', 10); ty -= 16; }
    if (c.inBox && !c.finished) { const g = map(...P(c.x, c.y, c.z)); drawPitMenu(ctx, c, race, g[0], g[1] + 16); }
  }
  // Verpassten Checkpoint blinkend anzeigen
  for (const c of race.cars) if (c.human >= 0 && c.missedCp) {
    const cp = race.rt.cps[c.nextCp], gz1 = terrainH(race.rt, cp.x1, cp.y1), gz2 = terrainH(race.rt, cp.x2, cp.y2);
    const A = map(...P(cp.x1, cp.y1, gz1 + 1)), B = map(...P(cp.x2, cp.y2, gz2 + 1));
    ctx.save(); ctx.globalAlpha = 0.5 + 0.5 * Math.abs(Math.sin(race.time * 6));
    ctx.strokeStyle = '#ffcd32'; ctx.lineWidth = 5; ctx.setLineDash([10, 6]);
    ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.stroke(); ctx.restore();
    label(ctx, (A[0] + B[0]) / 2, (A[1] + B[1]) / 2 - 14, 'CHECKPOINT ' + c.nextCp, 'rgba(0,0,0,.75)', '#ffcd32', 10);
  }
  // Ausscheidungsrennen: aktuell Letzten markieren
  if (race.mode === 'elim' && race.state === 'running') {
    const act = race.cars.filter(c => !c.out && !c.finished);
    if (act.length > 1) {
      const last = act.reduce((a, b) => b.key < a.key ? b : a);
      const [lx, ly] = map(...P(last.x, last.y, last.z + 16));
      label(ctx, lx, ly - (last.human >= 0 ? 22 : 6), 'LETZTER', 'rgba(200,30,40,.9)', '#fff', 10);
    }
  }
  const gv = race.mode === 'trial' ? ghostView(race) : null;
  if (gv) { const [gx, gy] = map(...P(gv.x, gv.y, gv.z + 16)); ctx.fillStyle = 'rgba(191,232,255,.85)'; ctx.font = '600 10px "Chakra Petch",sans-serif'; ctx.textAlign = 'center'; ctx.fillText('GHOST', gx, gy - 4); }
  if (cam) ctx.restore();
  // Countdown
  if (race.state === 'countdown' || race.goT > 0) drawCountdown(ctx, race);
  if (race.state === 'ending' || race.state === 'done') {
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(0, 360, W, 80);
    ctx.fillStyle = '#fff'; ctx.font = '400 44px "Russo One",sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(race.mode === 'derby' ? (race.timeUp ? 'ZEIT ABGELAUFEN' : 'DERBY BEENDET') : race.mode === 'rally' ? 'ETAPPE BEENDET' : 'RENNEN BEENDET', W / 2, 402);
  }
}
/** Wolkenschatten, Licht (Abend/Nacht), Regen/Schnee, Blitze. */
function drawWeather(ctx, race) {
  const L = race.layers, wx = race.weather, t = race.time;
  if (L.clouds) { const off = (t * 14) % (W * 2); ctx.drawImage(L.clouds, -off, 0); ctx.drawImage(L.clouds, W * 2 - off, 0); }
  if (L.lightBase) {
    if (!race.lightC) { race.lightC = document.createElement('canvas'); race.lightC.width = W; race.lightC.height = H; }
    const lc = race.lightC.getContext('2d');
    lc.globalCompositeOperation = 'copy'; lc.drawImage(L.lightBase, 0, 0);
    lc.globalCompositeOperation = 'destination-out';
    const glows = [];
    for (const c of race.cars) {
      if (c.sink > 0) continue;
      const fx = Math.cos(c.a), fy = Math.sin(c.a), rx = -fy, ry = fx, fr = carFront(c.cls.shape);
      const ox = c.x + fx * fr, oy = c.y + fy * fr, len = 140, spread = 46;
      const gz = c.level === 1 && c.bridge ? c.bridge.z : terrainH(race.rt, c.x + fx * 60, c.y + fy * 60);
      const A = P(ox + rx * 4, oy + ry * 4, c.z), B = P(ox - rx * 4, oy - ry * 4, c.z);
      const C = P(ox + fx * len - rx * spread, oy + fy * len - ry * spread, gz), D = P(ox + fx * len + rx * spread, oy + fy * len + ry * spread, gz);
      const M = P(ox + fx * len, oy + fy * len, gz), O = P(ox, oy, c.z);
      const g = lc.createLinearGradient(O[0], O[1], M[0], M[1]);
      g.addColorStop(0, 'rgba(0,0,0,0.9)'); g.addColorStop(0.5, 'rgba(0,0,0,0.5)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      lc.fillStyle = g; lc.beginPath(); lc.moveTo(A[0], A[1]); lc.lineTo(D[0], D[1]); lc.lineTo(C[0], C[1]); lc.lineTo(B[0], B[1]); lc.closePath(); lc.fill();
      const cg = lc.createRadialGradient(O[0], O[1], 0, O[0], O[1], 22); cg.addColorStop(0, 'rgba(0,0,0,0.8)'); cg.addColorStop(1, 'rgba(0,0,0,0)');
      lc.fillStyle = cg; lc.fillRect(O[0] - 22, O[1] - 22, 44, 44);
      glows.push([O, c]);
    }
    ctx.drawImage(race.lightC, 0, 0);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    if (L.glow) ctx.drawImage(L.glow, 0, 0);
    for (const [O, c] of glows) {
      const g = ctx.createRadialGradient(O[0], O[1], 0, O[0], O[1], 10); g.addColorStop(0, 'rgba(255,250,220,0.55)'); g.addColorStop(1, 'rgba(255,250,220,0)');
      ctx.fillStyle = g; ctx.fillRect(O[0] - 10, O[1] - 10, 20, 20);
      const fx = Math.cos(c.a), fy = Math.sin(c.a), rr2 = (CAR3D[c.cls.shape] || CAR3D.coupe).rear;
      const R = P(c.x + fx * rr2, c.y + fy * rr2, c.z + 4);
      const rg = ctx.createRadialGradient(R[0], R[1], 0, R[0], R[1], c.brk > 0.2 ? 14 : 7); rg.addColorStop(0, 'rgba(255,40,30,0.6)'); rg.addColorStop(1, 'rgba(255,40,30,0)');
      ctx.fillStyle = rg; ctx.fillRect(R[0] - 14, R[1] - 14, 28, 28);
    }
    ctx.restore();
  }
  if (wx.sky === 'rain') {
    if (!race.drops) { race.drops = []; const r = mulberry32(17); for (let i = 0; i < (wx.snow ? 170 : 260); i++) race.drops.push([r() * W, r() * H, 0.6 + r() * 0.8]); }
    if (wx.snow) {
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      for (const d of race.drops) { const x = (d[0] + Math.sin(t * d[2] + d[1]) * 20 + t * 18 * d[2]) % W, y = (d[1] + t * 55 * d[2]) % H; ctx.beginPath(); ctx.arc(x, y, 1 + d[2], 0, 7); ctx.fill(); }
    } else {
      ctx.strokeStyle = wx.time === 'night' ? 'rgba(170,190,220,0.35)' : 'rgba(210,222,240,0.45)'; ctx.lineWidth = 1;
      ctx.beginPath();
      for (const d of race.drops) { const x = (d[0] + t * 120 * d[2]) % W, y = (d[1] + t * 760 * d[2]) % H; ctx.moveTo(x, y); ctx.lineTo(x - 3 * d[2], y - 14 * d[2]); }
      ctx.stroke();
      // Blitz
      if (race.flashT == null) race.flashT = 8 + Math.random() * 12;
      race.flashT -= 1 / 60;
      if (race.flashT < 0) { race.flash = 0.22; race.flashT = 10 + Math.random() * 16; if (race.audible) Sound.thunder(); }
      if (race.flash > 0) { ctx.fillStyle = 'rgba(235,240,255,' + (race.flash * 2).toFixed(3) + ')'; ctx.fillRect(0, 0, W, H); race.flash -= 1 / 60; }
    }
  }
}
function drawPitMenu(ctx, c, race, sx, y) {
  const sv = c.service, r = race.rules;
  const items = [['◀', 'Reparatur', 'repair', r.dmgOn, Math.round(c.damage) + '%'], ['▼', 'Tanken', 'fuel', r.fuelOn, Math.round(c.fuel) + '%'], ['▶', 'Reifen', 'tires', r.tireOn, Math.round(c.tires) + '%']].filter(i => i[3]);
  if (!items.length) return;
  const w = 74, total = items.length * w + 6, x0 = clamp(sx - total / 2, 2, W - total - 2);
  const yy = clamp(y, 4, H - 40);
  ctx.fillStyle = 'rgba(10,14,20,.88)'; rr(ctx, x0, yy, total, 34, 6); ctx.fill();
  ctx.strokeStyle = '#ffcd32'; ctx.lineWidth = 1; ctx.stroke();
  items.forEach((it, i) => {
    const x = x0 + 3 + i * w;
    const active = sv.cur === it[2], queued = sv.q.includes(it[2]);
    if (active) { ctx.fillStyle = 'rgba(255,205,50,.25)'; ctx.fillRect(x + 1, yy + 3, (w - 2) * clamp(sv.t / sv.dur, 0, 1), 28); }
    ctx.fillStyle = active ? '#ffcd32' : queued ? '#38c4ff' : '#e9eef6';
    ctx.font = '700 11px "Chakra Petch",sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(it[0] + ' ' + it[1], x + 4, yy + 11);
    ctx.fillStyle = '#8a97ad'; ctx.font = '500 10px "Chakra Petch",sans-serif';
    ctx.fillText(active ? 'läuft …' : queued ? 'wartet' : it[4], x + 4, yy + 24);
  });
  if (!sv.cur && !sv.q.length && Math.abs(fwdSpeed(c)) >= 12) { label(ctx, sx, yy + 44, 'Anhalten für Boxenstopp', 'rgba(0,0,0,.7)', '#ffcd32', 10); }
}
function drawCountdown(ctx, race) {
  const cx = W / 2, cy = 120;
  ctx.save();
  ctx.fillStyle = 'rgba(10,12,16,.85)'; rr(ctx, cx - 96, cy - 34, 192, 68, 14); ctx.fill();
  const lit = race.state === 'countdown' ? clamp(4 - Math.ceil(race.cd), 0, 3) : 3;
  const go = race.state !== 'countdown';
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = go ? '#3bea7a' : (i < lit ? '#ff3b3b' : '#3a1515');
    ctx.beginPath(); ctx.arc(cx - 56 + i * 56, cy, 20, 0, 7); ctx.fill();
    if (go || i < lit) { ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.arc(cx - 61 + i * 56, cy - 6, 6, 0, 7); ctx.fill(); }
  }
  const txt = go ? 'GO!' : String(Math.ceil(race.cd));
  ctx.font = '400 96px "Russo One",sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineWidth = 8; ctx.strokeStyle = 'rgba(0,0,0,.6)';
  if (race.state !== 'countdown' || race.cd <= 3) {
    ctx.strokeText(txt, cx, 270); ctx.fillStyle = go ? '#3bea7a' : '#fff'; ctx.fillText(txt, cx, 270);
  }
  ctx.restore();
}

/** Seitenleiste: Rennstatus, Rangliste, Spielerkarten. */
function drawPanel(ctx, race) {
  const x0 = W;
  ctx.fillStyle = '#10151e'; ctx.fillRect(x0, 0, PANEL, H);
  ctx.fillStyle = '#ff6a2b'; ctx.fillRect(x0, 0, 3, H);
  ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
  ctx.fillStyle = '#fff'; ctx.font = '400 20px "Russo One",sans-serif'; ctx.fillText('CLAUDE', x0 + 14, 28);
  ctx.fillStyle = '#ff6a2b'; ctx.fillText('RALLYE', x0 + 100, 28);
  ctx.fillStyle = '#8a97ad'; ctx.font = '500 12px "Chakra Petch",sans-serif';
  const modeName = race.career ? 'Karriere' : { quick: 'Schnelles Rennen', trial: 'Zeitfahren', champ: 'Championship', test: 'Testfahrt', demo: '', elim: 'Ausscheidung', derby: 'Demolition Derby', rally: 'Rallye' }[race.mode];
  ctx.fillText((race.trackName + (modeName ? ' · ' + modeName : '')).slice(0, 34), x0 + 14, 46);
  ctx.fillStyle = '#5d6a80'; ctx.textAlign = 'right'; ctx.fillText(WX_LABEL(race.weather), x0 + PANEL - 12, 28); ctx.textAlign = 'left';
  ctx.fillStyle = '#e9eef6'; ctx.font = '700 15px "Chakra Petch",sans-serif';
  const leader = race.cars.reduce((a, b) => b.key > a.key ? b : a);
  const alive = race.cars.filter(c => !c.out).length;
  if (race.mode === 'rally') {
    const si = race.secInfo || { k: 0, n: 1 };
    ctx.fillText('Abschnitt ' + (si.k + 1) + ' / ' + si.n, x0 + 14, 66);
    ctx.textAlign = 'right'; ctx.fillText(fmtTime(Rally.total()), x0 + PANEL - 12, 66); ctx.textAlign = 'left';
  } else if (race.mode === 'derby') {
    ctx.fillText('Noch ' + alive + ' fahrbereit', x0 + 14, 66);
    const left = Math.max(0, race.timeLimit - race.t);
    ctx.textAlign = 'right'; ctx.fillStyle = left < 20 ? '#ff4d5e' : '#e9eef6'; ctx.fillText(fmtTime(left).replace(/\.\d+$/, ''), x0 + PANEL - 12, 66); ctx.textAlign = 'left';
  } else {
    ctx.fillText('Runde ' + clamp(leader.lap, 1, race.laps) + ' / ' + race.laps + (race.mode === 'elim' ? ' · ' + alive + ' im Rennen' : ''), x0 + 14, 66);
    ctx.textAlign = 'right'; ctx.fillText(fmtTime(race.t), x0 + PANEL - 12, 66); ctx.textAlign = 'left';
  }
  // Rangliste
  let y = 82;
  const sorted = race.cars.slice().sort((a, b) => a.place - b.place);
  if (race.mode !== 'trial' && race.mode !== 'rally') {
    for (const c of sorted) {
      if (c.human >= 0) { ctx.fillStyle = 'rgba(255,106,43,.12)'; ctx.fillRect(x0 + 6, y, PANEL - 12, 20); }
      ctx.fillStyle = '#e9eef6'; ctx.font = '400 13px "Russo One",sans-serif'; ctx.fillText(String(c.place), x0 + 12, y + 15);
      ctx.fillStyle = c.color; ctx.fillRect(x0 + 32, y + 5, 10, 10);
      ctx.fillStyle = c.human >= 0 ? '#fff' : '#c4ccd9'; ctx.font = (c.human >= 0 ? '700' : '500') + ' 13px "Chakra Petch",sans-serif';
      ctx.fillText(c.name.slice(0, 13), x0 + 48, y + 15);
      ctx.textAlign = 'right'; ctx.fillStyle = c.out ? '#ff5a5a' : c.finished ? '#47d48a' : '#8a97ad'; ctx.font = '500 12px "Chakra Petch",sans-serif';
      let tag = c.gapText;
      if (c.ai && c.ai.mode !== 'race' && !c.finished) tag = 'BOX';
      if (c.service.cur && c.human >= 0) tag = 'BOX';
      ctx.fillText(tag, x0 + PANEL - 12, y + 15); ctx.textAlign = 'left';
      y += 21;
    }
    y += 8;
  }
  // Spielerkarten
  const humans = race.cars.filter(c => c.human >= 0).sort((a, b) => a.human - b.human);
  const cardH = humans.length > 2 ? 112 : 128;
  for (const c of humans) { drawPlayerCard(ctx, c, race, x0 + 6, y, PANEL - 12, cardH - 6); y += cardH; }
  if (race.cam && humans.length === 1 && race.mode !== 'trial') { y = drawGaps(ctx, humans[0], race, x0 + 12, y) + 6; }
  if (race.cam && y < H - 170) drawMinimap(ctx, race, x0 + 10, y + 4, PANEL - 20, Math.min(150, H - y - 40));
  if (race.mode === 'trial') {
    const g = race.ghost;
    ctx.fillStyle = '#8a97ad'; ctx.font = '500 12px "Chakra Petch",sans-serif';
    ctx.fillText('Ghost-Bestzeit: ' + (g ? fmtTime(g.time) : 'noch keine'), x0 + 12, y + 8);
    const recs = getRecords(race.trackId);
    ctx.fillText('Streckenrekord: ' + (recs[0] ? fmtTime(recs[0].time) + ' (' + recs[0].name + ')' : '–'), x0 + 12, y + 26);
    y += 40;
  }
  ctx.fillStyle = '#5d6a80'; ctx.font = '500 11px "Chakra Petch",sans-serif';
  ctx.fillText(Touch.active ? 'Ⅱ oben links: Pause' : 'P / Esc: Pause' + (race.cars.filter(c => c.human >= 0).length === 1 ? ' · C: Zoom' : ''), x0 + 12, H - 12);
  if (Music.song && Options.data.music) { ctx.textAlign = 'right'; ctx.fillText('♪ ' + Music.song.name, x0 + PANEL - 12, H - 12); ctx.textAlign = 'left'; }
}
function drawPlayerCard(ctx, c, race, x, y, w, h) {
  ctx.fillStyle = '#18202c'; rr(ctx, x, y, w, h, 8); ctx.fill();
  ctx.fillStyle = c.color; ctx.fillRect(x, y + 8, 3, h - 16);
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#fff'; ctx.font = '700 14px "Chakra Petch",sans-serif';
  ctx.fillText('P' + (c.human + 1) + '  ' + c.name.slice(0, 12), x + 12, y + 19);
  ctx.textAlign = 'right';
  if (race.mode === 'rally') {
    const C = Rally.cur, b = C ? Rally.best(C.stage.id)[0] : null, tot = Rally.total();
    ctx.textAlign = 'left'; ctx.font = '500 11px "Chakra Petch",sans-serif'; ctx.fillStyle = '#8a97ad';
    ctx.fillText(race.trackName + ' · Abschnitt ' + ((race.secInfo || { k: 0 }).k + 1), x + 12, y + 33);
    const sp = C ? C.splits.length : 0, bs = b && b.splits ? b.splits.slice(0, sp).reduce((a, q) => a + q, 0) : null;
    const cols = [['Gesamt', tot], ['Abschnitt', race.state === 'countdown' ? 0 : race.t], ['Bestzeit', b ? b.time : null]];
    cols.forEach((col, i) => {
      const cx = x + 12 + i * ((w - 18) / 3);
      ctx.fillStyle = '#6f7d94'; ctx.font = '500 10px "Chakra Petch",sans-serif'; ctx.fillText(col[0], cx, y + 48);
      ctx.fillStyle = i === 2 ? '#47d48a' : '#e9eef6'; ctx.font = '600 12px "Chakra Petch",sans-serif';
      ctx.fillText(col[1] == null ? '–' : fmtTime(col[1]), cx, y + 61);
    });
    if (bs != null && sp > 0) { const dd = C.splits.reduce((a, q) => a + q, 0) - bs; ctx.fillStyle = dd <= 0 ? '#47d48a' : '#ff8a3d'; ctx.font = '700 11px "Chakra Petch",sans-serif'; ctx.fillText('Zwischenzeit ' + (dd <= 0 ? '−' : '+') + Math.abs(dd).toFixed(2) + ' s zur Bestzeit', x + 12, y + 80); }
    const dmg = c.damage / 100;
    ctx.fillStyle = '#6f7d94'; ctx.font = '500 10px "Chakra Petch",sans-serif'; ctx.fillText('Schaden', x + 12, y + 100);
    ctx.fillStyle = '#0d1219'; ctx.fillRect(x + 62, y + 92, w - 108, 8);
    ctx.fillStyle = dmg > 0.6 ? '#ff4d5e' : '#ff8a3d'; ctx.fillRect(x + 62, y + 92, (w - 108) * clamp(dmg, 0, 1), 8);
    ctx.fillStyle = '#c4ccd9'; ctx.textAlign = 'right'; ctx.fillText(Math.round(c.damage) + '%', x + w - 10, y + 100); ctx.textAlign = 'left';
    return;
  }
  if (race.mode !== 'trial') { ctx.font = '400 22px "Russo One",sans-serif'; ctx.fillStyle = c.place === 1 ? '#ffd23e' : '#fff'; ctx.fillText(c.place + '.', x + w - 10, y + 23); }
  if (race.powerups) {
    const it = c.item && ITEMS[c.item], bx = x + w - 66, by = y + 6;
    ctx.fillStyle = it ? it.col : '#0d1219'; rr(ctx, bx, by, 22, 22, 5); ctx.fill();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '700 13px "Chakra Petch",sans-serif'; ctx.fillStyle = it ? '#0d1219' : '#3a4558';
    ctx.fillText(it ? it.ico : '·', bx + 11, by + 12);
    if (c.boostT > 0) { ctx.fillStyle = '#38c4ff'; ctx.fillRect(bx - 26, by + 9, 20 * clamp(c.boostT / BOOST_T.nitro, 0, 1), 4); }
    ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic';
  }
  ctx.textAlign = 'left'; ctx.font = '500 11px "Chakra Petch",sans-serif'; ctx.fillStyle = '#8a97ad';
  if (race.mode === 'derby') {
    ctx.fillText(c.wreck ? 'Wrack – ausgeschieden' : c.finished ? 'Letztes fahrbereites Auto!' : 'Rammen mit der Front schont dein Auto', x + 12, y + 33);
    ctx.fillStyle = '#6f7d94'; ctx.font = '500 10px "Chakra Petch",sans-serif'; ctx.fillText('Treffer', x + 12, y + 50);
    ctx.fillStyle = '#e9eef6'; ctx.font = '600 14px "Chakra Petch",sans-serif'; ctx.fillText(String(c.hits || 0), x + 60, y + 51);
    const dmg = c.damage / 100;
    ctx.fillStyle = '#6f7d94'; ctx.font = '500 10px "Chakra Petch",sans-serif'; ctx.fillText('Schaden', x + 12, y + 72);
    ctx.fillStyle = '#0d1219'; ctx.fillRect(x + 62, y + 64, w - 108, 10);
    ctx.fillStyle = dmg > 0.75 ? '#ff4d5e' : dmg > 0.45 ? '#ff8a3d' : '#47d48a'; ctx.fillRect(x + 62, y + 64, (w - 108) * clamp(dmg, 0, 1), 10);
    ctx.fillStyle = '#c4ccd9'; ctx.textAlign = 'right'; ctx.fillText(Math.round(c.damage) + '%', x + w - 10, y + 72); ctx.textAlign = 'left';
    return;
  }
  const lapNow = c.finished ? race.laps : clamp(c.lap, 1, race.laps);
  ctx.fillText(c.out ? 'Ausgeschieden in Runde ' + (c.lapTimes.length + 1) : 'Runde ' + lapNow + '/' + race.laps + (c.finished ? ' · im Ziel' : ''), x + 12, y + 33);
  // Zeiten
  const cur = c.finished ? null : (c.lap >= 1 && race.state !== 'countdown' ? race.t - c.lapStart : 0);
  const last = c.lapTimes.length ? c.lapTimes[c.lapTimes.length - 1] : null;
  const cols = [['Zeit', cur], ['Letzte', last], ['Beste', c.best]];
  cols.forEach((col, i) => {
    const cx = x + 12 + i * ((w - 18) / 3);
    ctx.fillStyle = '#6f7d94'; ctx.font = '500 10px "Chakra Petch",sans-serif'; ctx.fillText(col[0], cx, y + 48);
    ctx.fillStyle = i === 2 ? '#47d48a' : '#e9eef6'; ctx.font = '600 12px "Chakra Petch",sans-serif';
    ctx.fillText(col[1] == null ? '–' : fmtTime(col[1]), cx, y + 61);
  });
  // Balken
  const r = race.rules;
  const bars = [];
  if (r.fuelOn) bars.push(['Sprit', c.fuel / 100, c.fuel < 20 ? '#ff4d5e' : '#ffc83d']);
  if (r.tireOn) bars.push(['Reifen', c.tires / 100, c.tires < 25 ? '#ff4d5e' : '#38c4ff']);
  if (r.dmgOn) bars.push(['Schaden', c.damage / 100, c.damage > 60 ? '#ff4d5e' : '#ff8a3d']);
  let by = y + 70;
  const bh = bars.length === 3 && h < 115 ? 11 : 13;
  for (const b of bars) {
    ctx.fillStyle = '#6f7d94'; ctx.font = '500 10px "Chakra Petch",sans-serif'; ctx.fillText(b[0], x + 12, by + 8);
    ctx.fillStyle = '#0d1219'; ctx.fillRect(x + 62, by, w - 108, 8);
    ctx.fillStyle = b[2]; ctx.fillRect(x + 62, by, (w - 108) * clamp(b[1], 0, 1), 8);
    ctx.fillStyle = '#c4ccd9'; ctx.textAlign = 'right'; ctx.fillText(Math.round(b[1] * 100) + '%', x + w - 10, by + 8); ctx.textAlign = 'left';
    by += bh;
  }
  if (!bars.length) { ctx.fillStyle = '#6f7d94'; ctx.font = '500 10px "Chakra Petch",sans-serif'; ctx.fillText('Sprit, Reifen und Schaden aus', x + 12, by + 8); }
  if (c.wrong && !c.finished) { ctx.fillStyle = '#ff4d5e'; ctx.font = '700 10px "Chakra Petch",sans-serif'; ctx.fillText('FALSCHE RICHTUNG', x + 12, y + h - 4); }
  else if (c.service.cur) { ctx.fillStyle = '#ffcd32'; ctx.font = '700 10px "Chakra Petch",sans-serif'; ctx.fillText('BOX: ' + SERVICE_NAME[c.service.cur] + ' …', x + 12, y + h - 4); }
}

/** Abstand zum Vorder- und Hintermann (Sekunden, geschätzt aus Streckenabstand und Tempo). */
function drawGaps(ctx, me, race, x, y) {
  const order = race.cars.filter(c => !c.out).sort((a, b) => a.place - b.place), i = order.indexOf(me);
  const v = Math.max(140, carSpeed(me), me.cls.maxSpeed * 0.7), L = race.rt.L;
  const rows = [];
  if (race.mode === 'derby') return y;
  if (i > 0) rows.push(['▲', order[i - 1], (order[i - 1].key - me.key) * L / v]);
  if (i >= 0 && i < order.length - 1) rows.push(['▼', order[i + 1], (me.key - order[i + 1].key) * L / v]);
  ctx.font = '600 12px "Chakra Petch",sans-serif'; ctx.textBaseline = 'alphabetic';
  for (const [arr, c, g] of rows) {
    if (c.finished && arr === '▼') continue;
    ctx.textAlign = 'left'; ctx.fillStyle = arr === '▲' ? '#ff8a3d' : '#47d48a'; ctx.fillText(arr, x, y + 12);
    ctx.fillStyle = c.color; ctx.fillRect(x + 16, y + 3, 8, 8);
    ctx.fillStyle = '#c4ccd9'; ctx.fillText(c.name.slice(0, 12), x + 30, y + 12);
    ctx.textAlign = 'right'; ctx.fillStyle = '#e9eef6';
    ctx.fillText(c.finished ? 'im Ziel' : g > 60 ? '+' + Math.floor(g / (L / v)) + ' Rd' : (arr === '▲' ? '+' : '−') + g.toFixed(1) + ' s', x + PANEL - 24, y + 12);
    y += 17;
  }
  ctx.textAlign = 'left';
  return y;
}
/** Minikarte (nur mit Zoom-Kamera): Strecke, Boxengasse, alle Autos, sichtbarer Ausschnitt. */
function drawMinimap(ctx, race, x, y, w, h) {
  const rt = race.rt, k = Math.min(w / W, h / H), ox = x + (w - W * k) / 2, oy = y + (h - H * k) / 2;
  ctx.fillStyle = '#18202c'; rr(ctx, x, y, w, h, 8); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.rect(ox, oy, W * k, H * k); ctx.clip(); ctx.translate(ox, oy); ctx.scale(k, k);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  if (rt.pit) { ctx.strokeStyle = 'rgba(255,205,50,.5)'; ctx.lineWidth = 10; ctx.beginPath(); rt.pit.path.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.stroke(); }
  ctx.strokeStyle = '#5d6a80'; ctx.lineWidth = 26; ctx.beginPath();
  for (let i = 0; i <= rt.n; i++) { const j = i % rt.n; i ? ctx.lineTo(rt.lx[j], rt.ly[j]) : ctx.moveTo(rt.lx[j], rt.ly[j]); }
  ctx.stroke();
  const c0 = rt.cps[0]; ctx.strokeStyle = '#fff'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(c0.x1, c0.y1); ctx.lineTo(c0.x2, c0.y2); ctx.stroke();
  for (const c of race.cars.slice().sort((a, b) => a.human - b.human)) {
    if (c.sink > 0) continue;
    ctx.globalAlpha = c.out ? 0.35 : 1;
    ctx.fillStyle = c.color; ctx.beginPath(); ctx.arc(c.x, c.y, c.human >= 0 ? 26 : 18, 0, 7); ctx.fill();
    if (c.human >= 0) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 8; ctx.stroke(); }
  }
  ctx.globalAlpha = 1; ctx.restore();
}
/** Pfeile am Bildrand zu Gegnern außerhalb des Zoom-Ausschnitts (die drei nächsten auf der Strecke). */
function drawEdgeArrows(ctx, race, map, vw, vh) {
  const me = race.cars.find(c => c.human >= 0); if (!me) return;
  const L = race.rt.L;
  const near = race.cars.filter(c => c !== me && !c.out && !c.finished).map(c => [c, Math.abs(c.key - me.key) * L]).sort((a, b) => a[1] - b[1]).slice(0, 3);
  for (const [c, d] of near) {
    const [sx, sy] = map(...P(c.x, c.y, c.z));
    if (sx > 8 && sx < vw - 8 && sy > 8 && sy < vh - 8) continue;
    const cx = vw / 2, cy = vh / 2, dx = sx - cx, dy = sy - cy, t = Math.min((vw / 2 - 18) / Math.abs(dx || 1e-6), (vh / 2 - 18) / Math.abs(dy || 1e-6));
    const ax = cx + dx * t, ay = cy + dy * t, a = Math.atan2(dy, dx);
    ctx.save(); ctx.translate(ax, ay); ctx.rotate(a);
    ctx.fillStyle = c.color; ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(-6, -7); ctx.lineTo(-3, 0); ctx.lineTo(-6, 7); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.font = '600 9px "Chakra Petch",sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(Math.round(d / 10) + ' m', ax - Math.cos(a) * 16, ay - Math.sin(a) * 16 + 3);
  }
}
