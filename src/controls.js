// Sidebar controls: built from config so adding a parameter is one entry here.
import { app, MEASURED, EDIT_X, seedCustom } from './state.js';
import { MATERIALS, AIRFOIL_FAMILIES, chordShape } from './physics/index.js';
import { fmt, fmtG } from './lib/format.js';

/** path into app.S, e.g. ['design', 'diaIn'] */
const get = path => path.reduce((o, k) => o[k], app.S);
const set = (path, v) => { const last = path[path.length - 1]; path.slice(0, -1).reduce((o, k) => o[k], app.S)[last] = v; };
const D = () => app.S.design;
const isNaca = () => D().airfoil === 'naca4';
const isMeasured = () => !!MEASURED[D().planform];

export const SECTIONS = [
  {
    id: 'blade', title: 'Blade shape',
    meta: () => `${fmt(D().diaIn, 1)} × ${fmt(D().pitchIn, 1)} × ${D().blades}`,
    controls: [
      { id: 'planform', label: 'Planform', type: 'select', path: ['design', 'planform'],
        options: () => [['classic', 'Classic (automatic)'], ['custom', 'Custom (draw it)'], ...Object.entries(MEASURED).map(([k, m]) => [k, `${m.label} (measured)`])],
        hint: () => isMeasured() ? 'A real blade measured in the UIUC wind tunnel. Width and twist come from the measurement.' : D().planform === 'custom' ? 'Drag the dots to shape the blade width and twist along its length.' : 'A typical blade shape that follows your diameter, pitch and width.',
        onChange: v => {
          if (v === 'custom' && !D().customChord) seedCustom();
          const m = MEASURED[v];
          if (m) { D().airfoil = m.airfoil; if (m.camber) { D().camber = m.camber; D().thick = m.thick; } }
        } },
      { id: 'planEditor', type: 'editor', show: () => D().planform === 'custom' },
      { id: 'dia', label: 'Diameter', path: ['design', 'diaIn'], min: 2, max: 20, step: 0.1, dp: 1, unit: 'in', extra: v => `${fmt(v * 25.4)} mm`, hint: 'Tip to tip. Bigger props move more air gently, which saves power.' },
      { id: 'pitch', label: 'Pitch', path: ['design', 'pitchIn'], min: 1, max: 12, step: 0.1, dp: 1, unit: 'in', disabled: isMeasured, hint: 'How far one turn would screw the prop forward. More pitch takes a bigger bite of air.' },
      { id: 'blades', label: 'Blades', path: ['design', 'blades'], min: 2, max: 6, step: 1, dp: 0, unit: '', hint: 'More blades give more thrust from the same size, each a little less efficient.' },
      { id: 'chord', label: 'Blade width', path: ['design', 'chordPct'], min: 8, max: 34, step: 1, dp: 0, unit: '%', show: () => D().planform === 'classic', hint: 'Width at 75% of the blade, as % of its length. Wider grabs more air but adds drag.' }
    ]
  },
  {
    id: 'section', title: 'Cross-section',
    meta: () => isNaca() ? `NACA ${Math.round(D().camber)}4${String(Math.round(D().thick)).padStart(2, '0')}` : AIRFOIL_FAMILIES[D().airfoil].name,
    controls: [
      { id: 'airfoil', label: 'Airfoil', type: 'select', path: ['design', 'airfoil'],
        options: () => Object.entries(AIRFOIL_FAMILIES).map(([k, f]) => [k, f.name]),
        hint: () => AIRFOIL_FAMILIES[D().airfoil].note },
      { id: 'camber', label: 'Curve (camber)', path: ['design', 'camber'], min: 0, max: 8, step: 0.5, dp: 1, unit: '%', show: isNaca, hint: "How arched the blade's slice is. A gentle curve makes lift easier." },
      { id: 'thick', label: 'Thickness', path: ['design', 'thick'], min: 4, max: 18, step: 0.5, dp: 1, unit: '%', show: isNaca, hint: 'Thicker is stronger, slightly draggier.' },
      { id: 'modelNote', type: 'note' }
    ]
  },
  {
    id: 'material', title: 'Material',
    meta: () => MATERIALS[D().material].name.replace(/ \(.*\)/, ''),
    controls: [
      { id: 'material', type: 'select', path: ['design', 'material'], options: () => Object.entries(MATERIALS).map(([k, m]) => [k, m.name]), hint: () => MATERIALS[D().material].note }
    ]
  },
  {
    id: 'bench', title: 'Test bench',
    meta: () => `${fmt(app.S.rpm)} RPM${app.S.airspeedKmh ? ` · ${app.S.airspeedKmh} km/h` : ''}`,
    controls: [
      { id: 'rpm', label: 'Spin speed', path: ['rpm'], min: 1000, max: 40000, step: 100, dp: 0, unit: 'RPM', hint: 'Speed on the test stand. Drives the bench readout and the 3D airflow.' },
      { id: 'airspeed', label: 'Airspeed', path: ['airspeedKmh'], min: 0, max: 200, step: 1, dp: 0, unit: 'km/h', extra: v => `${fmt(v / 3.6, 1)} m/s`, hint: '0 = standing still or hovering. Above 0 = the prop moving forward through the air, like a plane or a fast drone.' }
    ]
  },
  {
    id: 'drone', title: 'Drone',
    meta: () => `${app.S.drone.motors} motors · ${app.S.drone.cells}S`,
    controls: [
      { id: 'motors', label: 'Motors', path: ['drone', 'motors'], min: 2, max: 8, step: 1, dp: 0, unit: '', hint: 'Quad = 4, hexa = 6, octo = 8.' },
      { id: 'frame', label: 'Weight without battery', path: ['drone', 'frameG'], min: 20, max: 8000, step: 10, dp: 0, unit: 'g', extra: v => fmtG(v), hint: 'Frame, motors, camera, electronics. Props and battery are added for you.' },
      { id: 'cells', label: 'Battery cells', path: ['drone', 'cells'], min: 1, max: 12, step: 1, dp: 0, unit: 'S', extra: v => `${fmt(v * 3.7, 1)} V`, hint: 'More cells = more voltage = faster motors.' },
      { id: 'mah', label: 'Battery capacity', path: ['drone', 'mah'], min: 300, max: 22000, step: 100, dp: 0, unit: 'mAh', hint: 'The fuel tank. Bigger lasts longer but weighs more.' },
      { id: 'kv', label: 'Motor Kv', path: ['drone', 'kv'], min: 100, max: 4000, step: 10, dp: 0, unit: 'Kv', hint: 'RPM per volt. High Kv for small props, low Kv for big props.' },
      { id: 'motorW', label: 'Motor power', path: ['drone', 'motorW'], min: 20, max: 3000, step: 10, dp: 0, unit: 'W', hint: 'Max power each motor can deliver, from its spec sheet.' }
    ]
  }
];

