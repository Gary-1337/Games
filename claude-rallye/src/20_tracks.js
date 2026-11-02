/* =====================================================================
   5  BEISPIELSTRECKEN (prozedural aus Kontrollpunkten erzeugt)
   Alle Kurse werden im Uhrzeigersinn gefahren; ctrl = Mittellinie.
   hills: [x, y, Radius, Höhe] · ramps: [x, y, seitlicher Versatz −1…1]
   bridge: Kreuzung mit Brücke (die erste Durchfahrt ab Start führt oben drüber)
   Wasser auf der Mittellinie wird automatisch überbrückt.
   ===================================================================== */
const TRACK_DEFS = [
  {
    id: 'oval', name: 'Speedway Rundling', theme: 'meadow', base: S.GRASS, seed: 11, width: 92, oil: 2,
    ctrl: [[640, 630], [300, 630], [160, 560], [118, 400], [160, 240], [300, 170], [980, 170], [1120, 240], [1162, 400], [1120, 560], [980, 630]],
    start: [700, 630],
    pit: [[1010, 602], [950, 562], [880, 556], [400, 556], [330, 562], [270, 602]],
    rails: [{ side: -1, off: 16 }], trees: 34, fences: true, bushes: 30, rocks: 4, lamps: true,
    hills: [[-40, 60, 260, 46], [1320, 760, 280, 44], [1300, 40, 200, 30], [-20, 780, 200, 30], [640, 160, 110, 20], [180, 400, 120, 14], [1100, 400, 120, 14]],
    pre(t) { paintDisc(t, 640, 400, 70, S.WATER); }
  },
  {
    id: 'city', name: 'Hafenviertel', theme: 'city', base: S.GRASS, seed: 23, width: 70, oil: 2,
    ctrl: [[200, 420], [200, 300], [200, 210], [250, 150], [410, 150], [460, 195], [470, 270], [520, 312], [700, 312], [752, 270], [770, 190], [820, 150], [1060, 150],
      [1110, 195], [1120, 370], [1080, 422], [920, 430], [880, 470], [880, 600], [840, 660], [270, 670], [200, 630], [200, 540]],
    start: [200, 420],
    pit: [[206, 590], [244, 556], [257, 520], [257, 330], [244, 290], [206, 256]],
    rails: [{ side: -1, off: 10 }, { side: 1, off: 10 }], houses: 30, trees: 16, bushes: 22, rocks: 0, lamps: true,
    hills: [[1010, 560, 170, 26], [340, 360, 120, 16], [960, 150, 90, 14], [560, 650, 100, 12]],
    pre(t) {
      for (let x = 0; x < W; x += 4) paintDisc(t, x, 10 + 18 * Math.sin(x / 90), 46, S.WATER);
      paintDisc(t, 1230, 760, 120, S.WATER);
      for (let y = 0; y < H; y += 4) paintDisc(t, 640 + 8 * Math.sin(y / 70), y, 26, S.WATER);      // Kanal
    }
  },
  {
    id: 'desert', name: 'Dünenring', theme: 'desert', base: S.SAND, seed: 37, width: 76, shortcuts: [{ a: [560, 260], b: [940, 330], via: [[700, 330], [840, 360]] }],
    ctrl: [[600, 670], [400, 670], [250, 640], [150, 500], [190, 320], [340, 200], [540, 240], [630, 390], [770, 460], [920, 380], [970, 220],
      [1130, 170], [1190, 400], [1090, 610], [870, 670]],
    start: [640, 670],
    pit: [[890, 688], [840, 718], [440, 718], [380, 690]],
    tiresAtCorners: true, trees: 36, runoff: S.GRAVEL, bushes: 14, rocks: 34,
    hills: [[640, 90, 190, 44], [1060, 300, 120, 40], [300, 420, 120, 30], [560, 330, 110, 34], [1240, 700, 160, 36], [500, 670, 80, 16], [1100, 600, 90, 18]],
    ramps: [[172, 420, -0.45], [1152, 505, 0.45]],
    pre(t) { paintDisc(t, 400, 440, 62, S.WATER); paintDisc(t, 470, 480, 34, S.WATER); }
  },
  {
    id: 'snow', name: 'Gletscherpass', theme: 'snow', base: S.SNOW, seed: 41, width: 76,
    ctrl: [[640, 690], [340, 690], [180, 610], [160, 420], [240, 220], [430, 140], [600, 220], [600, 380], [720, 500], [880, 450], [940, 260],
      [1100, 170], [1190, 330], [1170, 590], [1020, 690], [900, 690]],
    start: [760, 690],
    pit: [[980, 676], [920, 644], [880, 641], [500, 641], [450, 646], [400, 676]],
    rails: [{ side: -1, off: 14, from: 0.55, to: 0.85 }], trees: 52, tiresAtCorners: true, bushes: 10, rocks: 26, fences: true,
    hills: [[620, 120, 230, 64], [1150, 160, 170, 50], [220, 260, 160, 40], [900, 560, 110, 24], [600, 300, 90, 22], [1180, 450, 90, 18]],
    pre(t) { paintDisc(t, 790, 190, 72, S.ICE); paintDisc(t, 860, 230, 46, S.ICE); },
    post(t) { paintDisc(t, 1186, 352, 60, S.ICE, new Set([S.ASPHALT, S.CURB])); paintDisc(t, 236, 236, 52, S.ICE, new Set([S.ASPHALT, S.CURB])); }
  },
  {
    id: 'tech', name: 'Haarnadel-Arena', theme: 'meadow', base: S.GRASS, seed: 53, width: 62, oil: 1,
    ctrl: [[1060, 700], [880, 700], [700, 700], [520, 700], [250, 690], [130, 580], [170, 450], [330, 420], [370, 310], [230, 250], [210, 130],
      [400, 100], [560, 180], [600, 360], [700, 420], [760, 300], [820, 160], [1000, 120], [1160, 180], [1170, 320], [1030, 380], [1010, 480],
      [1160, 560], [1140, 680]],
    start: [880, 700],
    pit: [[1110, 707], [1060, 740], [880, 744], [820, 726], [782, 690]],
    tiresAtCorners: true, trees: 40, runoff: S.GRAVEL, fences: true, bushes: 30, rocks: 6,
    hills: [[650, 470, 120, 30], [300, 110, 140, 34], [1090, 250, 110, 26], [880, 140, 80, 14], [180, 540, 90, 16]],
    ramps: [[390, 696, 0.45]]
  },
  {
    id: 'eight', name: 'Achterbahn', theme: 'meadow', base: S.GRASS, seed: 61, width: 70,
    ctrl: [[380, 660], [520, 520], [760, 280], [900, 150], [1100, 140], [1185, 230], [1185, 320], [1185, 440], [1185, 560], [1185, 600], [1100, 670], [900, 650], [760, 520], [520, 280], [380, 150],
      [200, 170], [100, 320], [100, 480], [200, 630]],
    start: [1185, 450], bridge: true, bridgeZ: 34,
    pit: [[1192, 270], [1228, 320], [1234, 400], [1228, 480], [1192, 530]],
    trees: 44, bushes: 26, rocks: 8, fences: true, lamps: true, tiresAtCorners: true,
    hills: [[640, 40, 180, 34], [640, 790, 200, 30], [380, 400, 90, 16], [900, 400, 90, 16], [100, 400, 80, 14]]
  },
  {
    id: 'forest', name: 'Waldrallye', theme: 'meadow', base: S.GRASS, seed: 71, width: 58, road: S.DIRT,
    ctrl: [[200, 700], [130, 630], [130, 560], [130, 420], [130, 300], [130, 250], [200, 110], [380, 90], [470, 200], [420, 330], [520, 430], [680, 380], [760, 230], [700, 110],
      [860, 70], [1060, 90], [1180, 200], [1150, 340], [1000, 380], [960, 500], [1100, 600], [1160, 720], [980, 740], [780, 700], [620, 620], [460, 700], [320, 740]],
    start: [130, 400],
    pit: [[128, 610], [172, 566], [190, 480], [186, 420], [158, 372]],
    trees: 120, treeGap: 12, bushes: 50, rocks: 22, noCurbs: true,
    hills: [[300, 250, 230, 54], [900, 560, 250, 60], [1010, 140, 170, 44], [600, 720, 140, 30], [140, 320, 70, 16], [700, 380, 80, 18]],
    ramps: [[1070, 732, -0.4]]
  },
  {
    id: 'harbor', name: 'Containerhafen', theme: 'city', base: S.CONCRETE, seed: 83, width: 70, oil: 3,
    ctrl: [[160, 570], [160, 520], [160, 420], [160, 300], [160, 240], [230, 150], [400, 130], [600, 160], [640, 260], [760, 300], [1000, 240], [1150, 280], [1180, 430], [1100, 540], [880, 520],
      [640, 520], [400, 555], [225, 605]],
    start: [160, 400],
    pit: [[152, 566], [202, 510], [208, 420], [204, 340], [164, 284]],
    rails: [{ side: -1, off: 10 }], containers: 34, lamps: true, trees: 0, bushes: 0, rocks: 0, noCurbs: false, tiresAtCorners: true,
    hills: [[400, 130, 120, 18], [1000, 240, 110, 16], [880, 520, 90, 12]],
    pre(t) {
      for (let x = 0; x < W; x += 4) paintDisc(t, x, 720 + 10 * Math.sin(x / 60), 70, S.WATER);
      for (let y = 380; y < H; y += 4) paintDisc(t, 640, y, 80, S.WATER);
    }
  },
  {
    id: 'icelake', name: 'Eissee', theme: 'snow', base: S.SNOW, seed: 97, width: 76,
    ctrl: [[640, 700], [300, 690], [150, 580], [140, 380], [250, 200], [480, 140], [640, 330], [800, 140], [1030, 200], [1140, 380], [1130, 580], [980, 690]],
    start: [700, 700],
    pit: [[900, 712], [840, 744], [480, 744], [420, 712]],
    trees: 46, rocks: 30, bushes: 8, fences: true, tiresAtCorners: true,
    hills: [[0, 0, 260, 56], [1280, 0, 260, 56], [640, 800, 180, 26], [145, 480, 90, 18], [1135, 480, 90, 18], [640, 330, 70, 14]],
    pre(t) {
      for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
        const px = x * CELL + 2, py = y * CELL + 2, e = ((px - 640) / 400) ** 2 + ((py - 430) / 190) ** 2;
        if (e < 1 + (vnoise(px, py, 40) - 0.5) * 0.25) t.grid[y * GW + x] = S.ICE;
      }
    },
    post(t) {
      // Fahrbahn über den See: vereiste Flecken, Schneewälle am Rand bleiben sichtbar
      const road = new Set([S.ASPHALT, S.CURB]);
      for (const [x, y, r] of [[560, 250, 30], [610, 300, 26], [680, 310, 30], [730, 250, 28], [470, 696, 44], [1140, 470, 40]]) paintDisc(t, x, y, r, S.ICE, road);
    }
  },
  {
    id: 'kart', name: 'Kartbahn', theme: 'city', base: S.GRASS, seed: 101, width: 48, oil: 1,
    ctrl: [[640, 720], [300, 720], [160, 660], [140, 540], [260, 480], [480, 500], [560, 420], [480, 340], [260, 360], [140, 280], [170, 140], [330, 90],
      [520, 110], [640, 200], [760, 110], [950, 90], [1110, 140], [1140, 280], [1000, 340], [800, 330], [720, 420], [800, 500], [1020, 480], [1140, 560],
      [1120, 680], [960, 730]],
    start: [700, 722],
    pit: [[900, 744], [850, 766], [460, 766], [400, 744]],
    tiresAtCorners: true, tireWall: true, trees: 12, bushes: 30, rocks: 0, fences: true, lamps: true,
    hills: [[640, 420, 160, 16], [330, 110, 110, 14], [1040, 110, 110, 14], [160, 600, 100, 10], [1130, 620, 100, 12]]
  },
  {
    id: 'volcano', name: 'Vulkanring', theme: 'desert', look: 'volcano', base: S.ASH, seed: 113, width: 72, oil: 1,
    ctrl: [[640, 700], [340, 700], [170, 610], [130, 440], [210, 270], [380, 150], [600, 120], [820, 160], [1000, 110], [1130, 170], [1165, 240], [1165, 310], [1165, 380], [1110, 500], [1120, 630], [930, 700]],
    start: [700, 700],
    pit: [[990, 686], [930, 654], [890, 651], [500, 651], [450, 656], [400, 686]],
    tiresAtCorners: true, runoff: S.GRAVEL, trees: 0, bushes: 4, rocks: 46,
    hills: [[640, 410, 250, 70], [1280, 0, 250, 40], [0, 800, 220, 30], [880, 140, 90, 16]],
    pre(t) {
      paintDisc(t, 640, 410, 64, S.LAVA);                                   // Krater
      for (const [x, y, r] of [[330, 430, 34], [830, 330, 30], [470, 300, 22]]) paintDisc(t, x, y, r, S.LAVA);
      const river = splineOpen([[1290, 300], [1230, 306], [1165, 310], [1100, 316], [1040, 330], [990, 360]].map(([x, y]) => ({ x, y })), 4);
      paintAlong(t, river, 20, S.LAVA, false); paintDisc(t, 975, 370, 34, S.LAVA);   // Lavafluss quer zur rechten Geraden (wird überbrückt), endet in einem Lavasee
      for (let x = 0; x < W; x += 6) paintDisc(t, x, 4, 20, S.LAVA);
    }
  },
  {
    id: 'beach', name: 'Strandpromenade', theme: 'desert', look: 'beach', base: S.SAND, seed: 127, width: 72, oil: 1,
    ctrl: [[640, 570], [380, 570], [220, 555], [130, 440], [170, 280], [320, 170], [520, 200], [640, 300], [760, 200], [960, 150], [1130, 220], [1170, 380], [1090, 520], [880, 570]],
    start: [700, 570],
    pit: [[930, 556], [870, 524], [830, 521], [450, 521], [400, 526], [340, 556]],
    rails: [{ side: 1, off: 12, from: 0, to: 0.12 }], trees: 34, bushes: 12, rocks: 8, lamps: true, tiresAtCorners: true,
    hills: [[640, 120, 200, 22], [1200, 60, 200, 28], [380, 330, 100, 10]],
    pre(t) {
      for (let x = 0; x < W; x += 4) paintDisc(t, x, 740 + 16 * Math.sin(x / 80) + 8 * Math.sin(x / 23), 70, S.WATER);   // Meer
      paintDisc(t, 330, 380, 52, S.WATER);                                              // Lagune
      const ch = splineOpen([[330, 400], [300, 480], [270, 560], [250, 680], [240, 800]].map(([x, y]) => ({ x, y })), 4);
      paintAlong(t, ch, 18, S.WATER, false);                                            // Kanal zum Meer (Steg)
      paintDisc(t, 1000, 380, 40, S.WATER);
    }
  },
  {
    id: 'mountain', name: 'Bergstadt', theme: 'city', look: 'alpine', base: S.GRASS, seed: 139, width: 62, oil: 1,
    ctrl: [[380, 670], [520, 520], [760, 280], [900, 150], [1100, 140], [1185, 230], [1185, 320], [1185, 440], [1185, 560], [1185, 600], [1100, 670], [900, 650], [760, 520], [520, 290],
      [400, 175], [150, 160], [110, 225], [170, 290], [360, 305], [400, 365], [350, 425], [150, 435], [110, 500], [170, 565], [300, 600]],
    start: [1185, 450], bridge: true, bridgeZ: 36,
    pit: [[1192, 270], [1228, 320], [1234, 400], [1228, 480], [1192, 530]],
    rails: [{ side: -1, off: 10, from: 0.55, to: 1 }, { side: 1, off: 10, from: 0.55, to: 1 }], houses: 30, trees: 26, bushes: 18, rocks: 6, lamps: true, fences: false, tiresAtCorners: true,
    hills: [[180, 160, 300, 70], [640, 40, 160, 24], [1000, 780, 160, 20]]
  },
  {
    id: 'quarry', name: 'Steinbruch', theme: 'desert', look: 'quarry', base: S.GRAVEL, seed: 151, width: 66, road: S.DIRT, rampZ: 18, shortcuts: [{ a: [880, 255], b: [1160, 560], via: [[1000, 420]] }],
    ctrl: [[640, 690], [380, 700], [200, 640], [140, 500], [230, 380], [420, 360], [520, 260], [420, 150], [600, 90], [820, 130], [880, 260], [1020, 300], [1160, 220], [1200, 400], [1120, 560], [960, 640]],
    start: [700, 690],
    pit: [[990, 676], [930, 644], [890, 641], [500, 641], [450, 646], [400, 676]],
    noCurbs: true, trees: 6, bushes: 10, rocks: 52, tiresAtCorners: true,
    hills: [[640, 30, 240, 60], [1280, 800, 260, 50], [0, 280, 200, 46], [900, 440, 120, 26], [330, 520, 90, 18]],
    ramps: [[325, 368, 0], [710, 108, 0], [1190, 300, 0], [300, 680, 0.4]],
    pre(t) {
      paintDisc(t, 680, 460, 82, S.WATER); paintDisc(t, 760, 500, 50, S.WATER);         // Baggersee
      for (const [x, y, r] of [[300, 200, 60], [1050, 450, 55], [520, 560, 46]]) paintDisc(t, x, y, r, S.SAND);   // Kiesgruben
    }
  }
];

