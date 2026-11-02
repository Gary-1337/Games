/* =====================================================================
   14  STRECKENEDITOR (Paint-Stil)
   ===================================================================== */
const ED_TOOLS = [
  ['paint', 'Malen'], ['fill', 'Füllen'], ['object', 'Objekt'], ['select', 'Auswahl'], ['startline', 'Start/Ziel'],
  ['checkpoint', 'Checkpoint'], ['ailine', 'KI-Linie'], ['pit', 'Boxengasse'], ['startpos', 'Startplatz'], ['height', 'Höhe'], ['bridge', 'Brücke']
];
const ED_HINT = {
  paint: 'Malen: Linke Maustaste gedrückt halten. Oberfläche und Pinselgröße rechts wählen.',
  fill: 'Füllen: Klick füllt eine zusammenhängende Fläche mit der gewählten Oberfläche.',
  object: 'Objekt: Klick setzt das gewählte Objekt. Rechtsklick löscht ein Objekt. Mausrad dreht das zuletzt gesetzte.',
  select: 'Auswahl: Objekte, Startplätze, Boxenbereich oder Checkpoint-Enden ziehen. Mausrad / Q E drehen, [ ] Länge, Shift+[ ] Breite, Entf löschen.',
  startline: 'Start/Ziel: Linie quer über die Fahrbahn ziehen. Sie ist Checkpoint 0.',
  checkpoint: 'Checkpoint: Linien quer über die Fahrbahn ziehen – in Fahrtrichtung der Reihe nach. Rechtsklick entfernt einen Checkpoint.',
  ailine: 'KI-Linie: Mit gedrückter Maustaste einmal rund um die Strecke in Fahrtrichtung zeichnen (geschlossene Schleife).',
  pit: 'Boxengasse: Vom Boxeneingang bis zum Ausgang zeichnen. Der Boxenbereich entsteht in der Mitte (mit Auswahl verschiebbar).',
  startpos: 'Startplatz: Klick setzt einen Startplatz (max. 8, Reihenfolge = Startposition). Rechtsklick entfernt.',
  height: 'Höhe: Gelände mit gedrückter Maustaste anheben, absenken, glätten oder auf eine Höhe ebnen. Steigungen über 1:5 bremsen, Kanten über 7 wirken wie Mauern.',
  bridge: 'Brücke: Vom einen Brückenende zum anderen ziehen (entlang der oberen Fahrbahn). Zufahrten werden automatisch aufgeschüttet. Mit Auswahl: + / − ändert die Höhe.'
};
const Editor = {
  t: null, gr: null, tool: 'paint', surf: S.ASPHALT, brush: 22, objType: 'tree', roadW: 80,
  hMode: 'up', hSize: 70, hStr: 3, bridgeZ: 30, bridgeW: 74, bridgeRamp: true,
  sel: null, drag: null, mouse: { x: 0, y: 0, in: false }, hist: [], tmp: null, dirty: false, lastObj: null,

  open(track) {
    Music.setDuck(1); Music.play('menu');
    if (track) this.load(track, false);
    else if (!this.t) this.load(newTrack(S.GRASS), false);
    Game.state = 'editor'; Game.race = null;
    showScreen(null);
    $('editor-ui').classList.add('on'); $('editor-status').classList.add('on');
    this.buildUI();
  },
  close() {
    $('editor-ui').classList.remove('on'); $('editor-status').classList.remove('on');
  },
  load(t, asCopy) {
    this.t = asCopy ? cloneTrack(t) : t;
    if (asCopy || !this.t.custom) { this.t.id = 'c_' + Date.now().toString(36); this.t.custom = true; if (!t.custom) this.t.name = (t.name + ' (Kopie)').slice(0, 40); }
    this.gr = makeGround(this.t);
    this.hist = []; this.sel = null; this.dirty = false; this.tmp = null;
  },
  snapshot() {
    const t = this.t;
    this.hist.push({ grid: t.grid.slice(), rest: JSON.stringify({ objects: t.objects, checkpoints: t.checkpoints, start: t.start, aiLine: t.aiLine, pit: t.pit, name: t.name, theme: t.theme }) });
    if (this.hist.length > 40) this.hist.shift();
    this.dirty = true;
  },
  undo() {
    const h = this.hist.pop(); if (!h) { toast('Nichts zum Rückgängigmachen.'); return; }
    const t = this.t; t.grid.set(h.grid); Object.assign(t, JSON.parse(h.rest));
    this.gr = makeGround(t); this.sel = null; this.buildUI();
  },
  setMsg(m) { this.msg = m; this.msgT = 4; },

  /* ---------- Seitenleiste ---------- */
  buildUI() {
    const t = this.t, tool = this.tool;
    const infos = allTrackInfos();
    let ctx = '';
    if (tool === 'paint' || tool === 'fill') {
      ctx += '<h4>Oberfläche</h4><div class="surfs">' + SURF.map((s, i) => {
        const c = s.col, txt = (c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11) > 140 ? '#111' : '#fff';
        return `<button data-ed="surf" data-v="${i}" class="${i === this.surf ? 'on' : ''}" style="background:rgb(${c})${i === S.CURB ? ';background:repeating-linear-gradient(90deg,#d62c2c 0 8px,#f0f0f0 8px 16px)' : ''};color:${txt}">${s.name}</button>`;
      }).join('') + '</div>';
      if (tool === 'paint') ctx += `<h4>Pinselgröße: ${this.brush}px</h4><input type="range" min="4" max="90" value="${this.brush}" data-ed="brush">`;
    } else if (tool === 'object') {
      ctx += '<h4>Objekt</h4><div class="grid2">' + Object.entries(OBJ_DEF).filter(([k]) => k !== 'bridge').map(([k, d]) => `<button data-ed="obj" data-v="${k}" style="${k === this.objType ? 'background:var(--accent);color:#1a0d05' : ''}">${d.name}</button>`).join('') + '</div>';
    } else if (tool === 'height') {
      ctx += '<h4>Modus</h4><div class="grid2">' + [['up', 'Anheben'], ['down', 'Absenken'], ['smooth', 'Glätten'], ['flat', 'Ebnen']].map(([k, n]) => `<button data-ed="hmode" data-v="${k}" style="${k === this.hMode ? 'background:var(--accent);color:#1a0d05' : ''}">${n}</button>`).join('') + '</div>';
      ctx += `<h4>Größe: ${this.hSize}px</h4><input type="range" min="20" max="240" value="${this.hSize}" data-ed="hsize">`;
      ctx += `<h4>Stärke: ${this.hStr}</h4><input type="range" min="1" max="10" value="${this.hStr}" data-ed="hstr">`;
      ctx += `<div class="grid2" style="margin-top:6px"><button data-ed="hflatall">Alles flach</button><button data-ed="hroad">Fahrbahn glätten</button></div>
        <div class="info">Ebnen nimmt die Höhe beim ersten Klick als Ziel. „Fahrbahn glätten“ ebnet die Strecke entlang der KI-Linie quer zur Fahrtrichtung.</div>`;
    } else if (tool === 'bridge') {
      ctx += `<h4>Deckhöhe: ${this.bridgeZ}</h4><input type="range" min="8" max="60" value="${this.bridgeZ}" data-ed="bz">`;
      ctx += `<h4>Breite: ${this.bridgeW}px</h4><input type="range" min="40" max="130" step="2" value="${this.bridgeW}" data-ed="bw">`;
      ctx += `<div class="row"><label style="display:flex;gap:6px;align-items:center"><input type="checkbox" data-ed="bramp" ${this.bridgeRamp ? 'checked' : ''}> Zufahrten aufschütten</label></div>
        <div class="info">Unter der Brücke bleibt das Gelände, wie es ist – dort kann eine zweite Fahrbahn durchführen. Die KI-Linie muss über die Brücke führen.</div>`;
    } else if (tool === 'checkpoint') {
      ctx += `<h4>Checkpoints (${t.checkpoints.length})</h4><div class="grid2"><button data-ed="autocp">Automatisch</button><button data-ed="clearcp">Löschen</button></div>
        <div class="info">Automatisch: verteilt Checkpoints entlang der KI-Linie. Start/Ziel bleibt erhalten.</div>`;
    } else if (tool === 'ailine') {
      ctx += `<h4>KI-Linie (${t.aiLine.length} Punkte)</h4><div class="grid2"><button data-ed="autoline">Aus Checkpoints</button><button data-ed="clearline">Löschen</button></div>
        <h4>Fahrbahn aus KI-Linie: ${this.roadW}px</h4><input type="range" min="40" max="120" step="2" value="${this.roadW}" data-ed="roadw">
        <div class="grid2" style="margin-top:6px"><button data-ed="pave">Asphaltieren</button><button data-ed="optline">Ideallinie glätten</button></div>
        <div class="info">Tipp: Mittellinie als KI-Linie zeichnen, dann „Asphaltieren“ und „Alles automatisch“ – fertig ist ein Kurs.</div>`;
    } else if (tool === 'pit') {
      ctx += `<h4>Boxengasse</h4><div class="grid2"><button data-ed="clearpit">Entfernen</button></div><div class="info">${t.pit ? 'Boxengasse vorhanden. Neu zeichnen ersetzt sie.' : 'Noch keine Boxengasse.'}</div>`;
    } else if (tool === 'startpos') {
      ctx += `<h4>Startplätze (${t.start.length}/8)</h4><div class="grid2"><button data-ed="autostart">Automatisch</button><button data-ed="clearstart">Löschen</button></div>`;
    } else if (tool === 'select') {
      ctx += `<div class="info">${this.sel ? 'Ausgewählt: ' + this.selName() : 'Nichts ausgewählt.'}</div>`;
      if (this.sel && this.sel.k === 'obj') ctx += '<div class="grid2" style="margin-top:6px"><button data-ed="rotl">⟲ Drehen</button><button data-ed="rotr">⟳ Drehen</button><button data-ed="del">Löschen</button></div>';
    }
    const probs = validateTrack(t);
    $('editor-ui').innerHTML = `
      <h4>Strecke</h4><input type="text" data-ed="name" value="${escapeHtml(t.name)}" maxlength="40">
      <div style="margin-top:4px"><select data-ed="theme">${Object.entries(THEMES).map(([k, v]) => `<option value="${k}" ${k === t.theme ? 'selected' : ''}>Stil: ${v}</option>`).join('')}</select></div>
      <h4>Werkzeug</h4><div class="tools">${ED_TOOLS.map(([k, n]) => `<button data-ed="tool" data-v="${k}" class="${k === tool ? 'on' : ''}">${n}</button>`).join('')}</div>
      ${ctx}
      <h4>Automatik</h4><div class="grid2"><button data-ed="autoall" style="grid-column:span 2">Alles automatisch berechnen</button></div>
      <div class="info">${probs.length ? '⚠ ' + probs.join('<br>⚠ ') : '✓ Strecke ist fahrbereit.'}</div>
      <h4>Datei</h4><div class="grid2">
        <button data-ed="undo">Rückgängig</button><button data-ed="new">Neu</button>
        <button data-ed="save">Speichern</button><button data-ed="delete">Löschen</button>
        <button data-ed="export">Export JSON</button><button data-ed="import">Import JSON</button></div>
      <div style="margin-top:6px;display:flex;gap:4px"><select data-ed="tpl" style="flex:1">${infos.map(i => `<option value="${i.id}">${escapeHtml(i.name)}${i.custom ? ' (eigene)' : ''}</option>`).join('')}</select><button class="btn small" data-ed="loadtpl">Laden</button></div>
      <h4>Los geht's</h4><div class="grid2"><button data-ed="test" style="background:var(--accent);color:#1a0d05;border-color:var(--accent)">▶ Testfahrt</button><button data-ed="exit">Hauptmenü</button></div>
      <div class="info">Strg+Z: Rückgängig · Die Strecke wird beim Speichern in diesem Browser abgelegt.</div>`;
  },
  selName() {
    const s = this.sel; if (!s) return '';
    if (s.k === 'obj') return OBJ_DEF[s.o.t].name;
    if (s.k === 'start') return 'Startplatz ' + (s.i + 1);
    if (s.k === 'box') return 'Boxenbereich';
    if (s.k === 'cp') return 'Checkpoint ' + s.i;
    return '';
  },
  async uiAct(act, v, el, type) {
    const t = this.t;
    if (type === 'input') {
      if (act === 'hsize') { this.hSize = +el.value; el.previousElementSibling.textContent = 'Größe: ' + el.value + 'px'; }
      if (act === 'hstr') { this.hStr = +el.value; el.previousElementSibling.textContent = 'Stärke: ' + el.value; }
      if (act === 'bz') { this.bridgeZ = +el.value; el.previousElementSibling.textContent = 'Deckhöhe: ' + el.value; }
      if (act === 'bw') { this.bridgeW = +el.value; el.previousElementSibling.textContent = 'Breite: ' + el.value + 'px'; }
      if (act === 'brush') { this.brush = +el.value; el.previousElementSibling.textContent = 'Pinselgröße: ' + el.value + 'px'; }
      if (act === 'roadw') { this.roadW = +el.value; el.previousElementSibling.textContent = 'Fahrbahn aus KI-Linie: ' + el.value + 'px'; }
      if (act === 'name') { t.name = el.value.slice(0, 40) || 'Neue Strecke'; this.dirty = true; }
      return;
    }
    if (type === 'change') {
      if (act === 'theme') { this.snapshot(); t.theme = el.value; }
      if (act === 'bramp') this.bridgeRamp = el.checked;
      return;
    }
    let err = null;
    switch (act) {
      case 'tool': this.tool = v; this.sel = null; this.tmp = null; break;
      case 'surf': this.surf = +v; break;
      case 'hmode': this.hMode = v; break;
      case 'hflatall': this.snapshot(); t.hm = newHeights(); this.gr = makeGround(t); break;
      case 'hroad': {
        if (t.aiLine.length < 20) { err = 'Keine KI-Linie vorhanden.'; break; }
        this.snapshot(); profileFromAiLine(t, this.roadW / 2); this.gr = makeGround(t); break;
      }
      case 'obj': this.objType = v; break;
      case 'autocp': this.snapshot(); err = autoCheckpoints(t); if (!err) this.setMsg(t.checkpoints.length + ' Checkpoints gesetzt.'); break;
      case 'clearcp': this.snapshot(); t.checkpoints = t.checkpoints.slice(0, 1); break;
      case 'autoline': this.snapshot(); err = autoAiLine(t); break;
      case 'clearline': this.snapshot(); t.aiLine = []; break;
      case 'optline': {
        if (t.aiLine.length < 20) { err = 'Keine KI-Linie vorhanden.'; break; }
        this.snapshot(); t.aiLine = optimizeLine(resample(t.aiLine, LINE_STEP, true), this.roadW / 2); alignLineToStart(t); break;
      }
      case 'pave':
        if (t.aiLine.length < 20) { err = 'Zuerst eine KI-Linie zeichnen.'; break; }
        this.snapshot(); paintAlong(t, t.aiLine, this.roadW / 2, S.ASPHALT, true, null, new Set([S.PIT])); this.gr = makeGround(t); break;
      case 'clearpit': this.snapshot(); t.pit = null; break;
      case 'autostart': this.snapshot(); err = autoStart(t); break;
      case 'clearstart': this.snapshot(); t.start = []; break;
      case 'rotl': case 'rotr': if (this.sel) { this.snapshot(); this.rotateSel(act === 'rotl' ? -Math.PI / 12 : Math.PI / 12); } break;
      case 'del': this.deleteSel(); break;
      case 'autoall': {
        this.snapshot();
        if (t.aiLine.length >= 20) { if (!t.checkpoints.length) t.checkpoints = []; err = autoCheckpoints(t); }
        else if (t.checkpoints.length >= 3) { err = autoAiLine(t); }
        else { err = 'Bitte zuerst eine KI-Linie zeichnen oder mindestens 3 Checkpoints setzen.'; break; }
        if (!err) err = autoStart(t);
        if (!err && t.objects.some(o => o.t === 'bridge')) { profileFromAiLine(t, this.roadW / 2); this.gr = makeGround(t); }
        if (!err) this.setMsg('Checkpoints, KI-Linie und Startplätze berechnet.');
        break;
      }
      case 'undo': this.undo(); return;
      case 'new': {
        const base = await dialog('Neue Strecke anlegen. Grundfläche wählen:', [{ label: 'Abbrechen', value: -1 }, { label: 'Gras', value: S.GRASS }, { label: 'Sand', value: S.SAND }, { label: 'Schnee', value: S.SNOW }, { label: 'Asphalt', value: S.ASPHALT, primary: true }]);
        if (base < 0) return;
        if (this.dirty && !await confirmDlg('Ungespeicherte Änderungen verwerfen?', 'Verwerfen')) return;
        const nt = newTrack(base); nt.theme = base === S.SAND ? 'desert' : base === S.SNOW ? 'snow' : 'meadow';
        this.load(nt, false); break;
      }
      case 'loadtpl': {
        const sel = $('editor-ui').querySelector('[data-ed=tpl]').value;
        if (this.dirty && !await confirmDlg('Ungespeicherte Änderungen verwerfen?', 'Verwerfen')) return;
        const src = getTrack(sel); if (!src) return;
        if (src.custom) this.load(src, false); else this.load(src, true);
        this.setMsg('„' + this.t.name + '“ geladen.'); break;
      }
      case 'save': {
        if (saveCustomTrack(t)) { this.dirty = false; toast('Strecke „' + t.name + '“ gespeichert.'); }
        else toast('Speichern fehlgeschlagen (Browser-Speicher voll?).');
        break;
      }
      case 'delete': {
        if (!store.get('cr_tracks', []).some(o => o.id === t.id)) { err = 'Diese Strecke ist noch nicht gespeichert.'; break; }
        if (!await confirmDlg('Strecke „' + t.name + '“ endgültig löschen?', 'Löschen')) return;
        deleteCustomTrack(t.id); this.load(newTrack(S.GRASS), false); toast('Strecke gelöscht.'); break;
      }
      case 'export': {
        const blob = new Blob([JSON.stringify(encodeTrack(t))], { type: 'application/json' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
        a.download = (t.name.replace(/[^\wäöüÄÖÜß\- ]+/g, '').trim() || 'strecke') + '.json';
        document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
        break;
      }
      case 'import': $('file-import').click(); return;
      case 'test': this.testDrive(); return;
      case 'exit':
        if (this.dirty && !await confirmDlg('Ungespeicherte Änderungen verwerfen und zum Menü?', 'Zum Menü')) return;
        this.close(); Game.toMenu(); return;
      default: return;
    }
    if (err) this.setMsg('⚠ ' + err);
    this.buildUI();
  },
  importFile(file) {
    const fr = new FileReader();
    fr.onload = () => {
      try {
        const t = decodeTrack(JSON.parse(fr.result));
        if (TRACK_DEFS.some(d => d.id === t.id) || store.get('cr_tracks', []).some(o => o.id === t.id)) t.id = 'c_' + Date.now().toString(36);
        t.custom = true;
        this.load(t, false); this.dirty = true; this.buildUI();
        toast('Strecke „' + t.name + '“ importiert. Zum Behalten speichern.');
      } catch (e) { toast('Import fehlgeschlagen: ' + e.message, 3500); }
    };
    fr.readAsText(file);
  },
  testDrive() {
    const probs = validateTrack(this.t);
    if (probs.length) { dialog('Die Strecke ist noch nicht fahrbereit:\n\n• ' + probs.join('\n• '), [{ label: 'OK', value: 1, primary: true }]); return; }
    const st = Options.data.setup, p = st.players[0];
    this.close();
    Game.startRace({ mode: 'test', track: this.t, laps: 3, ai: 3, diff: 2, players: [{ name: Options.data.names[0], cls: p.cls, color: COLORS[p.color] }], rules: { ...st.rules } });
  },

  /* ---------- Maus ---------- */
  pos(e) {
    const r = $('game').getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width * CW, y: (e.clientY - r.top) / r.height * H };
  },
  hit(x, y) {
    const t = this.t;
    if (t.checkpoints.length) for (let i = t.checkpoints.length - 1; i >= 0; i--) {
      const c = t.checkpoints[i];
      if (dist(c.x1, c.y1, x, y) < 7) return { k: 'cp', i, end: 1 };
      if (dist(c.x2, c.y2, x, y) < 7) return { k: 'cp', i, end: 2 };
    }
    for (let i = t.start.length - 1; i >= 0; i--) if (dist(t.start[i].x, t.start[i].y, x, y) < 11) return { k: 'start', i, o: t.start[i] };
    for (let i = t.objects.length - 1; i >= 0; i--) {
      const o = t.objects[i];
      const dx = x - o.x, dy = y - o.y, ca = Math.cos(o.a), sa = Math.sin(o.a);
      const lx = dx * ca + dy * sa, ly = -dx * sa + dy * ca;
      if (OBJ_DEF[o.t].round ? Math.hypot(dx, dy) < o.w / 2 + 2 : (Math.abs(lx) < o.w / 2 + 3 && Math.abs(ly) < o.h / 2 + 3)) return { k: 'obj', o };
    }
    if (t.pit && inBoxRect(t.pit.box, x, y)) return { k: 'box', o: t.pit.box };
    return null;
  },
  down(e) {
    const p = this.pos(e); if (p.x >= W) return;
    const t = this.t, right = e.button === 2;
    this.mouse = { x: p.x, y: p.y, in: true };
    switch (this.tool) {
      case 'paint':
        if (right) return;
        this.snapshot(); this.drag = { last: p };
        paintDisc(t, p.x, p.y, this.brush / 2, this.surf); updateGround(this.gr, t, p.x - this.brush, p.y - this.brush, p.x + this.brush, p.y + this.brush);
        break;
      case 'fill':
        if (right) return;
        this.snapshot(); floodFill(t, p.x, p.y, this.surf); this.gr = makeGround(t); break;
      case 'object': {
        if (right) { const h = this.hit(p.x, p.y); if (h && h.k === 'obj') { this.snapshot(); t.objects.splice(t.objects.indexOf(h.o), 1); } return; }
        this.snapshot();
        const d = OBJ_DEF[this.objType];
        let a = 0;
        if (this.objType === 'ramp' && t.aiLine.length > 10) { const i = nearestIndex(t.aiLine, p.x, p.y), tg = tangentAt(t.aiLine, i, true); a = Math.atan2(tg.y, tg.x); }
        const o = { t: this.objType, x: p.x, y: p.y, a, w: d.w, h: d.h };
        if (d.z) o.z = d.z;
        t.objects.push(o); this.lastObj = o; break;
      }
      case 'select': {
        const h = this.hit(p.x, p.y);
        this.sel = h;
        if (h) { this.snapshot(); this.drag = { sx: p.x, sy: p.y }; }
        this.buildUI(); break;
      }
      case 'startline': case 'checkpoint':
        if (right && this.tool === 'checkpoint') {
          let bi = -1, bd = 22;
          t.checkpoints.forEach((c, i) => { const d = dist((c.x1 + c.x2) / 2, (c.y1 + c.y2) / 2, p.x, p.y); if (d < bd) { bd = d; bi = i; } });
          if (bi >= 0) { this.snapshot(); t.checkpoints.splice(bi, 1); this.buildUI(); }
          return;
        }
        if (!right) this.tmp = { a: p, b: p };
        break;
      case 'ailine': case 'pit':
        if (!right) this.tmp = { pts: [p] };
        break;
      case 'height':
        if (right) return;
        this.snapshot(); this.drag = { last: p, target: terrainH(t, p.x, p.y) };
        this.applyHeight(p); break;
      case 'bridge':
        if (right) { const h = this.hit(p.x, p.y); if (h && h.o && h.o.t === 'bridge') { this.snapshot(); t.objects.splice(t.objects.indexOf(h.o), 1); this.buildUI(); } return; }
        this.tmp = { a: p, b: p }; break;
      case 'startpos': {
        if (right) { const i = t.start.findIndex(s => dist(s.x, s.y, p.x, p.y) < 12); if (i >= 0) { this.snapshot(); t.start.splice(i, 1); this.buildUI(); } return; }
        if (t.start.length >= MAX_CARS) { this.setMsg('⚠ Maximal 8 Startplätze.'); return; }
        this.snapshot();
        let a = 0;
        if (t.aiLine.length > 10) { const i = nearestIndex(t.aiLine, p.x, p.y), tg = tangentAt(t.aiLine, i, true); a = Math.atan2(tg.y, tg.x); }
        else if (t.start.length) a = t.start[t.start.length - 1].a;
        t.start.push({ x: p.x, y: p.y, a }); this.buildUI(); break;
      }
    }
  },
  move(e) {
    const p = this.pos(e), t = this.t;
    this.mouse = { x: p.x, y: p.y, in: p.x < W };
    if (!(e.buttons & 1)) return;
    if (this.tool === 'paint' && this.drag) {
      const l = this.drag.last;
      paintAlong(t, [l, p], this.brush / 2, this.surf, false);
      updateGround(this.gr, t, Math.min(l.x, p.x) - this.brush, Math.min(l.y, p.y) - this.brush, Math.max(l.x, p.x) + this.brush, Math.max(l.y, p.y) + this.brush);
      this.drag.last = p;
    } else if (this.tool === 'height' && this.drag) {
      if (dist(this.drag.last.x, this.drag.last.y, p.x, p.y) > 4) { this.applyHeight(p); this.drag.last = p; }
    } else if (this.tool === 'select' && this.drag && this.sel) {
      const dx = p.x - this.drag.sx, dy = p.y - this.drag.sy; this.drag.sx = p.x; this.drag.sy = p.y;
      const s = this.sel;
      if (s.k === 'cp') { const c = t.checkpoints[s.i]; if (s.end === 1) { c.x1 += dx; c.y1 += dy; } else { c.x2 += dx; c.y2 += dy; } }
      else { s.o.x += dx; s.o.y += dy; }
    } else if (this.tmp) {
      if (this.tmp.pts) { const l = this.tmp.pts[this.tmp.pts.length - 1]; if (dist(l.x, l.y, p.x, p.y) > 6) this.tmp.pts.push(p); }
      else this.tmp.b = p;
    }
  },
  up(e) {
    const t = this.t;
    if (this.drag) { this.drag = null; if (this.tool === 'select') this.buildUI(); return; }
    if (!this.tmp) return;
    const tmp = this.tmp; this.tmp = null;
    if (this.tool === 'bridge') {
      const len = dist(tmp.a.x, tmp.a.y, tmp.b.x, tmp.b.y);
      if (len < 40) { this.setMsg('⚠ Brücke zu kurz – vom einen Ende zum anderen ziehen.'); return; }
      this.snapshot();
      const b = { t: 'bridge', x: (tmp.a.x + tmp.b.x) / 2, y: (tmp.a.y + tmp.b.y) / 2, a: Math.atan2(tmp.b.y - tmp.a.y, tmp.b.x - tmp.a.x), w: Math.round(len), h: this.bridgeW, z: this.bridgeZ };
      t.objects.push(b);
      if (this.bridgeRamp) { if (t.aiLine.length > 20) profileFromAiLine(t, this.roadW / 2); else embankBridge(t, b); this.gr = makeGround(t); }
      this.setMsg('Brücke gesetzt (Höhe ' + b.z + ').');
    } else if (this.tool === 'startline' || this.tool === 'checkpoint') {
      if (dist(tmp.a.x, tmp.a.y, tmp.b.x, tmp.b.y) < 14) return;
      this.snapshot();
      const seg = { x1: tmp.a.x, y1: tmp.a.y, x2: tmp.b.x, y2: tmp.b.y };
      if (this.tool === 'startline' || !t.checkpoints.length) { t.checkpoints[0] = seg; snapStartLine(t); alignLineToStart(t); }
      else t.checkpoints.push(seg);
    } else if (this.tool === 'ailine') {
      if (tmp.pts.length < 12) { this.setMsg('⚠ Linie zu kurz – einmal rund um die Strecke zeichnen.'); return; }
      this.snapshot();
      t.aiLine = resample(chaikin(tmp.pts, true, 2), LINE_STEP, true);
      alignLineToStart(t);
      this.setMsg('KI-Linie gesetzt (' + t.aiLine.length + ' Punkte).');
    } else if (this.tool === 'pit') {
      const path = resample(chaikin(tmp.pts, false, 2), LINE_STEP, false);
      if (path.length < 15) { this.setMsg('⚠ Boxengasse zu kurz.'); return; }
      this.snapshot();
      paintAlong(t, path, 11, S.PIT, false, null, new Set([S.ASPHALT, S.CURB]));
      t.pit = { path, box: boxFromPath(path) };
      this.gr = makeGround(t);
    }
    this.buildUI();
  },
  wheel(e) {
    if (Game.state !== 'editor') return;
    const s = this.sel || (this.tool === 'object' && this.lastObj ? { k: 'obj', o: this.lastObj } : null);
    if (!s || s.k === 'cp') return;
    e.preventDefault();
    this.rotateSel((e.deltaY > 0 ? 1 : -1) * (e.shiftKey ? Math.PI / 36 : Math.PI / 12), s);
  },
  rotateSel(da, s = this.sel) { if (!s || !s.o) return; s.o.a = wrapAngle((s.o.a || 0) + da); if (s.k === 'box') { s.o.ca = undefined; s.o.sa = undefined; } this.dirty = true; },
  deleteSel() {
    const s = this.sel, t = this.t; if (!s) return;
    this.snapshot();
    if (s.k === 'obj') t.objects.splice(t.objects.indexOf(s.o), 1);
    else if (s.k === 'start') t.start.splice(s.i, 1);
    else if (s.k === 'cp') t.checkpoints.splice(s.i, 1);
    else if (s.k === 'box') t.pit = null;
    this.sel = null; this.buildUI();
  },
  key(e) {
    if (e.ctrlKey && e.code === 'KeyZ') { e.preventDefault(); this.undo(); return; }
    const s = this.sel || (this.tool === 'object' && this.lastObj ? { k: 'obj', o: this.lastObj } : null);
    if (e.code === 'Delete' || e.code === 'Backspace') { if (this.sel) { e.preventDefault(); this.deleteSel(); } return; }
    if (!s) return;
    if (e.code === 'KeyQ') this.rotateSel(-Math.PI / 12, s);
    if (e.code === 'KeyE') this.rotateSel(Math.PI / 12, s);
    if ((e.key === '+' || e.key === '-' || e.code === 'NumpadAdd' || e.code === 'NumpadSubtract') && s.o && (s.o.t === 'bridge' || s.o.t === 'ramp')) {
      const d = (e.key === '+' || e.code === 'NumpadAdd') ? 2 : -2;
      s.o.z = clamp((s.o.z || OBJ_DEF[s.o.t].z) + d, 4, 80); this.dirty = true; this.setMsg('Höhe: ' + s.o.z);
    }
    if ((e.code === 'BracketRight' || e.code === 'BracketLeft') && s.k === 'obj') {
      const d = e.code === 'BracketRight' ? 4 : -4, o = s.o;
      if (e.shiftKey && !OBJ_DEF[o.t].round) o.h = clamp(o.h + d, 4, 160);
      else { o.w = clamp(o.w + d, 6, 240); if (OBJ_DEF[o.t].round) o.h = o.w; }
      this.dirty = true;
    }
  },

  /** Höhen-Pinsel anwenden und Boden neu zeichnen. */
  applyHeight(p) {
    const t = this.t, r = this.hSize / 2;
    paintHeight(t, p.x, p.y, r, this.hMode, this.hStr * 0.8, this.drag ? this.drag.target : 0);
    updateGround(this.gr, t, p.x - r - 16, p.y - r - 16, p.x + r + 16, p.y + r + 16);
  },
  /* ---------- Darstellung ---------- */
  render(ctx) {
    const t = this.t;
    ctx.drawImage(this.gr.canvas, 0, 0);
    drawMarkings(ctx, t, {});
    for (const o of t.objects) drawObject(ctx, o, t.theme, 'shadow');
    for (const o of t.objects) drawObject(ctx, o, t.theme, 'base');
    ctx.globalAlpha = 0.85; for (const o of t.objects) drawObject(ctx, o, t.theme, 'top'); ctx.globalAlpha = 1;
    // KI-Linie mit Richtungspfeilen
    if (t.aiLine.length > 1) {
      ctx.strokeStyle = 'rgba(56,196,255,.9)'; ctx.lineWidth = 2; ctx.setLineDash([]);
      ctx.beginPath(); t.aiLine.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.closePath(); ctx.stroke();
      ctx.fillStyle = '#38c4ff';
      for (let i = 0; i < t.aiLine.length; i += 12) {
        const p = t.aiLine[i], tg = tangentAt(t.aiLine, i, true);
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.atan2(tg.y, tg.x));
        ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(-3, -4); ctx.lineTo(-3, 4); ctx.fill(); ctx.restore();
      }
    }
    if (t.pit) {
      ctx.strokeStyle = 'rgba(255,205,50,.7)'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]);
      ctx.beginPath(); t.pit.path.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.stroke(); ctx.setLineDash([]);
    }
    drawCheckpointsDebug(ctx, t);
    t.start.forEach((s, i) => {
      drawCarShape(ctx, s.x, s.y, s.a, '#9aa4b6', 'coupe', { alpha: 0.75, noShadow: true });
      label(ctx, s.x, s.y - 13, String(i + 1), 'rgba(0,0,0,.7)', '#fff', 9);
    });
    // Auswahl
    const s = this.sel;
    if (s) {
      ctx.strokeStyle = '#ff6a2b'; ctx.lineWidth = 2; ctx.setLineDash([4, 3]);
      if (s.k === 'cp') { const c = t.checkpoints[s.i]; if (c) { ctx.beginPath(); ctx.arc(s.end === 1 ? c.x1 : c.x2, s.end === 1 ? c.y1 : c.y2, 7, 0, 7); ctx.stroke(); } }
      else if (s.o) {
        const r = s.k === 'obj' ? objRadius(s.o) + 4 : s.k === 'box' ? Math.hypot(s.o.w, s.o.h) / 2 + 4 : 14;
        ctx.beginPath(); ctx.arc(s.o.x, s.o.y, r, 0, 7); ctx.stroke();
      }
      ctx.setLineDash([]);
    }
    // temporäre Eingaben
    if (this.tmp) {
      ctx.strokeStyle = this.tool === 'pit' ? '#ffcd32' : this.tool === 'ailine' ? '#38c4ff' : '#fff'; ctx.lineWidth = 3;
      ctx.beginPath();
      if (this.tmp.pts) this.tmp.pts.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
      else { ctx.moveTo(this.tmp.a.x, this.tmp.a.y); ctx.lineTo(this.tmp.b.x, this.tmp.b.y); }
      ctx.stroke();
    }
    // Pinsel-Cursor
    const m = this.mouse;
    if (m.in) {
      ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 1;
      if (this.tool === 'paint') { ctx.beginPath(); ctx.arc(m.x, m.y, this.brush / 2, 0, 7); ctx.stroke(); }
      else if (this.tool === 'height') { ctx.beginPath(); ctx.arc(m.x, m.y, this.hSize / 2, 0, 7); ctx.stroke(); ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.arc(m.x, m.y, this.hSize / 4, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
      else if (this.tool === 'object') { const d = OBJ_DEF[this.objType]; ctx.globalAlpha = 0.5; drawObject(ctx, { t: this.objType, x: m.x, y: m.y, a: 0, w: d.w, h: d.h }, t.theme, 'base'); drawObject(ctx, { t: this.objType, x: m.x, y: m.y, a: 0, w: d.w, h: d.h }, t.theme, 'top'); ctx.globalAlpha = 1; }
      else { ctx.beginPath(); ctx.moveTo(m.x - 6, m.y); ctx.lineTo(m.x + 6, m.y); ctx.moveTo(m.x, m.y - 6); ctx.lineTo(m.x, m.y + 6); ctx.stroke(); }
    }
    // Statuszeile
    const st = $('editor-status');
    const txt = (this.msgT > 0 ? this.msg + '   ·   ' : '') + ED_HINT[this.tool] + (m.in ? `   [${Math.round(m.x)}, ${Math.round(m.y)} · ${SURF[cellAt(t, m.x, m.y)].name} · Höhe ${Math.round(terrainH(t, m.x, m.y))}]` : '');
    if (st.textContent !== txt) st.textContent = txt;
  },
  update(dt) { if (this.msgT > 0) this.msgT -= dt; }
};

