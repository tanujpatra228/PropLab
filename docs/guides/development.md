# Development Workflow

## Setup

```bash
git clone https://github.com/tanujpatra228/PropLab.git
cd PropLab
npm install        # use Node 24 / npm 11 (npm 10 fails on Vitest's peer deps)
npm run dev        # http://localhost:5173, hot reloads on save
```

## Scripts

| Command | Does |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm test` | Run physics tests once |
| `npm run test:watch` | Re-run tests on every save |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve `dist/` locally to check the production build |
| `npm run deploy` | Build and deploy from your machine (needs `npx wrangler login` first) |

## Making a change

1. **Branch:** `git checkout -b feature/short-name`
2. **Physics first:** if the change needs new math, add it to `src/physics/` as a pure function and write a test in `tests/physics.test.js` before wiring the UI.
3. **Wire it up:** compute in `compute()` (`src/main.js`), store on `app.R`, render in the relevant `render*()` or view.
4. **Check by hand:** `npm run dev`, try a couple of presets, light and dark mode, and a narrow window (≤ 860 px).
5. **Test and build:** `npm test && npm run build`
6. **Open a pull request.** CI runs tests and the build on PRs but **only deploys from `main`**.
7. **Merge** → automatic deploy to Cloudflare.

## Where things go

| You're adding | Put it in |
| --- | --- |
| A formula, solver, or material property | `src/physics/` (no DOM access) |
| A new input | `SECTIONS` in `src/controls.js` |
| A new result number | `compute()` + `renderBench()` / `renderDrone()` in `src/main.js` |
| A new visual on the canvas | A new module in `src/views/` |
| Colors, spacing, layout | `src/style.css` (use the tokens at the top) |
| Reusable formatting | `src/lib/format.js` |

## Conventions

- Plain JavaScript ES modules, 2-space indent, single quotes.
- Physics in SI units internally; convert at the edges and name hobby-unit values explicitly (`diaIn`, `frameG`, `massG`).
- User-facing copy: plain words, active voice, a number where possible, no unexplained jargon (see [Glossary](../05-glossary.md)).
- Every color comes from a CSS token so light and dark both work. In canvas/WebGL code use `T.tokenName` from `src/lib/theme.js`.
- Keep the [module boundaries](../03-architecture.md#module-boundaries-keep-these).

## Debugging tips

- `app` is a module object; to inspect it in the browser console, temporarily add `window.app = app` in `main.js`.
- To profile physics speed, wrap `compute()` with `console.time('compute')` / `console.timeEnd('compute')`. Keep it under ~25 ms.
- A blank 3D area usually means WebGL is unavailable; the app shows a message in that case. Check the console for Three.js errors.
