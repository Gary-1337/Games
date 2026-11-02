# Die Claudler – Versionsverlauf

Aufbau- und Wirtschaftssimulation im Geist von „The Settlers II“, nur Einzelspieler, für PC (Maus + Tastatur).
Die aktuelle Version liegt immer in `index.html`. Jede Version liegt zusätzlich unverändert unter `versions/index-vX.Y.Z.html`.
**Rollback:** gewünschte Datei aus `versions/` nehmen und als `index.html` verwenden (oder direkt öffnen). Die Versionsnummer steht im Startmenü.
Ziel-Engine für das Vollspiel ist Godot 4; dieser HTML/JS-Prototyp testet den Kern-Loop (Phase 0 der Roadmap im Game Design Document).

## 2.6.0 (02.11.2026)
- **Menü mit Esc** (pausiert das Spiel; Esc oder „Zurück zum Spiel“ setzt fort). Esc bricht im Baumodus weiterhin zuerst den Bau ab bzw. hebt die Auswahl auf
- **Lautstärke im Menü:** getrennte Regler für Musik und Effekte, Musik an/aus; Einstellungen werden gespeichert
- **Speicherplätze:** 3 Plätze + Autosave (alle 3 Minuten) mit Spieltag, Einwohnern und Datum. Überschreiben und Laden im laufenden Spiel mit Rückfrage. „Letzten Spielstand laden“ nimmt den neuesten. Strg+S speichert in den zuletzt benutzten Platz. Alte Spielstände liegen auf Platz 1
- **Overlay (Taste O / Knopf „Overlay“):** Reichweiten aller Sammler, Eingangsfelder, Gebäude mit Problemen (rot), ausbaubare Gebäude (grün) und Wege ohne Verbindung zu einem Lager (rot)
- **Statistik (Taste I / Knopf „Statistik“):** je Ware Lagerbestand, hergestellt und verbraucht pro Spielminute (Ø 5 Minuten), Bilanz und Verlauf der letzten 30 Minuten. Die Daten werden mitgespeichert
- **Ausbau-Hinweis:** grüner Pfeil über Gebäuden, die jetzt ausgebaut werden können (Produktion und Wohnhütten). In der Ausbau-Vorschau „Alle ausbauen (n)“: baut alle Gebäude gleichen Typs und gleicher Stufe aus, so weit das Material reicht
- **Abriss gibt alles zurück:** volle Baukosten, bezahlte Ausbaustufen, geliefertes Ausbau-Material, Vorräte (Eingang und Ausgang) und Werkzeuge (bisher 50 % der Baukosten)
- „Neues Spiel“ fragt im laufenden Spiel nach

## 2.5.1 (30.10.2026)
- Jäger: Ist kein Wild in Reichweite, jagt er Kleinwild statt zu warten – etwa halbes Tempo (rund 55 % Fleisch) und halbe Chance auf Tierhaut. Sobald Wild zurück ist, jagt er wieder normal
- Gemeinsamer Lagerstand: Alle Lager (Hauptlager und Lagerhäuser) teilen sich ihren Bestand. Jedes Lager kann jede Ware ausgeben, egal in welchem Lager sie eingelagert ist
- Lager-Tafel zeigt den gemeinsamen Bestand mit Warennamen, in Klammern den Anteil in diesem Lager
- Tooltips: Fährt man mit der Maus über eine Ware (Lager, Rezepte, Kosten, Eingang/Ausgang), erscheinen Name und Verwendung

