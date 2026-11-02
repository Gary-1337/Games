"""Power-ups: KI-Rennen mit Pads/Kisten auf allen Strecken; prüft Verteilung, Nutzung, Zieleinläufe."""
import asyncio, sys, json, pathlib
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page()
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file://' + str(ROOT / 'index.html')); await pg.wait_for_timeout(800)
        ids = await pg.evaluate("TRACK_DEFS.map(d=>d.id)"); bad = 0
        for tid in ids:
            r = await pg.evaluate("""(id) => { Game.state = 'x';
              const R = createRace({ mode: 'quick', trackId: id, laps: 3, ai: 8, diff: [0,1,2,3], players: [],
                rules: { fuelOn: false, fuelPct: 100, tireOn: false, tirePct: 100, dmgOn: true, dmgPct: 100, pits: false, powerups: true } });
              R.mode = 'sim'; R.audible = false;
              const used = { nitro: 0, oil: 0, shield: 0 }; const orig = PU.use.bind(PU);
              PU.use = (c, r) => { if (c.item) used[c.item]++; orig(c, r); };
              let steps = 0, boost = 0, oil = 0;
              while (R.state !== 'done' && steps < 120 * 60 * 3) { updateRace(R, DT); steps++;
                for (const c of R.cars) { if (c.boostT > 0) boost++; if (c.oilT > 0) oil++; }
                if (R.state === 'ending' && R.endT < 0.05) break; }
              PU.use = orig;
              return { pads: R.pads.length, boxes: R.boxes.length, used, boost: (boost/120).toFixed(0), oil: (oil/120).toFixed(1), fin: R.cars.filter(c => c.finished).length, t: R.t.toFixed(0) };
            }""", tid)
            ok = r['pads'] >= 2 and r['boxes'] >= 4 and r['fin'] >= 5 and sum(r['used'].values()) > 3
            bad += 0 if ok else 1
            print('OK  ' if ok else 'FAIL', tid.ljust(9), json.dumps(r))
        print('Fehler:', errs[:5]); await b.close(); sys.exit(1 if bad or errs else 0)
asyncio.run(main())
