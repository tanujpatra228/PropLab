# Coach

Plain-language suggestions in the Results inspector. It looks at the latest results and tells you what's wrong and what to try. Up to four tips show at once, most urgent first.

## Current rules

| Severity | Triggers when | Advice |
| --- | --- | --- |
| Critical | Drone can't hover | Bigger diameter, more pitch, more blades, or smaller battery |
| Critical | Strength margin at max RPM below 2× | Stronger material or thicker section |
| Warning | More than 25% of the outer blade (beyond 40% radius) stalled at bench RPM | Lower pitch or reduce camber; check Stall risk view |
| Warning | Tips above 60% of the speed of sound at max RPM | Smaller diameter or lower-Kv motor |
| Warning | Hover throttle above 65% | More pitch or diameter, or lighter drone |
| Good | Thrust/weight 2 to 4× and hover efficiency above 7 g/W | Efficient design; try one more blade |
| Warning | Hover efficiency below 4 g/W | Larger, slower props are more efficient |
| Warning | Material is aluminium | Heavy props respond slower |
| Good | None of the above | Solid design; change one thing at a time |
| Info | No baseline pinned | Suggests an experiment using Pin baseline |

## How it works

`renderCoach()` in `src/main.js` pushes `[severity, html]` pairs into a list in priority order, then renders the first four. Severity sets the colored bar: `crit`, `warn`, `good`, or empty for neutral.

To add a rule, see [Add a coach tip](../guides/add-a-coach-tip.md).

## Writing good tips

- Lead with the finding in bold, with the number: **"Tips reach 72% of the speed of sound"**.
- Then the consequence in plain words, then one or two concrete actions using the control names from the sidebar.
- No jargon without explanation. Reuse wording from the [Glossary](../05-glossary.md).
