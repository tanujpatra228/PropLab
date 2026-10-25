# NeuralFoil in PropLab

## What it is

[NeuralFoil](https://github.com/peterdsharpe/NeuralFoil) (Peter Sharpe, MIT License) is a small neural network trained on millions of XFOIL analyses. Given an airfoil shape, an angle of attack and a Reynolds number, it predicts lift, drag (including skin friction and transition), pitching moment and a confidence score, about as accurately as XFOIL itself but thousands of times faster and without XFOIL's convergence failures.

PropLab runs it **entirely in the browser**: no server, works offline after the first load.

## How it flows through PropLab

```
airfoil outline (NACA / Clark Y / E63)
   │  normalizeAirfoil + kulfanFit        src/physics/kulfan.js
   ▼
18 Kulfan (CST) shape parameters
   │  neuralFoilAero(k, alpha, Re)        src/physics/neuralfoil/model.js
   ▼  evaluated once per airfoil on a 37 × 8 grid (-12..24°, Re 10k..1.28M)
lift/drag table                           buildPolarTable() in src/physics/airfoil.js
   │  bilinear lookup + post-stall model  polar()
   ▼
BEMT propeller solver, wind tunnel stats
```

Building a table takes ~60 ms (296 network evaluations at ~0.2 ms each); `main.js` caches tables per airfoil.

## The port

| Python (neuralfoil 0.3.3) | JavaScript |
| --- | --- |
| `get_aero_from_kulfan_parameters()` | `neuralFoilAero()` in `src/physics/neuralfoil/model.js` |
| `Airfoil.normalize()` | `normalizeAirfoil()` in `src/physics/kulfan.js` |
| `get_kulfan_parameters(method="least_squares")` | `kulfanFit()` (normal equations, 18 unknowns) |
| `nn-large.npz` | `src/physics/neuralfoil/weights.js` (base64 float32) |

Details kept from the original:

- **25 inputs:** 8 upper + 8 lower Kulfan weights, leading-edge weight, 50 × trailing-edge thickness, sin 2α, cos α, 1 − cos²α, (ln Re − 12.5)/3.5, (n_crit − 9)/4.5, forced transition upper/lower.
- **Symmetry trick:** the network is evaluated twice, once on the airfoil mirrored top-to-bottom at −α, and the two results are averaged. This is how it was trained.
- **Confidence penalty:** the squared Mahalanobis distance from the training distribution is subtracted from the confidence logit, so predictions far from the training data report low confidence.
- **Output scaling:** CL = y/2, CD = exp((y − 2)·2), CM = y/20.

Changes for PropLab:

- **Output layer trimmed** to the first 6 outputs (confidence, CL, CD, CM, transition upper/lower). The other 192 outputs are boundary-layer profiles PropLab doesn't use. This keeps the weights at 217 kB.
- **Model size "large"** (4 hidden layers × 128). "xlarge" is ~1.6× slower for a small accuracy gain.
- **Lazy loading:** `loadNeuralFoil()` dynamically imports the weights, so the page opens without waiting. Until loaded, PropLab uses its classic airfoil model.

## Verification

Compared against Python NeuralFoil on the same coordinates (5 airfoils × 6 angles × 3 Reynolds numbers = 90 cases):

| Quantity | Worst difference |
| --- | --- |
| CL | 7 × 10⁻⁵ |
| CD | 0.009% relative |
| Kulfan parameters | 2 × 10⁻⁴ |

`tests/neuralfoil.test.js` pins two of these reference values and checks symmetry and Reynolds-number trends.

## Known limits and how PropLab handles them

| Limit | Handling |
| --- | --- |
| **Deep stall is unreliable.** XFOIL (and therefore NeuralFoil) predicts lift climbing again past stall, with low confidence (often 0.2 to 0.4) | Stall is taken as the **first lift peak**; beyond it, lift decays toward flat-plate values and drag rises toward flat-plate drag. See [Decisions D-003](decisions.md#d-003-stall-is-the-first-lift-peak) |
| **Outside −12° to 24°** | Blends into flat-plate lift and drag over 10° |
| **High-lift, low-Re airfoils** (e.g. Selig S1223 at drone sizes) give erratic, low-confidence results | S1223 was removed from the airfoil list. See [Decisions D-004](decisions.md#d-004-selig-s1223-removed) |
| **No Mach input** in this NeuralFoil version | Prandtl-Glauert correction applied to lift below stall |
| **Natural transition only** (n_crit = 9, "average wind tunnel") | Fine for typical props; rough or dirty blades would transition earlier |

## Updating the weights

```bash
pip install neuralfoil
python scripts/export-neuralfoil.py           # or: ... xlarge
npm test && npm run validate
```

Then update the verification numbers here if they change.
