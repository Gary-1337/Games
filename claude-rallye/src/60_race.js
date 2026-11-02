/* =====================================================================
   11  RENNEN: Countdown, Checkpoints, Positionen, Boxendienst, Ziel, Rekorde, Ghost
   ===================================================================== */
let race = null;
const POINTS = [10, 8, 6, 5, 4, 3, 2, 1];

/** Bestenliste je Strecke (Top 10 Runden). Gibt Platz (1-basiert) oder 0 zurück. */
function addRecord(trackId, rec) {
  const k = 'cr_lb_' + trackId, list = store.get(k, []);
  list.push(rec); list.sort((a, b) => a.time - b.time);
  const top = list.slice(0, 10); store.set(k, top);
  const i = top.indexOf(rec);
  return i >= 0 ? i + 1 : 0;
}
const getRecords = id => store.get('cr_lb_' + id, []);
/** Zoomstufe der Kamera laut Optionen (1 = aus). */
const CAM_ZOOM = [1, 1.55, 2.1];
const camZoom = () => CAM_ZOOM[Options.data.camera != null ? Options.data.camera : 1] || 1;
/** Kamera im Rennen umschalten (Taste C / Pausenmenü); Szene bei Bedarf in hoher Auflösung neu bauen. */
function cycleCamera(race) {
  const o = Options.data; o.camera = ((o.camera != null ? o.camera : 1) + 1) % CAM_ZOOM.length; Options.save();
  if (race && camZoom() > 1 && race.layers.rs === 1 && race.cars.filter(c => c.human >= 0).length === 1) {
    const rs = 2, old = race.skid;
    race.layers = buildScene(race.rt.src, race.rt, { checkpoints: Options.data.showCps, rs }, race.weather);
    race.skid = document.createElement('canvas'); race.skid.width = W * rs; race.skid.height = H * rs;
    race.skidCtx = race.skid.getContext('2d'); race.skidCtx.drawImage(old, 0, 0, W * rs, H * rs); race.skidCtx.setTransform(rs, 0, 0, rs, 0, 0);
  }
  if (race) race.cam = null;
  toast('Kamera: ' + ['Ganze Strecke (Zoom aus)', 'Folgen', 'Nah'][o.camera]);
}

/**
 * Erzeugt ein neues Rennen.
 * cfg: { mode: 'quick'|'trial'|'champ'|'test'|'demo', trackId | track, laps, ai, diff, players:[{name,cls,color}], rules }
 */
