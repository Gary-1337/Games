"""Bildschirmfotos der Cockpit-Ansicht (KI fährt das Spielerauto).
Aufruf: python3 tools/cockpit_shots.py PRÄFIX strecke:klasse[:warte_ms[:wetter[:zeit[:vorlauf_s]]]] ...
klasse = Index in CLASSES (0 blitz, 1 allround, 2 brummer, 3 rally, 4 formula, 5 kart, 6 truck, 7 muscle, 8 ev, 9 buggy),
wetter 0 klar / 1 bewölkt / 2 Regen, zeit 0 Tag / 1 Abend / 2 Nacht. Ausgabe nach $SHOTS (Standard /tmp/rallye-shots/)."""
import asyncio, sys
from playwright.async_api import async_playwright
import os; SP=os.environ.get('SHOTS', '/tmp/rallye-shots/'); os.makedirs(SP, exist_ok=True)
async def main():
    pre=sys.argv[1]
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for spec in sys.argv[2:]:
            parts=spec.split(':'); tr=parts[0]; cls=int(parts[1]); wait=int(parts[2]) if len(parts)>2 else 5000
            wx=parts[3] if len(parts)>3 else None; tm=parts[4] if len(parts)>4 else None
            pg = await b.new_page(viewport={'width':1540,'height':800})
            errs=[]; pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type in ('error','warning') else None)
            await pg.goto('file://' + os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'index.html')); await pg.wait_for_timeout(700)
            if len(parts)>5: await pg.evaluate('window.__ff='+parts[5])
            await pg.evaluate("([tr,cls,wx,tm])=>{Options.data.gfx='high';Gfx.auto=-1;resize();Options.data.camera=3; Options.data.commentary=false; const st=Options.data.setup; st.trackId=tr; st.humans=1; st.ai=7; st.weather=wx!=null?+wx:0; st.time=tm!=null?+tm:0; if(st.players&&st.players[0]) st.players[0].cls=cls; Game.startFromSetup('quick');}",[tr,cls,wx,tm])
            await pg.wait_for_timeout(1500)
            await pg.evaluate("(cls)=>{const R=Game.race, c=R.cars.find(c=>c.human>=0); c.cls=CLASSES[cls]; c.ai=makeAI(c,2); const rd=Input.read.bind(Input); Input.read=(h)=>{ if(h!==c.human) return rd(h); const r=aiControl(c,Game.race,DT)||{thr:0,brk:0,steer:0}; r.edge=r.edge||{}; return r; }; window.__cls=CLASSES.map(k=>k.id+':'+k.shape).join(' '); for(let i=0;i<120*(window.__ff||14);i++) updateRace(R, DT); }", cls)
            if spec==sys.argv[2]: print(await pg.evaluate('window.__cls'))
            await pg.wait_for_timeout(wait)
            await pg.screenshot(path=SP+pre+'_'+tr+'_'+str(cls)+'.png', clip={'x':0,'y':0,'width':1280,'height':800})
            await pg.close()
            print(spec, [e for e in errs if 'ReadPixels' not in e and 'TUNNEL' not in e][:4])
        await b.close()
asyncio.run(main())
