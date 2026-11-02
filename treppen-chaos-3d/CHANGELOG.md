# Treppen-Chaos 3D – Versionsverlauf

Eigenständiges Spiel neben der 2D-Version (`treppen-chaos/`).
Die aktuelle Version liegt immer in `index.html`. Jede Version liegt zusätzlich unverändert unter `versions/index-vX.Y.Z.html`.
**Rollback:** gewünschte Datei aus `versions/` nehmen und als `index.html` verwenden (oder direkt öffnen). Die Versionsnummer steht unten im Hauptmenü.

## 1.3.0 (30.10.2026)
- Alle Treppen rund dreimal so lang:
  - Omas Holztreppe: 60 Stufen in 6 Läufen (vorher 21)
  - Palast aus Marmor: 60 Stufen in 4 Läufen (vorher 24)
  - Fabrik-Treppe: 63 Stufen in 7 Läufen, mit Rohren über jedem Lauf und Absatz (vorher 24)
  - Endlosgolf-Treppe: 113 Stufen, der Parcours läuft dreimal hintereinander, inkl. zwei Windmühlen (vorher 41)
- Zeitlimit für einen Sturz verlängert (40 s, Golf 60 s); Übersichtskamera zoomt weiter heraus
- Leistung: Durchsicht-Prüfung testet nur Stufen in der Nähe, Wandverkleidung und Handläufe aus weniger Teilen

## 1.2.0 (29.10.2026)
- Treppen breiter: 2,4 m statt 1,6 m (Physik, Grafik und Kamera angepasst)
- Alle Funktionen der 2D-Version übernommen:
  - 2 neue Level: Fabrik-Treppe (steil, Querrohre über den Stufen, Warnlampe, Ventile) und Endlosgolf-Treppe (Hügel mit Bäumen, Golflöcher mit Hole-in-One, Trampoline, Sandbunker, Baumstamm, Rampe, drehende Windmühle, Fahnen)
  - 4 weitere Puppen: Büro-Bernd (Krawatte, Brille), Captain Purzel (Umhang, wenig Reibung), Golf-Günther (Kappe, Schläger, Wackelknie), Pizza-Paolo (Kappe, Schnurrbart, Pizzakarton – die Pizza fliegt heraus) sowie „Zufall“
  - Power-Ups: Gummiknochen, Titan-Schädel, Butter-Socken, Zeitlupe, Golfball-Modus
  - Zufallsereignisse: Bowlingkugel, Bananenschale, Ventilator (bläst quer über die Treppe), Trampolin statt Stufe; im Menü abschaltbar
  - Replay des letzten Sturzes, Kamera dabei frei drehbar
  - Alle 14 Erfolge, Bestenliste je Level und Puppe, Dauergeräusche für Ventilator und Kugel
- Ruhe-Erkennung verbessert: langsames Nachrutschen beendet den Sturz nach kurzer Zeit (kein endloses Warten mehr)

## 1.1.0 (27.10.2026)
- Durchsicht: Dreht man die Kamera hinter die Rückwand, eine Stirnwand oder unter die Treppe, werden die verdeckenden Teile weich halbtransparent (Bilder, Vertäfelung und Handlauf an der Wand inklusive)
- Abschusswinkel per Ziehen: Puppe oder Zielpfeil mit Maus/Finger anfassen und ziehen – der Pfeil zeigt zum Zeiger (funktioniert aus jedem Kamerawinkel)
- Ziehen auf freier Fläche dreht weiterhin die Kamera; Antippen der Puppe wählt die Körperstelle
- Mauszeiger zeigt an, was Ziehen bewirkt (Fadenkreuz = Winkel, Hand = Kamera)

## 1.0.0 (27.10.2026)
- Erste 3D-Version (Kern): three.js 0.160 + cannon-es 0.20 über jsDelivr, Low-Poly-Look mit Schatten
- 2 Level: Omas Holztreppe, Palast aus Marmor (rutschig)
- Crash-Test-Dummy als 3D-Ragdoll (14 Körperteile, Kugelgelenke und Scharniere mit Grenzen, Schutz gegen Durchfallen)
- Zielen: Körperstelle antippen oder wählen, Winkel per Regler/Pfeiltasten, pulsierende Kraftleiste
- Schaden und Punkte wie in 2D (Zonen, Gelenke, Absätze, Kanten, Combos), Zeitlupe beim ersten großen Aufprall, Nachzucken
- Kamera: Verfolger, Übersicht, Nahaufnahme + frei drehbar (ziehen) und zoombar (Pinch/Mausrad)
- Glasbrüstung auf der Kameraseite, damit die Sicht frei bleibt
- Schadensbericht mit Silhouette und ärztlichem Gutachten, Bestenliste je Level, 9 Erfolge, Sound und Musik
- Noch nicht enthalten (folgt später): weitere Puppen und Level, Power-Ups, Zufallsereignisse, Replay (seit 1.2.0 enthalten)
