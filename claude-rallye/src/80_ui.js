/* =====================================================================
   13  MENÜS, OPTIONEN, BESTENLISTE, CHAMPIONSHIP
   ===================================================================== */
const $ = id => document.getElementById(id);
const WEATHER_OPTS = [['clear', 'Klar'], ['cloudy', 'Bewölkt'], ['rain', 'Regen'], ['random', 'Zufall']];
const TIME_OPTS = [['day', 'Tag'], ['dusk', 'Abend'], ['night', 'Nacht'], ['random', 'Zufall']];
/** Wetterwahl aus dem Setup auflösen (Zufall → konkret). */
function resolveWeather(wi, ti) {
  let sky = (WEATHER_OPTS[wi || 0] || WEATHER_OPTS[0])[0], time = (TIME_OPTS[ti || 0] || TIME_OPTS[0])[0];
  if (sky === 'random') sky = ['clear', 'clear', 'cloudy', 'rain'][Math.floor(Math.random() * 4)];
  if (time === 'random') time = ['day', 'day', 'dusk', 'night'][Math.floor(Math.random() * 4)];
  return { sky, time };
}
const WX_LABEL = wx => ({ clear: 'Klar', cloudy: 'Bewölkt', rain: wx.snow ? 'Schneefall' : 'Regen' }[wx.sky] + ' · ' + { day: 'Tag', dusk: 'Abend', night: 'Nacht' }[wx.time]);
const QMODES = [['quick', 'Rennen'], ['elim', 'Ausscheidung'], ['derby', 'Derby']];
const DERBY_TIMES = [120, 180, 300];
const DEFAULT_RULES = { fuelOn: true, fuelPct: 100, tireOn: true, tirePct: 100, dmgOn: true, dmgPct: 100, pits: true };
const Options = {
  data: null,
  defaults() {
    return {
      names: ['Spieler 1', 'Spieler 2', 'Spieler 3', 'Spieler 4'], volume: 70, sound: true, engine: true, showCps: false,
      music: true, musicVol: 55, raceMusic: true, aiEngines: true, touch: 0, camera: 1, commentary: false,
      setup: {
        trackId: 'oval', laps: 5, ai: 5, diff: 2, aiCls: -1, humans: 1, weather: 0, time: 0, qmode: 0, derbyTrack: 'arena_mud', derbyTime: 1,
        players: [{ cls: 1, color: 0 }, { cls: 1, color: 1 }, { cls: 1, color: 2 }, { cls: 1, color: 3 }],
        rules: { ...DEFAULT_RULES }, champTracks: TRACK_DEFS.map(d => d.id), trialTrack: 'oval', trialLaps: 5,
        trialRules: { fuelOn: false, fuelPct: 100, tireOn: false, tirePct: 100, dmgOn: true, dmgPct: 100, pits: true }
      }
    };
  },
  load() {
    const d = this.defaults(), s = store.get('cr_options', {});
    this.data = { ...d, ...s, setup: { ...d.setup, ...(s.setup || {}) } };
    // 1.7.0-beta3: Kommentator standardmäßig aus (auch bei bestehenden Einstellungen einmalig ausschalten)
    if (!s.commV) { this.data.commentary = false; this.data.commV = 1; }
    this.data.setup.rules = { ...DEFAULT_RULES, ...this.data.setup.rules };
    this.data.setup.trialRules = { ...d.setup.trialRules, ...this.data.setup.trialRules };
    if (!Array.isArray(this.data.names) || this.data.names.length < 4) this.data.names = d.names;
    if (!Array.isArray(this.data.setup.players) || this.data.setup.players.length < 4) this.data.setup.players = d.setup.players;
  },
  save() { store.set('cr_options', this.data); }
};

/* ---------- Kleine UI-Helfer ---------- */
/** Vollbild an/aus (auf Handys zusätzlich Querformat sperren, falls erlaubt). */
function toggleFullscreen() {
  const d = document, el = d.documentElement;
  try {
    if (d.fullscreenElement || d.webkitFullscreenElement) (d.exitFullscreen || d.webkitExitFullscreen).call(d);
    else {
      const p = (el.requestFullscreen || el.webkitRequestFullscreen).call(el);
      if (p && p.then) p.then(() => { try { screen.orientation.lock('landscape').catch(() => {}); } catch (e) { /* nicht unterstützt */ } }).catch(() => toast('Vollbild wird hier nicht unterstützt.'));
    }
  } catch (e) { toast('Vollbild wird hier nicht unterstützt.'); }
}
function toast(msg, ms = 2200) {
  const el = document.createElement('div'); el.className = 'toastmsg'; el.textContent = msg;
  $('toast').appendChild(el); setTimeout(() => el.remove(), ms);
}
/** Dialog mit Knöpfen. buttons: [{label, value, primary}] → Promise(value) */
function dialog(text, buttons) {
  return new Promise(res => {
    $('dlg-text').textContent = text;
    const acts = $('dlg-acts'); acts.innerHTML = '';
    buttons.forEach(b => {
      const el = document.createElement('button'); el.className = 'btn' + (b.primary ? ' primary' : '') + (b.danger ? ' danger' : '');
      el.textContent = b.label;
      el.onclick = () => { $('dialog').classList.remove('on'); res(b.value); };
      acts.appendChild(el);
    });
    $('dialog').classList.add('on');
  });
}
const confirmDlg = (text, yes = 'Ja') => dialog(text, [{ label: 'Abbrechen', value: false }, { label: yes, value: true, primary: true }]);
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.toggle('on', s.id === id));
  UI.current = id;
}
const seg = (act, items, cur) => '<div class="seg">' + items.map((t, i) => `<button data-act="${act}" data-v="${i}" class="${i === cur ? 'on' : ''}">${t}</button>`).join('') + '</div>';
const stepper = (act, v) => `<div class="stepper"><button data-act="${act}" data-v="-1">−</button><span>${v}</span><button data-act="${act}" data-v="1">+</button></div>`;
const tog = (act, on) => `<button class="tog ${on ? 'on' : ''}" data-act="${act}"></button>`;

