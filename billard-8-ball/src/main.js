// @ts-check
// Einstiegspunkt: Spielzustand, Game-Loop (Fixed-Timestep + Interpolation) und Verdrahtung
// von Physik, Regeln, CPU, Rendering, Eingabe, UI und Audio.

import { Simulation } from './physics/simulation.js?v=1.0.2';
import { DT } from './physics/constants.js?v=1.0.2';
import { shotToStrike } from './physics/cue.js?v=1.0.2';
import { castCueBall } from './physics/raycast.js?v=1.0.2';
import { createRng } from './physics/rng.js?v=1.0.2';
import { setupRack } from './game/rack.js?v=1.0.2';
import { createMatch, evaluateShot, applyOutcome, legalTargets, FOUL_TEXT, GROUP_LONG } from './game/rules.js?v=1.0.2';
import { planCpuShot, objectBallsOnTable } from './game/cpu.js?v=1.0.2';
import { Hud } from './ui/hud.js?v=1.0.2';
import { Dialogs } from './ui/dialogs.js?v=1.0.2';
import { loadSettings, saveSettings, loadGame, saveGame, clearGame } from './ui/settings.js?v=1.0.2';
import { $, h } from './ui/dom.js?v=1.0.2';
import { Sound } from './audio/sound.js?v=1.0.2';
import { AimPad } from './input/aimPad.js?v=1.0.2';
import { SpinControl } from './input/spinControl.js?v=1.0.2';
import { CameraGestures } from './input/cameraGestures.js?v=1.0.2';
import { GameRenderer } from './render/renderer.js?v=1.0.2';

/** @typedef {'menu'|'aim'|'cpu'|'strike'|'roll'|'handover'|'replay'|'over'} State */

function fatal(title, text) {
  $('#boot').remove();
  document.body.append(h('div.fatal', { role: 'alert' }, h('h1', null, title), h('p', null, text)));
}

function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

const bootStage = (s) => { /** @type {any} */ (window).__bootStage = s; };
bootStage('Module geladen, prüfe WebGL');
if (!webglAvailable()) {
  fatal('WebGL nicht verfügbar', 'Dein Browser oder Gerät unterstützt kein WebGL, das für die 3D-Darstellung nötig ist. Bitte aktiviere die Hardwarebeschleunigung oder verwende einen aktuellen Browser (Chrome, Safari, Firefox, Edge).');
  throw new Error('WebGL nicht verfügbar');
}


const settings = loadSettings();
const hud = new Hud();
const dialogs = new Dialogs();
const sound = new Sound();
let sim = new Simulation();
const table = sim.table;
const previewSim = new Simulation(table);
previewSim.recordEvents = false;

/** @type {import('./render/renderer.js').GameRenderer} */
let renderer;
try {
  bootStage('Grafik wird gestartet');
  renderer = new GameRenderer(/** @type {HTMLCanvasElement} */ ($('#gl')), table, sim.R);
} catch (e) {
  fatal('WebGL-Fehler', 'Die 3D-Ansicht konnte nicht gestartet werden. Bitte schließe andere Tabs oder starte den Browser neu.');
  throw e;
}
const rig = renderer.rig;

/** @type {import('./game/rules.js').Match} */
let match = createMatch({ mode: 'practice', players: [{ name: 'Übung' }] });
let seed = Date.now() >>> 0;
let rng = createRng(seed);
/** @type {State} */
let state = 'menu';
let paused = false;
const aim = { angle: 0, power: 0, kbPower: 0.5, lastPower: 0.45, spinX: 0, spinY: 0, elevation: 0, fine: false, mode: /** @type {'power'|'angle'} */ ('power') };
let previewDirty = true;
/** @type {{sim:any, match:any, lastShot:any}[]} */
let undoStack = [];
/** @type {{snap:any, strike:any, x:number, y:number, angle:number}|null} */
let lastShot = null;
/** @type {number[]} */
let shotBefore = [];
let rollTime = 0, acc = 0, skipRequested = false;
/** @type {{t:number, shot:import('./physics/cue.js').Shot, pull:number}|null} */
let strikeAnim = null;
/** @type {any} */
let cpuJob = null;
/** @type {{dragging:boolean, valid:boolean, last:{x:number, y:number}}|null} */
let bih = null;
/** @type {{sim:Simulation, prev:State, acc:number, t:number, goal:any, fromOver:boolean}|null} */
let replay = null;
let powerTick = -1;

// ---------------------------------------------------------------------------
// Hilfsfunktionen

const clone = (o) => (typeof structuredClone === 'function' ? structuredClone(o) : JSON.parse(JSON.stringify(o)));
const vibrate = (p) => {
  const active = /** @type {any} */ (navigator).userActivation?.hasBeenActive !== false;
  if (settings.haptics && active && navigator.vibrate) { try { navigator.vibrate(p); } catch { /* ignoriert */ } }
};
const kitchenOnly = () => match.ballInHand === 'kitchen';
const currentPlayer = () => match.players[match.current];

