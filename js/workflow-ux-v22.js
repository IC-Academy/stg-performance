(function (global) {
  'use strict';

  const App = global.App;
  const API = global.EDDApi;
  if (!App) return;

  function txt(el) { return (el && el.textContent ? el.textContent : '').replace(/\s+/g, ' ').trim(); }
  function esc(value) { return String(value == null ? '' : value).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m])); }
  function lower(value) { return String(value == null ? '' : value).trim().toLowerCase(); }

  function needsLeaderEvaluation(item) {
    const self = lower(item.selfStatus || item.autoEvaluationStatus || item.processState);
    const leader = lower(item.leaderStatus || item.managerStatus);
    const selfReady = /submitted|completad|completed|enviad|pendiente de l[ií]der|pending manager|self_submitted/.test(self);
    const leaderDone = /leader_submitted|submitted|completad|completed|enviad|closed|cerrad/.test(leader);
    return !!(selfReady && !leaderDone && (item.evaluationId || item.id));
  }

  function needsLeaderSignature(item) {
    if (item.leaderSignaturePending === true) return true;
    const feedback = lower(item.feedbackState || item.feedbackStatus || item.processState);
    const leaderSigned = item.leaderSigned === true || item.leaderSignature === true || /firma.*l[ií]der.*completa|firmado.*l[ií]der|manager signature complete|signed by manager/.test(feedback);
    return !leaderSigned && /lista para firma|pendiente firma l[ií]der|pending leader signature|ready for signature/.test(feedback);
  }

  function humanizeTechnicalStates(root) {
    (root || document).querySelectorAll('table').forEach(table => {
      const headers = Array.from(table.querySelectorAll('thead th')).map(h => lower(txt(h)));
      const processIdx = headers.findIndex(h => h === 'proceso' || h === 'process');
      const leaderIdx = headers.findIndex(h => /evaluaci[oó]n l[ií]der|evaluacion lider|manager evaluation/.test(h));
      table.querySelectorAll('tbody tr').forEach(row => {
        const cells = row.children;
        if (leaderIdx >= 0 && cells[leaderIdx]) {
          const v = lower(txt(cells[leaderIdx]));
          if (v.includes('leader_submitted')) cells[leaderIdx].innerHTML = '<span class="badge badge-green">Evaluation submitted</span>';
        }
        if (processIdx >= 0 && cells[processIdx]) {
          const v = lower(txt(cells[processIdx]));
          if (v.includes('leader_submitted')) cells[processIdx].innerHTML = '<span class="badge badge-yellow">Pending calibration</span>';
          else if (v.includes('pending_calibration')) cells[processIdx].innerHTML = '<span class="badge badge-yellow">Pending calibration</span>';
          else if (v.includes('feedback_pending') || v.includes('pending_meeting')) cells[processIdx].innerHTML = '<span class="badge badge-yellow">Feedback pending</span>';
          else if (v.includes('pending_leader_signature')) cells[processIdx].innerHTML = '<span class="badge badge-red">Pending your signature</span>';
        }
      });
    });
  }

  function setButtonText(btn, value) {
    if (txt(btn) !== value) btn.textContent = value;
  }

  function decorateActionButtons(root) {
    (root || document).querySelectorAll('table tbody tr').forEach(row => {
      const rowText = lower(txt(row));
      const buttons = Array.from(row.querySelectorAll('button,a.btn'));
      buttons.forEach(btn => {
        const label = lower(txt(btn));
        if (label.includes('view progress') || label.includes('view comparison') || label === 'review' || label.includes('ver seguimiento') || label.includes('ver comparación') || label.includes('revisar')) {
          btn.classList.add('workflow-action-primary');
          if (/pendiente.*firma|lista para firma|firma.*l[ií]der|pending.*signature|manager pending|ready for signature/.test(rowText)) setButtonText(btn, 'Sign now →');
          else if (/retroalimentaci[oó]n.*pendiente|pendiente.*reuni[oó]n|en revisi[oó]n con colaborador|feedback pending|meeting pending/.test(rowText)) setButtonText(btn, 'Continue feedback →');
          else if (/pendiente de calibraci[oó]n|pending calibration|leader_submitted/.test(rowText) && location.hash.indexOf('/admin/') !== -1) setButtonText(btn, 'Calibrate now →');
          else setButtonText(btn, 'View progress →');
        }
        if (label === 'evaluar' || label === 'evaluate') {
          btn.classList.add('workflow-action-primary');
          setButtonText(btn, 'Evaluate now →');
        }
      });
    });
  }

  function findNavItem(labelPattern) {
    return Array.from(document.querySelectorAll('nav a, nav button, .app-nav a, .app-nav button, header a, header button')).find(el => labelPattern.test(txt(el)));
  }

  function setNavBadge(el, count, tone) {
    if (!el) return;
    let badge = el.querySelector('.workflow-nav-badge');
    if (!count) {
      if (badge) badge.remove();
      el.classList.remove('workflow-nav-has-action');
      return;
    }
    if (!badge) { badge = document.createElement('span'); badge.className = 'workflow-nav-badge'; el.appendChild(badge); }
    badge.className = 'workflow-nav-badge ' + (tone || 'attention');
    if (badge.textContent !== String(count)) badge.textContent = String(count);
    el.classList.add('workflow-nav-has-action');
  }

  let leaderCache = null;
  async function getLeaderTeam(force) {
    if (!API || typeof API.leaderTeam !== 'function') return null;
    if (leaderCache && !force && Date.now() - leaderCache.at < 15000) return leaderCache.data;
    try {
      const raw = await API.leaderTeam(!!force);
      const data = raw && raw.data ? raw.data : raw;
      leaderCache = { at: Date.now(), data };
      return data;
    } catch (_) { return null; }
  }

  async function updateLeaderNotifications() {
    if (location.hash.indexOf('/lider/') === -1) return;
    const data = await getLeaderTeam(false);
    const team = data && Array.isArray(data.team) ? data.team : [];
    const pending = team.filter(needsLeaderEvaluation).length;
    const signatures = team.filter(needsLeaderSignature).length;
    setNavBadge(findNavItem(/Pending evaluations|Pendientes por evaluar/i), pending, 'attention');
    setNavBadge(findNavItem(/Pending signatures|Por firmar/i), signatures, 'danger');

    const host = document.querySelector('.backend-live-section, .premium-evaluation-main, main, #app-root');
    if (host && (pending || signatures) && !document.querySelector('.workflow-leader-alert')) {
      const box = document.createElement('div');
      box.className = 'workflow-leader-alert';
      const pieces = [];
      if (pending) pieces.push(`<a href="#/lider/pendientes"><strong>${pending}</strong><span>${pending === 1 ? 'evaluation needs your attention' : 'evaluations need your attention'}</span><b>Evaluate now →</b></a>`);
      if (signatures) pieces.push(`<a href="#/lider/firmas"><strong>${signatures}</strong><span>${signatures === 1 ? 'feedback is awaiting your signature' : 'feedback records are awaiting your signature'}</span><b>Sign now →</b></a>`);
      box.innerHTML = pieces.join('');
      host.insertAdjacentElement('afterbegin', box);
    }
  }

  function leaderRowHtml(x, mode) {
    const id = x.employeeId || x.id || '';
    const evId = x.evaluationId || x.id || '';
    const self = x.selfStatus || '—';
    const leader = /leader_submitted/i.test(String(x.leaderStatus || '')) ? 'Evaluation submitted' : (x.leaderStatus || '—');
    const processRaw = lower(x.processState || '');
    let process = x.processState || '—';
    if (/leader_submitted|pending_calibration/.test(processRaw)) process = 'Pending calibration';
    const feedback = x.feedbackState || '—';
    const signature = needsLeaderSignature(x) ? '<span class="badge badge-red">Pending manager</span>' : (x.employeeSignaturePending ? '<span class="badge badge-yellow">Employee pending</span>' : '—');
    let action = '';
    if (mode === 'pending') action = `<button class="btn btn-primary btn-sm workflow-action-primary" onclick="App.abrirEvaluacionLider('${esc(id)}','${esc(evId)}')">Evaluate now →</button>`;
    else if (mode === 'sign') action = `<button class="btn btn-primary btn-sm workflow-action-primary" onclick="App.abrirComparacionLider('${esc(id)}','${esc(evId)}')">Sign now →</button>`;
    else action = `<button class="btn btn-primary btn-sm workflow-action-primary" onclick="App.abrirComparacionLider('${esc(id)}','${esc(evId)}')">View progress →</button>`;
    return `<tr><td><div class="backend-person-cell"><strong>${esc(x.name || x.employeeName || id)}</strong><small>${esc(id)}</small></div></td><td>${esc(x.position || '—')}</td><td>${esc(x.area || '—')}</td><td><span class="badge">${esc(self)}</span></td><td><span class="badge">${esc(leader)}</span></td><td><span class="badge badge-yellow">${esc(process)}</span></td><td><span class="badge">${esc(feedback)}</span></td><td>${signature}</td><td>${action}</td></tr>`;
  }

  async function repairLeaderQueues() {
    if (location.hash.indexOf('/lider/pendientes') === -1 && location.hash.indexOf('/lider/firmas') === -1) return;
    const data = await getLeaderTeam(false);
    const team = data && Array.isArray(data.team) ? data.team : [];
    const isPending = location.hash.indexOf('/lider/pendientes') !== -1;
    const rows = isPending ? team.filter(needsLeaderEvaluation) : team.filter(needsLeaderSignature);
    const table = Array.from(document.querySelectorAll('.backend-live-section table')).find(t => /Name|Nombre/i.test(txt(t.querySelector('thead'))));
    if (!table) return;
    const tbody = table.querySelector('tbody');
    if (!tbody) return;
    const key = (isPending ? 'pending:' : 'sign:') + rows.map(x => String(x.employeeId || x.id || '') + ':' + String(x.evaluationId || '')).join('|');
    if (tbody.dataset.workflowQueueKey !== key) {
      tbody.dataset.workflowQueueKey = key;
      tbody.innerHTML = rows.length ? rows.map(x => leaderRowHtml(x, isPending ? 'pending' : 'sign')).join('') : `<tr><td colspan="9"><div class="workflow-empty-state">${isPending ? 'You have no pending evaluations at this time.' : 'You have no feedback pending your signature.'}</div></td></tr>`;
    }
    const title = table.closest('.card') && table.closest('.card').querySelector('h2');
    const desiredTitle = isPending ? `Pending evaluations · ${rows.length}` : `Pending signatures · ${rows.length}`;
    if (title && txt(title) !== desiredTitle) title.textContent = desiredTitle;
  }

  let adminCache = null;
  async function getAdminCalibration(force) {
    if (!API || typeof API.adminCalibration !== 'function') return null;
    if (adminCache && !force && Date.now() - adminCache.at < 15000) return adminCache.data;
    try {
      const raw = await API.adminCalibration(!!force);
      const data = raw && raw.data ? raw.data : raw;
      adminCache = { at: Date.now(), data };
      return data;
    } catch (_) { return null; }
  }

  async function updateAdminNotifications() {
    if (location.hash.indexOf('/admin/') === -1) return;
    const data = await getAdminCalibration(false);
    const pending = data && Array.isArray(data.pending) ? data.pending : [];
    setNavBadge(findNavItem(/^Calibration/i), pending.length, 'attention');
    if (!pending.length) return;
    const host = document.querySelector('.admin-premium-shell, .admin-panel, main, #app-root');
    if (host && !document.querySelector('.workflow-admin-alert')) {
      const box = document.createElement('a');
      box.className = 'workflow-admin-alert';
      box.href = '#/admin/calibracion';
      box.innerHTML = `<span>ACTION REQUIRED</span><strong>${pending.length} ${pending.length === 1 ? 'evaluation requires calibration' : 'evaluations require calibration'}</strong><b>Calibrate now →</b>`;
      host.insertAdjacentElement('afterbegin', box);
    }
    document.querySelectorAll('table tbody tr').forEach(row => {
      if (!/pendiente de calibraci[oó]n|pending calibration/i.test(txt(row))) return;
      const action = Array.from(row.querySelectorAll('a.btn,button.btn')).find(b => /revisar|ver|review|view/i.test(txt(b)));
      if (action) { setButtonText(action, 'Calibrate now →'); action.classList.add('workflow-action-primary'); }
    });
  }

  function processCompleteFromDom(section) {
    const scope = section || document;
    const signatures = Array.from(scope.querySelectorAll('.signature-status'));
    const signed = signatures.filter(s => /firmado|signed/i.test(txt(s))).length;
    return signed >= 2 || /cerrad[ao]|proceso completado|process completed/i.test(txt(scope));
  }

  function gateDocuments() {
    document.querySelectorAll('.feedback-acceptance-card, .leader-release-card').forEach(section => {
      const actions = section.querySelector('.document-actions');
      if (!actions) return;
      if (processCompleteFromDom(section)) {
        actions.classList.remove('workflow-documents-locked');
        const note = section.querySelector('.workflow-documents-note'); if (note) note.remove();
      } else {
        actions.classList.add('workflow-documents-locked');
        actions.querySelectorAll('button').forEach(btn => { btn.disabled = true; btn.setAttribute('aria-disabled','true'); });
        if (!section.querySelector('.workflow-documents-note')) {
          const note = document.createElement('div');
          note.className = 'workflow-documents-note';
          note.textContent = 'The record and PDF will be available once the feedback and both signatures are complete.';
          actions.insertAdjacentElement('afterend', note);
        }
      }
    });
  }

  function avg(values) {
    const nums = values.map(Number).filter(Number.isFinite);
    if (!nums.length) return null;
    return Math.round((nums.reduce((a,b)=>a+b,0) / nums.length) * 100) / 100;
  }

  function repairB2Aggregation() {
    const tables = Array.from(document.querySelectorAll('table'));
    const toolTable = tables.find(t => {
      const h = lower(txt(t.querySelector('thead')));
      const body = lower(txt(t.querySelector('tbody')));
      return /herramienta|tool/.test(h) && /salesforce|paycom|concur|excel|sharepoint|planner|powerpoint|iq-iconiq/.test(body) && /auto|self/.test(h) && /l[ií]der|manager/.test(h);
    });
    if (!toolTable) return;
    const toolRows = Array.from(toolTable.querySelectorAll('tbody tr'));
    const autos = [], leaders = [];
    toolRows.forEach(r => {
      const c = r.children;
      if (c[1] && !/[—-]/.test(txt(c[1]))) autos.push(Number(txt(c[1]).replace(',','.')));
      if (c[2] && !/[—-]/.test(txt(c[2]))) leaders.push(Number(txt(c[2]).replace(',','.')));
    });
    const a = avg(autos), l = avg(leaders);
    if (a == null && l == null) return;
    tables.forEach(t => {
      const heads = Array.from(t.querySelectorAll('thead th')).map(h => lower(txt(h)));
      const autoIdx = heads.findIndex(h => /^auto|autoevaluaci|^self/.test(h));
      const leaderIdx = heads.findIndex(h => /^l[ií]der|evaluaci[oó]n l[ií]der|^manager/.test(h));
      const gapIdx = heads.findIndex(h => /brecha|diferencia|^gap|difference/.test(h));
      if (autoIdx < 0 || leaderIdx < 0) return;
      Array.from(t.querySelectorAll('tbody tr')).forEach(row => {
        if (!row.children[0] || !/procesos y herramientas de trabajo|work processes and tools/i.test(txt(row.children[0]))) return;
        const aText = a == null ? null : (Number.isInteger(a) ? String(a) : a.toFixed(2).replace(/0+$/,'').replace(/\.$/,''));
        const lText = l == null ? null : (Number.isInteger(l) ? String(l) : l.toFixed(2).replace(/0+$/,'').replace(/\.$/,''));
        if (aText != null && row.children[autoIdx] && txt(row.children[autoIdx]) !== aText) row.children[autoIdx].textContent = aText;
        if (lText != null && row.children[leaderIdx] && txt(row.children[leaderIdx]) !== lText) row.children[leaderIdx].textContent = lText;
        if (gapIdx >= 0 && row.children[gapIdx] && a != null && l != null) {
          const d = Math.round((l-a)*100)/100;
          const dText = (d > 0 ? '+' : '') + d.toFixed(2).replace(/0+$/,'').replace(/\.$/,'');
          if (txt(row.children[gapIdx]) !== dText) row.children[gapIdx].textContent = dText;
        }
        row.classList.add('workflow-b2-aggregated');
      });
    });
  }

  function installDocumentRenderer() {
    function buildDocument(title) {
      const root = document.querySelector('#app-root');
      if (!root) return '';
      const clone = root.cloneNode(true);
      clone.querySelectorAll('button, .nav-tabs, .wizard-steps, .wizard-nav, .app-header, .app-footer, .document-actions, .workflow-documents-note, input[type="checkbox"], .workflow-leader-alert, .workflow-admin-alert').forEach(el => el.remove());
      clone.querySelectorAll('textarea,input,select').forEach(el => {
        const repl = document.createElement('div'); repl.className = 'print-field-value'; repl.textContent = el.value || el.getAttribute('value') || '—'; el.replaceWith(repl);
      });
      return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(title)}</title><style>
        @page{size:A4;margin:13mm}*{box-sizing:border-box}body{font-family:Segoe UI,Arial,sans-serif;color:#0b2545;margin:0;background:#fff;font-size:10.5px;line-height:1.42}.doc-head{background:#082b52;color:#fff;padding:20px 24px;border-radius:12px;margin-bottom:16px}.doc-brand{font-size:10px;letter-spacing:1.8px;font-weight:700;opacity:.82}.doc-head h1{font-size:23px;margin:5px 0 3px;color:#fff}.doc-head p{margin:0;opacity:.86}.doc-meta{display:flex;justify-content:space-between;gap:15px;margin-top:13px;padding-top:10px;border-top:1px solid rgba(255,255,255,.25)}#app-root{max-width:none!important}.sidebar,.leader-sidebar,.admin-sidebar,.premium-evaluation-sidebar{display:none!important}.container,.main-content,.content,.premium-evaluation-main{max-width:none!important;width:100%!important;margin:0!important;padding:0!important}.card,.admin-panel,.feedback-acceptance-card,.leader-release-card,.performance-summary,.comparison-card{box-shadow:none!important;border:1px solid #d9e4f0!important;border-radius:10px!important;margin:0 0 10px!important;padding:12px!important;background:#fff!important}h1,h2,h3,h4{color:#082b52!important;break-after:avoid}.table{width:100%;border-collapse:collapse;font-size:9.5px}.table th{background:#edf4fb!important;color:#082b52!important;padding:6px}.table td{padding:6px;border-bottom:1px solid #e4ebf3}.print-field-value{border:1px solid #d9e4f0;background:#f8fbfe;padding:7px;border-radius:7px;min-height:28px}img{max-width:100%!important;height:auto!important;object-fit:contain!important}.signature-preview,.signature-signed-summary+img,.sig img,img[alt*="Firma" i]{display:block!important;width:auto!important;max-width:180px!important;max-height:70px!important;margin:6px auto!important;object-fit:contain!important}.logo img,.app-logo img,header img{max-height:46px!important;width:auto!important}.evidence img,.evidencia img,.attachment img{max-width:280px!important;max-height:190px!important;object-fit:contain!important}.leader-objective-scale-guide,.leader-objective-visual-flow,.signature-card{break-inside:avoid}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
      </style></head><body><header class="doc-head"><div class="doc-brand">INTER-CON · PERFORMANCE EVALUATION</div><h1>${esc(title)}</h1><p>Final record of the feedback process.</p><div class="doc-meta"><span>Document generated from the official platform</span><span>${new Date().toLocaleDateString('en-US')}</span></div></header>${clone.innerHTML}</body></html>`;
    }

    App.imprimirRetroalimentacion = function () {
      const section = document.querySelector('.feedback-acceptance-card, .leader-release-card');
      if (section && !processCompleteFromDom(section)) return;
      const html = buildDocument('Performance feedback'); if (!html) return;
      const w = window.open('', '_blank'); if (!w) return;
      w.document.open(); w.document.write(html); w.document.close();
      const go = () => { try { w.focus(); w.print(); } catch (_) {} };
      if (w.document.readyState === 'complete') setTimeout(go,250); else w.addEventListener('load',()=>setTimeout(go,250),{once:true});
    };

    App.descargarRetroalimentacion = function (colaboradorId, periodoId) {
      const section = document.querySelector('.feedback-acceptance-card, .leader-release-card');
      if (section && !processCompleteFromDom(section)) return;
      const html = buildDocument('Feedback record'); if (!html) return;
      const blob = new Blob([html],{type:'text/html;charset=utf-8'}); const url=URL.createObjectURL(blob); const a=document.createElement('a');
      a.href=url; a.download=`feedback-record-${colaboradorId||'employee'}-${periodoId||'period'}.html`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),1200);
    };
  }

  let scheduled = false;
  function enhanceSync() {
    humanizeTechnicalStates();
    decorateActionButtons();
    gateDocuments();
    repairB2Aggregation();
  }
  async function enhanceAsync() {
    await Promise.all([updateLeaderNotifications(), updateAdminNotifications()]);
    await repairLeaderQueues();
    enhanceSync();
  }
  function schedule() {
    if (scheduled) return; scheduled = true;
    requestAnimationFrame(() => { scheduled = false; enhanceSync(); setTimeout(enhanceAsync,20); });
  }

  installDocumentRenderer();
  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement,{childList:true,subtree:true});
  global.addEventListener('hashchange',()=>{leaderCache=null;adminCache=null;setTimeout(schedule,30);});
  document.addEventListener('DOMContentLoaded',schedule);
  setTimeout(schedule,100);
  setTimeout(schedule,600);
})(window);
