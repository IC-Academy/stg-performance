'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function runtime() {
  const values = new Map();
  const listeners = new Map();
  let respond;
  const context = {
    console, Map, JSON, Date, AbortController, setTimeout, clearTimeout,
    sessionStorage: {
      getItem: key => values.get(key) || null,
      setItem: (key, value) => values.set(key, String(value)),
      removeItem: key => values.delete(key)
    },
    document: { body: { classList: { toggle() {} } } },
    CustomEvent: class { constructor(type) { this.type = type; } },
    addEventListener: (type, listener) => listeners.set(type, listener),
    dispatchEvent: event => { if (listeners.has(event.type)) listeners.get(event.type)(event); },
    fetch: () => new Promise(resolve => { respond = resolve; })
  };
  context.window = context;
  vm.createContext(context);
  for (const file of ['config.js', 'api.js', 'auth.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../js', file), 'utf8'), context);
  }
  return {
    context,
    setToken: token => values.set(context.APP_CONFIG.sessionStorageKey, JSON.stringify({ token })),
    hasSession: () => values.has(context.APP_CONFIG.sessionStorageKey),
    respond: () => respond({ status: 401, ok: false })
  };
}

for (const initial of [null, 'old-token']) {
  test('late leader 401 preserves a new session after ' + (initial || 'anonymous request'), async () => {
    const r = runtime();
    if (initial) r.setToken(initial);
    const request = r.context.EDDApi.leaderTeam();
    r.setToken('new-token');
    r.respond();
    await assert.rejects(request, error => error.status === 401);
    assert.equal(r.hasSession(), true);
  });
}

test('401 for the current token clears the session through auth listener', async () => {
  const r = runtime();
  r.setToken('current-token');
  const request = r.context.EDDApi.leaderTeam();
  r.respond();
  await assert.rejects(request, error => error.status === 401);
  assert.equal(r.hasSession(), false);
});

test('public OTP 401 does not clear an existing session', async () => {
  const r = runtime();
  r.setToken('current-token');
  const request = r.context.EDDApi.authRequestCode('synthetic-employee');
  r.respond();
  await assert.rejects(request, error => error.status === 401);
  assert.equal(r.hasSession(), true);
});

function appFunction(name) {
  const source = fs.readFileSync(path.join(__dirname, '../js/app.js'), 'utf8');
  const start = source.indexOf('  function ' + name + '(');
  assert.ok(start >= 0);
  const end = source.indexOf('\n  function ', start + 1);
  assert.ok(end > start);
  return source.slice(start, end);
}

test('cached reads and inflight requests are isolated between sessions', async () => {
  const r = runtime();
  const responses = [];
  r.context.fetch = (url, options) => new Promise(resolve => responses.push({ resolve, token: options.headers.Authorization }));
  r.setToken('account-a');
  const a = r.context.EDDApi.leaderTeam();
  r.setToken('account-b');
  const b = r.context.EDDApi.leaderTeam();
  assert.equal(responses.length, 2);
  assert.equal(responses[0].token, 'Bearer account-a');
  assert.equal(responses[1].token, 'Bearer account-b');
  responses[1].resolve({status: 200, ok: true, text: async () => JSON.stringify({team: ['account-b']})});
  await b;
  responses[0].resolve({status: 200, ok: true, text: async () => JSON.stringify({team: ['account-a']})});
  await a;
  const cached = await r.context.EDDApi.leaderTeam();
  assert.equal(cached.team[0], 'account-b');
  assert.equal(responses.length, 2);
});

