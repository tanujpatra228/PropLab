# Glossary

Plain-language meanings of the terms used in PropLab. Useful when writing UI copy too: if a new feature needs one of these words, reuse the wording here.

| Term | Plain meaning | In PropLab |
| --- | --- | --- |
| **Airfoil** | The shape you'd see if you sliced through a blade, like cutting a slice of bread | Wind tunnel shows the slice at 75% of the blade's length |
| **Angle of attack (α)** | How steeply the blade meets the oncoming air | "Angle to the air" in the wind tunnel |
| **BEMT** | Blade Element Momentum Theory: the method that cuts the blade into strips and balances lift against air pushed down | Powers all thrust and power numbers |
| **Camber** | How curved (arched) the airfoil is. Some curve makes lift easier | "Curve (camber)" control |
| **Chord** | The width of the blade from its front edge to its back edge | "Blade width" control |
| **Cl (lift coefficient)** | A score for how hard a wing shape is lifting at a given angle, independent of size and speed | "Lift strength (Cl)" in the wind tunnel |
| **Diameter** | Tip-to-tip size of the propeller | First number in the designation, e.g. **10** × 4.7 × 2 |
| **Efficiency (g/W)** | Grams of thrust per watt of power. Higher means longer flights | Bench and hover efficiency |
| **Figure of merit** | How close a hovering prop is to the theoretical best (1.0 is perfect) | Computed in `analyzeProp`, not shown yet |
| **Induced velocity** | How fast the propeller pulls air through itself | Drives the 3D airflow particles; "Air leaving" on the canvas |
| **Kutta condition** | The rule that air leaves the sharp back edge of a wing smoothly | Used by the panel method |
| **Kv** | Motor speed constant: RPM per volt with no load | "Motor Kv" control |
| **Leading / trailing edge** | Front and back edges of the blade | In the 3D view the leading edge points in the direction of spin |
| **Mach number** | Speed as a fraction of the speed of sound. Tips above ~0.6 get loud and inefficient | "Tip speed % of sound" |
| **NACA 4-digit** | A standard family of airfoil shapes, e.g. NACA 4410 = 4% camber at 40% chord, 10% thick | Shown in the Cross-section header |
| **Panel method** | Cuts the airfoil outline into small pieces and solves for airflow so none goes through the surface | Powers the wind tunnel |
| **Pitch** | How far the prop would move forward in one turn if it screwed through air like a screw through wood | Second number in the designation, e.g. 10 × **4.7** × 2 |
| **Pressure (high / low)** | Slow air pushes harder (high pressure); fast air pushes less (low pressure). Lower pressure on top = lift | Wind tunnel colors |
| **Reynolds number (Re)** | How "thick" air feels to an object. Small, slow blades feel stickier air and stall earlier | Affects max lift and drag in the polar |
| **RPM** | Revolutions per minute | Spin speed, hover speed, max speed |
| **S (cell count)** | Number of battery cells in series. Each LiPo cell is about 3.7 V | "Battery cells" control |
| **Safety factor / strength margin** | How many times stronger the blade is than it needs to be. Below 2× is risky | Bench readout |
| **Slipstream** | The column of air the propeller pushes. It narrows and speeds up below the prop | 3D airflow particles |
| **Stall** | When the angle is too steep and air can't follow the blade's surface. Lift collapses and drag jumps | Stall risk color mode, wind tunnel warning |
| **Thrust** | The push the propeller makes | Grams or kilograms |
| **Thrust-to-weight (T/W)** | Max thrust divided by drone weight. 2× or more flies well | Flight verdict |
| **Tip loss** | Air leaking around the blade tips, which lowers thrust near the tips | Prandtl tip-loss factor in BEMT |
