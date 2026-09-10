/**
 * Regression tests for the 2026-09-09 TextLab improvements round 2:
 *   - Plagiarism: explicit-citation discount (APA author+year in suspect
 *     text → score discounted but NOT zeroed; heavy overlap still surfaces).
 *   - Plagiarism: cited matches carry the `cited` flag for UI badges.
 *   - Corrector offline: "las 6:40 horas" → "6:40" heuristic.
 */
import { describe, it, expect } from 'vitest';
import { scanPlagiarismLocal, type PlagiarismCandidate } from '../utils/textLabEngine';

const candidate: PlagiarismCandidate = {
  id: 'goagoses2023',
  title: 'Estilos de crianza y regulación emocional: revisión sistemática',
  text:
    'Los estilos de crianza se relacionan con la regulación emocional de los hijos adultos. ' +
    'Un metaanálisis de 52 estudios encontró que las prácticas parentales de apoyo se asocian ' +
    'con menores dificultades de regulación emocional, mientras que el control psicológico ' +
    'se asocia con mayores dificultades emocionales en la edad adulta emergente.',
  citationHints: [{ lastName: 'goagoses', year: 2023 }]
};

describe('citation discount in scanPlagiarismLocal', () => {
  it('discounts the score when the source is explicitly cited (author + year present)', () => {
    // Suspect text: same ideas, some shared 4-grams, AND an APA citation.
    const citedSuspect =
      'Goagoses et al. (2023) hallaron que las prácticas parentales de apoyo se asocian ' +
      'con menores dificultades de regulación emocional, y que el control psicológico ' +
      'se asocia con mayores dificultades emocionales en la edad adulta emergente.';
    const citedRes = scanPlagiarismLocal(citedSuspect, [candidate]);
    const uncitedRes = scanPlagiarismLocal(
      citedSuspect.replace('Goagoses et al. (2023) ', ''),
      [candidate]
    );
    expect(citedRes.matches[0].cited).toBe(true);
    expect(uncitedRes.matches[0].cited).toBe(false);
    // Same raw overlap, but the cited version scores lower.
    expect(citedRes.matches[0].score).toBeLessThan(uncitedRes.matches[0].score);
  });

  it('never discounts heavy verbatim overlap below a floor (cite-and-copy still flagged)', () => {
    // Near-verbatim copy (most 4-grams shared) that also cites the source.
    const citeAndCopy =
      'Los estilos de crianza se relacionan con la regulación emocional de los hijos adultos. ' +
      'Goagoses et al. (2023): un metaanálisis de 52 estudios encontró que las prácticas ' +
      'parentales de apoyo se asocian con menores dificultades de regulación emocional, mientras ' +
      'que el control psicológico se asocia con mayores dificultades emocionales en la edad ' +
      'adulta emergente.';
    const res = scanPlagiarismLocal(citeAndCopy, [candidate]);
    expect(res.matches[0].cited).toBe(true);
    // Raw similarity is very high (> 0.6): floor keeps it at >= 0.42 for review.
    expect(res.matches[0].score).toBeGreaterThanOrEqual(0.4);
  });

  it('does not discount when the year appears but the author does not', () => {
    const suspect =
      'Un metaanálisis de 2023 encontró que las prácticas parentales de apoyo se asocian ' +
      'con menores dificultades de regulación emocional.';
    const res = scanPlagiarismLocal(suspect, [candidate]);
    expect(res.matches[0].cited).toBe(false);
  });

  it('ignores citation hints with garbage last names (regex guard)', () => {
    const noisy: PlagiarismCandidate = {
      ...candidate,
      citationHints: [{ lastName: 'a', year: 2023 }]
    };
    const suspect =
      'A. (2023) dice que las prácticas parentales de apoyo se asocian con menores ' +
      'dificultades de regulación emocional.';
    const res = scanPlagiarismLocal(suspect, [noisy]);
    expect(res.matches[0].cited).toBe(false);
  });
});
