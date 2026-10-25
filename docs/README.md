# PropLab Documentation

Start with the **Project brief**, then jump to whatever you need.

## Overview

| Doc | What it covers |
| --- | --- |
| [Project brief](01-project-brief.md) | What PropLab is, who it's for, goals and non-goals |
| [Tech stack](02-tech-stack.md) | Tools, libraries, versions, and why each was chosen |
| [Architecture](03-architecture.md) | How the code is organised and how data flows from a slider to the screen |
| [Physics models](04-physics.md) | The math behind every number, its assumptions, and its accuracy |
| [Glossary](05-glossary.md) | Plain-language meaning of every aerodynamics term used in the app |

## Features

| Doc | Feature |
| --- | --- |
| [Editor layout](features/editor-layout.md) | Top bar, design sidebar, canvas, inspector, shortcuts, mobile |
| [Spin rig (3D)](features/spin-rig.md) | 3D propeller, slipstream particles, color modes |
| [Wind tunnel (2D)](features/wind-tunnel.md) | Live airflow around the blade cross-section |
| [Bench readout](features/bench-readout.md) | Thrust, power, efficiency, tip speed, weight, strength |
| [Flight verdict](features/flight-verdict.md) | Whole-drone estimate: hover time, thrust-to-weight, payload |
| [Performance chart](features/performance-chart.md) | Thrust, power and efficiency vs RPM |
| [Baseline compare](features/baseline-compare.md) | Pin a design and compare changes against it |
| [Coach](features/coach.md) | Automatic plain-language suggestions |
| [Presets and saving](features/presets-and-saving.md) | Starting designs and automatic local save |

## Extending PropLab

| Doc | Task |
| --- | --- |
| [Development workflow](guides/development.md) | Run, test, build, and ship a change |
| [Add a control](guides/add-a-control.md) | New slider in the sidebar |
| [Add a material](guides/add-a-material.md) | New blade material |
| [Add a preset](guides/add-a-preset.md) | New starting design |
| [Add a coach tip](guides/add-a-coach-tip.md) | New automatic suggestion |
| [Add a readout](guides/add-a-readout.md) | New number in the inspector |
| [Add a feature or view](guides/add-a-feature.md) | Bigger additions: new panels, new physics, new canvas views |
| [Testing](guides/testing.md) | How physics is tested and how to add tests |
| [Deployment](guides/deployment.md) | GitHub Actions and Cloudflare setup |
| [Roadmap](roadmap.md) | Ideas for what to build next, with a suggested order |
