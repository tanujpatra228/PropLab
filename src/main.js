import './style.css';
import { app, loadPreset, restoreSaved, save, designPhys } from './state.js';
import { readTokens, onThemeChange } from './lib/theme.js';
import { fmt, fmtG, splitG } from './lib/format.js';
import { syncSidebar, buildSidebar } from './controls.js';
import { MATERIALS, G, airfoilModel, analyzeProp, structure, maxSafeRpm, analyzeDrone } from './physics/index.js';
import { initChart, drawChart } from './views/chart.js';
import { initTunnel, updateTunnel, tunnelFrame, invalidateTunnel } from './views/windTunnel.js';
import { initSpinRig, updateProp, fitCamera, spinFrame, setColorMode, overlayFigures } from './views/spinRig.js';

const $ = id => document.getElementById(id);

// ---------- controls ----------
const presetSel = $('presetSel');
function markPreset() { presetSel.value = app.preset || ''; }
presetSel.addEventListener('change', () => {
  loadPreset(presetSel.value); syncSidebar(); fitCamera(true); schedule();
});

// ---------- compute ----------
let af = null, afKey = '';

function compute() {
  const d = designPhys();
  const key = `${d.camber}|${d.thick}`;
  if (key !== afKey) { af = airfoilModel(d.camber, d.thick); afKey = key; }
  const mat = MATERIALS[app.S.design.material];
  const perf = analyzeProp(d, af, app.S.rpm);
  const str = structure(d, mat, perf);
  const safe = maxSafeRpm(d, af, mat);
  const drone = analyzeDrone(d, af, mat, app.S.drone);
  const xMax = Math.max(drone.maxRpm * 1.15, app.S.rpm * 1.15, 3000);
  const curve = [];
  for (let i = 1; i <= 44; i++) {
    const rpm = xMax * i / 44, p = analyzeProp(d, af, rpm, 18);
    curve.push({ rpm, g: p.T / G * 1000, w: p.P, eff: p.gPerW });
  }
  return { d, mat, perf, str, safe, drone, curve, xMax, af };
}

let pending = false;
function schedule() {
  if (pending) return;
  pending = true;
  requestAnimationFrame(() => { pending = false; update(); });
}

function update() {
  app.R = compute();
  save();
  syncSidebar(document.activeElement);
  markPreset();
  const S = app.S;
  $('designation').textContent = `${fmt(S.design.diaIn, 1)} × ${fmt(S.design.pitchIn, 1)} × ${S.design.blades}`;
  renderBench(); renderDrone(); renderCoach(); drawChart(); updateProp(); updateTunnel();
  if (app.R) { const o = overlayFigures(); $('ov-dia').textContent = o.dia; $('ov-flow').textContent = o.flow; $('ov-tip').textContent = o.tip; }
}

// ---------- readouts ----------
function delta(now, was, higherBetter = true) {
  if (!app.base || was == null || !isFinite(was) || was === 0) return '';
  const pct = (now - was) / Math.abs(was) * 100;
  if (Math.abs(pct) < 0.5) return '<span class="delta flat">same</span>';
  const good = (pct > 0) === higherBetter;
  return `<span class="delta ${good ? 'up' : 'down'}">${pct > 0 ? '+' : ''}${fmt(pct)}%</span>`;
}
const gauge = (k, v, unit, x, dl = '') =>
  `<div class="g"><div class="k">${k}</div><div class="v">${v}<small>${unit}</small>${dl}</div><div class="x">${x}</div></div>`;

function renderBench() {
  const { perf, str, safe } = app.R, b = app.base && app.base.bench, S = app.S;
  const tg = perf.T / G * 1000, [tv, tu] = splitG(tg), mach = perf.tipMach;
  const sfTxt = str.sf >= 10 ? 'Very strong at this speed' : str.sf >= 2 ? 'Comfortable margin' : str.sf >= 1 ? 'Close to breaking' : 'Would break';
  $('bench-sub').textContent = `One prop at ${fmt(S.rpm)} RPM, standing still`;
  $('bench').innerHTML =
    gauge('Thrust', tv, tu, 'Push it makes', delta(tg, b && b.tg)) +
    gauge('Power needed', fmt(perf.P, perf.P < 10 ? 1 : 0), 'W', 'At the motor shaft', delta(perf.P, b && b.P, false)) +
    gauge('Efficiency', fmt(perf.gPerW, 1), 'g/W', 'Thrust per watt. Higher is better', delta(perf.gPerW, b && b.eff)) +
    gauge('Tip speed', fmt(mach * 100), '% of sound', mach > 0.6 ? 'Loud. Efficiency drops above ~60%' : 'Fine', delta(mach, b && b.mach, false)) +
    gauge('Prop weight', fmt(str.massG, 1), 'g', MATERIALS[S.design.material].name, delta(str.massG, b && b.mass, false)) +
    gauge('Strength margin', str.sf >= 50 ? '50+' : fmt(str.sf, 1), '×', `${sfTxt}. Safe to ${fmt(Math.round(safe / 100) * 100)} RPM`, delta(Math.min(str.sf, 50), b && b.sf));
}

