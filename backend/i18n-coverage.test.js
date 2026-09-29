const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
function translator(lang = 'en') {
  const window = {};
  vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname, '../js/i18n-unified-v33.js'), 'utf8'), {
    window, localStorage: { getItem: () => lang },
    document: { readyState: 'loading', addEventListener() {} }
  });
  return window.EDDI18N.translateText;
}
test('screenshot labels and decorated navigation are fully translated', () => {
  const t = translator();
  for (const [source, expected] of [
    ['¡Hola, Demo!', 'Hello, Demo!'],
    ['→\u00a0\u00a0Comenzar mi evaluación', '→\u00a0\u00a0Start my evaluation'],
    ['← Anterior', '← Back'], ['× Quitar', '× Remove'],
    ['+ Agregar objetivo', '+ Add objective'], ['✓ Comprendido', '✓ Got it'],
    ['⌂ \u00a0 Ir al inicio', '⌂ \u00a0 Go to home'],
    ['B. Conocimientos y Habilidades Técnicas', 'B. Technical Knowledge and Skills'],
    ['C. Cumplimiento de Objetivos', 'C. Goal Achievement'],
    ['Se calcula automáticamente', 'Calculated automatically'],
    ['Ej. 95', 'e.g. 95'], ['Sin cálculo', 'Not calculated']
  ]) assert.equal(t(source), expected, source);
});
test('Spanish selection and arbitrary employee content remain unchanged', () => {
  assert.equal(translator('es')('← Anterior'), '← Anterior');
  const text = 'Mi objetivo fue mejorar los objetivos de mi equipo';
  assert.equal(translator()(text), text);
});
test('published structure retains actual 40/30/30 weighting', () => {
  const t = translator();
  assert.equal(t('Valores y Actitud 40%'), 'Values and Attitude 40%');
  assert.equal(t('Técnica Funcional 60%'), 'Technical-functional Performance 60%');
});
test('manager screenshots: headings, placeholders and runtime values', () => {
  const t = translator();
  const cases = {
    'Mi equipo — Desarrollo Organizacional': 'My team — Organizational Development',
    'Evaluación de Demo New self-assessment': 'Evaluation of Demo New self-assessment',
    'Comparación — Demo New self-assessment': 'Comparison — Demo New self-assessment',
    '2 años 4 meses': '2 years 4 months',
    'Líder · Evaluación de Desempeño 2026': 'Manager · Performance Evaluation 2026',
    '1.8 pts al ideal': '1.8 pts below ideal',
    '+0.2 auto vs líder': '+0.2 self vs manager',
    'Líder 3.0/5 · Ideal 5.0/5': 'Manager 3.0/5 · Ideal 5.0/5',
    '5 · Sol': '5 · Sun',
    '+ Agregar': '+ Add',
    'Guardar acuerdo': 'Save agreement',
    'Compromiso Organizacional': 'Organizational Commitment',
    'VALORES / ACTITUD': 'VALUES / ATTITUDE',
    'Comentario del líder': 'Manager comment'
  };
  for (const [source, expected] of Object.entries(cases)) assert.equal(t(source), expected, source);
  for (const source of [
    'Ej. Mantiene alta calidad en sus entregables y apoya al equipo en cierres críticos.',
    'Ej. Fortalecer planeación semanal y desarrollar mayor dominio de Power BI.',
    'Ej. Presenta retrasos recurrentes en seguimiento y requiere mayor precisión en reportes.',
    'Ej. Dependencia de una sola persona/proceso, carga acumulada o falta de capacitación específica.',
    'Ej. Durante el periodo destacaste por..., y el principal foco de desarrollo será...'
  ]) assert.match(t(source), /^e\.g\./);
});
test('DO dashboard and calibration screenshots contain English system copy', () => {
  const t = translator();
  const cases = {
    'Ver detalle →': 'View details →',
    'Enviar notificación': 'Send notification',
    'Desarrollo Organizacional · Líder: Demo Manager 20001': 'Organizational Development · Manager: Demo Manager 20001',
    'Referencia de talento basada en los resultados de desempeño y actitud de la evaluación del líder.': 'Talent reference based on the manager evaluation results for performance and attitude.',
    'CONTEXTO DEL LÍDER': 'MANAGER CONTEXT',
    'Retroalimentación y acciones propuestas': 'Feedback and proposed actions',
    'Sin registrar.': 'Not recorded.',
    'Sin comentarios.': 'No comments recorded.',
    'Sin áreas registradas.': 'No development opportunities recorded.',
    'Justificación obligatoria cuando exista ajuste': 'Justification required when an adjustment is made',
    'ÚLTIMO CAMBIO': 'LATEST CHANGE',
    'Resumen de trazabilidad': 'Change history summary'
  };
  for (const [source, expected] of Object.entries(cases)) assert.equal(t(source), expected, source);
});

