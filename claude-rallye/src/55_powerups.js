/* =====================================================================
   10b  POWER-UPS (Arcade-Regel): Nitro-Pads, Item-Kisten, Nitro / Öl / Schild
   ===================================================================== */
const ITEMS = {
  nitro: { name: 'Nitro', ico: '⚡', col: '#38c4ff' },
  oil: { name: 'Öl', ico: '◉', col: '#c08cff' },
  shield: { name: 'Schild', ico: '◆', col: '#46d68a' }
};
const ITEM_KEYS = ['ShiftRight', 'KeyF', 'KeyH', 'Numpad0'];
const ITEM_LABELS = ['Shift rechts', 'F', 'H', 'Num 0'];
const BOOST_T = { pad: 0.9, nitro: 1.7 };

const PU = {
  /** Pads und Kisten auf der Strecke verteilen (abhängig von der Streckenform, immer gleich je Strecke). */
  setup(race) {
    const rt = race.rt, n = rt.n;
    race.pads = []; race.boxes = []; race.slicks = [];
    // Krümmung je Linienpunkt (Richtungsänderung über ±8 Punkte)
    const curv = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const a = (i - 8 + n) % n, b = (i + 8) % n;
      curv[i] = Math.abs(wrapAngle(Math.atan2(rt.ty[b], rt.tx[b]) - Math.atan2(rt.ty[a], rt.tx[a])));
    }
    const sOf = i => rt.cum[i];
    const okAt = i => !rt.lvl[i] && sOf(i) > 90 && sOf(i) < rt.L - 40 && cellAt(rt.src, rt.lx[i], rt.ly[i]) !== S.PIT &&
      !(rt.pit && inBoxRect(rt.pit.box, rt.lx[i], rt.ly[i], 20));
    const far = (list, i, min) => list.every(o => { const d = Math.abs(sOf(o.i) - sOf(i)); return Math.min(d, rt.L - d) > min; });
    // Nitro-Pads: auf den geradesten Stellen
    const order = [...Array(n).keys()].filter(okAt).sort((p, q) => curv[p] - curv[q]);
    const nPads = clamp(Math.round(rt.L / 900), 2, 3);
    for (const i of order) {
      if (race.pads.length >= nPads) break;
      if (curv[i] > 0.35 || !far(race.pads, i, rt.L / (nPads + 1))) continue;
      race.pads.push({ i, x: rt.lx[i], y: rt.ly[i], a: Math.atan2(rt.ty[i], rt.tx[i]), cool: new Map() });
    }
    // Kistenreihen: quer über die Fahrbahn, mit Abstand zu den Pads
    const nRows = clamp(Math.round(rt.L / 1100), 2, 3);
    const rows = [];
    for (let k = 0; k < nRows; k++) {
      const target = rt.L * (k + 0.5) / nRows;
      let best = -1, bd = Infinity;
      for (const i of order) {
        if (curv[i] > 0.6) continue;
        const d = Math.abs(sOf(i) - target);
        if (d < bd && far(race.pads, i, 140) && far(rows, i, 260)) { bd = d; best = i; }
      }
      if (best < 0) continue;
      rows.push({ i: best });
      const i = best, rx = -rt.ty[i], ry = rt.tx[i];
      for (const off of [-Math.min(16, rt.wl[i]), 0, Math.min(16, rt.wr[i])]) {
        const x = rt.lx[i] + rx * off, y = rt.ly[i] + ry * off;
        if (SURF[cellAt(rt.src, x, y)].oob) continue;
        race.boxes.push({ x, y, t: 0, spin: Math.random() * 6 });
      }
    }
  },

  zAt(race, x, y) { return terrainH(race.rt, x, y); },

  give(car, race) {
    const pool = ['nitro', 'nitro', 'oil', 'shield'];
    // Hinten liegende bekommen öfter Nitro
    if (car.place > race.cars.length / 2) pool.push('nitro', 'shield');
    car.item = pool[Math.floor(Math.random() * pool.length)];
    car.itemCd = car.ai ? 0.6 + Math.random() * 1.2 : 0;
    if (car.human >= 0) { flashMsg(car, ITEMS[car.item].name.toUpperCase() + ' eingesammelt', ITEMS[car.item].col); if (race.audible) Sound.beep(980, 0.08, 'triangle', 0.1); }
  },

  use(car, race) {
    const it = car.item; if (!it) return;
    car.item = null;
    if (it === 'nitro') { car.boostT = BOOST_T.nitro; if (race.audible && car.human >= 0) Sound.beep(220, 0.25, 'sawtooth', 0.08); }
    else if (it === 'shield') car.shieldT = 6;
    else if (it === 'oil') {
      const bx = car.x - Math.cos(car.a) * 16, by = car.y - Math.sin(car.a) * 16;
      race.slicks.push({ x: bx, y: by, r: 15, life: 22, owner: car.id, grace: 0.8, a: Math.random() * 3 });
      if (race.slicks.length > 12) race.slicks.shift();
      if (race.audible && car.human >= 0) Sound.beep(160, 0.15, 'square', 0.07);
    }
    if (car.human < 0 && race.audible && race.mode !== 'demo' && Math.random() < 0.3) {
      if (it === 'oil') Speaker.say(car.name + ' lässt Öl ab!', 'oil', 12);
    }
  },

  /** KI: wann ein Item benutzen. */
  aiUse(car, race, dt) {
    if (!car.item || car.finished) return;
    if (car.itemCd > 0) { car.itemCd -= dt; return; }
    const rt = race.rt, it = car.item;
    if (it === 'nitro') {
      // auf einer Geraden ohne Kurve in den nächsten ~25 Punkten
      const prof = speedProfile(rt, car.cls); let minV = Infinity;
      for (let k = 2; k < 28; k++) minV = Math.min(minV, prof[(car.idx + k) % rt.n]);
      if (minV > car.cls.maxSpeed * 0.82 && fwdSpeed(car) > 60) this.use(car, race);
    } else if (it === 'oil') {
      const behind = race.cars.some(c => c !== car && !c.finished && dist(c.x, c.y, car.x, car.y) < 70 && ((car.x - c.x) * Math.cos(car.a) + (car.y - c.y) * Math.sin(car.a)) > 10);
      if (behind) this.use(car, race);
    } else if (it === 'shield') {
      const danger = race.slicks.some(s => s.owner !== car.id && dist(s.x, s.y, car.x + car.vx * 0.5, car.y + car.vy * 0.5) < 40) ||
        race.cars.some(c => c !== car && dist(c.x, c.y, car.x, car.y) < 26);
      if (danger) this.use(car, race);
    }
  },

  update(race, dt) {
    const running = race.state === 'running' || race.state === 'ending';
    for (const b of race.boxes) if (b.t > 0) b.t -= dt;
    for (const s of race.slicks) { s.life -= dt; if (s.grace > 0) s.grace -= dt; }
    race.slicks = race.slicks.filter(s => s.life > 0);
    for (const car of race.cars) {
      if (car.boostT > 0) {
        car.boostT -= dt;
        if (!car.air && Math.random() < dt * 40) Particles.add('puff', car.x - Math.cos(car.a) * 9, car.y - Math.sin(car.a) * 9, car.z + 3, -car.vx * 0.2 + (Math.random() - 0.5) * 20, -car.vy * 0.2 + (Math.random() - 0.5) * 20, 0, 0.35, 3, '120,200,255', 0, 2);
      }
      if (car.shieldT > 0) car.shieldT -= dt;
      if (car.oilT > 0) car.oilT -= dt;
      if (!running || car.finished || car.sink > 0 || car.air || car.level === 1) continue;
      // Item benutzen
      if (car.human < 0 && car.ai) this.aiUse(car, race, dt);
      // Nitro-Pads
      for (const p of race.pads) {
        const lx = (car.x - p.x) * Math.cos(p.a) + (car.y - p.y) * Math.sin(p.a), ly = -(car.x - p.x) * Math.sin(p.a) + (car.y - p.y) * Math.cos(p.a);
        if (Math.abs(lx) < 14 && Math.abs(ly) < 13 && (p.cool.get(car.id) || 0) < race.t) {
          p.cool.set(car.id, race.t + 1.5);
          car.boostT = Math.max(car.boostT || 0, BOOST_T.pad);
          if (car.human >= 0 && race.audible) Sound.beep(660, 0.12, 'sawtooth', 0.07);
        }
      }
      // Kisten
      if (!car.item) for (const b of race.boxes) {
        if (b.t > 0 || (car.x - b.x) ** 2 + (car.y - b.y) ** 2 > 12 * 12) continue;
        b.t = 4; this.give(car, race);
        Particles.sparks(b.x, b.y, 6, this.zAt(race, b.x, b.y) + 4);
        break;
      }
      // Ölflecken
      for (const s of race.slicks) {
        if ((s.owner === car.id && s.grace > 0) || (car.x - s.x) ** 2 + (car.y - s.y) ** 2 > s.r * s.r) continue;
        if (car.shieldT > 0) continue;
        if (!(car.oilT > 0)) {
          car.av += (Math.random() < 0.5 ? -1 : 1) * (2.2 + Math.random() * 1.5);
          if (car.human >= 0) { flashMsg(car, 'ÖL!', '#c08cff'); if (race.audible) Speaker.say('Ins Öl gerutscht!', 'oilhit', 10); }
        }
        car.oilT = 0.9;
      }
    }
  },

  /** Am Boden liegende Elemente (vor den Autos zeichnen). */
  drawGround(ctx, race) {
    const t = race.time;
    for (const p of race.pads) {
      const z = this.zAt(race, p.x, p.y) + 0.5, ca = Math.cos(p.a), sa = Math.sin(p.a);
      const pt = (lx, ly) => P(p.x + ca * lx - sa * ly, p.y + sa * lx + ca * ly, z);
      ctx.fillStyle = 'rgba(10,30,60,.75)'; ctx.beginPath();
      for (const [lx, ly] of [[-14, -12], [14, -12], [14, 12], [-14, 12]]) { const q = pt(lx, ly); ctx.lineTo(q[0], q[1]); }
      ctx.closePath(); ctx.fill();
      for (let k = 0; k < 3; k++) {
        const ph = (t * 2.5 - k * 0.33) % 1, a = 0.35 + 0.65 * (1 - Math.abs(ph - 0.5) * 2);
        ctx.strokeStyle = `rgba(80,200,255,${a})`; ctx.lineWidth = 2.5; ctx.beginPath();
        const ox = -8 + k * 8;
        for (const [lx, ly] of [[ox - 4, -8], [ox + 4, 0], [ox - 4, 8]]) { const q = pt(lx, ly); ctx.lineTo(q[0], q[1]); }
        ctx.stroke();
      }
    }
    for (const s of race.slicks) {
      const z = this.zAt(race, s.x, s.y) + 0.4, [x, y] = P(s.x, s.y, z), f = Math.min(1, s.life / 3);
      ctx.save(); ctx.globalAlpha = 0.85 * f; ctx.translate(x, y); ctx.rotate(s.a);
      ctx.fillStyle = '#14101c'; ctx.beginPath(); ctx.ellipse(0, 0, s.r, s.r * 0.72, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(150,110,220,.35)'; ctx.beginPath(); ctx.ellipse(-s.r * 0.3, -s.r * 0.2, s.r * 0.35, s.r * 0.18, 0.4, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  },

  /** Kisten (stehen auf der Fahrbahn) */
  drawBoxes(ctx, race) {
    const t = race.time;
    for (const b of race.boxes) {
      if (b.t > 0) continue;
      const z = this.zAt(race, b.x, b.y) + 3 + Math.sin(t * 3 + b.spin) * 1.5;
      const [x, y] = P(b.x, b.y, z), [sx, sy] = P(b.x, b.y, z - 3);
      ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(sx, sy + 2, 6, 3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.save(); ctx.translate(x, y - 4); ctx.rotate(Math.sin(t * 2 + b.spin) * 0.3);
      ctx.fillStyle = '#ffb02e'; rr(ctx, -6, -6, 12, 12, 2); ctx.fill();
      ctx.strokeStyle = '#7a4a00'; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.fillStyle = '#3a2200'; ctx.font = '700 10px "Chakra Petch",sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('?', 0, 0.5);
      ctx.restore();
    }
  },

  /** Schild und Boost am Auto (nach dem Auto zeichnen). */
  drawCarFx(ctx, race) {
    for (const c of race.cars) {
      if (c.shieldT > 0) {
        const [x, y] = P(c.x, c.y, c.z + 5), blink = c.shieldT < 1.5 ? 0.5 + 0.5 * Math.sin(race.time * 20) : 1;
        ctx.strokeStyle = `rgba(70,214,138,${0.8 * blink})`; ctx.fillStyle = `rgba(70,214,138,${0.15 * blink})`; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(x, y, 17, 13, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
    }
  }
};
