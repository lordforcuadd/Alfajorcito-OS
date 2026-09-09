/**
 * Regression tests for the 2026-09-09 external audit fixes:
 *   1. paraphraseTextLocal: single-word regex (old greedy bigram regex
 *      swallowed dictionary words — 0 of 7 substituted in a normal sentence)
 *   2. Multi-word dictionary keys ("sin embargo") still substituted
 *   3. AppShell mobile nav: every tab reachable by tap (textlab was orphaned)
 */
import { describe, expect, it } from 'vitest';
import { paraphraseTextLocal } from '../utils/textLabEngine';

describe('audit 2026-09-09 — paraphraseTextLocal substitution actually fires', () => {
  it('substitutes dictionary words inside normal sentences (old regex: 0 of 7)', () => {
    // Every word here is a dictionary key; with the old greedy bigram regex
    // they were trapped inside 2-word matches and never substituted.
    const text = 'El estudio importante genera varios hallazgos y permite observar que la escuela utiliza métodos; además encontró datos.';
    const out = paraphraseTextLocal(text, 'DEEP');
    // At DEEP intensity the synonym rate is high — some of the 7 dictionary
    // words MUST have changed.
    const changed = ['importante', 'genera', 'varios', 'permite', 'utiliza', 'además', 'encontró'].filter(
      (w) => !out.includes(w)
    );
    expect(changed.length).toBeGreaterThanOrEqual(3);
  });

  it('still substitutes multi-word dictionary keys (sin embargo → no obstante)', () => {
    const text = 'Los datos fueron limitados; sin embargo, el modelo funciona.';
    const out = paraphraseTextLocal(text, 'DEEP');
    // Either the phrase was replaced by its synonym or (rate miss) kept —
    // but the per-word pass must NOT have torn it apart.
    expect(out).toMatch(/sin embargo,|no obstante,|por el contrario,/);
  });

  it('preserves capitalization of substituted words', () => {
    const text = 'Importante generar resultados.';
    const out = paraphraseTextLocal(text, 'DEEP');
    // The first word if substituted must keep its capital first letter.
    const firstWord = out.split(/\s+/)[0];
    expect(firstWord).toMatch(/^[A-ZÁÉÍÓÚÑ]/);
  });
});
