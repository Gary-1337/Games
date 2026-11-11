/* =====================================================================
   9  FAHRZEUGE & PHYSIK
   ===================================================================== */
// loose: Grip-Faktor auf losem Untergrund, looseDrag: Rollwiderstand dort, cr/co: Kollisionskreis Radius/Versatz
const CLASSES = [
  { id: 'blitz', name: 'Blitz', desc: 'Schnell und nervös – für Profis', accel: 365, maxSpeed: 345, brake: 520, grip: 0.95, steer: 3.3, mass: 0.9, handling: 0.6, shape: 'wedge', loose: 0.95, looseDrag: 1.1, dmgMul: 1, cr: 6.3, co: 6.8 },
  { id: 'allround', name: 'Allround', desc: 'Ausgewogen und berechenbar', accel: 305, maxSpeed: 302, brake: 500, grip: 1.08, steer: 3.15, mass: 1.0, handling: 0.82, shape: 'coupe', loose: 1, looseDrag: 1, dmgMul: 1, cr: 6.5, co: 6.5 },
  { id: 'brummer', name: 'Brummer', desc: 'Gutmütig, schwer, einsteigerfreundlich', accel: 262, maxSpeed: 258, brake: 480, grip: 1.24, steer: 3.05, mass: 1.3, handling: 1.0, shape: 'pickup', loose: 1.12, looseDrag: 0.8, dmgMul: 0.8, cr: 7, co: 6 },
  { id: 'rally', name: 'Rallye', desc: 'Stark auf Schotter, Sand und Schnee', accel: 300, maxSpeed: 292, brake: 495, grip: 1.0, steer: 3.25, mass: 1.0, handling: 0.9, shape: 'rally', loose: 1.42, looseDrag: 0.55, dmgMul: 0.9, cr: 6.3, co: 6 },
  { id: 'formula', name: 'Formel', desc: 'Extrem schnell auf Asphalt, abseits hilflos', accel: 395, maxSpeed: 372, brake: 610, grip: 1.3, steer: 3.3, mass: 0.75, handling: 0.75, shape: 'formula', loose: 0.62, looseDrag: 1.6, dmgMul: 1.4, cr: 5.6, co: 8 },
  { id: 'kart', name: 'Kart', desc: 'Klein und wendig, ideal für enge Kurse', accel: 330, maxSpeed: 238, brake: 530, grip: 1.36, steer: 3.9, mass: 0.55, handling: 1.0, shape: 'kart', loose: 0.9, looseDrag: 1.2, dmgMul: 1.1, cr: 5, co: 4 },
  { id: 'truck', name: 'Truck', desc: 'Schwer und langsam, schiebt alles weg – König im Derby', accel: 215, maxSpeed: 236, brake: 400, grip: 1.12, steer: 2.6, mass: 2.2, handling: 0.8, shape: 'truck', loose: 1.05, looseDrag: 0.85, dmgMul: 0.5, cr: 8, co: 8.5 },
  { id: 'muscle', name: 'Muscle-Car', desc: 'Viel Kraft, wenig Grip – driftet gern', accel: 385, maxSpeed: 328, brake: 465, grip: 0.9, steer: 3.1, mass: 1.25, handling: 0.62, shape: 'muscle', loose: 0.92, looseDrag: 1.05, dmgMul: 0.85, cr: 6.8, co: 7 },
  { id: 'ev', name: 'Elektro', desc: 'Brutale Beschleunigung, leise, wenig Höchsttempo', accel: 470, maxSpeed: 284, brake: 540, grip: 1.15, steer: 3.3, mass: 1.05, handling: 0.85, shape: 'ev', loose: 0.95, looseDrag: 1.05, dmgMul: 1.1, cr: 6.3, co: 6.3 },
  { id: 'buggy', name: 'Buggy', desc: 'Überall gleich gut, auf Asphalt eher langsam', accel: 300, maxSpeed: 268, brake: 480, grip: 1.0, steer: 3.4, mass: 0.85, handling: 0.95, shape: 'buggy', loose: 1.5, looseDrag: 0.45, dmgMul: 0.9, cr: 6, co: 5.5 }
];
const COLORS = ['#ff4d4d', '#3ea6ff', '#ffd23e', '#46d68a', '#c46bff', '#ff8a3d', '#ff6fb5', '#36e0d0', '#f2f2f2', '#9aa4b6', '#a3e635', '#5b6cff'];
const AI_NAMES = ['Kolbe', 'Brandt', 'Vega', 'Sato', 'Okafor', 'Lindqvist', 'Moreau', 'Rossi', 'Nowak', 'Haas', 'Petrov', 'Silva', 'Jansen', 'Ortega'];
const GRAV = 560;            // Schwerkraft (px/s²) für Sprünge
const SLOPE_G = 380;         // Hangabtrieb (px/s² je Steigungseinheit)
const CLIFF = 7;             // höhere Stufen wirken wie eine Wand

/** Wetter: Grip-Faktoren. sky: 'clear' | 'cloudy' | 'rain'; snow = Schneefall statt Regen */
function weatherGrip(s, wx) {
  if (!wx || wx.sky !== 'rain') return 1;
  if (wx.snow) return s === S.ICE ? 0.9 : 0.88;
  if (s === S.ASPHALT || s === S.CURB || s === S.PIT || s === S.CONCRETE) return 0.8;
  if (s === S.DIRT || s === S.GRASS) return 0.82;
  return 0.92;
}
/** Effektiver Grip-Faktor von Untergrund, Klasse und Wetter (ohne Reifen/Pfützen). */
function gripFactor(cls, s, wx) { return SURF[s].grip * (LOOSE.has(s) ? cls.loose : 1) * weatherGrip(s, wx); }
/** Tempofaktor des Untergrunds für eine Klasse. */
function speedFactor(cls, s) {
  const sp = SURF[s].speed;
  if (!LOOSE.has(s)) return sp;
  return clamp(sp + (cls.loose - 1) * 0.25, 0.4, 1);
}

