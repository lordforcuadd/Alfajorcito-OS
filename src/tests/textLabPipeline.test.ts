/**
 * Regression tests for the 4-phase chat-procedure humanizer pipeline
 * (audit → fragment rewrite → self-audit → surgical fix), 2026-09-08.
 * Covers the deterministic units the pipeline depends on:
 *   - detourLLMUniformity: decimal-number protection + fragment merging
 *   - chunkIncludes: fuzzy audit-quote containment
 */
import { describe, expect, it } from 'vitest';
import { chunkIncludes, detourLLMUniformity } from '../services/textLabService';

describe('textLabService — humanizer pipeline units (chat-procedure, 2026-09-08)', () => {
  // ── detourLLMUniformity ──────────────────────────────────────────────────

  it('never splits decimal numbers across sentences (E2E caught "4. 396")', () => {
    const input =
      'Con 4.396 estudiantes, Zhang et al. (2026) hallaron efectos. La media fue 3.14 puntos. Un tercer valor 12.566 aparece aquí. Cuarta oración normal. Quinta oración.';
    const out = detourLLMUniformity(input);
    expect(out).toContain('4.396');
    expect(out).toContain('3.14');
    expect(out).toContain('12.566');
    expect(out).not.toContain('4. 396');
    expect(out).not.toContain('3. 14');
    expect(out).not.toContain('12. 566');
  });

  it('merges staccato conjunction fragments into the previous sentence', () => {
    const input =
      'Trabajé toda la mañana en el informe final. Y nada. Luego salí a caminar un rato largo. Pero ni modo.';
    const out = detourLLMUniformity(input);
    // The tiny "Y nada." / "Pero ni modo." fragments must NOT survive as
    // standalone sentences — they merge into their predecessor.
    expect(out).not.toMatch(/\bY nada\.\s/);
    expect(out).not.toMatch(/\bPero ni modo\.\s*$/);
  });

  it('normalizes LLM typography: curly quotes, em dashes, ellipsis char', () => {
    const input = 'Dijo \u201Cesto es una prueba\u201D \u2014 y luego \u2026 se fue a casa. Segunda oración aquí normal. Tercera oración del texto. Cuarta oración.';
    const out = detourLLMUniformity(input);
    expect(out).toContain('"esto es una prueba"');
    expect(out).not.toContain('\u201C');
    expect(out).not.toContain('\u2014');
    expect(out).toContain('...');
  });

  it('preserves paragraph structure (no collapse into one block)', () => {
    const p1 = 'Primera oración del primer párrafo del texto. Segunda oración del mismo. Tercera oración que sigue. Cuarta para completar.';
    const p2 = 'Primer párrafo segundo bloque del texto. Segunda oración distinta. Tercera oración variada. Cuarta oración final.';
    const out = detourLLMUniformity(`${p1}\n\n${p2}`);
    expect(out.split(/\n\s*\n/).filter((p) => p.trim())).toHaveLength(2);
  });

  // ── chunkIncludes ────────────────────────────────────────────────────────

  it('matches audit quotes ignoring whitespace and case differences', () => {
    const chunk = 'El clima familiar moldea la regulación  emocional de los jóvenes universitarios en el Perú.';
    expect(chunkIncludes(chunk, 'el clima familiar moldea la regulación emocional')).toBe(true);
    expect(chunkIncludes(chunk, 'EL CLIMA FAMILIAR MOLDEA LA REGULACIÓN   EMOCIONAL')).toBe(true);
  });

  it('rejects quotes that are not in the chunk and too-short needles', () => {
    const chunk = 'Un párrafo cualquiera sin relación con la cita.';
    expect(chunkIncludes(chunk, 'Los estilos de crianza moldean emociones ajenas')).toBe(false);
    expect(chunkIncludes(chunk, 'corto')).toBe(false);
  });
});
