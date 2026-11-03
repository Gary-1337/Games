// @ts-check
// 8-Ball-Regeln als reine Funktionen: Match-Zustand + Stoßprotokoll → Ergebnis.

export const SOLIDS = [1, 2, 3, 4, 5, 6, 7];
export const STRIPES = [9, 10, 11, 12, 13, 14, 15];

/** @typedef {'solids'|'stripes'} Group */
/** @typedef {'none'|'kitchen'|'anywhere'} BallInHand */
/**
 * @typedef {Object} Player
 * @property {string} name
 * @property {boolean} cpu
 * @property {string} [difficulty]
 * @property {Group|null} group
 * @property {number} fouls
 *
 * @typedef {Object} Match
 * @property {'cpu'|'pvp'|'practice'} mode
 * @property {boolean} casual      Lockere Regeln
 * @property {boolean} railRule    Bandenkontakt-Pflicht
 * @property {Player[]} players
 * @property {number} current
 * @property {boolean} isBreak
 * @property {BallInHand} ballInHand
 * @property {number|null} winner
 * @property {string|null} endReason
 * @property {number} shots
 * @property {string|null} lastFoul
 */

export const FOUL_TEXT = {
  noContact: 'Foul: Keine Kugel getroffen',
  wrongBall: 'Foul: Falsche Kugel zuerst getroffen',
  noRail: 'Foul: Keine Bande nach Kontakt',
  cueScratch: 'Foul: Spielkugel versenkt',
  cueOffTable: 'Foul: Spielkugel vom Tisch',
  objectOffTable: 'Foul: Objektball vom Tisch',
  illegalBreak: 'Foul: Ungültiger Break',
};

export const GROUP_NAME = { solids: 'Solids', stripes: 'Stripes' };
export const GROUP_LONG = { solids: 'Solids (1–7)', stripes: 'Stripes (9–15)' };

/** @param {number} id @returns {Group|'eight'|'cue'} */
export function groupOf(id) {
  if (id === 0) return 'cue';
  if (id === 8) return 'eight';
  return id < 8 ? 'solids' : 'stripes';
}

/**
 * @param {{mode:'cpu'|'pvp'|'practice', players:{name:string, cpu?:boolean, difficulty?:string}[], casual?:boolean, railRule?:boolean}} opts
 * @returns {Match}
 */
export function createMatch(opts) {
  return {
    mode: opts.mode,
    casual: !!opts.casual,
    railRule: opts.railRule !== false,
    players: opts.players.map((p) => ({ name: p.name, cpu: !!p.cpu, difficulty: p.difficulty, group: null, fouls: 0 })),
    current: 0,
    isBreak: true,
    ballInHand: 'kitchen',
    winner: null,
    endReason: null,
    shots: 0,
    lastFoul: null,
  };
}

/** @param {Group} g */
const groupBalls = (g) => (g === 'solids' ? SOLIDS : STRIPES);
/** @param {Group} g @returns {Group} */
export const otherGroup = (g) => (g === 'solids' ? 'stripes' : 'solids');

/**
 * Welche Kugeln darf der Spieler zuerst treffen?
 * @param {Match} match @param {number} playerIdx @param {number[]} onTable  Objektbälle auf dem Tisch
 */
export function legalTargets(match, playerIdx, onTable) {
  const g = match.players[playerIdx].group;
  if (match.mode === 'practice') return onTable.filter((id) => id !== 0);
  if (!g) {
    const open = onTable.filter((id) => id !== 0 && id !== 8);
    return open.length ? open : [8];
  }
  const own = onTable.filter((id) => groupBalls(g).includes(id));
  return own.length ? own : onTable.includes(8) ? [8] : [];
}

/** Verbleibende eigene Kugeln (ohne 8). */
export function remainingOfGroup(group, onTable) {
  return onTable.filter((id) => groupBalls(group).includes(id)).length;
}

/**
 * @typedef {Object} ShotOutcome
 * @property {string[]} fouls
 * @property {string|null} foul          erster Foul-Schlüssel
 * @property {boolean} continueTurn
 * @property {number} nextPlayer
 * @property {BallInHand} ballInHand
 * @property {number|null} winner
 * @property {string|null} endReason
 * @property {{player:number, group:Group}|null} groupAssigned
 * @property {number[]} respot          wieder aufzusetzende Objektbälle
 * @property {boolean} cueReturned       Spielkugel muss zurück auf den Tisch
 */

