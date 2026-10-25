# Open Questions

Known gaps, ranked roughly by how much they'd improve PropLab. Move an item to [Decisions](decisions.md) when it's resolved.

| # | Question | Evidence | Ideas |
| --- | --- | --- | --- |
| 1 | Why does error grow with RPM on 10" and 11" Slow Flyers (−6% → −10% thrust)? | [Validation](validation.md#how-to-read-this) | Blade flexing under load changes twist; transition (try n_crit 5 to 7 for real-world turbulence); test with forced transition |
| 2 | Power is consistently a little low (−7% bias) | Validation bias | Hub and root drag not modelled; root region below 15% radius ignored; non-uniform inflow corrections |
| 3 | Which airfoils do modern **drone** props use? | Only APC SF/E measured so far | Add UIUC volumes 2 to 4 multirotor props; measure a printed prop on a thrust stand |
| 4 | Can the classic planform get closer to real props? | 11% vs 5% gap | Fit chord/twist shape families to the 6 measured blades; offer "SF-like" and "E-like" planforms |
| 5 | Forward-flight accuracy is unvalidated | Only static data used | UIUC also has advance-ratio data (`_<rpm>.txt` files): add `J, CT, CP, eta` validation |
| 6 | Flutter and flex limits | APC SF RPM limits far below static strength | A simple stiffness/flutter-speed estimate per material |
| 7 | Noise | Not modelled | Empirical tip-speed and thrust based noise estimate (e.g. Gutin-style for tonal noise) |
| 8 | Should the table be computed in a Web Worker? | ~60 ms per new airfoil | Move `buildPolarTable` to a worker if camber/thickness dragging feels sluggish |
