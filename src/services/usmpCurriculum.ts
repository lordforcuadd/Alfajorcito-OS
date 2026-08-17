import type { CurriculumCourse } from '../types';

export const USMP_PSYCHOLOGY_CURRICULUM: CurriculumCourse[] = [
  // ─── VIII CICLO (8VO CICLO - ACTUAL) ───
  {
    code: 'PSI-801',
    name: 'Seminario de Investigación en Psicología II (Proyecto de Tesis)',
    cycle: 8,
    credits: 4,
    type: 'INVESTIGACION',
    prerequisites: ['Seminario de Investigación en Psicología I', 'Psicometría Aplicada'],
    area: 'INVESTIGACION',
    description: 'Elaboración, sustentación y dictamen del Proyecto de Tesis para la obtención del Título Profesional de Licenciada en Psicología por la USMP. Delimitación del problema en el contexto peruano, formulación de objetivos e hipótesis, fundamentación teórica bajo normas APA 7, diseño metodológico cuantitativo/cualitativo, operacionalización de variables y selección de instrumentos psicométricos con validez de constructo y fiabilidad demostrada (Alfa de Cronbach y Coeficiente Omega de McDonald).',
    competencies: [
      'Formular proyectos de investigación científica con rigor metodológico y pertinencia en la realidad peruana.',
      'Evaluar propiedades psicométricas de instrumentos de medición (análisis factorial confirmatorio, Omega de McDonald).',
      'Redactar el marco teórico y estado del arte siguiendo las directrices de estilo APA 7ma Edición y pautas editoriales de Liberabit (USMP).'
    ]
  },
  {
    code: 'PSI-802',
    name: 'Psicología Clínica y de la Salud',
    cycle: 8,
    credits: 4,
    type: 'OBLIGATORIO',
    prerequisites: ['Psicopatología II', 'Evaluación y Diagnóstico Clínico'],
    area: 'CLINICA',
    description: 'Modelos teóricos y procedimientos aplicados de intervención clínica y de la salud. Formulación clínica cognitivo-conductual (TCC), terapias contextuales de tercera generación (ACT, Mindfulness), análisis funcional de la conducta (E-O-R-C), diseño de programas preventivo-promocionales y manejo del estrés y enfermedades crónicas.',
    competencies: [
      'Elaborar el análisis funcional y la formulación clínica de casos en adolescentes y adultos.',
      'Diseñar y ejecutar programas de intervención psicoterapéutica basados en la evidencia empírica.',
      'Aplicar estrategias de promoción de la salud mental y prevención en entornos hospitalarios y comunitarios.'
    ]
  },
  {
    code: 'PSI-803',
    name: 'Técnicas de Intervención Grupal y Psicoterapia',
    cycle: 8,
    credits: 3,
    type: 'OBLIGATORIO',
    prerequisites: ['Técnicas de Entrevista y Observación Psicológica'],
    area: 'CLINICA',
    description: 'Fundamentos teóricos y dinámicas aplicadas de los procesos grupales. Estructuración de talleres psicoterapéuticos y psicoeducativos, manejo de la resistencia grupal, técnicas de psicodrama, reestructuración cognitiva grupal y liderazgo terapéutico en contextos de salud mental.',
    competencies: [
      'Planificar y conducir sesiones de intervención y psicoterapia grupal estructurada.',
      'Monitorear la cohesión y dinámica vincular dentro de los grupos terapéuticos.',
      'Evaluar el impacto de las intervenciones grupales mediante indicadores psicométricos pre-post test.'
    ]
  },
  {
    code: 'PSI-804',
    name: 'Gestión Estratégica del Talento Humano',
    cycle: 8,
    credits: 3,
    type: 'OBLIGATORIO',
    prerequisites: ['Psicología Organizacional'],
    area: 'SALUD_PUBLICA',
    description: 'Gestión del capital humano en organizaciones peruanas: evaluación del desempeño por competencias, clima y cultura organizacional, diagnóstico de síndrome de burnout, bienestar laboral y diseño de programas de desarrollo del talento.',
    competencies: [
      'Diseñar procesos de selección y evaluación del desempeño basados en perfiles por competencias.',
      'Diagnosticar el clima laboral y factores de riesgo psicosocial en el trabajo.',
      'Implementar programas de bienestar integral alineados a los objetivos estratégicos institucionales.'
    ]
  },
  {
    code: 'PSI-805',
    name: 'Ética y Deontología Profesional en Psicología',
    cycle: 8,
    credits: 3,
    type: 'OBLIGATORIO',
    prerequisites: ['Psicología Social'],
    area: 'DEONTOLOGIA',
    description: 'Análisis de la normatividad ética y legal que rige el ejercicio profesional del psicólogo en el Perú. Ley del Trabajo del Psicólogo N° 28369, Código de Ética del Colegio de Psicólogos del Perú (CPsP), resguardo del secreto profesional, consentimiento y asentimiento informado, bioética en investigación y comités de ética de la USMP.',
    competencies: [
      'Aplicar los principios éticos y legales en la evaluación, investigación e intervención psicológica.',
      'Elaborar protocolos rigurosos de consentimiento informado garantizando la autonomía del consultante.',
      'Resolver dilemas bioéticos complejos en la práctica clínica y la investigación con seres humanos.'
    ]
  },
  {
    code: 'PSI-806',
    name: 'Diagnóstico e Intervención Psicoeducativa',
    cycle: 8,
    credits: 3,
    type: 'ELECTIVO',
    prerequisites: ['Psicología Educativa'],
    area: 'SALUD_PUBLICA',
    description: 'Evaluación y abordaje de necesidades educativas especiales, dificultades específicas de aprendizaje, orientación vocacional y convivencia escolar (prevención del acoso y violencia escolar) en instituciones educativas peruanas.',
    competencies: [
      'Realizar evaluaciones psicoeducativas integrales y adaptaciones curriculares individuales.',
      'Diseñar programas de orientación vocacional y desarrollo de habilidades socioemocionales.',
      'Intervenir en la convivencia escolar promoviendo ambientes de aprendizaje seguros e inclusivos.'
    ]
  },

  // ─── IX CICLO (9NO CICLO - INTERNADO I) ───
  {
    code: 'PSI-901',
    name: 'Prácticas Preprofesionales I (Internado I)',
    cycle: 9,
    credits: 14,
    type: 'INTERNADO',
    prerequisites: ['Aprobación de todos los cursos hasta el VIII Ciclo'],
    area: 'CLINICA',
    description: 'Inmersión práctica continua y supervisada en sedes de convenio oficial de la FCCTP - USMP: Hospitales Generales y Especializados (MINSA/EsSalud), Centros de Salud Mental Comunitaria (CSMC), Clínicas, Colegios o Empresas. Ejecución de evaluación diagnóstica, consejería, psicoterapia individual/grupal y programas de intervención comunitaria.',
    competencies: [
      'Desempeñarse con solvencia profesional y rigor ético en sedes hospitalarias, educativas o empresariales.',
      'Conducir procesos completos de evaluación e intervención clínica bajo supervisión docente continua.',
      'Elaborar historias clínicas, notas de evolución y memorias de práctica preprofesional.'
    ]
  },
  {
    code: 'INV-902',
    name: 'Seminario de Tesis I (Ejecución y Análisis de Datos)',
    cycle: 9,
    credits: 4,
    type: 'INVESTIGACION',
    prerequisites: ['Seminario de Investigación en Psicología II (Proyecto de Tesis)'],
    area: 'INVESTIGACION',
    description: 'Fase de recolección de datos y procesamiento estadístico del proyecto de tesis aprobado por la FCCTP USMP. Aplicación de instrumentos psicométricos a la muestra, depuración de base de datos, análisis descriptivo y contrastación de hipótesis mediante estadística inferencial (SPSS, Jamovi o R). Redacción del capítulo de Resultados bajo normas APA 7.',
    competencies: [
      'Recolectar y tabular datos empíricos resguardando la confidencialidad y rigor metodológico.',
      'Ejecutar análisis estadísticos avanzados pertinentes a los objetivos e hipótesis de investigación.',
      'Interpretar tablas y figuras estadísticas bajo las normas de presentación de la APA 7ma Edición.'
    ]
  },
  {
    code: 'PSI-903',
    name: 'Supervisión de Prácticas Preprofesionales I',
    cycle: 9,
    credits: 3,
    type: 'OBLIGATORIO',
    prerequisites: ['Psicología Clínica y de la Salud'],
    area: 'CLINICA',
    description: 'Ateneo clínico y discusión académica de los casos atendidos durante el Internado I. Presentación estructurada del motivo de consulta, historia psicobiográfica, conceptualización cognitivo-conductual/sistémica, plan de intervención y análisis de la alianza terapéutica con docentes de la USMP.',
    competencies: [
      'Presentar y fundamentar casos clínicos con rigor conceptual y respeto a la confidencialidad del paciente.',
      'Recibir y aplicar retroalimentación de supervisores clínicos para optimizar las intervenciones.',
      'Monitorear indicadores de evolución y adherencia terapéutica en los consultantes.'
    ]
  },

  // ─── X CICLO (10MO CICLO - INTERNADO II & SUSTENTACIÓN) ───
  {
    code: 'PSI-1001',
    name: 'Prácticas Preprofesionales II (Internado II)',
    cycle: 10,
    credits: 14,
    type: 'INTERNADO',
    prerequisites: ['Prácticas Preprofesionales I (Internado I)'],
    area: 'CLINICA',
    description: 'Consolidación de la práctica preprofesional terminal. Implementación del Programa de Intervención Psicológica en la sede de internado, atención de casos de alta complejidad, presentación de la Memoria Final de Prácticas y sustentación ante el jurado calificador de la FCCTP USMP.',
    competencies: [
      'Liderar programas de intervención psicológica con impacto medible en la población atendida.',
      'Consolidar el rol del psicólogo como agente de salud en equipos multidisciplinarios.',
      'Sustentar la memoria de internado con solvencia técnica, clínica y deontológica.'
    ]
  },
  {
    code: 'INV-1002',
    name: 'Seminario de Tesis II (Redacción Final, Dictamen y Sustentación)',
    cycle: 10,
    credits: 4,
    type: 'INVESTIGACION',
    prerequisites: ['Seminario de Tesis I (Ejecución y Análisis de Datos)'],
    area: 'INVESTIGACION',
    description: 'Redacción final del informe de investigación para la obtención del Título Profesional de Licenciada en Psicología por la Universidad de San Martín de Porres. Discusión crítica de hallazgos contrastados con la literatura nacional e internacional, conclusiones, implicancias prácticas y limitaciones. Dictamen aprobatorio y sustentación pública.',
    competencies: [
      'Elaborar una Discusión científica profunda que contraste los resultados propios con la literatura indexada.',
      'Formular conclusiones sólidas y recomendaciones viables para la intervención en salud mental.',
      'Defender y sustentar públicamente la tesis ante el jurado calificador de la FCCTP USMP.'
    ]
  },
  {
    code: 'PSI-1003',
    name: 'Supervisión de Prácticas Preprofesionales II & Deontología Aplicada',
    cycle: 10,
    credits: 3,
    type: 'OBLIGATORIO',
    prerequisites: ['Supervisión de Prácticas Preprofesionales I'],
    area: 'CLINICA',
    description: 'Supervisión terminal y análisis del proceso de cierre, alta terapéutica y seguimiento de casos. Preparación del informe final de prácticas preprofesionales y trámites para la colegiatura en el Colegio de Psicólogos del Perú (CPsP).',
    competencies: [
      'Gestionar de manera adecuada los procesos de alta terapéutica y seguimiento post-intervención.',
      'Sustentar el estudio de caso clínico con fundamentos diagnósticos y psicoterapéuticos sólidos.',
      'Interiorizar los procedimientos de colegiatura y habilitación profesional en el Perú.'
    ]
  }
];

// Re-export alias for compatibility
export const UNMSM_PSYCHOLOGY_CURRICULUM = USMP_PSYCHOLOGY_CURRICULUM;
