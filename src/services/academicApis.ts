import type { Author, SourceType } from '../types';

export interface AcademicSearchResult {
  title: string;
  authors: Author[];
  year: number;
  type: SourceType;
  publication?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  doi?: string;
  url?: string;
  abstract?: string;
  citationCount?: number;
  provider: 'OPENALEX' | 'CROSSREF' | 'SEMANTIC_SCHOLAR' | 'DOI_ORG' | 'DOAJ' | 'GOOGLE_SCHOLAR';
}

/**
 * Generates a direct search URL for Google Académico / Google Scholar.
 */
export function getGoogleScholarSearchUrl(query: string): string {
  return `https://scholar.google.com/scholar?q=${encodeURIComponent(query.trim())}&hl=es`;
}

/**
 * Extracts a standard DOI pattern (10.xxxx/xxxx) from any string, URL, or citation text.
 */
export function extractDOI(input: string): string | null {
  if (!input) return null;
  const match = input.match(/10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+/i);
  return match ? match[0].replace(/[.,;)]+$/, '') : null;
}

/**
 * Robustly parses a raw author string into firstName and lastName,
 * supporting inverted names ("Last, First"), compound Hispanic surnames,
 * and noble/particle prefixes (de, del, la, van, von, etc.).
 */
export function parseDisplayName(rawName: string): Author {
  if (!rawName || !rawName.trim()) return { firstName: '', lastName: '' };
  const trimmed = rawName.trim();

  // If format is "LastName, FirstName"
  if (trimmed.includes(',')) {
    const parts = trimmed.split(',');
    const lastName = parts[0].trim();
    const firstName = parts.slice(1).join(',').trim();
    return { firstName, lastName };
  }

  const tokens = trimmed.split(/\s+/);
  if (tokens.length === 1) {
    return { firstName: '', lastName: tokens[0] };
  }
  if (tokens.length === 2) {
    return { firstName: tokens[0], lastName: tokens[1] };
  }

  const particles = new Set([
    'de',
    'del',
    'la',
    'las',
    'los',
    'van',
    'von',
    'der',
    'den',
    'da',
    'do',
    'dos',
    'das',
    'san',
    'santa',
    'y'
  ]);

  // Check if there is an explicit particle (e.g. "Marcia de la Cruz")
  for (let i = 1; i < tokens.length; i++) {
    if (particles.has(tokens[i].toLowerCase())) {
      return {
        firstName: tokens.slice(0, i).join(' '),
        lastName: tokens.slice(i).join(' ')
      };
    }
  }

  // Hispanic default for 3 words (e.g. "María Delgado Chacón" -> firstName: "María", lastName: "Delgado Chacón")
  if (tokens.length === 3) {
    return {
      firstName: tokens[0],
      lastName: tokens.slice(1).join(' ')
    };
  }

  // 4+ words default (e.g. "Ana María Delgado Chacón" -> firstName: "Ana María", lastName: "Delgado Chacón")
  return {
    firstName: tokens.slice(0, tokens.length - 2).join(' '),
    lastName: tokens.slice(tokens.length - 2).join(' ')
  };
}

interface OpenAlexAuthorship {
  author?: {
    display_name?: string;
  };
}

interface OpenAlexWorkItem {
  title?: string;
  display_name?: string;
  authorships?: OpenAlexAuthorship[];
  publication_year?: number;
  type?: string;
  primary_location?: {
    source?: { display_name?: string };
    landing_page_url?: string;
  };
  biblio?: {
    volume?: string;
    issue?: string;
    first_page?: string;
    last_page?: string;
  };
  doi?: string;
  abstract_inverted_index?: Record<string, number[]>;
  cited_by_count?: number;
}

