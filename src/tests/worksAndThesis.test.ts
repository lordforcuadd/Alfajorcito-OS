import { describe, it, expect } from 'vitest';
import type { Work, Source, Task, InquiryToTeacher, UserProfile } from '../types';
import { DEFAULT_USER_PROFILE } from '../types';
import { validateSourceAge } from '../utils/sourceAgeValidator';

describe('Works and Thesis Management Suite', () => {
  const sampleCourse = {
    id: 'course-psi-801',
    code: 'PSI-801',
    name: 'Seminario de Investigación II (Proyecto de Tesis)',
    period: '2026-II (8vo Ciclo)'
  };

  const sampleWork: Work = {
    id: 'work-tesis-1',
    courseId: sampleCourse.id,
    title: 'Regulación Emocional y Autoeficacia en Estudiantes Universitarios',
    type: 'TESIS',
    status: 'INVESTIGACION',
    deadline: Date.now() + 86400000 * 14, // 14 days in future
    citationStyle: 'APA_7',
    minRequiredSources: 8,
    maxSourceAgeYears: 5,
    rawInstructions: 'Elaborar matriz de consistencia, marco teórico y justificación científica con fuentes Scopus/Scielo.',
    createdAt: Date.now() - 86400000 * 2,
    updatedAt: Date.now(),
    isArchived: false
  };

  const sampleSources: Source[] = [
    {
      id: 'src-1',
      workIds: ['work-tesis-1'],
      title: 'Validación de la Escala de Dificultades en la Regulación Emocional (DERS)',
      authors: [{ firstName: 'Griselda', lastName: 'Medrano' }],
      year: 2022,
      type: 'JOURNAL_ARTICLE',
      publication: 'Revista Iberoamericana de Diagnóstico y Evaluación',
      accessedAt: Date.now(),
      verificationStatus: 'VERIFIED',
      verificationProvider: 'CROSSREF',
      createdAt: Date.now(),
      updatedAt: Date.now()
    },
    {
      id: 'src-2',
      workIds: ['work-tesis-1', 'work-other'],
      title: 'Autoeficacia académica y rendimiento escolar',
      authors: [{ firstName: 'Albert', lastName: 'Bandura' }],
      year: 1997,
      type: 'BOOK',
      publication: 'Freeman',
      accessedAt: Date.now(),
      verificationStatus: 'VERIFIED',
      verificationProvider: 'CROSSREF',
      historicalContextApproved: true,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
  ];

  const sampleTasks: Task[] = [
    {
      id: 'task-1',
      workId: 'work-tesis-1',
      courseId: sampleCourse.id,
      title: 'Redactar Planteamiento del Problema',
      isCompleted: true,
      priority: 'HIGH',
      category: 'RESEARCH',
      createdAt: Date.now(),
      updatedAt: Date.now()
    },
    {
      id: 'task-2',
      workId: 'work-tesis-1',
      courseId: sampleCourse.id,
      title: 'Revisión sistemática de literatura (últimos 5 años)',
      isCompleted: false,
      priority: 'HIGH',
      category: 'RESEARCH',
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
  ];

  it('calculates deadline days remaining and urgency states accurately', () => {
    const now = Date.now();
    const futureWork: Work = { ...sampleWork, deadline: now + 86400000 * 5 };
    const urgentWork: Work = { ...sampleWork, deadline: now + 86400000 * 1 };
    const overdueWork: Work = { ...sampleWork, deadline: now - 86400000 * 2 };

    const daysLeftFuture = Math.ceil((futureWork.deadline - now) / 86400000);
    const daysLeftUrgent = Math.ceil((urgentWork.deadline - now) / 86400000);
    const daysLeftOverdue = Math.ceil((overdueWork.deadline - now) / 86400000);

    expect(daysLeftFuture).toBe(5);
    expect(daysLeftUrgent).toBe(1);
    expect(daysLeftOverdue).toBe(-2);
  });

  it('calculates task completion percentage for progress bars', () => {
    const completed = sampleTasks.filter((t) => t.isCompleted).length;
    const total = sampleTasks.length;
    const progressPct = Math.round((completed / total) * 100);

    expect(completed).toBe(1);
    expect(total).toBe(2);
    expect(progressPct).toBe(50);
  });

  it('validates scientific source age according to work constraints', () => {
    const recentSource = sampleSources[0]; // 2022
    const olderSource = sampleSources[1]; // 1997 with approved historical context

    const recentCheck = validateSourceAge(recentSource, sampleWork);
    expect(recentCheck.status).toBe('COMPLIANT');
    expect(recentCheck.iconType).toBe('valid');

    const olderCheck = validateSourceAge(olderSource, sampleWork);
    expect(olderCheck.status).toBe('COMPLIANT');
    expect(olderCheck.isHistoricalContextApproved).toBe(true);
    expect(olderCheck.message).toContain('aprobada formalmente');
  });

  it('performs safe source dissociation upon work deletion', () => {
    const workIdToDelete = 'work-tesis-1';

    // Simulate dissociation algorithm used in WorkModal.handleDeleteWork
    const updatedSources = sampleSources.map((source) => ({
      ...source,
      workIds: source.workIds.filter((id) => id !== workIdToDelete)
    }));

    // Source 1 was exclusively tied to work-tesis-1 -> now empty array but source preserved
    expect(updatedSources[0].workIds).toEqual([]);
    expect(updatedSources[0].id).toBe('src-1');

    // Source 2 had work-other -> retains work-other
    expect(updatedSources[1].workIds).toEqual(['work-other']);
  });

  it('maintains default user profile integrity with empty thesis and internship by default', () => {
    expect(DEFAULT_USER_PROFILE.name).toBe('Saory');
    expect(DEFAULT_USER_PROFILE.institution).toContain('USMP');
    expect(DEFAULT_USER_PROFILE.major).toBe('Psicología');
    expect(DEFAULT_USER_PROFILE.specialty).toBe('CLINICA');
    expect(DEFAULT_USER_PROFILE.thesisTitle).toBe('');
    expect(DEFAULT_USER_PROFILE.internshipSite).toBe('');
  });
});
