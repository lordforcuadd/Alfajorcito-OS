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
});
