export const fmt = (v, d = 0) => v.toLocaleString('en-US', { maximumFractionDigits: d, minimumFractionDigits: d });

/** Grams as "850 g" or "1.45 kg" */
export const fmtG = g => (g >= 1000 ? `${fmt(g / 1000, 2)} kg` : `${fmt(g)} g`);

/** Split fmtG output into [value, unit] for gauge display */
export const splitG = g => fmtG(g).split(' ');
