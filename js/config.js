/**
 * config.js
 * ---------------------------------------------------------------------------
 * Configuración central de la Plataforma EDD Inter-Con.
 *
 * ÚNICO lugar donde vive el modo de ejecución y los parámetros de conexión a
 * la futura API (n8n -> Airtable). Ningún otro archivo debe declarar su
 * propia URL de API ni su propia clave de sessionStorage: todos leen de
 * APP_CONFIG.
 *
 * Staging usa exclusivamente los webhooks ICA verificados en n8n. Las rutas
 * viven en apiEndpoints para evitar URLs dispersas en el frontend.
 *
 * Para cambiar de modo en esta demo: editar APP_CONFIG.mode más abajo, o
 * ejecutar en la consola del navegador: APP_CONFIG.mode = "api" (el cambio
 * de modo en caliente no reconstruye la sesión activa; se recomienda cerrar
 * sesión y volver a entrar después de cambiarlo).
 *
 * NUNCA colocar aquí (ni en ningún otro archivo JS del frontend):
 *   - API keys o tokens de Airtable.
 *   - Credenciales de n8n.
 *   - Contraseñas.
 * Todas las operaciones sensibles deben pasar por los webhooks de n8n, que
 * son quienes conocen las credenciales reales de Airtable (nunca el
 * navegador).
 * ---------------------------------------------------------------------------
 */

(function (global) {
  'use strict';

  const APP_CONFIG = {
    mode: 'api',

    // Staging autentica exclusivamente contra los workflows ICA. No se
    // publican usuarios, hashes ni accesos locales de demostracion.
    localDemoUsers: {},

    // URL pública de webhooks. No contiene credenciales ni secretos.
    apiBaseUrl: 'https://jmejiaromero.app.n8n.cloud/webhook',

    // Único mapa de rutas habilitadas en staging. Los valores null son
    // bloqueos deliberados: esos endpoints no pertenecen a los 8 workflows
    // ICA autorizados para esta etapa.
    apiEndpoints: {
      authRequestCode: '/ic-admin/auth/request-code',
      authVerifyCode: '/ic-admin/auth/verify-code',
      authMe: '/ic-admin/auth/me',
      authLogout: '/ic-admin/auth/logout',
      evaluationsMine: '/ic-admin/evaluations/mine',
      initializeMyEvaluation: '/ic-admin/evaluations/mine/initialize',
      saveSelfDraft: '/f65f8103-b53c-4b4d-9006-d3d299efa261/ic-admin/evaluations/:evaluationId/self-draft',
      submitSelf: '/32c614ca-8442-4935-b9f2-580ffe6a93bc/ic-admin/evaluations/:evaluationId/submit-self',
      leaderTeam: '/ic-admin/leader/team',
      saveLeaderDraft: '/d83afc7a-be9a-425d-bdd5-e53ddedb7f83/ic-admin/evaluations/:evaluationId/leader-draft',
      submitLeader: '/59acff4b-d56b-43e4-a14d-d6c4d7e3104a/ic-admin/evaluations/:evaluationId/submit-leader',
      adminCalibration: '/ic-admin/admin/calibration',
      saveAdminCalibration: '/a21f9ae0-316c-4462-8c85-0ae9ab2c8b2c/ic-admin/admin/calibration/:evaluationId',
      completeAdminCalibration: '/cba96b1a-2228-4749-8d60-4ed43b30e64a/ic-admin/admin/calibration/:evaluationId/complete',
      evaluationDetail: null,
      adminDashboard: null,
      releaseResult: null,
      confirmFeedbackMeeting: null,
      saveFeedbackAgreements: null,
      releaseFeedbackForSignature: null,
      signFeedbackAsLeader: null,
      signFeedbackAsEmployee: null,
      smartObjective: null
    },

    features: {
      postCalibrationEnabled: false
    },

    // Clave usada en sessionStorage para guardar la sesión (token + usuario).
    // Ver auth.js. Se usa sessionStorage y no localStorage a propósito: el
    // token no debe sobrevivir a que el usuario cierre la pestaña/navegador.
    // Nueva clave para invalidar inmediatamente cualquier sesión creada por
    // los accesos demo anteriores.
    sessionStorageKey: 'edd_ic_admin_staging_session_v1',

    // Tiempo máximo (ms) que api.js espera una respuesta antes de abortar la
    // petición y mostrar "Error de conexión".
    requestTimeout: 15000,

    // Vigencia informativa del código temporal (minutos). La validación
    // definitiva de vigencia la debe hacer siempre el backend (n8n).
    codeValidityMinutes: 10,

    // Vigencia de la sesión/token en segundos (8 horas), usada por auth.js
    // tanto en modo demo como como valor por defecto si el backend no manda
    // "expiresIn".
    defaultSessionSeconds: 28800,
    readApiEnabled: true,
    testCaptureEnabled: false,
    writeApiEnabled: true
  };

  global.APP_CONFIG = APP_CONFIG;
})(window);
