// Reads CSS color tokens so canvas and WebGL drawing follow light/dark theme.
const KEYS = ['paper', 'panel', 'ink', 'ink-2', 'ink-3', 'line', 'accent', 'accent-ink', 'scope', 'scope-2',
  'scope-line', 'scope-ink', 'scope-dim', 'flow', 'good', 'warn', 'crit'];

/** Current token values, e.g. T.accent -> "#dd5410" */
export const T = {};

export function readTokens() {
  const cs = getComputedStyle(document.documentElement);
  for (const k of KEYS) T[k] = cs.getPropertyValue('--' + k).trim();
}

/** "#rrggbb" -> [r, g, b] in 0..255 */
export function hexToRgb255(h) {
  const m = h.replace('#', '');
  const n = parseInt(m.length === 3 ? m.split('').map(x => x + x).join('') : m, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** "#rrggbb" -> [r, g, b] in 0..1 */
export const hexToRgb01 = h => hexToRgb255(h).map(v => v / 255);

export const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

/** Call fn whenever the light/dark theme changes. */
export function onThemeChange(fn) {
  const run = () => { readTokens(); fn(); };
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', run);
  new MutationObserver(run).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
}

readTokens();
