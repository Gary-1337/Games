// @ts-check
// Prozedurale Texturen (keine Bilddateien → schneller Start).
import * as THREE from '../../vendor/three.module.js?v=1.0.1';

export const BALL_COLORS = {
  1: '#f2be1a', 2: '#1747a6', 3: '#d42a2a', 4: '#5a2c8c', 5: '#f07a18', 6: '#127a3c', 7: '#80231f', 8: '#111111',
};
export const ballColor = (id) => (id === 0 ? '#f7f3e8' : BALL_COLORS[id > 8 ? id - 8 : id]);

/** Symbol je Farbfamilie (Farbenblind-Modus). */
export const FAMILY_SYMBOL = { 1: '★', 2: '●', 3: '▲', 4: '◆', 5: '■', 6: '✚', 7: '⬟', 8: '8' };

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('2D-Canvas nicht verfügbar');
  return { c, ctx };
}

/** @param {number} id @param {boolean} colorblind */
export function makeBallTexture(id, colorblind) {
  const { c, ctx } = canvas(512, 256);
  const stripe = id > 8;
  const col = ballColor(id);
  ctx.fillStyle = id === 0 || stripe ? '#f7f3e8' : col;
  ctx.fillRect(0, 0, 512, 256);
  if (stripe) {
    ctx.fillStyle = col;
    ctx.fillRect(0, 70, 512, 116);
    if (colorblind) {
      // Schraffur auf dem Streifen
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = 7;
      for (let x = -140; x < 560; x += 26) { ctx.beginPath(); ctx.moveTo(x, 186); ctx.lineTo(x + 116, 70); ctx.stroke(); }
    }
  } else if (colorblind && id !== 0 && id !== 8) {
    // Punktmuster auf vollen Kugeln
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    for (let y = 30; y < 240; y += 34) for (let x = (y / 34) % 2 ? 0 : 17; x < 512; x += 34) { ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill(); }
  }
  if (id === 0) {
    ctx.fillStyle = '#c8202a';
    for (const [x, y] of [[128, 128], [384, 128], [0, 128], [256, 128], [256, 40], [256, 216]]) { ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.fill(); }
  } else {
    for (const cx of [128, 384]) {
      const r = colorblind ? 46 : 38;
      ctx.fillStyle = '#f7f3e8';
      ctx.beginPath(); ctx.arc(cx, 128, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#111';
      ctx.font = `bold ${colorblind ? 44 : 42}px Arial, sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(String(id), cx, colorblind ? 118 : 130);
      if (colorblind) {
        ctx.font = 'bold 22px Arial, sans-serif';
        ctx.fillText((stripe ? '▬' : '') + FAMILY_SYMBOL[id > 8 ? id - 8 : id], cx, 152);
      }
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function makeFeltTexture(base = '#1f7a4d') {
  const { c, ctx } = canvas(256, 256);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 256, 256);
  const img = ctx.getImageData(0, 0, 256, 256);
  let seed = 1234567;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (rnd() - 0.5) * 18 + (((i >> 2) % 256) % 2 ? 2 : -2);
    img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function makeWoodTexture() {
  const { c, ctx } = canvas(512, 128);
  const g = ctx.createLinearGradient(0, 0, 0, 128);
  g.addColorStop(0, '#5a2e17'); g.addColorStop(0.5, '#6e3a1d'); g.addColorStop(1, '#4e2713');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 128);
  for (let i = 0; i < 60; i++) {
    ctx.strokeStyle = `rgba(${30 + (i % 3) * 10},12,4,${0.12 + (i % 5) * 0.04})`;
    ctx.lineWidth = 1 + (i % 3);
    ctx.beginPath();
    const y0 = (i * 37) % 128;
    ctx.moveTo(0, y0);
    for (let x = 0; x <= 512; x += 32) ctx.lineTo(x, y0 + Math.sin(x * 0.02 + i) * 4);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function makeBlobTexture() {
  const { c, ctx } = canvas(64, 64);
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(0,0,0,0.75)');
  g.addColorStop(0.45, 'rgba(0,0,0,0.45)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

/** Nummern-Etikett über der Kugel (Farbenblind-Modus). */
export function makeLabelTexture(id) {
  const { c, ctx } = canvas(64, 64);
  ctx.fillStyle = 'rgba(10,12,16,0.82)';
  ctx.beginPath(); ctx.arc(32, 32, 28, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 30px Arial, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(String(id), 32, 34);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
