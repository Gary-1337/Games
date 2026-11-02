# Claude Rallye – Versionsverlauf

Top-Down-Arcade-Rennspiel in einer einzigen Datei (HTML5 + Canvas + JavaScript).
Die aktuelle Version liegt immer in `index.html`. Die Versionsnummer steht unten rechts im Hauptmenü.
Im Projekt werden höchstens 3 Versionsstände aufbewahrt (aktuelle `index.html` + bis zu 2 ältere unter `versions/`). Ältere werden gelöscht. **Rollback:** gewünschte Datei aus `versions/` als `index.html` verwenden. Alle Änderungen sind hier dokumentiert.

## 1.7.0-beta3 (01.11.2026, in Arbeit)
- **Kommentator standardmäßig aus.** Einschalten unter Optionen → „Kommentator“. War er in gespeicherten Einstellungen an, wird er einmalig ausgeschaltet. Die Stimmenprobe (▶) funktioniert auch bei ausgeschaltetem Kommentator.
- Versionsablage im Projekt (max. 3 Stände): `index.html` (aktuell), `versions/index-v1.7.0-beta2.html`, `versions/index-v1.6.3.html` (letzte stabile Version).

## 1.7.0-beta2 (01.11.2026, in Arbeit)
- **Kommentator-Stimme männlich:** Das Spiel wählt automatisch eine männliche deutsche Stimme und bevorzugt dabei natürlich klingende Stimmen (z. B. Microsoft Conrad/Killian/Florian Online (Natural), Stefan, Markus, Yannick). Gibt es nur weibliche Stimmen, spricht die Stimme tiefer.
- **Stimmenauswahl** in den Optionen: alle deutschen Stimmen des Geräts (♂/♀ markiert), mit Test-Knopf ▶.
- **Lebendigere Ansagen:** mehrere Formulierungen je Ereignis (Start, Führungswechsel, letzte Runde, Sieg, Rekord), die zufällig wechseln.

## 1.7.0-beta (01.11.2026, in Arbeit)
Fertig:
- **Kommentator:** Sprachausgabe des Browsers mit deutscher Stimme. Optionen → „Kommentator“ an/aus.
  - Ansagen: Start, Führungswechsel (wenn ein Spieler beteiligt ist), letzte Runde, Zieleinlauf und Sieg, Streckenrekord, Ausscheiden/Wrack, harte Crashs.
  - Wiederholungen sind zeitlich begrenzt, damit sich nichts ständig wiederholt.
- **Minikarte** in der Seitenleiste (bei Zoom-Kamera): Strecke, Boxengasse, Startlinie, alle Autos, das eigene mit weißem Rand.
- **Positionsanzeige:**
  - Abstand zum Vorder- (▲) und Hintermann (▼) in Sekunden, bei Zoom-Kamera.
  - Pfeile am Bildrand zu den drei nächsten Gegnern außerhalb des Ausschnitts, mit Entfernung.

Noch offen (siehe `ARBEITSSTAND.md`): Power-ups, Punkt-zu-Punkt-Rallye, bessere Menüs.

## 1.6.3 (01.11.2026)
- **Checkpoints sichtbar:**
  - An beiden Fahrbahnrändern jedes Checkpoints steht ein Fahnenmast mit wehendem Wimpel und der Checkpoint-Nummer.
  - Quer über die Fahrbahn liegt eine dezente gestrichelte Linie.
  - Der **nächste Checkpoint von Spieler 1** ist grün, pulsiert und leuchtet am Boden; alle anderen sind orange.
  - Beim Durchfahren ertönt ein kurzer Ton.
- **Zurück zum letzten Checkpoint:** Das Auto wird direkt hinter den zuletzt durchfahrenen Checkpoint gesetzt (nach der Ziellinie: hinter die Start-/Ziellinie), mit Meldung „Zurück zu Checkpoint X“. Im Derby wirkt die Taste wie ein normaler Reset.
  - Spieler 1: **Leertaste** (allein zusätzlich E).
  - Spieler 2: E. Spieler 3: O. Spieler 4: Num 9.
  - Gamepad: X. Touch: neuer Knopf ⚑ unter Reset.
  - Die Tasten sind in Setup und Optionen aufgeführt.