function onTableIds() { return objectBallsOnTable(sim); }

function refreshHud() { hud.players(match, onTableIds()); }

function canUndo() {
  return state === 'aim' && undoStack.length > 0 && (match.mode === 'practice' || (match.mode === 'pvp' && settings.undo2p));
}

function updateButtons() {
  const aiming = state === 'aim' && !paused;
  $('#controls').classList.toggle('locked', !aiming);
  $('#aim-pad').classList.toggle('fine', aim.fine);
  const fine = $('#btn-fine');
  fine.setAttribute('aria-pressed', String(aim.fine));
  fine.textContent = aim.fine ? 'Feinziel an' : 'Feinziel';
  $('#btn-mode').textContent = aim.mode === 'power' ? '↕ Kraft' : '↕ Winkel';
  $('#pad-vhint').textContent = aim.mode === 'power' ? '▼ ziehen = Kraft · loslassen = Stoß' : '▲▼ wischen = Queue-Winkel (Massé)';
  const undoBtn = /** @type {HTMLButtonElement} */ ($('#btn-undo'));
  undoBtn.hidden = !(match.mode === 'practice' || (match.mode === 'pvp' && settings.undo2p));
  undoBtn.disabled = !canUndo();
  $('#btn-rerack').hidden = match.mode !== 'practice';
  /** @type {HTMLButtonElement} */ ($('#btn-replay')).disabled = !(lastShot && (state === 'aim' || state === 'over'));
  $('#btn-sound').textContent = settings.sound ? '🔊' : '🔇';
  $('#btn-sound').setAttribute('aria-label', settings.sound ? 'Sound ausschalten' : 'Sound einschalten');
}

function persist() {
  if (state === 'menu' || match.winner !== null) return;
  saveGame({ v: 1, match, sim: sim.snapshot(), seed });
}

function playEvents(s) {
  for (const e of s.events) {
    if (e.type === 'ball') sound.ball(e.v);
    else if (e.type === 'cushion') sound.cushion(e.v);
    else sound.pocket();
  }
  s.events.length = 0;
}

function respot(id) {
  const p = sim.findFreeSpot(table.footSpot.x, 0, id);
  sim.placeBall(id, p.x, p.y);
}

function defaultAimAngle() {
  const cue = sim.balls[0];
  const ids = match.mode === 'practice' ? onTableIds() : legalTargets(match, match.current, onTableIds());
  let best = null, bd = Infinity;
  for (const id of ids) {
    const b = sim.balls[id];
    const d = Math.hypot(b.x - cue.x, b.y - cue.y);
    if (d < bd) { bd = d; best = b; }
  }
  return best ? Math.atan2(best.y - cue.y, best.x - cue.x) : 0;
}

// ---------------------------------------------------------------------------
// Spielablauf

