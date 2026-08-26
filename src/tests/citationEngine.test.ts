import { describe, it, expect } from 'vitest';
import {
  formatFullReference,
  formatInTextParenthetical,
  formatInTextNarrative,
  formatAuthorNamesAPA,
  generateBibTeX
} from '../utils/citationEngine';
import type { Source } from '../types';

describe('Citation Engine Suite', () => {
  const sampleArticle: Source = {
    id: 'src-1',
    workIds: ['work-1'],
    title: 'Governing the automated academy: Artificial intelligence in higher education',
    authors: [
      { firstName: 'Ben', lastName: 'Williamson' },
      { firstName: 'Rebecca', lastName: 'Eynon' }
    ],
    year: 2023,
    type: 'JOURNAL_ARTICLE',
    publication: 'British Journal of Educational Technology',
    volume: '54',
    issue: '4',
    pages: '887-903',
    doi: '10.1111/bjet.13328',
    accessedAt: Date.now(),
    verificationStatus: 'VERIFIED',
    verificationProvider: 'CROSSREF',
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  it('formats APA 7 reference correctly with 2 authors and DOI', () => {
    const ref = formatFullReference(sampleArticle, 'APA_7');
    expect(ref).toContain('Williamson, B., & Eynon, R. (2023)');
    expect(ref).toContain('Governing the automated academy');
    expect(ref).toContain('British Journal of Educational Technology, 54(4), 887-903');
    expect(ref).toContain('https://doi.org/10.1111/bjet.13328');
  });

  it('formats MLA 9 reference correctly', () => {
    const ref = formatFullReference(sampleArticle, 'MLA_9');
    expect(ref).toContain('Williamson, Ben, and Rebecca Eynon.');
    expect(ref).toContain('vol. 54');
    expect(ref).toContain('no. 4');
    expect(ref).toContain('pp. 887-903');
  });

  it('formats IEEE numeric reference correctly', () => {
    const ref = formatFullReference(sampleArticle, 'IEEE');
    expect(ref).toContain('B. Williamson, R. Eynon');
    expect(ref).toContain('vol. 54, no. 4, pp. 887-903');
  });

  it('formats in-text parenthetical citations correctly', () => {
    const cite = formatInTextParenthetical(sampleArticle, 'APA_7', 'p. 892');
    expect(cite).toBe('(Williamson & Eynon, 2023, p. 892)');
  });

  it('formats in-text narrative citations correctly', () => {
    const cite = formatInTextNarrative(sampleArticle, 'APA_7');
    expect(cite).toBe('Williamson y Eynon (2023)');
  });

  it('generates valid BibTeX entries', () => {
    const bib = generateBibTeX(sampleArticle);
    expect(bib).toContain('@article{williamson2023governing,');
    expect(bib).toContain('author = {Williamson, Ben and Eynon, Rebecca}');
    expect(bib).toContain('doi = {10.1111/bjet.13328}');
  });
});
