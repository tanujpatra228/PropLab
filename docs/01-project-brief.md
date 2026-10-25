# Project Brief

## What PropLab is

PropLab is a browser-based editor for designing drone propellers. You shape a blade with sliders, watch it spin with live airflow, and immediately see how much thrust it makes, how much power it needs, whether it's strong enough, and whether a drone using it would actually fly.

It runs entirely in the browser. There is no backend, no account, and no install.

## Who it's for

Hobbyists and curious builders who have **no aerodynamics background**. Every control carries a one-line plain-language explanation, every result says what "good" looks like, and the Coach panel suggests what to try next.

## The problem it solves

Professional tools (XFOIL, QPROP, CFD packages) are accurate but intimidating, desktop-only, and assume an engineering education. Simple calculators (like eCalc) give numbers but no understanding of *why*. PropLab sits in between: fast, visual, explained, and good enough to build real intuition.

## Core experience

1. **Shape**: diameter, pitch, blade count, blade width, airfoil curve and thickness, material.
2. **See**: a 3D propeller with airflow particles, plus a 2D wind tunnel of the blade's cross-section.
3. **Measure**: thrust, power, efficiency, tip speed, weight, strength margin.
4. **Fly**: put the prop on a virtual drone and get a verdict, hover time, and payload headroom.
5. **Compare**: pin a baseline, change one thing, and see exactly what got better or worse.

## Goals

- Answers update instantly while dragging a slider (all physics runs in well under a frame budget).
- Results within roughly 15 to 25% of real propellers: good for comparing designs and learning.
- Understandable by a non-engineer without reading any docs.
- Zero-cost hosting and zero-ops deployment.

## Non-goals (for now)

- Certifying hardware or replacing wind tunnel / thrust stand testing.
- Full 3D CFD (Navier-Stokes) simulation. Too slow for interactive use in a browser.
- Forward-flight or plane propeller analysis. The current solver models **hover / static thrust** only.
- User accounts, cloud storage, collaboration.

## Status

MVP. Deployed on Cloudflare Workers, auto-deploys from `main`. See the [Roadmap](roadmap.md) for what's next.

## Where to go next

- How it's built: [Tech stack](02-tech-stack.md) and [Architecture](03-architecture.md)
- How the numbers are made: [Physics models](04-physics.md)
- How to add things: [Development workflow](guides/development.md)
