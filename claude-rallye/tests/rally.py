"""Rallye: alle Etappen mit KI-Steuerung des Spielerautos durchfahren; prüft Abschnittswechsel und Ziel."""
import asyncio, sys, json, pathlib
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page()
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file://' + str(ROOT / 'index.html')); await pg.wait_for_timeout(800)
        bad = 0
        for i in range(3):
            r = await pg.evaluate("""async (i) => {
              const info = RALLY_STAGES[i].sections.map((_, k) => { const t = getRallySection(RALLY_STAGES[i], k); const rt = prepareTrack(t);
                return { cps: rt.cps.length, br: rt.bridges.length, st: t.start[0].x.toFixed(0) + ',' + t.start[0].y.toFixed(0), L: rt.L.toFixed(0) }; });
              Options.data.camera = 0; Game.state = 'menu'; Rally.start(i); while (Game.state !== 'race') await new Promise(r => setTimeout(r, 50));
              const origRead = Input.read.bind(Input);
              Input.read = p => { const R = Game.race, c = R.cars[0]; if (!c.ai) c.ai = makeAI(c, 3); const o = aiControl(c, R, DT); o.edge = {}; return o; };
              let steps = 0, resets = 0, secs = [];
              while (Game.state === 'race' && steps < 120 * 400) {
                const R = Game.race; updateRace(R, DT); steps++;
                if (R.cars[0].resetMsg > 1.19) resets++;
                if (Game.race !== R) secs.push(steps);
              }
              Input.read = origRead;
              const C = Rally.cur;
              return { info, splits: C.splits.map(t => t.toFixed(1)), state: Game.state, resets, steps };
            }""", i)
            ok = r['state'] == 'results' and len(r['splits']) == 3
            bad += 0 if ok else 1
            print('OK  ' if ok else 'FAIL', i, json.dumps(r))
        print('Fehler:', errs[:5]); await b.close(); sys.exit(1 if bad or errs else 0)
asyncio.run(main())
