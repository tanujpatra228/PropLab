# Decisions

A log of modelling and calibration choices, newest last. Each entry says what was decided, why, and what evidence supports it, so future changes don't undo good choices by accident (or keep bad ones out of habit).

Format: **D-NNN Title** · date · status.

---

## D-001 Validate against measured data, not manufacturer data
2026-10-25 · accepted

**Decision:** the primary accuracy reference is UIUC wind-tunnel measurements. APC's published files are a secondary sanity check.

**Why:** APC's files are computed, not measured, and read ~5% high on thrust for the 10×4.7 SF. Tuning to them would bake in their bias. First comparison (classic model vs APC) showed PropLab −15% thrust / −20% power; against measurements the real gap was smaller.

## D-002 Run NeuralFoil in the browser
2026-10-25 · accepted

**Decision:** port NeuralFoil to JavaScript instead of hosting the Python version behind an API, or keeping only the empirical model.

**Why:** no server to run or pay for, works offline, keeps the app a static site. The weights are small (217 kB after trimming unused outputs). Port verified to 10⁻⁴ against Python. The classic model remains as a fallback while weights load.

## D-003 Stall is the first lift peak
2026-10-25 · accepted

**Decision:** with NeuralFoil, the stall angle is the first local maximum of lift above 0°. Past it, PropLab uses a post-stall model (lift decays 0.025 per degree from its peak, never below flat-plate lift; drag rises toward flat-plate drag).

**Why:** NeuralFoil inherits XFOIL's unreliable deep-stall behaviour: lift often climbs again past stall at low confidence (E63 at Re 60k: CL 1.42 at 9°, 1.14 at 12°, then rising to 1.49 at 24° with confidence 0.19). Taking the global maximum reported "stall at 24°", which is wrong.

## D-004 Selig S1223 removed
2026-10-25 · accepted

**Decision:** the S1223 high-lift airfoil was dropped from the airfoil list.

**Why:** at drone-sized Reynolds numbers, NeuralFoil's predictions for it are erratic (lift 1.43 at 3°, 1.13 at 6°, then rising) with confidence 0.5 to 0.7. Showing it would mislead users. Revisit if a better model or measured data becomes available.

## D-005 Airfoil per APC product line
2026-10-25 · accepted

**Decision:** for validation and measured presets, Slow Flyer props use the Eppler E63, Thin Electric props use NACA 4406.

**Why:** APC doesn't publish airfoils. Candidates tested on the measured geometry with NeuralFoil:

| Airfoil | Slow Flyer thrust / power | Thin Electric thrust / power |
| --- | --- | --- |
| NACA 4406 | −19.7% / −25.0% | **−3.9% / −4.9%** |
| NACA 4408 | −21.3% / −24.7% | −7.0% / −5.3% |
| NACA 6406 | −10.7% / −10.7% | +0.6% / +8.8% |
| Clark Y | −28.0% / −27.2% | −19.5% / −9.1% |
| **Eppler E63** | **−5.1% / −8.2%** | +16.8% / +17.6% |

## D-006 Root thickness for the strength check
2026-10-25 · accepted

**Decision:** the blade root is assumed at least 20% thick (relative to its chord), or 2.2× the airfoil thickness if larger, capped at 30%.

**Why:** the original rule (2.2× airfoil thickness) made thin airfoils absurdly weak: a real APC 10×4.7 SF came out at 0.9× safety factor at 6,000 RPM, below APC's own 6,500 RPM limit. Swept the minimum against APC's RPM limits; with 20%, Thin Electric props reach a 1.2 to 1.9× safety factor at APC's limit (plausible for a manufacturer rating). Slow Flyers come out stronger than their limit suggests because their limit is set by flutter, which isn't modelled (see [Insights 7](insights.md#7-static-strength-isnt-the-whole-story)).

## D-007 BEMT convergence exit
2026-10-25 · accepted

**Decision:** each blade strip stops iterating once induced velocities change by less than 10⁻⁶ of the local blade speed (minimum 7 iterations, maximum 120).

**Why:** halves solver time (2.6 → 1.3 ms per 32-strip solve) with no change in validation results. Bisection loops for drone hover/max RPM were also trimmed to 18 steps (sub-RPM precision).

## D-008 Prandtl-Glauert on lift below stall
2026-10-25 · accepted

**Decision:** lift is multiplied by 1/√(1 − M²) (M capped at 0.8) for attached flow, using each strip's local Mach number.

**Why:** NeuralFoil and the classic model are incompressible. Effect is negligible below ~0.3 Mach and grows at high tip speeds, where the coach already warns about noise and losses.
