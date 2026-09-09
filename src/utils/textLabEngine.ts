/**
 * Text Lab Engine — utilities for the Laboratorio de Texto module.
 * Pure functions, no DOM / DB / network access, fully unit-testable.
 *
 * 1) AI-pattern detection heuristics (local, offline-first).
 * 2) Plagiarism similarity via shingle (n-gram) Jaccard index.
 * 3) Local humanizer fallback (light heuristics when no LLM is available).
 * 4) Paraphrase intensity presets shared by the UI and prompts.
 * 5) High-frequency Spanish misspelling pre-check.
 *
 * Safari-safe: NO regex lookbehind anywhere in this module (parse-time
 * SyntaxError on Safari <16.4 — see project history, round #11).
 */

import type { AISettings } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// 0. Shared types & presets
// ─────────────────────────────────────────────────────────────────────────────

export type ParaphraseIntensity = 'LIGHT' | 'BALANCED' | 'DEEP';

export interface ParaphrasePreset {
  id: ParaphraseIntensity;
  label: string;
  description: string;
  /** Lexical overhaul expected: rough share of words replaced. */
  synonymRate: number;
  /** Structural overhaul expected: reorder / merge / split clauses. */
  structureRate: number;
}

export const PARAPHRASE_PRESETS: ParaphrasePreset[] = [
  {
    id: 'LIGHT',
    label: 'Ligero',
    description: 'Cambia vocabulario marcado y suaviza conectores. Idea y orden casi intactos.',
    synonymRate: 0.25,
    structureRate: 0.1
  },
  {
    id: 'BALANCED',
    label: 'Equilibrado',
    description: 'Reformula oraciones y conectores manteniendo cada dato del original.',
    synonymRate: 0.5,
    structureRate: 0.35
  },
  {
    id: 'DEEP',
    label: 'Profundo',
    description: 'Reestructura por completo la sintaxis. Para texto cargado de tecnicismos.',
    synonymRate: 0.65,
    structureRate: 0.6
  }
];