- Kurz angetippte Reset-Tasten gehen nicht mehr verloren (vorher wurde ein Tastendruck kürzer als ein Bild manchmal ignoriert).

## 1.6.2 (01.11.2026)
- **Abkürzsperren:** Wo zwei weit auseinanderliegende Streckenteile nur durch einen schmalen Grünstreifen getrennt sind, steht jetzt eine Reihe Reifenstapel. Abkürzen würde dort einen Checkpoint auslassen. Die Stellen werden automatisch gefunden (Mittellinie zwischen beiden Fahrbahnen, Abstand bis ca. 80 Einheiten, Streckenabstand über 280 Einheiten). Gewollte Abkürzungen, Brücken und die Boxengasse bleiben frei. Betroffen sind vor allem Haarnadel-Arena, Bergstadt (zwischen den Serpentinen), Kartbahn, Dünenring, Steinbruch, Containerhafen, Gletscherpass, Achterbahn, Waldrallye und Eissee.
- **Hinweis bei ausgelassenem Checkpoint:** Am Auto erscheint „CHECKPOINT VERPASST – zurück!“ mit Warnton, und der verpasste Checkpoint blinkt gelb mit Nummer auf der Strecke, bis man ihn durchfährt.

## 1.6.1 (01.11.2026)
- **Vulkanring:** Die Brücke lag schräg in der Kurve rechts unten. Der Lavafluss quert jetzt die rechte Gerade im rechten Winkel und endet in einem Lavasee. Die Brücke steht dadurch gerade auf einem geraden Stück. Die rechte Seite der Strecke ist dafür begradigt.
- **KI ca. 20 % leichter** (alle Stufen):
  - Kurven- und Höchsttempo −12 %.
  - 30 % mehr Fahrfehler.
  - Weniger aggressives Überholen und Verteidigen.
  - Gemessene Rundenzeiten der KI sind jetzt 7–10 % langsamer. Speedway „Schwer“: 9,1 s → 9,8 s, „Sehr leicht“: 10,7 s → 11,7 s.
  - Einstellbar über `AI_EASE` im Code.

## 1.6.0 (01.11.2026)
- **Boxenanlagen neu, auf allen 14 Strecken:**
  - Die Boxengasse wird jetzt automatisch parallel zur Startgeraden erzeugt.
  - Etwa **doppelt so breit**: innen die Fahrspur, außen die Halteplätze. Die KI fährt zum Anhalten auf die Außenseite, damit Durchfahrende nicht blockiert werden.
  - Eine **Trennplanke** steht zwischen Strecke und Boxengasse. Ein- und Ausfahrt liegen am Anfang und Ende der Geraden, also mit Abstand zur Startaufstellung.
  - Das **Boxengebäude** steht parallel hinter den Halteplätzen.
  - Die Seite (innen/außen) wird automatisch gewählt, sodass Boxengasse und Gebäude in die Karte passen und kein Wasser, keine Lava und keine andere Fahrbahn berühren.
  - Die Start-Ziel-Linie reicht über die Boxengasse.
- **Breitere Start-Ziel-Gerade:** Im Bereich der Boxengasse ist die Fahrbahn bis zu 1,35× breiter und läuft sanft auf die normale Breite zurück.
- **Gerade Startgeraden:** Folgende Strecken wurden angepasst, damit die ganze Startaufstellung auf einer Geraden steht:
  - Hafenviertel, Gletscherpass, Haarnadel-Arena (Delle in der Startgeraden entfernt)
  - Achterbahn und Bergstadt (rechte Schleife mit langer Geraden statt Kurve)
  - Waldrallye und Containerhafen (gerade linke Seite)
  - Die Startgeraden sind jetzt 240–590 Einheiten lang, vorher teils nur 56.
