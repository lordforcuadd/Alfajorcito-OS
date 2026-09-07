import { db } from '../db';

/**
 * Academic Work Utilities & Calculations for Alfajorcito OS
 */

export type DeadlineUrgency = 'overdue' | 'today' | 'urgent' | 'warning' | 'normal';

export interface DeadlineUrgencyMeta {
  label: string;
  urgency: DeadlineUrgency;
  colorClass: string;
}

export function calculateDaysRemaining(deadlineTimestamp: number, currentTimestamp: number = Date.now()): number {
  const dDate = new Date(deadlineTimestamp);
  const cDate = new Date(currentTimestamp);

  // Normalize both to midnight local time to compute exact calendar days
  const dMidnight = new Date(dDate.getFullYear(), dDate.getMonth(), dDate.getDate()).getTime();
  const cMidnight = new Date(cDate.getFullYear(), cDate.getMonth(), cDate.getDate()).getTime();

  return Math.round((dMidnight - cMidnight) / 86400000);
}

export function getDeadlineUrgencyMeta(daysRemaining: number, isDelivered: boolean = false): DeadlineUrgencyMeta {
  if (isDelivered) {
    return {
      label: 'Entregado 🎉',
      urgency: 'normal',
      colorClass: 'bg-emerald-100/70 text-emerald-900 border-emerald-200'
    };
  }

  if (daysRemaining < 0) {
    return {
      label: `Venció hace ${Math.abs(daysRemaining)}d`,
      urgency: 'overdue',
      colorClass: 'bg-rose-100 text-rose-900 border border-rose-200'
    };
  }

  if (daysRemaining === 0) {
    return {
      label: '¡Vence hoy!',
      urgency: 'urgent',
      colorClass: 'bg-rose-100 text-rose-900 border border-rose-200 animate-pulse'
    };
  }

  const daysLabel = daysRemaining === 1 ? '1 día restante' : `${daysRemaining} días restantes`;

  if (daysRemaining <= 3) {
    return {
      label: daysLabel,
      urgency: 'urgent',
      colorClass: 'bg-rose-50 text-rose-800 border border-rose-200'
    };
  }

  if (daysRemaining <= 7) {
    return {
      label: daysLabel,
      urgency: 'warning',
      colorClass: 'bg-amber-50 text-amber-800 border border-amber-200'
    };
  }

  return {
    label: daysLabel,
    urgency: 'normal',
    colorClass: 'bg-[#FAF8F5] text-[#5A6275] border border-[#EBE5DF]'
  };
}

export function parseAcademicCycle(cycleStr?: string): number {
  const str = String(cycleStr || '').toUpperCase().trim();
  if (!str) return 8;
  if (/\b(IX|9NO|NOVENO)\b/i.test(str) || /\b9\b/.test(str)) return 9;
  if (/\b(X|10MO|DECIMO|DÉCIMO)\b/i.test(str) || /\b10\b/.test(str)) return 10;
  if (/\b(VIII|8VO|OCTAVO)\b/i.test(str) || /\b8\b/.test(str)) return 8;
  if (/\b(VII|7MO|SEPTIMO|SÉPTIMO)\b/i.test(str) || /\b7\b/.test(str)) return 7;
  if (/\b(VI|6TO|SEXTO)\b/i.test(str) || /\b6\b/.test(str)) return 6;
  if (/\b(IV|4TO|CUARTO)\b/i.test(str) || /\b4\b/.test(str)) return 4;
  if (/\b(V|5TO|QUINTO)\b/i.test(str) || /\b5\b/.test(str)) return 5;
  if (/\b(III|3RO|TERCERO)\b/i.test(str) || /\b3\b/.test(str)) return 3;
  if (/\b(II|2DO|SEGUNDO)\b/i.test(str) || /\b2\b/.test(str)) return 2;
  if (/\b(I|1ER|1RO|PRIMER|PRIMERO)\b/i.test(str) || /\b1\b/.test(str)) return 1;
  return 8;
}

/**
 * Formats a 1-based cycle/grade number into standard Spanish academic ordinal notation:
 * 1 -> '1ro', 2 -> '2do', 3 -> '3ro', 4 -> '4to', 5 -> '5to',
 * 6 -> '6to', 7 -> '7mo', 8 -> '8vo', 9 -> '9no', 10 -> '10mo'.
 * Falls back to `${n}º` for numbers outside 1-10.
 */
export function ordinalEs(n: number): string {
  const ordinals: Record<number, string> = {
    1: '1ro',
    2: '2do',
    3: '3ro',
    4: '4to',
    5: '5to',
    6: '6to',
    7: '7mo',
    8: '8vo',
    9: '9no',
    10: '10mo'
  };
  return ordinals[n] || `${n}º`;
}

export function filterTodayTasks<T extends { isCompleted: boolean; dueDate?: number }>(
  tasks: T[],
  startOfToday: number,
  endOfToday: number
): T[] {
  return tasks.filter(
    (t) => !t.isCompleted && (!t.dueDate || (t.dueDate >= startOfToday && t.dueDate <= endOfToday))
  );
}

export function filterOverdueTasks<T extends { isCompleted: boolean; dueDate?: number }>(
  tasks: T[],
  startOfToday: number
): T[] {
  return tasks.filter((t) => !t.isCompleted && t.dueDate && t.dueDate < startOfToday);
}

export function calculateTaskProgress(tasks: { isCompleted: boolean }[]): {
  completed: number;
  total: number;
  percentage: number;
} {
  const total = tasks.length;
  const completed = tasks.filter((t) => t.isCompleted).length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  return { completed, total, percentage };
}

