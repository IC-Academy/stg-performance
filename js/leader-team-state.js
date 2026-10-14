(function (global) {
  'use strict';

  function valueOf(value) {
    if (value && typeof value === 'object') return value.name ?? value.value ?? value.label ?? '';
    return value ?? '';
  }

  function normalized(value) {
    return String(valueOf(value)).trim().toLowerCase().replace(/[\s-]+/g, '_');
  }

  function first(item, keys) {
    for (const key of keys) {
      if (item && item[key] !== undefined && item[key] !== null && normalized(item[key])) return item[key];
    }
    return '';
  }

  function evaluationId(item) {
    return String(first(item, ['evaluationId', 'selfEvaluationId', 'autoEvaluationId', 'leaderEvaluationId', 'managerEvaluationId', 'id']));
  }

  function selfStatus(item) {
    return first(item, ['selfStatus', 'autoEvaluationStatus', 'selfState', 'processState']);
  }

  function leaderStatus(item) {
    return first(item, ['leaderStatus', 'managerStatus', 'leaderState', 'managerState']);
  }

  function selfReady(item) {
    return /^(submitted|self_submitted|completed|completad[ao]|enviad[ao]|pending_manager|pendiente_de_l[ií]der)$/.test(normalized(selfStatus(item)));
  }

  function leaderDone(item) {
    return /^(submitted|leader_submitted|completed|completad[ao]|enviad[ao]|pending_calibration|calibration|calibrated|released|closed|cerrad[ao])$/.test(normalized(leaderStatus(item)));
  }

  function needsLeaderEvaluation(item) {
    return !!(evaluationId(item) && selfReady(item) && !leaderDone(item));
  }

  const api = { valueOf, normalized, evaluationId, selfStatus, leaderStatus, selfReady, leaderDone, needsLeaderEvaluation };
  global.EDDLeaderTeamState = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
