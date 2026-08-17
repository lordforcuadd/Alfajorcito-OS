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
  Copy
} from 'lucide-react';
import { db } from '../../db';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input, TextArea } from '../../components/common/Input';
import { Badge, VerificationBadge, CitationStyleBadge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { useToast } from '../../components/common/Toast';
import { resolveDOI, searchOpenAlex, searchSemanticScholar, type AcademicSearchResult } from '../../services/academicApis';
import { auditSourceMetadata } from '../../utils/antiHallucination';
import { formatFullReference } from '../../utils/citationEngine';
import type { Source, VerificationStatus, Idea, Paraphrase, Work, Author } from '../../types';

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

    await db.sources.add(newSource);
    showToast('Fuente guardada', 'Guardada en tu biblioteca de libros y papers.', 'success');
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
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#2B2D42]">
            Biblioteca de Fuentes & Buscador Científico
          </h2>
          <p className="text-xs sm:text-sm text-[#5A6275] mt-0.5">
            Busca libros y artículos científicos reales, guarda citas y redacta con tus propias palabras.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => onOpenQuickCapture('source')}
            variant="primary"
            size="md"
            icon={<Plus className="w-4 h-4 stroke-[2.5]" />}
            className="w-full sm:w-auto"
          >
            Registrar Fuente
          </Button>
        </div>
      </div>

      {/* Main Mode Tabs */}
      <div className="flex items-center gap-2 border-b border-[#EBE5DF] pb-2">
        <button
          onClick={() => setActiveTab('library')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer select-none ${
            activeTab === 'library'
              ? 'bg-[#E8A598] text-[#2B2D42] shadow-2xs'
              : 'text-[#5A6275] hover:bg-[#F5F1EB]'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Mis Fuentes ({sources.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('search')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer select-none ${
            activeTab === 'search'
              ? 'bg-[#E8A598] text-[#2B2D42] shadow-2xs'
              : 'text-[#5A6275] hover:bg-[#F5F1EB]'
          }`}
        >
          <Search className="w-4 h-4" />
          <span>Búsqueda en Revistas Científicas</span>
        </button>
      </div>

      {/* 1. SEARCH TAB */}
      {activeTab === 'search' && (
        <div className="space-y-4">
          <Card variant="elevated" className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs font-bold text-[#5A6275] uppercase tracking-wider">
                Buscador
              </span>
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-touch touch-pan-x flex-nowrap">
                {(['OPENALEX', 'SEMANTIC_SCHOLAR', 'DOI'] as const).map((eng) => (
                  <button
                    key={eng}
                    onClick={() => setSearchEngine(eng)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 select-none ${
                      searchEngine === eng
                        ? 'bg-[#2B2D42] text-white shadow-2xs'
                        : 'bg-[#F5F1EB] text-[#5A6275] hover:bg-[#EBE5DF]'
                    }`}
                  >
                    {eng === 'OPENALEX' ? 'OpenAlex' : eng === 'SEMANTIC_SCHOLAR' ? 'Semantic Scholar' : 'Buscar por DOI'}
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
                className="w-full sm:w-auto"
              >
                Buscar
              </Button>
            </div>
          </Card>

          {/* Search Results List */}
          <div className="space-y-3">
            {searchResults.length === 0 && !isSearching ? (
              <Card variant="subtle" className="text-center py-10">
                <p className="text-sm text-[#8D99AE]">
                  Escribe un tema de psicología o pega un DOI para buscar artículos verificados.
                </p>
              </Card>
            ) : (
              searchResults.map((item, idx) => {
                const isAlreadyImported = sources.some(
                  (s) => (s.doi && s.doi === item.doi) || s.title.toLowerCase() === item.title.toLowerCase()
                );

                return (
                  <Card key={idx} variant="elevated" className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-[#8C3A32] bg-[#FDF2F0] px-2 py-0.5 rounded-lg border border-[#E8A598]/40">
                            {item.year || 'Año s/n'}
                          </span>
                          <span className="text-xs text-[#5A6275] font-medium">
                            {item.publication || 'Revista científica'}
                          </span>
                        </div>

                        <h4 className="font-extrabold text-sm sm:text-base text-[#2B2D42] leading-snug">
                          {item.title}
                        </h4>

                        <p className="text-xs text-[#5A6275]">
                          {item.authors.map((a: Author) => `${a.lastName || ''}, ${a.firstName || ''}`).join('; ')}
                        </p>

                        {item.abstract && (
                          <p className="text-xs text-[#5A6275] line-clamp-2 italic pt-1 leading-relaxed">
                            "{item.abstract}"
                          </p>
                        )}
                      </div>

                      <div className="shrink-0 flex sm:flex-col items-end gap-2">
                        {isAlreadyImported ? (
                          <span className="text-xs text-emerald-800 font-bold bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-300 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> En tu Biblioteca
                          </span>
                        ) : (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleImportResult(item)}
                            icon={<Plus className="w-3.5 h-3.5" />}
                            className="w-full sm:w-auto"
                          >
                            Guardar en Biblioteca
                          </Button>
                        )}

                        {item.url && (
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-[#8D99AE] hover:text-[#2B2D42] flex items-center gap-1 transition-colors"
                          >
                            <span>Ver artículo</span>
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
                placeholder="Buscar por título, autor, revista, DOI o año en tu biblioteca..."
                value={librarySearchQuery}
                onChange={(e) => setLibrarySearchQuery(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 bg-white rounded-xl border border-[#EBE5DF] text-xs sm:text-sm text-[#2B2D42] placeholder-[#8D99AE] focus:outline-none focus:ring-2 focus:ring-[#E8A598]"
              />
            </div>
            <div>
              <select
                value={libraryWorkFilter}
                onChange={(e) => setLibraryWorkFilter(e.target.value)}
                className="w-full px-3 py-2 bg-white rounded-xl border border-[#EBE5DF] text-xs sm:text-sm text-[#2B2D42] focus:outline-none focus:ring-2 focus:ring-[#E8A598] cursor-pointer"
              >
                <option value="ALL">Todos los Proyectos / Tesis</option>
                {works.map((w) => {
                  const c = coursesMap.get(w.courseId);
                  return (
                    <option key={w.id} value={w.id}>
                      {w.title} {c ? `(${c.code || c.name})` : ''}
                    </option>
                  );
                })}
              </select>
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
              { id: 'UNVERIFIED', label: `Por Verificar (${sources.filter((s) => s.verificationStatus === 'UNVERIFIED').length})` }
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setVerificationFilter(f.id as VerificationStatus | 'ALL')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer select-none shrink-0 ${
                  verificationFilter === f.id
                    ? 'bg-[#E8A598] text-[#2B2D42] shadow-2xs'
                    : 'bg-[#F5F1EB] text-[#5A6275] hover:bg-[#EBE5DF]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Sources Grid */}
          {filteredSources.length === 0 ? (
            <Card variant="subtle" className="text-center py-12">
              <p className="text-sm text-[#8D99AE]">No hay fuentes en esta categoría.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredSources.map((source) => {
                const sourceIdeas = ideas.filter((i) => i.sourceId === source.id);
                const isSeminal = source.historicalContextApproved;

                return (
                  <Card
                    key={source.id}
                    variant="interactive"
                    onClick={() => setInspectedSource(source)}
                    className="space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
                        <span className="text-xs font-bold text-[#8C3A32] bg-[#FDF2F0] px-2 py-0.5 rounded-lg border border-[#E8A598]/40">
                          {source.year}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {isSeminal && <Badge variant="amber" size="sm">Libro Clásico</Badge>}
                          <VerificationBadge status={source.verificationStatus} />
                        </div>
                      </div>

                      <h4 className="font-extrabold text-sm sm:text-base text-[#2B2D42] leading-snug">
                        {source.title}
                      </h4>

                      <p className="text-xs text-[#5A6275] line-clamp-1">
                        {source.authors?.map((a) => `${a.lastName}, ${a.firstName}`).join('; ') || 'Autor por registrar'}
                      </p>

                      <p className="text-[11px] text-[#8D99AE] italic truncate">
                        {source.publication || 'Revista o Editorial'}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-[#EBE5DF] flex items-center justify-between text-xs text-[#5A6275]">
                      <span className="flex items-center gap-1 font-medium">
                        <Quote className="w-3.5 h-3.5 text-[#D98880]" />
                        <span>{sourceIdeas.length} citas extraídas</span>
                      </span>
                      <span className="text-[11px] font-bold text-[#8C3A32]">
                        Ver Detalles →
                      </span>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 3. SOURCE METADATA & EXTRACTION MODAL */}
      {inspectedSource && (
        <Modal
          isOpen={!!inspectedSource}
          onClose={() => setInspectedSource(null)}
          title="Detalles de la Fuente y Citas"
          subtitle={inspectedSource.title}
          maxWidth="xl"
        >
          <div className="space-y-4">
            {/* APA 7 Canonical Reference */}
            <div className="p-4 rounded-2xl bg-[#FDF2F0] border border-[#E8A598]/60 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C3A32] flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-[#D98880]" />
                  <span>Referencia en Normas APA 7</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const ref = formatFullReference(inspectedSource, 'APA_7');
                    navigator.clipboard.writeText(ref);
                    showToast('Referencia copiada', 'Copiada al portapapeles en formato APA 7.', 'success');
                  }}
                  className="px-3 py-1 rounded-xl bg-white hover:bg-[#F5F1EB] border border-[#E8A598]/60 text-[11px] font-bold text-[#8C3A32] flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs shrink-0"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar Referencia</span>
                </button>
              </div>
              <p className="text-xs text-[#2B2D42] font-serif leading-relaxed pl-1 border-l-2 border-[#D98880]/60">
                {formatFullReference(inspectedSource, 'APA_7')}
              </p>
            </div>

            {/* Symmetrical 2x2 Metadata Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* Authors */}
              <div className="p-3.5 rounded-2xl bg-white border border-[#EBE5DF] flex items-start gap-3 shadow-2xs">
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
              <div className="p-3.5 rounded-2xl bg-white border border-[#EBE5DF] flex items-start gap-3 shadow-2xs">
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
              <div className="p-3.5 rounded-2xl bg-white border border-[#EBE5DF] flex items-start gap-3 shadow-2xs">
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

              {/* Verification & Anti-Plagiarism */}
              <div className="p-3.5 rounded-2xl bg-white border border-[#EBE5DF] flex items-start gap-3 shadow-2xs">
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

            {/* Symmetrical Linked Works / Thesis Cards */}
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
                  No tienes proyectos de trabajo creados aún.
                </p>
              ) : (
                <div className="space-y-2">
                  {works.map((w) => {
                    const isLinked = (inspectedSource.workIds || []).includes(w.id);
                    const course = coursesMap.get(w.courseId);
                    return (
                      <div
                        key={w.id}
                        onClick={async () => {
                          const currentIds = inspectedSource.workIds || [];
                          const updatedIds = isLinked
                            ? currentIds.filter((id) => id !== w.id)
                            : [...currentIds, w.id];

                          await db.sources.update(inspectedSource.id, {
                            workIds: updatedIds,
                            updatedAt: Date.now()
                          });
                          setInspectedSource({
                            ...inspectedSource,
                            workIds: updatedIds
                          });
                          showToast(
                            isLinked ? 'Desvinculado' : 'Vinculado',
                            isLinked
                              ? `Fuente removida de "${w.title}".`
                              : `Fuente vinculada a "${w.title}".`,
                            'success'
                          );
                        }}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isLinked
                            ? 'bg-[#FDF2F0] border-[#E8A598] shadow-2xs'
                            : 'bg-white border-[#EBE5DF] hover:border-[#CBD5E1] hover:bg-white/90'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div
                            className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border transition-colors ${
                              isLinked
                                ? 'bg-[#D98880] border-[#D98880] text-white'
                                : 'border-[#CBD5E1] bg-white'
                            }`}
                          >
                            {isLinked && <CheckCircle2 className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                          <div className="min-w-0 flex-1 text-left">
                            <p className={`text-xs font-bold truncate ${isLinked ? 'text-[#8C3A32]' : 'text-[#2B2D42]'}`}>
                              {w.title}
                            </p>
                            {course && (
                              <p className="text-[10px] text-[#5A6275] truncate mt-0.5">
                                {course.name}
                              </p>
                            )}
                          </div>
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

            {/* Symmetrical Extract New Idea & Paraphrase Section */}
            <div className="p-4 rounded-2xl bg-white border border-[#EBE5DF] space-y-3.5 shadow-2xs">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-[#FFF8E1] text-[#FFA000] flex items-center justify-center">
                  <Quote className="w-3.5 h-3.5" />
                </div>
                <h5 className="font-bold text-xs text-[#2B2D42] uppercase tracking-wider">
                  Guardar Cita Textual & Paráfrasis Propia
                </h5>
              </div>

              <TextArea
                label="Texto Original del Libro o Paper (Cita Textual)"
                placeholder="Pega aquí el fragmento del autor que quieres citar..."
                rows={2}
                value={newQuote}
                onChange={(e) => setNewQuote(e.target.value)}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Página del Libro / Paper"
                  placeholder="e.g. p. 45 o p. 855"
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
                label="Tu Explicación (Con tus propias palabras para evitar plagio)"
                placeholder="Explica la idea con tus propias palabras..."
                rows={2}
                value={newParaphraseText}
                onChange={(e) => setNewParaphraseText(e.target.value)}
              />

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

                    await db.ideas.add({
                      id: ideaId,
                      sourceId: inspectedSource.id,
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
                      ownInterpretation: newCoreIdea.trim(),
                      finalParaphrase: newParaphraseText.trim(),
                      fidelityReviewStatus: 'CONFIRMED_FAITHFUL',
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
