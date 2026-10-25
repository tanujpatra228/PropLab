# Tech Stack

PropLab is a static single-page app: plain JavaScript (ES modules), built with Vite, hosted on Cloudflare Workers. No framework, no backend.

## At a glance

| Layer | Choice | Version | Why |
| --- | --- | --- | --- |
| Language | JavaScript (ES modules) | ES2022 | Zero build complexity for the physics; easy to migrate to TypeScript later |
| Build / dev server | [Vite](https://vite.dev) | 8.1.x | Instant dev server, tiny config, fast production builds (Rolldown) |
| 3D rendering | [Three.js](https://threejs.org) | 0.186.x | Industry-standard WebGL library; handles the propeller mesh, lighting, orbit camera |
| 2D drawing | Canvas 2D API | built-in | Wind tunnel and performance chart. Fast and dependency-free |
| Airfoil aerodynamics | [NeuralFoil](https://github.com/peterdsharpe/NeuralFoil) (ported to JS) | 0.3.3 weights, "large" | XFOIL-quality lift and drag in the browser, no server. Weights load lazily (~215 kB gzipped). See [NeuralFoil](knowledge-base/neuralfoil.md) |
| Reference data | UIUC Propeller Database, APC performance files | n/a | Validation and measured blades. See [Reference data](knowledge-base/reference-data.md) |
| UI | Hand-written HTML + CSS | n/a | The UI is small; a framework would add weight without benefit yet |
| Tests | [Vitest](https://vitest.dev) | 5.0.x | Runs the physics in Node with zero config, same module system as the app |
| Hosting | [Cloudflare Workers static assets](https://developers.cloudflare.com/workers/static-assets/) | n/a | Free tier, global CDN, no server to maintain |
| Deploy tool | [Wrangler](https://developers.cloudflare.com/workers/wrangler/) | 4.148.x | Cloudflare's official CLI, driven from CI |
| CI/CD | GitHub Actions | n/a | Test, build and deploy on every push to `main` |
| Fonts | Google Fonts | n/a | Saira Condensed (brand/numbers), Public Sans (UI), JetBrains Mono (values) |

Exact versions are pinned in `package.json` and locked in `package-lock.json`.

## Runtime requirements

- **Node 24** recommended (CI uses Node 24). Minimum Node 20.19.
- **npm 11** (bundled with Node 24). npm 10 crashes while resolving Vitest's peer dependencies, so don't use Node 22's bundled npm to install.
- A browser with **WebGL** for the 3D view. Without it, the app shows a message and everything else keeps working.

## Key design decisions

### No UI framework
The interface is mostly static markup plus a handful of `innerHTML` renders for the readouts. Sidebar controls are generated from a config array (`src/controls.js`), which gives most of a framework's benefit with none of the weight. If the UI grows (multiple saved designs, editable lists, routing), React or Svelte would be the natural step. See [Add a feature](guides/add-a-feature.md#when-to-introduce-a-framework).

### Physics is pure and framework-free
Everything in `src/physics/` is plain functions with no DOM access. That makes it unit-testable in Node, reusable in a Web Worker, and portable to a backend or another app.

### Three.js color management is disabled
`spinRig.js` sets `THREE.ColorManagement.enabled = false` and uses linear output so the vertex colors (material, lift, stall) render exactly as authored. Light intensities are multiplied by π to match the classic lighting model. If you upgrade Three.js, check the 3D view still looks right.

### Three.js gets its own chunk
`vite.config.js` splits Three.js (~560 kB) into a separate file so it stays cached across app updates. NeuralFoil's weights are another separate file, loaded with a dynamic `import()` after the page opens. The app code itself is ~65 kB.

### Python only for tooling
`scripts/export-neuralfoil.py` (needs `pip install neuralfoil`) regenerates the weights file. Nothing at runtime or in CI needs Python.

### Cloudflare Workers instead of Pages
Workers static assets is Cloudflare's current recommendation for static sites and creates the project automatically on first deploy. No manual dashboard setup needed beyond the API token.

## Project files that configure the stack

| File | Purpose |
| --- | --- |
| `package.json` | Dependencies and scripts (`dev`, `build`, `test`, `deploy`) |
| `vite.config.js` | Build options and the Three.js chunk split |
| `wrangler.jsonc` | Cloudflare Worker name and static asset directory (`./dist`) |
| `.github/workflows/deploy.yml` | CI pipeline |