/** @param {'cpu'|'pvp'|'practice'} mode */
function startGame(mode) {
  dialogs.close();
  paused = false;
  $('#gl').classList.remove('blur');
  const players = mode === 'cpu'
    ? [{ name: settings.names[0] }, { name: 'CPU', cpu: true, difficulty: settings.difficulty }]
    : mode === 'pvp' ? [{ name: settings.names[0] }, { name: settings.names[1] }] : [{ name: 'Übung' }];
  match = createMatch({ mode, players, casual: settings.casual, railRule: settings.railRule });
  if (mode === 'practice') match.ballInHand = 'anywhere';
  seed = ((Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0);
  rng = createRng(seed);
  sim = new Simulation(table);
  setupRack(sim, rng);
  undoStack = [];
  lastShot = null;
  replay = null;
  cpuJob = null;
  renderer.overlay.setLastShot(null);
  rig.reset(true);
  hud.clearToasts();
  beginTurn(false);
  if (!settings.tutorialDone) startTutorial();
}

function continueSaved() {
  const data = loadGame();
  try {
    if (!data || data.v !== 1) throw new Error('kein Spielstand');
    match = data.match;
    seed = data.seed >>> 0;
    rng = createRng(seed + match.shots * 7919);
    sim = new Simulation(table);
    sim.restore(data.sim);
    undoStack = [];
    lastShot = null;
    dialogs.close();
    rig.reset(true);
    beginTurn(false);
  } catch {
    clearGame();
    hud.toast('Spielstand konnte nicht geladen werden', 'foul');
    showMenu();
  }
}

/** @param {boolean} [announce] Spielerwechsel ansagen */
function beginTurn(announce = false) {
  if (match.winner !== null) { gameOver(); return; }
  const cue = sim.balls[0];
  if (!cue.onTable) {
    const s = sim.findFreeSpot(table.headSpot.x, 0, 0);
    sim.placeBall(0, s.x, s.y);
    if (match.ballInHand === 'none') match.ballInHand = 'kitchen';
  }
  bih = null;
  if (match.ballInHand !== 'none') {
    if (!sim.isValidCuePlacement(cue.x, cue.y, kitchenOnly())) {
      const s = sim.findFreeSpot(table.headSpot.x, 0, 0);
      sim.placeBall(0, s.x, s.y);
    }
    bih = { dragging: false, valid: true, last: { x: cue.x, y: cue.y } };
  }
  aim.power = 0;
  aim.spinX = aim.spinY = 0;
  aim.elevation = 0;
  aim.fine = false;
  aim.angle = defaultAimAngle();
  spinCtl.set(0, 0);
  hud.power(0);
  hud.spin(0, 0, 0);
  refreshHud();
  previewDirty = true;
  const p = currentPlayer();
  if (p.cpu) {
    startCpu();
  } else {
    state = 'aim';
    if (match.mode !== 'practice') {
      const ids = legalTargets(match, match.current, onTableIds());
      renderer.overlay.setTargets(match.isBreak ? null : ids.map((id) => sim.balls[id]));
      if (announce) hud.toast(`${p.name} ist am Zug`);
    }
    if (bih && match.mode !== 'practice') hud.toast(kitchenOnly() ? 'Ball in Hand – im Kopffeld platzieren' : 'Ball in Hand – Spielkugel ziehen');
  }
  persist();
  updateButtons();
}

function requestShot(power) {
  if (state !== 'aim' || paused || dialogs.isOpen) return;
  if (bih && !bih.valid) { hud.toast('Ungültige Position für die Spielkugel', 'foul'); return; }
  fire({ angle: aim.angle, power, spinX: aim.spinX, spinY: aim.spinY, elevation: aim.elevation });
}

/** @param {import('./physics/cue.js').Shot} shot */
function fire(shot) {
  undoStack.push({ sim: sim.snapshot(), match: clone(match), lastShot });
  if (undoStack.length > 25) undoStack.shift();
  aim.lastPower = shot.power;
  aim.power = shot.power;
  strikeAnim = { t: 0, shot, pull: 0.03 + shot.power * 0.25 };
  state = 'strike';
  bih = null;
  renderer.overlay.setBallInHand(null);
  renderer.overlay.hideAim();
  renderer.overlay.setTargets(null);
  updateButtons();
}

/** @param {import('./physics/cue.js').Shot} shot */
function doStrike(shot) {
  shotBefore = onTableIds();
  const snap = sim.snapshot();
  const st = shotToStrike(shot, sim.p, sim.R, { miscue: settings.miscue, rng });
  sim.resetLog();
  sim.events.length = 0;
  sim.strike(st);
  lastShot = { snap, strike: st, x: sim.balls[0].x, y: sim.balls[0].y, angle: st.angle };
  renderer.overlay.setLastShot(null);
  sound.cue(shot.power);
  vibrate(25);
  if (st.miscue) hud.toast('Miscue! Der Queue ist abgerutscht', 'foul');
  state = 'roll';
  rollTime = 0;
  acc = 0;
  skipRequested = false;
  $('#btn-skip').hidden = false;
  hud.power(0);
}

function updateRoll(dt) {
  rollTime += dt;
  if (skipRequested) {
    sim.recordEvents = false;
    sim.runUntilRest(60);
    sim.recordEvents = true;
    sim.events.length = 0;
    for (const b of sim.balls) { b.px = b.x; b.py = b.y; }
  } else {
    const ff = settings.fastForward && rollTime > 1.2 && sim.maxSpeed() < 0.35;
    hud.status(ff ? '⏩ 3× Schnellvorlauf' : null);
    acc += dt * (ff ? 3 : 1);
    let steps = 0;
    while (acc >= DT && steps < 150) {
      sim.step();
      acc -= DT;
      steps++;
      if (sim.isAtRest()) { acc = 0; break; }
    }
  }
  playEvents(sim);
  const cue = sim.balls[0];
  rig.follow = settings.cameraFollow && cue.onTable ? { x: cue.x, y: cue.y } : null;
  if (sim.isAtRest()) endShot();
}

function endShot() {
  rig.follow = null;
  $('#btn-skip').hidden = true;
  hud.status(null);
  if (lastShot) renderer.overlay.setLastShot({ x: lastShot.x, y: lastShot.y, angle: lastShot.angle });
  const log = sim.log;

  if (match.mode === 'practice') {
    if (!sim.balls[0].onTable) { hud.toast(FOUL_TEXT.cueScratch, 'foul'); sound.foul(); }
    for (const id of log.offTable) if (id !== 0) respot(id);
    if (onTableIds().length === 0) hud.toast('Tisch leer! „Neu aufbauen“ für ein neues Rack', 'good', 4000);
    match.shots++;
    match.ballInHand = 'anywhere';
    beginTurn(false);
    return;
  }

  const out = evaluateShot(match, log, shotBefore);
  for (const id of out.respot) respot(id);
  if (out.foul) { hud.toast(FOUL_TEXT[out.foul], 'foul', 3200); sound.foul(); vibrate([30, 50, 30]); }
  if (out.groupAssigned) {
    const pl = match.players[out.groupAssigned.player];
    hud.toast(`${pl.name}: ${GROUP_LONG[out.groupAssigned.group]}`, 'good', 3200);
  }
  const changed = out.nextPlayer !== match.current;
  if (!changed && out.continueTurn && !match.isBreak) hud.toast('Versenkt – weiter!', 'good', 1500);
  applyOutcome(match, out);
  if (match.winner !== null) { refreshHud(); gameOver(); return; }
  if (changed && match.mode === 'pvp') handover(out);
  else beginTurn(changed);
}

/** @param {import('./game/rules.js').ShotOutcome} out */
function handover(out) {
  state = 'handover';
  refreshHud();
  persist();
  updateButtons();
  if (settings.hideTurn) $('#gl').classList.add('blur');
  const lines = [];
  if (out.foul) lines.push(FOUL_TEXT[out.foul]);
  if (out.ballInHand !== 'none') lines.push(out.ballInHand === 'kitchen' ? 'Ball in Hand im Kopffeld.' : 'Ball in Hand – du darfst die Spielkugel frei platzieren.');
  const p = currentPlayer();
  lines.push(p.group ? `Deine Gruppe: ${GROUP_LONG[p.group]}` : 'Der Tisch ist noch offen.');
  dialogs.handover({ name: p.name, lines }, () => {
    dialogs.close();
    $('#gl').classList.remove('blur');
    beginTurn(true);
  });
}

function gameOver() {
  state = 'over';
  clearGame();
  updateButtons();
  renderer.overlay.hideAim();
  renderer.overlay.setTargets(null);
  const w = match.players[/** @type {number} */ (match.winner)];
  const loser = match.players[((match.winner ?? 0) + 1) % match.players.length];
  const reasons = {
    eight: `${w.name} hat die 8 korrekt versenkt.`,
    eightEarly: `${loser.name} hat die 8 zu früh versenkt.`,
    eightFoul: `${loser.name} hat die 8 mit Foul versenkt.`,
    resign: `${loser.name} hat aufgegeben.`,
  };
  const humanLost = match.mode === 'cpu' && w.cpu;
  if (!humanLost) sound.win(); else sound.foul();
  dialogs.gameOver({
    title: humanLost ? 'Verloren' : 'Gewonnen!',
    subtitle: match.mode === 'cpu' ? (humanLost ? 'Die CPU gewinnt diese Partie.' : `${w.name} schlägt die CPU!`) : `${w.name} gewinnt!`,
    detail: reasons[match.endReason ?? 'eight'],
  }, {
    rematch: () => startGame(match.mode),
    replay: lastShot && match.endReason !== 'resign' ? () => { dialogs.close(); startReplay(true); } : null,
    menu: showMenu,
  });
}

// ---------------------------------------------------------------------------
// CPU

function startCpu() {
  state = 'cpu';
  hud.status('CPU denkt…', true);
  renderer.overlay.hideAim();
  renderer.overlay.setTargets(null);
  cpuJob = { gen: planCpuShot(sim, match, /** @type {any} */ (currentPlayer().difficulty || 'medium'), rng), t: 0, result: null, phase: 'think', from: 0, to: 0 };
}

function updateCpu(dt) {
  const j = cpuJob;
  j.t += dt;
  if (j.phase === 'think') {
    const t0 = performance.now();
    while (!j.result && performance.now() - t0 < 8) {
      const r = j.gen.next();
      if (r.done) j.result = r.value;
    }
    if (j.result && j.t > 0.8) {
      hud.status(null);
      const { place, shot } = j.result;
      if (place) sim.placeBall(0, place.x, place.y);
      let d = shot.angle - aim.angle;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      j.from = aim.angle;
      j.to = aim.angle + d;
      aim.spinX = shot.spinX; aim.spinY = shot.spinY; aim.elevation = shot.elevation;
      spinCtl.set(shot.spinX, shot.spinY);
      hud.spin(shot.spinX, shot.spinY, shot.elevation);
      j.phase = 'aim';
      j.t = 0;
    }
  } else if (j.phase === 'aim') {
    const k = Math.min(1, j.t / 0.6);
    const e = k * k * (3 - 2 * k);
    aim.angle = j.from + (j.to - j.from) * e;
    if (k >= 1) { j.phase = 'pull'; j.t = 0; }
  } else if (j.phase === 'pull') {
    const k = Math.min(1, j.t / 0.45);
    aim.power = j.result.shot.power * k;
    hud.power(aim.power);
    if (j.t > 0.65) {
      cpuJob = null;
      fire({ ...j.result.shot, angle: j.to });
    }
  }
}

// ---------------------------------------------------------------------------
// Replay

function startReplay(fromOver = false) {
  if (!lastShot || (state !== 'aim' && state !== 'over')) return;
  const rs = new Simulation(table);
  rs.restore(lastShot.snap);
  rs.resetLog();
  rs.strike(lastShot.strike);
  replay = { sim: rs, prev: state, acc: 0, t: 0, goal: { ...rig.goal }, fromOver };
  state = 'replay';
  rig.replayView(lastShot.x, lastShot.y, lastShot.angle);
  hud.status('↺ Wiederholung');
  $('#btn-skip').hidden = false;
  renderer.overlay.hideAim();
  renderer.overlay.setTargets(null);
  renderer.overlay.setBallInHand(null);
  sound.cue(0.5);
  updateButtons();
}

function updateReplay(dt) {
  const r = /** @type {NonNullable<typeof replay>} */ (replay);
  r.acc += dt;
  let steps = 0;
  while (r.acc >= DT && steps < 150 && !r.sim.isAtRest()) { r.sim.step(); r.acc -= DT; steps++; }
  playEvents(r.sim);
  const c = r.sim.balls[0];
  if (c.onTable) { rig.goal.tx = c.x; rig.goal.ty = c.y; }
  if (r.sim.isAtRest()) { r.t += dt; if (r.t > 0.8) endReplay(); }
}

function endReplay() {
  if (!replay) return;
  const r = replay;
  replay = null;
  rig.goal = r.goal;
  state = r.prev;
  hud.status(null);
  $('#btn-skip').hidden = true;
  previewDirty = true;
  if (r.fromOver) gameOver();
  else if (match.mode !== 'practice' && !match.isBreak) renderer.overlay.setTargets(legalTargets(match, match.current, onTableIds()).map((id) => sim.balls[id]));
  updateButtons();
}

// ---------------------------------------------------------------------------
// Undo / Neu aufbauen / Aufgeben

function undo() {
  if (!canUndo()) return;
  const u = /** @type {any} */ (undoStack.pop());
  sim.restore(u.sim);
  match = u.match;
  lastShot = u.lastShot;
  renderer.overlay.setLastShot(null);
  hud.toast('Stoß rückgängig gemacht');
  beginTurn(false);
}

function rerack() {
  if (match.mode !== 'practice' || state !== 'aim') return;
  undoStack.push({ sim: sim.snapshot(), match: clone(match), lastShot });
  setupRack(sim, rng);
  match.ballInHand = 'anywhere';
  hud.toast('Neu aufgebaut', 'good');
  beginTurn(false);
}

function resign() {
  dialogs.close();
  paused = false;
  if (match.mode === 'practice') { showMenu(); return; }
  const loser = match.mode === 'cpu' ? 0 : match.current;
  match.winner = (loser + 1) % 2;
  match.endReason = 'resign';
  cpuJob = null;
  gameOver();
}

// ---------------------------------------------------------------------------
// Menüs

function showMenu() {
  state = 'menu';
  paused = false;
  cpuJob = null;
  replay = null;
  $('#gl').classList.remove('blur');
  $('#btn-skip').hidden = true;
  hud.status(null);
  renderer.overlay.hideAim();
  renderer.overlay.setBallInHand(null);
  renderer.overlay.setTargets(null);
  updateButtons();
  const save = loadGame();
  dialogs.menu(settings, {
    hasSave: !!save && save.v === 1,
    onContinue: continueSaved,
    onCpu: () => startGame('cpu'),
    onPvp: () => startGame('pvp'),
    onPractice: () => startGame('practice'),
    onSettings: () => openSettings(showMenu),
    onHelp: () => dialogs.help(showMenu),
    save: () => saveSettings(settings),
  });
}

function openSettings(back) {
  dialogs.settings(settings, applySetting, back);
}

/** @param {string} key */
function applySetting(key) {
  saveSettings(settings);
  sound.enabled = settings.sound;
  sound.setVolume(settings.volume);
  sound.setMusic(settings.sound && settings.music, settings.musicVolume);
  document.body.classList.toggle('lefty', settings.leftHanded);
  if (key === 'colorblind') renderer.buildBalls(settings.colorblind);
  if (key === 'quality') renderer.setQuality(settings.quality);
  previewDirty = true;
  updateButtons();
}

function pauseGame() {
  if (state === 'menu' || state === 'over' || state === 'handover') return;
  paused = true;
  updateButtons();
  const pauseMenu = () => dialogs.pause({
    resume: () => { paused = false; dialogs.close(); updateButtons(); },
    help: () => dialogs.help(pauseMenu),
    settings: () => openSettings(pauseMenu),
    resign,
    menu: () => { persist(); showMenu(); },
    canResign: match.mode !== 'practice',
  });
  pauseMenu();
}

function startTutorial() {
  dialogs.tutorial([
    { title: 'Zielen', target: '#aim-pad', text: 'Wische in der unteren Zone nach links oder rechts, um den Queue um die Spielkugel zu drehen. Tippe auf den Tisch, um direkt dorthin zu zielen. Langer Druck oder „Feinziel“ = minimale Korrekturen.' },
    { title: 'Kraft & Stoß', target: '#aim-pad', text: 'Ziehe in derselben Zone nach unten: die Kraft lädt auf (Prozentanzeige). Loslassen stößt. Zurückschieben bricht ab.' },
    { title: 'Trefferpunkt', target: '#spin', text: 'Verschiebe den roten Punkt auf der Spielkugel: oben = Nachlauf, unten = Rücklauf (Draw), links/rechts = Effet. Doppeltipp setzt auf die Mitte.' },
    { title: 'Kamera', target: '#stage', text: 'Ein Finger auf dem Tisch dreht die Kamera, zwei Finger zoomen und neigen. Doppeltipp setzt zurück, „Top“ zeigt die Vogelperspektive.' },
    { title: 'Ball in Hand', target: '#stage', text: 'Nach einem Foul darfst du die Spielkugel mit dem Finger verschieben. Ein roter Ring mit ✕ zeigt eine ungültige Position.' },
  ], () => { settings.tutorialDone = true; saveSettings(settings); });
}

// ---------------------------------------------------------------------------
// Eingabe

const spinCtl = new SpinControl($('#spin-ball'), $('#spin-dot'), (x, y) => {
  aim.spinX = x; aim.spinY = y;
  hud.spin(x, y, aim.elevation);
  previewDirty = true;
}, () => state === 'aim' && !paused);

new AimPad($('#aim-pad'), {
  enabled: () => state === 'aim' && !paused && !dialogs.isOpen,
  mode: () => aim.mode,
  fine: () => aim.fine,
  aim: (d) => { aim.angle += d; previewDirty = true; },
  power: (p) => {
    const tick = Math.floor(p * 10);
    if (tick !== powerTick) { if (tick > powerTick) vibrate(6); powerTick = tick; }
    aim.power = p;
    hud.power(p);
    previewDirty = true;
  },
  shoot: (p) => { powerTick = -1; requestShot(p); },
  cancel: () => { powerTick = -1; aim.power = 0; hud.power(0); previewDirty = true; },
  elevation: (d) => {
    aim.elevation = Math.min(75, Math.max(0, aim.elevation + d));
    hud.spin(aim.spinX, aim.spinY, aim.elevation);
    previewDirty = true;
  },
  longPress: () => { aim.fine = !aim.fine; vibrate(15); hud.toast(aim.fine ? 'Feinziel an' : 'Feinziel aus', 'info', 1000); updateButtons(); },
});

new CameraGestures($('#stage'), {
  rotate: (dx) => rig.rotate(-dx),
  tilt: (dy) => rig.tilt(dy),
  zoom: (f) => rig.zoom(f),
  tap: (x, y) => {
    if (state !== 'aim' || paused) return;
    const p = renderer.pick(x, y);
    const cue = sim.balls[0];
    if (!p || Math.hypot(p.x - cue.x, p.y - cue.y) < sim.R * 1.5) return;
    aim.angle = Math.atan2(p.y - cue.y, p.x - cue.x);
    previewDirty = true;
  },
  doubleTap: () => rig.reset(),
  dragStart: (x, y) => {
    if (state !== 'aim' || !bih || paused) return false;
    const cue = sim.balls[0];
    const s = renderer.project(cue.x, cue.y);
    if (Math.hypot(x - s.x, y - s.y) > 46) return false;
    bih.dragging = true;
    return true;
  },
  dragMove: (x, y) => {
    if (!bih) return;
    const p = renderer.pick(x, y);
    if (!p) return;
    const lim = sim.R;
    p.x = Math.max(-table.Lx + lim, Math.min(table.Lx - lim, p.x));
    p.y = Math.max(-table.Ly + lim, Math.min(table.Ly - lim, p.y));
    sim.placeBall(0, p.x, p.y);
    bih.valid = sim.isValidCuePlacement(p.x, p.y, kitchenOnly());
    if (bih.valid) bih.last = { x: p.x, y: p.y };
    previewDirty = true;
  },
  dragEnd: () => {
    if (!bih) return;
    bih.dragging = false;
    if (!bih.valid) {
      sim.placeBall(0, bih.last.x, bih.last.y);
      bih.valid = true;
      hud.toast(kitchenOnly() ? 'Ungültig – nur im Kopffeld und frei von Kugeln' : 'Ungültige Position – zurückgesetzt', 'foul');
    }
    previewDirty = true;
  },
});

$('#btn-fine').addEventListener('click', () => { aim.fine = !aim.fine; updateButtons(); });
$('#btn-mode').addEventListener('click', () => { aim.mode = aim.mode === 'power' ? 'angle' : 'power'; updateButtons(); });
$('#btn-undo').addEventListener('click', undo);
$('#btn-rerack').addEventListener('click', rerack);
$('#btn-sound').addEventListener('click', () => { settings.sound = !settings.sound; applySetting('sound'); });
$('#btn-pause').addEventListener('click', pauseGame);
$('#btn-help').addEventListener('click', () => {
  if (state === 'menu') return;
  const wasPaused = paused;
  paused = true;
  dialogs.help(() => { dialogs.close(); paused = wasPaused; updateButtons(); });
});
$('#btn-top').addEventListener('click', () => rig.topView());
$('#btn-cam').addEventListener('click', () => rig.reset());
$('#btn-replay').addEventListener('click', () => startReplay(false));
$('#btn-skip').addEventListener('click', () => {
  if (state === 'roll') skipRequested = true;
  else if (state === 'replay') endReplay();
});

document.addEventListener('pointerdown', () => sound.unlock(), { capture: true });
document.addEventListener('keydown', (e) => {
  sound.unlock();
  if (dialogs.isOpen) return;
  const t = /** @type {HTMLElement} */ (e.target);
  if (t && (t.tagName === 'INPUT' || t.classList.contains('spin-ball'))) return;
  const aiming = state === 'aim' && !paused;
  switch (e.key) {
    case 'ArrowLeft': case 'ArrowRight':
      if (aiming) { aim.angle += (e.key === 'ArrowLeft' ? 1 : -1) * (e.shiftKey || aim.fine ? 0.0015 : 0.012); previewDirty = true; e.preventDefault(); }
      break;
    case 'ArrowUp': case 'ArrowDown':
      if (aiming) {
        aim.kbPower = Math.min(1, Math.max(0.02, aim.kbPower + (e.key === 'ArrowUp' ? 0.05 : -0.05)));
        aim.power = aim.kbPower; hud.power(aim.power); previewDirty = true; e.preventDefault();
      }
      break;
    case ' ': case 'Enter':
      if (aiming) { e.preventDefault(); requestShot(aim.kbPower); }
      break;
    case 't': case 'T': rig.topView(); break;
    case 'r': case 'R': rig.reset(); break;
    case 'Escape': case 'p': case 'P': pauseGame(); break;
  }
});

// ---------------------------------------------------------------------------
// Zielhilfe

function simulatePreview(targetId) {
  const pv = previewSim;
  for (const b of pv.balls) { pv.removeBall(b.id); b.pocket = -1; }
  const c = sim.balls[0], t = sim.balls[targetId];
  pv.placeBall(0, c.x, c.y);
  pv.placeBall(targetId, t.x, t.y);
  pv.resetLog();
  const power = aim.power > 0.02 ? aim.power : aim.lastPower;
  pv.strike(shotToStrike({ angle: aim.angle, power, spinX: aim.spinX, spinY: aim.spinY, elevation: aim.elevation }, pv.p, pv.R));
  const obj = [[t.x, t.y]], cue = [];
  let contact = false;
  const tb = pv.balls[targetId], cb = pv.balls[0];
  for (let i = 0; i < 2400 && !pv.isAtRest(); i++) {
    pv.step();
    if (!contact && pv.log.firstContact !== null) { contact = true; cue.push([cb.x, cb.y]); }
    if (contact && i % 3 === 0) {
      if (tb.onTable) obj.push([tb.x, tb.y]);
      if (cb.onTable) cue.push([cb.x, cb.y]);
    }
    if (!tb.onTable && !cb.onTable) break;
  }
  if (tb.onTable) obj.push([tb.x, tb.y]);
  else if (tb.pocket >= 0) obj.push([table.pockets[tb.pocket].x, table.pockets[tb.pocket].y]);
  if (cb.onTable) cue.push([cb.x, cb.y]);
  return { obj, cue: contact ? cue : null };
}

function updateAimPreview() {
  if (!previewDirty) return;
  previewDirty = false;
  const cue = sim.balls[0];
  renderer.overlay.setBallInHand(state === 'aim' && bih ? { x: cue.x, y: cue.y, valid: bih.valid } : null);
  if (state !== 'aim' || !cue.onTable || settings.aimAssist === 'off') { renderer.overlay.hideAim(); return; }
  const eff = aim.angle + sim.p.squirt * aim.spinX;
  const dx = Math.cos(eff), dy = Math.sin(eff);
  const hit = castCueBall(sim, cue.x, cue.y, dx, dy, 0);
  /** @type {any} */
  const data = { cue: [cue.x, cue.y], ghost: null, target: null, cushionHit: null, reflect: null, objPath: null, cuePath: null, assist: settings.aimAssist, showCuePath: settings.cuePreview };
  if (hit && hit.type === 'ball') {
    const T = sim.balls[hit.id];
    data.ghost = [hit.gx, hit.gy];
    data.target = [T.x, T.y];
    const paths = simulatePreview(hit.id);
    data.objPath = paths.obj;
    data.cuePath = paths.cue;
  } else if (hit && hit.type === 'cushion') {
    data.cushionHit = [hit.gx, hit.gy];
    const d = dx * hit.nx + dy * hit.ny;
    data.reflect = [hit.gx + (dx - 2 * d * hit.nx) * 0.6, hit.gy + (dy - 2 * d * hit.ny) * 0.6];
  }
  renderer.overlay.setAim(data);
}

function updateCueVisual() {
  const cue = sim.balls[0];
  const base = { x: cue.x, y: cue.y, angle: aim.angle, elevation: aim.elevation, spinX: aim.spinX, spinY: aim.spinY, maxTip: sim.p.maxTip };
  if (!cue.onTable || paused && state !== 'aim') { renderer.cue.hide(); return; }
  if (state === 'aim' || (state === 'cpu' && cpuJob && cpuJob.phase !== 'think')) {
    renderer.cue.set({ ...base, pull: 0.03 + aim.power * 0.25 });
  } else if (state === 'strike' && strikeAnim) {
    const k = Math.min(1, strikeAnim.t / 0.09);
    renderer.cue.set({ ...base, angle: strikeAnim.shot.angle, pull: strikeAnim.pull * (1 - k * k) - 0.004 * k });
  } else if (state === 'roll' && rollTime < 0.3 && lastShot) {
    renderer.cue.set({ ...base, x: lastShot.x, y: lastShot.y, angle: aim.angle, pull: -0.004 - rollTime * 0.08 });
  } else renderer.cue.hide();
}

// ---------------------------------------------------------------------------
// Game-Loop

let last = performance.now();
let raf = 0;

function frame(now) {
  raf = requestAnimationFrame(frame);
  const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
  last = now;
  sound.frame();
  if (!paused) {
    if (state === 'roll') updateRoll(dt);
    else if (state === 'strike' && strikeAnim) {
      strikeAnim.t += dt;
      if (strikeAnim.t >= 0.09) { const s = strikeAnim.shot; strikeAnim = null; doStrike(s); }
    } else if (state === 'cpu' && cpuJob) updateCpu(dt);
    else if (state === 'replay' && replay) updateReplay(dt);
  }
  updateCueVisual();
  updateAimPreview();
  const disp = replay ? replay.sim : sim;
  const alpha = state === 'roll' ? Math.min(1, acc / DT) : replay ? Math.min(1, replay.acc / DT) : 1;
  renderer.syncBalls(disp, alpha, dt);
  renderer.render(dt);
  renderer.trackFrame(dt * 1000);
}

function startLoop() {
  if (raf) return;
  last = performance.now();
  raf = requestAnimationFrame(frame);
}

function stopLoop() {
  cancelAnimationFrame(raf);
  raf = 0;
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    stopLoop();
    sound.suspend();
    if (state === 'aim' || state === 'handover') persist();
  } else {
    sound.resume();
    startLoop();
  }
});

