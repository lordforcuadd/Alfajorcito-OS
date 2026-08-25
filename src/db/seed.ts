import { db } from './index';
import {
  type Course,
  type Work,
  type Source,
  type Idea,
  type Paraphrase,
  type Citation,
  type Note,
  type Concept,
  type Task,
  type InquiryToTeacher,
  type SettingRecord,
  type AISettings,
  type ObsidianSettings,
  DEFAULT_USER_PROFILE
} from '../types';

// Helper to seed complete, realistic 3-year academic history for USMP Psychology student
export function getSeedData(now = Date.now()) {
  const dayMs = 86400000;

  // =========================================================================
  // 1. CURSOS: 3 AÑOS DE HISTORIAL ACADÉMICO (FCCTP - USMP)
  // =========================================================================
  const courses: Course[] = [
    // --- 2024-I (4to Ciclo - Histórico) ---
    {
      id: 'course-neuro-usmp',
      code: 'PSI-401',
      name: 'Neuropsicología y Neuroanatomía Funcional',
      period: '2024-I (4to Ciclo)',
      color: '#B0BEC5',
      teacherName: 'Dra. Carmen Rosa Delgado',
      teacherEmail: 'cdelgado@usmp.pe',
      createdAt: now - dayMs * 850,
      updatedAt: now - dayMs * 750,
      isArchived: true
    },
    {
      id: 'course-psicopat-1-usmp',
      code: 'PSI-402',
      name: 'Psicopatología I: Adultos y Semiología Psiquiátrica',
      period: '2024-I (4to Ciclo)',
      color: '#CFD8DC',
      teacherName: 'Dr. Pedro Morales',
      teacherEmail: 'pmorales@usmp.pe',
      createdAt: now - dayMs * 850,
      updatedAt: now - dayMs * 750,
      isArchived: true
    },

    // --- 2024-II (5to Ciclo - Histórico) ---
    {
      id: 'course-psicometria-usmp',
      code: 'PSI-501',
      name: 'Psicometría General y Construcción de Pruebas',
      period: '2024-II (5to Ciclo)',
      color: '#BCAAA4',
      teacherName: 'Dr. César Merino-Soto',
      teacherEmail: 'cmerinos@usmp.pe',
      createdAt: now - dayMs * 680,
      updatedAt: now - dayMs * 580,
      isArchived: true
    },
    {
      id: 'course-metodologia-usmp',
      code: 'PSI-503',
      name: 'Metodología de la Investigación Cuantitativa',
      period: '2024-II (5to Ciclo)',
      color: '#D7CCC8',
      teacherName: 'Dr. Sergio Domínguez-Lara',
      teacherEmail: 'sdominguezl@usmp.pe',
      createdAt: now - dayMs * 680,
      updatedAt: now - dayMs * 580,
      isArchived: true
    },

    // --- 2025-I (6to Ciclo - Histórico) ---
    {
      id: 'course-eval-clinica-usmp',
      code: 'PSI-601',
      name: 'Evaluación y Diagnóstico Psicológico Clínico',
      period: '2025-I (6to Ciclo)',
      color: '#C5CAE9',
      teacherName: 'Dr. Manuel Fernández Arata',
      teacherEmail: 'mfernandeza@usmp.pe',
      createdAt: now - dayMs * 500,
      updatedAt: now - dayMs * 400,
      isArchived: true
    },
    {
      id: 'course-tesis-1-usmp',
      code: 'PSI-603',
      name: 'Seminario de Investigación en Psicología I',
      period: '2025-I (6to Ciclo)',
      color: '#E1BEE7',
      teacherName: 'Dra. Marcia Calderón De la Cruz',
      teacherEmail: 'mcalderond@usmp.pe',
      createdAt: now - dayMs * 500,
      updatedAt: now - dayMs * 400,
      isArchived: true
    },

    // --- 2025-II (7mo Ciclo - Histórico) ---
    {
      id: 'course-psicoterapia-3g-usmp',
      code: 'PSI-701',
      name: 'Modelos Psicoterapéuticos y Terapias Contextuales (3ra Gen)',
      period: '2025-II (7mo Ciclo)',
      color: '#C8E6C9',
      teacherName: 'Mg. Elena Valdivia Morales',
      teacherEmail: 'evaldiviam@usmp.pe',
      createdAt: now - dayMs * 320,
      updatedAt: now - dayMs * 220,
      isArchived: true
    },
    {
      id: 'course-org-trabajo-usmp',
      code: 'PSI-702',
      name: 'Psicología Organizacional y del Trabajo',
      period: '2025-II (7mo Ciclo)',
      color: '#FFE0B2',
      teacherName: 'Mg. Carlos Alarcón Quispe',
      teacherEmail: 'calarconq@usmp.pe',
      createdAt: now - dayMs * 320,
      updatedAt: now - dayMs * 220,
      isArchived: true
    },

    // --- 2026-II (8vo Ciclo - ACTUAL ACTIVO) ---
    {
      id: 'course-tesis-2-usmp',
      code: 'PSI-801',
      name: 'Seminario de Investigación en Psicología II (Proyecto de Tesis)',
      period: '2026-II (8vo Ciclo)',
      color: '#D98880',
      teacherName: 'Dra. Marcia Calderón De la Cruz',
      teacherEmail: 'mcalderond@usmp.pe',
      syllabusUrl: 'https://fcctp.usmp.edu.pe/silabo/psi-801',
      createdAt: now - dayMs * 30,
      updatedAt: now - dayMs * 1,
      isArchived: false
    },
    {
      id: 'course-salud-usmp',
      code: 'PSI-802',
      name: 'Psicología Clínica y de la Salud',
      period: '2026-II (8vo Ciclo)',
      color: '#B39DDB',
      teacherName: 'Dr. Manuel Fernández Arata',
      teacherEmail: 'mfernandeza@usmp.pe',
      syllabusUrl: 'https://fcctp.usmp.edu.pe/silabo/psi-802',
      createdAt: now - dayMs * 30,
      updatedAt: now - dayMs * 1,
      isArchived: false
    },
    {
      id: 'course-grupal-usmp',
      code: 'PSI-803',
      name: 'Técnicas de Intervención Grupal y Psicoterapia',
      period: '2026-II (8vo Ciclo)',
      color: '#80CBC4',
      teacherName: 'Mg. Elena Valdivia Morales',
      teacherEmail: 'evaldiviam@usmp.pe',
      syllabusUrl: 'https://fcctp.usmp.edu.pe/silabo/psi-803',
      createdAt: now - dayMs * 30,
      updatedAt: now - dayMs * 1,
      isArchived: false
    },
    {
      id: 'course-talento-usmp',
      code: 'PSI-804',
      name: 'Gestión Estratégica del Talento Humano',
      period: '2026-II (8vo Ciclo)',
      color: '#FFCC80',
      teacherName: 'Mg. Carlos Alarcón Quispe',
      teacherEmail: 'calarconq@usmp.pe',
      syllabusUrl: 'https://fcctp.usmp.edu.pe/silabo/psi-804',
      createdAt: now - dayMs * 30,
      updatedAt: now - dayMs * 1,
      isArchived: false
    },
    {
      id: 'course-etica-usmp',
      code: 'PSI-805',
      name: 'Ética y Deontología Profesional en Psicología',
      period: '2026-II (8vo Ciclo)',
      color: '#EF9A9A',
      teacherName: 'Dr. Oswaldo Orellana Manrique',
      teacherEmail: 'oorellanam@usmp.pe',
      syllabusUrl: 'https://fcctp.usmp.edu.pe/silabo/psi-805',
      createdAt: now - dayMs * 30,
      updatedAt: now - dayMs * 1,
      isArchived: false
    },
    {
      id: 'course-educativa-usmp',
      code: 'PSI-806',
      name: 'Diagnóstico e Intervención Psicoeducativa',
      period: '2026-II (8vo Ciclo)',
      color: '#90CAF9',
      teacherName: 'Mg. Patricia Flores Rivas',
      teacherEmail: 'pfloresr@usmp.pe',
      createdAt: now - dayMs * 30,
      updatedAt: now - dayMs * 1,
      isArchived: false
    },

    // --- 2027-I (9no Ciclo - Próximo Semestre) ---
    {
      id: 'course-internado-1-usmp',
      code: 'PSI-901',
      name: 'Prácticas Preprofesionales I (Internado I)',
      period: '2027-I (9no Ciclo - Próximo Semestre)',
      color: '#A5D6A7',
      teacherName: 'Coordinación de Internado FCCTP - USMP',
      teacherEmail: 'internado_psicologia@usmp.pe',
      createdAt: now - dayMs * 15,
      updatedAt: now - dayMs * 15,
      isArchived: false
    }
  ];

  // =========================================================================
  // 2. TRABAJOS Y TESIS: HISTÓRICO Y ACTUAL (11 Trabajos)
  // =========================================================================
  const works: Work[] = [
    // 1. Tesis Principal (8vo Ciclo)
    {
      id: 'work-proyecto-tesis-regulacion',
      courseId: 'course-tesis-2-usmp',
      title: 'Proyecto de Tesis: Regulación Emocional, Autoeficacia Académica y Sintomatología Ansiosa en Universitarios de Lima Metropolitana',
      type: 'TESIS',
      status: 'INVESTIGACION',
      deadline: now + dayMs * 7,
      citationStyle: 'APA_7',
      maxSourceAgeYears: 5,
      minRequiredSources: 8,
      formatRequirements: 'Formato oficial de la Escuela Profesional de Psicología FCCTP - USMP. Estilo APA 7ma Edición estricta. Estructura: Planteamiento del Problema, Objetivos, Hipótesis, Marco Teórico (Antecedentes Nacionales e Internacionales 2021-2026 en revistas Scopus/SciELO como Liberabit), Método (Diseño no experimental correlacional-explicativo, muestra n=380, instrumentos DERS, EAG y GAD-7 con Omega de McDonald).',
      rawInstructions: 'Elaborar y sustentar el Proyecto de Tesis de Licenciatura en Psicología. La investigación debe fundamentarse en artículos de revistas indexadas en Scopus, Web of Science, Scielo o Redalyc de los últimos 5 años (2021-2026), priorizando la literatura de evaluación psicológica y psicometría peruana. Es obligatorio reportar la consistencia interna mediante el coeficiente Omega de McDonald.',
      instructionAnalysis: {
        explicitRequirements: [
          'Enfoque cuantitativo correlacional o explicativo en estudiantes universitarios de Lima',
          'Mínimo 8 fuentes científicas indexadas de los últimos 5 años (2021-2026)',
          'Estilo de citación obligatorio: Normas APA 7ma Edición',
          'Instrumentos psicométricos validados en Perú (DERS, EAG, GAD-7) reportando Omega de McDonald',
          'Consentimiento informado alineado al Código de Ética del Colegio de Psicólogos del Perú (CPsP)'
        ],
        aiInferences: [
          'Articular el Modelo Procesual de Regulación Emocional de James Gross (2015) con la Teoría Social Cognitiva de Albert Bandura (1997)',
          'Utilizar la adaptación limeña de la escala DERS de Gargurevich & Soenens (2018) y los baremos de Merino-Soto & Calderón-De la Cruz (2022)',
          'Planificar análisis multivariado y ecuaciones estructurales preliminares en Jamovi o R'
        ],
        deliverableFormat: 'Documento en PDF institucional con carátula oficial de la FCCTP - USMP y borrador editable en Google Docs',
        wordCountTarget: 5000,
        citationStyleExpected: 'APA_7',
        maxSourceAgeYears: 5,
        detectedQuestionsForTeacher: [
          '¿Se permite incluir la obra seminal de Gross (2015) y Bandura (1997) como fuente teórica fundacional?'
        ]
      },
      draftContent: `# Proyecto de Tesis: Regulación Emocional, Autoeficacia Académica y Sintomatología Ansiosa en Estudiantes de la Universidad de San Martín de Porres (FCCTP)

## 1. Planteamiento del Problema
La vida universitaria en los ciclos superiores demanda constantes exigencias cognitivas, metodológicas y emocionales. De acuerdo con Gross (2015), la regulación emocional comprende los procesos mediante los cuales los individuos modulan qué emociones experimentan, cuándo las experimentan y cómo las expresan en situaciones de estrés académico.

En el contexto universitario peruano, investigaciones publicadas en revistas indexadas como Liberabit (Merino-Soto & Calderón-De la Cruz, 2022; Villarreal-Zegarra et al., 2021) reportan que las dificultades en la reevaluación cognitiva y el predominio de la supresión emocional se asocian de forma estadísticamente significativa con niveles elevados de ansiedad generalizada. Asimismo, la autoeficacia académica percibida ejerce un efecto protector frente al agotamiento psicológico (Bandura, 1997).

## 2. Marco Teórico
### 2.1. Modelo Procesual de la Regulación Emocional (Gross)
El modelo procesual de James Gross postula que las estrategias regulatorias pueden desplegarse en distintos momentos del proceso generativo de la emoción: estrategias focalizadas en el antecedente (selección de la situación, modificación situacional, despliegue atencional y reevaluación cognitiva) y estrategias focalizadas en la respuesta (supresión expresiva).

### 2.2. Propiedades Psicométricas en Población Universitaria Peruana
Para la evaluación de las variables en estudio se recurre a la Escala de Dificultades de Regulación Emocional (DERS) adaptada en Lima Metropolitana por Gargurevich y Soenens (2018), así como las directrices psicométricas de consistencia interna basadas en el coeficiente Omega de McDonald recomendadas por Domínguez-Lara y Merino-Soto (2019).
`,
      googleDocUrl: 'https://docs.google.com/document/d/1USMP_FCCTP_Psicologia_Tesis',
      canvaUrl: 'https://www.canva.com/design/DAFpsicoUSMP',
      createdAt: now - dayMs * 25,
      updatedAt: now - dayMs * 1,
      isArchived: false
    },

    // 2. Caso Clínico (8vo Ciclo)
    {
      id: 'work-caso-clinico-salud',
      courseId: 'course-salud-usmp',
      title: 'Estudio de Caso Clínico: Formulación Cognitivo-Conductual e Intervención en Trastorno de Ansiedad Social',
      type: 'INFORME',
      status: 'REDACTANDO',
      deadline: now + dayMs * 4,
      citationStyle: 'APA_7',
      maxSourceAgeYears: 5,
      minRequiredSources: 6,
      formatRequirements: 'Informe de Caso Clínico: Anamnesis psicobiográfica, Análisis Funcional (E-O-R-C), Diagrama de Conceptualización Cognitiva de Beck, Diagnóstico DSM-5-TR / CIE-11, Plan de Tratamiento (12 sesiones con reestructuración cognitiva y experimentos conductuales) y Evaluación de Alianza Terapéutica.',
      rawInstructions: 'Presentar un caso clínico estructurado aplicando el modelo de Terapia Cognitivo-Conductual de Beck. Incluir autoregistros de pensamientos automáticos, flecha descendente, reestructuración cognitiva y evaluación de la alianza terapéutica.',
      draftContent: `# Informe Clínico: Caso de Trastorno de Ansiedad Social en Joven Universitario

## 1. Datos de Filiación y Motivo de Consulta
Consultante de 21 años, estudiante de pregrado en Lima Metropolitana. Refiere intenso malestar, palpitaciones, sudoración y miedo constante a la evaluación negativa por parte de sus compañeros y docentes durante las exposiciones académicas.

## 2. Conceptualización Cognitiva según Beck
Se identifican esquemas nucleares de incompetencia personal ("No soy lo suficientemente capaz"), creencias intermedias condicionales ("Si expongo en clase, todos notarán mis dudas y se burlarán") y pensamientos automáticos distorsionados de catastrofización y lectura de mente.
`,
      createdAt: now - dayMs * 18,
      updatedAt: now - dayMs * 1,
      isArchived: false
    },

    // 3. Intervención Grupal (8vo Ciclo)
    {
      id: 'work-informe-psicodiagnostico',
      courseId: 'course-grupal-usmp',
      title: 'Diseño de Programa de Intervención Grupal en Manejo del Estrés y Regulación Afectiva',
      type: 'INFORME',
      status: 'INVESTIGACION',
      deadline: now + dayMs * 10,
      citationStyle: 'APA_7',
      maxSourceAgeYears: 5,
      minRequiredSources: 5,
      formatRequirements: 'Estructura de Programa Grupal: Justificación teórica, Objetivos, Matriz de 8 sesiones estructuradas (dinámicas vivenciales, reestructuración cognitiva y mindfulness) y Sistema de Evaluación Pre-Post test.',
      rawInstructions: 'Diseñar un programa de intervención psicoterapéutica grupal para población juvenil universitaria. Fundamentar cada dinámica con literatura empírica indexada en APA 7.',
      createdAt: now - dayMs * 12,
      updatedAt: now - dayMs * 1,
      isArchived: false
    },

    // 4. Talento Humano (8vo Ciclo)
    {
      id: 'work-talento-competencias',
      courseId: 'course-talento-usmp',
      title: 'Plan Estratégico de Evaluación del Desempeño y Clima Laboral por Competencias STAR',
      type: 'ENSAYO',
      status: 'PLANIFICACION',
      deadline: now + dayMs * 14,
      citationStyle: 'APA_7',
      maxSourceAgeYears: 5,
      minRequiredSources: 5,
      formatRequirements: 'Propuesta de gestión del talento humano para organizaciones de salud en Lima Metropolitana. Incluye diccionario de competencias, diseño de Assessment Center y entrevistas por incidentes críticos STAR.',
      rawInstructions: 'Diseñar un plan integral de evaluación y desarrollo del talento humano fundamentado en modelos contemporáneos de psicología organizacional.',
      createdAt: now - dayMs * 8,
      updatedAt: now - dayMs * 1,
      isArchived: false
    },

    // 5. Psicoeducativa (8vo Ciclo)
    {
      id: 'work-psicoeducativa-dificultades',
      courseId: 'course-educativa-usmp',
      title: 'Informe Psicopedagógico e Intervención en Dificultades de Comprensión Lectora y Autoeficacia',
      type: 'MONOGRAFIA',
      status: 'REDACTANDO',
      deadline: now + dayMs * 18,
      citationStyle: 'APA_7',
      maxSourceAgeYears: 5,
      minRequiredSources: 6,
      formatRequirements: 'Batería psicopedagógica de evaluación (PROLEC-SE-R), perfil de fortalezas y debilidades, programa de adaptaciones curriculares y plan de orientación vocacional.',
      rawInstructions: 'Elaborar un informe psicopedagógico integral con estudio de caso simulado y propuesta de intervención escolar.',
      createdAt: now - dayMs * 10,
      updatedAt: now - dayMs * 1,
      isArchived: false
    },

    // 6. Deontología (8vo Ciclo)
    {
      id: 'work-ensayo-deontologia-usmp',
      courseId: 'course-etica-usmp',
      title: 'Ensayo Crítico: El Secreto Profesional y Dilemas Éticos en la Práctica Clínica Hospitalaria',
      type: 'ENSAYO',
      status: 'EN_REVISION',
      deadline: now + dayMs * 22,
      citationStyle: 'APA_7',
      maxSourceAgeYears: 5,
      minRequiredSources: 5,
      formatRequirements: 'Ensayo reflexivo y normativo basado en la Ley 28369 (Trabajo del Psicólogo) y Código de Ética del Colegio de Psicólogos del Perú (CPsP).',
      rawInstructions: 'Analizar casos hipotéticos de ruptura de secreto profesional bajo principio de daño inminente.',
      createdAt: now - dayMs * 14,
      updatedAt: now - dayMs * 2,
      isArchived: false
    },

    // --- Trabajos Históricos Entregados de Ciclos 4 a 7 (3 Años de Uso) ---
    {
      id: 'work-act-terapia-contextual',
      courseId: 'course-psicoterapia-3g-usmp',
      title: 'Ensayo Clínico: Terapia de Aceptación y Compromiso (ACT) aplicada a Pacientes con Dolor Crónico',
      type: 'ENSAYO',
      status: 'ENTREGADO',
      deadline: now - dayMs * 250,
      citationStyle: 'APA_7',
      maxSourceAgeYears: 5,
      minRequiredSources: 6,
      formatRequirements: 'Ensayo teórico-clínico de 3500 palabras con matriz de defusión cognitiva y valores.',
      rawInstructions: 'Describir los 6 procesos del hexaflex de Hayes y su evidencia en medicina conductual.',
      createdAt: now - dayMs * 280,
      updatedAt: now - dayMs * 250,
      isArchived: false
    },
    {
      id: 'work-evaluacion-clinica-caso',
      courseId: 'course-eval-clinica-usmp',
      title: 'Informe Integral de Evaluación Psicológica con Batería WAIS-IV y Millon MCMI-IV',
      type: 'INFORME',
      status: 'ENTREGADO',
      deadline: now - dayMs * 420,
      citationStyle: 'APA_7',
      maxSourceAgeYears: 5,
      minRequiredSources: 5,
      formatRequirements: 'Informe psicodiagnóstico completo con análisis intraindividual de índices de WAIS-IV y perfiles de personalidad MCMI-IV.',
      rawInstructions: 'Integrar resultados psicométricos cuantitativos con la entrevista clínica anamnésica.',
      createdAt: now - dayMs * 450,
      updatedAt: now - dayMs * 420,
      isArchived: false
    },
    {
      id: 'work-construccion-escala',
      courseId: 'course-psicometria-usmp',
      title: 'Proyecto Psicométrico: Construcción y Evidencias de Validez de una Escala de Burnout Académico',
      type: 'MONOGRAFIA',
      status: 'ENTREGADO',
      deadline: now - dayMs * 600,
      citationStyle: 'APA_7',
      maxSourceAgeYears: 5,
      minRequiredSources: 7,
      formatRequirements: 'Reporte psicométrico con Análisis Factorial Confirmatorio (CFA), Alfa de Cronbach, Omega de McDonald y Coeficiente V de Aiken con 8 jueces expertos.',
      rawInstructions: 'Diseñar reactivos tipo Likert, realizar validación de contenido por jueces y prueba piloto con n=100.',
      createdAt: now - dayMs * 640,
      updatedAt: now - dayMs * 600,
      isArchived: false
    },
    {
      id: 'work-meta-analisis-neuro',
      courseId: 'course-neuro-usmp',
      title: 'Monografía: Correlatos Neurobiológicos de la Memoria de Trabajo y Corteza Prefrontal Dorsolateral',
      type: 'MONOGRAFIA',
      status: 'ENTREGADO',
      deadline: now - dayMs * 780,
      citationStyle: 'APA_7',
      maxSourceAgeYears: 5,
      minRequiredSources: 8,
      formatRequirements: 'Monografía con revisión anatómica y estudios de neuroimagen funcional (fMRI).',
      rawInstructions: 'Revisar literatura sobre el bucle fonológico y agenda visomapeadora de Baddeley articulado a áreas de Brodmann 9 y 46.',
      createdAt: now - dayMs * 810,
      updatedAt: now - dayMs * 780,
      isArchived: false
    },
    {
      id: 'work-clima-organizacional-pasado',
      courseId: 'course-org-trabajo-usmp',
      title: 'Diagnóstico de Clima y Cultura Organizacional en Empresa de Servicios',
      type: 'INFORME',
      status: 'ARCHIVADO',
      deadline: now - dayMs * 230,
      citationStyle: 'APA_7',
      createdAt: now - dayMs * 260,
      updatedAt: now - dayMs * 230,
      isArchived: true
    }
  ];

  // =========================================================================
  // 3. FUENTES CIENTÍFICAS REALES INDEXADAS (8 Fuentes Reales)
  // =========================================================================
  const sources: Source[] = [
    {
      id: 'src-gross-2015-emotion',
      workIds: ['work-proyecto-tesis-regulacion', 'work-informe-psicodiagnostico'],
      title: 'Emotion regulation: Current status and future prospects',
      authors: [{ firstName: 'James J.', lastName: 'Gross' }],
      year: 2015,
      type: 'JOURNAL_ARTICLE',
      publication: 'Psychological Inquiry',
      volume: '26',
      issue: '1',
      pages: '1-26',
      doi: '10.1080/1047840X.2014.940781',
      abstract: 'The process model of emotion regulation distinguishes between strategies that act before emotional responses are generated (antecedent-focused) and strategies that act after (response-focused).',
      accessedAt: now - dayMs * 24,
      verificationStatus: 'VERIFIED',
      verificationProvider: 'CROSSREF',
      keywords: ['emotion regulation', 'cognitive reappraisal', 'expressive suppression', 'process model'],
      createdAt: now - dayMs * 24,
      updatedAt: now - dayMs * 1
    },
    {
      id: 'src-gargurevich-soenens-2018-ders',
      workIds: ['work-proyecto-tesis-regulacion'],
      title: 'Psychometric properties of the Difficulties in Emotion Regulation Scale (DERS) among Peruvian university students',
      authors: [
        { firstName: 'Natalia', lastName: 'Gargurevich' },
        { firstName: 'Bart', lastName: 'Soenens' }
      ],
      year: 2018,
      type: 'JOURNAL_ARTICLE',
      publication: 'Revista Latinoamericana de Psicología',
      volume: '50',
      issue: '2',
      pages: '112-124',
      doi: '10.14349/rlp.2018.v50.n2.5',
      abstract: 'Validation study of the 36-item DERS in a sample of 650 university students from Lima, Peru. Confirmatory factor analysis confirmed the six-factor structure with adequate internal consistency.',
      accessedAt: now - dayMs * 22,
      verificationStatus: 'VERIFIED',
      verificationProvider: 'CROSSREF',
      keywords: ['DERS', 'peruvian validation', 'emotion regulation', 'psychometrics', 'lima'],
      createdAt: now - dayMs * 22,
      updatedAt: now - dayMs * 1
    },
    {
      id: 'src-dominguez-merino-2019-omega',
      workIds: ['work-proyecto-tesis-regulacion', 'work-construccion-escala'],
      title: '¿Por qué es importante el coeficiente Omega en la investigación psicológica peruana?',
      authors: [
        { firstName: 'Sergio', lastName: 'Domínguez-Lara' },
        { firstName: 'César', lastName: 'Merino-Soto' }
      ],
      year: 2019,
      type: 'JOURNAL_ARTICLE',
      publication: 'Liberabit: Revista Peruana de Psicología',
      volume: '25',
      issue: '2',
      pages: '295-302',
      doi: '10.24265/liberabit.2019.v25n2.09',
      abstract: 'Discusión metodológica sobre las limitaciones del Alfa de Cronbach y las ventajas analíticas del Coeficiente Omega de McDonald en matrices de correlaciones policóricas.',
      accessedAt: now - dayMs * 20,
      verificationStatus: 'VERIFIED',
      verificationProvider: 'DOAJ',
      keywords: ['omega mcdonald', 'alfa cronbach', 'psicometria peru', 'liberabit', 'usmp'],
      createdAt: now - dayMs * 20,
      updatedAt: now - dayMs * 1
    },
    {
      id: 'src-beck-2011-cbt',
      workIds: ['work-caso-clinico-salud', 'work-informe-psicodiagnostico'],
      title: 'Cognitive behavior therapy: Basics and beyond',
      authors: [{ firstName: 'Judith S.', lastName: 'Beck' }],
      year: 2011,
      type: 'BOOK',
      publication: 'Guilford Press',
      abstract: 'Comprehensive manual on cognitive conceptualization, automatic thoughts, core beliefs, downward arrow technique, and behavioral experiments.',
      accessedAt: now - dayMs * 18,
      verificationStatus: 'VERIFIED',
      verificationProvider: 'OPENALEX',
      keywords: ['CBT', 'beck', 'cognitive restructuring', 'case conceptualization'],
      createdAt: now - dayMs * 18,
      updatedAt: now - dayMs * 1
    },
    {
      id: 'src-barlow-2018-unified',
      workIds: ['work-proyecto-tesis-regulacion', 'work-caso-clinico-salud'],
      title: 'Unified Protocol for Transdiagnostic Treatment of Emotional Disorders: Therapist Guide',
      authors: [
        { firstName: 'David H.', lastName: 'Barlow' },
        { firstName: 'Shannon Sauer', lastName: 'Zavala' }
      ],
      year: 2018,
      type: 'BOOK',
      publication: 'Oxford University Press',
      doi: '10.1093/med-psych/9780190685973.001.0001',
      abstract: 'Transdiagnostic emotional regulation principles targeting core neuroticism and avoidance behavior across anxiety and depressive disorders.',
      accessedAt: now - dayMs * 16,
      verificationStatus: 'VERIFIED',
      verificationProvider: 'CROSSREF',
      keywords: ['unified protocol', 'transdiagnostic', 'barlow', 'emotional disorders'],
      createdAt: now - dayMs * 16,
      updatedAt: now - dayMs * 1
    },
    {
      id: 'src-bandura-1997-selfefficacy',
      workIds: ['work-proyecto-tesis-regulacion', 'work-psicoeducativa-dificultades'],
      title: 'Self-efficacy: The exercise of control',
      authors: [{ firstName: 'Albert', lastName: 'Bandura' }],
      year: 1997,
      type: 'BOOK',
      publication: 'W. H. Freeman and Company',
      abstract: 'Foundational text defining perceived self-efficacy and its cognitive, motivational, affective, and selection processes.',
      accessedAt: now - dayMs * 25,
      verificationStatus: 'VERIFIED',
      verificationProvider: 'OPENALEX',
      keywords: ['self-efficacy', 'bandura', 'social cognitive theory'],
      createdAt: now - dayMs * 25,
      updatedAt: now - dayMs * 1
    },
    {
      id: 'src-hayes-2019-act',
      workIds: ['work-act-terapia-contextual', 'work-informe-psicodiagnostico'],
      title: 'Acceptance and Commitment Therapy: Toward a unified model of behavior change',
      authors: [
        { firstName: 'Steven C.', lastName: 'Hayes' },
        { firstName: 'Stefan G.', lastName: 'Hofmann' }
      ],
      year: 2019,
      type: 'JOURNAL_ARTICLE',
      publication: 'Current Opinion in Psychology',
      volume: '2',
      pages: '1-6',
      doi: '10.1016/j.copsyc.2014.11.006',
      abstract: 'Overview of psychological flexibility, cognitive defusion, acceptance, mindfulness, and values-guided action.',
      accessedAt: now - dayMs * 280,
      verificationStatus: 'VERIFIED',
      verificationProvider: 'CROSSREF',
      keywords: ['ACT', 'psychological flexibility', 'defusion', 'contextual science'],
      createdAt: now - dayMs * 280,
      updatedAt: now - dayMs * 250
    },
    {
      id: 'src-villarreal-2021-ansiedad',
      workIds: ['work-proyecto-tesis-regulacion'],
      title: 'Prevalencia de sintomatología ansiosa y depresiva en jóvenes universitarios peruanos',
      authors: [
        { firstName: 'David', lastName: 'Villarreal-Zegarra' },
        { firstName: 'Anthony', lastName: 'Copez-Lonzoy' }
      ],
      year: 2021,
      type: 'JOURNAL_ARTICLE',
      publication: 'Revista Peruana de Medicina Experimental y Salud Pública',
      volume: '38',
      issue: '1',
      pages: '45-53',
      doi: '10.17843/rpmesp.2021.381.6542',
      abstract: 'Estudio epidemiológico transversal en 1200 estudiantes universitarios evaluando prevalencia de ansiedad mediante GAD-7.',
      accessedAt: now - dayMs * 15,
      verificationStatus: 'VERIFIED',
      verificationProvider: 'CROSSREF',
      keywords: ['ansiedad', 'depresion', 'universitarios', 'peru', 'salud mental'],
      createdAt: now - dayMs * 15,
      updatedAt: now - dayMs * 1
    }
  ];

  // =========================================================================
  // 4. IDEAS Y PARÁFRASIS VINCULADAS
  // =========================================================================
  const ideas: Idea[] = [
    {
      id: 'idea-gross-process-model',
      sourceId: 'src-gross-2015-emotion',
      workId: 'work-proyecto-tesis-regulacion',
      rawQuote: 'The process model organizes emotion regulation strategies along the timeline of emotion generation.',
      pageOrLocation: 'p. 5',
      extractedCoreIdea: 'Modelo procesual y fases temporales de la regulación emocional',
      tags: ['gross', 'linea temporal', 'regulacion'],
      createdAt: now - dayMs * 12,
      updatedAt: now - dayMs * 1
    },
    {
      id: 'idea-ders-peru-factors',
      sourceId: 'src-gargurevich-soenens-2018-ders',
      workId: 'work-proyecto-tesis-regulacion',
      rawQuote: 'The 36-item Peruvian version demonstrated robust construct validity across nonacceptance, goals, impulse, awareness, strategies, and clarity.',
      pageOrLocation: 'p. 118',
      extractedCoreIdea: 'Seis factores de la escala DERS en contexto universitario de Lima',
      tags: ['ders', 'factores', 'validez peru'],
      createdAt: now - dayMs * 10,
      updatedAt: now - dayMs * 1
    },
    {
      id: 'idea-omega-mcdonald-superiority',
      sourceId: 'src-dominguez-merino-2019-omega',
      workId: 'work-proyecto-tesis-regulacion',
      rawQuote: 'El coeficiente Omega no asume tau-equivalencia y refleja con mayor fidelidad la fiabilidad de constructo en escalas psicométricas.',
      pageOrLocation: 'p. 297',
      extractedCoreIdea: 'Ventaja del Coeficiente Omega frente al Alfa de Cronbach',
      tags: ['omega', 'tau equivalencia', 'fiabilidad'],
      createdAt: now - dayMs * 8,
      updatedAt: now - dayMs * 1
    }
  ];

  const paraphrases: Paraphrase[] = [
    {
      id: 'para-gross-1',
      ideaId: 'idea-gross-process-model',
      sourceId: 'src-gross-2015-emotion',
      workId: 'work-proyecto-tesis-regulacion',
      ownInterpretation: 'Gross plantea que no todas las formas de regular la emoción ocurren al mismo tiempo; algunas modifican la situación antes y otras intentan frenar la conducta después.',
      finalParaphrase: 'El modelo procesual postula que los mecanismos regulatorios operan en momentos diferenciados del ciclo afectivo, distinguiendo estrategias previas al despliegue emocional de aquellas focalizadas en la contención de la respuesta (Gross, 2015).',
      fidelityReviewStatus: 'CONFIRMED_FAITHFUL',
      createdAt: now - dayMs * 11,
      updatedAt: now - dayMs * 1
    },
    {
      id: 'para-ders-1',
      ideaId: 'idea-ders-peru-factors',
      sourceId: 'src-gargurevich-soenens-2018-ders',
      workId: 'work-proyecto-tesis-regulacion',
      ownInterpretation: 'El estudio en Lima confirmó que el DERS mide adecuadamente 6 dimensiones de dificultades emocionales.',
      finalParaphrase: 'En población universitaria limeña, la adaptación de la escala DERS ha corroborado una estructura de seis dimensiones con óptimas propiedades psicométricas para la evaluación de desregulación afectiva (Gargurevich & Soenens, 2018).',
      fidelityReviewStatus: 'CONFIRMED_FAITHFUL',
      createdAt: now - dayMs * 9,
      updatedAt: now - dayMs * 1
    }
  ];

  // =========================================================================
  // 5. CITAS FORMATEADAS VINCULADAS (Pipeline de Trazabilidad)
  // =========================================================================
  const citations: Citation[] = [
    {
      id: 'citation-gross-tesis',
      sourceId: 'src-gross-2015-emotion',
      ideaId: 'idea-gross-process-model',
      paraphraseId: 'para-gross-1',
      workId: 'work-proyecto-tesis-regulacion',
      style: 'APA_7',
      inTextNarrative: 'Gross (2015)',
      inTextParenthetical: '(Gross, 2015, p. 5)',
      fullReferenceFormatted: 'Gross, J. J. (2015). Emotion regulation: Current status and future prospects. Psychological Inquiry, 26(1), 1-26. https://doi.org/10.1080/1047840X.2014.940781',
      createdAt: now - dayMs * 11,
      updatedAt: now - dayMs * 1
    },
    {
      id: 'citation-ders-tesis',
      sourceId: 'src-gargurevich-soenens-2018-ders',
      ideaId: 'idea-ders-peru-factors',
      paraphraseId: 'para-ders-1',
      workId: 'work-proyecto-tesis-regulacion',
      style: 'APA_7',
      inTextNarrative: 'Gargurevich y Soenens (2018)',
      inTextParenthetical: '(Gargurevich & Soenens, 2018, p. 118)',
      fullReferenceFormatted: 'Gargurevich, N., & Soenens, B. (2018). Psychometric properties of the Difficulties in Emotion Regulation Scale (DERS) among Peruvian university students. Revista Latinoamericana de Psicología, 50(2), 112-124. https://doi.org/10.14349/rlp.2018.v50.n2.5',
      createdAt: now - dayMs * 9,
      updatedAt: now - dayMs * 1
    },
    {
      id: 'citation-omega-tesis',
      sourceId: 'src-dominguez-merino-2019-omega',
      ideaId: 'idea-omega-mcdonald-superiority',
      workId: 'work-proyecto-tesis-regulacion',
      style: 'APA_7',
      inTextNarrative: 'Domínguez-Lara y Merino-Soto (2019)',
      inTextParenthetical: '(Domínguez-Lara & Merino-Soto, 2019, p. 297)',
      fullReferenceFormatted: 'Domínguez-Lara, S., & Merino-Soto, C. (2019). ¿Por qué es importante el coeficiente Omega en la investigación psicológica peruana? Liberabit: Revista Peruana de Psicología, 25(2), 295-302. https://doi.org/10.24265/liberabit.2019.v25n2.09',
      createdAt: now - dayMs * 8,
      updatedAt: now - dayMs * 1
    },
    {
      id: 'citation-beck-clinica',
      sourceId: 'src-beck-2011-cbt',
      workId: 'work-caso-clinico-salud',
      style: 'APA_7',
      inTextNarrative: 'Beck (2011)',
      inTextParenthetical: '(Beck, 2011)',
      fullReferenceFormatted: 'Beck, J. S. (2011). Cognitive behavior therapy: Basics and beyond. Guilford Press.',
      createdAt: now - dayMs * 14,
      updatedAt: now - dayMs * 1
    },
    {
      id: 'citation-barlow-clinica',
      sourceId: 'src-barlow-2018-unified',
      workId: 'work-caso-clinico-salud',
      style: 'APA_7',
      inTextNarrative: 'Barlow y Sauer-Zavala (2018)',
      inTextParenthetical: '(Barlow & Sauer-Zavala, 2018)',
      fullReferenceFormatted: 'Barlow, D. H., & Sauer-Zavala, S. (2018). Unified Protocol for Transdiagnostic Treatment of Emotional Disorders: Therapist Guide. Oxford University Press. https://doi.org/10.1093/med-psych/9780190685973.001.0001',
      createdAt: now - dayMs * 13,
      updatedAt: now - dayMs * 1
    }
  ];

  // =========================================================================
  // 6. CONCEPTOS PSICOLÓGICOS DEL GRAFO (12 Conceptos Interconectados)
  // =========================================================================
  const concepts: Concept[] = [
    { id: 'concept-regulacion-emocional', name: 'Regulación Emocional (Modelo de Gross)', description: 'Modulación consciente e inconsciente de la intensidad, duración y expresión de las respuestas afectivas.', color: '#D98880', createdAt: now - dayMs * 20, updatedAt: now - dayMs * 1 },
    { id: 'concept-autoeficacia-academica', name: 'Autoeficacia Percibida (Bandura)', description: 'Juicio subjetivo sobre la propia capacidad para organizar y ejecutar cursos de acción orientados a logros académicos.', color: '#B39DDB', createdAt: now - dayMs * 20, updatedAt: now - dayMs * 1 },
    { id: 'concept-omega-mcdonald', name: 'Coeficiente Omega de McDonald', description: 'Estimador de consistencia interna basado en cargas factoriales de modelos factoriales confirmatorios.', color: '#80CBC4', createdAt: now - dayMs * 20, updatedAt: now - dayMs * 1 },
    { id: 'concept-reestructuracion-cognitiva', name: 'Reestructuración Cognitiva (TCC de Beck)', description: 'Técnica psicoterapéutica para identificar, cuestionar y modificar esquemas nucleares y pensamientos automáticos distorsionados.', color: '#FFCC80', createdAt: now - dayMs * 20, updatedAt: now - dayMs * 1 },
    { id: 'concept-alianza-terapeutica', name: 'Alianza Terapéutica y Rapport Clínico', description: 'Vínculo colaborativo y acuerdo mutuo en metas y tareas terapéuticas entre consultante y psicoterapeuta.', color: '#EF9A9A', createdAt: now - dayMs * 20, updatedAt: now - dayMs * 1 },
    { id: 'concept-protocolo-unificado', name: 'Protocolo Unificado Transdiagnóstico (Barlow)', description: 'Intervención cognitivo-conductual basada en procesos para trastornos afectivos y de ansiedad.', color: '#90CAF9', createdAt: now - dayMs * 20, updatedAt: now - dayMs * 1 },
    { id: 'concept-terapia-contextual-act', name: 'Terapia de Aceptación y Compromiso (ACT)', description: 'Terapia conductual de 3ra generación centrada en la flexibilidad psicológica, defusión y valores.', color: '#A5D6A7', createdAt: now - dayMs * 300, updatedAt: now - dayMs * 1 },
    { id: 'concept-competencias-star', name: 'Entrevista por Competencias STAR', description: 'Método estructurado de evaluación conductual (Situación, Tarea, Acción, Resultado).', color: '#FFE082', createdAt: now - dayMs * 20, updatedAt: now - dayMs * 1 },
    { id: 'concept-deontologia-psicologia', name: 'Ética y Consentimiento Informado (Ley 28369 & CPsP)', description: 'Normativa ética legal y profesional que rige la confidencialidad, no maleficencia y autonomía del consultante.', color: '#CE93D8', createdAt: now - dayMs * 20, updatedAt: now - dayMs * 1 },
    { id: 'concept-memoria-trabajo', name: 'Memoria de Trabajo y Corteza Prefrontal', description: 'Sistema cognitivo de capacidad limitada para retener y manipular información en tiempo real.', color: '#B0BEC5', createdAt: now - dayMs * 800, updatedAt: now - dayMs * 1 },
    { id: 'concept-validez-contenido', name: 'Validez de Contenido y Coeficiente V de Aiken', description: 'Grado en que un instrumento representa el dominio conceptual evaluado por juicio de expertos.', color: '#BCAAA4', createdAt: now - dayMs * 600, updatedAt: now - dayMs * 1 },
    { id: 'concept-terapia-grupal', name: 'Dinámica de Grupos y Psicoterapia Vivencial', description: 'Intervenciones interpersonales grupales basadas en aprendizaje vicario y cohesión afectiva.', color: '#80CBC4', createdAt: now - dayMs * 20, updatedAt: now - dayMs * 1 }
  ];

  // =========================================================================
  // 7. NOTAS DENSAS DEL SEGUNDO CEREBRO (PARA + WIKI-LINKS) (12 Notas Ricas)
  // =========================================================================
  const notes: Note[] = [
    // 1. Tesis - Regulación Emocional
    {
      id: 'note-regulacion-universitarios',
      slug: 'regulacion-emocional-universitarios-usmp-tesis',
      title: 'Marco Teórico: Regulación Emocional y Ansiedad Académica',
      content: `# Marco Teórico: Regulación Emocional y Ansiedad Académica

La investigación de tesis en la [[Facultad de Ciencias de la Comunicación, Turismo y Psicología - USMP]] articula el [[Regulación Emocional (Modelo de Gross)]] con la [[Autoeficacia Percibida (Bandura)]] frente a la sintomatología ansiosa.

## Dimensiones Clave:
1. **Reevaluación Cognitiva**: Estrategia focalizada en el antecedente que reduce la activación fisiológica.
2. **Supresión Expresiva**: Estrategia focalizada en la respuesta con costo atencional elevado.
3. **Consistencia Psicométrica**: Se reporta el [[Coeficiente Omega de McDonald]] conforme a los estándares de [[Domínguez-Lara & Merino-Soto (2019)]] en Liberabit.

Vinculado al proyecto: [[Proyecto de Tesis: Regulación Emocional, Autoeficacia Académica y Sintomatología Ansiosa en Universitarios de Lima Metropolitana]].

#tesis #regulacion #psicometria #usmp #fcctp`,
      paraCategory: 'PROJECT',
      courseId: 'course-tesis-2-usmp',
      workId: 'work-proyecto-tesis-regulacion',
      sourceIds: ['src-gross-2015-emotion', 'src-gargurevich-soenens-2018-ders', 'src-dominguez-merino-2019-omega'],
      conceptIds: ['concept-regulacion-emocional', 'concept-autoeficacia-academica', 'concept-omega-mcdonald'],
      tags: ['#tesis', '#regulacion', '#psicometria', '#usmp'],
      backlinks: [],
      isPinned: true,
      createdAt: now - dayMs * 20,
      updatedAt: now - dayMs * 1
    },

    // 2. Psicometría Peruana
    {
      id: 'note-psicometria-peruana',
      slug: 'psicometria-peruana-omega-vs-alfa-usmp',
      title: 'Psicometría en Perú: Coeficiente Omega vs Alfa de Cronbach',
      content: `# Psicometría en Perú: Coeficiente Omega vs Alfa de Cronbach

En la investigación psicológica cuantitativa en el Perú, autores del Instituto de Investigación de Psicología USMP como [[Domínguez-Lara & Merino-Soto (2019)]] han demostrado que el **Alfa de Cronbach** subestima la fiabilidad cuando las cargas factoriales no son homogéneas (violación de tau-equivalencia).

El [[Coeficiente Omega de McDonald]] calcula la consistencia interna a partir de las cargas factoriales estandarizadas del modelo factorial confirmatorio:

$$\\omega = \\frac{(\\sum \\lambda_i)^2}{(\\sum \\lambda_i)^2 + \\sum \\theta_{ii}}$$

Es el estándar exigido en tesis de licenciatura de la [[Facultad de Ciencias de la Comunicación, Turismo y Psicología - USMP]].

#psicometria #metodologia #omega #usmp`,
      paraCategory: 'RESOURCE',
      courseId: 'course-tesis-2-usmp',
      sourceIds: ['src-dominguez-merino-2019-omega'],
      conceptIds: ['concept-omega-mcdonald'],
      tags: ['#psicometria', '#metodologia', '#omega', '#usmp'],
      backlinks: ['note-regulacion-universitarios'],
      isPinned: false,
      createdAt: now - dayMs * 18,
      updatedAt: now - dayMs * 1
    },

    // 3. Clínica Beck
    {
      id: 'note-tcc-ansiedad-social',
      slug: 'formulacion-cognitiva-tcc-ansiedad-social-beck',
      title: 'Formulación de Caso Clínico según Modelo de Beck',
      content: `# Formulación de Caso Clínico según Modelo de Beck

La conceptualización cognitiva de un caso de fobia o ansiedad social requiere articular:
1. **Historia de desarrollo**: Experiencias tempranas de rechazo o sobreprotección.
2. **Creencias nucleares**: "Soy defectuoso" o "Soy incompetente".
3. **Reglas condicionales**: "Si muestro inseguridad, los demás me rechazarán".
4. **Pensamientos automáticos**: Catastrofización en tiempo real.

Técnica de intervención central: [[Reestructuración Cognitiva (TCC de Beck)]] complementada con una sólida [[Alianza Terapéutica y Rapport Clínico]] y principios del [[Protocolo Unificado Transdiagnóstico (Barlow)]].

#clinica #tcc #beck #ansiedad #saludmental`,
      paraCategory: 'PROJECT',
      courseId: 'course-salud-usmp',
      workId: 'work-caso-clinico-salud',
      sourceIds: ['src-beck-2011-cbt', 'src-barlow-2018-unified'],
      conceptIds: ['concept-reestructuracion-cognitiva', 'concept-alianza-terapeutica', 'concept-protocolo-unificado'],
      tags: ['#clinica', '#tcc', '#beck', '#ansiedad'],
      backlinks: [],
      isPinned: false,
      createdAt: now - dayMs * 16,
      updatedAt: now - dayMs * 1
    },

    // 4. Deontología
    {
      id: 'note-deontologia-consentimiento',
      slug: 'protocolo-etico-consentimiento-informado-cpsp-usmp',
      title: 'Protocolo Ético de Consentimiento Informado (CPsP & USMP)',
      content: `# Protocolo Ético de Consentimiento Informado (CPsP & USMP)

En toda investigación psicológica y práctica de internado en la [[Facultad de Ciencias de la Comunicación, Turismo y Psicología - USMP]], el protocolo de **Consentimiento Informado** debe incluir:
1. Objetivo y procedimientos del estudio o intervención clínica.
2. Carácter voluntario y derecho a retirarse en cualquier momento sin perjuicio.
3. Garantía estricta de confidencialidad y anonimato de los datos personales.
4. Información de contacto del investigador y del Comité de Ética FCCTP USMP.

Fundamentado en: [[Ética y Consentimiento Informado (Ley 28369 & CPsP)]] y Ley del Trabajo del Psicólogo N° 28369.`,
      paraCategory: 'RESOURCE',
      courseId: 'course-etica-usmp',
      sourceIds: [],
      conceptIds: ['concept-deontologia-psicologia'],
      tags: ['#deontologia', '#cpsp', '#usmp', '#etica'],
      backlinks: ['note-regulacion-universitarios'],
      isPinned: false,
      createdAt: now - dayMs * 15,
      updatedAt: now - dayMs * 2
    },

    // 5. Intervención Grupal
    {
      id: 'note-dinamica-grupal',
      slug: 'tecnicas-intervencion-grupal-y-dinamicas',
      title: 'Técnicas de Intervención Grupal y Dinámicas Vivenciales',
      content: `# Técnicas de Intervención Grupal y Dinámicas Vivenciales

En la conducción de talleres psicoeducativos universitarios, la [[Dinámica de Grupos y Psicoterapia Vivencial]] promueve la cohesión y el aprendizaje vicario.

Se combinan ejercicios de role-playing y técnicas de [[Regulación Emocional (Modelo de Gross)]] para reducir el estrés pre-exámenes.

#grupal #intervencion #psicoterapia #fcctp`,
      paraCategory: 'AREA',
      courseId: 'course-grupal-usmp',
      workId: 'work-informe-psicodiagnostico',
      sourceIds: [],
      conceptIds: ['concept-terapia-grupal', 'concept-regulacion-emocional'],
      tags: ['#grupal', '#intervencion', '#psicoterapia'],
      backlinks: [],
      isPinned: false,
      createdAt: now - dayMs * 12,
      updatedAt: now - dayMs * 1
    },

    // 6. Talento STAR
    {
      id: 'note-star-talento',
      slug: 'gestion-talento-humano-entrevista-star',
      title: 'Gestión del Talento Humano por Competencias STAR',
      content: `# Gestión del Talento Humano por Competencias STAR

La metodología [[Entrevista por Competencias STAR]] evalúa comportamientos pasados observables en cuatro dimensiones:
- **Situación**: Contexto y desafío.
- **Tarea**: Objetivo y responsabilidad asignada.
- **Acción**: Conductas específicas desplegadas.
- **Resultado**: Logro cuantitativo y cualitativo.

Aplicado a organizaciones hospitalarias y clínicas en Lima.

#organizacional #talento #competencias #usmp`,
      paraCategory: 'AREA',
      courseId: 'course-talento-usmp',
      workId: 'work-talento-competencias',
      sourceIds: [],
      conceptIds: ['concept-competencias-star'],
      tags: ['#organizacional', '#talento', '#competencias'],
      backlinks: [],
      isPinned: false,
      createdAt: now - dayMs * 10,
      updatedAt: now - dayMs * 1
    },

    // 7. Atomic - Supresión vs Reevaluación
    {
      id: 'note-atomic-supresion-reevaluacion',
      slug: 'diferencia-entre-supresion-y-reevaluacion',
      title: 'Diferencia entre Supresión y Reevaluación Emocional',
      content: `# Diferencia entre Supresión y Reevaluación Emocional

- **Reevaluación cognitiva**: Actúa antes de que la emoción se desborde. Modifica la valoración cognitiva del estresor y reduce el coste psicofisiológico.
- **Supresión expresiva**: Inhibe la conducta externa pero mantiene elevada la activación simpática (ritmo cardíaco, cortisol) y deteriora la memoria de trabajo.

Conectado a: [[Regulación Emocional (Modelo de Gross)]] y [[Autoeficacia Percibida (Bandura)]].`,
      paraCategory: 'ATOMIC',
      courseId: 'course-tesis-2-usmp',
      sourceIds: ['src-gross-2015-emotion'],
      conceptIds: ['concept-regulacion-emocional', 'concept-autoeficacia-academica'],
      tags: ['#atomic', '#psicologia', '#emociones'],
      backlinks: ['note-regulacion-universitarios'],
      isPinned: false,
      createdAt: now - dayMs * 8,
      updatedAt: now - dayMs * 1
    },

    // 8. Histórico 2025 - ACT Hexaflex (Ciclo 7)
    {
      id: 'note-act-hexaflex',
      slug: 'terapia-aceptacion-compromiso-hexaflex',
      title: 'El Modelo Hexaflex en Terapia de Aceptación y Compromiso (ACT)',
      content: `# El Modelo Hexaflex en Terapia de Aceptación y Compromiso (ACT)

El modelo de [[Terapia de Aceptación y Compromiso (ACT)]] de Steven Hayes estructura la **flexibilidad psicológica** en seis procesos interconectados:
1. **Aceptación**: Disposición abierta a experimentar eventos privados difíciles.
2. **Defusión Cognitiva**: Distanciamiento de pensamientos automáticos sin fusionarse con su contenido literal.
3. **Contacto con el Momento Presente**: Atención plena (mindfulness).
4. **Yo como Contexto**: Perspectiva del observador trascendente.
5. **Valores**: Direcciones de vida elegidas libremente.
6. **Acción Comprometida**: Patrones de conducta alineados con valores.

#act #tercerageneracion #contextual #psicoterapia`,
      paraCategory: 'RESOURCE',
      courseId: 'course-psicoterapia-3g-usmp',
      workId: 'work-act-terapia-contextual',
      sourceIds: ['src-hayes-2019-act'],
      conceptIds: ['concept-terapia-contextual-act'],
      tags: ['#act', '#tercerageneracion', '#contextual', '#psicoterapia'],
      backlinks: [],
      isPinned: false,
      createdAt: now - dayMs * 260,
      updatedAt: now - dayMs * 240
    },

    // 9. Histórico 2024 - Neuroanatomía de Memoria de Trabajo (Ciclo 4)
    {
      id: 'note-neuro-memoria-trabajo',
      slug: 'bases-neurobiologicas-memoria-trabajo-dorsolateral',
      title: 'Bases Neurobiológicas de la Memoria de Trabajo',
      content: `# Bases Neurobiológicas de la Memoria de Trabajo

La [[Memoria de Trabajo y Corteza Prefrontal]] (Baddeley & Hitch) tiene su sustrato neural fundamental en:
- **Corteza Prefrontal Dorsolateral (DLPFC - Áreas 9/46 de Brodmann)**: Mantenimiento y manipulación activa de representaciones mentales.
- **Corteza Parietal Posterior**: Búfer episódico y almacenamiento visoespacial.
- **Circuito Córtico-Estriatal**: Filtrado de estímulos irrelevantes y control inhibitorio.

#neuropsicologia #memoria #dlpfc #neuroanatomia`,
      paraCategory: 'ARCHIVE',
      courseId: 'course-neuro-usmp',
      workId: 'work-meta-analisis-neuro',
      sourceIds: [],
      conceptIds: ['concept-memoria-trabajo'],
      tags: ['#neuropsicologia', '#memoria', '#dlpfc', '#neuroanatomia'],
      backlinks: [],
      isPinned: false,
      createdAt: now - dayMs * 800,
      updatedAt: now - dayMs * 780
    },

    // 10. Histórico 2024 - Psicometría y Aiken (Ciclo 5)
    {
      id: 'note-aiken-validez',
      slug: 'validez-contenido-coeficiente-v-aiken',
      title: 'Cálculo e Interpretación de la V de Aiken en Validación de Reactivos',
      content: `# Cálculo e Interpretación de la V de Aiken en Validación de Reactivos

Para la [[Validez de Contenido y Coeficiente V de Aiken]] con $k$ jueces y escala de $c$ opciones:

$$V = \\frac{S}{n(c - 1)}$$

Donde $S = \\sum (r_i - l)$ siendo $r_i$ la calificación del juez y $l$ la calificación mínima. Un valor $V \\ge 0.80$ con significancia estadística ($p < 0.05$) indica adecuada validez de contenido.

#psicometria #aiken #validez #usmp`,
      paraCategory: 'ARCHIVE',
      courseId: 'course-psicometria-usmp',
      workId: 'work-construccion-escala',
      sourceIds: [],
      conceptIds: ['concept-validez-contenido'],
      tags: ['#psicometria', '#aiken', '#validez', '#usmp'],
      backlinks: ['note-psicometria-peruana'],
      isPinned: false,
      createdAt: now - dayMs * 620,
      updatedAt: now - dayMs * 600
    },

    // 11. Atomic - Alianza Terapéutica Bordin
    {
      id: 'note-atomic-bordin',
      slug: 'dimensiones-alianza-terapeutica-bordin',
      title: 'Las 3 Dimensiones de la Alianza Terapéutica (Bordin, 1979)',
      content: `# Las 3 Dimensiones de la Alianza Terapéutica (Bordin, 1979)

1. **Vínculo afectivo**: Confianza mutua, calidez y aceptación incondicional.
2. **Acuerdo en Metas**: Consenso explícito sobre los objetivos del tratamiento.
3. **Acuerdo en Tareas**: Coincidencia en las actividades y técnicas a desarrollar en cada sesión.

Conectado a: [[Alianza Terapéutica y Rapport Clínico]] y [[Reestructuración Cognitiva (TCC de Beck)]].`,
      paraCategory: 'ATOMIC',
      courseId: 'course-salud-usmp',
      sourceIds: [],
      conceptIds: ['concept-alianza-terapeutica'],
      tags: ['#atomic', '#clinica', '#bordin'],
      backlinks: ['note-tcc-ansiedad-social'],
      isPinned: false,
      createdAt: now - dayMs * 6,
      updatedAt: now - dayMs * 1
    },

    // 12. Atomic - Defusión Cognitiva
    {
      id: 'note-atomic-defusion',
      slug: 'tecnicas-defusion-cognitiva-act',
      title: 'Técnicas Rápidas de Defusión Cognitiva en ACT',
      content: `# Técnicas Rápidas de Defusión Cognitiva en ACT

- *Etiquetado de pensamientos*: "Estoy teniendo el pensamiento de que voy a reprobar".
- *Agradecer a la mente*: "Gracias mente por intentar protegerme con esa preocupación".
- *Repetición de palabras*: Repetir la palabra temida por 45 segundos hasta que pierda su peso semántico y quede solo como sonido.

Conectado a: [[Terapia de Aceptación y Compromiso (ACT)]].`,
      paraCategory: 'ATOMIC',
      courseId: 'course-psicoterapia-3g-usmp',
      sourceIds: [],
      conceptIds: ['concept-terapia-contextual-act'],
      tags: ['#atomic', '#act', '#defusion'],
      backlinks: ['note-act-hexaflex'],
      isPinned: false,
      createdAt: now - dayMs * 5,
      updatedAt: now - dayMs * 1
    }
  ];

  // =========================================================================
  // 8. TAREAS ACADÉMICAS VINCULADAS (Históricas y Actuales)
  // =========================================================================
  const tasks: Task[] = [
    // Tareas Urgentes / Activas (8vo Ciclo)
    {
      id: 'task-tesis-1',
      workId: 'work-proyecto-tesis-regulacion',
      courseId: 'course-tesis-2-usmp',
      title: 'Redactar Planteamiento del Problema del Proyecto de Tesis con antecedentes en Liberabit (USMP)',
      description: 'Fundamentar la prevalencia de ansiedad académica y autorregulación en universitarios peruanos',
      dueDate: now + dayMs * 2,
      priority: 'URGENT',
      isCompleted: false,
      category: 'WRITING',
      createdAt: now - dayMs * 3,
      updatedAt: now - dayMs * 1
    },
    {
      id: 'task-tesis-2',
      workId: 'work-proyecto-tesis-regulacion',
      courseId: 'course-tesis-2-usmp',
      title: 'Calcular consistencia interna (Omega de McDonald y Alfa) de la escala DERS en Jamovi',
      description: 'Procesar la muestra piloto de 50 estudiantes de la FCCTP USMP',
      dueDate: now + dayMs * 5,
      priority: 'HIGH',
      isCompleted: false,
      category: 'RESEARCH',
      createdAt: now - dayMs * 2,
      updatedAt: now - dayMs * 1
    },
    {
      id: 'task-salud-1',
      workId: 'work-caso-clinico-salud',
      courseId: 'course-salud-usmp',
      title: 'Completar autoregistro de pensamientos automáticos y conceptualización de Beck',
      dueDate: now + dayMs * 1,
      priority: 'HIGH',
      isCompleted: false,
      category: 'ASSIGNMENT_CHECKLIST',
      createdAt: now - dayMs * 1,
      updatedAt: now - dayMs * 1
    },
    {
      id: 'task-grupal-1',
      workId: 'work-informe-psicodiagnostico',
      courseId: 'course-grupal-usmp',
      title: 'Diseñar matriz de 8 sesiones del programa de intervención grupal en regulación afectiva',
      dueDate: now + dayMs * 6,
      priority: 'MEDIUM',
      isCompleted: false,
      category: 'WRITING',
      createdAt: now - dayMs * 2,
      updatedAt: now - dayMs * 1
    },
    {
      id: 'task-talento-1',
      workId: 'work-talento-competencias',
      courseId: 'course-talento-usmp',
      title: 'Elaborar guía de entrevista STAR para puesto de psicólogo clínico hospitalario',
      dueDate: now + dayMs * 11,
      priority: 'MEDIUM',
      isCompleted: false,
      category: 'WRITING',
      createdAt: now - dayMs * 2,
      updatedAt: now - dayMs * 1
    },
    {
      id: 'task-etica-1',
      courseId: 'course-etica-usmp',
      title: 'Redactar formato de Consentimiento Informado bajo la Ley 28369 y directrices FCCTP USMP',
      dueDate: now + dayMs * 8,
      priority: 'MEDIUM',
      isCompleted: false,
      category: 'GENERAL',
      createdAt: now - dayMs * 1,
      updatedAt: now - dayMs * 1
    },
    {
      id: 'task-internado-prep',
      courseId: 'course-internado-1-usmp',
      title: 'Revisar requisitos de postulación a sedes de Internado I (Hospitales MINSA/EsSalud, CSMC y Clínicas USMP)',
      description: 'Récord de notas hasta 8vo ciclo, constancia de matrícula FCCTP y certificado de salud',
      dueDate: now + dayMs * 25,
      priority: 'MEDIUM',
      isCompleted: false,
      category: 'GENERAL',
      createdAt: now,
      updatedAt: now
    },

    // Tareas Históricas Completadas (Ciclos 4 a 7)
    {
      id: 'task-hist-neuro-1',
      workId: 'work-meta-analisis-neuro',
      courseId: 'course-neuro-usmp',
      title: 'Sustentar monografía de corteza prefrontal y memoria de trabajo',
      dueDate: now - dayMs * 780,
      priority: 'HIGH',
      isCompleted: true,
      category: 'ASSIGNMENT_CHECKLIST',
      createdAt: now - dayMs * 800,
      updatedAt: now - dayMs * 780
    },
    {
      id: 'task-hist-psicometria-1',
      workId: 'work-construccion-escala',
      courseId: 'course-psicometria-usmp',
      title: 'Recolectar datos de n=100 para cálculo de V de Aiken',
      dueDate: now - dayMs * 610,
      priority: 'HIGH',
      isCompleted: true,
      category: 'RESEARCH',
      createdAt: now - dayMs * 630,
      updatedAt: now - dayMs * 610
    },
    {
      id: 'task-hist-act-1',
      workId: 'work-act-terapia-contextual',
      courseId: 'course-psicoterapia-3g-usmp',
      title: 'Entregar ensayo final sobre Terapia ACT en dolor crónico',
      dueDate: now - dayMs * 250,
      priority: 'URGENT',
      isCompleted: true,
      category: 'WRITING',
      createdAt: now - dayMs * 270,
      updatedAt: now - dayMs * 250
    }
  ];

  // =========================================================================
  // 9. CONSULTAS AL DOCENTE (INQUIRIES)
  // =========================================================================
  const inquiries: InquiryToTeacher[] = [
    {
      id: 'inquiry-ders-adaptacion-peru',
      workId: 'work-proyecto-tesis-regulacion',
      courseId: 'course-tesis-2-usmp',
      topic: 'Uso de la Escala DERS adaptada en Lima (Gargurevich & Soenens, 2018) y fuentes seminales de Gross (2015)',
      rawQuestion: 'Dra. Marcia, ¿puedo citar Gross (2015) en mi tesis aunque tenga más de 5 años?',
      formalQuestion: 'Estimada Dra. Calderón, quisiera consultar si en el Proyecto de Tesis se autoriza citar la obra seminal de Gross (2015) a pesar de superar la ventana de 5 años de antigüedad, dado que constituye la base teórica central del Modelo Procesual de Regulación Emocional.',
      status: 'ANSWERED',
      askedDate: now - dayMs * 7,
      teacherAnswer: 'Estimada Saory, en el marco metodológico de la FCCTP USMP las obras seminales o fundacionales (como Gross 2015 o Bandura 1997) están plenamente permitidas en las Bases Teóricas. En los Antecedentes empíricos mantén los artículos 2021-2026 de Scopus/SciELO.',
      answeredDate: now - dayMs * 5,
      bindingDecision: 'Permitido citar autores seminales (Gross 2015, Bandura 1997) en Bases Teóricas.',
      createdAt: now - dayMs * 7,
      updatedAt: now - dayMs * 5
    },
    {
      id: 'inquiry-caso-clinico-salud',
      workId: 'work-caso-clinico-salud',
      courseId: 'course-salud-usmp',
      topic: 'Formato de entrega del Diagrama de Conceptualización Cognitiva de Beck',
      rawQuestion: 'Dr. Fernández, ¿dónde coloco el diagrama de conceptualización de Beck?',
      formalQuestion: 'Dr. Fernández, ¿el diagrama de conceptualización cognitiva debe incluirse como anexo o integrarse dentro del cuerpo del informe clínico?',
      status: 'ANSWERED',
      askedDate: now - dayMs * 4,
      teacherAnswer: 'Debe ir integrado en la sección 2 del cuerpo del informe clínico, acompañado del análisis funcional E-O-R-C.',
      answeredDate: now - dayMs * 2,
      bindingDecision: 'Integrar Diagrama de Beck en sección 2 del cuerpo del informe.',
      createdAt: now - dayMs * 4,
      updatedAt: now - dayMs * 2
    }
  ];

  return {
    courses,
    works,
    sources,
    ideas,
    paraphrases,
    citations,
    concepts,
    notes,
    tasks,
    inquiries
  };
}

