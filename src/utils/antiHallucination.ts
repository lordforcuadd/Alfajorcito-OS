import type { Source, VerificationStatus } from '../types';

export interface AuditResult {
  status: VerificationStatus;
  missingFields: string[];
  warnings: string[];
  isDoiValid: boolean;
  score: number; // 0 to 100
}

export function auditSourceMetadata(source: Partial<Source>): AuditResult {
  const missing: string[] = [];
  const warnings: string[] = [];
  let score = 0;

  // 1. Authors check
  if (!source.authors || source.authors.length === 0) {
    missing.push('Autores (DATO NO VERIFICADO)');
  } else {
    const validAuthors = source.authors.filter(a => a.lastName && a.lastName.trim().length > 0);
    if (validAuthors.length === 0) {
      missing.push('Apellidos de autores');
    } else {
      score += 25;
    }
  }

  // 2. Title check
  if (!source.title || source.title.trim().length === 0) {
    missing.push('Título de la publicación');
  } else {
    score += 25;
  }

  // 3. Year check
  if (!source.year || isNaN(source.year) || source.year < 1800 || source.year > new Date().getFullYear() + 1) {
    missing.push('Año de publicación');
  } else {
    score += 20;
  }

  // 4. Publication / Journal / Venue
  if (!source.publication || source.publication.trim().length === 0) {
    missing.push('Revista / Editorial / Contenedor');
  } else {
    score += 15;
  }

  // 5. DOI / URL
  let isDoiValid = false;
  if (source.doi) {
    // Basic DOI regex pattern (10.XXXX/...)
    const doiPattern = /^10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+$/;
    const cleanDoi = source.doi.replace(/^https?:\/\/(dx\.)?doi\.org\//, '');
    if (doiPattern.test(cleanDoi)) {
      isDoiValid = true;
      score += 15;
    } else {
      warnings.push('El formato de DOI parece irregular.');
    }
  } else if (source.url) {
    score += 10;
  } else {
    missing.push('DOI o Enlace de acceso');
  }

  // Determine Verification Status
  let status: VerificationStatus = 'UNVERIFIED';
  if (score >= 90 && isDoiValid) {
    status = 'VERIFIED';
  } else if (score >= 50) {
    status = 'PARTIALLY_VERIFIED';
  } else {
    status = 'UNVERIFIED';
  }

  return {
    status,
    missingFields: missing,
    warnings,
    isDoiValid,
    score
  };
}

export function sanitizeAcademicText(text: string): string {
  if (!text) return '';
  return text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .trim();
}
