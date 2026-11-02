# Die Claudler – Arbeitsstand (für die nächste Sitzung)

Stand: 02.11.2026, Version **2.6.0** (live als Artifact „Die Claudler“, Dateien im Projekt unter `die-claudler/`).

## Wo was liegt
| Datei | Inhalt |
| --- | --- |
| `die-claudler/index.html` | Aktuelle Version (eine HTML-Datei, Canvas, kein Framework) |
| `die-claudler/versions/index-vX.Y.Z.html` | Unveränderte Kopie jeder Version (Rollback) |
| `die-claudler/CHANGELOG.md` | Versionsverlauf, neueste oben |
| `die-claudler/tests/regression.js` | Automatischer Test (Node + Playwright) |
| `die-claudler/ARBEITSSTAND.md` | Diese Datei |
| Game Design Document | Claude-Docs-Artikel „Die Claudler – Game Design Document“ (Godot 4 als Ziel-Engine fürs Vollspiel) |

## Arbeitsweise (vom Nutzer gewünscht)
- Projektregel: höchstens 3 Versionskopien in `versions/` behalten, ältere löschen.
- Jede Änderung: Versionsnummer in `const VERSION` erhöhen, `versions/index-vX.Y.Z.html` anlegen, CHANGELOG-Eintrag oben, dann Artifact neu veröffentlichen (gleicher Dateipfad) und alle drei Dateien per `project_write` ins Projekt.
- Nur PC (Maus + Tastatur), keine Smartphone-Optimierung. Deutsch, direkt, nachfragen wenn unklar.

## Weitermachen in einer neuen Sitzung
1. `project_read die-claudler/index.html` (und CHANGELOG) – die lokalen Dateien der alten Sitzung existieren dann nicht mehr. Inhalt nach `/home/claude/die-claudler/index.html` schreiben.
2. Artifact-Link per `Artifact action:list` suchen („Die Claudler“) und mit `url` updaten, damit der Link gleich bleibt (vorher `action:read`).
3. Test: `node tests/regression.js <index.html> <alte-version.html>` – erwartet: keine Skriptfehler, `sites: []`, Brot > 0, Lagerhaus `active`, `mining.iron` und `mining.tool` > 0, `hunt.clothes` > 0, `hunt.afterLoad` = 3, `upgrade.res.*.level` = 2, `upgrade.sites` = [], `v26.refund.plank` = `expectPlank`, `v26.slotOk` = true.