export async function initializeDatabaseSeed(force = false) {
  const isInitialized = await db.settings.get('has_initialized');
  if (isInitialized && !force) {
    return;
  }

  const now = Date.now();

  const defaultUserProfile: SettingRecord = {
    key: 'user_profile',
    value: DEFAULT_USER_PROFILE,
    updatedAt: now
  };

  const defaultAISettings: SettingRecord = {
    key: 'ai_settings',
    value: {
      provider: 'offline_heuristics',
      modelName: 'gemini-2.5-flash',
      temperature: 0.2,
      tokensUsedThisMonth: 0
    } as AISettings,
    updatedAt: now
  };

  const defaultObsidianSettings: SettingRecord = {
    key: 'obsidian_settings',
    value: {
      vaultName: 'Alfajorcito Vault',
      defaultParaFolder: 'Alfajorcito OS/Notes'
    } as ObsidianSettings,
    updatedAt: now
  };

  if (!force) {
    // Fresh clean startup: Initialize default profile and settings with 0 courses/works
    await db.settings.bulkPut([
      defaultUserProfile,
      defaultAISettings,
      defaultObsidianSettings,
      { key: 'has_initialized', value: true, updatedAt: now }
    ]);
    return;
  }

  const {
    courses,
    works,
    sources,
    ideas,
    paraphrases,
    citations,
    concepts,
    notes,
    tasks,
    inquiries
  } = getSeedData(now);

  // Atomic transaction across all 11 tables
  await db.transaction(
    'rw',
    [
      db.courses,
      db.works,
      db.sources,
      db.ideas,
      db.paraphrases,
      db.citations,
      db.concepts,
      db.notes,
      db.tasks,
      db.inquiries,
      db.settings
    ],
    async () => {
      // Clear entity tables to prevent duplicate / fragmented data when re-seeding
      await db.courses.clear();
      await db.works.clear();
      await db.sources.clear();
      await db.ideas.clear();
      await db.paraphrases.clear();
      await db.citations.clear();
      await db.concepts.clear();
      await db.notes.clear();
      await db.tasks.clear();
      await db.inquiries.clear();

      await db.courses.bulkPut(courses);
      await db.works.bulkPut(works);
      await db.sources.bulkPut(sources);
      await db.ideas.bulkPut(ideas);
      await db.paraphrases.bulkPut(paraphrases);
      await db.citations.bulkPut(citations);
      await db.concepts.bulkPut(concepts);
      await db.notes.bulkPut(notes);
      await db.tasks.bulkPut(tasks);
      await db.inquiries.bulkPut(inquiries);
      await db.settings.bulkPut([
        defaultUserProfile,
        defaultAISettings,
        defaultObsidianSettings,
        { key: 'has_initialized', value: true, updatedAt: now }
      ]);
    }
  );
}
