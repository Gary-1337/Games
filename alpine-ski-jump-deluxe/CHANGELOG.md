# Alpine Ski Jump Deluxe – Versionsverlauf

Die aktuelle Version liegt immer in `index.html`. Die letzten (höchstens drei) Versionen liegen zusätzlich unverändert unter `versions/index-vX.Y.Z.html`.
**Rollback:** gewünschte Datei aus `versions/` nehmen und als `index.html` verwenden (oder direkt öffnen). Die Versionsnummer steht unten im Hauptmenü.

## 1.12.0 (02.11.2026)
- **Mehr Ton:** dauerhaftes Publikumsgemurmel, das während des Flugs Richtung K-Punkt anschwillt; hörbarer Wind (lauter bei stärkerem Wind) und Schneefall-Rauschen; Raunen bei Stürzen und sehr kurzen Sprüngen; Pfeifkonzert und Trommeln bei Sprüngen über die Hill Size
- **Vibration auf Handys:** kurzer Impuls beim Absprung (doppelt bei perfektem Timing), bei der Landung (eigenes Muster für Telemark und Sturz) und bei neuem Schanzenrekord; abschaltbar unter Einstellungen → VIBRATION
- **Größere Hinweistexte** auf kleinen Touch-Bildschirmen (zentrierte Kleinschrift 1,5-fach, sofern sie passt)
- **Mehrspieler-Statistik** (Mehrspieler → [S] Statistik): je Spielername Springen, Siege, Podestplätze, Sprünge, Bestweite, Durchschnittsweite und -punkte, Weltcup-Gesamtsiege; Direktvergleich der aktuell eingestellten Spieler; löschbar
- Zufallsschanze: Hinweiszeile „Fair geprüft …“ gekürzt, ragt nicht mehr über den Rahmen

## 1.11.2 (02.11.2026)
- Mehrspieler: in der Schanzenauswahl neuer Knopf **Zufallsschanze (Z)** – Seed neu würfeln, Seed oder Code eingeben, teilen, dann START für alle Spieler; ESC führt zurück zur Schanzenliste
- Der zuletzt verwendete Zufalls-Seed wird für die nächste Mehrspieler-Runde gemerkt

## 1.11.1 (02.11.2026)
- Mehrspieler-Einzelspringen: nach der Spielerwahl führt **WEITER** zur Schanzenauswahl mit Vorschaubild und allen Schanzendaten (Tempo, Wind, Wetter, Rekord); dort startet ENTER das Springen, ESC geht zurück zur Spielerwahl
- Die Schanzen-Zeile im Mehrspieler-Menü entfällt dafür; beim Weltcup bleibt die Tour-Auswahl

## 1.11.0 (02.11.2026)
- Neuer Menüpunkt **7. Mehrspieler**: 2–4 Personen springen abwechselnd an einem Gerät (nur menschliche Springer)
- Jede Person mit eigenem Namen (Eingabefeld) und eigener Anzugfarbe; Einstellungen werden gemerkt
- Formate: **Einzelspringen** (Schanze wählbar, 2 Durchgänge, Siegerehrung) und **Mehrspieler-Weltcup** (Standard- oder Zufallstour über 5 Schanzen, Gesamtwertung, gelbes Trikot); der Mehrspieler-Weltcup wird getrennt vom Einzelspieler-Weltcup gespeichert und kann fortgesetzt werden
- Vor jedem Sprung erscheint „An der Reihe: NAME“ zum Weitergeben des Geräts
- Hauptmenü: Highscores jetzt Taste 8, Einstellungen 9, Beenden 0

## 1.10.1 (01.11.2026)
- Wettkampf und Weltcup: **alle KI-Sprünge sofort überspringen** – Taste K oder Knopf während eines KI-Sprungs; danach geht es direkt mit deinem nächsten Sprung bzw. dem Zwischen-/Endstand weiter
- Auf Startliste und Zwischenstand umschaltbar: „[K] KI-SPRÜNGE: ZEIGEN / ÜBERSPRINGEN“; im Weltcup wird die Wahl für die ganze Saison gespeichert