const chevron = '<svg class="chev" viewBox="0 0 12 12" aria-hidden="true"><path d="M4 2.5 7.5 6 4 9.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const allControls = () => SECTIONS.flatMap(s => s.controls);
const hintText = c => (typeof c.hint === 'function' ? c.hint() : c.hint) || '';

let onChangeCb = () => {};
let modelNoteText = '';

export function buildSidebar(container, onChange) {
  onChangeCb = onChange;
  let open = {};
  try { open = JSON.parse(localStorage.getItem('proplab-sections') || '{}'); } catch { /* ignore */ }
  container.innerHTML = SECTIONS.map(sec => `
    <details class="sec" data-sec="${sec.id}" ${open[sec.id] === false ? '' : 'open'}>
      <summary>${chevron}<span class="sec-title">${sec.title}</span><span class="sec-meta" id="meta-${sec.id}"></span></summary>
      <div class="sec-body">${sec.controls.map(controlMarkup).join('')}</div>
    </details>`).join('');

  container.querySelectorAll('details.sec').forEach(d => d.addEventListener('toggle', () => {
    open[d.dataset.sec] = d.open;
    try { localStorage.setItem('proplab-sections', JSON.stringify(open)); } catch { /* ignore */ }
  }));

  for (const c of allControls()) {
    if (c.type === 'select') {
      const sel = document.getElementById(c.id);
      sel.addEventListener('change', () => { set(c.path, sel.value); c.onChange?.(sel.value); app.preset = null; syncSidebar(); onChangeCb(); });
    } else if (c.type === 'editor') {
      initEditor(document.getElementById(c.id));
    } else if (!c.type) {
      const range = document.getElementById(c.id), num = document.getElementById(c.id + '-n');
      range.addEventListener('input', () => commit(c, parseFloat(range.value), num));
      num.addEventListener('change', () => {
        const v = parseFloat(num.value);
        commit(c, isFinite(v) ? Math.min(c.max, Math.max(c.min, v)) : get(c.path));
      });
      num.addEventListener('keydown', e => { if (e.key === 'Enter') num.blur(); });
    }
  }
}

