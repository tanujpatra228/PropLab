// PropLab physics. Units: SI internally (metres, newtons, watts) unless a name says otherwise.
import { RHO, MU, G, SOUND, IN, TAU } from './constants.js';
import { polar } from './airfoil.js';
import { chordRatio, bladeAngle } from './blade.js';

// ---------- Propeller: Blade Element Momentum Theory ----------
/**
 * Blade Element Momentum Theory with Prandtl tip loss, for hover (V = 0) or axial flight (V > 0).
 * d: { diaIn, pitchIn, blades, chordPct, camber, thick, geometry? }  (camber/thick as fractions)
 * af: result of airfoilModel(). V: axial airspeed in m/s (forward flight or climb).
 * Returns totals plus per-station data in `st`.
 */
export function analyzeProp(d, af, rpm, ns = 32, V = 0) {
  const R = d.diaIn * IN / 2, B = d.blades, Om = rpm * TAU / 60;
  const r0 = R * 0.15, dr = (R - r0) / ns;
  let T = 0, Q = 0;
  const st = [];
  for (let i = 0; i < ns; i++) {
    const r = r0 + (i + 0.5) * dr, x = r / R;
    const c = chordRatio(d, x) * R;
    const beta = bladeAngle(d, x);
    let vi = 0.04 * Om * r, vt = 0, out = null;
    for (let it = 0; it < 120; it++) {
      const Ua = V + vi, Ut = Math.max(1e-3, Om * r - vt);
      const phi = Math.atan2(Ua, Ut), W2 = Ua * Ua + Ut * Ut, W = Math.sqrt(W2);
      const alpha = beta - phi, Re = RHO * W * c / MU;
      const p = polar(af, alpha, Re, W / SOUND);
      const sphi = Math.max(Math.abs(Math.sin(phi)), 1e-4);
      const F = Math.max(0.05, 2 / Math.PI * Math.acos(Math.min(1, Math.exp(-B / 2 * (R - r) / (r * sphi)))));
      const Tp = 0.5 * RHO * W2 * B * c * (p.cl * Math.cos(phi) - p.cd * Math.sin(phi));
      const Qp = 0.5 * RHO * W2 * B * c * (p.cl * Math.sin(phi) + p.cd * Math.cos(phi)) * r;
      // Momentum: Tp = 4 pi r rho F (V + vi) vi  ->  solve the quadratic for vi
      const viN = (-V + Math.sqrt(Math.max(0, V * V + Tp / (Math.PI * r * RHO * F)))) / 2;
      const vtN = Qp / (4 * Math.PI * r * r * RHO * F * Math.max(V + viN, 0.05));
      const dvi = viN - vi, dvt = Math.min(vtN, 0.5 * Om * r) - vt;
      vi += 0.35 * dvi; vt += 0.35 * dvt;
      out = { r, x, c, beta, alpha, cl: p.cl, cd: p.cd, stalled: p.stalled, Re, mach: W / SOUND, Tp, Qp, vi, vt, F };
      // Converged: the induced velocities stopped changing (relative to the blade speed)
      if (it > 6 && Math.abs(dvi) + Math.abs(dvt) < 1e-6 * (Om * r + V + 1)) break;
    }
    T += out.Tp * dr; Q += out.Qp * dr;
    st.push(out);
  }
  const P = Q * Om, A = Math.PI * R * R;
  const fm = V === 0 && T > 0 && P > 0 ? Math.pow(T, 1.5) / (P * Math.sqrt(2 * RHO * A)) : 0;
  const outb = st.filter(s => s.x >= 0.4);
  const stallFrac = outb.filter(s => s.stalled).length / outb.length;
  const s75 = st.reduce((a, s) => Math.abs(s.x - 0.75) < Math.abs(a.x - 0.75) ? s : a, st[0]);
  const n = rpm / 60, D = 2 * R;
  return {
    T, Q, P, fm, R, Om, rpm, V, st, dr, stallFrac, s75,
    tipMach: Math.hypot(Om * R, V) / SOUND,
    gPerW: P > 0 ? (T / G * 1000) / P : 0,
    J: n > 0 ? V / (n * D) : 0,             // advance ratio
    eta: V > 0 && P > 0 ? T * V / P : 0     // propulsive efficiency
  };
}
