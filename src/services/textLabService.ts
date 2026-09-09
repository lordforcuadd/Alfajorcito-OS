/**
 * Text Lab Service — LLM-backed implementations of the five Laboratorio de
 * Texto tools, with deterministic offline fallbacks.
 *
 * Reuses the existing aiService plumbing (callLLM, settings resolution,
 * token tracking) so the module inherits BYOK providers and model config
 * already set by the user (Gemini / OpenAI / OpenRouter / Ollama).
 */

import type { AISettings } from '../types';
import { db } from '../db';
import {
  detectAIText,
  detectRegister,
  humanizeTextLocal,
  paraphraseTextLocal,
  findMisspellings,
  getPreset,
  scanPlagiarismLocal,
  type AIDetectionLLMResult,
  type HumanizeResult,
  type ParaphraseIntensity,
  type ParaphraseResult,
  type PlagiarismCandidate,
  type PlagiarismLLMResult,
  type PlagiarismMatch,
  type SpellcheckResult
} from '../utils/textLabEngine';
import { callLLM, getEffectiveAISettings, type LLMCallResult } from './aiService';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Fuzzy containment: does `haystack` contain `needle` ignoring whitespace
 * differences? Audit quotes come back slightly re-formatted by the model, so
 * an exact includes() would miss most of them.
 */
export function chunkIncludes(haystack: string, needle: string): boolean {
  const norm = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase();
  const h = norm(haystack);
  const n = norm(needle);
  if (!n || n.length < 8) return false;
  return h.includes(n);
}

/**
 * Deterministic de-uniformization: applied to every candidate BEFORE scoring.
 * Breaks the statistical uniformity LLM rewrites leave behind (straight
 * quotes, em dash → comma, merge of staccato fragments). Per-paragraph so
 * paragraph structure is untouched (the collapse guard must not see damage
 * that isn't the model's doing).
 */
export function detourLLMUniformity(input: string): string {
  const detourPara = (para: string): string => {
    let out = para
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/\s*\u2014\s*/g, ', ')
      .replace(/\u2026/g, '...')
      .trim();
    // Atomic decimal protection: swap "4.396"-style numbers for
    // placeholders BEFORE splitting sentences (a regex alternation can't
    // protect them — [^.!?]+ eats the leading digits), then restore after
    // the merge. E2E caught "4. 396" corruption, 2026-09-08.
    const numPlaceholders: string[] = [];
    out = out.replace(/\d+[.]\d+/g, (m) => {
      numPlaceholders.push(m);
      return `\u0000${numPlaceholders.length - 1}\u0000`;
    });
    const sentences = out.match(/[^.!?]+[.!?]+/g) || [];
    if (sentences.length >= 4) {
      const merged: string[] = [];
      for (const raw of sentences) {
        const s = raw.trim();
        const short = s.split(/\s+/).length < 7;
        const startsConj = /^(y|pero|aunque|porque|as[ií] que|o sea)\b/i.test(s);
        if (merged.length > 0 && short && startsConj) {
          merged[merged.length - 1] = merged[merged.length - 1].replace(/[.!?]+$/, '');
          merged.push(s.charAt(0).toLowerCase() + s.slice(1));
        } else {
          merged.push(s);
        }
      }
      out = merged.join(' ').replace(/ {2,}/g, ' ');
    }
    // Restore the decimal numbers the split protected.
    out = out.replace(/\u0000(\d+)\u0000/g, (_m, i) => numPlaceholders[Number(i)] ?? '');
    return out;
  };
  return input
    .replace(/\r\n/g, '\n')
    .split(/\n\s*\n/)
    .map((p) => (p.trim() ? detourPara(p) : p))
    .join('\n\n');
}

/**
 * Phase-3 self-audit prompt: the chat procedure's "what still reads as AI?"
 * applied to the REWRITTEN candidate.
 */
function selfAuditPrompt(candidate: string): string {
  return `Eres un detector de IA experto en español. El siguiente texto fue reescrito para sonar humano. Tu trabajo es encontrar LO QUE AÚN SUENA A IA. Sé despiadado, pero honesto: no inventes problemas.

TEXTO REESCRITO A AUDITAR:
"""
${candidate}
"""

Busca:
- Oraciones que conservan cadencia uniforme (misma longitud, mismo patrón).
- Restos de vocabulario de ensayo ("por lo tanto", "asimismo", "en este sentido", "cabe destacar", "es importante señalar").
- Nominalizaciones de informe ("se procedió a") en textos casuales.
- Párrafos que aún repiten la misma fórmula de entrada.
- Cierres circulares que repiten el tema del párrafo.

Devuelve EXACTAMENTE este JSON:
{
  "problems": [
    {
      "quote": "oración exacta del texto reescrito que aún suena a IA",
      "fixHint": "cómo corregirla, en una frase concreta"
    }
  ]
}
Si el texto ya suena natural en todo, devuelve problems: [].`;
}

