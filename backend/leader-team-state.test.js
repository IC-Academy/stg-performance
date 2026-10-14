'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const state = require('../js/leader-team-state.js');

for (const employeeId of ['258832', '259080']) {
  test(`enables manager evaluation for completed self-assessment ${employeeId}`, () => {
    const item = {
      employeeId,
      evaluationId: `EV-ICA-PER-ICA-2026-01-${employeeId}`,
      selfStatus: 'Completada',
      leaderStatus: 'No iniciada',
      processState: 'submitted'
    };
    assert.equal(state.needsLeaderEvaluation(item), true);
  });
}

test('accepts backend aliases and Airtable select-shaped values', () => {
  const item = {
    selfEvaluationId: 'EV-1',
    autoEvaluationStatus: { name: 'Completada' },
    managerStatus: { name: 'No iniciada' },
    processState: { name: 'submitted' }
  };
  assert.equal(state.evaluationId(item), 'EV-1');
  assert.equal(state.needsLeaderEvaluation(item), true);
});

test('does not reopen an already submitted manager evaluation', () => {
  assert.equal(state.needsLeaderEvaluation({ evaluationId: 'EV-1', selfStatus: 'Completada', leaderStatus: 'leader_submitted' }), false);
});

test('requires a backend evaluation identifier before enabling the action', () => {
  assert.equal(state.needsLeaderEvaluation({ selfStatus: 'Completada', leaderStatus: 'No iniciada', processState: 'submitted' }), false);
});
