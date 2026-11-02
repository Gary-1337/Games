# Claude Rallye – Arbeitsstand (Übergabe)

Stand: 02.11.2026. Aktuell ist **Version 1.7.0** (`index.html`). Alle Punkte der Version 1.7 sind umgesetzt und getestet. Details stehen im `CHANGELOG.md`.

## Vorgaben des Nutzers
- Höchstens **3 Versionsstände** in `versions/`, ältere löschen (Git-Historie behält sie). Derzeit: `index-v1.6.3.html` (letzte 1.6), `index-v1.7.0-beta4.html`, `index-v1.7.0.html`.
- Kommentator **standardmäßig aus**, bevorzugt männliche Stimme.
- Power-ups standardmäßig aus, nie in Karriere, Zeitfahren und Derby.
- Ablage: GitHub-Repository `Gary-1337/Games` (privat), Ordner `claude-rallye/`. Startseite `index.html` im Hauptordner verlinkt alle Spiele.

## Technik
- Quellen in `src/*`, `build.sh` setzt sie zu `index.html` zusammen. Immer `src/` ändern, dann bauen.
- `src/55_powerups.js`: Objekt `PU` (setup/update/use/aiUse/draw…), Items `ITEMS`, Tasten `ITEM_KEYS`. Felder am Auto: `item`, `boostT`, `shieldT`, `oilT`. Am Rennen: `R.powerups`, `R.pads`, `R.boxes`, `R.slicks`. Regel `rules.powerups`.
- `src/58_rally.js`: `RALLY_STAGES` (Abschnitte mit `in`/`out` am Rand und `via`-Punkten), `getRallySection` baut daraus eine geschlossene Linie, deren Rückweg weit außerhalb der Karte liegt (`def.p2p` in `generateTrack`: kein Wasser außerhalb, nur Checkpoints ≥ 110 px vom Rand, Objekte nur in der Karte). `Rally.check` erkennt die Ausfahrt (alle Checkpoints, `nextCp === 0`), `Rally.nextSection` übernimmt Tempo und Schaden. Folgeabschnitte werden beim Start vorab gebaut (`cur.pre`). Bestzeiten in `localStorage` `cr_rally_<id>`.
- Setup-Animation: `UI.startSetupAnim` (Autos auf der Vorschau, 3D-Drehansicht `canvas.car3d`).
- Tests (Python + Playwright): `tests/regression.py` (KI-Rennen, alle Strecken), `tests/modes.py` (Ausscheidung, Derby), `tests/powerups.py`, `tests/rally.py`.

## Mögliche nächste Schritte (nur nach Rückfrage)
- Etappen länger machen (4. Abschnitt) oder Etappen-Editor.
- Bei Zoom-Wechsel (C) mitten in der Etappe werden die vorab gebauten Folgeabschnitte nicht in hoher Auflösung neu aufgebaut (dann etwas unschärfer).
- Rallye-Ghost je Etappe.