function parseOpenAlexWork(item: OpenAlexWorkItem): AcademicSearchResult {
  const authors: Author[] = (item.authorships || []).map((a) => {
    return parseDisplayName(a.author?.display_name || '');
  });

  let abstract = '';
  if (item.abstract_inverted_index) {
    const wordPositions: [string, number][] = [];
    Object.entries(item.abstract_inverted_index).forEach(([word, positions]) => {
      (positions || []).forEach((pos) => wordPositions.push([word, pos]));
    });
    wordPositions.sort((a, b) => a[1] - b[1]);
    abstract = wordPositions.map((w) => w[0]).join(' ');
  }

  const cleanDoi = item.doi ? item.doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, '') : undefined;

  return {
    title: item.title || item.display_name || 'Sin título',
    authors,
    year: item.publication_year || 0,
    type: item.type === 'book' ? 'BOOK' : 'JOURNAL_ARTICLE',
    publication: item.primary_location?.source?.display_name || '',
    volume: item.biblio?.volume,
    issue: item.biblio?.issue,
    pages:
      item.biblio?.first_page && item.biblio?.last_page
        ? `${item.biblio.first_page}-${item.biblio.last_page}`
        : item.biblio?.first_page,
    doi: cleanDoi,
    url: item.doi || item.primary_location?.landing_page_url,
    abstract: abstract.slice(0, 1000),
    citationCount: item.cited_by_count,
    provider: 'OPENALEX'
  };
}

interface CrossrefApiItem {
  title?: string[];
  author?: Array<{ given?: string; family?: string; name?: string }>;
  published?: { 'date-parts'?: number[][] };
  'published-print'?: { 'date-parts'?: number[][] };
  'published-online'?: { 'date-parts'?: number[][] };
  type?: string;
  'container-title'?: string[];
  publisher?: string;
  volume?: string;
  issue?: string;
  page?: string;
  DOI?: string;
  URL?: string;
  abstract?: string;
  'is-referenced-by-count'?: number;
}

/**
 * Resolves a DOI or academic URL with multi-layer fallback:
 * 1. OpenAlex DOI endpoint (CORS-friendly, highly available)
 * 2. Crossref Works API
 * 3. DOI.org Content Negotiation
 * 4. Fallback search on OpenAlex ONLY if input was NOT a valid DOI
 */
export async function resolveDOI(doiInput: string): Promise<AcademicSearchResult | null> {
  const trimmed = doiInput.trim();
  if (!trimmed) return null;

  const validDoi = extractDOI(trimmed);

  // If a valid DOI is detected (e.g. "10.1016/..." or "https://doi.org/10.1016/..."):
  if (validDoi) {
    // Strategy 1: OpenAlex by DOI (No CORS restrictions, resilient)
    try {
      const openAlexUrl = `https://api.openalex.org/works/https://doi.org/${encodeURIComponent(validDoi)}?mailto=academic-user@app.local`;
      const oaRes = await fetch(openAlexUrl, { signal: AbortSignal.timeout(5000) });
      if (oaRes.ok) {
        const oaItem = await oaRes.json();
        return parseOpenAlexWork(oaItem);
      }
    } catch {
      // Continue to next strategy
    }

    // Strategy 2: Crossref Works API
    try {
      const url = `https://api.crossref.org/works/${encodeURIComponent(validDoi)}`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'AlfajorcitoOS/1.0 (mailto:academic-user@app.local)'
        },
        signal: AbortSignal.timeout(5000)
      });

      if (res.ok) {
        const data = await res.json();
        const item: CrossrefApiItem = data.message;

        const authors: Author[] = (item.author || []).map((a) => {
          if (a.given || a.family) {
            return {
              firstName: a.given || '',
              lastName: a.family || ''
            };
          }
          return parseDisplayName(a.name || '');
        });

        const year =
          item.published?.['date-parts']?.[0]?.[0] ||
          item['published-print']?.['date-parts']?.[0]?.[0] ||
          item['published-online']?.['date-parts']?.[0]?.[0] ||
          0;

        return {
          title: item.title?.[0] || 'Sin título',
          authors,
          year,
          type: item.type === 'book' ? 'BOOK' : 'JOURNAL_ARTICLE',
          publication: item['container-title']?.[0] || item.publisher || '',
          volume: item.volume,
          issue: item.issue,
          pages: item.page,
          doi: item.DOI || validDoi,
          url: item.URL || `https://doi.org/${validDoi}`,
          abstract: item.abstract ? item.abstract.replace(/<[^>]*>/g, '') : '',
          citationCount: item['is-referenced-by-count'],
          provider: 'CROSSREF'
        };
      }
    } catch {
      // Continue to next strategy
    }

    // Strategy 3: DOI.org Content Negotiation
    try {
      const doiRes = await fetch(`https://doi.org/${encodeURIComponent(validDoi)}`, {
        headers: {
          'Accept': 'application/vnd.citationstyles.csl+json'
        },
        signal: AbortSignal.timeout(5000)
      });
      if (doiRes.ok) {
        const csl = await doiRes.json();
        return {
          title: csl.title || 'Sin título',
          authors: (csl.author || []).map((a: { given?: string; family?: string; literal?: string }) => {
            if (a.given || a.family) {
              return {
                firstName: a.given || '',
                lastName: a.family || ''
              };
            }
            return parseDisplayName(a.literal || '');
          }),
          year: csl.issued?.['date-parts']?.[0]?.[0] || 0,
          type: csl.type === 'book' ? 'BOOK' : 'JOURNAL_ARTICLE',
          publication: csl['container-title'] || csl.publisher || '',
          volume: csl.volume ? String(csl.volume) : undefined,
          issue: csl.issue ? String(csl.issue) : undefined,
          pages: csl.page ? String(csl.page) : undefined,
          doi: validDoi,
          url: `https://doi.org/${validDoi}`,
          abstract: csl.abstract || '',
          provider: 'DOI_ORG'
        };
      }
    } catch {
      // Fallback
    }

    // If valid DOI had 3 failed strategies, do NOT return a random search result from OpenAlex
    return null;
  }

  // Strategy 4: If input is a URL or search identifier without DOI, search OpenAlex
  try {
    const results = await searchOpenAlex(trimmed, 1);
    if (results.length > 0) {
      return results[0];
    }
  } catch {
    // Graceful return
  }

  return null;
}

