// Regression guard: PropLab must stay close to real wind-tunnel measurements.
// If a change makes these fail, it made the physics worse. If you improve accuracy,
// tighten the limits and record the new numbers in docs/knowledge-base/validation.md.
import { describe, it, expect, beforeAll } from 'vitest';
import { loadNeuralFoil } from '../src/physics/index.js';
import { validate } from '../scripts/validate.js';

describe('validation against UIUC wind-tunnel data (NeuralFoil)', () => {
  let r;
  beforeAll(async () => { await loadNeuralFoil(); r = validate(); });

  it('solver with measured geometry: thrust within 10% on average', () => {
    expect(r.solver.ctMAE).toBeLessThan(0.10);
  });
  it('solver with measured geometry: power within 10% on average', () => {
    expect(r.solver.cpMAE).toBeLessThan(0.10);
  });
  it('simple PropLab planform: thrust and power within 25% on average', () => {
    expect(r.simple.ctMAE).toBeLessThan(0.25);
    expect(r.simple.cpMAE).toBeLessThan(0.25);
  });
  it('no single measured point is off by more than 20%', () => {
    for (const x of r.solver.rows) {
      expect(Math.abs(x.ctErr)).toBeLessThan(0.20);
      expect(Math.abs(x.cpErr)).toBeLessThan(0.20);
    }
  });
});