## 2.5.0 (30.10.2026)
- **Ausbaustufen für Produktionsgebäude** (Stufe 1 → 2): Fischer, Holzfäller, Steinbruch, Getreidefarm, Jäger, Sägewerk, Windmühle, Bäckerei, Schmelze, Werkstatt. Jede Stufe 2 hat ein eigenes Aussehen (z. B. Fischer mit Steg und Boot, Steinbruch mit Seilwinde, Große Farm mit Silo und Zaun, Schmelze mit zweitem Ofen)
- Gebäude-Tafel: aktuelle und nächste Stufe, Vorteile, Kosten (Lager/Bedarf), Bauzeit, Voraussetzungen (Bevölkerung, Material, bei der Farm Platz für Felder), fehlende Punkte. „Ausbauen auf Stufe 2“ öffnet eine Vorschau mit dem neuen Aussehen, erst „Jetzt ausbauen“ startet
- Ausbau läuft wie eine Baustelle (Gerüst, Träger, Bauarbeiter). Die Produktion läuft mit halbem Tempo weiter. Ausbau-Material wird getrennt vom Produktionsvorrat geliefert – kein Lagerbestand geht verloren
- Neue Probleme: „Upgrade wartet auf Bretter/Steine/Werkzeuge“, „Upgrade blockiert: Platz reicht nicht“
- **Drehbare Gebäude** beim Platzieren: R im Uhrzeigersinn, Shift+R gegen den Uhrzeigersinn, Knöpfe ⟲ ⟳ in der Bauleiste (F dreht weiterhin). Mausrad bleibt Zoom, Kameradrehung (Q/E) bleibt unabhängig
- Die Ausrichtung bestimmt die Eingangsseite: Vorschau zeigt Grundfläche, Eingangsfelder (blau) und Pfeil, Reichweite und beim Fischer das Wasser vor dem Eingang. Der automatische Weg bevorzugt die Eingangsseite
- Platzierungsregeln: Fischer muss mit dem Eingang zum Wasser zeigen, Farm braucht freie Fläche vor dem Hof, Mine darf mit dem Eingang nicht in den Fels zeigen, Holzfäller/Jäger brauchen Wald. Klare Meldungen („Zu wenig Platz“, „Kein Wasser in Reichweite“, „Kein Wald in Reichweite“, „Felsvorkommen erforderlich“, „Kollision mit Gebäude oder Weg“, „Eingang blockiert – drehe das Gebäude (R)“)
- Stehende Gebäude lassen sich nicht nachträglich drehen
- Taste R im Baumodus dreht jetzt (außerhalb des Baumodus weiter: Weg bauen)
- Alte Spielstände laden weiter (alle Produktionsgebäude Stufe 1; laufende Hütten-Ausbauten werden übernommen)

## 2.4.0 (30.10.2026)
- Neue Gruppe „Jagd & Kleidung“ (ab 14 Einwohnern): Jägerhütte, Räucherhaus (2 Fleisch → 1 Wurst, 24 s), Gerberei (2 Tierhäute → 1 Leder, 30 s), Schneiderei (2 Leder → 1 Kleidung, 36 s)
- 5 neue Waren mit eigenen Icons: Fleisch, Wurst, Tierhaut, Leder, Kleidung
- Wild im Wald: Hirsche und Rehe streifen umher. Der Jäger pirscht sich an, bringt 1 Fleisch und mit 50 % zusätzlich 1 Tierhaut. Das Tier flüchtet und kehrt nach etwa einer Minute zurück; der Wald bleibt erhalten
- Nahrung sättigt unterschiedlich (Fisch 1, Brot 1,5, Wurst 2) und wird abwechselnd gegessen. Zuzug ab 20 Einwohnern mit Brot oder Wurst
- Zufriedenheit (0–100 %): steigt mit jeder vorhandenen Nahrungssorte, Kleidung und ausgebauten Häusern, sinkt bei Hunger; sie beschleunigt den Zuzug
- Wohnhütten in 3 Stufen ausbauen (Knopf in der Gebäude-Tafel): Wohnhütte (4 Plätze) → Verbesserte Wohnhütte (7) → Gehöft (10). Der Ausbau läuft wie eine Baustelle mit Gerüst, die Bewohner bleiben im Haus. Die Bedingungen müssen 20 s stabil erfüllt sein
- Claudler-Stufen: Einfache (100 %), Fleißige (125 % Laufen, 115 % Arbeit, Gürtel und hellere Kleidung), Erfahrene (150 % Laufen, 130 % Arbeit, grüner Hut und Umhang)
- Ausgebaute Häuser brauchen alle 2 Minuten 1 Kleidung, Gehöfte zusätzlich Brot und Wurst im Lager – sonst sinken ihre Bewohner eine Stufe ab
- Kopfleiste kompakter: Holz, Bretter, Stein, Kleidung, Werkzeug und Nahrung gesamt; „Lager ▾“ zeigt alle 17 Waren
- Neue Ziele: Jägerhütte, 10 Kleidung, 5 Hütten auf Stufe 2, 10 erfahrene Claudler. Neue Probleme: kein Wald in Reichweite, Bewohner wünschen Kleidung, Ausbau fehlt Kleidung/Nahrung
- Fehler behoben: Sammler blieben hängen, wenn ihr nächstes Ziel nicht erreichbar war – sie suchen jetzt 30 s lang ein anderes
- Alte Spielstände laden weiter (alle Wohnhütten auf Stufe 1)