function createRace(cfg) {
  const src = cfg.track || getTrack(cfg.trackId);
  const rt = prepareTrack(src);
  // Wetter und Tageszeit
  const wx = { sky: 'clear', time: 'day', ...(cfg.weather || {}) };
  wx.snow = wx.sky === 'rain' && rt.theme === 'snow';
  rt.weather = wx;
  if (wx.sky === 'rain' && !wx.snow) {
    const rng = mulberry32(rt.n * 7 + 3);
    rt.puddles = [];
    for (let k = 0; k < 40 && rt.puddles.length < 9; k++) {
      const i = Math.floor(rng() * rt.n);
      if (rt.lvl[i] || rt.cum[i] < 120) continue;
      const off = (rng() - 0.5) * 30, x = rt.lx[i] - rt.ty[i] * off, y = rt.ly[i] + rt.tx[i] * off;
      if (cellAt(rt.src, x, y) !== S.ASPHALT || rt.puddles.some(p => dist(p.x, p.y, x, y) < 120)) continue;
      rt.puddles.push({ x, y, r: 12 + rng() * 10, a: rng() * 3 });
    }
  }
  // Zoom-Kamera (nur allein): Szene in doppelter Auflösung, damit sie vergrößert scharf bleibt
  const rs = cfg.mode !== 'demo' && cfg.players.length === 1 && camZoom() > 1 ? 2 : 1;
  const layers = buildScene(rt.src, rt, { checkpoints: Options.data.showCps && cfg.mode !== 'demo', rs }, wx);
  const skid = document.createElement('canvas'); skid.width = W * rs; skid.height = H * rs;
  const skidCtx = skid.getContext('2d'); skidCtx.setTransform(rs, 0, 0, rs, 0, 0);
  const R = {
    cfg, mode: cfg.mode, rt, layers, skid, skidCtx, rules: { ...cfg.rules }, laps: cfg.laps, weather: wx,
    trackId: src.id, trackName: src.name, cars: [], state: 'countdown', time: 0, cd: 3.99, lastBeep: 4, t: 0,
    firstFinishT: null, lastHumanFinishT: null, finishOrder: [], passLog: new Map(), audible: cfg.mode !== 'demo',
    endT: 0, results: null, ghost: null, banner: null
  };
  R.career = !!cfg.career;
  if (cfg.mode === 'derby') {
    // Demolition Derby: nur Schaden zählt, kein Sprit/Reifen/Boxen
    R.rules = { fuelOn: false, fuelPct: 100, tireOn: false, tirePct: 100, dmgOn: true, dmgPct: (cfg.rules && cfg.rules.dmgPct) || 100, pits: false };
    R.timeLimit = cfg.timeLimit || 180; R.laps = 1;
    R.arena = getArenaDef(src.id) || { cx: W / 2, cy: H / 2, rx: 500, ry: 300 };
    R.onCarHit = derbyHit;
  }
  if (!R.rules.pits || !rt.pit) R.rules.pits = false;
  // Fahrer anlegen
  const entries = [];
  cfg.players.forEach((p, i) => entries.push({ name: p.name, color: p.color, cls: CLASSES[p.cls], human: i }));
  const usedCols = new Set(cfg.players.map(p => p.color));
  const names = AI_NAMES.slice().sort(() => Math.random() - 0.5);
  const freeCols = COLORS.filter(c => !usedCols.has(c));
  for (let i = 0; i < cfg.ai; i++) {
    const diff = Array.isArray(cfg.diff) ? cfg.diff[i % cfg.diff.length] : cfg.diff;
    if (cfg.aiRoster && cfg.aiRoster[i]) {
      const a = cfg.aiRoster[i];
      entries.push({ name: a.name, color: a.color, cls: CLASSES[a.cls], human: -1, diff, ri: i });
      continue;
    }
    const cls = cfg.aiCls != null ? CLASSES[cfg.aiCls] : CLASSES[Math.floor(Math.random() * CLASSES.length)];
    entries.push({ name: names[i % names.length], color: freeCols[i % freeCols.length], cls, human: -1, diff, ri: i });
  }
  // Startaufstellung: Menschen hinten (fair für Einsteiger) außer im Zeitfahren, sonst gemischt
  const order = entries.slice().sort(() => Math.random() - 0.5);
  order.forEach((e, k) => {
    const c = makeCar({ id: k, name: e.name, color: e.color, cls: e.cls, human: e.human });
    c.ri = e.ri;
    const sp = rt.start[k % rt.start.length];
    const pr = projectLine(rt, sp.x, sp.y, null, 0);
    placeOnLine(c, rt, sp.x, sp.y, sp.a, pr.i);
    c.idx = pr.i; c.s = pr.s; c.lastValidS = pr.s;
    if (e.human < 0) c.ai = makeAI(c, e.diff);
    R.cars.push(c);
  });
  // Checkpoint-Fahnen (dynamisch, damit der nächste Checkpoint hervorgehoben werden kann)
  if (cfg.mode !== 'derby') rt.cps.forEach((c, k) => {
    if (k === 0) return;
    for (const [x, y] of [[c.x1, c.y1], [c.x2, c.y2]]) {
      if (SURF[cellAt(rt.src, x, y)].oob) continue;
      const o = { t: 'cpflag', x, y, a: 0, w: 4, h: 4, k, zb: terrainH(rt.src, x, y) };
      R.layers.dyn.push(o);
    }
  });
  if (cfg.mode === 'elim') { R.laps = Math.max(1, R.cars.length - 1); R.elimDone = 0; }
  R.outCount = 0;
  // Ghost laden (nur Zeitfahren)
  if (cfg.mode === 'trial') R.ghost = store.get('cr_ghost_' + src.id, null);
  // Power-ups: nur als Regel in Rennen/Ausscheidung/Championship, nie in der Karriere
  R.powerups = !!R.rules.powerups && !R.career && ['quick', 'elim', 'champ', 'test'].includes(cfg.mode);
  R.pads = []; R.boxes = []; R.slicks = [];
  if (R.powerups) PU.setup(R);
  Particles.clear();
  return R;
}

/** Fortschrittsschlüssel: (abgeschlossene Runden) + Anteil der aktuellen Runde, gedeckelt durch den nächsten Checkpoint. */
function progressKey(car, rt, race) {
  if (car.gaveUp) return -5000;
  if (car.out) return -1000 - car.outPlace;
  if (race && race.mode === 'derby') return car.finished ? 1e6 : 200 - car.damage;
  if (car.finished) return 1e6 - car.finishOrder;
  let frac = car.s / rt.L;
  if (car.nextCp === 0) { if (frac < 0.5) frac = 1; }
  else {
    if (car.nextCp === 1 && frac > 0.75) frac = 0;
    const cap = rt.cps[car.nextCp].frac + 0.01;
    if (frac > cap) frac = cap;
  }
  return (car.lap - 1) + frac;
}

