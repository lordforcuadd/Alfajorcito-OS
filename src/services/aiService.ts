import { db } from '../db';
import type { AISettings, AIProvider, InstructionAnalysis, CitationStyle, UserProfile, Note, Concept, Course, Work, Source } from '../types';

export interface AIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  isOfflineHeuristic: boolean;
  modelUsed?: string;
}

export interface GraphQueryContext {
  notes: Note[];
  concepts: Concept[];
  courses: Course[];
  works: Work[];
  sources?: Source[];
  userProfile?: UserProfile;
  history?: { sender: 'user' | 'ai'; text: string }[];
}

export interface GraphQueryResult {
  answer: string;
  modelUsed: string;
  matchedConcepts: string[];
  matchedNotes: string[];
  isOfflineHeuristic: boolean;
}

export interface ParaphraseFidelityResult {
  status: 'CONFIRMED_FAITHFUL' | 'NEEDS_ADJUSTMENT';
  feedback: string;
  providerUsed: AISettings['provider'];
  modelUsed?: string;
}

// Helper to get active AI settings from IndexedDB if not explicitly passed
async function getEffectiveAISettings(passedSettings?: AISettings): Promise<AISettings> {
  if (passedSettings) return passedSettings;
  try {
    const record = await db.settings.get('ai_settings');
    if (record?.value) {
      return record.value as AISettings;
    }
  } catch (err) {
    console.warn('Could not read ai_settings from db:', err);
  }
  return {
    provider: 'offline_heuristics'
  };
}

// 1. Test AI Connection (For Settings Modal Verification)
export async function testAIConnection(settings: AISettings): Promise<{ success: boolean; message: string; modelUsed?: string }> {
  if (settings.provider === 'offline_heuristics') {
    return {
      success: true,
      message: 'Motor heurístico offline activo. No requiere conexión externa ni API key.',
      modelUsed: 'Heurística Local Offline'
    };
  }

  if (!settings.apiKey && settings.provider !== 'ollama') {
    return {
      success: false,
      message: 'Por favor ingresa tu API Key para probar la conexión.'
    };
  }

  try {
    const testPrompt = `Responde brevemente en una sola frase confirmando la conexión para Alfajorcito OS.`;
    const response = await callLLM(testPrompt, settings);
    if (response) {
      return {
        success: true,
        message: `¡Conexión exitosa con ${settings.provider.toUpperCase()} (${response.modelUsed})! Respuesta: "${response.text.slice(0, 100).trim()}"`,
        modelUsed: response.modelUsed
      };
    }
    return {
      success: false,
      message: 'No se recibió respuesta del proveedor. Revisa que tu API key y el nombre del modelo sean correctos.'
    };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      message: `Error al conectar: ${errMsg}`
    };
  }
}

// 2. Intelligent Instruction & Rubric Analyzer (LLM + Offline fallback)
export async function analyzeInstructionsWithAI(
  instructionsText: string,
  explicitSettings?: AISettings
): Promise<InstructionAnalysis> {
  const effectiveSettings = await getEffectiveAISettings(explicitSettings);

  if (effectiveSettings?.apiKey && effectiveSettings.provider !== 'offline_heuristics') {
    try {
      const prompt = `Eres un docente universitario y tutor experto en metodología de investigación para la carrera de Psicología (USMP / Normas APA 7).
Un estudiante te entrega las siguientes indicaciones o consigna en texto plano/informal para su trabajo académico:

Consigna del estudiante / docente:
"""
${instructionsText}
"""

TAREA:
1. Transcribe, interpreta y mejora la consigna: extrae los objetivos de aprendizaje, ejes temáticos y requisitos formales con lenguaje riguroso y académico.
2. Si la consigna contiene faltas de ortografía o es informal, redacta los requisitos oficiales de forma impecable y clara.
3. Propón inferencias metodológicas profundas (teorías psicológicas aplicables, autores clave, estructura recomendada con Introducción, Ejes de Desarrollo y Conclusiones).
4. Detecta posibles dudas o ambigüedades clave para consultar al docente.

Devuelve EXACTAMENTE un objeto JSON con esta estructura:
{
  "explicitRequirements": [
    "Requisito formal 1 (e.g. Redacción con palabras propias y paráfrasis estricta para evitar plagio)",
    "Requisito formal 2 (e.g. Análisis del desarrollo psicológico infantil y su interacción con el entorno)",
    "Requisito formal 3 (e.g. Estrategias de intervención y acompañamiento de los padres/cuidadores)"
  ],
  "aiInferences": [
    "Estructura recomendada basada en APA 7: Introducción con justificación del tema, Marco conceptual (Teoría Ecológica / Estilos Parentales), Desarrollo analítico y Conclusiones",
    "Marco teórico sugerido: Integrar enfoques contemporáneos de psicología del desarrollo infantil y modelos de parentalidad positiva",
    "Rigor metodológico: Respaldar cada afirmación con fuentes empíricas indexadas en SciELO, Scopus o Redalyc de los últimos 5 años"
  ],
  "deliverableFormat": "Ensayo Académico / Monografía (PDF o Google Docs en formato APA 7)",
  "wordCountTarget": 1500,
  "citationStyleExpected": "APA_7",
  "maxSourceAgeYears": 5,
  "detectedQuestionsForTeacher": [
    "¿Existe una extensión mínima o máxima de palabras / páginas especificada para la entrega?",
    "¿Se requiere un número mínimo de fuentes académicas indexadas?"
  ]
}

Responde ÚNICAMENTE con el objeto JSON sin bloques de código ni texto adicional.`;

      const res = await callLLM(prompt, effectiveSettings);
      if (res && res.text) {
        const jsonMatch = res.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            explicitRequirements: Array.isArray(parsed.explicitRequirements) && parsed.explicitRequirements.length > 0
              ? parsed.explicitRequirements
              : ['Redacción con palabras propias (evitar plagio)', 'Abordar la temática central solicitada'],
            aiInferences: Array.isArray(parsed.aiInferences) && parsed.aiInferences.length > 0
              ? parsed.aiInferences
              : ['Estructurar el trabajo con Introducción, Desarrollo conceptual y Conclusiones'],
            deliverableFormat: parsed.deliverableFormat || 'Documento académico (PDF/Word)',
            wordCountTarget: typeof parsed.wordCountTarget === 'number' ? parsed.wordCountTarget : undefined,
            citationStyleExpected: parsed.citationStyleExpected || 'APA_7',
            maxSourceAgeYears: typeof parsed.maxSourceAgeYears === 'number' ? parsed.maxSourceAgeYears : 5,
            detectedQuestionsForTeacher: Array.isArray(parsed.detectedQuestionsForTeacher)
              ? parsed.detectedQuestionsForTeacher
              : []
          };
        }
      }
    } catch (err) {
      console.warn('Error analyzing instructions with LLM, falling back to offline:', err);
    }
  }

  return analyzeInstructionsOffline(instructionsText);
}