## 1.10.0 (01.11.2026)
- **Leistung:** Sprungbild rund 30 % schneller (gebündelte Zeichenaufrufe, Publikum je Farbe in einem Durchgang, zugeschnittene Bergbilder)
- Neue Einstellung **GRAFIK**: AUTO / HOCH / NIEDRIG – „Niedrig“ zeichnet die Welt in halber Auflösung (ca. 9 statt 13 ms je Bild); AUTO wählt auf Handys/Tablets und schwachen Geräten bzw. bei dauerhaft ruckelndem Sprung automatisch „Niedrig“
- **Pause im Sprung:** Taste P oder Knopf II oben rechts – Weiter, Neustart (Training) oder zurück ins Menü
- **Vollbild** über Taste F oder Knopf im Hauptmenü (dreht auf Handys wenn möglich ins Querformat)
- Hinweis „Bitte das Gerät quer halten“ auf Touch-Geräten im Hochformat; größere Luken-Knöpfe ▲▼ auf Touch
- **Leben am Hang:** Trainer mit Winkearm und Funktionär mit Fahne am Tisch, Kameraleute mit Stativ und Blinklicht, Helfer mit Rechen im Aufsprung und Auslauf
- **Wetter mit Wirkung:** Neuschnee bremst die Anlaufspur (leicht ca. −0,3 km/h, stark ca. −0,8 km/h; Tempoanzeige berücksichtigt das), Nebel verschluckt den Hintergrund und begrenzt die Sicht nach vorne, Windstreifen werden mit der Windstärke dichter und länger und zeigen die Richtung

## 1.9.0 (01.11.2026)
- Neuer Menüpunkt **Tutorial**: geführter Sprung auf Fichtenalm K90 mit fünf Schritten (Start, Hocke, Absprung in Zeitlupe, Flug, Landung), Pausen und Erklärungen; im Hauptmenü Hinweis „Neu hier?“ bis zum ersten Sprung
- **19 Erfolge** (z. B. Telemark über HS, Skiflieger, Schanzenkönig, Weltcupsieger) mit Einblendung beim Freischalten und eigener Seite unter Highscores
- **Herausforderungs-Code** zum Teilen: Seed + eigene Bestweite + Prüfzeichen (z. B. `EISGRAT7-1325-G`); Kopieren mit Taste C, Einlösen über das Seed-Feld – dann erscheint die zu schlagende Weite als grüne Linie am Hang
- **Echte Eingabefelder** für Seed/Code und Spielernamen: auf dem Handy erscheint die Bildschirmtastatur, Einfügen funktioniert (vorher Eingabe nur per Tastatur bzw. gesperrtem Dialog)
- Zufallsschanze und Hauptmenü neu angeordnet (9 Menüpunkte)

## 1.8.0 (01.11.2026)
- 30 fiktive KI-Springer aus 15 Nationen mit Nationalfarben, Tagesform und klar gestaffelter Stärke (neues Fehlermodell)
- Wettkampf-Feld in den Einstellungen wählbar (5, 10, 20 oder 30 Springer); 2. Durchgang für die besten 20
- „KI-Sprünge zeigen“: alle, Top 5 oder keine – nicht gezeigte Sprünge laufen mit gleicher Physik im Hintergrund
- Neuer Modus **Weltcup**: Saison über 5 Stationen bis zum Skiflug-Finale (oder Zufallstour), FIS-Punktetabelle 100–1, gelbes Trikot für den Führenden, Spielstand wird gespeichert, Gesamtsieger-Ehrung
- Fernsehgrafik im Wettkampf: LIVE-Logo, Bauchbinde mit Startnummer und Weltcup-Platz, Ticker der letzten Sprünge, grüne „Zu schlagen“-Linie am Hang, Platzierung nach der Landung
- Start- und Ergebnislisten zweispaltig für große Felder; Schwierigkeit beeinflusst jetzt auch die Stärke der Gegner

## 1.7.0 (01.11.2026)
- Ehrliche Flugphysik: angezeigtes Tempo = physikalisches Tempo auf allen Schanzen (vorher auf Großschanzen intern bis 27 % schneller)
- Aufsprunghang skaliert mit der Schanzengröße: Großschanzen fallen nach dem Tisch steiler ab (wie echte Flugschanzen), damit das Nenntempo die K-Weite erreicht
- Wind wirkt realistisch über den Auftrieb: Aufwind trägt, Rückenwind drückt; ca. 1,5 m (K60) bis 9 m (K250) je m/s
- Anlaufluken 1–20 (Standard 10, je Luke ca. 0,6 km/h), vor dem Start mit ↑↓, Mausrad oder ▲▼-Knöpfen wählbar; Luken am Anlaufturm markiert
- Luken- und Windausgleich nach FIS-Prinzip, je Schanze aus der Simulation kalibriert; Ergebnisfenster zeigt beide Posten
- Wettkampf: Jury legt pro Durchgang die Luke nach dem erwarteten Wind fest; selbst gesenkte Luke bringt Bonuspunkte
- Behoben: KI-Springer mit zu spätem Absprung-Timing sprangen trotzdem perfekt ab

