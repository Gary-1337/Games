# Claude Rallye – Fortsetzung in der nächsten Sitzung

Stand 16.11.2026 · Version **1.11.0** · Repository `Gary-1337/Games` (privat), Ordner `claude-rallye/` · letzter Commit „Claude Rallye 1.11.0: Cockpit-Ansicht …“

## Zum Einfügen in die neue Sitzung
> Wir arbeiten an Claude Rallye im Repository Gary-1337/Games (Ordner claude-rallye). Lies zuerst `claude-rallye/FORTSETZUNG.md` und `claude-rallye/ARBEITSSTAND.md`. Aktuell ist Version 1.11.0 mit der neuen Cockpit-Ansicht (Grundversion). Nächster Schritt: [hier den Wunsch eintragen, z. B. „Cockpit-Ansicht ausbauen: Reifenspuren und Staub in 3D“].

## Wo es steht
- **Fertig und vom Nutzer gesehen:** 1.11.0 Cockpit-Ansicht (Taste C, vierte Kamerastufe, nur Einzelspieler, eigenes Cockpit je Klasse, Rückspiegel, Licht/Nebel/Wetter). Rückmeldung: „sieht alles gut aus“.
- **Davor:** 1.10.1 Boxenstopp-Reparatur · 1.10.0 Tankpflicht · 1.9.0 3D-Automodelle und Streckengrafik · 1.8.0 Leistung, Raketenstart, Zwischenzeiten.
- **Nichts ist halb fertig.** Es gibt keinen offenen Auftrag.

## Vorschläge für den Ausbau der Cockpit-Ansicht (nur nach Rückfrage)
1. Reifenspuren in 3D (Spuren zusätzlich in eine Welt-Ebene zeichnen und als zweite Bodentextur einblenden).
2. Staub-, Rauch- und Spritzwasserwolken als Billboards (Partikel aus `Particles`).
3. Scheinwerfer der Gegner als Lichtkegel bei Nacht, Rücklichter-Schein.
4. Räder lenken und drehen sich (eigene Netze je Rad statt fest im Automodell).
5. Sichtbarer Schaden: Rauch aus der Motorhaube, Risse in der Scheibe, wackelnde Teile.
6. Anzeige des nächsten Checkpoints (Pfeil oder Markierung im Bild), kleine Streckenkarte im Armaturenbrett.
7. Animierte Zuschauer und Fahnen.
8. Splitscreen für 2 Spieler (wurde vorerst abgelehnt – nur auf Wunsch).

Weitere offene Punkte (Tankpflicht, Ladezeit, Häuser im alten Stil) stehen in `ARBEITSSTAND.md` unter „Mögliche nächste Schritte“.

## Arbeitsablauf (Kurzfassung)
1. `git remote set-url origin https://github.com/Gary-1337/Games.git` (Adresse wird beim Sitzungsstart zurückgesetzt), dann `git pull --ff-only` – andere Sitzungen pushen auch.
2. Nur `src/*.js` ändern, dann `sh build.sh` (erzeugt `index.html`). Cockpit-Code: `src/75_cockpit.js`.
3. Tests aus `claude-rallye/`: `python3 tests/regression.py`, `modes.py`, `powerups.py`, `rally.py`, `missedcp.py`, `extras.py`, `fuel.py` (lang; `fuel.py oval,city` für eine Kurzfassung), `pitstop.py`, `cockpit.py`.
4. Bilder der Cockpit-Ansicht: `python3 tools/cockpit_shots.py vorher forest:1 city:4:2500:2:0` (KI fährt das Spielerauto, siehe Kopf der Datei). Headless-Chromium kann WebGL2 ohne Zusatzoptionen; Bildzeiten dort sind Software-Rendering und nicht aussagekräftig. Für Fotos `Options.data.gfx='high'` (macht das Skript).
5. Veröffentlichen:
   - `VERSION` in `src/10_core.js` erhöhen, bauen, alle Tests.
   - `CHANGELOG.md` (neuer Eintrag oben), `ARBEITSSTAND.md` und diese Datei aktualisieren.
   - `cp index.html versions/index-vX.Y.Z.html`, ältesten Stand löschen (höchstens 3).
   - Startseite `../index.html` (Versionsangabe auf der Rallye-Karte) und `../README.md` anpassen.
   - Commit mit Autor „Gerald Mirnig“ und der Attribution aus der Sitzung, `git push origin main`.
   - Im claude.ai-Projekt „Games“: `claude-rallye/index.html`, `CHANGELOG.md`, `ARBEITSSTAND.md`, `FORTSETZUNG.md`, `versions/` (dort immer die zwei Vorgänger) und die Startseite `index.html` ersetzen.
6. Vor dem Nutzungslimit anhalten und diese Datei sowie `ARBEITSSTAND.md` auf den Stand bringen.

## Vorgaben des Nutzers
- Antworten direkt, präzise, auf Deutsch; nachfragen, wenn etwas unklar ist.
- Höchstens 3 Versionsstände sichern; Änderungen dokumentieren, damit man zurückspringen kann.
- Kommentator standardmäßig aus; Power-ups standardmäßig aus, nie in Karriere, Zeitfahren und Derby.
