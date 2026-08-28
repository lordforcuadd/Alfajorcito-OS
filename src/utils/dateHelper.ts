/**
 * Centralized, timezone-safe date utilities for academic deadlines and form inputs.
 * Prevents UTC offset drifting (e.g. +1 day drift in UTC-5 Peru when using toISOString).
 */

/**
 * Converts a Date or millisecond timestamp to a local 'YYYY-MM-DD' string for HTML <input type="date" />.
 */
export function formatLocalDateForInput(dateOrTimestamp?: Date | number | null): string {
  if (!dateOrTimestamp) {
    return formatLocalDateForInput(new Date());
  }

  const d = typeof dateOrTimestamp === 'number' ? new Date(dateOrTimestamp) : dateOrTimestamp;
  if (isNaN(d.getTime())) {
    return formatLocalDateForInput(new Date());
  }

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parses a 'YYYY-MM-DD' string into the end-of-day local timestamp (23:59:59.999).
 * Ensures consistency across all forms (WorkModal, QuickCaptureModal, etc.).
 */
export function parseDeadlineTimestamp(dateStr?: string | null, fallbackDays = 7): number {
  if (!dateStr || !dateStr.trim()) {
    const fallback = new Date();
    fallback.setDate(fallback.getDate() + fallbackDays);
    fallback.setHours(23, 59, 59, 999);
    return fallback.getTime();
  }

  // Parse YYYY-MM-DD components directly to avoid browser UTC parsing variance
  const parts = dateStr.trim().split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);

    if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
      const localDate = new Date(year, month, day, 23, 59, 59, 999);
      if (!isNaN(localDate.getTime())) {
        return localDate.getTime();
      }
    }
  }

  const fallback = new Date();
  fallback.setDate(fallback.getDate() + fallbackDays);
  fallback.setHours(23, 59, 59, 999);
  return fallback.getTime();
}

/**
 * Formats a timestamp into a human-readable Spanish date string.
 */
export function formatReadableDate(
  dateOrTimestamp?: Date | number | null,
  options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }
): string {
  if (!dateOrTimestamp) return '';
  const d = typeof dateOrTimestamp === 'number' ? new Date(dateOrTimestamp) : dateOrTimestamp;
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('es-PE', options);
}
