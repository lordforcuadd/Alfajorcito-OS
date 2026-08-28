import { describe, it, expect } from 'vitest';
import { computeDraftFormatting } from '../utils/draftFormattingEngine';

describe('Draft Formatting Engine Suite', () => {
  it('toggles bold formatting correctly when text is selected', () => {
    // Apply bold
    const result1 = computeDraftFormatting('Hola mundo', 5, 10, 'bold');
    expect(result1.updatedText).toBe('Hola **mundo**');
    expect(result1.newCursorStart).toBe(7);
    expect(result1.newCursorEnd).toBe(12);

    // Remove bold (toggle)
    const result2 = computeDraftFormatting('Hola **mundo**', 5, 14, 'bold');
    expect(result2.updatedText).toBe('Hola mundo');
    expect(result2.newCursorStart).toBe(5);
    expect(result2.newCursorEnd).toBe(10);
  });

  it('toggles italic formatting correctly', () => {
    // Apply italic
    const result1 = computeDraftFormatting('Cita textual', 0, 4, 'italic');
    expect(result1.updatedText).toBe('*Cita* textual');

    // Remove italic (toggle)
    const result2 = computeDraftFormatting('*Cita* textual', 0, 6, 'italic');
    expect(result2.updatedText).toBe('Cita textual');
  });

  it('inserts headings (h2 and h3) with appropriate spacing', () => {
    const resultH2 = computeDraftFormatting('Introducción', 0, 12, 'h2');
    expect(resultH2.updatedText).toBe('## Introducción\n');

    const resultH3 = computeDraftFormatting('Participantes', 0, 13, 'h3');
    expect(resultH3.updatedText).toBe('### Participantes\n');
  });

  it('numbers multiline selections sequentially and toggles them off', () => {
    const multiLine = 'Primer punto\nSegundo punto\nTercer punto';
    
    // Apply numbering
    const numbered = computeDraftFormatting(multiLine, 0, multiLine.length, 'number');
    expect(numbered.updatedText).toBe('1. Primer punto\n2. Segundo punto\n3. Tercer punto');

    // Toggle off numbering
    const untoggled = computeDraftFormatting(numbered.updatedText, 0, numbered.updatedText.length, 'number');
    expect(untoggled.updatedText).toBe('Primer punto\nSegundo punto\nTercer punto');
  });

  it('applies bullet lists and toggles them off', () => {
    const multiLine = 'Item A\nItem B';
    
    // Apply bullets
    const bulleted = computeDraftFormatting(multiLine, 0, multiLine.length, 'bullet');
    expect(bulleted.updatedText).toBe('- Item A\n- Item B');

    // Toggle off bullets
    const unbulleted = computeDraftFormatting(bulleted.updatedText, 0, bulleted.updatedText.length, 'bullet');
    expect(unbulleted.updatedText).toBe('Item A\nItem B');
  });

  it('wraps text into APA 7 blockquote', () => {
    const text = 'Esta es una cita textual con más de 40 palabras.';
    const quoted = computeDraftFormatting(text, 0, text.length, 'quote');
    expect(quoted.updatedText).toContain('> "Esta es una cita textual con más de 40 palabras." (Autor, 2024, p. 15)');
  });

  it('inserts an APA 7 table markdown skeleton', () => {
    const tableResult = computeDraftFormatting('', 0, 0, 'table');
    expect(tableResult.updatedText).toContain('| Variable | N | Media (M) | Desviación (DE) |');
    expect(tableResult.updatedText).toContain('*Nota.* Datos descriptivos de la muestra.');
  });
});
