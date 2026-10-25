// PropLab physics. Units: SI internally (metres, newtons, watts) unless a name says otherwise.
/** Air density at sea level (kg/m^3) */
export const RHO = 1.225;
/** Dynamic viscosity of air (Pa*s) */
export const MU = 1.81e-5;
/** Gravity (m/s^2) */
export const G = 9.81;
/** Speed of sound (m/s) */
export const SOUND = 343;
/** One inch in metres */
export const IN = 0.0254;
export const TAU = Math.PI * 2;

/** Chord (blade width) shape along the blade, x = r/R. Normalised so chordShape(0.75) = 1. */
export function chordShape(x) { return Math.max(0.2, (0.45 + 2.2 * x - 2.4 * x * x) / 0.75); }
