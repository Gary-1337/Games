/* =====================================================================
   10c  PUNKT-ZU-PUNKT-RALLYE: Etappen aus mehreren bildschirmgroßen Abschnitten, allein gegen die Uhr
   Jeder Abschnitt ist intern eine geschlossene Linie; der Rückweg liegt außerhalb der Karte und wird nie befahren.
   Am Ausfahrtsrand (nach allen Checkpoints) beginnt der nächste Abschnitt am gegenüberliegenden Rand.
   ===================================================================== */
const RALLY_STAGES = [
  {
    id: 'forest', name: 'Waldetappe', desc: 'Schotter zwischen Bäumen, drei Abschnitte', theme: 'meadow', base: S.GRASS, road: S.DIRT, width: 56,
    extra: { trees: 140, treeGap: 12, bushes: 50, rocks: 20, noCurbs: true },
    sections: [
      { in: [0, 600], out: [1280, 250], via: [[150, 600], [330, 560], [430, 420], [330, 260], [430, 130], [630, 150], [710, 300], [640, 470], [790, 600], [990, 560], [1030, 380], [1140, 260]],
        hills: [[250, 380, 200, 46], [880, 720, 220, 40], [900, 260, 160, 34]] },
      { in: [0, 250], out: [900, 800], via: [[150, 250], [320, 200], [500, 280], [470, 450], [300, 560], [390, 700], [610, 690], [730, 530], [900, 440], [1080, 470], [1130, 620], [1000, 680], [900, 700]],
        hills: [[640, 120, 220, 50], [180, 420, 140, 30], [1150, 260, 180, 40]], pre(t) { paintDisc(t, 640, 380, 50, S.WATER); } },
      { in: [900, 0], out: [0, 480], via: [[900, 130], [1010, 260], [1150, 340], [1120, 510], [950, 570], [780, 470], [620, 380], [460, 450], [400, 610], [250, 670], [130, 560]],
        hills: [[560, 160, 260, 54], [820, 700, 200, 36], [200, 300, 160, 30]] }
    ]
  },
  {
    id: 'snow', name: 'Schneeetappe', desc: 'Asphalt mit Eisplatten, rutschig', theme: 'snow', base: S.SNOW, road: S.ASPHALT, width: 64,
    extra: { trees: 60, bushes: 8, rocks: 24, tiresAtCorners: true },
    sections: [
      { in: [0, 400], out: [1000, 0], via: [[150, 400], [330, 470], [520, 610], [710, 570], [770, 410], [630, 270], [680, 140], [860, 190], [960, 340], [1110, 300], [1080, 150], [1000, 90]],
        hills: [[300, 200, 200, 50], [1000, 600, 240, 52], [460, 330, 90, 18]], post(t) { paintDisc(t, 515, 600, 40, S.ICE, new Set([S.ASPHALT, S.CURB])); paintDisc(t, 1100, 300, 36, S.ICE, new Set([S.ASPHALT, S.CURB])); } },
      { in: [1000, 800], out: [1280, 200], via: [[1000, 670], [900, 560], [700, 600], [480, 640], [300, 560], [260, 380], [400, 250], [600, 320], [780, 230], [900, 130], [1080, 160], [1170, 200]],
        hills: [[640, 450, 200, 44], [180, 160, 200, 56], [1150, 420, 160, 40]], pre(t) { paintDisc(t, 560, 460, 46, S.ICE); }, post(t) { paintDisc(t, 300, 560, 40, S.ICE, new Set([S.ASPHALT, S.CURB])); } },
      { in: [0, 200], out: [1280, 620], via: [[150, 200], [360, 160], [530, 260], [490, 430], [300, 520], [420, 680], [640, 660], [770, 500], [900, 380], [1080, 420], [1160, 560]],
        hills: [[220, 380, 160, 40], [700, 240, 220, 50], [1000, 680, 200, 40]], post(t) { paintDisc(t, 900, 380, 40, S.ICE, new Set([S.ASPHALT, S.CURB])); paintDisc(t, 420, 680, 34, S.ICE, new Set([S.ASPHALT, S.CURB])); } }
    ]
  },
  {
    id: 'desert', name: 'Wüstenetappe', desc: 'Schnelle Pisten durch Sand und Dünen', theme: 'desert', base: S.SAND, road: S.DIRT, width: 66,
    extra: { trees: 24, bushes: 14, rocks: 36, runoff: S.GRAVEL },
    sections: [
      { in: [300, 800], out: [1280, 500], via: [[300, 680], [220, 540], [300, 380], [480, 330], [560, 180], [760, 140], [870, 280], [760, 430], [860, 570], [1060, 610], [1160, 520]],
        hills: [[640, 600, 200, 46], [1000, 200, 220, 56], [120, 200, 160, 40]] },
      { in: [0, 500], out: [1280, 300], via: [[150, 500], [320, 600], [520, 640], [630, 500], [520, 340], [600, 180], [800, 160], [910, 300], [1010, 460], [1170, 380]],
        hills: [[330, 300, 170, 50], [800, 650, 220, 44], [1150, 640, 160, 40]], pre(t) { paintDisc(t, 300, 330, 46, S.WATER); } },
      { in: [0, 300], out: [700, 0], via: [[150, 300], [300, 220], [480, 300], [530, 480], [400, 640], [600, 710], [820, 640], [900, 480], [1060, 420], [1150, 250], [1000, 160], [830, 180], [720, 100]],
        hills: [[260, 520, 160, 40], [700, 420, 140, 36], [1150, 650, 200, 50]] }
    ]
  }
];

