# Architecture

## Folder map

```
index.html               Editor shell markup: top bar, sidebar container, canvas, inspector, help dialog
public/favicon.svg       Copied as-is into the build
src/
  main.js                Entry point: compute pipeline, readouts, coach, baseline, editor chrome, render loop
  controls.js            Sidebar sections and controls, generated from the SECTIONS config
  state.js               Presets, shared `app` state object, localStorage save/restore
  style.css              All styling, theme tokens for light and dark
  lib/
    format.js            Number formatting helpers (fmt, fmtG, splitG)
    theme.js             Reads CSS color tokens for canvas/WebGL, theme-change listener
  data/
    uiuc-static.js       Measured APC props (UIUC): geometry + static performance
  physics/               Pure functions, no DOM. Unit tested.
    constants.js         Air density, viscosity, gravity, speed of sound, chord shape
    materials.js         Material table (density, strength, display color, note)
    airfoil.js           Airfoil families, panel method, NeuralFoil tables, lift/drag polar
    airfoil-data.js      Clark Y and E63 coordinates
    kulfan.js            Airfoil normalization + Kulfan (CST) fit for NeuralFoil
    neuralfoil/          NeuralFoil network (model.js) and weights (weights.js, lazy-loaded)
    blade.js             Chord and blade angle along the radius (classic, custom, measured)
    propeller.js         Blade Element Momentum Theory solver (hover + forward flight)
    structure.js         Blade mass, root stress, safe RPM
    drone.js             Whole-drone analysis
    index.js             Re-exports everything
  views/
    spinRig.js           Three.js scene: propeller mesh, slipstream particles, camera
    windTunnel.js        2D flow field + particle tracer for the blade cross-section
    chart.js             Performance curve on a canvas
scripts/validate.js      Accuracy report vs UIUC/APC data (npm run validate)
scripts/export-neuralfoil.py  Regenerates NeuralFoil weights (Python, tooling only)
tests/                   Vitest: physics, NeuralFoil port, validation regression guard
docs/                    You are here
```

## The data flow

Everything follows one loop: **input → state → compute → render**.

```
 Slider / number box / preset
            │
            ▼
   app.S  (user inputs, UI units)          src/state.js
            │  schedule() batches to the next animation frame
            ▼
   compute()                               src/main.js
     ├─ getAirfoil()    (cached per airfoil; NeuralFoil table ~60 ms to build)
     ├─ analyzeProp()   at the bench RPM and airspeed
     ├─ structure()     weight + strength at bench RPM
     ├─ maxSafeRpm()
     ├─ analyzeDrone()  hover, max thrust, flight time
     ├─ curve: analyzeProp() at 32 RPMs (static) for the chart
     └─ speedCurve: analyzeProp() at 25 airspeeds (bench RPM)
            │
            ▼
   app.R  (all results)
            │
            ▼
   update() renders:
     syncSidebar · renderBench · renderDrone · renderCoach
     drawChart · updateProp (3D) · updateTunnel (2D)
```

A separate `requestAnimationFrame` loop (`frame()` in `main.js`) runs continuously to animate the 3D spin and both particle systems. It only *reads* `app.R`; it never recomputes physics.

## State

`src/state.js` exports a single mutable object:

| Field | Meaning |
| --- | --- |
| `app.S` | User inputs. `design` (diaIn, pitchIn, blades, chordPct, camber %, thick %, material, airfoil, planform, customChord[], customTwist[]), `rpm`, `airspeedKmh`, `drone` (motors, frameG, cells, mah, kv, motorW) |
| `app.preset` | Key of the active preset, or `null` once the user edits anything |
| `app.R` | Latest compute results (see below) |
| `app.base` | Pinned baseline snapshot, or `null` |
| `app.flow` | `{ on, paused }` for the animations |
| `app.colorMode` | `'material' \| 'lift' \| 'stall'` for the 3D blade |

`designPhys()` converts UI units to physics units (camber and thickness from % to fractions) and, for custom or measured planforms, adds `geometry` rows. `airfoilSpec()` gives the airfoil spec for the physics.

### `app.R` shape

| Key | From | Contents |
| --- | --- | --- |
| `d` | `designPhys()` | Design in physics units |
| `af` | `airfoilModel()` | Spec, outline points, thickness/camber, NeuralFoil `table` (or null), classic-model fallbacks, `source` |
| `mat` | `MATERIALS[...]` | Selected material |
| `perf` | `analyzeProp()` | Thrust `T` (N), torque `Q`, power `P` (W), `V`, `eta`, `J`, `fm`, per-station data `st[]`, `s75`, `tipMach`, `gPerW`, `stallFrac` |
| `perfStatic` | `analyzeProp()` | Same at airspeed 0 (used for strength and RPM charts) |
| `str` | `structure()` | `massG`, `stressMPa`, `sf` (safety factor) |
| `safe` | `maxSafeRpm()` | RPM with 2× safety margin |
| `drone` | `analyzeDrone()` | Weights, `maxRpm`, `limitedBy`, `tMaxG`, `tw`, `hover{rpm, minutes, amps, throttle, gPerW, perf}`, `payloadG`, `sfMax`, `tipMachMax` |
| `curve`, `xMax` | loop | RPM chart points `{rpm, g, w, eff}` |
| `speedCurve`, `vMaxKmh` | loop | Airspeed chart points `{kmh, g, w, eta}` |

## Performance budget

A full `compute()` takes roughly 10 to 20 ms once the JavaScript engine has warmed up. A single BEMT solve is ~0.15 to 1.3 ms depending on strip count; the drone's bisection searches dominate. Switching to a new airfoil adds ~60 ms once (NeuralFoil table), then it's cached. That's fine at 60 fps because `schedule()` coalesces slider events into at most one compute per animation frame.

The wind tunnel field (120 × 60 grid × 60 panels) is rebuilt only when the angle of attack or airfoil changes, and is cached by a string key.

If you add heavier physics, move `compute()` into a Web Worker. The physics modules already have no DOM dependencies, so this is a mechanical change.

## Theming

All colors are CSS custom properties in `style.css`, defined for light on `:root` and redefined for dark under `prefers-color-scheme` and `[data-theme="dark"]`. Canvas and WebGL code can't read CSS directly, so `lib/theme.js` copies tokens into the `T` object and `onThemeChange()` triggers a redraw when the theme flips.

The canvas area (`--scope`) stays dark in both themes on purpose: it reads like an instrument screen and keeps airflow particles visible.

## Module boundaries (keep these)

- `physics/` never imports from `views/`, `main.js`, or anything touching the DOM.
- `views/` read `app` and `T`, render, and expose small functions (`init*`, `update*`, `*Frame`). They don't call `compute()`.
- `main.js` is the only place that writes `app.R` and decides when to recompute.