for (const access of [undefined, {}, { leaderResultsVisible: true, resultsReleased: false }, { leaderResultsVisible: false, resultsReleased: true }, { leaderResultsVisible: true, resultsReleased: true }]) {
  test('own detail gates leader answers and feedback for access ' + JSON.stringify(access), () => {
    const calls = { feedback: 0, leader: 0, self: 0 };
    const context = {
      state: { remote: { mine: { evaluation: {} }, detail: {
        access, evaluation: {}, feedback: { finalAgreements: 'hidden-agreement' },
        answers: [{ evaluator: 'self' }, { evaluator: 'leader' }]
      } }, periodo: { id: 'period' } },
      apiReadMode: () => true,
      upsertColaboradorRemoto() {},
      empleadoRemoto: () => ({ empleado: 'synthetic' }),
      getOrCreateLocalEvaluation: (employee, leader, role) => { if (role === 'lider') calls.leader++; return { id: role }; },
      mapRemoteAnswerToLocal: id => { if (id === 'autoevaluacion') calls.self++; },
      hydrateObjectives() {}, syncBackendResultsFromDetail() {},
      hydrateRemoteFeedback: () => { calls.feedback++; },
      S: { persist() {} }
    };
    vm.createContext(context);
    vm.runInContext(appFunction('hydrateOwnRemoteDetail') + '\nhydrateOwnRemoteDetail();', context);
    const allowed = !!(access && access.leaderResultsVisible && access.resultsReleased);
    assert.equal(calls.feedback, allowed ? 1 : 0);
    assert.equal(calls.leader, allowed ? 1 : 0);
    assert.equal(calls.self, 1);
  });
}

test('login clears a stale privileged hash without a navigation event', () => {
  const replacements = [];
  const context = {
    state: { user: null, login: {} }, A: { getSession: () => null },
    location: { hash: '#/lider/pendientes', pathname: '/', search: '?source=uat' },
    history: { state: null, replaceState: (...args) => replacements.push(args) },
    root: {}, viewLogin: () => 'login', bindLogin() {}, translateDOM() {}
  };
  context.document = { getElementById: () => context.root };
  vm.createContext(context);
  vm.runInContext(appFunction('render') + '\nrender();', context);
  assert.equal(replacements.length, 1);
  assert.equal(replacements[0][2], '/?source=uat#/');
  assert.equal(context.root.innerHTML, 'login');
});
function pollingRuntime() {
  const source = fs.readFileSync(path.join(__dirname, '../js/workflow-ux-v22.js'), 'utf8');
  let session = false;
  let now = 0;
  let calls = 0;
  const context = {
    Date: { now: () => now },
    global: { EDDAuth: { getSession: () => session } },
    API: { leaderTeam: async () => { calls++; throw { status: 401 }; }, adminCalibration: async () => { calls++; throw { status: 401 }; } }
  };
  vm.createContext(context);
  const start = source.indexOf('  function hasSession()');
  const end = source.indexOf('  async function updateLeaderNotifications()', start);
  const adminStart = source.indexOf('  let adminCache = null;');
  const adminEnd = source.indexOf('  async function updateAdminNotifications()', adminStart);
  assert.ok(start >= 0 && end > start && adminStart >= 0 && adminEnd > adminStart);
  vm.runInContext(source.slice(start, end) + source.slice(adminStart, adminEnd), context);
  return { context, setSession: value => { session = value; }, setTime: value => { now = value; }, calls: () => calls };
}

test('privileged notification polling does not request data without a session', async () => {
  const r = pollingRuntime();
  await vm.runInContext('getLeaderTeam(false)', r.context);
  await vm.runInContext('getAdminCalibration(false)', r.context);
  assert.equal(r.calls(), 0);
});

test('privileged notification polling backs off after unauthorized responses', async () => {
  const r = pollingRuntime();
  r.setSession(true);
  await vm.runInContext('getLeaderTeam(false)', r.context);
  await vm.runInContext('getAdminCalibration(false)', r.context);
  assert.equal(r.calls(), 2);
  r.setTime(59999);
  await vm.runInContext('getLeaderTeam(true)', r.context);
  await vm.runInContext('getAdminCalibration(true)', r.context);
  assert.equal(r.calls(), 2);
  r.setTime(60001);
  await vm.runInContext('getLeaderTeam(false)', r.context);
  await vm.runInContext('getAdminCalibration(false)', r.context);
  assert.equal(r.calls(), 4);
});
