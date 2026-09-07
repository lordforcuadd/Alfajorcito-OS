import { describe, it, expect } from 'vitest';
import {
  formatFullReference,
  formatFullReferenceHTML,
  formatInTextParenthetical,
  formatInTextNarrative,
  formatAuthorNamesAPA,
  generateBibTeX,
  generateBibTeXCollection,
  escapeBibTeX
} from '../utils/citationEngine';
import type { Source } from '../types';

describe('Citation Engine Extended Suite — Strict Academic APA 7 & Multi-style Verification', () => {
  it('formats single author APA 7 correctly', () => {
    const source: Source = {
      id: 'src-single',
      workIds: ['work-1'],
      title: 'Emotion regulation: Conceptual and empirical foundations',
      authors: [{ firstName: 'James', lastName: 'Gross' }],
      year: 2015,
      type: 'BOOK',
      publication: 'Handbook of Emotion Regulation (2nd ed., pp. 3-20). The Guilford Press',
      doi: '10.1002/9781118993811.ch1',
      accessedAt: Date.now(),
      verificationStatus: 'VERIFIED',
      verificationProvider: 'CROSSREF',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const apa = formatFullReference(source, 'APA_7');
    expect(apa).toBe('Gross, J. (2015). Emotion regulation: Conceptual and empirical foundations. Handbook of Emotion Regulation (2nd ed., pp. 3-20). The Guilford Press. https://doi.org/10.1002/9781118993811.ch1');

    const narrative = formatInTextNarrative(source, 'APA_7');
    expect(narrative).toBe('Gross (2015)');

    const parenthetical = formatInTextParenthetical(source, 'APA_7', 'p. 14');
    expect(parenthetical).toBe('(Gross, 2015, p. 14)');
  });

  it('formats 3 or more authors with et al. in parenthetical and narrative APA 7', () => {
    const source: Source = {
      id: 'src-multiple',
      workIds: ['work-1'],
      title: 'Validación de la escala GAD-7 para la detección de síntomas de ansiedad generalizada en adultos de Lima Metropolitana',
      authors: [
        { firstName: 'David', lastName: 'Villarreal-Zegarra' },
        { firstName: 'Ángel', lastName: 'Ccorahua-Ríos' },
        { firstName: 'Joel', lastName: 'Burgos-Mejía' }
      ],
      year: 2021,
      type: 'JOURNAL_ARTICLE',
      publication: 'Revista Peruana de Medicina Experimental y Salud Pública',
      volume: '38',
      issue: '4',
      pages: '560-567',
      doi: '10.17843/rpmesp.2021.384.7733',
      accessedAt: Date.now(),
      verificationStatus: 'VERIFIED',
      verificationProvider: 'CROSSREF',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const narrative = formatInTextNarrative(source, 'APA_7');
    expect(narrative).toBe('Villarreal-Zegarra et al. (2021)');

    const parenthetical = formatInTextParenthetical(source, 'APA_7', 'p. 562');
    expect(parenthetical).toBe('(Villarreal-Zegarra et al., 2021, p. 562)');

    const fullRef = formatFullReference(source, 'APA_7');
    expect(fullRef).toContain('Villarreal-Zegarra, D., Ccorahua-Ríos, Á., & Burgos-Mejía, J. (2021)');
    expect(fullRef).toContain('Revista Peruana de Medicina Experimental y Salud Pública, 38(4), 560-567');
  });

  it('handles missing year with "s.f." gracefully', () => {
    const source: Source = {
      id: 'src-nodate',
      workIds: ['work-1'],
      title: 'Guía de Práctica Clínica en Salud Mental',
      authors: [{ firstName: 'Ministerio de Salud', lastName: 'MINSA' }],
      year: 0,
      type: 'REPORT',
      publication: 'MINSA Perú',
      accessedAt: Date.now(),
      verificationStatus: 'VERIFIED',
      verificationProvider: 'MANUAL',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const ref = formatFullReference(source, 'APA_7');
    expect(ref).toContain('(s.f.)');

    const inText = formatInTextParenthetical(source, 'APA_7');
    expect(inText).toBe('(MINSA, s.f.)');
  });

  it('formats Chicago Author-Date correctly', () => {
    const source: Source = {
      id: 'src-chicago',
      workIds: ['work-1'],
      title: 'Cognitive behavior therapy: Basics and beyond',
      authors: [{ firstName: 'Judith S.', lastName: 'Beck' }],
      year: 2021,
      type: 'BOOK',
      publication: 'The Guilford Press',
      accessedAt: Date.now(),
      verificationStatus: 'VERIFIED',
      verificationProvider: 'MANUAL',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const inText = formatInTextParenthetical(source, 'CHICAGO_AUTHOR_DATE', 'p. 45');
    expect(inText).toBe('(Beck 2021, p. 45)');
  });

  it('formats Vancouver and IEEE numbered citation correctly with custom referenceNumber', () => {
    const source: Source = {
      id: 'src-vancouver',
      workIds: ['work-1'],
      title: 'Propiedades psicométricas del inventario de depresión de Beck',
      authors: [{ firstName: 'César', lastName: 'Merino-Soto' }],
      year: 2022,
      type: 'JOURNAL_ARTICLE',
      publication: 'Liberabit',
      accessedAt: Date.now(),
      verificationStatus: 'VERIFIED',
      verificationProvider: 'CROSSREF',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const inTextVancouver = formatInTextParenthetical(source, 'VANCOUVER', undefined, 4);
    expect(inTextVancouver).toBe('[4]');

    const inTextIEEE = formatInTextParenthetical(source, 'IEEE', undefined, 7);
    expect(inTextIEEE).toBe('[7]');

    const narrativeIEEE = formatInTextNarrative(source, 'IEEE', 3);
    expect(narrativeIEEE).toBe('Merino-Soto [3]');
  });

  it('formats 21 or more authors according to APA 7 rules (first 19, ellipsis, last author)', () => {
    const authors = Array.from({ length: 22 }, (_, idx) => ({
      firstName: `Nombre${idx + 1}`,
      lastName: `Autor${idx + 1}`
    }));

    const authorNamesStr = formatAuthorNamesAPA(authors);
    // Should have Autor1 through Autor19, then ellipsis '...', then Autor22
    expect(authorNamesStr).toContain('Autor1, N.');
    expect(authorNamesStr).toContain('Autor19, N.');
    expect(authorNamesStr).toContain('... Autor22, N.');
    expect(authorNamesStr).not.toContain('Autor20, N.');
    expect(authorNamesStr).not.toContain('Autor21, N.');
  });

  it('formats full references with rich HTML italics for journals and books across all 5 styles', () => {
    const journalSource: Source = {
      id: 'src-journal',
      workIds: ['work-1'],
      title: 'Regulación emocional y estrés académico en universitarios',
      authors: [{ firstName: 'Saory', lastName: 'García' }],
      year: 2024,
      type: 'JOURNAL_ARTICLE',
      publication: 'Revista Peruana de Psicología',
      volume: '15',
      issue: '2',
      pages: '45-58',
      doi: '10.1016/j.rpsic.2024.01.002',
      accessedAt: Date.now(),
      verificationStatus: 'VERIFIED',
      verificationProvider: 'MANUAL',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const bookSource: Source = {
      id: 'src-book',
      workIds: ['work-1'],
      title: 'Manual de psicoterapia cognitiva',
      authors: [{ firstName: 'Aaron', lastName: 'Beck' }],
      year: 2020,
      type: 'BOOK',
      publication: 'Editorial Paidós',
      accessedAt: Date.now(),
      verificationStatus: 'VERIFIED',
      verificationProvider: 'MANUAL',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    // 1. APA 7
    const apaHtml = formatFullReferenceHTML(journalSource, 'APA_7');
    expect(apaHtml).toContain('<i>Revista Peruana de Psicología</i>');
    expect(apaHtml).toContain('<i>15</i>');

    const apaBookHtml = formatFullReferenceHTML(bookSource, 'APA_7');
    expect(apaBookHtml).toContain('<i>Manual de psicoterapia cognitiva</i>');

    // 2. IEEE
    const ieeeJournalHtml = formatFullReferenceHTML(journalSource, 'IEEE');
    expect(ieeeJournalHtml).toContain('<i>Revista Peruana de Psicología</i>');
    expect(ieeeJournalHtml).toContain('doi: <a href="https://doi.org/10.1016/j.rpsic.2024.01.002">10.1016/j.rpsic.2024.01.002</a>');

    const ieeeBookHtml = formatFullReferenceHTML(bookSource, 'IEEE');
    expect(ieeeBookHtml).toContain('<i>Manual de psicoterapia cognitiva</i>');

    // 3. Vancouver
    const vancouverJournalHtml = formatFullReferenceHTML(journalSource, 'VANCOUVER');
    expect(vancouverJournalHtml).toContain('<i>Revista Peruana de Psicología</i>');

    const vancouverBookHtml = formatFullReferenceHTML(bookSource, 'VANCOUVER');
    expect(vancouverBookHtml).toContain('<i>Manual de psicoterapia cognitiva</i>');

    // 4. MLA 9
    const mlaHtml = formatFullReferenceHTML(journalSource, 'MLA_9');
    expect(mlaHtml).toContain('<i>Revista Peruana de Psicología</i>');

    // 5. Chicago Author-Date
    const chicagoHtml = formatFullReferenceHTML(journalSource, 'CHICAGO_AUTHOR_DATE');
    expect(chicagoHtml).toContain('<i>Revista Peruana de Psicología</i>');
  });

  it('formats BOOK_CHAPTER and CHICAGO_NOTES citations correctly', () => {
    const chapterSource: Source = {
      id: 'src-chapter',
      workIds: ['work-1'],
      title: 'Terapia de Aceptación y Compromiso en Contextos Académicos',
      authors: [{ firstName: 'Steven', lastName: 'Hayes' }],
      year: 2021,
      type: 'BOOK_CHAPTER',
      publication: 'Avances en Terapias Contextuales',
      pages: '120-145',
      accessedAt: Date.now(),
      verificationStatus: 'VERIFIED',
      verificationProvider: 'MANUAL',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    // APA 7 Chapter
    const apaFull = formatFullReference(chapterSource, 'APA_7');
    expect(apaFull).toContain('En Avances en Terapias Contextuales (pp. 120-145)');

    const apaHtml = formatFullReferenceHTML(chapterSource, 'APA_7');
    expect(apaHtml).toContain('En <i>Avances en Terapias Contextuales</i> (pp. 120-145)');

    // Chicago Notes
    const chicagoNotesNarrative = formatInTextNarrative(chapterSource, 'CHICAGO_NOTES');
    expect(chicagoNotesNarrative).toBe('Hayes');

    const chicagoNotesParenthetical = formatInTextParenthetical(chapterSource, 'CHICAGO_NOTES', 'p. 130');
    expect(chicagoNotesParenthetical).toContain('Hayes, "Terapia de Aceptación y Compromiso en Contextos Académicos", p. 130');

    const chicagoNotesRef = formatFullReference(chapterSource, 'CHICAGO_NOTES');
    expect(chicagoNotesRef).toContain('Hayes, Steven. "Terapia de Aceptación y Compromiso en Contextos Académicos." Avances en Terapias Contextuales (2021), 120-145.');
  });

  it('generates collision-resistant BibTeX citeKeys for multiple works by the same author in the same year', () => {
    const paperA: Source = {
      id: 'src-garcia-1',
      workIds: [],
      title: 'Regulación emocional y rendimiento académico',
      authors: [{ firstName: 'Carlos', lastName: 'García' }],
      year: 2023,
      type: 'JOURNAL_ARTICLE',
      publication: 'Revista de Psicología',
      accessedAt: Date.now(),
      verificationStatus: 'VERIFIED',
      verificationProvider: 'CROSSREF',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const paperB: Source = {
      id: 'src-garcia-2',
      workIds: [],
      title: 'Ansiedad ante los exámenes y autoeficacia percibida',
      authors: [{ firstName: 'Carlos', lastName: 'García' }],
      year: 2023,
      type: 'JOURNAL_ARTICLE',
      publication: 'Revista de Psicología',
      accessedAt: Date.now(),
      verificationStatus: 'VERIFIED',
      verificationProvider: 'CROSSREF',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const bibA = generateBibTeX(paperA);
    const bibB = generateBibTeX(paperB);

    expect(bibA).toContain('@article{garcia2023regulacion,');
    expect(bibB).toContain('@article{garcia2023ansiedad,');
    // Ensure distinct citeKeys
    expect(bibA.match(/@article\{([^,]+),/)?.[1]).not.toBe(bibB.match(/@article\{([^,]+),/)?.[1]);
  });

  it('guarantees 100% strict uniqueness in generateBibTeXCollection via incremental suffixes when author, year and keyword match', () => {
    const paper1: Source = {
      id: 's1',
      workIds: [],
      title: 'Ansiedad ante los exámenes en universitarios',
      authors: [{ firstName: 'Carlos', lastName: 'García' }],
      year: 2023,
      type: 'JOURNAL_ARTICLE',
      publication: 'Revista A',
      accessedAt: Date.now(),
      verificationStatus: 'VERIFIED',
      verificationProvider: 'CROSSREF',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const paper2: Source = {
      id: 's2',
      workIds: [],
      title: 'Ansiedad generalizada y estrés académico',
      authors: [{ firstName: 'Carlos', lastName: 'García' }],
      year: 2023,
      type: 'JOURNAL_ARTICLE',
      publication: 'Revista B',
      accessedAt: Date.now(),
      verificationStatus: 'VERIFIED',
      verificationProvider: 'CROSSREF',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const collection = generateBibTeXCollection([paper1, paper2]);
    expect(collection).toContain('@article{garcia2023ansiedad,');
    expect(collection).toContain('@article{garcia2023ansiedadb,');
  });

  it('preserves legitimate ellipses in titles across Chicago and Vancouver styles', () => {
    const ellipsisSource: Source = {
      id: 'src-ellipsis',
      workIds: [],
      title: 'Memoria y cognición... un estudio empírico',
      authors: [{ firstName: 'María', lastName: 'López' }],
      year: 2024,
      type: 'JOURNAL_ARTICLE',
      publication: 'Revista de Neuropsicología',
      accessedAt: Date.now(),
      verificationStatus: 'VERIFIED',
      verificationProvider: 'CROSSREF',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const chicagoPlain = formatFullReference(ellipsisSource, 'CHICAGO_AUTHOR_DATE');
    expect(chicagoPlain).toContain('...');

    const chicagoHtml = formatFullReferenceHTML(ellipsisSource, 'CHICAGO_AUTHOR_DATE');
    expect(chicagoHtml).toContain('...');

    const chicagoNotesHtml = formatFullReferenceHTML(ellipsisSource, 'CHICAGO_NOTES');
    expect(chicagoNotesHtml).toContain('...');

    const vancouverHtml = formatFullReferenceHTML(ellipsisSource, 'VANCOUVER');
    expect(vancouverHtml).toContain('...');
  });

  it('neutralizes malicious javascript: URLs preventing XSS injection in HTML citations', () => {
    const xssSource: Source = {
      id: 'src-xss',
      workIds: [],
      title: 'Valid Title',
      authors: [{ firstName: 'Test', lastName: 'Author' }],
      year: 2024,
      type: 'WEBPAGE',
      url: 'javascript:alert(document.domain)',
      accessedAt: Date.now(),
      verificationStatus: 'UNVERIFIED',
      verificationProvider: 'MANUAL',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const html = formatFullReferenceHTML(xssSource, 'APA_7');
    expect(html).not.toContain('<a href="javascript:');
    expect(html).not.toContain('<a href');
  });

  it('escapes LaTeX special characters in BibTeX titles, authors, and publications while preserving DOIs and URLs', () => {
    expect(escapeBibTeX('Efectos del estrés & ansiedad (50% casos) #1 _test_ {hola} ~world^')).toBe(
      'Efectos del estrés \\& ansiedad (50\\% casos) \\#1 \\_test\\_ \\{hola\\} \\textasciitilde{}world\\textasciicircum{}'
    );

    const latexSource: Source = {
      id: 'src-latex',
      workIds: [],
      title: 'Estrés & Ansiedad: 100% de efectividad en modelos #1 _clínicos_',
      authors: [{ firstName: 'M&M', lastName: 'O\'Connor_Smith' }],
      year: 2024,
      type: 'JOURNAL_ARTICLE',
      publication: 'Revista de I&D % Investigación',
      volume: '10',
      issue: '2',
      pages: '100-110',
      doi: '10.1000/182_raw_doi&100%',
      url: 'https://example.com/test?a=1&b=2',
      accessedAt: Date.now(),
      verificationStatus: 'VERIFIED',
      verificationProvider: 'CROSSREF',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const bib = generateBibTeX(latexSource);
    expect(bib).toContain('title = {Estrés \\& Ansiedad: 100\\% de efectividad en modelos \\#1 \\_clínicos\\_}');
    expect(bib).toContain('journal = {Revista de I\\&D \\% Investigación}');
    expect(bib).toContain('author = {O\'Connor\\_Smith, M\\&M}');
    // DOIs and URLs must remain untouched
    expect(bib).toContain('doi = {10.1000/182_raw_doi&100%}');
    expect(bib).not.toContain('doi = {10.1000/182\\_raw');
  });
});
