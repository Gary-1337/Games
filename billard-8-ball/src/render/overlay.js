// @ts-check
// Zielhilfe, Ball-in-Hand-Markierung, Zielkugel-Ringe und Pfeil des letzten Stoßes.
import * as THREE from '../../vendor/three.module.js?v=1.0.1';

const H = 0.0015;

/** Breite Linie aus Quads, optional gestrichelt (gut sichtbar auch bei hoher Pixeldichte). */
export class Ribbon {
  constructor(maxSegments, color, opacity, width) {
    this.max = maxSegments;
    this.width = width;
    this.pos = new Float32Array(maxSegments * 4 * 3);
    const idx = new Uint16Array(maxSegments * 6);
    for (let i = 0; i < maxSegments; i++) idx.set([i * 4, i * 4 + 1, i * 4 + 2, i * 4 + 2, i * 4 + 1, i * 4 + 3], i * 6);
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.geo.setIndex(new THREE.BufferAttribute(idx, 1));
    this.mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(this.geo, this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 5;
  }

  /** @param {number[][]} pts Physik-Koordinaten @param {number} [dash] Strichlänge (0 = durchgehend) */
  set(pts, dash = 0, maxLen = Infinity, pairs = false) {
    let n = 0, travelled = 0;
    const w = this.width / 2;
    const quad = (ax, ay, bx, by) => {
      if (n >= this.max) return;
      const dx = bx - ax, dy = by - ay, l = Math.hypot(dx, dy) || 1;
      const ox = (-dy / l) * w, oy = (dx / l) * w;
      const o = n * 12;
      this.pos.set([ax + ox, H, -(ay + oy), ax - ox, H, -(ay - oy), bx + ox, H, -(by + oy), bx - ox, H, -(by - oy)], o);
      n++;
    };
    for (let i = 0; i < pts.length - 1 && travelled < maxLen; i += pairs ? 2 : 1) {
      let [ax, ay] = pts[i];
      let [bx, by] = pts[i + 1];
      let l = Math.hypot(bx - ax, by - ay);
      if (travelled + l > maxLen) {
        const k = (maxLen - travelled) / l;
        bx = ax + (bx - ax) * k; by = ay + (by - ay) * k; l = maxLen - travelled;
      }
      if (!dash) quad(ax, ay, bx, by);
      else {
        const ux = (bx - ax) / (l || 1), uy = (by - ay) / (l || 1);
        for (let s = 0; s < l; s += dash * 2) {
          const e = Math.min(l, s + dash);
          quad(ax + ux * s, ay + uy * s, ax + ux * e, ay + uy * e);
        }
      }
      travelled += l;
    }
    this.geo.setDrawRange(0, n * 6);
    this.geo.attributes.position.needsUpdate = true;
    this.mesh.visible = n > 0;
  }

  hide() { this.mesh.visible = false; }
}

export class Overlay {
  /** @param {number} R */
  constructor(R) {
    this.group = new THREE.Group();
    this.R = R;
    this.aim = new Ribbon(64, 0xffffff, 0.75, 0.006);
    this.objPath = new Ribbon(160, 0xffd34d, 0.85, 0.007);
    this.cuePath = new Ribbon(200, 0x7fd8ff, 0.7, 0.005);
    this.cushionRefl = new Ribbon(40, 0xffffff, 0.45, 0.005);
    this.lastShot = new Ribbon(4, 0xff9a3d, 0.7, 0.01);
    for (const r of [this.aim, this.objPath, this.cuePath, this.cushionRefl, this.lastShot]) this.group.add(r.mesh);

    this.ghost = new THREE.Mesh(
      new THREE.SphereGeometry(R, 24, 16),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.22, depthWrite: false }),
    );
    const ghostRing = new THREE.Mesh(new THREE.RingGeometry(R * 0.93, R, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, depthWrite: false }));
    ghostRing.position.y = -R + H;
    this.ghost.add(ghostRing);
    this.contactDot = new THREE.Mesh(new THREE.SphereGeometry(0.0045, 10, 8), new THREE.MeshBasicMaterial({ color: 0xff3b3b, depthTest: false }));
    this.contactDot.renderOrder = 10;
    this.group.add(this.ghost, this.contactDot);

    const arrowHead = new THREE.Shape();
    arrowHead.moveTo(0, 0); arrowHead.lineTo(-0.035, 0.02); arrowHead.lineTo(-0.035, -0.02); arrowHead.closePath();
    this.arrowHead = new THREE.Mesh(new THREE.ShapeGeometry(arrowHead).rotateX(-Math.PI / 2), this.lastShot.mat);
    this.group.add(this.arrowHead);

    this.bihRing = new THREE.Mesh(new THREE.RingGeometry(R * 1.3, R * 1.65, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x46e08a, transparent: true, opacity: 0.9, depthWrite: false }));
    this.bihCross = new Ribbon(4, 0xff4040, 0.95, 0.008);
    this.group.add(this.bihRing, this.bihCross.mesh);

    const ringGeo = new THREE.RingGeometry(R * 1.12, R * 1.28, 32).rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false });
    this.targetRings = [];
    for (let i = 0; i < 16; i++) {
      const m = new THREE.Mesh(ringGeo, ringMat);
      m.visible = false;
      this.targetRings.push(m);
      this.group.add(m);
    }
    this.hideAim();
    this.bihRing.visible = false;
    this.bihCross.hide();
    this.setLastShot(null);
  }

  hideAim() {
    this.aim.hide(); this.objPath.hide(); this.cuePath.hide(); this.cushionRefl.hide();
    this.ghost.visible = false; this.contactDot.visible = false;
  }

  /**
   * @param {{cue:number[], ghost:number[]|null, target:number[]|null, cushionHit:number[]|null, reflect:number[]|null,
   *          objPath:number[][]|null, cuePath:number[][]|null, assist:'off'|'short'|'medium'|'long', showCuePath:boolean}} a
   */
  setAim(a) {
    if (a.assist === 'off') { this.hideAim(); return; }
    const lim = { short: 0.12, medium: 0.35, long: 1.2 }[a.assist];
    const aimLim = a.assist === 'short' ? 0.7 : Infinity;
    const end = a.ghost || a.cushionHit;
    if (end) this.aim.set([a.cue, end], 0, aimLim); else this.aim.hide();
    if (a.ghost && a.target) {
      this.ghost.visible = true;
      this.ghost.position.set(a.ghost[0], this.R, -a.ghost[1]);
      const cx = (a.ghost[0] + a.target[0]) / 2, cy = (a.ghost[1] + a.target[1]) / 2;
      this.contactDot.visible = true;
      this.contactDot.position.set(cx, this.R, -cy);
      if (a.objPath) this.objPath.set(a.objPath, 0, lim * 1.6); else this.objPath.hide();
      if (a.cuePath && a.showCuePath) this.cuePath.set(a.cuePath, 0.02, lim); else this.cuePath.hide();
      this.cushionRefl.hide();
    } else {
      this.ghost.visible = false; this.contactDot.visible = false; this.objPath.hide();
      if (a.cushionHit && a.reflect) {
        this.ghost.visible = true;
        this.ghost.position.set(a.cushionHit[0], this.R, -a.cushionHit[1]);
        this.cushionRefl.set([a.cushionHit, a.reflect], 0.015, lim);
      } else this.cushionRefl.hide();
      this.cuePath.hide();
    }
  }

  /** @param {{x:number, y:number, valid:boolean}|null} b */
  setBallInHand(b) {
    if (!b) { this.bihRing.visible = false; this.bihCross.hide(); return; }
    this.bihRing.visible = true;
    this.bihRing.position.set(b.x, H, -b.y);
    /** @type {THREE.MeshBasicMaterial} */ (this.bihRing.material).color.set(b.valid ? 0x46e08a : 0xff4040);
    if (b.valid) this.bihCross.hide();
    else {
      // rotes ✕ neben der Kugel (Information nicht nur über Farbe)
      const s = this.R * 0.7, cx = b.x + this.R * 2.4, cy = b.y + this.R * 2.4;
      this.bihCross.set([[cx - s, cy - s], [cx + s, cy + s], [cx - s, cy + s], [cx + s, cy - s]], 0, Infinity, true);
    }
  }

  /** @param {{x:number, y:number}[]|null} balls */
  setTargets(balls) {
    this.targetRings.forEach((r) => (r.visible = false));
    if (!balls) return;
    balls.forEach((b, i) => {
      const r = this.targetRings[i];
      r.visible = true;
      r.position.set(b.x, H, -b.y);
    });
  }

  /** @param {{x:number, y:number, angle:number}|null} s */
  setLastShot(s) {
    if (!s) { this.lastShot.hide(); this.arrowHead.visible = false; return; }
    const l = 0.22;
    const ex = s.x + Math.cos(s.angle) * l, ey = s.y + Math.sin(s.angle) * l;
    this.lastShot.set([[s.x + Math.cos(s.angle) * this.R * 1.4, s.y + Math.sin(s.angle) * this.R * 1.4], [ex, ey]]);
    this.arrowHead.visible = true;
    this.arrowHead.position.set(ex + Math.cos(s.angle) * 0.03, H, -(ey + Math.sin(s.angle) * 0.03));
    this.arrowHead.rotation.y = s.angle;
  }
}
