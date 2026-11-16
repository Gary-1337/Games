"""Cockpit-Ansicht: startet, rendert ohne Fehler, Umschalten mit C, nur im Einzelspieler aktiv."""
import asyncio, sys, json, pathlib
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 1540, 'height': 800})
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file://' + str(ROOT / 'index.html')); await pg.wait_for_timeout(800)
        out = {}
        for tid in ['oval', 'eight', 'desert', 'snow', 'harbor']:
            r = await pg.evaluate("""(tid) => { Options.data.camera = 3; const st = Options.data.setup; st.trackId = tid; st.humans = 1; st.ai = 5; Game.startFromSetup('quick');
              const R = Game.race; const t0 = performance.now(); const ok = Cockpit.active(R); Cockpit.prepare(R); const prep = performance.now() - t0;
              for (let i = 0; i < 120 * 6; i++) updateRace(R, DT);
              const t1 = performance.now(); for (let i = 0; i < 5; i++) Game.render(); const fr = (performance.now() - t1) / 5;
              return { ok, prep: Math.round(prep), frame: Math.round(fr), res: !!Cockpit.res, failed: Cockpit.failed }; }""", tid)
            out[tid] = r
        # Umschalten: 3 → 0, zurück zur Ansicht von oben
        out['cycle'] = await pg.evaluate("() => { Options.data.camera = 3; cycleCamera(Game.race); const a = Options.data.camera; Game.render(); return [a, Cockpit.active(Game.race)]; }")
        # zwei Spieler: Cockpit nicht aktiv
        out['two'] = await pg.evaluate("() => { Options.data.camera = 3; const st = Options.data.setup; st.trackId = 'oval'; st.humans = 2; st.ai = 4; Game.startFromSetup('quick'); Game.render(); const a = Cockpit.active(Game.race); Options.data.camera = 1; return a; }")
        ok = all(v['ok'] and v['res'] and not v['failed'] for k, v in out.items() if isinstance(v, dict)) and out['cycle'] == [0, False] and out['two'] is False
        print('OK  ' if ok else 'FAIL', json.dumps(out)); print('Fehler:', errs[:5]); await b.close(); sys.exit(0 if ok and not errs else 1)
asyncio.run(main())
