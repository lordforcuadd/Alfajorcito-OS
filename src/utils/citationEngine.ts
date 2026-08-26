import type { Source, CitationStyle, Author } from '../types';
import { copyText } from './clipboardHelper';

export function formatAuthorNamesAPA(authors: Author[]): string {
  if (!authors || authors.length === 0) return 'Autor Desconocido';
  if (authors.length === 1) {
    const a = authors[0];
    const initial = a.firstName ? `${a.firstName.trim().charAt(0)}.` : '';
    return `${a.lastName}, ${initial}`.trim();
  }
  if (authors.length === 2) {
    const a1 = `${authors[0].lastName}, ${authors[0].firstName ? authors[0].firstName.trim().charAt(0) + '.' : ''}`.trim();
    const a2 = `${authors[1].lastName}, ${authors[1].firstName ? authors[1].firstName.trim().charAt(0) + '.' : ''}`.trim();
    return `${a1}, & ${a2}`;
  }
  if (authors.length > 20) {
    // APA 7: primeros 19 autores, "...", y el último autor
    const first19 = authors.slice(0, 19).map((a) => {
      const initial = a.firstName ? `${a.firstName.trim().charAt(0)}.` : '';
      return `${a.lastName}, ${initial}`.trim();
    });
    const last = authors[authors.length - 1];
    const lastInitial = last.firstName ? `${last.firstName.trim().charAt(0)}.` : '';
    return `${first19.join(', ')}, ... ${last.lastName}, ${lastInitial}`.trim();
  }
  const formatted = authors.map((a, i) => {
    const initial = a.firstName ? `${a.firstName.trim().charAt(0)}.` : '';
    const name = `${a.lastName}, ${initial}`.trim();
    if (i === authors.length - 1 && authors.length > 1) {
      return `& ${name}`;
    }
    return name;
  });
  return formatted.join(', ');
}

export function formatInTextNarrative(
  source: Source,
  style: CitationStyle,
  referenceNumber?: number
): string {
  const authors = source.authors || [];
  const year = source.year || 's.f.';

  if (style === 'IEEE' || style === 'VANCOUVER') {
    if (authors.length > 0) {
      const authorStr =
        authors.length > 2
          ? `${authors[0].lastName} et al.`
          : authors.map((a) => a.lastName).join(' y ');
      return `${authorStr} [${referenceNumber || 1}]`;
    }
    return `[${referenceNumber || 1}]`;
  }

  if (authors.length === 0) {
    return `Anónimo (${year})`;
  }

  if (style === 'APA_7') {
    if (authors.length === 1) {
      return `${authors[0].lastName} (${year})`;
    }
    if (authors.length === 2) {
      return `${authors[0].lastName} y ${authors[1].lastName} (${year})`;
    }
    return `${authors[0].lastName} et al. (${year})`;
  }

  if (style === 'MLA_9') {
    if (authors.length === 1) return authors[0].lastName;
    if (authors.length === 2) return `${authors[0].lastName} and ${authors[1].lastName}`;
    return `${authors[0].lastName} et al.`;
  }

  if (style === 'CHICAGO_AUTHOR_DATE') {
    if (authors.length === 1) return `${authors[0].lastName} (${year})`;
    if (authors.length === 2) return `${authors[0].lastName} and ${authors[1].lastName} (${year})`;
    return `${authors[0].lastName} et al. (${year})`;
  }

  if (style === 'CHICAGO_NOTES') {
    return `${authors[0].lastName}`;
  }

  return `${authors[0].lastName} (${year})`;
}

export function formatInTextParenthetical(
  source: Source,
  style: CitationStyle,
  pageOrLocation?: string,
  referenceNumber?: number
): string {
  const authors = source.authors || [];
  const year = source.year || 's.f.';
  const pageStr = pageOrLocation ? `, ${pageOrLocation.startsWith('p') ? pageOrLocation : `p. ${pageOrLocation}`}` : '';

  if (style === 'IEEE' || style === 'VANCOUVER') {
    return `[${referenceNumber || 1}${pageOrLocation ? `, ${pageOrLocation}` : ''}]`;
  }

  if (authors.length === 0) {
    return `(Anónimo, ${year}${pageStr})`;
  }

  if (style === 'APA_7') {
    if (authors.length === 1) {
      return `(${authors[0].lastName}, ${year}${pageStr})`;
    }
    if (authors.length === 2) {
      return `(${authors[0].lastName} & ${authors[1].lastName}, ${year}${pageStr})`;
    }
    return `(${authors[0].lastName} et al., ${year}${pageStr})`;
  }

  if (style === 'MLA_9') {
    const pNum = pageOrLocation ? ` ${pageOrLocation.replace(/^pp?\.?\s*/i, '')}` : '';
    if (authors.length === 1) return `(${authors[0].lastName}${pNum})`;
    if (authors.length === 2) return `(${authors[0].lastName} and ${authors[1].lastName}${pNum})`;
    return `(${authors[0].lastName} et al.${pNum})`;
  }

  if (style === 'CHICAGO_AUTHOR_DATE') {
    let authorStr = authors[0].lastName;
    if (authors.length === 2) authorStr = `${authors[0].lastName} and ${authors[1].lastName}`;
    else if (authors.length > 2) authorStr = `${authors[0].lastName} et al.`;
    return `(${authorStr} ${year}${pageStr})`;
  }

  if (style === 'CHICAGO_NOTES') {
    const authorStr = authors[0].lastName;
    return `${authorStr}, "${source.title || 'Título'}"${pageStr ? `, ${pageOrLocation}` : ''}`;
  }

  return `(${authors[0].lastName}, ${year}${pageStr})`;
}