/** Natürliches Gelände: Hügel (Gauß) + leichtes Rauschen. */
function naturalTerrain(t, def) {
  const hm = t.hm;
  for (let gy = 0; gy < HMH; gy++) for (let gx = 0; gx < HMW; gx++) {
    const x = gx * HM, y = gy * HM;
    let h = 0;
    for (const [hx, hy, r, hh] of def.hills || []) h += hh * Math.exp(-((x - hx) ** 2 + (y - hy) ** 2) / (r * r));
    if (def.hills && def.hills.length) h += (vnoise(x, y, 60) - 0.5) * 6;
    hm[gy * HMW + gx] = Math.max(0, h);
  }
}
/** Findet Kreuzungen der Mittellinie und Wasserstellen → Brücken. */
function findBridges(t, def, center, tg, hw, preWater) {
  const n = center.length, out = [];
  if (def.bridge) {
    for (let i = 0; i < n; i += 2) for (let j = i + 60; j < n; j += 2) {
      if (n - j + i < 60) continue;
      const a = center[i], b = center[(i + 2) % n], c = center[j], d = center[(j + 2) % n];
      if (!segIntersect(a.x, a.y, b.x, b.y, c.x, c.y, d.x, d.y)) continue;
      if (out.some(o => dist(o.x, o.y, a.x, a.y) < 60)) continue;
      const over = i, under = j, Z = def.bridgeZ || 34;
      const len = hw * 2 + 44, wid = hw * 2 + 10;
      out.push({ t: 'bridge', x: (a.x + c.x) / 2, y: (a.y + c.y) / 2, a: Math.atan2(tg[over].y, tg[over].x), w: len, h: wid, z: Z, over, under, kind: 'cross' });
    }
  }
  // Wasser auf der Mittellinie
  let i = 0;
  while (i < n) {
    if (!preWater[i] || (i === 0 && preWater[n - 1])) { i++; continue; }
    let j = i; while (j < n && preWater[j]) j++;
    const a0 = center[Math.max(0, i - 4)], b0 = center[Math.min(n - 1, j + 3)];
    const len = dist(a0.x, a0.y, b0.x, b0.y) + 12;
    out.push({ t: 'bridge', x: (a0.x + b0.x) / 2, y: (a0.y + b0.y) / 2, a: Math.atan2(b0.y - a0.y, b0.x - a0.x), w: len, h: hw * 2 + 10, z: 10, over: (i + j) >> 1, overHalf: (j - i) / 2 + 6, kind: 'water' });
    i = j + 1;
  }
  return out;
}
/** Höhenprofil der Fahrbahn: Brücken als feste Punkte, dann gemeinsames Glätten. */
function roadHeights(t, center, hw, bridges, pitPath) {
  const n = center.length, pin = new Float32Array(n).fill(NaN), steep = new Uint8Array(n);
  const idxDist = (i, j) => { const d = Math.abs(i - j); return Math.min(d, n - d); };
  for (const b of bridges) {
    const half = b.kind === 'cross' ? Math.ceil(b.w / 2 / 4) + 2 : Math.ceil(b.overHalf);
    for (let i = 0; i < n; i++) {
      if (idxDist(i, b.over) <= half) pin[i] = b.z;
      if (b.kind === 'cross' && idxDist(i, b.under) <= Math.ceil(b.h / 2 / 4) + 14) { pin[i] = 0; steep[i] = 1; }
    }
  }
  const hc = applyRoadProfile(t, center, hw, pin, steep, pitPath, bridges.filter(b => b.kind === 'cross'));
  for (const b of bridges) if (b.kind === 'water') b.z = Math.max(b.z, hc[b.over]);
  return hc;
}
/**
 * Gemeinsamer Kern: Längsprofil glätten (Diffusion mit festen Punkten), Steigung auf 1:5 begrenzen,
 * dann den Fahrbahnkorridor in die Höhenkarte schreiben (seitlich weich auslaufend).
 */