- **Startaufstellung:** 2er-Reihen versetzt mit mehr Abstand (46 statt 36 zwischen den Reihen), mittig auf der verbreiterten Geraden.
- Hinweis: Auf geänderten Strecken passen alte Rundenrekorde und Ghosts nicht mehr genau. Sie lassen sich unter Optionen → „Rekorde & Ghosts löschen“ zurücksetzen.

## 1.5.1 (01.11.2026)
- **Schärfere Zoom-Kamera:** Bisher wurde das fertige Bild vergrößert, dadurch war es verschwommen. Jetzt wird die Szene bei aktiver Kamera in doppelter Auflösung vorberechnet (Boden pixelgenau). Autos, Objekte, Partikel und Licht werden direkt vergrößert gezeichnet. Der Aufbau eines Rennens dauert dadurch etwa 1 s länger.
- **Zoom ein-/ausschalten:**
  - Optionen → „Kamera-Zoom (allein)“: Aus / Folgen / Nah.
  - Im Rennen mit Taste **C** umschaltbar, ebenso über einen Knopf im Pausenmenü.
  - Beim Einschalten mitten im Rennen wird die Szene einmal in hoher Auflösung neu aufgebaut. Hinweis unten in der Seitenleiste: „C: Zoom“.
- Fehlerbehebung: Werbebanden wurden in der hochauflösenden Szene falsch gezeichnet (Schrift lag am Boden), weil die Transformation überschrieben wurde.

## 1.5.0 (01.11.2026)
- **4 neue Strecken** (jetzt 14):
  - **Vulkanring:** Asche, Lavakrater, Lavapools, Brücke über einen Lavafluss. Lava wirkt wie Wasser: Das Auto brennt kurz und wird zurückgesetzt.
  - **Strandpromenade:** Sand, Palmen, Meer, Lagune und ein Steg (Brücke) über den Kanal.
  - **Bergstadt:** Serpentinen den Hang hinauf und eine Kreuzung mit Brücke, die Unterführung inklusive.
  - **Steinbruch:** Schotterwege, Kiesgruben, Baggersee, 4 große Sprungrampen und eine Abkürzung.
  - Dazu neue Himmel und Horizonte: Vulkane mit Rauchfahnen, Meer mit Inseln, Felswände, Alpen mit Dorf. Die Strecken sind auch in der Karriere eingebaut.
- **4 neue Fahrzeugklassen** (jetzt 10), jeweils mit eigenem 3D-Modell und Motorklang:
  - **Truck:** schwer, schiebt alles weg, wenig Schaden, Diesel mit Turbo.
  - **Muscle-Car:** viel Kraft, wenig Grip, V8 mit Fehlzündungen.
  - **Elektro:** stärkste Beschleunigung, geringes Höchsttempo, leises Surren statt Motor.
  - **Buggy:** sehr gut abseits der Straße, auf Asphalt langsamer.
  - Der **Brummer** bekommt ein neues Pickup-Modell mit Ladefläche.
  - Karriere: Die neuen Autos gibt es beim Händler ab Liga 2 bzw. 3, und die KI fährt sie dort auch.
