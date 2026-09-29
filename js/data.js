/**
 * data.js
 * ---------------------------------------------------------------------------
 * Catálogo maestro de la Evaluación del Desempeño Administrativo (EDD)
 * Fuente: EDD_Inter-Con_Rev4_ponderacion_40_60.docx (FOR-CAP-003 Rev. 4)
 *
 * Contiene: escala de evaluación, competencias y conductas observables por
 * sección, ponderaciones, datos de usuarios de demostración y un generador
 * determinista de respuestas simuladas para poblar el localStorage la
 * primera vez que se abre la demo.
 * ---------------------------------------------------------------------------
 */

(function (global) {
  'use strict';

  // ===========================================================================
  // ESCALA DE EVALUACIÓN (documento oficial, tabla "ESCALA DE EVALUACIÓN")
  // ===========================================================================
  const ESCALA = [
    { valor: 5, descripcion: 'Excede significativamente las expectativas. Es un referente para otros.' },
    { valor: 4, descripcion: 'Supera las expectativas de manera constante.' },
    { valor: 3, descripcion: 'Cumple con lo esperado para su puesto.' },
    { valor: 2, descripcion: 'Cumple parcialmente; requiere mejorar.' },
    { valor: 1, descripcion: 'No cumple con las expectativas del puesto.' },
    { valor: 'N/A', descripcion: 'No aplica o no cuento con elementos suficientes para evaluarlo.' }
  ];

  // ===========================================================================
  // SECCIONES Y COMPETENCIAS
  // Ponderación oficial Rev. 4: 40% Valores/Actitud + 30% Técnica Funcional + 30% Objetivos.
  // ===========================================================================
  const SECCIONES_META = {
    actitud: { titulo: 'A. Valores y Actitud', peso: 40, eje: 'ACTITUD', descripcion: 'Evalúa la vivencia diaria de los valores ESPÍRITU de Inter-Con y la forma en que el colaborador se conduce con las personas. ESPÍRITU significa Excelencia, Servicio, Pasión, Integridad, Respeto, Innovación, Trabajo en equipo y Unidad.' },
    habilidades: { titulo: 'B. Conocimientos y Habilidades Técnicas del Puesto', peso: 30, eje: 'DESEMPEÑO', descripcion: 'Evalúa el dominio técnico del puesto, el uso de procesos y herramientas del área y la forma en que el colaborador organiza y controla su trabajo.' },
    conocimientos: { titulo: 'Sección interna no utilizada', peso: 0, eje: 'DESEMPEÑO', descripcion: '' },
    objetivos: { titulo: 'C. Cumplimiento de Objetivos', peso: 30, eje: 'DESEMPEÑO', descripcion: 'Registra hasta cinco objetivos acordados al inicio del periodo, con su meta o indicador, resultado alcanzado, porcentaje de cumplimiento y calificación.' }
  };

  const COMPETENCIAS = {
    actitud: [
      {
        id: 'A1', nombre: 'Compromiso Organizacional (Integridad y Excelencia)', peso: 8,
        conductas: [
          "Acts in accordance with Inter-Con's ESPÍRITU values.",
          'Demonstrates responsibility and professional ethics.',
          "Actively contributes to the company's objectives.",
          'Is punctual, consistent, and fulfills commitments.'
        ]
      },
      {
        id: 'A2', nombre: 'Actitud de Servicio (Pasión y Respeto)', peso: 8,
        conductas: [
          'Responds promptly to requests from internal and external clients.',
          'Demonstrates willingness and passion to support others.',
          'Acts with professionalism, respect, and empathy.'
        ]
      },
      {
        id: 'A3', nombre: 'Trabajo en Equipo, Unión y Desarrollo de Otros', peso: 8,
        conductas: [
          'Collaborates across areas to achieve shared objectives.',
          'Maintains respectful working relationships and helps resolve differences constructively.',
          'Shares knowledge and provides support when others need it.',
          'Fosters a learning and collaborative environment.'
        ]
      },
      {
        id: 'A4', nombre: 'Comunicación Efectiva y Apertura', peso: 8,
        conductas: [
          'Communicates clearly, respectfully, and promptly.',
          'Listens actively and considers different points of view.',
          'Shares relevant information to help others perform their work.',
          'Receives feedback with a willingness to improve.'
        ]
      },
      {
        id: 'A5', nombre: 'Adaptabilidad, Iniciativa y Compromiso con la Sustentabilidad', peso: 8,
        conductas: [
          'Adapts positively to change and new priorities.',
          'Proposes ideas to improve processes and takes initiative when necessary.',
          'Uses assigned material and energy resources responsibly.',
          'Promotes environmental care and resource-saving practices in the workplace.'
        ]
      }
    ],
    habilidades: [
      {
        id: 'B1', nombre: 'Dominio del Puesto', peso: 6,
        conductas: [
          'Correctly applies the technical and regulatory knowledge required for the role.',
          'Solves problems related to their responsibilities.',
          'Keeps technical knowledge and role-specific tools up to date.'
        ]
      },
      {
        id: 'B2', nombre: 'Procesos y Herramientas de Trabajo', peso: 6,
        conductas: [
          'Understands and correctly applies the processes, policies, and procedures of their area.',
          'Efficiently uses the tools and systems applicable to the role: Salesforce, Paycom, Concur, Excel, SharePoint, Planner, PowerPoint, IQ-iconiq, or others.',
          'Uses the tools reference guide to determine the proficiency level applicable to the role.'
        ]
      },
      {
        id: 'B3', nombre: 'Orientación a Resultados y Calidad', peso: 6,
        conductas: [
          'Consistently meets established goals and standards.',
          'Maintains high standards of quality and accuracy in their work.',
          'Proposes actions to improve productivity and efficiency.'
        ]
      },
      {
        id: 'B4', nombre: 'Planeación y Organización', peso: 6,
        conductas: [
          'Organizes activities and priorities effectively.',
          'Meets established deadlines.',
          'Anticipates risks and establishes preventive actions.'
        ]
      },
      {
        id: 'B5', nombre: 'Seguimiento, Control y Uso de Recursos', peso: 6,
        conductas: [
          'Follows up on activities and commitments in a timely manner.',
          'Complies with internal policies, procedures, and assigned documentation requirements.',
          'Manages assigned resources appropriately.'
        ]
      }
    ],
    conocimientos: []
  };


  // ===========================================================================
  // NIVELES DE DESEMPEÑO (referencia visual, la fuente de verdad numérica
  // vive en calculations.js -> NIVELES_DESEMPENO)
  // ===========================================================================
  const REFERENCIA_NIVELES = [
    { rango: '90 – 100', nivel: 'Sobresaliente' },
    { rango: '80 – 89', nivel: 'Excede las expectativas' },
    { rango: '60 – 79', nivel: 'Cumple las expectativas' },
    { rango: '40 – 59', nivel: 'Cumple parcialmente; requiere plan de mejora' },
    { rango: 'Menor a 40', nivel: 'No cumple las expectativas del puesto' }
  ];

  // ===========================================================================
  // ESTADOS DEL PROCESO
  // ===========================================================================
  const ESTADOS = {
    NO_INICIADA: 'No iniciada',
    EN_PROGRESO: 'En progreso',
    COMPLETADA: 'Completada',
    PENDIENTE_LIDER: 'Pendiente de líder',
    PENDIENTE_CALIBRACION: 'Pendiente de calibración',
    CALIBRADA: 'Calibrada',
    RETRO_PENDIENTE: 'Retroalimentación pendiente',
    CERRADA: 'Cerrada'
  };

  // ===========================================================================
  // PERIODO ACTIVO
  // ===========================================================================
  const PERIODOS = [
    {
      id: 'PER-2026-01',
      nombre: 'Evaluación de Desempeño 2026',
      fechaInicio: '2026-06-01',
      fechaFin: '2026-08-31',
      fechaLimiteAutoevaluacion: '2026-07-15',
      fechaLimiteLider: '2026-07-31',
      activo: true,
      faseRetroalimentacionHabilitada: {} // se llena por colaboradorId cuando DO habilita
    }
  ];

  // ===========================================================================
  // USUARIOS / COLABORADORES / LÍDERES DE DEMOSTRACIÓN
  // ===========================================================================
  const LIDERES = [
    { empleado: '20001', nombre: 'Carlos Martínez', puesto: 'Gerente de Desarrollo Organizacional', area: 'Desarrollo Organizacional', ciudad: 'Ciudad de México', correoCorporativo: 'carlos.martinez@intercon.com.mx', estatusEmpleado: 'Activo', correoValidado: true, ultimaActualizacion: '2026-07-20' },
    { empleado: '20002', nombre: 'Ana Torres', puesto: 'Gerente de Finanzas', area: 'Finanzas', ciudad: 'Guadalajara', correoCorporativo: 'ana.torres@intercon.com.mx', estatusEmpleado: 'Activo', correoValidado: true, ultimaActualizacion: '2026-07-20' },
    { empleado: '20003', nombre: 'Roberto Díaz', puesto: 'Gerente de Operaciones', area: 'Operaciones', ciudad: 'Monterrey', correoCorporativo: 'roberto.diaz@intercon.com.mx', estatusEmpleado: 'Activo', correoValidado: true, ultimaActualizacion: '2026-07-20' },
    { empleado: '20004', nombre: 'Sofía López', puesto: 'Gerente de Tecnología', area: 'Tecnología', ciudad: 'Ciudad de México', correoCorporativo: 'sofia.lopez@intercon.com.mx', estatusEmpleado: 'Activo', correoValidado: true, ultimaActualizacion: '2026-07-20' },
    { empleado: '20005', nombre: 'Miguel Ángel Ruiz', puesto: 'Gerente Comercial', area: 'Comercial', ciudad: 'Puebla', correoCorporativo: 'miguel.ruiz@intercon.com.mx', estatusEmpleado: 'Activo', correoValidado: true, ultimaActualizacion: '2026-07-20' },
    { empleado: '267465', nombre: 'Gonzalo Rafael Peña Ortiz', puesto: 'Bill Specialist', area: 'Strategic Operations', ciudad: '', correoCorporativo: 'gpena@icsecurity.com', estatusEmpleado: 'Activo', correoValidado: true, ultimaActualizacion: '2026-09-24', registroPrueba: true },
    { empleado: '260901', nombre: 'Alejandro Herrera Leal', puesto: 'Supply Chain Senior Specialist III', area: 'Supply Chain', ciudad: '', correoCorporativo: 'alherrera@icsecurity.com', estatusEmpleado: 'Activo', correoValidado: true, ultimaActualizacion: '2026-09-24', registroPrueba: true },
    { empleado: '266885', nombre: 'Sara Margarita Santos Ochoa', puesto: 'Project Operations Manager', area: 'Data Analytics', ciudad: '', correoCorporativo: 'ssantos@icsecurity.com', estatusEmpleado: 'Activo', correoValidado: true, ultimaActualizacion: '2026-09-24', registroPrueba: true },
    { empleado: '990001', nombre: 'Monserrat Cayon', puesto: 'UAT Full-Cycle Reviewer', area: 'IC Admin', ciudad: '', correoCorporativo: '', estatusEmpleado: 'Activo', correoValidado: true, ultimaActualizacion: '2026-09-25', registroPrueba: true },
    { empleado: '990002', nombre: 'Gabriel Sabogal', puesto: 'VP Corporate LATAM / Managing Director México', area: 'Dirección General', ciudad: '', correoCorporativo: '', estatusEmpleado: 'Activo', correoValidado: true, ultimaActualizacion: '2026-09-29', registroPrueba: true }
  ];

  const ADMINISTRADORES = [
    { empleado: '10001', nombre: 'Gabriel Sabogal', puesto: 'VP Corporate LATAM / Managing Director México', area: 'Dirección General', correoCorporativo: '', estatusEmpleado: 'Activo', correoValidado: true, ultimaActualizacion: '2026-09-22' },
    { empleado: '266885', nombre: 'Sara Margarita Santos Ochoa', puesto: 'Project Operations Manager', area: 'Data Analytics', correoCorporativo: 'ssantos@icsecurity.com', estatusEmpleado: 'Activo', correoValidado: true, ultimaActualizacion: '2026-09-24', registroPrueba: true },
    { empleado: '990001', nombre: 'Monserrat Cayon', puesto: 'UAT Full-Cycle Reviewer', area: 'IC Admin', correoCorporativo: '', estatusEmpleado: 'Activo', correoValidado: true, ultimaActualizacion: '2026-09-25', registroPrueba: true },
    { empleado: '990002', nombre: 'Gabriel Sabogal', puesto: 'VP Corporate LATAM / Managing Director México', area: 'Dirección General', correoCorporativo: '', estatusEmpleado: 'Activo', correoValidado: true, ultimaActualizacion: '2026-09-29', registroPrueba: true }
  ];

  // perfilObjetivo: valores de referencia (1-5) usados por el generador de respuestas
  // simuladas para poder mostrar distintos cuadrantes 9-box en la demo.
  const COLABORADORES = [
    { empleado: '10001', nombre: 'Laura Hernández', puesto: 'Analista de Desarrollo Organizacional', area: 'Desarrollo Organizacional', liderId: '20001', antiguedad: '2 años 4 meses', ciudad: 'Ciudad de México', direccion: 'Dirección Corporativa', estadoDemo: 'no_iniciada', correoCorporativo: 'laura.hernandez@intercon.com.mx', estatusEmpleado: 'Activo', correoValidado: true, ultimaActualizacion: '2026-07-20' },
    { empleado: '10002', nombre: 'Jorge Ramírez', puesto: 'Coordinador de Nómina', area: 'Desarrollo Organizacional', liderId: '20001', antiguedad: '1 año 2 meses', ciudad: 'Ciudad de México', direccion: 'Dirección Corporativa', estadoDemo: 'pendiente_lider', perfilObjetivo: { actitud: 4.2, habilidades: 3.8, conocimientos: 4.0, objetivos: 4.0 }, correoCorporativo: 'jorge.ramirez@intercon.com.mx', estatusEmpleado: 'Activo', correoValidado: true, ultimaActualizacion: '2026-07-20' },
    { empleado: '10003', nombre: 'Fernanda Gómez', puesto: 'Analista Contable', area: 'Finanzas', liderId: '20002', antiguedad: '3 años', ciudad: 'Guadalajara', direccion: 'Dirección Administrativa', estadoDemo: 'pendiente_calibracion', perfilObjetivo: { actitud: 4.6, habilidades: 4.4, conocimientos: 4.5, objetivos: 4.3 }, perfilObjetivoLider: { actitud: 4.3, habilidades: 4.0, conocimientos: 4.2, objetivos: 4.0 }, correoCorporativo: 'fernanda.gomez@intercon.com.mx', estatusEmpleado: 'Activo', correoValidado: true, ultimaActualizacion: '2026-07-20' },
    { empleado: '10004', nombre: 'Diego Morales', puesto: 'Analista de Tesorería', area: 'Finanzas', liderId: '20002', antiguedad: '8 meses', ciudad: 'Guadalajara', direccion: 'Dirección Administrativa', estadoDemo: 'retro_pendiente', perfilObjetivo: { actitud: 4.0, habilidades: 3.2, conocimientos: 3.0, objetivos: 3.3 }, perfilObjetivoLider: { actitud: 4.3, habilidades: 2.2, conocimientos: 2.3, objetivos: 2.0 }, correoCorporativo: 'diego.morales@intercon.com.mx', estatusEmpleado: 'Activo', correoValidado: true, ultimaActualizacion: '2026-07-20' },
    { empleado: '10005', nombre: 'Patricia Reyes', puesto: 'Supervisora de Zona', area: 'Operaciones', liderId: '20003', antiguedad: '5 años', ciudad: 'Monterrey', direccion: 'Dirección de Operaciones', estadoDemo: 'cerrada', perfilObjetivo: { actitud: 3.7, habilidades: 4.7, conocimientos: 4.6, objetivos: 4.7 }, perfilObjetivoLider: { actitud: 3.5, habilidades: 4.6, conocimientos: 4.5, objetivos: 4.6 }, correoCorporativo: 'patricia.reyes@intercon.com.mx', estatusEmpleado: 'Activo', correoValidado: true, ultimaActualizacion: '2026-07-20' },
    { empleado: '10006', nombre: 'Héctor Vargas', puesto: 'Coordinador Operativo', area: 'Operaciones', liderId: '20003', antiguedad: '1 año', ciudad: 'Monterrey', direccion: 'Dirección de Operaciones', estadoDemo: 'no_iniciada', correoCorporativo: 'hector.vargas@intercon.com.mx', estatusEmpleado: 'Activo', correoValidado: true, ultimaActualizacion: '2026-07-20' },
    { empleado: '10007', nombre: 'Daniela Cruz', puesto: 'Analista de Sistemas', area: 'Tecnología', liderId: '20004', antiguedad: '2 años', ciudad: 'Ciudad de México', direccion: 'Dirección de Tecnología', estadoDemo: 'en_progreso', correoCorporativo: 'daniela.cruz@intercon.com.mx', estatusEmpleado: 'Activo', correoValidado: true, ultimaActualizacion: '2026-07-20' },
    { empleado: '10008', nombre: 'Andrés Ortiz', puesto: 'Soporte Técnico Sr.', area: 'Tecnología', liderId: '20004', antiguedad: '5 meses', ciudad: 'Ciudad de México', direccion: 'Dirección de Tecnología', estadoDemo: 'cerrada', perfilObjetivo: { actitud: 1.8, habilidades: 2.2, conocimientos: 2.0, objetivos: 1.9 }, perfilObjetivoLider: { actitud: 1.6, habilidades: 1.9, conocimientos: 1.8, objetivos: 1.7 }, correoCorporativo: 'andres.ortiz@intercon.com.mx', estatusEmpleado: 'Activo', correoValidado: false, ultimaActualizacion: '2026-07-18' },
    // Caso "brecha significativa": la colaboradora se autopercibe con actitud sobresaliente,
    // pero el líder documenta una actitud deficiente pese a un desempeño técnico sólido
    // (Habilidades/Conocimientos/Objetivos alineados). Cuadrante resultante: Agua (7).
    { empleado: '10009', nombre: 'Valeria Sánchez', puesto: 'Ejecutiva de Cuenta', area: 'Comercial', liderId: '20005', antiguedad: '4 años', ciudad: 'Puebla', direccion: 'Dirección Comercial', estadoDemo: 'pendiente_calibracion', perfilObjetivo: { actitud: 4.5, habilidades: 4.4, conocimientos: 4.2, objetivos: 4.5 }, perfilObjetivoLider: { actitud: 1.8, habilidades: 4.3, conocimientos: 4.3, objetivos: 4.5 }, correoCorporativo: 'valeria.sanchez@intercon.com.mx', estatusEmpleado: 'Activo', correoValidado: true, ultimaActualizacion: '2026-07-20' },
    { empleado: '10010', nombre: 'Ricardo Paredes', puesto: 'Coordinador Comercial', area: 'Comercial', liderId: '20005', antiguedad: '1 año 6 meses', ciudad: 'Puebla', direccion: 'Dirección Comercial', estadoDemo: 'cerrada', perfilObjetivo: { actitud: 4.4, habilidades: 3.6, conocimientos: 3.5, objetivos: 3.4 }, perfilObjetivoLider: { actitud: 4.2, habilidades: 3.4, conocimientos: 3.3, objetivos: 3.2 }, correoCorporativo: 'ricardo.paredes@intercon.com.mx', estatusEmpleado: 'Activo', correoValidado: true, ultimaActualizacion: '2026-07-20' },
    // Caso nuevo de beta 3, aditivo: colaborador SIN líder asignado en el Excel
    // maestro (ver requerimiento 18 del brief — "Sin líder asignado"). No
    // afecta ningún escenario previo: su evaluación sigue "no_iniciada" y no
    // participa en flujos de líder/comparación/calibración.
    { empleado: '10011', nombre: 'Mario Castillo', puesto: 'Analista Junior de Operaciones', area: 'Operaciones', liderId: null, antiguedad: '3 meses', ciudad: 'Monterrey', direccion: 'Dirección de Operaciones', estadoDemo: 'no_iniciada', correoCorporativo: null, estatusEmpleado: 'Activo', correoValidado: false, ultimaActualizacion: '2026-07-25' },
    { empleado: '267476', nombre: 'José Antonio García Santiago', puesto: 'Officer Success Representative', area: 'Officer Success Department', liderId: '990002', antiguedad: 'Demo', ciudad: '', direccion: 'IC Admin', estadoDemo: 'pendiente_lider', perfilObjetivo: { actitud: 4.1, habilidades: 3.9, conocimientos: 4.0, objetivos: 4.0 }, correoCorporativo: 'josgarcia@icsecurity.com', estatusEmpleado: 'Activo', correoValidado: true, ultimaActualizacion: '2026-09-24', registroPrueba: true },
    { empleado: '257270', nombre: 'Deysi Salas Figueroa', puesto: 'Employee Assistance Team Lead', area: 'Employee Assistance / People Operations', liderId: '990002', antiguedad: 'Demo', ciudad: '', direccion: 'IC Admin', estadoDemo: 'retro_pendiente', perfilObjetivo: { actitud: 4.3, habilidades: 4.1, conocimientos: 4.2, objetivos: 4.1 }, perfilObjetivoLider: { actitud: 4.2, habilidades: 4.0, conocimientos: 4.1, objetivos: 4.0 }, correoCorporativo: 'dsalas@icsecurity.com', estatusEmpleado: 'Activo', correoValidado: true, ultimaActualizacion: '2026-09-24', registroPrueba: true },
    { empleado: '267465', nombre: 'Gonzalo Rafael Peña Ortiz', puesto: 'Bill Specialist', area: 'Strategic Operations', liderId: '990002', antiguedad: 'Demo', ciudad: '', direccion: 'IC Admin', estadoDemo: 'no_iniciada', correoCorporativo: 'gpena@icsecurity.com', estatusEmpleado: 'Activo', correoValidado: true, ultimaActualizacion: '2026-09-24', registroPrueba: true },
    { empleado: '260901', nombre: 'Alejandro Herrera Leal', puesto: 'Supply Chain Senior Specialist III', area: 'Supply Chain', liderId: null, antiguedad: 'Demo', ciudad: '', direccion: 'IC Admin', estadoDemo: 'no_iniciada', correoCorporativo: 'alherrera@icsecurity.com', estatusEmpleado: 'Activo', correoValidado: true, ultimaActualizacion: '2026-09-24', registroPrueba: true },
    { empleado: '266885', nombre: 'Sara Margarita Santos Ochoa', puesto: 'Project Operations Manager', area: 'Data Analytics', liderId: null, antiguedad: 'Demo', ciudad: '', direccion: 'IC Admin', estadoDemo: 'no_iniciada', correoCorporativo: 'ssantos@icsecurity.com', estatusEmpleado: 'Activo', correoValidado: true, ultimaActualizacion: '2026-09-24', registroPrueba: true },
    { empleado: '990001', nombre: 'Monserrat Cayon', puesto: 'UAT Full-Cycle Reviewer', area: 'IC Admin', liderId: '990001', antiguedad: 'Demo', ciudad: '', direccion: 'IC Admin', estadoDemo: 'no_iniciada', correoCorporativo: '', estatusEmpleado: 'Activo', correoValidado: true, ultimaActualizacion: '2026-09-25', registroPrueba: true },
    { empleado: '990002', nombre: 'Gabriel Sabogal', puesto: 'VP Corporate LATAM / Managing Director México', area: 'Dirección General', liderId: null, antiguedad: 'Demo', ciudad: '', direccion: 'IC Admin', estadoDemo: 'no_iniciada', correoCorporativo: '', estatusEmpleado: 'Activo', correoValidado: true, ultimaActualizacion: '2026-09-29', registroPrueba: true }
  ];

  // ===========================================================================
  // JERARQUÍAS (tabla "Asignaciones" del Excel maestro / Airtable, ver brief
  // sección 8). Se deriva de COLABORADORES.liderId para no duplicar la fuente
  // de verdad de la relación líder-colaborador (que sigue viviendo ahí, tal
  // como en beta 1/2). Esta tabla es solo la proyección con la forma exacta
  // que tendrá el registro real de Airtable/Excel.
  // ===========================================================================
  const JERARQUIAS = COLABORADORES.map((c, idx) => ({
    idAsignacion: 'ASG-2026-' + String(idx + 1).padStart(4, '0'),
    numeroEmpleado: c.empleado,
    numeroLider: c.liderId || null,
    periodo: 'EDD-2026',
    fechaInicio: '2026-08-01',
    fechaFin: null,
    asignacionActiva: true,
    tipoAsignacion: 'Líder directo'
  }));

  // ===========================================================================
  // GENERADOR DETERMINISTA DE RESPUESTAS SIMULADAS (para poblar la demo)
  // ===========================================================================

  // PRNG determinista (mulberry32) para que la demo sea reproducible.
  function crearRng(semilla) {
    let a = semilla >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function claseHash(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) { h = (h * 31 + str.charCodeAt(i)) | 0; }
    return h >>> 0;
  }

  /**
   * Genera respuestas simuladas para un conjunto de competencias, con
   * variación alrededor de un valor objetivo, e incluye ocasionalmente N/A
   * para poder demostrar la exclusión de N/A del cálculo.
   */
  function generarRespuestas(competencias, valorObjetivo, semillaTexto, incluirNA) {
    const rng = crearRng(claseHash(semillaTexto));
    return competencias.map((c, idx) => {
      if (incluirNA && idx === competencias.length - 1 && rng() < 0.3) {
        return { competenciaId: c.id, valor: 'N/A', comentario: 'Sin elementos suficientes para evaluar en este periodo.' };
      }
      const variacion = (rng() - 0.5) * 1.2;
      let v = Math.round(valorObjetivo + variacion);
      v = Math.max(1, Math.min(5, v));
      return { competenciaId: c.id, valor: v, comentario: '' };
    });
  }

  const OBJETIVOS_MUESTRA = [
    ['Reducir el tiempo de respuesta a solicitudes internas en un 15%.', 'Se redujo el tiempo de respuesta en 18%, superando la meta.'],
    ['Actualizar el 100% de los expedientes del área durante el trimestre.', 'Se actualizó el 95% de los expedientes; quedaron pendientes 2 casos especiales.'],
    ['Implementar un tablero de seguimiento mensual para el equipo.', 'Tablero implementado y en uso desde el segundo mes del periodo.'],
    ['Capacitar al equipo en el nuevo procedimiento operativo.', 'Se capacitó al 100% del equipo con evaluación de conocimientos aprobatoria.'],
    ['Disminuir incidencias reportadas por el cliente interno.', 'Las incidencias bajaron de 12 a 6 en el periodo evaluado.']
  ];

  function generarObjetivos(valorObjetivo, semillaTexto, cantidad) {
    const rng = crearRng(claseHash(semillaTexto + '-obj'));
    const n = cantidad || (3 + Math.floor(rng() * 3)); // 3 a 5 objetivos
    const objetivos = [];
    for (let i = 0; i < Math.min(n, 5); i++) {
      const variacion = (rng() - 0.5) * 1.2;
      let v = Math.round(valorObjetivo + variacion);
      v = Math.max(1, Math.min(5, v));
      objetivos.push({
        descripcion: OBJETIVOS_MUESTRA[i][0],
        resultado: OBJETIVOS_MUESTRA[i][1],
        calificacion: v
      });
    }
    return objetivos;
  }

  // ===========================================================================
  // EXPORTS
  // ===========================================================================
  global.EDDData = {
    ESCALA,
    SECCIONES_META,
    COMPETENCIAS,
    REFERENCIA_NIVELES,
    ESTADOS,
    PERIODOS,
    LIDERES,
    ADMINISTRADORES,
    COLABORADORES,
    JERARQUIAS,
    generarRespuestas,
    generarObjetivos,
    crearRng,
    claseHash
  };
})(window);
