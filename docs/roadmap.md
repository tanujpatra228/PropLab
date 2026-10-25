# Roadmap

Ideas for what to build next, grouped by the direction they push PropLab. The suggested order is at the bottom.

## Direction A: Make it real (build and test physical props)

| Idea | Value | Effort | Notes |
| --- | --- | --- | --- |
| **STL export** | High | Small | Mesh already exists in `buildPropGeometry()`. Needs a closed hub and a motor shaft hole |
| Print guide | Medium | Small | Recommended layer orientation, infill and walls per material |
| **Thrust stand integration** | Very high | Medium | ESP32 + load cell + HX711 (~₹2,000). Read measurements over Web Serial and overlay them on the chart |
| Sim vs real calibration | Very high | Medium | Fit a correction factor from measured data; show "calibrated" results |

This is PropLab's most distinctive path: very few hobby tools close the loop between simulation and measurement.

## Direction B: Better aerodynamics

| Idea | Value | Effort | Notes |
| --- | --- | --- | --- |
| Validation suite vs APC/UIUC data | High | Small | Turns "15 to 25%" into a measured number. See [Testing](guides/testing.md#validating-against-real-props) |
| Custom twist and chord distribution | High | Medium | Editable curves (a few control points) instead of fixed shapes |
| Forward flight / climb | High | Medium | Add freestream velocity to BEMT; unlocks plane props and cruise flight time |
| Viscous airfoil polars (NeuralFoil) | High | Medium | Replaces the empirical stall/drag model; needs a small API or an ONNX model |
| More airfoil families | Medium | Medium | NACA 5-digit, Clark Y, imported `.dat` coordinates |
| Tip Mach correction | Low | Small | Prandtl-Glauert on Cl |
| Noise estimate | Medium | Medium | Tip-speed-based empirical noise level |

## Direction C: Better drone planning

| Idea | Value | Effort | Notes |
| --- | --- | --- | --- |
| Motor and battery database | High | Medium | Pick real parts instead of typing Kv and watts |
| Mission profile | Medium | Medium | Hover + cruise + climb mix for realistic flight time |
| Battery voltage sag | Medium | Small | More honest flight times |
| Prop optimiser | High | Large | "Find the most efficient prop for this drone": sweep parameters in a Web Worker |

## Direction D: Product polish

| Idea | Value | Effort | Notes |
| --- | --- | --- | --- |
| Share a design by link | High | Small | Encode `app.S` in the URL hash |
| Save multiple designs | High | Medium | Local list with names; compare any two. Good moment to adopt a UI framework |
| Persist baseline | Low | Small | Store `app.base` in localStorage |
| TypeScript migration | Medium | Medium | Start with `src/physics/` |
| Guided tour | Medium | Small | First-visit walkthrough of the 5 regions |
| PWA / offline | Low | Small | Works offline after first visit |

## Suggested order

1. **Validation suite** (know how accurate you are before improving anything)
2. **Share by link** (cheap, makes the project showable)
3. **STL export**
4. **Thrust stand + Web Serial**
5. **Custom twist and chord** (now you can print and test the designs you optimise)
6. **Forward flight**
7. Everything else as interest leads

Each item should follow [Add a feature](guides/add-a-feature.md): physics and tests first, then UI, then a docs page.
