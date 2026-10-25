// Shared app state. Views read from here; main.js owns updates.
import { UIUC_STATIC } from './data/uiuc-static.js';
import { chordShape, AIRFOIL_FAMILIES } from './physics/index.js';

/** x = r/R stations used by the custom planform editor */
export const EDIT_X = [0.2, 0.4, 0.6, 0.8, 1.0];

/** Measured blades users can start from (UIUC wind-tunnel props). */
export const MEASURED = {
  'apcsf_10x4.7': { label: 'APC 10×4.7 Slow Flyer', airfoil: 'e63' },
  'apce_10x5': { label: 'APC 10×5 Thin Electric', airfoil: 'naca4', camber: 4, thick: 6 }
};

const base = { airfoil: 'naca4', planform: 'classic', customChord: null, customTwist: null };

export const PRESETS = {
  r5:  { design: { ...base, diaIn: 5.1, pitchIn: 4.3, blades: 3, chordPct: 24, camber: 4, thick: 9, material: 'gfn' }, rpm: 20000, airspeedKmh: 0, drone: { motors: 4, frameG: 380, cells: 6, mah: 1100, kv: 1950, motorW: 900 } },
  c10: { design: { ...base, diaIn: 10, pitchIn: 4.7, blades: 2, chordPct: 18, camber: 4, thick: 8, material: 'gfn' }, rpm: 6000, airspeedKmh: 0, drone: { motors: 4, frameG: 900, cells: 4, mah: 5000, kv: 920, motorW: 260 } },
  h15: { design: { ...base, diaIn: 15, pitchIn: 5.5, blades: 2, chordPct: 16, camber: 4, thick: 9, material: 'carbon' }, rpm: 4500, airspeedKmh: 0, drone: { motors: 6, frameG: 3200, cells: 6, mah: 16000, kv: 380, motorW: 900 } },
  apcsf10: { design: { ...base, diaIn: 10, pitchIn: 4.7, blades: 2, chordPct: 20, camber: 5, thick: 4, material: 'gfn', airfoil: 'e63', planform: 'apcsf_10x4.7' }, rpm: 6000, airspeedKmh: 0, drone: { motors: 4, frameG: 900, cells: 4, mah: 5000, kv: 920, motorW: 260 } },
  apce10: { design: { ...base, diaIn: 10, pitchIn: 5, blades: 2, chordPct: 13, camber: 4, thick: 6, material: 'gfn', airfoil: 'naca4', planform: 'apce_10x5' }, rpm: 6000, airspeedKmh: 0, drone: { motors: 4, frameG: 900, cells: 4, mah: 5000, kv: 920, motorW: 260 } }
};

const STORAGE_KEY = 'proplab-state';
const clone = o => JSON.parse(JSON.stringify(o));

export const app = {
  /** User inputs (design in UI units: inches, % values) */
  S: clone(PRESETS.c10),
  preset: 'c10',
  /** Latest computed results, see main.js compute() */
  R: null,
  /** Pinned baseline for comparison, or null */
  base: null,
  flow: { on: true, paused: matchMedia('(prefers-reduced-motion: reduce)').matches },
  colorMode: 'material'
};

export function loadPreset(key) { app.S = clone(PRESETS[key]); app.preset = key; }

export function restoreSaved() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (saved && saved.design && saved.drone) {
      // Merge over defaults so designs saved by older versions gain new fields.
      const d = clone(PRESETS.c10);
      app.S = { ...d, ...saved, design: { ...d.design, ...saved.design }, drone: { ...d.drone, ...saved.drone } };
      if (app.S.design.planform !== 'classic' && app.S.design.planform !== 'custom' && !MEASURED[app.S.design.planform]) app.S.design.planform = 'classic';
      if (!AIRFOIL_FAMILIES[app.S.design.airfoil]) app.S.design.airfoil = 'naca4';
      app.preset = null;
    }
  } catch { /* storage unavailable */ }
}

export function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(app.S)); } catch { /* storage unavailable */ }
}

/** Classic planform sampled at the editor stations, used to seed the custom editor. */
export function seedCustom() {
  const d = app.S.design;
  d.customChord = EDIT_X.map(x => Math.round(d.chordPct * chordShape(x) * 10) / 10);
  d.customTwist = EDIT_X.map(() => 0);
}

/** Airfoil spec for the physics */
export function airfoilSpec() {
  const d = app.S.design;
  return d.airfoil === 'naca4' ? { family: 'naca4', camber: d.camber / 100, thick: d.thick / 100 } : { family: d.airfoil };
}

/** Design converted to physics units (camber/thickness as fractions, optional explicit geometry) */
export function designPhys() {
  const d = app.S.design;
  const out = { diaIn: d.diaIn, pitchIn: d.pitchIn, blades: d.blades, chordPct: d.chordPct, camber: d.camber / 100, thick: d.thick / 100 };
  if (d.planform === 'custom' && d.customChord) {
    const R = d.diaIn / 2;
    const xs = [0.15, ...EDIT_X], ch = [d.customChord[0], ...d.customChord], tw = [d.customTwist[0], ...d.customTwist];
    out.geometry = xs.map((x, i) => [x, Math.max(ch[i], 1) / 100, Math.atan(d.pitchIn / (2 * Math.PI * x * R)) * 180 / Math.PI + tw[i]]);
  } else if (MEASURED[d.planform]) {
    out.geometry = UIUC_STATIC.find(p => p.id === d.planform).geometry;
  }
  return out;
}
