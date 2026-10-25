import { describe, it, expect } from 'vitest';
import { nacaPoints, panelSolve, airfoilModel, analyzeProp, structure, maxSafeRpm, analyzeDrone, MATERIALS, G } from '../src/physics/index.js';

const deg = Math.PI / 180;
const prop10 = { diaIn: 10, pitchIn: 4.7, blades: 2, chordPct: 18, camber: 0.04, thick: 0.10 };
const af10 = airfoilModel(0.04, 0.10);
const grams = p => p.T / G * 1000;

describe('panel method (wind tunnel)', () => {
  it('symmetric airfoil makes no lift at zero angle', () => {
    expect(Math.abs(panelSolve(nacaPoints(0, 0.12, 40), 0).cl)).toBeLessThan(1e-3);
  });
  it('NACA 0012 at 5° matches classic inviscid result (~0.6)', () => {
    const cl = panelSolve(nacaPoints(0, 0.12, 40), 5 * deg).cl;
    expect(cl).toBeGreaterThan(0.55);
    expect(cl).toBeLessThan(0.65);
  });
  it('camber creates lift at zero angle', () => {
    expect(panelSolve(nacaPoints(0.04, 0.12, 40), 0).cl).toBeGreaterThan(0.4);
  });
});

describe('propeller (BEMT)', () => {
  it('10x4.7 at 6000 RPM is in the range of published APC data', () => {
    const p = analyzeProp(prop10, af10, 6000);
    expect(grams(p)).toBeGreaterThan(400);
    expect(grams(p)).toBeLessThan(700);
    expect(p.P).toBeGreaterThan(30);
    expect(p.P).toBeLessThan(70);
  });
  it('thrust grows roughly with RPM squared', () => {
    const t1 = analyzeProp(prop10, af10, 4000).T, t2 = analyzeProp(prop10, af10, 8000).T;
    expect(t2 / t1).toBeGreaterThan(3.4);
    expect(t2 / t1).toBeLessThan(4.6);
  });
  it('figure of merit stays physical (below 1)', () => {
    const p = analyzeProp(prop10, af10, 6000);
    expect(p.fm).toBeGreaterThan(0.4);
    expect(p.fm).toBeLessThan(0.9);
  });
});

describe('structure', () => {
  it('safety factor drops as RPM rises', () => {
    const m = MATERIALS.gfn;
    const sfLow = structure(prop10, m, analyzeProp(prop10, af10, 4000)).sf;
    const sfHigh = structure(prop10, m, analyzeProp(prop10, af10, 12000)).sf;
    expect(sfHigh).toBeLessThan(sfLow);
  });
  it('carbon allows a higher safe RPM than PLA', () => {
    expect(maxSafeRpm(prop10, af10, MATERIALS.carbon)).toBeGreaterThan(maxSafeRpm(prop10, af10, MATERIALS.pla));
  });
});

describe('drone', () => {
  it('10-inch camera drone flies with a healthy margin', () => {
    const r = analyzeDrone(prop10, af10, MATERIALS.gfn, { motors: 4, frameG: 900, cells: 4, mah: 5000, kv: 920, motorW: 260 });
    expect(r.hover).not.toBeNull();
    expect(r.tw).toBeGreaterThan(2.5);
    expect(r.hover.minutes).toBeGreaterThan(10);
    expect(r.hover.minutes).toBeLessThan(40);
  });
  it('an overweight drone cannot lift off', () => {
    const r = analyzeDrone(prop10, af10, MATERIALS.gfn, { motors: 4, frameG: 8000, cells: 4, mah: 5000, kv: 920, motorW: 260 });
    expect(r.hover).toBeNull();
  });
});