/**
 * Phase-4 fix prompt: correct ONLY the self-audit quotes, keep everything
 * else untouched (surgical fix, not another full rewrite).
 */
function fixPrompt(candidate: string, problems: string[]): string {
  return `Eres un editor peruano. Corrige SOLO las oraciones listadas abajo. El resto del texto queda EXACTAMENTE IGUAL, palabra por palabra. No reescribas nada más.

TEXTO:
"""
${candidate}
"""

ORACIONES A CORREGIR (y por qué):
${problems.map((p, i) => `${i + 1}. "${p}"`).join('\n')}

CORRECCIÓN: cada oración listada debe sonar a persona real — cadencia variada, vocabulario natural, sin conectores de ensayo. Las demás oraciones NO SE TOCAN.

Devuelve EXACTAMENTE este JSON:
{
  "correctedText": "el texto completo con SOLO las oraciones listadas corregidas"
}`;
}

function extractJSON<T>(raw: string): T | null {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as T;
  } catch {
    return null;
  }
}

async function runLLM(
  prompt: string,
  settings: AISettings,
  temperature?: number,
  timeoutMs = 10000,
  samplingOpts?: { topP?: number; seed?: number }
): Promise<LLMCallResult | null> {
  try {
    return await callLLM(
      prompt,
      temperature !== undefined ? { ...settings, temperature } : settings,
      { timeoutMs, ...samplingOpts }
    );
  } catch (err) {
    console.warn('TextLab LLM call failed, falling back offline:', err);
    return null;
  }
}

// ─── 1. AI Detector (LLM + heuristic ensemble) ───────────────────────────────

export async function detectAIAuthorship(
  text: string,
  explicitSettings?: AISettings
): Promise<AIDetectionLLMResult> {
  const settings = await getEffectiveAISettings(explicitSettings);
  const heuristic = detectAIText(text);

  const canUseLLM =
    settings.provider !== 'offline_heuristics' &&
    (settings.apiKey || settings.provider === 'ollama');

  if (canUseLLM) {
    const prompt = `Actúa como un detector académico de texto generado por IA (estilo GPTZero / Pangram / Turnitin AI), especializado en español académico universitario.

Analiza el siguiente texto y evalúa la probabilidad de que haya sido redactado por una IA (ChatGPT, Gemini, Claude, etc.) o por un estudiante humano.

Texto a analizar:
"""
${text}
"""

Criterios de análisis:
1. Perplejidad aparente: variabilidad léxica, uso de palabras inesperadas, regionalismos, términos específicos concretos.
2. Ráfaga (burstiness): variación de longitud y estructura de oraciones.
3. Patrones léxicos típicos de IA: "en resumen", "cabe destacar", "además", "es importante señalar que", comillas tipográficas, rayas (—), regla de tres, paralelismos negativos.
4. Uniformidad estructural: párrafos con longitud y estructura homogéneas.
5. Voz personal: presencia de primera persona, opiniones matizadas, imperfecciones naturales.

Devuelve EXACTAMENTE un objeto JSON válido con esta estructura (sin texto adicional):
{
  "verdict": "HUMANO" | "MIXTO" | "IA",
  "confidence": 0 a 100,
  "reasons": ["motivo 1", "motivo 2", "motivo 3"]
}`;

    const res = await runLLM(prompt, settings, 0.1);
    if (res && res.text) {
      const parsed = extractJSON<{
        verdict?: string;
        confidence?: number;
        reasons?: string[];
      }>(res.text);
      if (parsed && typeof parsed.verdict === 'string') {
        const verdict: AIDetectionLLMResult['verdict'] =
          parsed.verdict === 'IA' ? 'IA' : parsed.verdict === 'MIXTO' ? 'MIXTO' : 'HUMANO';
        return {
          verdict,
          confidence:
            typeof parsed.confidence === 'number' ? Math.max(0, Math.min(100, parsed.confidence)) : 50,
          reasons: Array.isArray(parsed.reasons) ? parsed.reasons.slice(0, 8) : [],
          modelUsed: res.modelUsed,
          isOfflineHeuristic: false
        };
      }
    }
  }

  // Offline heuristic verdict derived from the local detector
  const confidence = Math.round(heuristic.aiScore * 100);
  const reasons = heuristic.issues.map((i) => `${i.label}: ${i.occurrences} ocurrencia(s)`);
  if (heuristic.metrics.burstinessIndex > 0 && heuristic.metrics.burstinessIndex < 0.25) {
    reasons.push(
      `Ritmo de oraciones uniforme (índice de ráfaga ${heuristic.metrics.burstinessIndex.toFixed(2)}), típico de texto generado.`
    );
  }
  return {
    verdict: heuristic.band,
    confidence,
    reasons: reasons.slice(0, 8),
    modelUsed: 'Heurística Local Offline',
    isOfflineHeuristic: true
  };
}

