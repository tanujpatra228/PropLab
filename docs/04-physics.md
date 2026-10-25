# Physics Models

Every number in PropLab comes from one of five models in `src/physics/`. This page explains each in plain terms first, then the details a developer needs.

> **Accuracy:** expect results within roughly 15 to 25% of real propellers. The models are good at **ranking designs** (which of two props is better and by roughly how much). They are not good enough to certify hardware.

## Units and constants

Physics runs in SI units internally (metres, newtons, watts, radians). Inputs arrive in hobby units (inches, %, grams) and are converted at the edges.

| Constant | Value | File |
| --- | --- | --- |
| Air density `RHO` | 1.225 kg/m³ (sea level, 15 °C) | `constants.js` |
| Air viscosity `MU` | 1.81 × 10⁻⁵ Pa·s | `constants.js` |
| Gravity `G` | 9.81 m/s² | `constants.js` |
| Speed of sound `SOUND` | 343 m/s | `constants.js` |

## 1. Airfoil shape: NACA 4-digit

`nacaPoints(camber, thick, n)` in `airfoil.js`

The blade's cross-section is a [NACA 4-digit airfoil](https://en.wikipedia.org/wiki/NACA_airfoil): a standard family defined by maximum camber (curve), its position (fixed at 40% of the chord here), and thickness. The sidebar shows the equivalent code, e.g. camber 4%, thickness 10% → **NACA 4410**.

Points use cosine spacing (dense at the nose and tail where the flow changes fastest) and are ordered trailing edge → lower surface → leading edge → upper surface → trailing edge.

## 2. Airflow around the slice: panel method

`panelSolve(points, alpha)` in `airfoil.js`

**In plain terms:** the airfoil outline is cut into small straight panels. Each panel gets a little "source" (pushes air away) and all panels share one "vortex" (spins air around). The solver picks their strengths so that no air flows *through* the surface, and air leaves the sharp tail smoothly (the Kutta condition). Once solved, you can ask for the air velocity at any point around the airfoil.

**Details:**
- Hess-Smith formulation: constant-strength source per panel + one uniform vortex strength, solved as an (N+1) × (N+1) linear system with Gaussian elimination.
- Induced velocities use the exact analytical formulas for a constant-strength panel in panel-local coordinates.
- Returns `cl` (from integrating surface pressure), `cp` per panel, and a `velocity(x, y)` function used by the wind tunnel.
- **Inviscid**: it ignores air's stickiness, so it can't predict stall or drag by itself. Validated by test: NACA 0012 at 5° gives Cl ≈ 0.60, matching published inviscid results.

## 3. Lift and drag: the polar

`airfoilModel(camber, thick)` and `polar(af, alpha, Re)` in `airfoil.js`

**In plain terms:** this turns the airfoil's shape into "how much lift and drag at what angle", including when it stalls.

**Details:**
- Lift slope and zero-angle lift are measured from two panel-method runs (0° and 4°), then multiplied by 0.85 to approximate real (viscous) air.
- Max lift: `clmaxBase = 1.25 + 6·camber + 1.5·(thick − 0.06) − 4·max(0, thick − 0.13)`, scaled down at low Reynolds number (small, slow blades) by up to 20%.
- **Stall**: above the stall angle, lift drops 1.4 per radian and never goes below a flat-plate value (`1.05·sin 2α`). Drag jumps toward flat-plate drag (`1.8·sin²α`).
- **Drag**: minimum drag rises at low Reynolds number (`0.006 + 3/√Re`), scales with thickness, plus a quadratic term away from the best lift coefficient.
- These stall and drag formulas are empirical fits to typical low-Reynolds airfoil data, not first principles. This is the biggest source of error in the app.

## 4. Propeller: Blade Element Momentum Theory (BEMT)

`analyzeProp(design, af, rpm, stations = 32)` in `propeller.js`

**In plain terms:** each blade is cut into 32 strips from the hub to the tip. For each strip, two views must agree: (a) the strip is a little wing, and its lift and drag depend on the air hitting it; (b) the propeller is a disc pushing air down, and the push on each ring equals the air's momentum change. The solver adjusts how fast air is sucked through each ring until both views give the same thrust.

