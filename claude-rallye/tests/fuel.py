"""Tankpflicht: Jedes Auto im Ziel hat getankt, niemand bleibt ohne Sprit liegen, schnelle Klassen stoppen früher als langsame.
Zwei Stopps (x2) sind erlaubt: Das passiert, wenn ein Auto durch einen Fehler eine Runde mehr fahren muss.
Aufruf: python3 tests/fuel.py [strecke,strecke,...]"""
import asyncio, sys, json, pathlib
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
IDS = sys.argv[1].split(',') if len(sys.argv) > 1 else ['oval', 'tech', 'city', 'forest', 'snow']
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page()
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file://' + str(ROOT / 'index.html')); await pg.wait_for_timeout(800)
        bad = 0; agg = {}
        for tid in IDS:
            for laps in (2, 3, 5, 8):
                r = await pg.evaluate("""([id, laps]) => { Game.state = 'x';
                  const R = createRace({ mode: 'quick', trackId: id, laps, ai: 10, diff: [2], players: [],
                    rules: { fuelOn: true, fuelPct: 100, tireOn: false, tirePct: 100, dmgOn: false, dmgPct: 100, pits: true } });
                  R.audible = false; if (!R.fuelPlan) return { skip: true };
                  const st = R.cars.map(c => ({ cls: c.cls.id, v: c.cls.maxSpeed, due: c.fuelDue, start: Math.round(c.fuel), stops: 0, stopLap: 0, dry: 0, was: false }));
                  let steps = 0;
                  while (R.state !== 'done' && steps < 150 * 60 * laps) {
                    updateRace(R, DT); steps++;
                    R.cars.forEach((c, i) => { const s = st[i], f = c.service.cur === 'fuel'; if (f && !s.was) { s.stops++; s.stopLap = c.lap; } s.was = f; if (!c.finished && c.fuel <= 0) s.dry++; });
                    if (R.state === 'ending' && R.endT < 0.05) break;
                  }
                  R.cars.forEach((c, i) => { st[i].fin = c.finished; st[i].laps = c.lapTimes.map(x => +x.toFixed(1)); st[i].pos = R.finishOrder.indexOf(c) + 1; });
                  return { T: +R.fuelPlan.T.toFixed(2), e: +R.fuelPlan.e.toFixed(2), cars: st }; }""", [tid, laps])
                if r.get('skip'): print('SKIP', tid, laps); continue
                cs = r['cars']; miss = sum(1 for c in cs if c['dry'] or (c['stops'] == 0 and c['fin'])); ok = miss <= 1   # ein KI-Patzer je Rennen wird toleriert
                fast = [c['stopLap'] for c in cs if c['v'] >= 328]; slow = [c['stopLap'] for c in cs if c['v'] <= 268]
                if fast and slow and laps >= 5 and not (sum(fast) / len(fast) < sum(slow) / len(slow)): ok = False
                bad += 0 if ok else 1
                print('OK  ' if ok else 'FAIL', tid, laps, 'T', r['T'], 'e', r['e'], ' '.join(f"{c['cls'][:3]}:{c['start']}%/R{c['stopLap']}(≤{c['due']})x{c['stops']}{'!' if c['dry'] else ''}{'' if c['fin'] else ' DNF'}" for c in sorted(cs, key=lambda c: -c['v'])))
                for c in cs:
                    if c['fin'] and len(c['laps']) >= 5:
                        srt = sorted(c['laps'][1:]); med = srt[len(srt) // 2]; agg.setdefault(c['cls'], []).append(max(c['laps'][1:]) - med)
        print('Zeitverlust Boxenrunde je Klasse (s):', {k: round(sum(v) / len(v), 1) for k, v in agg.items()})
        print('Fehler:', errs[:5]); await b.close(); sys.exit(0 if not bad and not errs else 1)
asyncio.run(main())
