# Claude Rallye – Arbeitsstand (Übergabe)

Stand: 10.11.2026. Aktuell ist **Version 1.8.0** (`index.html`): Überarbeitung mit Leistungsoptimierung, Grafikqualitäts-Option, Raketenstart, Zwischenzeiten und schnellster Rennrunde. Alles ist gebaut, getestet (alle 6 Testskripte grün), ins Repository übertragen und im Projekt abgelegt. **Es ist nichts halb fertig.** Details stehen im `CHANGELOG.md`.

## Vorgaben des Nutzers
- Höchstens **3 Versionsstände** in `versions/`, ältere löschen (Git-Historie behält sie). Derzeit: `index-v1.7.1.html`, `index-v1.7.2.html`, `index-v1.8.0.html`.
- Kommentator **standardmäßig aus**, bevorzugt männliche Stimme.
- Power-ups standardmäßig aus, nie in Karriere, Zeitfahren und Derby.
- Ablage: GitHub-Repository `Gary-1337/Games` (privat), Ordner `claude-rallye/`. Startseite `index.html` im Hauptordner verlinkt alle Spiele.

## Technik
- Quellen in `src/*`, `build.sh` setzt sie zu `index.html` zusammen. Immer `src/` ändern, dann bauen.
- `src/55_powerups.js`: Objekt `PU` (setup/update/use/aiUse/draw…), Items `ITEMS`, Tasten `ITEM_KEYS`. Felder am Auto: `item`, `boostT`, `shieldT`, `oilT`. Am Rennen: `R.powerups`, `R.pads`, `R.boxes`, `R.slicks`. Regel `rules.powerups`.
- `src/58_rally.js`: `RALLY_STAGES` (Abschnitte mit `in`/`out` am Rand und `via`-Punkten), `getRallySection` baut daraus eine geschlossene Linie, deren Rückweg weit außerhalb der Karte liegt (`def.p2p` in `generateTrack`: kein Wasser außerhalb, nur Checkpoints ≥ 110 px vom Rand, Objekte nur in der Karte). `Rally.check` erkennt die Ausfahrt (alle Checkpoints, `nextCp === 0`), `Rally.nextSection` übernimmt Tempo und Schaden. Folgeabschnitte werden beim Start vorab gebaut (`cur.pre`). Bestzeiten in `localStorage` `cr_rally_<id>`.
- Auflösung: globale `RK` (Zeichenfaktor der Bühne, in `resize()` aus Fenster × devicePixelRatio, max. 3 bzw. 2 auf Touch). `Game.render` setzt `setTransform(RK…)`. `sceneRes()` wählt die Szenenauflösung `rs` (RK × Zoom), `cycleCameraRes()` baut bei Bedarf neu (Checkpoint-Fahnen bleiben erhalten).
- Setup-Animation: `UI.startSetupAnim` (Autos auf der Vorschau, 3D-Drehansicht `canvas.car3d`).
- Tests (Python + Playwright): `tests/regression.py` (KI-Rennen, alle Strecken), `tests/modes.py` (Ausscheidung, Derby), `tests/powerups.py`, `tests/rally.py`, `tests/missedcp.py`, `tests/extras.py` (Raketenstart, Zwischenzeit, schnellste Runde). Ohne Grafikkarte fällt „Auto“ nach ca. 3 s auf „Mittel“; für Screenshots `Options.data.gfx='high'` setzen.
- Leistung (1.8.0): `Gfx` in `src/60_race.js` (`level()`, `maxRK()`, `watch()`; Option `Options.data.gfx`). `cachedGround(t)` in `src/30_trackgfx.js` (4 Untergründe im Speicher). Bremsspuren: `skidStroke`/`bindSkid`, Protokoll `race.skidLog` (max. 40000), wird nach Szenen-Neubau wieder eingezeichnet. `drawRace` blittet nur den Kameraausschnitt und überspringt Unsichtbares (`vis`).
- Neu (1.8.0): Raketenstart in `updateRace` (Countdown: `car.startHeld`, `car.startAt`; bei Grün `car.boostT`; ohne Power-ups zählt `updateRace` `boostT` selbst herunter). Zwischenzeiten in `passCheckpoint` (`car.curSplits`, `car.bestSplits`, nicht in Rallye). `race.fastLap = {t, id, name}` in `completeLap`, Punkt in der Rangliste (`drawPanel`).

## Mögliche nächste Schritte (nur nach Rückfrage)
- Etappen länger machen (4. Abschnitt) oder Etappen-Editor.
- `splatTerrain` braucht noch ca. 180 ms je Streckenaufbau (größter verbleibender Posten).
- Schnellste Runde in der Ergebnistabelle hervorheben; Zwischenzeiten auch im Zeitfahren gegen den Rekord.
- Offenes Angebot: Spiele als teilbare Seite veröffentlichen, solange das Repository privat ist (GitHub Pages geht nur öffentlich oder mit Bezahlplan).
- Rallye-Ghost je Etappe.
