// Wind tunnel: live 2D airflow around the blade cross-section at 75% span.
// The velocity field comes from the panel method on a coarse grid; particles are advected through it.
import { app } from '../state.js';
import { T, hexToRgb255, mix } from '../lib/theme.js';
import { fmt } from '../lib/format.js';
import { nacaPoints, panelSolve, polar } from '../physics/index.js';

const deg = Math.PI / 180;
const TW = 120, TH = 60;                         // field grid resolution
const X0 = -0.55, X1 = 1.75, Y0 = -0.575, Y1 = 0.575; // view window in chord lengths
const NPT = 380, TL = 9;                          // particles, trail length

const F = { u: new Float32Array(TW * TH), v: new Float32Array(TW * TH), s: new Float32Array(TW * TH), mask: new Uint8Array(TW * TH), poly: [], ready: false, key: '', cl: 0, stalled: false };
const tp = { x: new Float32Array(NPT), y: new Float32Array(NPT), hx: new Float32Array(NPT * TL), hy: new Float32Array(NPT * TL), age: new Float32Array(NPT) };
let canvas, ctx, statsEl, rampEl, lockEl, aoaEl, off, octx, cw = 0, ch = 0;

export function initTunnel({ canvas: c, stats, ramp, lock, aoa }) {
  canvas = c; ctx = c.getContext('2d'); statsEl = stats; rampEl = ramp; lockEl = lock; aoaEl = aoa;
  off = document.createElement('canvas'); off.width = TW; off.height = TH; octx = off.getContext('2d');
  for (let i = 0; i < NPT; i++) respawn(i, true);
  lockEl.addEventListener('change', () => { aoaEl.disabled = lockEl.checked; updateTunnel(); });
  aoaEl.addEventListener('input', updateTunnel);
  new ResizeObserver(() => {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    cw = canvas.clientWidth; ch = canvas.clientHeight;
    canvas.width = cw * dpr; canvas.height = ch * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }).observe(canvas);
}

/** Force the field to be rebuilt (e.g. after a theme change). */
export function invalidateTunnel() { F.key = ''; }

function respawn(i, anywhere) {
  const x = anywhere ? X0 + Math.random() * (X1 - X0) : X0 + Math.random() * 0.05;
  const y = Y0 + 0.02 + Math.random() * (Y1 - Y0 - 0.04);
  tp.x[i] = x; tp.y[i] = y; tp.age[i] = 0;
  for (let k = 0; k < TL; k++) { tp.hx[i * TL + k] = x; tp.hy[i * TL + k] = y; }
}

function inPoly(x, y, pts) {
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) c = !c;
  }
  return c;
}

export function updateTunnel() {
  const R = app.R;
  if (!R) return;
  const locked = lockEl.checked, s75 = R.perf.s75;
  const alphaDeg = locked ? s75.alpha / deg : parseFloat(aoaEl.value);
  if (locked) aoaEl.value = alphaDeg.toFixed(1);
  const p = polar(R.af, alphaDeg * deg, locked ? s75.Re : 1.2e5);
  F.cl = p.cl; F.stalled = p.stalled;
  const margin = p.aStall / deg - alphaDeg;
  const state = p.stalled ? `<b style="color:${T.crit}">Stalled</b>` : margin < 3 ? `<b style="color:${T.warn}">Near stall</b>` : `<b style="color:${T.good}">Smooth flow</b>`;
  statsEl.innerHTML = `<span>Angle to the air <b>${fmt(alphaDeg, 1)}°</b></span><span>Lift strength (Cl) <b>${fmt(p.cl, 2)}</b></span><span>Stalls at <b>${fmt(p.aStall / deg, 1)}°</b></span><span>${state}</span>`;
  const key = [R.d.camber, R.d.thick, alphaDeg.toFixed(2), p.stalled].join('|');
  if (key !== F.key) { F.key = key; buildField(R.d.camber, R.d.thick, alphaDeg * deg, p.stalled); }
}

function buildField(camber, thick, a, stalled) {
  const pts = nacaPoints(camber, thick, 30), sol = panelSolve(pts, a);
  const ca = Math.cos(a), sa = Math.sin(a), ta = Math.tan(Math.max(a, 0));
  // Display keeps the flow horizontal and tilts the airfoil nose-up by alpha about its quarter chord.
  F.poly = pts.map(([ax, ay]) => [0.25 + (ax - 0.25) * ca + ay * sa, -(ax - 0.25) * sa + ay * ca]);
  for (let j = 0; j < TH; j++) for (let i = 0; i < TW; i++) {
    const X = X0 + (i + 0.5) / TW * (X1 - X0), Y = Y1 - (j + 0.5) / TH * (Y1 - Y0);
    const ax = 0.25 + (X - 0.25) * ca - Y * sa, ay = (X - 0.25) * sa + Y * ca, k = j * TW + i;
    if (inPoly(ax, ay, pts)) { F.mask[k] = 1; F.u[k] = 0; F.v[k] = 0; F.s[k] = 0; continue; }
    const [u, v] = sol.velocity(ax, ay);
    let du = u * ca + v * sa, dv = -u * sa + v * ca, m = 0;
    // Stall is not captured by the inviscid panel method, so a separated wake is sketched in.
    if (stalled && ax > 0.28 && ax < 2.2 && ay > -0.01 && ay < 0.06 + (ax - 0.28) * ta * 0.95) { m = 2; du *= 0.22; dv *= 0.22; }
    F.mask[k] = m; F.u[k] = du; F.v[k] = dv; F.s[k] = Math.hypot(du, dv);
  }
  paintField(); F.ready = true;
}

