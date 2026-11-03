# Billard 8-Ball – Versionsverlauf

3D-Pool-Billard (8-Ball) fürs Handy mit eigener Physik.
Die aktuelle Version liegt immer in `index.html`, die Quellen in `src/` (ES-Module, kein Build-Schritt).
Die Versionsnummer steht unten im Hauptmenü.
**Rollback:** älteren Stand mit `git checkout <commit> -- billard-8-ball` zurückholen.

## 1.0.1 (03.11.2026)
- Start auf Android repariert: Das Spiel blieb bei „Lade Billard…“ stehen
- Three.js wird jetzt mitgeliefert (`vendor/`) statt per Import-Map vom CDN geladen; kein Top-Level-await mehr
- Startwächter: Schlägt das Laden fehl, erscheint eine Fehlermeldung mit Details und „Neu laden“
- Musik standardmäßig halb so laut
- Modul-URLs tragen die Version (`?v=1.0.1`), damit nach Updates keine alten Dateien aus dem Browser-Cache dazwischenfunken

## 1.0.0 (03.11.2026)
- Pool-Billard (8-Ball) in 3D mit Three.js, optimiert fürs Hochformat
- Eigene deterministische Physik: Sliding/Rolling, Follow, Draw, Effet, Squirt, Massé, Throw, Banden mit Spin
- Modi: gegen CPU (Leicht/Mittel/Schwer), 2 Spieler an einem Gerät mit Übergabe-Anzeige, Übungsmodus mit Undo und Neuaufbau
- 8-Ball-Regeln mit Fouls, Ball in Hand und optionalen lockeren Regeln
- Touch-Steuerung: Zielen und Kraft per Wischen, Trefferpunkt an der Spielkugel, frei drehbare Kamera, Top-Ansicht
- Zielhilfe in vier Stufen, Replay des letzten Stoßes, Farbenblind- und Linkshänder-Modus, Tutorial
- Live erzeugte Bar-Hintergrundmusik und Soundeffekte (Lautstärke getrennt einstellbar)
- Unit-Tests für Physik und Regeln (`tests/index.html` im Browser oder `node tests/run-node.mjs`)
