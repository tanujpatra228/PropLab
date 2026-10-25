// Spin rig: 3D propeller with slipstream particles driven by the BEMT induced velocities.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { app } from '../state.js';
import { T, hexToRgb01 } from '../lib/theme.js';
import { fmt } from '../lib/format.js';
import { airfoilShape, polar, chordRatio, bladeAngle } from '../physics/index.js';

const deg = Math.PI / 180;
const NP = 2200;      // airflow particles
const SLOW_MO = 40;   // visual slow-motion factor for spin
let rig = null, viewerEl, legendEl;

export function initSpinRig(viewer, legend) {
  viewerEl = viewer; legendEl = legend;
  try {
    // Keep the classic (non color-managed) look so vertex colors render as authored.
    THREE.ColorManagement.enabled = false;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    viewer.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.05, 2000);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.dampingFactor = 0.08;
    scene.add(new THREE.HemisphereLight(0xdfeaf2, 0x1a242c, 0.9 * Math.PI));
    const key = new THREE.DirectionalLight(0xffffff, 0.9 * Math.PI); key.position.set(3, 6, 4); scene.add(key);
    const rimL = new THREE.DirectionalLight(0x9fd6ff, 0.35 * Math.PI); rimL.position.set(-4, -2, -3); scene.add(rimL);
    const propGroup = new THREE.Group(); scene.add(propGroup);
    const ring = new THREE.LineLoop(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ transparent: true, opacity: 0.35 }));
    scene.add(ring);

    const pos = new Float32Array(NP * 3), col = new Float32Array(NP * 3);
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    pGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const pMat = new THREE.PointsMaterial({ size: 0.25, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, map: dotTexture(), sizeAttenuation: true });
    const points = new THREE.Points(pGeo, pMat); scene.add(points);

    rig = { renderer, scene, camera, controls, propGroup, ring, points, pos, col, pMat,
      parts: { rd: new Float32Array(NP), th: new Float32Array(NP), z: new Float32Array(NP) },
      mesh: null, hub: null, motor: null, geoKey: '', Rin: 5, lastFit: null, seeded: false, spin: 0 };
    new ResizeObserver(resize).observe(viewer); resize();
  } catch (e) {
    console.error(e);
    viewer.innerHTML = '<div class="no3d">This browser could not start 3D graphics. The readouts below still work.</div>';
    rig = null;
  }
}

function dotTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 32;
  const g = c.getContext('2d'), grd = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.4, 'rgba(255,255,255,0.6)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 32, 32);
  return new THREE.CanvasTexture(c);
}

function resize() {
  if (!rig) return;
  const w = viewerEl.clientWidth, h = viewerEl.clientHeight;
  rig.renderer.setSize(w, h, false); rig.camera.aspect = w / h; rig.camera.updateProjectionMatrix();
}

export function fitCamera(force) {
  if (!rig) return;
  const Rin = app.S.design.diaIn / 2, c = rig.camera, ctl = rig.controls;
  const target = new THREE.Vector3(0, -0.25 * Rin, 0);
  let offset;
  if (!rig.lastFit || force) {
    // Fit a sphere around the prop disc and its slipstream into the narrower field of view.
    const vHalf = THREE.MathUtils.degToRad(c.fov) / 2;
    const hHalf = Math.atan(Math.tan(vHalf) * Math.max(c.aspect, 0.1));
    const dist = (1.35 * Rin) / Math.sin(Math.min(vHalf, hHalf));
    offset = new THREE.Vector3(1.9, 1.25, 2.45).normalize().multiplyScalar(dist);
  } else {
    // Size changed: keep the user's viewing angle and zoom, scaled to the new prop.
    offset = c.position.clone().sub(ctl.target).multiplyScalar(Rin / rig.lastFit);
  }
  c.position.copy(target).add(offset);
  ctl.target.copy(target); ctl.minDistance = Rin * 0.8; ctl.maxDistance = Rin * 12; ctl.update();
  rig.lastFit = Rin;
}

