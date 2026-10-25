# Insights from the Data

Things the reference measurements taught us. Useful for intuition, UI copy, and future modelling.

## 1. The airfoil matters as much as the blade shape

With the real measured blade geometry, swapping the airfoil changed the Slow Flyer error from −28% (Clark Y) to −5% (Eppler E63). The same blade, same RPM. A prop's cross-section is not a detail.

Slow Flyer props behave like a **thin, strongly curved** section (E63: 4.3% thick, 5.4% camber). Thin Electric props behave like a **thin, moderately curved** section (NACA 4406).

## 2. "Pitch" on the label isn't the blade's geometric pitch

Measured blade angle at 75% radius, converted back to geometric pitch:

| Prop | Label pitch | Geometric pitch at 75% |
| --- | --- | --- |
| APC 10×4.7 Slow Flyer | 4.7 in | ~4.3 in |
| APC 10×5 Thin Electric | 5.0 in | ~5.6 in |

Manufacturers measure pitch differently (some from the flat underside, some including the effect of camber). That's one reason PropLab's simple planform can only get within ~11%. Use measured blades or the custom editor for better matches.

## 3. Real blades are not "constant pitch"

Measured twist is far from the textbook `atan(pitch / 2πr)` near the root: the Thin Electric 11×5.5 has 41° at 15% radius, while constant pitch would give ~47°, and the Slow Flyers actually have *less* angle at the root than further out (21° at 15% radius vs 25° at 25% on the 10×4.7). Roots are shaped for strength and hub fit, not aerodynamics.

## 4. Width peaks around the middle of the blade

Slow Flyer chord peaks at 50 to 60% radius (c/R ≈ 0.23); Thin Electric at 40 to 45% (c/R ≈ 0.20 to 0.22) and tapers harder. PropLab's classic planform peaks around 45%, a reasonable middle ground.

## 5. Small props get relatively more efficient as they spin faster

Measured thrust coefficient rises with RPM (10×4.7 SF: Ct 0.106 at 2,400 RPM to 0.130 at 6,500 RPM). Higher speed means higher Reynolds number, which means less draggy, more lift-capable airflow. This is why figures from one RPM don't scale perfectly to another.

## 6. Manufacturer data is optimistic

APC's computed performance files read ~5% more thrust than UIUC measured on the same prop. Treat manufacturer numbers as a ceiling.

## 7. Static strength isn't the whole story

APC limits Slow Flyers to 65,000 ÷ diameter RPM, far below what a static stress check suggests. Thin Electrics get 145,000 ÷ diameter. The difference is mostly **flexibility and flutter**, which PropLab doesn't model. If a design is flexible (thin, wide, low-modulus material), treat the "safe RPM" as optimistic.