/** Rand, auf dem ein Randpunkt liegt, als Richtung nach außen. */
function edgeDir(p) { return p[0] <= 0 ? [-1, 0] : p[0] >= W ? [1, 0] : p[1] <= 0 ? [0, -1] : [0, 1]; }
/** Position auf dem Umfang eines weit außen liegenden Rechtecks (im Uhrzeigersinn ab oben links). */
const RALLY_M = 900;
function boxPerim(x, y) {
  const x0 = -RALLY_M, y0 = -RALLY_M, x1 = W + RALLY_M, y1 = H + RALLY_M, w = x1 - x0, h = y1 - y0;
  const dl = x - x0, dr = x1 - x, dt = y - y0, db = y1 - y, m = Math.min(dl, dr, dt, db);
  if (m === dt) return clamp(x - x0, 0, w);
  if (m === dr) return w + clamp(y - y0, 0, h);
  if (m === db) return w + h + clamp(x1 - x, 0, w);
  return 2 * w + h + clamp(y1 - y, 0, h);
}
const boxCorners = () => { const x0 = -RALLY_M, y0 = -RALLY_M, x1 = W + RALLY_M, y1 = H + RALLY_M, w = x1 - x0, h = y1 - y0; return [[x1, y0, w], [x1, y1, w + h], [x0, y1, 2 * w + h], [x0, y0, 2 * w + 2 * h]]; };

const rallyCache = {};
/** Abschnitt k der Etappe als fertige Strecke (zwischengespeichert). */
function getRallySection(stage, k) {
  const key = stage.id + '_' + k;
  if (rallyCache[key]) return rallyCache[key];
  const sec = stage.sections[k];
  const di = edgeDir(sec.in), dO = edgeDir(sec.out);
  const inO = [sec.in[0] + di[0] * 420, sec.in[1] + di[1] * 420], outO = [sec.out[0] + dO[0] * 420, sec.out[1] + dO[1] * 420];
  // Rückweg außen herum (im Uhrzeigersinn) von outO nach inO
  const per = 2 * (W + H + 4 * RALLY_M);
  const pa = boxPerim(outO[0] + dO[0] * 120, outO[1] + dO[1] * 120), pb = boxPerim(inO[0] + di[0] * 120, inO[1] + di[1] * 120);
  const back = [[outO[0] + dO[0] * 120, outO[1] + dO[1] * 120]];
  const span = (pb - pa + per) % per;
  for (const [cx, cy, pc] of boxCorners().concat(boxCorners().map(c => [c[0], c[1], c[2] + per]))) {
    const d = pc - pa; if (d > 0 && d < span) back.push([cx, cy]);
  }
  back.push([inO[0] + di[0] * 120, inO[1] + di[1] * 120]);
  const ctrl = [inO, sec.in, ...sec.via, sec.out, outO, ...back];
  const def = {
    id: 'rally_' + key, name: stage.name + ' ' + (k + 1), theme: stage.theme, base: stage.base, road: stage.road, width: stage.width,
    seed: 500 + k * 17 + stage.id.length * 31, ctrl, start: sec.via[0], p2p: true, hills: sec.hills, pre: sec.pre, post: sec.post, ...stage.extra
  };
  const t = generateTrack(def);
  t.rallyIn = sec.in; t.rallyOut = sec.out;
  rallyCache[key] = t;
  return t;
}