// 2b. Offline Heuristic Instruction Analyzer (100% offline, zero tokens)
export function analyzeInstructionsOffline(instructionsText: string): InstructionAnalysis {
  const lines = instructionsText.split('\n').map((l) => l.trim()).filter(Boolean);
  const explicitRequirements: string[] = [];
  const aiInferences: string[] = [];
  const detectedQuestions: string[] = [];
  let deliverableFormat = 'Documento académico (PDF/Word)';
  let wordCountTarget: number | undefined;
  let maxSourceAgeYears = 5;
  let citationStyleExpected: CitationStyle = 'APA_7';

  // Heuristic regex scanning
  const wordCountMatch = instructionsText.match(/(\d{3,5})\s*(?:a|-)?\s*(\d{3,5})?\s*palabras/i);
  if (wordCountMatch) {
    if (wordCountMatch[2]) {
      wordCountTarget = parseInt(wordCountMatch[2], 10);
      explicitRequirements.push(`Extensión requerida: ${wordCountMatch[1]} a ${wordCountMatch[2]} palabras`);
    } else {
      wordCountTarget = parseInt(wordCountMatch[1], 10);
      explicitRequirements.push(`Extensión requerida: aprox. ${wordCountMatch[1]} palabras`);
    }
  }

  // Citation style heuristics
  if (/apa\s*7/i.test(instructionsText) || /normas\s*apa/i.test(instructionsText)) {
    citationStyleExpected = 'APA_7';
    explicitRequirements.push('Estilo de citación obligatorio: Normas APA 7ma Edición');
  } else if (/mla/i.test(instructionsText)) {
    citationStyleExpected = 'MLA_9';
    explicitRequirements.push('Estilo de citación: MLA 9na Edición');
  } else if (/ieee/i.test(instructionsText)) {
    citationStyleExpected = 'IEEE';
    explicitRequirements.push('Estilo de citación: IEEE (numérico)');
  } else if (/vancouver/i.test(instructionsText)) {
    citationStyleExpected = 'VANCOUVER';
    explicitRequirements.push('Estilo de citación: Vancouver');
  } else if (/chicago/i.test(instructionsText)) {
    citationStyleExpected = 'CHICAGO_AUTHOR_DATE';
    explicitRequirements.push('Estilo de citación: Chicago');
  }

  // Source count & age
  const sourceCountMatch = instructionsText.match(/(?:m[ií]nimo|al\s*menos)\s*(\d+)\s*fuentes/i);
  if (sourceCountMatch) {
    explicitRequirements.push(`Mínimo de fuentes académicas: ${sourceCountMatch[1]} fuentes`);
  }

  const ageMatch = instructionsText.match(/(\d+)\s*(?:a[ñn]os|a[ñn]o)/i);
  if (ageMatch && parseInt(ageMatch[1], 10) <= 10) {
    maxSourceAgeYears = parseInt(ageMatch[1], 10);
    explicitRequirements.push(`Antigüedad máxima de fuentes: últimos ${maxSourceAgeYears} años`);
  }

  // Format
  if (/pdf/i.test(instructionsText)) {
    deliverableFormat = 'Archivo PDF formateado';
  } else if (/google\s*docs/i.test(instructionsText)) {
    deliverableFormat = 'Enlace a Google Docs con permisos de edición';
  }

  // Fallback explicit lines with smart clause splitting
  if (explicitRequirements.length === 0) {
    if (lines.length > 1) {
      lines.slice(0, 5).forEach((line) => {
        if (line.length > 5 && line.length < 200) {
          explicitRequirements.push(line);
        }
      });
    } else if (instructionsText.trim()) {
      // Split single-line run-on consignas by connectors (y como, y que, además, también, sobre)
      const clauses = instructionsText
        .split(/(?:,|\.|\by como\b|\by que\b|\badem[aá]s\b|\btambi[eé]n\b)/i)
        .map((c) => c.trim())
        .filter((c) => c.length > 8);

      if (clauses.length > 0) {
        clauses.slice(0, 5).forEach((c) => {
          const capitalized = c.charAt(0).toUpperCase() + c.slice(1);
          explicitRequirements.push(capitalized);
        });
      } else {
        explicitRequirements.push(instructionsText.trim());
      }
    }
  }

  // Intelligent Inferences
  aiInferences.push('Estructura recomendada basada en APA 7: Introducción (delimitación del tema), Desarrollo temático sustentado y Conclusiones.');
  aiInferences.push('Rigor académico: Utilizar terminología psicológica formal y evitar afirmaciones categóricas sin respaldo empírico.');
  aiInferences.push('Consideración metodológica: Asegurar la integración de teoría psicológica contemporánea respaldada por evidencia científica.');

  if (instructionsText.toLowerCase().includes('ensayo') || instructionsText.toLowerCase().includes('crítico')) {
    aiInferences.push('Se sugiere incluir una sección explícita de discusión o contraargumentación para robustecer la postura crítica.');
  }

  detectedQuestions.push('¿Existe un número mínimo o máximo de páginas o fuentes obligatorias especificado por la cátedra?');
  detectedQuestions.push('¿Se permite incluir fuentes de contexto histórico que superen el límite de antigüedad si se justifican en el marco teórico?');

  return {
    explicitRequirements,
    aiInferences,
    deliverableFormat,
    wordCountTarget,
    citationStyleExpected,
    maxSourceAgeYears,
    detectedQuestionsForTeacher: detectedQuestions
  };
}

