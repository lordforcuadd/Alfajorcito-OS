import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  BookOpen,
  Search,
  Plus,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Filter,
  FileText,
  Quote,
  Sparkles,
  Layers,
  Calendar,
  User,
  GraduationCap,
  Copy,
  Check,
  BookMarked,
  ChevronRight
} from 'lucide-react';
import { db } from '../../db';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input, TextArea, Select } from '../../components/common/Input';
import { Badge, VerificationBadge, CitationStyleBadge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { useToast } from '../../components/common/Toast';
import { resolveDOI, searchOpenAlex, searchSemanticScholar, type AcademicSearchResult } from '../../services/academicApis';
import { auditSourceMetadata } from '../../utils/antiHallucination';
import { validateSourceAge } from '../../utils/sourceAgeValidator';
import {
  formatFullReference,
  formatFullReferenceHTML,
  formatInTextParenthetical,
  formatInTextNarrative,
  copyRichReference,
  generateBibTeX
} from '../../utils/citationEngine';
import type { Source, VerificationStatus, Idea, Paraphrase, Work, Author, CitationStyle, SourceType } from '../../types';

const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  JOURNAL_ARTICLE: 'Artículo Científico',
  BOOK: 'Libro Completo',
  BOOK_CHAPTER: 'Capítulo de Libro',
  CONFERENCE_PAPER: 'Ponencia / Congreso',
  THESIS: 'Tesis de Grado',
  REPORT: 'Informe Técnico',
  WEBPAGE: 'Sitio Web / Enlace',
  OTHER: 'Fuente Académica'
};

export interface ResearchViewProps {
  onOpenQuickCapture: (tab?: 'note' | 'work' | 'course' | 'source' | 'inquiry' | 'task') => void;
  selectedSourceId?: string | null;
  onSelectSource?: (sourceId: string | null) => void;
}

