# Baseline Compare

The fastest way to learn what each control really does: freeze a design, change one thing, and see what moved.

## Using it

1. Press **Pin baseline** in the top bar. The current design is snapshotted.
2. Change anything.
3. Every bench and drone readout shows a % change chip: **green** = better, **red** = worse, grey = same (within 0.5%).
4. The performance chart draws the baseline as a dashed line.
5. **Re-pin** replaces the baseline with the current design; **Clear baseline** removes it.

The inspector header shows which design you're comparing against.

## What counts as "better"

| Readout | Better when |
| --- | --- |
| Thrust, efficiency, strength margin, hover time, thrust/weight, hover efficiency, payload | higher |
| Power needed, tip speed, prop weight, all-up weight | lower |

## How it works

- Pin handler in `src/main.js` stores `app.base = { label, curve, bench: {...}, drone: {...} }`.
- `delta(now, was, higherBetter)` renders the chip; each `gauge()` call passes the matching baseline field.
- The baseline lives in memory only; it's cleared on reload.

## Extending

- **Persist baselines:** save `app.base` in `localStorage` alongside the design.
- **Multiple saved designs:** a "Designs" list where any two can be compared. This is the point where a UI framework starts paying off (see [Add a feature](../guides/add-a-feature.md#when-to-introduce-a-framework)).
- **Share by link:** encode `app.S` into the URL hash (`#d=...`) so a design can be sent to someone.
