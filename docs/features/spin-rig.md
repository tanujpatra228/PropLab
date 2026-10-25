# Spin Rig (3D View)

The main canvas: your propeller in 3D, spinning in slow motion, with particles showing the air it moves.

## What you see

- **The propeller**, built from your exact parameters: every blade is lofted from 30 cross-sections of your NACA airfoil, scaled by the chord at that radius and twisted to the local pitch angle. Tips are rounded off in the last 4% of the radius.
- **A hub and motor** for scale, and a faint ring marking the disc the blades sweep.
- **Airflow particles** that drift in from above, speed up and narrow as they pass through the disc, and swirl as they leave below. Brighter particles are moving faster.
- **HUD (top-left):** diameter, how fast the air leaves the prop, and tip speed, all in plain units.

Drag to orbit, scroll or pinch to zoom. **Reset view** reframes the camera.

## Color modes

| Mode | Meaning |
| --- | --- |
| **Material** | The blade's material color, with orange-painted tips like real props |
| **Lift** | Where along the blade the thrust is made (dark blue = little, orange = most). Usually peaks around 70 to 85% of the radius |
| **Stall risk** | Green = comfortable, yellow = within 3 to 7° of stalling, red = stalled. Some red at the hub is normal for constant-pitch props |

## Toolbar

| Button | Effect |
| --- | --- |
| Airflow | Show/hide particles |
| Pause / Play | Freezes spin and both particle systems. Starts paused if the system has "reduce motion" on |
| Reset view | Reframe the camera on the current propeller |

## How it works

- Geometry: `buildPropGeometry()` in `src/views/spinRig.js`. Section points come from `nacaPoints()`; pitch angle at radius `r` is `atan(pitch / 2πr)`, exactly what the physics uses.
- Coloring: `colorProp()` writes per-vertex colors from `app.R.perf.st` (the BEMT strip results). Lift uses each strip's thrust; stall uses `polar()` to get the margin to the stall angle.
- Particles (2,200 points) follow the classic actuator-disc model. Axial speed at height `z` is `vi · (1 + z / √(z² + R²))`, where `vi` is the induced velocity from BEMT at that particle's radius. The tube radius shrinks to conserve mass. Below the disc, particles swirl at a rate taken from BEMT's tangential induced velocity.
- **Slow motion:** spin speed is divided by 40 and capped at 4 revolutions per second so it reads as a spinning prop rather than a blur. Particle speed is scaled to the prop's size, so the *relative* difference between designs is what matters.
- The geometry is rebuilt only when shape parameters change; colors update on every compute.

## Extending

- New color mode: add a button with `data-color="yourmode"` in `index.html`, then a branch in `colorProp()` plus a legend in the same function.
- Different blade planform: change `chordShape()` in `src/physics/constants.js`. The 3D view and the physics both use it, so they stay in sync.