function verdictFor(dr) {
  const h = dr.hover, tw = dr.tw;
  let cls, pill, msg;
  if (!h) { cls = 'crit'; pill = "Won't lift off"; msg = `Each motor needs ${fmtG(dr.needG)} of push, but this prop only makes ${fmtG(dr.tMaxG)} at full power. Go bigger, add pitch, or cut weight.`; }
  else if (tw < 1.6) { cls = 'crit'; pill = 'Barely flies'; msg = `It can hover, but has only ${fmt(tw, 1)}× its weight in thrust. One gust and it's in trouble. Aim for 2× or more.`; }
  else if (tw < 2.2) { cls = 'warn'; pill = 'Sluggish'; msg = `Flies, with ${fmt(tw, 1)}× its weight in thrust. Fine for gentle hovering, weak for climbing or wind.`; }
  else if (tw < 4) { cls = 'good'; pill = 'Good all-rounder'; msg = `${fmt(tw, 1)}× its weight in thrust. Stable, responsive, and efficient. A sweet spot for camera and utility drones.`; }
  else if (tw < 8) { cls = 'good'; pill = 'Sporty'; msg = `${fmt(tw, 1)}× its weight in thrust. Plenty of punch for fast climbs and fun flying.`; }
  else { cls = 'good'; pill = 'Racer punch'; msg = `${fmt(tw, 1)}× its weight in thrust. Racing-drone acceleration.`; }
  if (h && dr.sfMax < 2) { if (cls === 'good') cls = 'warn'; msg += ` Careful: at full power the blades are only ${fmt(dr.sfMax, 1)}× stronger than they need to be.`; }
  return { cls, pill, msg };
}

function renderDrone() {
  const dr = app.R.drone, b = app.base && app.base.drone, h = dr.hover, S = app.S;
  $('drone-sub').textContent = `${S.drone.motors} motors · ${S.drone.cells}S ${fmt(S.drone.mah)} mAh battery (${fmtG(dr.battG)})`;
  const v = verdictFor(dr);
  $('verdict').className = 'verdict ' + v.cls;
  $('verdict').innerHTML = `<span class="pill">${v.pill}</span><p>${v.msg}</p>`;
  const [wv, wu] = splitG(dr.totalG), [pv, pu] = splitG(dr.payloadG);
  $('droneG').innerHTML =
    gauge('All-up weight', wv, wu, `Props ${fmt(dr.propG * S.drone.motors)} g, battery ${fmt(dr.battG)} g`, delta(dr.totalG, b && b.totalG, false)) +
    gauge('Hover time', h ? fmt(h.minutes, h.minutes < 10 ? 1 : 0) : '-', 'min', 'Ideal calm-air hover', delta(h ? h.minutes : 0, b && b.minutes)) +
    gauge('Thrust / weight', fmt(dr.tw, 1), '×', `Prop max ${fmt(dr.maxRpm)} RPM, ${dr.limitedBy === 'motor' ? 'motor-limited' : 'voltage-limited'}`, delta(dr.tw, b && b.tw)) +
    gauge('Hover speed', h ? fmt(h.rpm) : '-', 'RPM', h ? `About ${fmt(h.throttle * 100)}% throttle` : 'Not reachable') +
    gauge('Hover efficiency', h ? fmt(h.gPerW, 1) : '-', 'g/W', h ? `${fmt(h.amps, 1)} A from the battery` : '-', delta(h ? h.gPerW : 0, b && b.hEff)) +
    gauge('Extra payload', pv, pu, 'While keeping 2× thrust', delta(dr.payloadG, b && b.payload));
}

