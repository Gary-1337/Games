// @ts-check
// Menüs und Dialoge. Modal nur bei Menü, Pause, Spielende und Spielerübergabe (Kugeln ruhen dann).
import { $, h } from './dom.js';
import { CPU_LEVELS } from '../game/cpu.js';

export const VERSION = '1.0.1';

const root = () => $('#modal-root');

function seg(options, value, onPick) {
  const wrap = h('div.seg', { role: 'group' });
  const render = (v) => {
    wrap.replaceChildren(...options.map(([val, label]) => h('button', {
      type: 'button', 'aria-pressed': String(val === v),
      onclick: () => { render(val); onPick(val); },
    }, label)));
  };
  render(value);
  return wrap;
}

function toggle(label, hint, checked, onChange) {
  const id = `f-${Math.random().toString(36).slice(2, 8)}`;
  return h('div.field', null,
    h('label', { for: id }, label, hint ? h('small', null, hint) : null),
    h('input', { type: 'checkbox', id, checked, onchange: (e) => onChange(e.target.checked) }));
}

export class Dialogs {
  constructor() {
    /** @type {HTMLElement|null} */
    this.open = null;
    /** @type {HTMLElement|null} */
    this.tut = null;
    this.returnFocus = null;
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.open && this.onEscape) { e.preventDefault(); this.onEscape(); }
    });
    /** @type {(() => void)|null} */
    this.onEscape = null;
  }

  get isOpen() { return !!this.open; }

  show(content, onEscape = null) {
    this.close();
    this.returnFocus = /** @type {HTMLElement|null} */ (document.activeElement);
    const modal = h('div.modal', { role: 'dialog', 'aria-modal': 'true' }, ...content);
    this.open = h('div.modal-backdrop', null, modal);
    this.onEscape = onEscape;
    root().append(this.open);
    const first = /** @type {HTMLElement|null} */ (modal.querySelector('button, input'));
    first?.focus({ preventScroll: true });
  }

  close() {
    this.open?.remove();
    this.open = null;
    this.onEscape = null;
    this.returnFocus?.focus?.({ preventScroll: true });
  }

  /**
   * @param {import('./settings.js').Settings} s
   * @param {{hasSave:boolean, onContinue:()=>void, onCpu:()=>void, onPvp:()=>void, onPractice:()=>void, onSettings:()=>void, onHelp:()=>void, save:()=>void}} a
   */
  menu(s, a) {
    const names = [0, 1].map((i) => h('input', {
      type: 'text', maxlength: '14', value: s.names[i], 'aria-label': `Name Spieler ${i + 1}`,
      oninput: (e) => { s.names[i] = e.target.value.trim() || `Spieler ${i + 1}`; a.save(); },
    }));
    this.show([
      h('h1', null, '🎱 Billard 8-Ball'),
      h('p', null, 'Pool-Billard mit echter Physik – Spin, Effet, Draw und Massé.'),
      a.hasSave ? h('button.btn.primary', { onclick: a.onContinue }, '▶ Partie fortsetzen') : null,
      h('h2', null, 'Gegen CPU'),
      seg(Object.entries(CPU_LEVELS).map(([k, v]) => [k, v.label]), s.difficulty, (v) => { s.difficulty = v; a.save(); }),
      h(`button.btn${a.hasSave ? '' : '.primary'}`, { onclick: a.onCpu }, 'Spiel gegen CPU starten'),
      h('h2', null, '2 Spieler · ein Gerät'),
      h('div.names', null, ...names),
      h('button.btn', { onclick: a.onPvp }, 'Hot-Seat-Partie starten'),
      h('h2', null, 'Regeln'),
      toggle('Lockere Regeln', 'Kein Ball in Hand, keine Bandenpflicht', s.casual, (v) => { s.casual = v; a.save(); }),
      toggle('Bandenpflicht', 'Nach dem Kontakt muss eine Kugel eine Bande berühren', s.railRule, (v) => { s.railRule = v; a.save(); }),
      h('h2', null, 'Mehr'),
      h('button.btn', { onclick: a.onPractice }, 'Übungsmodus'),
      h('div.btn-row', null,
        h('button.btn', { onclick: a.onSettings }, '⚙ Einstellungen'),
        h('button.btn', { onclick: a.onHelp }, '? Hilfe')),
      h('p.version', null, `Version ${VERSION}`),
    ]);
  }

  /**
   * @param {import('./settings.js').Settings} s
   * @param {(key:string) => void} changed
   * @param {() => void} back
   */
  settings(s, changed, back) {
    const set = (k) => (v) => { s[k] = v; changed(k); };
    this.show([
      h('h1', null, 'Einstellungen'),
      h('h2', null, 'Zielhilfe'),
      seg([['off', 'Aus'], ['short', 'Kurz'], ['medium', 'Mittel'], ['long', 'Lang']], s.aimAssist, set('aimAssist')),
      toggle('Spielkugel-Vorschau', 'Weg der Spielkugel nach dem Kontakt', s.cuePreview, set('cuePreview')),
      toggle('Kamera folgt der Spielkugel', null, s.cameraFollow, set('cameraFollow')),
      h('h2', null, 'Sound & Haptik'),
      toggle('Sound', null, s.sound, set('sound')),
      h('div.field', null, h('label', { for: 'vol' }, 'Lautstärke'),
        h('input', { id: 'vol', type: 'range', min: '0', max: '1', step: '0.05', value: String(s.volume), oninput: (e) => set('volume')(Number(e.target.value)) })),
      toggle('Hintergrundmusik', 'Chilliger Bar-Jazz, live erzeugt', s.music, set('music')),
      h('div.field', null, h('label', { for: 'mvol' }, 'Musik-Lautstärke'),
        h('input', { id: 'mvol', type: 'range', min: '0', max: '1', step: '0.05', value: String(s.musicVolume), oninput: (e) => set('musicVolume')(Number(e.target.value)) })),
      toggle('Vibration', 'Beim Aufladen und Stoßen (falls unterstützt)', s.haptics, set('haptics')),
      h('h2', null, 'Bedienung & Barrierefreiheit'),
      toggle('Farbenblind-Modus', 'Muster, Symbole und Nummern über den Kugeln', s.colorblind, set('colorblind')),
      toggle('Linkshänder-Modus', 'Steuerzone und Trefferpunkt tauschen die Seite', s.leftHanded, set('leftHanded')),
      toggle('Miscues', 'Extremer Trefferpunkt + hohe Kraft kann abrutschen', s.miscue, set('miscue')),
      toggle('Schnellvorlauf', 'Langsam ausrollende Kugeln mit 3× Tempo zeigen', s.fastForward, set('fastForward')),
      toggle('Undo im 2-Spieler-Modus', null, s.undo2p, set('undo2p')),
      toggle('Zug verbergen bei Übergabe', 'Tisch wird beim Weitergeben unscharf', s.hideTurn, set('hideTurn')),
      h('h2', null, 'Grafik'),
      seg([['auto', 'Auto'], ['low', 'Niedrig'], ['medium', 'Mittel'], ['high', 'Hoch']], s.quality, set('quality')),
      h('button.btn', { onclick: () => { s.tutorialDone = false; changed('tutorialDone'); back(); } }, 'Tutorial erneut zeigen'),
      h('button.btn.primary', { onclick: back }, 'Fertig'),
    ], back);
  }

  help(back) {
    this.show([
      h('h1', null, 'Regeln & Hilfe'),
      h('h2', null, 'Steuerung'),
      h('ul.help-list', null,
        h('li', null, h('b', null, 'Zielen: '), 'in der unteren Zone waagrecht wischen oder auf den Tisch tippen. Langer Druck oder „Feinziel“ für minimale Korrekturen.'),
        h('li', null, h('b', null, 'Stoß: '), 'in der Zone nach unten ziehen lädt die Kraft (Prozentanzeige), Loslassen stößt. Zurückschieben bricht ab.'),
        h('li', null, h('b', null, 'Trefferpunkt: '), 'Punkt auf der Spielkugel verschieben – oben Nachlauf, unten Rücklauf (Draw), seitlich Effet. Doppeltipp = Mitte.'),
        h('li', null, h('b', null, 'Queue-Winkel: '), 'Taste „↕ Kraft“ auf „↕ Winkel“ umschalten und senkrecht wischen – mit Effet entsteht Massé.'),
        h('li', null, h('b', null, 'Kamera: '), '1 Finger auf dem Tisch dreht, 2 Finger zoomen (Pinch) und neigen, Doppeltipp setzt zurück. „Top“ = Vogelperspektive.'),
        h('li', null, h('b', null, 'Ball in Hand: '), 'Spielkugel mit dem Finger ziehen. Rot mit ✕ = ungültige Position.'),
        h('li', null, h('b', null, 'Tastatur: '), '← → zielen (Shift = fein), ↑ ↓ Kraft, Leertaste stößt, T = Top, R = Kamera, Esc = Pause.')),
      h('h2', null, '8-Ball'),
      h('ul.help-list', null,
        h('li', null, 'Nach dem Break ist der Tisch offen. Die erste regulär versenkte Kugel bestimmt deine Gruppe: Solids (1–7) oder Stripes (9–15).'),
        h('li', null, 'Versenke zuerst alle Kugeln deiner Gruppe, dann die 8. Wer eine eigene Kugel versenkt, bleibt am Tisch.'),
        h('li', null, 'Fouls: keine Kugel getroffen, falsche Kugel zuerst, keine Bande nach dem Kontakt, Spielkugel versenkt oder vom Tisch, Objektball vom Tisch. Danach hat der Gegner Ball in Hand.'),
        h('li', null, 'Die 8 zu früh oder mit Foul versenkt = verloren. Korrekt versenkt = gewonnen!'),
        h('li', null, 'Lockere Regeln: keine Bandenpflicht, nach Fouls nur Spielerwechsel (bei versenkter Spielkugel Platzierung im Kopffeld).')),
      h('button.btn.primary', { onclick: back }, 'Zurück'),
    ], back);
  }

  pause(a) {
    this.show([
      h('h1', null, 'Pause'),
      h('button.btn.primary', { onclick: a.resume }, '▶ Weiterspielen'),
      h('button.btn', { onclick: a.help }, 'Regeln & Hilfe'),
      h('button.btn', { onclick: a.settings }, 'Einstellungen'),
      a.canResign ? h('button.btn.danger', { onclick: a.resign }, 'Aufgeben') : null,
      h('button.btn', { onclick: a.menu }, 'Hauptmenü'),
    ], a.resume);
  }

  gameOver(info, a) {
    this.show([
      h('h1', null, info.title),
      h('p.lead', null, info.subtitle),
      info.detail ? h('p', null, info.detail) : null,
      h('button.btn.primary', { onclick: a.rematch }, 'Revanche'),
      a.replay ? h('button.btn', { onclick: a.replay }, '↺ Letzten Stoß ansehen') : null,
      h('button.btn', { onclick: a.menu }, 'Hauptmenü'),
    ]);
  }

  handover(info, ready) {
    this.show([
      h('h1', null, '📱 Weitergeben'),
      h('p.lead', null, `Handy an ${info.name} weitergeben`),
      ...info.lines.map((l) => h('p', null, l)),
      h('button.btn.primary', { onclick: ready }, `${info.name} ist bereit`),
    ], ready);
  }

  /** Tutorial-Karte (nicht modal), hebt das jeweilige Element hervor. */
  tutorial(steps, done) {
    let i = 0;
    const clear = () => document.querySelectorAll('.tut-highlight').forEach((e) => e.classList.remove('tut-highlight'));
    const render = () => {
      clear();
      this.tut?.remove();
      if (i >= steps.length) { this.tut = null; done(); return; }
      const s = steps[i];
      document.querySelector(s.target)?.classList.add('tut-highlight');
      this.tut = h('div.tutorial', { role: 'dialog', 'aria-label': 'Tutorial' },
        h('h3', null, `${i + 1}/${steps.length} · ${s.title}`),
        h('p', null, s.text),
        h('div.btn-row', null,
          h('button.btn', { onclick: () => { i = steps.length; render(); } }, 'Überspringen'),
          h('button.btn.primary', { onclick: () => { i++; render(); } }, i === steps.length - 1 ? 'Los geht’s' : 'Weiter')));
      document.body.append(this.tut);
    };
    render();
  }
}