function applyRoadProfile(t, center, hw, pin, steep, pitPath, under) {
  const n = center.length;
  let hc = new Float32Array(n);
  for (let i = 0; i < n; i++) hc[i] = isNaN(pin[i]) ? terrainH(t, center[i].x, center[i].y) : pin[i];
  let tmp = new Float32Array(n);
  for (let it = 0; it < 28; it++) {
    for (let i = 0; i < n; i++) {
      let s = 0; for (let k = -6; k <= 6; k++) s += hc[(i + k + n) % n];
      tmp[i] = isNaN(pin[i]) ? s / 13 : pin[i];
    }
    [hc, tmp] = [tmp, hc];
  }
  const m = 0.2 * dist(center[0].x, center[0].y, center[1].x, center[1].y);
  for (let pass = 0; pass < 3; pass++) {
    for (let i = 1; i < n * 2; i++) { const a = i % n, b = (i - 1) % n; if (hc[a] < hc[b] - m) hc[a] = hc[b] - m; }
    for (let i = n * 2 - 2; i >= 0; i--) { const a = i % n, b = (i + 1) % n; if (hc[a] < hc[b] - m) hc[a] = hc[b] - m; }
  }
  for (let i = 0; i < n; i++) if (steep[i]) hc[i] = pin[i];
  const pts = center.map((p, i) => ({ x: p.x, y: p.y, h: hc[i], core: (typeof hw === 'number' ? hw : hw[i]) + 4, F: steep[i] ? 6 : 38, deck: !isNaN(pin[i]) && !steep[i] && pin[i] > 0 }));
  // Unter Brücken mit Unterführung darf die Deckhöhe der oberen Fahrbahn nicht in den Boden geschrieben werden
  const underOf = (x, y) => under && under.some(b => { const [lx, ly] = localOf(b, x, y); return Math.abs(lx) <= b.w / 2 + 2 && Math.abs(ly) <= b.h / 2 + 2; });
  if (pitPath) for (const p of pitPath) { const i = nearestIndex(center, p.x, p.y); pts.push({ x: p.x, y: p.y, h: hc[i], core: 22, F: 30 }); }
  const hm = t.hm, nat = hm.slice();
  for (let gy = 0; gy < HMH; gy++) for (let gx = 0; gx < HMW; gx++) {
    const x = gx * HM, y = gy * HM;
    let best = null, bd = Infinity;
    const skipDeck = underOf(x, y);
    for (const p of pts) { if (skipDeck && p.deck) continue; const d = (p.x - x) ** 2 + (p.y - y) ** 2; if (d < bd) { bd = d; best = p; } }
    const d = Math.sqrt(bd), v = gy * HMW + gx, nv = nat[v];
    if (d <= best.core) hm[v] = best.h;
    else if (d < best.core + best.F) { const u = (d - best.core) / best.F; hm[v] = lerp(best.h, nv, u * u * (3 - 2 * u)); }
    else hm[v] = nv;
  }
  // Wasser liegt auf Höhe 0
  for (let gy = 0; gy < HMH; gy++) for (let gx = 0; gx < HMW; gx++) {
    let wet = false;
    for (const [dx, dy] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) if (cellAt(t, gx * HM + dx, gy * HM + dy) === S.WATER) wet = true;
    if (wet) hm[gy * HMW + gx] = 0;
  }
  return hc;
}
/** Editor: Fahrbahn entlang der KI-Linie glätten; Brücken werden dabei angefahren (Rampen) bzw. unterquert. */
function profileFromAiLine(t, hw) {
  if (!t.hm) t.hm = newHeights();
  const center = resample(t.aiLine, 4, true), n = center.length;
  const pin = new Float32Array(n).fill(NaN), steep = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const b = bridgeIn(t.objects, center[i].x, center[i].y, 6); if (!b) continue;
    const tg = tangentAt(center, i, true);
    if (Math.abs(tg.x * Math.cos(b.a) + tg.y * Math.sin(b.a)) > 0.6) pin[i] = b.z;
    else { pin[i] = 0; steep[i] = 1; }
  }
  // Unterführung: etwas Abstand mit Höhe 0 vor und nach der Brücke
  const st = steep.slice();
  for (let i = 0; i < n; i++) if (st[i]) for (let k = -12; k <= 12; k++) { const j = (i + k + n) % n; if (isNaN(pin[j]) || steep[j]) { pin[j] = 0; steep[j] = 1; } }
  const under = t.objects.filter(o => o.t === 'bridge' && center.some((p, i) => steep[i] && bridgeIn([o], p.x, p.y, 6)));
  applyRoadProfile(t, center, hw, pin, steep, null, under);
}
/** Erzeugt eine Beispielstrecke aus ihrer Definition. */
function generateTrack(def) {
  const t = newTrack(def.base);
  t.id = def.id; t.name = def.name; t.theme = def.theme; t.custom = false; if (def.look) t.look = def.look;
  const rng = mulberry32(def.seed);
  naturalTerrain(t, def);
  if (def.pre) def.pre(t, rng);
  let center = splineClosed(def.ctrl.map(([x, y]) => ({ x, y })), 4);
  { const i0 = nearestIndex(center, def.start[0], def.start[1]); center = center.slice(i0).concat(center.slice(0, i0)); }
  const n = center.length, hw = def.width / 2, road = def.road != null ? def.road : S.ASPHALT;
  const tg = center.map((_, i) => tangentAt(center, i, true));
  const nrm = tg.map(v => ({ x: -v.y, y: v.x }));      // rechte Seite in Fahrtrichtung
  const curv = new Float32Array(n), K = 5;
  for (let i = 0; i < n; i++) {
    const a = tg[(i - K + n) % n], b = tg[(i + K) % n];
    curv[i] = Math.atan2(a.x * b.y - a.y * b.x, a.x * b.x + a.y * b.y) / (2 * K * 4);
  }
  // Punkt-zu-Punkt-Abschnitte: Der Rückweg der (geschlossenen) Linie verläuft außerhalb der Karte und zählt nicht als Wasser
  const inWorld = p => p.x >= 0 && p.y >= 0 && p.x <= W && p.y <= H;
  const preWater = center.map(p => (!def.p2p || inWorld(p)) && !!SURF[cellAt(t, p.x, p.y)].oob);
  const bridges = findBridges(t, def, center, tg, hw, preWater);
  const onBridge = (x, y, m) => bridges.some(b => { const [lx, ly] = localOf(b, x, y); return Math.abs(lx) <= b.w / 2 + m && Math.abs(ly) <= b.h / 2 + m; });
  const baseOnly = new Set([def.base]);
  // Auslaufzonen (Kiesbetten) an der Kurvenaußenseite
  if (def.runoff != null) {
    for (let i = 0; i < n; i += 2) if (Math.abs(curv[i]) > 0.0075) {
      const side = curv[i] > 0 ? -1 : 1;
      paintDisc(t, center[i].x + nrm[i].x * side * (hw + 24), center[i].y + nrm[i].y * side * (hw + 24), 28, def.runoff, baseOnly);
    }
  }
  // Curbs an beiden Rändern in Kurven
  if (!def.noCurbs) {
    const curbOnly = new Set([def.base, def.runoff == null ? def.base : def.runoff]);
    for (let i = 0; i < n; i++) if (Math.abs(curv[i]) > 0.006 && !preWater[i]) {
      for (const s of [-1, 1]) paintDisc(t, center[i].x + nrm[i].x * s * (hw + 1), center[i].y + nrm[i].y * s * (hw + 1), 7, S.CURB, curbOnly);
    }
  }
  // --- Start-Ziel-Bereich: Länge der Geraden um den Start, breitere Fahrbahn ---
  const ix = k => ((k % n) + n) % n;
  const angTo0 = k => Math.abs(Math.atan2(tg[ix(k)].x * tg[0].y - tg[ix(k)].y * tg[0].x, tg[ix(k)].x * tg[0].x + tg[ix(k)].y * tg[0].y));
  let iA = 0, iB = 0;
  while (iA > -110 && angTo0(iA - 1) < 0.1) iA--;
  while (iB < 100 && angTo0(iB + 1) < 0.1) iB++;
  const hwS = Math.min(hw * 1.35, hw + 22);
  const e0 = Math.max(iA, -100), x1 = Math.min(iB, 92);                 // Boxengasse von e0 (Einfahrt) bis x1 (Ausfahrt)
  const sm = u => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); };
  const hwAt = new Float32Array(n).fill(hw);
  for (let k = e0 - 28; k <= x1 + 28; k++) { const w = sm((k - (e0 - 28)) / 28) * sm(((x1 + 28) - k) / 28); hwAt[ix(k)] = hw + (hwS - hw) * w; }
  t.startInfo = { iA, iB, hwS };
  // Fahrbahn (über Wasser bleibt Wasser – dort liegt eine Brücke)
  for (let i = 0; i < n; i++) {
    if (preWater[i] || preWater[(i + 1) % n]) continue;
    paintAlong(t, [center[i], center[(i + 1) % n]], hwAt[i], road, false, null, new Set([S.WATER]));
  }
  // --- Boxengasse: parallel zur Startgeraden, Seite aus der Streckendefinition ---
  let pitPath = null, pitSide = 0, pitOff = 0;
  if (def.pit) {
    pitOff = hwS + 26;
    // Seite automatisch: Boxengasse und Gebäude müssen in die Karte passen, kein Wasser/Lava, keine andere Fahrbahn
    const score = sd => {
      let bad = 0;
      for (let k = e0; k <= x1; k += 3) {
        const i = ix(k);
        for (const o of [pitOff, pitOff + 18, pitOff + 44]) {
          const x = center[i].x + nrm[i].x * sd * o, y = center[i].y + nrm[i].y * sd * o;
          if (x < 8 || y < 8 || x > W - 8 || y > H - 8) bad += 3; else { const c = cellAt(t, x, y); if (SURF[c].oob) bad += 3; else if (isTrackSurf(c)) bad += 2; }
        }
      }
      return bad;
    };
    pitSide = def.pitSide || (score(1) <= score(-1) ? 1 : -1);
    const R = 22, lane = [], drive = [];
    for (let k = e0; k <= x1; k++) {
      const u = Math.min(sm((k - e0) / R), sm((x1 - k) / R)), i = ix(k);
      const o = (hw * 0.4) + (pitOff - hw * 0.4) * u;
      lane.push({ x: center[i].x + nrm[i].x * pitSide * o, y: center[i].y + nrm[i].y * pitSide * o, u });
      const od = o - 6 * u;                       // Fahrspur innen, Halteplätze außen
      drive.push({ x: center[i].x + nrm[i].x * pitSide * od, y: center[i].y + nrm[i].y * pitSide * od });
    }
    for (let k = 0; k < lane.length - 1; k++) paintAlong(t, [lane[k], lane[k + 1]], 10 + 8 * lane[k].u, S.PIT, false, null, new Set([road, S.CURB, S.WATER]));
    pitPath = lane;
    // Boxenrechteck über den geraden Teil
    const k0 = Math.min(R + 4, lane.length >> 2), k1 = Math.max(k0 + 1, lane.length - 1 - k0), a = lane[k0], b = lane[k1];
    t.pit = { path: resample(drive, LINE_STEP, false), box: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, w: Math.max(60, dist(a.x, a.y, b.x, b.y)), h: 34, a: Math.atan2(b.y - a.y, b.x - a.x) } };
  }
  // Abkürzungen (Schotterweg) und Ölflecken
  const shorts = [];
  for (const sc of def.shortcuts || []) {
    const ia = nearestIndex(center, sc.a[0], sc.a[1]), ib = nearestIndex(center, sc.b[0], sc.b[1]);
    const path = splineOpen([center[ia]].concat((sc.via || []).map(([x, y]) => ({ x, y })), [center[ib]]), 4);
    paintAlong(t, path, sc.w || 19, S.DIRT, false, null, new Set([road, S.CURB, S.WATER, S.PIT]));
    shorts.push({ ia, ib, path });
  }
  for (let k = 0, placed = 0, tries = 0; placed < (def.oil || 0) && tries < 400; tries++) {
    const i = Math.floor(rng() * n);
    if (Math.abs(curv[i]) > 0.0025 || preWater[i] || onBridge(center[i].x, center[i].y, 30)) continue;
    const d0 = Math.min(i, n - i); if (d0 < 40) continue;                         // nicht an der Startaufstellung
    const off = (rng() - 0.5) * hw * 0.9;
    paintDisc(t, center[i].x + nrm[i].x * off, center[i].y + nrm[i].y * off, 11 + rng() * 5, S.OIL, new Set([road]));
    placed++;
  }
  if (def.post) def.post(t, rng);
  // Höhen
  roadHeights(t, center, hwAt, bridges, pitPath);
  for (const b of bridges) t.objects.push({ t: 'bridge', x: b.x, y: b.y, a: b.a, w: Math.round(b.w), h: Math.round(b.h), z: Math.round(b.z) });

  // KI-Linie, Checkpoints, Ideallinie, Startplätze
  t.aiLine = resample(center, LINE_STEP, true);
  t.checkpoints = [];
  autoCheckpoints(t);
  // Checkpoints immer über die volle Fahrbahnbreite (Eisflecken o. Ä. sollen sie nicht verkürzen)
  t.checkpoints = t.checkpoints.map(c => {
    const mx = (c.x1 + c.x2) / 2, my = (c.y1 + c.y2) / 2, i = nearestIndex(center, mx, my), nx = nrm[i].x, ny = nrm[i].y, cx = center[i].x, cy = center[i].y;
    // bisherige Ausdehnung (inkl. Boxengasse) behalten, aber mindestens volle Fahrbahnbreite
    const d1 = (c.x1 - cx) * nx + (c.y1 - cy) * ny, d2 = (c.x2 - cx) * nx + (c.y2 - cy) * ny;
    const k = i > n / 2 ? i - n : i, inPit = pitSide && k >= e0 && k <= x1;
    const hwi = hwAt[i] + 10;
    let ra = Math.max(Math.max(d1, d2), hwi), rb = Math.max(-Math.min(d1, d2), hwi);
    if (inPit) { if (pitSide > 0) ra = Math.max(ra, pitOff + 22); else rb = Math.max(rb, pitOff + 22); }
    return { x1: cx + nx * ra, y1: cy + ny * ra, x2: cx - nx * rb, y2: cy - ny * rb };
  });
  // Punkt-zu-Punkt: nur Checkpoints innerhalb der Karte (mit Abstand zum Rand)
  if (def.p2p) t.checkpoints = t.checkpoints.filter((c, k) => { const mx = (c.x1 + c.x2) / 2, my = (c.y1 + c.y2) / 2; return k === 0 || (mx > 110 && my > 110 && mx < W - 110 && my < H - 110); });
  // Checkpoints im abgekürzten Abschnitt entfernen (sonst wäre die Abkürzung ungültig)
  const inSkip = (i, sc) => sc.ia < sc.ib ? i > sc.ia && i < sc.ib : i > sc.ia || i < sc.ib;
  if (shorts.length) t.checkpoints = t.checkpoints.filter((c, k) => k === 0 || !shorts.some(sc => inSkip(nearestIndex(center, (c.x1 + c.x2) / 2, (c.y1 + c.y2) / 2), sc)));
  t.shortcuts = shorts.map(sc => resample(sc.path, LINE_STEP, false));
  for (const sc of shorts) {
    // Schranke kurz nach der Einfahrt, quer zum Weg
    const j = Math.min(sc.path.length - 2, 9), q = sc.path[j], tg2 = tangentAt(sc.path, j, false);
    t.objects.push({ t: 'gate', x: q.x, y: q.y, a: Math.atan2(tg2.y, tg2.x) + Math.PI / 2, w: 44, h: 4 });
  }
  t.aiLine = optimizeLine(t.aiLine, hw);
  alignLineToStart(t);
  autoStart(t);
  // Startaufstellung: 2er-Reihen versetzt mit mehr Abstand, mittig auf der (verbreiterten) Startgeraden
  {
    const c0 = center[0], a0 = Math.atan2(tg[0].y, tg[0].x), lat = Math.min(hwS * 0.42, 24);
    t.start = [];
    for (let k = 0; k < MAX_CARS; k++) {
      const row = k >> 1, sd = k % 2 ? 1 : -1, back = 30 + row * 46 + (k % 2) * 23, j = ix(-Math.round(back / 4));
      t.start.push({ x: center[j].x + nrm[j].x * sd * lat, y: center[j].y + nrm[j].y * sd * lat, a: Math.atan2(tg[j].y, tg[j].x) });
    }
    void c0; void a0;
  }

  // Rampen
  for (const [rx, ry, side] of def.ramps || []) {
    const i = nearestIndex(center, rx, ry), off = side * hw * 0.35;
    t.objects.push({ t: 'ramp', x: center[i].x + nrm[i].x * off, y: center[i].y + nrm[i].y * off, a: Math.atan2(tg[i].y, tg[i].x), w: def.rampZ ? 56 : 44, h: Math.round(side ? hw * 0.95 : hw * 1.4), z: def.rampZ || 12 });
  }

  // Deko: Leitplanken, Reifenstapel, Häuser, Bäume …
  const df = trackDistanceField(t);
  const objs = t.objects;
  const onShort = (x, y, r) => shorts.some(sc => sc.path.some(p => (p.x - x) ** 2 + (p.y - y) ** 2 < (r + 26) ** 2));
  const free = (x, y, r) => !onBridge(x, y, r + 6) && !onShort(x, y, r) && objs.every(o => dist(o.x, o.y, x, y) > r + objRadius(o) + 4);
  if (def.pit) {
    // Boxengebäude parallel hinter den Halteplätzen, Trennplanke zwischen Strecke und Boxengasse
    const b = t.pit.box, km = ix(Math.round((e0 + x1) / 2)), hx = nrm[km].x * pitSide, hy = nrm[km].y * pitSide;
    objs.push({ t: 'house', x: b.x + hx * 32, y: b.y + hy * 32, a: b.a, w: Math.round(b.w), h: 18, pit: true });
    for (let k = e0 + 26; k <= x1 - 26; k += 10) {
      const i = ix(k), o = hwS + 4;
      objs.push({ t: 'rail', x: center[i].x + nrm[i].x * pitSide * o, y: center[i].y + nrm[i].y * pitSide * o, a: Math.atan2(tg[i].y, tg[i].x), w: 40, h: 4 });
    }
  }
  // --- Abkürzsperren: Reifenstapel auf der Mittellinie zwischen nahen, aber weit auseinanderliegenden Streckenteilen ---
  // (dort würde Abkürzen sonst einen Checkpoint auslassen und die Runde nicht zählen)
  {
    const G = 70, D = 78, STEP = 10, cand = [];
    const arc = (a, b) => { const d = Math.abs(a - b); return Math.min(d, n - d); };
    for (let y = 10; y < H - 6; y += STEP) for (let x = 10; x < W - 6; x += STEP) {
      const c = cellAt(t, x, y);
      if (isTrackSurf(c) || c === S.CURB || SURF[c].oob || c === S.PIT) continue;
      let i1 = -1, d1 = 1e9;
      for (let i = 0; i < n; i += 2) { const d = (center[i].x - x) ** 2 + (center[i].y - y) ** 2; if (d < d1) { d1 = d; i1 = i; } }
      d1 = Math.sqrt(d1) - hwAt[i1];
      if (d1 > D) continue;
      let d2 = 1e9, i2 = -1;
      for (let i = 0; i < n; i += 2) { if (arc(i, i1) < G) continue; const d = (center[i].x - x) ** 2 + (center[i].y - y) ** 2; if (d < d2) { d2 = d; i2 = i; } }
      if (i2 < 0) continue;
      d2 = Math.sqrt(d2) - hwAt[i2];
      if (d2 > D || Math.abs(d1 - d2) > STEP * 0.75 || d1 < 9 || d2 < 9) continue;
      if (onBridge(x, y, 40) || shorts.some(sc => sc.path.some(p => (p.x - x) ** 2 + (p.y - y) ** 2 < 34 * 34))) continue;
      if (t.pit && t.pit.path.some(p => (p.x - x) ** 2 + (p.y - y) ** 2 < 40 * 40)) continue;
      cand.push({ x, y });
    }
    for (const q of cand) {
      if (!objs.every(o => dist(o.x, o.y, q.x, q.y) > objRadius(o) + 7)) continue;
      objs.push({ t: 'tires', x: q.x, y: q.y, a: 0, w: 15, h: 15, barrier: true });
    }
  }
  for (const r of def.rails || []) {
    const from = r.from || 0, to = r.to || 1;
    for (let i = 0; i < n; i += 9) {
      const f = i / n; if (f < from || f > to) continue;
      const off = hw + r.off;
      const x = center[i].x + nrm[i].x * r.side * off, y = center[i].y + nrm[i].y * r.side * off;
      if (dfAt(df, x, y) < r.off - 3 || cellAt(t, x, y) === S.WATER) continue;
      if (!free(x, y, 6)) continue;
      objs.push({ t: 'rail', x, y, a: Math.atan2(tg[i].y, tg[i].x), w: 40, h: 5 });
    }
  }
  if (def.tiresAtCorners) {
    for (let i = 0; i < n; i++) {
      const c = Math.abs(curv[i]);
      if (c < 0.011 || c < Math.abs(curv[(i - 3 + n) % n]) || c < Math.abs(curv[(i + 3) % n])) continue;
      const side = curv[i] > 0 ? -1 : 1, off = hw + (def.runoff != null ? 58 : 20);
      for (let k = -1; k <= 1; k++) {
        const x = center[i].x + nrm[i].x * side * off + tg[i].x * k * 19, y = center[i].y + nrm[i].y * side * off + tg[i].y * k * 19;
        if (dfAt(df, x, y) < 14 || cellAt(t, x, y) === S.WATER || !free(x, y, 9)) continue;
        objs.push({ t: 'tires', x, y, a: 0, w: 18, h: 18 });
      }
    }
  }
  if (def.tireWall) {
    // Kartbahn: Reifenreihen an allen Rändern
    for (let i = 0; i < n; i += 5) for (const side of [-1, 1]) {
      const off = hw + 14, x = center[i].x + nrm[i].x * side * off, y = center[i].y + nrm[i].y * side * off;
      if (dfAt(df, x, y) < 10 || cellAt(t, x, y) === S.WATER || !free(x, y, 7)) continue;
      objs.push({ t: 'tires', x, y, a: 0, w: 15, h: 15 });
    }
  }
  // Tribünen + Flaggen an der Start-/Zielgeraden (Seite ohne Boxengasse)
  {
    const c0 = t.checkpoints[0], mx = (c0.x1 + c0.x2) / 2, my = (c0.y1 + c0.y2) / 2;
    const i0 = nearestIndex(center, mx, my);
    const sideFree = sd => { let ok = 0; for (let d = hw + 30; d <= hw + 60; d += 6) { const x = center[i0].x + nrm[i0].x * sd * d, y = center[i0].y + nrm[i0].y * sd * d; if (cellAt(t, x, y) === def.base && dfAt(df, x, y) > 22) ok++; } return ok; };
    const side = sideFree(-1) >= sideFree(1) ? -1 : 1;
    for (const k of [-34, 0, 34]) {
      const i = (i0 + k + n) % n, off = hw + 50;
      const x = center[i].x + nrm[i].x * side * off, y = center[i].y + nrm[i].y * side * off;
      if (dfAt(df, x, y) < 30 || cellAt(t, x, y) === S.WATER || x < 50 || x > W - 50 || y < 30 || y > H - 30) continue;
      // Leitplanken/Banden zwischen Tribüne und Strecke sind erlaubt
      if (!objs.every(o => o.t === 'rail' || o.t === 'banner' || o.t === 'tires' || dist(o.x, o.y, x, y) > 40 + objRadius(o) + 4)) continue;
      if (onBridge(x, y, 50)) continue;
      // Vorderseite (lokal +y) zeigt zur Fahrbahn
      let a = Math.atan2(tg[i].y, tg[i].x); if (side > 0) a += Math.PI;
      objs.push({ t: 'stand', x, y, a, w: 96, h: 34 });
    }
    for (const sd of [-1, 1]) {
      const x = center[i0].x + nrm[i0].x * sd * (hw + 12), y = center[i0].y + nrm[i0].y * sd * (hw + 12);
      if (!isTrackSurf(cellAt(t, x, y)) && cellAt(t, x, y) !== S.WATER && free(x, y, 4)) objs.push({ t: 'flag', x, y, a: 0, w: 6, h: 6, c: sd < 0 ? 0 : 1 });
    }
  }
  // Laternen
  if (def.lamps) for (let i = 10, k = 0; i < n; i += 30, k++) {
    const side = k % 2 ? 1 : -1, off = hw + 11;
    const x = center[i].x + nrm[i].x * side * off, y = center[i].y + nrm[i].y * side * off;
    if (cellAt(t, x, y) === S.WATER || isTrackSurf(cellAt(t, x, y)) && cellAt(t, x, y) !== S.CURB || !free(x, y, 5)) continue;
    objs.push({ t: 'lamp', x, y, a: Math.atan2(-nrm[i].y * side, -nrm[i].x * side), w: 5, h: 5 });
  }
  // Werbebanden an Geraden
  for (let i = 0, cnt = 0; i < n && cnt < 14; i += 23) {
    if (Math.abs(curv[i]) > 0.002) continue;
    const side = ((i / 23) | 0) % 2 ? 1 : -1, off = hw + 16;
    const x = center[i].x + nrm[i].x * side * off, y = center[i].y + nrm[i].y * side * off;
    if (dfAt(df, x, y) < 13 || cellAt(t, x, y) === S.WATER || !free(x, y, 30)) continue;
    let a = Math.atan2(tg[i].y, tg[i].x); if (side > 0) a += Math.PI;
    objs.push({ t: 'banner', x, y, a, w: 56, h: 4, c: cnt % 4 }); cnt++;
  }
  // Zäune entlang langer Geraden (außen)
  if (def.fences) for (let i = 0; i < n; i += 16) {
    if (Math.abs(curv[i]) > 0.003) continue;
    const off = hw + 70, side = -1;
    const x = center[i].x + nrm[i].x * side * off, y = center[i].y + nrm[i].y * side * off;
    if (dfAt(df, x, y) < 60 || cellAt(t, x, y) === S.WATER || x < 10 || x > W - 10 || y < 10 || y > H - 10 || !free(x, y, 26)) continue;
    objs.push({ t: 'fence', x, y, a: Math.atan2(tg[i].y, tg[i].x), w: 64, h: 3 });
  }
  // Container (Hafen) in Reihen
  for (let k = 0, placed = 0; k < 3000 && placed < (def.containers || 0); k++) {
    const vert = rng() < 0.3, w = 48, h = 18, x = 40 + rng() * (W - 80), y = 30 + rng() * (H - 60);
    const r = Math.hypot(w, h) / 2;
    if (dfAt(df, x, y) < r + 14 || cellAt(t, x, y) === S.WATER || !free(x, y, r)) continue;
    for (let s2 = 0; s2 < 3 && placed < def.containers; s2++) {
      const ox = vert ? s2 * 20 : 0, oy = vert ? 0 : s2 * 20;
      if (dfAt(df, x + ox, y + oy) < r + 14 || cellAt(t, x + ox, y + oy) === S.WATER || !free(x + ox, y + oy, r - 4)) break;
      objs.push({ t: 'container', x: x + ox, y: y + oy, a: vert ? Math.PI / 2 : 0, w, h, c: Math.floor(rng() * 5) }); placed++;
    }
  }
  for (let k = 0, placed = 0; k < 3000 && placed < (def.houses || 0); k++) {
    const w = 38 + Math.floor(rng() * 26), h = 30 + Math.floor(rng() * 22);
    const x = 30 + rng() * (W - 60), y = 30 + rng() * (H - 60), r = Math.hypot(w, h) / 2;
    if (dfAt(df, x, y) < r + 16 || cellAt(t, x, y) !== def.base || !free(x, y, r)) continue;
    objs.push({ t: 'house', x, y, a: (rng() < 0.5 ? 0 : Math.PI / 2) + (rng() - 0.5) * 0.1, w, h });
    placed++;
  }
  const gap = def.treeGap != null ? def.treeGap : 22;
  for (let k = 0, placed = 0; k < 6000 && placed < (def.trees || 0); k++) {
    const w = 22 + Math.floor(rng() * 16), r = w / 2;
    const x = 16 + rng() * (W - 32), y = 16 + rng() * (H - 32);
    const s = cellAt(t, x, y);
    if (dfAt(df, x, y) < r + gap || s === S.WATER || s === S.ICE || isTrackSurf(s) || !free(x, y, r)) continue;
    objs.push({ t: 'tree', x, y, a: rng() * 6.28, w, h: w });
    placed++;
  }
  // Büsche und Steine
  const nb = def.bushes != null ? def.bushes : 24, nr = def.rocks != null ? def.rocks : 6;
  for (let k = 0, pb = 0, pr = 0; k < 4000 && (pb < nb || pr < nr); k++) {
    const rock = pb >= nb || (pr < nr && rng() < nr / (nb + nr));
    const w = rock ? 12 + Math.floor(rng() * 12) : 14 + Math.floor(rng() * 12);
    const x = 12 + rng() * (W - 24), y = 12 + rng() * (H - 24), s0 = cellAt(t, x, y);
    if (dfAt(df, x, y) < w / 2 + (rock ? 18 : 10) || s0 === S.WATER || isTrackSurf(s0) || !free(x, y, w / 2)) continue;
    objs.push({ t: rock ? 'rock' : 'bush', x, y, a: rng() * 6.28, w, h: w });
    if (rock) pr++; else pb++;
  }
  if (def.p2p) t.objects = t.objects.filter(o => o.x > 4 && o.y > 4 && o.x < W - 4 && o.y < H - 4);
  return t;
}
const objRadius = o => OBJ_DEF[o.t] && OBJ_DEF[o.t].round ? o.w / 2 : Math.hypot(o.w, o.h) / 2;

