"""Boxenstopp eines Menschen: anhalten → Tanken startet von selbst; Lenken/Bremsen beim Losfahren löst keinen neuen Dienst aus;
in der Boxengasse kein Sprit- und Reifenverlust."""
import asyncio, sys, json, pathlib
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page()
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file://' + str(ROOT / 'index.html')); await pg.wait_for_timeout(800)
        r = await pg.evaluate("""() => { Game.state = 'x';
          const R = createRace({ mode: 'quick', trackId: 'oval', laps: 5, ai: 0, diff: 1, players: [{ name: 'T', cls: 1, color: '#ff0000' }],
            rules: { fuelOn: true, fuelPct: 100, tireOn: true, tirePct: 100, dmgOn: true, dmgPct: 100, pits: true } });
          R.audible = false; let I = { thr: 0, brk: 0, steer: 0, edge: {} }; Input.read = () => I;
          while (R.state !== 'running') updateRace(R, DT);
          const c = R.cars[0], bx = R.rt.pit.box, P0 = R.rt.pit.path;
          // in die Mitte der Box setzen, stehend, mit etwas Schaden
          const k = R.rt.pit.slots[0]; c.x = c.prevX = P0[k].x; c.y = c.prevY = P0[k].y; c.vx = c.vy = 0; c.damage = 30; c.fuel = 40; c.tires = 60;
          const out = {};
          for (let i = 0; i < 10; i++) updateRace(R, DT);
          out.autoFuel = c.service.cur || c.service.q[0] || null;
          let n = 0; while ((c.service.cur || c.service.q.length) && n++ < 600) updateRace(R, DT);
          out.fuelAfter = Math.round(c.fuel); out.lock = !!c.pitLock;
          // losfahren und dabei lenken/bremsen-Kanten drücken
          let served = 0;
          for (let i = 0; i < 120; i++) { I = { thr: i % 20 < 15 ? 1 : 0, brk: 0, steer: i % 2 ? 1 : -1, edge: { left: i % 6 === 0, right: i % 6 === 3, down: i % 9 === 0 } }; updateRace(R, DT); if (c.service.cur || c.service.q.length) served++; }
          out.reServed = served;
          // Verschleiß in der Gasse
          const j = P0.findIndex(q => cellAt(R.rt.src, q.x, q.y) === S.PIT); const a = Math.atan2(P0[j + 3].y - P0[j].y, P0[j + 3].x - P0[j].x); c.x = c.prevX = P0[j].x; c.y = c.prevY = P0[j].y; c.a = a; c.vx = c.vy = 0; const f0 = c.fuel, t0 = c.tires; I = { thr: 1, brk: 0, steer: 0, edge: {} };
          let onPit = 0; for (let i = 0; i < 90; i++) { updateRace(R, DT); if (c.surf === S.PIT) onPit++; }
          out.pitFrames = onPit; out.fuelLoss = +(f0 - c.fuel).toFixed(2); out.tireLoss = +(t0 - c.tires).toFixed(2);
          return out; }""")
        ok = r['pitFrames'] > 30 and r['fuelLoss'] == 0 and r['autoFuel'] == 'fuel' and r['fuelAfter'] == 100 and r['reServed'] == 0 and r['tireLoss'] < 0.3
        print('OK  ' if ok else 'FAIL', json.dumps(r)); print('Fehler:', errs[:5]); await b.close(); sys.exit(0 if ok and not errs else 1)
asyncio.run(main())
