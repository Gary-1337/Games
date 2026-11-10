# Claude Rallye – Arbeitsstand (Übergabe)

Stand: 10.11.2026. Aktuell ist **Version 1.9.0** (`index.html`): neue 3D-Automodelle und überarbeitete Streckengrafik (davor 1.8.0: Leistung, Grafikqualität, Raketenstart, Zwischenzeiten, schnellste Rennrunde). Alles ist gebaut, getestet (alle 6 Testskripte grün, Rendering auf allen 14 Strecken ohne Fehler), ins Repository übertragen und im Projekt abgelegt. **Es ist nichts halb fertig.** Details stehen im `CHANGELOG.md`.

## Vorgaben des Nutzers
- Höchstens **3 Versionsstände** in `versions/`, ältere löschen (Git-Historie behält sie). Derzeit: `index-v1.7.2.html`, `index-v1.8.0.html`, `index-v1.9.0.html`.
- Kommentator **standardmäßig aus**, bevorzugt männliche Stimme.
- Power-ups standardmäßig aus, nie in Karriere, Zeitfahren und Derby.
- Ablage: GitHub-Repository `Gary-1337/Games` (privat), Ordner `claude-rallye/`. Startseite `index.html` im Hauptordner verlinkt alle Spiele.

## Technik
- Quellen in `src/*`, `build.sh` setzt sie zu `index.html` zusammen. Immer `src/` ändern, dann bauen.
- `src/55_powerups.js`: Objekt `PU` (setup/update/use/aiUse/draw…), Items `ITEMS`, Tasten `ITEM_KEYS`. Felder am Auto: `item`, `boostT`, `shieldT`, `oilT`. Am Rennen: `R.powerups`, `R.pads`, `R.boxes`, `R.slicks`. Regel `rules.powerups`.
- `src/58_rally.js`: `RALLY_STAGES` (Abschnitte mit `in`/`out` am Rand und `via`-Punkten), `getRallySection` baut daraus eine geschlossene Linie, deren Rückweg weit außerhalb der Karte liegt (`def.p2p` in `generateTrack`: kein Wasser außerhalb, nur Checkpoints ≥ 110 px vom Rand, Objekte nur in der Karte). `Rally.check` erkennt die Ausfahrt (alle Checkpoints, `nextCp === 0`), `Rally.nextSection` übernimmt Tempo und Schaden. Folgeabschnitte werden beim Start vorab gebaut (`cur.pre`). Bestzeiten in `localStorage` `cr_rally_<id>`.
- Auflösung: globale `RK` (Zeichenfaktor der Bühne, in `resize()` aus Fenster × devicePixelRatio, max. 3 bzw. 2 auf Touch). `Game.render` setzt `setTransform(RK…)`. `sceneRes()` wählt die Szenenauflösung `rs` (RK × Zoom), `cycleCameraRes()` baut bei Bedarf neu (Checkpoint-Fahnen bleiben erhalten).
- Automodelle (1.9.0): `src/36_cars3d.js`. `CAR_DEFS` beschreibt je Klasse den Rumpf als Querschnitte `hull: [[x, halbe Breite, Deckhöhe, Wölbung], …]` (von vorne nach hinten) und eine `build(b)`-Funktion mit Bausteinen: `b.hullOf` (Rumpf), `b.cabin` (Scheiben/Dach), `b.box`, `b.deck` (Aufkleber/Lichter auf dem Deck), `b.line`, `b.ball` (Helm), `b.wheel`. `carBuild` erzeugt daraus Flächen mit Normalen in den Phasen `pre → hull → deck → gh → post`; `drawCar3D` sortiert je Phase nach Tiefe, verwirft Rückseiten und beleuchtet (`CAR_L` Sonne, `CAR_V` Kamera). `open: true` = freistehende Räder (Formel, Buggy, Kart). `CAR_DETAIL` (0/1) schaltet Speichen und Fugen ab, wird in `drawRace` gesetzt. Materialien in `CAR_MAT`, Sonderfälle (`paint`, `glass`, `head`, `tail` …) in `shadeOf`.
- Streckengrafik (1.9.0): `surfColor` (Texturen je Untergrund; `SURF_TILE` für die Umland-Kachel, `CURB_ON` für Curb-Streifen), `fillGround` mischt die Zelltypen mit kubischem B-Spline über 4×4 Zellen (einheitliche 5×5-Umgebungen gehen den schnellen Weg). `cachedGround(t, rt)` braucht `rt` für die Curb-Streifen entlang der Ideallinie. In `src/35_view.js`: `groundDetails` (Büschel, Blumen, Steine), `grainTile` (Korn im Zoom), `drawSky` (Sonne, Wolken), Fahrspuren (`rut`) in `buildScene`, Schatten mit `ctx.filter` weichgezeichnet (Safari ignoriert das, dort bleiben sie hart).
- Setup-Animation: `UI.startSetupAnim` (Autos auf der Vorschau, 3D-Drehansicht `canvas.car3d`).
- Tests (Python + Playwright): `tests/regression.py` (KI-Rennen, alle Strecken), `tests/modes.py` (Ausscheidung, Derby), `tests/powerups.py`, `tests/rally.py`, `tests/missedcp.py`, `tests/extras.py` (Raketenstart, Zwischenzeit, schnellste Runde). Ohne Grafikkarte fällt „Auto“ nach ca. 3 s auf „Mittel“; für Screenshots `Options.data.gfx='high'` setzen.
- Leistung (1.8.0): `Gfx` in `src/60_race.js` (`level()`, `maxRK()`, `watch()`; Option `Options.data.gfx`). `cachedGround(t)` in `src/30_trackgfx.js` (4 Untergründe im Speicher). Bremsspuren: `skidStroke`/`bindSkid`, Protokoll `race.skidLog` (max. 40000), wird nach Szenen-Neubau wieder eingezeichnet. `drawRace` blittet nur den Kameraausschnitt und überspringt Unsichtbares (`vis`).
- Neu (1.8.0): Raketenstart in `updateRace` (Countdown: `car.startHeld`, `car.startAt`; bei Grün `car.boostT`; ohne Power-ups zählt `updateRace` `boostT` selbst herunter). Zwischenzeiten in `passCheckpoint` (`car.curSplits`, `car.bestSplits`, nicht in Rallye). `race.fastLap = {t, id, name}` in `completeLap`, Punkt in der Rangliste (`drawPanel`).

## Mögliche nächste Schritte (nur nach Rückfrage)
- Etappen länger machen (4. Abschnitt) oder Etappen-Editor.
- Ladezeit: `fillGround` (ca. 300 ms) und `splatTerrain` (ca. 370 ms bei doppelter Auflösung) sind die größten Posten beim Streckenaufbau.
- Autos: Schadensmodell sichtbarer machen (verbeulte Flächen), Scheinwerferkegel an die neuen Modelle anpassen, Editor-Vorschau (`drawCarShape`, flache 2D-Form) auf die neuen Modelle umstellen.
- Streckengrafik: Häuser, Tribünen und Boxengebäude sind noch im alten Stil.
- Schnellste Runde in der Ergebnistabelle hervorheben; Zwischenzeiten auch im Zeitfahren gegen den Rekord.
- Offenes Angebot: Spiele als teilbare Seite veröffentlichen, solange das Repository privat ist (GitHub Pages geht nur öffentlich oder mit Bezahlplan).
- Rallye-Ghost je Etappe.