// ─── 2. Paraphraser (LLM + offline fallback) ──────────────────────────────────

export async function paraphraseText(
  text: string,
  intensity: ParaphraseIntensity,
  explicitSettings?: AISettings
): Promise<ParaphraseResult> {
  const settings = await getEffectiveAISettings(explicitSettings);
  const preset = getPreset(intensity);

  const canUseLLM =
    settings.provider !== 'offline_heuristics' &&
    (settings.apiKey || settings.provider === 'ollama');

  if (canUseLLM) {
    const prompt = `Eres un editor académico experto en Psicología y redacción científica en español (normas APA 7ma edición). Tu tarea es parafrasear un fragmento académico con total fidelidad al significado original.

Texto original:
"""
${text}
"""

Nivel de reformulación solicitado: ${preset.label} (${preset.id}).
- ${preset.description}
- Tasa de sustitución léxica objetivo: ~${Math.round(preset.synonymRate * 100)}%.
- Tasa de reestructura sintáctica objetivo: ~${Math.round(preset.structureRate * 100)}%.

Reglas obligatorias:
1. Conserva TODOS los datos, cifras, nombres propios, conceptos técnicos psicológicos y el sentido exacto del original. Nada se agrega, nada se omite.
2. NO uses muletillas de IA ("en resumen", "cabe destacar", "es importante señalar que", "además" al inicio de oraciones).
3. NO uses comillas tipográficas ni rayas (—). Usa puntuación simple.
4. Varía la longitud de las oraciones de forma natural (alterna oraciones cortas y largas).
5. NO agregues introducciones, conclusiones, comentarios ni disculpas. Devuelve SOLO el texto parafraseado.
6. Mantén un registro académico riguroso pero con voz natural de estudiante universitario peruano, sin first-person forzado.

Responde con el texto parafraseado únicamente, sin prefijos ni explicaciones.`;

    const res = await runLLM(prompt, settings, 0.7);
    if (res && res.text.trim()) {
      return {
        text: res.text.trim(),
        intensity,
        modelUsed: res.modelUsed,
        isOfflineHeuristic: false
      };
    }
  }

  return {
    text: paraphraseTextLocal(text, intensity),
    intensity,
    modelUsed: 'Heurística Local Offline',
    isOfflineHeuristic: true
  };
}

// ─── 3. Plagiarism checker (local corpus + optional LLM triage) ──────────────

export interface PlagiarismScanReport {
  overallScore: number;
  matches: PlagiarismMatch[];
  modelUsed: string;
  isOfflineHeuristic: boolean;
}

/** Builds the local corpus from stored sources (abstracts + user content). */
export async function buildLocalCorpus(): Promise<PlagiarismCandidate[]> {
  try {
    const sources = await db.sources.toArray();
    const notes = await db.notes.toArray();
    const corpus: PlagiarismCandidate[] = [];
    for (const s of sources) {
      const text = s.abstract || s.bibtex || `${s.title} ${s.authors.map((a) => `${a.firstName} ${a.lastName}`).join(' ')}`;
      if (text.trim().length > 40) {
        corpus.push({ id: s.id, title: s.title, text });
      }
    }
    for (const n of notes) {
      if (n.content.trim().length > 40) {
        corpus.push({ id: n.id, title: n.title, text: n.content });
      }
    }
    return corpus;
  } catch {
    return [];
  }
}