/** Checkpoint k korrekt durchfahren. */
function passCheckpoint(car, k, race) {
  const rt = race.rt, n = rt.cps.length;
  const lapKey = car.lap;
  if (k === 0) {
    if (car.lap === 0) { car.lap = 1; car.lapStart = 0; car.fuelAtLap = car.fuel; }
    else completeLap(car, race);
  }
  if (car.finished) return;
  car.nextCp = (k + 1) % n;
  if (k > 0 && car.human >= 0 && race.audible) Sound.beep(1180, 0.06, 'triangle', 0.08);
  // Abstand zum Führenden über das Durchfahrts-Protokoll
  const key = (k === 0 ? car.lap : lapKey) + '_' + k;
  if (race.passLog.has(key)) car.lastPass = race.t - race.passLog.get(key);
  else { race.passLog.set(key, race.t); car.lastPass = 0; }
}
function completeLap(car, race) {
  const lt = race.t - car.lapStart;
  car.lapTimes.push(lt);
  const isBest = car.best == null || lt < car.best;
  if (isBest) car.best = lt;
  car.lapStart = race.t;
  const human = car.human >= 0;
  if (human && race.mode !== 'demo' && race.mode !== 'test') {
    const rank = addRecord(race.trackId, { name: car.name, time: lt, cls: car.cls.name, date: new Date().toLocaleDateString('de-AT'), mode: race.mode });
    if (rank === 1) { flashMsg(car, 'STRECKENREKORD!', '#ffd23e'); Speaker.say(Speaker.pick(['Neuer Streckenrekord!', 'Rekordrunde! Unglaublich!', 'Das ist ein neuer Streckenrekord!']), 'rec', 8, 2); }
    else if (isBest && car.lapTimes.length > 1) flashMsg(car, 'Persönliche Bestzeit', '#46d68a');
    Sound.lap(rank === 1 || isBest);
  }
  // Ghost speichern
  if (race.mode === 'trial' && human) {
    const fr = car.ghostFrames;
    if (fr.length > 10 && (!race.ghost || lt < race.ghost.time)) {
      race.ghost = { time: lt, color: car.color, cls: car.cls.id, frames: fr.slice(), z: (car.ghostZ || []).slice() };
      store.set('cr_ghost_' + race.trackId, race.ghost);
    }
  }
  // KI merkt sich den Spritverbrauch der letzten Runde (für die Boxenstrategie)
  if (car.ai && car.fuelAtLap != null && car.fuelAtLap > car.fuel) car.ai.fuelLap = car.fuelAtLap - car.fuel;
  car.fuelAtLap = car.fuel;
  car.ghostFrames = []; car.ghostZ = []; car.ghostAcc = 0;
  if (race.mode === 'elim') {
    car.lap++;
    // Der Erste, der diese Runde beendet, löst das Ausscheiden des Letzten aus
    if (car.lapTimes.length > race.elimDone) {
      race.elimDone = car.lapTimes.length;
      const act = race.cars.filter(c => !c.out && !c.finished);
      const last = act.filter(c => c !== car).sort((a, b) => a.key - b.key)[0];
      if (last) eliminate(last, race, 'AUSGESCHIEDEN');
      const rest = race.cars.filter(c => !c.out && !c.finished);
      if (rest.length === 1) finishCar(rest[0], race);
    }
    return;
  }
  if (car.lapTimes.length >= race.laps) finishCar(car, race);
  else car.lap++;
}
/** Auto scheidet aus (Ausscheidungsrennen) bzw. ist ein Wrack (Derby). */
function eliminate(car, race, why) {
  const active = race.cars.filter(c => !c.out && !c.finished).length;
  car.out = true; car.outPlace = active; car.finished = true; car.finishT = race.t; car.outT = race.t;
  race.outCount++;
  car.service = { q: [], cur: null, t: 0, dur: 0 };
  if (race.mode === 'derby') { car.wreck = true; car.thr = 0; car.damage = 100; }
  else car.alpha = 0.3;
  if (race.audible) Speaker.say(race.mode === 'derby' ? car.name + ' ist erledigt!' : car.name + ' ist ausgeschieden.', 'out' + car.id, 30, car.human >= 0 ? 2 : 1);
  if (car.human >= 0) {
    flashMsg(car, why + ' – Platz ' + active, '#ff8a3d');
    if (!car.wreck) car.ai = makeAI(car, 0);
  }
  if (race.audible) Sound.crash(0.6);
  Particles.sparks(car.x, car.y, 12, car.z);
}
/** Derby: Treffer zählen, Frontaufprall schont den Angreifer. */
function derbyHit(A, B, vn) {
  const race = this;
  for (const [me, other] of [[A, B], [B, A]]) {
    if (me.out) continue;
    const dx = other.x - me.x, dy = other.y - me.y, d = Math.hypot(dx, dy) || 1;
    const front = (Math.cos(me.a) * dx + Math.sin(me.a) * dy) / d;
    const imp = vn * 0.85 * other.cls.mass;
    if (imp < 45) continue;
    const dmg = (imp - 45) * 0.085 * 0.7 * me.cls.dmgMul * race.rules.dmgPct / 100;
    if (front > 0.55) {
      me.damage = Math.max(0, me.damage - dmg * 0.6);          // Frontpartie hält mehr aus
      if (!other.wreck && dmg > 1.5 && race.time - (me.lastHitT || 0) > 0.5) { me.hits = (me.hits || 0) + 1; me.lastHitT = race.time; }
    } else if (front < -0.2) me.damage = Math.min(100, me.damage + dmg * 0.3);   // Heck/Seite empfindlicher
  }
}
function finishCar(car, race) {
  car.finished = true; car.finishT = race.t; car.finishOrder = race.finishOrder.length; race.finishOrder.push(car);
  if (race.firstFinishT == null) race.firstFinishT = race.t;
  car.alpha = 0.55; car.service = { q: [], cur: null, t: 0, dur: 0 };
  if (car.human >= 0) {
    race.lastHumanFinishT = race.t;
    flashMsg(car, car.finishOrder === 0 ? 'SIEG!' : 'IM ZIEL – Platz ' + (car.finishOrder + 1), '#ffffff');
    if (race.mode !== 'trial') Speaker.say(car.finishOrder === 0 ? Speaker.pick(['Sieg für ' + car.name + '!', car.name + ' gewinnt! Was für ein Rennen!', 'Und der Sieger heißt ' + car.name + '!']) : car.name + Speaker.pick([' ist im Ziel, Platz ' + (car.finishOrder + 1) + '.', ' kommt als ' + (car.finishOrder + 1) + '. ins Ziel.']), 'fin' + car.id, 30, 2);
    Sound.finish();
    car.ai = makeAI(car, 1);
  }
}
function flashMsg(car, text, color) { car.msg = text; car.msgCol = color; car.msgT = 2.5; }