export function dissociateWorkIdFromSources<T extends { workIds?: string[] }>(
  sources: T[],
  workIdToDelete: string
): T[] {
  return sources.map((source) => ({
    ...source,
    workIds: (source.workIds || []).filter((id) => id !== workIdToDelete)
  }));
}

export function isWorkUpcoming(
  work: { status: string; deadline: number; isArchived?: boolean },
  currentTimestamp: number = Date.now(),
  daysThreshold: number = 14
): boolean {
  if (work.status === 'ENTREGADO' || work.status === 'ARCHIVADO' || work.isArchived) return false;
  const days = calculateDaysRemaining(work.deadline, currentTimestamp);
  return days >= 0 && days <= daysThreshold;
}

export function isWorkOverdue(
  work: { status: string; deadline: number; isArchived?: boolean },
  currentTimestamp: number = Date.now()
): boolean {
  if (work.status === 'ENTREGADO' || work.status === 'ARCHIVADO' || work.isArchived) return false;
  return calculateDaysRemaining(work.deadline, currentTimestamp) < 0;
}

export const WORK_DELETION_CONSEQUENCES = {
  alertTitle: 'Esta acción no se puede deshacer',
  formatMainWarning: (workTitle: string) =>
    `Se eliminará permanentemente "${workTitle}", junto con sus tareas asociadas, consultas al docente y citas vinculadas.`,
  dissociationNotice:
    '* Las fuentes científicas, notas, ideas extraídas y paráfrasis de tu biblioteca se conservarán intactas; únicamente se desvincularán de este trabajo para evitar registros huérfanos.'
};

export async function deleteAcademicWorkCascade(workIdToDelete: string): Promise<void> {
  await db.transaction(
    'rw',
    [
      db.works,
      db.tasks,
      db.inquiries,
      db.citations,
      db.sources,
      db.ideas,
      db.paraphrases,
      db.notes
    ],
    async () => {
      // 1. Delete associated tasks
      await db.tasks.where({ workId: workIdToDelete }).delete();

      // 2. Delete associated inquiries
      await db.inquiries.where({ workId: workIdToDelete }).delete();

      // 3. Delete citations explicitly linked to this work
      await db.citations.where({ workId: workIdToDelete }).delete();

      // 4. Dissociate ideas & paraphrases (preserve knowledge in library, remove work link)
      const relatedIdeas = await db.ideas.where({ workId: workIdToDelete }).toArray();
      for (const idea of relatedIdeas) {
        await db.ideas.update(idea.id, { workId: undefined, updatedAt: Date.now() });
      }

      const relatedParaphrases = await db.paraphrases.where({ workId: workIdToDelete }).toArray();
      for (const p of relatedParaphrases) {
        await db.paraphrases.update(p.id, { workId: undefined, updatedAt: Date.now() });
      }

      // 5. Clean workIds array in sources using multi-entry index *workIds
      const relatedSources = await db.sources.where('workIds').equals(workIdToDelete).toArray();
      for (const source of relatedSources) {
        const filteredWorkIds = (source.workIds || []).filter((id) => id !== workIdToDelete);
        await db.sources.update(source.id, {
          workIds: filteredWorkIds,
          updatedAt: Date.now()
        });
      }

      // 6. Dissociate notes (preserve notes in Second Brain, remove orphan workId link)
      const relatedNotes = await db.notes.where({ workId: workIdToDelete }).toArray();
      for (const note of relatedNotes) {
        await db.notes.update(note.id, { workId: undefined, updatedAt: Date.now() });
      }

      // 7. Delete work record itself
      await db.works.delete(workIdToDelete);
    }
  );
}

export async function deleteCourseCascade(courseIdToDelete: string): Promise<void> {
  await db.transaction(
    'rw',
    [db.courses, db.works, db.notes, db.tasks, db.inquiries],
    async () => {
      // 1. Dissociate works (remove course link, preserve deliverable in workspace)
      await db.works.where('courseId').equals(courseIdToDelete).modify({ courseId: undefined });

      // 2. Dissociate notes (remove course link, preserve note in Second Brain)
      await db.notes.where('courseId').equals(courseIdToDelete).modify({ courseId: undefined });

      // 3. Dissociate tasks (keep user task, unlink course)
      await db.tasks.where('courseId').equals(courseIdToDelete).modify({ courseId: undefined });

      // 4. Dissociate teacher inquiries
      await db.inquiries.where('courseId').equals(courseIdToDelete).modify({ courseId: undefined });

      // 5. Delete course record itself
      await db.courses.delete(courseIdToDelete);
    }
  );
}

export async function deleteSourceCascade(sourceIdToDelete: string): Promise<void> {
  await db.transaction(
    'rw',
    [db.sources, db.citations, db.ideas, db.paraphrases, db.notes],
    async () => {
      // 1. Dissociate notes (remove sourceId from note.sourceIds multi-entry array)
      const affectedNotes = await db.notes.where('sourceIds').equals(sourceIdToDelete).toArray();
      for (const note of affectedNotes) {
        const updatedIds = (note.sourceIds || []).filter((id) => id !== sourceIdToDelete);
        await db.notes.update(note.id, { sourceIds: updatedIds, updatedAt: Date.now() });
      }

      // 2. Delete citations linked to this source
      await db.citations.where({ sourceId: sourceIdToDelete }).delete();

      // 3. Delete ideas linked to this source and their linked paraphrases
      const relatedIdeas = await db.ideas.where({ sourceId: sourceIdToDelete }).toArray();
      for (const idea of relatedIdeas) {
        await db.paraphrases.where({ ideaId: idea.id }).delete();
        await db.ideas.delete(idea.id);
      }
      await db.paraphrases.where({ sourceId: sourceIdToDelete }).delete();

      // 4. Delete source record itself
      await db.sources.delete(sourceIdToDelete);
    }
  );
}