export async function checkPlagiarism(
  text: string,
  explicitSettings?: AISettings
): Promise<PlagiarismScanReport> {
  const settings = await getEffectiveAISettings(explicitSettings);
  const corpus = await buildLocalCorpus();
  const local = scanPlagiarismLocal(text, corpus);

  const canUseLLM =
    settings.provider !== 'offline_heuristics' &&
    (settings.apiKey || settings.provider === 'ollama');

  if (canUseLLM && local.matches.length > 0 && local.overallScore > 0.02) {
    // Ask the LLM to triage the top candidates. Fetch their real text content
    // so the model judges actual overlap, not just titles.
    const top = local.matches.slice(0, 5);
    const corpus = await buildLocalCorpus();
    const topWithText = top
      .map((m) => {
        const candidate = corpus.find((c) => c.id === m.sourceId);
        return candidate
          ? { ...m, text: candidate.text.slice(0, 1500) }
          : null;
      })
      .filter((x): x is PlagiarismMatch & { text: string } => x !== null);

    if (topWithText.length > 0) {
      const prompt = `Eres un auditor de integridad académica (estilo Turnitin). Evalúa si el texto sospechoso presenta paralelismo real, copia estructural o solapamiento conceptual significativo con alguno de los documentos fuente.

Texto sospechoso:
"""
${text}
"""

Documentos fuente (los más parecidos según similitud local de shingles):
${topWithText
  .map(
    (m, i) =>
      `Fuente ${i + 1} — "${m.sourceTitle}" (similitud local ${(m.score * 100).toFixed(1)}%):\n"""\n${m.text}\n"""`
  )
  .join('\n\n')}

Devuelve EXACTAMENTE un objeto JSON válido:
{
  "overallScore": 0 a 100 (probabilidad de plagio real, no solo similitud superficial),
  "matches": [{"sourceId": "id de la fuente", "sourceTitle": "título", "score": 0 a 100}]
}
Incluye solo matches con score >= 20.`;

      const res = await runLLM(prompt, settings, 0.1);
      if (res && res.text) {
        const parsed = extractJSON<{
          overallScore?: number;
          matches?: Array<{
            sourceId?: string;
            sourceTitle?: string;
            score?: number;
          }>;
        }>(res.text);
        if (parsed && typeof parsed.overallScore === 'number') {
          const matches: PlagiarismMatch[] = (parsed.matches || [])
            .filter((m) => m && typeof m.score === 'number')
            .map((m) => {
              const localMatch = local.matches.find((lm) => lm.sourceId === m.sourceId);
              return {
                sourceId: typeof m.sourceId === 'string' ? m.sourceId : localMatch?.sourceId || '',
                sourceTitle:
                  typeof m.sourceTitle === 'string' && m.sourceTitle
                    ? m.sourceTitle
                    : localMatch?.sourceTitle || 'Fuente local',
                score: Math.max(0, Math.min(1, (m.score as number) / 100)),
                matchedShingles: localMatch?.matchedShingles ?? 0,
                totalShingles: localMatch?.totalShingles ?? 0
              };
            });
          return {
            overallScore: Math.max(0, Math.min(1, parsed.overallScore / 100)),
            matches: matches.length > 0 ? matches : local.matches,
            modelUsed: res.modelUsed,
            isOfflineHeuristic: false
          };
        }
      }
    }
  }

  return {
    overallScore: local.overallScore,
    matches: local.matches,
    modelUsed: 'Heurística Local Offline',
    isOfflineHeuristic: true
  };
}

// ─── 4. Spellcheck & grammar corrector (LLM + offline pre-check) ─────────────

export async function correctSpelling(
  text: string,
  explicitSettings?: AISettings
): Promise<SpellcheckResult> {
  const settings = await getEffectiveAISettings(explicitSettings);

  const canUseLLM =
    settings.provider !== 'offline_heuristics' &&
    (settings.apiKey || settings.provider === 'ollama');

  if (canUseLLM) {
    const prompt = `Eres un corrector ortotipográfico y gramatical experto en español académico peruano (normas APA 7 y RAE). Corrige el siguiente texto de un trabajo universitario.

Texto:
"""
${text}
"""

Reglas:
1. Corrige SOLO ortografía, tildes, puntuación, concordancia gramatical y errores evidentes.
2. NO cambies el estilo, la voz, las ideas ni el registro del autor. No "mejores" nada que ya sea correcto.
3. NO reformules oraciones que están bien escritas.
4. NO agregues introducciones ni explicaciones.

Devuelve EXACTAMENTE un objeto JSON válido:
{
  "correctedText": "texto completo corregido",
  "corrections": [{"original": "fragmento con error tal como aparecía", "corrected": "fragmento corregido", "explanation": "razón breve en español"}]
}
Si no hay errores, devuelve correctedText igual al original y corrections: [].`;

    const res = await runLLM(prompt, settings, 0.1);
    if (res && res.text) {
      const parsed = extractJSON<{
        correctedText?: string;
        corrections?: Array<{ original?: string; corrected?: string; explanation?: string }>;
      }>(res.text);
      if (parsed && typeof parsed.correctedText === 'string') {
        const corrections = (parsed.corrections || [])
          .filter((c) => c && typeof c.original === 'string' && typeof c.corrected === 'string')
          .map((c) => ({
            original: String(c.original),
            corrected: String(c.corrected),
            explanation: typeof c.explanation === 'string' ? c.explanation : ''
          }));
        return {
          correctedText: parsed.correctedText,
          corrections,
          modelUsed: res.modelUsed,
          isOfflineHeuristic: false
        };
      }
    }
  }

  // Offline: deterministic misspelling pre-check only
  const issues = findMisspellings(text);
  let corrected = text;
  for (const issue of issues) {
    const escaped = issue.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    corrected = corrected.replace(
      new RegExp(`\\b${escaped}\\b`, 'gi'),
      issue.suggestion
    );
  }
  return {
    correctedText: corrected,
    corrections: issues.map((i) => ({
      original: i.word,
      corrected: i.suggestion,
      explanation: 'Error ortográfico de alta frecuencia (diccionario local).'
    })),
    modelUsed: 'Heurística Local Offline',
    isOfflineHeuristic: true
  };
}

// ─── 5. Humanizer (LLM primary + local fallback) ─────────────────────────────