- **Stärkere Höhenunterschiede** auf allen Strecken: mehr und höhere Hügel und Kuppen. Die Fahrbahn-Glättung ist reduziert, damit die Hügel erhalten bleiben. Die Kartbahn hat jetzt auch Höhen. Eine Rampe der Waldrallye wurde entfernt, weil man von ihr jetzt zu weit flog.
- **Abkürzungen** (Dünenring, Steinbruch): Schotterweg mit einer **Schranke**, die sich alle 7 s öffnet und schließt (Lampe grün/rot). Geschlossen ist sie ein Hindernis. Die KI nimmt die Abkürzung, wenn die Schranke bei ihrer Ankunft offen ist; stärkere KI tut das häufiger.
- **Ölflecken** auf Geraden mehrerer Strecken: sehr wenig Grip.
- **Windschatten** für alle: Dicht hinter einem schnellen Auto ist man schneller und beschleunigt besser. Anzeige „≋ WINDSCHATTEN“ am eigenen Auto.
- **Bessere KI:** bleibt zum Überholen im Windschatten und schert dann zur Seite mit mehr Platz aus. Verteidigt ihre Position, wenn jemand dicht dahinter ist. Macht unter Druck mehr Fehler.
- **Kamera** (nur allein): folgt dem Auto mit Zoom und blickt etwas voraus. Optionen: Ganze Strecke / Folgen / Nah. Bei harten Treffern wackelt die Kamera kurz.
- **Mehr Effekte:** Funkenregen beim Schrammen an Leitplanken und Mauern, Lichtblitz bei harten Einschlägen, längere Staubfahnen bei hohem Tempo, mehr Reifenqualm beim Driften, Burnout-Qualm beim Start starker Autos, Feuer und Rauch in der Lava.
- Fehlerbehebung: Der Rauch beschädigter Autos im Derby war unsichtbar (falsches Farbformat bei Partikeln).

## 1.4.0 (31.10.2026)
- **Musik:** 7 Stücke, live im Browser synthetisiert (keine Audiodateien): Schlagzeug, Bass, Flächen, Arpeggio, Melodie mit Echo, Powerchords bei Rock/Punk. Jedes Stück hat einen Ablauf aus Intro, Teil A, Teil B und Break.
  - Menü „Boxengasse bei Nacht“, Rennen je nach Umgebung „Vollgas“, „Neonring“, „Schotterpiste“ oder „Gletscherfunk“ (manchmal zufällig), Derby „Blechschaden“, nach einem Sieg „Siegerehrung“.
  - Im Rennen leiser, in der Pause noch leiser. Das aktuelle Stück steht unten in der Seitenleiste.
  - Optionen: Musik an/aus, Musik-Lautstärke, Musik im Rennen an/aus.
- **Motorsound neu:** eigener Klang je Klasse.
  - Blitz: hochdrehend, 6 Gänge. Allround: ausgewogen. Brummer: tiefes V8-Blubbern. Rallye: Turbopfeifen und Fehlzündungen beim Gaswegnehmen und Schalten. Formel: kreischend, 7 Gänge. Kart: Zweitakt-Sägen ohne Gänge.
  - Drehzahl mit Gangwechseln (kurzer Einbruch beim Schalten), Drehzahlbegrenzer, Hochdrehen bei durchdrehenden Rädern und in der Luft, Gasstöße in der Startaufstellung.
  - **KI-Autos hörbar** (die 5 nächsten): Stereo-Panorama, leiser mit Entfernung, **Doppler-Effekt** beim Vorbeifahren. Im Mehrspielermodus hört man die Spielerautos links/rechts im Bild. Option „KI-Motoren hörbar“.
- **Touch-Steuerung** für Handy und Tablet: links Lenken (◀ ▶), rechts Bremse und Gas (mehrere Finger gleichzeitig, Finger dürfen zwischen den Knöpfen gleiten), oben links Pause und Reset. In der Box gilt wie gewohnt ◀ Reparatur, Bremse Tanken, ▶ Reifen.
  - Option „Touch-Steuerung“: Automatisch (bei Touch-Geräten), An, Aus. Gilt für Spieler 1.
  - Hochformat: Hinweis „Bitte das Gerät quer halten“. Kein Zoomen und Scrollen durch Wischen.
- **Vollbild-Knopf** im Hauptmenü (auf Handys wird, falls erlaubt, Querformat gesperrt).
- Optionen jetzt in drei Spalten (Spielernamen und Daten, Audio und Anzeige, Steuerung).

