import type { Source, CitationStyle, Author } from '../types';

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
  
  if (authors.length === 0) {
    const shortTitle = source.title
      ? `"${source.title.length > 25 ? source.title.slice(0, 25) + '...' : source.title}"`
      : 'Anónimo';
    return `${shortTitle} (${year})`;
  }

  if (style === 'APA_7' || style === 'CHICAGO_AUTHOR_DATE') {
    if (authors.length === 1) return `${authors[0].lastName} (${year})`;
    if (authors.length === 2) return `${authors[0].lastName} y ${authors[1].lastName} (${year})`;
    return `${authors[0].lastName} et al. (${year})`;
  }

  if (style === 'MLA_9') {
    if (authors.length === 1) return `${authors[0].lastName}`;
    if (authors.length === 2) return `${authors[0].lastName} y ${authors[1].lastName}`;
    return `${authors[0].lastName} et al.`;
  }

  if (style === 'IEEE' || style === 'VANCOUVER') {
    return `${authors[0].lastName} [${referenceNumber ?? '1'}]`;
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
  const pageStr = pageOrLocation ? `, ${pageOrLocation}` : '';

  if (authors.length === 0) {
    const shortTitle = source.title
      ? `"${source.title.length > 25 ? source.title.slice(0, 25) + '...' : source.title}"`
      : 'Anónimo';
    return `(${shortTitle}, ${year}${pageStr})`;
  }

  if (style === 'APA_7') {
    let authorStr = authors[0].lastName;
    if (authors.length === 2) authorStr = `${authors[0].lastName} & ${authors[1].lastName}`;
    else if (authors.length > 2) authorStr = `${authors[0].lastName} et al.`;
    return `(${authorStr}, ${year}${pageStr})`;
  }

  if (style === 'MLA_9') {
    let authorStr = authors[0].lastName;
    if (authors.length === 2) authorStr = `${authors[0].lastName} and ${authors[1].lastName}`;
    else if (authors.length > 2) authorStr = `${authors[0].lastName} et al.`;
    const loc = pageOrLocation ? ` ${pageOrLocation.replace(/^[pP]\.?\s*/, '')}` : '';
    return `(${authorStr}${loc})`;
  }

  if (style === 'IEEE' || style === 'VANCOUVER') {
    return `[${referenceNumber ?? '1'}]`;
  }

  if (style === 'CHICAGO_AUTHOR_DATE') {
    let authorStr = authors[0].lastName;
    if (authors.length === 2) authorStr = `${authors[0].lastName} and ${authors[1].lastName}`;
    else if (authors.length > 2) authorStr = `${authors[0].lastName} et al.`;
    return `(${authorStr} ${year}${pageStr})`;
  }

  return `(${authors[0].lastName}, ${year}${pageStr})`;
}

export function formatFullReference(source: Source, style: CitationStyle = 'APA_7'): string {
  const year = source.year || 's.f.';
  const title = source.title || 'Título desconocido';
  const doi = source.doi ? (source.doi.startsWith('http') ? source.doi : `https://doi.org/${source.doi}`) : '';
  const url = source.url || doi;

  switch (style) {
    case 'APA_7': {
      const authors = formatAuthorNamesAPA(source.authors);
      if (source.type === 'JOURNAL_ARTICLE') {
        const pub = source.publication ? ` ${source.publication}` : '';
        const vol = source.volume ? `, ${source.volume}` : '';
        const iss = source.issue ? `(${source.issue})` : '';
        const pgs = source.pages ? `, ${source.pages}` : '';
        const doiPart = url ? ` ${url}` : '';
        return `${authors} (${year}). ${title}.${pub}${vol}${iss}${pgs}.${doiPart}`.replace(/\.\./g, '.').trim();
      } else if (source.type === 'BOOK') {
        const pub = source.publication ? ` ${source.publication}.` : '';
        const doiPart = url ? ` ${url}` : '';
        return `${authors} (${year}). ${title}.${pub}${doiPart}`.replace(/\.\./g, '.').trim();
      } else {
        const pub = source.publication ? ` ${source.publication}.` : '';
        const doiPart = url ? ` ${url}` : '';
        return `${authors} (${year}). ${title}.${pub}${doiPart}`.replace(/\.\./g, '.').trim();
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
      return `${authorStr} "${title}."${pub}${vol}${iss} ${year},${pgs}${doiPart}`.replace(/\s+/g, ' ').replace(/\.\./g, '.').trim();
    }

    case 'IEEE': {
      let authorStr = 'Anon.';
      if (source.authors && source.authors.length > 0) {
        authorStr = source.authors.map(a => `${a.firstName ? a.firstName.charAt(0) + '. ' : ''}${a.lastName}`).join(', ');
      }
      const pub = source.publication ? `, ${source.publication}` : '';
      const vol = source.volume ? `, vol. ${source.volume}` : '';
      const iss = source.issue ? `, no. ${source.issue}` : '';
      const pgs = source.pages ? `, pp. ${source.pages}` : '';
      const doiPart = url ? `, doi: ${source.doi || url}` : '';
      return `${authorStr}, "${title}"${pub}${vol}${iss}${pgs}, ${year}${doiPart}.`.replace(/\s+/g, ' ').trim();
    }

    case 'CHICAGO_AUTHOR_DATE': {
      const authors = formatAuthorNamesAPA(source.authors).replace(/&/g, 'and');
      const pub = source.publication ? ` ${source.publication}` : '';
      const vol = source.volume ? ` ${source.volume}` : '';
      const iss = source.issue ? `, no. ${source.issue}` : '';
      const pgs = source.pages ? `: ${source.pages}` : '';
      const doiPart = url ? ` ${url}` : '';
      return `${authors}. ${year}. "${title}."${pub}${vol}${iss}${pgs}.${doiPart}`.replace(/\.\./g, '.').trim();
    }

    case 'VANCOUVER': {
      let authorStr = 'Anon';
      if (source.authors && source.authors.length > 0) {
        authorStr = source.authors.map(a => `${a.lastName} ${a.firstName ? a.firstName.charAt(0) : ''}`).join(', ');
      }
      const pub = source.publication ? ` ${source.publication}.` : '';
      const vol = source.volume ? `;${source.volume}` : '';
      const iss = source.issue ? `(${source.issue})` : '';
      const pgs = source.pages ? `:${source.pages}` : '';
      return `${authorStr}. ${title}.${pub} ${year}${vol}${iss}${pgs}.`.replace(/\s+/g, ' ').replace(/\.\./g, '.').trim();
    }

    default:
      return formatFullReference(source, 'APA_7');
  }
}

export function generateBibTeX(source: Source): string {
  const citeKey = `${(source.authors?.[0]?.lastName || 'source').toLowerCase()}${source.year || 'nodate'}`;
  const authorsStr = (source.authors || []).map(a => `${a.lastName}, ${a.firstName}`).join(' and ');
  const entryType = source.type === 'BOOK' ? 'book' : 'article';

  return `@${entryType}{${citeKey},
  title = {${source.title || ''}},
  author = {${authorsStr}},
  year = {${source.year || ''}},
  journal = {${source.publication || ''}},
  volume = {${source.volume || ''}},
  number = {${source.issue || ''}},
  pages = {${source.pages || ''}},
  doi = {${source.doi || ''}},
  url = {${source.url || ''}}
}`;
}
