# Testing

## What's tested

| File | Covers |
| --- | --- |
| `tests/physics.test.js` | Core physics with the classic airfoil model (below) |
| `tests/neuralfoil.test.js` | NeuralFoil port vs Python reference values, symmetry and Reynolds trends, stall detection, Prandtl-Glauert, forward flight, explicit blade geometry |
| `tests/validation.test.js` | **Regression guard** against UIUC wind-tunnel data. Fails if accuracy gets worse than the limits in [Validation](../knowledge-base/validation.md#run-it) |

`tests/physics.test.js` checks the physics against known reference values and physical sanity rules:

| Area | Test |
| --- | --- |
| Panel method | Symmetric airfoil gives zero lift at 0°; NACA 0012 at 5° gives Cl 0.55 to 0.65; camber produces lift at 0° |
| BEMT | 10×4.7 at 6000 RPM gives 400 to 700 g and 30 to 70 W (APC data range); doubling RPM multiplies thrust 3.4 to 4.6×; figure of merit between 0.4 and 0.9 |
| Structure | Safety factor falls as RPM rises; carbon allows a higher safe RPM than PLA |
| Drone | The 10-inch preset hovers with T/W above 2.5 and 10 to 40 minutes; an 8 kg frame can't lift off |

The UI isn't unit tested. Check it by hand (see [Development workflow](development.md#making-a-change)).

## Running

```bash
npm test             # once
npm run test:watch   # on every save
```

CI runs `npm test` on every push and pull request. A failing test blocks the deploy.

## Writing physics tests

Prefer **ranges from real data** over exact numbers. The models are approximations; a test that pins `561.3 g` will break on every harmless tweak, while "between 400 and 700 g, like APC data" catches real regressions.

Good test types:

- **Reference values:** compare against published data (APC performance files, UIUC Propeller Database, XFOIL results for airfoils).
- **Trends:** more X should give more or less Y (thrust rises with RPM, weight rises with density).
- **Invariants:** efficiency below the physical limit, no negative thrust in normal operation, symmetric airfoil symmetric results.
- **Edge cases:** smallest and largest slider values shouldn't produce `NaN` or `Infinity`.

```js
it('heavier material makes a heavier prop', () => {
  const p = analyzeProp(prop10, af10, 6000);
  expect(structure(prop10, MATERIALS.alu, p).massG).toBeGreaterThan(structure(prop10, MATERIALS.nylon, p).massG);
});
```

## Validating against real props

```bash
npm run validate              # full error report, NeuralFoil
npm run validate -- --classic # same with the classic airfoil model
```

The report compares PropLab with six UIUC wind-tunnel props (with their real blade geometry, then with PropLab's simple planform) and with APC's published files. Results and how to read them: [Knowledge base → Validation](../knowledge-base/validation.md). To add a prop: [Reference data → Adding a prop](../knowledge-base/reference-data.md#adding-a-prop-to-validation).

After any physics change: run `npm run validate`, and if accuracy improved, tighten the limits in `tests/validation.test.js` and update the validation page.