// 2. Search OpenAlex API (250M+ open scientific works)
export async function searchOpenAlex(query: string, limit = 8): Promise<AcademicSearchResult[]> {
  if (!query || query.trim().length < 2) return [];

  try {
    const url = `https://api.openalex.org/works?search=${encodeURIComponent(query)}&per-page=${limit}&mailto=academic-user@app.local`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return [];
    const data = await res.json();

    return (data.results || []).map(parseOpenAlexWork);
  } catch (err) {
    console.error('Error searching OpenAlex:', err);
    return [];
  }
}

interface SemanticScholarPaper {
  title?: string;
  authors?: Array<{ name?: string }>;
  year?: number;
  venue?: string;
  externalIds?: { DOI?: string };
  url?: string;
  abstract?: string;
  citationCount?: number;
}

// 3. Search Semantic Scholar API
export async function searchSemanticScholar(query: string, limit = 8): Promise<AcademicSearchResult[]> {
  if (!query || query.trim().length < 2) return [];

  try {
    const fields = 'title,authors,year,abstract,venue,citationCount,externalIds,url';
    const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&limit=${limit}&fields=${fields}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) {
      return await searchOpenAlex(query, limit);
    }
    const data = await res.json();

    return (data.data || []).map((item: SemanticScholarPaper) => {
      const authors: Author[] = (item.authors || []).map((a) => parseDisplayName(a.name || ''));

      return {
        title: item.title || 'Sin título',
        authors,
        year: item.year || 0,
        type: 'JOURNAL_ARTICLE' as SourceType,
        publication: item.venue || '',
        doi: item.externalIds?.DOI,
        url: item.url || (item.externalIds?.DOI ? `https://doi.org/${item.externalIds.DOI}` : undefined),
        abstract: item.abstract || '',
        citationCount: item.citationCount,
        provider: 'SEMANTIC_SCHOLAR' as const
      };
    });
  } catch {
    try {
      return await searchOpenAlex(query, limit);
    } catch {
      return [];
    }
  }
}

