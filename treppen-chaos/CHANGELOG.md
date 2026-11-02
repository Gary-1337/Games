# Treppen-Chaos: Ragdoll Dismount – Versionsverlauf

Die aktuelle Version liegt immer in `index.html`. Jede Version liegt zusätzlich unverändert unter `versions/index-vX.Y.Z.html`.
**Rollback:** gewünschte Datei aus `versions/` nehmen und als `index.html` verwenden (oder direkt öffnen). Die Versionsnummer steht unten im Hauptmenü.

## 1.0.0 (27.10.2026)
- Erste Version: Ragdoll-Treppensturz mit Matter.js (14 Körperteile, Gelenke mit Winkelbegrenzern, Schutz gegen Durchfallen)
- 4 Level: Omas Holztreppe, Palast aus Marmor (rutschig), Fabrik-Treppe (Rohre, Kanten), Endlosgolf-Treppe (Löcher, Rampen, Trampoline, Windmühle, Bunker)
- 5 Testpuppen mit Eigenschaften (Crash-Test-Dummy, Büro-Bernd mit Krawatte, Captain Purzel mit Cape, Golf-Günther mit Schläger, Pizza-Paolo mit Karton) plus Zufallsauswahl
- 10 wählbare Körperstellen, Winkel −100° bis +100°, pulsierende Kraftleiste
- Schaden nach Aufprallgeschwindigkeit, Winkel, Körperteil, Gelenk, Absatz/Kante; Combo-System „Ragdoll-Rallye“
- Power-Ups: Gummiknochen, Titan-Schädel, Butter-Socken, Zeitlupe, Golfball-Modus
- Zufallsereignisse: Bowlingkugel, Bananenschale, Ventilator, Trampolin
- Zeitlupe beim ersten großen Aufprall, Nachzucken, Replay, 3 Kameramodi (Verfolger, Übersicht, Nahaufnahme)
- Schadensbericht mit Silhouette, Statistiken und ärztlichem Gutachten; 14 Erfolge; Bestenliste je Level und Puppe (localStorage)
- Sound und Chiptune-Funk-Musik komplett per Web Audio API, getrennt regelbar
