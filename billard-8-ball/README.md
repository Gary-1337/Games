# Billard 8-Ball (3D, mobil)

Vollständig spielbares Pool-Billard (8-Ball) im Browser – optimiert für Smartphones im Hochformat.
Drei Modi: **gegen die CPU** (Leicht/Mittel/Schwer), **2 Spieler an einem Gerät** (Hot-Seat) und **Übungsmodus**.

## Start

Das Projekt hat **keinen Build-Schritt**: native ES-Module, Three.js kommt per Import-Map vom CDN
(`three@0.160.0` von jsDelivr). Es muss nur über HTTP ausgeliefert werden (ES-Module laufen nicht über `file://`).

```bash
# Windows ohne Node/Python – mitgelieferter Mini-Server:
powershell -ExecutionPolicy Bypass -File serve.ps1 -Port 8080
# alternativ, falls vorhanden:
npx serve .            # oder: python -m http.server 8080
```

Dann `http://localhost:8080/` öffnen. Für das Handy den Ordner auf einen beliebigen statischen Host legen
(GitHub Pages, Netlify, …) oder im selben WLAN die IP des Rechners verwenden.

**Tests:** `http://localhost:8080/tests/` im Browser öffnen, oder mit Node ≥ 18: `node tests/run-node.mjs`.

## Architektur

```
index.html            Layout (HUD oben, Tisch Mitte, Steuerzone unten), Import-Map
src/main.js           Zustandsautomat + Game-Loop (Fixed-Timestep, Interpolation), Verdrahtung
src/physics/          reine, deterministische Simulation – kein Three.js, kein DOM
  constants.js        Kugel-/Tischmaße, Physik-Parameter
  table.js            Spielfläche, Banden als Segmente (inkl. Taschenbacken), Taschen
  simulation.js       Sliding/Rolling, Spin, Kugel-/Bandenstöße, Taschen, Snapshot/Restore
  cue.js              Eingabe (Richtung, Kraft, Trefferpunkt, Queue-Winkel) → Stoßparameter, Miscue
  raycast.js          Geisterkugel/Strahltests für Zielhilfe und CPU
  rng.js              seeded RNG (mulberry32)
src/game/             Regeln und Gegner
  rules.js            8-Ball: Gruppen, Fouls, Ball in Hand, Sieg/Niederlage, lockere Regeln
  rack.js             korrekter Rack-Aufbau
  cpu.js              CPU-Gegner (3 Stufen)
src/render/           Three.js: Szene, Tisch, Kugeln, Queue, Overlays, Kamera, adaptive Qualität
src/input/            Steuerzone (Zielen/Kraft/Winkel), Cue-Ball-Control, Kameragesten
src/ui/               HUD, Menüs/Dialoge, Tutorial, Einstellungen + Speicherstand (localStorage)
src/audio/            synthetische WebAudio-Sounds (keine Dateien)
tests/                Unit-Tests (Browser + Node)
```

**Zustände** (`main.js`): `menu → aim | cpu → strike → roll → (handover) → aim … → over`, dazu `replay`.
Die Steuerung ist außerhalb von `aim` gesperrt. Modale Dialoge gibt es nur bei Menü, Pause, Spielende und
der Hot-Seat-Übergabe (dann ruhen alle Kugeln).

**Loop:** Physik läuft mit festem Schritt 600 Hz; gerendert wird pro Frame mit Interpolation zwischen den
letzten beiden Physik-Zuständen. Bei verstecktem Tab werden Loop und Audio pausiert.

**Determinismus:** Gleicher Zustand + gleicher Stoß ⇒ identisches Ergebnis. Darauf bauen Replay (Stoß wird
aus dem Snapshot neu simuliert), Undo und die Tests auf.

## Physik-Modell und Parameter

Einheiten SI. Tisch 2,54 × 1,27 m (9 ft, 2:1), Kugel Ø 57,15 mm, 170 g. Ecktaschen-Maul ≈ 116 mm,
Mitteltaschen ≈ 127 mm, Bandennase 36,3 mm über dem Tuch.

