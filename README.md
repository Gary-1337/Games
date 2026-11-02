# Games

Browserspiele, jeweils eine einzelne HTML-Datei ohne Build-Werkzeuge (außer Claude Rallye, siehe unten). Zum Spielen die jeweilige `index.html` im Browser öffnen.

| Ordner | Spiel | Aktuelle Version |
| --- | --- | --- |
| `claude-rallye/` | Claude Rallye – Top-Down-Arcade-Rennspiel | 1.7.0-beta3 |
| `alpine-ski-jump-deluxe/` | Alpine Ski Jump Deluxe – Skispringen | 1.12.0 |
| `die-claudler/` | Die Claudler – Aufbau- und Wirtschaftssimulation | 2.6.0 |
| `treppen-chaos-3d/` | Treppen-Chaos 3D | 1.3.0 |

`index.html` im Hauptordner ist die Startseite mit Links zu allen Spielen.

## Aufbau je Spiel
- `index.html` – aktuelle Version
- `CHANGELOG.md` – Versionsverlauf, neueste oben
- `ARBEITSSTAND.md` – Übergabe für die nächste Arbeitssitzung (falls vorhanden)
- `versions/index-vX.Y.Z.html` – höchstens 3 ältere Stände; ältere sind über die Git-Historie abrufbar
- `tests/` – automatische Tests (Playwright)

## Claude Rallye bauen
Quellen liegen in `claude-rallye/src/`. `sh claude-rallye/build.sh` erzeugt daraus `claude-rallye/index.html`.

## Rollback
Datei aus `versions/` als `index.html` verwenden, oder einen älteren Stand mit `git checkout <commit> -- <pfad>` zurückholen.
