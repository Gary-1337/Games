// @ts-check
// Three.js-Szene: Tisch, Kugeln, Queue, Overlays, Licht, adaptive Qualität.
import * as THREE from '../../vendor/three.module.js?v=1.0.2';
import { RoomEnvironment } from '../../vendor/RoomEnvironment.js?v=1.0.2';
import { buildTable } from './tableMesh.js?v=1.0.2';
import { makeBallTexture, makeBlobTexture, makeLabelTexture } from './textures.js?v=1.0.2';
import { CameraRig } from './camera.js?v=1.0.2';
import { Overlay } from './overlay.js?v=1.0.2';
import { CueStick } from './cueStick.js?v=1.0.2';

export const QUALITY = {
  low: { maxDpr: 1, segments: [20, 14], env: false },
  medium: { maxDpr: 1.5, segments: [28, 18], env: true },
  high: { maxDpr: 2, segments: [36, 24], env: true },
};

export class GameRenderer {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {import('../physics/table.js').Table} table
   * @param {number} R
   */
  constructor(canvas, table, R) {
    this.canvas = canvas;
    this.table = table;
    this.R = R;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', alpha: false });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0e1116);
    this.scene.fog = new THREE.Fog(0x0e1116, 5, 12);
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.03, 30);
    this.rig = new CameraRig(this.camera);
    this.qualityName = 'auto';
    this.quality = QUALITY.high;
    this.dprScale = 1;
    this.frameTimes = [];
    this.adaptTimer = 0;

    this.scene.add(new THREE.HemisphereLight(0xfff6e6, 0x1a2430, 0.85));
    const key = new THREE.DirectionalLight(0xffffff, 1.5);
    key.position.set(0.3, 3, 0.4);
    this.scene.add(key);
    for (const x of [-0.9, 0.9]) {
      const pl = new THREE.PointLight(0xfff0d0, 0.9, 4, 1.6);
      pl.position.set(x, 1.05, 0);
      this.scene.add(pl);
    }
    this.pmrem = new THREE.PMREMGenerator(this.renderer);
    this.envTex = this.pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    this.tableGroup = buildTable(table);
    this.scene.add(this.tableGroup);

    this.overlay = new Overlay(R);
    this.scene.add(this.overlay.group);
    this.cue = new CueStick(R, table);
    this.scene.add(this.cue.root);

