import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateId } from '../utils/idHelper';

describe('Universal ID Helper Suite (idHelper.ts)', () => {
  const originalCrypto = globalThis.crypto;

  afterEach(() => {
    Object.defineProperty(globalThis, 'crypto', {
      value: originalCrypto,
      writable: true,
      configurable: true
    });
  });

  it('generates a prefixed UUID when crypto.randomUUID is available', () => {
    const id = generateId('work');
    expect(id).toMatch(/^work-[0-9a-fA-F-]{36}$/);
  });

  it('generates an unprefixed UUID when no prefix is supplied', () => {
    const id = generateId();
    expect(id).toMatch(/^[0-9a-fA-F-]{36}$/);
  });

  it('falls back gracefully to timestamp + random string when crypto is undefined (insecure HTTP / legacy)', () => {
    Object.defineProperty(globalThis, 'crypto', {
      value: undefined,
      writable: true,
      configurable: true
    });

    const id = generateId('task');
    expect(id.startsWith('task-')).toBe(true);
    expect(id.length).toBeGreaterThan(10);
  });

  it('generates unique IDs across 100 consecutive calls', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(generateId('test'));
    }
    expect(ids.size).toBe(100);
  });
});