const stage = $('#stage');
new ResizeObserver(() => renderer.resize(stage.clientWidth, stage.clientHeight)).observe(stage);
renderer.resize(stage.clientWidth, stage.clientHeight);
window.addEventListener('orientationchange', () => setTimeout(() => renderer.resize(stage.clientWidth, stage.clientHeight), 250));

// Start
bootStage('Tisch und Kugeln werden aufgebaut');
renderer.setQuality(settings.quality);
renderer.buildBalls(settings.colorblind);
applySetting('init');
setupRack(sim, rng);
rig.reset(true);
refreshHud();
startLoop();
/** @type {any} */ (window).__billardReady = true;
$('#boot').classList.add('gone');
setTimeout(() => $('#boot')?.remove(), 400);
bootStage('Menü wird geöffnet');
showMenu();

// für Tests/Debugging im Browser
/** @type {any} */ (window).__billard = {
  get sim() { return sim; }, get match() { return match; }, get state() { return state; }, aim, rig, renderer, sound, startGame, requestShot,
  /** Frames manuell vorantreiben (z. B. wenn der Tab im Hintergrund ist). */
  advance(seconds) {
    let t = last;
    for (let i = 0; i < seconds * 60; i++) { t += 1000 / 60; frame(t); cancelAnimationFrame(raf); }
    raf = 0;
    startLoop();
  },
};