interface DoajApiBibjson {
  title?: string;
  author?: Array<{ name?: string }>;
  year?: string | number;
  identifier?: Array<{ type?: string; id?: string }>;
  link?: Array<{ type?: string; url?: string }>;
  journal?: { title?: string; publisher?: string; volume?: string; number?: string };
  start_page?: string;
  end_page?: string;
  abstract?: string;
}

interface DoajApiResult {
  bibjson?: DoajApiBibjson;
}

// 4. Search DOAJ API (Directory of Open Access Journals - Massive Spanish / Ibero-America coverage)
export async function searchDOAJ(query: string, limit = 8): Promise<AcademicSearchResult[]> {
  if (!query || query.trim().length < 2) return [];

  try {
    const url = `https://doaj.org/api/search/articles/${encodeURIComponent(query)}?pageSize=${limit}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return [];
    const data = await res.json();

    return (data.results || []).map((item: DoajApiResult) => {
      const bib = item.bibjson || {};
      const authors: Author[] = (bib.author || []).map((a) => parseDisplayName(a.name || ''));

      const doiObj = (bib.identifier || []).find(
        (id: { type?: string; id?: string }) => id.type?.toLowerCase() === 'doi'
      );
      const doi = doiObj ? doiObj.id : undefined;
      const fullTextLink =
        (bib.link || []).find((l: { type?: string; url?: string }) => l.type === 'fulltext')?.url ||
        (bib.link || [])[0]?.url;

      return {
        title: bib.title || 'Sin título',
        authors,
        year: bib.year ? Number(bib.year) : 0,
        type: 'JOURNAL_ARTICLE' as SourceType,
        publication: bib.journal?.title || bib.journal?.publisher || 'Revista Indexada DOAJ',
        volume: bib.journal?.volume,
        issue: bib.journal?.number,
        pages:
          bib.start_page && bib.end_page ? `${bib.start_page}-${bib.end_page}` : bib.start_page,
        doi,
        url: doi ? `https://doi.org/${doi}` : fullTextLink,
        abstract: bib.abstract ? bib.abstract.slice(0, 1000) : '',
        citationCount: undefined,
        provider: 'DOAJ' as const
      };
    });
  } catch (err) {
    console.error('Error searching DOAJ:', err);
    return [];
  }
}

// 5. Search Crossref Works API (Global DOI registry, thesis, and peer-reviewed papers)
export async function searchCrossref(query: string, limit = 8): Promise<AcademicSearchResult[]> {
  if (!query || query.trim().length < 2) return [];

  try {
    const url = `https://api.crossref.org/works?query=${encodeURIComponent(query)}&rows=${limit}&mailto=academic-user@app.local`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'AlfajorcitoOS/1.0 (mailto:academic-user@app.local)'
      },
      signal: AbortSignal.timeout(8000)
    });
    if (!res.ok) return [];
    const data = await res.json();

    return (data.message?.items || []).map((item: CrossrefApiItem) => {
      const authors: Author[] = (item.author || []).map((a) => {
        if (a.given || a.family) {
          return {
            firstName: a.given || '',
            lastName: a.family || ''
          };
        }
        return parseDisplayName(a.name || '');
      });

      const year =
        item.published?.['date-parts']?.[0]?.[0] ||
        item['published-print']?.['date-parts']?.[0]?.[0] ||
        item['published-online']?.['date-parts']?.[0]?.[0] ||
        0;

      return {
        title: item.title?.[0] || 'Sin título',
        authors,
        year,
        type: item.type === 'book' ? 'BOOK' : 'JOURNAL_ARTICLE',
        publication: item['container-title']?.[0] || item.publisher || 'Registro Crossref',
        volume: item.volume,
        issue: item.issue,
        pages: item.page,
        doi: item.DOI,
        url: item.URL || (item.DOI ? `https://doi.org/${item.DOI}` : undefined),
        abstract: item.abstract ? item.abstract.replace(/<[^>]*>/g, '').slice(0, 1000) : '',
        citationCount: item['is-referenced-by-count'],
        provider: 'CROSSREF' as const
      };
    });
  } catch (err) {
    console.error('Error searching Crossref:', err);
    return [];
  }
}