## 2.3.0 (30.10.2026)
- Neues Paket „Bergbau, Eisen und Werkzeuge“: Geologe findet Vorkommen → Kohlemine/Eisenmine → Schmelze → Werkstatt → Werkzeuge
- 4 neue Waren mit eigenen Icons: Kohle, Eisenerz, Eisenbarren, Werkzeug
- 5 neue Gebäude (Gruppe „Bergbau & Industrie“, ab 14 Einwohnern): Geologe, Kohlemine, Eisenmine, Schmelze (1 Eisenerz + 1 Kohle → 1 Eisenbarren, 30 s), Werkstatt (1 Eisenbarren + 1 Brett → 1 Werkzeug, 40 s)
- Vorkommen in Felsen sind erst nach Untersuchung durch einen Geologen sichtbar (dunkle Spuren = Kohle, rostrote = Eisenerz), auch auf der Übersichtskarte. Jede neue Karte hat garantiert erreichbare Vorkommen 7–22 Felder vom Hauptlager entfernt. Minen nur auf entdeckten Vorkommen
- Werkzeuge: Holzfäller, Steinbruch, Fischer, Farm, Minen, Schmelze und Werkstatt arbeiten ohne Werkzeug mit 50 % Tempo. Vorrat bis 2 Werkzeuge je Gebäude, ein Werkzeug hält 20 Arbeitszyklen. Gebäude ohne Werkzeug werden zuerst beliefert. Neue Spiele starten mit 8 Werkzeugen
- Industriewaren binden höchstens die Hälfte der Träger; Baustellen und Vorrang bleiben bevorzugt
- Neue Probleme: kein Werkzeug im Lager, Mine ohne Werkzeug, kein Kohle-/Eisenerzvorkommen entdeckt, Vorkommen erschöpft
- Ziele zeigen jetzt ihren Fortschritt (z. B. „5 / 10“ mit Balken); erledigte Ziele werden zusammengefasst. 4 neue Ziele für Bergbau und Werkzeuge
- Gebäude beim Platzieren drehen: Taste F (90°-Schritte), funktioniert in allen 8 Kamerarichtungen
- Tooltips erklären, wofür jede Ware gebraucht wird; Felsen zeigen ihren Erkundungsstand
- Alte Spielstände laden weiter: Vorkommen werden beim Laden passend zu den Felsen angelegt, dazu 6 Werkzeuge im Hauptlager

## 2.2.1 (30.10.2026)
- Schräge Wege sehen jetzt sauber aus: Wege liegen auf einer eigenen Ebene und werden als gleich breite Bänder zwischen den Feldmitten gezeichnet, mit dunklem Rand, hellerer Fahrspur und achteckigen Knoten. Keine Kerben mehr an Ecken und Kreuzungen, gerade und schräge Wege sind gleich breit

## 2.2.0 (30.10.2026)
- Wege können jetzt schräg (45°) verlaufen: Zwei Wegfelder, die sich nur an der Ecke berühren, sind verbunden und werden als durchgehender schräger Weg gezeichnet
- Wegfindung in 8 Richtungen: Claudler laufen diagonal; beim Wegebau und automatischen Anschluss werden schräge Strecken genutzt (diagonal kostet √2, keine Abkürzung über Gebäudeecken, Wasser oder Fels)
- Ufer und Sandkanten verlaufen schräg statt im Treppenmuster, wo das Gelände diagonal verläuft

