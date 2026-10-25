# Add a Preset

## 1. Define it

`src/state.js` → `PRESETS`. Every field must be present:

```js
w7: {
  design: { diaIn: 7, pitchIn: 3.5, blades: 2, chordPct: 16, camber: 4, thick: 9, material: 'gfn' },
  rpm: 12000,
  drone: { motors: 4, frameG: 650, cells: 6, mah: 2200, kv: 1300, motorW: 450 }
}
```

Units: inches, %, RPM, grams, cell count, mAh, Kv, watts. `material` is a key from `MATERIALS`.

## 2. Add it to the dropdown

`index.html`, inside `<select id="presetSel">`:

```html
<option value="w7">7-inch long range</option>
```

Keep labels short; the dropdown is narrow on phones.

## 3. Sanity check

Load it and confirm:

- The verdict is what you'd expect for that class of drone (a long-range build should be "Good all-rounder", not "Racer punch").
- Hover time is plausible.
- No critical Coach tips, unless the preset is meant to demonstrate a problem.

Use real builds or manufacturer specs as the source, so the preset teaches realistic numbers.
