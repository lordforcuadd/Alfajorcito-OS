import { describe, it, expect } from 'vitest';
import { generateNoteMarkdown, generateSourceMarkdown, sanitizeSlug } from '../utils/obsidianExporter';
import { generateGoogleDocsRichHTML, generateICSFile } from '../utils/googleExporter';
import type { Note, Source, Work, Course, Concept } from '../types';

describe('Exporters Suite', () => {
  const sampleCourse: Course = {
    id: 'course-1',
    name: 'Metodología de la Investigación',
    period: '2026-II',
    color: '#D98880',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isArchived: false
  };

  const sampleWork: Work = {
    id: 'work-1',
    courseId: 'course-1',
    title: 'Ensayo sobre Epistemología',
    type: 'ENSAYO',
    status: 'INVESTIGACION',
    deadline: Date.now() + 86400000 * 5,
    citationStyle: 'APA_7',
    draftContent: '# Introducción\n\nTexto del ensayo académico.',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isArchived: false
  };

  const sampleSource: Source = {
    id: 'src-1',
    workIds: ['work-1'],
    title: 'Test Article',
    authors: [{ firstName: 'John', lastName: 'Doe' }],
    year: 2024,
    type: 'JOURNAL_ARTICLE',
    publication: 'Journal of Science',
    doi: '10.1000/182',
    accessedAt: Date.now(),
    verificationStatus: 'VERIFIED',
    verificationProvider: 'CROSSREF',
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  const sampleNote: Note = {
    id: 'note-1',
    slug: 'constructivismo-y-aprendizaje',
    title: 'Constructivismo y Aprendizaje',
    content: 'Contenido de la nota con [[Metodología de la Investigación]].',
    paraCategory: 'PROJECT',
    courseId: 'course-1',
    workId: 'work-1',
    sourceIds: ['src-1'],
    conceptIds: [],
    tags: ['#educacion', '#epistemologia'],
    backlinks: [],
    isPinned: false,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  it('sanitizes slugs for Obsidian filenames properly', () => {
    expect(sanitizeSlug('¿Cómo citar en APA 7ma Edición?')).toBe('como-citar-en-apa-7ma-edicion');
  });

  it('generates Obsidian note Markdown with YAML frontmatter and [[wikilinks]]', () => {
    const md = generateNoteMarkdown(
      sampleNote,
      new Map([['course-1', sampleCourse]]),
      new Map([['work-1', sampleWork]]),
      new Map([['src-1', sampleSource]]),
      new Map()
    );

    expect(md).toContain('---');
    expect(md).toContain('title: "Constructivismo y Aprendizaje"');
    expect(md).toContain('course: "[[Metodología de la Investigación]]"');
    expect(md).toContain('work: "[[Ensayo sobre Epistemología]]"');
    expect(md).toContain('sources:\n  - "[[Test Article]]"');
    expect(md).toContain('tags:\n  - "educacion"\n  - "epistemologia"');
    expect(md).toContain('Contenido de la nota con [[Metodología de la Investigación]].');
  });

  it('generates Google Docs rich HTML with french indentation and reference headers', () => {
    const html = generateGoogleDocsRichHTML(sampleWork, [sampleSource]);
    expect(html).toContain('<title>Ensayo sobre Epistemología</title>');
    expect(html).toContain('text-indent: -36pt');
    expect(html).toContain('Referencias');
  });

  it('generates .ics calendar events with proper timestamps and summary', () => {
    const ics = generateICSFile(sampleWork, 'Metodología');
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('SUMMARY:[ENTREGA] Ensayo sobre Epistemología');
    expect(ics).toContain('END:VCALENDAR');
  });

  it('escapes commas, semicolons, and special characters in ICS exports per RFC 5545', () => {
    const workWithCommas: Work = {
      ...sampleWork,
      title: 'Tesis, Proyecto 1; Parte A & B'
    };
    const ics = generateICSFile(workWithCommas, 'Psicología, Clínica');
    expect(ics).toContain('SUMMARY:[ENTREGA] Tesis\\, Proyecto 1\\; Parte A & B');
    expect(ics).toContain('DESCRIPTION:Curso: Psicología\\, Clínica\\nEstilo: APA_7');
  });

  it('guarantees timezone-safe local date formatting in Obsidian frontmatter (no UTC drift)', () => {
    // Construct local timestamp at 23:59:59 on 2026-08-28 (which in UTC-5 is 04:59:59 on 2026-08-29)
    const localLateNight = new Date(2026, 7, 28, 23, 59, 59, 999).getTime();
    const testNote: Note = {
      ...sampleNote,
      createdAt: localLateNight,
      updatedAt: localLateNight
    };

    const md = generateNoteMarkdown(testNote, new Map(), new Map(), new Map(), new Map());
    expect(md).toContain('created: "2026-08-28"');
    expect(md).toContain('updated: "2026-08-28"');
    expect(md).not.toContain('created: "2026-08-29"');
  });
});
