import { describe, it, expect } from 'vitest';
import type { Work, Source, Task, InquiryToTeacher, UserProfile } from '../types';
import { DEFAULT_USER_PROFILE } from '../types';
import { validateSourceAge } from '../utils/sourceAgeValidator';
import {
  calculateDaysRemaining,
  getDeadlineUrgencyMeta,
  calculateTaskProgress,
  dissociateWorkIdFromSources
} from '../utils/academicWorkUtils';

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

  it('calculates deadline days remaining and urgency states accurately using production helper', () => {
    const fixedNow = 1756000000000;
    const futureDeadline = fixedNow + 86400000 * 5;
    const urgentDeadline = fixedNow + 86400000 * 1;
    const overdueDeadline = fixedNow - 86400000 * 2;
    const todayDeadline = fixedNow;

    const daysLeftFuture = calculateDaysRemaining(futureDeadline, fixedNow);
    const daysLeftUrgent = calculateDaysRemaining(urgentDeadline, fixedNow);
    const daysLeftOverdue = calculateDaysRemaining(overdueDeadline, fixedNow);
    const daysLeftToday = calculateDaysRemaining(todayDeadline, fixedNow);

    expect(daysLeftFuture).toBe(5);
    expect(daysLeftUrgent).toBe(1);
    expect(daysLeftOverdue).toBe(-2);
    expect(daysLeftToday).toBe(0);

    const metaFuture = getDeadlineUrgencyMeta(daysLeftFuture, false);
    const metaUrgent = getDeadlineUrgencyMeta(daysLeftUrgent, false);
    const metaOverdue = getDeadlineUrgencyMeta(daysLeftOverdue, false);
    const metaToday = getDeadlineUrgencyMeta(daysLeftToday, false);
    const metaDelivered = getDeadlineUrgencyMeta(daysLeftFuture, true);

    expect(metaFuture.urgency).toBe('warning');
    expect(metaUrgent.urgency).toBe('urgent');
    expect(metaOverdue.urgency).toBe('overdue');
    expect(metaToday.urgency).toBe('urgent');
    expect(metaDelivered.label).toContain('Entregado');
  });

  it('calculates task completion percentage using production helper', () => {
    const progress = calculateTaskProgress(sampleTasks);

    expect(progress.completed).toBe(1);
    expect(progress.total).toBe(2);
    expect(progress.percentage).toBe(50);

    const emptyProgress = calculateTaskProgress([]);
    expect(emptyProgress.percentage).toBe(0);
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

  it('performs safe source dissociation using production dissociateWorkIdFromSources helper', () => {
    const workIdToDelete = 'work-tesis-1';

    // Call real shared helper used in WorkModal.handleDeleteWork
    const updatedSources = dissociateWorkIdFromSources(sampleSources, workIdToDelete);

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
