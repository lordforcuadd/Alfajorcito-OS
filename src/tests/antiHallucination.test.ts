import { describe, it, expect } from 'vitest';
import { auditSourceMetadata } from '../utils/antiHallucination';
import { validateSourceAge } from '../utils/sourceAgeValidator';
import { extractDOI } from '../services/academicApis';
import type { Source, Work } from '../types';

describe('Anti-Hallucination & Metadata Auditor Suite', () => {
  it('identifies verified sources with valid DOI and complete fields', () => {
    const validSource: Partial<Source> = {
      title: 'Valid Paper Title',
      authors: [{ firstName: 'John', lastName: 'Doe' }],
      year: 2023,
      publication: 'Nature',
      doi: '10.1038/s41586-023-00000-0'
    };

    const audit = auditSourceMetadata(validSource);
    expect(audit.status).toBe('VERIFIED');
    expect(audit.isDoiValid).toBe(true);
    expect(audit.missingFields.length).toBe(0);
  });

  it('marks incomplete source as UNVERIFIED with explicit missing fields', () => {
    const invalidSource: Partial<Source> = {
      title: 'Incomplete Paper',
      authors: []
    };

    const audit = auditSourceMetadata(invalidSource);
    expect(audit.status).toBe('UNVERIFIED');
    expect(audit.missingFields).toContain('Autores (DATO NO VERIFICADO)');
    expect(audit.missingFields).toContain('Año de publicación');
  });

  it('correctly extracts standard DOIs and rejects general non-DOI URLs (e.g. SciELO without DOI)', () => {
    expect(extractDOI('10.1016/j.chb.2020.106443')).toBe('10.1016/j.chb.2020.106443');
    expect(extractDOI('https://doi.org/10.1038/s41586-023-00000-0')).toBe('10.1038/s41586-023-00000-0');
    expect(extractDOI('doi: 10.18800/psico.202202.008.')).toBe('10.18800/psico.202202.008');
    expect(extractDOI('https://ve.scielo.org/scielo.php?script=sci_arttext&pid=S2739-00632026000103067')).toBeNull();
    expect(extractDOI('')).toBeNull();
  });
});

describe('Source Age Validator Suite', () => {
  const currentYear = new Date().getFullYear();

  const mockWork: Work = {
    id: 'work-1',
    courseId: 'course-1',
    title: 'Test Work',
    type: 'ENSAYO',
    status: 'INVESTIGACION',
    deadline: Date.now() + 86400000 * 5,
    citationStyle: 'APA_7',
    maxSourceAgeYears: 5,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isArchived: false
  };

  it('approves recent sources within 5 years', () => {
    const recentSource: Source = {
      id: 'src-recent',
      workIds: ['work-1'],
      title: 'Recent Study',
      authors: [{ firstName: 'Jane', lastName: 'Smith' }],
      year: currentYear - 1,
      type: 'JOURNAL_ARTICLE',
      accessedAt: Date.now(),
      verificationStatus: 'VERIFIED',
      verificationProvider: 'CROSSREF',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const res = validateSourceAge(recentSource, mockWork);
    expect(res.status).toBe('COMPLIANT');
    expect(res.iconType).toBe('valid');
  });

  it('marks older sources as NON_COMPLIANT unless approved as historical context', () => {
    const oldSource: Source = {
      id: 'src-old',
      workIds: ['work-1'],
      title: 'Classic Study 1995',
      authors: [{ firstName: 'Albert', lastName: 'Bandura' }],
      year: 1995,
      type: 'BOOK',
      accessedAt: Date.now(),
      verificationStatus: 'VERIFIED',
      verificationProvider: 'CROSSREF',
      historicalContextApproved: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const resNonCompliant = validateSourceAge(oldSource, mockWork);
    expect(resNonCompliant.status).toBe('NON_COMPLIANT');
    expect(resNonCompliant.iconType).toBe('expired');

    // When teacher approved
    const approvedOldSource: Source = { ...oldSource, historicalContextApproved: true };
    const resApproved = validateSourceAge(approvedOldSource, mockWork);
    expect(resApproved.status).toBe('COMPLIANT');
    expect(resApproved.isHistoricalContextApproved).toBe(true);
    expect(resApproved.iconType).toBe('valid');
  });
});
