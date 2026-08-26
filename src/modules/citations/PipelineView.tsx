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
  Check,
  Trash2,
  Edit2
} from 'lucide-react';
import { db } from '../../db';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge, VerificationBadge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { TextArea } from '../../components/common/Input';
import { useToast } from '../../components/common/Toast';
import { checkParaphraseFidelity } from '../../services/aiService';
import {
  formatFullReference,
  formatFullReferenceHTML,
  formatInTextParenthetical,
  formatInTextNarrative,
  copyRichReference
} from '../../utils/citationEngine';
import { copyText } from '../../utils/clipboardHelper';
import type { CitationStyle, Source, Idea, Paraphrase, Work } from '../../types';

export const PipelineView: React.FC = () => {
  const { showToast } = useToast();
  const [selectedStyle, setSelectedStyle] = useState<CitationStyle>('APA_7');
  const [auditingParaId, setAuditingParaId] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [workFilter, setWorkFilter] = useState<string>('ALL');
  const [showGuide, setShowGuide] = useState(false);

  // Edit Paraphrase Modal State
  const [editingPara, setEditingPara] = useState<Paraphrase | null>(null);
  const [editingText, setEditingText] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [paraToDelete, setParaToDelete] = useState<Paraphrase | null>(null);

  // Live queries
  const sources = useLiveQuery(() => db.sources.toArray()) || [];
  const ideas = useLiveQuery(() => db.ideas.toArray()) || [];
  const paraphrases = useLiveQuery(() => db.paraphrases.toArray()) || [];
  const works = useLiveQuery(() => db.works.toArray()) || [];

  const sourcesMap = React.useMemo(() => new Map(sources.map((s) => [s.id, s])), [sources]);
  const ideasMap = React.useMemo(() => new Map(ideas.map((i) => [i.id, i])), [ideas]);
  const worksMap = React.useMemo(() => new Map(works.map((w) => [w.id, w])), [works]);

  const handleConfirmDelete = async () => {
    if (!paraToDelete) return;
    await db.paraphrases.delete(paraToDelete.id);
    showToast('Paráfrasis eliminada', 'La ficha ha sido retirada de tus citas.', 'info');
    setParaToDelete(null);
  };

  const handleStartEdit = (para: Paraphrase) => {
    setEditingPara(para);
    setEditingText(para.finalParaphrase);
  };

  const handleSaveEdit = async (andAuditWithAi: boolean = false) => {
    if (!editingPara) return;
    if (!editingText.trim()) {
      showToast('Texto requerido', 'La paráfrasis no puede estar vacía.', 'warning');
      return;
    }

    setIsSavingEdit(true);
    try {
      const idea = ideasMap.get(editingPara.ideaId);
      let status = editingPara.fidelityReviewStatus;
      let feedback = editingPara.fidelityWarningMessage;

      if (andAuditWithAi && idea) {
        const result = await checkParaphraseFidelity(idea.rawQuote, editingText.trim());
        status = result.status;
        feedback = result.feedback;
        showToast(
          result.status === 'CONFIRMED_FAITHFUL' ? '¡Bien redactado!' : 'Sugerencia de mejora',
          result.feedback,
          result.status === 'CONFIRMED_FAITHFUL' ? 'success' : 'warning',
          10000
        );
      } else {
        showToast('Paráfrasis guardada', 'Los cambios han sido guardados.', 'success');
      }

      await db.paraphrases.update(editingPara.id, {
        finalParaphrase: editingText.trim(),
        fidelityReviewStatus: andAuditWithAi ? status : 'PENDING_REVIEW',
        fidelityWarningMessage: andAuditWithAi ? feedback : undefined,
        updatedAt: Date.now()
      });

      setEditingPara(null);
      setEditingText('');
    } catch {
      showToast('Error', 'No se pudo guardar la paráfrasis.', 'error');
    } finally {
      setIsSavingEdit(false);
    }
  };

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
        result.status === 'CONFIRMED_FAITHFUL' ? 'success' : 'warning',
        10000
      );
    } catch {
      showToast('Error', 'No se pudo revisar la paráfrasis.', 'error');
    } finally {
      setAuditingParaId(null);
    }
  };

  // Copy Citation to clipboard with temporary feedback icon
  const handleCopyCitation = async (text: string, label: string, key: string, htmlText?: string) => {
    let ok = false;
    if (htmlText) {
      ok = await copyRichReference(text, htmlText);
    } else {
      ok = await copyText(text);
    }
    if (ok) {
      setCopiedKey(key);
      showToast('Copiado', `${label} listo para pegar en tu documento.`, 'success');
      setTimeout(() => {
        setCopiedKey((prev) => (prev === key ? null : prev));
      }, 2000);
    } else {
      showToast('Error', 'No se pudo copiar al portapapeles.', 'error');
    }
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
  });  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header Banner */}
      <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-[#FDF2F0] via-white to-[#F3E5F5] border border-[#E8A598]/40 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#8C3A32] uppercase tracking-wider bg-[#FDF2F0] px-2.5 py-0.5 rounded-lg border border-[#E8A598]/50">
              <BookMarked className="w-3.5 h-3.5 text-[#D98880]" />
              <span>Citas & Bibliografía</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#2B2D42] leading-tight">
              Citas en el Texto & Referencias
            </h2>
            <p className="text-xs sm:text-sm text-[#5A6275]">
              Genera citas parentéticas, narrativas y referencias canónicas oficiales sin plagio.
            </p>
          </div>

          {/* Global Citation Style Selector */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowGuide(!showGuide)}
              icon={<Info className="w-4 h-4 text-[#8C3A32]" />}
              className="text-xs font-bold shrink-0"
            >
              {showGuide ? 'Ocultar Guía' : '¿Cómo citar?'}
            </Button>

            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar scroll-touch bg-white border border-[#EBE5DF] p-1 rounded-2xl shadow-xs">
              {(['APA_7', 'MLA_9', 'IEEE', 'CHICAGO_AUTHOR_DATE', 'VANCOUVER'] as const).map((style) => (
                <button
                  key={style}
                  onClick={() => setSelectedStyle(style)}
                  className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer select-none text-center whitespace-nowrap ${
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
      </div>

      {/* Educational Guide Card (Visual distinction for students) */}
      {showGuide && (
        <Card variant="elevated" className="bg-gradient-to-br from-[#FDF2F0] via-white to-[#FFF8E1] border border-[#E8A598]/60 space-y-3 animate-fade-in p-4 sm:p-5">
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
                <span>1. Cita Parentética</span>
              </div>
              <p className="text-[#5A6275] leading-relaxed">
                Al final de la oración con autor y año entre paréntesis.
              </p>
              <div className="p-2 rounded-xl bg-[#FAF8F5] border border-[#EBE5DF] font-mono text-[11px] text-[#8C3A32]">
                (Gross, 2015, p. 14)
              </div>
            </div>

            {/* 2. Narrative */}
            <div className="p-3 rounded-2xl bg-white border border-[#EBE5DF] space-y-1.5 shadow-2xs">
              <div className="flex items-center gap-1.5 font-bold text-[#2B2D42]">
                <span className="w-2 h-2 rounded-full bg-[#80CBC4]" />
                <span>2. Cita Narrativa</span>
              </div>
              <p className="text-[#5A6275] leading-relaxed">
                El autor forma parte del texto con el año entre paréntesis.
              </p>
              <div className="p-2 rounded-xl bg-[#FAF8F5] border border-[#EBE5DF] font-mono text-[11px] text-[#2B2D42]">
                Gross (2015) plantea que...
              </div>
            </div>

            {/* 3. Reference */}
            <div className="p-3 rounded-2xl bg-white border border-[#EBE5DF] space-y-1.5 shadow-2xs">
              <div className="flex items-center gap-1.5 font-bold text-[#2B2D42]">
                <span className="w-2 h-2 rounded-full bg-[#B39DDB]" />
                <span>3. Referencia Bibliográfica</span>
              </div>
              <p className="text-[#5A6275] leading-relaxed">
                Formato completo con sangría francesa al final de la tesis o trabajo.
              </p>
              <div className="p-2 rounded-xl bg-[#FAF8F5] border border-[#EBE5DF] font-serif text-[11px] text-[#2B2D42] italic">
                Gross, J. (2015). Emotion regulation...
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Search & Work Filter Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <div className="sm:col-span-2 relative min-w-0">
          <Search className="w-4 h-4 text-[#8D99AE] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por autor, cita textual, tema o paráfrasis..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-white border border-[#EBE5DF] text-xs sm:text-sm text-[#2B2D42] placeholder-[#8D99AE] focus:outline-none focus:ring-2 focus:ring-[#E8A598] shadow-xs"
          />
        </div>

        {works.length > 0 && (
          <div className="relative">
            <select
              value={workFilter}
              onChange={(e) => setWorkFilter(e.target.value)}
              className="w-full bg-white border border-[#EBE5DF] rounded-xl px-3 py-2.5 text-xs sm:text-sm font-bold text-[#2B2D42] focus:outline-none focus:ring-2 focus:ring-[#E8A598] shadow-xs cursor-pointer"
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
          <Card variant="subtle" className="text-center py-12 px-4 space-y-2">
            <BookMarked className="w-8 h-8 text-[#D98880] mx-auto opacity-70" />
            <h4 className="font-bold text-sm text-[#2B2D42]">No hay citas registradas</h4>
            <p className="text-xs text-[#5A6275] max-w-md mx-auto">
              Ve a la sección <strong>"Fuentes & Papers"</strong> para registrar un artículo científico, extraer citas textuales y generar paráfrasis automáticas.
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
              <Card key={para.id} variant="elevated" className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl space-y-4 shadow-xs">
                {/* Header: Source and Work link */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#EBE5DF]">
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
                    <div className="max-w-full sm:max-w-[320px] shrink min-w-0" title={work.title}>
                      <Badge variant="rose" size="sm" className="w-full justify-start text-left">
                        {work.title}
                      </Badge>
                    </div>
                  )}
                </div>

                {/* 2-Column Comparison: Source Quote vs Student Paraphrase */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {/* Original Author Text */}
                  <div className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#EBE5DF] space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#8D99AE] uppercase tracking-wider">
                      <Quote className="w-3.5 h-3.5 text-[#FFA000]" />
                      <span>Cita Textual del Autor:</span>
                    </div>
                    <p className="text-[#2B2D42] italic font-serif leading-relaxed break-words [overflow-wrap:anywhere]">
                      "{idea.rawQuote}"
                    </p>
                  </div>

                  {/* Student's Own Paraphrase */}
                  <div className="p-3.5 rounded-2xl bg-[#FDF2F0] border border-[#E8A598]/50 space-y-2">
                    <div className="flex items-center justify-between gap-1 flex-wrap">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#8C3A32] uppercase tracking-wider">
                        <FileText className="w-3.5 h-3.5 text-[#D98880]" />
                        <span>Tu Paráfrasis:</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleStartEdit(para)}
                          className="text-[11px] text-[#8C3A32] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Edit2 className="w-3 h-3" /> Editar
                        </button>
                        <Badge
                          variant={para.fidelityReviewStatus === 'CONFIRMED_FAITHFUL' ? 'verified' : 'amber'}
                          size="sm"
                        >
                          {para.fidelityReviewStatus === 'CONFIRMED_FAITHFUL' ? 'Sin plagio / Fiel' : 'Por revisar'}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-[#2B2D42] font-medium leading-relaxed break-words [overflow-wrap:anywhere]">
                      {para.finalParaphrase}
                    </p>

                    {para.fidelityWarningMessage && (
                      <div className="p-2.5 rounded-xl bg-white/90 border border-[#E8A598]/50 text-[11px] text-[#5A6275] leading-relaxed space-y-0.5">
                        <span className="font-bold text-[#8C3A32] flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-[#8C3A32]" /> Observación de la IA:
                        </span>
                        <p>{para.fidelityWarningMessage}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* In-Text Citations Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* 1. Parenthetical */}
                  <div className="p-3 rounded-xl bg-white border border-[#EBE5DF] flex items-center justify-between gap-2 transition-all hover:border-[#E8A598]/80 shadow-2xs">
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-bold text-[#8C3A32] uppercase block">
                        Cita Parentética
                      </span>
                      <code className="text-xs font-mono font-bold text-[#2B2D42] block mt-0.5 break-words [overflow-wrap:anywhere]">
                        {parentheticalCite}
                      </code>
                    </div>
                    <button
                      onClick={() => handleCopyCitation(parentheticalCite, 'Cita parentética', keyParenthetical)}
                      className="p-2 rounded-xl text-[#5A6275] hover:text-[#8C3A32] hover:bg-[#FAF8F5] transition-all cursor-pointer shrink-0 border border-[#EBE5DF]"
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
                  <div className="p-3 rounded-xl bg-white border border-[#EBE5DF] flex items-center justify-between gap-2 transition-all hover:border-[#E8A598]/80 shadow-2xs">
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-bold text-[#8C3A32] uppercase block">
                        Cita Narrativa
                      </span>
                      <code className="text-xs font-mono font-bold text-[#2B2D42] block mt-0.5 break-words [overflow-wrap:anywhere]">
                        {narrativeCite}
                      </code>
                    </div>
                    <button
                      onClick={() => handleCopyCitation(narrativeCite, 'Cita narrativa', keyNarrative)}
                      className="p-2 rounded-xl text-[#5A6275] hover:text-[#8C3A32] hover:bg-[#FAF8F5] transition-all cursor-pointer shrink-0 border border-[#EBE5DF]"
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

                {/* 3. Canonical Reference */}
                <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E8A598]/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-bold text-[#8C3A32] uppercase block">
                      Referencia Bibliográfica ({selectedStyle.replace('_', ' ')})
                    </span>
                    <p
                      className="text-xs text-[#2B2D42] font-serif leading-relaxed mt-1 break-words [overflow-wrap:anywhere]"
                      style={{ paddingLeft: '1.25rem', textIndent: '-1.25rem' }}
                    >
                      {fullRef}
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      const fullRefHtml = `<p style="padding-left:1.5rem;text-indent:-1.5rem;">${formatFullReferenceHTML(source, selectedStyle)}</p>`;
                      handleCopyCitation(fullRef, 'Referencia bibliográfica', keyRef, fullRefHtml);
                    }}
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

                {/* Footer Actions: Edit, Delete & Audit */}
                <div className="flex items-center justify-between pt-2 border-t border-[#EBE5DF]/60">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleStartEdit(para)}
                      className="px-2.5 py-1 text-xs font-bold text-[#5A6275] hover:text-[#8C3A32] hover:bg-[#FDF2F0] rounded-xl transition-colors cursor-pointer flex items-center gap-1 border border-[#EBE5DF]"
                      title="Editar paráfrasis"
                      aria-label="Editar paráfrasis"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Editar</span>
                    </button>
                    <button
                      onClick={() => setParaToDelete(para)}
                      className="p-1.5 text-[#8D99AE] hover:text-[#C62828] hover:bg-rose-50 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-rose-200"
                      title="Eliminar cita/paráfrasis"
                      aria-label="Eliminar cita y paráfrasis"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleAuditFidelity(para)}
                    isLoading={auditingParaId === para.id}
                    icon={<Sparkles className="w-3.5 h-3.5 text-[#8C3A32]" />}
                    className="text-xs font-semibold text-[#8C3A32]"
                  >
                    Verificar Fidelidad con IA
                  </Button>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Edit Paraphrase Modal */}
      {editingPara && (
        <Modal
          isOpen={!!editingPara}
          onClose={() => setEditingPara(null)}
          title="Editar Paráfrasis Académica"
          subtitle="Reformula la idea con vocabulario propio y mantén la fidelidad científica al autor"
          maxWidth="lg"
        >
          <div className="space-y-4">
            {/* Original Quote Reference */}
            {(() => {
              const idea = ideasMap.get(editingPara.ideaId);
              const src = sourcesMap.get(editingPara.sourceId);
              return (
                <div className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#EBE5DF] space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-[#8D99AE] uppercase tracking-wider flex items-center gap-1">
                      <Quote className="w-3.5 h-3.5 text-[#FFA000]" /> Cita Textual de la Fuente:
                    </span>
                    {src && <span className="font-bold text-[#2B2D42] truncate max-w-[220px]">{src.title}</span>}
                  </div>
                  <p className="text-xs text-[#2B2D42] italic font-serif leading-relaxed">
                    "{idea?.rawQuote || 'Cita textual original'}"
                  </p>
                </div>
              );
            })()}

            {/* Editing Textarea */}
            <TextArea
              label="Tu Paráfrasis Reformulada *"
              placeholder="Escribe tu paráfrasis con vocabulario técnico y estructura propia..."
              rows={5}
              value={editingText}
              onChange={(e) => setEditingText(e.target.value)}
            />

            {/* Actions */}
            <div className="pt-3 border-t border-[#EBE5DF] flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2">
              <Button variant="ghost" onClick={() => setEditingPara(null)} className="w-full sm:w-auto">
                Cancelar
              </Button>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <Button
                  variant="secondary"
                  onClick={() => handleSaveEdit(false)}
                  isLoading={isSavingEdit}
                  className="w-full sm:w-auto font-bold"
                >
                  Guardar Cambios
                </Button>
                <Button
                  variant="primary"
                  onClick={() => handleSaveEdit(true)}
                  isLoading={isSavingEdit}
                  icon={<Sparkles className="w-4 h-4" />}
                  className="w-full sm:w-auto font-bold"
                >
                  Guardar y Auditar con IA
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Paraphrase Confirmation Modal */}
      {paraToDelete && (
        <Modal
          isOpen={!!paraToDelete}
          onClose={() => setParaToDelete(null)}
          title="¿Eliminar esta Paráfrasis?"
          subtitle="Se retirará esta ficha de citas y referencias"
          maxWidth="sm"
        >
          <div className="space-y-4">
            <p className="text-xs text-[#5A6275] leading-relaxed">
              Esta acción eliminará la paráfrasis registrada. La fuente bibliográfica seguirá guardada en tu biblioteca.
            </p>
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2 border-t border-[#EBE5DF]">
              <Button variant="ghost" onClick={() => setParaToDelete(null)} className="w-full sm:w-auto">
                Cancelar
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirmDelete}
                className="w-full sm:w-auto bg-[#C62828] hover:bg-[#B71C1C] text-white font-bold"
              >
                Eliminar Definitivamente
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
