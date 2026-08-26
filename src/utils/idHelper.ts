/**
 * Safe, universal ID generator with graceful fallbacks across all environments:
 * Secure HTTPS, local development HTTP, and legacy browser WebViews.
 */
export function generateId(prefix = ''): string {
  let uniquePart: string;

  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    uniquePart = crypto.randomUUID();
  } else {
    // Cryptographic/pseudo-random fallback for insecure HTTP / legacy WebViews
    const timestamp = Date.now().toString(36);
    const randomA = Math.random().toString(36).substring(2, 9);
    const randomB = Math.random().toString(36).substring(2, 6);
    uniquePart = `${timestamp}-${randomA}${randomB}`;
  }

  return prefix ? `${prefix}-${uniquePart}` : uniquePart;
}