| Parameter | Wert | Bedeutung |
|---|---|---|
| `muSlide` | 0,2 | Gleitreibung Kugel–Tuch. Solange der Kontaktpunkt rutscht (u = v + ω×r ≠ 0) wirkt µs·m·g entgegen u; Translation **und** Rotation ändern sich, u nimmt mit 7/2·µs·g ab. Bei u = 0 → exakter Übergang ins Rollen. |
| `muRoll` | 0,01 | Rollwiderstand: Verzögerung µr·g beim Rollen. |
| `muSpin` | 0,012 | Bohrreibung, baut Side-Spin ωz ab (5·µsp·g / 2R). |
| `eBall` | 0,95 | Restitution Kugel–Kugel (Impuls entlang der Normalen). |
| `muBall` / `muBallB` / `muBallC` | 0,00995 / 0,108 / 1,088 | Kugel–Kugel-Reibung µ = a + b·e^(−c·v_slip) (nach Alciatore) → realistischer Throw, Spinübertragung. |
| `eCushionMax/Min/Slope` | 0,9 / 0,62 / 0,045 | Bandenrestitution, sinkt mit der Aufprallgeschwindigkeit. |
| `muCushion` | 0,2 | Reibung an der Bande – Side-Spin verändert dadurch den Abprallwinkel. |
| `cushionHeight` | 0,0363 m | Kontakt oberhalb des Zentrums → Bande baut Topspin teilweise ab. |
| `cueMass` | 0,54 kg | Queue-Masse im Stoßmodell (Leckie/Greenspan). |
| `minCueSpeed`/`maxCueSpeed` | 0,12 / 6 m/s | Queue-Geschwindigkeit bei 0 % / 100 % (Kurve p^1,6 für feine Dosierung). |
| `squirt` | 0,035 rad | Ablenkung der Spielkugel bei maximal seitlichem Trefferpunkt (~2°). |
| `maxTip` | 0,5 R | Sicherheitsradius für den Trefferpunkt (Miscue-Grenze). |

**Kugel–Kugel:** Pro Physikschritt werden Kollisionen ereignisbasiert aufgelöst (exakter Time-of-Impact,
früheste zuerst). Dadurch tunnelt beim Break nichts und Stoßketten im Rack laufen sequenziell ab.
**Draw/Follow** entstehen ohne Sonderfälle: Nach dem Kontakt behält die Spielkugel ihren Spin,
die Gleitreibung zieht sie zurück bzw. nach vorne.
**Massé:** Bei erhöhtem Queue erzeugt ein seitlicher Trefferpunkt eine Rotation um eine geneigte Achse;
die Gleitreibung krümmt die Bahn.
**Ruhe:** Unterschreiten Geschwindigkeit/Spin die Schwellen, werden alle Werte exakt auf 0 gesetzt.

## CPU

- **Leicht:** geometrische Kandidaten (Geisterkugel, freie Korridore, Schnittwinkel), wählt zufällig unter
  den 3 einfachsten, deutliche Streuung bei Winkel/Kraft, gelegentliche Patzer, kein Spin.
- **Mittel:** bester Kandidat, Rücklauf bei geraden Stößen (kein Nachlaufen in die Tasche), sonst leichter
  Nachlauf; vermeidet Fouls durch Sichtlinienprüfung.
- **Schwer:** simuliert **höchstens 24** Kandidaten (Top-4 × Follow/Stopp/Draw, Kraft- und Effet-Varianten,
  Safeties, Kicks über die Bande) und bewertet Ergebnis + Folgestellung. Ausführung trotzdem mit Streuung.
- Die CPU sieht nie die Zielhilfe-Vorschau des Spielers; die Berechnung ist auf mehrere Frames verteilt
  („CPU denkt…“).

## Bekannte Vereinfachungen

- Kugeln springen nicht (keine vertikale Bewegung); „vom Tisch“ ist nur als Sicherheitsnetz implementiert.
- Banden sind starre Segmente mit einem Kontaktpunkt; kein Einsinken in den Gummi, keine Mehrfachkontakte.
- Taschen: Fangkreis + gerade Backen; kein Klappern im Taschenschlund, keine Lederstoffe.
- Spinübertragung Kugel–Kugel über einen Coulomb-Impuls, nicht über die Kontaktdauer integriert.
- Squirt als konstanter Winkel pro Trefferpunkt (unabhängig von der Geschwindigkeit), keine Swerve-Komponente
  außer über Massé.
- 8-Ball nach vereinfachten WPA-Regeln: kein „Call Shot“, die 8 beim Break wird wieder aufgesetzt,
  ungültiger Break = Foul (statt Wahlrecht des Gegners).

## Mobile-Performance

- Keine Bild- oder Audiodateien: Texturen werden per Canvas, Sounds per WebAudio erzeugt → nur Three.js
  (~170 kB gzip) wird geladen.
- `devicePixelRatio` wird begrenzt (Hoch 2, Mittel 1,5, Niedrig 1). Im Modus **Auto** misst das Spiel die
  Frame-Zeit und senkt die Renderauflösung dynamisch (und schaltet die Umgebungsreflexion ab), falls < 50 FPS.
- Keine echten Schattenmaps – weiche Blob-Schatten unter den Kugeln (Fake-AO).
- 16 Kugeln: paarweise Prüfung (120 Paare) ist billiger als Spatial Partitioning; ruhende Paare werden übersprungen.
- Physik/Loop pausieren bei `visibilitychange`; Resize/Orientierungswechsel über `ResizeObserver`.
- Fallback-Bildschirm, wenn WebGL fehlt oder die 3D-Bibliothek nicht lädt.
