import { describe, it, expect, beforeAll } from 'vitest';
import { loadNeuralFoil, neuralFoilAero, kulfanFit, normalizeAirfoil, airfoilShape, airfoilModel, polar, analyzeProp } from '../src/physics/index.js';

const deg = Math.PI / 180;
const kulfanOf = spec => {
  const n = normalizeAirfoil(airfoilShape(spec, 80).slice().reverse());
  return { k: kulfanFit(n.coords), n };
};

beforeAll(async () => { await loadNeuralFoil(); });

describe('NeuralFoil JavaScript port', () => {
  // Reference values from Python: neuralfoil 0.3.3, model_size="large", AeroSandbox airfoil database.
  // Our resampled outlines differ slightly from the database files, hence the small tolerances.
  it('matches Python NeuralFoil for NACA 0012 at 4°, Re 100k', () => {
    const { k, n } = kulfanOf({ family: 'naca4', camber: 0, thick: 0.12 });
    const r = neuralFoilAero(k, 4 + n.rotationDeg, 1e5 / n.scale);
    expect(r.CL).toBeCloseTo(0.532, 1);
    expect(r.CD).toBeGreaterThan(0.0155 * 0.85);
    expect(r.CD).toBeLessThan(0.0155 * 1.15);
  });
  it('matches Python NeuralFoil for the E63 at 4°, Re 100k', () => {
    const { k, n } = kulfanOf({ family: 'e63' });
    const r = neuralFoilAero(k, 4 + n.rotationDeg, 1e5 / n.scale);
    expect(r.CL).toBeCloseTo(1.114, 1);
    expect(r.CD).toBeGreaterThan(0.0201 * 0.85);
    expect(r.CD).toBeLessThan(0.0201 * 1.15);
  });
  it('symmetric airfoil gives symmetric lift', () => {
    const { k } = kulfanOf({ family: 'naca4', camber: 0, thick: 0.12 });
    expect(neuralFoilAero(k, 5, 2e5).CL).toBeCloseTo(-neuralFoilAero(k, -5, 2e5).CL, 3);
  });
  it('drag falls as Reynolds number rises (small blades are draggier)', () => {
    const { k } = kulfanOf({ family: 'naca4', camber: 0.04, thick: 0.08 });
    expect(neuralFoilAero(k, 3, 3e4).CD).toBeGreaterThan(neuralFoilAero(k, 3, 5e5).CD);
  });
  it('Kulfan fit reproduces the outline', () => {
    const { k } = kulfanOf({ family: 'naca4', camber: 0.04, thick: 0.10 });
    expect(k.upper.every(Number.isFinite) && k.lower.every(Number.isFinite)).toBe(true);
    expect(k.upper[0]).toBeGreaterThan(0);
    expect(k.lower[0]).toBeLessThan(0);
  });
});

describe('polar with NeuralFoil table', () => {
  it('stall is the first lift peak, with lift falling afterwards', () => {
    const af = airfoilModel({ family: 'e63' });
    const a = polar(af, 0, 6e4).aStall;
    expect(a / deg).toBeGreaterThan(4);
    expect(a / deg).toBeLessThan(16);
    expect(polar(af, a + 8 * deg, 6e4).cl).toBeLessThan(polar(af, a, 6e4).cl);
    expect(polar(af, a + 2 * deg, 6e4).stalled).toBe(true);
  });
  it('compressibility raises lift at high tip Mach (Prandtl-Glauert)', () => {
    const af = airfoilModel({ family: 'naca4', camber: 0.04, thick: 0.08 });
    expect(polar(af, 3 * deg, 2e5, 0.6).cl).toBeGreaterThan(polar(af, 3 * deg, 2e5, 0).cl * 1.2);
  });
});

describe('forward flight', () => {
  const d = { diaIn: 10, pitchIn: 4.7, blades: 2, chordPct: 18, camber: 0.04, thick: 0.08 };
  it('thrust falls with airspeed and turns negative past pitch speed', () => {
    const af = airfoilModel({ family: 'naca4', camber: 0.04, thick: 0.08 });
    const t0 = analyzeProp(d, af, 6000, 24, 0).T, t5 = analyzeProp(d, af, 6000, 24, 5).T, t20 = analyzeProp(d, af, 6000, 24, 20).T;
    expect(t5).toBeLessThan(t0);
    expect(t20).toBeLessThan(0);
  });
  it('propulsive efficiency is physical', () => {
    const af = airfoilModel({ family: 'naca4', camber: 0.04, thick: 0.08 });
    const p = analyzeProp(d, af, 6000, 24, 6);
    expect(p.eta).toBeGreaterThan(0.3);
    expect(p.eta).toBeLessThan(0.9);
  });
});

describe('explicit blade geometry', () => {
  it('a geometry table equal to the classic planform gives the same thrust', () => {
    const af = airfoilModel({ family: 'naca4', camber: 0.04, thick: 0.08 });
    const d = { diaIn: 10, pitchIn: 4.7, blades: 2, chordPct: 18 };
    const xs = Array.from({ length: 35 }, (_, i) => 0.15 + i * 0.025);
    const R = d.diaIn / 2;
    const chord = x => Math.max(0.2, (0.45 + 2.2 * x - 2.4 * x * x) / 0.75) * 0.18;
    const geometry = xs.map(x => [x, chord(x), Math.atan(d.pitchIn / (2 * Math.PI * x * R)) * 180 / Math.PI]);
    const a = analyzeProp(d, af, 6000).T, b = analyzeProp({ ...d, geometry }, af, 6000).T;
    expect(Math.abs(b - a) / a).toBeLessThan(0.01);
  });
});
