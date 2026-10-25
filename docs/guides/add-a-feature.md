# Add a Feature or View

For anything bigger than a control or a readout: a new canvas view, a new inspector section, new physics, or a new capability like export.

## The checklist

1. **Write the user story in one sentence.** "As a hobbyist I want to download my prop as an STL so I can 3D print it."
2. **Physics or data first.** Pure functions in `src/physics/` (or a new `src/lib/` module for non-physics logic), with tests.
3. **State.** New inputs go in `app.S` (and every preset). New results go on `app.R` via `compute()`. UI-only state (open panels, selected tab) stays in the view module or `app`.
4. **View.** A new module in `src/views/` exporting `init*()`, `update*()`, and if animated `*Frame(dt)`. Call `init*` in the boot section of `main.js`, `update*` from `update()`, and `*Frame` from `frame()`.
5. **Markup.** Add the container to `index.html` in the right region (sidebar section, canvas floating window, or inspector `.block`).
6. **Style** with existing tokens and patterns: `.block` for inspector sections, `.float` for canvas windows, `.sec` for sidebar sections.
7. **Theme.** Read colors from `T` in canvas/WebGL code and redraw in the `onThemeChange` callback.
8. **Mobile.** Check at 400 px wide. The sidebar is a drawer and the canvas is 74% of the viewport height.
9. **Docs.** Add a `docs/features/<name>.md` and link it from `docs/README.md`.

## Patterns for common feature types

### A new canvas window (like the wind tunnel)
Copy the `.float.tunnel-win` markup and its collapse/expand handlers. Position it in a different corner so windows don't overlap. Give its drawing its own module with a `ResizeObserver` on the canvas.

### A new inspector section
Add a `<section class="block">` in `#inspector .inspector-scroll` with a `.block-head`. Render into it from a `render*()` function called in `update()`.

### A new sidebar section
Add an entry to `SECTIONS` in `src/controls.js` with a `meta()` summary. See [Add a control](add-a-control.md).

### Export (STL, CSV, JSON)
Generate the data from `app.R` and the geometry builder. The blade mesh in `buildPropGeometry()` (`spinRig.js`) is a good starting point for STL: export its `position` and `index` buffers as triangles. Trigger the download with a Blob and an `<a download>` link. (Works on the deployed site; downloads are blocked only inside sandboxed previews.)

### Heavy computation
If something takes more than ~20 ms (finer meshes, optimisation loops, a design sweep), run it in a **Web Worker**. Physics modules have no DOM dependencies, so a worker can `import` them directly. Vite supports `new Worker(new URL('./worker.js', import.meta.url), { type: 'module' })`.

### Needs a server
For things like a viscous airfoil solver in Python or shared designs, add a Cloudflare Worker script alongside the static assets (`main` in `wrangler.jsonc`), or a separate API. Keep the browser app working without it: call the API to *improve* results, and fall back to the built-in physics.

## When to introduce a framework

Stay framework-free while the UI is a fixed layout with renders driven by one `update()`. Consider React, Svelte or Solid when you add:

- Lists users can add to and edit (saved designs, multiple props side by side)
- Several screens or routing
- Forms with complex validation

Migrate one region at a time (the inspector is the easiest start). Keep `src/physics/` untouched; it doesn't care.

## When to move to TypeScript

Good time: before the physics grows much further. Start by renaming `src/physics/*.js` to `.ts` and typing the `design`, `perf`, and `drone` shapes. Vite and Vitest handle `.ts` with no extra config.
