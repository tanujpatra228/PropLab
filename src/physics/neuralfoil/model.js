// NeuralFoil in JavaScript: a neural network trained on XFOIL that predicts airfoil lift and drag,
// including viscous drag, transition and stall. Port of neuralfoil.get_aero_from_kulfan_parameters()
// (MIT License, (c) Peter Sharpe, https://github.com/peterdsharpe/NeuralFoil).
//
// The weights (~220 kB) load on demand with loadNeuralFoil(); until then isNeuralFoilReady() is false
// and PropLab falls back to its classic airfoil model.

let net = null; // { layers: [{ W, b, rows, cols }], mean, invCov }

/** Load weights. Safe to call repeatedly; resolves once ready. */
export async function loadNeuralFoil() {
  if (net) return;
  const { LAYERS, DATA } = await import('./weights.js');
  initNeuralFoil(LAYERS, DATA);
}

export function initNeuralFoil(LAYERS, DATA) {
  const bin = typeof atob === 'function' ? atob(DATA) : Buffer.from(DATA, 'base64').toString('binary');
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const f = new Float32Array(bytes.buffer);
  let o = 0;
  const take = n => { const a = f.subarray(o, o + n); o += n; return a; };
  const layers = LAYERS.map(([rows, cols]) => ({ rows, cols, W: take(rows * cols), b: take(rows) }));
  net = { layers, mean: take(25), invCov: take(625) };
}

export const isNeuralFoilReady = () => net !== null;

const swish = x => x / (1 + Math.exp(-x));
const sigmoid = x => 1 / (1 + Math.exp(-Math.max(-700, Math.min(700, x))));

let bufA = new Float64Array(512), bufB = new Float64Array(512);
function forward(x) {
  let inp = x;
  for (let l = 0; l < net.layers.length; l++) {
    const { rows, cols, W, b } = net.layers[l], last = l === net.layers.length - 1;
    const out = l % 2 ? bufB : bufA;
    for (let r = 0; r < rows; r++) {
      let s = b[r]; const off = r * cols;
      for (let c = 0; c < cols; c++) s += W[off + c] * inp[c];
      out[r] = last ? s : swish(s);
    }
    inp = out;
  }
  return Array.from(inp.subarray(0, 6));
}

function mahalanobis2(x) {
  const { mean, invCov } = net, d = new Float64Array(25);
  for (let i = 0; i < 25; i++) d[i] = x[i] - mean[i];
  let s = 0;
  for (let i = 0; i < 25; i++) { let t = 0; for (let j = 0; j < 25; j++) t += d[j] * invCov[j * 25 + i]; s += t * d[i]; }
  return s;
}

/**
 * Aerodynamics of a Kulfan airfoil (from kulfanFit) at angle alphaDeg (degrees) and Reynolds number Re.
 * Returns { CL, CD, CM, confidence, xtrTop, xtrBot }.
 */
export function neuralFoilAero(k, alphaDeg, Re, { nCrit = 9, xtrUpper = 1, xtrLower = 1 } = {}) {
  if (!net) throw new Error('NeuralFoil not loaded');
  const a = alphaDeg * Math.PI / 180, ca = Math.cos(a);
  const x = [...k.upper, ...k.lower, k.leWeight, k.teThickness * 50, Math.sin(2 * a), ca, 1 - ca * ca,
    (Math.log(Re) - 12.5) / 3.5, (nCrit - 9) / 4.5, xtrUpper, xtrLower];
  const xf = x.slice();
  for (let i = 0; i < 8; i++) { xf[i] = -x[8 + i]; xf[8 + i] = -x[i]; }
  xf[16] = -x[16]; xf[18] = -x[18]; xf[23] = x[24]; xf[24] = x[23];

  const y = forward(x), yf = forward(xf);
  y[0] -= mahalanobis2(x) / 50; yf[0] -= mahalanobis2(xf) / 50; // 2 * N_inputs
  const u = [yf[0], -yf[1], yf[2], -yf[3], yf[5], yf[4]]; // un-flip the mirrored case
  const m = y.map((v, i) => (v + u[i]) / 2);
  return {
    confidence: sigmoid(m[0]),
    CL: m[1] / 2,
    CD: Math.exp((m[2] - 2) * 2),
    CM: m[3] / 20,
    xtrTop: Math.min(1, Math.max(0, m[4])),
    xtrBot: Math.min(1, Math.max(0, m[5]))
  };
}