// Helper to get active user profile from IndexedDB
async function getEffectiveUserProfile(passedProfile?: Partial<UserProfile>): Promise<UserProfile> {
  if (passedProfile && passedProfile.name) {
    return passedProfile as UserProfile;
  }
  try {
    const record = await db.settings.get('user_profile');
    if (record?.value) {
      return record.value as UserProfile;
    }
  } catch (err) {
    console.warn('Could not read user_profile from db:', err);
  }
  return {
    name: 'Estudiante',
    institution: 'Universidad',
    faculty: 'Facultad',
    major: 'Carrera',
    currentCycle: 'Ciclo Actual',
    defaultCitationStyle: 'APA_7'
  };
}

// 3. Formalize Teacher Question Heuristically or via LLM
export async function formulateQuestionForTeacher(
  rawDoubt: string,
  courseName: string,
  teacherName?: string,
  explicitSettings?: AISettings,
  explicitProfile?: Partial<UserProfile>
): Promise<string> {
  const teacherGreeting = teacherName ? `Estimado/a ${teacherName}` : 'Estimado/a profesor/a';
  const effectiveSettings = await getEffectiveAISettings(explicitSettings);
  const profile = await getEffectiveUserProfile(explicitProfile);

  const studentName = profile.name || 'Estudiante';
  const institution = profile.institution || 'Universidad';
  const facultyMajor = [profile.faculty, profile.major].filter(Boolean).join(' - ') || 'Carrera';
  const cycle = String(profile.currentCycle || 'Ciclo Actual');

  if (effectiveSettings?.apiKey && effectiveSettings.provider !== 'offline_heuristics') {
    try {
      const prompt = `Actúa como un asistente académico universitario para la Escuela Profesional de Psicología.
Transforma la siguiente duda informal de una estudiante en un mensaje de correo electrónico o consulta formal, muy respetuoso, conciso y pedagógicamente claro para el docente.

Contexto Académico:
- Asignatura: ${courseName}
- Docente: ${teacherName || 'Docente de la asignatura'}
- Duda de la estudiante: "${rawDoubt}"
- Estudiante emisora: ${studentName}
- Carrera e Institución: ${facultyMajor}, ${cycle} - ${institution}

REGLAS ESTRICTAS DE RESPUESTA:
1. Redacta el correo completo listo para enviar, empezando con el saludo apropiado al docente.
2. Explica la duda de forma clara, fundamentada y educada.
3. Firma al final ÚNICAMENTE con los datos reales de la estudiante:
   Atentamente,
   ${studentName}
   ${profile.major || 'Psicología'} (${cycle})
   ${institution}
4. PROHIBIDO TERMINANTEMENTE usar corchetes, marcadores de posición o variables genéricas como "[Nombre del estudiante]", "[Código de estudiante]", "[Carrera / Ciclo]" o similares. Todos los datos ya están especificados.
5. Devuelve ÚNICAMENTE el texto del mensaje redactado, sin introducciones ni comentarios adicionales.`;

      const res = await callLLM(prompt, effectiveSettings);
      if (res && res.text) {
        // Defensive cleanup: remove any bracketed placeholders if the model still generated them
        const cleaned = res.text
          .replace(/\[\s*Nombre del estudiante\s*\]/gi, studentName)
          .replace(/\[\s*Código de estudiante\s*\]/gi, '')
          .replace(/\[\s*Código\s*\]/gi, '')
          .replace(/\[\s*Carrera\s*\/\s*Ciclo\s*\]/gi, `${profile.major || 'Psicología'} (${cycle})`)
          .replace(/\[\s*Carrera\s*\]/gi, profile.major || 'Psicología')
          .replace(/\[\s*Ciclo\s*\]/gi, cycle)
          .replace(/\[\s*Universidad\s*\]/gi, institution)
          .replace(/\n\s*\n\s*\n/g, '\n\n')
          .trim();
        return cleaned;
      }
    } catch (err) {
      console.warn('Error in LLM call, falling back to heuristic:', err);
    }
  }

  // Heuristic Template with Real Student Profile Signature
  return `${teacherGreeting}:
Junto con saludarle cordialmente, le escribo en relación al curso ${courseName}.

Durante la preparación de la entrega académica, me ha surgido una consulta puntual con respecto a las directrices:
"${rawDoubt.trim()}"

Agradecería mucho su orientación y criterio al respecto para proceder de acuerdo con las expectativas de la asignatura.

Quedo atenta a sus comentarios.

Atentamente,
${studentName}
${profile.major || 'Psicología'} (${cycle})
${institution}`;
}