/**
 * @param {Match} match
 * @param {import('../physics/simulation.js').ShotLog} log
 * @param {number[]} before  Objektbälle (ohne 0) auf dem Tisch vor dem Stoß
 * @returns {ShotOutcome}
 */
export function evaluateShot(match, log, before) {
  const shooter = match.current;
  const opponent = (shooter + 1) % match.players.length;
  const me = match.players[shooter];
  const pocketedIds = log.pocketed.map((e) => e.id);
  const objPocketed = pocketedIds.filter((id) => id !== 0);
  const cuePocketed = pocketedIds.includes(0);
  const cueOff = log.offTable.includes(0);
  const objOff = log.offTable.filter((id) => id !== 0);
  const eightDown = objPocketed.includes(8) || objOff.includes(8);

  /** @type {ShotOutcome} */
  const out = {
    fouls: [], foul: null, continueTurn: false, nextPlayer: opponent, ballInHand: 'none',
    winner: null, endReason: null, groupAssigned: null, respot: [], cueReturned: cuePocketed || cueOff,
  };

  if (cuePocketed) out.fouls.push('cueScratch');
  if (cueOff) out.fouls.push('cueOffTable');
  if (objOff.length) out.fouls.push('objectOffTable');
  if (log.firstContact === null) out.fouls.push('noContact');
  else if (!match.isBreak) {
    const legal = legalTargets(match, shooter, before);
    if (!legal.includes(log.firstContact)) out.fouls.push('wrongBall');
  }
  const strict = !match.casual;
  if (strict && match.railRule && !match.isBreak && log.firstContact !== null && objPocketed.length === 0 && !log.railAfterContact) {
    out.fouls.push('noRail');
  }
  if (strict && match.isBreak && objPocketed.length === 0 && log.railBalls.length < 4 && log.firstContact !== null) {
    out.fouls.push('illegalBreak');
  }
  out.foul = out.fouls[0] ?? null;
  const foul = out.fouls.length > 0;

  // Objektbälle vom Tisch (außer 8 nach dem Break) werden wieder aufgesetzt
  for (const id of objOff) if (id !== 8 || match.isBreak) out.respot.push(id);

  // Die 8
  if (eightDown) {
    if (match.isBreak) {
      if (!out.respot.includes(8)) out.respot.push(8);
    } else {
      const g = me.group;
      const cleared = g !== null && remainingOfGroup(g, before) === 0;
      if (cleared && !foul && objPocketed.includes(8)) {
        out.winner = shooter;
        out.endReason = 'eight';
      } else {
        out.winner = opponent;
        out.endReason = !cleared ? 'eightEarly' : 'eightFoul';
      }
      out.continueTurn = false;
      out.nextPlayer = opponent;
      return out;
    }
  }

  // Gruppenzuordnung bei offenem Tisch (nicht beim Break)
  const legalPots = objPocketed.filter((id) => id !== 8);
  if (!foul && !match.isBreak && me.group === null && legalPots.length > 0) {
    const g = /** @type {Group} */ (groupOf(legalPots[0]));
    out.groupAssigned = { player: shooter, group: g };
  }

  if (!foul) {
    let keep;
    if (match.isBreak) keep = objPocketed.length > 0;
    else {
      const g = out.groupAssigned ? out.groupAssigned.group : me.group;
      keep = g === null ? legalPots.length > 0 : legalPots.some((id) => groupOf(id) === g);
    }
    out.continueTurn = keep;
    out.nextPlayer = keep ? shooter : opponent;
  } else {
    out.nextPlayer = opponent;
    if (strict) out.ballInHand = 'anywhere';
    else if (out.cueReturned) out.ballInHand = 'kitchen';
  }
  if (!foul && out.cueReturned) out.ballInHand = 'kitchen';
  return out;
}

/** Wendet das Ergebnis auf den Match-Zustand an. @param {Match} match @param {ShotOutcome} out */
export function applyOutcome(match, out) {
  match.shots++;
  if (out.groupAssigned) {
    const { player, group } = out.groupAssigned;
    match.players[player].group = group;
    match.players.forEach((p, i) => { if (i !== player) p.group = otherGroup(group); });
  }
  if (out.foul) match.players[match.current].fouls++;
  match.lastFoul = out.foul;
  match.isBreak = false;
  match.winner = out.winner;
  match.endReason = out.endReason;
  match.current = out.nextPlayer;
  match.ballInHand = out.ballInHand;
}
