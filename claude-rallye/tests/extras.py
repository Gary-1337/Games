"""1.8.0: Raketenstart, Zwischenzeiten, schnellste Rennrunde."""
import asyncio, sys, json, pathlib
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page()
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file://' + str(ROOT / 'index.html')); await pg.wait_for_timeout(800)
        r = await pg.evaluate("""() => { Game.state = 'x';
          const mk = (ai) => { const R = createRace({ mode: 'quick', trackId: 'oval', laps: 2, ai, diff: 1, players: [{ name: 'T', cls: 1, color: '#ff0000' }], rules: { pits: false } }); R.audible = false; return R; };
          const start = (press) => { const R = mk(0); Input.read = () => ({ thr: press(R) ? 1 : 0, brk: 0, steer: 0, edge: {} });
            while (R.state !== 'running') updateRace(R, DT); return +(R.cars[0].boostT || 0).toFixed(2); };
          const out = { late: start(R => R.cd <= 0.3), mid: start(R => R.cd <= 0.6), early: start(R => true), none: start(R => false) };
          // Zwischenzeit
          const R = mk(0); Input.read = () => ({ thr: 0, brk: 0, steer: 0, edge: {} });
          while (R.state !== 'running') updateRace(R, DT);
          const c = R.cars[0]; c.lap = 1; c.lapStart = 0; R.t = 4; c.bestSplits = [0, 5]; c.nextCp = 1; passCheckpoint(c, 1, R); out.split = c.msg;
          // schnellste Runde mit KI
          const R2 = mk(5); let n = 0; while (!R2.fastLap && n++ < 60 * 120) updateRace(R2, DT);
          out.fast = R2.fastLap ? R2.fastLap.name : null; return out; }""")
        ok = r['late'] > 1 and 0 < r['mid'] < 1 and r['early'] == 0 and r['none'] == 0 and 'Zwischenzeit' in str(r['split']) and r['fast']
        print('OK  ' if ok else 'FAIL', json.dumps(r, ensure_ascii=False)); print('Fehler:', errs[:5]); await b.close(); sys.exit(0 if ok and not errs else 1)
asyncio.run(main())