## Architektur (index.html, Abschnitte in dieser Reihenfolge)
- **Konstanten/Karte:** `W,H` variabel (`setMapSize`), neue Spiele 96 × 72, alte Spielstände behalten 72 × 52. Arrays: `ter, tree, treeT, rockA, fish, road, occ, field, fieldT, fieldOwn, resv, comp, ore, oreAmt, oreKnown`.
- **Wegfindung:** `astar(start|starts[], goal|fn, mode, maxN, hint)` mit Modi `road` / `walk` / `build`, 8 Richtungen (`DX/DY` 0–3 gerade, 4–7 diagonal, `diagOk` verhindert Eckenschneiden). `recomp()` = Wegnetze (8er-Nachbarschaft).
- **Gebäude:** `DEF` (21 Typen, Gruppen `cat:'jagd'` und `cat:'berg'`), Ausrichtung `b.o` (0–3, `dims()`), Sprite je Ausrichtung über `sprOf(type,o)`, Zugang von allen Seiten über Umfangfelder `b.acc` (`perim`), `nets(b)`, `connected(b)`, `goTo(settler, building, mode, cb)`.
- **Logistik:** `logistics()` alle 0,5 s; gemeinsamer Lagerbestand: `avail()` liefert für Lager `poolAvail(g)` (Summe aller Lager), `arriveSrc` nimmt über `storeTake` notfalls aus einem anderen Lager, `availLocal` = Bestand eines einzelnen Gebäudes; Baustellen-Vorrang über `b.prio`; mindestens 2 Träger bleiben frei (`canSpare`); Bauarbeiter erst bei vorhandenem Material.
- **Projektion:** `rot()`, `setRot(k)`, `VIEW` 0–7 (45°-Schritte), `isoX/isoY/depthOf`, `layoutView()`. Gebäude-Sprites pro Blickrichtung über `sprite()/house()/box()` (3D-Teile, Maler-Algorithmus), Cache `SPRV[k]`, aktiv `SPR`. Bäume/Felsen = Billboards (`BB`).
- **Terrain:** `drawTile` auf Canvas `terr` (Dirty-Tiles), Ufer/Sand mit 45°-Kanten. **Wege** separat auf `rlay` (`drawRoads`, Bänder + Achteck-Knoten), neu gezeichnet bei `roadsDirty`.
- **Bergbau/Werkzeug:** Arrays `ore` (1 Kohle, 2 Eisen), `oreAmt`, `oreKnown`; `placeDeposits/ensureOre`; Geologe `kind:'geologist'`, Minen `kind:'mine'`; `toolF(b)`, `toolCycle(b)`, `TOOLMAX=2`, `TOOLWEAR=20`; Industrie-Trägerlimit in `logistics()`.
- **Jagd & Wohnstufen:** Wild `DEER` (`spawnDeer/updDeer/findDeer/deerFlee`, nicht gespeichert), Jäger `kind:'hunter'` (ohne Wild: Kleinwild, Flag `small`, Arbeit ×4,5, halbe Haut-Chance); `HOUSE_LV`, `CL_LV`, `NEEDS`, `FOODVAL`; Ausbau über `b.upg` (läuft durch denselben Code wie Baustellen: `building(b)`, `costOf(b)`); `effLevel`, `recalcLevels` (Stufe `s.lvl`), `satisfaction()`; Sprite je Wohnstufe über `bSpr(b)`.
- **Ausbaustufen (2.5.0):** `UPS[type]` (Stufe 2: Name, Kosten, `pop`, `speed`, `r`, `fields`, `space`, `hide`, `adv`), `lvOf/upCur/upNext`, Tempo `spF(b)` (halbes Tempo während `b.upg`), Reichweite `rOf(b)`. Ausbau-Material liegt getrennt in `b.upg.inp/inc` (`matOf(b)`, Jobs mit `job.up`), Produktionsvorrat bleibt in `b.inp`. Tafel: `prodUpRows`, `prodUpBlock`, `upMissing`, `startProdUpgrade`, Bestätigung über `S.upAsk`. Sprites `S2.<typ>2`, Auswahl in `bSpr`.
- **Ausrichtung (2.5.0):** `DIRN`, `DOORV`, `doorTiles`, `freeFieldTiles`, Regeln in `canPlace`, `autoRoadDoor`, `rotatePlacement` (R/Shift+R/F), Vorschau in `drawPreview` (Eingangsfelder, Pfeil, Wasser).
- **Ziele:** `GOALS[].p()` liefert `[aktuell, Ziel]`, Anzeige in `renderGoals`.
- **Tempo:** `TEMPO=.65`, Stufen `SPEEDS=[0,.5,1,2,4]`. **Musik:** generativ (WebAudio), 88 BPM C-Dur, `scheduleBar`.
- **Menü/Speicherplätze (2.6.0):** `SLOTS` (Platz 1 = `claudler-save-v1`, `-2`, `-3`, `claudler-save-auto`), Meta je Platz unter `<key>-meta`, `saveGame(silent,key)`, `loadGame(key)`, `curSlot`, `newestSlot`, `renderSlots`, `openMenu` (Esc), Klang `AUD.vol/fx/music`, `setFx`, `syncMenuAudio`.
- **Overlay/Statistik/Ausbau-Hinweis (2.6.0):** `S.overlay`, `drawOverlay`, `toggleOverlay` (O); `S.stat.hist` (Momentaufnahme je Spielminute: `made` + `econTotals()`), `statRates`, `renderStats`, `toggleStats` (I); `canUpNow(b)` → `b._canUp` (grüner Pfeil), `startAllUpgrades`. Abriss-Rückgabe vollständig in `removeBuilding`.
- **Speichern:** `localStorage` Schlüssel `claudler-save-v1`, enthält `W,H,view,ore*,rotO`, Gebäude mit `o,tools,toolUse,level,dressed,clothT,upg`; Migration für alte Lagerhaus-Baustellen und für Stände ohne Vorkommen.

## Für die nächste Version vorgemerkt
- (nichts offen – alle Punkte vom 02.11. sind in 2.6.0 umgesetzt)

## Offene Punkte / Ideen
- Werkzeugtypen (Axt, Spitzhacke …) sind bewusst noch generisch.
- Bereits stehende Gebäude lassen sich nicht nachträglich drehen (nur beim Platzieren).
- Ausbau nur bis Stufe 2; `UPS` ist für weitere Stufen vorbereitet (Array).
- Mühle/Bäckerei/Schmelze zeigen während des Ausbaus keine Animation (nur Gerüst).
- Minen brauchen keine Nahrung (im GDD vorgesehen, bewusst weggelassen).
- Kommentar im GDD offen: Soll Hunger nur bremsen oder sollen Claudler abwandern?
- Treppenförmig von Hand gezogene Wege (L-Ecken) bleiben eckig; nur reine Diagonalen werden schräg gezeichnet. Mögliche Verbesserung: beim Ziehen automatisch diagonal glätten.
- In den 45°-Zwischenansichten wirken Gebäude schmal und hoch (Projektionsbedingt).
- Komfortgut für Gehöfte ist übergangsweise „Brot und Wurst gleichzeitig“ (später Bier, Möbel o. Ä.).
- Einwohner wohnen nicht in einem bestimmten Haus; Stufen werden nach Wohnplätzen verteilt.
- Noch nicht im Prototyp: Karren, Verteilregler, Overlays, Flussdiagramm (siehe GDD-Roadmap).
