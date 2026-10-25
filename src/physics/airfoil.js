// PropLab physics. Units: SI internally (metres, newtons, watts) unless a name says otherwise.
import { TAU } from './constants.js';

// ---------- 2D airfoil: NACA 4-digit + Hess-Smith panel method ----------
/** NACA 4-digit airfoil outline, ordered TE -> lower -> LE -> upper -> TE (clockwise). */
export function nacaPoints(camber, thick, n) {
  const p = 0.4, m = camber, t = thick;
  const yt = x => 5 * t * (0.2969 * Math.sqrt(x) - 0.1260 * x - 0.3516 * x * x + 0.2843 * x ** 3 - 0.1036 * x ** 4);
  const yc = x => m === 0 ? 0 : (x < p ? m / (p * p) * (2 * p * x - x * x) : m / ((1 - p) ** 2) * ((1 - 2 * p) + 2 * p * x - x * x));
  const dyc = x => m === 0 ? 0 : (x < p ? 2 * m / (p * p) * (p - x) : 2 * m / ((1 - p) ** 2) * (p - x));
  const pts = [];
  for (let i = 0; i <= n; i++) { const x = (1 + Math.cos(Math.PI * i / n)) / 2, th = Math.atan(dyc(x)); pts.push([x + yt(x) * Math.sin(th), yc(x) - yt(x) * Math.cos(th)]); }
  for (let i = 1; i <= n; i++) { const x = (1 - Math.cos(Math.PI * i / n)) / 2, th = Math.atan(dyc(x)); pts.push([x - yt(x) * Math.sin(th), yc(x) + yt(x) * Math.cos(th)]); }
  return pts;
}

function solveLinear(A, b) {
  const n = b.length;
  for (let k = 0; k < n; k++) {
    let p = k;
    for (let i = k + 1; i < n; i++) if (Math.abs(A[i][k]) > Math.abs(A[p][k])) p = i;
    [A[k], A[p]] = [A[p], A[k]]; [b[k], b[p]] = [b[p], b[k]];
    for (let i = k + 1; i < n; i++) {
      const f = A[i][k] / A[k][k];
      for (let j = k; j < n; j++) A[i][j] -= f * A[k][j];
      b[i] -= f * b[k];
    }
  }
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) { let s = b[i]; for (let j = i + 1; j < n; j++) s -= A[i][j] * x[j]; x[i] = s / A[i][i]; }
  return x;
}

