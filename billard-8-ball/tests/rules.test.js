import { test, assert, equal } from './harness.js';
import { createMatch, evaluateShot, applyOutcome, legalTargets } from '../src/game/rules.js';

const ALL = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

function match(opts = {}) {
  const m = createMatch({ mode: 'pvp', players: [{ name: 'A' }, { name: 'B' }], ...opts });
  m.isBreak = false;
  m.ballInHand = 'none';
  return m;
}

function log(o = {}) {
  return { firstContact: null, railAfterContact: false, railBalls: [], pocketed: [], offTable: [], ...o };
}
const pots = (...ids) => ids.map((id) => ({ id, pocket: 0, t: 0 }));

test('Foul: Spielkugel versenkt → Gegner mit Ball in Hand', () => {
  const m = match();
  const out = evaluateShot(m, log({ firstContact: 3, railAfterContact: true, pocketed: pots(0) }), ALL);
  equal(out.foul, 'cueScratch');
  equal(out.nextPlayer, 1);
  equal(out.ballInHand, 'anywhere');
  assert(out.cueReturned);
  applyOutcome(m, out);
  equal(m.current, 1, 'Spielerwechsel');
  equal(m.players[0].fouls, 1, 'Foulzähler');
});

test('Foul: keine Kugel getroffen', () => {
  const out = evaluateShot(match(), log(), ALL);
  equal(out.foul, 'noContact');
  equal(out.ballInHand, 'anywhere');
});

test('Foul: falsche Gruppe zuerst getroffen', () => {
  const m = match();
  m.players[0].group = 'solids';
  m.players[1].group = 'stripes';
  const out = evaluateShot(m, log({ firstContact: 12, railAfterContact: true }), ALL);
  equal(out.foul, 'wrongBall');
});

test('Foul: 8 zuerst bei offenem Tisch', () => {
  const out = evaluateShot(match(), log({ firstContact: 8, railAfterContact: true }), ALL);
  equal(out.foul, 'wrongBall');
});

test('Foul: keine Bande nach Kontakt (abschaltbar)', () => {
  const l = log({ firstContact: 3 });
  equal(evaluateShot(match(), l, ALL).foul, 'noRail');
  equal(evaluateShot(match({ railRule: false }), l, ALL).foul, null);
});

test('Legal versenkt: Gruppe wird zugeordnet, Spieler bleibt am Tisch', () => {
  const m = match();
  const out = evaluateShot(m, log({ firstContact: 11, pocketed: pots(11, 2) }), ALL);
  equal(out.foul, null);
  equal(out.groupAssigned?.group, 'stripes', 'erste versenkte Kugel bestimmt Gruppe');
  assert(out.continueTurn);
  applyOutcome(m, out);
  equal(m.players[0].group, 'stripes');
  equal(m.players[1].group, 'solids');
  equal(m.current, 0);
});

test('Nur gegnerische Kugel versenkt → Spielerwechsel ohne Foul', () => {
  const m = match();
  m.players[0].group = 'solids';
  m.players[1].group = 'stripes';
  const out = evaluateShot(m, log({ firstContact: 3, pocketed: pots(10) }), ALL);
  equal(out.foul, null);
  equal(out.continueTurn, false);
  equal(out.nextPlayer, 1);
  equal(out.ballInHand, 'none');
});

test('8 zu früh versenkt → Niederlage', () => {
  const m = match();
  m.players[0].group = 'solids';
  m.players[1].group = 'stripes';
  const out = evaluateShot(m, log({ firstContact: 3, pocketed: pots(3, 8) }), ALL);
  equal(out.winner, 1);
  equal(out.endReason, 'eightEarly');
});

test('8 korrekt versenkt → Sieg; 8 mit Foul → Niederlage', () => {
  const m = match();
  m.players[0].group = 'solids';
  m.players[1].group = 'stripes';
  const before = [8, 9, 10];
  equal(legalTargets(m, 0, before).join(), '8', 'nur noch die 8 ist legal');
  const win = evaluateShot(m, log({ firstContact: 8, pocketed: pots(8) }), before);
  equal(win.winner, 0);
  const lose = evaluateShot(m, log({ firstContact: 8, pocketed: pots(8, 0) }), before);
  equal(lose.winner, 1);
  equal(lose.endReason, 'eightFoul');
});

test('Break: versenkte Kugel → weiter, Tisch bleibt offen; ungültiger Break ist Foul', () => {
  const m = createMatch({ mode: 'pvp', players: [{ name: 'A' }, { name: 'B' }] });
  const good = evaluateShot(m, log({ firstContact: 1, railBalls: [2], pocketed: pots(5) }), ALL);
  assert(good.continueTurn);
  equal(good.groupAssigned, null, 'Gruppe nicht beim Break');
  const bad = evaluateShot(m, log({ firstContact: 1, railBalls: [2, 3] }), ALL);
  equal(bad.foul, 'illegalBreak');
  const eight = evaluateShot(m, log({ firstContact: 1, pocketed: pots(8) }), ALL);
  equal(eight.winner, null, '8 beim Break: kein Spielende');
  assert(eight.respot.includes(8), '8 wird wieder aufgesetzt');
});

test('Lockere Regeln: kein Ball in Hand, Spielkugel nur in die Kopfzone', () => {
  const m = match({ casual: true });
  const out = evaluateShot(m, log({ firstContact: 3, pocketed: pots(0) }), ALL);
  equal(out.foul, 'cueScratch');
  equal(out.ballInHand, 'kitchen');
  const miss = evaluateShot(m, log({ firstContact: 3 }), ALL);
  equal(miss.foul, null, 'keine Bandenpflicht');
  const wrong = evaluateShot(m, log(), ALL);
  equal(wrong.ballInHand, 'none');
  equal(wrong.nextPlayer, 1);
});