const Rally = {
  cur: null,
  sel: 0,
  bestKey: id => 'cr_rally_' + id,
  best(id) { return store.get(this.bestKey(id), []); },

  /** Etappe starten. */
  start(idx) {
    const st = Options.data.setup, p = st.players[0];
    const stage = RALLY_STAGES[idx];
    this.cur = { idx, stage, sec: 0, splits: [], carry: null, player: { name: Options.data.names[0], cls: p.cls, color: COLORS[p.color] }, weather: resolveWeather(st.rallyWx || 0, 0) };
    // Alle Abschnitte vorab aufbauen, damit der Wechsel am Bildrand ohne Ruckler klappt
    toast('Etappe wird vorbereitet …', 1500);
    const cur = this.cur;
    setTimeout(() => {
      if (this.cur !== cur) return;
      cur.pre = [];
      for (let k = 1; k < stage.sections.length; k++) { cur.sec = k; cur.pre[k] = createRace(this.cfg()); }
      cur.sec = 0;
      Game.startRace(this.cfg());
    }, 60);
  },
  cfg() {
    const c = this.cur;
    return { mode: 'rally', track: getRallySection(c.stage, c.sec), laps: 1, ai: 0, diff: 0, players: [c.player], weather: c.weather,
      rules: { fuelOn: false, fuelPct: 100, tireOn: false, tirePct: 100, dmgOn: true, dmgPct: 100, pits: false, powerups: false } };
  },
  restart() { if (this.cur) this.start(this.cur.idx); },

  /** Jeder Physikschritt: Ausfahrt erreicht? */
  check(race) {
    const c = this.cur; if (!c) return;
    const car = race.cars.find(x => x.human === 0); if (!car || car.finished || car.sink > 0) return;
    const out = c.stage.sections[race.secInfo ? race.secInfo.k : c.sec].out, d = edgeDir(out);
    const toEdge = d[0] < 0 ? car.x : d[0] > 0 ? W - car.x : d[1] < 0 ? car.y : H - car.y;
    const along = Math.abs(d[0] ? car.y - out[1] : car.x - out[0]);
    if (toEdge > 40 || along > 220 || car.vx * d[0] + car.vy * d[1] < -5) return;
    if (!(car.lap >= 1 && car.nextCp === 0)) {
      if (!car.exitWarnT || race.time - car.exitWarnT > 2) { car.exitWarnT = race.time; flashMsg(car, 'CHECKPOINT VERPASST – zurück!', '#ffcd32'); if (race.audible) Sound.beep(330, 0.25, 'square', 0.12); }
      return;
    }
    c.splits.push(race.t);
    if (c.sec + 1 >= c.stage.sections.length) {
      finishCar(car, race);
      race.state = 'ending'; race.endT = 1.6;
      return;
    }
    c.carry = { speed: Math.max(80, fwdSpeed(car)), damage: car.damage };
    c.sec++;
    this.nextSection();
  },
  /** Nächsten Abschnitt nahtlos laden: Auto am Einfahrtsrand mit gleichem Tempo. */
  nextSection() {
    const c = this.cur;
    const R = (c.pre && c.pre[c.sec]) || createRace(this.cfg());
    if (c.pre) c.pre[c.sec] = null;
    cycleCameraRes(R);
    Particles.clear();
    R.state = 'running'; R.cd = 0; R.t = 0; R.goT = 0; R.lastBeep = 0;
    const car = R.cars[0], rt = R.rt, inP = c.stage.sections[c.sec].in, d = edgeDir(inP);
    const px = inP[0] - d[0] * 40, py = inP[1] - d[1] * 40;
    const pr = projectLine(rt, px, py, null, 0);
    const p = lineAtS(rt, pr.s);
    placeOnLine(car, rt, p.x, p.y, p.a, pr.i);
    car.idx = pr.i; car.s = pr.s; car.lastValidS = pr.s;
    car.vx = Math.cos(p.a) * c.carry.speed; car.vy = Math.sin(p.a) * c.carry.speed; car.damage = c.carry.damage;
    car.freeze = 0; car.resetMsg = 0;
    flashMsg(car, 'ABSCHNITT ' + (c.sec + 1) + '/' + c.stage.sections.length + ' · ' + fmtTime(c.splits.reduce((a, b) => a + b, 0)), '#ffffff');
    if (Game.race) { R.cam = Game.race.cam; if (R.cam) R.cam.init = false; }
    Game.race = R; Game.acc = 0;
  },
  total() { const c = this.cur; return c ? c.splits.reduce((a, b) => a + b, 0) + (Game.race && Game.race.mode === 'rally' && c.splits.length <= c.sec ? Game.race.t : 0) : 0; },

  /** Etappe beendet → Bestzeit speichern, Ergebnis anzeigen. */
  done(R) {
    const c = this.cur, total = c.splits.reduce((a, b) => a + b, 0);
    const list = this.best(c.stage.id);
    const rec = { name: c.player.name, time: total, splits: c.splits.slice(), cls: CLASSES[c.player.cls].name, date: new Date().toLocaleDateString('de-AT') };
    list.push(rec); list.sort((a, b) => a.time - b.time);
    const top = list.slice(0, 10); store.set(this.bestKey(c.stage.id), top);
    const rank = top.indexOf(rec) + 1;
    Music.setDuck(1); Music.play(rank === 1 ? 'podium' : 'menu');
    if (rank === 1 && R.audible) Speaker.say('Neue Bestzeit auf der ' + c.stage.name + '!', 'rrec', 8, 2);
    const best = top[0];
    let rows = c.splits.map((t, k) => {
      const b = best && best !== rec && best.splits && best.splits[k] != null ? t - best.splits[k] : null;
      return `<tr><td class="pos">${k + 1}</td><td>Abschnitt ${k + 1}</td><td>${fmtTime(t)}</td><td>${b == null ? '' : `<span style="color:${b <= 0 ? '#47d48a' : '#ff8a3d'}">${b <= 0 ? '−' : '+'}${Math.abs(b).toFixed(2)}</span>`}</td></tr>`;
    }).join('');
    rows += `<tr class="me"><td></td><td><b>Gesamt</b></td><td><b>${fmtTime(total)}</b></td><td>${rank === 1 ? '<b style="color:#ffd23e">BESTZEIT!</b>' : rank ? 'Platz ' + rank : ''}</td></tr>`;
    const board = top.map((r, i) => `<tr class="${r === rec ? 'me' : ''}"><td class="pos">${i + 1}</td><td>${escapeHtml(r.name)}</td><td>${escapeHtml(r.cls)}</td><td>${fmtTime(r.time)}</td><td class="note">${r.date}</td></tr>`).join('');
    Game.state = 'results';
    $('scr-results').innerHTML = `<div class="dim"></div><div class="wrap">
      <div class="head" style="margin-bottom:12px"><h2>Rallye – ${escapeHtml(c.stage.name)}</h2><div class="spacer"></div><span class="note">${escapeHtml(CLASSES[c.player.cls].name)} · Schaden ${Math.round(R.cars[0].damage)}%</span></div>
      <div class="cols"><div class="col" style="flex:1;height:560px"><h3>Deine Fahrt</h3><table class="tbl"><tr><th></th><th>Abschnitt</th><th>Zeit</th><th>zur Bestzeit</th></tr>${rows}</table></div>
      <div class="col" style="flex:1;height:560px"><h3>Bestzeiten</h3><table class="tbl"><tr><th>Pl.</th><th>Fahrer</th><th>Auto</th><th>Zeit</th><th>Datum</th></tr>${board}</table></div></div>
      <div class="startbar"><button class="btn" data-act="menu">Hauptmenü</button><button class="btn" data-act="setup">Andere Etappe</button><button class="btn primary big" data-act="again">Nochmal fahren ▶</button></div></div>`;
    showScreen('scr-results');
  },

  /* ---------- Auswahl-Bildschirm ---------- */
  ui() {
    UI.mode = 'rally';
    const st = Options.data.setup, p = st.players[0];
    const stage = RALLY_STAGES[this.sel] || RALLY_STAGES[0];
    let list = '<h3>Etappe</h3><div class="tlist" style="grid-template-columns:1fr">';
    for (let i = 0; i < RALLY_STAGES.length; i++) {
      const s = RALLY_STAGES[i], b = this.best(s.id)[0];
      list += `<div class="titem ${i === this.sel ? 'on' : ''}" data-act="rstage" data-v="${i}">${escapeHtml(s.name)}<span class="tag">${b ? fmtTime(b.time) : ''}</span></div>`;
    }
    list += `</div><div class="note" style="margin-top:12px;line-height:1.5">${escapeHtml(stage.desc)}.<br>Allein gegen die Uhr über ${stage.sections.length} Abschnitte. Am Bildrand geht es nahtlos in den nächsten Abschnitt – vorher müssen alle Checkpoints durchfahren sein. Schaden bleibt über die ganze Etappe erhalten.</div>`;
    let prev = '<h3>Abschnitte</h3><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">';
    stage.sections.forEach((_, k) => { prev += `<div><canvas class="rprev" data-k="${k}" width="448" height="280" style="width:100%;border-radius:6px;border:1px solid var(--line)"></canvas><div class="note">Abschnitt ${k + 1}</div></div>`; });
    prev += '</div>';
    const b = this.best(stage.id)[0];
    if (b) prev += `<div class="note" style="margin-top:10px">Bestzeit: <b>${fmtTime(b.time)}</b> – ${escapeHtml(b.name)} (${escapeHtml(b.cls)})${b.splits ? ' · ' + b.splits.map(fmtTime).join(' / ') : ''}</div>`;
    let plCol = `<h3>Fahrer</h3><div class="prow"><div class="top"><span class="badge" style="background:${COLORS[p.color]}">P1</span><span style="font-weight:600">${escapeHtml(Options.data.names[0])}</span><span class="keys">Pfeiltasten oder WASD · Reset R · Checkpoint Leertaste</span></div>
      <div class="row" style="margin:4px 0">${seg('cls0', CLASSES.map(c => c.name), p.cls).replace('class="seg"', 'class="seg small"')}</div>
      <div class="clsrow"><canvas class="car3d" width="300" height="150" data-i="0"></canvas><div class="clsdesc">${CLASSES[p.cls].desc}</div></div>
      <div class="swatches" style="margin-top:8px">${COLORS.map((c, k) => `<span class="sw ${k === p.color ? 'on' : ''}" style="background:${c}" data-act="color0" data-v="${k}"></span>`).join('')}</div></div>`;
    plCol += `<div class="row" style="margin-top:14px"><label class="l">Wetter</label>${seg('rwx', WEATHER_OPTS.map(w => w[1]), st.rallyWx || 0)}</div>`;
    $('scr-setup').innerHTML = `<div class="dim"></div><div class="wrap">
      <div class="head"><button class="btn" data-act="back">← Zurück</button><h2>Rallye – Punkt zu Punkt</h2><div class="spacer"></div></div>
      <div class="cols"><div class="col" style="width:300px">${list}</div><div class="col" style="width:560px">${prev}</div><div class="col" style="flex:1">${plCol}</div></div>
      <div class="startbar"><button class="btn primary big" data-act="start">Etappe starten ▶</button></div></div>`;
    showScreen('scr-setup');
    // Vorschaubilder nacheinander erzeugen (Generierung dauert etwas)
    const tok = this.uiTok = (this.uiTok || 0) + 1;
    const cvs = [...document.querySelectorAll('#scr-setup canvas.rprev')];
    const draw = k => {
      if (tok !== this.uiTok || k >= cvs.length) return;
      const t = getRallySection(stage, k), pv = trackPreview(t.id, t);
      if (pv) cvs[k].getContext('2d').drawImage(pv, 0, 0);
      setTimeout(() => draw(k + 1), 20);
    };
    setTimeout(() => draw(0), 30);
    UI.startSetupAnim(null, null, 1);
  },
  uiAct(act, v) {
    const st = Options.data.setup, p = st.players[0];
    if (act === 'back') { Options.save(); UI.mode = 'quick'; UI.main(); return; }
    if (act === 'start') { Options.save(); this.start(this.sel); return; }
    if (act === 'rstage') this.sel = +v;
    else if (act === 'cls0') p.cls = +v;
    else if (act === 'color0') p.color = +v;
    else if (act === 'rwx') st.rallyWx = +v;
    else return;
    Sound.click(); this.ui();
  }
};