## 1.6.1 (26.10.2026)
- Behoben: In den Einstellungen machte ein Klick auf den linken Pfeil der Lautstärke- und Empfindlichkeitsregler lauter statt leiser
- Pfeile an allen Reglern immer sichtbar; Klick auf ein Kästchen des Balkens setzt die Stufe direkt

## 1.6.0 (26.10.2026)
- Kamera nach dem Start nochmals 30 % näher, insgesamt 1,56-fach gegenüber der Startansicht (`CAM_ZOOM = 1.2 * 1.3`)
- Blickvorlauf angepasst, damit der Springer beim engeren Ausschnitt nicht an den Rand rutscht

## 1.5.0 (26.10.2026)
- Kamera zoomt nach dem Start sanft um 20 % näher an den Springer (Anlauf, Flug und Auslauf); am Start bleibt die bisherige Ansicht
- Der Wert ist zentral über `CAM_ZOOM` im Code einstellbar

## 1.4.0 (26.10.2026)
- Querformat 16:9: logische Fläche 854×480, intern 1708×960 (weiterhin exakt 2× skaliert, Schrift scharf)
- Breitere Spielansicht mit mehr Sicht auf den Hang; Wind-, Weiten- und Neigungsanzeige an den Bildrändern
- Menüs mittig über dem animierten Hintergrund in voller Breite
- Auf Smartphones im Querformat füllt das Spiel nun fast den ganzen Bildschirm
- Behoben: einzelne senkrechte Linien im Gebirgshintergrund (Rundungsfehler)

## 1.3.0 (26.10.2026)
- Sturz als Ragdoll: Körper aus Punktmassen mit Gelenk-Constraints (Verlet-Physik), überschlägt sich am Hang, Ski lösen sich aus der Bindung und rutschen getrennt weiter; dumpfe Aufprallgeräusche und Schneespritzer; Kamera folgt dem stürzenden Springer; Replay zeigt den Sturz
- Gilt für Stürze bei der Landung und für Stürze in der Luft (zu flache Haltung)
- Starthaus steht jetzt auf Stahlstützen mit Querstreben und Betonfüßen bis zum Gelände (schwebte vorher)
- Schneegeräusch im Anlauf und Auslauf deutlich leiser und weicher (Bandpass statt Hochpass)

## 1.2.0 (26.10.2026)
- Interne Auflösung 1280×960 statt 640×480; Menüs und Anzeigen exakt 2× skaliert (Pixelschrift bleibt scharf)
- Himmel mit DOS-typischem Dithering, Sonne/Mond mit Glanz und Kratern, schattierte Wolken
- Berge pro Pixel erzeugt: Felswände mit Gesteinsschichten, Schneefelder und Rinnen, Baumgrenze, Dunst in der Ferne
- Vier Baumarten mit Schnee auf den Ästen, in zwei Tiefenreihen, plus gezackter Waldsaum
- Anlaufturm als Stahlfachwerk mit Diagonalen, Betonfundamenten, Geländer, Treppe, Eisspur mit Rillen und rot-weißer Tischkante
- Starthaus aus Holz mit Fenstern, Schneedach, Kamin und wehender Fahne; Kampfrichterturm mit Richtern im Fenster
- Springer: schattierte Gliedmaßen, Helm mit Brille, Startnummer, Handschuhe, Schuhe, Ski mit Bindung und Dekor
- Zuschauer mit Schals, Mützen und Fahnen auf Tribünen; Werbebanden mit Schriftzug
- Zeichenroutinen optimiert (Polygon-Streifen, zusammengefasste Pixellinien), damit 60 FPS auch bei höherer Auflösung halten

## 1.1.0 (26.10.2026)
- Kamera deutlich näher am Springer (Anlauf, Flug und Auslauf); bei großer Höhe zoomt sie nur so weit heraus, dass der Hang sichtbar bleibt
- Beide Ski sichtbar: leichter 3D-Effekt durch Tiefenversatz der abgewandten Seite (Ski, Bein, Arm dunkler und versetzt)
- V-Stil im Flug: Skispitzen öffnen sich sichtbar
- Schatten des Springers auf dem Schnee
- Helm mit Brille, kräftigere Linien bei naher Kamera
- Versionsnummer im Hauptmenü und im Quelltext (`VERSION`)

## 1.0.0 (26.10.2026)
- Erste Version: 12 Schanzen, Zufallsschanzen mit Seed, Training, Wettkampf gegen 4 KI-Springer, Replay, Chiptune-Musik und Effekte, Touch-Steuerung
