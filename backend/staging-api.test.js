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

test('staging configuration is isolated and stops at Calibration', () => {
  const { context } = createRuntime();
  assert.equal(context.APP_CONFIG.mode, 'api');
  assert.equal(context.APP_CONFIG.apiBaseUrl, 'https://jmejiaromero.app.n8n.cloud/webhook');
  assert.equal(context.APP_CONFIG.sessionStorageKey, 'edd_ic_admin_staging_session_v1');
  assert.equal(context.APP_CONFIG.features.postCalibrationEnabled, false);
  assert.deepEqual(Object.keys(context.APP_CONFIG.localDemoUsers), []);
  for (const name of ['releaseResult', 'confirmFeedbackMeeting', 'saveFeedbackAgreements', 'releaseFeedbackForSignature', 'signFeedbackAsLeader', 'signFeedbackAsEmployee']) {
    assert.equal(context.APP_CONFIG.apiEndpoints[name], null, name);
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
  await api.saveSelfDraft('ev 1', {});
  await api.submitSelf('ev 1');
  await api.leaderTeam();
  await api.saveLeaderDraft('ev 1', {});
  await api.submitLeader('ev 1');
  await api.adminCalibration();
  await api.saveAdminCalibration('ev 1', {});
  await api.completeAdminCalibration('ev 1');

  assert.deepEqual(calls.map((call) => [call.options.method, call.url]), [
    ['POST', 'https://jmejiaromero.app.n8n.cloud/webhook/ic-admin/auth/request-code'],
    ['POST', 'https://jmejiaromero.app.n8n.cloud/webhook/ic-admin/auth/verify-code'],
    ['GET', 'https://jmejiaromero.app.n8n.cloud/webhook/ic-admin/auth/me'],
    ['POST', 'https://jmejiaromero.app.n8n.cloud/webhook/ic-admin/auth/logout'],
    ['GET', 'https://jmejiaromero.app.n8n.cloud/webhook/ic-admin/evaluations/mine'],
    ['POST', 'https://jmejiaromero.app.n8n.cloud/webhook/ic-admin/evaluations/mine/initialize'],
    ['PUT', 'https://jmejiaromero.app.n8n.cloud/webhook/f65f8103-b53c-4b4d-9006-d3d299efa261/ic-admin/evaluations/ev%201/self-draft'],
    ['POST', 'https://jmejiaromero.app.n8n.cloud/webhook/32c614ca-8442-4935-b9f2-580ffe6a93bc/ic-admin/evaluations/ev%201/submit-self'],
    ['GET', 'https://jmejiaromero.app.n8n.cloud/webhook/ic-admin/leader/team'],
    ['PUT', 'https://jmejiaromero.app.n8n.cloud/webhook/d83afc7a-be9a-425d-bdd5-e53ddedb7f83/ic-admin/evaluations/ev%201/leader-draft'],
    ['POST', 'https://jmejiaromero.app.n8n.cloud/webhook/59acff4b-d56b-43e4-a14d-d6c4d7e3104a/ic-admin/evaluations/ev%201/submit-leader'],
    ['GET', 'https://jmejiaromero.app.n8n.cloud/webhook/ic-admin/admin/calibration'],
    ['PUT', 'https://jmejiaromero.app.n8n.cloud/webhook/a21f9ae0-316c-4462-8c85-0ae9ab2c8b2c/ic-admin/admin/calibration/ev%201'],
    ['POST', 'https://jmejiaromero.app.n8n.cloud/webhook/cba96b1a-2228-4749-8d60-4ed43b30e64a/ic-admin/admin/calibration/ev%201/complete']
  ]);
});

test('unapproved and post-Calibration endpoints never perform a request', async () => {
  const { context, calls } = createRuntime();
  for (const operation of [
    () => context.EDDApi.evaluationDetail('ev-1'),
    () => context.EDDApi.adminDashboard(),
    () => context.EDDApi.releaseResult('ev-1'),
    () => context.EDDApi.signFeedbackAsEmployee('feedback-1')
  ]) {
    await assert.rejects(operation(), (error) => error.tipo === 'unavailable' && error.status === 501);
  }
  assert.equal(calls.length, 0);
});

test('staging client contains no legacy webhook UUID or production domain', () => {
  const api = fs.readFileSync(path.join(__dirname, '../js/api.js'), 'utf8');
  const config = fs.readFileSync(path.join(__dirname, '../js/config.js'), 'utf8');
  const cname = fs.readFileSync(path.join(__dirname, '../CNAME'), 'utf8').trim();
  assert.doesNotMatch(api, /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  assert.doesNotMatch(api + config, /https:\/\/performance\.intercon\.com\.mx/);
  assert.equal(cname, 'stgperformance.intercon.com.mx');
});