function renderCoach() {
  const { perf, drone: dr } = app.R, h = dr.hover, tips = [];
  if (!h) tips.push(['crit', `<b>Too heavy for these props.</b> Each motor must lift ${fmtG(dr.needG)}. Try a bigger diameter, more pitch, more blades, or a smaller battery.`]);
  if (dr.sfMax < 2) tips.push(['crit', `<b>Blades could snap at full power</b> (only ${fmt(dr.sfMax, 1)}× margin). Switch to glass-filled nylon or carbon, or make the section thicker.`]);
  if (perf.stallFrac > 0.25) tips.push(['warn', `<b>${fmt(perf.stallFrac * 100)}% of the outer blade is stalled</b>: the air can't follow the surface, so it shakes and wastes power. Lower the pitch or reduce the curve. Switch the 3D view to "Stall risk" to see where.`]);
  if (dr.tipMachMax > 0.6) tips.push(['warn', `<b>Tips reach ${fmt(dr.tipMachMax * 100)}% of the speed of sound</b> at full power. That means noise and lost efficiency. Use a smaller diameter or a lower-Kv motor.`]);
  if (h && h.throttle > 0.65) tips.push(['warn', `<b>Hovering needs ${fmt(h.throttle * 100)}% throttle.</b> Little power is left for wind or climbing. Add pitch or diameter, or lighten the drone.`]);
  if (h && dr.tw > 2 && dr.tw < 4 && h.gPerW > 7) tips.push(['good', `<b>Efficient design.</b> ${fmt(h.gPerW, 1)} g/W at hover is very good. Pin it as a baseline and try one more blade to see the trade-off.`]);
  if (h && h.gPerW < 4) tips.push(['warn', `<b>Hover efficiency is low</b> (${fmt(h.gPerW, 1)} g/W). Large, slow props are usually more efficient than small, fast ones.`]);
  if (app.S.design.material === 'alu') tips.push(['warn', '<b>Aluminium is heavy</b> for drone props. Heavier props make motors work harder to change speed, so the drone reacts slower.']);
  if (!tips.length) tips.push(['good', '<b>Solid design.</b> Pin it as a baseline, then change one slider at a time to learn what each one really does.']);
  if (!app.base) tips.push(['', '<b>Experiment idea:</b> pin this design, then raise pitch by 1 inch. Watch thrust go up, efficiency go down, and the stall colors creep in.']);
  $('coach').innerHTML = tips.slice(0, 4).map(([c, t]) => `<li class="${c}"><span>${t}</span></li>`).join('');
}

// ---------- baseline ----------
$('pinBtn').addEventListener('click', () => {
  const { perf, str, drone: dr, curve } = app.R;
  app.base = {
    label: $('designation').textContent,
    curve: curve.map(p => ({ ...p })),
    bench: { tg: perf.T / G * 1000, P: perf.P, eff: perf.gPerW, mach: perf.tipMach, mass: str.massG, sf: Math.min(str.sf, 50) },
    drone: { totalG: dr.totalG, minutes: dr.hover ? dr.hover.minutes : 0, tw: dr.tw, hEff: dr.hover ? dr.hover.gPerW : 0, payload: dr.payloadG }
  };
  $('clearBtn').hidden = false;
  $('pinNote').textContent = `vs ${app.base.label} · green = better`;
  $('pinBtn').textContent = 'Re-pin';
  update();
});
$('clearBtn').addEventListener('click', () => {
  app.base = null;
  $('clearBtn').hidden = true;
  $('pinNote').textContent = 'Pin a baseline to compare';
  $('pinBtn').textContent = 'Pin baseline';
  update();
});

// ---------- view toggles ----------
const colorBtns = document.querySelectorAll('[data-color]');
colorBtns.forEach(b => b.addEventListener('click', () => {
  colorBtns.forEach(x => x.setAttribute('aria-pressed', String(x === b)));
  setColorMode(b.dataset.color);
}));
$('flowBtn').addEventListener('click', e => { app.flow.on = !app.flow.on; e.currentTarget.setAttribute('aria-pressed', String(app.flow.on)); });
const pauseBtn = $('pauseBtn');
const syncPause = () => { pauseBtn.setAttribute('aria-pressed', String(app.flow.paused)); pauseBtn.textContent = app.flow.paused ? 'Play' : 'Pause'; };
pauseBtn.addEventListener('click', () => { app.flow.paused = !app.flow.paused; syncPause(); });
syncPause();