const UI = {
  current: null,
  mode: 'quick',
  boardTrack: 'oval',

  /* ---------- Hauptmenü ---------- */
  main() {
    Music.setDuck(1); Music.play('menu');
    $('scr-main').innerHTML = `<div class="dim" style="background:linear-gradient(90deg,rgba(7,9,13,.9),rgba(7,9,13,.55) 45%,rgba(7,9,13,.15))"></div>
      <div class="logo"><h1>CLAUDE<br><span>RALLYE</span></h1><div class="sub">Arcade-Rennen · Top-Down</div></div>
      <div class="mainmenu">
        <button class="mbtn" data-act="career"><span class="ico">★</span><span>Karriere<small>Ligen, Preisgeld, neue Autos</small></span></button>
        <button class="mbtn" data-act="quick"><span class="ico">▶</span><span>Schnelles Rennen<small>Rennen, Ausscheidung oder Demolition Derby</small></span></button>
        <button class="mbtn" data-act="trial"><span class="ico">⏱</span><span>Zeitfahren<small>Gegen die Uhr und den eigenen Ghost</small></span></button>
        <button class="mbtn" data-act="champ"><span class="ico">🏆</span><span>Championship<small>Mehrere Rennen, Punktewertung</small></span></button>
        <button class="mbtn" data-act="editor"><span class="ico">✎</span><span>Streckeneditor<small>Eigene Kurse malen und teilen</small></span></button>
        <button class="mbtn" data-act="board"><span class="ico">≡</span><span>Bestenliste<small>Rundenrekorde je Strecke</small></span></button>
        <button class="mbtn" data-act="options"><span class="ico">⚙</span><span>Optionen<small>Namen, Sound, Steuerung</small></span></button>
      </div>
      <button class="btn fsbtn" data-act="fullscreen">⛶ Vollbild</button>
      <div class="hint">${Touch.enabled() ? 'Touch: links lenken · rechts Gas und Bremse · oben links Pause, Reset und ⚑ Checkpoint · ' : ''}Allein: Pfeiltasten oder WASD · Mehrspieler: Spieler 1 Pfeiltasten · Spieler 2: WASD · Spieler 3: IJKL · Spieler 4: Numpad 8/5/4/6 · Gamepads werden automatisch erkannt</div>
      <div class="version">Claude Rallye v${VERSION}</div>`;
    showScreen('scr-main');
  },

  /* ---------- Renn-Setup (Schnelles Rennen / Zeitfahren / Championship) ---------- */
  setup(mode) {
    if (mode === 'elim' || mode === 'derby') { Options.data.setup.qmode = QMODES.findIndex(q => q[0] === mode); mode = 'quick'; }
    if (mode) this.mode = mode;
    const m = this.mode, st = Options.data.setup, names = Options.data.names;
    const trial = m === 'trial', champ = m === 'champ';
    const qm = m === 'quick' ? QMODES[st.qmode || 0][0] : m, derby = qm === 'derby', elim = qm === 'elim';
    const rules = trial ? st.trialRules : st.rules;
    const humans = trial ? 1 : st.humans;
    const tracks = derby ? arenaInfos() : allTrackInfos();
    const selTrack = derby ? st.derbyTrack : trial ? st.trialTrack : st.trackId;
    if (!tracks.some(t => t.id === selTrack)) { if (derby) st.derbyTrack = 'arena_mud'; else if (trial) st.trialTrack = 'oval'; else st.trackId = 'oval'; }
    const curTrack = derby ? st.derbyTrack : trial ? st.trialTrack : st.trackId;
    const title = { quick: 'Schnelles Rennen', trial: 'Zeitfahren', champ: 'Championship' }[m];
    let trackCol = '<h3>' + (derby ? 'Arena' : 'Strecke' + (champ ? 'n' : '')) + '</h3><div class="tlist">';
    for (const t of tracks) {
      if (champ) trackCol += `<label class="titem ${st.champTracks.includes(t.id) ? 'on' : ''}"><input type="checkbox" data-act="champTrack" data-v="${t.id}" ${st.champTracks.includes(t.id) ? 'checked' : ''}>${escapeHtml(t.name)}<span class="tag">${t.custom ? 'Eigene' : ''}</span></label>`;
      else trackCol += `<div class="titem ${t.id === curTrack ? 'on' : ''}" data-act="track" data-v="${t.id}">${escapeHtml(t.name)}<span class="tag">${t.custom ? 'Eigene' : ''}</span></div>`;
    }
    trackCol += '</div>';
    if (!champ) {
      const recs = getRecords(curTrack);
      trackCol += `<canvas class="preview" width="448" height="280"></canvas><div class="note" style="margin-top:8px">${derby ? 'Letztes fahrbereites Auto gewinnt.' : 'Rundenrekord: ' + (recs[0] ? fmtTime(recs[0].time) + ' – ' + escapeHtml(recs[0].name) : 'noch keiner')}</div>`;
    } else trackCol += `<div class="note" style="margin-top:10px">${st.champTracks.length} Rennen ausgewählt. Punkte: ${POINTS.join('-')}, +1 für die schnellste Runde.</div>`;

    let raceCol = '<h3>Rennen</h3>';
    if (m === 'quick') raceCol += `<div class="row"><label class="l">Modus</label>${seg('qmode', QMODES.map(q => q[1]), st.qmode || 0)}</div>`;
    if (derby) raceCol += `<div class="row"><label class="l">Zeitlimit</label>${seg('derbyTime', DERBY_TIMES.map(t => t / 60 + ' Min'), st.derbyTime)}</div>`;
    else if (elim) raceCol += `<div class="row"><label class="l">Runden</label><span class="note">automatisch: Fahrerzahl − 1. Nach jeder Runde scheidet der Letzte aus.</span></div>`;
    else raceCol += `<div class="row"><label class="l">Runden</label>${stepper('laps', trial ? st.trialLaps : st.laps)}</div>`;
    if (!trial) {
      raceCol += `<div class="row"><label class="l">KI-Gegner</label>${stepper('ai', Math.min(st.ai, MAX_CARS - humans))}</div>`;
      raceCol += `<div class="row"><label class="l">KI-Stufe</label>${seg('diff', DIFFS.map(d => d.name), st.diff)}</div>`;
      raceCol += `<div class="row"><label class="l">KI-Autos</label><select data-act="aiCls" class="selbox">${['Gemischt', ...CLASSES.map(c => c.name)].map((n, i) => `<option value="${i}" ${i === st.aiCls + 1 ? 'selected' : ''}>${n}</option>`).join('')}</select></div>`;
    }
    raceCol += `<div class="row"><label class="l">Wetter</label>${seg('weather', WEATHER_OPTS.map(w => w[1]), st.weather || 0)}</div>`;
    raceCol += `<div class="row"><label class="l">Tageszeit</label>${seg('time', TIME_OPTS.map(w => w[1]), st.time || 0)}</div>`;
    if (derby) {
      raceCol += '<h3 style="margin-top:22px">Regeln</h3>';
      raceCol += `<div class="row"><label class="l">Schadensstärke</label><input type="range" min="25" max="300" step="25" value="${rules.dmgPct}" data-act="pct" data-v="dmgPct"><span class="pct">${rules.dmgPct}%</span></div>`;
      raceCol += `<div class="note" style="margin-top:14px;line-height:1.5">Rammen mit der <b>Front</b> schont dein Auto, Treffer ins <b>Heck</b> und in die Seite schaden mehr.<br>Bei 100 % Schaden bleibt das Auto als Wrack liegen. Kein Sprit, keine Reifen, keine Box.<br>Ist die Zeit um, gewinnt das Auto mit dem geringsten Schaden.</div>`;
    } else {
    raceCol += '<h3 style="margin-top:22px">Regeln</h3>';
    const ruleRow = (label, on, pctKey, onKey) => `<div class="row"><label class="l">${label}</label>${tog('rule', on).replace('data-act="rule"', `data-act="rule" data-v="${onKey}"`)}
      <input type="range" min="25" max="300" step="25" value="${rules[pctKey]}" data-act="pct" data-v="${pctKey}" ${on ? '' : 'disabled'}><span class="pct">${rules[pctKey]}%</span></div>`;
    raceCol += ruleRow('Spritverbrauch', rules.fuelOn, 'fuelPct', 'fuelOn');
    raceCol += ruleRow('Reifenverschleiß', rules.tireOn, 'tirePct', 'tireOn');
    raceCol += ruleRow('Schadensmodell', rules.dmgOn, 'dmgPct', 'dmgOn');
    raceCol += `<div class="row"><label class="l">Boxenstopps</label>${tog('rule', rules.pits).replace('data-act="rule"', 'data-act="rule" data-v="pits"')}</div>`;
    raceCol += `<div class="note" style="margin-top:14px;line-height:1.5">Boxenstopp: in den gelben Boxenbereich fahren, anhalten, dann<br><b>Links</b> = Reparatur · <b>Unten</b> = Tanken · <b>Rechts</b> = Reifen.<br>In der Boxengasse gilt ein Tempolimit.</div>`;
    }

    let plCol = '<h3>Fahrer</h3>';
    if (!trial) plCol += `<div class="row"><label class="l">Spieler</label>${seg('humans', ['1', '2', '3', '4'], st.humans - 1)}</div>`;
    for (let i = 0; i < humans; i++) {
      const p = st.players[i];
      plCol += `<div class="prow"><div class="top"><span class="badge" style="background:${COLORS[p.color]}">P${i + 1}</span>
        <input class="name" data-act="name" data-v="${i}" value="${escapeHtml(names[i])}" maxlength="14">
        <span class="keys">${humans === 1 && i === 0 ? 'Pfeiltasten oder WASD · Reset R · Checkpoint Leertaste' : KEYMAP[i].label + ' · Reset ' + KEYMAP[i].resetLabel + ' · Checkpoint ' + KEYMAP[i].cpLabel}</span></div>
        <div class="row" style="margin:4px 0">${seg('cls' + i, CLASSES.map(c => c.name), p.cls).replace('class="seg"', 'class="seg small"')}</div>
        <div class="clsdesc">${CLASSES[p.cls].desc}</div>
        <div class="swatches" style="margin-top:8px">${COLORS.map((c, k) => `<span class="sw ${k === p.color ? 'on' : ''}" style="background:${c}" data-act="color${i}" data-v="${k}"></span>`).join('')}</div></div>`;
    }
    const startLabel = champ ? 'Championship starten' : trial ? 'Zeitfahren starten' : derby ? 'Derby starten' : elim ? 'Ausscheidung starten' : 'Rennen starten';
    $('scr-setup').innerHTML = `<div class="dim"></div><div class="wrap">
      <div class="head"><button class="btn" data-act="back">← Zurück</button><h2>${title}</h2><div class="spacer"></div></div>
      <div class="cols"><div class="col" style="width:420px">${trackCol}</div><div class="col" style="width:470px">${raceCol}</div><div class="col" style="flex:1">${plCol}</div></div>
      <div class="startbar"><button class="btn primary big" data-act="start">${startLabel} ▶</button></div></div>`;
    const cv = $('scr-setup').querySelector('canvas.preview');
    if (cv) { const pv = trackPreview(curTrack); if (pv) cv.getContext('2d').drawImage(pv, 0, 0); }
    showScreen('scr-setup');
  },
  setupAct(act, v, el) {
    const st = Options.data.setup, trial = this.mode === 'trial', rules = trial ? st.trialRules : st.rules;
    const usedColors = (except) => st.players.slice(0, trial ? 1 : st.humans).map((p, i) => i === except ? -1 : p.color);
    if (act === 'back') { Options.save(); this.main(); return; }
    if (act === 'start') { Options.save(); Game.startFromSetup(this.mode); return; }
    const derby = this.mode === 'quick' && QMODES[st.qmode || 0][0] === 'derby';
    if (act === 'track') { if (derby) st.derbyTrack = v; else if (trial) st.trialTrack = v; else st.trackId = v; }
    else if (act === 'qmode') st.qmode = +v;
    else if (act === 'derbyTime') st.derbyTime = +v;
    else if (act === 'champTrack') {
      const i = st.champTracks.indexOf(v);
      if (i >= 0) st.champTracks.splice(i, 1); else st.champTracks.push(v);
      const order = allTrackInfos().map(t => t.id); st.champTracks.sort((a, b) => order.indexOf(a) - order.indexOf(b));
    }
    else if (act === 'laps') { if (trial) st.trialLaps = clamp(st.trialLaps + +v, 1, 50); else st.laps = clamp(st.laps + +v, 1, 50); }
    else if (act === 'ai') st.ai = clamp(Math.min(st.ai, MAX_CARS - st.humans) + +v, 0, MAX_CARS - st.humans);
    else if (act === 'diff') st.diff = +v;
    else if (act === 'aiCls') { st.aiCls = +el.value - 1; Options.save(); return; }
    else if (act === 'weather') st.weather = +v;
    else if (act === 'time') st.time = +v;
    else if (act === 'humans') {
      st.humans = +v + 1; st.ai = Math.min(st.ai, MAX_CARS - st.humans);
      // doppelte Farben auflösen
      for (let i = 1; i < st.humans; i++) while (usedColors(i).includes(st.players[i].color)) st.players[i].color = (st.players[i].color + 1) % COLORS.length;
    }
    else if (act === 'rule') rules[v] = !rules[v];
    else if (act === 'pct') { rules[v] = +el.value; el.nextElementSibling.textContent = el.value + '%'; return; }
    else if (act.startsWith('cls')) st.players[+act.slice(3)].cls = +v;
    else if (act.startsWith('color')) {
      const i = +act.slice(5);
      if (usedColors(i).includes(+v)) { toast('Diese Farbe fährt schon ein anderer Spieler.'); return; }
      st.players[i].color = +v;
    }
    else return;
    Sound.click();
    this.setup();
  },

  /* ---------- Ergebnis ---------- */
  results(R, extra) {
    const trial = R.mode === 'trial';
    let rows = '';
    if (R.mode === 'derby') {
      for (const r of R.results) rows += `<tr class="${r.human >= 0 ? 'me' : ''}"><td class="pos">${r.pos}</td><td><span class="chip" style="background:${r.color}"></span>${escapeHtml(r.name)}${r.human >= 0 ? ' <span class="note">P' + (r.human + 1) + '</span>' : ''}</td>
        <td>${r.cls}</td><td>${r.gap}</td><td>${r.damage}%</td><td>${r.hits}</td>${R.mode === 'champ' || R.career ? `<td><b>${r.champPts}</b></td>` : ''}</tr>`;
    } else for (const r of R.results) {
      const lapsHtml = r.laps.map(t => t === r.best ? '<b>' + fmtTime(t) + '</b>' : fmtTime(t)).join(' · ');
      rows += `<tr class="${r.human >= 0 ? 'me' : ''}"><td class="pos">${trial ? '' : r.pos}</td><td><span class="chip" style="background:${r.color}"></span>${escapeHtml(r.name)}${r.human >= 0 ? ' <span class="note">P' + (r.human + 1) + '</span>' : ''}</td>
        <td>${r.cls}</td><td>${r.total != null ? fmtTime(r.total) : '–'}</td><td>${trial ? '' : r.gap}</td><td>${r.best != null ? fmtTime(r.best) : '–'}</td>
        ${R.mode === 'champ' || R.career ? `<td><b>${r.champPts}</b></td>` : ''}<td class="laps">${lapsHtml || '–'}</td></tr>`;
    }
    const fastest = R.results.filter(r => r.best != null).sort((a, b) => a.best - b.best)[0];
    let btns = '';
    if (R.career) btns = '<button class="btn primary big" data-act="careerNext">Zur Tabelle ▶</button>';
    else if (R.mode === 'champ') btns = '<button class="btn primary big" data-act="champNext">Zur Gesamtwertung ▶</button>';
    else if (R.mode === 'test') btns = '<button class="btn" data-act="again">Nochmal</button><button class="btn primary big" data-act="editor">Zurück zum Editor</button>';
    else btns = '<button class="btn" data-act="menu">Hauptmenü</button><button class="btn" data-act="setup">Einstellungen</button><button class="btn primary big" data-act="again">Nochmal fahren ▶</button>';
    const recs = getRecords(R.trackId);
    $('scr-results').innerHTML = `<div class="dim"></div><div class="wrap">
      <div class="head" style="flex-wrap:wrap;row-gap:4px;margin-bottom:12px"><h2>${trial ? 'Zeitfahren' : R.mode === 'derby' ? 'Demolition Derby' : R.mode === 'elim' ? 'Ausscheidung' : 'Ergebnis'} – ${escapeHtml(R.trackName)}</h2>
      <span class="note" style="flex-basis:100%">${R.mode === 'derby' ? 'Zeitlimit ' + R.timeLimit / 60 + ' Min · ' + R.outCount + ' Wracks' : R.laps + ' Runden' + (fastest ? ' · Schnellste Runde: ' + fmtTime(fastest.best) + ' (' + escapeHtml(fastest.name) + ')' : '') + (recs[0] ? ' · Streckenrekord: ' + fmtTime(recs[0].time) : '')}</span></div>
      <div class="col" style="height:590px"><table class="tbl">${R.mode === 'derby'
        ? `<tr><th>Pl.</th><th>Fahrer</th><th>Auto</th><th>Ergebnis</th><th>Schaden</th><th>Treffer</th>${R.career ? '<th>Punkte</th>' : ''}</tr>`
        : `<tr><th>${trial ? '' : 'Pl.'}</th><th>Fahrer</th><th>Auto</th><th>Gesamtzeit</th><th>${trial ? '' : R.mode === 'elim' ? 'Ergebnis' : 'Abstand'}</th><th>Beste Runde</th>${R.mode === 'champ' || R.career ? '<th>Punkte</th>' : ''}<th>Rundenzeiten</th></tr>`}${rows}</table>
      ${extra || ''}</div>
      <div class="startbar">${btns}</div></div>`;
    showScreen('scr-results');
  },

  /* ---------- Championship-Wertung ---------- */
  champ() {
    const C = Game.champ;
    const list = Object.values(C.table).sort((a, b) => b.points - a.points || b.wins - a.wins);
    const done = C.idx >= C.tracks.length;
    let head = '<th>Pl.</th><th>Fahrer</th><th>Punkte</th><th>Siege</th>';
    C.tracks.forEach((id, i) => { const t = allTrackInfos().find(x => x.id === id); head += `<th title="${escapeHtml(t ? t.name : id)}">R${i + 1}</th>`; });
    let rows = '';
    list.forEach((e, i) => {
      rows += `<tr class="${e.human >= 0 ? 'me' : ''}"><td class="pos">${i + 1}</td><td><span class="chip" style="background:${e.color}"></span>${escapeHtml(e.name)}</td><td><b>${e.points}</b></td><td>${e.wins}</td>`;
      C.tracks.forEach((_, k) => { const r = e.res[k]; rows += `<td>${r == null ? '' : r.pos + '.<span class="note"> ' + r.pts + '</span>'}</td>`; });
      rows += '</tr>';
    });
    const next = !done ? allTrackInfos().find(t => t.id === C.tracks[C.idx]) : null;
    const champion = done ? list[0] : null;
    $('scr-champ').innerHTML = `<div class="dim"></div><div class="wrap">
      <div class="head"><h2>Championship – ${done ? 'Endstand' : 'Zwischenstand nach Rennen ' + C.idx + ' / ' + C.tracks.length}</h2><div class="spacer"></div></div>
      ${champion ? `<div style="font-family:'Russo One',sans-serif;font-size:30px;margin:0 0 16px;color:#ffd23e">🏆 Champion: ${escapeHtml(champion.name)} mit ${champion.points} Punkten</div>` : ''}
      <div class="col" style="height:${done ? 560 : 600}px"><table class="tbl"><tr>${head}</tr>${rows}</table></div>
      <div class="startbar">${done ? '<button class="btn primary big" data-act="menu">Hauptmenü</button>' :
        `<button class="btn danger" data-act="abort">Abbrechen</button><button class="btn primary big" data-act="next">Nächstes Rennen: ${escapeHtml(next ? next.name : '')} ▶</button>`}</div></div>`;
    showScreen('scr-champ');
  },

  /* ---------- Optionen ---------- */
  options() {
    const o = Options.data;
    const pads = Input.pads();
    $('scr-options').innerHTML = `<div class="dim"></div><div class="wrap">
      <div class="head"><button class="btn" data-act="back">← Zurück</button><h2>Optionen</h2></div>
      <div class="cols" style="height:620px">
        <div class="col" style="width:330px"><h3>Spielernamen</h3>
          ${o.names.map((n, i) => `<div class="row"><label class="l">Spieler ${i + 1}</label><input class="name" style="background:#0f141d;border:1px solid var(--line);color:var(--text);border-radius:6px;padding:6px 8px;font-size:15px;width:170px" data-act="oname" data-v="${i}" value="${escapeHtml(n)}" maxlength="14"></div>`).join('')}
          <h3 style="margin-top:24px">Daten</h3>
          <div class="row"><button class="btn danger" data-act="oclear">Rekorde & Ghosts löschen</button></div>
          </div>
        <div class="col" style="width:440px"><h3>Audio & Anzeige</h3>
          <div class="row"><label class="l">Sound</label>${tog('osound', o.sound)}</div>
          <div class="row"><label class="l">Lautstärke</label><input type="range" min="0" max="100" value="${o.volume}" data-act="ovol"><span class="pct">${o.volume}%</span></div>
          <div class="row"><label class="l">Motorgeräusch</label>${tog('oengine', o.engine)}</div>
          <div class="row"><label class="l">KI-Motoren hörbar</label>${tog('oaieng', o.aiEngines !== false)}</div>
          <div class="row"><label class="l">Kommentator</label>${tog('ocomm', o.commentary === true)}</div>
          <div class="row"><label class="l">Stimme</label><select data-act="ovoice" class="selbox" style="max-width:210px">${(() => { const vl = Speaker.voices(); const cur = Speaker.pickVoice(); return vl.length ? vl.map(x => `<option value="${escapeHtml(x.v.name)}" ${cur && cur.name === x.v.name ? 'selected' : ''}>${escapeHtml(x.v.name.replace(/^Microsoft |^Google /, '').slice(0, 34))}${x.male ? ' ♂' : x.female ? ' ♀' : ''}</option>`).join('') : '<option>keine deutsche Stimme gefunden</option>'; })()}</select>
            <button class="btn small" data-act="ovtest">▶</button></div>
          <div class="row"><label class="l">Musik</label>${tog('omusic', o.music)}</div>
          <div class="row"><label class="l">Musik-Lautstärke</label><input type="range" min="0" max="100" value="${o.musicVol}" data-act="omvol"><span class="pct">${o.musicVol}%</span></div>
          <div class="row"><label class="l">Musik im Rennen</label>${tog('oracemus', o.raceMusic)}</div>
          <div class="row"><label class="l">Touch-Steuerung</label>${seg('otouch', ['Automatisch', 'An', 'Aus'], o.touch || 0)}</div>
          <div class="row"><label class="l">Kamera-Zoom (allein)</label>${seg('ocam', ['Aus', 'Folgen', 'Nah'], o.camera != null ? o.camera : 1)}</div>
          <div class="row"><label class="l">Checkpoints zeigen</label>${tog('ocps', o.showCps)}</div>
        </div>
        <div class="col" style="flex:1"><h3>Steuerung</h3>
          <table class="keytbl"><tr><td></td><td>Gas</td><td>Bremse</td><td>Lenken</td><td>Reset</td><td>Zum Checkpoint</td></tr>
          ${KEYMAP.map((k, i) => `<tr><td>Spieler ${i + 1}</td><td><kbd>${k.up.replace('Key', '').replace('Arrow', '↑').replace('Numpad', 'Num ')}</kbd></td><td><kbd>${k.down.replace('Key', '').replace('ArrowDown', '↓').replace('Numpad', 'Num ')}</kbd></td><td><kbd>${k.left.replace('Key', '').replace('ArrowLeft', '←').replace('Numpad', 'Num ')}</kbd> <kbd>${k.right.replace('Key', '').replace('ArrowRight', '→').replace('Numpad', 'Num ')}</kbd></td><td><kbd>${k.resetLabel}</kbd></td><td><kbd>${k.cpLabel}</kbd></td></tr>`).join('')}
          </table>
          <p class="note" style="line-height:1.6;margin-top:14px"><kbd>P</kbd> oder <kbd>Esc</kbd>: Pause · Im Boxenbereich stehend: <b>Links</b> Reparatur, <b>Unten</b> Tanken, <b>Rechts</b> Reifen.<br>
          Gamepads: Gamepad 1 steuert Spieler 1 usw. – Stick/Steuerkreuz lenken, RT/A Gas, LT/B Bremse, Y Reset, X zum letzten Checkpoint, Start Pause.<br>
          Erkannte Gamepads: ${Input.padsBlocked ? 'Gamepad-Zugriff vom Browser gesperrt (Datei direkt öffnen statt in der Vorschau)' : pads.length ? pads.map(p => escapeHtml(p.id.slice(0, 40))).join(', ') : 'keine (Taste am Gamepad drücken)'}</p>
          <h3 style="margin-top:20px">Fahrzeugklassen</h3>
          <table class="tbl"><tr><th>Klasse</th><th>Tempo</th><th>Beschl.</th><th>Grip</th><th>Gewicht</th><th></th></tr>
          ${CLASSES.map(c => `<tr><td><b>${c.name}</b></td><td>${c.maxSpeed}</td><td>${c.accel}</td><td>${c.grip}</td><td>${c.mass}</td><td class="note">${c.desc}</td></tr>`).join('')}</table>
        </div></div></div>`;
    showScreen('scr-options');
  },
  async optionsAct(act, v, el) {
    const o = Options.data;
    if (act === 'back') { Options.save(); this.main(); return; }
    if (act === 'osound') { o.sound = !o.sound; Sound.applyVolume(); }
    else if (act === 'oengine') o.engine = !o.engine;
    else if (act === 'ocps') o.showCps = !o.showCps;
    else if (act === 'oaieng') o.aiEngines = o.aiEngines === false;
    else if (act === 'omusic') { o.music = !o.music; Options.save(); Music.refresh(); }
    else if (act === 'oracemus') o.raceMusic = !o.raceMusic;
    else if (act === 'otouch') o.touch = +v;
    else if (act === 'ocam') o.camera = +v;
    else if (act === 'ovoice') { o.voiceName = el.value; Speaker.voice = null; Options.save(); const was = o.commentary; o.commentary = true; Speaker.say('Hallo, ich bin dein Kommentator. Und los geht\'s!', 'test', 0, 2); o.commentary = was; return; }
    else if (act === 'ovtest') { const was = o.commentary; o.commentary = true; Speaker.say('Und da ist er! Neuer Streckenrekord! Was für eine Runde!', 'test', 0, 2); o.commentary = was; return; }
    else if (act === 'ocomm') { o.commentary = o.commentary !== true; if (o.commentary) { Options.save(); Speaker.say('Kommentator ist an.', 'test', 1, 2); } else Speaker.stop(); }
    else if (act === 'omvol') { o.musicVol = +el.value; el.nextElementSibling.textContent = el.value + '%'; Sound.applyVolume(); Options.save(); return; }
    else if (act === 'ovol') { o.volume = +el.value; el.nextElementSibling.textContent = el.value + '%'; Sound.applyVolume(); return; }
    else if (act === 'oclear') {
      if (!await confirmDlg('Alle Rundenrekorde und Ghost-Fahrten löschen?', 'Löschen')) return;
      Object.keys(localStorage).filter(k => k.startsWith('cr_lb_') || k.startsWith('cr_ghost_')).forEach(k => store.del(k));
      toast('Rekorde und Ghosts gelöscht.');
    } else return;
    Options.save(); this.options();
  },

  /* ---------- Bestenliste ---------- */
  board(id) {
    if (id) this.boardTrack = id;
    const tracks = allTrackInfos();
    if (!tracks.some(t => t.id === this.boardTrack)) this.boardTrack = 'oval';
    const recs = getRecords(this.boardTrack), ghost = store.get('cr_ghost_' + this.boardTrack, null);
    $('scr-board').innerHTML = `<div class="dim"></div><div class="wrap">
      <div class="head"><button class="btn" data-act="back">← Zurück</button><h2>Bestenliste</h2></div>
      <div class="cols"><div class="col" style="width:360px"><h3>Strecke</h3><div class="tlist">
        ${tracks.map(t => `<div class="titem ${t.id === this.boardTrack ? 'on' : ''}" data-act="btrack" data-v="${t.id}">${escapeHtml(t.name)}<span class="tag">${getRecords(t.id)[0] ? fmtTime(getRecords(t.id)[0].time) : ''}</span></div>`).join('')}</div></div>
      <div class="col" style="flex:1"><h3>Top 10 Runden</h3>
        ${recs.length ? `<table class="tbl"><tr><th>Pl.</th><th>Name</th><th>Zeit</th><th>Auto</th><th>Modus</th><th>Datum</th></tr>
        ${recs.map((r, i) => `<tr><td class="pos">${i + 1}</td><td>${escapeHtml(r.name)}</td><td><b>${fmtTime(r.time)}</b></td><td>${escapeHtml(r.cls || '')}</td><td>${{ quick: 'Rennen', trial: 'Zeitfahren', champ: 'Championship', elim: 'Ausscheidung' }[r.mode] || ''}</td><td>${escapeHtml(r.date || '')}</td></tr>`).join('')}</table>`
        : '<p class="note">Noch keine Runden gefahren.</p>'}
        <p class="note" style="margin-top:16px">Ghost: ${ghost ? fmtTime(ghost.time) : 'keiner gespeichert'}</p>
        <div class="row"><button class="btn danger small" data-act="bclear">Rekorde dieser Strecke löschen</button>${ghost ? '<button class="btn danger small" data-act="bghost">Ghost löschen</button>' : ''}</div>
      </div></div></div>`;
    showScreen('scr-board');
  },
  async boardAct(act, v) {
    if (act === 'back') { this.main(); return; }
    if (act === 'btrack') { this.board(v); return; }
    if (act === 'bclear' && await confirmDlg('Alle Rekorde dieser Strecke löschen?', 'Löschen')) store.del('cr_lb_' + this.boardTrack);
    if (act === 'bghost' && await confirmDlg('Ghost dieser Strecke löschen?', 'Löschen')) store.del('cr_ghost_' + this.boardTrack);
    this.board();
  },

  /* ---------- Pause ---------- */
  pause() {
    const R = Game.race;
    const quit = R.mode === 'test' ? 'Zurück zum Editor' : R.mode === 'champ' ? 'Rennen aufgeben' : 'Zum Hauptmenü';
    $('scr-pause').innerHTML = `<div class="dim" style="background:rgba(0,0,0,.55)"></div><div class="box"><h2>PAUSE</h2>
      <button class="btn primary big" data-act="resume">Weiter</button>
      <button class="btn" data-act="restart">Neu starten</button>
      ${R.cars.filter(c => c.human >= 0).length === 1 ? `<button class="btn" data-act="camera">Kamera: ${['Ganze Strecke', 'Folgen', 'Nah'][Options.data.camera != null ? Options.data.camera : 1]} (C)</button>` : ''}
      <button class="btn" data-act="quit">${quit}</button>
      <p class="note" style="text-align:center;margin:8px 0 0">P / Esc: weiter · C: Kamera-Zoom</p></div>`;
    showScreen('scr-pause');
  }
};