// 4. Paraphrase Fidelity Review
export async function checkParaphraseFidelity(
  originalQuote: string,
  paraphraseText: string,
  explicitSettings?: AISettings
): Promise<ParaphraseFidelityResult> {
  const effectiveSettings = await getEffectiveAISettings(explicitSettings);

  if (effectiveSettings?.apiKey && effectiveSettings.provider !== 'offline_heuristics') {
    try {
      const prompt = `Eres un auditor académico experto en integridad epistemológica y normas APA 7 en Psicología.
Evalúa con máximo rigor científico si la siguiente paráfrasis cumple con los estándares universitarios de fidelidad conceptual y prevención de plagio.

Texto original de la fuente académica:
"${originalQuote}"

Paráfrasis propuesta por la estudiante:
"${paraphraseText}"

Criterios de evaluación:
1. Fidelidad Semántica: ¿Conserva con exactitud la idea central y los hallazgos del autor sin distorsionar ni inventar conceptos?
2. Prevención de Plagio Léxico & Estructural: ¿Está formulada con vocabulario técnico propio y estructura sintáctica original, sin copiar frases textuales consecutivas ni calcar la sintaxis original?

Devuelve ÚNICAMENTE un objeto JSON válido con este formato exacto:
{
  "status": "CONFIRMED_FAITHFUL",
  "feedback": "Explicación académica clara en español de 1 a 2 oraciones."
}
(Si detectas plagio potencial, solapamiento excesivo o distorsión del sentido, usa "status": "NEEDS_ADJUSTMENT" con sugerencias específicas de mejora).`;

      const res = await callLLM(prompt, effectiveSettings);
      if (res && res.text) {
        const jsonMatch = res.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            status: parsed.status === 'CONFIRMED_FAITHFUL' ? 'CONFIRMED_FAITHFUL' : 'NEEDS_ADJUSTMENT',
            feedback: parsed.feedback || 'Evaluación completada con inteligencia artificial.',
            providerUsed: res.providerUsed,
            modelUsed: res.modelUsed
          };
        }
      }
    } catch (err) {
      console.warn('Error reviewing fidelity via LLM:', err);
    }
  }

  // Heuristic check: check word overlap / similarity
  const origWords = new Set(originalQuote.toLowerCase().split(/\W+/).filter((w) => w.length > 4));
  const paraWords = paraphraseText.toLowerCase().split(/\W+/).filter((w) => w.length > 4);
  const overlap = paraWords.filter((w) => origWords.has(w));
  const overlapRatio = paraWords.length > 0 ? overlap.length / paraWords.length : 0;

  if (paraphraseText.trim().length < 15) {
    return {
      status: 'NEEDS_ADJUSTMENT',
      feedback: 'La paráfrasis es demasiado breve o incompleta para reflejar la idea original con suficiente rigor.',
      providerUsed: 'offline_heuristics',
      modelUsed: 'Heurística Local Offline'
    };
  }

  if (overlapRatio > 0.65) {
    return {
      status: 'NEEDS_ADJUSTMENT',
      feedback: 'Advertencia de fidelidad léxica: La paráfrasis contiene demasiadas palabras idénticas al original. Se recomienda reestructurar con vocabulario propio.',
      providerUsed: 'offline_heuristics',
      modelUsed: 'Heurística Local Offline'
    };
  }

  return {
    status: 'CONFIRMED_FAITHFUL',
    feedback: 'La paráfrasis demuestra comprensión adecuada y reformulación léxica sin plagio evidente.',
    providerUsed: 'offline_heuristics',
    modelUsed: 'Heurística Local Offline'
  };
}


// Memory cache of verified working model per (API Key + Requested Model) combination
const verifiedGeminiModelCache = new Map<string, string>();

export function resolveTokenCount(
  previous: { tokensUsedThisMonth?: number; tokensMonthKey?: string },
  addedTokens: number,
  now: Date = new Date()
): { tokensUsedThisMonth: number; tokensMonthKey: string } {
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  if (previous.tokensMonthKey !== currentMonthKey) {
    return {
      tokensUsedThisMonth: addedTokens,
      tokensMonthKey: currentMonthKey
    };
  }
  return {
    tokensUsedThisMonth: (previous.tokensUsedThisMonth || 0) + addedTokens,
    tokensMonthKey: currentMonthKey
  };
}

async function trackTokensUsed(estimatedCount: number) {
  try {
    const rec = await db.settings.get('ai_settings');
    if (rec?.value) {
      const val = rec.value as AISettings;
      const updated = resolveTokenCount(
        { tokensUsedThisMonth: val.tokensUsedThisMonth, tokensMonthKey: val.tokensMonthKey },
        estimatedCount
      );
      await db.settings.put({
        key: 'ai_settings',
        value: {
          ...val,
          tokensUsedThisMonth: updated.tokensUsedThisMonth,
          tokensMonthKey: updated.tokensMonthKey
        },
        updatedAt: Date.now()
      });
    }
  } catch {
    // ignore
  }
}

