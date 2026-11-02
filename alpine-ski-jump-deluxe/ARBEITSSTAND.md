# Alpine Ski Jump Deluxe – Arbeitsstand

**Stand:** 02.11.2026 · **Aktuelle Version:** 1.12.0 (`index.html`)
**Veröffentlichte Seite:** https://claude.ai/artifact/YLK1f3ADHsmyYHga9sS48f (Version 17 = 1.12.0)
**Versionen im Projekt:** `versions/index-v1.11.1.html`, `index-v1.11.2.html`, `index-v1.12.0.html` (höchstens 3 behalten, ältere löschen)

## Auftrag (vom Nutzer ausgewählt am 01.11.2026)
12 Verbesserungen in 4 Etappen, je Etappe eine Version mit Test, Changelog und Veröffentlichung:

| Etappe | Inhalt | Status |
|---|---|---|
| 1.7.0 | Ehrlichere Flugphysik, Anlaufluke + Wind-/Lukenausgleich | ✅ fertig |
| 1.8.0 | Mehr KI-Gegner, Weltcup-Modus, Fernsehgrafik | ✅ fertig |
| 1.9.0 | Erfolge, Seed teilen, echte Eingabefelder, Tutorial-Sprung | ✅ fertig |
| 1.10.0 | Mehr Leben am Hang, Wetter mit Wirkung, Mobil-Optimierung | ✅ fertig |

## Aufbau des Codes (eine Datei, Reihenfolge der Module)
`U` (Hilfen) → `Font` (5×7-Pixelschrift, Glyphen-Tabelle `G`; fehlende Zeichen erscheinen als „?“) → `Store/Settings/Records` (localStorage-Schlüssel `asjd_settings`, `asjd_records`, `asjd_comp`, `asjd_cup`) → `Sound` → `Input` → `GATE/PHYS/WIND_TYPES/WEATHER/PALETTES/DIFF` → `Hills` (Geometrie, Kalibrierung `_fitInrun`, `_fitAero`, `_fitCompensation`) → `JumpSim` (Physik) → `AIPilot` → `Scoring` (inkl. `compensation`) → `SCR/POSES/Renderer` (Welt nativ 1708×960, HUD logisch 854×480 ×2) → `Particles/SnowField/Ragdoll` → `CAM/COL/UI/MenuBG` → `NAT_COL/AI_JUMPERS` (30 fiktive Springer) → Szenen: `MenuScene`, `HillSelectScene`, `RandomScene`, `JumpScene`, `CompetitionScene` (+ `simulateAIJump`), `Cup`/`CupScene`, `PodiumScene`, `TutorialScene` (erbt von `JumpScene`), Module `TextField`, `Share`, `Ach` (Erfolge, Speicher `asjd_ach`), `HighscoreScene`, `SettingsScene`, `QuitScene` → `Game` (Hauptschleife, 60 Hz fix).

Menüszenen haben `get centered()` (640er-Layout, mittig mit Versatz `SCR.UIX`); `JumpScene` nutzt die volle Breite (`SCR.LW`, `SCR.LCX`).

## Wichtige Entscheidungen
- **Physik:** Gleitwinkel bleibt 2° steiler als der Hang (`PHYS.MARGIN`), sonst werden Flüge auf Großschanzen bistabil (schweben oder durchsacken). Nenntempo wird über ein mit K skalierendes Profil erreicht (`gk` in `Hills.build`: steilerer Knoll, höherer Tisch).
- **Wind** wirkt über den Auftrieb (`h.windLift = 0,03·√(90/K)`), ca. 1,5 m (K60) bis 9 m (K250) je m/s.
- **Luken** 1–20, Standard 10, Abstand 0,8 m (≈ 0,6 km/h). Ausgleichspunkte je Schanze aus Simulation (`gatePts`, `headPts`, `tailPts`).
- **KI:** Fehler skalieren mit (1 − Stärke); Stärke 0,97 ≈ 131 Pkt, 0,82 ≈ 114 Pkt, 0,66 ≈ 85 Pkt auf K120.
- **Namen** der KI-Springer sind frei erfunden – keine realen Athleten verwenden.

## Umgesetzt in 1.9.0 (Kurzinfo)
- Eingabefelder: `TextField.open(rect, {value, max, upper, filter, readOnly, onDone})` legt ein `<input>` über das Canvas; Spiel-Tastatur ist währenddessen gesperrt.
- Code-Format `SEED-WEITE×10-PRÜFZEICHEN` (`Share.make/parse`); Herausforderung landet als `session.challenge` im Training und als grüne Linie.

