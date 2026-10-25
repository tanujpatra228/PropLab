// PropLab physics. Units: SI internally (metres, newtons, watts) unless a name says otherwise.
import { RHO, MU, G, SOUND, IN, TAU, chordShape } from './constants.js';
import { polar } from './airfoil.js';

// ---------- Propeller: Blade Element Momentum Theory (hover / static) ----------
/**
 * Static (hover) Blade Element Momentum Theory with Prandtl tip loss.
 * d: { diaIn, pitchIn, blades, chordPct, camber, thick }  (camber/thick as fractions)
 * af: result of airfoilModel(). Returns totals plus per-station data in `st`.
 */
export function analyzeProp(d, af, rpm, ns = 32) {
  const R = d.diaIn * IN / 2, Pm = d.pitchIn * IN, B = d.blades, Om = rpm * TAU / 60;
  const r0 = R * 0.15, dr = (R - r0) / ns;
  let T = 0, Q = 0;
  const st = [];
  for (let i = 0; i < ns; i++) {
    const r = r0 + (i + 0.5) * dr, x = r / R;
    const c = d.chordPct / 100 * R * chordShape(x);
    const beta = Math.atan(Pm / (TAU * r));
    let vi = 0.04 * Om * r, vt = 0, out = null;
    for (let it = 0; it < 120; it++) {
      const Ua = vi, Ut = Math.max(1e-3, Om * r - vt);
      const phi = Math.atan2(Ua, Ut), W2 = Ua * Ua + Ut * Ut, W = Math.sqrt(W2);
      const alpha = beta - phi, Re = RHO * W * c / MU;
      const p = polar(af, alpha, Re);
      const sphi = Math.max(Math.sin(phi), 1e-4);
      const F = Math.max(0.05, 2 / Math.PI * Math.acos(Math.min(1, Math.exp(-B / 2 * (R - r) / (r * sphi)))));
      const Tp = 0.5 * RHO * W2 * B * c * (p.cl * Math.cos(phi) - p.cd * Math.sin(phi));
      const Qp = 0.5 * RHO * W2 * B * c * (p.cl * Math.sin(phi) + p.cd * Math.cos(phi)) * r;
      const viN = Tp > 0 ? Math.sqrt(Tp / (4 * Math.PI * r * RHO * F)) : 0;
      const vtN = Qp / (4 * Math.PI * r * r * RHO * F * Math.max(viN, 0.05));
      vi += 0.35 * (viN - vi); vt += 0.35 * (Math.min(vtN, 0.5 * Om * r) - vt);
      out = { r, x, c, beta, alpha, cl: p.cl, cd: p.cd, stalled: p.stalled, Re, Tp, Qp, vi, vt, F };
    }
    T += out.Tp * dr; Q += out.Qp * dr;
    st.push(out);
  }
  const P = Q * Om, A = Math.PI * R * R;
  const fm = T > 0 && P > 0 ? Math.pow(T, 1.5) / (P * Math.sqrt(2 * RHO * A)) : 0;
  const outb = st.filter(s => s.x >= 0.4);
  const stallFrac = outb.filter(s => s.stalled).length / outb.length;
  const s75 = st.reduce((a, s) => Math.abs(s.x - 0.75) < Math.abs(a.x - 0.75) ? s : a, st[0]);
  return { T, Q, P, fm, R, Om, rpm, st, dr, stallFrac, s75, tipMach: Om * R / SOUND, gPerW: P > 0 ? (T / G * 1000) / P : 0 };
}