## 2.1.1 (30.10.2026)
- Fehler behoben: In schmaleren Fenstern verdeckte ein Scrollbalken die Bauleiste. Die Knöpfe passen sich jetzt der Fensterbreite an, es gibt keinen Scrollbalken mehr

## 2.1.0 (30.10.2026)
- Kamera drehbar in 45°-Schritten (8 Blickrichtungen): Tasten Q und E oder die Pfeilknöpfe auf der Übersichtskarte; die aktuelle Richtung steht darunter. Gebäude werden für jede Richtung passend gezeichnet (Wände, Dächer, Fenster und Türen auf der richtigen Seite)
- Übersichtskarte dreht mit
- Gebäude lassen sich jetzt pixelgenau anklicken (auch am Dach)
- Größere Karte für neue Spiele: 96 × 72 Felder statt 72 × 52. Alte Spielstände behalten ihre Kartengröße
- Fehler behoben: Die Bauleiste ließ sich ein paar Pixel nach oben und unten scrollen
- Musik fröhlicher: 88 BPM, C-Dur (Cmaj7 · G6 · Am7 · F · C/E · F · Dm7 · G7), hüpfender Bass, Klavier auf den Off-Beats, lebhaftere Melodie mit Glockenspiel-Glanz, weiches Schlagzeug

## 2.0.0 (30.10.2026)
- Neue isometrische Ansicht wie bei Settlers II: Karte als Rauten-Raster (32 × 16 Pixel je Feld), Licht von links oben
- Alle 12 Gebäude neu gezeichnet als Iso-Pixel-Art mit sichtbaren Seitenwänden, Giebel- und Zeltdächern, Fenstern, Türen und Zubehör (Holzstapel, Heuballen, Kisten, Fischgestell). Die Windmühle hat größere Flügel
- Bäume und Felsen größer und als eigene Objekte mit richtiger Verdeckung (was weiter vorne steht, verdeckt was dahinter liegt)
- Wege, Felder, Wasser, Ufer und Baustellen-Gerüste im Iso-Raster; Nachtlicht in den Fenstern
- Übersichtskarte als Raute wie die Spielkarte
- Ruhigeres Grundtempo: 1× läuft jetzt mit 65 % der bisherigen Geschwindigkeit
- Neue Tempostufe ½×; Tasten 1–4 für ½×, 1×, 2×, 4×, + und − schalten schneller bzw. langsamer, Leertaste pausiert
- Zoom in 4 Stufen (Mausrad)
- Spielstände aus 1.x laden weiter; die Kamera springt dabei zum Hauptlager

## 1.2.1 (30.10.2026)
- Fehler behoben: Das Lagerhaus wurde nie fertig. Die Träger legten das Baumaterial in das Lager der Baustelle statt in ihren Materialvorrat. Weil die Baustelle dann selbst als Lager galt, holten sie nach und nach alle Bretter und Steine aus dem Hauptlager dorthin
- Alte Spielstände werden beim Laden repariert: Das Material einer Lagerhaus-Baustelle wird in ihren Vorrat verschoben, alles darüber hinaus kommt zurück ins Hauptlager

## 1.2.0 (30.10.2026)
- Gebäude sind jetzt von allen Seiten zugänglich: Jedes Wegfeld, das an ein Gebäude grenzt (oben, unten, links oder rechts), zählt als Eingang. Es gibt kein festes Eingangsfeld unter dem Gebäude mehr
- Träger, Bauarbeiter und Arbeiter gehen zum nächstgelegenen Zugang
- Automatischer Weg beim Bauen startet an der günstigsten Seite; liegt schon ein Weg an irgendeiner Seite, wird kein neuer gebaut
- Bauvorschau zeigt vorhandene Zugänge als gelbe Punkte rund um die Grundfläche
- Das Hauptlager startet mit einem Weg rundherum
- Wege dürfen überall abgerissen werden; verliert ein Gebäude dadurch die Verbindung, meldet es die Problemliste
- Felder werden nicht mehr direkt neben Gebäuden angelegt, damit die Zugänge frei bleiben
- Reichweiten (Holzfäller, Förster usw.) zählen jetzt ab dem Gebäude selbst statt ab dem Feld davor

