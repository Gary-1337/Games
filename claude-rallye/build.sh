#!/bin/sh
# Baut index.html aus den Quellteilen
cd "$(dirname "$0")"
cat src/00_head.html src/10_core.js src/20_tracks.js src/30_trackgfx.js src/35_view.js src/40_audio_input.js src/45_music.js src/47_touch.js src/50_cars_ai.js src/55_powerups.js src/60_race.js src/70_render.js src/80_ui.js src/85_career.js src/90_editor_game.js > index.html
