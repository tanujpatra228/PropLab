# Bench Readout

Numbers for **one propeller** spinning at the **Test bench → Spin speed** RPM. With **Airspeed** at 0 it's standing still (static thrust, like a thrust stand); above 0 the prop is moving forward through the air, like on a plane or a fast-flying drone.

| Readout | Meaning | Good to know |
| --- | --- | --- |
| **Thrust** | The push the prop makes, in grams or kg | Roughly quadruples when RPM doubles |
| **Power needed** | Mechanical power at the motor shaft, in watts | Grows roughly with RPM cubed. Battery draw is higher (motor losses) |
| **Efficiency** | Grams of thrust per watt | Higher = longer flight. Big slow props win here |
| **Hover quality** (airspeed 0) | Figure of merit: how close to the theoretical best a hovering prop is | 1.0 is perfect; good props reach 0.6 to 0.75 |
| **Prop efficiency** (airspeed > 0) | Share of shaft power turned into useful forward push (η = thrust × speed ÷ power) | Good props reach 70 to 85% near their best speed |
| **Tip speed** | Blade tip speed as % of the speed of sound | Above ~60% gets loud and wastes power |
| **Angle at 75%** | Angle at which the air meets the blade at 75% of its length | Says "Stalled here" if past the stall angle |
| **Prop weight** | Mass of one complete propeller, in grams | From blade volume × material density, plus the hub |
| **Strength margin** | How many times stronger the blade root is than the load at this RPM | Below 2× is risky. "Safe to N RPM" is where it hits 2× |

When a [baseline](baseline-compare.md) is pinned, each value shows a green or red % change. "Better" means higher thrust, efficiency, and strength, and lower power, tip speed, and weight.

## Where the numbers come from

| Readout | Source |
| --- | --- |
| Thrust, power, efficiencies, tip speed, angle | `analyzeProp()` at `app.S.rpm` and the bench airspeed → `app.R.perf` |
| Prop weight, strength margin | `structure()` at the bench RPM, standing still → `app.R.str` |
| Safe RPM | `maxSafeRpm()` → `app.R.safe` |

Rendering is `renderBench()` in `src/main.js`. See [Physics models](../04-physics.md) for the methods and [Add a readout](../guides/add-a-readout.md) to add a new number.

## Negative thrust (windmilling)

If the airspeed is faster than the prop can push air at that RPM, thrust turns negative: the air is driving the prop instead of the other way round. The thrust readout says so and the Coach suggests spinning faster, adding pitch or lowering the airspeed. The **Airspeed** tab of the performance chart shows where thrust runs out.
