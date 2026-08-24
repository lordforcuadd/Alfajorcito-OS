import { describe, it, expect } from 'vitest';
import { sanitizeAcademicText } from '../utils/antiHallucination';
import { generateGoogleDocsRichHTML } from '../utils/googleExporter';
import type { Work, Source } from '../types';

describe('Security, XSS & Extreme Inputs Resilience Suite', () => {
  it('strips <script> and <iframe> tags from academic notes and inputs', () => {
    const maliciousInput = 'Normal text <script>alert("XSS")</script> with academic notes <iframe src="http://evil.com"></iframe> ending.';
    const sanitized = sanitizeAcademicText(maliciousInput);
    expect(sanitized).not.toContain('<script>');
    expect(sanitized).not.toContain('alert("XSS")');
    expect(sanitized).not.toContain('<iframe');
    expect(sanitized).toContain('Normal text');
    expect(sanitized).toContain('with academic notes');
    expect(sanitized).toContain('ending.');
  });

  it('handles empty, null-like, and emoji/unicode characters without crashing', () => {
    expect(sanitizeAcademicText('')).toBe('');
    expect(sanitizeAcademicText('   ')).toBe('');
    const unicodeInput = 'Psicología 🧠 & Neurociencia ✨: Análisis de α = 0.05 y ω = 0.89';
    const sanitizedUnicode = sanitizeAcademicText(unicodeInput);
    expect(sanitizedUnicode).toBe(unicodeInput);
  });

  it('handles extremely long text in Google Exporter without truncating or erroring', () => {
    const longDraft = '# Título\n\n' + 'Palabra '.repeat(10000);
    const mockWork: Work = {
      id: 'work-long',
      courseId: 'course-1',
      title: 'Tesis Extensa',
      type: 'TESIS',
      status: 'REDACTANDO',
      deadline: Date.now(),
      citationStyle: 'APA_7',
      draftContent: longDraft,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isArchived: false
    };

    const mockSource: Source = {
      id: 'src-1',
      workIds: ['work-long'],
      title: 'Fuente Base',
      authors: [{ firstName: 'Test', lastName: 'Author' }],
      year: 2024,
      type: 'JOURNAL_ARTICLE',
      accessedAt: Date.now(),
      verificationStatus: 'VERIFIED',
      verificationProvider: 'CROSSREF',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const html = generateGoogleDocsRichHTML(mockWork, [mockSource]);
    expect(html).toContain('Tesis Extensa');
    expect(html).toContain('Palabra');
    expect(html.length).toBeGreaterThan(50000);
  });

  it('escapes HTML tags from malicious author/title/publication inputs in citation HTML', () => {
    const maliciousSource: Source = {
      id: 'src-xss',
      workIds: ['work-1'],
      title: '<script>alert("XSS")</script> Estudio sobre Ansiedad',
      authors: [{ firstName: '<img src=x onerror=alert(1)>', lastName: '<b>Hacker</b>' }],
      year: 2024,
      type: 'JOURNAL_ARTICLE',
      publication: '<iframe src="evil.com"></iframe> Revista Peruana',
      accessedAt: Date.now(),
      verificationStatus: 'PARTIALLY_VERIFIED',
      verificationProvider: 'MANUAL',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const mockWork: Work = {
      id: 'work-1',
      courseId: 'course-1',
      title: 'Trabajo Seguro',
      type: 'ENSAYO',
      status: 'INVESTIGACION',
      deadline: Date.now(),
      citationStyle: 'APA_7',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isArchived: false
    };

    const html = generateGoogleDocsRichHTML(mockWork, [maliciousSource]);
    expect(html).not.toContain('<script>alert("XSS")</script>');
    expect(html).not.toContain('<iframe src="evil.com">');
    expect(html).not.toContain('<img src=x onerror=alert(1)>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('&lt;iframe');
  });
});
