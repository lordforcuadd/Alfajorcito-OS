import { describe, it, expect } from 'vitest';
import { isSafeHttpUrl, sanitizeSafeUrl } from '../utils/urlHelper';

describe('URL Helper Security & Hardening Suite', () => {
  it('accepts valid http and https URLs', () => {
    expect(isSafeHttpUrl('https://docs.google.com/document/d/123')).toBe(true);
    expect(isSafeHttpUrl('http://dx.doi.org/10.1016/j.sbspro')).toBe(true);
    expect(sanitizeSafeUrl('https://canva.com/design/123')).toBe('https://canva.com/design/123');
  });

  it('rejects and neutralizes dangerous javascript: and data: URIs', () => {
    expect(isSafeHttpUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeHttpUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
    expect(sanitizeSafeUrl('javascript:alert(document.cookie)')).toBeUndefined();
    expect(sanitizeSafeUrl('data:text/html;base64,PHNjcmlwdD4=')).toBeUndefined();
  });

  it('auto-formats clean domain strings into https URLs', () => {
    expect(sanitizeSafeUrl('docs.google.com/document/d/abc')).toBe('https://docs.google.com/document/d/abc');
    expect(sanitizeSafeUrl('canva.com/design/xyz')).toBe('https://canva.com/design/xyz');
  });

  it('handles null, undefined, and empty strings gracefully', () => {
    expect(isSafeHttpUrl('')).toBe(false);
    expect(isSafeHttpUrl(null)).toBe(false);
    expect(isSafeHttpUrl(undefined)).toBe(false);
    expect(sanitizeSafeUrl('')).toBeUndefined();
    expect(sanitizeSafeUrl(null)).toBeUndefined();
  });
});
