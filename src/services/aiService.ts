import { db } from '../db';
import type { AISettings, InstructionAnalysis, CitationStyle, UserProfile } from '../types';

export interface AIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  isOfflineHeuristic: boolean;
  modelUsed?: string;
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
      const modelLabel = settings.modelName || (settings.provider === 'gemini' ? 'gemini-1.5-flash' : 'gpt-4o-mini');
      return {
        success: true,
        message: `¡Conexión exitosa con ${settings.provider.toUpperCase()} (${modelLabel})! Respuesta recibida: "${response.slice(0, 100).trim()}"`,
        modelUsed: modelLabel
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
      const prompt = `Eres un asistente experto en metodología de investigación y rúbricas universitarias (Psicología USMP / APA 7).
Analiza las siguientes indicaciones dadas por el docente para un trabajo académico:

Consigna del docente:
"""
${instructionsText}
"""

Extrae y estructura la información en formato JSON EXACTO con las siguientes claves:
{
  "explicitRequirements": ["Lista de requisitos formales explícitos y oficiales que el docente exige (e.g. extensión, estilo, fuentes)"],
  "aiInferences": ["Sugerencias metodológicas, estructura recomendada y consideraciones de rigor académico"],
  "deliverableFormat": "Documento académico (PDF/Word)",
  "wordCountTarget": 1500,
  "citationStyleExpected": "APA_7",
  "maxSourceAgeYears": 5,
  "detectedQuestionsForTeacher": ["1 o 2 preguntas clave para consultar al docente si hay ambigüedad"]
}

Devuelve ÚNICAMENTE el objeto JSON sin bloques de texto adicionales.`;

      const res = await callLLM(prompt, effectiveSettings);
      if (res) {
        const jsonMatch = res.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            explicitRequirements: parsed.explicitRequirements || [],
            aiInferences: parsed.aiInferences || [],
            deliverableFormat: parsed.deliverableFormat || 'Documento académico (PDF/Word)',
            wordCountTarget: typeof parsed.wordCountTarget === 'number' ? parsed.wordCountTarget : undefined,
            citationStyleExpected: parsed.citationStyleExpected || 'APA_7',
            maxSourceAgeYears: typeof parsed.maxSourceAgeYears === 'number' ? parsed.maxSourceAgeYears : 5,
            detectedQuestionsForTeacher: parsed.detectedQuestionsForTeacher || []
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

  // Fallback explicit lines
  if (explicitRequirements.length === 0) {
    lines.slice(0, 4).forEach((line) => {
      if (line.length > 10 && line.length < 150) {
        explicitRequirements.push(line);
      }
    });
  }

  // Intelligent Inferences
  aiInferences.push('Recomendado: estructurar esquema con Introducción, Desarrollo argumentativo con fuentes indexadas, y Conclusión reflexiva.');
  aiInferences.push('Verificar que cada cita parentética en el texto coincida exactamente con la lista de referencias final.');

  if (instructionsText.toLowerCase().includes('ensayo') || instructionsText.toLowerCase().includes('crítico')) {
    aiInferences.push('Se sugiere incluir una sección explícita de contraargumentación para robustecer la tesis central.');
  }

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
    name: 'Saory',
    institution: 'Universidad de San Martín de Porres (USMP)',
    faculty: 'Facultad de Ciencias de la Comunicación, Turismo y Psicología',
    major: 'Psicología',
    currentCycle: 'VIII Ciclo (8vo Ciclo)',
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

  const studentName = profile.name || 'Saory';
  const institution = profile.institution || 'Universidad de San Martín de Porres (USMP)';
  const facultyMajor = `${profile.faculty || 'FCCTP'} - ${profile.major || 'Psicología'}`;
  const cycle = String(profile.currentCycle || 'VIII Ciclo (8vo Ciclo)');

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
      if (res) {
        // Defensive cleanup: remove any bracketed placeholders if the model still generated them
        const cleaned = res
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
      if (res) {
        const jsonMatch = res.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            status: parsed.status === 'CONFIRMED_FAITHFUL' ? 'CONFIRMED_FAITHFUL' : 'NEEDS_ADJUSTMENT',
            feedback: parsed.feedback || 'Evaluación completada con inteligencia artificial.',
            providerUsed: effectiveSettings.provider,
            modelUsed: effectiveSettings.modelName || (effectiveSettings.provider === 'gemini' ? 'gemini-1.5-flash' : 'gpt-4o-mini')
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

// Low-level LLM caller supporting Gemini, OpenAI, Claude, OpenRouter, and Ollama
async function callLLM(prompt: string, settings: AISettings): Promise<string | null> {
  const { provider, apiKey, modelName, ollamaEndpoint } = settings;

  if (provider === 'gemini') {
    const key = apiKey;
    let model = (modelName || 'gemini-1.5-flash').trim();
    // Normalize aliases and common user variants gracefully to official Google Gemini endpoints
    if (model.includes('3.5') || model.includes('flash-lite') || model.includes('flash_lite')) {
      model = 'gemini-1.5-flash';
    }
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: settings.temperature ?? 0.2 }
      }),
      signal: AbortSignal.timeout(10000)
    });
    if (!res.ok) {
      const errText = await res.text();
      try {
        const parsed = JSON.parse(errText);
        throw new Error(parsed.error?.message || `HTTP ${res.status}: ${res.statusText}`);
      } catch (e) {
        if (e instanceof Error && !e.message.startsWith('HTTP')) throw e;
        throw new Error(`HTTP ${res.status}: ${errText.slice(0, 120)}`);
      }
    }
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
  }

  if (provider === 'openai' || provider === 'openrouter') {
    const endpoint =
      provider === 'openrouter'
        ? 'https://openrouter.ai/api/v1/chat/completions'
        : 'https://api.openai.com/v1/chat/completions';
    const model = modelName || (provider === 'openrouter' ? 'meta-llama/llama-3.3-70b-instruct' : 'gpt-4o-mini');

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
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
    return data.choices?.[0]?.message?.content || null;
  }

  if (provider === 'ollama') {
    const endpoint = (ollamaEndpoint || 'http://localhost:11434').replace(/\/+$/, '') + '/api/generate';
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modelName || 'llama3',
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
    return data.response || null;
  }

  return null;
}