/** Ein Physik-Schritt des Rennens. */
function updateRace(race, dt) {
  const rt = race.rt;
  race.time += dt;
  if (race.state === 'countdown') {
    race.cd -= dt;
    const sec = Math.ceil(race.cd);
    if (sec < race.lastBeep && sec >= 1 && sec <= 3) { race.lastBeep = sec; if (race.audible) Sound.countdown(false); }
    if (race.cd <= 0) {
      race.state = 'running'; race.t = 0; race.goT = 1.2;
      if (race.audible && race.mode !== 'demo') Speaker.say(race.mode === 'derby' ? Speaker.pick(['Auf geht\'s, Blech verbiegen!', 'Die Arena bebt – und los!', 'Möge das stärkste Blech gewinnen!']) : Speaker.pick(['Und los geht\'s!', 'Grün! Das Feld setzt sich in Bewegung!', 'Die Ampel ist aus – los!', 'Start frei, und alle geben Vollgas!']), 'go', 3, 2);
      if (race.audible) Sound.countdown(true);
    }
  } else if (race.state === 'running' || race.state === 'ending') {
    race.t += dt;
    if (race.goT > 0) race.goT -= dt;
  }
  const running = race.state === 'running' || race.state === 'ending';

  updateDraft(race.cars);
  // --- Steuerung + Physik ---
  for (const car of race.cars) {
    let inp = { thr: 0, brk: 0, steer: 0, edge: {} };
    if (car.human >= 0 && !car.finished) {
      inp = Input.read(car.human);
      if (inp.pause && race.mode !== 'demo') Game.pause();
      if (inp.edge.reset && running) { resetCar(car, race); if (race.mode === 'derby') car.damage = Math.min(99, car.damage + 8); }
      else if (inp.edge.cp && running) { resetToCheckpoint(car, race); if (race.mode === 'derby') car.damage = Math.min(99, car.damage + 8); }
      if (inp.edge.item && running && race.powerups) PU.use(car, race);
    } else if (car.ai) inp = aiControl(car, race, dt);
    if (!running) { car.thr = inp.thr; inp = { thr: 0, brk: 0, steer: 0, edge: {} }; }

    // Boxendienst
    car.inBox = !!(race.rules.pits && rt.pit && inBoxRect(rt.pit.box, car.x, car.y));
    if (car.inBox && running && car.human >= 0 && !car.finished && Math.abs(fwdSpeed(car)) < 12) {
      if (inp.edge.left) queueService(car, 'repair', race);
      if (inp.edge.down) queueService(car, 'fuel', race);
      if (inp.edge.right) queueService(car, 'tires', race);
    }
    if (updateService(car, dt, race)) { car.prevX = car.x; car.prevY = car.y; car.thr = 0; continue; }
    stepCarPhysics(car, inp, dt, race);
  }
  if (race.powerups) PU.update(race, dt);
  for (const car of race.cars) if (car.sink <= 0) collideObjects(car, race);
  collideCars(race.cars, race);

  // --- Rennlogik je Auto ---
  for (const car of race.cars) {
    // Checkpoints nur in der richtigen Reihenfolge und Richtung
    if (running && !car.finished && car.sink <= 0 && race.mode !== 'derby') {
      const cp = rt.cps[car.nextCp];
      const mx = car.x - car.prevX, my = car.y - car.prevY;
      if ((mx || my) && mx * cp.nx + my * cp.ny > 0 && segIntersect(car.prevX, car.prevY, car.x, car.y, cp.x1, cp.y1, cp.x2, cp.y2)) passCheckpoint(car, car.nextCp, race);
    }
    const pr = projectLine(rt, car.x, car.y, car.idx, car.level);
    car.idx = pr.i; car.s = pr.s;
    if (!SURF[car.surf].oob && !car.air && pr.d < 60 && !car.wrong && car.sink <= 0 && (rt.lvl[pr.i] || 0) === car.level) car.lastValidS = car.s;
    // Falsche Richtung
    const along = car.vx * rt.tx[car.idx] + car.vy * rt.ty[car.idx];
    if (running && along < -40 && pr.d < 90 && race.mode !== 'derby') car.wrongT += dt; else car.wrongT = Math.max(0, car.wrongT - dt * 2);
    car.wrong = car.wrongT > 1.0;
    car.key = progressKey(car, rt, race);
    // Checkpoint ausgelassen? (deutlich hinter dem nächsten Checkpoint, ohne ihn durchfahren zu haben)
    if (car.human >= 0 && running && !car.finished && car.nextCp > 0 && race.mode !== 'derby') {
      const f = car.s / rt.L, cf = rt.cps[car.nextCp].frac;
      const was = car.missedCp; car.missedCp = f > cf + 0.035 && f < cf + 0.5;
      if (car.missedCp && !was) { flashMsg(car, 'CHECKPOINT VERPASST – zurück!', '#ffcd32'); if (race.audible) Sound.beep(330, 0.25, 'square', 0.12); }
    } else car.missedCp = false;
    if (car.resetMsg > 0) car.resetMsg -= dt;
    if (car.msgT > 0) car.msgT -= dt;
    // Ghost-Aufzeichnung (30 Bilder/s)
    if (race.mode === 'trial' && car.human >= 0 && car.lap >= 1 && running && !car.finished) {
      car.ghostAcc += dt;
      while (car.ghostAcc >= 1 / 30) { car.ghostAcc -= 1 / 30; car.ghostFrames.push(r1(car.x), r1(car.y), Math.round(car.a * 100) / 100); (car.ghostZ || (car.ghostZ = [])).push(r1(car.z)); }
    }
    // Bremsspuren & Partikel
    trackEffects(car, race, dt);
  }

  // --- Derby: Wracks, Rauch, Zeitlimit ---
  if (race.mode === 'derby') {
    for (const car of race.cars) {
      if (!car.out && running && car.damage >= 100) eliminate(car, race, 'WRACK');
      if (car.damage > 55 && Math.random() < dt * (car.wreck ? 9 : (car.damage - 50) / 10)) {
        const g = car.damage > 85 || car.wreck ? 70 : 140;
        Particles.add('puff', car.x - Math.cos(car.a) * 4, car.y - Math.sin(car.a) * 4, car.z + 8, (Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14, 22 + Math.random() * 14, 1.4, 4, `${g},${g},${g + 6}`, 0, 9);
      }
    }
  }
  // --- Platzierungen ---
  const sorted = race.cars.slice().sort((a, b) => b.key - a.key);
  sorted.forEach((c, i) => c.place = i + 1);
  const leader = sorted[0];
  // Kommentator: Führungswechsel, letzte Runde
  if (race.audible && race.mode !== 'demo' && race.mode !== 'trial' && race.state === 'running' && race.t > 4) {
    if (race.leaderId != null && race.leaderId !== leader.id && !leader.finished && (leader.human >= 0 || race.cars.find(c => c.id === race.leaderId).human >= 0))
      Speaker.say(leader.human >= 0 ? Speaker.pick([leader.name + ' übernimmt die Führung!', 'Wahnsinn, ' + leader.name + ' ist jetzt vorne!', leader.name + ' setzt sich an die Spitze!']) : Speaker.pick([leader.name + ' geht an die Spitze!', 'Führungswechsel! ' + leader.name + ' ist vorbei!', leader.name + ' schnappt sich Platz eins!']), 'lead', 6);
    if (race.mode !== 'derby' && race.laps > 1 && leader.lap === race.laps && !race.lastLapSaid) { race.lastLapSaid = true; Speaker.say(Speaker.pick(['Letzte Runde!', 'Die letzte Runde läuft – jetzt zählt\'s!', 'Glocke! Letzte Runde!']), 'lastlap', 10, 2); }
  }
  race.leaderId = leader.id;
  for (const c of sorted) {
    if (race.mode === 'derby') { c.gapText = c.wreck ? 'WRACK' : c.finished ? 'SIEGER' : Math.round(c.damage) + '%'; continue; }
    if (c.out) { c.gapText = 'RAUS'; continue; }
    if (c === leader) c.gapText = c.finished ? 'Ziel' : 'Runde ' + Math.max(1, c.lap);
    else if (c.finished) c.gapText = '+' + (c.finishT - leader.finishT).toFixed(2);
    else {
      const behind = Math.floor(leader.key - c.key);
      c.gapText = behind >= 1 ? '+' + behind + ' Rd' : (c.lastPass != null ? '+' + c.lastPass.toFixed(2) : '');
    }
  }

  // --- Rennende ---
  if (race.state === 'running' && (race.mode === 'derby' || race.mode === 'elim')) {
    const act = race.cars.filter(c => !c.out && !c.finished), humans = race.cars.filter(c => c.human >= 0);
    const humansOut = humans.length && humans.every(c => c.out);
    if (race.mode === 'derby' && act.length === 1) finishCar(act[0], race);
    if (race.mode === 'derby' && race.t >= race.timeLimit) { race.timeUp = true; }
    if (act.length <= 1 || race.timeUp) { race.state = 'ending'; race.endT = 2.4; }
    else if (humansOut) {
      race.humansOutT = (race.humansOutT || 0) + dt;
      if (race.humansOutT > 3) { race.state = 'ending'; race.endT = 0.5; }
    }
  } else if (race.state === 'running' && race.mode !== 'demo') {
    const humans = race.cars.filter(c => c.human >= 0);
    const allDone = race.cars.every(c => c.finished);
    const humansDone = humans.length && humans.every(c => c.finished);
    if (allDone || (race.firstFinishT != null && race.t - race.firstFinishT > 30) || (humansDone && race.t - race.lastHumanFinishT > 6)) {
      race.state = 'ending'; race.endT = 2.2;
    }
  } else if (race.state === 'running' && race.mode === 'demo' && race.firstFinishT != null) {
    race.state = 'ending'; race.endT = 2;
  }
  if (race.state === 'ending') {
    race.endT -= dt;
    if (race.endT <= 0) { race.state = 'done'; Game.onRaceDone(); }
  }
}

/** Ergebnisliste erstellen. */
function computeResults(race) {
  if (race.mode === 'derby' || race.mode === 'elim') {
    const derby = race.mode === 'derby';
    const sorted = race.cars.slice().sort((a, b) => b.key - a.key);
    return sorted.map((c, i) => {
      let gap;
      if (derby) gap = c.gaveUp ? 'aufgegeben' : c.wreck ? 'Wrack nach ' + fmtTime(c.outT).replace(/\.\d+$/, '') : i === 0 ? (race.timeUp ? 'Zeit um – am wenigsten Schaden' : 'letztes Auto') : 'überlebt';
      else gap = c.gaveUp ? 'aufgegeben' : c.out ? 'raus in Runde ' + (c.lapTimes.length + 1) : i === 0 ? (c.finished ? 'Sieger' : 'vorn bei Rennende') : 'noch im Rennen';
      return { pos: i + 1, name: c.name, color: c.color, cls: c.cls.name, human: c.human, finished: i === 0, total: derby ? null : (i === 0 && c.finished ? c.finishT : null),
        gap, best: derby ? null : c.best, laps: derby ? [] : c.lapTimes.slice(), points: POINTS[i] || 0, carId: c.id, ri: c.ri, damage: Math.round(c.damage), hits: c.hits || 0 };
    });
  }
  const sorted = race.cars.slice().sort((a, b) => {
    if (a.finished && b.finished) return a.finishT - b.finishT;
    if (a.finished) return -1; if (b.finished) return 1;
    return b.key - a.key;
  });
  const win = sorted[0];
  return sorted.map((c, i) => {
    let gap = '';
    if (i === 0) gap = c.finished ? fmtTime(c.finishT) : '–';
    else if (c.finished && win.finished) gap = '+' + (c.finishT - win.finishT).toFixed(3);
    else if (c.gaveUp) gap = 'aufgegeben';
    else { const laps = (win.finished ? race.laps : win.lapTimes.length) - c.lapTimes.length; gap = laps > 0 ? '+' + laps + (laps === 1 ? ' Runde' : ' Runden') : 'nicht im Ziel'; }
    return { pos: i + 1, name: c.name, color: c.color, cls: c.cls.name, human: c.human, finished: c.finished, total: c.finished ? c.finishT : null,
      gap, best: c.best, laps: c.lapTimes.slice(), points: POINTS[i] || 0, carId: c.id, ri: c.ri };
  });
}

/* ---------- Effekte: Bremsspuren und Partikel ---------- */
const SKID_COL = {
  [S.ASPHALT]: 'rgba(18,18,20,0.30)', [S.CURB]: 'rgba(18,18,20,0.25)', [S.PIT]: 'rgba(18,18,20,0.28)', [S.GRASS]: 'rgba(54,84,36,0.35)',
  [S.SAND]: 'rgba(160,126,70,0.35)', [S.GRAVEL]: 'rgba(90,84,76,0.35)', [S.SNOW]: 'rgba(150,170,195,0.5)', [S.ICE]: 'rgba(255,255,255,0.35)',
  [S.DIRT]: 'rgba(92,70,50,0.38)', [S.CONCRETE]: 'rgba(30,30,32,0.28)', [S.ASH]: 'rgba(20,18,18,0.4)'
};
const DIRT_COL = { [S.GRASS]: '#3e6b2c', [S.SAND]: '#d2b27a', [S.GRAVEL]: '#8d877e', [S.SNOW]: '#ffffff', [S.ICE]: '#dff3ff', [S.DIRT]: '#7a5c40', [S.ASH]: '#4a4444' };
const SOFT = new Set([S.GRASS, S.SAND, S.GRAVEL, S.SNOW, S.DIRT, S.ASH]);
function trackEffects(car, race, dt) {
  if (car.sink > 0) return;
  const sp = carSpeed(car);
  const fx = Math.cos(car.a), fy = Math.sin(car.a), rx = -fy, ry = fx;
  const soft = SOFT.has(car.surf);
  const wet = race.weather.sky === 'rain' && !race.weather.snow && !soft;
  const marking = !car.air && car.level === 0 && sp > 15 && (car.slip > 35 || (car.brk > 0.5 && sp > 110) || (soft && sp > 40) || (car.thr > 0.9 && sp < 60 && sp > 10 && !soft));
  const wl = [[-7, -5], [-7, 5]];
  if (marking) {
    const cur = wl.map(([a, b]) => P(car.x + fx * a + rx * b, car.y + fy * a + ry * b, car.z));
    if (car.skidPrev) {
      const g = race.skidCtx;
      g.strokeStyle = wet ? 'rgba(18,18,20,0.14)' : (SKID_COL[car.surf] || 'rgba(0,0,0,.2)');
      g.lineWidth = (soft ? 3 : 2.2) * projS(car.y); g.lineCap = 'round';
      g.beginPath();
      for (let i = 0; i < 2; i++) { g.moveTo(car.skidPrev[i][0], car.skidPrev[i][1]); g.lineTo(cur[i][0], cur[i][1]); }
      g.stroke();
    }
    car.skidPrev = cur;
  } else car.skidPrev = null;
  // Partikel: Staub, Erdbrocken, Reifenqualm, Gischt, Auspuff, Schadensrauch
  car.fxT = (car.fxT || 0) + dt;
  if (car.fxT > 0.035) {
    car.fxT = 0;
    const R = Math.random, z = car.z;
    Particles.fl = car.level === 0 ? terrainH(race.rt, car.x, car.y) : z;
    if (!car.air) for (const sd of [-1, 1]) {
      const bx = car.x - fx * 8 + rx * sd * 5, by = car.y - fy * 8 + ry * sd * 5;
      if (soft && sp > 40) {
        const dc = DUST_RGB[car.surf] || '160,140,110';
        const fast = clamp(sp / 260, 0, 1);
        if (R() < 0.7 + 0.3 * fast) Particles.add('puff', bx, by, z + 1, -car.vx * 0.12 + (R() - 0.5) * 30, -car.vy * 0.12 + (R() - 0.5) * 30, 6 + R() * 10, 0.9 + R() * 0.5 + fast * 0.9, 3 + R() * 2 + fast * 2, dc, 0, (car.surf === S.DIRT ? 18 : 12) + fast * 16);
        if (R() < 0.5) Particles.add('chunk', bx, by, z + 1, -car.vx * 0.2 + (R() - 0.5) * 50, -car.vy * 0.2 + (R() - 0.5) * 50, 30 + R() * 50, 0.6, 1.4 + R() * 1.4, DIRT_COL[car.surf], 360);
      } else if (wet && sp > 90 && R() < 0.75) Particles.add('puff', bx, by, z + 1, -car.vx * 0.15 + (R() - 0.5) * 25, -car.vy * 0.15 + (R() - 0.5) * 25, 10 + R() * 8, 0.55, 2.5, '210,218,228', 0, 10);
      else if (!soft && car.slip > 60 && R() < 0.85) { const k2 = clamp((car.slip - 60) / 140, 0, 1); Particles.add('puff', bx, by, z + 1, (R() - 0.5) * 20 - car.vx * 0.05, (R() - 0.5) * 20 - car.vy * 0.05, 8 + R() * 10, 1.1 + R() * 0.5 + k2 * 1.2, 4 + k2 * 2, '228,228,232', 0, 14 + k2 * 22); }
      else if (!soft && car.thr > 0.9 && sp < 45 && sp > 3 && car.cls.accel > 360 && R() < 0.6) Particles.add('puff', bx, by, z + 1, (R() - 0.5) * 16, (R() - 0.5) * 16, 6 + R() * 8, 1.2, 4, '235,235,238', 0, 20);   // Burnout beim Start
      if (car.puddle && sp > 60 && R() < 0.9) Particles.add('drop', bx, by, z + 1, rx * sd * 60 + (R() - 0.5) * 30, ry * sd * 60 + (R() - 0.5) * 30, 50 + R() * 60, 0.6, 1.6, '#cfe2f2', 420);
    }
    if (car.thr > 0.7 && sp < 150 && R() < 0.35) Particles.add('puff', car.x - fx * 13, car.y - fy * 13, z + 2, -fx * 30, -fy * 30, 6, 0.45, 1.5, '90,90,96', 0, 6);
    if (race.rules.dmgOn && car.damage > 65 && R() < (car.damage - 60) / 60) Particles.add('puff', car.x + fx * 8, car.y + fy * 8, z + 5, (R() - 0.5) * 10, (R() - 0.5) * 10, 18 + R() * 10, 1.3, 3, car.damage > 85 ? '40,40,40' : '90,90,90', 0, 12);
  }
}
const DUST_RGB = { [S.ASH]: '70,64,64',  [S.GRASS]: '120,110,80', [S.SAND]: '226,200,150', [S.GRAVEL]: '170,164,152', [S.SNOW]: '245,248,255', [S.ICE]: '230,244,255', [S.DIRT]: '170,140,104' };
const Particles = {
  list: [], fl: 0,
  clear() { this.list.length = 0; },
  /** type: puff | chunk | spark | drop | ring; z/vz = Höhe; g = Schwerkraft; grow = Wachstum (puff); Boden = this.fl */
  add(type, x, y, z, vx, vy, vz, life, size, col, g = 0, grow = 0) {
    if (this.list.length > 900) this.list.shift();
    this.list.push({ type, x, y, z, vx, vy, vz, life, max: life, size, col, g, grow, fl: this.fl });
  },
  sparks(x, y, n, z = 0) {
    this.fl = z;
    for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, v = 60 + Math.random() * 180; this.add('spark', x, y, z + 4, Math.cos(a) * v, Math.sin(a) * v, 20 + Math.random() * 90, 0.35 + Math.random() * 0.3, 1.5, '#ffd76a', 380); }
  },
  /** Kurzer heller Lichtblitz bei harten Einschlägen. */
  flash(x, y, z = 0) { this.add('ring', x, y, z + 3, 0, 0, 0, 0.25, 4, '255,230,160', 0, 0); this.add('puff', x, y, z + 4, 0, 0, 10, 0.3, 7, '255,240,200', 0, 8); },
  fire(x, y, z = 0) {
    for (let i = 0; i < 22; i++) { const a = Math.random() * 6.28, v = 10 + Math.random() * 40; this.add('puff', x, y, z + 2, Math.cos(a) * v, Math.sin(a) * v, 30 + Math.random() * 50, 0.7 + Math.random() * 0.5, 3, ['255,207,74', '255,138,42', '255,74,26'][i % 3], -20, 6); }
    for (let i = 0; i < 10; i++) this.add('puff', x, y, z + 6, (Math.random() - 0.5) * 20, (Math.random() - 0.5) * 20, 20 + Math.random() * 20, 1.6, 5, '50,46,46', 0, 10);
  },
  splash(x, y) {
    this.fl = 0;
    for (let i = 0; i < 26; i++) { const a = Math.random() * 6.28, v = 20 + Math.random() * 70; this.add('drop', x, y, 2, Math.cos(a) * v, Math.sin(a) * v, 60 + Math.random() * 110, 0.9, 1.6 + Math.random(), '#d8eeff', 420); }
    this.add('ring', x, y, 0, 0, 0, 0, 1.0, 6, '220,240,255');
    this.add('ring', x, y, 0, 0, 0, 0, 1.4, 3, '220,240,255');
  },
  landing(x, y, z, k, surf) {
    this.fl = z;
    const col = DUST_RGB[surf] || '200,200,205';
    for (let i = 0; i < 10 * k + 4; i++) { const a = Math.random() * 6.28, v = 30 + Math.random() * 60; this.add('puff', x, y, z + 1, Math.cos(a) * v, Math.sin(a) * v, 8, 0.8, 4, col, 0, 10); }
  },
  update(dt) {
    const L = this.list;
    for (let i = L.length - 1; i >= 0; i--) {
      const p = L[i]; p.life -= dt;
      if (p.life <= 0) { L.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.vz -= p.g * dt;
      const f = Math.pow(p.type === 'puff' ? 0.15 : 0.5, dt); p.vx *= f; p.vy *= f;
      if (p.type === 'puff') p.vz *= Math.pow(0.4, dt);
      if (p.z < p.fl) {
        if (p.type === 'spark') { p.z = p.fl; p.vz = -p.vz * 0.35; }
        else if (p.type === 'chunk' || p.type === 'drop') { L.splice(i, 1); continue; }
        else p.z = p.fl;
      }
    }
  },
  draw(ctx) {
    for (const p of this.list) {
      const k = p.life / p.max, s = projS(p.y);
      const [X, Y] = P(p.x, p.y, p.z);
      if (p.type === 'puff') {
        ctx.fillStyle = 'rgba(' + p.col + ',' + (0.42 * k).toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(X, Y, (p.size + (1 - k) * p.grow) * s, 0, 7); ctx.fill();
      } else if (p.type === 'spark') {
        const [X2, Y2] = P(p.x - p.vx * 0.025, p.y - p.vy * 0.025, p.z - p.vz * 0.025);
        ctx.strokeStyle = p.col; ctx.globalAlpha = Math.min(1, k * 1.5); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(X2, Y2); ctx.stroke(); ctx.globalAlpha = 1;
      } else if (p.type === 'ring') {
        ctx.strokeStyle = 'rgba(' + p.col + ',' + (0.7 * k).toFixed(3) + ')'; ctx.lineWidth = 1.5;
        const r = (p.size + (1 - k) * 22) * s;
        ctx.beginPath(); ctx.ellipse(X, Y, r, r * VIEW.T, 0, 0, 7); ctx.stroke();
      } else { ctx.fillStyle = p.col; ctx.globalAlpha = Math.min(1, k * 2); ctx.fillRect(X - p.size * s / 2, Y - p.size * s / 2, p.size * s, p.size * s); ctx.globalAlpha = 1; }
    }
  }
};
