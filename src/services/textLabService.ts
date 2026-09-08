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
  timeoutMs = 10000
): Promise<LLMCallResult | null> {
  try {
    return await callLLM(
      prompt,
      temperature !== undefined ? { ...settings, temperature } : settings,
      { timeoutMs }
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
    // ── Register-locked iterative rewrite-verify loop ───────────────────────
    // Failure modes fixed here (measured on real usage, 2026-09-08):
    //   (a) A domain-locked "academic editor" prompt turned a casual diary
    //       into a bureaucratic incident report ("se procedió a la ebullición
    //       de agua"). QuillBot: 100% human input → 90% AI output.
    //   (b) The loop never compared candidates against the ORIGINAL text:
    //       a 5%-AI input was "humanized" into a 45%-AI output because the
    //       best of 3 bad candidates still shipped.
    //   (c) Local verification couldn't see register-shift damage because
    //       the detector had no rules for bureaucratic register.
    // Fixes: register detection BEFORE rewriting (voice is locked), the
    // original's score is the baseline every candidate must beat, and the
    // detector now flags bureaucratic register-shift.
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

    const buildPrompt = (input: string, focusPatterns: string[], pass: number) => `Eres un editor peruano de textos en español. Objetivo: reescribir para que NO dispare detectores de IA (Pangram, GPTZero, Turnitin AI, QuillBot), manteniendo el significado EXACTO.

${registerBrief}

${pass > 1 ? `ATENCIÓN — PASADA DE CORRECCIÓN ${pass}: el intento anterior dejó patrones de IA. ELIMINA OBLIGATORIAMENTE:\n${focusPatterns.map((p) => `- ${p}`).join('\n')}\n` : ''}
TEXTO ${pass > 1 ? 'A CORREGIR (ya reescrito una vez, aún con restos de IA)' : 'DE ENTRADA'}:
"""
${input}
"""

REGLAS DE ORO (inviolables):
1. Conserva TODAS las citas académicas EXACTAS si las hay: (Autor, año), "et al. (2023)", cifras, nombres propios.
2. No cambies el significado de ninguna oración. No agregues ni quites información.
3. Mantén el registro (${register}) del original. ${registerForbid}
4. Mantén la persona gramatical del original (si habla de "yo" o "me", sigue así).

ESTRATEGIAS VALIDADAS (aplica las que apliquen al registro ${register}):

A. ROMPE EL ESQUELETO: si varios párrafos repiten una plantilla, varía cómo entra cada idea (por el autor, por el hallazgo, por el detalle concreto). No anuncies la escalera; consérvala sin letreros. Las etiquetas geográficas idénticas ("Afuera,", "En Latinoamérica,", "En el Perú,", "En el terreno peruano,") como aperturas de estudios son la firma estructural #1 de GPTZero: NINGÚN estudio puede entrar con la misma fórmula que el anterior. Entradas variadas: por el hallazgo ("Con 4.396 estudiantes, Zhang..."), por el lugar concreto ("En Arequipa, Apaza..."), por la cifra, por la controversia.

B. MATA CIERRES CIRCULARES Y META-COMENTARIO: "los antecedentes permiten aseverar que...", "observando que", "resaltando" → síntesis con contenido real, hallazgos sin adorno.

C. ELIMINA INFLADO DE RELEVANCIA: "cobra especial importancia" → "importa"; "juega un papel fundamental" → "importa".

D. VARÍA LA CADENCIA: alterna oraciones cortas y largas. Una oración corta seca de vez en cuando baja el score más que sustituir sinónimos. ${register === 'CASUAL' ? 'En registro casual: oraciones incompletas, arranques abruptos ("Y luego nada."), puntuación floja de vez en cuando.' : ''}

E. COPULAS SIMPLES: "representa/constituye un papel clave" → "es clave".

F. HIGIENE TIPOGRÁFICA: comillas tipográficas (â€œâ€) → rectas; rayas (â€”) → coma; sin "..." decorativos.

G. PROHIBICIONES ABSOLUTAS DE VOCABULARIO IA: "por lo tanto", "en conclusión", "asimismo", "en este sentido", "cabe destacar", "es importante señalar", "resulta esencial", "además" al inicio de oración, "diversos estudios han demostrado", "en definitiva", "desde una perspectiva integral". Si necesitas transición, intégrala en la oración misma o corta: oración nueva sin conector.

H. ${register === 'CASUAL' ? 'IMPERFECCIONES NATURALES: deja pasar una redundancia leve, una tangente breve, una opinión sin justificar. La perfección estructural es la firma de la máquina.' : 'PRECISIÓN CONCRETA: nombres propios, lugares, cifras exactas, fechas, referencias con detalle.'}

Devuelve EXACTAMENTE un objeto JSON válido:
{
  "humanizedText": "texto reescrito completo",
  "appliedStrategies": ["cuáles aplicaste, brevemente"],
  "remainingRisks": ["riesgos residuales, si detectas alguno"]
}`;

    // Baseline: the ORIGINAL text is the candidate to beat. A humanizer that
    // returns a WORSE-AI-reading rewrite than its input must return the input.
    const baseline = detectAIText(text);
    const baselineScore = baseline.aiScore + baseline.issues.length * 0.05;

    let bestScore = baselineScore;
    let bestText: string | null = null; // null = keep original
    let bestStrategies: string[] = [];
    let bestRisks: string[] = [];
    let modelUsed = '';
    let lastAppliedStrategies: string[] = [];
    let current = text;
    // Issues in the text being rewritten this pass. A candidate that removes
    // patterns is accepted even if the statistical score stays similar.
    let currentIssues = baseline.issues.length;
    // Epsilon for pass 1 when the original is already clean: an equally-clean
    // rewrite still changes the stylometric fingerprint (the point when a
    // NEURAL detector flags a locally-clean text).
    const improveEpsilon =
      baseline.band === 'HUMANO' && baseline.issues.length === 0 ? 0.05 : 0;

    const MAX_PASSES = 3;
    for (let pass = 1; pass <= MAX_PASSES; pass++) {
      let focusPatterns: string[] = [];
      if (pass > 1) {
        const check = detectAIText(current);
        if (check.band === 'HUMANO' && check.issues.length === 0) break;
        focusPatterns = check.issues
          .slice(0, 6)
          .map((i) => `${i.label} — ejemplos: ${i.examples.slice(0, 2).join(' / ')}`);
      }

      const res = await runLLM(buildPrompt(current, focusPatterns, pass), settings, 0.85, 90000);
      if (!res || !res.text) break;
      modelUsed = res.modelUsed;

      const parsed = extractJSON<{
        humanizedText?: string;
        appliedStrategies?: string[];
        remainingRisks?: string[];
      }>(res.text);
      let candidate: string;
      let candidateStrategies: string[] = [];
      let candidateRisks: string[] = [];
      if (parsed && typeof parsed.humanizedText === 'string' && parsed.humanizedText.trim()) {
        candidate = parsed.humanizedText.trim();
        candidateStrategies = Array.isArray(parsed.appliedStrategies) ? parsed.appliedStrategies.slice(0, 12) : [];
        candidateRisks = Array.isArray(parsed.remainingRisks) ? parsed.remainingRisks.slice(0, 8) : [];
      } else if (res.text.trim().length > text.length * 0.5) {
        candidate = res.text.trim();
      } else {
        break;
      }

      const verify = detectAIText(candidate);
      const candidateScore = verify.aiScore + verify.issues.length * 0.05;

      // ── Structure preservation guard (2026-09-08, model comparison) ───────
      // Measured on gemini-3.5-flash-lite: it merged a 3-paragraph input into
      // one 202-word block. A rewrite that collapses paragraphs is a defect
      // even when its pattern score improves — reject it outright.
      const paraCount = (s: string) => s.split(/\n\s*\n|\r\n\s*\r\n/).filter((p) => p.trim().length > 40).length;
      const inputParas = paraCount(current);
      const candidateParas = paraCount(candidate);
      const collapsesStructure =
        inputParas >= 2 && candidateParas < Math.max(1, Math.round(inputParas * 0.6));
      if (collapsesStructure) {
        // Discard this candidate entirely; do not feed it to the next pass.
        continue;
      }

      // ── Acceptance, two criteria (2026-09-08 round 4) ─────────────────────
      // (1) Total score better than the best so far (guard anti-daño), OR
      // (2) PATTERN REDUCTION: the candidate removes detected AI patterns vs
      //     the current text even when the statistical score is similar —
      //     structural rewrites (geo-template broken, closings removed) can
      //     keep similar rhythm scores while removing the actual tells. The
      //     E2E on a MIXTO input showed candidates rejected only on score
      //     even though they removed 3 patterns.
      const removesPatterns =
        currentIssues > 0 && verify.issues.length < currentIssues;
      if (removesPatterns) {
        bestScore = candidateScore; // adopt the pattern-reducer as the new bar
        bestText = candidate;
        bestStrategies = candidateStrategies;
        bestRisks = candidateRisks;
        currentIssues = verify.issues.length;
      } else if (candidateScore < bestScore + improveEpsilon) {
        bestScore = Math.min(bestScore, candidateScore);
        bestText = candidate;
        bestStrategies = candidateStrategies;
        bestRisks = candidateRisks;
      }
      lastAppliedStrategies = candidateStrategies;

      if (verify.band === 'HUMANO' && verify.issues.length === 0) break;

      // No measurable improvement over the best so far → stop iterating.
      if (!removesPatterns && candidateScore >= bestScore + 0.02 && pass >= 2) break;

      current = candidate;
    }

    // No candidate beat the ORIGINAL text → return the original untouched,
    // explaining why. Shipping a register-shifted, worse-reading rewrite is
    // the bug this guards against. Two distinct messages: clean original
    // (neural-detector case — the local engine sees nothing to fix) vs
    // patterned original the model failed to improve.
    if (bestText === null) {
      const cleanBaseline = baseline.issues.length === 0;
      return {
        text,
        appliedStrategies: [],
        changes: [],
        remainingRisks: cleanBaseline
          ? [
              `El texto original ya lee como humano (${Math.round((1 - baseline.aiScore) * 100)}% humano en verificación local, 0 patrones de IA). Si un detector neuronal (Pangram, GPTZero) lo marca, la huella es estilométrica (nivel token), no de patrones: reescribirlo con IA probablemente la exacerbe. Se entrega sin cambios.`
            ]
          : [
              `Ninguna candidata superó al original (${baseline.issues.length} patrón(es) de IA aún presentes: ${baseline.issues.map((i) => i.label).slice(0, 3).join(', ')}). Se entrega sin cambios para no dañar el texto. Consejo: reescribe manualmente las oraciones marcadas por el Detector y vuelve a humanizar el resultado.`
            ],
        modelUsed: modelUsed || 'Verificación local',
        isOfflineHeuristic: false
      };
    }

    if (bestText) {
      const finalCheck = detectAIText(bestText);
      const risks = [...bestRisks];
      if (finalCheck.band !== 'HUMANO' || finalCheck.issues.length > 0) {
        risks.push(
          `Verificación local: quedan ${finalCheck.issues.length} patrón(es) de IA (${finalCheck.issues.map((i) => i.label).slice(0, 3).join(', ')}). Pasa el resultado por el Detector de IA y vuelve a humanizar el fragmento problemático.`
        );
      }
      return {
        text: bestText,
        appliedStrategies: bestStrategies.length > 0 ? bestStrategies : lastAppliedStrategies,
        changes: [],
        remainingRisks: risks.slice(0, 8),
        modelUsed: modelUsed || 'Gemini (Gemini API)',
        isOfflineHeuristic: false
      };
    }
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
