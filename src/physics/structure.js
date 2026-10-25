// PropLab physics. Units: SI internally (metres, newtons, watts) unless a name says otherwise.
import { IN, chordShape } from './constants.js';
import { analyzeProp } from './propeller.js';

// ---------- Structure: weight and strength ----------
/** Blade mass and root stress (centrifugal pull + thrust bending). */
export function structure(d, mat, perf) {
  const R = d.diaIn * IN / 2, r0 = R * 0.15, B = d.blades, ns = perf.st.length, dr = (R - r0) / ns;
  const t = d.thick, Om = perf.Om;
  let vol = 0, Fc = 0, M = 0;
  for (let i = 0; i < ns; i++) {
    const r = r0 + (i + 0.5) * dr, c = d.chordPct / 100 * R * chordShape(r / R);
    const A = 0.685 * t * c * c;
    vol += A * dr; Fc += mat.rho * A * Om * Om * r * dr;
    M += (perf.st[i].Tp / B) * (r - r0) * dr;
  }
  const hubR = Math.max(0.06 * R, 0.006), hubH = Math.max(0.05 * R, 0.006);
  const hubVol = Math.PI * hubR * hubR * hubH * 0.7;
  const massG = (vol * B + hubVol) * mat.rho * 1000;
  const c0 = d.chordPct / 100 * R * chordShape(0.15), tr = Math.min(0.3, t * 2.2), h = tr * c0;
  const Aroot = 0.685 * tr * c0 * c0, I = 0.0365 * c0 * h * h * h, Z = I / (h / 2);
  const stressMPa = (Fc / Aroot + Math.abs(M) / Z) / 1e6;
  return { massG, stressMPa, sf: stressMPa > 0 ? mat.mpa / stressMPa : 99 };
}

/** Highest RPM that keeps a 2x strength safety factor. */
export function maxSafeRpm(d, af, mat) {
  let lo = 500, hi = 80000;
  const sfAt = rpm => structure(d, mat, analyzeProp(d, af, rpm, 16)).sf;
  if (sfAt(hi) >= 2) return hi;
  for (let k = 0; k < 22; k++) { const m = (lo + hi) / 2; if (sfAt(m) >= 2) lo = m; else hi = m; }
  return lo;
}