export async function humanizeText(
  text: string,
  explicitSettings?: AISettings
): Promise<HumanizeResult> {
  const settings = await getEffectiveAISettings(explicitSettings);

  const canUseLLM =
    settings.provider !== 'offline_heuristics' &&
    (settings.apiKey || settings.provider === 'ollama');

  if (canUseLLM) {
    // ── Chat-procedure pipeline (2026-09-08, "como lo hicimos en el chat") ──
    // The single mega-prompt failed on small models (gemini-3.5-flash-lite
    // ignored 8 abstract strategies at once — measured: 100% AI on Pangram
    // after "humanizing"). The chat procedure that produced 0% AI texts works
    // because it DECOMPOSES: (1) find what still reads AI, citing the actual
    // sentences, (2) rewrite small fragments with concrete before/after
    // examples, (3) self-audit the rewrite against the same list, (4) fix.
    // Phases below mirror that. Small models follow concrete, narrow
    // instructions; they ignore walls of abstract rules.
    const register = detectRegister(text);
    const registerBrief = {
      CASUAL:
        'REGISTRO DETECTADO: CASUAL / CONVERSACIONAL. Esto NO es un texto académico. Es escritura personal, coloquial (diario, mensaje, redes, blog). MANTÉN EL REGISTRO CASUAL EXACTO del original: primera persona, muletillas ("bueno", "o sea"), oraciones informales, vocabulario cotidiano. PROHIBIDO: formalizar, nominalizar, usar léxico de informe ("se procedió a", "incidencia"), latinajos, citas académicas o tiempos compuestos de gabinete. Si el original dice "tenía cero ganas", la reescritura sigue siendo casual.',
      NEUTRAL:
        'REGISTRO DETECTADO: NEUTRAL / GENERAL. Mantén el tono informativo del original sin elevarlo ni abaratarlo: ni burocrático ni excesivamente coloquial.',
      FORMAL:
        'REGISTRO DETECTADO: ACADÉMICO / FORMAL. Mantén el rigor académico del original (citas exactas, terminología técnica), pero rompe las fórmulas de plantilla.'
    }[register];

    const registerForbid = {
      CASUAL:
        'PROHIBICIONES DE REGISTRO (casual): "se procedió a", "se efectuó", "las XX:XX horas", "insumo", "incidencia", "pendientes programados", "establecimiento comercial", "derivó de las", "condición que obligó", "cuya tranquilidad contrastó", nominalizaciones de informe, tercera persona narrativa distante. El texto humanizado debe leerse como el mismo autor casual escribiendo mejor, NO como un funcionario redactando un acta. No satures de jerga: el español casual real usa 1 o 2 marcas coloquiales por párrafo, no todas las oraciones.',
      NEUTRAL:
        'PROHIBICIONES DE REGISTRO (neutral): burocratización ("se procedió a") y colloquial-fake ("veinte minutitos") en el mismo texto.',
      FORMAL:
        'PROHIBICIONES DE REGISTRO (formal): NO elevar aún más el tono (ya es formal). PROHIBIDO ABSOLUTAMENTE jerga juvenil o regional ("cachar", "caleta", "pucha", "chamba", "vaina", "compas", "chavos", "penca", "chancho", "apechugar", "brax") — un texto académico humanizado se lee natural-formal: variado, concreto, con voz propia, NUNCA caricaturesco. Este es el error más grave posible: detectores como GPTZero leen 98% IA un texto de tesis disfrazado de jerga, porque la plantilla estructural sigue intacta y la jerga es una máscara transparente.'
    }[register];

    // FASE 1 — AUDIT con cita de oraciones exactas (el "¿qué suena a IA?" del chat)
    const auditPrompt = `Eres un detector de IA experto en español. Analiza el texto y lista SOLO lo que suena a generado por IA (ChatGPT/Gemini/GPT), CITANDO LAS ORACIONES EXACTAS. Sé el interrogador de un texto que intenta pasar por humano.

${registerBrief}

INSTRUCCIONES DE AUDIT:
- Oraciones suaves y uniformes (misma longitud, mismo patrón) → cítaolas.
- Conectores de ensayo ("por lo tanto", "asimismo", "en este sentido", "cabe destacar") → cítaolas.
- Nominalizaciones de informe ("se procedió a", "se efectuó") si el registro es casual → cítaolas.
- Estructura de plantilla entre párrafos (misma fórmula de entrada estudio tras estudio) → descríbela.
- Vocabulario genérico de IA ("delve", "landscape", "testament" en inglés; "inflado de relevancia" en español: "cobra especial importancia", "juega un papel fundamental") → cítaolas.
- Perfección sospechosa (sin tangentes, sin opiniones, sin redundancias leves) → señálalo.
- NO inventes problemas si el texto ya suena natural. Un audit limpio es un resultado válido.

TEXTO A AUDITAR:
"""
${text}
"""

Devuelve EXACTAMENTE este JSON:
{
  "readsAI": true|false (¿en conjunto suena a IA?),
  "problems": [
    {
      "quote": "oración exacta del texto que suena a IA",
      "why": "por qué suena a IA, en una frase",
      "fixHint": "cómo se arreglaría, en una frase concreta"
    }
  ],
  "structureProblem": "si hay plantilla entre párrafos, descríbela; si no, cadena vacía"
}`;


    // FASE 2 — REESCRITURA POR FRAGMENTOS con ejemplos before/after concretos.
    // El chat funcionaba porque cada instrucción venía con su ejemplo: "así no /
    // así sí". Los modelos chicos siguen ejemplos, no abstracciones.
    const fragmentExamples = {
      CASUAL: `EJEMPLOS CONCRETOS (casual) — así NO (IA) / así SÍ (humano):
- "La escasa motivación matutina derivó de las bajas temperaturas ambientales." NO → "La verdad, no quería salir de la cama porque hacía un frío de aquellos." SÍ
- "Se procedió a la preparación de café concentrado." NO → "Me armé un café bien cargado." SÍ
- "El texto presenta una estructura coherente y equilibrada." NO → "Se entiende, no es nada del otro mundo." SÍ
- La cadencia casual humana: oración larga, luego CORTA. "Y nada. Así nomás." No todas las oraciones parejas.`,
      NEUTRAL: `EJEMPLOS CONCRETOS (neutral) — así NO (IA) / así SÍ (humano):
- "Cabe destacar que este aspecto cobra especial importancia." NO → "Este punto importa." SÍ
- "Asimismo, es importante señalar que..." NO → "Además, ..." (integrado, no al inicio) o cortar la oración. SÍ
- "representa un papel fundamental en" NO → "es clave en" SÍ`,
      FORMAL: `EJEMPLOS CONCRETOS (formal) — así NO (IA) / así SÍ (humano):
- "En este sentido, estos antecedentes permiten aseverar que..." NO → "Estos antecedentes muestran que..." SÍ
- "Afuera, Zhang et al. (2026) analizaron... En Latinoamérica, Moysén... En el Perú, Valencia..." (misma fórmula geográfica) NO → "Con 4.396 estudiantes, Zhang et al. (2026) halló...; la muestra mexicana de Moysén (2025)..." / "En Arequipa, Apaza (2025)..." SÍ
- "cobra especial importancia" NO → "importa" SÍ
- "juega un papel fundamental" NO → "es decisivo" SÍ
- El academic humano VARÍA la entrada de cada estudio y cierra párrafos con hallazgos, no con resúmenes circulares.`
    }[register];

    // Chunking: párrafos agrupados en fragmentos de ≤2 párrafos (~120-300 palabras).
    // Los modelos chicos reescriben MEJOR fragmentos cortos que textos enteros.
    const paragraphChunks = (input: string): string[] => {
      const paras = input
        .replace(/\r\n/g, '\n')
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter((p) => p.length > 0);
      const chunks: string[] = [];
      let buf: string[] = [];
      let words = 0;
      for (const p of paras) {
        const pw = p.split(/\s+/).length;
        if (buf.length > 0 && words + pw > 300) {
          chunks.push(buf.join('\n\n'));
          buf = [];
          words = 0;
        }
        buf.push(p);
        words += pw;
      }
      if (buf.length > 0) chunks.push(buf.join('\n\n'));
      return chunks;
    };

    const rewriteChunkPrompt = (chunk: string, chunkIdx: number, totalChunks: number, auditQuotes: string[]) => `Eres el mismo autor peruano del texto, reescribiendo su propio borrador para que suene a persona real, no a ChatGPT. ${registerBrief}

FRAGMENTO ${chunkIdx + 1} de ${totalChunks}. Reescribe SOLO este fragmento:

"""
${chunk}
"""

${fragmentExamples}

${auditQuotes.length > 0 ? `ORACIONES DE ESTE TIPO DE TEXTO QUE UN AUDIT PREVIO MARCÓ COMO IA (aplícales el arreglo primero):\n${auditQuotes.map((q) => `- "${q}"`).join('\n')}\n` : ''}${registerForbid}

CÓMO REESCRIBIR (procedimiento, no resultado):
1. Lee el fragmento. Identifica las 2-3 oraciones más "planas" (uniformes, sin fricción, conectores de ensayo).
2. Reescríbelas como las escribiría el autor real: cadencia variada (una larga, una corta seca), vocabulario del registro (${register}), opino si el registro lo permite.
3. Deja pasar UNA imperfección leve (tangente breve, redundancia) si el registro es casual.
4. NO toques citas académicas "(Autor, año)", cifras ni nombres propios.
5. NO agregues ni quites información.

Devuelve EXACTAMENTE este JSON:
{
  "rewrittenFragment": "el fragmento reescrito completo",
  "changes": ["qué cambiaste y por qué, 1 línea cada una (máx 4)"]
}`;

    // ══ FASE 1: AUDIT — el modelo cita exactamente qué suena a IA ═══════════
    const baseline = detectAIText(text);
    const baselineScore = baseline.aiScore + baseline.issues.length * 0.05;

    let bestText: string | null = null; // null = keep original
    let bestStrategies: string[] = [];
    let bestRisks: string[] = [];
    let modelUsed = '';
    let auditQuotes: string[] = [];
    let auditStructure = '';

    const auditRes = await runLLM(auditPrompt, settings, 0.3, 90000, {
      topP: 0.95,
      seed: Math.floor(Math.random() * 2 ** 30)
    });
    if (auditRes && auditRes.text) {
      modelUsed = auditRes.modelUsed;
      const audit = extractJSON<{
        readsAI?: boolean;
        problems?: Array<{ quote?: string; why?: string; fixHint?: string }>;
        structureProblem?: string;
      }>(auditRes.text);
      if (audit) {
        auditQuotes = (audit.problems || [])
          .filter((p) => typeof (p as { quote?: unknown }).quote === 'string' && ((p as { quote?: string }).quote || '').trim().length > 8)
          .map((p) => ((p as { quote?: string }).quote || '').trim())
          .slice(0, 10);
        auditStructure = typeof audit.structureProblem === 'string' ? audit.structureProblem : '';
      }
    }

    // ══ FASE 2: REESCRITURA POR FRAGMENTOS (≤2 párrafos por llamada) ═══════
    // Un audit limpio + texto limpio localmente = no hay nada que reescribir
    // (romperlo sería dañarlo). Un audit con problemas PERO texto localmente
    // limpio = huella estilométrica: la reescritura por fragmentos es
    // exactamente lo que la mueve (cada fragmento re-muestreado con entropía).
    const chunks = paragraphChunks(text);
    const rewrittenChunks: string[] = [];
    const chunkChanges: string[] = [];

    for (let ci = 0; ci < chunks.length; ci++) {
      // Quotes relevantes a ESTE chunk (los que aparecen dentro del fragmento)
      const relevant = auditQuotes.filter((q) => chunkIncludes(chunks[ci], q));
      const res = await runLLM(
        rewriteChunkPrompt(chunks[ci], ci, chunks.length, relevant),
        settings,
        0.85,
        90000,
        { topP: 0.98, seed: Math.floor(Math.random() * 2 ** 30) }
      );
      if (!res || !res.text) {
        // Fallo de API en un chunk: conservar el original de ese chunk.
        rewrittenChunks.push(chunks[ci]);
        continue;
      }
      if (!modelUsed) modelUsed = res.modelUsed;
      const parsed = extractJSON<{ rewrittenFragment?: string; changes?: string[] }>(res.text);
      if (parsed && typeof parsed.rewrittenFragment === 'string' && parsed.rewrittenFragment.trim()) {
        rewrittenChunks.push(parsed.rewrittenFragment.trim());
        if (Array.isArray(parsed.changes)) {
          chunkChanges.push(...parsed.changes.filter((c) => typeof c === 'string').slice(0, 4));
        }
      } else if (res.text.trim().length > chunks[ci].length * 0.5) {
        rewrittenChunks.push(res.text.trim());
      } else {
        rewrittenChunks.push(chunks[ci]);
      }
    }

    const candidate = detourLLMUniformity(rewrittenChunks.join('\n\n'));

    // ══ FASE 3: AUTO-CRITICA del candidato (el chat: "¿qué aún suena a IA?") ═
    let selfAuditProblems: string[] = [];
    const selfAuditRes = await runLLM(selfAuditPrompt(candidate), settings, 0.3, 90000, {
      topP: 0.95,
      seed: Math.floor(Math.random() * 2 ** 30)
    });
    if (selfAuditRes && selfAuditRes.text) {
      const selfAudit = extractJSON<{ problems?: Array<{ quote?: string; fixHint?: string }> }>(selfAuditRes.text);
      selfAuditProblems = (selfAudit?.problems || [])
        .filter((p) => typeof (p as { quote?: unknown }).quote === 'string' && ((p as { quote?: string }).quote || '').trim().length > 8)
        .map((p) => ((p as { quote?: string }).quote || '').trim())
        .slice(0, 8);
    }

    // ══ FASE 4: CORRECCIÓN de los puntos que la auto-critica encontró ═══════
    let finalText = candidate;
    let finalStrategies = chunkChanges;
    if (selfAuditProblems.length > 0) {
      const fixRes = await runLLM(fixPrompt(candidate, selfAuditProblems), settings, 0.8, 90000, {
        topP: 0.98,
        seed: Math.floor(Math.random() * 2 ** 30)
      });
      if (fixRes && fixRes.text) {
        const fixed = extractJSON<{ correctedText?: string }>(fixRes.text);
        if (fixed && typeof fixed.correctedText === 'string' && fixed.correctedText.trim()) {
          finalText = detourLLMUniformity(fixed.correctedText.trim());
          finalStrategies = [...chunkChanges, ...selfAuditProblems.map((q) => `Auto-critica: corregido "${q.slice(0, 60)}..."`)];
        }
      }
    }

    // ══ ACEPTACIÓN FINAL: el candidato debe superar al original ═════════════
    const verify = detectAIText(finalText);
    const candidateScore = verify.aiScore + verify.issues.length * 0.05;
    const paraCount = (s: string) => s.split(/\n\s*\n|\r\n\s*\r\n/).filter((p) => p.trim().length > 40).length;
    const inputParas = paraCount(text);
    const candidateParas = paraCount(finalText);
    const collapsesStructure =
      inputParas >= 2 && candidateParas < Math.max(1, Math.round(inputParas * 0.6));

    const improvesPatterns = verify.issues.length < baseline.issues.length;
    const improvesScore = candidateScore < baselineScore + (baseline.band === 'HUMANO' && baseline.issues.length === 0 ? 0.05 : 0);
    // Clean-baseline (estilométrico): the original is already locally clean but
    // a NEURAL detector flags it — the point is not a better local score (it
    // is already at floor), it is RE-SAMPLING every fragment so the token
    // distribution changes. Accept a candidate that preserves structure and
    // introduces NO new local patterns, even if the statistical score moves
    // slightly up: the local score does not measure what Pangram measures.
    const isCleanBaseline = baseline.band === 'HUMANO' && baseline.issues.length === 0;
    const fingerprintRefresh =
      isCleanBaseline && verify.issues.length <= baseline.issues.length && !collapsesStructure;

    if (!collapsesStructure && (improvesPatterns || improvesScore || fingerprintRefresh)) {
      bestText = finalText;
      bestStrategies = finalStrategies;
      bestRisks = [];
      if (verify.band !== 'HUMANO' || verify.issues.length > 0) {
        bestRisks.push(
          `Verificación local: quedan ${verify.issues.length} patrón(es) de IA (${verify.issues.map((i) => i.label).slice(0, 3).join(', ')}). Puedes volver a humanizar el fragmento problemático.`
        );
      }
    } else if (collapsesStructure) {
      bestRisks = [
        'La reescritura colapsó la estructura de párrafos del original; se descartó para no dañar el texto.'
      ];
    }

    // ══ ENTREGA ═════════════════════════════════════════════════════════════
    if (bestText === null) {
      const cleanBaseline = baseline.issues.length === 0;
      return {
        text,
        appliedStrategies: [],
        changes: [],
        remainingRisks: cleanBaseline
          ? [
              `El texto original ya lee como humano (${Math.round((1 - baseline.aiScore) * 100)}% humano en verificación local, 0 patrones de IA). Si un detector neuronal (Pangram, GPTZero) lo marca igual, la huella is estilométrica (nivel token): la reescritura por fragmentos ya se aplicó y no bastó para mover la huella de muestreo del modelo. Opciones reales: (1) reescríbelo tú con tus palabras — 10 min de trabajo manual rompen la huella de verdad; (2) pásalo por otro modelo de otra familia (no Gemini si el original salió de Gemini); (3) acepta el riesgo si el destinatario no usa detectores. Se entrega sin cambios.`
            ]
          : [
              `Ninguna candidata superó al original (${baseline.issues.length} patrón(es) de IA aún presentes: ${baseline.issues.map((i) => i.label).slice(0, 3).join(', ')}). Se entrega sin cambios para no dañar el texto. Consejo: reescribe manualmente las oraciones marcadas por el Detector y vuelve a humanizar el resultado.`
            ],
        modelUsed: modelUsed || 'Verificación local',
        isOfflineHeuristic: false
      };
    }

    const finalCheck = detectAIText(bestText);
    const risks = [...bestRisks];
    if (finalCheck.band !== 'HUMANO' || finalCheck.issues.length > 0) {
      risks.push(
        `Verificación local: quedan ${finalCheck.issues.length} patrón(es) de IA (${finalCheck.issues.map((i) => i.label).slice(0, 3).join(', ')}). Pasa el resultado por el Detector de IA y vuelve a humanizar el fragmento problemático.`
      );
    }
    return {
      text: bestText,
      appliedStrategies: bestStrategies.length > 0 ? bestStrategies : ['Reescritura por fragmentos con audit + auto-crítica'],
      changes: [],
      remainingRisks: risks.slice(0, 8),
      modelUsed: modelUsed || 'Gemini (Gemini API)',
      isOfflineHeuristic: false
    };
  }

  // Offline deterministic fallback
  const local = humanizeTextLocal(text);
  return {
    text: local.text,
    appliedStrategies: local.changes.map((c) => `"${c.from.trim()}" → "${c.to.trim()}"`),
    changes: local.changes,
    remainingRisks: [
      'El modo offline solo elimina patrones léxicos; no puede reestructurar el ritmo de las oraciones.'
    ],
    modelUsed: 'Heurística Local Offline',
    isOfflineHeuristic: true
  };
}