function controlMarkup(c) {
  if (c.type === 'note') return `<p class="model-note" id="${c.id}" data-ctl="${c.id}"></p>`;
  if (c.type === 'editor') return `<div class="plan-editor" id="${c.id}" data-ctl="${c.id}"></div>`;
  if (c.type === 'select') return `<div class="prop" data-ctl="${c.id}">
    ${c.label ? `<div class="prop-top"><label for="${c.id}">${c.label}</label></div>` : ''}
    <select id="${c.id}" ${c.label ? '' : 'aria-label="Material"'}></select>
    <p class="hint" id="${c.id}-h"></p></div>`;
  return `<div class="prop" data-ctl="${c.id}">
    <div class="prop-top"><label for="${c.id}">${c.label}</label>${c.extra ? `<span class="prop-extra" id="${c.id}-x"></span>` : ''}</div>
    <div class="prop-row">
      <input type="range" id="${c.id}" min="${c.min}" max="${c.max}" step="${c.step}">
      <span class="num"><input type="number" id="${c.id}-n" min="${c.min}" max="${c.max}" step="${c.step}" aria-label="${c.label}${c.unit ? ' in ' + c.unit : ''}">${c.unit ? `<em>${c.unit}</em>` : ''}</span>
    </div>
    <p class="hint" id="${c.id}-h"></p>
  </div>`;
}

function commit(c, v, skip) {
  set(c.path, v);
  app.preset = null;
  syncSidebar(skip);
  onChangeCb();
}

/** Status line under the airfoil controls (which lift/drag model is active). */
export function setModelNote(text) { modelNoteText = text; const el = document.getElementById('modelNote'); if (el) el.innerHTML = text; }

/** Push app.S values into every control (skip = element being typed into). */
export function syncSidebar(skip) {
  for (const sec of SECTIONS) {
    for (const c of sec.controls) {
      const wrap = document.querySelector(`[data-ctl="${c.id}"]`);
      if (wrap) wrap.hidden = c.show ? !c.show() : false;
      if (c.type === 'note') { document.getElementById(c.id).innerHTML = modelNoteText; continue; }
      if (c.type === 'editor') { if (!wrap.hidden) drawEditor(); continue; }
      const h = document.getElementById(c.id + '-h'); if (h) h.textContent = hintText(c);
      if (c.type === 'select') {
        const sel = document.getElementById(c.id), opts = c.options();
        if (sel.options.length !== opts.length) sel.innerHTML = opts.map(([v, l]) => `<option value="${v}">${l}</option>`).join('');
        sel.value = get(c.path);
        continue;
      }
      const v = get(c.path), range = document.getElementById(c.id), num = document.getElementById(c.id + '-n');
      range.value = v;
      const dis = c.disabled ? c.disabled() : false;
      range.disabled = dis; num.disabled = dis; wrap.classList.toggle('is-disabled', dis);
      if (num !== skip) num.value = Number(v).toFixed(c.dp);
      if (c.extra) document.getElementById(c.id + '-x').textContent = c.extra(v);
    }
    document.getElementById('meta-' + sec.id).textContent = sec.meta();
  }
}

// ---------- Custom planform editor: two small plots with draggable points ----------
const W = 256, PH = 86, GAP = 26, PAD = { l: 34, r: 10, t: 16 };
const PLOTS = [
  { key: 'customChord', label: 'Width (% of radius)', min: 0, max: 40, fmt: v => `${fmt(v, 0)}%` },
  { key: 'customTwist', label: 'Twist vs. pitch (°)', min: -10, max: 10, fmt: v => `${v > 0 ? '+' : ''}${fmt(v, 1)}°` }
];
let editorEl = null, drag = null;
const px = x => PAD.l + (x - 0.15) / 0.85 * (W - PAD.l - PAD.r);
const py = (p, i, v) => PAD.t + i * (PH + GAP) + (1 - (v - p.min) / (p.max - p.min)) * PH;

