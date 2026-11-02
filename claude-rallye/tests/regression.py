"""Regressionstest für Claude Rallye: KI-Rennen auf allen Strecken (Headless-Chromium).
Aufruf: python3 tests/regression.py [laps] [strecke,strecke,...]
Prüft: keine Skriptfehler, alle Autos kommen ins Ziel, Boxenstopps, wenige Resets."""
import asyncio, sys, json, pathlib
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
LAPS = int(sys.argv[1]) if len(sys.argv) > 1 else 4
IDS = sys.argv[2].split(',') if len(sys.argv) > 2 else None
WX = [{'sky': 'clear', 'time': 'day'}, {'sky': 'rain', 'time': 'night'}]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file://' + str(ROOT / 'index.html')); await pg.wait_for_timeout(800)
        ids = IDS or await pg.evaluate("TRACK_DEFS.map(d=>d.id)")
        bad = 0
        for wx in WX:
            for tid in ids:
                r = await pg.evaluate("""([id, laps, wx]) => { Game.state = 'x';
                  const R = createRace({ mode: 'quick', trackId: id, laps, ai: 8, diff: [0,1,2,3], weather: wx, players: [],
                    rules: { fuelOn: true, fuelPct: 150, tireOn: true, tirePct: 150, dmgOn: true, dmgPct: 100, pits: true } });
                  R.mode = 'sim'; R.audible = false;
                  let steps = 0, resets = 0, air = 0, lvl = 0; const pits = new Set();
                  for (const c of R.cars) { const o = c; o._r = 0; }
                  while (R.state !== 'done' && steps < 120 * 60 * laps) {
                    updateRace(R, DT); steps++;
                    for (const c of R.cars) { if (c.resetMsg > 1.19) resets++; if (c.ai.mode === 'service') pits.add(c.id + '_' + c.lap); if (c.air) air++; if (c.level) lvl++; }
                    if (R.state === 'ending' && R.endT < 0.05) break;
                  }
                  return { t: R.t.toFixed(0), fin: R.cars.filter(c => c.finished).length, resets, pits: pits.size, air: (air / 120).toFixed(1), lvl: (lvl / 120).toFixed(1),
                    best: Math.min(...R.cars.map(c => c.best || 999)).toFixed(2), cls: R.cars.map(c => c.cls.id[0] + c.lapTimes.length).join(' ') };
                }""", [tid, LAPS, wx])
                ok = r['fin'] >= 5 and r['resets'] < 40
                bad += 0 if ok else 1
                print(('OK  ' if ok else 'FAIL'), wx['sky'][:5], wx['time'][:5], tid.ljust(8), json.dumps(r))
        print('Fehler:', errs[:5])
        await b.close()
        sys.exit(1 if bad or errs else 0)
asyncio.run(main())
