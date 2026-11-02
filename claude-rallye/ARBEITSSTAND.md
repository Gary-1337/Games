# Claude Rallye – Arbeitsstand (Übergabe)

Stand: 02.11.2026. Aktuell ist **Version 1.7.2** (`index.html`): 1.7 komplett, schärfere Darstellung (1.7.1), Auto-Reset 5 s nach verpasstem Checkpoint (1.7.2, `car.missedT` in `updateRace`). Details stehen im `CHANGELOG.md`.

## Vorgaben des Nutzers
- Höchstens **3 Versionsstände** in `versions/`, ältere löschen (Git-Historie behält sie). Derzeit: `index-v1.7.0.html`, `index-v1.7.1.html`, `index-v1.7.2.html`.
- Kommentator **standardmäßig aus**, bevorzugt männliche Stimme.
- Power-ups standardmäßig aus, nie in Karriere, Zeitfahren und Derby.
- Ablage: GitHub-Repository `Gary-1337/Games` (privat), Ordner `claude-rallye/`. Startseite `index.html` im Hauptordner verlinkt alle Spiele.

## Technik
- Quellen in `src/*`, `build.sh` setzt sie zu `index.html` zusammen. Immer `src/` ändern, dann bauen.
- `src/55_powerups.js`: Objekt `PU` (setup/update/use/aiUse/draw…), Items `ITEMS`, Tasten `ITEM_KEYS`. Felder am Auto: `item`, `boostT`, `shieldT`, `oilT`. Am Rennen: `R.powerups`, `R.pads`, `R.boxes`, `R.slicks`. Regel `rules.powerups`.
- `src/58_rally.js`: `RALLY_STAGES` (Abschnitte mit `in`/`out` am Rand und `via`-Punkten), `getRallySection` baut daraus eine geschlossene Linie, deren Rückweg weit außerhalb der Karte liegt (`def.p2p` in `generateTrack`: kein Wasser außerhalb, nur Checkpoints ≥ 110 px vom Rand, Objekte nur in der Karte). `Rally.check` erkennt die Ausfahrt (alle Checkpoints, `nextCp === 0`), `Rally.nextSection` übernimmt Tempo und Schaden. Folgeabschnitte werden beim Start vorab gebaut (`cur.pre`). Bestzeiten in `localStorage` `cr_rally_<id>`.
- Auflösung: globale `RK` (Zeichenfaktor der Bühne, in `resize()` aus Fenster × devicePixelRatio, max. 3 bzw. 2 auf Touch). `Game.render` setzt `setTransform(RK…)`. `sceneRes()` wählt die Szenenauflösung `rs` (RK × Zoom), `cycleCameraRes()` baut bei Bedarf neu (Checkpoint-Fahnen bleiben erhalten).
- Setup-Animation: `UI.startSetupAnim` (Autos auf der Vorschau, 3D-Drehansicht `canvas.car3d`).
- Tests (Python + Playwright): `tests/regression.py` (KI-Rennen, alle Strecken), `tests/modes.py` (Ausscheidung, Derby), `tests/powerups.py`, `tests/rally.py`, `tests/missedcp.py`.

## Mögliche nächste Schritte (nur nach Rückfrage)
- Etappen länger machen (4. Abschnitt) oder Etappen-Editor.
- Rendering bei 3-facher Auflösung kostet mehr Leistung; falls es auf schwachen PCs ruckelt, Qualitätsoption einbauen.
- Rallye-Ghost je Etappe.
