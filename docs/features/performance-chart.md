# Performance Chart

A curve of one propeller's behaviour across the whole RPM range, in the Results inspector.

## Tabs

| Tab | Y axis | Use it to |
| --- | --- | --- |
| Thrust | grams | See how much push is available and where hover sits |
| Power | watts (shaft) | See how fast power climbs (roughly RPM³) |
| g/W | grams per watt | Find the most efficient speed range |

## Markers

| Mark | Meaning |
| --- | --- |
| Orange line + fill | This design |
| Dashed grey line | Pinned baseline, if any |
| ● filled dot | Bench speed (Test bench RPM) |
| ○ hollow dot | Hover point on your drone |
| Dotted horizontal line (Thrust tab) | Thrust each motor must make to hover. Where the curve crosses it is the hover RPM |
| Dashed vertical line | Motor max RPM |

The X axis runs to 15% past the motor's max RPM or the bench RPM, whichever is larger.

## How it works

- Data: `compute()` in `src/main.js` runs `analyzeProp()` at 44 evenly spaced RPMs (18 blade strips each, for speed) into `app.R.curve`.
- Drawing: `drawChart()` in `src/views/chart.js`, plain Canvas 2D, redrawn on every compute, tab change, resize, and theme change. Grid steps use a "nice number" algorithm (1, 2, 5 × 10ⁿ).

## Extending

- New tab: add a `<button data-tab="...">` in `index.html`, a field to each curve point in `compute()`, and map it in `drawChart()` (`key`, `unit`, axis label).
- Hover tooltips: convert mouse X to RPM with the inverse of `X()`, find the nearest curve point, draw a crosshair.
