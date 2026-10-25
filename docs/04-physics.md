# Physics Models

Every number in PropLab comes from the models in `src/physics/`. This page explains each in plain terms first, then the details a developer needs.

> **Accuracy (measured):** against wind-tunnel data for six APC propellers, PropLab is within **5.3% on thrust and 7.5% on power** when given the real blade geometry, and about **11% / 13.5%** with its simple classic blade shape. Full results: [Knowledge base → Validation](knowledge-base/validation.md).

## Units and constants

Physics runs in SI units internally (metres, newtons, watts, radians). Inputs arrive in hobby units (inches, %, grams, km/h) and are converted at the edges.

| Constant | Value | File |
| --- | --- | --- |
| Air density `RHO` | 1.225 kg/m³ (sea level, 15 °C) | `constants.js` |
| Air viscosity `MU` | 1.81 × 10⁻⁵ Pa·s | `constants.js` |
| Gravity `G` | 9.81 m/s² | `constants.js` |
| Speed of sound `SOUND` | 343 m/s | `constants.js` |

## 1. Airfoil shape

`airfoilShape(spec, n)` in `airfoil.js`. A spec is `{ family, camber, thick }`.

| Family | Source | Character |
| --- | --- | --- |
| **NACA 4-digit** (`naca4`) | Standard equations, camber at 40% chord | Set your own camber and thickness. Sidebar shows the code, e.g. **NACA 4408** |
| **Clark Y** (`clarky`) | UIUC coordinates | Flat bottom, 11.7% thick |
| **Eppler E63** (`e63`) | UIUC coordinates | Thin (4.3%), strongly curved, low-speed specialist. Best match for APC Slow Flyer props |

Outlines are resampled with cosine spacing and ordered trailing edge → lower → leading edge → upper → trailing edge. `shapeStats()` measures max thickness and camber for the strength check and the 3D model.

## 2. Airflow around the slice: panel method

`panelSolve(points, alpha)` in `airfoil.js`

**In plain terms:** the outline is cut into small straight panels. Each gets a little "source" (pushes air away) and all share one "vortex" (spins air around). The solver picks their strengths so no air flows *through* the surface and air leaves the sharp tail smoothly (the Kutta condition). Then you can ask for the air velocity anywhere.

**Details:** Hess-Smith formulation, exact analytical panel influence formulas, (N+1)×(N+1) dense solve. Inviscid, so it can't predict drag or stall itself. Used for the **wind tunnel flow picture** and as the classic model's lift slope. Test: NACA 0012 at 5° gives Cl ≈ 0.60, matching published inviscid results.

## 3. Lift and drag: NeuralFoil (default) or classic

`airfoilModel(spec)` and `polar(af, alpha, Re, mach)` in `airfoil.js`

**In plain terms:** this answers "how much lift and drag does this blade slice make at this angle and speed?", including the stickiness of air and stall.

### NeuralFoil (default)

An AI model trained on XFOIL airfoil analyses, ported to JavaScript and run in the browser. Full write-up: [Knowledge base → NeuralFoil](knowledge-base/neuralfoil.md).

- On each new airfoil, PropLab fits Kulfan shape parameters (`kulfan.js`) and evaluates NeuralFoil on a grid of 37 angles (−12° to 24°) × 8 Reynolds numbers (10k to 1.28M), about 60 ms. The table is cached.
- `polar()` interpolates the table (bilinear in angle and log Reynolds number).
- **Stall** is the first lift peak. Past it, lift decays 0.025 per degree from its peak (never below flat-plate lift `1.05·sin 2α`) and drag rises toward flat-plate drag (`0.02 + 1.9·sin²α`). This avoids NeuralFoil's unreliable deep-stall predictions ([D-003](knowledge-base/decisions.md#d-003-stall-is-the-first-lift-peak)).
- Outside the table's angle range, results blend into flat-plate values.

### Classic (fallback)

Used for the first moment before NeuralFoil's weights load, or if they fail to load. Lift slope and zero-lift angle from two panel-method runs (× 0.85 for real air), an empirical max lift and stall model, and an empirical low-Reynolds drag formula.

### Compressibility

Both models multiply attached-flow lift by the Prandtl-Glauert factor `1/√(1 − M²)` (M capped at 0.8), using each strip's local Mach number ([D-008](knowledge-base/decisions.md#d-008-prandtl-glauert-on-lift-below-stall)).

