# Wind Tunnel (2D View)

A floating window on the canvas showing live airflow around one slice of your blade, taken at 75% of the blade's length (where props do most of their work).

## What you see

- **The airfoil** you chose (NACA, Clark Y or E63) tilted to its angle of attack, with air flowing left to right.
- **Background color:** blue where air slows down (higher pressure), orange where it speeds up (lower pressure). Low pressure on top and high pressure underneath is what makes lift.
- **Streak particles** tracing the actual flow lines, bending around the nose and over the top.
- **Lift arrow** sized by the lift coefficient.
- **Stats line:** angle to the air, lift strength (Cl), stall angle, and a status (Smooth flow / Near stall / Stalled). Lift and stall come from NeuralFoil, at the slice's real Reynolds and Mach number.

When the blade stalls, a grey dead-air region appears above the back of the airfoil, particles there jitter, and a red warning shows.

## Controls

| Control | Effect |
| --- | --- |
| **Match my propeller** (default on) | Uses the angle of attack the BEMT solver computed at 75% span for your current design and RPM |
| Angle slider | With matching off, set any angle from −6° to 22° to explore the airfoil on its own |
| Expand button | Makes the wind tunnel fill the canvas (and hides the 3D toolbar). Press again to go back |
| Collapse button | Shrinks the window to its title bar |

## How it works

1. `updateTunnel()` in `src/views/windTunnel.js` picks the angle, gets lift and stall info from `polar()`, and builds a cache key from the airfoil spec, angle, and stall state.
2. If the key changed, `buildField()` gets the outline from `airfoilShape()`, runs the panel method (`panelSolve()`, 60 panels) once, then samples velocity on a 120 × 60 grid. Points inside the airfoil are masked out.
3. `paintField()` colors each grid cell by speed ratio and draws it to an offscreen canvas, which is scaled up smoothly every frame.
4. `tunnelFrame()` moves 380 particles through the grid each frame using bilinear interpolation and draws 9-point trails.

The display keeps the flow horizontal and rotates the airfoil about its quarter-chord, which is how wind tunnel photos look.

### About stall in this view

The panel method is inviscid, so real flow separation can't come out of it. The dead-air region is a **visual sketch** placed when the lift/drag model says the airfoil is stalled. The stall angle and lift numbers come from [NeuralFoil](../04-physics.md#3-lift-and-drag-neuralfoil-default-or-classic).

## Extending

- Show the pressure distribution along the surface: `panelSolve()` already returns `cp` per panel. Plot it as a small line chart under the tunnel.
- Pick the slice position: replace `R.perf.s75` with the station nearest a user-chosen radius (`R.perf.st` has all 32).
- Higher fidelity: swap the colormap source to a viscous solver's output (see [Roadmap](../roadmap.md)).