function makeCar(o) {
  return {
    id: o.id, name: o.name, color: o.color, cls: o.cls, human: o.human, ai: null, seed: Math.random() * 100,
    x: 0, y: 0, a: 0, vx: 0, vy: 0, av: 0, prevX: 0, prevY: 0, steerVis: 0, thr: 0, brk: 0,
    z: 0, vz: 0, air: false, level: 0, bridge: null, pitch: 0, roll: 0,
    damage: 0, fuel: 100, tires: 100,
    lap: 0, nextCp: 0, lapStart: 0, lapTimes: [], best: null, finished: false, finishT: 0, place: 0,
    s: 0, idx: 0, key: -1, lastValidS: 0, gapText: '', lastPass: null,
    freeze: 0, sink: 0, resetMsg: 0, service: { q: [], cur: null, t: 0, dur: 0 }, inBox: false,
    sliding: false, slip: 0, surf: S.ASPHALT, wrongT: 0, wrong: false, stuckT: 0, offT: 0,
    skidPrev: null, ghostFrames: [], ghostAcc: 0, msg: '', msgT: 0, alpha: 1
  };
}
const carSpeed = c => Math.hypot(c.vx, c.vy);
const onPitSurf = s => s === S.PIT;
const fwdSpeed = c => c.vx * Math.cos(c.a) + c.vy * Math.sin(c.a);

/** Ebene aktualisieren: Auf eine Brücke kommt man nur über ein Ende und auf Deckhöhe. */
function updateLevel(car, rt) {
  const b = bridgeIn(rt.bridges, car.x, car.y, 0);
  if (!b) { car.level = 0; car.bridge = null; return; }
  if (car.level === 1 && car.bridge === b) return;
  const [plx, ply] = localOf(b, car.prevX, car.prevY);
  if (Math.abs(plx) >= b.w / 2 - 3 && Math.abs(ply) <= b.h / 2 + 2 && car.z >= b.z - 12) { car.level = 1; car.bridge = b; }
  else { car.level = 0; car.bridge = null; }
}
/** Neigung (Steigung längs / quer) unter dem Auto für die Darstellung. */
function updateTilt(car, rt, dt) {
  let p = 0, r = 0;
  if (car.air) p = clamp(car.vz / Math.max(120, carSpeed(car)), -0.5, 0.5) * 0.8;
  else if (car.level === 0) {
    const fx = Math.cos(car.a), fy = Math.sin(car.a);
    p = (groundZ(rt, car.x + fx * 7, car.y + fy * 7, 0) - groundZ(rt, car.x - fx * 7, car.y - fy * 7, 0)) / 14;
    r = (groundZ(rt, car.x - fy * 5, car.y + fx * 5, 0) - groundZ(rt, car.x + fy * 5, car.y - fx * 5, 0)) / 10;
  }
  const k = Math.min(1, dt * 14);
  car.pitch += (clamp(p, -0.6, 0.6) - car.pitch) * k; car.roll += (clamp(r, -0.4, 0.4) - car.roll) * k;
}

