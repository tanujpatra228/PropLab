// Compare PropLab against reference propeller data and print an error report.
// Run: npm run validate
//
// 1. Solver accuracy: UIUC wind-tunnel data, using each prop's MEASURED blade geometry.
//    Isolates the aerodynamics (BEMT + airfoil model) from geometry simplifications.
// 2. Simple-design accuracy: the same props described the way a PropLab user would
//    (diameter, pitch, blade width), using PropLab's classic planform.
// 3. APC published data: manufacturer-computed, shown for reference only.
import { airfoilModel, analyzeProp, loadNeuralFoil, RHO, IN } from '../src/physics/index.js';
import { UIUC_STATIC } from '../src/data/uiuc-static.js';
import { APC_STATIC } from '../tests/validation/apc-static.js';

/** Airfoil that best represents each APC product line (see docs/knowledge-base/validation.md). */
export const LINE_AIRFOIL = {
  'Slow Flyer': { family: 'e63' },
  'Thin Electric': { family: 'naca4', camber: 0.04, thick: 0.06 },
  'Multi-Rotor': { family: 'naca4', camber: 0.04, thick: 0.08 }
};

const afCache = new Map();
function af(spec) {
  const key = JSON.stringify(spec);
  if (!afCache.has(key)) afCache.set(key, airfoilModel(spec));
  return afCache.get(key);
}

export function coefficients(design, spec, rpm) {
  const a = af(spec);
  const d = { blades: 2, ...design, camber: a.camber, thick: a.thick };
  const p = analyzeProp(d, a, rpm);
  const n = rpm / 60, D = d.diaIn * IN;
  return { ct: p.T / (RHO * n * n * D ** 4), cp: p.P / (RHO * n ** 3 * D ** 5) };
}

function compare(cases) {
  const rows = [];
  for (const c of cases) for (const [rpm, ctRef, cpRef] of c.points) {
    const { ct, cp } = coefficients(c.design, c.spec, rpm);
    rows.push({ id: c.id, rpm, ctRef, ct, ctErr: (ct - ctRef) / ctRef, cpRef, cp, cpErr: (cp - cpRef) / cpRef });
  }
  const mean = k => rows.reduce((a, r) => a + Math.abs(r[k]), 0) / rows.length;
  const bias = k => rows.reduce((a, r) => a + r[k], 0) / rows.length;
  return { rows, ctMAE: mean('ctErr'), cpMAE: mean('cpErr'), ctBias: bias('ctErr'), cpBias: bias('cpErr') };
}

/** Run all three comparisons. Call `await loadNeuralFoil()` first to validate the NeuralFoil model. */
export function validate() {
  const solver = compare(UIUC_STATIC.map(p => ({ id: p.id, points: p.points, spec: LINE_AIRFOIL[p.line],
    design: { diaIn: p.diaIn, pitchIn: p.pitchIn, geometry: p.geometry } })));
  const simple = compare(UIUC_STATIC.map(p => ({ id: p.id, points: p.points, spec: LINE_AIRFOIL[p.line],
    design: { diaIn: p.diaIn, pitchIn: p.pitchIn, chordPct: Math.round(p.geometry.find(g => g[0] === 0.75)[1] * 100) } })));
  const apc = compare(APC_STATIC.map(p => ({ id: p.model, points: p.points, spec: LINE_AIRFOIL[p.line] || LINE_AIRFOIL['Thin Electric'],
    design: { diaIn: p.geom.diaIn, pitchIn: p.geom.pitchIn, chordPct: p.geom.chordPct } })));
  return { solver, simple, apc };
}

if (process.argv[1] && process.argv[1].endsWith('validate.js')) {
  const classic = process.argv.includes('--classic');
  if (!classic) await loadNeuralFoil();
  const pct = v => `${v >= 0 ? '+' : ''}${(v * 100).toFixed(1)}%`;
  const r = validate();
  const print = (title, res, detail = true) => {
    console.log(`\n=== ${title}`);
    if (detail) {
      console.log('prop            rpm    Ct ref  Ct      err     Cp ref  Cp      err');
      for (const x of res.rows) console.log(`${x.id.padEnd(14)} ${String(x.rpm).padStart(5)}  ${x.ctRef.toFixed(4)}  ${x.ct.toFixed(4)} ${pct(x.ctErr).padStart(7)}  ${x.cpRef.toFixed(4)}  ${x.cp.toFixed(4)} ${pct(x.cpErr).padStart(7)}`);
    }
    console.log(`Thrust (Ct): mean abs error ${(res.ctMAE * 100).toFixed(1)}%, bias ${pct(res.ctBias)}`);
    console.log(`Power  (Cp): mean abs error ${(res.cpMAE * 100).toFixed(1)}%, bias ${pct(res.cpBias)}`);
  };
  console.log(`Airfoil model: ${classic ? 'classic' : 'NeuralFoil'}`);
  print('1. Solver accuracy: UIUC wind tunnel, measured blade geometry', r.solver);
  print('2. Simple-design accuracy: UIUC wind tunnel, PropLab classic planform', r.simple, false);
  print('3. APC published data (manufacturer-computed, reference only)', r.apc, false);
}
