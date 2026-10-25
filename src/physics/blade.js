// Blade geometry along the radius. Single source of truth for the solver, the strength check and the 3D model.
import { TAU, chordShape } from './constants.js';

/**
 * A design may carry an explicit blade geometry: d.geometry = [[x, c/R, betaDeg], ...] with x = r/R ascending.
 * Measured propellers (UIUC data) and the custom planform editor both produce this. Without it, PropLab uses
 * the classic planform (chordShape scaled by chordPct) and constant geometric pitch.
 */
function lerpRow(rows, x, k) {
  if (x <= rows[0][0]) return rows[0][k];
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] >= x) { const a = rows[i - 1], b = rows[i], t = (x - a[0]) / (b[0] - a[0]); return a[k] + (b[k] - a[k]) * t; }
  }
  return rows[rows.length - 1][k];
}

/** Chord as a fraction of the tip radius at x = r/R. */
export function chordRatio(d, x) {
  return d.geometry ? lerpRow(d.geometry, x, 1) : d.chordPct / 100 * chordShape(x);
}

/** Blade pitch angle (radians) at x = r/R. */
export function bladeAngle(d, x) {
  if (d.geometry) return lerpRow(d.geometry, x, 2) * Math.PI / 180;
  return Math.atan(d.pitchIn / (TAU * x * d.diaIn / 2));
}

/** Geometric pitch (inches) that the blade has at 75% radius. Useful to describe measured blades. */
export function pitchAt75(d) {
  return TAU * 0.75 * d.diaIn / 2 * Math.tan(bladeAngle(d, 0.75));
}