/** Hess-Smith panel method (constant source + uniform vortex, Kutta condition). alpha in radians. */
export function panelSolve(pts, alpha) {
  const N = pts.length - 1;
  const P = { N, x1: [], y1: [], L: [], tx: [], ty: [], nx: [], ny: [], xc: [], yc: [] };
  for (let j = 0; j < N; j++) {
    const [ax, ay] = pts[j], [bx, by] = pts[j + 1];
    const L = Math.hypot(bx - ax, by - ay), tx = (bx - ax) / L, ty = (by - ay) / L;
    P.x1.push(ax); P.y1.push(ay); P.L.push(L); P.tx.push(tx); P.ty.push(ty);
    P.nx.push(-ty); P.ny.push(tx); P.xc.push((ax + bx) / 2); P.yc.push((ay + by) / 2);
  }
  const ua = Math.cos(alpha), va = Math.sin(alpha);
  const out = [0, 0, 0, 0];
  const infl = (px, py, j, self) => {
    let us, vs;
    if (self) { us = 0; vs = 0.5; }
    else {
      const dx = px - P.x1[j], dy = py - P.y1[j];
      const xp = dx * P.tx[j] + dy * P.ty[j], yp = dx * P.nx[j] + dy * P.ny[j], L = P.L[j];
      us = 0.5 * Math.log((xp * xp + yp * yp) / ((xp - L) * (xp - L) + yp * yp)) / TAU;
      vs = (Math.atan2(yp, xp - L) - Math.atan2(yp, xp)) / TAU;
    }
    out[0] = us * P.tx[j] + vs * P.nx[j]; out[1] = us * P.ty[j] + vs * P.ny[j];
    out[2] = -vs * P.tx[j] + us * P.nx[j]; out[3] = -vs * P.ty[j] + us * P.ny[j];
    return out;
  };
  const A = [], b = [];
  for (let i = 0; i < N; i++) {
    const row = new Array(N + 1).fill(0);
    for (let j = 0; j < N; j++) {
      const o = infl(P.xc[i], P.yc[i], j, i === j);
      row[j] = o[0] * P.nx[i] + o[1] * P.ny[i];
      row[N] += o[2] * P.nx[i] + o[3] * P.ny[i];
    }
    A.push(row); b.push(-(ua * P.nx[i] + va * P.ny[i]));
  }
  const kr = new Array(N + 1).fill(0);
  for (const i of [0, N - 1]) {
    for (let j = 0; j < N; j++) {
      const o = infl(P.xc[i], P.yc[i], j, i === j);
      kr[j] += o[0] * P.tx[i] + o[1] * P.ty[i];
      kr[N] += o[2] * P.tx[i] + o[3] * P.ty[i];
    }
  }
  A.push(kr); b.push(-(ua * (P.tx[0] + P.tx[N - 1]) + va * (P.ty[0] + P.ty[N - 1])));
  const sol = solveLinear(A, b);
  const sigma = sol.slice(0, N), gamma = sol[N];
  let fx = 0, fy = 0; const cp = [];
  for (let i = 0; i < N; i++) {
    let vt = ua * P.tx[i] + va * P.ty[i];
    for (let j = 0; j < N; j++) { const o = infl(P.xc[i], P.yc[i], j, i === j); vt += sigma[j] * (o[0] * P.tx[i] + o[1] * P.ty[i]) + gamma * (o[2] * P.tx[i] + o[3] * P.ty[i]); }
    const c = 1 - vt * vt; cp.push(c);
    fx -= c * P.L[i] * P.nx[i]; fy -= c * P.L[i] * P.ny[i];
  }
  const cl = -fx * Math.sin(alpha) + fy * Math.cos(alpha);
  const velocity = (px, py) => {
    let u = ua, v = va;
    for (let j = 0; j < N; j++) { const o = infl(px, py, j, false); u += sigma[j] * o[0] + gamma * o[2]; v += sigma[j] * o[1] + gamma * o[3]; }
    return [u, v];
  };
  return { cl, cp, velocity, panels: P };
}

// Turn the airfoil shape into a lift/drag model the propeller solver can use
export function airfoilModel(camber, thick) {
  const pts = nacaPoints(camber, thick, 40);
  const c0 = panelSolve(pts, 0).cl, c4 = panelSolve(pts, 4 * Math.PI / 180).cl;
  const visc = 0.85;
  const cla = (c4 - c0) / (4 * Math.PI / 180) * visc;
  const cl0 = c0 * visc;
  const clmaxBase = 1.25 + 6 * camber + 1.5 * (thick - 0.06) - 4 * Math.max(0, thick - 0.13);
  return { cla, cl0, clmaxBase, camber, thick, pts };
}

/** Lift and drag coefficients with an empirical stall and low-Reynolds model. */
export function polar(af, alpha, Re) {
  const reF = 0.8 + 0.2 * Math.min(1, Re / 2e5);
  const clmax = af.clmaxBase * reF, clmin = -0.55 * reF;
  const lin = af.cl0 + af.cla * alpha;
  const aStall = (clmax - af.cl0) / af.cla, aNeg = (clmin - af.cl0) / af.cla;
  const fp = 1.05 * Math.sin(2 * alpha);
  let cl, stalled = false;
  if (alpha > aStall) { cl = Math.max(fp, clmax - 1.4 * (alpha - aStall)); stalled = true; }
  else if (alpha < aNeg) { cl = Math.min(fp, clmin + 1.4 * (aNeg - alpha)); stalled = true; }
  else cl = lin;
  const cdmin = (0.006 + 3.0 / Math.sqrt(Math.max(Re, 8e3))) * (1 + 1.6 * (af.thick - 0.09));
  let cd = cdmin + 0.018 * (Math.min(Math.max(lin, clmin), clmax) - (0.25 + 4 * af.camber)) ** 2;
  if (stalled) cd = Math.max(cd, cdmin + 1.8 * Math.sin(alpha) ** 2);
  return { cl, cd, stalled, aStall };
}
