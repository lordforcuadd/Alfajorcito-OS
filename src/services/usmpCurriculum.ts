import type { CurriculumCourse } from '../types';

export const USMP_PSYCHOLOGY_CURRICULUM: CurriculumCourse[] = [
  // ─── I CICLO ───
  {
    code: 'PSI-101',
    name: 'Introducción a la Psicología',
    cycle: 1,
    credits: 4,
    type: 'OBLIGATORIO',
    prerequisites: [],
    area: 'CLINICA',
    description: 'Evolución epistemológica, escuelas psicológicas clásicas y contemporáneas, bases biopsicosociales del comportamiento y campos de aplicación profesional.',
    competencies: [
      'Identificar las principales corrientes teóricas y campos de acción de la psicología contemporánea.',
      'Analizar los fundamentos bio-psico-sociales del comportamiento humano con rigor conceptual.'
    ]
  },
  {
    code: 'PSI-102',
    name: 'Biología General y Genética Humana',
    cycle: 1,
    credits: 3,
    type: 'OBLIGATORIO',
    prerequisites: [],
    area: 'CLINICA',
    description: 'Bases celulares, genéticas y moleculares de los organismos vivos, herencia biológica y evolución orientada a las bases del comportamiento.',
    competencies: ['Comprender la relación entre genética, biología celular y neurobiología de la conducta.']
  },
  {
    code: 'HUM-103',
    name: 'Redacción y Comunicación Académica',
    cycle: 1,
    credits: 3,
    type: 'OBLIGATORIO',
    prerequisites: [],
    area: 'INVESTIGACION',
    description: 'Estrategias de comprensión lectora, producción de textos académicos universitarios y argumentación lógica con pautas de estilo.',
    competencies: ['Redactar ensayos y artículos académicos con coherencia, cohesión y rigor gramatical.']
  },
  {
    code: 'SOC-104',
    name: 'Realidad Nacional y Globalización',
    cycle: 1,
    credits: 3,
    type: 'OBLIGATORIO',
    prerequisites: [],
    area: 'SALUD_PUBLICA',
    description: 'Estructura social, económica, política e intercultural del Perú y su impacto en la salud mental comunitaria.',
    competencies: ['Evaluar problemáticas psicosociales peruanas desde un enfoque crítico y contextualizado.']
  },
  {
    code: 'MET-105',
    name: 'Métodos y Estrategias del Aprendizaje Universitario',
    cycle: 1,
    credits: 3,
    type: 'OBLIGATORIO',
    prerequisites: [],
    area: 'INVESTIGACION',
    description: 'Gestión del conocimiento, búsqueda en bases de datos científicas indexadas y autoeficacia académica.',
    competencies: ['Aplicar técnicas avanzadas de estudio y gestión bibliográfica en psicología.']
  },

  // ─── II CICLO ───
  {
    code: 'PSI-201',
    name: 'Procesos Cognitivos I (Atención, Percepción y Memoria)',
    cycle: 2,
    credits: 4,
    type: 'OBLIGATORIO',
    prerequisites: ['Introducción a la Psicología'],
    area: 'CLINICA',
    description: 'Estructuras y modelos computacionales de la atención, percepción sensorial, memoria de trabajo y memoria a largo plazo.',
    competencies: ['Evaluar e interpretar los procesos de codificación, almacenamiento y recuperación mnémica.']
  },
  {
    code: 'PSI-202',
    name: 'Neuroanatomía y Fisiología del Sistema Nervioso',
    cycle: 2,
    credits: 4,
    type: 'OBLIGATORIO',
    prerequisites: ['Biología General y Genética Humana'],
    area: 'CLINICA',
    description: 'Estructura del encéfalo, médula espinal, vías aferentes/eferentes, neurotransmisores y plasticidad cerebral.',
    competencies: ['Identificar sustratos neuroanatómicos de las funciones cognitivas y emocionales.']
  },
  {
    code: 'PSI-203',
    name: 'Psicología del Desarrollo I (Infancia y Niñez)',
    cycle: 2,
    credits: 3,
    type: 'OBLIGATORIO',
    prerequisites: ['Introducción a la Psicología'],
    area: 'EDUCATIVA',
    description: 'Hitos del desarrollo físico, cognitivo, psicomotor y socioemocional desde la etapa prenatal hasta la niñez intermedia.',
    competencies: ['Identificar patrones evolutivos y signos de alerta en el desarrollo infantil.']
  },
  {
    code: 'EST-204',
    name: 'Estadística Descriptiva Aplicada a las Ciencias Sociales',
    cycle: 2,
    credits: 3,
    type: 'OBLIGATORIO',
    prerequisites: [],
    area: 'INVESTIGACION',
    description: 'Tabulación de datos, medidas de tendencia central y dispersión, frecuencias y representación gráfica de variables psicológicas.',
    competencies: ['Organizar y resumir bases de datos empíricas con paquetes estadísticos.']
  },
  {
    code: 'PSI-205',
    name: 'Epistemología e Historia Crítica de la Psicología',
    cycle: 2,
    credits: 3,
    type: 'OBLIGATORIO',
    prerequisites: [],
    area: 'INVESTIGACION',
    description: 'Fundamentos epistemológicos del método científico, positivismo, constructivismo y enfoques emergentes en psicología.',
    competencies: ['Criticar paradigmas epistemológicos y su validez en la ciencia psicológica.']
  },

  // ─── III CICLO ───
  {
    code: 'PSI-301',
    name: 'Procesos Cognitivos II (Pensamiento, Lenguaje e Inteligencia)',
    cycle: 3,
    credits: 4,
    type: 'OBLIGATORIO',
    prerequisites: ['Procesos Cognitivos I'],
    area: 'CLINICA',
    description: 'Razonamiento lógico, toma de decisiones, solución de problemas, psicolingüística y teorías contemporáneas de la inteligencia.',
    competencies: ['Diseñar protocolos de evaluación de funciones ejecutivas y razonamiento formal.']
  },
  {
    code: 'PSI-302',
    name: 'Neurociencias del Comportamiento y Neuropsicología Básica',
    cycle: 3,
    credits: 4,
    type: 'OBLIGATORIO',
    prerequisites: ['Neuroanatomía y Fisiología del Sistema Nervioso'],
    area: 'CLINICA',
    description: 'Bases neurales de la emoción, motivación, ritmos circadianos, afasias, agnosias, apraxias y síndromes disejecutivos.',
    competencies: ['Reconocer alteraciones neuropsicológicas focales y difusas.']
  },
  {
    code: 'PSI-303',
    name: 'Psicología del Desarrollo II (Adolescencia, Adultez y Senectud)',
    cycle: 3,
    credits: 3,
    type: 'OBLIGATORIO',
    prerequisites: ['Psicología del Desarrollo I'],
    area: 'EDUCATIVA',
    description: 'Desarrollo de la identidad adolescente, crisis vitales del adulto joven y maduro, duelo y procesos de envejecimiento activo.',
    competencies: ['Comprender la dinámica biopsicosocial del ciclo vital humano completo.']
  },
  {
    code: 'EST-304',
    name: 'Estadística Inferencial y Probabilidades en Psicología',
    cycle: 3,
    credits: 3,
    type: 'OBLIGATORIO',
    prerequisites: ['Estadística Descriptiva'],
    area: 'INVESTIGACION',
    description: 'Pruebas paramétricas (t de Student, ANOVA) y no paramétricas (Chi-cuadrado, Mann-Whitney), correlaciones de Pearson y Spearman.',
    competencies: ['Contrastar hipótesis científicas seleccionando la prueba estadística adecuada.']
  },
  {
    code: 'PSI-305',
    name: 'Psicología de la Personalidad I',
    cycle: 3,
    credits: 3,
    type: 'OBLIGATORIO',
    prerequisites: ['Introducción a la Psicología'],
    area: 'CLINICA',
    description: 'Modelos psicodinámicos, humanistas, fenomenológicos y biotipológicos de la estructura de la personalidad.',
    competencies: ['Analizar rasgos y dinámicas estructurales de la personalidad individual.']
  },

  // ─── IV CICLO ───
  {
    code: 'PSI-401',
    name: 'Psicometría General y Teoría de los Test',
    cycle: 4,
    credits: 4,
    type: 'OBLIGATORIO',
    prerequisites: ['Estadística Inferencial'],
    area: 'INVESTIGACION',
    description: 'Teoría Clásica de los Test (TCT), Teoría de Respuesta al Ítem (TRI), validez de contenido, constructo y criterio, y confiabilidad.',
    competencies: ['Calcular y analizar coeficientes de validez y fiabilidad psicométrica.']
  },
  {
    code: 'PSI-402',
    name: 'Psicología Social y de las Relaciones Interpersonales',
    cycle: 4,
    credits: 3,
    type: 'OBLIGATORIO',
    prerequisites: ['Epistemología e Historia Crítica'],
    area: 'SALUD_PUBLICA',
    description: 'Actitudes, prejuicios, estereotipos, influencia social, dinámicas de grupo, apego social y conducta prosocial/agresiva.',
    competencies: ['Diseñar diagnósticos de fenómenos y tensiones psicosociales comunitarias.']
  },
  {
    code: 'PSI-403',
    name: 'Psicología del Aprendizaje y Modificación de Conducta',
    cycle: 4,
    credits: 3,
    type: 'OBLIGATORIO',
    prerequisites: ['Procesos Cognitivos II'],
    area: 'CLINICA',
    description: 'Condicionamiento clásico y operante, aprendizaje vicario, programas de reforzamiento y técnicas de modificación conductual.',
    competencies: ['Elaborar programas conductuales de adquisición, incremento y reducción de conductas.']
  },
  {
    code: 'PSI-404',
    name: 'Psicología de la Personalidad II (Modelos Rasguales y Factoriales)',
    cycle: 4,
    credits: 3,
    type: 'OBLIGATORIO',
    prerequisites: ['Psicología de la Personalidad I'],
    area: 'CLINICA',
    description: 'Modelo de los Cinco Grandes Factores (Big Five / NEO-PI-R), modelo HEXACO, teoría de Eysenck y aproximaciones bioconductuales.',
    competencies: ['Interpretar perfiles factoriales de personalidad y su estabilidad temporal.']
  },
  {
    code: 'PSI-405',
    name: 'Técnicas de Entrevista y Observación Psicológica',
    cycle: 4,
    credits: 3,
    type: 'OBLIGATORIO',
    prerequisites: ['Psicología de la Personalidad I'],
    area: 'CLINICA',
    description: 'Estructura de la entrevista clínica, fases de rapport, encuadre, registro observacional sistemático y lenguaje no verbal.',
    competencies: ['Conducir entrevistas diagnósticas estructuradas y redactar anamnesis psicológicas.']
  },

  // ─── V CICLO ───
  {
    code: 'PSI-501',
    name: 'Psicometría Aplicada (Construcción y Adaptación de Escalas)',
    cycle: 5,
    credits: 4,
    type: 'OBLIGATORIO',
    prerequisites: ['Psicometría General'],
    area: 'INVESTIGACION',
    description: 'Diseño de reactivos, análisis factorial exploratorio y confirmatorio (AFE/AFC), adaptación transcultural y baremación en Perú.',
    competencies: ['Construir y validar instrumentos psicométricos con Coeficiente Omega y Alfa ordinal.']
  },
  {
    code: 'PSI-502',
    name: 'Psicopatología I (Trastornos del Estado de Ánimo y Ansiedad)',
    cycle: 5,
    credits: 4,
    type: 'OBLIGATORIO',
    prerequisites: ['Neurociencias del Comportamiento', 'Psicología de la Personalidad II'],
    area: 'CLINICA',
    description: 'Semiología de las funciones psíquicas. Criterios diagnósticos DSM-5-TR y CIE-11 para depresión, ansiedad generalizada, TOC y TEPT.',
    competencies: ['Realizar diagnósticos diferenciales basados en manuales nosológicos internacionales.']
  },
  {
    code: 'PSI-503',
    name: 'Psicología Educativa y del Rendimiento Académico',
    cycle: 5,
    credits: 3,
    type: 'OBLIGATORIO',
    prerequisites: ['Psicología del Aprendizaje', 'Psicología del Desarrollo II'],
    area: 'EDUCATIVA',
    description: 'Teorías del aprendizaje escolar (Ausubel, Piaget, Vygotsky), motivación académica, clima de aula y orientación vocacional.',
    competencies: ['Diseñar proyectos de optimización del rendimiento y convivencia escolar.']
  },
  {
    code: 'PSI-504',
    name: 'Psicología Organizacional y del Trabajo',
    cycle: 5,
    credits: 3,
    type: 'OBLIGATORIO',
    prerequisites: ['Psicología Social'],
    area: 'ORGANIZACIONAL',
    description: 'Cultura y clima organizacional, motivación laboral, liderazgo transformacional, estrés laboral y comunicación interna.',
    competencies: ['Diagnosticar necesidades de intervención en organizaciones y empresas.']
  },
  {
    code: 'PSI-505',
    name: 'Evaluación Psicométrica de la Inteligencia y Habilidades',
    cycle: 5,
    credits: 3,
    type: 'OBLIGATORIO',
    prerequisites: ['Psicometría General'],
    area: 'CLINICA',
    description: 'Administración, calificación e interpretación de baterías de inteligencia: WAIS-IV, WISC-V, Matrices Progresivas de Raven y TONI-4.',
    competencies: ['Elaborar informes psicométricos de capacidad intelectual con perfil de fortalezas y debilidades.']
  },

  // ─── VI CICLO ───
  {
    code: 'PSI-601',
    name: 'Metodología de la Investigación Científica en Psicología',
    cycle: 6,
    credits: 4,
    type: 'INVESTIGACION',
    prerequisites: ['Psicometría Aplicada'],
    area: 'INVESTIGACION',
    description: 'Diseños no experimentales (transversales, longitudinales, correlacionales) y experimentales. Formulación de problemas e hipótesis.',
    competencies: ['Diseñar matrices de consistencia metodológica bajo directrices APA 7 y USMP.']
  },
  {
    code: 'PSI-602',
    name: 'Psicopatología II (Psicosis, Trastornos de la Personalidad y Neurodesarrollo)',
    cycle: 6,
    credits: 4,
    type: 'OBLIGATORIO',
    prerequisites: ['Psicopatología I'],
    area: 'CLINICA',
    description: 'Esquizofrenia y espectro psicótico, trastornos graves de la personalidad (Cluster A, B, C), TEA, TDAH y adicciones.',
    competencies: ['Diagnosticar patologías complejas y estructurar planes de derivación e interconsulta.']
  },
  {
    code: 'PSI-603',
    name: 'Evaluación y Diagnóstico Psicoeducativo',
    cycle: 6,
    credits: 3,
    type: 'OBLIGATORIO',
    prerequisites: ['Psicología Educativa', 'Evaluación de la Inteligencia'],
    area: 'EDUCATIVA',
    description: 'Dificultades específicas de aprendizaje (dislexia, discalculia, disgrafía), adaptaciones curriculares y pruebas psicopedagógicas.',
    competencies: ['Emitir informes psicopedagógicos integrales para comités de inclusión educativa.']
  },
  {
    code: 'PSI-604',
    name: 'Evaluación Psicométrica de la Personalidad',
    cycle: 6,
    credits: 3,
    type: 'OBLIGATORIO',
    prerequisites: ['Psicología de la Personalidad II', 'Psicometría Aplicada'],
    area: 'CLINICA',
    description: 'Administración e interpretación de inventarios objetivos de personalidad: MMPI-2, Millon (MCMI-IV), PAI y 16PF-5.',
    competencies: ['Integrar perfiles clínicos y rasgos patológicos de personalidad en informes formales.']
  },
  {
    code: 'PSI-605',
    name: 'Psicología Comunitaria y Salud Mental Pública',
    cycle: 6,
    credits: 3,
    type: 'OBLIGATORIO',
    prerequisites: ['Psicología Social'],
    area: 'SALUD_PUBLICA',
    description: 'Modelos de empoderamiento, investigación-acción participativa (IAP), redes comunitarias de soporte y Centros de Salud Mental Comunitaria.',
    competencies: ['Diseñar proyectos de prevención comunitaria del suicidio, violencia de género y consumo de drogas.']
  },

  // ─── VII CICLO ───
  {
    code: 'PSI-701',
    name: 'Seminario de Investigación en Psicología I (Marco Teórico y Estado del Arte)',
    cycle: 7,
    credits: 4,
    type: 'INVESTIGACION',
    prerequisites: ['Metodología de la Investigación'],
    area: 'INVESTIGACION',
    description: 'Planteamiento del problema de tesis, revisión sistemática de literatura indexada (Scopus, Web of Science, SciELO), justificación y marco teórico bajo APA 7.',
    competencies: [
      'Redactar revisiones sistemáticas de literatura con criterios PRISMA.',
      'Formular el marco teórico preliminar del proyecto de tesis de grado USMP.'
    ]
  },
  {
    code: 'PSI-702',
    name: 'Evaluación y Diagnóstico Clínico Integral',
    cycle: 7,
    credits: 4,
    type: 'OBLIGATORIO',
    prerequisites: ['Psicopatología II', 'Evaluación de la Personalidad'],
    area: 'CLINICA',
    description: 'Integración multimétodo de pruebas psicométricas, entrevista, historia clínica y examen mental para la emisión del informe psicológico clínico.',
    competencies: ['Redactar informes psicológicos clínicos integrados con juicio diagnóstico y pronóstico.']
  },
  {
    code: 'PSI-703',
    name: 'Psicología Familiar y Enfoques Sistémicos',
    cycle: 7,
    credits: 3,
    type: 'OBLIGATORIO',
    prerequisites: ['Psicología Social', 'Psicopatología I'],
    area: 'CLINICA',
    description: 'Estructura familiar, ciclo vital de la familia, genogramas, doble vínculo, comunicación sistémica y modelos de terapia familiar estructural.',
    competencies: ['Elaborar genogramas familiares diagnósticos e identificar patrones transgeneracionales.']
  },
  {
    code: 'PSI-704',
    name: 'Selección y Evaluación del Talento Humano por Competencias',
    cycle: 7,
    credits: 3,
    type: 'OBLIGATORIO',
    prerequisites: ['Psicología Organizacional'],
    area: 'ORGANIZACIONAL',
    description: 'Assessment Center, entrevistas por incidentes críticos (STAR), perfiles de puestos y pruebas psicométricas laborales.',
    competencies: ['Conducir procesos integrales de selección por competencias y emitir informes laborales.']
  },
  {
    code: 'PSI-705',
    name: 'Intervención y Asesoría Psicoeducativa',
    cycle: 7,
    credits: 3,
    type: 'OBLIGATORIO',
    prerequisites: ['Evaluación Psicoeducativa'],
    area: 'EDUCATIVA',
    description: 'Programas de tutoría escolar, prevención del bullying y ciberacoso, escuela para padres y desarrollo socioemocional.',
    competencies: ['Implementar talleres psicoeducativos para docentes, padres y estudiantes.']
  },

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
    prerequisites: ['Psicopatología II', 'Evaluación y Diagnóstico Clínico Integral'],
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
    prerequisites: ['Selección y Evaluación del Talento Humano'],
    area: 'ORGANIZACIONAL',
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
    prerequisites: ['Psicología Social y de las Relaciones Interpersonales'],
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
    prerequisites: ['Intervención y Asesoría Psicoeducativa'],
    area: 'EDUCATIVA',
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
