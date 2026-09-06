import { describe, it, expect } from 'vitest';
import {
  parseWikiLink,
  normalizeWikiTarget,
  matchWikiEntity,
  containsBacklinkTo
} from '../utils/wikiLinkHelper';
import { formatFullReferenceHTML } from '../utils/citationEngine';
import type { Source } from '../types';

describe('WikiLink Helper Unit Tests', () => {
  it('parses basic wikilink', () => {
    const parsed = parseWikiLink('[[Regulación Emocional]]');
    expect(parsed.target).toBe('Regulación Emocional');
    expect(parsed.cleanTarget).toBe('regulacion emocional');
    expect(parsed.alias).toBeUndefined();
    expect(parsed.displayLabel).toBe('Regulación Emocional');
  });

  it('parses wikilink with alias [[Target|Alias]]', () => {
    const parsed = parseWikiLink('[[Regulación Emocional|Afrontamiento]]');
    expect(parsed.target).toBe('Regulación Emocional');
    expect(parsed.cleanTarget).toBe('regulacion emocional');
    expect(parsed.alias).toBe('Afrontamiento');
    expect(parsed.displayLabel).toBe('Afrontamiento');
  });

  it('parses wikilink with anchor section [[Target#Section]]', () => {
    const parsed = parseWikiLink('[[Memoria#Largo Plazo]]');
    expect(parsed.target).toBe('Memoria');
    expect(parsed.cleanTarget).toBe('memoria');
    expect(parsed.section).toBe('Largo Plazo');
    expect(parsed.displayLabel).toBe('Memoria #Largo Plazo');
  });

  it('parses wikilink with anchor and alias [[Target#Section|Alias]]', () => {
    const parsed = parseWikiLink('[[Memoria#Largo Plazo|MLP]]');
    expect(parsed.target).toBe('Memoria');
    expect(parsed.cleanTarget).toBe('memoria');
    expect(parsed.section).toBe('Largo Plazo');
    expect(parsed.alias).toBe('MLP');
    expect(parsed.displayLabel).toBe('MLP');
  });

  it('normalizes diacritics and casing accurately', () => {
    expect(normalizeWikiTarget('  Psicología Clínica  ')).toBe('psicologia clinica');
    expect(normalizeWikiTarget('TÉCNICAS COGNITIVAS')).toBe('tecnicas cognitivas');
  });

  it('prevents false positives for 3-letter acronyms', () => {
    // "TEA" should not match inside "Teatro" or "Autocuidado"
    expect(matchWikiEntity('TEA', 'Teatro Terapéutico')).toBe(false);
    expect(matchWikiEntity('TOC', 'Técnicas de Autocuidado')).toBe(false);
    // Exact match for "TEA" should match
    expect(matchWikiEntity('tea', 'TEA')).toBe(true);
    // Word boundary match for multi-word phrases
    expect(matchWikiEntity('Terapia Cognitiva', 'Manual de Terapia Cognitiva')).toBe(true);
  });

  it('detects backlinks accurately with aliases and anchors', () => {
    const contentWithAlias = 'Como vimos en [[Regulación Emocional|Afrontamiento]], es clave.';
    expect(containsBacklinkTo(contentWithAlias, 'Regulación Emocional')).toBe(true);
    expect(containsBacklinkTo(contentWithAlias, 'regulacion emocional')).toBe(true);

    const contentWithAnchor = 'Ver la sección [[Memoria#Largo Plazo]] para más detalles.';
    expect(containsBacklinkTo(contentWithAnchor, 'Memoria')).toBe(true);

    const unrelatedContent = 'Este texto no menciona la idea.';
    expect(containsBacklinkTo(unrelatedContent, 'Memoria')).toBe(false);

    // CRITICAL: Substring notes must NOT be claimed as backlinks
    const contentWithCompound = 'Ver [[Memoria de Trabajo]] y [[Tesis de Regulación]].';
    expect(containsBacklinkTo(contentWithCompound, 'Memoria')).toBe(false);
    expect(containsBacklinkTo(contentWithCompound, 'Tesis')).toBe(false);
    expect(containsBacklinkTo(contentWithCompound, 'Memoria de Trabajo')).toBe(true);
  });
});

describe('Citation Engine HTML Double Punctuation Tests', () => {
  it('does not produce double periods in APA 7 book HTML references', () => {
    const mockBook: Source = {
      id: 'src-1',
      title: 'Manual de psicopatología y trastornos.',
      authors: [{ firstName: 'Amparo', lastName: 'Belloch' }],
      year: 2020,
      type: 'BOOK',
      publication: 'McGraw-Hill',
      workIds: []
    } as unknown as Source;

    const html = formatFullReferenceHTML(mockBook, 'APA_7');
    expect(html).not.toContain('..');
    expect(html).not.toContain('</i>.');
    expect(html).toContain('<i>Manual de psicopatología y trastornos.</i> McGraw-Hill.');
  });

  it('does not produce double periods in Chicago Author-Date or Vancouver HTML', () => {
    const mockBook: Source = {
      id: 'src-2',
      title: 'Manual de psicopatología y trastornos.',
      authors: [{ firstName: 'Amparo', lastName: 'Belloch' }],
      year: 2020,
      type: 'BOOK',
      publication: 'McGraw-Hill',
      workIds: []
    } as unknown as Source;

    const chicagoHtml = formatFullReferenceHTML(mockBook, 'CHICAGO_AUTHOR_DATE');
    expect(chicagoHtml).not.toContain('..');
    expect(chicagoHtml).toContain('Belloch, A. 2020.');

    const vancouverHtml = formatFullReferenceHTML(mockBook, 'VANCOUVER');
    expect(vancouverHtml).not.toContain('..');
    expect(vancouverHtml).not.toContain('</i>.');
  });
});