## 1.3.0 (31.10.2026)
- **Karriere** (neuer Menüpunkt): 4 Ligen mit je 4–5 Rennen (Einsteiger-Pokal, Regional-Serie, Staatsmeisterschaft, Claude Grand Prix). Die Ligen enthalten auch Ausscheidungsrennen und Derbys. Die KI wird von Liga zu Liga stärker, und manche Rennen haben festes Wetter.
  - Preisgeld je Platz und Rennen, Bonus für Platz 1–3 der Gesamtwertung, Startgeld ab Liga 2.
  - Mit Platz 1–3 in der Gesamtwertung wird die nächste Liga freigeschaltet. Ligen lassen sich wiederholen, um Geld zu verdienen.
  - Garage und Händler: Start mit 1 500 € und einem Allround-Wagen. Brummer und Kart gibt es sofort, die Rallye ab Liga 2, Blitz ab Liga 3, Formel ab Liga 4.
  - Statistik: Rennen, Siege, Podien, Ligatitel und verdientes Geld. Name und Farbe sind änderbar.
  - Der Spielstand wird automatisch im Browser gespeichert (`cr_career`), auch mitten in einer Liga. Mit „Weiter“ geht es später beim nächsten Rennen weiter.
- **Ausscheidungsrennen** (Schnelles Rennen → Modus „Ausscheidung“): Nach jeder Runde scheidet der Letzte aus. Das Auto wird durchsichtig und fährt ohne Kollisionen weiter. Die Rundenzahl ist Fahrerzahl − 1. Der aktuell Letzte trägt das Schild „LETZTER“. Scheiden alle Spieler aus, endet das Rennen nach 3 s.
- **Demolition Derby** (Schnelles Rennen → Modus „Derby“): zwei neue Arenen, „Schlammgrube“ (Reifenwand, Bodenwellen, Rampen) und „Schrottplatz“ (Containerwand, Hindernisse, Rampen). Das letzte fahrbereite Auto gewinnt. Ist die Zeit um (2/3/5 Min), gewinnt das Auto mit dem geringsten Schaden.
  - Rammen mit der Front schont das eigene Auto, Treffer ins Heck und in die Seite schaden mehr.
  - Bei 100 % Schaden bleibt ein Wrack liegen (dunkel, raucht, schiebbar).
  - Kein Sprit, keine Reifen, keine Box. Die Schadensstärke ist einstellbar.
  - Eigene Derby-KI: wählt Ziele, rammt mit der Front, setzt bei Stillstand zurück.
  - Anzeige: Restzeit, fahrbereite Autos, Schaden je Fahrer, Treffer.
- **Aufgeben** (Pause, in Championship und Karriere) wertet den Spieler jetzt als Letzten. Bisher zählte der aktuelle Stand, und man konnte direkt nach dem Start mit Startplatz-Wertung aufgeben. In der Karriere gibt es fürs Aufgeben kein Preisgeld.
- Hauptmenü: „Karriere“ an erster Stelle, Menü etwas kompakter.
- Neuer Test `tests/modes.py` für Ausscheidung und Derby.

## 1.2.1 (31.10.2026)
- **Fehlerbehebung Brücken:** Wer unter einer Brücke durchfuhr, wurde in die Luft geschleudert. Ursache: Die Höhenkarte übernahm unter der Brücke die Deckhöhe der oberen Fahrbahn (Strecke „Acht“: Boden bis 26,7 statt 0). Jetzt bleibt der Boden unter der Brücke auf Höhe der unteren Fahrbahn. Gilt für die Beispielstrecken und für Brücken im Editor. Eine zusätzliche Absicherung greift auch bei Strecken, die schon gespeichert sind.

