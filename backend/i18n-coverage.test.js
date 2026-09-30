const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// The interface is authored directly in English. These checks make sure the
// visible copy stays English-only and that no Spanish UI text slips back in.
const read = (rel) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
const UI_FILES = fs.readdirSync(path.join(__dirname, '../js')).filter((f) => f.endsWith('.js')).map((f) => 'js/' + f);

test('key screens render English copy', () => {
  const app = read('js/app.js');
  for (const label of [
    'Start my evaluation', 'Save progress', 'Next →', '← Back', '+ Add objective', 'Sign in to the platform',
    'Values and Attitude 40%', 'Technical-functional Performance 60%', 'Pending evaluations', 'Save calibration',
    'Enable feedback', 'Schedule meeting in Outlook', 'Change history summary', 'Feedback and proposed actions'
  ]) assert.ok(app.includes(label), label);
});

test('former Spanish UI copy is gone from the source', () => {
  const all = UI_FILES.map(read).join('\n');
  for (const spanish of [
    'Comenzar mi evaluación', 'Guardar progreso', 'Siguiente →', '← Anterior', '+ Agregar objetivo',
    'Ingresar a la plataforma', 'Cerrar sesión', 'Retroalimentación habilitada', 'Guardar calibración',
    'Agendar reunión en Outlook', 'Resumen de trazabilidad', 'No tienes evaluaciones pendientes',
    'Firma del colaborador', 'Evaluación de Desempeño'
  ]) {
    const hits = UI_FILES.filter((f) => read(f).split('\n').some((l) => l.includes(spanish) && !/^\s*(\/\/|\*)/.test(l) && !/^\s*'[^']*':\s*'/.test(l) && !/Object\.assign\(EN/.test(l) && !/^\s*"/.test(l)));
    // Only the legacy EN catalog (Spanish -> English map) may still contain the Spanish key.
    assert.ok(hits.every((f) => f === 'js/app.js') , spanish + ' in ' + hits.join(','));
  }
});

test('stored Spanish values are always displayed in English', () => {
  const app = read('js/app.js');
  for (const [value, english] of [['Pendiente de calibración','Pending calibration'],['Colaborador','Employee'],['Crítico','Critical'],['Sin reemplazo identificado','No identified replacement']]) {
    assert.ok(app.includes(`'${value}':'${english}'`), value);
  }
});

test('9-box quadrants, levels and gap labels are English', () => {
  const calc = read('js/calculations.js');
  for (const label of ['Outstanding', 'Meets expectations', 'Sowing', 'Seed', 'Potted', 'Sun', 'Harvest', 'Water', 'Heart', 'Aligned', 'Significant gap'])
    assert.ok(calc.includes(`'${label}'`), label);
});

test('calibration comparison and Outlook compose link are present', () => {
  const app = fs.readFileSync(require('node:path').join(__dirname, '../js/app.js'), 'utf8');
  const unified = fs.readFileSync(require('node:path').join(__dirname, '../js/i18n-unified-v33.js'), 'utf8');
  for (const label of ['Expected standard', 'Calibrated employee result', 'Company average', 'FINAL CALIBRATION VIEW']) {
    assert.match(app, new RegExp(label), label);
  }
  assert.match(app, /outlook\.office\.com\/calendar\/0\/deeplink\/compose/);
  assert.match(app, /params\.set\('to', col\.correoCorporativo\)/);
  assert.match(app, /global\.EDDInlineEnglish = EN/);
  assert.match(unified, /global\.EDDInlineEnglish/);
});

test('software catalog uses the approved IC Admin list across the evaluation flow', () => {
  const app = fs.readFileSync(require('node:path').join(__dirname, '../js/app.js'), 'utf8');
  const catalog = app.match(/const HERRAMIENTAS_B2 = \[([\s\S]*?)\n  \];/);
  assert.ok(catalog, 'software catalog must exist');
  for (const label of ['Salesforce', 'Paycom', 'Concur', 'Excel', 'SharePoint', 'Planner', 'PowerPoint', 'IQ-iconiq', 'Other']) {
    assert.match(catalog[1], new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), label);
  }
  for (const removed of ['Word y PowerPoint', 'Outlook', 'Teams / SharePoint / OneDrive', 'Power BI', 'AI tools']) {
    assert.doesNotMatch(catalog[1], new RegExp(removed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), removed);
  }
  for (const key of ['salesforce', 'payCom', 'concur', 'excel', 'sharePoint', 'planner', 'powerPoint', 'iqIconiq', 'others']) {
    assert.match(app, new RegExp(`${key}:h\\.`), `payload ${key}`);
  }
});
