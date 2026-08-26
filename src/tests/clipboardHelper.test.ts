import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { copyText, copyRichReference } from '../utils/clipboardHelper';

describe('clipboardHelper & copyRichReference Unit Tests', () => {
  const originalNavigator = globalThis.navigator;
  const originalClipboardItem = (globalThis as unknown as { ClipboardItem?: unknown }).ClipboardItem;
  const originalDocument = (globalThis as unknown as { document?: unknown }).document;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      configurable: true,
      writable: true
    });
    Object.defineProperty(globalThis, 'ClipboardItem', {
      value: originalClipboardItem,
      configurable: true,
      writable: true
    });
    Object.defineProperty(globalThis, 'document', {
      value: originalDocument,
      configurable: true,
      writable: true
    });
  });

  it('1. copyText returns false immediately for empty or blank strings', async () => {
    expect(await copyText('')).toBe(false);
    expect(await copyText(null as unknown as string)).toBe(false);
    expect(await copyText(undefined as unknown as string)).toBe(false);
  });

  it('2. copyText succeeds via modern navigator.clipboard.writeText when available', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(globalThis, 'navigator', {
      value: { clipboard: { writeText: writeTextMock } },
      configurable: true,
      writable: true
    });

    const result = await copyText('Contenido de prueba');
    expect(result).toBe(true);
    expect(writeTextMock).toHaveBeenCalledWith('Contenido de prueba');
  });

  it('3. copyText falls back to document.execCommand when navigator.clipboard.writeText throws (HTTP context)', async () => {
    const writeTextMock = vi.fn().mockRejectedValue(new Error('NotAllowedError: writeText blocked in insecure HTTP'));
    Object.defineProperty(globalThis, 'navigator', {
      value: { clipboard: { writeText: writeTextMock } },
      configurable: true,
      writable: true
    });

    const appendChildMock = vi.fn();
    const removeChildMock = vi.fn();
    const execCommandMock = vi.fn().mockReturnValue(true);
    const selectMock = vi.fn();

    const mockDoc = {
      body: {
        appendChild: appendChildMock,
        removeChild: removeChildMock
      },
      createElement: vi.fn().mockReturnValue({
        style: {},
        setAttribute: vi.fn(),
        select: selectMock,
        value: ''
      }),
      execCommand: execCommandMock
    };

    Object.defineProperty(globalThis, 'document', {
      value: mockDoc,
      configurable: true,
      writable: true
    });

    const result = await copyText('Texto fallback');
    expect(result).toBe(true);
    expect(writeTextMock).toHaveBeenCalled();
    expect(execCommandMock).toHaveBeenCalledWith('copy');
    expect(appendChildMock).toHaveBeenCalled();
    expect(removeChildMock).toHaveBeenCalled();
  });

  it('4. copyText returns false when both modern API and execCommand fail', async () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: {},
      configurable: true,
      writable: true
    });

    const mockDoc = {
      body: {
        appendChild: vi.fn(),
        removeChild: vi.fn()
      },
      createElement: vi.fn().mockReturnValue({
        style: {},
        setAttribute: vi.fn(),
        select: vi.fn(),
        value: ''
      }),
      execCommand: vi.fn().mockReturnValue(false)
    };

    Object.defineProperty(globalThis, 'document', {
      value: mockDoc,
      configurable: true,
      writable: true
    });

    const result = await copyText('Texto fallido');
    expect(result).toBe(false);
  });

  it('5. copyRichReference successfully copies rich HTML and plain text when ClipboardItem is available', async () => {
    const writeMock = vi.fn().mockResolvedValue(undefined);
    class MockClipboardItem {
      data: Record<string, unknown>;
      constructor(data: Record<string, unknown>) {
        this.data = data;
      }
    }

    Object.defineProperty(globalThis, 'ClipboardItem', {
      value: MockClipboardItem,
      configurable: true,
      writable: true
    });

    Object.defineProperty(globalThis, 'navigator', {
      value: { clipboard: { write: writeMock } },
      configurable: true,
      writable: true
    });

    const plain = 'Delgado, C. (2024). Neuropsicología.';
    const html = '<p><i>Neuropsicología</i></p>';

    const result = await copyRichReference(plain, html);
    expect(result).toBe(true);
    expect(writeMock).toHaveBeenCalled();
  });

  it('6. copyRichReference gracefully degrades to copyText (plain text) when Clipboard.write fails', async () => {
    const writeMock = vi.fn().mockRejectedValue(new Error('ClipboardItem not supported in HTTP'));
    const writeTextMock = vi.fn().mockResolvedValue(undefined);

    class MockClipboardItem {
      data: Record<string, unknown>;
      constructor(data: Record<string, unknown>) {
        this.data = data;
      }
    }

    Object.defineProperty(globalThis, 'ClipboardItem', {
      value: MockClipboardItem,
      configurable: true,
      writable: true
    });

    Object.defineProperty(globalThis, 'navigator', {
      value: { clipboard: { write: writeMock, writeText: writeTextMock } },
      configurable: true,
      writable: true
    });

    const plain = 'Delgado, C. (2024). Neuropsicología.';
    const html = '<p><i>Neuropsicología</i></p>';

    const result = await copyRichReference(plain, html);
    expect(result).toBe(true);
    expect(writeMock).toHaveBeenCalled();
    expect(writeTextMock).toHaveBeenCalledWith(plain);
  });
});
