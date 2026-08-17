import { describe, it, expect } from 'vitest';
import { analyzeInstructionsOffline } from '../services/aiService';

describe('Instruction Analyzer Suite (Offline Heuristic Engine)', () => {
  it('extracts word count target and citation style from academic prompt', () => {
    const consigna = `
      Estimados estudiantes:
      Para la entrega final de Taller de Tesis, deben presentar un ensayo crítico de 3500 a 4000 palabras.
      Es obligatorio utilizar normas APA 7 para todas las citas y referencias.
      Deben incluir al menos 8 fuentes académicas indexadas de los últimos 5 años.
      La entrega se realizará en archivo PDF formateado.
    `;

    const analysis = analyzeInstructionsOffline(consigna);
    expect(analysis.wordCountTarget).toBe(4000);
    expect(analysis.citationStyleExpected).toBe('APA_7');
    expect(analysis.maxSourceAgeYears).toBe(5);
    expect(analysis.explicitRequirements.some(r => r.includes('3500 a 4000 palabras'))).toBe(true);
    expect(analysis.explicitRequirements.some(r => r.includes('APA 7'))).toBe(true);
    expect(analysis.explicitRequirements.some(r => r.includes('8 fuentes'))).toBe(true);
  });

  it('detects IEEE and Vancouver styles', () => {
    const ieeeConsigna = 'Elaborar un informe técnico siguiendo el formato IEEE con referencias numeradas.';
    const ieeeAnalysis = analyzeInstructionsOffline(ieeeConsigna);
    expect(ieeeAnalysis.citationStyleExpected).toBe('IEEE');

    const vancouverConsigna = 'Presentar caso clínico bajo normas de citación Vancouver para ciencias médicas.';
    const vancouverAnalysis = analyzeInstructionsOffline(vancouverConsigna);
    expect(vancouverAnalysis.citationStyleExpected).toBe('VANCOUVER');
  });

  it('generates academic inferences and maintains separation from teacher instructions', () => {
    const consigna = 'Elaborar un ensayo crítico sobre la validez del modelo cognitivo-conductual en ansiedad.';
    const analysis = analyzeInstructionsOffline(consigna);

    expect(analysis.aiInferences.length).toBeGreaterThan(0);
    expect(analysis.aiInferences.some(inf => inf.includes('contraargumentación') || inf.includes('Introducción'))).toBe(true);
  });
});