/** Loft blade sections (NACA profile scaled by chord, twisted to the local pitch angle) for every blade. */
function buildPropGeometry(d, spec) {
  const Rin = d.diaIn / 2, B = d.blades;
  const sec = airfoilShape(spec, 12), nP = sec.length, nS = 30, rHub = 0.12;
  const verts = [], idx = [], xs = [];
  for (let b = 0; b < B; b++) {
    const th = b * Math.PI * 2 / B, er = [Math.cos(th), 0, -Math.sin(th)], et = [-Math.sin(th), 0, -Math.cos(th)];
    const off = verts.length / 3;
    for (let s = 0; s < nS; s++) {
      const x = rHub + (1 - rHub) * (s / (nS - 1)), r = x * Rin;
      let c = chordRatio(d, Math.max(x, 0.15)) * Rin;
      if (x > 0.96) c *= Math.sqrt(Math.max(0.05, (1 - x) / 0.04)) * 0.7 + 0.3 * (1 - (x - 0.96) / 0.04); // rounded tip
      const beta = bladeAngle(d, Math.max(x, 0.15)), cb = Math.cos(beta), sb = Math.sin(beta);
      for (let k = 0; k < nP; k++) {
        const [u, w] = sec[k], t0 = (0.3 - u) * c, y0 = w * c;
        const tt = t0 * cb - y0 * sb, yy = t0 * sb + y0 * cb;
        verts.push(r * er[0] + tt * et[0], yy, r * er[2] + tt * et[2]); xs.push(x);
      }
    }
    for (let s = 0; s < nS - 1; s++) for (let k = 0; k < nP - 1; k++) {
      const a = off + s * nP + k, b2 = a + 1, c2 = a + nP, d2 = c2 + 1;
      idx.push(a, c2, b2, b2, c2, d2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(new Array(verts.length).fill(1), 3));
  g.setIndex(idx); g.computeVertexNormals();
  g.userData.xs = xs;
  return g;
}

const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

export function setColorMode(mode) { app.colorMode = mode; if (rig) colorProp(); }

function colorProp() {
  const m = rig.mesh; if (!m) return;
  const R = app.R, mode = app.colorMode, S = app.S;
  const xs = m.geometry.userData.xs, colA = m.geometry.getAttribute('color'), st = R.perf.st;
  const maxTp = Math.max(...st.map(s => s.Tp), 1e-6);
  const matCol = R.mat.color, tip = hexToRgb01(T.accent);
  const cold = [0.12, 0.26, 0.42], mid = [0.3, 0.75, 0.95], hot = hexToRgb01(T.accent);
  const good = hexToRgb01(T.good), warn = hexToRgb01(T.warn), crit = hexToRgb01(T.crit);
  const at = x => { if (x <= st[0].x) return st[0]; for (let i = 1; i < st.length; i++) if (st[i].x >= x) return st[i]; return st[st.length - 1]; };
  for (let i = 0; i < xs.length; i++) {
    const x = xs[i]; let c;
    if (mode === 'material') c = x > 0.93 ? tip : matCol;
    else if (mode === 'lift') { const t = Math.max(0, at(x).Tp) / maxTp; c = t < 0.5 ? lerp3(cold, mid, t * 2) : lerp3(mid, hot, (t - 0.5) * 2); }
    else {
      const s = at(x), p = polar(R.af, s.alpha, s.Re), margin = (p.aStall - s.alpha) / deg;
      c = p.stalled ? crit : margin < 3 ? lerp3(warn, crit, 1 - margin / 3) : margin < 7 ? lerp3(good, warn, 1 - (margin - 3) / 4) : good;
    }
    colA.setXYZ(i, c[0], c[1], c[2]);
  }
  colA.needsUpdate = true;
  m.material.metalness = mode === 'material' && S.design.material === 'alu' ? 0.7 : 0.1;
  m.material.roughness = mode === 'material' && S.design.material === 'carbon' ? 0.35 : 0.55;
  if (mode === 'lift') legendEl.innerHTML = `<span>low lift</span><span class="ramp" style="background:linear-gradient(90deg,rgb(31,66,107),rgb(77,191,242),${T.accent})"></span><span>high lift</span>`;
  else if (mode === 'stall') legendEl.innerHTML = `<span>safe</span><span class="ramp" style="background:linear-gradient(90deg,${T.good},${T.warn},${T.crit})"></span><span>stalled</span>`;
  else legendEl.innerHTML = '<span>Tips painted orange, like real props</span>';
}

/** Rebuild geometry if the shape changed, then recolor. Returns overlay figures. */
export function updateProp() {
  if (!rig) return;
  const R = app.R, d = R.d, key = JSON.stringify([d.diaIn, d.pitchIn, d.blades, d.chordPct, d.geometry || null, R.af.spec]);
  if (key !== rig.geoKey) {
    const grp = rig.propGroup;
    if (rig.mesh) { grp.remove(rig.mesh); rig.mesh.geometry.dispose(); }
    if (rig.hub) grp.remove(rig.hub);
    if (rig.motor) grp.remove(rig.motor);
    rig.mesh = new THREE.Mesh(buildPropGeometry(d, R.af.spec), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.1, side: THREE.DoubleSide }));
    grp.add(rig.mesh);
    const Rin = d.diaIn / 2, hubH = Math.max(0.16 * Rin * chordRatio(d, 0.75) / 0.18, 0.25);
    rig.hub = new THREE.Mesh(new THREE.CylinderGeometry(0.13 * Rin, 0.13 * Rin, hubH, 32), new THREE.MeshStandardMaterial({ color: 0x2a3138, roughness: 0.4, metalness: 0.5 }));
    rig.motor = new THREE.Mesh(new THREE.CylinderGeometry(0.16 * Rin, 0.16 * Rin, 0.22 * Rin, 32), new THREE.MeshStandardMaterial({ color: 0x3b444d, roughness: 0.5, metalness: 0.6 }));
    rig.motor.position.y = -hubH / 2 - 0.11 * Rin;
    grp.add(rig.hub, rig.motor);
    const rp = [];
    for (let i = 0; i < 96; i++) { const a = i / 96 * Math.PI * 2; rp.push(Math.cos(a) * Rin, 0, Math.sin(a) * Rin); }
    rig.ring.geometry.setAttribute('position', new THREE.Float32BufferAttribute(rp, 3));
    rig.pMat.size = Rin * 0.05;
    const sizeChanged = rig.Rin !== Rin;
    rig.Rin = Rin; rig.geoKey = key;
    if (sizeChanged || !rig.seeded) { seedParticles(); fitCamera(!rig.lastFit); rig.seeded = true; }
  }
  rig.ring.material.color.set(T['scope-dim']);
  rig.scene.background = new THREE.Color(T.scope);
  colorProp();
}