/* =====================================================================
   15  SPIELSTEUERUNG & HAUPTSCHLEIFE
   ===================================================================== */
const Game = {
  state: 'menu', race: null, demo: null, paused: false, champ: null, lastCfg: null, acc: 0,

  init() {
    Options.load();
    bindScreens();
    Touch.init();
    this.newDemo();
    UI.main();
    // Editor-Ereignisse
    const cv = $('game');
    cv.addEventListener('pointerdown', e => { if (this.state === 'editor') { cv.setPointerCapture(e.pointerId); Editor.down(e); } });
    cv.addEventListener('pointermove', e => { if (this.state === 'editor') Editor.move(e); });
    cv.addEventListener('pointerup', e => { if (this.state === 'editor') Editor.up(e); });
    cv.addEventListener('pointerleave', () => { Editor.mouse.in = false; });
    cv.addEventListener('contextmenu', e => e.preventDefault());
    cv.addEventListener('wheel', e => Editor.wheel(e), { passive: false });
    const eu = $('editor-ui');
    const edh = type => e => { const el = e.target.closest('[data-ed]'); if (!el) return; if (type === 'click' && (el.tagName === 'INPUT' || el.tagName === 'SELECT')) return; Editor.uiAct(el.dataset.ed, el.dataset.v, el, type); };
    eu.addEventListener('click', edh('click')); eu.addEventListener('input', edh('input')); eu.addEventListener('change', edh('change'));
    $('file-import').addEventListener('change', e => { const f = e.target.files[0]; if (f) Editor.importFile(f); e.target.value = ''; });
    window.addEventListener('gamepadconnected', e => { if (!Input.padsBlocked) toast('Gamepad erkannt: ' + e.gamepad.id.slice(0, 40)); });
    window.addEventListener('beforeunload', e => { if (Editor.dirty && this.state === 'editor') { e.preventDefault(); e.returnValue = ''; } });
  },
  newDemo() {
    const ids = TRACK_DEFS.map(d => d.id);
    const id = ids[Math.floor(Math.random() * ids.length)];
    const wx = Math.random() < 0.65 ? { sky: 'clear', time: 'day' } : resolveWeather(3, 3);
    this.demo = createRace({ mode: 'demo', trackId: id, laps: 2, ai: 7, diff: [1, 2, 3, 3], players: [], weather: wx, rules: { fuelOn: false, fuelPct: 100, tireOn: false, tirePct: 100, dmgOn: false, dmgPct: 100, pits: false } });
    this.demo.cd = 1.2;
  },
  /** Setup-Daten → Rennkonfiguration. */
  buildCfg(mode, trackId) {
    const st = Options.data.setup, names = Options.data.names;
    if (mode === 'quick') mode = QMODES[st.qmode || 0][0];
    const derby = mode === 'derby';
    if (derby && !trackId) trackId = st.derbyTrack;
    const trial = mode === 'trial', humans = trial ? 1 : st.humans;
    const players = [];
    for (let i = 0; i < humans; i++) players.push({ name: names[i], cls: st.players[i].cls, color: COLORS[st.players[i].color] });
    return {
      mode, trackId: trackId || (trial ? st.trialTrack : st.trackId), laps: trial ? st.trialLaps : st.laps,
      ai: trial ? 0 : Math.min(st.ai, MAX_CARS - humans), diff: st.diff, aiCls: st.aiCls >= 0 ? st.aiCls : null,
      weather: resolveWeather(st.weather, st.time), wxChoice: [st.weather, st.time],
      players, rules: { ...(trial ? st.trialRules : st.rules) }, timeLimit: DERBY_TIMES[st.derbyTime] || 180
    };
  },
  startFromSetup(mode) {
    if (mode === 'champ') {
      const st = Options.data.setup;
      const ids = st.champTracks.filter(id => allTrackInfos().some(t => t.id === id));
      if (!ids.length) { toast('Bitte mindestens eine Strecke auswählen.'); return; }
      const base = this.buildCfg('champ', ids[0]);
      const names = AI_NAMES.slice().sort(() => Math.random() - 0.5);
      const used = new Set(base.players.map(p => p.color)), cols = COLORS.filter(c => !used.has(c));
      const roster = [];
      for (let i = 0; i < base.ai; i++) roster.push({ name: names[i], color: cols[i % cols.length], cls: base.aiCls != null ? base.aiCls : Math.floor(Math.random() * CLASSES.length) });
      const table = {};
      base.players.forEach((p, i) => table['h' + i] = { name: p.name, color: p.color, human: i, points: 0, wins: 0, res: [] });
      roster.forEach((a, i) => table['a' + i] = { name: a.name, color: a.color, human: -1, points: 0, wins: 0, res: [] });
      this.champ = { tracks: ids, idx: 0, base, roster, table };
      this.startChampRace();
      return;
    }
    this.startRace(this.buildCfg(mode));
  },
  startChampRace() {
    const C = this.champ;
    this.startRace({ ...C.base, trackId: C.tracks[C.idx], aiRoster: C.roster, weather: resolveWeather(C.base.wxChoice[0], C.base.wxChoice[1]) });
  },
  startRace(cfg) {
    Sound.init(); Sound.stopEngines();
    this.lastCfg = cfg;
    Editor.close();
    this.race = createRace(cfg);
    Input.soloWasd = cfg.players.length === 1;
    if (Options.data.raceMusic) { Music.setDuck(0.65); Music.play(Music.forRace(cfg, this.race.rt.src.look || this.race.rt.theme)); }
    else { Music.stop(); Music.pending = null; }
    this.state = 'race'; this.paused = false; this.acc = 0;
    showScreen(null);
  },
  pause() {
    if (this.state !== 'race' || this.paused || !this.race || this.race.state === 'done') return;
    this.paused = true; Sound.stopEngines(); Music.setDuck(0.45); UI.pause();
  },
  resume() { this.paused = false; Music.setDuck(0.65); showScreen(null); },
  async pauseAct(act) {
    if (act === 'resume') this.resume();
    else if (act === 'camera') { cycleCamera(this.race); UI.pause(); }
    else if (act === 'restart') { if (this.lastCfg.mode === 'rally') Rally.restart(); else if (this.lastCfg.mode === 'champ') this.startChampRace(); else this.startRace(this.lastCfg); }
    else if (act === 'quit') {
      const m = this.race.mode;
      if (m === 'test') { Sound.stopEngines(); this.race = null; Editor.open(); return; }
      if (m === 'champ' || this.race.career) {
        if (!await confirmDlg('Rennen aufgeben? Du wirst als Letzter gewertet.', 'Aufgeben')) return;
        const R = this.race;
        for (const c of R.cars) if (c.human >= 0 && !c.finished) c.gaveUp = true;
        for (const c of R.cars) c.key = progressKey(c, R.rt, R);
        this.paused = false; R.state = 'done'; this.onRaceDone(); return;
      }
      Sound.stopEngines(); this.toMenu();
    }
  },
  toMenu() { Sound.stopEngines(); Speaker.stop(); const car = this.race && this.race.career; this.state = 'menu'; this.race = null; this.paused = false; this.champ = null; if (car) Career.open(); else UI.main(); },
  onRaceDone() {
    const R = this.race;
    if (R === this.demo || R == null) return;
    Sound.stopEngines();
    if (R.mode === 'rally') { Rally.done(R); return; }
    R.results = computeResults(R);
    if (R.mode === 'champ') {
      const C = this.champ;
      const fastest = R.results.filter(r => r.best != null).sort((a, b) => a.best - b.best)[0];
      for (const r of R.results) {
        const key = r.human >= 0 ? 'h' + r.human : 'a' + r.ri;
        const e = C.table[key]; if (!e) continue;
        const pts = r.points + (fastest === r ? 1 : 0);
        r.champPts = pts;
        e.points += pts; if (r.pos === 1) e.wins++;
        e.res[C.idx] = { pos: r.pos, pts };
      }
      C.idx++;
    }
    let extra = '';
    if (R.career) extra = Career.onRaceDone(R);
    const won = R.results[0] && R.results[0].human >= 0 && R.mode !== 'trial' && R.cars.length > 1;
    Music.setDuck(1); Music.play(won ? 'podium' : 'menu');
    this.state = 'results';
    UI.results(R, extra);
  },
  resultsAct(act) {
    if (this.lastCfg && this.lastCfg.mode === 'rally' && (act === 'again' || act === 'setup')) { if (act === 'again') Rally.restart(); else { this.state = 'menu'; this.race = null; Rally.ui(); } return; }
    if (act === 'again') this.startRace(this.lastCfg);
    else if (act === 'menu') this.toMenu();
    else if (act === 'setup') { this.state = 'menu'; this.race = null; UI.setup(this.lastCfg.mode); }
    else if (act === 'editor') { this.race = null; Editor.open(); }
    else if (act === 'champNext') { this.state = 'menu'; this.race = null; UI.champ(); }
    else if (act === 'careerNext') Career.afterResults();
  },
  async champAct(act) {
    if (act === 'next') this.startChampRace();
    else if (act === 'menu') this.toMenu();
    else if (act === 'abort') { if (await confirmDlg('Championship abbrechen?', 'Abbrechen')) this.toMenu(); }
  },
  onKey(e) {
    if ($('dialog').classList.contains('on')) return;
    if (this.state === 'race' && e.code === 'KeyC' && this.race && this.race.cars.filter(c => c.human >= 0).length === 1) { cycleCamera(this.race); if (this.paused) UI.pause(); return; }
    if (this.state === 'race' && (e.code === 'KeyP' || e.code === 'Escape')) {
      if (this.paused) this.resume(); else this.pause();
      return;
    }
    if (this.state === 'editor') { Editor.key(e); return; }
    if (this.state === 'menu' && e.code === 'Escape' && UI.current !== 'scr-main' && UI.current !== 'scr-champ') { Options.save(); UI.main(); }
  },
  update(dt) {
    if (this.state === 'menu' && this.demo) {
      this.acc += dt;
      while (this.acc >= DT) { updateRace(this.demo, DT); this.acc -= DT; }
      if (this.demo.state === 'done') this.newDemo();
      Particles.update(dt);
    } else if ((this.state === 'race' || this.state === 'results') && this.race) {
      const R = this.race;
      if (!this.paused) {
        this.acc += dt;
        let steps = 0;
        while (this.acc >= DT && steps < 30) { updateRace(R, DT); this.acc -= DT; steps++; if (this.race !== R) break; }
        Particles.update(dt);
      }
      // Sound
      if (this.race === R && this.state === 'race' && !this.paused) {
        let skid = 0;
        Sound.updateEngines(R, dt);
        for (const c of R.cars) {
          if (c.human < 0) continue;
          if (isTrackSurf(c.surf) || c.surf === S.ICE) skid = Math.max(skid, (c.slip - 30) / 120);
        }
        Sound.setSkid(skid);
      }
    } else if (this.state === 'editor') Editor.update(dt);
  },
  render() {
    const ctx = $('game').getContext('2d');
    if (this.state === 'menu') {
      if (this.demo) drawRace(ctx, this.demo);
      ctx.fillStyle = '#0b0f16'; ctx.fillRect(W, 0, PANEL, H);
    } else if ((this.state === 'race' || this.state === 'results') && this.race) {
      drawRace(ctx, this.race);
      drawPanel(ctx, this.race);
    } else if (this.state === 'editor' && Editor.t) {
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
      Editor.render(ctx);
    }
  }
};

/** Bühne an das Fenster anpassen (Seitenverhältnis bleibt erhalten). */
function resize() {
  const s = Math.min(window.innerWidth / CW, window.innerHeight / H);
  const st = $('stage');
  st.style.transform = `translate(${(window.innerWidth - CW * s) / 2}px, ${(window.innerHeight - H * s) / 2}px) scale(${s})`;
}
window.addEventListener('resize', resize);

let lastFrame = performance.now();
function frame(now) {
  const dt = Math.min(0.1, (now - lastFrame) / 1000); lastFrame = now;
  try { Game.update(dt); Game.render(); Touch.update(); }
  catch (err) { console.error(err); }
  requestAnimationFrame(frame);
}
resize();
Game.init();
requestAnimationFrame(frame);
</script>
</body>
</html>