    this.blobTex = makeBlobTexture();
    /** @type {{mesh:THREE.Mesh, shadow:THREE.Mesh, label:THREE.Sprite|null, fall:number, hidden:boolean}[]} */
    this.balls = [];
    this.colorblind = false;
    this.buildBalls(false);
    this.raycaster = new THREE.Raycaster();
    this.plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -R);
    this.tmpQ = new THREE.Quaternion();
  }

  /** @param {boolean} colorblind */
  buildBalls(colorblind) {
    for (const b of this.balls) {
      this.scene.remove(b.mesh, b.shadow);
      /** @type {THREE.MeshStandardMaterial} */ (b.mesh.material).map?.dispose();
      /** @type {THREE.Material} */ (b.mesh.material).dispose();
      b.mesh.geometry.dispose();
      if (b.label) { this.scene.remove(b.label); b.label.material.map?.dispose(); b.label.material.dispose(); }
    }
    this.balls = [];
    this.colorblind = colorblind;
    const [ws, hs] = this.quality.segments;
    const geo = new THREE.SphereGeometry(this.R, ws, hs);
    const shadowGeo = new THREE.PlaneGeometry(this.R * 2.9, this.R * 2.9).rotateX(-Math.PI / 2);
    const shadowMat = new THREE.MeshBasicMaterial({ map: this.blobTex, transparent: true, depthWrite: false, opacity: 0.85 });
    for (let id = 0; id < 16; id++) {
      const mat = new THREE.MeshStandardMaterial({ map: makeBallTexture(id, colorblind), roughness: 0.14, metalness: 0, envMapIntensity: 0.9 });
      const mesh = new THREE.Mesh(geo, mat);
      const shadow = new THREE.Mesh(shadowGeo, shadowMat);
      shadow.renderOrder = 1;
      this.scene.add(mesh, shadow);
      let label = null;
      if (colorblind && id > 0) {
        label = new THREE.Sprite(new THREE.SpriteMaterial({ map: makeLabelTexture(id), depthTest: false }));
        label.scale.set(0.045, 0.045, 1);
        label.renderOrder = 20;
        this.scene.add(label);
      }
      this.balls.push({ mesh, shadow, label, fall: -1, hidden: false });
    }
  }

  /** @param {'auto'|'low'|'medium'|'high'} name */
  setQuality(name) {
    this.qualityName = name;
    const q = name === 'auto' ? QUALITY.high : QUALITY[name];
    const segChanged = q.segments !== this.quality.segments;
    this.quality = q;
    this.dprScale = 1;
    this.scene.environment = q.env ? this.envTex : null;
    if (segChanged) this.buildBalls(this.colorblind);
    this.applySize();
  }

  resize(w, h) {
    this.w = Math.max(1, w);
    this.h = Math.max(1, h);
    this.applySize();
    this.rig.setAspect(this.w / this.h);
  }

  applySize() {
    if (!this.w) return;
    const dpr = Math.min(window.devicePixelRatio || 1, this.quality.maxDpr) * this.dprScale;
    this.renderer.setPixelRatio(Math.max(0.6, dpr));
    this.renderer.setSize(this.w, this.h, false);
  }

  /** Adaptive Auflösung im Auto-Modus: zielt auf ~60 FPS. @param {number} ms */
  trackFrame(ms) {
    if (this.qualityName !== 'auto') return;
    this.frameTimes.push(ms);
    if (this.frameTimes.length < 45) return;
    const avg = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    this.frameTimes.length = 0;
    if (avg > 20 && this.dprScale > 0.55) {
      this.dprScale = Math.max(0.55, this.dprScale - 0.15);
      if (this.dprScale < 0.8 && this.scene.environment) this.scene.environment = null;
      this.applySize();
    } else if (avg < 13 && this.dprScale < 1) {
      this.dprScale = Math.min(1, this.dprScale + 0.1);
      this.applySize();
    }
  }

  /**
   * Kugeln aus der Simulation übernehmen (mit Interpolation zwischen den Physik-Schritten).
   * @param {import('../physics/simulation.js').Simulation} sim
   * @param {number} alpha
   * @param {number} dt
   */
  syncBalls(sim, alpha, dt) {
    const R = this.R;
    for (const b of sim.balls) {
      const v = this.balls[b.id];
      if (b.onTable) {
        v.fall = -1;
        v.hidden = false;
        const x = b.px + (b.x - b.px) * alpha, y = b.py + (b.y - b.py) * alpha;
        v.mesh.visible = v.shadow.visible = true;
        v.mesh.position.set(x, R, -y);
        // Physik (x, y, z) → Three (x, z, -y)
        v.mesh.quaternion.set(b.q[0], b.q[2], -b.q[1], b.q[3]);
        v.shadow.position.set(x + 0.006, 0.0008, -y + 0.004);
        if (v.label) { v.label.visible = true; v.label.position.set(x, R * 2.6, -y); }
      } else if (b.pocket >= 0 && !v.hidden) {
        // in die Tasche fallen
        if (v.fall < 0) v.fall = 0;
        v.fall += dt;
        const p = this.table.pockets[b.pocket];
        const k = Math.min(1, v.fall / 0.35);
        v.mesh.position.x += (p.x - v.mesh.position.x) * Math.min(1, dt * 12);
        v.mesh.position.z += (-p.y - v.mesh.position.z) * Math.min(1, dt * 12);
        v.mesh.position.y = R - k * k * 0.12;
        v.shadow.visible = false;
        if (v.label) v.label.visible = false;
        if (k >= 1) { v.hidden = true; v.mesh.visible = false; }
      } else if (!b.onTable && b.pocket < 0) {
        v.mesh.visible = v.shadow.visible = false;
        if (v.label) v.label.visible = false;
      }
    }
  }

  /** Bildschirmpunkt (CSS-Pixel relativ zum Canvas) → Tischkoordinate. */
  pick(px, py) {
    const ndc = new THREE.Vector2((px / this.w) * 2 - 1, -(py / this.h) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const hit = new THREE.Vector3();
    if (!this.raycaster.ray.intersectPlane(this.plane, hit)) return null;
    return { x: hit.x, y: -hit.z };
  }

  /** Tischkoordinate → Bildschirmpunkt (CSS-Pixel). */
  project(x, y) {
    const v = new THREE.Vector3(x, this.R, -y).project(this.camera);
    return { x: ((v.x + 1) / 2) * this.w, y: ((1 - v.y) / 2) * this.h };
  }

  render(dt) {
    this.rig.update(dt);
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.renderer.dispose();
    this.pmrem.dispose();
  }
}