## 1.2.0 (31.10.2026)
- **Höhenunterschiede:** Jede Strecke hat eine Höhenkarte. Bergauf wird man langsamer, bergab schneller; Kuppen und Böschungen sind sichtbar (Schattierung, Böschungskanten). Stufen über 7 wirken wie Mauern.
- **Sprünge:** Autos können abheben (Rampen, Kuppen). In der Luft keine Lenkung und kein Gas; harte Landungen verursachen Schaden, Staub und Funken; der Schatten bleibt am Boden.
- **Brücken:** echte zweite Ebene. Auf die Brücke kommt man nur über die Zufahrt; darunter kann eine andere Fahrbahn durchführen (Kreuzungen) oder Wasser sein. Autos unter der Brücke werden verdeckt, Kollisionen nur auf derselben Ebene.
- **Wetter:** Klar, Bewölkt (ziehende Wolkenschatten), Regen (weniger Grip, nasse Fahrbahn, Pfützen mit Aquaplaning, Gischt, Blitz und Donner) bzw. Schneefall auf Schneestrecken; auch „Zufall“
- **Tageszeit:** Tag, Abend (Sonnenuntergang), Nacht (Sterne, Mond, Laternen mit Lichtkegeln, Scheinwerfer und Rücklichter der Autos); auch „Zufall“
- **Neue Fahrzeugklassen:** Rallye (stark auf Schotter, Sand, Schnee), Formel (sehr schnell auf Asphalt, abseits hilflos, empfindlich), Kart (klein und wendig); jedes Auto hat eigene Kollisionsgröße. Eigene 3D-Modelle (Formel mit Flügeln und Fahrerhelm, Kart mit Fahrer, Rallye mit Zusatzscheinwerfern und Schmutzfängern)
- **Neuer Untergrund:** Schotter (Fahrbahn für Rallyestrecken) und Beton
- **Strecken überarbeitet:** alle 5 mit Hügeln; Hafenviertel mit Kanal und zwei Brücken; Dünenring und Haarnadel-Arena mit Sprungrampen; Gletscherpass als Bergstrecke
- **5 neue Strecken:** Achterbahn (Acht mit Brücke), Waldrallye (Schotter, Wald, Sprünge), Containerhafen (Brücke über das Hafenbecken, Container, Laternen), Eissee (Strecke über einen zugefrorenen See), Kartbahn (eng, Reifenstapel)
- **Neue Objekte:** Rampe, Brücke, Laterne, Container
- **Editor:** Werkzeug „Höhe“ (Anheben, Absenken, Glätten, Ebnen, „Alles flach“, „Fahrbahn glätten“), Werkzeug „Brücke“ (ziehen, Zufahrten werden automatisch entlang der KI-Linie angeschüttet, Unterführung bleibt frei), Rampe/Laterne/Container als Objekte, Höhe von Rampe/Brücke mit + / −; Statuszeile zeigt die Geländehöhe
- **Menü:** Streckenliste zweispaltig, Wetter und Tageszeit im Rennsetup, KI-Autos als Auswahlliste, Streckenvorschau in der Schrägansicht, Menü-Demorennen manchmal bei Regen oder Nacht
- Leistung: unbewegliche Objekte werden vorab gezeichnet und nur bei Überdeckung neu
- Regressionstest `tests/regression.py` (KI-Rennen auf allen Strecken, Tag/klar und Regen/Nacht)

