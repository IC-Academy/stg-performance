'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function runtime() {
  const calls = [];
  const values = new Map();
  const context = {
    console: { error() {} }, AbortController, setTimeout, clearTimeout,
    sessionStorage: { getItem: k => values.get(k) || null },
    APP_CONFIG: { apiBaseUrl: '', sessionStorageKey: 'session', apiEndpoints: {
      saveSelfDraft: '/:evaluationId/draft', submitSelf: '/:evaluationId/submit'
    } },
    fetch(url, options) {
      return new Promise((resolve, reject) => calls.push({ url, options, resolve, reject }));
    }
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/api.js'), 'utf8'), context);
  return { api: context.EDDApi, calls, values };
}
const tick = () => new Promise(resolve => setImmediate(resolve));
function answer(call, status = 200, body = { success: true }) {
  call.resolve({ status, ok: status < 400, text: async () => JSON.stringify(body) });
}

test('two drafts finish in order before submit; late saves and duplicate submit never reach server', async () => {
  const { api, calls } = runtime();
  const body = { value: 1 };
  const first = api.saveSelfDraft('ev', body);
  const second = api.saveSelfDraft('ev', { value: 2 });
  body.value = 9;
  const submit = api.submitSelf('ev');
  await assert.rejects(api.saveSelfDraft('ev', {}), { status: 409 });
  await assert.rejects(api.submitSelf('ev'), { status: 409 });
  await tick();
  assert.equal(calls.length, 1);
  assert.equal(JSON.parse(calls[0].options.body).value, 1);
  answer(calls[0]); await first; await tick();
  assert.equal(calls.length, 2);
  answer(calls[1]); await second; await tick();
  assert.equal(calls[2].url, '/ev/submit');
  answer(calls[2]); await submit;
  await assert.rejects(api.saveSelfDraft('ev', {}), { status: 409 });
  assert.equal(calls.length, 3);
});

test('failed draft cancels queued submit; explicit successful retry allows submission', async () => {
  const { api, calls } = runtime();
  const draft = api.saveSelfDraft('ev', {});
  const failed = assert.rejects(draft, { status: 400 });
  const submit = assert.rejects(api.submitSelf('ev'), { status: 400 });
  await tick(); answer(calls[0], 400, {}); await failed; await submit;
  assert.equal(calls.length, 1);
  const retry = api.saveSelfDraft('ev', {});
  await tick(); answer(calls[1]); await retry;
  const done = api.submitSelf('ev');
  await tick(); answer(calls[2]); await done;
});

test('lost draft response blocks queued writes and submit', async () => {
  const { api, calls } = runtime();
  const failed = assert.rejects(api.saveSelfDraft('ev', {}), { tipo: 'network' });
  const queued = assert.rejects(api.saveSelfDraft('ev', {}), { tipo: 'network' });
  const submit = assert.rejects(api.submitSelf('ev'), { tipo: 'network' });
  await tick(); calls[0].reject(new Error('connection lost'));
  await failed; await queued; await submit;
  await assert.rejects(api.saveSelfDraft('ev', {}), { status: 409 });
  assert.equal(calls.length, 1);
});

test('unconfirmed submission does not reopen editing', async () => {
  const { api, calls } = runtime();
  const failed = assert.rejects(api.submitSelf('ev'), { tipo: 'parse' });
  await tick(); answer(calls[0], 200, null); await failed;
  await assert.rejects(api.saveSelfDraft('ev', {}), { status: 409 });
});

test('evaluation queues are independent and old-session queued writes are cancelled', async () => {
  const { api, calls, values } = runtime();
  values.set('session', JSON.stringify({ token: 'old' }));
  const first = api.saveSelfDraft('a', {});
  const stale = assert.rejects(api.saveSelfDraft('a', {}), { tipo: 'stale-session' });
  const other = api.saveSelfDraft('b', {});
  await tick(); assert.equal(calls.length, 2);
  values.set('session', JSON.stringify({ token: 'new' }));
  answer(calls[0]); answer(calls[1]); await first; await other; await stale;
  const fresh = api.saveSelfDraft('a', {});
  await tick(); answer(calls[2]); await fresh;
  assert.equal(calls[2].options.headers.Authorization, 'Bearer new');
});
