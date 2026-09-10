/**
 * Cancellation tests for the humanizer pipeline (2026-09-09 round 3).
 * The humanizer can run for minutes on slow models; a Cancel button must
 * actually stop the pipeline. Two behaviors are contract:
 *   1. An aborted signal BEFORE any LLM call → immediate AbortError
 *      (never silently falls back to offline humanization).
 *   2. An LLM call that rejects with AbortError mid-phase → the AbortError
 *      propagates (user cancellation is not an "API fail" to swallow).
 *
 * runLLM/callLLM are mocked: these tests verify pipeline control flow,
 * not network behavior (which needs a real provider).
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

// Mock the low-level callLLM so no network is touched.
const callLLMMock = vi.fn();
vi.mock('../services/aiService', async (importOriginal) => {
  const original = await importOriginal<typeof import('../services/aiService')>();
  return { ...original, callLLM: (...args: unknown[]) => callLLMMock(...args) };
});

import { humanizeText } from '../services/textLabService';
import type { AISettings } from '../types';

const fakeSettings: AISettings = {
  provider: 'openai',
  apiKey: 'test-key-123',
  modelName: 'gpt-4o-mini',
  temperature: 0.5,
  // other fields the interface may require are irrelevant to these tests
} as unknown as AISettings;

const LONG_TEXT =
  'Los estilos de crianza son un punto relevante para el desarrollo emocional de las personas. ' +
  'Las experiencias dentro de la familia moldean la regulación emocional. '.repeat(6);

beforeEach(() => {
  callLLMMock.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('humanizeText cancellation', () => {
  it('throws AbortError immediately when the signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      humanizeText(LONG_TEXT, fakeSettings, { signal: controller.signal })
    ).rejects.toThrow('Humanización cancelada');
    // The mock must not have been called: an aborted run never spends a token.
    expect(callLLMMock).not.toHaveBeenCalled();
  });

  it('propagates AbortError when the LLM call rejects mid-pipeline (phase 2, chunk loop)', async () => {
    const controller = new AbortController();
    let callCount = 0;
    // Call 1 (audit) resolves; calls ≥2 (chunk rewrite) HANG until aborted —
    // that's the real-world shape of a user cancelling a slow rewrite.
    callLLMMock.mockImplementation((_prompt: string, _s: unknown, opts?: { signal?: AbortSignal }) => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({
          text: JSON.stringify({ readsAI: true, problems: [], structureProblem: '' }),
          modelUsed: 'mock',
          providerUsed: 'openai'
        });
      }
      return new Promise<never>((_resolve, reject) => {
        const onAbort = () => reject(new DOMException('Aborted', 'AbortError'));
        if (opts?.signal?.aborted) {
          onAbort();
          return;
        }
        opts?.signal?.addEventListener('abort', onAbort, { once: true });
      });
    });

    const progressEvents: string[] = [];
    const promise = humanizeText(LONG_TEXT, fakeSettings, {
      signal: controller.signal,
      onProgress: (p) => progressEvents.push(p.phase)
    });

    // Cancel as soon as phase 2 (rewriting) reports progress.
    await vi.waitFor(() => {
      expect(progressEvents).toContain('rewriting');
    });
    controller.abort();

    await expect(promise).rejects.toThrow();
    expect(progressEvents).toContain('rewriting');
  });

  it('still completes when no signal is given (backwards compatibility)', async () => {
    callLLMMock.mockResolvedValue({
      text: JSON.stringify({
        readsAI: false,
        problems: [],
        structureProblem: ''
      }),
      modelUsed: 'mock',
      providerUsed: 'openai'
    });

    const res = await humanizeText(LONG_TEXT, fakeSettings);
    // Reaching a result without options means the old call signature still works.
    expect(res.text.length).toBeGreaterThan(0);
  });
});
