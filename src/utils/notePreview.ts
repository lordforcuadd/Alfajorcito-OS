/**
 * Canonical note preview cleaner for card snippets (BrainView list, search results).
 * Strips markdown headings, renders [[wikilinks]] as their visible alias (or target
 * when no alias exists — never leaves orphaned pipes), and removes emphasis markers.
 * Shared by production views and unit tests as the single source of truth.
 */
export function formatNotePreview(content: string): string {
  return content
    .replace(/#+\s/g, '')
    .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, target, alias) => alias || target)
    .replace(/[*_`~>]/g, '')
    .trim();
}