function seedParticles() {
  const p = rig.parts, Rin = rig.Rin;
  for (let i = 0; i < NP; i++) { p.rd[i] = Math.sqrt(0.03 + Math.random() * 0.97); p.th[i] = Math.random() * Math.PI * 2; p.z[i] = -1.5 * Rin + Math.random() * 4.1 * Rin; }
}

function viAt(rd) {
  const st = app.R.perf.st;
  if (rd <= st[0].x) return st[0].vi * rd / st[0].x * 0.6;
  for (let i = 1; i < st.length; i++) if (st[i].x >= rd) return st[i].vi;
  return st[st.length - 1].vi * 0.5;
}
function vtAt(rd) { const st = app.R.perf.st; for (let i = 0; i < st.length; i++) if (st[i].x >= rd) return st[i].vt; return 0; }

export function spinFrame(dt) {
  if (!rig || !app.R) return;
  const Rin = rig.Rin, p = rig.parts, pos = rig.pos, col = rig.col, paused = app.flow.paused;
  if (!paused) rig.spin += Math.min(4, app.S.rpm / 60 / SLOW_MO) * Math.PI * 2 * dt;
  rig.propGroup.rotation.y = rig.spin;
  rig.points.visible = app.flow.on;
  if (app.flow.on) {
    // Actuator-disk slipstream: v(z) = vi * (1 + z / sqrt(z^2 + R^2)), tube radius from mass conservation.
    // V = flight speed through the disc (0 when hovering); slipstream speed is V + induced velocity.
    const Vf = app.R.perf.V || 0;
    const vMax = Math.max(...app.R.perf.st.map(s => Vf + 2 * s.vi), 0.5), K = Rin / 6, flowC = hexToRgb01(T.flow);
    for (let i = 0; i < NP; i++) {
      const rd = p.rd[i], vi = Math.max(viAt(rd), Vf > 0 ? -0.45 * Vf : 0.06 * vMax);
      const z = p.z[i], v = Math.max(Vf + vi * (1 + z / Math.sqrt(z * z + Rin * Rin)), 0.05 * vMax);
      const r = Math.min(rd * Rin * Math.sqrt(Math.max(Vf + vi, 0.05 * vMax) / v), 3 * Rin);
      if (!paused) {
        p.z[i] += v * K * dt;
        if (z > 0) p.th[i] += (vtAt(rd) / Math.max(v, 0.1)) * (v * K * dt) / Math.max(r, 0.2 * Rin) * 0.8;
        if (p.z[i] > 2.6 * Rin) { p.z[i] = -1.5 * Rin - Math.random() * 0.3 * Rin; p.th[i] = Math.random() * Math.PI * 2; p.rd[i] = Math.sqrt(0.03 + Math.random() * 0.97); }
      }
      pos[i * 3] = r * Math.cos(p.th[i]); pos[i * 3 + 1] = -p.z[i]; pos[i * 3 + 2] = -r * Math.sin(p.th[i]);
      const t = Math.min(1, v / vMax);
      const fade = Math.min(1, (p.z[i] + 1.5 * Rin) / (0.4 * Rin)) * Math.min(1, (2.6 * Rin - p.z[i]) / (0.5 * Rin));
      const br = (0.38 + 0.62 * t) * Math.max(0, fade);
      col[i * 3] = flowC[0] * br + t * t * 0.4 * br; col[i * 3 + 1] = flowC[1] * br + t * t * 0.3 * br; col[i * 3 + 2] = flowC[2] * br;
    }
    rig.points.geometry.attributes.position.needsUpdate = true;
    rig.points.geometry.attributes.color.needsUpdate = true;
  }
  rig.controls.update();
  rig.renderer.render(rig.scene, rig.camera);
}

/** Figures for the overlay under the 3D view */
export function overlayFigures() {
  const R = app.R, vMean = R.perf.st.reduce((a, s) => a + s.vi, 0) / R.perf.st.length;
  return { dia: `${fmt(app.S.design.diaIn, 1)} in`, flow: `${fmt(Math.max(0, (R.perf.V || 0) + vMean * 2) * 3.6)} km/h`, tip: `${fmt(R.perf.Om * R.perf.R * 3.6)} km/h` };
}
