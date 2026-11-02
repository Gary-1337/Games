/* =====================================================================
   13b  KARRIERE: Ligen, Preisgeld, Autos kaufen, Freischalten, Spielstand
   Spielstand im Browser (localStorage 'cr_career').
   ===================================================================== */
/** Ligen. ev: { track, laps, mode: 'quick'|'elim'|'derby', wx, time } */
const CAREER_LEAGUES = [
  { id: 'rookie', name: 'Einsteiger-Pokal', diff: 0, ai: 5, fee: 0, prize: [1200, 850, 600, 450, 300, 200], bonus: [3000, 1800, 1000], aiCls: ['allround', 'brummer', 'kart'],
    desc: 'Kurze Rennen gegen gemütliche Gegner.',
    events: [{ track: 'oval', laps: 3 }, { track: 'kart', laps: 3 }, { track: 'city', mode: 'elim' }, { track: 'desert', laps: 3, wx: { sky: 'cloudy', time: 'day' } }] },
  { id: 'regional', name: 'Regional-Serie', diff: 1, ai: 6, fee: 500, prize: [2000, 1400, 1000, 750, 500, 350, 200], bonus: [6000, 3500, 2000], aiCls: ['allround', 'brummer', 'rally', 'kart', 'buggy', 'truck'],
    desc: 'Schotter, Brücken und das erste Derby.',
    events: [{ track: 'forest', laps: 3 }, { track: 'eight', laps: 3 }, { track: 'arena_mud', mode: 'derby', time: 150 }, { track: 'snow', laps: 3, wx: { sky: 'rain', time: 'day' } }, { track: 'beach', laps: 3, wx: { sky: 'clear', time: 'dusk' } }] },
  { id: 'national', name: 'Staatsmeisterschaft', diff: 2, ai: 7, fee: 1200, prize: [3500, 2500, 1800, 1300, 900, 600, 400, 250], bonus: [10000, 6000, 3500], aiCls: ['allround', 'rally', 'blitz', 'formula', 'muscle', 'ev'],
    desc: 'Starke Gegner, Wetter, Bergstadt und Ausscheidung im Steinbruch.',
    events: [{ track: 'tech', laps: 4 }, { track: 'icelake', laps: 3 }, { track: 'quarry', mode: 'elim' }, { track: 'city', laps: 4, wx: { sky: 'rain', time: 'night' } }, { track: 'mountain', laps: 3, wx: { sky: 'clear', time: 'dusk' } }] },
  { id: 'grandprix', name: 'Claude Grand Prix', diff: 3, ai: 7, fee: 3000, prize: [6000, 4200, 3000, 2200, 1500, 1000, 700, 400], bonus: [25000, 12000, 6000], aiCls: ['blitz', 'formula', 'rally', 'muscle', 'ev', 'allround'],
    desc: 'Die Königsklasse. Nur die Besten kommen durch.',
    events: [{ track: 'eight', laps: 4, wx: { sky: 'clear', time: 'night' } }, { track: 'harbor', laps: 4, wx: { sky: 'rain', time: 'day' } }, { track: 'arena_yard', mode: 'derby', time: 180 },
      { track: 'volcano', laps: 4, wx: { sky: 'clear', time: 'night' } }, { track: 'oval', laps: 8, pits: true }] }
];
/** Autos im Laden: Preis und ab welcher Liga sie kaufbar sind. */
const CAREER_CARS = { allround: { price: 0, league: 0 }, brummer: { price: 1500, league: 0 }, kart: { price: 2500, league: 0 }, buggy: { price: 4000, league: 1 }, truck: { price: 5000, league: 1 }, rally: { price: 6000, league: 1 }, muscle: { price: 8000, league: 2 }, blitz: { price: 9000, league: 2 }, ev: { price: 11000, league: 2 }, formula: { price: 14000, league: 3 } };
const CAREER_START_MONEY = 1500;
const money = v => v.toLocaleString('de-AT') + ' €';
const clsIndex = id => CLASSES.findIndex(c => c.id === id);
const trackName = id => { const d = TRACK_DEFS.find(d => d.id === id) || ARENA_DEFS.find(d => d.id === id); return d ? d.name : id; };
const EV_MODE = { quick: 'Rennen', elim: 'Ausscheidung', derby: 'Derby' };

