# Add a Coach Tip

Coach rules live in `renderCoach()` in `src/main.js`. Each rule checks `app.R` and pushes a `[severity, html]` pair.

## Example: warn about very wide blades

```js
if (app.S.design.chordPct > 28 && perf.gPerW < 6) {
  tips.push(['warn', `<b>Very wide blades (${app.S.design.chordPct}%) are costing efficiency.</b> Wide blades add drag. Try narrowing them and adding a blade instead.`]);
}
```

## Rules of thumb

- **Severity:** `'crit'` (won't work or could break), `'warn'` (works but has a real downside), `'good'` (worth celebrating), `''` (neutral idea).
- **Order matters.** Only the first four tips show. Put new critical rules near the top, nice-to-know rules near the bottom.
- **Base the trigger on a number** already in `app.R` (see the [`app.R` shape](../03-architecture.md#appr-shape)). If you need a new number, add it in `compute()` first.
- **Write it for a non-engineer:** bold finding with the number, then what it means, then one or two actions naming real sidebar controls. See [Coach → Writing good tips](../features/coach.md#writing-good-tips).
- **No user-supplied text in the HTML.** Tips are inserted with `innerHTML`; only interpolate numbers you computed.

Update the rules table in [`features/coach.md`](../features/coach.md) when you add one.
