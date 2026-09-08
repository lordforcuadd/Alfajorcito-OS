import { describe, it, expect } from 'vitest';
import {
  detectAIText,
  detectRegister,
  tokenizeSentences,
  buildShingles,
  jaccardSimilarity,
  scanPlagiarismLocal,
  humanizeTextLocal,
  paraphraseTextLocal,
  findMisspellings,
  getPreset,
  PARAPHRASE_PRESETS,
  AI_VERDICT_LABELS,
  verdictLabel
} from '../utils/textLabEngine';

describe('Text Lab Engine Suite', () => {
  // ─── Sentence tokenizer (Safari-safe, no lookbehind) ───

  it('tokenizes sentences without regex lookbehind and keeps terminators', () => {
    const text = 'El estudio midió 380 casos. Los resultados fueron claros! ¿Y la hipótesis? Se confirmó.';
    const sentences = tokenizeSentences(text);
    expect(sentences.length).toBeGreaterThanOrEqual(3);
    expect(sentences.join(' ')).toBe(text.replace(/\s+/g, ' ').trim());
  });

  it('returns empty array for empty or whitespace-only text', () => {
    expect(tokenizeSentences('')).toEqual([]);
    expect(tokenizeSentences('   ')).toEqual([]);
  });

  // ─── AI detector ───

  it('scores AI-typical academic prose higher than varied human prose', () => {
    const aiSlop = 'En resumen, cabe destacar que la regulación emocional juega un papel fundamental en el panorama actual. Además, es importante señalar que los estudiantes presentan dificultades significativas en su evolución constante. En este sentido, los resultados subrayando la importancia de la intervención temprana representan un paso importante hacia el bienestar universitario. Por otra parte, la autoeficacia académica constituye un factor clave para el desempeño estudiantil y su desarrollo integral. Cabe destacar, además, que los hallazgos evidenciando la necesidad de programas de intervención oportunos reflejan una realidad compleja.';
    const human = 'Recolectamos 380 encuestas en tres aulas de la USMP entre mayo y julio. La mitad de los participantes respondió el DERS en papel; la otra mitad lo hizo online desde el celular. Solo 41 estudiantes completaron las tres mediciones, así que el análisis longitudinal quedó corto. Lo que sí salió claro: quienes reportaron más dificultades para aceptar sus emociones también durmieron peor (r = -0.42, p < .01). La profesora Huanca nos dijo que ese hallazgo replica lo de su muestra de Arequipa del 2019, con casi el mismo coeficiente. No esperábamos ese tamaño de efecto en una muestra tan joven; la literatura suele reportar efectos más modestos en estudiantes de primer ciclo. Queda pendiente separar por sexo, porque la distribución estaba desbalanceada (68% mujeres).';

    const aiResult = detectAIText(aiSlop);
    const humanResult = detectAIText(human);

    expect(aiSlop.length).toBeGreaterThanOrEqual(120);
    expect(human.length).toBeGreaterThanOrEqual(120);
    expect(aiResult.aiScore).toBeGreaterThan(humanResult.aiScore);
    expect(aiResult.issues.length).toBeGreaterThan(0);
    expect(aiResult.band).not.toBe('HUMANO'); // slop must not read as human
  });

  it('returns neutral result for texts shorter than the statistical threshold', () => {
    const short = 'Texto corto.';
    const r = detectAIText(short);
    expect(r.aiScore).toBe(0);
    expect(r.band).toBe('HUMANO');
    expect(r.issues).toEqual([]);
  });

  // ─── Calibration regression (validated against real model output) ───
  // These four cases were probed against actual Gemini academic output.
  // If this test fails, the detector has drifted — do NOT relax the
  // assertions to make it pass; recalibrate instead.

  it('flags typical Gemini academic prose as IA (calibration case 1)', () => {
    // Real-style Gemini paragraph: Tier-1 connectors + fórmulas, no data.
    const geminiNormal =
      'La regulación emocional es un proceso psicológico fundamental que permite a las personas gestionar sus respuestas ante situaciones estresantes. En este sentido, diversos estudios han demostrado que los estudiantes universitarios presentan niveles significativos de ansiedad durante su formación académica. Además, es importante destacar que el apoyo social juega un papel crucial en el bienestar psicológico de los jóvenes. Por lo tanto, resulta esencial desarrollar estrategias de afrontamiento adecuadas que promuevan una mejor calidad de vida. En conclusión, la literatura especializada coincide en la necesidad de abordar este problema desde una perspectiva integral, considerando tanto los factores individuales como los contextuales que influyen en el desarrollo emocional de los estudiantes. Asimismo, los hallazgos recientes subrayan la importancia de implementar programas de intervención temprana en el ámbito universitario. Cabe señalar que la evidencia empírica disponible respalda la eficacia de dichas intervenciones en poblaciones similares. En definitiva, la regulación emocional constituye un área de estudio relevante para la psicología contemporánea.';
    const r = detectAIText(geminiNormal);
    expect(r.band).toBe('IA');
    expect(r.aiScore).toBeGreaterThan(0.5);
  });

  it('keeps real student prose (data, process, voice) at HUMANO (calibration case 2)', () => {
    const humanoReal =
      'Recolectamos 380 encuestas en tres aulas de la USMP entre mayo y julio. La mitad respondió el DERS en papel; la otra mitad lo hizo online desde el celular. Solo 41 estudiantes completaron las tres mediciones, así que el análisis longitudinal quedó corto. Lo que sí salió claro: quienes reportaron más dificultades para aceptar sus emociones también durmieron peor (r = -0.42, p < .01). La profesora Huanca nos dijo que ese hallazgo replica lo de su muestra de Arequipa del 2019, con casi el mismo coeficiente. No esperábamos ese tamaño de efecto en una muestra tan joven; la literatura suele reportar efectos más modestos en estudiantes de primer ciclo. Queda pendiente separar por sexo, porque la distribución estaba desbalanceada (68% mujeres). El comité de ética pidió dos cambios antes de aprobar el protocolo: consentimiento firmado en papel y anonimato garantizado. Nos tomó tres semanas conseguir ambas cosas.';
    const r = detectAIText(humanoReal);
    expect(r.band).toBe('HUMANO');
    expect(r.aiScore).toBeLessThan(0.25);
  });

  it('keeps formal academic prose (citations, no IA tells) at HUMANO (calibration case 3)', () => {
    // The hard case: literature-review paragraph written by a human. Formal
    // register, varied citation cadence, specific data, no Tier-1 connectors.
    const humanoAcademico =
      'La regulación emocional ha sido definida por Gross (1999) como el conjunto de procesos mediante los cuales los individuos influyen en sus emociones. Estudios previos en población universitaria peruana reportan niveles elevados de dificultades en este dominio. Ponce y Telenchana (2023) evaluaron 312 estudiantes de una universidad privada de Quito con la escala DERS en su versión breve. Sus resultados muestran correlaciones moderadas entre déficits de regulación e indicadores de malestar psicológico. En el plano nacional, el estudio de Valencia et al. (2026) validó el cuestionario simplificado de regulación emocional con una muestra de 900 alumnos de cuatro universidades limeñas. Los autores reportaron adecuados índices de fiabilidad por consistencia interna. Convendría, sin embargo, examinar si esos hallazgos se sostienen en estudiantes de universidades públicas, dado que la mayoría de las muestras proviene de instituciones privadas. Esta investigación busca aportar evidencia sobre ese vacío específico en la literatura local.';
    const r = detectAIText(humanoAcademico);
    expect(r.band).toBe('HUMANO');
    expect(r.aiScore).toBeLessThan(0.25);
  });

  it('flags Gemini-with-data prose as IA despite concrete numbers (calibration case 4)', () => {
    // Deceptive case: model output WITH citations/figures. The Tier-1
    // connectors must still carry it over the IA threshold.
    const geminiConDatos =
      'Un estudio de Zhang et al. (2026) con 4,396 estudiantes halló correlaciones significativas entre estilos de crianza y regulación emocional. En este sentido, la investigación contemporánea subraya la importancia del contexto familiar. Por lo tanto, es fundamental considerar el rol de los padres. Además, diversos estudios han demostrado que los programas de intervención mejoran las estrategias de afrontamiento. En conclusión, estos hallazgos respaldan la necesidad de seguir investigando en poblaciones hispanohablantes. Asimismo, cabe señalar que las limitaciones metodológicas de los estudios primarios deben ser consideradas al interpretar los resultados. En definitiva, la evidencia disponible permite establecer la pertinencia de profundizar en esta línea de investigación, considerando tanto las variables individuales como los factores contextuales que han sido documentados en la literatura especializada internacional.';
    const r = detectAIText(geminiConDatos);
    expect(r.band).toBe('IA');
    expect(r.aiScore).toBeGreaterThan(0.5);
  });

  it('clamps aiScore to [0, 1] and classifies bands consistently', () => {
    const r = detectAIText('x'.repeat(200));
    expect(r.aiScore).toBeGreaterThanOrEqual(0);
    expect(r.aiScore).toBeLessThanOrEqual(1);
  });

  // ─── QuillBot-style three-way distribution ───

  it('produces a distribution that sums to 100 with per-sentence classes', () => {
    const gemini =
      'La regulación emocional es un proceso fundamental. En este sentido, diversos estudios han demostrado su importancia. Los datos concretos escasean en este tipo de párrafo formal. Por lo tanto, resulta esencial seguir investigando este fenómeno complejo. En conclusión, la evidencia respalda esta aproximación.';
    const r = detectAIText(gemini);
    expect(r.distribution.ai + r.distribution.mixed + r.distribution.human).toBe(100);
    expect(r.distribution.ai).toBeGreaterThanOrEqual(0);
    expect(r.distribution.human).toBeLessThanOrEqual(100);
    expect(r.sentences.length).toBeGreaterThan(0);
    for (const s of r.sentences) {
      expect(['HUMANO', 'MIXTO', 'IA']).toContain(s.band);
      expect(s.score).toBeGreaterThanOrEqual(0);
      expect(s.score).toBeLessThanOrEqual(1);
      expect(s.text.length).toBeGreaterThan(0);
    }
  });

  it('classifies AI-heavy sentences as IA and clean human sentences as HUMANO', () => {
    const mixed =
      'Por lo tanto, resulta esencial considerar estos factores y es importante señalar que además. Recolectamos 380 encuestas en tres aulas y solo 41 completaron todo.';
    const r = detectAIText(mixed);
    const aiSentences = r.sentences.filter((s) => s.band === 'IA');
    const humanSentences = r.sentences.filter((s) => s.band === 'HUMANO');
    expect(aiSentences.length).toBeGreaterThan(0);
    expect(humanSentences.length).toBeGreaterThan(0);
  });

  it('short-text early return exposes the new fields', () => {
    const r = detectAIText('Corto.');
    expect(r.sentences).toEqual([]);
    expect(r.distribution).toEqual({ ai: 0, mixed: 0, human: 100 });
  });

  // ─── Shingles & plagiarism ───

  it('builds stopword-filtered shingles and detects verbatim copying', () => {
    const original = 'La regulación emocional es un proceso complejo que involucra la evaluación de respuestas afectivas.';
    const verbatim = 'La regulación emocional es un proceso complejo que involucra la evaluación de respuestas afectivas.';
    const unrelated = 'Los estudiantes de psicología aprobaron el examen de estadística inferencial sin problemas.';

    const s1 = buildShingles(original, 4);
    expect(s1.size).toBeGreaterThan(0);

    const same = jaccardSimilarity(buildShingles(verbatim, 4), s1);
    const diff = jaccardSimilarity(buildShingles(unrelated, 4), s1);
    expect(same).toBeGreaterThan(0.8);
    expect(diff).toBeLessThan(0.15);
  });

  it('reports near-zero similarity for paraphrased text with different words', () => {
    const original = 'La regulación emocional es un proceso complejo que involucra la evaluación de respuestas afectivas.';
    const paraphrase = 'Manejar las emociones supone un mecanismo intrincado donde se valoran las reacciones del ánimo.';
    const score = jaccardSimilarity(buildShingles(original, 4), buildShingles(paraphrase, 4));
    expect(score).toBeLessThan(0.2);
  });

  it('scanPlagiarismLocal ranks the matching source first with its score', () => {
    const suspect = 'La regulación emocional es un proceso complejo que involucra la evaluación de respuestas afectivas del individuo.';
    const corpus = [
      { id: 'src-a', title: 'Fuente A', text: 'Contenido completamente distinto sobre historia del Perú incaico y la conquista española.' },
      { id: 'src-b', title: 'Fuente B', text: 'La regulación emocional es un proceso complejo que involucra la evaluación de respuestas afectivas del individuo.' }
    ];
    const report = scanPlagiarismLocal(suspect, corpus);
    expect(report.matches[0].sourceId).toBe('src-b');
    expect(report.matches[0].score).toBeGreaterThan(0.5);
    expect(report.overallScore).toBe(report.matches[0].score);
  });

  it('handles empty corpus gracefully', () => {
    const report = scanPlagiarismLocal('Cualquier texto sospechoso medianamente largo.', []);
    expect(report.matches).toEqual([]);
    expect(report.overallScore).toBe(0);
  });

  // ─── Local humanizer ───

  it('strips AI filler phrases and restores simple copulas', () => {
    const slop = 'Es importante destacar que la regulación emocional juega un papel fundamental. Debido al hecho de que los estudiantes sufren, se requiere intervención. Con el fin de mejorar, se propuso el programa.';
    const { text, changes } = humanizeTextLocal(slop);
    expect(changes.length).toBeGreaterThan(0);
    // "juega un papel fundamental" → "importa"
    expect(text).toContain('importa');
    // "Debido al hecho de que" → "porque"
    expect(text).toContain('porque');
    // "Con el fin de" → "para"
    expect(text).toContain('para');
    expect(text).not.toContain('Es importante destacar');
    expect(text).not.toContain('juega un papel');
    expect(text).not.toContain('Debido al hecho');
    expect(text).not.toContain('Con el fin de');
  });

  it('converts curly quotes and em dashes to plain punctuation', () => {
    const slop = 'El estudio dijo “algo” — y lo otro también.';
    const { text } = humanizeTextLocal(slop);
    expect(text).toContain('"algo"');
    expect(text).not.toContain('“');
    expect(text).not.toMatch(/\s—\s/);
  });

  it('leaves clean text untouched (no false-positive rewrites)', () => {
    const clean = 'El estudio midió 380 casos. Los resultados fueron claros.';
    const { text, changes } = humanizeTextLocal(clean);
    expect(text).toBe(clean);
    expect(changes).toEqual([]);
  });

  // ─── Thesis-session skeleton patterns (validated 0% detector rewrites) ───

  it('strips circular closings from thesis-template paragraphs', () => {
    const slop = 'Varios autores estudiaron la regulación emocional. Por lo anterior, los antecedentes revisados permiten aseverar que la regulación emocional es relevante.';
    const { text } = humanizeTextLocal(slop);
    expect(text).not.toContain('permiten aseverar');
    expect(text).not.toContain('Por lo anterior');
    // The factual content before the circular closing survives
    expect(text).toContain('regulación emocional');
  });

  it('removes repeated geographic template labels', () => {
    const slop = 'En el marco internacional, Zhang (2026) analizó 4.396 casos. A nivel internacional, otros estudios replicaron el hallazgo.';
    const { text } = humanizeTextLocal(slop);
    expect(text).not.toContain('En el marco internacional');
    expect(text).not.toContain('A nivel internacional');
    // Citations survive intact
    expect(text).toContain('Zhang (2026)');
    expect(text).toContain('4.396');
  });

  it('removes decorative gerund tails without eating the finding', () => {
    const slop = 'Vargas et al. (2025) vincularon la variable con la ansiedad, observando que los efectos eran consistentes.';
    const { text } = humanizeTextLocal(slop);
    expect(text).not.toMatch(/,\s*observando que/);
    expect(text).toContain('Vargas et al. (2025)');
    expect(text).toContain('vincularon');
  });

  it('deflates significance-inflation phrases from real thesis drafts', () => {
    const slop = 'La etapa universitaria cobra especial importancia. Los universitarios constituyen un colectivo de interés. La variable mantiene una relación importante con el bienestar.';
    const { text } = humanizeTextLocal(slop);
    expect(text).not.toContain('cobra especial importancia');
    expect(text).not.toContain('colectivo de interés');
    expect(text).not.toContain('mantiene una relación importante');
    expect(text).toContain('importa');
  });

  // ─── Verdict labels (GPTZero-style three-way display) ───

  it('exposes the three user-facing verdict labels', () => {
    expect(AI_VERDICT_LABELS.IA).toBe('Generado por IA');
    expect(AI_VERDICT_LABELS.MIXTO).toBe('Escrito por personas y pulido por IA');
    expect(AI_VERDICT_LABELS.HUMANO).toBe('Escrito por personas');
    expect(verdictLabel('HUMANO')).toBe('Escrito por personas');
    expect(verdictLabel('MIXTO')).toBe('Escrito por personas y pulido por IA');
    expect(verdictLabel('IA')).toBe('Generado por IA');
  });

  // ─── Offline paraphrase ───

  it('applies deterministic synonym substitutions at DEEP intensity', () => {
    const text = 'El estudio encontró resultados importantes. Sin embargo, varios factores generan confusión.';
    const out = paraphraseTextLocal(text, 'DEEP');
    expect(out).not.toBe(text);
    // Deterministic: same input, same output (no Math.random)
    expect(paraphraseTextLocal(text, 'DEEP')).toBe(out);
  });

  it('preserves words without synonyms at LIGHT intensity', () => {
    const text = 'El constructo de regulación emocional opera mediante mecanismos específicos.';
    const out = paraphraseTextLocal(text, 'LIGHT');
    expect(out).toBe(text); // no synonyms registered for these words
  });

  // ─── Presets ───

  it('exposes the three intensity presets with ordered rates', () => {
    expect(PARAPHRASE_PRESETS.map((p) => p.id)).toEqual(['LIGHT', 'BALANCED', 'DEEP']);
    expect(PARAPHRASE_PRESETS[0].synonymRate).toBeLessThan(PARAPHRASE_PRESETS[1].synonymRate);
    expect(PARAPHRASE_PRESETS[1].synonymRate).toBeLessThan(PARAPHRASE_PRESETS[2].synonymRate);
    expect(getPreset('BALANCED').label).toBe('Equilibrado');
    // Unknown id falls back to BALANCED
    expect(getPreset('NOPE' as never).id).toBe('BALANCED');
  });

  // ─── Misspellings ───

  it('flags high-frequency Spanish misspellings with suggestions', () => {
    const text = 'Los estudiantes hubieron dificultades y despues del examen se fueron atras. Osea, no llegaron a tiempo porque no han de haber estudiado, haiga lo que haiga.';
    const issues = findMisspellings(text);
    const words = issues.map((i) => i.word);
    expect(words).toContain('hubieron');
    expect(words).toContain('despues');
    expect(words).toContain('atras');
    expect(issues[0].suggestion.length).toBeGreaterThan(0);
  });

  it('does not flag correctly written words', () => {
    const text = 'La regulación emocional, además, fue medida con el DERS en 380 participantes.';
    const issues = findMisspellings(text);
    // 'además' correctly written must NOT match the 'ademas' typo entry
    expect(issues.find((i) => i.word === 'ademas')).toBeUndefined();
    expect(issues).toEqual([]);
  });

  // ─── Register detection (2026-09-08 humanizer failure) ───

  it('detects casual vs formal register before rewriting', () => {
    const casual =
      'Hoy la alarma sonó a las 6:40 y, sinceramente, la pospuse dos veces. Tenía cero ganas de salir de la cama porque la mañana estaba fría, pero bueno, no quedaba de otra. Me levanté arrastrando los pies y me preparé un café bien cargado para terminar de despertar.';
    const formal =
      'La regulación emocional constituye un proceso fundamental (Gross, 2015). Asimismo, diversos estudios han demostrado su relación con el desempeño académico. En este sentido, resulta esencial examinar los estilos de crianza como predictores (Ponce y Telenchana, 2023). Por lo tanto, el presente estudio evalúa dicha relación en universitarios peruanos.';
    expect(detectRegister(casual)).toBe('CASUAL');
    expect(detectRegister(formal)).toBe('FORMAL');
  });

  // ─── Bureaucratic register-shift rules (damaged-text regression) ───

  it('flags the bureaucratic register-shift damage from the old humanizer', () => {
    const damaged =
      'El despertador sonó a las 06:40 horas, intervalo que precedió a dos postergaciones consecutivas. La escasa motivación matutina derivó de las bajas temperaturas ambientales, condición que obligó al inicio de la jornada. Tras el desplazamiento inicial, se procedió a la ebullición de agua para la preparación de café concentrado. Los pendientes programados sufrieron una interrupción debido a una incidencia técnica menor. El desplazamiento hacia el establecimiento comercial local respondió a la necesidad de movilidad.';
    const r = detectAIText(damaged);
    const labels = r.issues.map((i) => i.label);
    expect(labels.some((l) => l.includes('Burocratización'))).toBe(true);
    expect(labels.some((l) => l.includes('Léxico de informe'))).toBe(true);
    expect(r.aiScore).toBeGreaterThan(0.3);
  });

  it('does not flag normal casual Spanish with a "¿no?" tag question', () => {
    const casual =
      'Salí un rato a la tienda, a buscar agua y algo para picar. Solo para estirar las piernas y tomar aire, ¿no? En el camino me crucé con un perro echado al sol. Por un segundo le envidié la calma. De regreso terminé lo que me faltaba del trabajo y me puse a hacer ejercicio en el piso. Cené algo ligero y me puse una serie hasta que me ganó el sueño.';
    const r = detectAIText(casual);
    const tagIssue = r.issues.find((i) => i.label === 'Pregunta retórica inmediata');
    expect(tagIssue).toBeUndefined();
    expect(r.band).toBe('HUMANO');
  });

  it('flags doubled-word sampling glitches from high-temperature rewrites', () => {
    const glitch =
      'Me preparé una taza de café bien cargado para terminar de despertar mientras miraba el celular. Después calenté las sobras de ayer y me puse a comer viendo un un video cualquiera en YouTube. Luego limpié un poco el escritorio que ya era un desorden de cables y papeles. Por la tarde salí a comprar agua y algo para picar. Terminé lo que me faltaba del trabajo sin mayores problemas.';
    const r = detectAIText(glitch);
    expect(r.issues.some((i) => i.label.includes('Palabra duplicada'))).toBe(true);
  });

  // ─── Round 3 (2026-09-08): caricature slang + structural template ───

  it('humanizeTextLocal chain: no orphaned prefixes from overlapping swaps (audit 2026-09-08)', () => {
    // The old split rules ate each other's anchors and left dangling prefixes.
    const { text: t1, changes: c1 } = humanizeTextLocal(
      'En conjunto, estos estudios evidencian que la familia importa en el desarrollo.'
    );
    expect(t1).not.toMatch(/^(?:en conjunto|en este sentido|por lo anterior)[,;\s]*$/i);
    expect(c1.length).toBeGreaterThan(0);

    const { text: t2 } = humanizeTextLocal(
      'En este sentido, tales resultados evidencian que el apego importa.'
    );
    expect(t2).not.toMatch(/^(?:en conjunto|en este sentido)[,;\s]*$/i);
  });

  it('humanizeTextLocal never eats the normal word "claro" from prose', () => {
    const src = 'El resultado fue claro... y luego continuó la clase de hoy.';
    const { text } = humanizeTextLocal(src);
    expect(text).toContain('claro');
    // but the chatbot muletilla at sentence start IS removed
    const { text: t2 } = humanizeTextLocal('Claro! Te explico el método.');
    expect(t2).not.toMatch(/^claro/i);
  });

  it('humanizeTextLocal swap replacement does not duplicate the following word', () => {
    const { text } = humanizeTextLocal(
      'Los antecedentes revisados permiten establecer la pertinencia de estudiar la regulación.'
    );
    expect(text).not.toMatch(/(\b\w+)\s+\1\b/); // no doubled words like "estudiar estudiar"
    expect(text).toContain('justifican estudiar');
  });

  it('flags the slang-caricature over an academic skeleton (GPTZero 98% AI case)', () => {
    const caricature = `Pucha, los estilos de crianza pesan harto en cómo uno maneja sus emociones, porque todo lo que pasa en la familia te marca la forma de expresarlas. Por ejemplo, Goagoses et al. (2023) revisaron un montón de estudios y cacharon que ciertas prácticas de los papás se cruzan con problemas para regular las emociones, para bien o para mal. Ponce y Telenchana (2023) también le dieron vueltas a esto al investigar la regulación emocional y el bienestar en universitarios. Y ojo, Murillo-Jiménez y Torres-Villalobos (2025) se mandaron un trabajo sobre estrategias cognitivas en estudiantes de Lima Metropolitana, viendo que algunas mañas mentales te ayudan a aguantar el estrés. Al final, toda esta movida familiar y emocional importa caleta para entender cómo crecemos, sobre todo cuando uno ya empieza a volar solo.

Saber regularse es lo que te salva para responder y aguantar el ritmo de la vida diaria. Esto se vuelve ultra necesario en la universidad, entre tanta exigencia de estudios, notas y gente que te puede descolocar. Sobre esto, Wu et al. (2025) pillaron que los malos tratos de crianza en estudiantes universitarios se pegan con la depre y con usar puras estrategias emocionales pencas. Por su parte, Vargas et al. (2025) le echaron un ojo a los compas mexicanos y vieron cómo se relaciona el tema con la ansiedad, el estrés y las habilidades sociales. Acá en el Perú, Amau-Rios et al. (2025) estudiaron la salud mental de los universitarios y cacharon que irse al chancho con el control emocional o no controlarse nada se vincula con varios temas de salud mental. En bola simple, todo esto muestra que regular lo que sientes va de la mano con tu bienestar y con cómo apechugas con la vida universitaria.

La conexión entre lo que viviste en casa y cómo controlas tus emociones es bien directa, porque las peleas o apapachos de familia te enseñan a reaccionar. Afuera, Zhang et al. (2026) analizaron a 4.396 estudiantes para ver si la crianza afectaba esta regulación, y sus resultados confirman que los tratos de casa te dejan mañas emocionales para la U. En Latinoamérica, Moysén Chimal y Figueroa Mora (2025) estudiaron las competencias emocionales y cómo se defienden los universitarios mexicanos, mientras que en Perú, Valencia et al. (2026) se armaron un análisis psicométrico del cuestionario de regulación emocional con nuestros estudiantes. Estos antecedentes tiran luces de que sí vale la pena investigar la vaina emocional y mirar qué tanto influye la familia.

Los universitarios son carnecita para estudiar esto, porque les toca cambiar de vida de golpe y aguantar presiones que te bajan el ánimo. Afuera, Athira (2024) le metió cabeza a cómo la crianza choca con la regulación emocional y la indefensión en jóvenes de 18 a 25 años, mostrando que la infancia te sigue pesando en esta etapa. En Latinoamérica, Estrada Carmona et al. (2025) le entraron al apego como base de las emociones en chavos mexicanos, viendo lo vital del cariño temprano para armarte de herramientas emocionales. Y en Perú, Aparco-Osorio y Delgado (2024) investigaron a jóvenes de un instituto en Huancayo para ver cómo la regulación emocional afecta las peleas con la pareja. Con esto se cacha que las emociones se mueven distinto según tus relaciones y la adultez joven.

Cuando uno ya es medio adulto, la familia sigue jugando un rol en cómo sales del paso ante los atados emocionales. Fuera del país, Di Pentima y Toni (2026) estudiaron cómo un cuidado familiar medio roto te desarregla las emociones, sin dejar de lado el apego y la alexitimia. En el barrio latinoamericano, Intriago Pita (2026) le atinó a la relación entre regularse y la ansiedad en universitarios jóvenes, lo que te hace ver que esta etapa viene con cambios brax. En el terreno peruano, Apaza Bejarano (2025) cruzó la regulación emocional con el género en 277 estudiantes de Arequipa, y vio que hay que seguir investigando el tema. Por todo esto, los antecedentes dejan ver que la regulación emocional en jóvenes adultos está amarrada a la familia, a uno mismo y a lo que te exige la U.`;
    const r = detectAIText(caricature);
    const labels = r.issues.map((i) => i.label);
    expect(labels.some((l) => l.includes('Jerga de caricatura'))).toBe(true);
    expect(labels.some((l) => l.includes('Plantilla geográfica'))).toBe(true);
    expect(labels.some((l) => l.includes('Cierres circulares'))).toBe(true);
    // The whole-document verdict must agree with neural detectors (98% AI),
    // and the 3-bar distribution must not contradict the verdict band.
    expect(r.band).toBe('IA');
    expect(r.distribution.human).toBeLessThanOrEqual(10);
  });

  it('does not flag real human academic prose with normal citation flow', () => {
    const human = `Los estilos de crianza configuran el repertorio inicial de estrategias con las que una persona afronta sus emociones. Gross (2015) propuso el modelo de regulación emocional que domina la investigación actual. En la misma línea, Zhang et al. (2026) aplicaron el ERQ a 4.396 estudiantes chinos y hallaron una asociación directa entre crianza autoritativa y reevaluación.

Moysén Chimal y Figueroa Mora (2025) evaluaron competencias emocionales en universitarios mexicanos. Ponce y Telenchana (2023) trabajaron con estudiantes ecuatorianos de la Universidad Técnica de Ambato y reportaron correlaciones positivas entre regulación y bienestar. Apaza Bejarano (2025) midió la regulación emocional en 277 estudiantes de Arequipa con diseño comparativo por sexo. La revisión de estos antecedentes justifica el estudio en universitarios de Lima.`;
    const r = detectAIText(human);
    expect(r.band).toBe('HUMANO');
    expect(r.issues.filter((i) => i.label.includes('Plantilla geográfica'))).toHaveLength(0);
  });
});