/** Ideallinie: Mittellinie seitlich glätten (schneidet Kurven), begrenzt auf die Fahrbahnbreite. */
function optimizeLine(line, hw, iters = 140) {
  const n = line.length;
  const tg = line.map((_, i) => tangentAt(line, i, true));
  const off = new Float32Array(n), lim = hw - 11;
  let px = line.map(p => p.x), py = line.map(p => p.y);
  for (let it = 0; it < iters; it++) {
    const nx2 = new Array(n), ny2 = new Array(n);
    for (let i = 0; i < n; i++) {
      let ax = 0, ay = 0;
      for (const d of [-3, -2, -1, 1, 2, 3]) { const j = (i + d + n) % n; ax += px[j]; ay += py[j]; }
      ax /= 6; ay /= 6;
      const tx = px[i] + (ax - px[i]) * 0.6, ty = py[i] + (ay - py[i]) * 0.6;
      // nur seitliche Verschiebung relativ zur Mittellinie
      let o = (tx - line[i].x) * -tg[i].y + (ty - line[i].y) * tg[i].x;
      o = clamp(o, -lim, lim); off[i] = o;
      nx2[i] = line[i].x - tg[i].y * o; ny2[i] = line[i].y + tg[i].x * o;
    }
    px = nx2; py = ny2;
  }
  return resample(px.map((x, i) => ({ x, y: py[i] })), LINE_STEP, true);
}