## Umgesetzt in 1.10.0 (Kurzinfo)
- `Quality` (in p5): Stufe `gfx` auto/high/low; low zeichnet die Welt in ein 854×480-Offscreen-Canvas (SCR wird währenddessen auf Z=1 umgeschaltet). AUTO: Touch (`pointer: coarse`) oder ≤4 Kerne → low; sonst Wechsel nach 3 s mit >21 ms Bildzeit im Sprung.
- Zeichenzeit Sprungbild (Headless ohne GPU): hoch ca. 13 ms, niedrig ca. 8,5 ms (vorher 18–20 ms).
- Pause: `JumpScene.paused`, `canPause()` (nicht im Tutorial), Taste P / Knopf II. Vollbild: `Game.fullscreen()` (Taste F außerhalb des Sprungs, Knopf im Hauptmenü).
- Personen: `g.people` in `Renderer.prepare`, gezeichnet in `_drawPeople`. Wetter-Reibung: `WEATHER[*].mu`, in `JumpSim` als `this.wmu`; Kalibrierung läuft mit `clean: true` ohne Wetter.

## 1.10.1
- KI überspringen: `CompetitionScene.skipAI` / `setSkipAI()` / `skipCurrent()`, `JumpScene.skipAllAI()`; im Weltcup als `cup.skipAI` gespeichert (`cup.save()`).

## 1.11.0 Mehrspieler (vom Nutzer gewählt: abwechselnd, 2–4 nur Menschen, Einzelspringen + Weltcup)
- `MultiScene` (Einstellungen in `Settings.data.mp`), Farben `MP_COL`.
- `CompetitionScene` mit `opts.mp` bzw. `cup.mp`: alle Springer `player: true`, Zustand `handoff` vor jedem Sprung (`drawHandoff`).
- `Cup.start(random, mp)`; Speicher `asjd_cup_mp` (Einzelspieler bleibt `asjd_cup`), `Cup.load(true)`.
- Podium/Highscores: im Mehrspieler keine Erfolge und kein Eintrag in die Wettkampf-Bestenliste; Schanzenrekorde mit dem Namen des Springers.
- 1.11.1: `HillSelectScene({ mp, hill })` dient als Schanzenauswahl im Mehrspieler-Einzelspringen (Ziel gespeichert in `Settings.data.mp.hill`).
- 1.11.2: `RandomScene({ mp })` für Mehrspieler-Zufallsschanzen (Seed in `Settings.data.mp.seed`).
- 1.12.0 (vom Nutzer gewählt: Mehr Ton, Handy-Feinschliff, Mehrspieler-Statistik, Textkorrektur):
  - `Sound.ambient(crowd, wind, freq)` / `Sound.ambientStop()` (eigene Schleifen, unabhängig von `stopLoops`), `sfx('groan', p)`, `cheer` mit p > 1.
  - `Haptic.buzz(pattern)` nur auf Touch und wenn `Settings.data.vibrate !== false`; Einstellungen haben jetzt 13 Zeilen (VIBRATION = Zeile 9, Name 10, Rekorde löschen 11, Zurück 12).
  - `Font.boost` (gesetzt in `Game.resize`): zentrierte Größe-1-Texte werden auf kleinen Touch-Bildschirmen 1,5-fach gezeichnet.
  - `MpStats` (localStorage `asjd_mpstats`, Einträge beim Endstand jedes Mehrspieler-Springens, Weltcup-Gesamtsieg über `cup.statsDone`) und `MpStatsScene`.
- Hauptmenü-Tasten: 1 Schanze, 2 Zufall, 3 Tutorial, 4 Training, 5 Wettkampf, 6 Weltcup, 7 Mehrspieler, 8 Highscores, 9 Einstellungen, 0 Beenden.

## Alle 12 gewählten Verbesserungen sind umgesetzt.
Mögliche nächste Schritte (nur nach Rückfrage): Online-Bestenliste (bräuchte Server).

## Arbeitsweise
- Jede Version: `VERSION` und Versionsverlauf im Code-Kopf, `CHANGELOG.md`, Kopie unter `versions/`, max. 3 Versionsstände.
- Tests im Headless-Chromium (Playwright): Testbot steuert über `Game.scene.pendAction/pendLand` und `Input.dy`; Absprung bei `timeToEdge() < 0.05`. Prüfen: keine Konsolenfehler, Wettkampf/Weltcup komplett durchspielbar, Screenshots sichten.
- Veröffentlichen: Variante ohne `<html>/<head>/<body>` an obige Artifact-URL.