export const ResearchView: React.FC<ResearchViewProps> = ({
  onOpenQuickCapture,
  selectedSourceId,
  onSelectSource
}) => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'library' | 'search'>('library');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchEngine, setSearchEngine] = useState<'OPENALEX' | 'SEMANTIC_SCHOLAR' | 'DOI'>('OPENALEX');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<AcademicSearchResult[]>([]);
  const [verificationFilter, setVerificationFilter] = useState<'ALL' | VerificationStatus>('ALL');
  const [librarySearchQuery, setLibrarySearchQuery] = useState('');
  const [libraryWorkFilter, setLibraryWorkFilter] = useState<string>('ALL');
  const [inspectedSource, setInspectedSource] = useState<Source | null>(null);
  const [modalStyle, setModalStyle] = useState<CitationStyle>('APA_7');
  const [modalCopiedKey, setModalCopiedKey] = useState<string | null>(null);

  // New Idea & Paraphrase form state in modal
  const [newQuote, setNewQuote] = useState('');
  const [newPageLoc, setNewPageLoc] = useState('');
  const [newCoreIdea, setNewCoreIdea] = useState('');
  const [newParaphraseText, setNewParaphraseText] = useState('');

  // Live queries
  const sources = useLiveQuery(() => db.sources.toArray()) || [];
  const works = useLiveQuery(() => db.works.toArray()) || [];
  const courses = useLiveQuery(() => db.courses.toArray()) || [];
  const ideas = useLiveQuery(() => db.ideas.toArray()) || [];

  const worksMap = React.useMemo(() => new Map(works.map((w) => [w.id, w])), [works]);
  const coursesMap = React.useMemo(() => new Map(courses.map((c) => [c.id, c])), [courses]);

  const sourceRefNum = React.useMemo(() => {
    if (!inspectedSource) return 1;
    const primaryWorkId = inspectedSource.workIds?.[0];
    if (primaryWorkId) {
      const workSources = sources.filter((s) => (s.workIds || []).includes(primaryWorkId));
      const idx = workSources.findIndex((s) => s.id === inspectedSource.id);
      return idx !== -1 ? idx + 1 : 1;
    }
    const globalIdx = sources.findIndex((s) => s.id === inspectedSource.id);
    return globalIdx !== -1 ? globalIdx + 1 : 1;
  }, [inspectedSource, sources]);

  // Execute Academic Search
  const handleExecuteSearch = async () => {
    if (!searchQuery.trim()) {
      showToast('Término requerido', 'Ingresa una palabra clave, autor o DOI para buscar.', 'warning');
      return;
    }
    setIsSearching(true);
    try {
      if (searchEngine === 'DOI') {
        const res = await resolveDOI(searchQuery.trim());
        setSearchResults(res ? [res] : []);
        if (res) {
          showToast('Artículo encontrado', 'Datos obtenidos de Crossref / DOI.org', 'success');
        } else {
          showToast('No encontrado', 'Revisa que el DOI esté bien escrito (e.g. 10.1016/...)', 'warning');
        }
      } else if (searchEngine === 'OPENALEX') {
        const res = await searchOpenAlex(searchQuery.trim(), 10);
        setSearchResults(res);
        showToast('Búsqueda lista', `Encontramos ${res.length} artículos en OpenAlex.`, 'success');
      } else {
        const res = await searchSemanticScholar(searchQuery.trim(), 10);
        setSearchResults(res);
        showToast('Búsqueda lista', `Encontramos ${res.length} artículos en Semantic Scholar.`, 'success');
      }
    } catch {
      showToast('Error de conexión', 'No se pudo conectar con el buscador académico.', 'error');
    } finally {
      setIsSearching(false);
    }
  };

  // Import Source from Search Result
  const handleImportResult = async (item: AcademicSearchResult) => {
    const audit = auditSourceMetadata(item);
    const newSource: Source = {
      id: `src-${Math.random().toString(36).substring(2, 9)}`,
      workIds: [],
      title: item.title,
      authors: item.authors,
      year: item.year,
      type: item.type,
      publication: item.publication,
      volume: item.volume,
      issue: item.issue,
      pages: item.pages,
      doi: item.doi,
      url: item.url,
      abstract: item.abstract,
      accessedAt: Date.now(),
      verificationStatus: audit.status,
      verificationProvider: item.provider,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    try {
      await db.sources.add(newSource);
      showToast('Fuente guardada', 'Guardada en tu biblioteca de libros y papers.', 'success');
    } catch {
      showToast('Error', 'No se pudo guardar la fuente en la base de datos.', 'error');
    }
  };

  const filteredSources = sources.filter((s) => {
    if (verificationFilter !== 'ALL' && s.verificationStatus !== verificationFilter) return false;
    if (libraryWorkFilter !== 'ALL' && !(s.workIds || []).includes(libraryWorkFilter)) return false;
    if (librarySearchQuery.trim()) {
      const q = librarySearchQuery.toLowerCase().trim();
      const matchTitle = s.title.toLowerCase().includes(q);
      const matchAuthor = (s.authors || []).some(
        (a) =>
          a.lastName.toLowerCase().includes(q) ||
          (a.firstName && a.firstName.toLowerCase().includes(q))
      );
      const matchPub = s.publication ? s.publication.toLowerCase().includes(q) : false;
      const matchDoi = s.doi ? s.doi.toLowerCase().includes(q) : false;
      const matchYear = String(s.year).includes(q);
      if (!matchTitle && !matchAuthor && !matchPub && !matchDoi && !matchYear) return false;
    }
    return true;
  });

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-[#FDF2F0] via-white to-[#F3E5F5] border border-[#E8A598]/40 shadow-xs">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#8C3A32] uppercase tracking-wider bg-[#FDF2F0] px-2.5 py-0.5 rounded-lg border border-[#E8A598]/50">
            <BookOpen className="w-3.5 h-3.5 text-[#D98880]" />
            <span>Investigación & Literatura Científica</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#2B2D42] leading-tight">
            Biblioteca de Fuentes & Papers
          </h2>
          <p className="text-xs sm:text-sm text-[#5A6275]">
            Gestiona tus fuentes, verifica su vigencia y genera citas rigurosas para tus trabajos académicos.
          </p>
        </div>

        <Button
          onClick={() => onOpenQuickCapture('source')}
          variant="primary"
          size="md"
          icon={<Plus className="w-4 h-4 stroke-[2.5]" />}
          className="w-full sm:w-auto shrink-0 font-bold shadow-xs"
        >
          Registrar Fuente
        </Button>
      </div>

      {/* Mode Switcher Segmented Tabs */}
      <div className="grid grid-cols-2 p-1 bg-[#F5F1EB] rounded-2xl border border-[#EBE5DF] gap-1">
        <button
          onClick={() => setActiveTab('library')}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer select-none ${
            activeTab === 'library'
              ? 'bg-white text-[#8C3A32] shadow-xs border border-[#E8A598]/40'
              : 'text-[#5A6275] hover:text-[#2B2D42]'
          }`}
        >
          <BookOpen className="w-4 h-4 text-[#D98880]" />
          <span>Mis Fuentes ({sources.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('search')}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer select-none ${
            activeTab === 'search'
              ? 'bg-white text-[#8C3A32] shadow-xs border border-[#E8A598]/40'
              : 'text-[#5A6275] hover:text-[#2B2D42]'
          }`}
        >
          <Search className="w-4 h-4 text-[#D98880]" />
          <span className="truncate">Buscador Científico</span>
        </button>
      </div>

      {/* 1. SEARCH TAB */}
      {activeTab === 'search' && (
        <div className="space-y-4">
          <Card variant="elevated" className="space-y-4 p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <span className="text-xs font-bold text-[#8C3A32] uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#D98880]" />
                <span>Proveedor de Búsqueda Académica</span>
              </span>
              <div className="grid grid-cols-3 sm:flex items-center gap-1.5">
                {(['OPENALEX', 'SEMANTIC_SCHOLAR', 'DOI'] as const).map((eng) => (
                  <button
                    key={eng}
                    onClick={() => setSearchEngine(eng)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer text-center select-none ${
                      searchEngine === eng
                        ? 'bg-[#2B2D42] text-white shadow-2xs'
                        : 'bg-[#F5F1EB] text-[#5A6275] hover:bg-[#EBE5DF]'
                    }`}
                  >
                    {eng === 'OPENALEX' ? 'OpenAlex' : eng === 'SEMANTIC_SCHOLAR' ? 'Semantic' : 'DOI Directo'}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1">
                <Input
                  placeholder={
                    searchEngine === 'DOI'
                      ? 'Ingresa el código DOI (e.g. 10.18800/psico.202202.008)'
                      : 'Escribe el tema, título o autor (e.g. regulacion emocional beck)...'
                  }
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleExecuteSearch()}
                  leftIcon={<Search className="w-4 h-4" />}
                />
              </div>
              <Button
                variant="primary"
                onClick={handleExecuteSearch}
                isLoading={isSearching}
                icon={<Search className="w-4 h-4" />}
                className="w-full sm:w-auto font-bold"
              >
                Buscar Papers
              </Button>
            </div>
          </Card>

          {/* Search Results List */}
          <div className="space-y-3">
            {searchResults.length === 0 && !isSearching ? (
              <Card variant="subtle" className="text-center py-10 px-4">
                <BookOpen className="w-8 h-8 text-[#8D99AE] mx-auto mb-2 opacity-60" />
                <p className="text-sm font-semibold text-[#5A6275]">
                  Escribe un tema de psicología o pega un DOI para buscar artículos verificados.
                </p>
                <p className="text-xs text-[#8D99AE] mt-0.5">
                  Conexión directa con bases indexadas de OpenAlex, Semantic Scholar y Crossref.
                </p>
              </Card>
            ) : (
              searchResults.map((item, idx) => {
                const isAlreadyImported = sources.some(
                  (s) => (s.doi && s.doi === item.doi) || s.title.toLowerCase() === item.title.toLowerCase()
                );

                return (
                  <Card key={idx} variant="elevated" className="p-4 sm:p-5 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-2 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-[#8C3A32] bg-[#FDF2F0] px-2.5 py-0.5 rounded-lg border border-[#E8A598]/40">
                            {item.year || 'Año s/n'}
                          </span>
                          <span className="text-xs text-[#5A6275] font-medium truncate max-w-[280px]">
                            {item.publication || 'Revista científica'}
                          </span>
                        </div>

                        <h4 className="font-extrabold text-sm sm:text-base text-[#2B2D42] leading-snug">
                          {item.title}
                        </h4>

                        <div className="flex items-center gap-1.5 text-xs text-[#5A6275]">
                          <User className="w-3.5 h-3.5 text-[#8D99AE] shrink-0" />
                          <span className="truncate">
                            {item.authors.map((a: Author) => `${a.lastName || ''}, ${a.firstName || ''}`).join('; ')}
                          </span>
                        </div>

                        {item.abstract && (
                          <p className="text-xs text-[#5A6275] line-clamp-2 italic pt-1 leading-relaxed bg-[#FAF8F5] p-2.5 rounded-xl border border-[#EBE5DF]/60">
                            "{item.abstract}"
                          </p>
                        )}
                      </div>

                      <div className="shrink-0 flex flex-col sm:items-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#EBE5DF]">
                        {isAlreadyImported ? (
                          <span className="text-xs text-emerald-800 font-bold bg-emerald-50 px-3.5 py-2 rounded-xl border border-emerald-300 flex items-center justify-center gap-1.5 w-full sm:w-auto">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> En tu Biblioteca
                          </span>
                        ) : (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleImportResult(item)}
                            icon={<Plus className="w-3.5 h-3.5 stroke-[2.5]" />}
                            className="w-full sm:w-auto font-bold"
                          >
                            Guardar en Biblioteca
                          </Button>
                        )}

                        {item.url && (
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-[#8D99AE] hover:text-[#2B2D42] flex items-center justify-center sm:justify-end gap-1 transition-colors py-1"
                          >
                            <span>Ver artículo original</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 2. LIBRARY TAB */}
      {activeTab === 'library' && (
        <div className="space-y-4">
          {/* Instant Search & Project Filter */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="sm:col-span-2 relative">
              <Search className="w-4 h-4 text-[#8D99AE] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por título, autor, revista, DOI o año..."
                value={librarySearchQuery}
                onChange={(e) => setLibrarySearchQuery(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 bg-white rounded-xl border border-[#EBE5DF] text-xs sm:text-sm text-[#2B2D42] placeholder-[#8D99AE] focus:outline-none focus:ring-2 focus:ring-[#E8A598]"
              />
            </div>
            <div>
              <Select
                value={libraryWorkFilter}
                onChange={(e) => setLibraryWorkFilter(e.target.value)}
              >
                <option value="ALL">Todos los Trabajos / Tesis</option>
                {works.map((w) => {
                  const c = coursesMap.get(w.courseId);
                  return (
                    <option key={w.id} value={w.id}>
                      {w.title} {c ? `(${c.code || c.name})` : ''}
                    </option>
                  );
                })}
              </Select>
            </div>
          </div>

          {/* Filter Pills */}
          <div
            onWheel={(e) => {
              if (e.deltaY !== 0) {
                e.currentTarget.scrollLeft += e.deltaY;
              }
            }}
            className="flex items-center gap-1.5 overflow-x-auto pb-1 tab-scroll-pc scroll-touch touch-pan-x flex-nowrap"
          >
            {[
              { id: 'ALL', label: `Todas (${sources.length})` },
              { id: 'VERIFIED', label: `Verificadas (${sources.filter((s) => s.verificationStatus === 'VERIFIED').length})` },
              { id: 'PARTIALLY_VERIFIED', label: `Parciales (${sources.filter((s) => s.verificationStatus === 'PARTIALLY_VERIFIED').length})` },
              { id: 'UNVERIFIED', label: `Sin Verificar (${sources.filter((s) => s.verificationStatus === 'UNVERIFIED').length})` }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setVerificationFilter(tab.id as VerificationStatus | 'ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer select-none shrink-0 ${
                  verificationFilter === tab.id
                    ? 'bg-[#E8A598] text-[#2B2D42] shadow-2xs'
                    : 'bg-[#F5F1EB] text-[#5A6275] hover:bg-[#EBE5DF]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Source Cards Grid */}
          {filteredSources.length === 0 ? (
            <Card variant="subtle" className="text-center py-12 px-4">
              <BookOpen className="w-8 h-8 text-[#8D99AE] mx-auto mb-2 opacity-60" />
              <p className="text-sm font-semibold text-[#5A6275]">No se encontraron fuentes con estos filtros.</p>
              <p className="text-xs text-[#8D99AE] mt-0.5">Prueba a buscar con otro término o agregar una nueva fuente.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredSources.map((source) => {
                const isSelected = selectedSourceId === source.id;
                const authorNames = (source.authors || []).map((a) => a.lastName).join(', ') || 'Autor Desconocido';
                const linkedWork = source.workIds?.[0] ? worksMap.get(source.workIds[0]) : undefined;
                const ageValidation = validateSourceAge(source, linkedWork);
                const sourceTypeName = SOURCE_TYPE_LABELS[source.type] || 'Artículo Científico';

                return (
                  <Card
                    key={source.id}
                    variant={isSelected ? 'elevated' : 'interactive'}
                    onClick={() => {
                      setInspectedSource(source);
                      if (onSelectSource) onSelectSource(source.id);
                    }}
                    className={`p-4 rounded-2xl sm:rounded-3xl space-y-3 flex flex-col justify-between transition-all cursor-pointer ${
                      isSelected ? 'ring-2 ring-[#E8A598] bg-[#FDF2F0]/20' : ''
                    }`}
                  >
                    <div className="space-y-2.5">
                      {/* Header row: Source Type + Verification */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-bold text-[#8C3A32] bg-[#FDF2F0] px-2.5 py-0.5 rounded-lg border border-[#E8A598]/40 truncate max-w-[170px]">
                          {sourceTypeName}
                        </span>
                        <VerificationBadge status={source.verificationStatus} size="sm" />
                      </div>

                      {/* Title */}
                      <h4 className="text-sm sm:text-base font-extrabold text-[#2B2D42] leading-snug line-clamp-2">
                        {source.title}
                      </h4>

                      {/* Authors & Year */}
                      <div className="flex items-center gap-1.5 text-xs text-[#5A6275]">
                        <User className="w-3.5 h-3.5 text-[#8D99AE] shrink-0" />
                        <span className="truncate font-medium">
                          {authorNames} <span className="font-bold text-[#2B2D42]">({source.year || 's.f.'})</span>
                        </span>
                      </div>

                      {/* Publication / Journal */}
                      {source.publication && (
                        <div className="flex items-center gap-1.5 text-xs text-[#8C3A32]">
                          <BookOpen className="w-3.5 h-3.5 text-[#D98880] shrink-0" />
                          <span className="truncate font-medium">{source.publication}</span>
                        </div>
                      )}

                      {/* Abstract Snippet */}
                      {source.abstract && (
                        <p className="text-xs text-[#5A6275] line-clamp-2 italic leading-relaxed pt-0.5 bg-[#FAF8F5] p-2.5 rounded-xl border border-[#EBE5DF]/60">
                          "{source.abstract}"
                        </p>
                      )}
                    </div>

                    {/* Footer with Age badge & Linked Projects */}
                    <div className="pt-2.5 border-t border-[#EBE5DF] flex items-center justify-between gap-2 text-xs">
                      {ageValidation.status !== 'COMPLIANT' ? (
                        <span className={`px-2 py-0.5 rounded-lg text-[11px] font-bold border ${ageValidation.badgeColor}`}>
                          {ageValidation.status === 'NON_COMPLIANT' ? `> ${linkedWork?.maxSourceAgeYears || 5} años` : 'Año s.f.'}
                        </span>
                      ) : (
                        <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg text-[11px] font-bold">
                          ✓ Vigente
                        </span>
                      )}

                      <div className="flex items-center gap-1 text-[11px] font-bold text-[#8C3A32] shrink-0">
                        <span>
                          {(source.workIds || []).length === 0
                            ? 'Sin vincular'
                            : (source.workIds || []).length === 1
                            ? '1 trabajo'
                            : `${(source.workIds || []).length} trabajos`}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-[#8C3A32]" />
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 3. INSPECTION MODAL (Detailed Citations, Paraphrase, & Traceability) */}
      {inspectedSource && (
        <Modal
          isOpen={!!inspectedSource}
          onClose={() => setInspectedSource(null)}
          title={inspectedSource.title}
          subtitle={`Año ${inspectedSource.year || 's.f.'} • ${(inspectedSource.authors || []).map((a) => `${a.lastName} ${a.firstName ? a.firstName.charAt(0) + '.' : ''}`).join(', ') || 'Autor'}`}
          maxWidth="2xl"
        >
          <div className="space-y-4">
            {/* Citation Style Switcher & Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-2xl bg-[#FAF8F5] border border-[#EBE5DF]">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#8C3A32]">
                <BookMarked className="w-4 h-4 text-[#D98880]" />
                <span>Formato de Cita:</span>
              </div>
              <div className="grid grid-cols-3 sm:flex items-center gap-1 bg-white border border-[#EBE5DF] p-1 rounded-xl shadow-2xs">
                {(['APA_7', 'MLA_9', 'IEEE', 'CHICAGO_AUTHOR_DATE', 'VANCOUVER'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setModalStyle(st)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer text-center select-none ${
                      modalStyle === st
                        ? 'bg-[#E8A598] text-[#2B2D42] shadow-2xs'
                        : 'text-[#5A6275] hover:bg-[#F5F1EB]'
                    }`}
                  >
                    {st === 'APA_7'
                      ? 'APA 7'
                      : st === 'MLA_9'
                      ? 'MLA 9'
                      : st === 'IEEE'
                      ? 'IEEE'
                      : st === 'CHICAGO_AUTHOR_DATE'
                      ? 'Chicago'
                      : 'Vancouver'}
                  </button>
                ))}
              </div>
            </div>

            {/* In-Text Citations Grid (Parenthetical & Narrative) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              {/* Parenthetical */}
              <div className="p-3.5 rounded-2xl bg-white border border-[#EBE5DF] flex items-center justify-between gap-3 shadow-2xs">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-bold text-[#8C3A32] uppercase">
                      Cita Parentética
                    </span>
                    <span className="text-[10px] text-[#8D99AE]">(Al final)</span>
                  </div>
                  <code className="text-xs font-mono font-bold text-[#2B2D42] block break-words [overflow-wrap:anywhere]">
                    {formatInTextParenthetical(inspectedSource, modalStyle, undefined, sourceRefNum)}
                  </code>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const cite = formatInTextParenthetical(inspectedSource, modalStyle, undefined, sourceRefNum);
                    navigator.clipboard.writeText(cite);
                    setModalCopiedKey('modal-parenthetical');
                    showToast('Cita copiada', 'Cita parentética lista para pegar.', 'success');
                    setTimeout(() => setModalCopiedKey(null), 2000);
                  }}
                  className="p-2.5 rounded-xl text-[#5A6275] hover:text-[#8C3A32] hover:bg-[#F5F1EB] transition-colors cursor-pointer shrink-0 border border-[#EBE5DF]"
                  title="Copiar cita parentética"
                  aria-label="Copiar cita parentética"
                >
                  {modalCopiedKey === 'modal-parenthetical' ? (
                    <Check className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>

              {/* Narrative */}
              <div className="p-3.5 rounded-2xl bg-white border border-[#EBE5DF] flex items-center justify-between gap-3 shadow-2xs">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-bold text-[#8C3A32] uppercase">
                      Cita Narrativa
                    </span>
                    <span className="text-[10px] text-[#8D99AE]">(En la oración)</span>
                  </div>
                  <code className="text-xs font-mono font-bold text-[#2B2D42] block break-words [overflow-wrap:anywhere]">
                    {formatInTextNarrative(inspectedSource, modalStyle, sourceRefNum)}
                  </code>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const cite = formatInTextNarrative(inspectedSource, modalStyle, sourceRefNum);
                    navigator.clipboard.writeText(cite);
                    setModalCopiedKey('modal-narrative');
                    showToast('Cita copiada', 'Cita narrativa lista para pegar.', 'success');
                    setTimeout(() => setModalCopiedKey(null), 2000);
                  }}
                  className="p-2.5 rounded-xl text-[#5A6275] hover:text-[#8C3A32] hover:bg-[#F5F1EB] transition-colors cursor-pointer shrink-0 border border-[#EBE5DF]"
                  title="Copiar cita narrativa"
                  aria-label="Copiar cita narrativa"
                >
                  {modalCopiedKey === 'modal-narrative' ? (
                    <Check className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Canonical Reference with French Indentation */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-[#FDF2F0] to-white border border-[#E8A598]/60 space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C3A32] flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-[#D98880]" />
                  <span>Referencia Bibliográfica Final</span>
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const bib = generateBibTeX(inspectedSource);
                      navigator.clipboard.writeText(bib);
                      setModalCopiedKey('modal-bibtex');
                      showToast('BibTeX copiado', 'Entrada BibTeX lista para LaTeX / Zotero.', 'success');
                      setTimeout(() => setModalCopiedKey(null), 2000);
                    }}
                    className="px-2.5 py-1 rounded-xl bg-white hover:bg-[#F5F1EB] border border-[#EBE5DF] text-[11px] font-bold text-[#5A6275] flex items-center gap-1 transition-all cursor-pointer shadow-2xs shrink-0"
                    title="Copiar BibTeX"
                    aria-label="Copiar BibTeX"
                  >
                    {modalCopiedKey === 'modal-bibtex' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>BibTeX</span>
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      const ref = formatFullReference(inspectedSource, modalStyle);
                      const refHtml = `<p style="padding-left:1.5rem;text-indent:-1.5rem;">${formatFullReferenceHTML(inspectedSource, modalStyle)}</p>`;
                      await copyRichReference(ref, refHtml);
                      setModalCopiedKey('modal-ref');
                      showToast('Referencia copiada', `Copiada en formato ${modalStyle} con cursivas.`, 'success');
                      setTimeout(() => setModalCopiedKey(null), 2000);
                    }}
                    className="px-3 py-1 rounded-xl bg-white hover:bg-[#F5F1EB] border border-[#E8A598]/60 text-[11px] font-bold text-[#8C3A32] flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs shrink-0"
                    title="Copiar referencia con cursiva"
                    aria-label="Copiar referencia"
                  >
                    {modalCopiedKey === 'modal-ref' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>¡Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar Referencia</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
              <p
                className="text-xs text-[#2B2D42] font-serif leading-relaxed break-words [overflow-wrap:anywhere]"
                style={{ paddingLeft: '1.5rem', textIndent: '-1.5rem' }}
              >
                {formatFullReference(inspectedSource, modalStyle)}
              </p>
            </div>

            {/* Symmetrical 2x2 Metadata Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              {/* Authors */}
              <div className="p-3 rounded-2xl bg-white border border-[#EBE5DF] flex items-start gap-3 shadow-2xs">
                <div className="w-8 h-8 rounded-xl bg-[#FDF2F0] text-[#D98880] flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-bold text-[#8D99AE] uppercase tracking-wider block">Autores</span>
                  <p className="font-semibold text-[#2B2D42] text-xs leading-snug break-words mt-0.5">
                    {inspectedSource.authors?.length
                      ? inspectedSource.authors.map((a) => `${a.lastName}${a.firstName ? `, ${a.firstName.charAt(0)}.` : ''}`).join('; ')
                      : 'Por registrar'}
                  </p>
                </div>
              </div>

              {/* Year & Journal */}
              <div className="p-3 rounded-2xl bg-white border border-[#EBE5DF] flex items-start gap-3 shadow-2xs">
                <div className="w-8 h-8 rounded-xl bg-[#FFF8E1] text-[#FFA000] flex items-center justify-center shrink-0 mt-0.5">
                  <Calendar className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-bold text-[#8D99AE] uppercase tracking-wider block">Año & Revista</span>
                  <p className="font-semibold text-[#2B2D42] text-xs leading-snug break-words mt-0.5">
                    <span className="font-bold text-[#D98880]">{inspectedSource.year || 's/f'}</span> • {inspectedSource.publication || 'Revista o Editorial'}
                  </p>
                </div>
              </div>

              {/* DOI / Access Link */}
              <div className="p-3 rounded-2xl bg-white border border-[#EBE5DF] flex items-start gap-3 shadow-2xs">
                <div className="w-8 h-8 rounded-xl bg-[#E0F2F1] text-[#00897B] flex items-center justify-center shrink-0 mt-0.5">
                  <ExternalLink className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-bold text-[#8D99AE] uppercase tracking-wider block">Código DOI / Acceso</span>
                  {inspectedSource.doi ? (
                    <a
                      href={inspectedSource.doi.startsWith('http') ? inspectedSource.doi : `https://doi.org/${inspectedSource.doi}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-[#00897B] hover:underline break-all block leading-snug mt-0.5"
                    >
                      {inspectedSource.doi}
                    </a>
                  ) : inspectedSource.url ? (
                    <a
                      href={inspectedSource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-[#00897B] hover:underline break-all block leading-snug mt-0.5"
                    >
                      Ver enlace del paper
                    </a>
                  ) : (
                    <span className="text-xs text-[#8D99AE] italic block mt-0.5">Sin DOI registrado</span>
                  )}
                </div>
              </div>

              {/* Verification Status */}
              <div className="p-3 rounded-2xl bg-white border border-[#EBE5DF] flex items-start gap-3 shadow-2xs">
                <div className="w-8 h-8 rounded-xl bg-[#F3E5F5] text-[#8E24AA] flex items-center justify-center shrink-0 mt-0.5">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-bold text-[#8D99AE] uppercase tracking-wider block">Trazabilidad Científica</span>
                  <div className="pt-1">
                    <VerificationBadge status={inspectedSource.verificationStatus} />
                  </div>
                </div>
              </div>
            </div>

            {/* Linked Works / Thesis Cards */}
            <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#EBE5DF] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-[#FDF2F0] text-[#D98880] flex items-center justify-center">
                    <GraduationCap className="w-3.5 h-3.5" />
                  </div>
                  <h5 className="font-bold text-xs text-[#2B2D42] uppercase tracking-wider">
                    Vincular a Trabajos & Tesis
                  </h5>
                </div>
                <span className="text-[11px] font-bold text-[#8C3A32] bg-[#FDF2F0] px-2.5 py-0.5 rounded-full border border-[#E8A598]/40">
                  {(inspectedSource.workIds || []).length} vinculados
                </span>
              </div>

              {works.length === 0 ? (
                <p className="text-xs text-[#8D99AE] italic py-2">
                  No tienes trabajos activos creados aún.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {works.map((work) => {
                    const isLinked = (inspectedSource.workIds || []).includes(work.id);
                    const course = coursesMap.get(work.courseId);

                    return (
                      <div
                        key={work.id}
                        onClick={async () => {
                          const currentIds = inspectedSource.workIds || [];
                          const updatedWorkIds = isLinked
                            ? currentIds.filter((id) => id !== work.id)
                            : [...currentIds, work.id];

                          await db.sources.update(inspectedSource.id, {
                            workIds: updatedWorkIds,
                            updatedAt: Date.now()
                          });

                          setInspectedSource({
                            ...inspectedSource,
                            workIds: updatedWorkIds
                          });

                          showToast(
                            isLinked ? 'Trabajo desvinculado' : 'Trabajo vinculado',
                            `${work.title}`,
                            'info'
                          );
                        }}
                        className={`p-3 rounded-xl border flex items-center justify-between gap-2 text-xs transition-all cursor-pointer select-none min-h-[44px] ${
                          isLinked
                            ? 'bg-[#FDF2F0] border-[#E8A598] text-[#2B2D42] shadow-2xs font-semibold'
                            : 'bg-white border-[#EBE5DF] text-[#5A6275] hover:bg-[#F5F1EB]'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className={`w-4 h-4 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0 ${
                              isLinked ? 'bg-[#D98880] text-white' : 'border border-[#CBD5E1]'
                            }`}
                          >
                            {isLinked && '✓'}
                          </div>
                          <span className="truncate">{work.title}</span>
                        </div>

                        {course && (
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 ${
                              isLinked
                                ? 'bg-white text-[#8C3A32] border border-[#E8A598]/60'
                                : 'bg-[#F5F1EB] text-[#5A6275]'
                            }`}
                          >
                            {course.code || course.name.slice(0, 8)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Extract New Idea & Paraphrase Section */}
            <div className="p-4 rounded-2xl bg-white border border-[#EBE5DF] space-y-3.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-[#FFF8E1] text-[#FFA000] flex items-center justify-center">
                    <Quote className="w-3.5 h-3.5" />
                  </div>
                  <h5 className="font-bold text-xs text-[#2B2D42] uppercase tracking-wider">
                    Guardar Cita Textual & Paráfrasis Propia
                  </h5>
                </div>
                <span className="text-[10px] font-bold text-[#8D99AE] bg-[#FAF8F5] px-2 py-0.5 rounded-md">
                  Paso a Paso
                </span>
              </div>

              <TextArea
                label="1. Texto Original del Libro o Paper (Cita Textual) *"
                placeholder="Pega aquí el fragmento del autor que quieres citar..."
                rows={2}
                value={newQuote}
                onChange={(e) => setNewQuote(e.target.value)}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="2. Página del Libro / Paper"
                  placeholder="e.g. p. 45 o pp. 120-121"
                  value={newPageLoc}
                  onChange={(e) => setNewPageLoc(e.target.value)}
                />
                <Input
                  label="Idea Principal en una frase"
                  placeholder="e.g. La reevaluación cognitiva modula la ansiedad"
                  value={newCoreIdea}
                  onChange={(e) => setNewCoreIdea(e.target.value)}
                />
              </div>

              <TextArea
                label="3. Tu Explicación (Con tus propias palabras para evitar plagio) *"
                placeholder="Explica la idea con tus propias palabras tal como la usarás en tu texto..."
                rows={2}
                value={newParaphraseText}
                onChange={(e) => setNewParaphraseText(e.target.value)}
              />

              {/* Live Citation Preview */}
              {(newQuote.trim() || newPageLoc.trim()) && (
                <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#EBE5DF] text-xs space-y-1 animate-fade-in">
                  <span className="text-[10px] font-bold text-[#8C3A32] uppercase block">
                    Previsualización de la cita generada:
                  </span>
                  <div className="flex items-center gap-3 flex-wrap text-xs font-mono">
                    <span className="text-[#5A6275]">Parentética:</span>
                    <code className="text-[#8C3A32] font-bold">
                      {formatInTextParenthetical(inspectedSource, modalStyle, newPageLoc.trim() || undefined, sourceRefNum)}
                    </code>
                    <span className="text-[#5A6275]">Narrativa:</span>
                    <code className="text-[#2B2D42] font-bold">
                      {formatInTextNarrative(inspectedSource, modalStyle, sourceRefNum)}
                    </code>
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-1">
                <Button
                  variant="primary"
                  size="md"
                  className="w-full sm:w-auto font-bold"
                  onClick={async () => {
                    if (!newQuote.trim() || !newParaphraseText.trim()) {
                      showToast('Campos requeridos', 'Ingresa la cita original y tu paráfrasis.', 'warning');
                      return;
                    }

                    const now = Date.now();
                    const ideaId = `idea-${Math.random().toString(36).substring(2, 9)}`;
                    const assignedWorkId = inspectedSource.workIds?.[0] || (libraryWorkFilter !== 'ALL' ? libraryWorkFilter : undefined);

                    await db.ideas.add({
                      id: ideaId,
                      sourceId: inspectedSource.id,
                      workId: assignedWorkId,
                      rawQuote: newQuote.trim(),
                      pageOrLocation: newPageLoc.trim(),
                      extractedCoreIdea: newCoreIdea.trim() || 'Idea extraída',
                      tags: [],
                      createdAt: now,
                      updatedAt: now
                    });

                    await db.paraphrases.add({
                      id: `para-${Math.random().toString(36).substring(2, 9)}`,
                      ideaId,
                      sourceId: inspectedSource.id,
                      workId: assignedWorkId,
                      ownInterpretation: newCoreIdea.trim(),
                      finalParaphrase: newParaphraseText.trim(),
                      fidelityReviewStatus: 'PENDING_REVIEW',
                      createdAt: now,
                      updatedAt: now
                    });

                    setNewQuote('');
                    setNewPageLoc('');
                    setNewCoreIdea('');
                    setNewParaphraseText('');
                    showToast('Cita guardada', 'Idea y paráfrasis conectadas con éxito.', 'success');
                    setInspectedSource(null);
                  }}
                >
                  Guardar Cita & Paráfrasis
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
