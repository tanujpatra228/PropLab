# Presets and Saving

## Presets

The top-bar dropdown loads a complete starting design (propeller, test RPM, and drone):

| Preset | Prop | Material | Drone |
| --- | --- | --- | --- |
| 5-inch racer | 5.1 × 4.3 × 3 | Glass-filled nylon | 4 motors, 380 g, 6S 1100 mAh, 1950 Kv, 900 W |
| 10-inch camera | 10 × 4.7 × 2 | Glass-filled nylon | 4 motors, 900 g, 4S 5000 mAh, 920 Kv, 260 W |
| 15-inch lifter | 15 × 5.5 × 2 | Carbon fiber | 6 motors, 3200 g, 6S 16000 mAh, 380 Kv, 900 W |

As soon as you change anything, the dropdown shows **Custom**.

Presets are defined in `PRESETS` in `src/state.js`. To add one, see [Add a preset](../guides/add-a-preset.md).

## Automatic saving

Your current design is saved to the browser's `localStorage` after every change and restored when you come back. It stays on your device only.

| Key | Contents |
| --- | --- |
| `proplab-state` | The full design (`app.S`) |
| `proplab-ui` | Panel visibility and the Explanations setting |
| `proplab-sections` | Which sidebar sections are open |

The baseline is not saved. If storage is blocked (private browsing), the app works normally and simply starts from the 10-inch preset each time.

### Changing the saved data shape

If you rename or add fields in `app.S`, old saved designs may lack them. `restoreSaved()` only checks that `design` and `drone` exist. When you add a field, either merge saved data over the default preset, or bump the storage key (e.g. `proplab-state-v2`) so old data is ignored.
