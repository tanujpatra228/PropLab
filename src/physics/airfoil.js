// PropLab physics. Units: SI internally (metres, newtons, watts) unless a name says otherwise.
import { TAU } from './constants.js';
import { AIRFOIL_COORDS } from './airfoil-data.js';
import { normalizeAirfoil, kulfanFit } from './kulfan.js';
import { isNeuralFoilReady, neuralFoilAero } from './neuralfoil/model.js';

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

// ---------- Airfoil families ----------
export const AIRFOIL_FAMILIES = {
  naca4: { name: 'NACA 4-digit', note: 'Set your own curve and thickness. A classic, well-studied family.', param: true },
  clarky: { name: 'Clark Y', note: 'Flat-bottomed, 11.7% thick. A forgiving classic for props and model planes.' },
  e63: { name: 'Eppler E63', note: 'Thin (4.3%) and strongly curved. Similar to slow-flyer props, great at low speed.' }
};

/** Clockwise outline (TE -> lower -> LE -> upper -> TE) with n points per side, for any family. */
export function airfoilShape(spec, n = 40) {
  if (!spec.family || spec.family === 'naca4') return nacaPoints(spec.camber, spec.thick, n);
  const c = AIRFOIL_COORDS[spec.family];
  let le = 0;
  for (let i = 1; i < c.length; i++) if (c[i][0] < c[le][0]) le = i;
  const upper = c.slice(0, le + 1).reverse(), lower = c.slice(le); // both LE -> TE
  const at = (pts, x) => {
    for (let i = 1; i < pts.length; i++) if (pts[i][0] >= x) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; return y0 + (y1 - y0) * (x - x0) / Math.max(x1 - x0, 1e-9); }
    return pts[pts.length - 1][1];
  };
  const pts = [];
  for (let i = 0; i <= n; i++) { const x = (1 + Math.cos(Math.PI * i / n)) / 2; pts.push([x, at(lower, x)]); }
  for (let i = 1; i <= n; i++) { const x = (1 - Math.cos(Math.PI * i / n)) / 2; pts.push([x, at(upper, x)]); }
  return pts;
}

/** Max thickness and max camber (fractions of chord) of a clockwise outline. */
export function shapeStats(pts) {
  const n = (pts.length - 1) / 2;
  let thick = 0, camber = 0;
  for (let i = 0; i <= n; i++) {
    const lo = pts[i], up = pts[pts.length - 1 - i];
    thick = Math.max(thick, up[1] - lo[1]);
    camber = Math.max(camber, (up[1] + lo[1]) / 2);
  }
  return { thick, camber };
}

// ---------- Lift/drag tables from NeuralFoil ----------
const TABLE_ALPHA = Array.from({ length: 37 }, (_, i) => i - 12);  // -12..24 deg
const TABLE_RE = [1e4, 2e4, 4e4, 8e4, 1.6e5, 3.2e5, 6.4e5, 1.28e6];
const LOG_RE = TABLE_RE.map(Math.log);

/** Evaluate NeuralFoil across angle and Reynolds number once, so the propeller solver can interpolate. */
export function buildPolarTable(pts) {
  const n = normalizeAirfoil(pts.slice().reverse()); // clockwise -> Selig order
  const k = kulfanFit(n.coords);
  const nA = TABLE_ALPHA.length, nR = TABLE_RE.length;
  const cl = new Float64Array(nA * nR), cd = new Float64Array(nA * nR), conf = new Float64Array(nA * nR);
  const aStall = new Float64Array(nR), aNeg = new Float64Array(nR), clMax = new Float64Array(nR), clMin = new Float64Array(nR);
  const a0 = TABLE_ALPHA.indexOf(0);
  for (let r = 0; r < nR; r++) {
    for (let a = 0; a < nA; a++) {
      const o = neuralFoilAero(k, TABLE_ALPHA[a] + n.rotationDeg, TABLE_RE[r] / n.scale);
      const idx = r * nA + a;
      cl[idx] = o.CL; cd[idx] = o.CD; conf[idx] = o.confidence;
    }
    // Stall = the FIRST lift peak above 0 deg. Past it, NeuralFoil's training data (XFOIL) is unreliable
    // and lift often climbs again with low confidence, so polarTable() switches to a post-stall model.
    let s = a0;
    while (s < nA - 1 && cl[r * nA + s + 1] > cl[r * nA + s]) s++;
    let g = a0;
    while (g > 0 && cl[r * nA + g - 1] < cl[r * nA + g]) g--;
    aStall[r] = TABLE_ALPHA[s]; clMax[r] = cl[r * nA + s];
    aNeg[r] = TABLE_ALPHA[g]; clMin[r] = cl[r * nA + g];
  }
  return { cl, cd, conf, aStall, aNeg, clMax, clMin, kulfan: k };
}

