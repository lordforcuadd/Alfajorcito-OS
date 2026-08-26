import type { Work, Source, CitationStyle, UserProfile } from '../types';
import { formatFullReferenceHTML } from './citationEngine';

function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function formatLocalFloatingDateTime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  return `${y}${m}${d}T${hh}${mm}${ss}`;
}

function inlineMarkdown(text: string): string {
  if (!text) return '';
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>');
}

function convertMarkdownToRichHtml(markdown: string): string {
  if (!markdown || !markdown.trim()) return '';

  const blocks = markdown.split(/\n\s*\n/);
  const htmlBlocks: string[] = [];

  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;

    // Headings
    if (trimmed.startsWith('### ')) {
      const text = inlineMarkdown(trimmed.replace(/^###\s+/, ''));
      htmlBlocks.push(`<h3 style="font-family: 'Times New Roman', Times, serif; font-size: 12pt; font-weight: bold; font-style: italic; margin-top: 14pt; margin-bottom: 6pt; line-height: 2.0;">${text}</h3>`);
      continue;
    }
    if (trimmed.startsWith('## ')) {
      const text = inlineMarkdown(trimmed.replace(/^##\s+/, ''));
      htmlBlocks.push(`<h2 style="font-family: 'Times New Roman', Times, serif; font-size: 12pt; font-weight: bold; margin-top: 18pt; margin-bottom: 8pt; line-height: 2.0;">${text}</h2>`);
      continue;
    }
    if (trimmed.startsWith('# ')) {
      const text = inlineMarkdown(trimmed.replace(/^#\s+/, ''));
      htmlBlocks.push(`<h1 style="font-family: 'Times New Roman', Times, serif; font-size: 12pt; font-weight: bold; text-align: center; margin-top: 18pt; margin-bottom: 12pt; line-height: 2.0;">${text}</h1>`);
      continue;
    }

    // Blockquote (APA 7 Block Quotation +40 words)
    if (trimmed.startsWith('>')) {
      const text = inlineMarkdown(trimmed.replace(/^>\s*"?|"?$/gm, ''));
      htmlBlocks.push(`<div style="font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 2.0; margin-left: 36pt; margin-right: 36pt; margin-top: 12pt; margin-bottom: 12pt;">${text}</div>`);
      continue;
    }

    // Markdown Table (APA 7 format: horizontal borders on header top/bottom and table bottom)
    if (trimmed.includes('|') && trimmed.includes('\n')) {
      const lines = trimmed.split('\n').filter(l => l.trim().startsWith('|'));
      if (lines.length >= 2) {
        const rows = lines.filter(l => !/^\s*\|?\s*:?-+:?\s*\|/.test(l));
        let tableHtml = '<table style="font-family: \'Times New Roman\', Times, serif; font-size: 11pt; line-height: 1.5; border-collapse: collapse; width: 100%; margin-top: 14pt; margin-bottom: 14pt; border-top: 1.5pt solid #000; border-bottom: 1.5pt solid #000;">\n';
        rows.forEach((row, rIdx) => {
          const cells = row.split('|').map(c => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
          if (rIdx === 0) {
            tableHtml += '  <tr style="border-bottom: 1pt solid #000; font-weight: bold;">\n';
            cells.forEach(c => {
              tableHtml += `    <th style="padding: 6pt 8pt; text-align: left;">${inlineMarkdown(c)}</th>\n`;
            });
            tableHtml += '  </tr>\n';
          } else {
            tableHtml += '  <tr>\n';
            cells.forEach(c => {
              tableHtml += `    <td style="padding: 5pt 8pt;">${inlineMarkdown(c)}</td>\n`;
            });
            tableHtml += '  </tr>\n';
          }
        });
        tableHtml += '</table>';
        htmlBlocks.push(tableHtml);
        continue;
      }
    }

    // Lists (bullets & numbers)
    if (/^\s*(?:-|\*|\d+\.)\s+/.test(trimmed)) {
      const lines = trimmed.split('\n');
      const listItems = lines.map((line, idx) => {
        const isNumber = /^\s*\d+\.\s+/.test(line);
        const text = inlineMarkdown(line.replace(/^\s*(?:-|\*|\d+\.)\s+/, ''));
        return `<p style="font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 2.0; margin-left: 36pt; text-indent: -18pt; margin-top: 0; margin-bottom: 0;">${isNumber ? `${idx + 1}. ` : '• '}${text}</p>`;
      }).join('\n');
      htmlBlocks.push(listItems);
      continue;
    }

    // Standard APA 7 Body Paragraph
    const text = inlineMarkdown(trimmed);
    htmlBlocks.push(`<p style="font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 2.0; text-indent: 36pt; margin-top: 0; margin-bottom: 0;">${text}</p>`);
  }

  return htmlBlocks.join('\n');
}

export function generateGoogleDocsRichHTML(
  work: Work,
  sources: Source[],
  profile?: Partial<UserProfile>,
  courseName?: string,
  teacherName?: string
): string {
  const referencesHtml = sources.length > 0
    ? sources.map(s => {
        const ref = formatFullReferenceHTML(s, work.citationStyle);
        return `<p style="margin-left: 36pt; text-indent: -36pt; margin-bottom: 12pt; line-height: 2.0; font-family: 'Times New Roman', Times, serif; font-size: 12pt;">${ref}</p>`;
      }).join('\n')
    : '';

  // APA 7 Official Cover Page Header (Page 1)
  const institutionName = escapeHtml(profile?.institution || 'Universidad de San Martín de Porres (USMP)');
  const facultyName = escapeHtml(profile?.faculty || 'Facultad de Ciencias de la Comunicación, Turismo y Psicología');
  const studentName = escapeHtml(profile?.name || 'Estudiante');
  const safeWorkTitle = escapeHtml(work.title);
  const safeCourseName = escapeHtml(courseName || 'Asignatura');
  const safeTeacherName = teacherName ? escapeHtml(teacherName) : '';
  const formattedDate = new Date().toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' });

  const coverPageHtml = `
    <div style="page-break-after: always; text-align: center; font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 2.0; padding-top: 72pt; padding-bottom: 72pt;">
      <p style="font-size: 12pt; font-weight: bold; margin-bottom: 36pt; line-height: 2.0;">${safeWorkTitle}</p>
      <p style="margin: 0; line-height: 2.0;">${studentName}</p>
      <p style="margin: 0; line-height: 2.0;">${facultyName}</p>
      <p style="margin: 0; line-height: 2.0;">${institutionName}</p>
      <p style="margin: 0; line-height: 2.0;">${safeCourseName}</p>
      ${safeTeacherName ? `<p style="margin: 0; line-height: 2.0;">Docente: ${safeTeacherName}</p>` : ''}
      <p style="margin: 0; line-height: 2.0;">${formattedDate}</p>
    </div>
  `.trim();

  // Process draft content (Page 2+)
  let rawDraft = (work.draftContent || '').trim();
  // Strip duplicate leading title if present
  if (rawDraft.startsWith('# ')) {
    const firstLineEnd = rawDraft.indexOf('\n');
    const firstLineText = firstLineEnd === -1 ? rawDraft.slice(2).trim() : rawDraft.slice(2, firstLineEnd).trim();
    if (firstLineText.toLowerCase() === work.title.toLowerCase()) {
      rawDraft = firstLineEnd === -1 ? '' : rawDraft.slice(firstLineEnd).trim();
    }
  }

  const hasBodyContent = rawDraft.length > 0;
  let bodyHtml = '';

  if (hasBodyContent) {
    const titleHeader = `<p style="font-family: 'Times New Roman', Times, serif; font-size: 12pt; font-weight: bold; text-align: center; margin-bottom: 18pt; line-height: 2.0;">${safeWorkTitle}</p>`;
    const convertedDraft = convertMarkdownToRichHtml(rawDraft);
    bodyHtml = `\n    ${titleHeader}\n    ${convertedDraft}\n`;
  }

  // References Section (Page 3+ or after body)
  let refsSectionHtml = '';
  if (sources.length > 0) {
    const pageBreakStyle = hasBodyContent ? 'page-break-before: always;' : '';
    refsSectionHtml = `
    <div style="${pageBreakStyle} font-family: 'Times New Roman', Times, serif;">
      <p style="font-size: 12pt; font-weight: bold; text-align: center; margin-top: 24pt; margin-bottom: 18pt; line-height: 2.0;">Referencias</p>
      ${referencesHtml}
    </div>
    `.trim();
  }

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${safeWorkTitle}</title>
</head>
<body style="font-family: 'Times New Roman', Times, serif; color: #000000; margin: 0; padding: 0;">
  ${coverPageHtml}
  ${bodyHtml}
  ${refsSectionHtml}
</body>
</html>
  `.trim();
}

export function generateGoogleCalendarUrl(work: Work, courseName?: string): string {
  const title = encodeURIComponent(`[ENTREGA] ${work.title} (${courseName || 'Académico'})`);
  const details = encodeURIComponent(`Entrega académica en Alfajorcito OS.\nEstilo: ${work.citationStyle}\nRequisitos: ${work.formatRequirements || 'Ver consigna en la app'}`);
  
  const startDate = new Date(work.deadline);
  const endDate = new Date(work.deadline + 3600000); // 1 hour duration

  const dates = `${formatLocalFloatingDateTime(startDate)}/${formatLocalFloatingDateTime(endDate)}`;

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}`;
}

export function generateICSFile(work: Work, courseName?: string): string {
  const d = new Date(work.deadline);
  const uid = `alfajorcito-${work.id}@app.local`;

  const escapeICS = (str: string) =>
    str.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,');

  const summary = escapeICS(`[ENTREGA] ${work.title}`);
  const description = escapeICS(`Curso: ${courseName || 'N/A'}\nEstilo: ${work.citationStyle}`).replace(/\n/g, '\\n');

  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Alfajorcito OS//Academic Operations//ES
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:${uid}
DTSTAMP:${formatLocalFloatingDateTime(new Date())}
DTSTART:${formatLocalFloatingDateTime(d)}
DTEND:${formatLocalFloatingDateTime(new Date(work.deadline + 3600000))}
SUMMARY:${summary}
DESCRIPTION:${description}
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`.trim();
}
