// Sidebar controls: built from config so adding a parameter is one entry here.
import { app } from './state.js';
import { MATERIALS } from './physics/index.js';
import { fmt, fmtG } from './lib/format.js';

/** path into app.S, e.g. ['design', 'diaIn'] */
const get = path => path.reduce((o, k) => o[k], app.S);
const set = (path, v) => { const last = path[path.length - 1]; path.slice(0, -1).reduce((o, k) => o[k], app.S)[last] = v; };

export const SECTIONS = [
  {
    id: 'blade', title: 'Blade shape',
    meta: () => `${fmt(app.S.design.diaIn, 1)} × ${fmt(app.S.design.pitchIn, 1)} × ${app.S.design.blades}`,
    controls: [
      { id: 'dia', label: 'Diameter', path: ['design', 'diaIn'], min: 2, max: 20, step: 0.1, dp: 1, unit: 'in', extra: v => `${fmt(v * 25.4)} mm`, hint: 'Tip to tip. Bigger props move more air gently, which saves power.' },
      { id: 'pitch', label: 'Pitch', path: ['design', 'pitchIn'], min: 1, max: 12, step: 0.1, dp: 1, unit: 'in', hint: 'How far one turn would screw the prop forward. More pitch takes a bigger bite of air.' },
      { id: 'blades', label: 'Blades', path: ['design', 'blades'], min: 2, max: 6, step: 1, dp: 0, unit: '', hint: 'More blades give more thrust from the same size, each a little less efficient.' },
      { id: 'chord', label: 'Blade width', path: ['design', 'chordPct'], min: 8, max: 34, step: 1, dp: 0, unit: '%', hint: 'Width at 75% of the blade, as % of its length. Wider grabs more air but adds drag.' }
    ]
  },
  {
    id: 'section', title: 'Cross-section',
    meta: () => `NACA ${Math.round(app.S.design.camber)}4${String(Math.round(app.S.design.thick)).padStart(2, '0')}`,
    controls: [
      { id: 'camber', label: 'Curve (camber)', path: ['design', 'camber'], min: 0, max: 8, step: 0.5, dp: 1, unit: '%', hint: "How arched the blade's slice is. A gentle curve makes lift easier." },
      { id: 'thick', label: 'Thickness', path: ['design', 'thick'], min: 6, max: 18, step: 0.5, dp: 1, unit: '%', hint: 'Thicker is stronger, slightly draggier.' }
    ]
  },
  {
    id: 'material', title: 'Material',
    meta: () => MATERIALS[app.S.design.material].name.replace(/ \(.*\)/, ''),
    select: true
  },
  {
    id: 'bench', title: 'Test bench',
    meta: () => `${fmt(app.S.rpm)} RPM`,
    controls: [
      { id: 'rpm', label: 'Spin speed', path: ['rpm'], min: 1000, max: 40000, step: 100, dp: 0, unit: 'RPM', hint: 'Speed on the test stand. Drives the bench readout and the 3D airflow.' }
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

let onChangeCb = () => {};

export function buildSidebar(container, onChange) {
  onChangeCb = onChange;
  let open = {};
  try { open = JSON.parse(localStorage.getItem('proplab-sections') || '{}'); } catch { /* ignore */ }
  container.innerHTML = SECTIONS.map(sec => `
    <details class="sec" data-sec="${sec.id}" ${open[sec.id] === false ? '' : 'open'}>
      <summary>${chevron}<span class="sec-title">${sec.title}</span><span class="sec-meta" id="meta-${sec.id}"></span></summary>
      <div class="sec-body">${sec.select ? materialMarkup() : sec.controls.map(controlMarkup).join('')}</div>
    </details>`).join('');

  container.querySelectorAll('details.sec').forEach(d => d.addEventListener('toggle', () => {
    open[d.dataset.sec] = d.open;
    try { localStorage.setItem('proplab-sections', JSON.stringify(open)); } catch { /* ignore */ }
  }));

  for (const sec of SECTIONS) for (const c of sec.controls || []) {
    const range = document.getElementById(c.id), num = document.getElementById(c.id + '-n');
    range.addEventListener('input', () => commit(c, parseFloat(range.value), num));
    num.addEventListener('change', () => {
      const v = parseFloat(num.value);
      commit(c, isFinite(v) ? Math.min(c.max, Math.max(c.min, v)) : get(c.path));
    });
    num.addEventListener('keydown', e => { if (e.key === 'Enter') num.blur(); });
  }
  const sel = document.getElementById('material');
  sel.addEventListener('change', () => { app.S.design.material = sel.value; syncSidebar(); onChangeCb(); });
}

function controlMarkup(c) {
  return `<div class="prop">
    <div class="prop-top"><label for="${c.id}">${c.label}</label>${c.extra ? `<span class="prop-extra" id="${c.id}-x"></span>` : ''}</div>
    <div class="prop-row">
      <input type="range" id="${c.id}" min="${c.min}" max="${c.max}" step="${c.step}">
      <span class="num"><input type="number" id="${c.id}-n" min="${c.min}" max="${c.max}" step="${c.step}" aria-label="${c.label}${c.unit ? ' in ' + c.unit : ''}">${c.unit ? `<em>${c.unit}</em>` : ''}</span>
    </div>
    <p class="hint">${c.hint}</p>
  </div>`;
}

function materialMarkup() {
  const opts = Object.entries(MATERIALS).map(([k, m]) => `<option value="${k}">${m.name}</option>`).join('');
  return `<div class="prop"><select id="material" aria-label="Material">${opts}</select><p class="hint" id="mat-note"></p></div>`;
}

function commit(c, v, skip) {
  set(c.path, v);
  app.preset = null;
  syncSidebar(skip);
  onChangeCb();
}

/** Push app.S values into every control (skip = element being typed into). */
export function syncSidebar(skip) {
  for (const sec of SECTIONS) {
    for (const c of sec.controls || []) {
      const v = get(c.path), range = document.getElementById(c.id), num = document.getElementById(c.id + '-n');
      range.value = v;
      if (num !== skip) num.value = Number(v).toFixed(c.dp);
      if (c.extra) document.getElementById(c.id + '-x').textContent = c.extra(v);
    }
    document.getElementById('meta-' + sec.id).textContent = sec.meta();
  }
  document.getElementById('material').value = app.S.design.material;
  document.getElementById('mat-note').textContent = MATERIALS[app.S.design.material].note;
}