/* ---------- Derby-Arenen: ovale Fläche mit Reifen-/Containerwand ---------- */
const ARENA_DEFS = [
  { id: 'arena_mud', name: 'Schlammgrube', theme: 'meadow', base: S.GRASS, floor: S.DIRT, seed: 131, cx: 640, cy: 420, rx: 540, ry: 310,
    wall: 'tires', trees: 46, bushes: 30, rocks: 6, lamps: false,
    hills: [[-60, 0, 260, 40], [1340, 820, 260, 40]],
    humps: [[460, 330, 70, 9], [820, 520, 70, 9], [640, 420, 46, 6]],
    islands: [[640, 420, 'tires', 3], [330, 420, 'tires', 1], [950, 420, 'tires', 1]], ramps: [[640, 250, 0], [640, 590, Math.PI]] },
  { id: 'arena_yard', name: 'Schrottplatz', theme: 'city', base: S.CONCRETE, floor: S.ASPHALT, seed: 149, cx: 640, cy: 420, rx: 560, ry: 320,
    wall: 'container', trees: 0, bushes: 0, rocks: 0, lamps: true, containers: 26,
    humps: [],
    islands: [[460, 300, 'container', 2], [820, 540, 'container', 2], [460, 540, 'tires', 2], [820, 300, 'tires', 2], [640, 420, 'rock', 1]], ramps: [[300, 420, 0], [980, 420, Math.PI]] }
];
const inEllipse = (g, x, y, m = 0) => ((x - g.cx) / (g.rx + m)) ** 2 + ((y - g.cy) / (g.ry + m)) ** 2 <= 1;
/** Erzeugt eine Derby-Arena (Grundlage: eine Hilfsrunde für KI-Reset und Startplätze). */
function generateArena(def) {
  const g = def;
  const ctrl = [];
  for (let k = 0; k < 12; k++) { const a = Math.PI / 2 - k / 12 * Math.PI * 2; ctrl.push([g.cx + Math.cos(a) * (g.rx - 150), g.cy + Math.sin(a) * (g.ry - 120)]); }
  const tdef = { id: def.id, name: def.name, theme: def.theme, base: def.base, seed: def.seed, width: 80, road: def.floor, ctrl, start: [g.cx, g.cy + g.ry - 120],
    noCurbs: true, trees: def.trees, bushes: def.bushes, rocks: def.rocks, lamps: false, hills: def.hills,
    pre(t) { for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) if (inEllipse(g, x * CELL + 2, y * CELL + 2)) t.grid[y * GW + x] = def.floor; } };
  const t = generateTrack(tdef);
  t.arena = true;
  // Deko innerhalb der Arena (Tribünen, Flaggen …) entfernen, Wand aufbauen
  t.objects = t.objects.filter(o => !inEllipse(g, o.x, o.y, 46));
  const wall = [];
  const per = Math.PI * (3 * (g.rx + g.ry) - Math.sqrt((3 * g.rx + g.ry) * (g.rx + 3 * g.ry)));
  const step = def.wall === 'container' ? 43 : 17, nW = Math.round(per / step);
  for (let k = 0; k < nW; k++) {
    const a = k / nW * Math.PI * 2, x = g.cx + Math.cos(a) * (g.rx + 10), y = g.cy + Math.sin(a) * (g.ry + 10);
    if (def.wall === 'container') wall.push({ t: 'container', x, y, a: Math.atan2(g.ry * Math.cos(a), -g.rx * Math.sin(a)), w: 48, h: 18, c: k % 5 });
    else wall.push({ t: 'tires', x, y, a: 0, w: 18, h: 18 });
  }
  t.objects = t.objects.filter(o => wall.every(w => dist(o.x, o.y, w.x, w.y) > objRadius(o) + objRadius(w) + 6)).concat(wall);
  // Hindernis-Inseln
  for (const [x, y, kind, n] of def.islands) {
    for (let k = 0; k < n; k++) {
      const ox = (k - (n - 1) / 2) * (kind === 'container' ? 0 : 20), oy = (k - (n - 1) / 2) * (kind === 'container' ? 20 : 0);
      if (kind === 'container') t.objects.push({ t: 'container', x: x + ox, y: y + oy, a: 0, w: 48, h: 18, c: (x + k) % 5 });
      else if (kind === 'rock') t.objects.push({ t: 'rock', x, y, a: 0.4, w: 26, h: 26 });
      else t.objects.push({ t: 'tires', x: x + ox, y: y + oy, a: 0, w: 18, h: 18 });
    }
  }
  for (const [x, y, a] of def.ramps) t.objects.push({ t: 'ramp', x, y, a, w: 44, h: 46, z: 12 });
  // Tribünen außen
  for (const [ang, side] of [[-Math.PI / 2, 1], [Math.PI / 2, -1]]) {
    const x = g.cx + Math.cos(ang) * (g.rx + 64) * 0, y = g.cy + Math.sin(ang) * (g.ry + 52);
    if (y < 40 || y > H - 30) continue;
    for (const dx of [-220, 0, 220]) {
      const sx = x + dx, sy = y;
      t.objects = t.objects.filter(o => dist(o.x, o.y, sx, sy) > objRadius(o) + 52 || o.t === 'tires' || o.t === 'container');
      t.objects.push({ t: 'stand', x: sx, y: sy + (side > 0 ? -6 : 8), a: side > 0 ? 0 : Math.PI, w: 96, h: 30 });
    }
  }
  if (def.lamps) for (let k = 0; k < 10; k++) { const a = (k + 0.5) / 10 * Math.PI * 2; t.objects.push({ t: 'lamp', x: g.cx + Math.cos(a) * (g.rx + 34), y: g.cy + Math.sin(a) * (g.ry + 34), a: a + Math.PI, w: 5, h: 5 }); }
  // Kleine Bodenwellen
  for (const [x, y, r, h] of def.humps) for (let gy = 0; gy < HMH; gy++) for (let gx = 0; gx < HMW; gx++) {
    const d2 = (gx * HM - x) ** 2 + (gy * HM - y) ** 2; t.hm[gy * HMW + gx] += h * Math.exp(-d2 / (r * r));
  }
  // Startplätze im Kreis, Blick zur Mitte
  t.start = [];
  for (let k = 0; k < MAX_CARS; k++) {
    const a = Math.PI / 2 + k / MAX_CARS * Math.PI * 2 + Math.PI / MAX_CARS, x = g.cx + Math.cos(a) * (g.rx - 80), y = g.cy + Math.sin(a) * (g.ry - 64);
    t.start.push({ x: r1(x), y: r1(y), a: Math.atan2(g.cy - y, g.cx - x) });
  }
  t.pit = null;
  return t;
}
const getArenaDef = id => ARENA_DEFS.find(d => d.id === id) || null;