test('DO calibration and feedback notices are translated', () => {
  const t = translator();
  const cases = {
    'Confirma que la información es correcta antes de enviar.': 'Confirm that the information is correct before submitting.',
    'Registra al menos un objetivo o marca que no tienes objetivos aplicables antes de enviar.': 'Add at least one goal or indicate that you have no applicable goals before submitting.',
    'Confirma que la evaluación está completa antes de enviar.': 'Confirm that the evaluation is complete before submitting.',
    'La justificación es obligatoria cuando existe un ajuste distinto de 0.': 'A justification is required when the adjustment is not 0.',
    'Calibración guardada.': 'Calibration saved.',
    'Guarda la calibración antes de habilitar la retroalimentación.': 'Save the calibration before enabling feedback.',
    'El resultado es menor a 80. Registra al menos un plan de desarrollo antes de habilitar la retroalimentación.': 'The result is below 80. Add at least one development plan before enabling feedback.',
    'Retroalimentación habilitada. El colaborador podrá continuar cuando reciba la notificación correspondiente.': 'Feedback enabled. The employee can continue once they receive the corresponding notification.',
    'Verifica que "Alineada" sea menor que "Revisar".': 'Verify that "Aligned" is less than "Review".'
  };
  for (const [source, expected] of Object.entries(cases)) assert.equal(t(source), expected, source);
});

test('launch review requirements are covered in English', () => {
  const t = translator();
  assert.equal(
    t('Evalúa la vivencia diaria de los valores ESPÍRITU de Inter-Con y la forma en que el colaborador se conduce con las personas. ESPÍRITU significa Excelencia, Servicio, Pasión, Integridad, Respeto, Innovación, Trabajo en equipo y Unidad.'),
    'Evaluate how consistently the employee demonstrates Inter-Con’s ESPÍRITU values and interacts with others. ESPÍRITU stands for Excellence, Service, Passion, Integrity, Respect, Innovation, Teamwork, and Unity.'
  );
  assert.equal(
    t('Se abrirá un evento nuevo de Outlook en otra pestaña con el asunto y el contexto prellenados. Selecciona la fecha y hora, confirma al invitado y envía la invitación. EDD no guarda el evento; después confirma aquí que tuvieron la reunión y documenta los acuerdos.'),
    'A new Outlook event opens in another tab with the subject and context prefilled. Select the date and time, confirm the attendee, and send the invitation. EDD does not save the event; afterward, confirm the meeting here and document the agreements.'
  );
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
  for (const label of ['Salesforce', 'Paycom', 'Concur', 'Excel', 'SharePoint', 'Planner', 'PowerPoint', 'IQ-iconiq', 'Otros']) {
    assert.match(catalog[1], new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), label);
  }
  for (const removed of ['Word y PowerPoint', 'Outlook', 'Teams / SharePoint / OneDrive', 'Power BI', 'AI tools']) {
    assert.doesNotMatch(catalog[1], new RegExp(removed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), removed);
  }
  for (const key of ['salesforce', 'payCom', 'concur', 'excel', 'sharePoint', 'planner', 'powerPoint', 'iqIconiq', 'others']) {
    assert.match(app, new RegExp(`${key}:h\\.`), `payload ${key}`);
  }
});