/** Ein Physikschritt für ein Auto. inp = {thr, brk, steer} */
function stepCarPhysics(car, inp, dt, race) {
  const cls = car.cls, rules = race.rules, rt = race.rt, wx = race.weather;
  if (car.sink > 0) {
    car.sink -= dt; car.vx *= 0.9; car.vy *= 0.9; car.av *= 0.9;
    car.x += car.vx * dt; car.y += car.vy * dt;
    if (car.sink <= 0) resetCar(car, race);
    return;
  }
  if (car.freeze > 0) { car.freeze -= dt; car.vx = car.vy = car.av = car.vz = 0; car.prevX = car.x; car.prevY = car.y; return; }
  const g0 = groundZ(rt, car.x, car.y, car.level, car.bridge);
  car.air = car.z > g0 + 1.5;
  const surf = surfAtLevel(rt, car.x, car.y, car.level), sf = SURF[surf];
  car.surf = surf;
  if (sf.oob && !car.air) {
    car.sink = 0.8; if (rules.dmgOn) car.damage = Math.min(100, car.damage + 4 * rules.dmgPct / 100);
    if (sf.lava) { if (race.audible) Sound.sizzle(); Particles.fire(car.x, car.y, car.z); }
    else { if (race.audible) Sound.splash(); Particles.splash(car.x, car.y); }
    return;
  }
  const d = rules.dmgOn ? car.damage / 100 : 0;
  const tireF = rules.tireOn ? 0.62 + 0.38 * Math.pow(car.tires / 100, 0.7) : 1;
  let gripMul = gripFactor(cls, surf, wx) * tireF;
  // Pfützen bei Regen
  let puddle = false;
  if (rt.puddles && car.level === 0) for (const p of rt.puddles) if ((car.x - p.x) ** 2 + (car.y - p.y) ** 2 < p.r * p.r) { puddle = true; break; }
  if (puddle) gripMul *= 0.6;
  if (car.oilT > 0) gripMul *= 0.28;
  car.puddle = puddle;
  const fuelF = (rules.fuelOn && car.fuel <= 0) ? 0.22 : 1;
  let maxV = cls.maxSpeed * speedFactor(cls, surf) * (1 - 0.35 * d) * (1 + 0.07 * (car.draft || 0));
  const onPit = surf === S.PIT;
  const boost = car.boostT > 0 && !onPitSurf(surf) ? 1 : 0;
  if (boost) maxV *= 1.28;
  if (onPit) maxV = Math.min(maxV, PIT_LIMIT);
  const thr = inp.thr, brk = inp.brk, steer = inp.steer;
  car.thr = thr; car.brk = brk;
  car.steerVis += (steer - car.steerVis) * Math.min(1, dt * 12);

  let fx = Math.cos(car.a), fy = Math.sin(car.a);
  let vF = car.vx * fx + car.vy * fy;
  if (car.air) {
    // In der Luft: keine Lenkung, kein Antrieb, nur leichte Drehung bleibt
    car.av *= Math.pow(0.3, dt);
    car.a += car.av * dt;
    car.slip = 0; car.sliding = false;
  } else {
    // --- Lenkung (Drehrate abhängig von Tempo, Grip und Schaden) ---
    const sp = Math.abs(vF);
    const auth = Math.min(1, sp / 70) * (1 - 0.38 * Math.min(1, sp / cls.maxSpeed)) * (0.55 + 0.45 * Math.min(1, gripMul));
    let target = steer * cls.steer * auth * (vF >= -2 ? 1 : -1);
    if (d > 0.5) target += Math.sin(race.time * 11 + car.seed) * (d - 0.5) * 1.4 * Math.min(1, sp / 80);   // Wackeln bei starkem Schaden
    if (car.sliding) target *= 1.12;
    car.av += (target - car.av) * Math.min(1, dt * (5 + 7 * cls.handling * (1 - 0.4 * d)));
    car.a += car.av * dt;

    fx = Math.cos(car.a); fy = Math.sin(car.a);
    const rx = -fy, ry = fx;
    vF = car.vx * fx + car.vy * fy;
    let vR = car.vx * rx + car.vy * ry;

    // --- Längsrichtung: Antrieb, Bremse, Widerstand ---
    let acc = 0;
    const traction = Math.min(1, 0.45 + gripMul * 0.7);
    const drag = sf.drag * (LOOSE.has(surf) ? cls.looseDrag : 1) + (puddle ? 0.6 : 0);
    if (thr > 0) {
      if (vF < -5) acc += cls.brake * thr;
      else { const ratio = Math.max(0, vF) / maxV; acc += cls.accel * (1 - 0.35 * d) * fuelF * thr * Math.max(0, 1 - ratio * ratio) * traction * (1 + 0.25 * (car.draft || 0)); }
      if (boost && vF > -5) acc += cls.accel * 0.9 * traction;
    }
    if (brk > 0) {
      if (vF > 15) acc -= cls.brake * brk * Math.min(1, 0.35 + gripMul * 0.8);
      else if (vF > -95) acc -= cls.accel * 0.55 * brk * fuelF * traction;
    }
    acc -= vF * drag + vF * Math.abs(vF) * 0.0003;
    if (thr === 0 && brk === 0) acc -= Math.sign(vF) * Math.min(Math.abs(vF) / dt, 45);
    vF += acc * dt;
    if (vF > maxV) vF -= (vF - maxV) * Math.min(1, dt * (onPit ? 7 : 2.5));
    if (vF < -110) vF = -110;

    // --- Querrichtung: Haftung begrenzt, Rest = Drift ---
    let lg = LAT * cls.grip * gripMul;
    if (car.sliding) lg *= 0.72 + 0.2 * cls.handling;
    const corr = lg * dt, slip = Math.abs(vR);
    if (slip > corr) vR -= Math.sign(vR) * corr; else vR = 0;
    if (!car.sliding && slip > 55) car.sliding = true; else if (car.sliding && slip < 18) car.sliding = false;
    car.slip = slip;
    vF -= Math.sign(vF) * Math.min(Math.abs(vF), slip * 0.25 * dt);
    car.vx = fx * vF + rx * vR; car.vy = fy * vF + ry * vR;

    // --- Hangabtrieb ---
    if (car.level === 0) {
      const gx = (terrainH(rt, car.x + 4, car.y) - terrainH(rt, car.x - 4, car.y)) / 8;
      const gy = (terrainH(rt, car.x, car.y + 4) - terrainH(rt, car.x, car.y - 4)) / 8;
      car.vx -= SLOPE_G * gx * dt; car.vy -= SLOPE_G * gy * dt;
    }
  }
  car.prevX = car.x; car.prevY = car.y;
  car.x += car.vx * dt; car.y += car.vy * dt;
  updateLevel(car, rt);

  // --- Höhe: Boden folgen, abheben, landen, Klippen ---
  const g1 = groundZ(rt, car.x, car.y, car.level, car.bridge);
  if (!car.air && g1 - car.z > CLIFF && car.level === 0) {
    // Stufe zu hoch → wie eine Wand
    car.x = car.prevX; car.y = car.prevY; updateLevel(car, rt);
    const gx = terrainH(rt, car.x + 6, car.y) - terrainH(rt, car.x - 6, car.y), gy = terrainH(rt, car.x, car.y + 6) - terrainH(rt, car.x, car.y - 6);
    const l = Math.hypot(gx, gy) || 1, nx = -gx / l, ny = -gy / l, vn = car.vx * nx + car.vy * ny;
    if (vn < 0) { car.vx -= 1.25 * vn * nx; car.vy -= 1.25 * vn * ny; onImpact(car, -vn, car.x, car.y, race, 0.9); }
  } else {
    const zb = car.z + car.vz * dt - GRAV * dt * dt / 2;
    if (zb > g1 + 1.5) {
      // fliegt
      if (!car.air && race.audible && car.human >= 0) car.airStart = race.time;
      car.z = zb; car.vz -= GRAV * dt; car.air = true;
    } else {
      if (car.air) {
        // Landung
        const imp = -car.vz;
        if (imp > 150) { onImpact(car, imp * 0.55, car.x, car.y, race, 0.6); Particles.landing(car.x, car.y, g1, Math.min(1, imp / 400), car.surf); }
        car.vx *= 0.97; car.vy *= 0.97;
      }
      car.vz = clamp((g1 - car.z) / dt, -400, 400) * (car.air ? 0 : 1);
      car.z = g1; car.air = false;
    }
  }
  updateTilt(car, rt, dt);

  // --- Verbrauch ---
  if (race.state === 'running' && !car.finished) {
    const thrNow = car.air ? 0 : thr;
    if (rules.fuelOn && !race.fuelPlan) car.fuel = Math.max(0, car.fuel - Math.abs(vF) * dt * 0.0042 * (0.3 + 0.7 * thrNow) * rules.fuelPct / 100);
    if (rules.tireOn && !car.air) {
      const rough = (surf === S.GRAVEL || surf === S.SAND || surf === S.DIRT) ? 1.4 : 1;
      car.tires = Math.max(0, car.tires - (Math.abs(vF) * dt * 0.0028 + Math.min(car.slip, 250) * dt * 0.012) * rough * rules.tirePct / 100);
    }
  }
}

