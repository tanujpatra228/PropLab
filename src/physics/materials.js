// PropLab physics. Units: SI internally (metres, newtons, watts) unless a name says otherwise.
/** density rho in kg/m^3, mpa = usable tensile strength in MPa */
export const MATERIALS = {
  pla:    { name: 'PLA (3D printed)',        rho: 1240, mpa: 35,  color: [0.93, 0.92, 0.88], note: 'Cheap to print. Layer lines make it weaker than molded plastic.' },
  petg:   { name: 'PETG (3D printed)',       rho: 1270, mpa: 30,  color: [0.55, 0.78, 0.86], note: 'Tougher than PLA when bent, slightly weaker when pulled.' },
  nylon:  { name: 'Nylon (3D printed)',      rho: 1010, mpa: 40,  color: [0.86, 0.84, 0.78], note: 'Light and flexible. Survives crashes well.' },
  gfn:    { name: 'Glass-filled nylon',      rho: 1350, mpa: 110, color: [0.16, 0.17, 0.19], note: 'What most store-bought drone props are made of.' },
  carbon: { name: 'Carbon fiber',            rho: 1550, mpa: 500, color: [0.09, 0.09, 0.10], note: 'Very stiff and strong. Used on big, expensive drones.' },
  wood:   { name: 'Hardwood (beech)',        rho: 720,  mpa: 90,  color: [0.72, 0.53, 0.33], note: 'Classic for planes. Light, but needs careful balancing.' },
  alu:    { name: 'Aluminium 7075',          rho: 2810, mpa: 500, color: [0.74, 0.76, 0.79], note: 'Strong but heavy. Rare on drones.' }
};
