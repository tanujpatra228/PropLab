# Validation

How close PropLab is to real propellers, measured. Last run: 2026-10-25.

## Headline

With NeuralFoil and the propeller's real blade geometry, PropLab is within **5.3% on thrust** and **7.5% on power**, on average, of wind-tunnel measurements of six APC propellers. Efficiency (which depends on the ratio of the two) is within about **1%**.

With PropLab's simplified "classic" blade shape (what you get from just diameter, pitch and blade width), errors are about **11% on thrust and 13.5% on power**.

## Results

Mean absolute error and bias (PropLab minus reference), all static (hover) conditions.

| Comparison | Airfoil model | Thrust error | Thrust bias | Power error | Power bias |
| --- | --- | --- | --- | --- | --- |
| UIUC measured, real blade geometry | **NeuralFoil** | **5.3%** | −4.0% | **7.5%** | −7.1% |
| UIUC measured, real blade geometry | Classic | 7.3% | +6.8% | 7.9% | −0.9% |
| UIUC measured, classic planform | **NeuralFoil** | **10.9%** | −1.3% | **13.5%** | −2.6% |
| UIUC measured, classic planform | Classic | 14.1% | +9.0% | 20.2% | +3.5% |
| APC published (computed), classic planform | NeuralFoil | 8.5% | −7.5% | 8.3% | −7.4% |

### Per propeller (NeuralFoil, real geometry)

| Prop | Line | Airfoil used | Thrust bias | Power bias |
| --- | --- | --- | --- | --- |
| APC 9×4.7 | Slow Flyer | Eppler E63 | +2.4% | +0.4% |
| APC 10×4.7 | Slow Flyer | Eppler E63 | −7.1% | −11.9% |
| APC 11×4.7 | Slow Flyer | Eppler E63 | −9.2% | −13.2% |
| APC 9×4.5 | Thin Electric | NACA 4406 | −0.8% | −3.1% |
| APC 10×5 | Thin Electric | NACA 4406 | −5.1% | −8.1% |
| APC 11×5.5 | Thin Electric | NACA 4406 | −4.0% | −6.4% |

### How to read this

- **Why NeuralFoil wins even though classic is close on real geometry:** classic's errors point in opposite directions (thrust +6.8%, power −0.9%), so it overpredicts efficiency by about 11%. NeuralFoil's errors are both slightly negative, so efficiency, hover time and g/W come out almost exactly right. It is also much better on simple designs, and handles any airfoil shape without hand-tuned formulas.
- **The gap between "real geometry" and "classic planform"** (5% → 11%) is the cost of describing a blade with three numbers. Use the custom planform editor or a measured blade for better accuracy.
- **Errors grow with RPM on the 10" and 11" Slow Flyers** (−6% at 2,400 RPM to −10% at 6,500 RPM on thrust). Measured thrust coefficient rises with RPM faster than the model predicts. Likely causes: blade flexing (Slow Flyers are flexible), and transition behaviour at these Reynolds numbers. See [Open questions](open-questions.md).
- **APC's own files are not ground truth.** They are computed by APC's software and read about 5% higher on thrust than UIUC measured for the same prop (10×4.7 SF at ~6,000 RPM: APC Ct 0.135, UIUC Ct 0.128).

## Method

1. Reference data: [UIUC Propeller Database](reference-data.md#uiuc-propeller-database) static tests (6 props × 6 RPM points), with each prop's measured chord and twist at 18 stations.
2. Each product line is paired with the airfoil that best represents it (`LINE_AIRFOIL` in `scripts/validate.js`). APC doesn't publish its airfoils, so this pairing was chosen by testing candidates. See [Decisions](decisions.md#d-005-airfoil-per-apc-product-line).
3. PropLab computes thrust and power coefficients at each measured RPM. Errors are relative: (PropLab − reference) / reference.

## Run it

```bash
npm run validate            # NeuralFoil (default)
npm run validate -- --classic   # classic airfoil model
```

`tests/validation.test.js` runs the same comparison in CI and fails if accuracy regresses past these limits:

| Check | Limit | Current |
| --- | --- | --- |
| Solver, real geometry, thrust MAE | < 10% | 5.3% |
| Solver, real geometry, power MAE | < 10% | 7.5% |
| Classic planform, thrust and power MAE | < 25% | 10.9% / 13.5% |
| Any single measured point | < 20% | worst 19.5% (11×4.7 SF power at 6,000 RPM, see Open questions #1) |

When you improve accuracy, tighten the limits and update the tables above.

## History

| Date | Change | Thrust MAE (real geom.) | Power MAE (real geom.) |
| --- | --- | --- | --- |
| 2026-10-25 | Baseline: classic model vs APC published data, classic planform (no measured geometry yet) | 15.4% (vs APC) | 20.4% (vs APC) |
| 2026-10-25 | NeuralFoil port + measured geometry + matched airfoils | **5.3%** | **7.5%** |