// ---------- editor chrome ----------
const shell = $('shell'), mqNarrow = matchMedia('(max-width: 860px)');
const UI_KEY = 'proplab-ui';
let ui = { left: 'open', right: 'open', tips: true };
try { ui = { ...ui, ...JSON.parse(localStorage.getItem(UI_KEY) || '{}') }; } catch { /* ignore */ }
const saveUi = () => { try { localStorage.setItem(UI_KEY, JSON.stringify(ui)); } catch { /* ignore */ } };

function applyPanels() {
  const left = mqNarrow.matches ? (shell.dataset.left || 'closed') : ui.left;
  shell.dataset.left = left; shell.dataset.right = ui.right;
  $('toggleLeft').setAttribute('aria-expanded', String(left === 'open'));
  $('toggleRight').setAttribute('aria-expanded', String(ui.right === 'open'));
  $('scrim').hidden = !(mqNarrow.matches && left === 'open');
}
function setLeft(state) {
  if (mqNarrow.matches) shell.dataset.left = state; else { ui.left = state; saveUi(); }
  applyPanels();
}
$('toggleLeft').addEventListener('click', () => setLeft(shell.dataset.left === 'open' ? 'closed' : 'open'));
$('toggleRight').addEventListener('click', () => { ui.right = ui.right === 'open' ? 'closed' : 'open'; saveUi(); applyPanels(); });
$('scrim').addEventListener('click', () => setLeft('closed'));
mqNarrow.addEventListener('change', () => { shell.dataset.left = 'closed'; applyPanels(); });
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === '\\') {
    e.preventDefault();
    const hide = ui.left === 'open' || ui.right === 'open';
    ui.left = ui.right = hide ? 'closed' : 'open'; saveUi();
    if (mqNarrow.matches) shell.dataset.left = ui.left;
    applyPanels();
  }
  if (e.key === 'Escape' && mqNarrow.matches && shell.dataset.left === 'open') setLeft('closed');
});
if (mqNarrow.matches) shell.dataset.left = 'closed';
applyPanels();

const tips = $('tipsToggle');
tips.checked = ui.tips;
shell.classList.toggle('no-tips', !ui.tips);
tips.addEventListener('change', () => { ui.tips = tips.checked; shell.classList.toggle('no-tips', !ui.tips); saveUi(); });

// floating wind tunnel window
const tWin = $('tunnelWin');
$('tunnelMin').addEventListener('click', e => {
  const collapsed = tWin.classList.toggle('collapsed');
  if (collapsed) { tWin.classList.remove('max'); $('tunnelMax').setAttribute('aria-pressed', 'false'); }
  e.currentTarget.setAttribute('aria-expanded', String(!collapsed));
});
$('tunnelMax').addEventListener('click', e => {
  const max = tWin.classList.toggle('max');
  tWin.classList.remove('collapsed'); $('tunnelMin').setAttribute('aria-expanded', 'true');
  e.currentTarget.setAttribute('aria-pressed', String(max));
  e.currentTarget.title = max ? 'Back to the 3D view' : 'Make the wind tunnel the main view';
});
$('resetView').addEventListener('click', () => fitCamera(true));
// On short screens the open wind tunnel would cover the propeller, so start it collapsed.
if ($('canvas').clientHeight < 720) { tWin.classList.add('collapsed'); $('tunnelMin').setAttribute('aria-expanded', 'false'); }

const helpDlg = $('helpDlg');
$('helpBtn').addEventListener('click', () => helpDlg.showModal());
helpDlg.addEventListener('click', e => { if (e.target === helpDlg) helpDlg.close(); });

// ---------- boot ----------
restoreSaved();
buildSidebar($('sections'), () => { markPreset(); schedule(); });
initChart($('chart'), $('chartKey'), document.querySelectorAll('[data-tab]'));
initTunnel({ canvas: $('tunnel'), stats: $('tstats'), ramp: $('tramp'), lock: $('lockAoa'), aoa: $('aoa') });
initSpinRig($('viewer'), $('legend3d'));
onThemeChange(() => { invalidateTunnel(); if (app.R) { updateProp(); drawChart(); updateTunnel(); } });

readTokens();
syncSidebar();
markPreset();
update();
fitCamera(true);

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  spinFrame(dt);
  tunnelFrame(dt);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
