import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  BookOpen,
  Quote,
  FileText,
  Copy,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Info,
  Search,
  BookMarked,
  Filter,
  Check
} from 'lucide-react';
import { db } from '../../db';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge, VerificationBadge } from '../../components/common/Badge';
import { useToast } from '../../components/common/Toast';
import { checkParaphraseFidelity } from '../../services/aiService';
import { formatFullReference, formatInTextParenthetical, formatInTextNarrative } from '../../utils/citationEngine';
import type { CitationStyle, Source, Idea, Paraphrase, Work } from '../../types';

export const PipelineView: React.FC = () => {
  const { showToast } = useToast();
  const [selectedStyle, setSelectedStyle] = useState<CitationStyle>('APA_7');
  const [auditingParaId, setAuditingParaId] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [workFilter, setWorkFilter] = useState<string>('ALL');
  const [showGuide, setShowGuide] = useState(false);

  // Live queries
  const sources = useLiveQuery(() => db.sources.toArray()) || [];
  const ideas = useLiveQuery(() => db.ideas.toArray()) || [];
  const paraphrases = useLiveQuery(() => db.paraphrases.toArray()) || [];
  const works = useLiveQuery(() => db.works.toArray()) || [];

  const sourcesMap = React.useMemo(() => new Map(sources.map((s) => [s.id, s])), [sources]);
  const ideasMap = React.useMemo(() => new Map(ideas.map((i) => [i.id, i])), [ideas]);
  const worksMap = React.useMemo(() => new Map(works.map((w) => [w.id, w])), [works]);

  // Handle Audit Fidelity (Anti-Plagiarism & Paraphrase Fidelity)
  const handleAuditFidelity = async (paraphrase: Paraphrase) => {
    const idea = ideasMap.get(paraphrase.ideaId);
    if (!idea) return;

    setAuditingParaId(paraphrase.id);
    try {
      const result = await checkParaphraseFidelity(idea.rawQuote, paraphrase.finalParaphrase);
      await db.paraphrases.update(paraphrase.id, {
        fidelityReviewStatus: result.status,
        fidelityWarningMessage: result.feedback,
        updatedAt: Date.now()
      });
      showToast(
        result.status === 'CONFIRMED_FAITHFUL' ? '¡Bien redactado!' : 'Sugerencia de mejora',
        result.feedback,
        result.status === 'CONFIRMED_FAITHFUL' ? 'success' : 'warning'
      );
    } catch {
      showToast('Error', 'No se pudo revisar la paráfrasis.', 'error');
    } finally {
      setAuditingParaId(null);
    }
  };

  // Copy Citation to clipboard with temporary feedback icon
  const handleCopyCitation = (text: string, label: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    showToast('Copiado', `${label} listo para pegar en tu documento.`, 'success');
    setTimeout(() => {
      setCopiedKey((prev) => (prev === key ? null : prev));
    }, 2000);
  };

  // Filtered paraphrases
  const filteredParaphrases = paraphrases.filter((para) => {
    const source = sourcesMap.get(para.sourceId);
    const idea = ideasMap.get(para.ideaId);
    if (!source || !idea) return false;

    if (workFilter !== 'ALL' && para.workId !== workFilter && !(source.workIds || []).includes(workFilter)) {
      return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchTitle = source.title.toLowerCase().includes(q);
      const matchQuote = idea.rawQuote.toLowerCase().includes(q);
      const matchPara = para.finalParaphrase.toLowerCase().includes(q);
      const matchAuthors = (source.authors || []).some((a) =>
        `${a.firstName} ${a.lastName}`.toLowerCase().includes(q)
      );
      if (!matchTitle && !matchQuote && !matchPara && !matchAuthors) return false;
    }

    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#8C3A32] uppercase tracking-wider mb-1">
            <BookMarked className="w-3.5 h-3.5" />
            <span>Trazabilidad de Citas & Referencias</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#2B2D42]">
            Citas en el Texto & Referencias Bibliográficas
          </h2>
          <p className="text-xs sm:text-sm text-[#5A6275] mt-0.5">
            Convierte tus fuentes y citas textuales en citas parentéticas, narrativas y referencias canónicas sin plagio.
          </p>
        </div>

        {/* Global Citation Style Selector */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowGuide(!showGuide)}
            icon={<Info className="w-4 h-4 text-[#8C3A32]" />}
            className="text-xs font-bold"
          >
            {showGuide ? 'Ocultar Guía' : '¿Cómo citar?'}
          </Button>

          <div className="flex items-center gap-1.5 bg-white border border-[#EBE5DF] p-1 rounded-2xl shadow-xs">
            {(['APA_7', 'MLA_9', 'IEEE', 'CHICAGO_AUTHOR_DATE', 'VANCOUVER'] as const).map((style) => (
              <button
                key={style}
                onClick={() => setSelectedStyle(style)}
                className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer select-none whitespace-nowrap ${
                  selectedStyle === style
                    ? 'bg-[#E8A598] text-[#2B2D42] shadow-2xs'
                    : 'text-[#5A6275] hover:bg-[#F5F1EB]'
                }`}
              >
                {style === 'APA_7'
                  ? 'APA 7'
                  : style === 'MLA_9'
                  ? 'MLA 9'
                  : style === 'IEEE'
                  ? 'IEEE'
                  : style === 'CHICAGO_AUTHOR_DATE'
                  ? 'Chicago'
                  : 'Vancouver'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Educational Guide Card (Visual distinction for students) */}
      {showGuide && (
        <Card variant="elevated" className="bg-gradient-to-br from-[#FDF2F0] via-white to-[#FFF8E1] border border-[#E8A598]/60 space-y-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <h4 className="font-extrabold text-sm text-[#8C3A32] flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#D98880]" />
              <span>Guía Rápida de Citación APA 7ma Edición (Psicología USMP)</span>
            </h4>
            <span className="text-[10px] font-bold text-[#8C3A32] bg-[#FDF2F0] px-2 py-0.5 rounded-md uppercase">
              Normas Oficiales
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            {/* 1. Parenthetical */}
            <div className="p-3 rounded-2xl bg-white border border-[#EBE5DF] space-y-1.5 shadow-2xs">
              <div className="flex items-center gap-1.5 font-bold text-[#2B2D42]">
                <span className="w-2 h-2 rounded-full bg-[#8C3A32]" />
                <span>1. Cita Parentética (Al final)</span>
              </div>
              <p className="text-[#5A6275] leading-relaxed">
                Se coloca al final de la oración cuando expones la idea primero y mencionas al autor y año entre paréntesis.
              </p>
              <div className="p-2 rounded-xl bg-[#FAF8F5] border border-[#EBE5DF] font-mono text-[11px] text-[#8C3A32]">
                (Gross, 2015, p. 14)
              </div>
            </div>

            {/* 2. Narrative */}
            <div className="p-3 rounded-2xl bg-white border border-[#EBE5DF] space-y-1.5 shadow-2xs">
              <div className="flex items-center gap-1.5 font-bold text-[#2B2D42]">
                <span className="w-2 h-2 rounded-full bg-[#80CBC4]" />
                <span>2. Cita Narrativa (En el texto)</span>
              </div>
              <p className="text-[#5A6275] leading-relaxed">
                El apellido del autor forma parte natural de la redacción. El año va entre paréntesis inmediatamente después.
              </p>
              <div className="p-2 rounded-xl bg-[#FAF8F5] border border-[#EBE5DF] font-mono text-[11px] text-[#2B2D42]">
                Gross (2015) plantea que...
              </div>
            </div>

            {/* 3. Reference */}
            <div className="p-3 rounded-2xl bg-white border border-[#EBE5DF] space-y-1.5 shadow-2xs">
              <div className="flex items-center gap-1.5 font-bold text-[#2B2D42]">
                <span className="w-2 h-2 rounded-full bg-[#B39DDB]" />
                <span>3. Referencia Final (Sangría Francesa)</span>
              </div>
              <p className="text-[#5A6275] leading-relaxed">
                Va en la lista final con sangría francesa (la primera línea normal y las siguientes con sangría de 1.27 cm / 0.5 in).
              </p>
              <div className="p-2 rounded-xl bg-[#FAF8F5] border border-[#EBE5DF] font-serif text-[11px] text-[#2B2D42] italic">
                Gross, J. (2015). Emotion regulation...
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Visual Pipeline Stepper */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 p-3.5 sm:p-4 rounded-2xl bg-white border border-[#EBE5DF] text-xs font-bold shadow-xs">
        <div className="flex items-center gap-2 text-[#2B2D42] min-w-0">
          <div className="w-6 h-6 rounded-lg bg-[#E3F2FD] text-[#1976D2] flex items-center justify-center shrink-0">
            <BookOpen className="w-3.5 h-3.5" />
          </div>
          <div className="truncate">
            <span className="block text-[10px] text-[#8D99AE]">Paso 1</span>
            <span className="truncate">Libro / Paper</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[#2B2D42] min-w-0">
          <div className="w-6 h-6 rounded-lg bg-[#FFF8E1] text-[#FFA000] flex items-center justify-center shrink-0">
            <Quote className="w-3.5 h-3.5" />
          </div>
          <div className="truncate">
            <span className="block text-[10px] text-[#8D99AE]">Paso 2</span>
            <span className="truncate">Texto del Autor</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[#2B2D42] min-w-0">
          <div className="w-6 h-6 rounded-lg bg-[#E8F5E9] text-[#2E7D32] flex items-center justify-center shrink-0">
            <FileText className="w-3.5 h-3.5" />
          </div>
          <div className="truncate">
            <span className="block text-[10px] text-[#8D99AE]">Paso 3</span>
            <span className="truncate">Tus Palabras</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[#2B2D42] min-w-0">
          <div className="w-6 h-6 rounded-lg bg-[#FDF2F0] text-[#8C3A32] flex items-center justify-center shrink-0">
            <ShieldCheck className="w-3.5 h-3.5" />
          </div>
          <div className="truncate">
            <span className="block text-[10px] text-[#8D99AE]">Paso 4</span>
            <span className="truncate">Cita & Referencia</span>
          </div>
        </div>
      </div>

      {/* Search & Work Filter Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 min-w-0">
          <Search className="w-4 h-4 text-[#8D99AE] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar citas por autor, título, palabras clave o paráfrasis..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-white border border-[#EBE5DF] text-xs text-[#2B2D42] placeholder-[#8D99AE] focus:outline-none focus:border-[#E8A598] shadow-xs"
          />
        </div>

        {works.length > 0 && (
          <div className="flex items-center gap-2 shrink-0">
            <Filter className="w-3.5 h-3.5 text-[#5A6275]" />
            <select
              value={workFilter}
              onChange={(e) => setWorkFilter(e.target.value)}
              className="bg-white border border-[#EBE5DF] rounded-xl px-3 py-2 text-xs font-bold text-[#2B2D42] focus:outline-none focus:border-[#E8A598]"
            >
              <option value="ALL">Todos los Trabajos ({paraphrases.length})</option>
              {works.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.title}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Traceability Records List */}
      <div className="space-y-4">
        {filteredParaphrases.length === 0 ? (
          <Card variant="subtle" className="text-center py-12 space-y-2">
            <BookMarked className="w-8 h-8 text-[#D98880] mx-auto opacity-70" />
            <h4 className="font-bold text-sm text-[#2B2D42]">No hay citas registradas</h4>
            <p className="text-xs text-[#5A6275] max-w-md mx-auto">
              Ve a la sección <strong>"Fuentes & Papers"</strong> o usa <strong>Ctrl + J</strong> para registrar un artículo científico, extraer citas textuales y generar paráfrasis.
            </p>
          </Card>
        ) : (
          filteredParaphrases.map((para) => {
            const idea = ideasMap.get(para.ideaId);
            const source = sourcesMap.get(para.sourceId);
            const work = para.workId ? worksMap.get(para.workId) : undefined;

            if (!source || !idea) return null;

            const workSources = para.workId
              ? sources.filter((s) => s.workIds.includes(para.workId!))
              : sources;
            const refNum = workSources.findIndex((s) => s.id === source.id) + 1 || 1;
            const parentheticalCite = formatInTextParenthetical(source, selectedStyle, idea.pageOrLocation, refNum);
            const narrativeCite = formatInTextNarrative(source, selectedStyle, refNum);
            const fullRef = formatFullReference(source, selectedStyle);

            const keyParenthetical = `parenthetical-${para.id}`;
            const keyNarrative = `narrative-${para.id}`;
            const keyRef = `ref-${para.id}`;

            return (
              <Card key={para.id} variant="elevated" className="space-y-4">
                {/* Header: Source and Work link */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-[#EBE5DF]">
                  <div className="flex items-center gap-2 flex-wrap min-w-0 flex-1">
                    <span className="text-xs sm:text-sm font-extrabold text-[#2B2D42] break-words [overflow-wrap:anywhere]">
                      {source.title}
                    </span>
                    <VerificationBadge status={source.verificationStatus} />
                    {idea.pageOrLocation && (
                      <Badge variant="default" size="sm">
                        {idea.pageOrLocation}
                      </Badge>
                    )}
                  </div>
                  {work && (
                    <Badge variant="rose" size="sm" className="shrink-0">
                      {work.title}
                    </Badge>
                  )}
                </div>

                {/* 2-Column Comparison: Source Quote vs Student Paraphrase */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {/* Original Author Text */}
                  <div className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#EBE5DF] space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#8D99AE] uppercase tracking-wider">
                      <Quote className="w-3 h-3 text-[#FFA000]" />
                      <span>Lo que dice el Autor (Texto Original):</span>
                    </div>
                    <p className="text-[#2B2D42] italic font-serif leading-relaxed break-words [overflow-wrap:anywhere]">
                      "{idea.rawQuote}"
                    </p>
                  </div>

                  {/* Student's Own Paraphrase */}
                  <div className="p-3.5 rounded-2xl bg-[#FDF2F0] border border-[#E8A598]/50 space-y-1.5">
                    <div className="flex items-center justify-between gap-1 flex-wrap">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#8C3A32] uppercase tracking-wider">
                        <FileText className="w-3 h-3 text-[#D98880]" />
                        <span>Explicado con tus Palabras (Paráfrasis):</span>
                      </div>
                      <Badge
                        variant={para.fidelityReviewStatus === 'CONFIRMED_FAITHFUL' ? 'verified' : 'amber'}
                        size="sm"
                      >
                        {para.fidelityReviewStatus === 'CONFIRMED_FAITHFUL' ? 'Sin plagio / Fiel' : 'Por revisar'}
                      </Badge>
                    </div>
                    <p className="text-[#2B2D42] font-medium leading-relaxed break-words [overflow-wrap:anywhere]">
                      {para.finalParaphrase}
                    </p>
                  </div>
                </div>

                {/* Generated Citations Box */}
                <div className="p-4 rounded-2xl bg-white border border-[#EBE5DF] space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-[#5A6275] uppercase tracking-wider flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-[#D98880]" />
                      <span>Citas Generadas ({selectedStyle.replace('_', ' ')})</span>
                    </span>
                    <span className="text-[10px] text-[#8D99AE]">Haz clic en copiar para usar en tu texto</span>
                  </div>

                  {/* In-Text Citations Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* 1. Parenthetical */}
                    <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#EBE5DF] flex items-center justify-between gap-2 transition-all hover:border-[#E8A598]/80">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-bold text-[#8C3A32] uppercase">
                            Cita Parentética
                          </span>
                          <span className="text-[10px] text-[#8D99AE]">(Al final de la idea)</span>
                        </div>
                        <code className="text-xs font-mono font-bold text-[#2B2D42] block mt-0.5 break-words [overflow-wrap:anywhere]">
                          {parentheticalCite}
                        </code>
                      </div>
                      <button
                        onClick={() => handleCopyCitation(parentheticalCite, 'Cita parentética', keyParenthetical)}
                        className="p-2 rounded-xl text-[#5A6275] hover:text-[#8C3A32] hover:bg-white transition-all cursor-pointer shrink-0 shadow-2xs border border-[#EBE5DF]"
                        title="Copiar cita parentética"
                        aria-label="Copiar cita parentética"
                      >
                        {copiedKey === keyParenthetical ? (
                          <Check className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    {/* 2. Narrative */}
                    <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#EBE5DF] flex items-center justify-between gap-2 transition-all hover:border-[#E8A598]/80">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-bold text-[#8C3A32] uppercase">
                            Cita Narrativa
                          </span>
                          <span className="text-[10px] text-[#8D99AE]">(En la oración)</span>
                        </div>
                        <code className="text-xs font-mono font-bold text-[#2B2D42] block mt-0.5 break-words [overflow-wrap:anywhere]">
                          {narrativeCite}
                        </code>
                      </div>
                      <button
                        onClick={() => handleCopyCitation(narrativeCite, 'Cita narrativa', keyNarrative)}
                        className="p-2 rounded-xl text-[#5A6275] hover:text-[#8C3A32] hover:bg-white transition-all cursor-pointer shrink-0 shadow-2xs border border-[#EBE5DF]"
                        title="Copiar cita narrativa"
                        aria-label="Copiar cita narrativa"
                      >
                        {copiedKey === keyNarrative ? (
                          <Check className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* 3. Canonical Reference (Styled with French Indentation) */}
                  <div className="p-3.5 rounded-xl bg-gradient-to-r from-[#FDF2F0] to-white border border-[#E8A598]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-[#8C3A32] uppercase">
                          Referencia Bibliográfica Final
                        </span>
                        <span className="text-[10px] text-[#8D99AE]">(Lista de referencias con Sangría Francesa)</span>
                      </div>
                      <p
                        className="text-xs text-[#2B2D42] font-serif leading-relaxed mt-1 break-words [overflow-wrap:anywhere]"
                        style={{ paddingLeft: '1.5rem', textIndent: '-1.5rem' }}
                      >
                        {fullRef}
                      </p>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleCopyCitation(fullRef, 'Referencia bibliográfica', keyRef)}
                      icon={
                        copiedKey === keyRef ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )
                      }
                      className="shrink-0 self-start sm:self-center font-bold"
                    >
                      {copiedKey === keyRef ? '¡Copiado!' : 'Copiar Referencia'}
                    </Button>
                  </div>
                </div>

                {/* Audit & Fidelity Check Action */}
                <div className="flex flex-col sm:flex-row sm:justify-end gap-2 pt-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleAuditFidelity(para)}
                    isLoading={auditingParaId === para.id}
                    icon={<Sparkles className="w-3.5 h-3.5 text-[#D98880]" />}
                    className="w-full sm:w-auto text-xs font-semibold text-[#8C3A32]"
                  >
                    Verificar Fidelidad de Paráfrasis
                  </Button>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};
