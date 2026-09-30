'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function createRuntime() {
  const calls = [];
  const values = new Map();
  const context = {
    console,
    Map,
    JSON,
    Date,
    AbortController,
    setTimeout,
    clearTimeout,
    sessionStorage: {
      getItem: (key) => values.get(key) || null,
      setItem: (key, value) => values.set(key, String(value)),
      removeItem: (key) => values.delete(key)
    },
    document: { body: { classList: { toggle() {} } } },
    dispatchEvent() {},
    CustomEvent: class CustomEvent {},
    fetch: async (url, options) => {
      calls.push({ url, options });
      return { status: 200, ok: true, text: async () => JSON.stringify({ success: true }) };
    }
  };
  context.window = context;
  vm.createContext(context);
  for (const file of ['config.js', 'api.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../js', file), 'utf8'), context);
  }
  return { context, calls };
}

test('staging configuration is isolated and enables the complete cycle', () => {
  const { context } = createRuntime();
  assert.equal(context.APP_CONFIG.mode, 'api');
  assert.equal(context.APP_CONFIG.apiBaseUrl, 'https://jmejiaromero.app.n8n.cloud/webhook');
  assert.equal(context.APP_CONFIG.sessionStorageKey, 'edd_ic_admin_staging_session_v1');
  assert.equal(context.APP_CONFIG.features.postCalibrationEnabled, true);
  assert.deepEqual(Object.keys(context.APP_CONFIG.localDemoUsers), []);
  for (const name of ['releaseResult', 'confirmFeedbackMeeting', 'saveFeedbackAgreements', 'releaseFeedbackForSignature', 'signFeedbackAsLeader', 'signFeedbackAsEmployee']) {
    assert.match(context.APP_CONFIG.apiEndpoints[name], /^\/[0-9a-f-]{36}\/ic-admin\//, name);
  }
});

test('all authorized ICA operations use the centralized staging routes', async () => {
  const { context, calls } = createRuntime();
  const api = context.EDDApi;
  await api.authRequestCode('10001');
  await api.authVerifyCode('10001', '000000', 'req-1');
  await api.authMe();
  await api.authLogout();
  await api.evaluationsMine();
  await api.initializeMyEvaluation();
  await api.evaluationDetail('ev 1');
  await api.saveSelfDraft('ev 1', {});
  await api.submitSelf('ev 1');
  await api.leaderTeam();
  await api.saveLeaderDraft('ev 1', {});
  await api.submitLeader('ev 1');
  await api.adminCalibration();
  await api.adminDashboard();
  await api.saveAdminCalibration('ev 1', {});
  await api.completeAdminCalibration('ev 1');
  await api.releaseResult('ev 1');
  await api.getFeedback('ev 1');
  await api.confirmFeedbackMeeting('fb 1');
  await api.saveFeedbackAgreements('fb 1', { agreements: 'Agreed' });
  await api.releaseFeedbackForSignature('fb 1');
  await api.signFeedbackAsLeader('fb 1', { signatureBase64: 'data:image/png;base64,x' });
  await api.signFeedbackAsEmployee('fb 1', { signatureBase64: 'data:image/png;base64,y' });

  assert.deepEqual(calls.map((call) => [call.options.method, call.url]), [
    ['POST', 'https://jmejiaromero.app.n8n.cloud/webhook/ic-admin/auth/request-code'],
    ['POST', 'https://jmejiaromero.app.n8n.cloud/webhook/ic-admin/auth/verify-code'],
    ['GET', 'https://jmejiaromero.app.n8n.cloud/webhook/ic-admin/auth/me'],
    ['POST', 'https://jmejiaromero.app.n8n.cloud/webhook/ic-admin/auth/logout'],
    ['GET', 'https://jmejiaromero.app.n8n.cloud/webhook/ic-admin/evaluations/mine'],
    ['POST', 'https://jmejiaromero.app.n8n.cloud/webhook/ic-admin/evaluations/mine/initialize'],
    ['GET', 'https://jmejiaromero.app.n8n.cloud/webhook/dcc98a8a-f131-4f86-8809-8feb5903de8e/ic-admin/evaluations/ev%201'],
    ['PUT', 'https://jmejiaromero.app.n8n.cloud/webhook/f65f8103-b53c-4b4d-9006-d3d299efa261/ic-admin/evaluations/ev%201/self-draft'],
    ['POST', 'https://jmejiaromero.app.n8n.cloud/webhook/32c614ca-8442-4935-b9f2-580ffe6a93bc/ic-admin/evaluations/ev%201/submit-self'],
    ['GET', 'https://jmejiaromero.app.n8n.cloud/webhook/ic-admin/leader/team'],
    ['PUT', 'https://jmejiaromero.app.n8n.cloud/webhook/d83afc7a-be9a-425d-bdd5-e53ddedb7f83/ic-admin/evaluations/ev%201/leader-draft'],
    ['POST', 'https://jmejiaromero.app.n8n.cloud/webhook/59acff4b-d56b-43e4-a14d-d6c4d7e3104a/ic-admin/evaluations/ev%201/submit-leader'],
    ['GET', 'https://jmejiaromero.app.n8n.cloud/webhook/ic-admin/admin/calibration'],
    ['GET', 'https://jmejiaromero.app.n8n.cloud/webhook/ic-admin/admin/dashboard'],
    ['PUT', 'https://jmejiaromero.app.n8n.cloud/webhook/a21f9ae0-316c-4462-8c85-0ae9ab2c8b2c/ic-admin/admin/calibration/ev%201'],
    ['POST', 'https://jmejiaromero.app.n8n.cloud/webhook/cba96b1a-2228-4749-8d60-4ed43b30e64a/ic-admin/admin/calibration/ev%201/complete'],
    ['POST', 'https://jmejiaromero.app.n8n.cloud/webhook/cc9425a8-27b4-41e2-8cee-a00abfff919e/ic-admin/evaluations/ev%201/release-feedback'],
    ['GET', 'https://jmejiaromero.app.n8n.cloud/webhook/cf2c1e2b-8e8f-4b2a-a111-0fcd3faeed77/ic-admin/evaluations/ev%201/feedback'],
    ['POST', 'https://jmejiaromero.app.n8n.cloud/webhook/98695289-ee08-473d-a135-85e5d8c247fa/ic-admin/feedback/fb%201/confirm-meeting'],
    ['PUT', 'https://jmejiaromero.app.n8n.cloud/webhook/c0c75e0e-f196-43a6-8926-2f44042c1093/ic-admin/feedback/fb%201/agreements'],
    ['POST', 'https://jmejiaromero.app.n8n.cloud/webhook/bc8e4a2f-da4c-4ec9-9341-e3c740a8dea0/ic-admin/feedback/fb%201/release-for-signature'],
    ['POST', 'https://jmejiaromero.app.n8n.cloud/webhook/39f835ea-0726-47ac-9d5f-9e4c905236a3/ic-admin/feedback/fb%201/sign-leader'],
    ['POST', 'https://jmejiaromero.app.n8n.cloud/webhook/254f8087-1bdc-4fa3-8ce6-a46c38363e1c/ic-admin/feedback/fb%201/sign-employee']
  ]);
});

test('post-Calibration writes send their payloads only to staging', async () => {
  const { context, calls } = createRuntime();
  await context.EDDApi.saveFeedbackAgreements('feedback-1', { agreements: 'Next steps' });
  await context.EDDApi.signFeedbackAsEmployee('feedback-1', { signatureBase64: 'data:image/png;base64,test' });
  assert.equal(calls.length, 2);
  assert.equal(JSON.parse(calls[0].options.body).agreements, 'Next steps');
  assert.match(calls[1].url, /jmejiaromero\.app\.n8n\.cloud\/webhook\/254f8087/);
});

test('staging client contains no legacy webhook UUID or production domain', () => {
  const api = fs.readFileSync(path.join(__dirname, '../js/api.js'), 'utf8');
  const config = fs.readFileSync(path.join(__dirname, '../js/config.js'), 'utf8');
  const cname = fs.readFileSync(path.join(__dirname, '../CNAME'), 'utf8').trim();
  assert.doesNotMatch(api, /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  assert.doesNotMatch(api + config, /https:\/\/performance\.intercon\.com\.mx/);
  assert.equal(cname, 'stgperformance.intercon.com.mx');
});
