# Add a Readout

**Example:** show the **figure of merit** (already computed by `analyzeProp()` as `perf.fm`) in the Bench readout.

## 1. Make sure the number is in `app.R`

`perf.fm` already is. For a new quantity, compute it in the physics (pure function, with a test), then attach it in `compute()` in `src/main.js`.

## 2. Render it

In `renderBench()`, add a `gauge()` call:

```js
gauge('Hover quality', fmt(perf.fm, 2), '', '1.0 is perfect. Good props reach 0.6 to 0.75', delta(perf.fm, b && b.fm))
```

`gauge(label, value, unit, subtitle, deltaHtml)`.

The stats grid is two columns. Keep an **even number** of gauges so there's no lone cell.

## 3. Support baseline compare

In the Pin baseline handler (`$('pinBtn')` listener), add the field to the snapshot:

```js
bench: { /* ... */, fm: perf.fm }
```

`delta(now, was, higherBetter)` handles the chip. Pass `false` as the third argument when lower is better.

## 4. Document it

Add a row to [`features/bench-readout.md`](../features/bench-readout.md) (or `flight-verdict.md`) and, if it introduces a term, to the [Glossary](../05-glossary.md).
