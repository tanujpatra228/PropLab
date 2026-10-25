// Static (V = 0) performance published by APC Propellers in their PER3 performance files
// (https://www.apcprop.com/files/PER3_<model>.dat), retrieved 2026-10-25.
// Ct = T / (rho n^2 D^4), Cp = P / (rho n^3 D^5), n in rev/s, D in metres.
//
// NOTE: APC generates these files with its own computational model (not wind tunnel tests).
// They are the standard public reference for APC props, but measured static thrust from
// independent tests (e.g. UIUC Propeller Database) is often somewhat lower.
//
// Geometry: diameter and pitch come from the model name. chordPct (chord at 75% radius as %
// of radius) is from UIUC measurements where available (APC 10x4.7SF: 0.985 in at 0.75R),
// otherwise estimated for the product line. Camber/thickness are PropLab's best estimate.

export const APC_STATIC = [
  {
    model: '5x4.5E', line: 'Thin Electric',
    geom: { diaIn: 5, pitchIn: 4.5, blades: 2, chordPct: 22, camber: 0.04, thick: 0.08 },
    points: [[6000, 0.1915, 0.1169], [8000, 0.1919, 0.1144], [10000, 0.1922, 0.1127], [12000, 0.1925, 0.1115], [14000, 0.1929, 0.1107]]
  },
  {
    model: '8x3.8SF', line: 'Slow Flyer',
    geom: { diaIn: 8, pitchIn: 3.8, blades: 2, chordPct: 19.7, camber: 0.04, thick: 0.08 },
    points: [[4000, 0.1363, 0.0548], [6000, 0.1366, 0.0545], [8000, 0.1372, 0.0544], [10000, 0.1378, 0.0545], [12000, 0.1386, 0.0548]]
  },
  {
    model: '10x4.7SF', line: 'Slow Flyer',
    geom: { diaIn: 10, pitchIn: 4.7, blades: 2, chordPct: 19.7, camber: 0.04, thick: 0.08 },
    points: [[3000, 0.1346, 0.0534], [5000, 0.1351, 0.0529], [6000, 0.1354, 0.0529], [8000, 0.1362, 0.0530], [10000, 0.1372, 0.0534]]
  },
  {
    model: '11x4.7SF', line: 'Slow Flyer',
    geom: { diaIn: 11, pitchIn: 4.7, blades: 2, chordPct: 19.7, camber: 0.04, thick: 0.08 },
    points: [[4000, 0.1256, 0.0475], [6000, 0.1263, 0.0473], [8000, 0.1272, 0.0475], [10000, 0.1285, 0.0480]]
  },
  {
    model: '15x5.5MR', line: 'Multi-Rotor',
    geom: { diaIn: 15, pitchIn: 5.5, blades: 2, chordPct: 15, camber: 0.04, thick: 0.08 },
    points: [[3000, 0.0856, 0.0281], [4000, 0.0859, 0.0276], [5000, 0.0862, 0.0273], [6000, 0.0867, 0.0271], [7000, 0.0873, 0.0271]]
  }
];
