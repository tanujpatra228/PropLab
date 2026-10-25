# PropLab

Design a propeller, watch the air move around it, and find out if your drone would fly.

PropLab is a browser-based propeller design editor for hobbyists. Shape the blade on the left, see it spin with live airflow on the canvas, and read thrust, power, strength and drone flight estimates on the right. No aerodynamics background needed: every control explains itself in plain words.

## Features

- **Spin rig (3D):** lofted blade geometry from your parameters, slipstream particles driven by the computed airflow, color the blade by material, lift, or stall risk.
- **Wind tunnel (2D):** live flow around the blade cross-section at 75% span, with pressure coloring, lift arrow and stall warning. Pop it out to fill the canvas.
- **Bench readout:** thrust, shaft power, efficiency (g/W), tip speed, prop weight, strength margin and safe RPM.
- **Flight verdict:** all-up weight, hover RPM and throttle, hover time, thrust-to-weight, payload headroom.
- **Baseline compare:** pin a design, tweak one thing, see green/red deltas on every number and a dashed curve on the chart.
- **Coach:** plain-language suggestions when something is off (stall, tip speed, weak blades, too heavy, windmilling).
- **Accurate aerodynamics:** NeuralFoil (an XFOIL-trained AI model) runs in the browser for lift and drag. Choose NACA, Clark Y or Eppler E63 airfoils, draw your own blade width and twist, or start from real measured APC blades.
- **Forward flight:** set an airspeed to see thrust and propeller efficiency on a moving aircraft.

## How the physics works

| What | Method | Where |
| --- | --- | --- |
| Airflow around the blade slice | Hess-Smith panel method on the selected airfoil | `src/physics/airfoil.js` |
| Lift/drag incl. stall and low Reynolds number | NeuralFoil (ported to JavaScript), with a classic empirical fallback | `src/physics/airfoil.js`, `src/physics/neuralfoil/` |
| Thrust, torque, power | Blade Element Momentum Theory with Prandtl tip loss, hover and forward flight | `src/physics/propeller.js` |
| Weight and strength | Centrifugal + thrust-bending stress at the blade root | `src/physics/structure.js` |
| Drone performance | Battery mass from energy density, motor power/voltage limits | `src/physics/drone.js` |

**Measured accuracy:** within 5.3% on thrust and 7.5% on power against UIUC wind-tunnel data for six APC props (with their real blade geometry), about 11% / 13.5% with PropLab's simple blade shape. Run `npm run validate` for the full report; details in [docs/knowledge-base/validation.md](docs/knowledge-base/validation.md). Good for comparing designs and building intuition, not for certifying hardware.

## Run locally

Requires Node 20.19+ (Node 24 recommended).

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # physics + validation tests
npm run validate # accuracy report vs wind-tunnel data
npm run build    # production build in ./dist
```

## Project structure

```
index.html             Editor shell (top bar, sidebar, canvas, inspector)
src/main.js            Compute pipeline, readouts, coach, editor chrome
src/controls.js        Sidebar controls, built from config (add a parameter here)
src/state.js           Presets and shared app state
src/physics/           Pure, framework-free physics (unit tested)
src/views/spinRig.js   Three.js propeller + slipstream particles
src/views/windTunnel.js 2D panel-method flow field + particle tracer
src/views/chart.js     Performance curve (canvas)
src/data/              Measured reference propellers (UIUC)
scripts/               Validation report, NeuralFoil weight export
docs/                  Documentation and knowledge base
tests/                 Vitest physics, NeuralFoil and validation tests
```

## Deployment

Pushes to `main` run tests, build, and deploy to **Cloudflare Workers (static assets)** via `.github/workflows/deploy.yml`.

Required repository secrets:

- `CLOUDFLARE_API_TOKEN` – API token with the "Edit Cloudflare Workers" permission
- `CLOUDFLARE_ACCOUNT_ID` – your Cloudflare account ID

The site is served as the `proplab` Worker at `https://proplab.<your-subdomain>.workers.dev`. Add a custom domain in the Cloudflare dashboard if you want one. Manual deploy: `npx wrangler login && npm run deploy`.

## Keyboard

- `Ctrl` / `Cmd` + `\` hides or shows both side panels.

## Roadmap ideas

- STL export for 3D printing, then validate against a DIY thrust stand (ESP32 + load cell)
- Real motor and battery databases
- Viscous airfoil analysis (NeuralFoil) and forward-flight (non-hover) analysis
- Compare against UIUC / APC published prop data
- Save and share designs by link
