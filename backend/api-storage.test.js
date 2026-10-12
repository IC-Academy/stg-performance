'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function runtime(mode = 'api') {
  const source = fs.readFileSync(path.join(__dirname, '../js/storage.js'), 'utf8');
  const key = source.match(/const STORAGE_KEY = '([^']+)'/)[1];
  const localValues = new Map([[key, JSON.stringify({ usuarios: [{ empleado: 'legacy-demo' }] })]]);
  const sessionValues = new Map();
  const storage = values => ({
    getItem: key => values.get(key) || null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key)
  });
  const context = { console, JSON, Date, Map, localStorage: storage(localValues), sessionStorage: storage(sessionValues) };
  context.window = context;
  vm.createContext(context);
  for (const file of ['config.js', 'data.js', 'calculations.js', 'storage.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../js', file), 'utf8'), context);
  }
  context.APP_CONFIG.mode = mode;
  return { context, localValues, key, setToken: token => sessionValues.set(context.APP_CONFIG.sessionStorageKey, JSON.stringify({ token })) };
}

test('connected storage ignores legacy demos and starts without simulated evaluations', () => {
  const r = runtime();
  const db = r.context.EDDStorage.load();
  for (const key of ['usuarios', 'colaboradores', 'lideres', 'administradores', 'jerarquias', 'evaluaciones', 'respuestas', 'objetivos', 'resultados', 'calibraciones']) {
    assert.equal(db[key].length, 0, key);
  }
  assert.ok(db.periodos.length > 0);
});

test('connected storage preserves the current session and resets on account changes', () => {
  const r = runtime();
  r.setToken('account-a');
  const a = r.context.EDDStorage.load();
  a.colaboradores.push({ empleado: 'account-a' });
  r.context.EDDStorage.persist();
  assert.equal(r.context.EDDStorage.load().colaboradores.length, 1);
  r.setToken('account-b');
  const b = r.context.EDDStorage.load();
  assert.equal(b.colaboradores.length, 0);
  assert.notEqual(a, b);
});

test('connected evaluation data is not written into persistent demo storage', () => {
  const r = runtime();
  const original = r.localValues.get(r.key);
  r.context.EDDStorage.load().respuestas.push({ valor: 4 });
  r.context.EDDStorage.persist();
  assert.equal(r.localValues.size, 1);
  assert.equal(r.localValues.get(r.key), original);
});

test('demo mode continues to support its existing persistent database', () => {
  const r = runtime('demo');
  assert.equal(r.context.EDDStorage.load().usuarios[0].empleado, 'legacy-demo');
});
