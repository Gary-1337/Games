// @ts-check
// Kopfzeile (Spieler, Gruppen, Fouls, Kugelchips), Meldungen, Kraft- und Spin-Anzeige.
import { $, h } from './dom.js';
import { GROUP_NAME, SOLIDS, STRIPES } from '../game/rules.js';
import { ballColor } from '../render/textures.js';
import { CPU_LEVELS } from '../game/cpu.js';

export class Hud {
  constructor() {
    this.cards = [$('#p0'), $('#p1')];
    this.chips = $('#chips');
    this.toasts = $('#toasts');
    this.pill = $('#status-pill');
    this.powerFill = $('#power-fill');
    this.powerVal = $('#power-val');
    this.spinLabel = $('#spin-label');
    this.elevLabel = $('#elev-label');
    /** @type {HTMLElement[]} */
    this.chipEls = [];
    for (let id = 1; id <= 15; id++) {
      const c = h(`div.chip${id > 8 ? '.stripe' : ''}`, { title: `Kugel ${id}`, style: { backgroundColor: ballColor(id) } }, h('span', null, String(id)));
      this.chipEls[id] = c;
      this.chips.append(c);
    }
    this.lastPower = -1;
  }

  /**
   * @param {import('../game/rules.js').Match} match
   * @param {number[]} onTable
   */
  players(match, onTable) {
    const practice = match.mode === 'practice';
    this.cards[1].hidden = practice;
    match.players.forEach((p, i) => {
      const card = this.cards[i];
      card.classList.toggle('active', !practice && i === match.current);
      /** @type {HTMLElement} */ (card.querySelector('.pname')).textContent = p.cpu ? `${p.name} · ${CPU_LEVELS[p.difficulty]?.label ?? ''}` : p.name;
      const g = p.group;
      const left = g ? onTable.filter((id) => (g === 'solids' ? SOLIDS : STRIPES).includes(id)).length : null;
      /** @type {HTMLElement} */ (card.querySelector('.pgroup')).textContent = practice ? 'Übungsmodus · freies Spiel' : g ? `${GROUP_NAME[g]} ${g === 'solids' ? '●' : '◐'}` : 'Tisch offen';
      /** @type {HTMLElement} */ (card.querySelector('.pleft')).textContent = left === null ? '' : left === 0 ? 'jetzt die 8' : `noch ${left}`;
      const f = /** @type {HTMLElement} */ (card.querySelector('.pfouls'));
      f.textContent = practice ? '' : `Fouls ${p.fouls}`;
      f.classList.toggle('has', match.lastFoul !== null && i !== match.current && !practice);
    });
    const myGroup = practice ? null : match.players[match.current].group;
    for (let id = 1; id <= 15; id++) {
      const c = this.chipEls[id];
      c.classList.toggle('down', !onTable.includes(id));
      c.classList.toggle('mine', !!myGroup && (myGroup === 'solids' ? SOLIDS : STRIPES).includes(id));
    }
  }

  /** @param {string} msg @param {'info'|'foul'|'good'} [kind] */
  toast(msg, kind = 'info', ms = 2400) {
    const t = h(`div.toast.${kind}`, { role: 'status' }, msg);
    this.toasts.append(t);
    while (this.toasts.children.length > 3) this.toasts.firstElementChild?.remove();
    setTimeout(() => t.classList.add('out'), ms);
    setTimeout(() => t.remove(), ms + 400);
  }

  clearToasts() { this.toasts.replaceChildren(); }

  /** @param {string|null} text */
  status(text, thinking = false) {
    this.pill.hidden = !text;
    this.pill.textContent = text || '';
    this.pill.classList.toggle('thinking', thinking);
  }

  power(p) {
    const v = Math.round(p * 100);
    if (v === this.lastPower) return;
    this.lastPower = v;
    this.powerFill.style.width = `${v}%`;
    this.powerVal.textContent = `${v} %`;
  }

  spin(x, y, elevation) {
    const parts = [];
    if (y > 0.12) parts.push(`Nachlauf ${Math.round(y * 100)}%`);
    else if (y < -0.12) parts.push(`Rücklauf ${Math.round(-y * 100)}%`);
    if (x > 0.12) parts.push(`Effet rechts ${Math.round(x * 100)}%`);
    else if (x < -0.12) parts.push(`Effet links ${Math.round(-x * 100)}%`);
    this.spinLabel.textContent = parts.length ? parts.join(' · ') : 'Mitte';
    this.spinLabel.style.whiteSpace = parts.length > 1 ? 'normal' : 'nowrap';
    this.elevLabel.textContent = elevation > 0.5 ? `Queue ${Math.round(elevation)}° (Massé)` : 'Queue 0°';
  }
}