function initEditor(el) {
  editorEl = el;
  el.innerHTML = `<svg viewBox="0 0 ${W} ${PAD.t + 2 * PH + GAP + 18}" role="img" aria-label="Custom blade width and twist editor"></svg>
    <div class="plan-actions"><button type="button" class="tb-btn small" id="planReset">Reset to classic</button><span class="hint">Root on the left, tip on the right.</span></div>`;
  const svg = el.querySelector('svg');
  const toLocal = e => { const r = svg.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * svg.viewBox.baseVal.height]; };
  svg.addEventListener('pointerdown', e => {
    const t = e.target.closest('[data-pt]'); if (!t) return;
    drag = { plot: +t.dataset.plot, idx: +t.dataset.pt }; svg.setPointerCapture(e.pointerId); e.preventDefault();
  });
  svg.addEventListener('pointermove', e => {
    if (!drag) return;
    const p = PLOTS[drag.plot], [, y] = toLocal(e);
    const v = p.min + (1 - (y - PAD.t - drag.plot * (PH + GAP)) / PH) * (p.max - p.min);
    app.S.design[p.key][drag.idx] = Math.round(Math.min(p.max, Math.max(p.min, v)) * 10) / 10;
    app.preset = null; drawEditor(); onChangeCb();
  });
  const end = () => { drag = null; };
  svg.addEventListener('pointerup', end); svg.addEventListener('pointercancel', end);
  // Keyboard: focus a point, use arrow keys
  svg.addEventListener('keydown', e => {
    const t = e.target.closest('[data-pt]'); if (!t || !['ArrowUp', 'ArrowDown'].includes(e.key)) return;
    const p = PLOTS[+t.dataset.plot], arr = app.S.design[p.key], i = +t.dataset.pt;
    arr[i] = Math.min(p.max, Math.max(p.min, arr[i] + (e.key === 'ArrowUp' ? 0.5 : -0.5)));
    e.preventDefault(); drawEditor(); onChangeCb();
    svg.querySelector(`[data-plot="${t.dataset.plot}"][data-pt="${i}"]`)?.focus();
  });
  el.querySelector('#planReset').addEventListener('click', () => { seedCustom(); drawEditor(); onChangeCb(); });
}

function drawEditor() {
  if (!editorEl) return;
  const d = app.S.design;
  if (!d.customChord) seedCustom();
  const svg = editorEl.querySelector('svg');
  let s = '';
  PLOTS.forEach((p, i) => {
    const y0 = PAD.t + i * (PH + GAP);
    s += `<text x="${PAD.l}" y="${y0 - 5}" class="pe-label">${p.label}</text>`;
    s += `<rect x="${PAD.l}" y="${y0}" width="${W - PAD.l - PAD.r}" height="${PH}" class="pe-bg"/>`;
    [p.min, (p.min + p.max) / 2, p.max].forEach(v => { s += `<line x1="${PAD.l}" x2="${W - PAD.r}" y1="${py(p, i, v)}" y2="${py(p, i, v)}" class="pe-grid"/><text x="${PAD.l - 4}" y="${py(p, i, v) + 3}" class="pe-tick" text-anchor="end">${fmt(v)}</text>`; });
    // reference: classic chord / zero twist
    const ref = EDIT_X.map(x => [px(x), py(p, i, i === 0 ? d.chordPct * chordShape(x) : 0)]);
    s += `<polyline points="${ref.map(q => q.join(',')).join(' ')}" class="pe-ref"/>`;
    const pts = EDIT_X.map((x, k) => [px(x), py(p, i, d[p.key][k])]);
    s += `<polyline points="${pts.map(q => q.join(',')).join(' ')}" class="pe-line"/>`;
    pts.forEach(([x, y], k) => { s += `<g data-plot="${i}" data-pt="${k}" tabindex="0" role="slider" aria-label="${p.label} at ${Math.round(EDIT_X[k] * 100)}% of radius" aria-valuenow="${d[p.key][k]}" class="pe-pt"><circle cx="${x}" cy="${y}" r="11" class="pe-hit"/><circle cx="${x}" cy="${y}" r="4.5" class="pe-dot"/></g>`; });
  });
  const yb = PAD.t + 2 * PH + GAP + 12;
  EDIT_X.forEach(x => { s += `<text x="${px(x)}" y="${yb}" class="pe-tick" text-anchor="middle">${Math.round(x * 100)}%</text>`; });
  svg.innerHTML = s;
}
