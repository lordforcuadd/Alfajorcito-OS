import { describe, it, expect } from 'vitest';
import { parseDisplayName } from '../services/academicApis';
import { computeReferenceNumber } from '../modules/research/ResearchView';
import { generateBibTeX } from '../utils/citationEngine';
import { resolveTokenCount } from '../services/aiService';
import { formatLocalFloatingDateTime } from '../utils/googleExporter';
import type { Source } from '../types';

describe('Metadata Ingestion & Integrity Test Suite (F-01 to F-20)', () => {
  describe('F-03: Hispanic Double Surnames & Particle Prefix Parser (parseDisplayName)', () => {
    it('correctly splits Hispanic double surnames without comma into firstName and full compound lastName', () => {
      const parsed1 = parseDisplayName('María Delgado Chacón');
      expect(parsed1.firstName).toBe('María');
      expect(parsed1.lastName).toBe('Delgado Chacón');

      const parsed2 = parseDisplayName('Juan Carlos Pérez Gómez');
      expect(parsed2.firstName).toBe('Juan Carlos');
      expect(parsed2.lastName).toBe('Pérez Gómez');
    });

    it('correctly handles inverted "LastName, FirstName" formats', () => {
      const parsed = parseDisplayName('Merino-Soto, César');
      expect(parsed.firstName).toBe('César');
      expect(parsed.lastName).toBe('Merino-Soto');
    });

    it('correctly parses noble / compound particles (de, de la, del, van)', () => {
      const parsed1 = parseDisplayName('Marcia de la Cruz');
      expect(parsed1.firstName).toBe('Marcia');
      expect(parsed1.lastName).toBe('de la Cruz');

      const parsed2 = parseDisplayName('Carlos del Solar');
      expect(parsed2.firstName).toBe('Carlos');
      expect(parsed2.lastName).toBe('del Solar');
    });

    it('handles single-word names and empty strings safely', () => {
      const single = parseDisplayName('Aristóteles');
      expect(single.firstName).toBe('');
      expect(single.lastName).toBe('Aristóteles');

      const empty = parseDisplayName('');
      expect(empty.firstName).toBe('');
      expect(empty.lastName).toBe('');
    });
  });

  describe('F-05: Strict BibTeX Generation (generateBibTeX)', () => {
    it('generates standard BibTeX with ASCII-sanitized citeKey and mapped entry types', () => {
      const sourceBook: Source = {
        id: 's-book-1',
        workIds: ['w1'],
        title: 'Psicometría Aplicada',
        authors: [{ firstName: 'César', lastName: 'Merino-Soto' }],
        year: 2022,
        type: 'BOOK',
        publication: 'Editorial El Manual Moderno',
        verificationStatus: 'VERIFIED',
        verificationProvider: 'CROSSREF',
        accessedAt: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      const bib = generateBibTeX(sourceBook);
      expect(bib).toContain('@book{merinosoto2022,');
      expect(bib).toContain('title = {Psicometría Aplicada}');
      expect(bib).toContain('author = {Merino-Soto, César}');
      expect(bib).toContain('year = {2022}');
      expect(bib).toContain('publisher = {Editorial El Manual Moderno}');
      // Should not contain empty fields like journal or issue
      expect(bib).not.toContain('journal =');
    });

    it('maps thesis, report and misc types correctly', () => {
      const thesis: Source = {
        id: 's-thesis-1',
        workIds: [],
        title: 'Regulación Emocional en Universitarios',
        authors: [{ firstName: 'Ana', lastName: 'Gómez' }],
        year: 2024,
        type: 'THESIS',
        publication: 'Universidad de San Martín de Porres',
        verificationStatus: 'VERIFIED',
        verificationProvider: 'CROSSREF',
        accessedAt: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      const bib = generateBibTeX(thesis);
      expect(bib).toContain('@phdthesis{gomez2024,');
      expect(bib).toContain('school = {Universidad de San Martín de Porres}');
    });
  });

  describe('F-07: Monthly Token Reset (resolveTokenCount)', () => {
    it('accumulates tokens within the same month', () => {
      const now = new Date(2026, 7, 25); // August 2026
      const prev = { tokensUsedThisMonth: 1500, tokensMonthKey: '2026-08' };
      const next = resolveTokenCount(prev, 500, now);

      expect(next.tokensUsedThisMonth).toBe(2000);
      expect(next.tokensMonthKey).toBe('2026-08');
    });

    it('resets token count to new usage when crossing into a new month', () => {
      const nextMonth = new Date(2026, 8, 1); // September 2026
      const prev = { tokensUsedThisMonth: 1500, tokensMonthKey: '2026-08' };
      const next = resolveTokenCount(prev, 350, nextMonth);

      expect(next.tokensUsedThisMonth).toBe(350);
      expect(next.tokensMonthKey).toBe('2026-09');
    });
  });

  describe('F-08: Deterministic Reference Ordering (computeReferenceNumber)', () => {
    it('orders sources alphabetically by APA reference within assigned workId', () => {
      const s1: Source = {
        id: 'src-z',
        workIds: ['work-1'],
        title: 'Zeta Studies',
        authors: [{ firstName: 'Zoe', lastName: 'Zapata' }],
        year: 2021,
        type: 'JOURNAL_ARTICLE',
        verificationStatus: 'VERIFIED',
        verificationProvider: 'CROSSREF',
        accessedAt: 1000,
        createdAt: 1000,
        updatedAt: 1000
      };

      const s2: Source = {
        id: 'src-a',
        workIds: ['work-1'],
        title: 'Alpha Studies',
        authors: [{ firstName: 'Aaron', lastName: 'Alvarez' }],
        year: 2023,
        type: 'JOURNAL_ARTICLE',
        verificationStatus: 'VERIFIED',
        verificationProvider: 'CROSSREF',
        accessedAt: 2000,
        createdAt: 2000,
        updatedAt: 2000
      };

      const allSources = [s1, s2]; // s1 inserted first in DB

      // Alvarez should be [1] and Zapata should be [2] regardless of insertion order
      expect(computeReferenceNumber(allSources, 'work-1', 'src-a')).toBe(1);
      expect(computeReferenceNumber(allSources, 'work-1', 'src-z')).toBe(2);
    });
  });

  describe('F-14: Local Floating Date Time in RFC 5545 (formatLocalFloatingDateTime)', () => {
    it('formats date into local floating YYYYMMDDTHHMMSS without UTC offset shifting', () => {
      const d = new Date(2026, 7, 25, 14, 30, 0); // 2026-08-25 14:30:00
      const formatted = formatLocalFloatingDateTime(d);
      expect(formatted).toBe('20260825T143000');
    });
  });
});