// Query available models from Gemini ListModels endpoint using secure headers
async function discoverSupportedGeminiModels(key: string): Promise<string[]> {
  try {
    const listUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
    const listRes = await fetch(listUrl, {
      headers: {
        'x-goog-api-key': key
      },
      signal: AbortSignal.timeout(6000)
    });
    if (listRes.ok) {
      const listData = await listRes.json();
      return (listData.models || [])
        .filter((m: { supportedGenerationMethods?: string[] }) =>
          (m.supportedGenerationMethods || []).includes('generateContent')
        )
        .map((m: { name?: string }) => (m.name || '').replace(/^models\//, ''))
        .filter(Boolean);
    }
  } catch {
    // ignore
  }
  return [];
}

async function callGemini(
  prompt: string,
  key: string,
  requestedModel?: string,
  temperature = 0.2
): Promise<{ text: string; modelUsed: string } | null> {
  const cleanModel = (requestedModel || '').trim().replace(/^models\//, '');
  const targetModel = cleanModel || 'gemini-2.5-flash';
  const cacheKey = `${key}:${targetModel}`;

  // 1. Try cached verified model first (instant, 0 errors!)
  const cachedModel = verifiedGeminiModelCache.get(cacheKey);
  if (cachedModel) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${cachedModel}:generateContent`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': key
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature }
        }),
        signal: AbortSignal.timeout(10000)
      });
      if (res.ok) {
        const data = await res.json();
        return {
          text: data.candidates?.[0]?.content?.parts?.[0]?.text || '',
          modelUsed: `${cachedModel} (Gemini API)`
        };
      }
    } catch {
      verifiedGeminiModelCache.delete(cacheKey);
    }
  }

  // 2. Build candidate list: User targetModel ALWAYS FIRST, then official stable fallbacks
  const candidateList = [
    targetModel,
    'gemini-2.5-flash',
    'gemini-1.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-pro'
  ].filter((m, idx, arr) => arr.indexOf(m) === idx);

  let lastError: Error | null = null;

  // 3. Try candidates in order
  for (const model of candidateList) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': key
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature }
        }),
        signal: AbortSignal.timeout(10000)
      });

      if (res.ok) {
        const data = await res.json();
        verifiedGeminiModelCache.set(cacheKey, model);
        return {
          text: data.candidates?.[0]?.content?.parts?.[0]?.text || '',
          modelUsed: `${model} (Gemini API)`
        };
      }

      const errText = await res.text();
      let parsedErrMsg = '';
      try {
        const parsed = JSON.parse(errText);
        parsedErrMsg = parsed.error?.message || '';
      } catch {
        parsedErrMsg = errText;
      }

      if (parsedErrMsg.includes('API_KEY_INVALID') || parsedErrMsg.includes('API key not valid')) {
        throw new Error('API key de Gemini no válida o deshabilitada.');
      }
      lastError = new Error(parsedErrMsg || `HTTP ${res.status}: ${res.statusText}`);
    } catch (e) {
      if (e instanceof Error && (e.message.includes('API_KEY_INVALID') || e.message.includes('API key de Gemini'))) {
        throw e;
      }
      lastError = e instanceof Error ? e : new Error(String(e));
    }
  }

  if (lastError) throw lastError;
  return null;
}

export interface LLMCallResult {
  text: string;
  modelUsed: string;
  providerUsed: AIProvider;
}

// Low-level LLM caller supporting Gemini, OpenAI, OpenRouter, and Ollama
async function callLLM(prompt: string, settings: AISettings): Promise<LLMCallResult | null> {
  const { provider, apiKey, modelName, ollamaEndpoint } = settings;

  let resultText: string | null = null;
  let resolvedModel = modelName || '';

  if (provider === 'gemini') {
    const geminiRes = await callGemini(prompt, apiKey || '', modelName, settings.temperature ?? 0.2);
    if (geminiRes) {
      resultText = geminiRes.text;
      resolvedModel = geminiRes.modelUsed;
    }
  } else if (provider === 'openai' || provider === 'openrouter') {
    resolvedModel = modelName || (provider === 'openrouter' ? 'meta-llama/llama-3.3-70b-instruct' : 'gpt-4o-mini');
    const endpoint =
      provider === 'openrouter'
        ? 'https://openrouter.ai/api/v1/chat/completions'
        : 'https://api.openai.com/v1/chat/completions';

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: resolvedModel,
        messages: [{ role: 'user', content: prompt }],
        temperature: settings.temperature ?? 0.2
      }),
      signal: AbortSignal.timeout(10000)
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`HTTP ${res.status}: ${errText.slice(0, 120)}`);
    }
    const data = await res.json();
    resultText = data.choices?.[0]?.message?.content || null;
  } else if (provider === 'ollama') {
    resolvedModel = modelName || 'llama3';
    const endpoint = (ollamaEndpoint || 'http://localhost:11434').replace(/\/+$/, '') + '/api/generate';
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: resolvedModel,
        prompt,
        stream: false
      }),
      signal: AbortSignal.timeout(12000)
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`HTTP ${res.status}: ${errText.slice(0, 120)}`);
    }
    const data = await res.json();
    resultText = data.response || null;
  }

  if (resultText) {
    const estimated = Math.ceil((prompt.length + resultText.length) / 4);
    trackTokensUsed(estimated);
    return {
      text: resultText,
      modelUsed: resolvedModel || provider,
      providerUsed: provider
    };
  }

  return null;
}

// ─── KNOWLEDGE GRAPH AI COPILOT / CHATBOT ───
export async function queryGraphAssistant(
  userQuery: string,
  context: GraphQueryContext,
  passedSettings?: AISettings
): Promise<GraphQueryResult> {
  const settings = await getEffectiveAISettings(passedSettings);
  const activeNotes = (context.notes || []).filter((n) => n.paraCategory !== 'ARCHIVE');
  const activeConcepts = context.concepts || [];
  const activeCourses = (context.courses || []).filter((c) => !c.isArchived);
  const activeWorks = (context.works || []).filter((w) => !w.isArchived);

  // Retrieve user profile if not passed
  let userProfile = context.userProfile;
  if (!userProfile) {
    try {
      const rec = await db.settings.get('user_profile');
      if (rec?.value) userProfile = rec.value as UserProfile;
    } catch {
      // Gracefully handled
    }
  }

  const studentName = userProfile?.name || 'Estudiante';
  const institution = userProfile?.institution || 'Institución Universitaria';
  const faculty = userProfile?.faculty || '';
  const cycle = userProfile?.currentCycle || '';
  const specialty = userProfile?.specialty === 'CLINICA' ? 'Psicología Clínica' : userProfile?.specialty || userProfile?.major || 'Psicología';
  const thesisTitle = userProfile?.thesisTitle || '';
  const internshipGoal = userProfile?.internshipSite || '';

  const profileLines = [
    studentName ? `- Estudiante: ${studentName}` : '',
    institution ? `- Universidad / Institución: ${institution}` : '',
    faculty ? `- Facultad: ${faculty}` : '',
    specialty ? `- Carrera / Especialidad: ${specialty}` : '',
    cycle ? `- Ciclo Académico: ${cycle}` : '',
    thesisTitle ? `- Proyecto de Tesis / Investigación: "${thesisTitle}"` : '',
    internshipGoal ? `- Meta de Formación / Prácticas: ${internshipGoal}` : ''
  ].filter(Boolean).join('\n');

  // Extract quick matching items for highlighting
  const queryLower = userQuery.toLowerCase();
  const matchedConcepts = activeConcepts
    .filter((c) => queryLower.includes(c.name.toLowerCase()) || c.name.toLowerCase().includes(queryLower))
    .map((c) => c.name);
  const matchedNotes = activeNotes
    .filter((n) => queryLower.includes(n.title.toLowerCase()) || n.title.toLowerCase().includes(queryLower))
    .map((n) => n.title);

  // 1. Try Online LLM First
  if (settings.provider !== 'offline_heuristics' && (settings.apiKey || settings.provider === 'ollama')) {
    try {
      const conceptsSummary = activeConcepts
        .map((c) => `- [[${c.name}]]: ${c.description || 'Concepto clave'}`)
        .join('\n');

      const notesSummary = activeNotes
        .map((n) => {
          const cleanSnippet = n.content.replace(/[#*`_]/g, '').slice(0, 220).replace(/\s+/g, ' ');
          return `- [[${n.title}]] (Categoría: ${n.paraCategory}, Tags: ${(n.tags || []).join(', ')}): "${cleanSnippet}..."`;
        })
        .join('\n');

      const worksSummary = activeWorks
        .map((w) => {
          const course = activeCourses.find((c) => c.id === w.courseId);
          return `- [[${w.title}]] (Curso: ${course?.name || 'Asignatura'}, Tipo: ${w.type}, Estado: ${w.status})`;
        })
        .join('\n');

      const coursesSummary = activeCourses
        .map((c) => `- [[${c.name}]] (${c.code || 'Curso'} - ${c.period || 'Periodo Activo'})`)
        .join('\n');

      const recentHistory = (context.history || [])
        .filter((h) => h.text && h.text.trim())
        .slice(-6)
        .map((h) => `${h.sender === 'user' ? studentName : 'Asistente'}: ${h.text.trim()}`)
        .join('\n\n');

      const prompt = `Eres el Asistente Académico y Compañero de Razonamiento del Segundo Cerebro de ${studentName}.
Contexto del Perfil del Estudiante:
${profileLines}

══════════════════════════════════════════
GRAFO DE CONOCIMIENTO INDEXADO (ÚNICA FUENTE DE VERDAD):
══════════════════════════════════════════
📌 ASIGNATURAS / CURSOS ACTIVOS:
${coursesSummary || 'No hay cursos registrados en el sistema'}

📁 TRABAJOS Y ENTREGABLES:
${worksSummary || 'No hay trabajos registrados en el sistema'}

💡 CONCEPTOS TEÓRICOS:
${conceptsSummary || 'No hay conceptos registrados en el sistema'}

📝 NOTAS DE ESTUDIO CONECTADAS:
${notesSummary || 'No hay notas registradas en el sistema'}

══════════════════════════════════════════
HISTORIAL DE CONVERSACIÓN PREVIO:
══════════════════════════════════════════
${recentHistory || '(Inicio de conversación)'}

══════════════════════════════════════════
PERSONALIDAD Y TONO HUMANO (ESPAÑOL PERUANO):
══════════════════════════════════════════
1. Habla como una compañera de clase PERUANA cercana que conoce bien a ${studentName}, NO como un bot ni un libro de texto.
   - Español PERUANO: siempre "tú" (NUNCA "vos", NUNCA voseo argentino "tenés/querés", NUNCA "che" ni "boludo"). 
   - Palabras naturales peruanas que puedes usar con moderación: "pues", "de una", "ahi nomás", "chévere", "en serio", "obvio", "igual te sirve".
   - NUNCA uses lenguaje técnico ni palabras de IA ("heurística", "token", "índice", "sintetizar", "entidad", "grafo de conocimiento", "árbitrario"). Di "tus notas", "tus apuntes", "tus trabajos".
   - Cero frases de robot ("Estoy aquí para ayudarte con tus necesidades académicas"). Cero servilismo ("¡Qué excelente pregunta!").
2. RESPUESTAS CORTAS Y DIRECTAS (¡CLAVE!):
   - Responde en 2-4 frases breves por defecto. Si la pregunta es simple, una o dos frases bastan.
   - Usa viñetas SOLO si ${studentName} pide una lista, compara opciones o el tema realmente lo requiere. NUNCA abras con un párrafo largo de introducción.
   - Ve directo a lo que preguntó. No repitas su pregunta de vuelta.
   - Ejemplos del tono correcto (solo ilustran el estilo, no son datos reales):
     * "¿Qué tengo pendiente?" → "Tienes la exposición de Estadística el viernes y te falta cerrar el marco teórico de tu tesis. ¿Empezamos por algo?"
     * "Explícame la ansiedad" → "En tus apuntes hay una nota buena de eso. En corto: es la tensión que genera el estudio y se maneja con técnicas de regulación emocional. ¿La abrimos?"

══════════════════════════════════════════
ADAPTACIÓN AL PERFIL (PIENSA EN QUIÉN ES ÉL/ELLA):
══════════════════════════════════════════
3. Enmarca tus respuestas en SU contexto real, no en uno genérico:
   - Es estudiante de ${faculty ? `la ${faculty}` : 'su facultad'}, ${specialty ? `en ${specialty}` : ''}${cycle ? `, cursando ${cycle}` : ''}.
   - Si su proyecto de tesis aparece (${thesisTitle ? `"${thesisTitle}"` : ''}), relaciónalo cuando sea pertinente.
   - Cuando menciones algo del grafo, deja claro QUÉ ES y de QUÉ CURSO viene: "en tu curso [[Estadística]]", "el concepto [[Regulación Emocional]]", "tu trabajo [[Tesis]]", "la nota [[Regulación Emocional y Ansiedad]]".

══════════════════════════════════════════
OBEDECE LA INTENCIÓN EXACTA DEL PEDIDO:
══════════════════════════════════════════
A. PEDIDOS DE LISTADO ("dime todas mis notas", "todos mis conceptos", "mis trabajos", "mis cursos"):
   - Lista TODO lo que aparezca en la lista correspondiente del grafo, SIN omitir ninguno, SIN resumir, SIN comentar uno por uno.
   - NO mezcles categorías: si pide notas, SOLO notas; si pide conceptos, SOLO conceptos. Nada de material extra.
   - Formato: una viñeta por ítem con su [[enlace]]. Sin párrafo introductorio largo y sin consejos al final (máximo una pregunta breve de seguimiento).
   - Si pregunta cuántos tiene ("cuántas notas tengo"), responde PRIMERO el número exacto y después, solo si aclara algo, un desglose mínimo.
B. PEDIDOS DE ACCIÓN ("resúmeme X", "explícame Y", "ayúdame a redactar Z"):
   - Ejecuta la acción de inmediato usando sus notas reales como base. No des vueltas ni preguntes permiso.
C. PREGUNTAS DE ESTADO ("qué tengo pendiente", "cómo voy"):
   - Cruza los trabajos, estados y fechas reales del grafo. Concreta y breve.

══════════════════════════════════════════
REGLAS ESTRICTAS DE RESPUESTA (ANTI-ALUCINACIÓN & CLARIDAD):
══════════════════════════════════════════
4. CERO ALUCINACIONES:
   - Los ÚNICOS cursos, trabajos, conceptos y notas que existen son los listados arriba en el GRAFO INDEXADO.
   - NUNCA inventes cursos, materias, notas o datos que no estén en esas listas.
   - NUNCA tomes el nombre de la Facultad, Universidad o Carrera como si fuera un curso, ni lo encierres entre corchetes [[ ]].
5. DIÁLOGO CONTINUO (¡SIN SALUDOS NI RECITADOS REPETITIVOS!):
   - ¡NO saludes ("¡Hola, ${studentName}!", "Qué alegría...") ni recites todo su perfil en cada mensaje! Ve DIRECTO al grano.
6. ENLACES WIKI EXACTOS [[ ]]:
   - Usa [[Nombre Exacto]] EXCLUSIVAMENTE para notas, conceptos, entregables o cursos que estén presentes LITERALMENTE en las 4 listas indexadas de arriba.
   - NUNCA inventes enlaces wiki inexistentes, ni corchetes vacíos [[]], ni encierres la facultad o palabras comunes en [[ ]].
7. RESPUESTA SINCERA:
   - Si ${studentName} te pregunta qué tienes registrado o qué puedes hacer, menciona únicamente los datos reales y ofrece redactar, organizar o profundizar en sus notas existentes.

NUEVO MENSAJE DE ${studentName.toUpperCase()}:
"${userQuery}"`;

      // Conversational temperature: warmer than the analytical default (0.2) so the
      // assistant sounds human and natural. Respects a user-configured higher value.
      const chatSettings = { ...settings, temperature: Math.max(settings.temperature ?? 0.2, 0.7) };
      const response = await callLLM(prompt, chatSettings);
      if (response && response.text.trim()) {
        return {
          answer: response.text.trim(),
          modelUsed: response.modelUsed,
          matchedConcepts,
          matchedNotes,
          isOfflineHeuristic: false
        };
      }
    } catch (err) {
      console.warn('LLM graph assistant query failed, falling back to heuristics:', err);
    }
  }

  // 2. Offline Heuristic Semantic Synthesizer

  // Intent handling: explicit full-listing / counting requests ("todas mis notas",
  // "todos mis conceptos", "cuántas notas tengo") list ONLY the requested category,
  // in full, without mixing others. Search-style requests keep the keyword filter.
  const listIntent = /\b(todas|todos|cuantas|cuántas|cuantos|cuántos)\b/i.test(userQuery);
  const wantsNotes = /\bnotas?\b/i.test(userQuery);
  const wantsConcepts = /\bconceptos?\b/i.test(userQuery);
  const wantsCourses = /\b(cursos?|asignaturas?|materias?|clases?)\b/i.test(userQuery);
  const wantsWorks = /\b(trabajos?|entregables?|tesis|tareas?)\b/i.test(userQuery);

  if (listIntent && (wantsNotes || wantsConcepts || wantsCourses || wantsWorks)) {
    const sections: string[] = [];
    let totalCount = 0;
    const isCountOnly = /^\s*(cuantas|cuántas|cuantos|cuántos)\b/i.test(userQuery);
    const wantedLabels = [
      wantsNotes ? 'notas' : '',
      wantsConcepts ? 'conceptos' : '',
      wantsCourses ? 'cursos' : '',
      wantsWorks ? 'trabajos' : ''
    ].filter(Boolean).join(', ');

    if (wantsNotes && activeNotes.length > 0) {
      totalCount += activeNotes.length;
      if (!isCountOnly) {
        sections.push(`**Notas (${activeNotes.length}):**\n${activeNotes.map((n) => `- [[${n.title}]]`).join('\n')}`);
      }
    }
    if (wantsConcepts && activeConcepts.length > 0) {
      totalCount += activeConcepts.length;
      if (!isCountOnly) {
        sections.push(`**Conceptos (${activeConcepts.length}):**\n${activeConcepts.map((c) => `- [[${c.name}]]`).join('\n')}`);
      }
    }
    if (wantsCourses && activeCourses.length > 0) {
      totalCount += activeCourses.length;
      if (!isCountOnly) {
        sections.push(`**Cursos (${activeCourses.length}):**\n${activeCourses.map((c) => `- [[${c.name}]]`).join('\n')}`);
      }
    }
    if (wantsWorks && activeWorks.length > 0) {
      totalCount += activeWorks.length;
      if (!isCountOnly) {
        sections.push(`**Trabajos (${activeWorks.length}):**\n${activeWorks.map((w) => `- [[${w.title}]]`).join('\n')}`);
      }
    }

    return {
      answer: totalCount > 0
        ? (isCountOnly
          ? `Tienes ${totalCount} en total (${wantedLabels}).`
          : `Aquí está todo, pues:\n\n${sections.join('\n\n')}`)
        : `Aún no tienes ${wantedLabels || 'nada'} registrado, pues.`,
      modelUsed: 'Heurística Local Offline',
      matchedConcepts,
      matchedNotes,
      isOfflineHeuristic: true
    };
  }

  const relevantNotes = activeNotes.filter((n) => {
    const q = queryLower.trim();
    if (!q) return true;
    return (
      n.title.toLowerCase().includes(q) ||
      n.content.toLowerCase().includes(q) ||
      (n.tags || []).some((t) => t.toLowerCase().includes(q))
    );
  });

  const relevantConcepts = activeConcepts.filter((c) => {
    const q = queryLower.trim();
    if (!q) return true;
    return c.name.toLowerCase().includes(q) || (c.description || '').toLowerCase().includes(q);
  });

  let heuristicAnswer = '';

  if (relevantConcepts.length > 0 || relevantNotes.length > 0) {
    heuristicAnswer += `En tus apuntes encontré esto, pues:\n\n`;
    if (relevantConcepts.length > 0) {
      heuristicAnswer += `**Conceptos:**\n`;
      relevantConcepts.forEach((c) => {
        heuristicAnswer += `- **[[${c.name}]]**: ${c.description}\n`;
      });
      heuristicAnswer += `\n`;
    }

    if (relevantNotes.length > 0) {
      heuristicAnswer += `**Notas:**\n`;
      relevantNotes.slice(0, 4).forEach((n) => {
        const course = activeCourses.find((c) => c.id === n.courseId);
        const snippet = n.content.replace(/[#*`_]/g, '').slice(0, 140).trim();
        heuristicAnswer += `- **[[${n.title}]]** ${course ? `_(${course.code})_` : ''}: ${snippet}...\n`;
      });
      heuristicAnswer += `\n`;
    }

    heuristicAnswer += `💡 *Tócale a cualquiera de los [[enlaces]] y se abre de una.*`;
  } else {
    heuristicAnswer = `Mmm, no encontré nada con "${userQuery}" en tus notas, pues.\n\n**Prueba así:**\n- Quizá está con otra palabra (ej. *Regulación Emocional*, *Tesis*, *TCC*, *Psicometría*).\n- O crea un concepto nuevo con el botón **"Nuevo Concepto"** de arriba.`;
  }

  return {
    answer: heuristicAnswer,
    modelUsed: 'Heurística Local Offline',
    matchedConcepts,
    matchedNotes,
    isOfflineHeuristic: true
  };
}