function paintField() {
  const img = octx.createImageData(TW, TH), D = img.data;
  const base = hexToRgb255(T['scope-2']), slow = [40, 92, 190], fast = hexToRgb255(T.accent), dead = [70, 76, 84];
  for (let k = 0; k < TW * TH; k++) {
    let c;
    if (F.mask[k] === 1) c = base;
    else if (F.mask[k] === 2) c = mix(dead, base, 0.35);
    else { const s = F.s[k]; c = s < 1 ? mix(base, slow, Math.min(1, (1 - s) * 1.6)) : mix(base, fast, Math.min(1, (s - 1) / 0.75)); }
    D[k * 4] = c[0]; D[k * 4 + 1] = c[1]; D[k * 4 + 2] = c[2]; D[k * 4 + 3] = 255;
  }
  octx.putImageData(img, 0, 0);
  rampEl.style.background = `linear-gradient(90deg, rgb(${slow}), ${T['scope-2']}, ${T.accent})`;
}

function sample(X, Y) {
  const fx = (X - X0) / (X1 - X0) * TW - 0.5, fy = (Y1 - Y) / (Y1 - Y0) * TH - 0.5;
  const i = Math.max(0, Math.min(TW - 2, Math.floor(fx))), j = Math.max(0, Math.min(TH - 2, Math.floor(fy)));
  const tx = Math.min(1, Math.max(0, fx - i)), ty = Math.min(1, Math.max(0, fy - j)), k = j * TW + i;
  const at = arr => (arr[k] * (1 - tx) + arr[k + 1] * tx) * (1 - ty) + (arr[k + TW] * (1 - tx) + arr[k + TW + 1] * tx) * ty;
  const mk = F.mask[Math.round(fy) * TW + Math.round(fx)] ?? 0;
  return [at(F.u), at(F.v), mk];
}

export function tunnelFrame(dt) {
  if (!F.ready || !cw) return;
  const W = cw, H = ch, px = X => (X - X0) / (X1 - X0) * W, py = Y => (Y1 - Y) / (Y1 - Y0) * H;
  const font = getComputedStyle(document.body).fontFamily;
  ctx.imageSmoothingEnabled = true; ctx.drawImage(off, 0, 0, W, H);
  const step = app.flow.paused ? 0 : dt * 0.55;
  ctx.lineCap = 'round';
  for (let i = 0; i < NPT; i++) {
    if (step > 0) {
      const [u, v, mk] = sample(tp.x[i], tp.y[i]);
      if (mk === 1) { respawn(i, false); continue; }
      let nx = tp.x[i] + u * step, ny = tp.y[i] + v * step;
      if (mk === 2) { nx += (Math.random() - 0.5) * 0.02; ny += (Math.random() - 0.5) * 0.02; }
      tp.x[i] = nx; tp.y[i] = ny; tp.age[i] += dt;
      for (let k = TL - 1; k > 0; k--) { tp.hx[i * TL + k] = tp.hx[i * TL + k - 1]; tp.hy[i * TL + k] = tp.hy[i * TL + k - 1]; }
      tp.hx[i * TL] = nx; tp.hy[i * TL] = ny;
      if (nx > X1 || ny < Y0 || ny > Y1 || nx < X0 - 0.05) { respawn(i, false); continue; }
    }
    ctx.strokeStyle = `rgba(235,245,252,${0.55 * Math.min(1, tp.age[i] * 3)})`; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(px(tp.hx[i * TL]), py(tp.hy[i * TL]));
    for (let k = 1; k < TL; k++) ctx.lineTo(px(tp.hx[i * TL + k]), py(tp.hy[i * TL + k]));
    ctx.stroke();
  }
  // airfoil body
  ctx.beginPath(); F.poly.forEach(([x, y], k) => (k ? ctx.lineTo(px(x), py(y)) : ctx.moveTo(px(x), py(y)))); ctx.closePath();
  ctx.fillStyle = T['scope-line']; ctx.fill(); ctx.strokeStyle = T['scope-ink']; ctx.lineWidth = 1.2; ctx.stroke();
  // lift arrow
  const ax = px(0.25), ay = py(0.06), len = Math.max(-1, Math.min(1.8, F.cl)) * H * 0.22;
  if (Math.abs(len) > 3) {
    ctx.strokeStyle = T.accent; ctx.fillStyle = T.accent; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax, ay - len); ctx.stroke();
    const dir = Math.sign(len);
    ctx.beginPath(); ctx.moveTo(ax, ay - len - dir * 8); ctx.lineTo(ax - 6, ay - len + dir * 2); ctx.lineTo(ax + 6, ay - len + dir * 2); ctx.closePath(); ctx.fill();
    ctx.font = `600 12px ${font}`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText('Lift', ax + 10, ay - len * 0.7);
  }
  ctx.font = `11px ${font}`; ctx.fillStyle = T['scope-dim']; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillText('Air flows this way →', 10, 8);
  if (F.stalled) { ctx.fillStyle = T.crit; ctx.textAlign = 'right'; ctx.fillText('Air breaks away from the top: stall', W - 10, 8); }
}
