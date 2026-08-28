import { describe, it, expect } from 'vitest';
import { formatLocalDateForInput, parseDeadlineTimestamp, formatReadableDate } from '../utils/dateHelper';

describe('Date Helper Suite (Timezone-Safe Deadlines)', () => {
  it('formats local Date to YYYY-MM-DD without UTC offset shifting', () => {
    // Construct local date: 2026-09-15 23:59:59
    const localDate = new Date(2026, 8, 15, 23, 59, 59);
    expect(formatLocalDateForInput(localDate)).toBe('2026-09-15');
    expect(formatLocalDateForInput(localDate.getTime())).toBe('2026-09-15');
  });

  it('parses YYYY-MM-DD string into local end-of-day timestamp (23:59:59.999)', () => {
    const ts = parseDeadlineTimestamp('2026-10-20');
    const parsedDate = new Date(ts);
    expect(parsedDate.getFullYear()).toBe(2026);
    expect(parsedDate.getMonth()).toBe(9); // October is 9 (0-indexed)
    expect(parsedDate.getDate()).toBe(20);
    expect(parsedDate.getHours()).toBe(23);
    expect(parsedDate.getMinutes()).toBe(59);
    expect(parsedDate.getSeconds()).toBe(59);
  });

  it('provides safe fallback timestamp when date string is empty or invalid', () => {
    const ts1 = parseDeadlineTimestamp('');
    expect(ts1).toBeGreaterThan(Date.now());

    const ts2 = parseDeadlineTimestamp('invalid-date-string');
    expect(ts2).toBeGreaterThan(Date.now());
  });

  it('formats human-readable date in Spanish format', () => {
    const date = new Date(2026, 11, 25);
    const readable = formatReadableDate(date);
    expect(readable).toContain('25');
    expect(readable).toContain('2026');
  });
});
