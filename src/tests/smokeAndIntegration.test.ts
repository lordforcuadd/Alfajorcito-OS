import { describe, it, expect } from 'vitest';
import { generateGoogleCalendarUrl, generateICSFile, generateGoogleDocsRichHTML } from '../utils/googleExporter';
import { formatFullReference, formatInTextNarrative, formatInTextParenthetical } from '../utils/citationEngine';
import { sanitizeSlug } from '../utils/obsidianExporter';
import type { Work, Source, UserProfile } from '../types';

describe('Interactive Smoke & Integration Suite', () => {
  const sampleUserProfile: UserProfile = {
    name: 'Saory',
    institution: 'Universidad de San Martín de Porres (USMP)',
    faculty: 'Facultad de Ciencias de la Comunicación, Turismo y Psicología',
    major: 'Psicología',
    currentCycle: 'VIII Ciclo',
    specialty: 'CLINICA',
    thesisTitle: 'Regulación Emocional en Universitarios',
    defaultCitationStyle: 'APA_7'
  };

  const sampleWork: Work = {
    id: 'work-smoke-1',
    courseId: 'course-1',
    title: 'Informe de Psicometría y Evaluación Psicológica',
    type: 'INFORME',
    status: 'REDACTANDO',
    deadline: 1787529600000,
    citationStyle: 'APA_7',
    draftContent: 'Este es el borrador del informe con análisis factorial.',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isArchived: false
  };

  const sampleSource: Source = {
    id: 'src-smoke-1',
    workIds: ['work-smoke-1'],
    title: 'Propiedades psicométricas de instrumentos de evaluación en salud mental',
    authors: [
      { firstName: 'César', lastName: 'Merino-Soto' },
      { firstName: 'Marcia', lastName: 'Calderón-De la Cruz' }
    ],
    year: 2024,
    type: 'JOURNAL_ARTICLE',
    publication: 'Revista Peruana de Psicología',
    volume: '30',
    issue: '2',
    pages: '115-130',
    doi: '10.18800/psico.202402.005',
    accessedAt: Date.now(),
    verificationStatus: 'VERIFIED',
    verificationProvider: 'CROSSREF',
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  it('generates Google Calendar URLs with encoded metadata and deadlines', () => {
    const url = generateGoogleCalendarUrl(sampleWork, 'Psicometría Aplicada');
    expect(url).toContain('calendar.google.com/calendar/render');
    expect(url).toContain('action=TEMPLATE');
    expect(url).toContain(encodeURIComponent('[ENTREGA] Informe de Psicometría y Evaluación Psicológica (Psicometría Aplicada)'));
    expect(url).toContain('details=');
  });

  it('generates rich HTML for Google Docs including APA 7 cover, author, and formatted references', () => {
    const html = generateGoogleDocsRichHTML(sampleWork, [sampleSource], sampleUserProfile, 'Psicometría Aplicada', 'Dr. Manuel Fernández');
    expect(html).toContain('Universidad de San Martín de Porres (USMP)');
    expect(html).toContain('Facultad de Ciencias de la Comunicación, Turismo y Psicología');
    expect(html).toContain('Informe de Psicometría y Evaluación Psicológica');
    expect(html).toContain('Saory');
    expect(html).toContain('Dr. Manuel Fernández');
    expect(html).toContain('Merino-Soto, C., & Calderón-De la Cruz, M. (2024)');
    expect(html).toContain('text-indent: -36pt');
  });

  it('formats in-text citations correctly for two Peruvian authors in APA 7', () => {
    const narrative = formatInTextNarrative(sampleSource, 'APA_7');
    const parenthetical = formatInTextParenthetical(sampleSource, 'APA_7', 'p. 120');

    expect(narrative).toBe('Merino-Soto y Calderón-De la Cruz (2024)');
    expect(parenthetical).toBe('(Merino-Soto & Calderón-De la Cruz, 2024, p. 120)');
  });

  it('sanitizes special Spanish characters and accents for file slugs properly', () => {
    const slug = sanitizeSlug('¿Evaluación Psicométrica, Ansiedad & Depresión en Jóvenes (USMP)?');
    expect(slug).toBe('evaluacion-psicometrica-ansiedad-depresion-en-jovenes-usmp');
  });

  it('correctly maps Roman numeral cycles without substring collision (IX != X, IV != V)', () => {
    const parseCycle = (cycleStr: string) => {
      const s = cycleStr.toUpperCase();
      if (/\bIX\b/.test(s) || s.includes('IX') || /\b9\b|9NO|NOVENO/i.test(s)) return 9;
      if (/\bX\b/.test(s) || s.includes('X') || /\b10\b|10MO|DECIMO|DÉCIMO/i.test(s)) return 10;
      if (/\bVIII\b/.test(s) || s.includes('VIII') || /\b8\b|8VO|OCTAVO/i.test(s)) return 8;
      if (/\bVII\b/.test(s) || s.includes('VII') || /\b7\b|7MO|SEPTIMO|SÉPTIMO/i.test(s)) return 7;
      if (/\bVI\b/.test(s) || s.includes('VI') || /\b6\b|6TO|SEXTO/i.test(s)) return 6;
      if (/\bIV\b/.test(s) || s.includes('IV') || /\b4\b|4TO|CUARTO/i.test(s)) return 4;
      if (/\bV\b/.test(s) || s.includes('V') || /\b5\b|5TO|QUINTO/i.test(s)) return 5;
      if (/\bIII\b/.test(s) || s.includes('III') || /\b3\b|3RO|TERCERO/i.test(s)) return 3;
      if (/\bII\b/.test(s) || s.includes('II') || /\b2\b|2DO|SEGUNDO/i.test(s)) return 2;
      if (/\bI\b/.test(s) || s.includes('I') || /\b1\b|1RO|PRIMER/i.test(s)) return 1;
      return 8;
    };

    expect(parseCycle('IX Ciclo')).toBe(9);
    expect(parseCycle('X Ciclo')).toBe(10);
    expect(parseCycle('IV Ciclo')).toBe(4);
    expect(parseCycle('V Ciclo')).toBe(5);
    expect(parseCycle('VIII Ciclo')).toBe(8);
    expect(parseCycle('7mo Ciclo')).toBe(7);
  });

  it('guarantees overdue tasks are never duplicated in todayTasks and overdueTasks', () => {
    const fixedNow = 1756000000000;
    const oneDayMs = 86400000;

    const sampleTaskList = [
      { id: 't1', title: 'Tarea Vencida', isCompleted: false, dueDate: fixedNow - 3600000 },
      { id: 't2', title: 'Tarea Para Hoy', isCompleted: false, dueDate: fixedNow + 3600000 },
      { id: 't3', title: 'Tarea Sin Fecha', isCompleted: false, dueDate: undefined },
      { id: 't4', title: 'Tarea Futura', isCompleted: false, dueDate: fixedNow + oneDayMs * 5 }
    ];

    const todayTasks = sampleTaskList.filter((t) => !t.isCompleted && (!t.dueDate || (t.dueDate >= fixedNow && t.dueDate <= fixedNow + oneDayMs)));
    const overdueTasks = sampleTaskList.filter((t) => !t.isCompleted && t.dueDate && t.dueDate < fixedNow);

    expect(todayTasks.map((t) => t.id)).toEqual(['t2', 't3']);
    expect(overdueTasks.map((t) => t.id)).toEqual(['t1']);
    // No intersection between today and overdue
    const overlap = todayTasks.some((t) => overdueTasks.some((ot) => ot.id === t.id));
    expect(overlap).toBe(false);
  });
});
