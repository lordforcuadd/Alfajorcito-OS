import Dexie, { type EntityTable } from 'dexie';
import type {
  Course,
  Work,
  InquiryToTeacher,
  Source,
  Idea,
  Paraphrase,
  Citation,
  Note,
  Concept,
  Task,
  AISettings,
  ObsidianSettings,
  UserProfile
} from '../types';

export interface SettingRecord {
  key: string;
  value: unknown;
  updatedAt: number;
}

export class AlfajorcitoDB extends Dexie {
  courses!: EntityTable<Course, 'id'>;
  works!: EntityTable<Work, 'id'>;
  inquiries!: EntityTable<InquiryToTeacher, 'id'>;
  sources!: EntityTable<Source, 'id'>;
  ideas!: EntityTable<Idea, 'id'>;
  paraphrases!: EntityTable<Paraphrase, 'id'>;
  citations!: EntityTable<Citation, 'id'>;
  notes!: EntityTable<Note, 'id'>;
  concepts!: EntityTable<Concept, 'id'>;
  tasks!: EntityTable<Task, 'id'>;
  settings!: EntityTable<SettingRecord, 'key'>;

  constructor() {
    super('AlfajorcitoOS_DB');

    this.version(1).stores({
      courses: '&id, name, period, isArchived, updatedAt',
      works: '&id, courseId, status, deadline, isArchived, updatedAt',
      inquiries: '&id, workId, courseId, status, updatedAt',
      sources: '&id, *workIds, year, verificationStatus, doi, updatedAt',
      ideas: '&id, sourceId, workId, updatedAt',
      paraphrases: '&id, ideaId, sourceId, workId, fidelityReviewStatus, updatedAt',
      citations: '&id, sourceId, workId, style, updatedAt',
      notes: '&id, slug, paraCategory, courseId, workId, *tags, *sourceIds, isPinned, updatedAt',
      concepts: '&id, &name, updatedAt',
      tasks: '&id, workId, courseId, dueDate, priority, isCompleted, category, updatedAt',
      settings: '&key, updatedAt'
    });
  }
}

export const db = new AlfajorcitoDB();

// Helper to clear all academic entities (leaving database at 0 for fresh user testing)
export async function clearAllDatabaseData() {
  await db.courses.clear();
  await db.works.clear();
  await db.sources.clear();
  await db.ideas.clear();
  await db.paraphrases.clear();
  await db.citations.clear();
  await db.notes.clear();
  await db.concepts.clear();
  await db.tasks.clear();
  await db.inquiries.clear();
  await db.settings.put({ key: 'has_initialized', value: true, updatedAt: Date.now() });
}