export function getPreset(id: ParaphraseIntensity): ParaphrasePreset {
  return PARAPHRASE_PRESETS.find((p) => p.id === id) ?? PARAPHRASE_PRESETS[1];
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. AI-pattern detector (heuristics emulating GPTZero/Pangram tells)
// ─────────────────────────────────────────────────────────────────────────────

export interface AIDetectionIssue {
  pattern: string;
  label: string;
  occurrences: number;
  examples: string[];
}

export interface AIDetectionResult {
  /** 0..1 estimated probability the text reads AI-generated. */
  aiScore: number;
  /** Human-readable band, mirroring GPTZero-style bands. */
  band: 'HUMANO' | 'MIXTO' | 'IA';
  issues: AIDetectionIssue[];
  /** Per-sentence classification for the QuillBot-style segmented view. */
  sentences: AISentenceClassification[];
  /** QuillBot-style three-way split: AI % / MIXED % / HUMAN %. */
  distribution: { ai: number; mixed: number; human: number };
  metrics: {
    perplexityIndex: number;
    burstinessIndex: number;
    sentenceLengthVariance: number;
    avgSentenceLength: number;
  };
}

export interface AISentenceClassification {
  text: string;
  score: number;
  band: 'HUMANO' | 'MIXTO' | 'IA';
}

/**
 * Display labels for the three-way authorship verdict (GPTZero-style).
 * The internal band stays 'HUMANO' | 'MIXTO' | 'IA'; this maps it to the
 * clear, single-user-facing labels.
 */
export const AI_VERDICT_LABELS: Record<'HUMANO' | 'MIXTO' | 'IA', string> = {
  HUMANO: 'Escrito por personas',
  MIXTO: 'Escrito por personas y pulido por IA',
  IA: 'Generado por IA'
};

export function verdictLabel(band: 'HUMANO' | 'MIXTO' | 'IA'): string {
  return AI_VERDICT_LABELS[band];
}

interface DetectorRule {
  label: string;
  /** Regex applied against the full raw text (global). */
  re: RegExp;
  /** Weight added to the score when the rule matches. */
  weight: number;
  /** Weight per additional occurrence (capped). */
  perOccurrence?: number;
  cap?: number;
}

/**
 * AI vocabulary / phrasing tells, weighted by empirical frequency in LLM text.
 * Spanish + English patterns (academic writing in Spanish borrows both).
 */
const AI_RULES: DetectorRule[] = [
  // ── Tier 1: high-frequency Spanish LLM connectors. These open sentences in
  // nearly every Gemini/ChatGPT academic output and almost never cluster in
  // human prose. Verified against real model output (calibration probe).
  { label: 'Conectores de IA ("Por lo tanto", "En conclusión", "Asimismo")', re: /\b(?:por lo tanto|por tanto|en conclusi[oó]n|en definitiva|asimismo|en este sentido|en este marco|en este orden de ideas|en resumen)\b/gi, weight: 0.09, perOccurrence: 0.045, cap: 0.27 },
  { label: 'Fórmulas "Cabe destacar / Es importante señalar / Resulta esencial"', re: /\b(?:cabe (?:destacar|se[ñn]alar|resaltar|mencionar)|es importante (?:destacar|se[ñn]alar|notar)|resulta (?:esencial|fundamental|crucial|imperativo))\b/gi, weight: 0.08, perOccurrence: 0.04, cap: 0.2 },
  { label: '"Además/Adicionalmente" como apertura de oración', re: /(?:^|[.!?]\s+)(?:adem[áa]s|adicionalmente),/gim, weight: 0.05, perOccurrence: 0.03, cap: 0.15 },
  { label: 'Plantilla "diversos estudios han demostrado"', re: /\b(?:diversos? estudios|diversas? investigaciones|m[úu]ltiples estudios|la literatura especializada) han (?:demostrado|evidenciado|revelado|coincide)\b/gi, weight: 0.08, perOccurrence: 0.04, cap: 0.16 },
  { label: 'Perspectiva integral / holística', re: /\b(?:desde una perspectiva (?:integral|hol[ií]stica)|de manera integral|enfoque integral|de forma integral)\b/gi, weight: 0.06, perOccurrence: 0.03, cap: 0.12 },
  // Significance inflation (humanizer pattern 1)
  { label: 'Inflado de relevancia', re: /\b(?:no solo|testimonio de|papel (?:fundamental|crucial|vital)|momento (?:crucial|decisivo|pivotal)|hito importante|repr[eé]senta un antes y despu[eé]s)\b/gi, weight: 0.06, perOccurrence: 0.02, cap: 0.14 },
  // "-ando/-iendo" tack-ons (humanizer pattern 3)
  { label: 'Cola superficial en "-ando/-iendo"', re: /\b(?:subrayando|destacando|evidenciando|reflejando|simbolizando|fomentando|garantizando|enfatizando|demostrando|poniendo de manifiesto)\b/gi, weight: 0.05, perOccurrence: 0.02, cap: 0.12 },
  // AI vocabulary (pattern 7) — Spanish. ("Cabe destacar" and "es importante
  // señalar" live in the Tier-1 fórmulas rule; not duplicated here.)
  { label: 'Vocabulario típico de IA', re: /\b(?:en el (?:panorama|contexto) (?:actual|de)|evoluci[oó]n constante|en constante (?:evoluci[oó]n|cambio)|profundizar en|explorar a fondo|sumergirnos en|desbloquear|sin duda|juega un papel)\b/gi, weight: 0.04, perOccurrence: 0.015, cap: 0.12 },
  // English AI vocabulary that leaks into bilingual drafts
  { label: 'Anglicismos IA (delve, landscape…)', re: /\b(delve|landscape|tapestry|showcas\w*|underscor\w*|pivotal|testament|game.?changer|ever.?evolving|cutting.?edge|seamless\w*|robust)\b/gi, weight: 0.05, perOccurrence: 0.02, cap: 0.12 },
  // Copula avoidance (pattern 8)
  { label: 'Elusión del verbo "ser"', re: /\b(?:representa|constituye) (?:un|una|el|la) .{0,40}(?:clave|importante|fundamental|esencial|vital)\b/gi, weight: 0.05, perOccurrence: 0.02, cap: 0.1 },
  // Negative parallelism (pattern 9)
  { label: 'Paralelismo negativo', re: /\b(?:no se trata (?:solo|únicamente) de|no es (?:solo|únicamente|meramente).{0,30}sino)\b/gi, weight: 0.06, perOccurrence: 0.03, cap: 0.12 },
  // Em-dash overuse (pattern 14)
  { label: 'Rayas (em dash) en exceso', re: /\s[—–]\s|\s--\s/g, weight: 0.03, perOccurrence: 0.015, cap: 0.09 },
  // Filler (pattern 23)
  { label: 'Relleno ("con el fin de", "debido al hecho")', re: /\b(con el (fin|objeto) de|con la finalidad de|debido al hecho de que|en este momento del tiempo|a pesar del hecho de que|de una manera|de manera significativa)\b/gi, weight: 0.04, perOccurrence: 0.02, cap: 0.1 },
  // Hedge stacking (pattern 24)
  { label: 'Cercas apiladas', re: /\b(podr[ií]a (potencialmente )?(llegar a )?ser|es posible que se|podr[ií]an llegar a)\b/gi, weight: 0.04, perOccurrence: 0.02, cap: 0.08 },
  // Rhetorical question answered immediately (pattern 32).
  // Spanish-aware: requires a WH-question before the "?" — bare tags
  // ("¿no?", "¿verdad?", "¿cierto?") are NORMAL casual Spanish and were
  // false-positiving every colloquial rewrite (measured: the only "issue"
  // blocking two clean diary rewrites was ", ¿no? En el camino").
  { label: 'Pregunta retórica inmediata', re: /\b(?:qu[eé]|por qu[eé]|c[oó]mo|cu[áa]ndo|d[oó]nde|qui[eé]n|cu[áa]l|what|why|how|when|where|who)\b[^?.!?]{0,80}\?\s*[A-ZÁÉÍÓÚÑ]/gi, weight: 0.04, perOccurrence: 0.02, cap: 0.08 },
  // Sampling glitches: doubled words ("un un video") — LLM high-temperature
  // artifacts the previous rules couldn't see. Rare in human prose.
  { label: 'Palabra duplicada ("un un", "de de")', re: /\b([a-záéíóúñü]{2,})\s+\1\b/gi, weight: 0.03, perOccurrence: 0.02, cap: 0.08 },
  // Signposting (pattern 28)
  { label: 'Señalización ("veamos", "a continuación…")', re: /\b(veamos|examinemos|analizaremos a continuaci[oó]n|a continuaci[oó]n,?\s+(analizaremos|examinaremos|exploraremos)|profundicemos)\b/gi, weight: 0.04, perOccurrence: 0.02, cap: 0.08 },
  // Curly quotes (pattern 19) — LLMs emit them, humans on ES keyboards rarely do
  { label: 'Comillas tipográficas (“”‘’)', re: /[“”‘’]/g, weight: 0.04, perOccurrence: 0.01, cap: 0.08 },
  // Adverb openers (pattern 33)
  { label: 'Aperturas adverbiales', re: /(?:^|[.!?]\s+|,\s+)(b[aá]sicamente|esencialmente|fundamentalmente|notablemente|curiosamente|interesantemente|importantemente|crucialmente|en definitiva|en conclusi[oó]n)\b/gi, weight: 0.05, perOccurrence: 0.02, cap: 0.1 },
  // Reassurance kickers (pattern 34)
  { label: 'Cierre tranquilizador', re: /\b(y (est[áa] bien|no pasa nada)|no est[áa]s solo|es completamente normal)\b/gi, weight: 0.05, perOccurrence: 0.03, cap: 0.1 },
  // Bullet-header colon lists (pattern 16)
  { label: 'Listas "**Encabezado:**"', re: /^\s*[-•*]\s+\*\*[^*]+\*\*:/gm, weight: 0.05, perOccurrence: 0.02, cap: 0.1 },
  // ── Register-shift tells (added 2026-09-08): the bureaucratic extreme is
  // what a domain-locked humanizer prompt produces on casual input. Measured
  // on a real humanized diary that went 5%→45% local AI and 100% humano→90%
  // IA on QuillBot after "humanizing". These bureaucratic/informes markers
  // essentially never appear in human casual prose.
  { label: 'Burocratización ("se procedió a", "las 06:40 horas")', re: /\b(?:se procedi[oó] a|se efectu[oó]|las \d{1,2}:\d{2} horas|en el marco de la jornada|prep[oó]sito)\b/gi, weight: 0.09, perOccurrence: 0.045, cap: 0.27 },
  { label: 'Nominalización excesiva ("derivó de las", "condición que obligó")', re: /\b(?:deriv[oó] de las|condici[oó]n que oblig[oó]|intervalo que precedi[oó]|cuya tranquilidad contrast[oó])\b/gi, weight: 0.07, perOccurrence: 0.03, cap: 0.21 },
  { label: 'Léxico de informe ("incidencia técnica", "preparaciones previas")', re: /\b(?:incidencia t[eé]cnica|pendientes programados|din[áa]mica del entorno|intensidad operativa|cargo cal[oó]rico|preparaciones previas|establecimiento comercial|desplazamiento inicial)\b/gi, weight: 0.08, perOccurrence: 0.04, cap: 0.24 },
  // Caricature slang: the inverse failure — a slang-soaked "humanized" text.
  // Measured on the round-2 humanizer output that GPTZero read as 98% AI and
  // Pangram 58% AI while the word-rules saw 5%: the model translated every
  // verb into Peruvian slang ("cacharon", "caleta", "se pegaron con la depre",
  // "ir al chancho"). One slang word is human; a dense carpet of it over an
  // academic skeleton is a machine overcorrecting. Density > 1 per 60 words
  // in a citation-bearing text is the tell.
  { label: 'Jerga de caricatura ("cacharon", "caleta", "pucha")', re: /\b(?:cacha(?:r|n|mos|ba|ron)?|caleta|pucha|chamba|plata|vaina|movida|penca|pencas|chancho|compa|compas|chavos?|apapacho|apapachos|pencas|brax)\b/gi, weight: 0.05, perOccurrence: 0.025, cap: 0.18 }
];

/**
 * Detects the register (formality level) of a text BEFORE rewriting it.
 * The #1 humanizer failure mode is register-shift damage: a domain-locked
 * "academic editor" prompt turned a casual diary ("tenía cero ganas de
 * salir de la cama") into a bureaucratic incident report ("la escasa
 * motivación matutina derivó de las bajas temperaturas"). QuillBot read
 * the diary as 100% human and the "humanized" version as 90% AI.
 *
 * Register is detected with positive casual markers, so a HUMAN casual
 * text is NOT punished (casual ≠ AI) — only the SHIFT is forbidden.
 */
export type TextRegister = 'CASUAL' | 'NEUTRAL' | 'FORMAL';

export function detectRegister(text: string): TextRegister {
  const words = text.toLowerCase().match(/[a-záéíóúñü]+/g) || [];
  if (words.length === 0) return 'NEUTRAL';
  const per100 = (re: RegExp): number => {
    const hits = (text.match(re) || []).length;
    return (hits * 100) / words.length;
  };
  // Parenthetical asides are casual — but CITATION parens "(Gross, 2015)"
  // are the opposite. Strip citation-like parens before counting asides.
  const asideText = text.replace(/\([^)]*\d{4}[^)]*\)/g, '');
  const asideParens = (asideText.match(/\(/g) || []).length;
  // Positive casual markers: contractions, muletillas, first person,
  // colloquial intensifiers, parenthetical asides.
  const casualScore =
    per100(/\b(yo|me|mi|mis|nos|nuestro|contigo|conmigo)\b/gi) * 1.0 +
    per100(/\b(bueno|o sea|la verdad|sinceramente|digamos|vamos|hombre|ch[eé]|p[oó]ngase)\b/gi) * 1.2 +
    per100(/\b(hoy|ahorita|anoche|mañana|mientras|despu[eé]s|cuando)\b/gi) * 0.5 +
    per100(/\b(ganas|cosas|tonter[íi]a|desastre|sobra|casa|cama|café)\b/gi) * 0.6 +
    (text.match(/;/g) || []).length * -0.3 + // semicolons: formal tell
    asideParens * 0.4;
  // Positive formal markers: citations, academic hedging, nominalizations.
  const formalScore =
    per100(/\b(por lo tanto|en conclusi[oó]n|asimismo|en este sentido|cabe destacar)\b/gi) * 2.0 +
    per100(/\b\(\s*[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+,?\s*\d{4}\s*\)/g) * 3.0 +
    per100(/\bet al\.|\bn\s*=\s*\d+|\b[rp]\s*[<=]\s*\.?\d/gi) * 2.0;
  if (casualScore > 1.8 && casualScore > formalScore * 1.5) return 'CASUAL';
  if (formalScore > 1.0 && formalScore > casualScore * 1.2) return 'FORMAL';
  return 'NEUTRAL';
}

/**
 * Splits text into sentences WITHOUT regex lookbehind (Safari-safe).
 * Keeps the trailing terminator attached to each sentence.
 */
export function tokenizeSentences(text: string): string[] {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return [];
  const parts = normalized.match(/[^.!?…]+[.!?…]+|[^.!?…]+$/g) || [];
  return parts.map((s) => s.trim()).filter((s) => s.length > 0);
}

/**
 * Sentence length variance coefficient (burstiness proxy).
 * Human writing: irregular lengths (CV > ~0.35). LLM: uniform (CV < ~0.25).
 */
function lengthCV(sentences: string[]): number {
  if (sentences.length < 2) return 0;
  const lengths = sentences.map((s) => s.split(/\s+/).length);
  const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  if (mean === 0) return 0;
  const variance = lengths.reduce((acc, l) => acc + (l - mean) ** 2, 0) / lengths.length;
  return Math.sqrt(variance) / mean;
}

/**
 * Local "human signal" proxy, recalibrated after probing real model output:
 * lexical variety is NOT a human tell (LLMs have rich vocabularies — probing a
 * normal Gemini paragraph scored 0.554, same as human prose). The human tells
 * are CONCRETENESS: specific numbers with statistical detail, named people,
 * first-person processes, and anomalies/mess that LLMs smooth away.
 */
function humanSignalIndex(text: string): number {
  const words = text.toLowerCase().match(/[a-záéíóúñü]+/g) || [];
  if (words.length === 0) return 0;
  const chars = text.length;

  // Numbers with precision (r = -0.42, p < .01, 68%, n=380) — humans debugging
  // their own data write like this; LLM academic filler rarely does.
  const statsNumbers = (text.match(/r\s*=\s*-?\d|[bp]\s*<\s*\.?\d|\bn\s*=\s*\d+|\d+\s*%/g) || []).length;
  // Plain numbers (also concrete, weaker signal)
  const numbers = (text.match(/\b\d+([.,]\d+)?\b/g) || []).length;
  // First-person process verbs (recolectamos, nos tomó, quedamos)
  const firstPerson = (text.match(/\b(?:recolectamos|recogimos|entrevistamos|aplicamos|medimos|encuentr[aó]|nos tom[oó]|quedamos|obtuvimos|analizamos|hicimos|sacamos|revisamos|corrimos)\b/gi) || []).length;
  // Named entities signal: capitalized words that are NOT sentence starts
  // (Safari-safe: no lookbehind — filter after matching).
  const allCaps = text.match(/\b[A-ZÁÉÍÓÚÑ][a-záéíóúñ]{2,}/g) || [];
  const sentenceStarts = new Set(
    (text.match(/(?:^|[.!?]\s+|¿|¡)[A-ZÁÉÍÓÚÑ][a-záéíóúñ]{2,}/g) || []).map((s) =>
      s.replace(/^[.!?\s¿¡]+/, '')
    )
  );
  const capitalized = allCaps.filter((w) => !sentenceStarts.has(w)).length;
  // Messiness: parenthetical asides, semicolons, colons mid-sentence (LLMs avoid)
  const asides = (text.match(/[;()]|\bporque\b|\bpero\b|\baunque\b/g) || []).length;

  return Math.min(
    1,
    (statsNumbers / Math.max(words.length / 30, 1)) * 0.30 +
      (numbers / Math.max(words.length / 20, 1)) * 0.15 +
      (firstPerson / Math.max(words.length / 40, 1)) * 0.25 +
      Math.min(capitalized / Math.max(chars / 900, 1), 1) * 0.15 +
      Math.min(asides / Math.max(words.length / 25, 1), 1) * 0.15
  );
}

function perplexityIndex(text: string): number {
  // Kept for metrics display continuity; see humanSignalIndex for the
  // recalibrated scoring component.
  const words = text.toLowerCase().match(/[a-záéíóúñü]+/g) || [];
  if (words.length === 0) return 0;
  const unique = new Set(words).size;
  const rare = words.filter((w) => w.length >= 8).length;
  const numbers = (text.match(/\b\d+([.,]\d+)?\b/g) || []).length;
  return Math.min(
    1,
    (unique / words.length) * 0.6 +
      (rare / words.length) * 0.3 +
      Math.min(numbers / words.length, 0.1)
  );
}

export function detectAIText(text: string): AIDetectionResult {
  const clean = text.trim();
  if (clean.length < 120) {
    // Too short for statistical confidence — return neutral, not misleading.
    return {
      aiScore: 0,
      band: 'HUMANO',
      issues: [],
      sentences: [],
      distribution: { ai: 0, mixed: 0, human: 100 },
      metrics: {
        perplexityIndex: 0,
        burstinessIndex: 0,
        sentenceLengthVariance: 0,
        avgSentenceLength: 0
      }
    };
  }

  const sentences = tokenizeSentences(clean);
  const cv = lengthCV(sentences);
  const pIndex = perplexityIndex(clean);
  const lengths = sentences.map((s) => s.split(/\s+/).length);
  const avgSentence = lengths.length ? lengths.reduce((a, b) => a + b, 0) / lengths.length : 0;

  // Rule-based evidence
  let score = 0;
  const issues: AIDetectionIssue[] = [];
  for (const rule of AI_RULES) {
    const matches = clean.match(rule.re) || [];
    const count = matches.length;
    if (count === 0) continue;
    const add =
      rule.weight +
      (count > 1 && rule.perOccurrence ? Math.min(count - 1, 4) * rule.perOccurrence : 0);
    const capped = rule.cap ? Math.min(add, rule.cap) : add;
    score += capped;
    issues.push({
      pattern: rule.label,
      label: rule.label,
      occurrences: count,
      examples: matches.slice(0, 3).map((m) => m.trim().slice(0, 80))
    });
  }

  // Statistical component (recalibrated): uniform rhythm + low concreteness
  // → AI-likely. Human prose shows specific data, names and process verbs.
  const hIndex = humanSignalIndex(clean);
  const rhythmScore = cv < 0.18 ? 0.18 : cv < 0.25 ? 0.12 : cv < 0.35 ? 0.05 : 0;
  const concretenessScore = hIndex < 0.10 ? 0.14 : hIndex < 0.20 ? 0.08 : hIndex < 0.30 ? 0.03 : 0;
  score += rhythmScore + concretenessScore;

  // ── Structural template-ness (2026-09-08, round 3) ────────────────────────
  // Neural detectors (GPTZero 98% AI, Pangram 58% AI) flagged a rewrite whose
  // WORDS were slangy but whose PARAGRAPH SKELETON was still the AI template:
  // every paragraph = topic sentence + study A + study B + study C + circular
  // closing. Word-level rules saw nothing (5% AI). This measures paragraph-
  // skeleton similarity: how many sentences per paragraph share the same
  // opening/function and whether every paragraph closes the same way.
  // strongStructural feeds the per-sentence distribution too — a templated
  // document reads templated in EVERY sentence to a neural detector.
  let strongStructural = 0;
  const paragraphs = clean
    .split(/\n\s*\n|\r\n\s*\r\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  if (paragraphs.length >= 3) {
    // (a) Geographic template labels: the AI "antecedentes" skeleton is not
    // a paragraph-opener pattern — the geo-labels open SENTENCES INSIDE
    // paragraphs: "Afuera, Zhang et al. (2026)...", "En Latinoamérica, Moysén
    // Chimal...", "En el terreno peruano, Apaza Bejarano (2025)..." — the
    // same three geo-slots (extranjero → latam → Perú) recycled in paragraph
    // after paragraph. A real lit review varies how each study enters.
    const labelRe = /\b(?:afuera|fuera del pa[ií]s|en el extranjero|en latinoam[eé]rica|en el barrio latinoamericano|ac[áa] en el per[úu]|en el per[úu]|en el terreno peruano|a nivel internacional|en el [áa]mbito internacional|en el contexto (?:peruano|nacional|latinoamericano)|en el marco internacional)\b/i;
    const sentenceLabels: string[] = [];
    for (const s of sentences) {
      const m = s.match(labelRe);
      if (m) sentenceLabels.push(m[0].toLowerCase().replace(/,/g, '').trim());
    }
    const labelGroups = new Map<string, number>();
    for (const l of sentenceLabels) {
      labelGroups.set(l, (labelGroups.get(l) || 0) + 1);
    }
    // Repeated same-slot labels + a full 3-slot geo ladder are both template.
    let repeatedLabelHits = 0;
    for (const [, c] of labelGroups) if (c > 1) repeatedLabelHits += c - 1;
    const distinctGeo = labelGroups.size;
    let templateOpeners = 0;
    if (repeatedLabelHits > 0) templateOpeners += repeatedLabelHits;
    if (distinctGeo >= 3) templateOpeners += 2;
    const openerTemplateScore = paragraphs.length >= 3 ? Math.min(0.22, templateOpeners * 0.06) : 0;

    // (b) Citation-entry cadence: sentences that open with a citation pattern
    // ("X et al. (2023)", "Autor (2024)") fill whole paragraphs.
    const citationOpenerRe = /^(?:[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+(?:et al\.|y|and|&)\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)?\s*\(\d{4}\)|[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+\s+et al\.)/;
    let citationOpenerCount =  sentences.filter((s) => citationOpenerRe.test(s)).length;
    const citationTemplateScore =
      paragraphs.length >= 3 && citationOpenerCount >= Math.max(2, sentences.length * 0.25)
        ? Math.min(0.18, 0.08 + (citationOpenerCount - 2) * 0.03)
        : 0;

    // (c) Circular closings: last sentence of a paragraph restates the topic.
    const closingRe = /\b(?:al final|en bola simple|con esto se cacha|estos antecedentes tiran|por todo esto|en conclusi[oó]n|en resumen|por lo tanto)\b/i;
    let circularClosings = 0;
    const closingExamples: string[] = [];
    for (const p of paragraphs) {
      const s = tokenizeSentences(p);
      if (s.length >= 2 && closingRe.test(s[s.length - 1])) {
        circularClosings += 1;
        if (closingExamples.length < 3) closingExamples.push(s[s.length - 1].slice(0, 80));
      }
    }
    const closingTemplateScore = Math.min(0.20, circularClosings * 0.05);

    score += openerTemplateScore + citationTemplateScore + closingTemplateScore;
    // Structural evidence strong enough to color the whole document: neural
    // detectors score documents, not words. GPTZero read the geo-template
    // rewrite at 98% AI even though only ~8% of words carried slang tells.
    if (openerTemplateScore + closingTemplateScore >= 0.10) strongStructural = 1;
    if (openerTemplateScore > 0)
      issues.push({
        pattern: 'Plantilla de apertura entre párrafos',
        label: 'Plantilla geográfica de aperturas ("Afuera… / En Latinoamérica… / En el Perú…")',
        occurrences: templateOpeners,
        examples: [...labelGroups.entries()].filter(([, c]) => c > 1).map(([l]) => l).slice(0, 3)
      });
    if (citationTemplateScore > 0)
      issues.push({
        pattern: 'Cadencia de citas en plantilla',
        label: 'Cadencia de citas en plantilla (cada párrafo = tema + estudios)',
        occurrences: citationOpenerCount,
        examples: sentences.filter((s) => citationOpenerRe.test(s)).slice(0, 3)
      });
    if (closingTemplateScore > 0)
      issues.push({
        pattern: 'Cierres circulares de párrafo',
        label: 'Cierres circulares de párrafo (el cierre repite el tema)',
        occurrences: circularClosings,
        examples: closingExamples
      });
  }

  // Per-sentence classification (QuillBot-style segmented view). Each sentence
  // is scored with the same rules; a sentence is IA if it carries AI tells,
  // MIXTO if it reads formulaic-but-plausible, HUMANO otherwise. When the
  // DOCUMENT-level structural evidence is strong (geo-template + circular
  // closings across paragraphs), every sentence leans AI — that is how
  // document-level neural detectors behave (GPTZero 98% AI on a text whose
  // individual sentences were mostly slang-clean).
  const sentenceClassifications: AISentenceClassification[] = sentences.map((s) => {
    let sScore = 0;
    for (const rule of AI_RULES) {
      const hits = s.match(rule.re) || [];
      if (hits.length === 0) continue;
      sScore += rule.weight + (hits.length > 1 && rule.perOccurrence ? Math.min(hits.length - 1, 2) * rule.perOccurrence : 0);
    }
    // Short uniform sentences in an already-uniform paragraph lean AI.
    const words = s.split(/\s+/).length;
    if (words >= 18 && words <= 30 && cv < 0.25) sScore += 0.06;
    if (strongStructural) sScore += 0.09;
    const sBand: AISentenceClassification['band'] = sScore >= 0.14 ? 'IA' : sScore >= 0.07 ? 'MIXTO' : 'HUMANO';
    return { text: s, score: Math.min(1, sScore), band: sBand };
  });

  // Three-way distribution weighted by sentence word counts (QuillBot shows
  // % of total content, not % of sentences).
  const totalWords = sentenceClassifications.reduce(
    (acc, s) => acc + s.text.split(/\s+/).length,
    0
  ) || 1;
  let aiWords = 0;
  let mixedWords = 0;
  for (const s of sentenceClassifications) {
    const w = s.text.split(/\s+/).length;
    if (s.band === 'IA') aiWords += w;
    else if (s.band === 'MIXTO') mixedWords += w;
  }
  const distribution = {
    ai: Math.round((aiWords / totalWords) * 100),
    mixed: Math.round((mixedWords / totalWords) * 100),
    human: 0
  };
  distribution.human = Math.max(0, 100 - distribution.ai - distribution.mixed);

  const aiScore = Math.max(0, Math.min(1, score));
  const band: AIDetectionResult['band'] = aiScore >= 0.5 ? 'IA' : aiScore >= 0.25 ? 'MIXTO' : 'HUMANO';

  return {
    aiScore,
    band,
    issues,
    sentences: sentenceClassifications,
    distribution,
    metrics: {
      perplexityIndex: pIndex,
      burstinessIndex: cv,
      sentenceLengthVariance: cv,
      avgSentenceLength: avgSentence
    }
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Plagiarism similarity (shingle Jaccard)
// ─────────────────────────────────────────────────────────────────────────────

export interface SimilarityFragment {
  score: number;
  matchedShingles: number;
  totalShingles: number;
}

const STOPWORDS = new Set([
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'de', 'del', 'al', 'a', 'en', 'y', 'o', 'u', 'que', 'se', 'lo', 'su', 'sus', 'con', 'para', 'por', 'es', 'son', 'fue', 'era', 'más', 'como', 'este', 'esta', 'estos', 'estas', 'ese', 'esa', 'pero', 'si', 'no',
  'the', 'of', 'and', 'in', 'to', 'is', 'are', 'was', 'were', 'for', 'on', 'with', 'as', 'by', 'that', 'this', 'it'
]);

function normalizeWords(text: string): string[] {
  return (
    text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .match(/[a-zñ0-9]+/g) || []
  ).filter((w) => !STOPWORDS.has(w));
}

/** Word-level shingles (n-grams), stopword-filtered. */
export function buildShingles(text: string, n = 4): Set<string> {
  const words = normalizeWords(text);
  const shingles = new Set<string>();
  if (words.length < n) {
    if (words.length > 0) shingles.add(words.join(' '));
    return shingles;
  }
  for (let i = 0; i <= words.length - n; i++) {
    shingles.add(words.slice(i, i + n).join(' '));
  }
  return shingles;
}

/** Jaccard similarity between two shingle sets. */
export function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  for (const s of small) if (large.has(s)) intersection++;
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export interface PlagiarismMatch {
  sourceId: string;
  sourceTitle: string;
  score: number;
  matchedShingles: number;
  totalShingles: number;
}

export interface PlagiarismCandidate {
  id: string;
  title: string;
  text: string;
}

/**
 * Local plagiarism scan against a corpus of stored sources.
 * Mirrors how Turnitin-family tools report: per-source overlap %.
 */
export function scanPlagiarismLocal(
  suspectText: string,
  corpus: PlagiarismCandidate[],
  shingleSize = 4
): { overallScore: number; matches: PlagiarismMatch[]; fragments: SimilarityFragment[] } {
  const suspectShingles = buildShingles(suspectText, shingleSize);
  const matches: PlagiarismMatch[] = [];
  const fragments: SimilarityFragment[] = [];

  for (const candidate of corpus) {
    const candShingles = buildShingles(candidate.text, shingleSize);
    const score = jaccardSimilarity(suspectShingles, candShingles);
    let matched = 0;
    const [small, large] =
      suspectShingles.size <= candShingles.size
        ? [suspectShingles, candShingles]
        : [candShingles, suspectShingles];
    for (const s of small) if (large.has(s)) matched++;

    matches.push({
      sourceId: candidate.id,
      sourceTitle: candidate.title,
      score,
      matchedShingles: matched,
      totalShingles: candShingles.size
    });
    fragments.push({ score, matchedShingles: matched, totalShingles: candShingles.size });
  }

  matches.sort((x, y) => y.score - x.score);
  return { overallScore: matches[0]?.score ?? 0, matches, fragments };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Local humanizer fallback (when no LLM key is configured)
// ─────────────────────────────────────────────────────────────────────────────

export interface HumanizerChange {
  from: string;
  to: string;
}

export interface LocalHumanizeResult {
  text: string;
  changes: HumanizerChange[];
}

/**
 * Deterministic local strip of the loudest AI tells.
 * Applies fixed swaps and reports each change.
 */
export function humanizeTextLocal(text: string): LocalHumanizeResult {
  const changes: HumanizerChange[] = [];
  let out = text;

  const swaps: Array<[RegExp, string]> = [
    // ── Skeleton breaks: template phrases from real student-thesis AI drafts ──
    // Circular closings that restate the paragraph ("permiten aseverar que...")
    // — the #1 tell found in the validated 0%-detector rewrite session.
    // FUSED RULE (audit 2026-09-08): the previous split into two overlapping
    // regexes left orphaned prefixes — rule A consumed the verb anchor
    // ("evidencian") that rule B needed, so "En conjunto, estos estudios
    // evidencian X." came out as a dangling "En conjunto,". One regex now
    // owns prefix + subject + verb + tail; a prefix only matches when it is
    // directly chained (with optional comma) into the subject/verb, so a bare
    // "En este sentido, la literatura es clara." (legit connector) never
    // matches. Measured on the real overlap cases before shipping.
    [/\b(?:(?:por lo )?anterior(?:mente)?|en conjunto|en este sentido|as[ií], tales resultados),?\s*(?:los antecedentes(?: revisados?)?|estos? (?:trabajos|estudios|resultados|hallazgos)|tales? resultados)?\s*(?:permiten|permitiendo|sugieren|evidencian|demuestran)\s*(?:apreciar|aseverar|establecer|observar|concluir|inferir|la pertinencia|que)\b[^.;]*[.;]?/gi, ''],
    // Identical geographic template labels — replaced by concrete anchors downstream
    [/\ben el marco internacional,?\s*/gi, ''],
    [/\ba nivel internacional,?\s*/gi, ''],
    [/\ben el [áa]mbito internacional,?\s*/gi, ''],
    [/\ben el contexto peruano,?\s*/gi, ''],
    [/\ben el contexto (?:latinoamericano|nacional)\b,?\s*/gi, ''],
    // Decorative gerunds (pattern 3 + thesis session: "observando que", "resaltando")
    [/,\s*(?:observando|resaltando|destacando|notando|se[ñn]alando|evidenciando|subrayando) (?:que|la|el|c[oó]mo)\b[^,.;]*/gi, ''],
    [/\b(?:contribuyendo|ayudando) a (?:evidenciar|demostrar|comprender)\b[^,.;]*/gi, ''],
    // Filler (pattern 23)
    [/\bcon el (fin|objeto) de\b/gi, 'para'],
    [/\bcon la finalidad de\b/gi, 'para'],
    [/\bdebido al hecho de que\b/gi, 'porque'],
    [/\ba pesar del hecho de que\b/gi, 'aunque'],
    [/\ben este momento del tiempo\b/gi, 'ahora'],
    [/\bes importante (destacar|señalar|notar) que\s*/gi, ''],
    [/\bcabe (destacar|señalar|mencionar) (que)?\s*/gi, ''],
    [/\bde manera significativa\b/gi, 'de forma clara'],
    // Copula restoration (pattern 8)
    [/\brepresenta un papel (fundamental|crucial|vital|importante)\b/gi, 'es importante'],
    [/\brepresenta una parte fundamental\b/gi, 'es fundamental'],
    [/\bconstituye un (paso|avance) (importante|clave)\b/gi, 'es un paso importante'],
    // Significance inflation (pattern 1 + thesis session)
    [/\bcobra especial importancia\b/gi, 'importa'],
    [/\bresulta muy relevante\b/gi, 'importa'],
    [/\bconstituyen un colectivo de inter[eé]s\b/gi, 'interesan como población de estudio'],
    [/\bsiguen siendo relevantes\b/gi, 'siguen pesando'],
    [/\bsubrayaron la relevancia (?:de|del)\b/gi, 'destacaron'],
    [/\bmantiene una relaci[oó]n importante\b/gi, 'se relaciona'],
    [/\bpermiten establecer la pertinencia de\b/gi, 'justifican'],
    // AI vocabulary (pattern 7)
    [/\ben el panorama actual\b/gi, 'hoy'],
    [/\ben constante evoluci[oó]n\b/gi, 'en cambio'],
    [/\bsin duda alguna\b/gi, 'sin duda'],
    [/\bjuega un papel (fundamental|crucial|vital|importante)\b/gi, 'importa'],
    [/\bprofundizar en\b/gi, 'examinar'],
    [/\bpotenciar\b/gi, 'mejorar'],
    // Tack-on tails (pattern 3)
    [/,\s*subrayando (la|el) (importancia|necesidad)[^,.;]*/gi, ''],
    [/,\s*lo que (subraya|evidencia|destaca) (la|el)[^,.;]*/gi, ''],
    // Chat artifacts (pattern 20) — require terminal punctuation so normal
    // words like "claros" are never eaten ("Claro!" vs "claros").
    // Chatbot artifacts — anchored to sentence START and case-sensitive:
    // with /gi and a bare \b, "Claro[!.,]+" ate the word "claro" from normal
    // prose ("El resultado fue claro... y luego" → "El resultado fue y
    // luego"). The muletilla only exists as a sentence OPENER.
    [/(?:^|[.!?]\s+)Claro[!.,]+/g, ''],
    [/(?:^|[.!?]\s+)Por supuesto[!.,:]+/g, ''],
    [/\bEspero que (?:esto )?(?:te )?(?:ayude|sirva)[.!]?\s*/gi, ''],
    [/\bSi (tienes|tiene?s?) alguna (duda|pregunta)[^.]*\.?\s*/gi, ''],
    // Reassurance kickers (pattern 34)
    [/\by est[áa] bien\.?\s*/gi, ''],
    // Curly quotes (pattern 19)
    [/“|”/g, '"'],
    [/‘|’/g, "'"],
    // Em dash (pattern 14)
    [/\s—\s/g, ', '],
    [/\s–\s/g, ', ']
  ];

  for (const [re, replacement] of swaps) {
    out = out.replace(re, (matched: string) => {
      changes.push({ from: matched, to: replacement });
      return replacement;
    });
  }

  // Collapse doubled spaces / punctuation left by removals, and drop any
  // sentence the swaps emptied ENTIRELY (audit 2026-09-08: "Por lo anterior,
  // estos trabajos permiten aseverar que X." is 100% template — correctly
  // deleted whole, but in a multi-sentence paragraph it left a stray ". "
  // artifact; in a one-sentence input it returned an empty string).
  out = out
    .replace(/ {2,}/g, ' ')
    .replace(/\s+,/g, ',')
    .replace(/,\s*,/g, ',')
    .replace(/\.{4,}/g, '...')
    .replace(/\s+\./g, '.')
    .replace(/^[,;\s]+/, '')
    .replace(/\s+([,;])/g, '$1')
    .replace(/(?:^|[.!?]\s*)[\s,;]*[.!?](?=\s|$)/g, (m) => (/^[.!?]/.test(m) ? m.trim() : ' '))
    .replace(/\s{2,}/g, ' ')
    .trim();

  return { text: out, changes };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Offline paraphrase fallback
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Deterministic pseudo-random in [0,1) seeded by an integer.
 * Keeps the offline paraphrase reproducible for tests (no Math.random).
 */
function pseudoRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

/** Light synonym table (deterministic, safe swaps for academic Spanish). */
const SYNONYMS: Record<string, string[]> = {
  importante: ['relevante', 'significativo'],
  además: ['también', 'asimismo'],
  principalmente: ['sobre todo'],
  'sin embargo': ['no obstante'],
  'por lo tanto': ['por ende', 'en consecuencia'],
  también: ['asimismo', 'igualmente'],
  permite: ['posibilita'],
  'debido a': ['a causa de'],
  utiliza: ['emplea'],
  genera: ['produce'],
  varios: ['diversos', 'múltiples'],
  encontró: ['halló'],
  realizó: ['efectuó'],
  concluye: ['se infiere']
};

/**
 * Deterministic offline paraphrase: synonym substitution + connector rotation.
 * Used ONLY when no LLM is available. Far below LLM quality; the UI says so.
 */
export function paraphraseTextLocal(text: string, intensity: ParaphraseIntensity): string {
  if (!text.trim()) return text;
  const rate = getPreset(intensity).synonymRate;

  let wordIndex = 0;
  // Audit 2026-09-09: the old pattern \b(word(?:\s+word)?)\b matched GREEDY
  // 2-word groups ("importante genera"), so dictionary keys hiding inside
  // those bigrams were never substituted (measured: 0 of 7 dictionary words
  // in a normal sentence). Fix: match ONE word at a time; multi-word keys
  // ("sin embargo", "por lo tanto") are handled separately BEFORE the
  // per-word pass, on their OWN seed sequence so per-word draws are unchanged
  // from the original implementation (deterministic outputs stay stable).
  let pre = text;
  const multiKeys = Object.entries(SYNONYMS).filter(([k]) => k.includes(' '));
  for (let mi = 0; mi < multiKeys.length; mi++) {
    const [phrase, syns] = multiKeys[mi];
    const seed = 5000 + mi; // separate seed band: never shifts per-word draws
    if (pseudoRandom(seed) < rate) {
      const pick = syns[Math.floor(pseudoRandom(seed + 7) * syns.length) % syns.length];
      pre = pre.replace(new RegExp(`\\b${phrase}\\b`, 'gi'), (matched) =>
        matched[0] === matched[0].toUpperCase() ? pick.charAt(0).toUpperCase() + pick.slice(1) : pick
      );
    }
  }
  const out = pre.replace(
    /\b([\wáéíóúñÁÉÍÓÚÑ]+)\b/g,
    (word: string) => {
      wordIndex++;
      const lower = word.toLowerCase();
      const syns = SYNONYMS[lower];
      if (!syns || syns.length === 0) return word;
      if (pseudoRandom(wordIndex) < rate) {
        const pick = syns[Math.floor(pseudoRandom(wordIndex + 7) * syns.length) % syns.length];
        return word[0] === word[0].toUpperCase()
          ? pick.charAt(0).toUpperCase() + pick.slice(1)
          : pick;
      }
      return word;
    }
  );

  // Rotate the most formulaic connectors at higher intensities
  let rotated = out;
  if (intensity !== 'LIGHT') {
    rotated = rotated
      .replace(/\bPor lo tanto,/g, 'En consecuencia,')
      .replace(/\bEn este sentido,/g, 'Desde esta perspectiva,');
  }
  return rotated;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Spellcheck pre-check (offline dictionary approach)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Common Spanish student misspellings. A full RAE dictionary doesn't ship in
 * the browser; this covers high-frequency errors in academic essays.
 */
export const COMMON_MISSPELLINGS: Record<string, string> = {
  haiga: 'haya',
  'haber si': 'a ver si',
  habian: 'había',
  hubieron: 'hubo',
  asi: 'así',
  atras: 'atrás',
  traves: 'través',
  atravez: 'a través',
  despues: 'después',
  benir: 'venir',
  fuistes: 'fuiste',
  hicieste: 'hiciste',
  estoi: 'estoy',
  estaba: 'estaba', // no-op guard: valid form, kept out of findMisspellings below
  decia: 'decía',
  pader: 'poder',
  keiro: 'quiero',
  grasias: 'gracias',
  nadien: 'nadie',
  osea: 'o sea',
  xq: 'porque',
  alluda: 'ayuda',
  esperiencia: 'experiencia',
  ezcritura: 'escritura',
  enredar: 'enredar', // no-op guard
  imbescindible: 'imprescindible',
  imprecindible: 'imprescindible',
  inovacion: 'innovación',
  desiciones: 'decisiones',
  conbinación: 'combinación',
  posesion: 'posesión',
  tuberia: 'tubería',
  varon: 'varón',
  vendra: 'vendrá',
  sobervio: 'soberbio',
  trankilizar: 'tranquilizar',
  vueno: 'bueno',
  vajo: 'bajo',
  garage: 'garaje'
};

/** Entries that are valid words — excluded from the fast flag pass. */
const MISSPELLING_EXCLUSIONS = new Set(['estaba', 'enredar']);

export interface SpellIssue {
  word: string;
  suggestion: string;
  count: number;
}

/**
 * Scans for the high-frequency misspellings list. Not a full grammar engine —
 * the LLM corrector builds on this as a fast pre-check.
 */
export function findMisspellings(text: string): SpellIssue[] {
  const issues: SpellIssue[] = [];
  for (const [wrong, right] of Object.entries(COMMON_MISSPELLINGS)) {
    if (MISSPELLING_EXCLUSIONS.has(wrong)) continue;
    if (wrong === right) continue;
    const escaped = wrong.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`\\b${escaped}\\b`, 'gi');
    const matches = text.match(re);
    if (matches && matches.length > 0) {
      issues.push({ word: wrong, suggestion: right, count: matches.length });
    }
  }
  return issues.sort((a, b) => b.count - a.count);
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Result types shared with the service layer
// ─────────────────────────────────────────────────────────────────────────────

export interface AIDetectionLLMResult {
  verdict: 'HUMANO' | 'MIXTO' | 'IA';
  confidence: number;
  reasons: string[];
  modelUsed: string;
  isOfflineHeuristic: boolean;
}

export interface SpellcheckCorrection {
  original: string;
  corrected: string;
  explanation: string;
}

export interface SpellcheckResult {
  correctedText: string;
  corrections: SpellcheckCorrection[];
  modelUsed: string;
  isOfflineHeuristic: boolean;
}

export interface HumanizeResult {
  text: string;
  appliedStrategies: string[];
  changes: HumanizerChange[];
  remainingRisks: string[];
  modelUsed: string;
  isOfflineHeuristic: boolean;
}

export interface ParaphraseResult {
  text: string;
  intensity: ParaphraseIntensity;
  modelUsed: string;
  isOfflineHeuristic: boolean;
}

export interface PlagiarismLLMResult {
  overallScore: number;
  matches: PlagiarismMatch[];
  modelUsed: string;
  isOfflineHeuristic: boolean;
}

export type { AISettings };
