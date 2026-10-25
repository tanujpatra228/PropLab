# Testing

## What's tested

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

The best next step for trust is a test file that loads a few APC or UIUC data points (diameter, pitch, RPM, measured thrust and power) and checks PropLab stays within a stated error band. Record the error you see today, then use the test to make sure model changes improve it rather than make it worse.