const Career = {
  data: null,
  view: 'hub',            // 'hub' | 'table'
  newName: '', newColor: 0,

  load() { this.data = store.get('cr_career', null); return this.data; },
  save() { if (this.data) store.set('cr_career', this.data); },
  setName(v) { if (this.data) { this.data.name = v.trim().slice(0, 14) || 'Fahrer'; this.save(); } else this.newName = v; },

  open() { this.load(); this.view = this.data && this.data.cur && this.data.cur.idx > 0 ? 'table' : 'hub'; this.render(); },

  /* ---------- Bildschirm ---------- */
  render() {
    const el = $('scr-career');
    if (!this.data) { el.innerHTML = this.htmlNew(); showScreen('scr-career'); return; }
    el.innerHTML = this.view === 'table' ? this.htmlTable() : this.htmlHub();
    showScreen('scr-career');
  },
  htmlNew() {
    const nm = this.newName || Options.data.names[0];
    return `<div class="dim"></div><div class="wrap">
      <div class="head"><button class="btn" data-act="back">← Zurück</button><h2>Neue Karriere</h2></div>
      <div class="cols"><div class="col" style="width:520px"><h3>Fahrer</h3>
        <div class="row"><label class="l">Name</label><input class="name" style="background:#0f141d;border:1px solid var(--line);color:var(--text);border-radius:6px;padding:6px 8px;font-size:15px;width:220px" data-act="cname" value="${escapeHtml(nm)}" maxlength="14"></div>
        <div class="row"><label class="l">Farbe</label><div class="swatches">${COLORS.map((c, k) => `<span class="sw ${k === this.newColor ? 'on' : ''}" style="background:${c}" data-act="ncolor" data-v="${k}"></span>`).join('')}</div></div>
        <p class="note" style="line-height:1.6;margin-top:18px">Du startest mit ${money(CAREER_START_MONEY)} und einem <b>Allround</b>-Wagen.<br>
        Fahre Ligen mit 4–5 Rennen, verdiene Preisgeld und kaufe schnellere Autos.<br>
        Ein Platz unter den ersten drei in der Gesamtwertung schaltet die nächste Liga frei.<br>
        Der Spielstand wird automatisch im Browser gespeichert.</p></div>
      <div class="col" style="flex:1"><h3>Ligen</h3>${CAREER_LEAGUES.map((L, i) => `<div class="lcard"><b>${i + 1}. ${L.name}</b><span class="note"> · ${L.events.length} Rennen · Startgeld ${money(L.fee)} · Sieg-Bonus ${money(L.bonus[0])}</span><div class="note">${L.desc}</div></div>`).join('')}</div></div>
      <div class="startbar"><button class="btn primary big" data-act="create">Karriere beginnen ▶</button></div></div>`;
  },
  htmlHub() {
    const D = this.data;
    let garage = '';
    for (const c of CLASSES.slice().sort((a, b) => CAREER_CARS[a.id].price - CAREER_CARS[b.id].price)) {
      const info = CAREER_CARS[c.id], own = D.owned.includes(c.id), sel = D.car === c.id;
      const locked = !own && info.league > D.unlocked;
      let btn;
      if (own) btn = sel ? '<span class="tag on">gewählt</span>' : `<button class="btn small" data-act="pick" data-v="${c.id}">Fahren</button>`;
      else if (locked) btn = `<span class="note">ab Liga ${info.league + 1}</span>`;
      else btn = `<button class="btn small ${D.money >= info.price ? 'primary' : ''}" data-act="buy" data-v="${c.id}" ${D.money >= info.price ? '' : 'disabled'}>Kaufen ${money(info.price)}</button>`;
      garage += `<div class="gcar ${sel ? 'on' : ''} ${locked ? 'locked' : ''}"><div><b>${c.name}</b> <span class="note">Tempo ${c.maxSpeed} · Grip ${c.grip}</span><div class="note">${c.desc}</div></div><div>${btn}</div></div>`;
    }
    let leagues = '';
    CAREER_LEAGUES.forEach((L, i) => {
      const locked = i > D.unlocked, cur = D.cur && D.cur.li === i, best = D.best[L.id];
      const evs = L.events.map((e, k) => {
        const done = cur && k < D.cur.idx, r = cur && D.cur.mine[k];
        return `<span class="ev ${done ? 'done' : ''}">${k + 1}. ${escapeHtml(trackName(e.track))}${e.mode ? ' <i>' + EV_MODE[e.mode] + '</i>' : ''}${r ? ' – ' + r + '.' : ''}</span>`;
      }).join('');
      let btn;
      if (locked) btn = `<span class="note">🔒 Platz 1–3 in „${CAREER_LEAGUES[i - 1].name}“ schaltet frei</span>`;
      else if (cur) btn = `<button class="btn small" data-act="quitLeague">Aufgeben</button><button class="btn primary" data-act="continue">Weiter: Rennen ${D.cur.idx + 1} ▶</button>`;
      else if (D.cur) btn = '<span class="note">Erst die laufende Liga beenden</span>';
      else btn = `<button class="btn primary ${D.money >= L.fee ? '' : 'off'}" data-act="start" data-v="${i}" ${D.money >= L.fee ? '' : 'disabled'}>Starten${L.fee ? ' (' + money(L.fee) + ')' : ''} ▶</button>`;
      leagues += `<div class="lcard ${locked ? 'locked' : ''} ${cur ? 'cur' : ''}"><div class="lhead"><b>${i + 1}. ${L.name}</b><span class="note">KI: ${DIFFS[L.diff].name} · Preisgeld bis ${money(L.prize[0])} je Rennen · Bonus ${money(L.bonus[0])}${best ? ' · Bestes Ergebnis: Platz ' + best : ''}</span></div>
        <div class="evs">${evs}</div><div class="lact">${btn}</div></div>`;
    });
    const st = D.stats;
    return `<div class="dim"></div><div class="wrap">
      <div class="head"><button class="btn" data-act="back">← Hauptmenü</button><h2>Karriere</h2><div class="spacer"></div>
        <div class="moneybox">${money(D.money)}</div></div>
      <div class="cols"><div class="col" style="width:470px">
        <h3>Fahrer</h3>
        <div class="row"><span class="badge" style="background:${COLORS[D.color]}">P1</span><input class="name" style="background:#0f141d;border:1px solid var(--line);color:var(--text);border-radius:6px;padding:6px 8px;font-size:15px;width:180px" data-act="cname" value="${escapeHtml(D.name)}" maxlength="14"></div>
        <div class="swatches" style="margin:4px 0 10px">${COLORS.map((c, k) => `<span class="sw ${k === D.color ? 'on' : ''}" style="background:${c}" data-act="color" data-v="${k}"></span>`).join('')}</div>
        <div class="note">Rennen ${st.races} · Siege ${st.wins} · Podien ${st.podiums} · Ligatitel ${st.titles} · Verdient ${money(st.earned)}</div>
        <h3 style="margin-top:18px">Garage & Händler</h3>${garage}
        <div class="row" style="margin-top:14px"><button class="btn danger small" data-act="reset">Karriere löschen</button></div>
      </div>
      <div class="col" style="flex:1"><h3>Ligen</h3>${leagues}</div></div></div>`;
  },
  htmlTable() {
    const D = this.data, C = D.cur, L = CAREER_LEAGUES[C ? C.li : (D.lastLeague || { li: 0 }).li];
    const T = C || D.lastLeague;
    const done = !C;
    const list = Object.values(T.table).sort((a, b) => b.points - a.points || b.wins - a.wins);
    let head = '<th>Pl.</th><th>Fahrer</th><th>Auto</th><th>Punkte</th><th>Siege</th>';
    L.events.forEach((e, i) => head += `<th title="${escapeHtml(trackName(e.track))}">R${i + 1}</th>`);
    let rows = '';
    list.forEach((e, i) => {
      rows += `<tr class="${e.human >= 0 ? 'me' : ''}"><td class="pos">${i + 1}</td><td><span class="chip" style="background:${e.color}"></span>${escapeHtml(e.name)}</td><td>${escapeHtml(e.cls)}</td><td><b>${e.points}</b></td><td>${e.wins}</td>`;
      L.events.forEach((_, k) => { const r = e.res[k]; rows += `<td>${r == null ? '' : r.pos + '.<span class="note"> ' + r.pts + '</span>'}</td>`; });
      rows += '</tr>';
    });
    const next = C ? L.events[C.idx] : null;
    const msg = T.msg ? `<div class="careermsg">${T.msg}</div>` : '';
    return `<div class="dim"></div><div class="wrap">
      <div class="head"><h2>${L.name} – ${done ? 'Endstand' : 'Tabelle nach Rennen ' + C.idx + ' / ' + L.events.length}</h2><div class="spacer"></div><div class="moneybox">${money(D.money)}</div></div>
      ${msg}
      <div class="col" style="height:${msg ? 520 : 600}px"><table class="tbl"><tr>${head}</tr>${rows}</table></div>
      <div class="startbar">${done ? '<button class="btn primary big" data-act="hub">Zur Karriere ▶</button>' :
        `<button class="btn" data-act="hub">Karriere-Übersicht</button><button class="btn primary big" data-act="continue">Rennen ${C.idx + 1}: ${escapeHtml(trackName(next.track))}${next.mode ? ' (' + EV_MODE[next.mode] + ')' : ''} ▶</button>`}</div></div>`;
  },

  /* ---------- Aktionen ---------- */
  async act(act, v) {
    const D = this.data;
    Sound.click();
    if (act === 'back') { this.save(); UI.main(); return; }
    if (act === 'ncolor') { this.newColor = +v; this.render(); return; }
    if (act === 'create') {
      this.data = { v: 1, name: (this.newName || Options.data.names[0]).trim().slice(0, 14) || 'Fahrer', color: this.newColor, money: CAREER_START_MONEY,
        owned: ['allround'], car: 'allround', unlocked: 0, best: {}, cur: null, lastLeague: null, stats: { races: 0, wins: 0, podiums: 0, titles: 0, earned: 0 } };
      this.save(); this.view = 'hub'; this.render(); return;
    }
    if (!D) return;
    if (act === 'color') D.color = +v;
    else if (act === 'pick') D.car = v;
    else if (act === 'buy') {
      const info = CAREER_CARS[v];
      if (!info || D.owned.includes(v) || D.money < info.price || info.league > D.unlocked) return;
      if (!await confirmDlg(`${CLASSES[clsIndex(v)].name} für ${money(info.price)} kaufen?`, 'Kaufen')) return;
      D.money -= info.price; D.owned.push(v); D.car = v; toast(CLASSES[clsIndex(v)].name + ' gekauft!');
    }
    else if (act === 'start') this.startLeague(+v);
    else if (act === 'continue') { this.save(); this.startEvent(); return; }
    else if (act === 'quitLeague') { if (!await confirmDlg('Liga aufgeben? Startgeld und bisherige Wertung verfallen.', 'Aufgeben')) return; D.cur = null; }
    else if (act === 'reset') { if (!await confirmDlg('Karriere komplett löschen? Geld, Autos und Fortschritt gehen verloren.', 'Löschen')) return; store.del('cr_career'); this.data = null; this.render(); return; }
    else if (act === 'hub') { this.view = 'hub'; }
    else return;
    this.save(); this.render();
  },
  startLeague(li) {
    const D = this.data, L = CAREER_LEAGUES[li];
    if (li > D.unlocked || D.cur || D.money < L.fee) return;
    D.money -= L.fee;
    const names = AI_NAMES.slice().sort(() => Math.random() - 0.5);
    const cols = COLORS.filter((c, k) => k !== D.color);
    const roster = [];
    for (let i = 0; i < L.ai; i++) roster.push({ name: names[i], color: cols[i % cols.length], cls: clsIndex(L.aiCls[i % L.aiCls.length]) });
    const table = { h0: { name: D.name, color: COLORS[D.color], cls: CLASSES[clsIndex(D.car)].name, human: 0, points: 0, wins: 0, res: [] } };
    roster.forEach((a, i) => table['a' + i] = { name: a.name, color: a.color, cls: CLASSES[a.cls].name, human: -1, points: 0, wins: 0, res: [] });
    D.cur = { li, idx: 0, roster, table, mine: [], earned: 0 };
    this.save();
    this.startEvent();
  },
  /** Rennkonfiguration für das aktuelle Ereignis. */
  eventCfg() {
    const D = this.data, C = D.cur, L = CAREER_LEAGUES[C.li], e = L.events[C.idx];
    const mode = e.mode || 'quick';
    const wx = e.wx || (Math.random() < 0.7 ? { sky: 'clear', time: 'day' } : resolveWeather(3, 3));
    const rules = { fuelOn: true, fuelPct: 100, tireOn: true, tirePct: 100, dmgOn: true, dmgPct: 100, pits: true };
    if ((e.laps || 3) <= 4 && !e.pits) { rules.fuelOn = false; rules.tireOn = false; }
    return { mode, career: true, trackId: e.track, laps: e.laps || 3, ai: L.ai, diff: L.diff, aiRoster: C.roster, weather: wx, timeLimit: e.time || 180,
      players: [{ name: D.name, cls: clsIndex(D.car), color: COLORS[D.color] }], rules };
  },
  startEvent() {
    const D = this.data;
    if (!D || !D.cur) { this.render(); return; }
    D.cur.table.h0.cls = CLASSES[clsIndex(D.car)].name;
    Game.startRace(this.eventCfg());
  },
  /** Nach dem Rennen: Punkte, Preisgeld, Statistik. */
  onRaceDone(R) {
    const D = this.data, C = D.cur; if (!C) return '';
    const L = CAREER_LEAGUES[C.li];
    const fastest = R.mode === 'derby' ? null : R.results.filter(r => r.best != null).sort((a, b) => a.best - b.best)[0];
    let mine = null;
    for (const r of R.results) {
      const key = r.human >= 0 ? 'h0' : 'a' + r.ri;
      const e = C.table[key]; if (!e) continue;
      const pts = r.points + (fastest === r ? 1 : 0);
      r.champPts = pts; e.points += pts; if (r.pos === 1) e.wins++;
      e.res[C.idx] = { pos: r.pos, pts };
      if (r.human >= 0) mine = r;
    }
    const pos = mine ? mine.pos : R.results.length;
    const prize = mine && mine.gap === 'aufgegeben' ? 0 : (L.prize[pos - 1] || 0);
    D.money += prize; C.earned += prize; D.stats.earned += prize; D.stats.races++;
    if (pos === 1) D.stats.wins++; if (pos <= 3) D.stats.podiums++;
    C.mine[C.idx] = pos;
    C.idx++;
    let extra = `<div class="careermsg">Platz ${pos}: <b>+${money(prize)}</b> Preisgeld · Kontostand ${money(D.money)}</div>`;
    C.msg = '';
    if (C.idx >= L.events.length) {
      // Liga beendet: Gesamtwertung, Bonus, Freischaltung
      const list = Object.entries(C.table).sort((a, b) => b[1].points - a[1].points || b[1].wins - a[1].wins);
      const place = list.findIndex(([k]) => k === 'h0') + 1;
      const bonus = L.bonus[place - 1] || 0;
      D.money += bonus; D.stats.earned += bonus;
      if (place === 1) D.stats.titles++;
      if (!D.best[L.id] || place < D.best[L.id]) D.best[L.id] = place;
      let msg = `Liga beendet: <b>Platz ${place}</b> in der Gesamtwertung.` + (bonus ? ` Bonus <b>+${money(bonus)}</b>.` : '');
      if (place <= 3 && C.li + 1 < CAREER_LEAGUES.length && D.unlocked < C.li + 1) {
        D.unlocked = C.li + 1;
        const cars = CLASSES.filter(c => CAREER_CARS[c.id].league === D.unlocked).map(c => c.name);
        msg += ` 🔓 <b>${CAREER_LEAGUES[D.unlocked].name}</b> freigeschaltet` + (cars.length ? ', neu beim Händler: ' + cars.join(', ') : '') + '.';
      } else if (place <= 3 && C.li === CAREER_LEAGUES.length - 1) msg += ' 🏆 Du hast die höchste Liga gemeistert!';
      else if (place > 3) msg += ' Für die nächste Liga brauchst du Platz 1–3 – versuch es noch einmal.';
      D.lastLeague = { li: C.li, table: C.table, msg };
      D.cur = null;
      extra += `<div class="careermsg">${msg}</div>`;
    }
    this.save();
    return extra;
  },
  afterResults() { Game.state = 'menu'; Game.race = null; this.load(); this.view = 'table'; this.render(); }
};
