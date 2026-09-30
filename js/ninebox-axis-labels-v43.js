/**
 * ninebox-axis-labels-v43.js
 * ---------------------------------------------------------------------------
 * Ajuste exclusivamente visual de etiquetas para la matriz 9-Box.
 * No modifica cálculos, umbrales, numeración, cuadrantes ni valores.
 *
 * Eje X (horizontal): PERFORMANCE
 * Eje Y (vertical): VALORES / ACTITUD
 * ---------------------------------------------------------------------------
 */
(function (global) {
  'use strict';

  const calc = global.EDDCalc;
  const charts = global.EDDCharts;

  if (calc && calc.CONFIG_9BOX) {
    calc.CONFIG_9BOX.ejeVertical = 'Values / Attitude';
    calc.CONFIG_9BOX.ejeHorizontal = 'Performance';
  }

  if (!charts || typeof charts.renderNineBoxIndividual !== 'function') return;

  const renderNineBoxIndividualOriginal = charts.renderNineBoxIndividual;

  charts.renderNineBoxIndividual = function (resultado) {
    return renderNineBoxIndividualOriginal(resultado)
      // El nombre del eje vertical debe leerse a la izquierda de la matriz.
      .replace(
        '<div class="ninebox-y-title">PERFORMANCE</div>',
        '<div class="ninebox-y-title">VALUES / ATTITUDE</div>'
      )
      // La etiqueta superior "ACTITUD" era confusa porque parecía corresponder
      // al eje horizontal. Se conserva el espacio para no alterar el layout.
      .replace(
        '<div class="ninebox-axis-title ninebox-axis-title-top">ATTITUDE</div>',
        '<div class="ninebox-axis-title ninebox-axis-title-top" aria-hidden="true"></div>'
      );
  };
})(window);