/** Cache: Beispielstrecken werden beim ersten Zugriff erzeugt. */
const builtinCache = {};
function getBuiltin(id) {
  if (!builtinCache[id]) {
    const d = TRACK_DEFS.find(d => d.id === id);
    if (d) builtinCache[id] = generateTrack(d);
    else { const a = getArenaDef(id); if (!a) return null; builtinCache[id] = generateArena(a); }
  }
  return builtinCache[id];
}
const arenaInfos = () => ARENA_DEFS.map(d => ({ id: d.id, name: d.name, custom: false, arena: true }));
function customTracks() { return store.get('cr_tracks', []).map(o => { try { const t = decodeTrack(o); t.custom = true; return t; } catch (e) { return null; } }).filter(Boolean); }
function allTrackInfos() {
  return TRACK_DEFS.map(d => ({ id: d.id, name: d.name, custom: false })).concat(store.get('cr_tracks', []).map(o => ({ id: o.id, name: o.name, custom: true })));
}
function getTrack(id) {
  const b = getBuiltin(id); if (b) return b;
  const o = store.get('cr_tracks', []).find(o => o.id === id);
  if (!o) return null;
  try { const t = decodeTrack(o); t.custom = true; return t; } catch (e) { return null; }
}
function saveCustomTrack(t) {
  const list = store.get('cr_tracks', []);
  const enc = encodeTrack(t);
  const i = list.findIndex(o => o.id === t.id);
  if (i >= 0) list[i] = enc; else list.push(enc);
  return store.set('cr_tracks', list);
}
function deleteCustomTrack(id) { store.set('cr_tracks', store.get('cr_tracks', []).filter(o => o.id !== id)); }

