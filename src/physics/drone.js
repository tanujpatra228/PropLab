// PropLab physics. Units: SI internally (metres, newtons, watts) unless a name says otherwise.
import { G } from './constants.js';
import { analyzeProp } from './propeller.js';
import { structure } from './structure.js';

function thrustAt(d, af, rpm) { return analyzeProp(d, af, rpm, 20).T; }

// ---------- Drone ----------
/**
 * Whole-drone estimate. dr: { motors, frameG, cells, mah, kv, motorW }
 */
export function analyzeDrone(d, af, mat, dr) {
  const perf0 = analyzeProp(d, af, 5000, 20);
  const propG = structure(d, mat, perf0).massG;
  const vNom = dr.cells * 3.7, wh = vNom * dr.mah / 1000;
  const battG = wh / 160 * 1000 * 1.08;
  const totalG = dr.frameG + battG + propG * dr.motors;
  const need = totalG / 1000 * G / dr.motors;
  // Max RPM: limited by battery voltage or by how much power the motor can deliver
  const rpmVolt = dr.kv * vNom * 0.85;
  let maxRpm = rpmVolt, limitedBy = 'voltage';
  const shaftMax = dr.motorW * 0.85;
  if (analyzeProp(d, af, rpmVolt, 16).P > shaftMax) {
    let lo = 200, hi = rpmVolt;
    for (let k = 0; k < 26; k++) { const m = (lo + hi) / 2; if (analyzeProp(d, af, m, 16).P < shaftMax) lo = m; else hi = m; }
    maxRpm = lo; limitedBy = 'motor';
  }
  const tMax = thrustAt(d, af, maxRpm);
  let hoverRpm = null;
  if (tMax >= need) {
    let lo = 200, hi = maxRpm;
    for (let k = 0; k < 28; k++) { const m = (lo + hi) / 2; if (thrustAt(d, af, m) < need) lo = m; else hi = m; }
    hoverRpm = hi;
  }
  const tw = tMax * dr.motors / (totalG / 1000 * G);
  let hover = null;
  if (hoverRpm) {
    const hp = analyzeProp(d, af, hoverRpm);
    const pElec = hp.P * dr.motors / 0.7;
    hover = { rpm: hoverRpm, pElec, amps: pElec / vNom, minutes: wh * 0.8 / pElec * 60, throttle: hoverRpm / rpmVolt, perf: hp, gPerW: hp.gPerW };
  }
  const payloadG = Math.max(0, tMax * dr.motors / 2 / G * 1000 - totalG);
  const maxPerf = analyzeProp(d, af, maxRpm);
  const sfMax = structure(d, mat, maxPerf).sf;
  return { propG, battG, totalG, needG: need / G * 1000, maxRpm, limitedBy, tMaxG: tMax / G * 1000, tw, hover, payloadG, wh, vNom, sfMax, tipMachMax: maxPerf.tipMach };
}