/** Aufprall-Folgen: Schaden, Funken, Sound. */
function onImpact(car, imp, x, y, race, factor = 1) {
  if (imp < 30) return;
  if (car.shieldT > 0) factor *= 0.15;
  const rules = race.rules;
  if (rules.dmgOn && imp > 45 && !car.finished) car.damage = Math.min(100, car.damage + (imp - 45) * 0.085 * factor * car.cls.dmgMul * rules.dmgPct / 100);
  if (car.human >= 0 && imp > 260 && race.audible) Speaker.say(['Autsch!', 'Das hat gekracht!', 'Das gibt Beulen!'][Math.floor(Math.random() * 3)], 'crash', 9);
  if (car.human >= 0 && race.cam && imp > 110) race.cam.shake = Math.min(1, race.cam.shake + (imp - 100) / 380);
  if (imp > 60) {
    Particles.sparks(x, y, Math.min(22, imp / 12), car.z);
    if (imp > 160) Particles.flash(x, y, car.z);
    if (race.audible) Sound.crash(clamp((imp - 50) / 260, 0.05, 1));
  }
}
/** Kollision mit Objekten und Weltrand. */
function collideObjects(car, race) {
  const rt = race.rt, R = car.cls.cr, O = car.cls.co;
  const fx = Math.cos(car.a), fy = Math.sin(car.a);
  const hover = car.z - terrainH(rt, car.x, car.y);
  for (const off of [O, -O]) {
    const cx = car.x + fx * off, cy = car.y + fy * off;
    const bx = clamp(Math.floor(cx / 64) + 1, 0, rt.bw - 1), by = clamp(Math.floor(cy / 64) + 1, 0, rt.bh - 1);
    for (const s of rt.buckets[by * rt.bw + bx]) {
      if (!s.border && (s.lvl || 0) !== car.level) continue;
      if (s.gate && gateOpenness(s.o, race.time) > 0.5) continue;
      if (!s.border && car.level === 0 && hover > 14) continue;      // im Sprung über niedrige Hindernisse
      let nx, ny, pen;
      const dx = cx - s.x, dy = cy - s.y;
      if (s.k === 'c') {
        const d = Math.hypot(dx, dy); pen = s.r + R - d;
        if (pen <= 0 || d < 1e-6) continue;
        nx = dx / d; ny = dy / d;
      } else {
        const lx = dx * s.ca + dy * s.sa, ly = -dx * s.sa + dy * s.ca;
        const qx = clamp(lx, -s.hw, s.hw), qy = clamp(ly, -s.hh, s.hh);
        const ex = lx - qx, ey = ly - qy, d = Math.hypot(ex, ey);
        let lnx, lny;
        if (d > 1e-6) { if (d >= R) continue; pen = R - d; lnx = ex / d; lny = ey / d; }
        else {
          const px = s.hw - Math.abs(lx), py = s.hh - Math.abs(ly);
          if (px < py) { lnx = Math.sign(lx) || 1; lny = 0; pen = px + R; } else { lnx = 0; lny = Math.sign(ly) || 1; pen = py + R; }
        }
        nx = lnx * s.ca - lny * s.sa; ny = lnx * s.sa + lny * s.ca;
      }
      car.x += nx * pen; car.y += ny * pen;
      const vn = car.vx * nx + car.vy * ny;
      if (vn < 0) {
        car.vx -= (1 + s.e) * vn * nx; car.vy -= (1 + s.e) * vn * ny;
        const tx = -ny, ty = nx, vt = car.vx * tx + car.vy * ty;
        car.vx -= tx * vt * 0.12; car.vy -= ty * vt * 0.12;
        if (Math.abs(vt) > 70 && s.dmg >= 0.5 && Math.random() < 0.5) Particles.sparks(cx - nx * R, cy - ny * R, 2 + Math.abs(vt) / 90, car.z);
        car.av += (fx * off * ny - fy * off * nx) * (-vn) * 0.0035;
        onImpact(car, -vn, cx - nx * R, cy - ny * R, race, s.dmg);
      }
    }
  }
}
/** Windschatten: Wer dicht hinter einem schnellen Auto fährt, hat weniger Luftwiderstand (car.draft 0…1). */
function updateDraft(cars) {
  for (const c of cars) {
    let best = 0;
    const sp = carSpeed(c);
    if (sp > 140 && !c.air && !c.finished) {
      const fx = Math.cos(c.a), fy = Math.sin(c.a);
      for (const o of cars) {
        if (o === c || o.level !== c.level || o.sink > 0 || (o.finished && !o.wreck) || carSpeed(o) < 120) continue;
        const dx = o.x - c.x, dy = o.y - c.y, ahead = dx * fx + dy * fy, side = Math.abs(-dx * fy + dy * fx);
        if (ahead > 14 && ahead < 95 && side < 11 + ahead * 0.06) best = Math.max(best, (1 - (ahead - 14) / 81) * (1 - side / 18));
      }
    }
    c.draft = (c.draft || 0) + (best - (c.draft || 0)) * 0.08;
  }
}
/** Auto-Auto-Kollisionen (Impulsaustausch nach Masse). */
function collideCars(cars, race) {
  for (let i = 0; i < cars.length; i++) {
    const A = cars[i]; if ((A.finished && !A.wreck) || A.sink > 0 || A.ghostCar) continue;
    for (let j = i + 1; j < cars.length; j++) {
      const B = cars[j]; if ((B.finished && !B.wreck) || B.sink > 0 || B.ghostCar) continue;
      if (Math.abs(A.x - B.x) > 34 || Math.abs(A.y - B.y) > 34) continue;
      if (A.level !== B.level || Math.abs(A.z - B.z) > 9) continue;
      const afx = Math.cos(A.a), afy = Math.sin(A.a), bfx = Math.cos(B.a), bfy = Math.sin(B.a);
      const RR = A.cls.cr + B.cls.cr;
      for (const oa of [A.cls.co, -A.cls.co]) for (const ob of [B.cls.co, -B.cls.co]) {
        const ax = A.x + afx * oa, ay = A.y + afy * oa, bx = B.x + bfx * ob, by = B.y + bfy * ob;
        const dx = ax - bx, dy = ay - by, d = Math.hypot(dx, dy), pen = RR - d;
        if (pen <= 0 || d < 1e-6) continue;
        const nx = dx / d, ny = dy / d, ma = A.cls.mass, mb = B.cls.mass;
        const fa = A.freeze > 0 ? 0 : 1, fb = B.freeze > 0 ? 0 : 1;          // stehende Boxenautos werden nicht verschoben
        const wa = fa ? (fb ? mb / (ma + mb) : 1) : 0, wb = fb ? (fa ? ma / (ma + mb) : 1) : 0;
        A.x += nx * pen * wa; A.y += ny * pen * wa; B.x -= nx * pen * wb; B.y -= ny * pen * wb;
        const vn = (A.vx - B.vx) * nx + (A.vy - B.vy) * ny;
        if (vn < 0) {
          const jm = -(1 + 0.35) * vn / ((fa ? 1 / ma : 0) + (fb ? 1 / mb : 0) || 1);
          if (fa) { A.vx += jm / ma * nx; A.vy += jm / ma * ny; A.av += (afx * oa * ny - afy * oa * nx) * (-vn) * 0.003; }
          if (fb) { B.vx -= jm / mb * nx; B.vy -= jm / mb * ny; B.av -= (bfx * ob * ny - bfy * ob * nx) * (-vn) * 0.003; }
          onImpact(A, -vn * 0.85 * mb, (ax + bx) / 2, (ay + by) / 2, race, 0.7);
          onImpact(B, -vn * 0.85 * ma, (ax + bx) / 2, (ay + by) / 2, race, 0.7);
          if (race.onCarHit) race.onCarHit(A, B, -vn);
        }
      }
    }
  }
}
/** Auto an Position p der Referenzlinie (Index i) setzen – Ebene und Höhe passend. */
function placeOnLine(car, rt, x, y, a, i) {
  car.x = car.prevX = x; car.y = car.prevY = y; car.a = a;
  car.level = rt.lvl[i] || 0;
  car.bridge = car.level ? bridgeIn(rt.bridges, x, y, 4) : null;
  if (!car.bridge) car.level = 0;
  car.z = groundZ(rt, x, y, car.level, car.bridge); car.vz = 0; car.air = false;
}
/** Zurücksetzen an die letzte gültige Streckenposition. */
/** Zurück an den zuletzt durchfahrenen Checkpoint (Leertaste / E / O / Num 9). */
function resetToCheckpoint(car, race) {
  const rt = race.rt, n = rt.cps.length;
  if (race.mode === 'derby' || car.lap === 0 || !n) { resetCar(car, race); return; }
  const k = car.nextCp > 0 ? car.nextCp - 1 : n - 1;
  resetCar(car, race, (k === 0 ? 0 : rt.cps[k].frac * rt.L) + 14);
  car.missedCp = false;
  flashMsg(car, 'Zurück zu Checkpoint ' + (k === 0 ? 'Start' : k), '#8fd8ff');
}
function resetCar(car, race, sAt) {
  const rt = race.rt;
  let s = sAt != null ? sAt % rt.L : car.lastValidS;
  if (sAt != null) car.lastValidS = s;
  // nie hinter einen noch nicht durchfahrenen Checkpoint springen
  if (sAt != null) { /* Ziel ist vorgegeben */ }
  else if (car.nextCp > 0) {
    const cap = rt.cps[car.nextCp].frac * rt.L - 30;
    if (cap > 0) {
      let ds = s - cap; if (ds > rt.L / 2) ds -= rt.L; if (ds < -rt.L / 2) ds += rt.L;
      if (ds > 0) s = cap;
    }
  } else if (car.lap > 0 && s < rt.L * 0.5) s = rt.L - 30;
  const p = lineAtS(rt, s);
  const nx = -Math.sin(p.a), ny = Math.cos(p.a);
  let px = p.x, py = p.y;
  for (const o of (rt.lvl[p.i] ? [0, 10, -10] : [0, 16, -16, 30, -30])) {
    const qx = p.x + nx * o, qy = p.y + ny * o;
    if (race.cars.every(c => c === car || dist(c.x, c.y, qx, qy) > 18) && (rt.lvl[p.i] || !SURF[cellAt(rt.src, qx, qy)].oob)) { px = qx; py = qy; break; }
  }
  placeOnLine(car, rt, px, py, p.a, p.i);
  car.vx = car.vy = car.av = 0; car.sliding = false; car.sink = 0;
  car.freeze = 0.7; car.resetMsg = 1.2; car.stuckT = 0; car.offT = 0;
  car.idx = p.i; car.skidPrev = null;
  if (car.ai) { car.ai.mode = 'race'; car.ai.off = 0; }
}

