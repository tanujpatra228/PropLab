// Kulfan (CST) airfoil parameterization: the shape description NeuralFoil expects.
// Port of AeroSandbox's `Airfoil.normalize()` and `get_kulfan_parameters(method="least_squares")`
// (MIT License, (c) Peter Sharpe). Coordinates use Selig order: upper TE -> LE -> lower TE.

const N_W = 8; // weights per side
const N1 = 0.5, N2 = 1.0; // class function exponents for a round nose and sharp tail

const comb = (n, k) => { let r = 1; for (let i = 1; i <= k; i++) r = r * (n - k + i) / i; return r; };

/**
 * Translate, rotate and scale so the leading edge is at (0,0) and the trailing edge at (1,0).
 * Returns the normalized coordinates plus the rotation (deg, CCW positive) and scale applied,
 * which the caller must apply to angle of attack and Reynolds number.
 */
export function normalizeAirfoil(coords) {
  const n = coords.length;
  const te = [(coords[0][0] + coords[n - 1][0]) / 2, (coords[0][1] + coords[n - 1][1]) / 2];
  let le = coords[0], best = -1;
  for (const p of coords) { const d = Math.hypot(p[0] - te[0], p[1] - te[1]); if (d > best) { best = d; le = p; } }
  const chord = best, ang = Math.atan2(te[1] - le[1], te[0] - le[0]);
  const ca = Math.cos(-ang), sa = Math.sin(-ang), s = 1 / chord;
  const out = coords.map(([x, y]) => { const dx = x - le[0], dy = y - le[1]; return [(dx * ca - dy * sa) * s, (dx * sa + dy * ca) * s]; });
  return { coords: out, rotationDeg: -ang * 180 / Math.PI, scale: s };
}

/** Solve a small dense least-squares problem via normal equations. */
function lstsq(A, b) {
  const m = A.length, n = A[0].length;
  const M = Array.from({ length: n }, () => new Float64Array(n)), v = new Float64Array(n);
  for (let r = 0; r < m; r++) { const a = A[r]; for (let i = 0; i < n; i++) { v[i] += a[i] * b[r]; for (let j = i; j < n; j++) M[i][j] += a[i] * a[j]; } }
  for (let i = 0; i < n; i++) for (let j = 0; j < i; j++) M[i][j] = M[j][i];
  for (let k = 0; k < n; k++) {
    let p = k; for (let i = k + 1; i < n; i++) if (Math.abs(M[i][k]) > Math.abs(M[p][k])) p = i;
    [M[k], M[p]] = [M[p], M[k]]; [v[k], v[p]] = [v[p], v[k]];
    for (let i = k + 1; i < n; i++) { const f = M[i][k] / M[k][k]; for (let j = k; j < n; j++) M[i][j] -= f * M[k][j]; v[i] -= f * v[k]; }
  }
  const x = new Float64Array(n);
  for (let i = n - 1; i >= 0; i--) { let s = v[i]; for (let j = i + 1; j < n; j++) s -= M[i][j] * x[j]; x[i] = s / M[i][i]; }
  return Array.from(x);
}

/** Fit Kulfan parameters to normalized Selig-ordered coordinates. */
export function kulfanFit(coords) {
  let le = 0;
  for (let i = 1; i < coords.length; i++) if (coords[i][0] < coords[le][0]) le = i;
  const K = Array.from({ length: N_W }, (_, i) => comb(N_W - 1, i));
  const rows = coords.map(([x], i) => {
    const xc = Math.min(Math.max(x, 0), 1), upper = i <= le;
    const C = Math.pow(xc, N1) * Math.pow(1 - xc, N2);
    const S = K.map((k, j) => C * k * Math.pow(xc, j) * Math.pow(1 - xc, N_W - 1 - j));
    const zero = new Array(N_W).fill(0);
    return [...(upper ? zero : S), ...(upper ? S : zero), xc * Math.pow(Math.max(1 - xc, 0), N_W + 0.5), upper ? xc / 2 : -xc / 2];
  });
  const b = coords.map(p => p[1]);
  let x = lstsq(rows, b), te = x[2 * N_W + 1], lew = x[2 * N_W];
  if (te < 0) { x = lstsq(rows.map(r => r.slice(0, -1)), b); te = 0; lew = x[2 * N_W]; }
  return { lower: x.slice(0, N_W), upper: x.slice(N_W, 2 * N_W), leWeight: lew, teThickness: te };
}
