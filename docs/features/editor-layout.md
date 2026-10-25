# Editor Layout

PropLab is laid out like a design editor (think Figma): controls on the left, the work on a central canvas, results on the right.

```
┌──────────────────────────── Top bar ─────────────────────────────┐
│ ☰ PropLab  10 × 4.7 × 2          [Preset ▾] [Pin baseline] ? ☰ │
├──────────────┬───────────────────────────────────┬───────────────┤
│ Design       │  Canvas                 [toolbar] │ Results       │
│ ▸ Blade shape│                                   │ Flight verdict│
│ ▸ Cross-sect.│     3D spin rig                   │ Bench readout │
│ ▸ Material   │                                   │ Performance   │
│ ▸ Test bench │              ┌─ Wind tunnel ───┐  │ Coach         │
│ ▸ Drone      │              └─────────────────┘  │               │
└──────────────┴───────────────────────────────────┴───────────────┘
```

## Regions

| Region | Markup | Behaviour |
| --- | --- | --- |
| Top bar | `.topbar` in `index.html` | Panel toggles, brand, live designation (diameter × pitch × blades), preset picker, Pin/Clear baseline, help dialog |
| Design sidebar | `#sidebar`, contents built by `src/controls.js` | Collapsible accordion sections. Each closed section shows a summary (e.g. `NACA 4410`, `4 motors · 4S`). Open/closed state is remembered |
| Canvas | `#canvas` | Holds the 3D spin rig, HUD readouts (top-left), view toolbar (top-right), and the floating wind tunnel window |
| Results inspector | `#inspector` | Flight verdict, bench readout, performance chart, coach. Scrolls independently |

## Controls

Every parameter is a **slider plus a number box**. Drag for exploring, type for precision (values are clamped to the slider's range; press Enter to apply). Some controls show a secondary unit at the top right, like millimetres for diameter or volts for battery cells.

The **Explanations** checkbox in the sidebar header shows or hides the one-line hint under each control. Hidden hints make the panel compact for experienced users.

## Panel toggles and shortcuts

| Action | How |
| --- | --- |
| Hide/show design sidebar | Left icon in the top bar |
| Hide/show results inspector | Right icon in the top bar |
| Hide/show both panels | `Ctrl` + `\` (`Cmd` + `\` on Mac), same as Figma |
| Close the drawer on mobile | Tap outside it, or `Esc` |

Panel visibility and the Explanations setting are saved in `localStorage` under `proplab-ui`. Section open/closed state is saved under `proplab-sections`.

## Mobile (≤ 860 px)

- The canvas takes the top ~74% of the screen, the inspector flows underneath, and the page scrolls.
- The design sidebar becomes a slide-out drawer with a dimmed backdrop, closed by default.
- The results toggle is hidden (the inspector is always in the page flow).

## Theming

Light and dark follow the system setting. The canvas is intentionally dark in both themes. All colors are tokens at the top of `src/style.css`. See [Architecture → Theming](../03-architecture.md#theming).

## Code pointers

- Layout grid and collapse animation: `.shell` in `style.css` (`--lw` and `--rw` widths, set to `0` when closed)
- Toggle logic, shortcut, mobile drawer: "editor chrome" section of `src/main.js`
- Help dialog: `<dialog id="helpDlg">` in `index.html`
