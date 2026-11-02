"""Verpasster Checkpoint: nach 5 s wird das Auto vor den verpassten Checkpoint gesetzt."""
import asyncio, sys, json, pathlib
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page()
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file://' + str(ROOT / 'index.html')); await pg.wait_for_timeout(800)
        r = await pg.evaluate("""() => { Game.state = 'x';
          const R = createRace({ mode: 'quick', trackId: 'oval', laps: 3, ai: 0, diff: 0, players: [{ name: 'T', cls: 1, color: '#ff0000' }], rules: { pits: false } });
          R.audible = false; Input.read = () => ({ thr: 0, brk: 0, steer: 0, edge: {} });
          while (R.state !== 'running') updateRace(R, DT);
          const c = R.cars[0], rt = R.rt; for (let i = 0; i < 240; i++) updateRace(R, DT);
          // Checkpoint 0 durchfahren lassen: Auto hinter Start setzen
          c.lap = 1; c.nextCp = 2;
          const target = rt.cps[2].frac * rt.L + 160, p = lineAtS(rt, target);
          placeOnLine(c, rt, p.x, p.y, p.a, p.i); c.vx = c.vy = 0;
          let t = 0, seen = 0; while (t < 6 && c.missedT !== undefined) { updateRace(R, DT); t += DT; if (c.missedCp) seen = t; if (c.freeze > 0.6) break; }
          const pr = projectLine(rt, c.x, c.y, null, 0);
          return { t: t.toFixed(2), missedSeen: seen.toFixed(2), s: pr.s.toFixed(0), cpS: (rt.cps[2].frac * rt.L).toFixed(0), nextCp: c.nextCp };
        }""")
        ok = 4.9 < float(r['t']) < 5.3 and float(r['s']) < float(r['cpS']) and float(r['cpS']) - float(r['s']) < 80
        print('OK  ' if ok else 'FAIL', json.dumps(r)); print('Fehler:', errs[:5]); await b.close(); sys.exit(0 if ok and not errs else 1)
asyncio.run(main())
