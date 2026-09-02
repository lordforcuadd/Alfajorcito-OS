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

/**
 * Canonical note-slug generator: lowercase, NFD accent-stripped, kebab-case.
 * Single source of truth for NoteViewerModal (rename), QuickCaptureModal (create)
 * and Obsidian exports. Falls back to the provided fallback when the title
 * collapses to an empty slug.
 */
export function slugifyTitle(title: string, fallback = 'nota'): string {
  const slug = title
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
  return slug || fallback;
}

/**
 * Guarantees a unique slug among existing notes by appending incremental
 * suffixes (-2, -3, ...) when the base slug is already taken by another note.
 * The current note's own slug is never treated as a collision.
 */
export function generateUniqueSlug(
  baseSlug: string,
  currentNoteId: string | undefined,
  existingSlugs: { id: string; slug: string }[]
): string {
  let updatedSlug = baseSlug;
  let counter = 2;
  while (existingSlugs.some((n) => n.id !== currentNoteId && n.slug === updatedSlug)) {
    updatedSlug = `${baseSlug}-${counter}`;
    counter++;
  }
  return updatedSlug;
}
