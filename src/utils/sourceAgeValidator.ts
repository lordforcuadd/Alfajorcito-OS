import type { Source, Work } from '../types';

export type AgeCompliance = 'COMPLIANT' | 'NEEDS_JUSTIFICATION' | 'NON_COMPLIANT';

export interface AgeCheckResult {
  status: AgeCompliance;
  sourceYear: number;
  minAllowedYear: number;
  isHistoricalContextApproved: boolean;
  message: string;
  badgeColor: string; // Tailwind color class
  iconType: 'valid' | 'warning' | 'expired';
}

export function validateSourceAge(source: Source, work?: Work): AgeCheckResult {
  const currentYear = new Date().getFullYear();
  const maxYears = work?.maxSourceAgeYears || 5;
  const minAllowedYear = currentYear - maxYears;
  const sourceYear = source.year || 0;
  const isHistoricalContextApproved = !!source.historicalContextApproved;

  if (!sourceYear) {
    return {
      status: 'NEEDS_JUSTIFICATION',
      sourceYear: 0,
      minAllowedYear,
      isHistoricalContextApproved,
      message: 'Año de publicación no especificado (s.f.). Requiere verificar la fecha original.',
      badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
      iconType: 'warning'
    };
  }

  if (isHistoricalContextApproved) {
    return {
      status: 'COMPLIANT',
      sourceYear,
      minAllowedYear,
      isHistoricalContextApproved: true,
      message: `Fuente clásica/seminal (${sourceYear}) aprobada formalmente por el docente como contexto histórico.`,
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      iconType: 'valid'
    };
  }

  if (sourceYear >= minAllowedYear) {
    return {
      status: 'COMPLIANT',
      sourceYear,
      minAllowedYear,
      isHistoricalContextApproved: false,
      message: `Cumple el criterio de actualidad (${sourceYear} ≥ ${minAllowedYear}).`,
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      iconType: 'valid'
    };
  }

  // If older by 1-3 years: Needs justification
  if (sourceYear >= minAllowedYear - 3) {
    return {
      status: 'NEEDS_JUSTIFICATION',
      sourceYear,
      minAllowedYear,
      isHistoricalContextApproved: false,
      message: `Fuente de ${sourceYear} (límite sugerido ${minAllowedYear}). Requiere justificación o consulta al profesor.`,
      badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
      iconType: 'warning'
    };
  }

  // Non-compliant
  return {
    status: 'NON_COMPLIANT',
    sourceYear,
    minAllowedYear,
    isHistoricalContextApproved: false,
    message: `Fuente antigua (${sourceYear} < ${minAllowedYear}). No cumple la regla de ${maxYears} años sin autorización.`,
    badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
    iconType: 'expired'
  };
}
