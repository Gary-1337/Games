// Regressionstest für Die Claudler (Node + Playwright, Chromium vorinstalliert)
// Aufruf: node tests/regression.js /pfad/zu/index.html [/pfad/zu/alte-version.html]
const {chromium}=require('playwright');
(async()=>{
 const file=process.argv[2],old=process.argv[3];const b=await chromium.launch();const errs=[];const out={};
 const page=async()=>{const p=await b.newPage({viewport:{width:1400,height:860}});p.on('pageerror',e=>errs.push(e.message));return p};
 // 1) Ganze Siedlung bis Brot, viele Baustellen gleichzeitig (Bauarbeiter-Deadlock), Lagerhaus
 let p=await page();await p.goto('file://'+file);await p.waitForTimeout(300);await p.click('#iNew');
 out.chain=await p.evaluate(()=>{const G=window.__claudler;G.newGame(777);G.S.unlocked=true;const hq=G.B[0];const cx=hq.x+1,cy=hq.y+1;const fail=[];
  const put=t=>{for(let r=3;r<18;r++)for(let a=0;a<48;a++){const x=Math.round(cx+Math.cos(a/48*6.28)*r),y=Math.round(cy+Math.sin(a/48*6.28)*r);if(!G.canPlace(t,x,y)){G.place(t,x,y);return}}fail.push(t)};
  ['woodcutter','sawmill','forester','quarry','fisher','woodcutter','hut','hut','hut','well','farm','mill','bakery','lager'].forEach(put);
  for(let i=0;i<20*900;i++)G.step(.05);
  return {fail,pop:G.ST.length,made:G.S.made,sites:G.B.filter(b=>b.state==='site').map(b=>b.type),lager:G.B.find(b=>b.type==='lager')?.state}});
 // 2) Drehung, Picking, Speichern/Laden
 out.view=await p.evaluate(()=>{for(let k=0;k<8;k++)rotateView(1);return VIEW});
 out.save=await p.evaluate(()=>window.__claudler.saveGame(true));
 await p.goto('file://'+file);await p.waitForTimeout(300);await p.click('#iCont');out.loaded=await p.evaluate(()=>window.__claudler.B.length);
 await p.close();
 // 2b) Bergbau-Kette (ab 2.3.0): Vorkommen aufdecken, Minen, Schmelze, Werkstatt
 p=await page();await p.goto('file://'+file);await p.waitForTimeout(300);await p.click('#iNew');
 out.mining=await p.evaluate(()=>{const G=window.__claudler;if(!G.DEF.smelter)return 'nicht vorhanden';G.newGame(777);G.S.unlocked=true;const hq=G.B[0];const cx=hq.x+1,cy=hq.y+1;
  const put=(t,o)=>{for(let r=3;r<20;r++)for(let a=0;a<64;a++){const x=Math.round(cx+Math.cos(a/64*6.28)*r),y=Math.round(cy+Math.sin(a/64*6.28)*r);if(!G.canPlace(t,x,y,o||0))return G.place(t,x,y,o||0).b}};
  ['woodcutter','sawmill','forester','quarry','fisher','hut','hut','hut','well','farm','mill','bakery'].forEach(t=>put(t));
  for(let i=0;i<N;i++)if(ore[i]&&Math.hypot(tx(i)-cx,ty(i)-cy)<22)oreKnown[i]=1;
  const onOre=(t,type)=>{for(let i=0;i<N;i++)if(ore[i]===type&&oreKnown[i]&&!occ[i]&&!G.canPlace(t,tx(i),ty(i),0)&&autoRoad(perim(t,tx(i),ty(i),0),false)!==null)return G.place(t,tx(i),ty(i),0).b};
  onOre('coalmine',1);onOre('ironmine',2);put('smelter',1);put('workshop');
  for(let i=0;i<20*1800;i++)G.step(.05);
  return {iron:G.S.made.iron||0,tool:G.S.made.tool||0,carriers:G.ST.filter(s=>s.role==='carrier').length,sites:G.B.filter(b=>b.state==='site').length}});
 await p.close();
 // 2c) Jagd, Kleidung, Wohnstufen (ab 2.4.0)
 p=await page();await p.goto('file://'+file);await p.waitForTimeout(300);await p.click('#iNew');
 out.hunt=await p.evaluate(()=>{const G=window.__claudler;if(!G.DEF.hunter)return 'nicht vorhanden';G.newGame(777);G.S.unlocked=true;const hq=G.B[0];const cx=hq.x+1,cy=hq.y+1;
  const put=t=>{for(let r=3;r<18;r++)for(let a=0;a<48;a++){const x=Math.round(cx+Math.cos(a/48*6.28)*r),y=Math.round(cy+Math.sin(a/48*6.28)*r);if(!G.canPlace(t,x,y))return G.place(t,x,y).b}};
  ['woodcutter','sawmill','forester','quarry','fisher','woodcutter','hut','hut','hut','well','farm','mill','bakery','lager'].forEach(put);for(let i=0;i<20*400;i++)G.step(.05);
  const huntAt=()=>{let best=null,bd=1e9;for(let y=4;y<H-4;y++)for(let x=4;x<W-4;x++){const d=Math.hypot(x-cx,y-cy);if(d<8||d>20||d>=bd)continue;if(!G.canPlace('hunter',x,y,0)&&forestCount(ix(x,y),7)>=20&&autoRoad(perim('hunter',x,y,0),false)!==null){bd=d;best=[x,y]}}if(best)G.place('hunter',best[0],best[1],0)};
  huntAt();huntAt();['smokehouse','tannery','tailor'].forEach(put);for(let i=0;i<20*1500;i++)G.step(.05);
  const hut=G.B.find(b=>b.type==='hut');const o=G.B[0].out;o.clothes=(o.clothes||0)+20;o.bread=(o.bread||0)+20;o.sausage=(o.sausage||0)+20;o.plank+=30;o.stone=(o.stone||0)+30;
  for(let k=0;k<2;k++){for(let i=0;i<20*25||(upgradeBlock(hut)&&i<20*120);i++)G.step(.05);startUpgrade(hut);for(let i=0;i<20*90;i++)G.step(.05)}
  G.saveGame(true);const lvl=hut.level;G.loadGame();const h2=G.B.find(b=>b.id===hut.id);
  return {meat:G.S.made.meat||0,hide:G.S.made.hide||0,sausage:G.S.made.sausage||0,leather:G.S.made.leather||0,clothes:G.S.made.clothes||0,hutLevel:lvl,afterLoad:h2&&h2.level,lvl3:G.ST.filter(s=>s.lvl===3).length}});
 await p.close();
 // 2d) Ausbaustufen + Ausrichtung (ab 2.5.0)
 p=await page();await p.goto('file://'+file);await p.waitForTimeout(300);await p.click('#iNew');
 out.upgrade=await p.evaluate(()=>{const G=window.__claudler;if(typeof UPS==='undefined')return 'nicht vorhanden';G.newGame(777);G.S.unlocked=true;const hq=G.B[0];const cx=hq.x+1,cy=hq.y+1;
  const put=(t,oo)=>{for(let r=3;r<20;r++)for(let a=0;a<64;a++){const x=Math.round(cx+Math.cos(a/64*6.28)*r),y=Math.round(cy+Math.sin(a/64*6.28)*r);for(const o of (oo!=null?[oo]:[0,1,2,3]))if(!G.canPlace(t,x,y,o))return G.place(t,x,y,o).b}};
  const bs={};for(const t of ['woodcutter','sawmill','forester','quarry','fisher','hut','hut','hut','hut','well','farm','mill','bakery','woodcutter'])bs[t]=bs[t]||put(t);
  for(let i=0;i<20*600;i++)G.step(.05);
  const o=hq.out;o.plank+=60;o.stone=(o.stone||0)+60;o.tool=(o.tool||0)+12;while(G.ST.length<24)newSettler(hq.door);
  const res={};const before={};for(const t of ['fisher','woodcutter','sawmill','farm','mill']){const b=bs[t];before[t]=JSON.stringify(b.inp);res[t]={block:prodUpBlock(b)}}
  // Sägewerk: Eingang vor dem Ausbau merken
  const saw=bs.sawmill;saw.inp.log=Math.max(saw.inp.log||0,2);const sawLog=saw.inp.log;
  for(const t of ['fisher','woodcutter','sawmill','farm','mill'])startProdUpgrade(bs[t]);
  const midUpgInp=JSON.stringify(bs.fisher.upg&&bs.fisher.upg.inp);const sawKept=(saw.inp.log||0)>=0;
  for(let i=0;i<20*400;i++)G.step(.05);
  for(const t in res){const b=bs[t];res[t].level=b.level;res[t].upg=!!b.upg;res[t].spr=bSpr(b)===sprOf(t+'2',b.o)}
  // Produktionsrate Fischer St. 2 vs. Holzfäller
  const m0=Object.assign({},G.S.made);for(let i=0;i<20*300;i++)G.step(.05);
  // Ausrichtung speichern/laden
  const fo=bs.fisher.o,fid=bs.fisher.id;G.saveGame(true);G.loadGame();const f2=G.B.find(b=>b.id===fid);
  return {res,midUpgInp,sawLog,fishAfter:(G.S.made.fish||0)-(m0.fish||0),fisherO:fo,fisherOAfter:f2&&f2.o,fisherLvAfter:f2&&f2.level,sites:G.B.filter(b=>b.state==='site'||b.upg).map(b=>b.type)}});
 await p.close();
 // 2e) Menü, Speicherplätze, Abriss-Rückgabe, Statistik, Ausbau-Hinweis (ab 2.6.0)
 p=await page();await p.goto('file://'+file);await p.waitForTimeout(300);await p.click('#iNew');
 out.v26=await p.evaluate(()=>{const G=window.__claudler;if(typeof SLOTS==='undefined')return 'nicht vorhanden';G.newGame(777);G.S.unlocked=true;const hq=G.B[0];const cx=hq.x+1,cy=hq.y+1;
  const put=t=>{for(let r=3;r<20;r++)for(let a=0;a<64;a++){const x=Math.round(cx+Math.cos(a/64*6.28)*r),y=Math.round(cy+Math.sin(a/64*6.28)*r);for(const o of [0,1,2,3])if(!G.canPlace(t,x,y,o))return G.place(t,x,y,o).b}};
  ['woodcutter','sawmill','quarry','fisher','hut','hut'].forEach(put);for(let i=0;i<20*300;i++)G.step(.05);
  const saw=G.B.find(b=>b.type==='sawmill');saw.inp={log:2};saw.out={plank:1};const p0=stock('plank'),l0=stock('log');removeBuilding(saw,'demolish');recomp();
  const refund={plank:stock('plank')-p0,log:stock('log')-l0,expectPlank:DEF.sawmill.cost.plank+1};
  while(G.ST.length<20)newSettler(hq.door);hq.out.tool=(hq.out.tool||0)+5;const f=G.B.find(b=>b.type==='fisher');const canUp=canUpNow(f);
  G.saveGame(true,'claudler-save-3');const t3=G.S.t;for(let i=0;i<20*30;i++)G.step(.05);G.loadGame('claudler-save-3');
  return {refund,canUp,slotOk:Math.abs(G.S.t-t3)<1,meta:!!slotMeta('claudler-save-3'),stat:(G.S.stat&&G.S.stat.hist.length)||0}});
 await p.close();
 // 3) Alten Spielstand laden
 if(old){p=await page();await p.goto('file://'+old);await p.waitForTimeout(300);await p.click('#iNew');await p.evaluate(()=>{for(let i=0;i<400;i++)window.__claudler.step(.05);window.__claudler.saveGame(true)});
  await p.goto('file://'+file);await p.waitForTimeout(300);await p.click('#iCont');out.oldLoad=await p.evaluate(()=>({W,H,b:window.__claudler.B.length}));await p.close()}
 console.log(JSON.stringify(out,null,1));console.log(errs.length?'FEHLER: '+errs.join(' | '):'Keine Skriptfehler');await b.close()})();
