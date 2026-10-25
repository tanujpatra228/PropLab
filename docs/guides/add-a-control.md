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

## Other control types

A control entry can also be:

| `type` | Example | Needs |
| --- | --- | --- |
| `'select'` | Airfoil, Planform, Material | `options: () => [[value, label], ...]`, optional `onChange(value)` |
| `'editor'` | Custom planform editor | Its own init/draw functions in `controls.js` |
| `'note'` | NeuralFoil status line | Text set with `setModelNote()` |

Any control can take `show: () => boolean` (hide it when irrelevant, e.g. camber only for NACA airfoils), `disabled: () => boolean` (e.g. pitch for measured blades), and `hint` as a string or a function.