/* ---------- Ereignis-Verteilung für alle Bildschirme ---------- */
function bindScreens() {
  const handler = async (e, type) => {
    const el = e.target.closest('[data-act]'); if (!el) return;
    const act = el.dataset.act, v = el.dataset.v;
    const scr = e.currentTarget.id;
    if (type === 'click' && (el.tagName === 'INPUT' && el.type !== 'checkbox')) return;
    if (type === 'input' && !(el.tagName === 'INPUT' && el.type === 'range')) return;
    if (type === 'change' && el.dataset.act !== 'name' && el.dataset.act !== 'oname' && el.dataset.act !== 'cname' && el.dataset.act !== 'champTrack' && el.dataset.act !== 'aiCls' && el.dataset.act !== 'ovoice') return;
    if (type === 'click' && el.tagName === 'SELECT') return;
    if (type === 'change' && el.dataset.act === 'ovoice') { UI.optionsAct('ovoice', null, el); return; }
    if (type === 'click' && el.dataset.act === 'champTrack') return;
    if (scr === 'scr-main') {
      Sound.click();
      if (act === 'quick' || act === 'trial' || act === 'champ') UI.setup(act);
      else if (act === 'career') Career.open();
      else if (act === 'fullscreen') toggleFullscreen();
      else if (act === 'editor') Editor.open();
      else if (act === 'board') UI.board();
      else if (act === 'options') UI.options();
    } else if (scr === 'scr-setup') {
      if (act === 'name') { Options.data.names[+v] = el.value.trim().slice(0, 14) || ('Spieler ' + (+v + 1)); Options.save(); return; }
      UI.setupAct(act, v, el);
    } else if (scr === 'scr-options') {
      if (act === 'oname') { Options.data.names[+v] = el.value.trim().slice(0, 14) || ('Spieler ' + (+v + 1)); Options.save(); return; }
      UI.optionsAct(act, v, el);
    } else if (scr === 'scr-board') UI.boardAct(act, v);
    else if (scr === 'scr-results') Game.resultsAct(act);
    else if (scr === 'scr-champ') Game.champAct(act);
    else if (scr === 'scr-pause') Game.pauseAct(act);
    else if (scr === 'scr-career') { if (act === 'cname') { Career.setName(el.value); return; } Career.act(act, v, el); }
  };
  document.querySelectorAll('.screen').forEach(s => {
    s.addEventListener('click', e => handler(e, 'click'));
    s.addEventListener('input', e => handler(e, 'input'));
    s.addEventListener('change', e => handler(e, 'change'));
  });
}
