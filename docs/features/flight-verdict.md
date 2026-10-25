# Flight Verdict

Puts your propeller on a virtual drone defined in the **Drone** sidebar section and answers: will it fly, and how well?

## The verdict

| Verdict | Thrust-to-weight | Meaning |
| --- | --- | --- |
| Won't lift off | can't hover | Max thrust per motor is below what each must carry |
| Barely flies | under 1.6× | Hovers, but no margin for wind or climbing |
| Sluggish | 1.6 to 2.2× | Gentle hovering only |
| Good all-rounder | 2.2 to 4× | Sweet spot for camera and utility drones |
| Sporty | 4 to 8× | Punchy, fun flying |
| Racer punch | 8× and up | Racing-drone acceleration |

If the blades have less than a 2× strength margin at full power, a "Careful" warning is added and a green verdict drops to amber.

## The numbers

| Readout | Meaning |
| --- | --- |
| **All-up weight** | Frame (your input) + battery (estimated from its energy) + props × motor count |
| **Hover time** | Ideal calm-air hover using 80% of the battery. Real flights are usually 20 to 40% shorter |
| **Thrust / weight** | Total max thrust ÷ weight. Subtitle shows the max RPM and whether the motor's power or the battery voltage limits it |
| **Hover speed** | RPM needed to hover, and approximate throttle % |
| **Hover efficiency** | Grams per watt while hovering, plus battery current |
| **Extra payload** | Weight you could add while keeping 2× thrust-to-weight |

## Inputs (Drone section)

Motors, weight without battery, battery cells (S), battery capacity (mAh), motor Kv, motor power (W). Typical values for each class are in the [presets](presets-and-saving.md).

## How it works

`analyzeDrone()` in `src/physics/drone.js`. Full method and assumptions: [Physics models → Drone](../04-physics.md#6-drone-whole-vehicle-estimate). The verdict thresholds live in `verdictFor()` in `src/main.js`.

## Extending

- **Forward flight / cruise time:** needs non-zero freestream velocity in BEMT plus frame drag. Biggest accuracy upgrade for real missions.
- **Real components:** replace Kv and motor power with a motor picker backed by a small JSON database of real motors (Kv, max current, resistance, weight).
- **Battery sag:** model voltage dropping over the flight for more honest flight times.
