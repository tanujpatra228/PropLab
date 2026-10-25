// Shared app state. Views read from here; main.js owns updates.

export const PRESETS = {
  r5:  { design: { diaIn: 5.1, pitchIn: 4.3, blades: 3, chordPct: 24, camber: 4, thick: 9, material: 'gfn' }, rpm: 20000, drone: { motors: 4, frameG: 380, cells: 6, mah: 1100, kv: 1950, motorW: 900 } },
  c10: { design: { diaIn: 10, pitchIn: 4.7, blades: 2, chordPct: 18, camber: 4, thick: 10, material: 'gfn' }, rpm: 6000, drone: { motors: 4, frameG: 900, cells: 4, mah: 5000, kv: 920, motorW: 260 } },
  h15: { design: { diaIn: 15, pitchIn: 5.5, blades: 2, chordPct: 16, camber: 4, thick: 11, material: 'carbon' }, rpm: 4500, drone: { motors: 6, frameG: 3200, cells: 6, mah: 16000, kv: 380, motorW: 900 } }
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
    if (saved && saved.design && saved.drone) { app.S = saved; app.preset = null; }
  } catch { /* storage unavailable */ }
}

export function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(app.S)); } catch { /* storage unavailable */ }
}

/** Design converted to physics units (camber/thickness as fractions) */
export function designPhys() {
  const d = app.S.design;
  return { diaIn: d.diaIn, pitchIn: d.pitchIn, blades: d.blades, chordPct: d.chordPct, camber: d.camber / 100, thick: d.thick / 100 };
}
