# Bench Readout

Numbers for **one propeller** spinning at the **Test bench → Spin speed** RPM, standing still (static thrust), like on a thrust stand.

| Readout | Meaning | Good to know |
| --- | --- | --- |
| **Thrust** | The push the prop makes, in grams or kg | Roughly quadruples when RPM doubles |
| **Power needed** | Mechanical power at the motor shaft, in watts | Grows roughly with RPM cubed. Battery draw is higher (motor losses) |
| **Efficiency** | Grams of thrust per watt | Higher = longer flight. Big slow props win here |
| **Tip speed** | Blade tip speed as % of the speed of sound | Above ~60% gets loud and wastes power |
| **Prop weight** | Mass of one complete propeller, in grams | From blade volume × material density, plus the hub |
| **Strength margin** | How many times stronger the blade root is than the load at this RPM | Below 2× is risky. "Safe to N RPM" is where it hits 2× |

When a [baseline](baseline-compare.md) is pinned, each value shows a green or red % change. "Better" means higher thrust, efficiency, and strength, and lower power, tip speed, and weight.

## Where the numbers come from

| Readout | Source |
| --- | --- |
| Thrust, power, efficiency, tip speed | `analyzeProp()` at `app.S.rpm` → `app.R.perf` |
| Prop weight, strength margin | `structure()` → `app.R.str` |
| Safe RPM | `maxSafeRpm()` → `app.R.safe` |

Rendering is `renderBench()` in `src/main.js`. See [Physics models](../04-physics.md) for the methods and [Add a readout](../guides/add-a-readout.md) to add a new number.
