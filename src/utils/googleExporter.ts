import type { Work, Source, CitationStyle, UserProfile } from '../types';
import { formatFullReference } from './citationEngine';

export function generateGoogleDocsRichHTML(
  work: Work,
  sources: Source[],
  profile?: Partial<UserProfile>,
  courseName?: string,
  teacherName?: string
): string {
  const referencesHtml = sources.map(s => {
    const ref = formatFullReference(s, work.citationStyle);
    return `<p style="margin-left: 36pt; text-indent: -36pt; margin-bottom: 8pt; line-height: 2.0; font-family: 'Times New Roman', Georgia, serif; font-size: 12pt;">${ref}</p>`;
  }).join('\n');

  // APA 7 Official Cover Page Header (Dynamic from UserProfile)
  const institutionName = profile?.institution || 'Universidad de San Martín de Porres (USMP)';
  const facultyName = profile?.faculty || 'Facultad de Ciencias de la Comunicación, Turismo y Psicología';
  const studentName = profile?.name || 'Saory';
  const cycleInfo = profile?.currentCycle || 'VIII Ciclo (8vo Ciclo)';

  const coverPageHtml = `
    <div style="text-align: center; margin-bottom: 48pt; font-family: 'Times New Roman', Georgia, serif;">
      <h1 style="font-size: 16pt; font-weight: bold; margin-bottom: 12pt;">${work.title}</h1>
      <p style="font-size: 12pt; margin: 4pt 0;"><strong>${studentName}</strong></p>
      <p style="font-size: 12pt; margin: 4pt 0;">${facultyName}</p>
      <p style="font-size: 12pt; margin: 4pt 0;">${institutionName}</p>
      <p style="font-size: 12pt; margin: 4pt 0;">${courseName || 'Asignatura'} (${cycleInfo})</p>
      ${teacherName ? `<p style="font-size: 12pt; margin: 4pt 0;">Docente: ${teacherName}</p>` : ''}
      <p style="font-size: 12pt; margin: 4pt 0;">${new Date().toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
    </div>
    <hr style="border: none; border-top: 1px solid #ccc; margin: 24pt 0;" />
  `;

  const draftHtml = (work.draftContent || '')
    .split('\n\n')
    .map(para => {
      if (para.startsWith('# ')) {
        return `<h1 style="font-family: 'Times New Roman', Georgia, serif; font-size: 16pt; font-weight: bold; margin-top: 18pt; margin-bottom: 12pt; text-align: center;">${para.replace('# ', '')}</h1>`;
      }
      if (para.startsWith('## ')) {
        return `<h2 style="font-family: 'Times New Roman', Georgia, serif; font-size: 14pt; font-weight: bold; margin-top: 14pt; margin-bottom: 8pt;">${para.replace('## ', '')}</h2>`;
      }
      if (para.startsWith('### ')) {
        return `<h3 style="font-family: 'Times New Roman', Georgia, serif; font-size: 12pt; font-weight: bold; font-style: italic; margin-top: 10pt; margin-bottom: 6pt;">${para.replace('### ', '')}</h3>`;
      }
      return `<p style="font-family: 'Times New Roman', Georgia, serif; font-size: 12pt; line-height: 2.0; text-indent: 36pt; margin-bottom: 0pt;">${para}</p>`;
    })
    .join('\n');

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${work.title}</title>
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

  const formatCalTime = (d: Date) => d.toISOString().replace(/-|:|\.\d+/g, '');
  const dates = `${formatCalTime(startDate)}/${formatCalTime(endDate)}`;

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}`;
}

export function generateICSFile(work: Work, courseName?: string): string {
  const d = new Date(work.deadline);
  const formatICS = (date: Date) => date.toISOString().replace(/-|:|\.\d+/g, '');
  const uid = `alfajorcito-${work.id}@app.local`;

  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Alfajorcito OS//Academic Operations//ES
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:${uid}
DTSTAMP:${formatICS(new Date())}
DTSTART:${formatICS(d)}
DTEND:${formatICS(new Date(work.deadline + 3600000))}
SUMMARY:[ENTREGA] ${work.title}
DESCRIPTION:Curso: ${courseName || 'N/A'}\\nEstilo: ${work.citationStyle}
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`.trim();
}