## 4. Blade geometry

`chordRatio(d, x)` and `bladeAngle(d, x)` in `blade.js`, the single source of truth for the solver, the strength check and the 3D model.

| Planform | Chord | Blade angle |
| --- | --- | --- |
| **Classic** | `chordPct × chordShape(x)` (peaks near 45% radius, tapers to a rounded tip) | Constant geometric pitch: `atan(pitch / 2πr)` |
| **Custom** | Your 5 points (20 to 100% radius), linearly interpolated | Constant pitch + your twist offsets |
| **Measured** | UIUC measurement at 18 stations | UIUC measurement |

Custom and measured blades are passed to the physics as `d.geometry = [[x, c/R, betaDeg], ...]`.

## 5. Propeller: Blade Element Momentum Theory (BEMT)

`analyzeProp(design, af, rpm, stations = 32, V = 0)` in `propeller.js`

**In plain terms:** each blade is cut into 32 strips from hub to tip. For each strip, two views must agree: (a) the strip is a little wing whose lift and drag depend on the air hitting it; (b) the propeller is a disc pushing air, and the push on each ring equals the air's momentum change. The solver adjusts how fast air flows through each ring until both agree.

**Details:**
- **Hover or forward flight:** `V` is the airspeed through the disc (m/s). Momentum: `T' = 4πrρF(V + vᵢ)vᵢ`, solved as a quadratic for the induced velocity `vᵢ`. `V = 0` is hover/static thrust.
- **Prandtl tip loss** `F` accounts for air leaking around the tips.
- Each strip iterates with relaxation 0.35 until induced velocities stop changing (up to 120 iterations, [D-007](knowledge-base/decisions.md#d-007-bemt-convergence-exit)).
- **Outputs:** thrust `T`, torque `Q`, power `P = QΩ`, figure of merit (hover), propulsive efficiency `η = TV/P` (flight), advance ratio `J = V/nD`, tip Mach, grams per watt, and per-strip data (angle of attack, Cl, Cd, Reynolds and Mach number, local thrust, induced velocities, stall flag).
- `stallFrac` counts only strips beyond 40% radius; root stall is normal and contributes little.
- **Windmilling:** when the airspeed exceeds what the prop can push at that RPM, thrust goes negative. The UI explains this.

## 6. Structure: weight and strength

`structure(design, material, perf)` and `maxSafeRpm(...)` in `structure.js`

**In plain terms:** spinning pulls each blade off the hub and thrust bends it upward. Both are worst at the blade root. PropLab adds them and compares against the material's strength.

**Details:**
- Section area ≈ `0.685 · t · c²`. Volume × density = mass, plus a small hub.
- **Centrifugal force** at the root: sum of `ρ_material · area · Ω² · r` along the blade. **Bending moment:** sum of strip thrust × distance from root.
- Root thickness: at least 20% of the root chord, or 2.2× the airfoil thickness if larger, capped at 30%. Calibrated against APC's published RPM limits ([D-006](knowledge-base/decisions.md#d-006-root-thickness-for-the-strength-check)).
- **Safety factor** = strength ÷ root stress; the app wants 2×. `maxSafeRpm` bisects for that point.
- Ignores flutter and flex, vibration, fatigue, impacts and print-layer direction. Flexible blades (thin, wide, soft materials) are limited by flutter well before static strength ([Insights 7](knowledge-base/insights.md#7-static-strength-isnt-the-whole-story)).

## 7. Drone: whole-vehicle estimate

`analyzeDrone(design, af, material, drone)` in `drone.js` (always hover, `V = 0`)

- Battery: 3.7 V per cell; mass from energy at 160 Wh/kg + 8%.
- All-up weight = frame input + battery + props × motor count.
- **Max RPM** = lower of `Kv × voltage × 0.85` and the RPM where shaft power hits 85% of motor rating (`limitedBy` says which).
- **Hover RPM** by bisection; **hover time** = 80% of battery energy ÷ (shaft power ÷ 0.7).
- **Payload** = extra mass that keeps thrust-to-weight at 2×.
- Ignores frame drag, wind, maneuvering and battery sag. Real flight times are usually 20 to 40% shorter.

## Known limitations

See [Knowledge base → Open questions](knowledge-base/open-questions.md) for the ranked list, with evidence and ideas.
