"""Test der Spielmodi Ausscheidung und Demolition Derby (nur KI). Aufruf: python3 tests/modes.py"""
import asyncio, json, sys, pathlib
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page()
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file://' + str(ROOT / 'index.html')); await pg.wait_for_timeout(800)
        bad = 0
        for mode, tid in [('elim', 'oval'), ('elim', 'city'), ('derby', 'arena_mud'), ('derby', 'arena_yard')]:
            r = await pg.evaluate("""([mode, tid]) => { Game.state = 'x'; const R = createRace({ mode, trackId: tid, laps: 3, ai: 8, diff: [0,1,2,3], weather: {sky:'clear',time:'day'}, players: [], rules: {...DEFAULT_RULES}, timeLimit: 180 });
              R.audible = false; let s = 0;
              while (R.state !== 'done' && s < 120 * 400) { updateRace(R, DT); s++; if (R.state === 'ending' && R.endT < 0.05) break; }
              const res = computeResults(R);
              return { t: +R.t.toFixed(0), out: R.outCount, ended: R.state !== 'running', winner: res[0].name, gaps: res.map(r => r.gap) }; }""", [mode, tid])
            ok = r['ended'] and (r['out'] == 7 if mode == 'elim' else r['out'] >= 2)
            bad += 0 if ok else 1
            print('OK  ' if ok else 'FAIL', mode, tid, json.dumps(r, ensure_ascii=False))
        print('Fehler:', errs[:5]); await b.close(); sys.exit(1 if bad or errs else 0)
asyncio.run(main())
