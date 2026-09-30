/**
 * api.js
 * ---------------------------------------------------------------------------
 * Cliente HTTP centralizado de la Plataforma EDD Inter-Con.
 *
 * TODAS las peticiones al backend (n8n) deben pasar por apiRequest() /
 * las funciones EDDApi.* de este archivo. Ninguna otra pantalla debe hacer
 * fetch() directamente: así, cuando exista el backend real, solo hay que
 * ajustar este archivo (URLs, payloads, manejo de errores) sin tocar app.js.
 *
 * El frontend nunca habla con Airtable directamente; siempre pasa por los
 * webhooks de n8n descritos abajo (ver también README, sección "Arquitectura
 * objetivo" y "Endpoints previstos").
 *
 * Esta beta prepara el cliente y los endpoints, pero no requiere que n8n
 * esté funcionando: en modo "demo" estas funciones no se invocan (auth.js y
 * el resto de la app usan EDDStorage/localStorage); en modo "api", si no hay
 * backend real detrás de apiBaseUrl, las llamadas fallarán con un
 * ApiError de tipo "network", que las pantallas deben mostrar como "Error de
 * conexión" (ver sección 12 del brief).
 * ---------------------------------------------------------------------------
 */

(function (global) {
  'use strict';

  /**
   * Error de API tipado, para que las pantallas puedan decidir el mensaje
   * (nunca mostrar el detalle técnico/trazas al usuario final; eso solo va a
   * consola, ver requerimiento 12 del brief).
   *   tipo: 'network' | 'timeout' | 'unauthorized' | 'http' | 'parse'
   */
  function ApiError(tipo, mensaje, status, detalle) {
    this.name = 'ApiError';
    this.tipo = tipo;
    this.message = mensaje;
    this.status = status || null;
    this.detalle = detalle;
  }
  ApiError.prototype = Object.create(Error.prototype);

  // Evento global que auth.js escucha para cerrar sesión automáticamente
  // cuando el backend responde 401 (token inválido o expirado).
  const EVENTO_SESION_EXPIRADA = 'edd:session-expired';

  // Cache corto + deduplicación de requests de lectura. Evita repetir los
  // mismos GET al cambiar de pestaña o cuando dos vistas piden el mismo dato
  // casi al mismo tiempo. Nunca cachea escrituras.
  const readCache = new Map();
  const inflight = new Map();
  let pendingRequests = 0;
  function setRequestActivity(delta) {
    pendingRequests = Math.max(0, pendingRequests + delta);
    try {
      if (global.document && global.document.body) {
        global.document.body.classList.toggle('edd-request-active', pendingRequests > 0);
      }
    } catch (e) { /* indicador visual no crítico */ }
  }
  function cacheKey(endpoint) { return String(endpoint || ''); }
  function clearReadCache(prefix) {
    if (!prefix) { readCache.clear(); return; }
    for (const key of readCache.keys()) if (key.indexOf(prefix) !== -1) readCache.delete(key);
  }

  function getConfig() {
    return global.APP_CONFIG || {
      apiBaseUrl: '', sessionStorageKey: 'edd_ic_admin_session', requestTimeout: 15000
    };
  }

  // Lee el token directamente de sessionStorage (y no de EDDAuth) para evitar
  // una dependencia circular entre api.js y auth.js: auth.js se construye
  // ENCIMA de api.js, no al revés.
  function getStoredToken() {
    try {
      const cfg = getConfig();
      const raw = sessionStorage.getItem(cfg.sessionStorageKey);
      if (!raw) return null;
      const sess = JSON.parse(raw);
      return (sess && sess.token) ? sess.token : null;
    } catch (e) {
      return null;
    }
  }

  /**
   * Petición centralizada a la API (n8n).
   * @param {string} endpoint - ej. '/auth/verify-code'
   * @param {object} options - { method, body, auth (bool, default true), signalExterno }
   */
  async function apiRequest(endpoint, options) {
    options = options || {};
    const cfg = getConfig();
    const method = options.method || (options.body ? 'POST' : 'GET');
    const url = (cfg.apiBaseUrl || '').replace(/\/$/, '') + endpoint;

    const headers = { 'Content-Type': 'application/json' };
    const isGet = method === 'GET';
    const cKey = cacheKey(endpoint);
    const cacheMs = isGet ? Number(options.cacheMs || 0) : 0;
    if (cacheMs > 0 && !options.forceRefresh) {
      const cached = readCache.get(cKey);
      if (cached && (Date.now() - cached.at) < cacheMs) return cached.data;
      if (inflight.has(cKey)) return inflight.get(cKey);
    }
    if (options.auth !== false) {
      const token = getStoredToken();
      if (token) headers['Authorization'] = 'Bearer ' + token;
    }

    const controller = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    const timeoutMs = options.timeoutMs || cfg.requestTimeout || 15000;
    let timeoutId = null;
    if (controller) {
      timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    }

    const execute = async () => {
      let response;
      setRequestActivity(1);
      try {
        response = await fetch(url, {
          method,
          headers,
          body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
          signal: controller ? controller.signal : undefined
        });
      } catch (err) {
        if (timeoutId) clearTimeout(timeoutId);
        setRequestActivity(-1);
        console.error('EDDApi: error de red llamando a', endpoint, err);
        const aborted = !!(controller && controller.signal && controller.signal.aborted);
        const abortLike = aborted || (err && (err.name === 'AbortError' || err.code === 20 || /aborted|abort/i.test(String(err.message || ''))));
        if (abortLike) {
          throw new ApiError('timeout', 'The request took too long. Please try again.', null, err);
        }
        throw new ApiError('network', 'Unable to connect to the server. Check your connection and try again.', null, err);
      }
      if (timeoutId) clearTimeout(timeoutId);
      setRequestActivity(-1);

      if (response.status === 401) {
        try { global.dispatchEvent(new CustomEvent(EVENTO_SESION_EXPIRADA)); } catch (e) { /* entornos sin CustomEvent */ }
        throw new ApiError('unauthorized', 'Your session expired. Please sign in again.', 401);
      }

      let data = null;
      const raw = await response.text();
      if (raw) {
        try { data = JSON.parse(raw); }
        catch (err) {
          console.error('EDDApi: respuesta no válida (no es JSON) de', endpoint, raw);
          throw new ApiError('parse', 'The server returned an unexpected response.', response.status, raw);
        }
      }

      if (!response.ok) {
        const msg = (data && data.error && data.error.message) ? data.error.message : ((data && data.message) ? data.message : 'An error occurred while processing the request.');
        console.error('EDDApi: respuesta de error', endpoint, response.status, data);
        throw new ApiError('http', msg, response.status, data);
      }

      if (cacheMs > 0) readCache.set(cKey, { at: Date.now(), data });
      return data;
    };

    if (cacheMs > 0 && !options.forceRefresh) {
      const promise = execute().finally(() => inflight.delete(cKey));
      inflight.set(cKey, promise);
      return promise;
    }
    return execute();
  }

  function endpointPath(name, params) {
    const endpoints = getConfig().apiEndpoints || {};
    const template = endpoints[name];
    if (!template) {
      throw new ApiError('unavailable', 'This stage is not connected in staging yet.', 501, { endpoint: name });
    }
    return String(template).replace(/:([A-Za-z0-9_]+)/g, function (_, key) {
      if (!params || params[key] === undefined || params[key] === null || params[key] === '') {
        throw new ApiError('configuration', 'Falta un identificador requerido para completar la solicitud.', 500, { endpoint: name, parameter: key });
      }
      return encodeURIComponent(String(params[key]));
    });
  }

  function requestEndpoint(name, params, options) {
    return apiRequest(endpointPath(name, params), options);
  }

  function unavailableEndpoint(name) {
    try { endpointPath(name); }
    catch (error) { return Promise.reject(error); }
    return Promise.reject(new ApiError('unavailable', 'This stage is not connected in staging yet.', 501, { endpoint: name }));
  }

  // Los únicos endpoints activos son los declarados en APP_CONFIG.apiEndpoints.
  // Esto evita que rutas heredadas o UUID de otros workflows se usen por error.
  const EDDApi = {
    ApiError,
    EVENTO_SESION_EXPIRADA,
    apiRequest,
    clearReadCache,

    // --- Autenticación ---------------------------------------------------
    authRequestCode(numeroEmpleado) {
      return requestEndpoint('authRequestCode', null, { method: 'POST', auth: false, body: { numeroEmpleado } });
    },
    authVerifyCode(numeroEmpleado, codigo, requestId) {
      return requestEndpoint('authVerifyCode', null, { method: 'POST', auth: false, body: { numeroEmpleado, codigo, requestId } });
    },
    authLogout() {
      return requestEndpoint('authLogout', null, { method: 'POST' });
    },
    authMe(forceRefresh) {
      return requestEndpoint('authMe', null, { method: 'GET', cacheMs: 60000, forceRefresh: !!forceRefresh, timeoutMs: 10000 });
    },

    // --- Lectura y escritura disponibles hasta Calibration ----------------
    evaluationsMine(forceRefresh) { return requestEndpoint('evaluationsMine', null, { method: 'GET', cacheMs: 15000, forceRefresh: !!forceRefresh, timeoutMs: 12000 }); },
    evaluationDetail(evaluationId, forceRefresh) { return requestEndpoint('evaluationDetail', { evaluationId }, { method: 'GET', cacheMs: 15000, forceRefresh: !!forceRefresh, timeoutMs: 15000 }); },
    leaderTeam(forceRefresh) { return requestEndpoint('leaderTeam', null, { method: 'GET', cacheMs: 20000, forceRefresh: !!forceRefresh, timeoutMs: 12000 }); },
    adminDashboard(forceRefresh) { return requestEndpoint('adminDashboard', null, { method: 'GET', cacheMs: 15000, forceRefresh: !!forceRefresh, timeoutMs: 15000 }); },
    adminCalibration(forceRefresh) { return requestEndpoint('adminCalibration', null, { method: 'GET', cacheMs: 15000, forceRefresh: !!forceRefresh, timeoutMs: 15000 }); },
    async saveAdminCalibration(evaluationId, payload) { const r=await requestEndpoint('saveAdminCalibration', { evaluationId }, { method: 'PUT', body: payload, timeoutMs: 30000 }); clearReadCache('/ic-admin/admin/calibration'); return r; },
    async completeAdminCalibration(evaluationId) { const r=await requestEndpoint('completeAdminCalibration', { evaluationId }, { method: 'POST', timeoutMs: 30000 }); clearReadCache('/ic-admin/admin/calibration'); return r; },

    // --- Etapas posteriores a Calibration: bloqueadas en staging ----------
    releaseResult() { return unavailableEndpoint('releaseResult'); },
    confirmFeedbackMeeting() { return unavailableEndpoint('confirmFeedbackMeeting'); },
    saveFeedbackAgreements() { return unavailableEndpoint('saveFeedbackAgreements'); },
    releaseFeedbackForSignature() { return unavailableEndpoint('releaseFeedbackForSignature'); },
    signFeedbackAsLeader() { return unavailableEndpoint('signFeedbackAsLeader'); },
    signFeedbackAsEmployee() { return unavailableEndpoint('signFeedbackAsEmployee'); },

    async initializeMyEvaluation() { const r=await requestEndpoint('initializeMyEvaluation', null, { method: 'POST' }); clearReadCache('/ic-admin/evaluations/'); return r; },
    async saveSelfDraft(id, payload) { const r=await requestEndpoint('saveSelfDraft', { evaluationId:id }, { method: 'PUT', body: payload, timeoutMs: 12000 }); clearReadCache('/ic-admin/evaluations/'); return r; },
    async submitSelf(id) { const r=await requestEndpoint('submitSelf', { evaluationId:id }, { method: 'POST', timeoutMs: 12000 }); clearReadCache(); return r; },
    async saveLeaderDraft(id, payload) { const r=await requestEndpoint('saveLeaderDraft', { evaluationId:id }, { method: 'PUT', body: payload, timeoutMs: 30000 }); clearReadCache(); return r; },
    async submitLeader(id) { const r=await requestEndpoint('submitLeader', { evaluationId:id }, { method: 'POST', timeoutMs: 30000 }); clearReadCache(); return r; },

    // Alias en español conservados para compatibilidad con código previo.
    evaluacionesMias() { return this.evaluationsMine(); },
    evaluacionPorId(id) { return this.evaluationDetail(id); },
    autoevaluacionGuardar(id, payload) { return this.saveSelfDraft(id, payload); },
    autoevaluacionEnviar(id) { return this.submitSelf(id); },

    // --- Líder ---------------------------------------------------------------
    liderEquipo() { return this.leaderTeam(); },
    liderEvaluaciones() { return this.leaderTeam(); },
    liderEvaluacionPorId(id) { return this.evaluationDetail(id); },
    liderEvaluacionGuardar(id, payload) { return this.saveLeaderDraft(id, payload); },
    liderEvaluacionEnviar(id) { return this.submitLeader(id); },

    // --- Administrador ---------------------------------------------------
    adminEvaluaciones() { return this.adminDashboard(); },
    adminCalibraciones() { return this.adminCalibration(); },
    adminCalibracionGuardar(id, payload) { return this.saveAdminCalibration(id, payload); },
    adminCalibracionLiberar() { return unavailableEndpoint('releaseResult'); },
    adminNineBox() { return this.adminDashboard(); },
    adminEnviarNotificacion() { return unavailableEndpoint('adminNotification'); },

    // --- Retroalimentación -------------------------------------------------
    retroalimentacionPorId() { return unavailableEndpoint('confirmFeedbackMeeting'); },
    retroalimentacionGuardar() { return unavailableEndpoint('saveFeedbackAgreements'); },
    retroalimentacionCerrar() { return unavailableEndpoint('signFeedbackAsEmployee'); },

    // --- Asistente de IA para objetivos SMART -------------------------------
    // Ver README, sección "Asistente de IA para objetivos SMART". El frontend
    // nunca llama directamente a un proveedor de IA: siempre pasa por este
    // único método, que a su vez pasa por n8n (Webhook -> validar sesión ->
    // rate limit -> prompt -> LLM -> validar JSON -> responder). No hay
    // ninguna API key de proveedor de IA en este archivo ni en ningún otro
    // archivo del frontend.
    ai: {
      /**
       * @param {string} idea - Idea breve del usuario (5–500 caracteres; la
       *   validación de longitud vive en app.js, antes de llamar aquí).
       * @param {'es'|'en'} language - Idioma en el que n8n debe responder.
       * @param {{position?: string, area?: string}} [employeeContext] -
       *   Opcional. NUNCA debe incluir correo, evaluaciones, calificaciones,
       *   comentarios privados ni información de otros empleados — ver
       *   requerimiento de privacidad del brief.
       * @returns {Promise<{success: boolean, data?: object, message?: string}>}
       */
      generateSmartObjective(idea, language, employeeContext) {
        return unavailableEndpoint('smartObjective');
      }
    }
  };

  global.EDDApi = EDDApi;
})(window);
