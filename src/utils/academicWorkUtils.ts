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
  return Math.ceil((deadlineTimestamp - currentTimestamp) / 86400000);
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

      // 5. Clean workIds array in sources (dissociate rather than hard delete source knowledge)
      const relatedSources = await db.sources.toArray();
      const dissociated = dissociateWorkIdFromSources(relatedSources, workIdToDelete);
      for (let i = 0; i < relatedSources.length; i++) {
        const original = relatedSources[i];
        if (original.workIds && original.workIds.includes(workIdToDelete)) {
          await db.sources.update(original.id, {
            workIds: dissociated[i].workIds,
            updatedAt: Date.now()
          });
        }
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