## 1.1.0 (29.10.2026)
- Fehler behoben: Baustellen bekamen keine Bretter mehr. Ursache: Jede Baustelle holte sich sofort einen Bauarbeiter, der dort wartete. Bei mehreren Baustellen gab es keine freien Träger mehr, und das Material blieb im Lager liegen
- Bauarbeiter kommen jetzt erst, wenn Material zum Verbauen da ist, und gehen nach 3 s Leerlauf zurück zum Tragen
- Mindestens 2 Claudler bleiben immer Träger (neue Arbeiter und Bauarbeiter werden erst darüber hinaus abgezogen)
- Rundungsfehler behoben, durch den eine Baustelle bei 99,99 % hängen bleiben konnte
- Neu: Vorrang für Baustellen – Knopf „Vorrang geben“ in der Gebäude-Tafel oder Taste P. Baustellen mit Vorrang bekommen zuerst Material und Bauarbeiter und tragen ein gelbes Fähnchen
- Baustellen-Status zeigt genauer, worauf gewartet wird
- Neu: chillige Musik, generativ erzeugt (Lo-Fi, 72 BPM, weiche Flächen, E-Piano, Bass, Melodie mit Echo, leiser Shaker). Knopf „Musik an/aus“ und Lautstärkeregler in der Kopfleiste, Taste M; Einstellung wird gemerkt
- Kopfleiste kompakter: „Laden“ ist jetzt „Spielstand laden“ im Menü

## 1.0.0 (29.10.2026)
- Erster spielbarer Prototyp (eine HTML-Datei, Canvas, keine Bibliotheken), nur für PC: Fenster unter 900 × 560 px zeigt einen Hinweis
- Prozedurale Karte 72 × 52 Felder mit Wiese, Wald, Felsen, Seen und Ufersand; Startplatz garantiert Bäume, Felsen und Wasser in der Nähe
- Pixel-Art von Hand im Code gezeichnet: 12 Gebäude, 2 Baumarten in 3 Wachstumsstufen, Felsen, Felder, Wege, animierte Claudler, Mühlenflügel, Rauch, Wasserglitzern, Tag-Nacht-Wechsel mit Licht in den Fenstern
- 12 Gebäude: Hauptlager, Holzfäller, Förster, Steinbruch, Sägewerk, Fischer, Getreidefarm, Brunnen, Windmühle, Bäckerei, Wohnhütte, Lagerhaus
- 8 Waren: Baumstamm, Brett, Stein, Fisch, Wasser, Getreide, Mehl, Brot (eigene Pixel-Icons mit eindeutigen Formen)
- Ketten: Holzfäller → Sägewerk → Bretter; Steinbruch → Steine; Fischer → Fisch; Farm → Mühle → Bäckerei (+ Brunnen) → Brot
- Bauen mit Vorschau (Grundfläche, Reichweite, Grund bei Sperre), automatische Wegverbindung zum Lager, Wege per Ziehen, Abriss (50 % zurück), Rückgängig 10 s (Strg+Z)
- Siedler-Simulation: Träger holen Waren nach „nächster Bedarf gewinnt“, Bauarbeiter, Arbeiter laufen sichtbar zu Bäumen, Felsen, Ufer und Feldern; alles Getragene ist über dem Kopf zu sehen
- Bevölkerung: Wohnraum + Essen im Lager → Zuzug; ab 20 Einwohnern nur mit Brot; Hunger verlangsamt die Arbeit auf 75 %
- Freischaltung der Landwirtschaft ab 14 Einwohnern, 5 optionale Ziele
- Problemliste (gruppiert, klickbar, Tab springt zum nächsten), Warnsymbole über Gebäuden, Gebäude-Tafel mit Rezept, Fortschritt, Ein-/Ausgang, Pause und Priorität
- Kopfleiste mit Lagerbestand, Einwohnern, Trägern, Uhrzeit; Tempo Pause/1×/2×/4×; Übersichtskarte mit Problempunkten
- Speichern/Laden im Browser (Strg+S), Autosave alle 2 Minuten
- Noch nicht enthalten: Werkzeuge, Bergbau, Bedürfnisstufen, Karren, Verteilregler, Overlays, Flussdiagramm
