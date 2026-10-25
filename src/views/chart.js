// Performance curve: thrust / power / efficiency of one prop vs RPM.
import { app } from '../state.js';
import { T } from '../lib/theme.js';
import { fmt, fmtG } from '../lib/format.js';
import { G } from '../physics/index.js';

let canvas, keyEl, tab = 'thrust';

export function initChart(canvasEl, keyElement, tabButtons) {
  canvas = canvasEl; keyEl = keyElement;
  tabButtons.forEach(b => b.addEventListener('click', () => {
    tab = b.dataset.tab;
    tabButtons.forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    drawChart();
  }));
  new ResizeObserver(drawChart).observe(canvas);
}

function niceStep(max, n) {
  const raw = max / n, p = Math.pow(10, Math.floor(Math.log10(raw))), m = raw / p;
  return (m < 1.5 ? 1 : m < 3 ? 2 : m < 7 ? 5 : 10) * p;
}

const valueOf = (perf, key) => key === 'g' ? perf.T / G * 1000 : key === 'w' ? perf.P : perf.gPerW;

export function drawChart() {
  const R = app.R;
  if (!R || !canvas) return;
  const dpr = Math.min(devicePixelRatio || 1, 2), W = canvas.clientWidth, H = canvas.clientHeight;
  if (!W) return;
  canvas.width = W * dpr; canvas.height = H * dpr;
  const c = canvas.getContext('2d');
  c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H);
  const font = getComputedStyle(document.body).fontFamily;
  const speed = tab === 'speed';
  const key = tab === 'thrust' || speed ? 'g' : tab === 'power' ? 'w' : 'eff';
  const unit = key === 'g' ? 'g' : key === 'w' ? 'W' : 'g/W';
  const xKey = speed ? 'kmh' : 'rpm';
  const pts = speed ? R.speedCurve : R.curve;
  const bpts = app.base ? (speed ? app.base.speedCurve : app.base.curve) : null;
  const xMax = speed ? R.vMaxKmh : R.xMax;

  let yMax = Math.max(...pts.map(p => p[key]));
  if (bpts) yMax = Math.max(yMax, ...bpts.filter(p => p[xKey] <= xMax).map(p => p[key]));
  if (tab === 'thrust') yMax = Math.max(yMax, R.drone.needG * 1.15);
  if (tab === 'eff') yMax = Math.min(yMax, 40);
  yMax = Math.max(yMax, 1e-6);
  const ys = niceStep(yMax * 1.05, 4), yTop = Math.ceil(yMax * 1.05 / ys) * ys;
  const L = 56, Rm = 14, Tp = 12, B = 34, pw = W - L - Rm, ph = H - Tp - B;
  const X = v => L + v / xMax * pw, Y = v => Tp + ph - Math.max(0, Math.min(v, yTop)) / yTop * ph;

  // grid + axes
  c.font = `11px ${font}`; c.textBaseline = 'middle'; c.strokeStyle = T.line; c.fillStyle = T['ink-3']; c.lineWidth = 1;
  for (let v = 0; v <= yTop + 1e-9; v += ys) {
    c.beginPath(); c.moveTo(L, Y(v) + 0.5); c.lineTo(W - Rm, Y(v) + 0.5); c.stroke();
    c.textAlign = 'right'; c.fillText(fmt(v, ys < 1 ? 1 : 0), L - 8, Y(v));
  }
  const xs = niceStep(xMax, 6);
  c.textAlign = 'center'; c.textBaseline = 'top';
  for (let v = 0; v <= xMax; v += xs) c.fillText(v >= 1000 ? fmt(v / 1000, xs < 1000 ? 1 : 0) + 'k' : fmt(v), X(v), H - B + 8);
  c.textAlign = 'right'; c.fillText(speed ? 'airspeed, km/h →' : 'RPM →', W - Rm, H - 14);
  c.save(); c.translate(12, Tp + ph / 2); c.rotate(-Math.PI / 2); c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(key === 'g' ? 'Thrust (g)' : key === 'w' ? 'Power (W)' : 'Efficiency (g/W)', 0, 0); c.restore();

  // motor max line
  if (!speed) {
  c.setLineDash([4, 4]); c.strokeStyle = T['ink-3'];
  c.beginPath(); c.moveTo(X(R.drone.maxRpm), Tp); c.lineTo(X(R.drone.maxRpm), Tp + ph); c.stroke(); c.setLineDash([]);
  c.fillStyle = T['ink-3']; c.textAlign = 'right'; c.textBaseline = 'top'; c.fillText('motor max', X(R.drone.maxRpm) - 4, Tp + 2);
  }

  // thrust needed to hover
  if (tab === 'thrust') {
    c.strokeStyle = T['ink-2']; c.setLineDash([2, 3]);
    c.beginPath(); c.moveTo(L, Y(R.drone.needG)); c.lineTo(W - Rm, Y(R.drone.needG)); c.stroke(); c.setLineDash([]);
    c.textAlign = 'left'; c.textBaseline = 'bottom'; c.fillStyle = T['ink-2'];
    c.fillText(`needed to hover: ${fmtG(R.drone.needG)} per motor`, L + 6, Y(R.drone.needG) - 3);
  }

  const line = (arr, color, dash, width) => {
    c.strokeStyle = color; c.lineWidth = width; c.setLineDash(dash); c.beginPath();
    let started = false;
    for (const p of arr) { if (p[xKey] > xMax) break; const x = X(p[xKey]), y = Y(p[key]); if (!started) { c.moveTo(x, y); started = true; } else c.lineTo(x, y); }
    c.stroke(); c.setLineDash([]);
  };
  if (bpts) line(bpts, T['ink-3'], [6, 4], 2);
  c.beginPath(); c.moveTo(X(pts[0][xKey]), Y(0));
  for (const p of pts) c.lineTo(X(p[xKey]), Y(p[key]));
  c.lineTo(X(pts[pts.length - 1][xKey]), Y(0)); c.closePath();
  c.globalAlpha = 0.1; c.fillStyle = T.accent; c.fill(); c.globalAlpha = 1;
  line(pts, T.accent, [], 2.5);

  // markers
  const dot = (x, y, fill, ring) => { c.beginPath(); c.arc(x, y, 5, 0, Math.PI * 2); c.fillStyle = fill; c.fill(); c.lineWidth = 2; c.strokeStyle = ring; c.stroke(); };
  const bx = speed ? app.S.airspeedKmh : app.S.rpm, val = valueOf(speed ? R.perf : R.perfStatic, key);
  dot(X(bx), Y(val), T.accent, T.panel);
  c.fillStyle = T.ink; c.textAlign = X(bx) > W - 160 ? 'right' : 'left'; c.textBaseline = 'bottom'; c.font = `600 12px ${font}`;
  const extra = speed && R.perf.eta > 0 ? `, ${fmt(R.perf.eta * 100)}% efficient` : '';
  c.fillText(`bench: ${key === 'g' ? fmtG(val) : fmt(val, key === 'eff' ? 1 : 0) + ' ' + unit}${extra}`, X(bx) + (c.textAlign === 'left' ? 9 : -9), Y(val) - 6);
  if (R.drone.hover && !speed) {
    const hv = valueOf(R.drone.hover.perf, key);
    dot(X(R.drone.hover.rpm), Y(hv), T.panel, T.ink);
    c.font = `12px ${font}`; c.fillStyle = T['ink-2']; c.textAlign = 'left'; c.textBaseline = 'top';
    c.fillText('hover', X(R.drone.hover.rpm) + 8, Y(hv) + 4);
  }

  const label = document.getElementById('designation').textContent;
  keyEl.innerHTML = `<span><i style="border-color:${T.accent}"></i>${label} (this design)</span>`
    + (app.base ? `<span><i style="border-color:${T['ink-3']};border-top-style:dashed"></i>${app.base.label} (baseline)</span>` : '')
    + (speed ? `<span>● bench airspeed, at ${fmt(app.S.rpm)} RPM</span>` : '<span>● bench speed (standing still) &nbsp; ○ hover point</span>');
}
