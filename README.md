# EDD IC Admin - Staging

Frontend de staging para la Evaluacion de Desempeno de IC Admin.

- Dominio: `stgperformance.intercon.com.mx`
- Repositorio: `IC-Academy/stg-performance`
- Fuente visual: `IC-Academy/performance`
- Backend: webhooks ICA de n8n

## Aislamiento

Este repositorio es exclusivo de staging. No modificar ni desplegar desde aqui
`IC-Academy/performance` o `performance.intercon.com.mx`.

El navegador solo conoce URLs publicas de webhook. Las credenciales de n8n,
Airtable y correo permanecen en n8n y nunca deben agregarse al repositorio.

## Workflows conectados

| Etapa | Workflow n8n | Rutas |
| --- | --- | --- |
| Auth | `Q0IRzBFT7Nv294uj` | `POST /ic-admin/auth/request-code`, `POST /ic-admin/auth/verify-code` |
| Session | `u3B2bfyLQG8q753C` | `GET /ic-admin/auth/me`, `POST /ic-admin/auth/logout` |
| Evaluations | `hY2dNLQohQjtSywR` | `GET /ic-admin/evaluations/mine`, `POST /ic-admin/evaluations/mine/initialize` |
| Self Draft + Submit Self | `CHfpfGZsWm6VdM0X` | `PUT /ic-admin/evaluations/:evaluationId/self-draft`, `POST /ic-admin/evaluations/:evaluationId/submit-self` |
| Leader Team | `oBe6PbQ96RRn2PnO` | `GET /ic-admin/leader/team` |
| Leader Draft | `QZp9ZgYiUIA7jHSG` | `PUT /ic-admin/evaluations/:evaluationId/leader-draft` |
| Submit Leader | `jLukVQ7mEqZIakUI` | `POST /ic-admin/evaluations/:evaluationId/submit-leader` |
| Calibration | `HUIM6QuC2zegotXp` | `GET /ic-admin/admin/calibration`, `PUT /ic-admin/admin/calibration/:evaluationId`, `POST /ic-admin/admin/calibration/:evaluationId/complete` |

La configuracion central vive en `js/config.js`. Las etapas posteriores a
Calibration estan deshabilitadas mediante `features.postCalibrationEnabled` y
no tienen rutas configuradas.

## Alcance pendiente

Los ocho workflows autorizados no exponen todavia rutas para detalle de una
evaluacion ni dashboard administrativo. El frontend bloquea las rutas heredadas
para evitar que staging llame workflows ajenos a ICA. Estas capacidades deben
incorporarse en workflows ICA antes de validar el ciclo visual completo.