/* =====================================================================
   Laufzeit-Strecke: alles, was Physik, KI und Rennlogik brauchen
   ===================================================================== */
function prepareTrack(src) {
  const t = cloneTrack(src);
  t.custom = src.custom;
  completeTrack(t);
  const rt = { src: t, grid: t.grid, hm: t.hm, theme: t.theme, prof: {} };
  // Brücken und Rampen mit vorberechneter Drehung
  rt.bridges = t.objects.filter(o => o.t === 'bridge').map(o => ({ ...o, ca: Math.cos(o.a), sa: Math.sin(o.a) }));
  rt.ramps = t.objects.filter(o => o.t === 'ramp').map(o => ({ ...o, ca: Math.cos(o.a), sa: Math.sin(o.a), base: terrainH(t, o.x, o.y) }));
  // --- KI-Linie / Referenzlinie für Renndistanz ---
  let line = resample(t.aiLine, LINE_STEP, true);
  const c0 = t.checkpoints[0];
  const i0 = nearestIndex(line, (c0.x1 + c0.x2) / 2, (c0.y1 + c0.y2) / 2);
  line = line.slice(i0).concat(line.slice(0, i0));
  const n = line.length;
  rt.n = n;
  rt.lx = new Float32Array(n); rt.ly = new Float32Array(n); rt.tx = new Float32Array(n); rt.ty = new Float32Array(n); rt.cum = new Float32Array(n + 1);
  for (let i = 0; i < n; i++) {
    rt.lx[i] = line[i].x; rt.ly[i] = line[i].y;
    const tg = tangentAt(line, i, true); rt.tx[i] = tg.x; rt.ty[i] = tg.y;
    if (i > 0) rt.cum[i] = rt.cum[i - 1] + dist(line[i - 1].x, line[i - 1].y, line[i].x, line[i].y);
  }
  rt.L = rt.cum[n - 1] + dist(line[n - 1].x, line[n - 1].y, line[0].x, line[0].y);
  rt.cum[n] = rt.L;
  // Ebene je Linienpunkt: 1 = auf einer Brücke (Linie verläuft entlang der Brückenachse)
  rt.lvl = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const b = bridgeIn(rt.bridges, rt.lx[i], rt.ly[i], 2);
    if (b && Math.abs(rt.tx[i] * b.ca + rt.ty[i] * b.sa) > 0.6) rt.lvl[i] = 1;
  }
  // Fahrbahnbreite links/rechts je Linienpunkt (für Ausweichmanöver)
  rt.wl = new Float32Array(n); rt.wr = new Float32Array(n);
  for (let i = 0; i < n; i += 3) {
    if (rt.lvl[i]) { for (let k = 0; k < 3 && i + k < n; k++) { rt.wr[i + k] = 8; rt.wl[i + k] = 8; } continue; }
    const fam = surfFamily(cellAt(t, rt.lx[i], rt.ly[i]));
    const r = raycastEdge(t, rt.lx[i], rt.ly[i], -rt.ty[i], rt.tx[i], fam, 80) - 6;
    const l = raycastEdge(t, rt.lx[i], rt.ly[i], rt.ty[i], -rt.tx[i], fam, 80) - 6;
    for (let k = 0; k < 3 && i + k < n; k++) { rt.wr[i + k] = clamp(r - 8, 0, 60); rt.wl[i + k] = clamp(l - 8, 0, 60); }
  }
  // --- Checkpoints mit Fahrtrichtung und Lage auf der Linie ---
  rt.cps = t.checkpoints.map((c, k) => {
    const mx = (c.x1 + c.x2) / 2, my = (c.y1 + c.y2) / 2;
    const pr = projectLine(rt, mx, my, null);
    return { ...c, nx: rt.tx[pr.i], ny: rt.ty[pr.i], frac: k === 0 ? 0 : pr.s / rt.L };
  });
  // --- Objekte → Kollisionsformen + Raster-Buckets ---
  rt.objects = t.objects;
  rt.shapes = [];
  for (const o of t.objects) {
    if (o.t === 'tree') rt.shapes.push({ k: 'c', x: o.x, y: o.y, r: Math.max(4, o.w * 0.22), dmg: 1.1, e: 0.25, o });
    else if (o.t === 'tires') rt.shapes.push({ k: 'c', x: o.x, y: o.y, r: o.w / 2, dmg: 0.35, e: 0.55, o });
    else if (o.t === 'bush') rt.shapes.push({ k: 'c', x: o.x, y: o.y, r: o.w * 0.33, dmg: 0.12, e: 0.05, o });
    else if (o.t === 'rock') rt.shapes.push({ k: 'c', x: o.x, y: o.y, r: o.w * 0.45, dmg: 1.2, e: 0.2, o });
    else if (o.t === 'flag' || o.t === 'lamp') rt.shapes.push({ k: 'c', x: o.x, y: o.y, r: 2.5, dmg: 0.4, e: 0.2, o });
    else if (o.t === 'ramp') continue;
    else if (o.t === 'gate') { rt.shapes.push({ k: 'r', x: o.x, y: o.y, hw: o.w / 2, hh: 2.5, ca: Math.cos(o.a), sa: Math.sin(o.a), dmg: 0.4, e: 0.5, gate: true, o }); continue; }
    else if (o.t === 'bridge') {
      // Geländer auf beiden Längsseiten (nur für Autos auf der Brücke)
      const ca = Math.cos(o.a), sa = Math.sin(o.a);
      for (const sd of [-1, 1]) rt.shapes.push({ k: 'r', x: o.x - sa * sd * (o.h / 2 + 1), y: o.y + ca * sd * (o.h / 2 + 1), hw: o.w / 2 + 4, hh: 2.5, ca, sa, dmg: 0.5, e: 0.3, lvl: 1, o });
      continue;
    }
    else {
      const soft = { rail: [0.6, 0.3], banner: [0.4, 0.3], fence: [0.3, 0.15] }[o.t] || [1, 0.2];
      rt.shapes.push({ k: 'r', x: o.x, y: o.y, hw: o.w / 2, hh: Math.max(1.5, o.h / 2), ca: Math.cos(o.a), sa: Math.sin(o.a), dmg: soft[0], e: soft[1], o });
    }
  }
  // Weltgrenzen
  for (const [x, y, w, h] of [[W / 2, -50, W + 200, 100], [W / 2, H + 50, W + 200, 100], [-50, H / 2, 100, H + 200], [W + 50, H / 2, 100, H + 200]])
    rt.shapes.push({ k: 'r', x, y, hw: w / 2, hh: h / 2, ca: 1, sa: 0, dmg: 1, e: 0.2, border: true });
  rt.bw = Math.ceil(W / 64) + 2; rt.bh = Math.ceil(H / 64) + 2;
  rt.buckets = Array.from({ length: rt.bw * rt.bh }, () => []);
  for (const s of rt.shapes) {
    const r = s.k === 'c' ? s.r : Math.hypot(s.hw, s.hh);
    const x0 = clamp(Math.floor((s.x - r) / 64) + 1, 0, rt.bw - 1), x1 = clamp(Math.floor((s.x + r) / 64) + 1, 0, rt.bw - 1);
    const y0 = clamp(Math.floor((s.y - r) / 64) + 1, 0, rt.bh - 1), y1 = clamp(Math.floor((s.y + r) / 64) + 1, 0, rt.bh - 1);
    for (let by = y0; by <= y1; by++) for (let bx = x0; bx <= x1; bx++) rt.buckets[by * rt.bw + bx].push(s);
  }
  // --- Boxengasse ---
  rt.pit = null;
  if (t.pit && t.pit.path.length > 3) {
    const path = resample(t.pit.path, LINE_STEP, false);
    const b = t.pit.box;
    const pit = { path, box: { ...b, ca: Math.cos(b.a), sa: Math.sin(b.a) }, n: path.length };
    pit.entryS = projectLine(rt, path[0].x, path[0].y, null).s;
    pit.exitS = projectLine(rt, path[path.length - 1].x, path[path.length - 1].y, null).s;
    // Halteplätze: Pfadpunkte innerhalb des Boxenbereichs, im Abstand von ca. 30 px
    pit.slots = [];
    let lastSlot = -99;
    for (let i = 0; i < path.length; i++) {
      if (inBoxRect(pit.box, path[i].x, path[i].y, -6) && i - lastSlot >= 5) { pit.slots.push(i); lastSlot = i; }
    }
    if (!pit.slots.length) pit.slots.push(nearestIndex(path, b.x, b.y));
    // Richtung zu den Halteplätzen (weg von der Strecke)
    let ox = -Math.sin(b.a), oy = Math.cos(b.a);
    if (projectLine(rt, b.x + ox * 12, b.y + oy * 12, null).d < projectLine(rt, b.x - ox * 12, b.y - oy * 12, null).d) { ox = -ox; oy = -oy; }
    pit.ox = ox; pit.oy = oy;
    rt.pit = pit;
  }
  rt.start = t.start.slice();
  // Abkürzungen: Pfad + Ein-/Ausfahrt auf der Referenzlinie
  rt.shortcuts = (t.shortcuts || []).map(path => {
    const a = projectLine(rt, path[0].x, path[0].y, null, 0), b = projectLine(rt, path[path.length - 1].x, path[path.length - 1].y, null, 0);
    const gate = t.objects.find(o => o.t === 'gate' && path.some(p => dist(p.x, p.y, o.x, o.y) < 14)) || null;
    return { path, n: path.length, ia: a.i, ib: b.i, gate, gain: ((b.s - a.s + rt.L) % rt.L) - polyLength(path, false) };
  });
  return rt;
}
/** Bodenhöhe für ein Auto: Brückendeck (Ebene 1) oder Gelände inkl. Rampen. */
function groundZ(rt, x, y, level, bridge) {
  if (level === 1 && bridge) return bridge.z;
  let g = terrainH(rt, x, y);
  // Unter einer Brücke (Mittelteil) liegt der Boden immer deutlich unter dem Deck
  if (rt.bridges.length) { const b = bridgeIn(rt.bridges, x, y, 0); if (b) { const [lx] = localOf(b, x, y); if (Math.abs(lx) < b.w / 2 - 10) g = Math.min(g, Math.max(0, b.z - 22)); } }
  for (const r of rt.ramps) { const h = rampHeight(r, x, y); if (h > 0) g = Math.max(g, r.base + h); }
  return g;
}
/** Oberfläche unter einem Auto (auf Brücken: Asphalt). */
const surfAtLevel = (rt, x, y, level) => level === 1 ? S.ASPHALT : cellAt(rt.src, x, y);
/** Liegt (x,y) im (gedrehten) Boxenrechteck? margin > 0 vergrößert, < 0 verkleinert. */
function inBoxRect(b, x, y, margin = 0) {
  const ca = b.ca != null ? b.ca : Math.cos(b.a), sa = b.sa != null ? b.sa : Math.sin(b.a);
  const dx = x - b.x, dy = y - b.y;
  const lx = dx * ca + dy * sa, ly = -dx * sa + dy * ca;
  return Math.abs(lx) <= b.w / 2 + margin && Math.abs(ly) <= b.h / 2 + margin + 4;
}
/** Projektion eines Punktes auf die Referenzlinie (mit Suchhinweis für Geschwindigkeit). */
function projectLine(rt, x, y, hint, level) {
  const n = rt.n; let best = 0, bd = Infinity, pen = false;
  const scan = (from, to) => {
    for (let k = from; k <= to; k++) {
      const i = ((k % n) + n) % n;
      let d = (rt.lx[i] - x) ** 2 + (rt.ly[i] - y) ** 2;
      if (pen && rt.lvl && rt.lvl[i] !== level) d += 1e6;
      if (d < bd) { bd = d; best = i; }
    }
  };
  pen = level != null;
  if (hint != null) { pen = false; scan(hint - 25, hint + 25); if (bd > 80 * 80) { bd = Infinity; pen = level != null; scan(0, n - 1); } }
  else scan(0, n - 1);
  if (bd >= 1e6) bd -= 1e6;
  // Verfeinern auf dem angrenzenden Segment
  const j = (best + 1) % n;
  const ax = rt.lx[best], ay = rt.ly[best], sx = rt.lx[j] - ax, sy = rt.ly[j] - ay;
  const sl = sx * sx + sy * sy || 1;
  let u = ((x - ax) * sx + (y - ay) * sy) / sl;
  let s;
  if (u >= 0) s = rt.cum[best] + Math.min(1, u) * Math.sqrt(sl);
  else {
    const p = (best - 1 + n) % n;
    const px = rt.lx[p], py = rt.ly[p], qx = ax - px, qy = ay - py, ql = qx * qx + qy * qy || 1;
    const u2 = clamp(((x - px) * qx + (y - py) * qy) / ql, 0, 1);
    s = (p === n - 1 ? rt.cum[p] : rt.cum[p]) + u2 * Math.sqrt(ql);
  }
  if (s >= rt.L) s -= rt.L;
  return { i: best, s, d: Math.sqrt(bd) };
}
/** Punkt auf der Referenzlinie zur Distanz s. */
function lineAtS(rt, s) {
  s = ((s % rt.L) + rt.L) % rt.L;
  let lo = 0, hi = rt.n - 1;
  while (lo < hi) { const m = (lo + hi + 1) >> 1; if (rt.cum[m] <= s) lo = m; else hi = m - 1; }
  const i = lo, j = (i + 1) % rt.n;
  const seg = rt.cum[i + 1] - rt.cum[i] || 1, u = (s - rt.cum[i]) / seg;
  return { x: lerp(rt.lx[i], rt.lx[j], u), y: lerp(rt.ly[i], rt.ly[j], u), a: Math.atan2(rt.ty[i], rt.tx[i]), i };
}
/** Geschwindigkeitsprofil der KI-Linie für eine Fahrzeugklasse (Kurvenradius, Untergrund, Bremswege). */
function speedProfile(rt, cls) {
  if (rt.prof[cls.id]) return rt.prof[cls.id];
  const n = rt.n, v = new Float32Array(n), K = 6, wx = rt.weather;
  const surfI = i => rt.lvl[i] ? S.ASPHALT : cellAt(rt.src, rt.lx[i], rt.ly[i]);
  for (let i = 0; i < n; i++) {
    const a = (i - K + n) % n, c = (i + K) % n;
    const ax = rt.lx[a], ay = rt.ly[a], bx = rt.lx[i], by = rt.ly[i], cx = rt.lx[c], cy = rt.ly[c];
    const area2 = Math.abs((bx - ax) * (cy - ay) - (by - ay) * (cx - ax));
    const R = area2 < 1e-3 ? 1e4 : (dist(ax, ay, bx, by) * dist(bx, by, cx, cy) * dist(cx, cy, ax, ay)) / (2 * area2);
    const s0 = surfI(i);
    const g = Math.max(0.15, gripFactor(cls, s0, wx));
    const vGrip = Math.sqrt(LAT * cls.grip * g * 0.92 * R);
    const st = cls.steer * (0.55 + 0.45 * Math.min(1, g));
    const vSteer = R * st / (1 + 0.38 * R * st / cls.maxSpeed);
    v[i] = Math.min(vGrip, vSteer, cls.maxSpeed * speedFactor(cls, s0));
  }
  for (let pass = 0; pass < 2; pass++) {
    for (let i = n - 1; i >= 0; i--) {
      const j = (i + 1) % n;
      const g = Math.max(0.2, gripFactor(cls, surfI(i), wx));
      const dec = cls.brake * 0.62 * Math.min(1, 0.35 + g * 0.8);
      v[i] = Math.min(v[i], Math.sqrt(v[j] * v[j] + 2 * dec * LINE_STEP));
    }
  }
  rt.prof[cls.id] = v;
  return v;
}
