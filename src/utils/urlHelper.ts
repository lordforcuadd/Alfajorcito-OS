/**
 * URL validation and sanitization utility for security hardening.
 * Protects against XSS attacks via javascript:, data:, or vbscript: in <a href>.
 */

export function isSafeHttpUrl(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed) return false;

  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function sanitizeSafeUrl(url?: string | null): string | undefined {
  if (!url || typeof url !== 'string') return undefined;
  const trimmed = url.trim();
  if (!trimmed) return undefined;

  // Reject explicit dangerous protocols
  if (/^(javascript|data|vbscript):/i.test(trimmed)) {
    return undefined;
  }

  // If user pasted a clean domain like docs.google.com/document/d/... auto-prepend https://
  let candidate = trimmed;
  if (!candidate.startsWith('http://') && !candidate.startsWith('https://')) {
    if (/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(\/.*)?$/.test(candidate)) {
      candidate = `https://${candidate}`;
    }
  }

  return isSafeHttpUrl(candidate) ? candidate : undefined;
}
