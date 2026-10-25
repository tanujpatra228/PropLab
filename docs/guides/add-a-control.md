# Add a Control

Sidebar controls are generated from config. Adding a slider is one config entry plus using the value.

**Example:** add a "Hub size" control.

## 1. Add the default value to every preset

`src/state.js`:

```js
c10: { design: { diaIn: 10, pitchIn: 4.7, /* ... */, hubPct: 12 }, /* ... */ },
```

Do the same for `r5` and `h15`.

## 2. Add the control to a section

`src/controls.js`, in the `blade` section's `controls` array:

```js
{
  id: 'hub',                       // unique; becomes the input ids "hub" and "hub-n"
  label: 'Hub size',
  path: ['design', 'hubPct'],      // where the value lives in app.S
  min: 8, max: 25, step: 1,
  dp: 0,                           // decimals shown in the number box
  unit: '%',
  extra: v => `${v}% of radius`,   // optional secondary text, top right
  hint: 'The solid middle of the prop. Bigger is stronger but makes no thrust.'
}
```

That's enough for the slider and number box to appear, stay in sync, and trigger a recompute.

## 3. Use it in the physics

Pass it through `designPhys()` in `src/state.js`:

```js
return { /* ... */, hubFrac: d.hubPct / 100 };
```

Then use `d.hubFrac` in `src/physics/propeller.js` (for example, replace the fixed `r0 = R * 0.15`), and in `structure.js` and `spinRig.js` so the 3D model matches.

## 4. Make the 3D view rebuild when it changes

`updateProp()` in `src/views/spinRig.js` rebuilds geometry only when its `key` changes. Add the new field to that key array.

## 5. Handle old saved designs

Users who already have a saved design won't have `hubPct`. Either default it where you read it (`d.hubPct ?? 15`) or bump the storage key in `state.js`. See [Presets and saving](../features/presets-and-saving.md#changing-the-saved-data-shape).

## 6. Test

Add a test that the physics responds sensibly (e.g. a bigger hub slightly reduces thrust), then `npm test`.

## A select instead of a slider

Sections can also hold a custom control, like the Material section (`select: true` with `materialMarkup()`). Copy that pattern: add markup in `buildSidebar()`, a `change` listener that writes `app.S` and calls `syncSidebar()` + `onChangeCb()`, and a line in `syncSidebar()` to reflect the value.