function ensurePeriod(str: string): string {
  if (!str) return '';
  const trimmed = str.trim();
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

export function formatFullReference(source: Source, style: CitationStyle = 'APA_7'): string {
  const year = source.year || 's.f.';
  const title = source.title || 'Título desconocido';
  const doi = source.doi ? (source.doi.startsWith('http') ? source.doi : `https://doi.org/${source.doi}`) : '';
  const url = source.url || doi;

  switch (style) {
    case 'APA_7': {
      const authors = formatAuthorNamesAPA(source.authors);
      const titleWithPeriod = ensurePeriod(title);

      if (source.type === 'JOURNAL_ARTICLE') {
        const pub = source.publication ? ` ${source.publication}` : '';
        const vol = source.volume ? `, ${source.volume}` : '';
        const iss = source.issue ? `(${source.issue})` : '';
        const pgs = source.pages ? `, ${source.pages}` : '';
        const articleDetails = pub ? `${pub}${vol}${iss}${pgs}.` : '';
        const doiPart = url ? ` ${url}` : '';
        return `${authors} (${year}). ${titleWithPeriod}${articleDetails}${doiPart}`.trim();
      } else if (source.type === 'BOOK_CHAPTER') {
        const book = source.publication ? ` En ${source.publication}` : '';
        const pgs = source.pages ? ` (pp. ${source.pages})` : '';
        const chapterDetails = book ? `${book}${pgs}.` : '';
        const doiPart = url ? ` ${url}` : '';
        return `${authors} (${year}). ${titleWithPeriod}${chapterDetails}${doiPart}`.trim();
      } else {
        const pub = source.publication ? ` ${ensurePeriod(source.publication)}` : '';
        const doiPart = url ? ` ${url}` : '';
        return `${authors} (${year}). ${titleWithPeriod}${pub}${doiPart}`.trim();
      }
    }

    case 'MLA_9': {
      let authorStr = 'Anon.';
      if (source.authors && source.authors.length > 0) {
        if (source.authors.length === 1) {
          authorStr = `${source.authors[0].lastName}, ${source.authors[0].firstName}.`;
        } else if (source.authors.length === 2) {
          authorStr = `${source.authors[0].lastName}, ${source.authors[0].firstName}, and ${source.authors[1].firstName} ${source.authors[1].lastName}.`;
        } else {
          authorStr = `${source.authors[0].lastName}, ${source.authors[0].firstName}, et al.`;
        }
      }
      const pub = source.publication ? ` ${source.publication},` : '';
      const vol = source.volume ? ` vol. ${source.volume},` : '';
      const iss = source.issue ? ` no. ${source.issue},` : '';
      const pgs = source.pages ? ` pp. ${source.pages},` : '';
      const doiPart = url ? ` ${url}.` : '.';
      const titleQuoted = `"${ensurePeriod(title)}"`;
      return `${authorStr} ${titleQuoted}${pub}${vol}${iss} ${year},${pgs}${doiPart}`.replace(/\s+/g, ' ').trim();
    }

    case 'IEEE': {
      let authorStr = 'Anon.';
      if (source.authors && source.authors.length > 0) {
        authorStr = source.authors.map((a) => `${a.firstName ? a.firstName.charAt(0) + '. ' : ''}${a.lastName}`).join(', ');
      }
      if (source.type === 'JOURNAL_ARTICLE') {
        const pub = source.publication ? `, ${source.publication}` : '';
        const vol = source.volume ? `, vol. ${source.volume}` : '';
        const iss = source.issue ? `, no. ${source.issue}` : '';
        const pgs = source.pages ? `, pp. ${source.pages}` : '';
        const doiPart = url ? `, doi: ${source.doi || url}` : '';
        return `${authorStr}, "${title}"${pub}${vol}${iss}${pgs}, ${year}${doiPart}.`.replace(/\s+/g, ' ').trim();
      } else if (source.type === 'BOOK_CHAPTER') {
        const pub = source.publication ? ` en ${source.publication}` : '';
        const pgs = source.pages ? `, pp. ${source.pages}` : '';
        const doiPart = url ? `, doi: ${source.doi || url}` : '';
        return `${authorStr}, "${title}"${pub}${pgs}, ${year}${doiPart}.`.replace(/\s+/g, ' ').trim();
      } else {
        const pub = source.publication ? `, ${source.publication}` : '';
        const doiPart = url ? `, ${url}` : '';
        return `${authorStr}, ${title}${pub}, ${year}${doiPart}.`.replace(/\s+/g, ' ').trim();
      }
    }

    case 'CHICAGO_AUTHOR_DATE': {
      const authors = formatAuthorNamesAPA(source.authors).replace(/&/g, 'and');
      const pub = source.publication ? ` ${source.publication}` : '';
      const vol = source.volume ? ` ${source.volume}` : '';
      const iss = source.issue ? `, no. ${source.issue}` : '';
      const pgs = source.pages ? `: ${source.pages}` : '';
      const details = pub ? `${pub}${vol}${iss}${pgs}.` : '';
      const doiPart = url ? ` ${url}` : '';
      return `${authors}. ${year}. "${ensurePeriod(title)}"${details}${doiPart}`.trim();
    }

    case 'CHICAGO_NOTES': {
      let authorStr = 'Anon.';
      if (source.authors && source.authors.length > 0) {
        if (source.authors.length === 1) {
          authorStr = `${source.authors[0].lastName}, ${source.authors[0].firstName}.`;
        } else {
          authorStr = `${source.authors[0].lastName}, ${source.authors[0].firstName}, et al.`;
        }
      }
      const pub = source.publication ? ` ${source.publication}` : '';
      const pgs = source.pages ? `, ${source.pages}` : '';
      const doiPart = url ? ` ${url}` : '';
      return `${authorStr} "${ensurePeriod(title)}"${pub} (${year})${pgs}.${doiPart}`.trim();
    }

    case 'VANCOUVER': {
      let authorStr = 'Anon';
      if (source.authors && source.authors.length > 0) {
        authorStr = source.authors.map((a) => `${a.lastName} ${a.firstName ? a.firstName.charAt(0) : ''}`).join(', ');
      }
      const titleWithPeriod = ensurePeriod(title);
      if (source.type === 'JOURNAL_ARTICLE') {
        const pub = source.publication ? ` ${ensurePeriod(source.publication)}` : '';
        const vol = source.volume ? `;${source.volume}` : '';
        const iss = source.issue ? `(${source.issue})` : '';
        const pgs = source.pages ? `:${source.pages}` : '';
        return `${authorStr}. ${titleWithPeriod}${pub} ${year}${vol}${iss}${pgs}.`.replace(/\s+/g, ' ').trim();
      } else {
        const pub = source.publication ? ` ${source.publication};` : '';
        return `${authorStr}. ${titleWithPeriod}${pub} ${year}.`.replace(/\s+/g, ' ').trim();
      }
    }

    default:
      return formatFullReference(source, 'APA_7');
  }
}

export function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function formatFullReferenceHTML(source: Source, style: CitationStyle = 'APA_7'): string {
  const year = source.year || 's.f.';
  const title = escapeHtml(source.title || 'Título desconocido');
  const doi = source.doi ? (source.doi.startsWith('http') ? source.doi : `https://doi.org/${source.doi}`) : '';
  const rawUrl = source.url || doi;
  const url = escapeHtml(rawUrl);

  const safeAuthors = (source.authors || []).map((a) => ({
    firstName: escapeHtml(a.firstName || ''),
    lastName: escapeHtml(a.lastName || '')
  }));

  const pubEsc = escapeHtml(source.publication || '');
  const volEsc = escapeHtml(source.volume || '');
  const issEsc = escapeHtml(source.issue || '');
  const pgsEsc = escapeHtml(source.pages || '');

  switch (style) {
    case 'APA_7': {
      const authors = formatAuthorNamesAPA(safeAuthors);
      const titleWithPeriod = ensurePeriod(title);

      if (source.type === 'JOURNAL_ARTICLE') {
        const pub = pubEsc ? ` <i>${pubEsc}</i>` : '';
        const vol = volEsc ? `, <i>${volEsc}</i>` : '';
        const iss = issEsc ? `(${issEsc})` : '';
        const pgs = pgsEsc ? `, ${pgsEsc}` : '';
        const articleDetails = pub ? `${pub}${vol}${iss}${pgs}.` : '';
        const doiPart = url ? ` ${url}` : '';
        return `${authors} (${year}). ${titleWithPeriod}${articleDetails}${doiPart}`.trim();
      } else if (source.type === 'BOOK_CHAPTER') {
        const book = pubEsc ? ` En <i>${pubEsc}</i>` : '';
        const pgs = pgsEsc ? ` (pp. ${pgsEsc})` : '';
        const chapterDetails = book ? `${book}${pgs}.` : '';
        const doiPart = url ? ` <a href="${url}">${url}</a>` : '';
        return `${authors} (${year}). ${titleWithPeriod}${chapterDetails}${doiPart}`.trim();
      } else {
        const italicTitle = `<i>${title}</i>`;
        const pub = pubEsc ? ` ${ensurePeriod(pubEsc)}` : '';
        const doiPart = url ? ` ${url}` : '';
        return `${authors} (${year}). ${italicTitle}.${pub}${doiPart}`.trim();
      }
    }

    case 'MLA_9': {
      let authorStr = 'Anon.';
      if (safeAuthors && safeAuthors.length > 0) {
        if (safeAuthors.length === 1) {
          authorStr = `${safeAuthors[0].lastName}, ${safeAuthors[0].firstName}.`;
        } else if (safeAuthors.length === 2) {
          authorStr = `${safeAuthors[0].lastName}, ${safeAuthors[0].firstName}, and ${safeAuthors[1].firstName} ${safeAuthors[1].lastName}.`;
        } else {
          authorStr = `${safeAuthors[0].lastName}, ${safeAuthors[0].firstName}, et al.`;
        }
      }
      const pub = pubEsc ? ` <i>${pubEsc}</i>,` : '';
      const vol = volEsc ? ` vol. ${volEsc},` : '';
      const iss = issEsc ? ` no. ${issEsc},` : '';
      const pgs = pgsEsc ? ` pp. ${pgsEsc},` : '';
      const doiPart = url ? ` ${url}.` : '.';
      return `${authorStr} "${ensurePeriod(title)}"${pub}${vol}${iss} ${year},${pgs}${doiPart}`.replace(/\s+/g, ' ').trim();
    }

    case 'IEEE': {
      let authorStr = 'Anon.';
      if (safeAuthors && safeAuthors.length > 0) {
        authorStr = safeAuthors.map((a) => `${a.firstName ? a.firstName.charAt(0) + '. ' : ''}${a.lastName}`).join(', ');
      }
      if (source.type === 'JOURNAL_ARTICLE') {
        const pub = pubEsc ? `, <i>${pubEsc}</i>` : '';
        const vol = volEsc ? `, vol. ${volEsc}` : '';
        const iss = issEsc ? `, no. ${issEsc}` : '';
        const pgs = pgsEsc ? `, pp. ${pgsEsc}` : '';
        const doiPart = url ? `, doi: <a href="${url}">${escapeHtml(source.doi || url)}</a>` : '';
        return `${authorStr}, "${title}"${pub}${vol}${iss}${pgs}, ${year}${doiPart}.`.replace(/\s+/g, ' ').trim();
      } else if (source.type === 'BOOK_CHAPTER') {
        const pub = pubEsc ? ` en <i>${pubEsc}</i>` : '';
        const pgs = pgsEsc ? `, pp. ${pgsEsc}` : '';
        const doiPart = url ? `, doi: <a href="${url}">${escapeHtml(source.doi || url)}</a>` : '';
        return `${authorStr}, "${title}"${pub}${pgs}, ${year}${doiPart}.`.replace(/\s+/g, ' ').trim();
      } else {
        const pub = pubEsc ? `, ${pubEsc}` : '';
        const doiPart = url ? `, <a href="${url}">${url}</a>` : '';
        return `${authorStr}, <i>${title}</i>${pub}, ${year}${doiPart}.`.replace(/\s+/g, ' ').trim();
      }
    }

    case 'CHICAGO_AUTHOR_DATE': {
      const authors = formatAuthorNamesAPA(safeAuthors).replace(/&/g, 'and');
      const pub = pubEsc ? ` <i>${pubEsc}</i>` : '';
      const vol = volEsc ? ` ${volEsc}` : '';
      const iss = issEsc ? `, no. ${issEsc}` : '';
      const pgs = pgsEsc ? `: ${pgsEsc}` : '';
      const details = pub ? `${pub}${vol}${iss}${pgs}.` : '';
      const doiPart = url ? ` ${url}` : '';
      return `${authors}. ${year}. "${ensurePeriod(title)}"${details}${doiPart}`.trim();
    }

    case 'CHICAGO_NOTES': {
      let authorStr = 'Anon.';
      if (safeAuthors && safeAuthors.length > 0) {
        if (safeAuthors.length === 1) {
          authorStr = `${safeAuthors[0].lastName}, ${safeAuthors[0].firstName}.`;
        } else {
          authorStr = `${safeAuthors[0].lastName}, ${safeAuthors[0].firstName}, et al.`;
        }
      }
      const pub = pubEsc ? ` <i>${pubEsc}</i>` : '';
      const pgs = pgsEsc ? `, ${pgsEsc}` : '';
      const doiPart = url ? ` <a href="${url}">${url}</a>` : '';
      return `${authorStr} "${ensurePeriod(title)}"${pub} (${year})${pgs}.${doiPart}`.trim();
    }

    case 'VANCOUVER': {
      let authorStr = 'Anon';
      if (safeAuthors && safeAuthors.length > 0) {
        authorStr = safeAuthors.map((a) => `${a.lastName} ${a.firstName ? a.firstName.charAt(0) : ''}`).join(', ');
      }
      if (source.type === 'JOURNAL_ARTICLE') {
        const pub = pubEsc ? ` <i>${pubEsc}</i>.` : '';
        const vol = volEsc ? `;${volEsc}` : '';
        const iss = issEsc ? `(${issEsc})` : '';
        const pgs = pgsEsc ? `:${pgsEsc}` : '';
        return `${authorStr}. ${ensurePeriod(title)}${pub} ${year}${vol}${iss}${pgs}.`.replace(/\s+/g, ' ').trim();
      } else {
        const pub = pubEsc ? ` ${pubEsc};` : '';
        return `${authorStr}. <i>${title}</i>.${pub} ${year}.`.replace(/\s+/g, ' ').trim();
      }
    }

    default:
      return formatFullReference(source, style);
  }
}

export { copyRichReference } from './clipboardHelper';

/**
 * Generates clean, standard BibTeX output with full type mapping,
 * ASCII-sanitized citeKeys, and non-empty conditional fields.
 */
export function generateBibTeX(source: Source): string {
  // Sanitize citeKey: Latin letters, numbers, no accents or spaces
  const primaryAuthor = (source.authors?.[0]?.lastName || 'source')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '');

  const citeKey = `${primaryAuthor.toLowerCase()}${source.year || 'nodate'}`;

  const authorsStr = (source.authors || [])
    .map((a) => `${a.lastName}, ${a.firstName}`)
    .join(' and ');

  const typeMap: Record<string, string> = {
    JOURNAL_ARTICLE: 'article',
    BOOK: 'book',
    BOOK_CHAPTER: 'incollection',
    CONFERENCE_PAPER: 'inproceedings',
    THESIS: 'phdthesis',
    REPORT: 'techreport',
    WEBPAGE: 'misc',
    OTHER: 'misc'
  };

  const entryType = typeMap[source.type] || 'article';
  const fields: string[] = [];

  if (source.title) fields.push(`  title = {${source.title}}`);
  if (authorsStr) fields.push(`  author = {${authorsStr}}`);
  if (source.year) fields.push(`  year = {${source.year}}`);

  if (entryType === 'article') {
    if (source.publication) fields.push(`  journal = {${source.publication}}`);
    if (source.volume) fields.push(`  volume = {${source.volume}}`);
    if (source.issue) fields.push(`  number = {${source.issue}}`);
    if (source.pages) fields.push(`  pages = {${source.pages}}`);
  } else if (entryType === 'book') {
    if (source.publication) fields.push(`  publisher = {${source.publication}}`);
  } else if (entryType === 'incollection' || entryType === 'inproceedings') {
    if (source.publication) fields.push(`  booktitle = {${source.publication}}`);
    if (source.pages) fields.push(`  pages = {${source.pages}}`);
  } else if (entryType === 'phdthesis') {
    if (source.publication) fields.push(`  school = {${source.publication}}`);
  } else if (entryType === 'techreport') {
    if (source.publication) fields.push(`  institution = {${source.publication}}`);
  } else if (entryType === 'misc') {
    if (source.publication || source.url) fields.push(`  howpublished = {${source.url || source.publication}}`);
  }

  if (source.doi) fields.push(`  doi = {${source.doi}}`);
  if (source.url && !fields.some((f) => f.includes('howpublished'))) fields.push(`  url = {${source.url}}`);

  return `@${entryType}{${citeKey},\n${fields.join(',\n')}\n}`;
}
