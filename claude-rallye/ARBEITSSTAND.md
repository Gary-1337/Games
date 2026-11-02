# Claude Rallye – Arbeitsstand (Übergabe)

Stand: 02.11.2026. Aktuell ist **Version 1.7.0-beta3** (`index.html`). Sie ist spielbar und getestet. Die Details stehen im `CHANGELOG.md`.

## Vorgaben des Nutzers
- Höchstens **3 Versionsstände** in `versions/` (ältere löschen; dank Git-Historie bleiben sie trotzdem abrufbar). Derzeit: `index-v1.6.2.html`, `index-v1.6.3.html` (letzte stabile), `index-v1.7.0-beta2.html`.
- Kommentator **standardmäßig aus**. Bevorzugt eine männliche Stimme, wählbar in den Optionen.
- Seit 02.11.2026 liegt alles im GitHub-Repository `Gary-1337/games` (privat), Ordner `claude-rallye/`.

## Version 1.7 (vom Nutzer freigegeben, Lieferung „alles auf einmal“)

### Erledigt (in 1.7.0-beta3 enthalten)
- **Kommentator:** Objekt `Speaker` (`speechSynthesis`, de-DE), bevorzugt männliche/natürliche Stimmen, Stimmenauswahl, Option `commentary` (Standard aus), abwechselnde Formulierungen.
- **Minikarte bei Zoom:** `drawMinimap` in der Seitenleiste.
- **Positionsanzeige:** `drawGaps` (Abstand vor/hinter in Sekunden), `drawEdgeArrows` (Pfeile zu Gegnern am Bildrand).

### Offen
1. **Power-ups (Arcade):** Nitro-Pads und einsammelbare Kisten mit Zufallsitem (Nitro, Öl werfen, Schutzschild), per Taste ausgelöst (Vorschlag: Spieler 1 Shift oder Strg, Gamepad B/LB). **Standard aus**, im Setup als Regel einschaltbar, in der Karriere keine Power-ups. Die KI nutzt Items ebenfalls.
2. **Punkt-zu-Punkt-Rallye** (neuer Modus): Etappe aus 3–4 zusammenhängenden, bildschirmgroßen Abschnitten (je 1280×800), Wechsel am Rand, allein gegen die Uhr, Bestzeiten je Etappe. Vorschlag: 3 Etappen (Wald, Schnee, Wüste).
3. **Bessere Menüs:** animierte Streckenvorschau im Setup, Autoauswahl mit 3D-Drehansicht (`drawCar3D` auf kleinem Canvas, Winkel animiert).
4. Danach: volle Tests, Version 1.7.0, CHANGELOG, Versionsablage (max. 3).

## Technik
- Quellen in `src/*`, `build.sh` setzt sie zu `index.html` zusammen (Reihenfolge siehe `build.sh`). Immer `src/` ändern, dann bauen.
- Beispielstrecken in `TRACK_DEFS`: `ctrl` ist die Mittellinie (Catmull-Rom); Geraden = mehrere Punkte auf einer Linie. `pit` ist nur ein Schalter, der Pfad wird automatisch erzeugt.
- Abkürzsperren (Reifenstapel) und Checkpoint-Fahnen werden automatisch erzeugt.
- Tests (Python + Playwright): `tests/regression.py` (KI-Rennen auf allen Strecken), `tests/modes.py` (Ausscheidung, Derby).