**Details:**
- **Static / hover only**: the drone isn't moving forward or climbing (freestream velocity = 0).
- Geometry: strips from 15% to 100% of the radius. Chord follows `chordShape(x)` scaled by the "blade width" input. Pitch angle `β = atan(pitch / (2πr))` (constant geometric pitch).
- Each strip iterates (120 steps, relaxation 0.35) on axial induced velocity `vi` and swirl `vt`.
- **Prandtl tip loss** `F` accounts for air leaking around the blade tips.
- Outputs: thrust `T`, torque `Q`, shaft power `P = Q·Ω`, figure of merit, efficiency (grams per watt), tip Mach number, and per-strip data (`st[]`: angle of attack, lift coefficient, Reynolds number, local thrust, induced velocity, stalled flag).
- `stallFrac` counts only strips beyond 40% radius. The hub region of every constant-pitch prop stalls; that's normal and contributes little thrust.
- Validated by test: a 10×4.7 prop at 6000 RPM gives ~560 g and ~49 W, in the range of APC's published data.

## 5. Structure: weight and strength

`structure(design, material, perf)` and `maxSafeRpm(...)` in `structure.js`

**In plain terms:** spinning tries to pull each blade off the hub, and thrust tries to bend it upward. Both are worst at the blade root. PropLab adds them up and compares against what the material can take.

**Details:**
- Blade cross-section area ≈ `0.685 · t · c²` (standard approximation for NACA sections). Volume × density gives mass; a small hub volume is added.
- **Centrifugal force** at the root: sum of `ρ_material · area · Ω² · r` along the blade.
- **Bending moment** at the root: sum of each strip's thrust × its distance from the root.
- Root section is assumed 2.2× thicker than the airfoil (capped at 30%), like real props. Bending uses `I ≈ 0.0365 · c · h³`.
- **Safety factor** = material strength ÷ total root stress. The app wants at least 2×.
- `maxSafeRpm` bisects for the RPM where the safety factor hits 2.
- Ignores vibration, fatigue, impact, and print-layer direction. Real 3D-printed parts can be much weaker than these numbers suggest, which is why the PLA/PETG/nylon strengths in `materials.js` are already reduced.

## 6. Drone: whole-vehicle estimate

`analyzeDrone(design, af, material, drone)` in `drone.js`

**In plain terms:** add up the drone's weight, find the RPM where the props can hold it up, and work out how long the battery lasts at that power.

**Details:**
- Battery: nominal 3.7 V per cell; mass from energy at 160 Wh/kg plus 8% for wiring and case.
- All-up weight = frame input + battery + props × motor count.
- **Max RPM** = the lower of (a) `Kv × voltage × 0.85` (voltage limit under load) and (b) the RPM where shaft power reaches 85% of the motor's rated power (bisection). `limitedBy` reports which.
- **Hover RPM**: bisection for thrust = weight ÷ motors.
- **Hover time** = 80% of battery energy ÷ electrical power, with electrical power = shaft power ÷ 0.7 (motor + ESC efficiency).
- **Throttle** ≈ hover RPM ÷ voltage-limited RPM.
- **Payload** = extra mass that keeps thrust-to-weight at 2×.
- Ignores frame drag, wind, maneuvering, battery voltage sag over the flight, and motor efficiency changing with load. Real flight times are usually 20 to 40% lower than the ideal hover time shown.

## Known limitations (and how to fix them)

| Limitation | Effect | Fix idea |
| --- | --- | --- |
| Hover only | Can't analyse planes or fast forward flight | Add freestream velocity `V` to the BEMT loop (the momentum equation already has the form for it) |
| Empirical stall and drag | Main error source | Replace `polar()` with [NeuralFoil](https://github.com/peterdsharpe/NeuralFoil) via a small backend or an ONNX model in the browser |
| Constant geometric pitch | Real props have custom twist | Add a twist-distribution control and use it for `β(r)` |
| Fixed chord shape | One planform for every design | Make `chordShape` configurable (e.g. root/tip chord, taper) |
| No compressibility | Over-optimistic above ~0.7 Mach at the tips | Add a Prandtl-Glauert correction to Cl |
| Ideal hover time | Optimistic flight times | Add frame drag and a mission profile |
