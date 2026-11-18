# Golf Adventure – Versionsverlauf

## 0.10.0 – 19.11.2026
- Untergrund deutlich schärfer: Shader-Splatting mit echten Materialtexturen (Gras, Rough, Sand, Erde – ambientCG, CC0) samt Normal Maps, in jeder Entfernung scharf; Ränder rund und sauber aus geglätteten Masken; Mähstreifen im Shader

## 0.9.3 – 19.11.2026
- Größere Schwungleiste (bis 380 px, am Handy deutlich größer), komplett sichtbar
- Chillige Hintergrundmusik (generiert: Akkordflächen, E-Piano, Bass, Besen, Hall), Option „Musik“
- Mehr Umgebung: Blätterrauschen mit dem Wind, Grillen, Amsel, ferner Kuckuck, ferne Kuhglocken

## 0.9.2 – 19.11.2026
- Runde Kanten statt Ecken: Fairways, Grüns, Bunker, Abschläge, Wasser und Wege werden geglättet (Chaikin) und als kantengeglättete Pfade gemalt; Testgelände und Range ohne Treppenstufen

## 0.9.1 – 19.11.2026
- Gras deutlich schärfer: feine Detailtextur (Halme, Büschel) im Gelände-Shader, Sandkörnung im Bunker, Übergänge weniger verwaschen

## 0.9.0 – 18.11.2026
Erste Version im GAMES-Repo (Testversion, Feinschliff folgt nach dem Testen).
- Realistisches Top-Down-Golf (Three.js) für PC und Handy: Maus/Tastatur, Touch, Gamepad
- 3-Klick-Bogenleiste (Kraft, Überschwung, Genauigkeit → Push/Pull/Hook/Slice), Spin-Treffpunkt, Schlagarten (Voll, Pitch, Punch, Flop), Putten mit linearer Leiste
- Ballphysik: Luftwiderstand, Magnus-Auftrieb, Wind mit Böen, Aufprall/Rollen je Untergrund, Backspin, Hangabtrieb, Loch mit Lip-out, Bäume, Wasser, Aus, Droppen
- Platz „Längsee Golf“ (18 Löcher, Par 72) – inspiriert vom Golfclub St. Veit-Längsee, aus OpenStreetMap- und BEV-Höhendaten; kein offizielles Produkt des Clubs
- Zählspiel (18 / vordere 9 / hintere 9, Abschlagfarbe), Überflug, Scorekarte, Statistik, Autospeichern und Fortsetzen
- Driving Range und Testgelände, Komfort: „spielt sich wie“, Schlägervorschlag, Landezonen-Vorschau, Putt-Linie, Gefällepfeile, Minikarte, Höhenlinien, Replay, Mulligan (Übung), Gimmie
