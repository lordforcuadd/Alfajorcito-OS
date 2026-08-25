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

export function generateGoogleDocsRichHTML(
  work: Work,
  sources: Source[],
  profile?: Partial<UserProfile>,
  courseName?: string,
  teacherName?: string
): string {
  const referencesHtml = sources.map(s => {
    const ref = formatFullReferenceHTML(s, work.citationStyle);
    return `<p style="margin-left: 36pt; text-indent: -36pt; margin-bottom: 8pt; line-height: 2.0; font-family: 'Times New Roman', Georgia, serif; font-size: 12pt;">${ref}</p>`;
  }).join('\n');

  // APA 7 Official Cover Page Header (Dynamic from UserProfile)
  const institutionName = escapeHtml(profile?.institution || 'Institución Universitaria');
  const facultyName = escapeHtml(profile?.faculty || 'Facultad Académica');
  const studentName = escapeHtml(profile?.name || 'Estudiante');
  const cycleInfo = escapeHtml(String(profile?.currentCycle || 'Ciclo Académico'));
  const safeWorkTitle = escapeHtml(work.title);
  const safeCourseName = escapeHtml(courseName || 'Asignatura');
  const safeTeacherName = teacherName ? escapeHtml(teacherName) : '';

  const coverPageHtml = `
    <div style="text-align: center; margin-bottom: 48pt; font-family: 'Times New Roman', Georgia, serif;">
      <h1 style="font-size: 16pt; font-weight: bold; margin-bottom: 12pt;">${safeWorkTitle}</h1>
      <p style="font-size: 12pt; margin: 4pt 0;"><strong>${studentName}</strong></p>
      <p style="font-size: 12pt; margin: 4pt 0;">${facultyName}</p>
      <p style="font-size: 12pt; margin: 4pt 0;">${institutionName}</p>
      <p style="font-size: 12pt; margin: 4pt 0;">${safeCourseName} (${cycleInfo})</p>
      ${safeTeacherName ? `<p style="font-size: 12pt; margin: 4pt 0;">Docente: ${safeTeacherName}</p>` : ''}
      <p style="font-size: 12pt; margin: 4pt 0;">${new Date().toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
    </div>
    <hr style="border: none; border-top: 1px solid #ccc; margin: 24pt 0;" />
  `;

  const draftHtml = (work.draftContent || '')
    .split('\n\n')
    .map(para => {
      const trimmed = para.trim();
      if (trimmed.startsWith('# ')) {
        return `<h1 style="font-family: 'Times New Roman', Georgia, serif; font-size: 16pt; font-weight: bold; margin-top: 18pt; margin-bottom: 12pt; text-align: center;">${escapeHtml(trimmed.replace('# ', ''))}</h1>`;
      }
      if (trimmed.startsWith('## ')) {
        return `<h2 style="font-family: 'Times New Roman', Georgia, serif; font-size: 14pt; font-weight: bold; margin-top: 14pt; margin-bottom: 8pt;">${escapeHtml(trimmed.replace('## ', ''))}</h2>`;
      }
      if (trimmed.startsWith('### ')) {
        return `<h3 style="font-family: 'Times New Roman', Georgia, serif; font-size: 12pt; font-weight: bold; font-style: italic; margin-top: 10pt; margin-bottom: 6pt;">${escapeHtml(trimmed.replace('### ', ''))}</h3>`;
      }
      return `<p style="font-family: 'Times New Roman', Georgia, serif; font-size: 12pt; line-height: 2.0; text-indent: 36pt; margin-bottom: 0pt;">${escapeHtml(trimmed)}</p>`;
    })
    .join('\n');

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${safeWorkTitle}</title>
</head>
<body style="font-family: 'Times New Roman', Georgia, serif; color: #000000; padding: 20px;">
  ${coverPageHtml}
  ${draftHtml}

  <h2 style="font-family: 'Times New Roman', Georgia, serif; font-size: 14pt; font-weight: bold; margin-top: 24pt; margin-bottom: 12pt; text-align: center;">Referencias</h2>
  ${referencesHtml}
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
