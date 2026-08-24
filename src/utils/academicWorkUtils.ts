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

  if (daysRemaining <= 3) {
    return {
      label: `${daysRemaining} días restantes`,
      urgency: 'urgent',
      colorClass: 'bg-rose-50 text-rose-800 border border-rose-200'
    };
  }

  if (daysRemaining <= 7) {
    return {
      label: `${daysRemaining} días restantes`,
      urgency: 'warning',
      colorClass: 'bg-amber-50 text-amber-800 border border-amber-200'
    };
  }

  return {
    label: `${daysRemaining} días restantes`,
    urgency: 'normal',
    colorClass: 'bg-[#FAF8F5] text-[#5A6275] border border-[#EBE5DF]'
  };
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
