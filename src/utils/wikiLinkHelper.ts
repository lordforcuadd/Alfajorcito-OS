/**
 * Unified WikiLink Helper for Second Brain & Graph Engine
 * Handles alias syntax [[Target|Alias]], anchors [[Target#Section]],
 * diacritics stripping and collision-free entity matching.
 */

export interface ParsedWikiLink {
  raw: string;
  target: string;
  alias?: string;
  section?: string;
  displayLabel: string;
  cleanTarget: string;
}

/**
 * Normalizes a target string: lowercase, trimmed, NFD diacritics removed.
 */
export function normalizeWikiTarget(str: string): string {
  if (!str) return '';
  return str
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Parses raw wikilink contents (with or without enclosing [[ ]]).
 * Examples:
 *   "Regulación Emocional|Afrontamiento" -> { target: "Regulación Emocional", alias: "Afrontamiento", displayLabel: "Afrontamiento" }
 *   "Memoria#Largo Plazo" -> { target: "Memoria", section: "Largo Plazo", displayLabel: "Memoria #Largo Plazo" }
 *   "[[Terapia|TCC]]" -> { target: "Terapia", alias: "TCC", displayLabel: "TCC" }
 */
export function parseWikiLink(raw: string): ParsedWikiLink {
  const cleaned = raw.trim().replace(/^\[\[/, '').replace(/\]\]$/, '').trim();
  
  let target = cleaned;
  let alias: string | undefined;
  let section: string | undefined;

  // 1. Separate alias if pipe is present
  if (cleaned.includes('|')) {
    const pipeIdx = cleaned.indexOf('|');
    target = cleaned.slice(0, pipeIdx).trim();
    alias = cleaned.slice(pipeIdx + 1).trim() || undefined;
  }

  // 2. Separate anchor section if '#' is present in target
  if (target.includes('#')) {
    const hashIdx = target.indexOf('#');
    section = target.slice(hashIdx + 1).trim() || undefined;
    target = target.slice(0, hashIdx).trim();
  }

  const cleanTarget = target.trim();
  let displayLabel = alias || cleanTarget;
  if (!alias && section) {
    displayLabel = `${cleanTarget} #${section}`;
  }

  return {
    raw,
    target: cleanTarget,
    alias,
    section,
    displayLabel,
    cleanTarget: normalizeWikiTarget(cleanTarget)
  };
}

/**
 * Matches target string against a candidate entity name (e.g. note or concept title).
 * Precludes false positives for short 3-letter strings like 'TOC', 'TEA', 'TCC'
 * unless there is an exact or word-boundary match.
 */
export function matchWikiEntity(target: string, candidate: string): boolean {
  const normTarget = normalizeWikiTarget(target);
  const normCandidate = normalizeWikiTarget(candidate);

  if (!normTarget || !normCandidate) return false;

  // Exact match (case and diacritics insensitive)
  if (normTarget === normCandidate) return true;

  // Short acronyms (< 4 chars) MUST be exact match to avoid matching 'TEA' in 'Teatro'
  if (normCandidate.length < 4 || normTarget.length < 4) {
    return false;
  }

  // Word-boundary match for multi-word phrases (both candidate in target or target in candidate)
  const escapedCandidate = normCandidate.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex1 = new RegExp(`\\b${escapedCandidate}\\b`, 'i');
  if (regex1.test(normTarget)) return true;

  const escapedTarget = normTarget.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex2 = new RegExp(`\\b${escapedTarget}\\b`, 'i');
  return regex2.test(normCandidate);
}

/**
 * Determines whether a given markdown content contains a wikilink targeting
 * a specific note title or note slug, properly handling aliases and anchors.
 */
export function containsBacklinkTo(content: string, noteTitle: string, noteSlug?: string): boolean {
  if (!content) return false;

  const targetTitleNorm = normalizeWikiTarget(noteTitle);
  const targetSlugNorm = noteSlug ? normalizeWikiTarget(noteSlug) : '';

  const wikiLinkRegex = /\[\[([^\]]+)\]\]/g;
  let match: RegExpExecArray | null;

  while ((match = wikiLinkRegex.exec(content)) !== null) {
    const parsed = parseWikiLink(match[1]);
    const linkNorm = parsed.cleanTarget;

    if (linkNorm === targetTitleNorm) return true;
    if (targetSlugNorm && linkNorm === targetSlugNorm) return true;
    if (matchWikiEntity(linkNorm, targetTitleNorm)) return true;
  }

  return false;
}