// Helper to seed complete, realistic academic data for USMP Psychology student (8vo Ciclo en curso + proyección a Internado 9no y 10mo)
export async function initializeDatabaseSeed(force = false) {
  const isInitialized = await db.settings.get('has_initialized');
  if (isInitialized && !force) {
    return;
  }

  const now = Date.now();

  if (!force) {
    // Fresh clean startup: Initialize default profile and settings with 0 courses/works
    const initialUserProfile: SettingRecord = {
      key: 'user_profile',
      value: {
        name: 'Saory (Psicología USMP)',
        institution: 'Universidad de San Martín de Porres (USMP)',
        faculty: 'Facultad de Ciencias de la Comunicación, Turismo y Psicología',
        major: 'Psicología',
        currentCycle: 'VIII Ciclo (8vo Ciclo)',
        specialty: 'CLINICA',
        thesisTitle: '',
        internshipSite: '',
        defaultCitationStyle: 'APA_7'
      } as UserProfile,
      updatedAt: now
    };

    const initialAISettings: SettingRecord = {
      key: 'ai_settings',
      value: {
        provider: 'offline_heuristics',
        modelName: 'gemini-1.5-flash',
        temperature: 0.2,
        tokensUsedThisMonth: 0
      } as AISettings,
      updatedAt: now
    };

    const initialObsidianSettings: SettingRecord = {
      key: 'obsidian_settings',
      value: {
        restApiEnabled: false,
        restApiEndpoint: 'https://127.0.0.1:27124',
        restApiToken: '',
        defaultParaFolder: '01_Projects'
      } as ObsidianSettings,
      updatedAt: now
    };

    await db.settings.bulkPut([
      initialUserProfile,
      initialAISettings,
      initialObsidianSettings,
      { key: 'has_initialized', value: true, updatedAt: now }
    ]);
    return;
  }

  const dayMs = 86400000;

  // 1. Cursos Reales de la Facultad de Ciencias de la Comunicación, Turismo y Psicología (FCCTP - USMP)
  const courses: Course[] = [
    {
      id: 'course-tesis-2-usmp',
      code: 'PSI-801',
      name: 'Seminario de Investigación en Psicología II (Proyecto de Tesis)',
      period: '2026-II (8vo Ciclo)',
      color: '#D98880',
      teacherName: 'Dra. Marcia Calderón De la Cruz',
      teacherEmail: 'mcalderond@usmp.pe',
      syllabusUrl: 'https://fcctp.usmp.edu.pe/silabo/psi-801',
      createdAt: now - dayMs * 20,
      updatedAt: now - dayMs * 2,
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
      createdAt: now - dayMs * 20,
      updatedAt: now - dayMs * 2,
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
      createdAt: now - dayMs * 20,
      updatedAt: now - dayMs * 2,
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
      createdAt: now - dayMs * 20,
      updatedAt: now - dayMs * 2,
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
      createdAt: now - dayMs * 20,
      updatedAt: now - dayMs * 2,
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
      createdAt: now - dayMs * 20,
      updatedAt: now - dayMs * 2,
      isArchived: false
    },
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

  await db.courses.bulkPut(courses);

  // 2. Trabajos Académicos Contextualizados para 8vo Ciclo de Psicología FCCTP - USMP
  const work1: Work = {
    id: 'work-proyecto-tesis-regulacion',
    courseId: 'course-tesis-2-usmp',
    title: 'Proyecto de Tesis: Regulación Emocional, Autoeficacia Académica y Sintomatología Ansiosa en Estudiantes de la USMP',
    type: 'TESIS',
    status: 'INVESTIGACION',
    deadline: now + dayMs * 7,
    citationStyle: 'APA_7',
    maxSourceAgeYears: 5,
    minRequiredSources: 8,
    formatRequirements: 'Formato oficial de la Escuela Profesional de Psicología FCCTP - USMP. Estilo APA 7ma Edición estricta, sangría francesa en referencias bibliográficas, tipografía Times New Roman 12pt / Arial 11pt, interlineado doble. Estructura: Planteamiento del Problema, Formulación de Objetivos e Hipótesis, Marco Teórico (Antecedentes Nacionales e Internacionales 2021-2026 en revistas Scopus/SciELO como Liberabit y Bases Teóricas), Método (Diseño no experimental correlacional-explicativo, Muestra representativa n=380 de Campus Surquillo USMP, Instrumentos psicométricos validados en Perú: DERS, EAG y GAD-7 con reporte de Coeficiente Omega de McDonald, Procedimiento ético alineado al Comité de Ética de la USMP y CPsP).',
    rawInstructions: 'Elaborar y sustentar el Proyecto de Tesis de Licenciatura en Psicología. La investigación debe fundamentarse en artículos de revistas indexadas en Scopus, Web of Science, Scielo o Redalyc de los últimos 5 años (2021-2026), priorizando la literatura de evaluación psicológica y psicometría peruana. Es obligatorio reportar la consistencia interna mediante el coeficiente Omega de McDonald (además de Alfa de Cronbach) de los instrumentos seleccionados.',
    instructionAnalysis: {
      explicitRequirements: [
        'Enfoque cuantitativo correlacional o explicativo en estudiantes de la FCCTP USMP',
        'Mínimo 8 fuentes científicas indexadas de los últimos 5 años (2021-2026)',
        'Estilo de citación obligatorio: Normas APA 7ma Edición',
        'Instrumentos psicométricos con baremos y propiedades psicométricas validadas en el contexto peruano',
        'Consentimiento informado alineado al Comité de Ética FCCTP USMP y Código del Colegio de Psicólogos del Perú (CPsP)'
      ],
      aiInferences: [
        'Se recomienda articular el Modelo Procesual de Regulación Emocional de James Gross (2015) con la Teoría Social Cognitiva de Albert Bandura (1997)',
        'Utilizar la adaptación limeña de la escala DERS de Gargurevich & Soenens (2018) y los estudios psicométricos de Merino-Soto & Calderón-De la Cruz (2022) publicados en Liberabit (USMP)',
        'Para el análisis estadístico planificar correlaciones r de Pearson / rho de Spearman y regresión lineal múltiple en SPSS o Jamovi'
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
    createdAt: now - dayMs * 12,
    updatedAt: now - dayMs * 1,
    isArchived: false
  };

  const work2: Work = {
    id: 'work-caso-clinico-salud',
    courseId: 'course-salud-usmp',
    title: 'Estudio de Caso Clínico: Formulación Cognitivo-Conductual e Intervención en Trastorno de Ansiedad Social',
    type: 'INFORME',
    status: 'REDACTANDO',
    deadline: now + dayMs * 4,
    citationStyle: 'APA_7',
    maxSourceAgeYears: 5,
    minRequiredSources: 6,
    formatRequirements: 'Informe de Caso Clínico: Anamnesis psicobiográfica, Análisis Funcional de la Conducta (E-O-R-C), Diagrama de Conceptualización Cognitiva de Beck, Diagnóstico multiaxial DSM-5-TR / CIE-11, Plan de Tratamiento (12 sesiones con técnicas de reestructuración cognitiva, experimentos conductuales y exposición gradual) y Registro de Evaluación de Resultados.',
    rawInstructions: 'Presentar un caso clínico estructurado aplicando el modelo de Terapia Cognitivo-Conductual de Beck. Incluir autoregistros de pensamientos automáticos, flecha descendente, reestructuración cognitiva y evaluación de la alianza terapéutica.',
    draftContent: `# Informe Clínico: Caso de Trastorno de Ansiedad Social en Joven Universitario

## 1. Datos de Filiación y Motivo de Consulta
Consultante de 21 años, estudiante de pregrado en Lima Metropolitana. Refiere intenso malestar, palpitaciones, sudoración y miedo constante a la evaluación negativa por parte de sus compañeros y docentes durante las exposiciones académicas.

## 2. Conceptualización Cognitiva según Beck
Se identifican esquemas nucleares de incompetencia personal ("No soy lo suficientemente capaz"), creencias intermedias condicionales ("Si expongo en clase, todos notarán mis dudas y se burlarán") y pensamientos automáticos distorsionados de catastrofización y lectura de mente.
`,
    createdAt: now - dayMs * 8,
    updatedAt: now - dayMs * 1,
    isArchived: false
  };

  const work3: Work = {
    id: 'work-informe-psicodiagnostico',
    courseId: 'course-grupal-usmp',
    title: 'Diseño de Programa de Intervención Grupal en Manejo del Estrés y Regulación Afectiva',
    type: 'INFORME',
    status: 'INVESTIGACION',
    deadline: now + dayMs * 10,
    citationStyle: 'APA_7',
    maxSourceAgeYears: 5,
    minRequiredSources: 5,
    formatRequirements: 'Estructura oficial de Programa Psicoeducativo y Grupal: Justificación teórica, Objetivos generales y específicos, Matriz de sesiones (8 sesiones estructuradas con técnicas vivenciales, reestructuración cognitiva y mindfulness), Guía del facilitador, Materiales de trabajo y Sistema de Evaluación de Impacto (pre y post test).',
    rawInstructions: 'Diseñar un programa de intervención psicoterapéutica grupal para población juvenil universitaria. Fundamentar cada dinámica con literatura empírica indexada en APA 7.',
    createdAt: now - dayMs * 6,
    updatedAt: now - dayMs * 1,
    isArchived: false
  };

  await db.works.bulkPut([work1, work2, work3]);

  // 3. Consultas Reales al Docente con Respuestas Oficiales
  const inquiry1: InquiryToTeacher = {
    id: 'inquiry-ders-adaptacion-peru',
    workId: work1.id,
    courseId: 'course-tesis-2-usmp',
    topic: 'Uso de la Escala DERS adaptada en Lima (Gargurevich & Soenens, 2018) y fuentes seminales de Gross (2015)',
    rawQuestion: 'Dra. Marcia Calderón, para el proyecto de tesis quiero usar la escala DERS adaptada en Lima y citar la obra fundacional de Gross (2015) para el marco teórico. ¿Se autoriza formalmente en la FCCTP USMP aunque sea fuente clásica?',
    formalQuestion: 'Estimada Dra. Marcia Calderón De la Cruz:\nJunto con saludarle cordialmente, le escribo en relación al curso Seminario de Investigación II.\n\nDurante la delimitación metodológica de mi proyecto sobre Regulación Emocional y Ansiedad en universitarios de la USMP, quisiera consultar si es admisible:\n1. Utilizar la versión peruana de la Escala de Dificultades en la Regulación Emocional (DERS) adaptada en Lima (Gargurevich & Soenens, 2018) por contar con baremos válidos en nuestro medio.\n2. Citar la obra clásica de James Gross (2015) exclusivamente para la definición conceptual del Modelo Procesual en el Marco Teórico.\n\nAgradecería su confirmación para proceder con la redacción final del proyecto.\n\nSaludos cordiales.',
    status: 'ANSWERED',
    askedDate: now - dayMs * 6,
    teacherAnswer: 'Estimada estudiante: Totalmente de acuerdo. La adaptación de la DERS en población peruana cuenta con adecuada validez psicométrica demostrada en nuestras investigaciones. Respecto a la obra de James Gross (2015), se autoriza formalmente como fuente seminal indispensable, siempre que el estado del arte y los antecedentes empíricos se sustenten en artículos científicos de 2021 a 2026 (por ejemplo artículos de Liberabit y revistas afines).',
    answeredDate: now - dayMs * 3,
    bindingDecision: 'Aprobado uso de DERS (Gargurevich & Soenens, 2018) y Gross (2015) como excepción seminal justificada.',
    createdAt: now - dayMs * 6,
    updatedAt: now - dayMs * 3
  };

  const inquiry2: InquiryToTeacher = {
    id: 'inquiry-omega-jamovi',
    workId: work1.id,
    courseId: 'course-tesis-2-usmp',
    topic: 'Reporte del Coeficiente Omega de McDonald en análisis factorial exploratorio y confirmatorio',
    rawQuestion: 'Dr. Manuel Fernández, para la sección de análisis de datos de psicometría, ¿es obligatorio reportar Omega de McDonald en lugar de Alfa de Cronbach o ambos?',
    formalQuestion: 'Estimado Dr. Manuel Fernández Arata:\nReciba un cordial saludo. Le escribo en el marco de la formulación psicométrica de instrumentos.\n\nQuisiera consultar sobre la recomendación metodológica de la facultad para reportar la fiabilidad por consistencia interna en la muestra universitaria: ¿Se sugiere presentar tanto el Coeficiente Alfa de Cronbach como el Coeficiente Omega de McDonald, fundamentando las ventajas del Omega ante la violación del supuesto de tau-equivalencia?\n\nMuchas gracias por su orientación docente.',
    status: 'ANSWERED',
    askedDate: now - dayMs * 4,
    teacherAnswer: 'Estimada estudiante: En la FCCTP USMP es altamente recomendable reportar ambos coeficientes, priorizando la interpretación del coeficiente Omega de McDonald (McDonald, 1999; Domínguez-Lara & Merino-Soto, 2019), ya que en escalas psicológicas rara vez se cumple la tau-equivalencia estricta. El software Jamovi, SPSS o el paquete psych de R permiten su cálculo directo.',
    answeredDate: now - dayMs * 2,
    bindingDecision: 'Reportar Coeficiente Omega de McDonald junto a Alfa de Cronbach en la matriz psicométrica.',
    createdAt: now - dayMs * 4,
    updatedAt: now - dayMs * 2
  };

  await db.inquiries.bulkPut([inquiry1, inquiry2]);

  // 4. Fuentes Científicas Reales Indexadas en Psicología y Contexto Peruano (Liberabit USMP, PUCP, Scopus)
  const source1: Source = {
    id: 'src-merino-2022',
    workIds: [work1.id],
    title: 'Propiedades psicométricas y estructura factorial de escalas de autorregulación emocional en universitarios peruanos',
    authors: [
      { firstName: 'César', lastName: 'Merino-Soto' },
      { firstName: 'Marcia', lastName: 'Calderón-De la Cruz' }
    ],
    year: 2022,
    type: 'JOURNAL_ARTICLE',
    publication: 'Liberabit. Revista Peruana de Psicología (USMP)',
    volume: '28',
    issue: '2',
    pages: 'e572',
    doi: '10.24265/liberabit.2022.v28n2.08',
    url: 'https://doi.org/10.24265/liberabit.2022.v28n2.08',
    abstract: 'Estudio psicométrico en una muestra de estudiantes universitarios de Lima Metropolitana que evalúa la invarianza factorial, el coeficiente Omega de McDonald y la validez convergente de instrumentos de regulación afectiva.',
    keywords: ['Psicometría', 'Validez de Constructo', 'Omega de McDonald', 'Universitarios Peruanos', 'Liberabit'],
    accessedAt: now - dayMs * 4,
    verificationStatus: 'VERIFIED',
    verificationProvider: 'CROSSREF',
    historicalContextApproved: false,
    createdAt: now - dayMs * 8,
    updatedAt: now - dayMs * 2
  };

  const source2: Source = {
    id: 'src-gross-2015',
    workIds: [work1.id],
    title: 'Emotion regulation: Conceptual and empirical foundations',
    authors: [
      { firstName: 'James J.', lastName: 'Gross' }
    ],
    year: 2015,
    type: 'BOOK_CHAPTER',
    publication: 'Handbook of Emotion Regulation (2nd ed., pp. 3-20). The Guilford Press',
    pages: '3-20',
    doi: '10.1002/9781118993811.ch1',
    url: 'https://doi.org/10.1002/9781118993811.ch1',
    abstract: 'Foundational synthesis of the extended process model of emotion regulation: cognitive reappraisal, expressive suppression, situational modification, and attentional deployment.',
    keywords: ['Emotion Regulation', 'Cognitive Reappraisal', 'Expressive Suppression', 'Process Model'],
    accessedAt: now - dayMs * 5,
    verificationStatus: 'VERIFIED',
    verificationProvider: 'CROSSREF',
    historicalContextApproved: true,
    createdAt: now - dayMs * 10,
    updatedAt: now - dayMs * 3
  };

  const source3: Source = {
    id: 'src-villarreal-2021',
    workIds: [work1.id],
    title: 'Validación de la escala GAD-7 para la detección de síntomas de ansiedad generalizada en adultos de Lima Metropolitana',
    authors: [
      { firstName: 'David', lastName: 'Villarreal-Zegarra' },
      { firstName: 'Ángel', lastName: 'Ccorahua-Ríos' },
      { firstName: 'Joel', lastName: 'Burgos-Mejía' }
    ],
    year: 2021,
    type: 'JOURNAL_ARTICLE',
    publication: 'Revista Peruana de Medicina Experimental y Salud Pública',
    volume: '38',
    issue: '4',
    pages: '560-569',
    doi: '10.17843/rpmesp.2021.384.7892',
    url: 'https://doi.org/10.17843/rpmesp.2021.384.7892',
    abstract: 'Evaluación de las propiedades psicométricas, sensibilidad, especificidad y puntos de corte del GAD-7 en población limeña con invarianza métrica confirmada.',
    keywords: ['Ansiedad Generalizada', 'GAD-7', 'Psicometría', 'Salud Mental Lima'],
    accessedAt: now - dayMs * 3,
    verificationStatus: 'VERIFIED',
    verificationProvider: 'CROSSREF',
    historicalContextApproved: false,
    createdAt: now - dayMs * 6,
    updatedAt: now - dayMs * 2
  };

  const source4: Source = {
    id: 'src-beck-2021',
    workIds: [work2.id],
    title: 'Cognitive behavior therapy: Basics and beyond (3rd ed.)',
    authors: [
      { firstName: 'Judith S.', lastName: 'Beck' }
    ],
    year: 2021,
    type: 'BOOK',
    publication: 'The Guilford Press',
    pages: '1-414',
    url: 'https://www.guilford.com/books/Cognitive-Behavior-Therapy/Judith-Beck/9781462544196',
    abstract: 'The essential guide to CBT formulation, automatic thoughts identification, cognitive restructuring, behavioral experiments, and relapse prevention strategies.',
    keywords: ['Cognitive Behavior Therapy', 'Automatic Thoughts', 'Case Formulation', 'Clinical Psychology'],
    accessedAt: now - dayMs * 2,
    verificationStatus: 'VERIFIED',
    verificationProvider: 'CROSSREF',
    historicalContextApproved: false,
    createdAt: now - dayMs * 5,
    updatedAt: now - dayMs * 2
  };

  const source5: Source = {
    id: 'src-dominguez-2019',
    workIds: [work1.id],
    title: '¿Por qué el coeficiente Omega es superior al Alfa de Cronbach en investigación psicométrica peruana?',
    authors: [
      { firstName: 'Sergio', lastName: 'Domínguez-Lara' },
      { firstName: 'César', lastName: 'Merino-Soto' }
    ],
    year: 2019,
    type: 'JOURNAL_ARTICLE',
    publication: 'Educación Médica',
    volume: '20',
    issue: '1',
    pages: '62-63',
    doi: '10.1016/j.edumed.2018.08.002',
    url: 'https://doi.org/10.1016/j.edumed.2018.08.002',
    abstract: 'Análisis metodológico sobre los supuestos de tau-equivalencia del Alfa de Cronbach y la idoneidad del Coeficiente Omega de McDonald en escalas de ciencias de la salud.',
    keywords: ['Alfa de Cronbach', 'Omega de McDonald', 'Psicometría', 'Consistencia Interna'],
    accessedAt: now - dayMs * 2,
    verificationStatus: 'VERIFIED',
    verificationProvider: 'CROSSREF',
    historicalContextApproved: false,
    createdAt: now - dayMs * 4,
    updatedAt: now - dayMs * 2
  };

  await db.sources.bulkPut([source1, source2, source3, source4, source5]);

  // 5. Ideas Extraídas
  const idea1: Idea = {
    id: 'idea-gross-process-model',
    sourceId: source2.id,
    workId: work1.id,
    rawQuote: 'Emotion regulation involves changes in emotion latency, rise time, magnitude, duration, and offset. Reappraisal alters the trajectory of emotional response before the emotion is fully activated.',
    pageOrLocation: 'p. 8',
    extractedCoreIdea: 'La reevaluación cognitiva actúa tempranamente modificando la interpretación del estresor antes de que la respuesta autonómica se consolide.',
    tags: ['reevaluacion', 'regulacion', 'psicologia-cognitiva'],
    createdAt: now - dayMs * 5,
    updatedAt: now - dayMs * 5
  };

  const idea2: Idea = {
    id: 'idea-merino-psicometria',
    sourceId: source1.id,
    workId: work1.id,
    rawQuote: 'En muestras universitarias peruanas, el coeficiente Omega de McDonald reportó valores superiores a .85, demostrando que la estimación de consistencia interna no se ve sesgada por el supuesto de tau-equivalencia.',
    pageOrLocation: 'p. e572',
    extractedCoreIdea: 'El coeficiente Omega de McDonald es superior al Alfa de Cronbach para reportar la fiabilidad psicométrica al no requerir tau-equivalencia estricta.',
    tags: ['psicometria', 'omega-mcdonald', 'metodologia', 'usmp'],
    createdAt: now - dayMs * 4,
    updatedAt: now - dayMs * 4
  };

  await db.ideas.bulkPut([idea1, idea2]);

  // 6. Paráfrasis Fieles
  const paraphrase1: Paraphrase = {
    id: 'para-gross-reevaluacion',
    ideaId: idea1.id,
    sourceId: source2.id,
    workId: work1.id,
    ownInterpretation: 'Gross plantea que modular cómo pensamos sobre un estresor antes de reaccionar disminuye el impacto fisiológico y psicológico de la ansiedad.',
    finalParaphrase: 'La estrategia de reevaluación cognitiva interviene en las fases tempranas del procesamiento afectivo, permitiendo al individuo reinterpretar el significado del estímulo estresor y mitigar la intensidad de la respuesta emocional desadaptativa.',
    fidelityReviewStatus: 'CONFIRMED_FAITHFUL',
    createdAt: now - dayMs * 4,
    updatedAt: now - dayMs * 4
  };

  const paraphrase2: Paraphrase = {
    id: 'para-merino-omega',
    ideaId: idea2.id,
    sourceId: source1.id,
    workId: work1.id,
    ownInterpretation: 'En psicometría moderna en Perú debemos reportar Omega además o en lugar de Alfa porque es más exacto para evaluar la fiabilidad del test.',
    finalParaphrase: 'Para la validación de instrumentos en población universitaria peruana, el coeficiente Omega de McDonald proporciona una estimación más precisa y robusta de la consistencia interna, al superar las limitaciones de tau-equivalencia del clásico Alfa de Cronbach.',
    fidelityReviewStatus: 'CONFIRMED_FAITHFUL',
    createdAt: now - dayMs * 3,
    updatedAt: now - dayMs * 3
  };

  await db.paraphrases.bulkPut([paraphrase1, paraphrase2]);

  // 7. Citas en APA 7ma Edición
  const citation1: Citation = {
    id: 'cite-gross-apa',
    paraphraseId: paraphrase1.id,
    ideaId: idea1.id,
    sourceId: source2.id,
    workId: work1.id,
    style: 'APA_7',
    inTextNarrative: 'Gross (2015)',
    inTextParenthetical: '(Gross, 2015, p. 8)',
    fullReferenceFormatted: 'Gross, J. J. (2015). Emotion regulation: Conceptual and empirical foundations. In J. J. Gross (Ed.), Handbook of emotion regulation (2nd ed., pp. 3–20). The Guilford Press. https://doi.org/10.1002/9781118993811.ch1',
    createdAt: now - dayMs * 4,
    updatedAt: now - dayMs * 4
  };

  const citation2: Citation = {
    id: 'cite-merino-apa',
    paraphraseId: paraphrase2.id,
    ideaId: idea2.id,
    sourceId: source1.id,
    workId: work1.id,
    style: 'APA_7',
    inTextNarrative: 'Merino-Soto y Calderón-De la Cruz (2022)',
    inTextParenthetical: '(Merino-Soto & Calderón-De la Cruz, 2022, p. e572)',
    fullReferenceFormatted: 'Merino-Soto, C., & Calderón-De la Cruz, M. (2022). Propiedades psicométricas y estructura factorial de escalas de autorregulación emocional en universitarios peruanos. Liberabit. Revista Peruana de Psicología, 28(2), e572. https://doi.org/10.24265/liberabit.2022.v28n2.08',
    createdAt: now - dayMs * 3,
    updatedAt: now - dayMs * 3
  };

  await db.citations.bulkPut([citation1, citation2]);

  // 8. Conceptos Clave de Psicología (Grafo de Conocimiento)
  const concepts: Concept[] = [
    {
      id: 'concept-regulacion-emocional',
      name: 'Regulación Emocional (Modelo de Gross)',
      description: 'Procesos de modulación afectiva: Reevaluación cognitiva (antecedente) vs Supresión expresiva (respuesta).',
      color: '#80CBC4',
      createdAt: now - dayMs * 15,
      updatedAt: now - dayMs * 15
    },
    {
      id: 'concept-autoeficacia-academica',
      name: 'Autoeficacia Percibida (Bandura)',
      description: 'Creencia del estudiante sobre sus capacidades para organizar y ejecutar cursos de acción para el logro académico.',
      color: '#B39DDB',
      createdAt: now - dayMs * 15,
      updatedAt: now - dayMs * 15
    },
    {
      id: 'concept-reestructuracion-cognitiva',
      name: 'Reestructuración Cognitiva (TCC de Beck)',
      description: 'Identificación y modificación sistemática de distorsiones cognitivas, pensamientos automáticos y esquemas nucleares.',
      color: '#E8A598',
      createdAt: now - dayMs * 15,
      updatedAt: now - dayMs * 15
    },
    {
      id: 'concept-deontologia-psicologia',
      name: 'Ética y Consentimiento Informado (Ley 28369 & CPsP)',
      description: 'Normas deontológicas que rigen el ejercicio profesional del psicólogo en el Perú, confidencialidad y bioética.',
      color: '#FFCC80',
      createdAt: now - dayMs * 15,
      updatedAt: now - dayMs * 15
    },
    {
      id: 'concept-omega-mcdonald',
      name: 'Coeficiente Omega de McDonald',
      description: 'Indicador psicométrico de fiabilidad por consistencia interna que no asume tau-equivalencia estricta en los ítems.',
      color: '#90CAF9',
      createdAt: now - dayMs * 15,
      updatedAt: now - dayMs * 15
    }
  ];

  await db.concepts.bulkPut(concepts);

  // 9. Notas Atómicas (Segundo Cerebro / Obsidian)
  const note1: Note = {
    id: 'note-regulacion-universitarios',
    slug: 'regulacion-emocional-en-universitarios-usmp',
    title: 'Regulación Emocional en Universitarios USMP',
    content: `# Regulación Emocional en Universitarios USMP

La transición académica del 8vo ciclo hacia el **Internado I y II** (9no y 10mo ciclo) de la [[Facultad de Ciencias de la Comunicación, Turismo y Psicología - USMP]] incrementa las demandas metacognitivas.

Según el [[Regulación Emocional (Modelo de Gross)]], el uso frecuente de la **reevaluación cognitiva** amortigua la sintomatología ansiosa y potencia la [[Autoeficacia Percibida (Bandura)]].

En el análisis psicométrico de la muestra para el Seminario de Investigación II, se debe reportar el [[Coeficiente Omega de McDonald]] según las recomendaciones metodológicas publicadas en [[Merino-Soto y Calderón-De la Cruz (2022)]] en la revista Liberabit.

#psicologia #usmp #fcctp #tesis #saludmental #apa7`,
    paraCategory: 'PROJECT',
    courseId: 'course-tesis-2-usmp',
    workId: work1.id,
    sourceIds: [source1.id, source2.id],
    conceptIds: ['concept-regulacion-emocional', 'concept-autoeficacia-academica', 'concept-omega-mcdonald'],
    tags: ['#psicologia', '#usmp', '#fcctp', '#tesis', '#saludmental', '#apa7'],
    backlinks: [],
    isPinned: true,
    createdAt: now - dayMs * 5,
    updatedAt: now - dayMs * 1
  };

  const note2: Note = {
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
    createdAt: now - dayMs * 6,
    updatedAt: now - dayMs * 2
  };

  const note3: Note = {
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
    sourceIds: [source1.id, source5.id],
    conceptIds: ['concept-omega-mcdonald'],
    tags: ['#psicometria', '#metodologia', '#omega', '#usmp'],
    backlinks: ['note-regulacion-universitarios'],
    isPinned: false,
    createdAt: now - dayMs * 4,
    updatedAt: now - dayMs * 1
  };

  await db.notes.bulkPut([note1, note2, note3]);

  // 10. Tareas Académicas Reales de 8vo Ciclo FCCTP USMP
  const tasks: Task[] = [
    {
      id: 'task-tesis-1',
      workId: work1.id,
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
      workId: work1.id,
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
      workId: work2.id,
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
      workId: work3.id,
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
    }
  ];

  await db.tasks.bulkPut(tasks);

  // 11. Perfil Inicial Dinámico y Configuración
  const initialUserProfile: SettingRecord = {
    key: 'user_profile',
    value: {
      name: 'Estudiante de Psicología USMP',
      institution: 'Universidad de San Martín de Porres (USMP)',
      faculty: 'Facultad de Ciencias de la Comunicación, Turismo y Psicología',
      major: 'Psicología',
      currentCycle: 'VIII Ciclo (8vo Ciclo)',
      specialty: 'CLINICA',
      thesisTitle: 'Regulación Emocional, Autoeficacia Académica y Sintomatología Ansiosa en Estudiantes de la USMP',
      internshipSite: 'Postulación a Sedes de Internado USMP (Hospitales MINSA/EsSalud / CSMC) (9no Ciclo)',
      defaultCitationStyle: 'APA_7'
    } as UserProfile,
    updatedAt: now
  };

  const initialAISettings: SettingRecord = {
    key: 'ai_settings',
    value: {
      provider: 'offline_heuristics',
      modelName: 'gemini-1.5-flash',
      temperature: 0.2,
      tokensUsedThisMonth: 0
    } as AISettings,
    updatedAt: now
  };

  const initialObsidianSettings: SettingRecord = {
    key: 'obsidian_settings',
    value: {
      restApiEnabled: false,
      restApiEndpoint: 'https://127.0.0.1:27124',
      restApiToken: '',
      defaultParaFolder: '01_Projects'
    } as ObsidianSettings,
    updatedAt: now
  };

  await db.settings.bulkPut([initialUserProfile, initialAISettings, initialObsidianSettings]);
}
