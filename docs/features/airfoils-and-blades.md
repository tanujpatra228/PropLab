# Airfoils and Blade Shape

Two choices shape a propeller beyond its size: the **cross-section** (airfoil) and the **planform** (how width and twist change along the blade). Measured data shows both matter about as much as diameter and pitch ([Insights](../knowledge-base/insights.md)).

## Airfoil (Cross-section section)

| Choice | When to use it |
| --- | --- |
| **NACA 4-digit** | Explore: set curve (camber) and thickness yourself. NACA 4406 to 4408 behaves like typical thin electric props |
| **Clark Y** | Flat-bottomed classic, thick and forgiving. Good for 3D printing (strong, easy to print) |
| **Eppler E63** | Thin, strongly curved. Behaves like slow-flyer props: lots of lift at low speed |

Under the controls, a status line shows which lift/drag model is active: **NeuralFoil** (normal) or the quick classic model (for a moment while it loads).

## Planform (Blade shape section)

| Planform | What it is | Controls |
| --- | --- | --- |
| **Classic (automatic)** | A typical blade: widest near 45% of the length, tapering to a rounded tip, constant geometric pitch | Diameter, pitch, blades, blade width |
| **Custom (draw it)** | Your own width and twist along the blade | The editor (below) + diameter, pitch, blades |
| **APC 10×4.7 Slow Flyer (measured)** | A real blade measured in the UIUC wind tunnel | Diameter, blades (width and twist are fixed by the measurement, so pitch is disabled) |
| **APC 10×5 Thin Electric (measured)** | Same, for APC's thin electric line | Same |

The measured blades are also available as presets in the top bar ("Real props"), with the matching airfoil already set.

### The custom editor

Two small plots, root on the left and tip on the right, with points at 20, 40, 60, 80 and 100% of the radius:

- **Width (% of radius):** the chord. The dashed line is the classic shape for comparison.
- **Twist vs. pitch (°):** extra blade angle on top of the constant-pitch angle. Positive = steeper (more bite), negative = flatter. The dashed zero line is plain constant pitch.

Drag a point up or down (or focus it and use the arrow keys). **Reset to classic** copies the classic shape into the editor. Your custom shape is saved with the design.

**Things to try:**
- Flatten the tip (−3° at 100%) and watch the "Stall risk" view and hover efficiency.
- Make the tip narrower and the middle wider, like real props, and compare to the classic shape with Pin baseline.

## How it works

- Airfoil outlines: `airfoilShape()` and `AIRFOIL_FAMILIES` in `src/physics/airfoil.js`; coordinates for Clark Y and E63 in `src/physics/airfoil-data.js`.
- Blade geometry: `chordRatio()` and `bladeAngle()` in `src/physics/blade.js`. Custom and measured planforms become `d.geometry` rows in `designPhys()` (`src/state.js`).
- Editor: `initEditor()` / `drawEditor()` in `src/controls.js` (SVG with pointer events).
- Measured blades: `MEASURED` in `src/state.js`, data in `src/data/uiuc-static.js`.

## Extending

- **Add an airfoil:** add its coordinates (Selig order) to `airfoil-data.js` and an entry to `AIRFOIL_FAMILIES`. Check NeuralFoil's confidence for it at drone Reynolds numbers (30k to 300k) first; see [D-004](../knowledge-base/decisions.md#d-004-selig-s1223-removed).
- **Add a measured blade:** add the UIUC entry to `src/data/uiuc-static.js` and an entry to `MEASURED`.
- **Import .dat files:** parse Selig-format coordinates in the browser and add them as a temporary family.