## 1.1.0 (31.10.2026)
- Neue Ansicht: leicht schräge Draufsicht mit Perspektive (hinten schmaler), Himmel und Horizont je Stil (Hügel, Skyline, Tafelberge, Schneeberge), Dunst nach hinten, Farbstimmung und Vignette. Physik und Editor bleiben flach.
- Objekte mit Höhe: Häuser mit Satteldach, Fenstern, Türen und Schornstein; Boxengebäude mit Garagentoren; Bäume mit Stamm und Krone (Laubbaum, Palme, Tanne); Reifenstapel, Mauern, Leitplanken mit Pfosten; Schattenwurf
- Neue Deko-Objekte (auch im Editor): Tribüne mit Zuschauern, Werbebande, Zaun, Busch, Stein, Flagge (weht). Beispielstrecken haben Tribünen und Flaggen an der Start-/Zielgeraden, Banden, Zäune, Büsche und Steine.
- Autos mit Höhe: Räder (vordere lenken mit), Kabine mit Scheiben, Dach, Scheinwerfer, Bremslichter (leuchten beim Bremsen), Startnummer, Heckflügel (Blitz), Überrollkäfig (Brummer), Kratzer bei Schaden
- Boden: weiche, runde Kanten statt Treppenstufen, weiße/gelbe Randlinien, feinere Texturen (Grashalme, Blumen, Kiesel, Sandrippel, Schneeglitzern), Schmutz an Fahrbahnrändern, abgefahrene Gummispur auf der Ideallinie, Schaum am Ufer
- Effekte: Staubwolken und Erdbrocken abseits der Strecke, Reifenqualm, Auspuffwölkchen, Schadensrauch, Funken mit Abprall, Wasserspritzer mit Wellenringen
- Fehler behoben: Variante (Farbe/Text) von Banden und Flaggen sowie das Boxengebäude gingen beim Laden/Export verloren

## 1.0.1 (31.10.2026)
- Fehler behoben: Spiel blieb hängen mit „Access to gamepad is disallowed“, wenn der Browser den Gamepad-Zugriff sperrt (z. B. in der Vorschau). Die Gamepad-Abfrage schaltet sich dann still ab, die Tastatur funktioniert normal.
- Einzelspieler: Spieler 1 fährt wahlweise mit Pfeiltasten oder WASD (Reset R oder Q). Im Mehrspieler bleibt WASD für Spieler 2.

## 1.0.0 (31.10.2026)
- Erste Version
- Fahrphysik: Arcade-Drift, 3 Fahrzeugklassen (Blitz, Allround, Brummer), Oberflächen Asphalt, Gras, Sand, Kies, Schnee, Eis, Wasser (Out-of-Bounds), Curbs, Boxengasse
- Schaden (weniger Tempo, Beschleunigung, Lenkpräzision; Wackeln ab 50 %), Spritverbrauch, Reifenverschleiß – jeweils an/aus und 25–300 %
- Boxengasse mit Tempolimit, BOX IN/OUT-Markierung; im Boxenbereich stehend: Links Reparatur, Unten Tanken, Rechts Reifen (getrennte Wartezeiten)
- Rennlogik: Countdown mit Ampel und Sound, Startaufstellung, Checkpoints in Reihenfolge und Fahrtrichtung (Anti-Cheat), Positionen nach Renndistanz, Abstände, Falschfahrer-Warnung, Reset (R/Q/U/Num7)
- Bis zu 8 Autos, 4 Spieler an einer Tastatur (Pfeile, WASD, IJKL, Numpad) plus Gamepads
- KI in 4 Stufen mit Ideallinie, Geschwindigkeitsprofil, Überholen, Fehlern, Boxenstrategie; gleiche Physik wie Spieler
- Modi: Schnelles Rennen, Zeitfahren mit Ghost-Car, Championship (Punkte 10-8-6-5-4-3-2-1, +1 schnellste Runde)
- Ergebnisbildschirm (Platz, Gesamtzeit, Abstand, beste Runde, alle Rundenzeiten), Bestenliste je Strecke (Top 10, localStorage)
- 5 Strecken: Speedway Rundling (Oval), Hafenviertel (Stadt), Dünenring (Wüste), Gletscherpass (Schnee mit Eisplatten), Haarnadel-Arena (technisch)
- Streckeneditor: Malen, Füllen, Objekte (Baum, Reifenstapel, Haus, Mauer, Leitplanke) setzen/drehen/verschieben/löschen, Start/Ziel, Checkpoints manuell oder automatisch, KI-Linie zeichnen oder aus Checkpoints, Fahrbahn aus KI-Linie asphaltieren, Boxengasse, Startplätze, Rückgängig, Speichern, JSON-Export/-Import, Testfahrt
- Menü-Hintergrund: KI-Demorennen
