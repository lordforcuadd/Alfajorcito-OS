import { describe, it, expect } from 'vitest';
import { generateGoogleCalendarUrl, generateICSFile, generateGoogleDocsRichHTML } from '../utils/googleExporter';
import { formatFullReference, formatInTextNarrative, formatInTextParenthetical } from '../utils/citationEngine';
import { sanitizeSlug } from '../utils/obsidianExporter';
import { parseAcademicCycle, filterTodayTasks, filterOverdueTasks, getDeadlineUrgencyMeta } from '../utils/academicWorkUtils';
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
    expect(parseAcademicCycle('IX Ciclo')).toBe(9);
    expect(parseAcademicCycle('X Ciclo')).toBe(10);
    expect(parseAcademicCycle('IV Ciclo')).toBe(4);
    expect(parseAcademicCycle('V Ciclo')).toBe(5);
    expect(parseAcademicCycle('VIII Ciclo')).toBe(8);
    expect(parseAcademicCycle('7mo Ciclo')).toBe(7);
    expect(parseAcademicCycle('1er Ciclo')).toBe(1);
    expect(parseAcademicCycle('')).toBe(8);
  });

  it('formats deadline urgency labels with correct singular and plural grammar', () => {
    expect(getDeadlineUrgencyMeta(1).label).toBe('1 día restante');
    expect(getDeadlineUrgencyMeta(2).label).toBe('2 días restantes');
    expect(getDeadlineUrgencyMeta(0).label).toBe('¡Vence hoy!');
  });

  it('guarantees overdue tasks are never duplicated in todayTasks and overdueTasks across full day boundaries', () => {
    const fixedNow = 1756000000000;
    const startOfToday = fixedNow - 3600000 * 4; // 4 hours into today
    const endOfToday = startOfToday + 86399999;

    const sampleTaskList = [
      { id: 't1', title: 'Tarea Vencida Ayer', isCompleted: false, dueDate: startOfToday - 3600000 },
      { id: 't2', title: 'Tarea Para Hoy Mañana', isCompleted: false, dueDate: startOfToday + 3600000 },
      { id: 't3', title: 'Tarea Sin Fecha', isCompleted: false, dueDate: undefined },
      { id: 't4', title: 'Tarea Futura', isCompleted: false, dueDate: endOfToday + 86400000 * 3 }
    ];

    const todayTasks = filterTodayTasks(sampleTaskList, startOfToday, endOfToday);
    const overdueTasks = filterOverdueTasks(sampleTaskList, startOfToday);

    expect(todayTasks.map((t) => t.id)).toEqual(['t2', 't3']);
    expect(overdueTasks.map((t) => t.id)).toEqual(['t1']);
    // No intersection between today and overdue
    const overlap = todayTasks.some((t) => overdueTasks.some((ot) => ot.id === t.id));
    expect(overlap).toBe(false);
  });

  it('guarantees complete referential integrity across 3-year seed data structures', async () => {
    const { getSeedData } = await import('../db/seed');
    const {
      courses,
      works,
      sources,
      ideas,
      paraphrases,
      citations,
      concepts,
      notes,
      tasks,
      inquiries
    } = getSeedData(Date.now());

    // 1. Entities non-empty
    expect(courses.length).toBeGreaterThanOrEqual(10);
    expect(works.length).toBeGreaterThanOrEqual(8);
    expect(sources.length).toBeGreaterThanOrEqual(6);
    expect(ideas.length).toBeGreaterThanOrEqual(3);
    expect(paraphrases.length).toBeGreaterThanOrEqual(2);
    expect(citations.length).toBeGreaterThanOrEqual(5);
    expect(concepts.length).toBeGreaterThanOrEqual(10);
    expect(notes.length).toBeGreaterThanOrEqual(10);
    expect(tasks.length).toBeGreaterThanOrEqual(8);
    expect(inquiries.length).toBeGreaterThanOrEqual(2);

    const courseIds = new Set(courses.map((c) => c.id));
    const workIds = new Set(works.map((w) => w.id));
    const sourceIds = new Set(sources.map((s) => s.id));
    const ideaIds = new Set(ideas.map((i) => i.id));
    const paraphraseIds = new Set(paraphrases.map((p) => p.id));
    const conceptIds = new Set(concepts.map((c) => c.id));

    // 2. All works link to a valid course
    for (const w of works) {
      expect(courseIds.has(w.courseId)).toBe(true);
    }

    // 3. All sources link to valid works
    for (const s of sources) {
      for (const wid of s.workIds) {
        expect(workIds.has(wid)).toBe(true);
      }
    }

    // 4. Ideas link to valid sources and works
    for (const idea of ideas) {
      expect(sourceIds.has(idea.sourceId)).toBe(true);
      if (idea.workId) expect(workIds.has(idea.workId)).toBe(true);
    }

    // 5. Paraphrases link to valid ideas and sources
    for (const p of paraphrases) {
      expect(ideaIds.has(p.ideaId)).toBe(true);
      expect(sourceIds.has(p.sourceId)).toBe(true);
      if (p.workId) expect(workIds.has(p.workId)).toBe(true);
    }

    // 6. Citations link to valid sources, works, ideas and paraphrases
    for (const c of citations) {
      expect(sourceIds.has(c.sourceId)).toBe(true);
      expect(workIds.has(c.workId)).toBe(true);
      if (c.ideaId) expect(ideaIds.has(c.ideaId)).toBe(true);
      if (c.paraphraseId) expect(paraphraseIds.has(c.paraphraseId)).toBe(true);
    }

    // 7. Notes link to valid courses, works, sources and concepts
    for (const n of notes) {
      if (n.courseId) expect(courseIds.has(n.courseId)).toBe(true);
      if (n.workId) expect(workIds.has(n.workId)).toBe(true);
      for (const sid of n.sourceIds) expect(sourceIds.has(sid)).toBe(true);
      for (const cid of n.conceptIds) expect(conceptIds.has(cid)).toBe(true);
    }

    // 8. Tasks link to valid works and courses
    for (const t of tasks) {
      if (t.workId) expect(workIds.has(t.workId)).toBe(true);
      if (t.courseId) expect(courseIds.has(t.courseId)).toBe(true);
    }

    // 9. Inquiries link to valid works and courses
    for (const inq of inquiries) {
      expect(workIds.has(inq.workId)).toBe(true);
      expect(courseIds.has(inq.courseId)).toBe(true);
    }
  });

  it('cleans note preview markdown and wikilinks without orphaned pipes or markers', () => {
    const rawContent = '## Encabezado\nNota sobre [[Regulación Emocional]] y también [[Terapia Cognitiva|TCC]] con **énfasis** y *cursiva*.';
    const preview = rawContent
      .replace(/#+\s/g, '')
      .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, target, alias) => alias || target)
      .replace(/[*_`~>]/g, '')
      .trim();

    expect(preview).not.toContain('||');
    expect(preview).toContain('Regulación Emocional');
    expect(preview).toContain('TCC');
    expect(preview).not.toContain('*');
    expect(preview).not.toContain('#');
  });

  it('guarantees unique note slug generation by appending incremental counter', () => {
    const existingNotes = [
      { id: 'n1', slug: 'regulacion-emocional' },
      { id: 'n2', slug: 'regulacion-emocional-2' }
    ];

    const generateUniqueSlug = (baseSlug: string, currentNoteId: string) => {
      let updatedSlug = baseSlug;
      let counter = 2;
      while (existingNotes.some((n) => n.id !== currentNoteId && n.slug === updatedSlug)) {
        updatedSlug = `${baseSlug}-${counter}`;
        counter++;
      }
      return updatedSlug;
    };

    expect(generateUniqueSlug('regulacion-emocional', 'n3')).toBe('regulacion-emocional-3');
    expect(generateUniqueSlug('regulacion-emocional', 'n1')).toBe('regulacion-emocional');
    expect(generateUniqueSlug('nueva-nota', 'n4')).toBe('nueva-nota');
  });
});
