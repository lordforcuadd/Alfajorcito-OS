export type DraftFormattingType =
  | 'bold'
  | 'italic'
  | 'h2'
  | 'h3'
  | 'bullet'
  | 'number'
  | 'quote'
  | 'table';

export interface FormattingResult {
  updatedText: string;
  newCursorStart: number;
  newCursorEnd: number;
}

/**
 * Pure, deterministic formatting engine for academic drafts (APA 7 / Markdown).
 * Supports multiline list numbering, toggling, blockquotes, headings, and APA tables.
 */
export function computeDraftFormatting(
  currentText: string,
  start: number,
  end: number,
  type: DraftFormattingType
): FormattingResult {
  const selected = currentText.substring(start, end);
  let replacement = '';
  let newCursorStart = start;
  let newCursorEnd = end;

  switch (type) {
    case 'bold': {
      const isSingleBold =
        selected.startsWith('**') &&
        selected.endsWith('**') &&
        selected.length >= 4 &&
        !selected.slice(2, -2).includes('**');

      if (isSingleBold) {
        replacement = selected.slice(2, -2);
        newCursorStart = start;
        newCursorEnd = start + replacement.length;
      } else {
        const text = selected || 'Texto en negrita';
        replacement = `**${text}**`;
        newCursorStart = start + 2;
        newCursorEnd = start + 2 + text.length;
      }
      break;
    }
    case 'italic': {
      const interiorWithoutBold = selected.slice(1, -1).replace(/\*\*[^*]*\*\*/g, '');
      const isSingleItalic =
        selected.startsWith('*') &&
        selected.endsWith('*') &&
        selected.length >= 2 &&
        !selected.startsWith('**') &&
        !selected.endsWith('**') &&
        !interiorWithoutBold.includes('*');

      if (isSingleItalic) {
        replacement = selected.slice(1, -1);
        newCursorStart = start;
        newCursorEnd = start + replacement.length;
      } else {
        const text = selected || 'Texto en cursiva';
        replacement = `*${text}*`;
        newCursorStart = start + 1;
        newCursorEnd = start + 1 + text.length;
      }
      break;
    }
    case 'h2': {
      const text = selected.replace(/^#+\s*/, '') || 'Título de Sección';
      const prefix = start > 0 && !currentText.substring(0, start).endsWith('\n\n') ? (currentText.substring(0, start).endsWith('\n') ? '\n' : '\n\n') : '';
      const suffix = !currentText.substring(end).startsWith('\n') ? '\n' : '';
      replacement = `${prefix}## ${text}${suffix}`;
      newCursorStart = start + prefix.length + 3;
      newCursorEnd = newCursorStart + text.length;
      break;
    }
    case 'h3': {
      const text = selected.replace(/^#+\s*/, '') || 'Subtítulo';
      const prefix = start > 0 && !currentText.substring(0, start).endsWith('\n\n') ? (currentText.substring(0, start).endsWith('\n') ? '\n' : '\n\n') : '';
      const suffix = !currentText.substring(end).startsWith('\n') ? '\n' : '';
      replacement = `${prefix}### ${text}${suffix}`;
      newCursorStart = start + prefix.length + 4;
      newCursorEnd = newCursorStart + text.length;
      break;
    }
    case 'bullet': {
      if (selected.trim()) {
        const lines = selected.split('\n');
        const allBulleted = lines.every((l) => l.trim().startsWith('- '));
        if (allBulleted) {
          replacement = lines.map((l) => l.replace(/^(\s*)-\s+/, '$1')).join('\n');
        } else {
          replacement = lines.map((l) => {
            const clean = l.replace(/^(\s*)(?:-|\d+\.)\s+/, '$1');
            return `- ${clean}`;
          }).join('\n');
        }
        newCursorStart = start;
        newCursorEnd = start + replacement.length;
      } else {
        const prefix = start > 0 && !currentText.substring(0, start).endsWith('\n') ? '\n' : '';
        replacement = `${prefix}- Elemento de lista\n`;
        newCursorStart = start + prefix.length + 2;
        newCursorEnd = newCursorStart + 17;
      }
      break;
    }
    case 'number': {
      if (selected.trim()) {
        const lines = selected.split('\n');
        const allNumbered = lines.every((l) => /^\s*\d+\.\s+/.test(l));
        if (allNumbered) {
          replacement = lines.map((l) => l.replace(/^(\s*)\d+\.\s+/, '$1')).join('\n');
        } else {
          replacement = lines.map((l, i) => {
            const clean = l.replace(/^(\s*)(?:-|\d+\.)\s+/, '$1');
            return `${i + 1}. ${clean}`;
          }).join('\n');
        }
        newCursorStart = start;
        newCursorEnd = start + replacement.length;
      } else {
        const prefix = start > 0 && !currentText.substring(0, start).endsWith('\n') ? '\n' : '';
        replacement = `${prefix}1. Primer punto\n`;
        newCursorStart = start + prefix.length + 3;
        newCursorEnd = newCursorStart + 12;
      }
      break;
    }
    case 'quote': {
      const text = selected.replace(/^>\s*"?|"?$/g, '').trim() || 'Texto citado textualmente con más de 40 palabras...';
      const prefix = start > 0 && !currentText.substring(0, start).endsWith('\n\n') ? (currentText.substring(0, start).endsWith('\n') ? '\n' : '\n\n') : '';
      const suffix = !currentText.substring(end).startsWith('\n') ? '\n\n' : '\n';
      replacement = `${prefix}> "${text}" (Autor, 2024, p. 15)${suffix}`;
      newCursorStart = start + prefix.length + 3;
      newCursorEnd = newCursorStart + text.length;
      break;
    }
    case 'table': {
      const prefix = start > 0 && !currentText.substring(0, start).endsWith('\n\n') ? (currentText.substring(0, start).endsWith('\n') ? '\n' : '\n\n') : '';
      const tableContent = `| Variable | N | Media (M) | Desviación (DE) |\n| :--- | :---: | :---: | :---: |\n| Variable A | 100 | 25.4 | 3.8 |\n| Variable B | 100 | 18.2 | 2.5 |\n\n*Nota.* Datos descriptivos de la muestra.`;
      const suffix = !currentText.substring(end).startsWith('\n') ? '\n\n' : '';
      replacement = `${prefix}${tableContent}${suffix}`;
      newCursorStart = start + prefix.length;
      newCursorEnd = start + replacement.length;
      break;
    }
  }

  const updatedText = currentText.substring(0, start) + replacement + currentText.substring(end);
  return {
    updatedText,
    newCursorStart,
    newCursorEnd
  };
}
