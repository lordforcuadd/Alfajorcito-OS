import { describe, it, expect } from 'vitest';
import type { Course, Work, Source, Idea, Paraphrase, Citation, Note, Concept, Task, InquiryToTeacher } from '../types';

describe('Backup and Restore Validation Suite', () => {
  // Replication of the validation logic from SettingsModal.tsx
  const validateItems = <T extends { id: string }>(
    arr: unknown,
    requiredFields: string[]
  ): T[] => {
    if (!Array.isArray(arr)) return [];
    for (const item of arr) {
      if (!item || typeof item !== 'object') {
        throw new Error('Elemento inválido en lista');
      }
      const rec = item as Record<string, unknown>;
      if (typeof rec.id !== 'string' || !rec.id.trim()) {
        throw new Error('Elemento sin ID válido');
      }
      for (const field of requiredFields) {
        if (rec[field] === undefined || rec[field] === null) {
          throw new Error(`Elemento sin campo requerido: ${field}`);
        }
      }
    }
    return arr as T[];
  };

  it('successfully validates schema-compliant Ideas without false "content" missing error', () => {
    const sampleIdea: Idea = {
      id: 'idea-1',
      sourceId: 'src-1',
      workId: 'work-1',
      rawQuote: 'La regulación emocional modula el rendimiento psicométrico.',
      pageOrLocation: 'p. 45',
      extractedCoreIdea: 'Regulación emocional y rendimiento.',
      tags: ['emocion', 'psicometria'],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const validIdeas = validateItems<Idea>([sampleIdea], ['extractedCoreIdea']);
    expect(validIdeas).toHaveLength(1);
    expect(validIdeas[0].extractedCoreIdea).toBe('Regulación emocional y rendimiento.');
  });

  it('successfully validates schema-compliant Citations without false "text" missing error', () => {
    const sampleCitation: Citation = {
      id: 'cite-1',
      sourceId: 'src-1',
      workId: 'work-1',
      style: 'APA_7',
      inTextNarrative: 'Merino-Soto (2024)',
      inTextParenthetical: '(Merino-Soto, 2024)',
      fullReferenceFormatted: 'Merino-Soto, C. (2024). Psicometría Avanzada.',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const validCitations = validateItems<Citation>([sampleCitation], ['fullReferenceFormatted']);
    expect(validCitations).toHaveLength(1);
    expect(validCitations[0].fullReferenceFormatted).toContain('Merino-Soto, C. (2024)');
  });

  it('validates a complete full-database export payload across all 10 academic tables', () => {
    const fullBackupPayload = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      courses: [{ id: 'c-1', name: 'Psicometría', period: '2026-II', color: '#E8A598', isArchived: false, createdAt: Date.now(), updatedAt: Date.now() }],
      works: [{ id: 'w-1', courseId: 'c-1', title: 'Escala de Autoeficacia', type: 'PROYECTO_INVESTIGACION', status: 'INVESTIGACION', deadline: Date.now(), citationStyle: 'APA_7', createdAt: Date.now(), updatedAt: Date.now() }],
      sources: [{ id: 's-1', workIds: ['w-1'], title: 'Validez de Escalas', authors: [{ firstName: 'César', lastName: 'Merino-Soto' }], year: 2024, type: 'JOURNAL_ARTICLE', accessedAt: Date.now(), verificationStatus: 'VERIFIED', verificationProvider: 'CROSSREF', createdAt: Date.now(), updatedAt: Date.now() }],
      ideas: [{ id: 'i-1', sourceId: 's-1', workId: 'w-1', rawQuote: 'Texto citado', extractedCoreIdea: 'Idea extraída', tags: [], createdAt: Date.now(), updatedAt: Date.now() }],
      paraphrases: [{ id: 'p-1', ideaId: 'i-1', sourceId: 's-1', ownInterpretation: 'Paráfrasis propia', finalParaphrase: 'Paráfrasis final', fidelityReviewStatus: 'CONFIRMED_FAITHFUL', createdAt: Date.now(), updatedAt: Date.now() }],
      citations: [{ id: 'cit-1', sourceId: 's-1', workId: 'w-1', style: 'APA_7', inTextNarrative: 'Merino-Soto (2024)', inTextParenthetical: '(Merino-Soto, 2024)', fullReferenceFormatted: 'Merino-Soto, C. (2024)...', createdAt: Date.now(), updatedAt: Date.now() }],
      notes: [{ id: 'n-1', slug: 'validez-constructo', title: 'Validez de Constructo', content: 'Contenido...', paraCategory: 'PROJECT', sourceIds: [], conceptIds: [], tags: [], backlinks: [], isPinned: false, createdAt: Date.now(), updatedAt: Date.now() }],
      concepts: [{ id: 'con-1', name: 'Autoeficacia', description: 'Creencia en las propias capacidades', color: '#0D9488', createdAt: Date.now(), updatedAt: Date.now() }],
      tasks: [{ id: 't-1', title: 'Redactar metodología', isCompleted: false, priority: 'HIGH', category: 'GENERAL', createdAt: Date.now(), updatedAt: Date.now() }],
      inquiries: [{ id: 'inq-1', workId: 'w-1', topic: 'Criterio de jueces', studentDoubt: '¿Cuántos jueces?', status: 'DRAFT', createdAt: Date.now(), updatedAt: Date.now() }]
    };

    expect(validateItems(fullBackupPayload.courses, ['name'])).toHaveLength(1);
    expect(validateItems(fullBackupPayload.works, ['title', 'status', 'deadline'])).toHaveLength(1);
    expect(validateItems(fullBackupPayload.sources, ['title'])).toHaveLength(1);
    expect(validateItems(fullBackupPayload.ideas, ['extractedCoreIdea'])).toHaveLength(1);
    expect(validateItems(fullBackupPayload.paraphrases, ['finalParaphrase'])).toHaveLength(1);
    expect(validateItems(fullBackupPayload.citations, ['fullReferenceFormatted'])).toHaveLength(1);
    expect(validateItems(fullBackupPayload.notes, ['title'])).toHaveLength(1);
    expect(validateItems(fullBackupPayload.concepts, ['name'])).toHaveLength(1);
    expect(validateItems(fullBackupPayload.tasks, ['title'])).toHaveLength(1);
    expect(validateItems(fullBackupPayload.inquiries, ['topic'])).toHaveLength(1);
  });
});