// Turn the airfoil shape into a lift/drag model the propeller solver can use.
// Accepts a spec { family, camber, thick } or, for backward compatibility, (camber, thick).
export function airfoilModel(specOrCamber, thickArg) {
  const spec = typeof specOrCamber === 'number' ? { family: 'naca4', camber: specOrCamber, thick: thickArg } : { family: 'naca4', ...specOrCamber };
  const pts = airfoilShape(spec, 40);
  const { thick, camber } = shapeStats(pts);
  const c0 = panelSolve(pts, 0).cl, c4 = panelSolve(pts, 4 * Math.PI / 180).cl;
  const visc = 0.85;
  const cla = (c4 - c0) / (4 * Math.PI / 180) * visc;
  const cl0 = c0 * visc;
  const clmaxBase = 1.25 + 6 * camber + 1.5 * (thick - 0.06) - 4 * Math.max(0, thick - 0.13);
  const table = isNeuralFoilReady() ? buildPolarTable(pts) : null;
  return { spec, cla, cl0, clmaxBase, camber, thick, pts, table, source: table ? 'neuralfoil' : 'classic' };
}

/** Prandtl-Glauert compressibility factor for lift at tip Mach numbers below ~0.8. */
const pg = mach => 1 / Math.sqrt(1 - Math.min(mach, 0.8) ** 2);

/** Lift and drag coefficients. alpha in radians. Uses the NeuralFoil table when present, else the classic model. */
export function polar(af, alpha, Re, mach = 0) {
  return af.table ? polarTable(af.table, alpha, Re, mach) : polarClassic(af, alpha, Re, mach);
}

function bilAt(arr, r, tr, aDeg, nA) {
  const ac = Math.min(Math.max(aDeg, TABLE_ALPHA[0]), TABLE_ALPHA[nA - 1]);
  const a = Math.min(Math.floor(ac - TABLE_ALPHA[0]), nA - 2), ta = ac - TABLE_ALPHA[a];
  const i0 = r * nA + a, i1 = (r + 1) * nA + a;
  return (arr[i0] * (1 - ta) + arr[i0 + 1] * ta) * (1 - tr) + (arr[i1] * (1 - ta) + arr[i1 + 1] * ta) * tr;
}

function polarTable(t, alpha, Re, mach) {
  const aDeg = alpha * 180 / Math.PI, nA = TABLE_ALPHA.length, nR = TABLE_RE.length;
  const lr = Math.min(Math.max(Math.log(Math.max(Re, 1)), LOG_RE[0]), LOG_RE[nR - 1]);
  let r = 0; while (r < nR - 2 && LOG_RE[r + 1] < lr) r++;
  const tr = (lr - LOG_RE[r]) / (LOG_RE[r + 1] - LOG_RE[r]);
  const ac = Math.min(Math.max(aDeg, TABLE_ALPHA[0]), TABLE_ALPHA[nA - 1]);
  const a = Math.min(Math.floor(ac - TABLE_ALPHA[0]), nA - 2), ta = ac - TABLE_ALPHA[a];
  const bil = arr => {
    const i0 = r * nA + a, i1 = (r + 1) * nA + a;
    return (arr[i0] * (1 - ta) + arr[i0 + 1] * ta) * (1 - tr) + (arr[i1] * (1 - ta) + arr[i1 + 1] * ta) * tr;
  };
  const lerpR = arr => arr[r] + (arr[r + 1] - arr[r]) * tr;
  const aStall = lerpR(t.aStall), aNeg = lerpR(t.aNeg);
  let cl, cd, stalled = false;
  const fpCl = 1.05 * Math.sin(2 * alpha), fpCd = 0.02 + 1.9 * Math.sin(alpha) ** 2;
  if (aDeg > aStall || aDeg < aNeg) {
    // Post-stall: lift falls from its peak toward flat-plate values; drag rises toward flat-plate drag.
    stalled = true;
    const up = aDeg > aStall, edge = up ? aStall : aNeg, peak = up ? lerpR(t.clMax) : lerpR(t.clMin);
    const past = Math.abs(aDeg - edge);
    cl = up ? Math.max(fpCl, peak - 0.025 * past) : Math.min(fpCl, peak + 0.025 * past);
    const cdEdge = bilAt(t.cd, r, tr, edge, nA);
    cd = Math.max(cdEdge + 0.004 * past, fpCd * Math.min(1, past / 12) + cdEdge * Math.max(0, 1 - past / 12));
  } else {
    cl = bil(t.cl); cd = bil(t.cd);
  }
  if (!stalled) cl *= pg(mach);
  return { cl, cd, stalled, aStall: aStall * Math.PI / 180 };
}

function polarClassic(af, alpha, Re, mach) {
  const reF = 0.8 + 0.2 * Math.min(1, Re / 2e5);
  const clmax = af.clmaxBase * reF, clmin = -0.55 * reF;
  const lin = af.cl0 + af.cla * alpha;
  const aStall = (clmax - af.cl0) / af.cla, aNeg = (clmin - af.cl0) / af.cla;
  const fp = 1.05 * Math.sin(2 * alpha);
  let cl, stalled = false;
  if (alpha > aStall) { cl = Math.max(fp, clmax - 1.4 * (alpha - aStall)); stalled = true; }
  else if (alpha < aNeg) { cl = Math.min(fp, clmin + 1.4 * (aNeg - alpha)); stalled = true; }
  else cl = lin * pg(mach);
  const cdmin = (0.006 + 3.0 / Math.sqrt(Math.max(Re, 8e3))) * (1 + 1.6 * (af.thick - 0.09));
  let cd = cdmin + 0.018 * (Math.min(Math.max(lin, clmin), clmax) - (0.25 + 4 * af.camber)) ** 2;
  if (stalled) cd = Math.max(cd, cdmin + 1.8 * Math.sin(alpha) ** 2);
  return { cl, cd, stalled, aStall };
}
