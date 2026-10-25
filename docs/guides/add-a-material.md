# Add a Material

Materials live in one table: `src/physics/materials.js`. Adding an entry makes it appear in the sidebar, the 3D view, the weight calculation, and the strength check.

```js
export const MATERIALS = {
  // ...existing materials
  pc: {
    name: 'Polycarbonate (molded)',
    rho: 1200,                 // density, kg/m^3
    mpa: 65,                   // usable tensile strength, MPa
    color: [0.82, 0.86, 0.9],  // 3D color as RGB 0..1
    note: 'Bends instead of shattering. Common on cheap and toy props.'
  }
};
```

## Choosing the numbers

- **`rho`**: from the manufacturer's datasheet (often given in g/cm³; multiply by 1000).
- **`mpa`**: use a **conservative** value, not the headline tensile strength.
  - Molded plastics: around 60 to 70% of datasheet tensile strength.
  - 3D-printed parts: around 50 to 70% of the filament's datasheet value, because layer bonds are weak. The existing PLA (35 MPa), PETG (30) and nylon (40) entries already include this reduction.
  - Composites: use the cross-ply or quasi-isotropic value, not the fibre-direction value.
- **`note`**: one sentence a hobbyist would care about (cost, crash behaviour, typical use).

## Check it

1. `npm run dev`, pick the new material.
2. Prop weight should change in line with density.
3. "Safe to N RPM" should move with strength.
4. Optionally add a test comparing its safe RPM against an existing material.