/* =====================================================================
   10  KI-GEGNER
   Gleiche Physik und Regeln wie Spieler: Die KI erzeugt nur Gas/Bremse/Lenkung.
   ===================================================================== */
const DIFFS = [
  { name: 'Sehr leicht', speed: 0.76, corner: 0.80, noise: 0.22, wander: 12, look: 0.9, mistake: 0.05, overtake: 0.3 },
  { name: 'Leicht', speed: 0.85, corner: 0.87, noise: 0.13, wander: 9, look: 1.0, mistake: 0.03, overtake: 0.5 },
  { name: 'Mittel', speed: 0.93, corner: 0.935, noise: 0.07, wander: 5, look: 1.0, mistake: 0.012, overtake: 0.8 },
  { name: 'Schwer', speed: 1.0, corner: 0.985, noise: 0.03, wander: 2.5, look: 1.05, mistake: 0.004, overtake: 1 }
];
/** Gesamtstärke der KI (1.6.1: ca. 20 % leichter – Tempo −12 %, mehr Fehler, weniger aggressiv). */
const AI_EASE = { pace: 0.88, mistakes: 1.3, overtake: 0.8 };
function makeAI(car, diff) {
  const B = DIFFS[diff] || DIFFS[1];
  const Dx = { ...B, speed: B.speed * AI_EASE.pace, corner: B.corner * AI_EASE.pace, mistake: B.mistake * AI_EASE.mistakes, overtake: B.overtake * AI_EASE.overtake };
  return { diff: Dx, mode: 'race', off: 0, offT: 0, pitIdx: 0, slot: -1, mistakeT: 0, mistakeK: 0, revT: 0, phase: Math.random() * 10, wantPit: false };
}
/** Liefert die Steuerbefehle eines KI-Autos. */
/** Derby-KI: Ziel wählen, mit der Front rammen, Rückseite schützen, bei Stillstand zurücksetzen. */
function derbyAI(car, race, dt) {
  const ai = car.ai, D = ai.diff, out = { thr: 0, brk: 0, steer: 0, edge: {} };
  if (car.out || race.state !== 'running') return out;
  const sp = fwdSpeed(car), A = race.arena;
  ai.tgtT = (ai.tgtT || 0) - dt;
  if (ai.tgtT <= 0 || !ai.tgt || ai.tgt.out) {
    // Ziel: nahe, vor uns, gern angeschlagen; Menschen etwas bevorzugt
    let best = null, bs = Infinity;
    for (const o of race.cars) {
      if (o === car || o.out) continue;
      const dx = o.x - car.x, dy = o.y - car.y, d = Math.hypot(dx, dy);
      const ang = Math.abs(wrapAngle(Math.atan2(dy, dx) - car.a));
      const sc = d * (1 + ang * 0.5) * (1 - o.damage / 250) * (o.human >= 0 ? 0.85 : 1) * (0.8 + Math.random() * 0.4);
      if (sc < bs) { bs = sc; best = o; }
    }
    ai.tgt = best; ai.tgtT = 1.5 + Math.random() * 1.5;
  }
  const o = ai.tgt;
  let tx = A.cx, ty = A.cy;
  if (o) {
    const d = dist(car.x, car.y, o.x, o.y), lead = clamp(d / Math.max(140, Math.abs(sp)), 0, 0.9) * (0.4 + 0.6 * D.overtake);
    tx = o.x + o.vx * lead; ty = o.y + o.vy * lead;
  }
  // in der Arena bleiben: nahe der Wand Richtung Mitte ziehen
  const e = Math.hypot((car.x - A.cx) / A.rx, (car.y - A.cy) / A.ry);
  if (e > 0.82) { const k = clamp((e - 0.82) * 4, 0, 0.8); tx = lerp(tx, A.cx, k); ty = lerp(ty, A.cy, k); }
  const err = wrapAngle(Math.atan2(ty - car.y, tx - car.x) - car.a);
  // Zurücksetzen in Richtung Ziel, wenn es hinter uns ist und wir langsam sind (Rückwärtsrammen vermeiden)
  out.steer = clamp(err * 2.4 + (Math.random() - 0.5) * D.noise, -1, 1);
  const vt = car.cls.maxSpeed * D.speed * (Math.abs(err) > 1.4 ? 0.45 : 1);
  if (sp < vt) out.thr = 1; else out.thr = 0.3;
  // Festgefahren → rückwärts mit Gegenlenkung
  if (Math.abs(sp) < 14 && car.freeze <= 0) car.stuckT += dt; else car.stuckT = Math.max(0, car.stuckT - dt * 2);
  if (car.stuckT > 0.9 && ai.revT <= 0) { ai.revT = 0.8 + Math.random() * 0.4; car.stuckT = 0; }
  if (ai.revT > 0) { ai.revT -= dt; out.thr = 0; out.brk = 1; out.steer = -out.steer; }
  return out;
}
function aiControl(car, race, dt) {
  if (race.mode === 'derby') return derbyAI(car, race, dt);
  const ai = car.ai, D = ai.diff, rt = race.rt, rules = race.rules;
  const sp = fwdSpeed(car), fx = Math.cos(car.a), fy = Math.sin(car.a);
  const prof = speedProfile(rt, car.cls);
  const out = { thr: 0, brk: 0, steer: 0, edge: {} };
  const d = rules.dmgOn ? car.damage / 100 : 0;
  const tireF = rules.tireOn ? 0.62 + 0.38 * Math.pow(car.tires / 100, 0.7) : 1;
  let cond = Math.sqrt(tireF) * (1 - 0.3 * d);
  if (car.finished) cond *= 0.7;

  // --- Boxenstopp-Entscheidung ---
  const lapsLeft = race.laps - car.lapTimes.length;
  // Verbrauch pro Runde: gemessen oder aus Streckenlänge geschätzt
  const fuelLap = race.fuelPlan ? 100 / race.fuelPlan.T : ai.fuelLap || rt.L * 0.0042 * 0.8 * rules.fuelPct / 100;
  // mit Tankpflicht: erst an der letzten Gelegenheit stoppen, die der Tank noch hergibt
  let needFuel = rules.fuelOn && car.fuel < fuelLap * 1.35 && car.fuel < fuelLap * (lapsLeft - 0.1);
  if (race.fuelPlan) {
    // Tankpflicht: genau rechnen – stoppen, wenn der Sprit weder bis ins Ziel noch bis zur Box in der nächsten Runde reicht
    const fp = race.fuelPlan, pos = clamp(car.s / rt.L, 0, 1), have = car.fuel / 100 * fp.T;
    const rem = car.lap === 0 ? race.laps + (1 - pos) : Math.max(0, race.laps - car.lapTimes.length - pos);
    const toBox = (((fp.e - pos) % 1) + 1) % 1;
    needFuel = have < rem + 0.06 && have < toBox + 1 + 0.2;
  }
  ai.wantPit = rules.pits && rt.pit && !car.finished && race.state === 'running' && (
    (rules.dmgOn && car.damage > 58 && lapsLeft > 1) || needFuel ||
    (rules.tireOn && car.tires < 22 && lapsLeft > 1));
  if (ai.mode === 'race' && ai.wantPit) {
    let ds = rt.pit.entryS - car.s; if (ds < -rt.L / 2) ds += rt.L; if (ds > rt.L / 2) ds -= rt.L;
    if (ds > 0 && ds < 70) {
      ai.mode = 'pitIn'; ai.pitIdx = 0;
      const used = race.cars.filter(c => c !== car && c.ai && c.ai.mode !== 'race').map(c => c.ai.slot);
      const free = rt.pit.slots.filter(s => !used.includes(s));
      ai.slot = free.length ? free[Math.floor(Math.random() * free.length)] : rt.pit.slots[0];
    }
  }

  // --- Abkürzung nehmen? (nur wenn die Schranke bei Ankunft offen ist) ---
  if (ai.mode === 'race' && rt.shortcuts.length && race.state === 'running' && !car.finished) {
    for (const sc of rt.shortcuts) {
      let di = (sc.ia - car.idx + rt.n) % rt.n;
      if (di > 3 && di < 14) {
        if (ai.scSeen !== sc) { ai.scSeen = sc; ai.scWant = Math.random() < 0.25 + 0.6 * D.overtake && sc.gain > 40; }
        const eta = (di * LINE_STEP + 60) / Math.max(60, sp);
        if (ai.scWant && (!sc.gate || gateOpenness(sc.gate, race.time + eta + 0.6) > 0.9)) { ai.mode = 'short'; ai.sc = sc; ai.scIdx = 0; }
      } else if (ai.scSeen === sc && di > 20) ai.scSeen = null;
    }
  }
  // --- Zielpunkt bestimmen ---
  let tx, ty, vt;
  if (ai.mode === 'short') {
    const sc = ai.sc, path = sc.path;
    let bi = ai.scIdx, bd = Infinity;
    for (let k = Math.max(0, ai.scIdx - 3); k < Math.min(sc.n, ai.scIdx + 14); k++) { const dd = (path[k].x - car.x) ** 2 + (path[k].y - car.y) ** 2; if (dd < bd) { bd = dd; bi = k; } }
    ai.scIdx = bi;
    const li = Math.min(sc.n - 1, bi + Math.round((18 + Math.max(0, sp) * 0.25) / LINE_STEP));
    tx = path[li].x; ty = path[li].y;
    vt = car.cls.maxSpeed * 0.72 * D.speed * cond;
    if (sc.gate && gateOpenness(sc.gate, race.time + 0.4) < 0.6) { const dg = dist(car.x, car.y, sc.gate.x, sc.gate.y); if (dg < 70 && bi < sc.n / 2) vt = Math.min(vt, Math.max(0, (dg - 18) * 2)); }
    if (bi >= sc.n - 3) { ai.mode = 'race'; car.idx = sc.ib; ai.off = 0; }
  } else if (ai.mode === 'race') {
    const look = (24 + Math.max(0, sp) * 0.3) * D.look;
    const li = (car.idx + Math.round(look / LINE_STEP)) % rt.n;
    // Ausweich-/Überholversatz, Windschatten nutzen, Position verteidigen
    let want = Math.sin(race.time * 0.35 + ai.phase) * D.wander;
    let blockSlow = 1, pressure = 0;
    const maxL = rt.wl[li], maxR = rt.wr[li];
    for (const o of race.cars) {
      if (o === car || o.finished || o.sink > 0 || o.level !== car.level || Math.abs(o.z - car.z) > 10) continue;
      const dx = o.x - car.x, dy = o.y - car.y;
      const ahead = dx * fx + dy * fy, side = -dx * fy + dy * fx;
      if (ahead > 4 && ahead < 60 + sp * 0.18 && Math.abs(side) < 22) {
        const osp = fwdSpeed(o);
        if (osp < sp + 15 && (ai.phase % 1) < D.overtake) {
          // im Windschatten bleiben, bis man nah genug ist – dann zur Seite mit mehr Platz ausscheren
          if (ahead > 34 && car.draft > 0.3 && osp > sp - 25) want = ai.off;
          else want = (side > 0 ? -1 : 1) * 24 * (maxL + maxR > 30 ? 1 : 0.6) * (side > 0 && maxL < 14 ? -1 : side < 0 && maxR < 14 ? -1 : 1);
        }
        if (ahead < 26 && Math.abs(side) < 13) blockSlow = Math.min(blockSlow, clamp(osp / Math.max(1, sp), 0.6, 1));
      } else if (ahead < -6 && ahead > -55 && Math.abs(side) < 26) {
        // Verfolger dicht dahinter: Druck, ggf. Innenbahn zumachen
        pressure = Math.max(pressure, 1 - (-ahead - 6) / 49);
        if ((ai.phase * 7) % 1 < D.overtake * 0.7 && fwdSpeed(o) > sp - 5) want = clamp(-side * 0.6, -14, 14);
      }
    }
    ai.pressure = pressure;
    want = clamp(want, -maxL, maxR);
    ai.off += (want - ai.off) * Math.min(1, dt * 2.2);
    tx = rt.lx[li] - rt.ty[li] * ai.off; ty = rt.ly[li] + rt.tx[li] * ai.off;
    const pi = (car.idx + 3) % rt.n;
    vt = prof[pi] * D.corner * cond;
    vt = Math.min(vt, car.cls.maxSpeed * D.speed);
    if (Math.abs(ai.off) > 12) vt *= 0.97;
    vt *= blockSlow;
    if (car.finished) vt = Math.min(vt, car.cls.maxSpeed * 0.55);
    // Fehler: kurz zu spät bremsen oder schlampig lenken
    ai.mistakeT -= dt;
    if (ai.mistakeT <= 0 && Math.random() < D.mistake * dt * 6 * (1 + 2.5 * (ai.pressure || 0))) { ai.mistakeT = 0.5 + Math.random() * 0.6; ai.mistakeK = Math.random() < 0.5 ? 1 : 2; }
    if (ai.mistakeT > 0 && ai.mistakeK === 1) vt *= 1.12;
  } else {
    // Boxengasse: Pfad folgen, am Halteplatz stoppen
    const p = rt.pit, path = p.path;
    let bi = ai.pitIdx, bd = Infinity;
    for (let k = Math.max(0, ai.pitIdx - 3); k < Math.min(p.n, ai.pitIdx + 12); k++) {
      const dd = (path[k].x - car.x) ** 2 + (path[k].y - car.y) ** 2; if (dd < bd) { bd = dd; bi = k; }
    }
    ai.pitIdx = bi;
    const li = Math.min(p.n - 1, bi + Math.round((14 + Math.max(0, sp) * 0.25) / LINE_STEP));
    tx = path[li].x; ty = path[li].y;
    if (ai.mode === 'pitIn' || ai.mode === 'service') { const ds = Math.abs(li - ai.slot); if (ds < 7) { const k = 1 - ds / 7; tx += (p.ox || 0) * 11 * k; ty += (p.oy || 0) * 11 * k; } }
    vt = PIT_LIMIT * 0.9;
    if (bi < 4) vt = Math.min(vt, Math.max(PIT_LIMIT, prof[car.idx] * 0.8));
    if (ai.mode === 'pitIn') {
      const sl = { x: path[ai.slot].x + (p.ox || 0) * 11, y: path[ai.slot].y + (p.oy || 0) * 11 };
      const toStop = (ai.slot - bi) * LINE_STEP + (bd < 4 ? 0 : 0);
      if (toStop <= 0) vt = 0; else vt = Math.min(vt, Math.sqrt(2 * 260 * toStop));
      // Stau in der Box (alle müssen tanken): wer in der Boxenzone hinter einem anderen steht, wird an Ort und Stelle bedient
      ai.boxWait = car.inBox && Math.abs(sp) < 4 ? (ai.boxWait || 0) + dt : 0;
      const jam = race.fuelPlan && ai.boxWait > 0.5;
      if (dist(car.x, car.y, sl.x, sl.y) < 8 || toStop <= 0 || jam) {
        vt = 0;
        if (Math.abs(sp) < 6 && car.inBox) {
          const q = [];
          if (rules.dmgOn && car.damage > 8) q.push('repair');
          if (rules.tireOn && car.tires < 75) q.push('tires');
          if (rules.fuelOn && (car.fuel < 85 || (race.fuelPlan && !car.refueled))) q.push('fuel');
          if (!q.length && !(race.fuelPlan && car.refueled)) q.push('fuel');
          for (const k of q) queueService(car, k, race);
          ai.mode = 'service';
        }
      }
    } else if (ai.mode === 'service') {
      vt = 0;
      if (!car.service.cur && !car.service.q.length) ai.mode = 'pitOut';
    } else if (ai.mode === 'pitOut') {
      if (bi >= p.n - 3) { ai.mode = 'race'; car.idx = projectLine(rt, car.x, car.y, null).i; ai.off = 0; }
    }
  }

  // --- Lenken ---
  const desired = Math.atan2(ty - car.y, tx - car.x);
  let err = wrapAngle(desired - car.a);
  const latV = car.vx * -fy + car.vy * fx;
  let steer = err * 2.6 - latV * 0.004;
  steer += (Math.sin(race.time * 3.1 + ai.phase * 7) * 0.5 + (Math.random() - 0.5)) * D.noise;
  if (ai.mistakeT > 0 && ai.mistakeK === 2) steer += Math.sin(race.time * 9) * 0.35;
  out.steer = clamp(steer, -1, 1);

  // --- Gas / Bremse ---
  if (vt <= 0.5) { out.brk = sp > 2 ? 1 : 0; out.thr = 0; }
  else if (sp < vt - 6) out.thr = Math.abs(err) > 1.2 ? 0.5 : 1;
  else if (sp > vt + 10) out.brk = clamp((sp - vt) / 50, 0.25, 1);
  else out.thr = 0.35;

  // --- Festgefahren? Rückwärts, notfalls zurücksetzen ---
  if (race.state === 'running' && ai.mode !== 'service' && car.freeze <= 0 && !(ai.mode === 'pitIn' && vt === 0)) {
    if (Math.abs(sp) < 12) car.stuckT += dt; else car.stuckT = Math.max(0, car.stuckT - dt * 2);
    if (car.stuckT > 1.3 && ai.revT <= 0) ai.revT = 0.9;
    if (car.stuckT > 5) {
      if (ai.mode === 'pitIn' && rt.pit) {
        // im Boxengassen-Stau festgefahren: direkt auf den eigenen Halteplatz setzen statt zurück auf die Strecke (sonst verpasst das Auto seinen Stopp)
        const p = rt.pit, q = p.path[ai.slot];
        car.x = car.prevX = q.x + (p.ox || 0) * 11; car.y = car.prevY = q.y + (p.oy || 0) * 11;
        car.vx = car.vy = car.av = 0; car.stuckT = 0; ai.pitIdx = ai.slot; ai.revT = 0;
      } else resetCar(car, race);
    }
  }
  if (ai.revT > 0) { ai.revT -= dt; out.thr = 0; out.brk = 1; out.steer = -out.steer; }
  // weit weg von der Linie (z. B. Abkürzung verpasst) → zurücksetzen
  if (ai.mode === 'race' && race.state === 'running') {
    const pr = projectLine(rt, car.x, car.y, car.idx, car.level);
    // weit weg von der Linie oder auf der falschen Ebene (unter statt auf der Brücke)
    const wrongLevel = !car.air && (rt.lvl[pr.i] || 0) !== car.level && pr.d < 40;
    if ((pr.d > 110 || wrongLevel) && !car.air) car.offT += dt * (wrongLevel ? 2 : 1); else car.offT = 0;
    if (car.offT > 4) resetCar(car, race);
    // kein Fortschritt (Checkpoint) über lange Zeit → zurücksetzen
    if (ai.cpSeen !== car.nextCp) { ai.cpSeen = car.nextCp; ai.cpT = 0; } else ai.cpT = (ai.cpT || 0) + dt;
    if (ai.cpT > 25 && !car.finished) { ai.cpT = 0; resetCar(car, race); }
  }
  return out;
}
/** Boxendienst einreihen (Reparatur, Tanken, Reifen). */
function queueService(car, kind, race) {
  const sv = car.service;
  if (sv.cur === kind || sv.q.includes(kind)) return;
  const r = race.rules;
  if (kind === 'repair' && !r.dmgOn) return;
  if (kind === 'fuel' && !r.fuelOn) return;
  if (kind === 'tires' && !r.tireOn) return;
  sv.q.push(kind);
}
const SERVICE_NAME = { repair: 'Reparatur', fuel: 'Tanken', tires: 'Reifenwechsel' };
function serviceDuration(car, kind, race) {
  if (kind === 'repair') return 0.8 + car.damage * 0.03;
  if (kind === 'fuel') return race && race.fuelPlan ? 1.75 + 0.75 * (car.fuelSlow || 0) : 0.6 + (100 - car.fuel) * 0.022;   // Pflichtstopp: feste Dauer; schnelle Klassen etwas kürzer, weil sie in der Boxengasse mehr Zeit verlieren
  return 2.4;
}
/** Boxendienst abarbeiten. Gibt true zurück, solange das Auto steht. */
function updateService(car, dt, race) {
  const sv = car.service;
  if (!sv.cur && sv.q.length) { sv.cur = sv.q.shift(); sv.t = 0; sv.dur = serviceDuration(car, sv.cur, race); }
  if (!sv.cur) return false;
  sv.t += dt;
  car.vx = car.vy = car.av = 0;
  if (sv.t >= sv.dur) {
    if (sv.cur === 'repair') car.damage = 0;
    if (sv.cur === 'fuel') { car.fuel = 100; car.refueled = true; }
    if (sv.cur === 'tires') car.tires = 100;
    if (car.human >= 0) Sound.service();
    sv.cur = null;
    if (!sv.q.length) return false;
  }
  return true;
}
