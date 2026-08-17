import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  GitFork,
  BookOpen,
  Lightbulb,
  FileText,
  Quote,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Sparkles,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { db } from '../../db';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge, CitationStyleBadge } from '../../components/common/Badge';
import { useToast } from '../../components/common/Toast';
import { checkParaphraseFidelity } from '../../services/aiService';
import { formatFullReference, formatInTextParenthetical, formatInTextNarrative } from '../../utils/citationEngine';
import type { CitationStyle, Source, Idea, Paraphrase, Work } from '../../types';

export const PipelineView: React.FC = () => {
  const { showToast } = useToast();
  const [selectedStyle, setSelectedStyle] = useState<CitationStyle>('APA_7');
  const [auditingParaId, setAuditingParaId] = useState<string | null>(null);

  // Live queries
  const sources = useLiveQuery(() => db.sources.toArray()) || [];
  const ideas = useLiveQuery(() => db.ideas.toArray()) || [];
  const paraphrases = useLiveQuery(() => db.paraphrases.toArray()) || [];
  const works = useLiveQuery(() => db.works.toArray()) || [];

  const sourcesMap = React.useMemo(() => new Map(sources.map((s) => [s.id, s])), [sources]);
  const ideasMap = React.useMemo(() => new Map(ideas.map((i) => [i.id, i])), [ideas]);
  const worksMap = React.useMemo(() => new Map(works.map((w) => [w.id, w])), [works]);

  // Handle Audit Fidelity (Verificar que no sea copia/plagio)
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

  // Copy Citation to clipboard
  const handleCopyCitation = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast('Copiado', `${label} listo para pegar en tu documento.`, 'success');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#8C3A32] uppercase tracking-wider mb-1">
            <span>Citas y Fuentes Conectadas</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#2B2D42]">
            De la Fuente a tu Texto (Sin Plagio)
          </h2>
          <p className="text-xs sm:text-sm text-[#5A6275] mt-0.5">
            Todo conectado paso a paso: Libro o Paper → Texto del Autor → Tus Propias Palabras → Cita en el Texto → Referencia Final.
          </p>
        </div>

        {/* Global Citation Style Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[#5A6275]">Estilo:</span>
          <select
            className="bg-white border border-[#EBE5DF] rounded-xl px-3 py-2 text-xs font-bold text-[#2B2D42] focus:outline-none focus:border-[#E8A598]"
            value={selectedStyle}
            onChange={(e) => setSelectedStyle(e.target.value as CitationStyle)}
          >
            <option value="APA_7">Normas APA 7ma Edición</option>
            <option value="MLA_9">Normas MLA 9na Edición</option>
            <option value="IEEE">Estilo IEEE (Numérico)</option>
            <option value="CHICAGO_AUTHOR_DATE">Estilo Chicago (Autor-Año)</option>
            <option value="VANCOUVER">Estilo Vancouver</option>
          </select>
        </div>
      </div>

      {/* Visual Pipeline Banner */}
      <div className="hidden sm:flex items-center justify-between p-4 rounded-2xl bg-white border border-[#EBE5DF] text-xs font-bold text-[#5A6275] shadow-xs">
        <div className="flex items-center gap-2 text-[#90CAF9]">
          <BookOpen className="w-4 h-4" />
          <span>1. Libro o Paper</span>
        </div>
        <ArrowRight className="w-3.5 h-3.5 text-[#EBE5DF]" />
        <div className="flex items-center gap-2 text-[#FFCC80]">
          <Quote className="w-4 h-4" />
          <span>2. Texto del Autor</span>
        </div>
        <ArrowRight className="w-3.5 h-3.5 text-[#EBE5DF]" />
        <div className="flex items-center gap-2 text-[#80CBC4]">
          <FileText className="w-4 h-4" />
          <span>3. Con tus Palabras</span>
        </div>
        <ArrowRight className="w-3.5 h-3.5 text-[#EBE5DF]" />
        <div className="flex items-center gap-2 text-[#E8A598]">
          <ShieldCheck className="w-4 h-4" />
          <span>4. Cita Lista para Pegar</span>
        </div>
      </div>

      {/* Traceability Records List */}
      <div className="space-y-4">
        {paraphrases.length === 0 ? (
          <Card variant="subtle" className="text-center py-12">
            <p className="text-sm text-[#8D99AE]">
              Aún no tienes citas conectadas. Ve a la pestaña <strong>"Fuentes & Papers"</strong> y extrae una idea para ver el paso a paso aquí.
            </p>
          </Card>
        ) : (
          paraphrases.map((para) => {
            const idea = ideasMap.get(para.ideaId);
            const source = sourcesMap.get(para.sourceId);
            const work = para.workId ? worksMap.get(para.workId) : undefined;

            if (!source || !idea) return null;

            const parentheticalCite = formatInTextParenthetical(source, selectedStyle, idea.pageOrLocation);
            const narrativeCite = formatInTextNarrative(source, selectedStyle);
            const fullRef = formatFullReference(source, selectedStyle);

            return (
              <Card key={para.id} variant="elevated" className="space-y-4">
                {/* Header: Source and Work link */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#EBE5DF]">
                  <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                    <span className="text-xs sm:text-sm font-bold text-[#2B2D42]">{source.title}</span>
                    <Badge variant="default" size="sm">
                      {idea.pageOrLocation || 'Página no especificada'}
                    </Badge>
                  </div>
                  {work && (
                    <Badge variant="rose" size="sm">
                      {work.title}
                    </Badge>
                  )}
                </div>

                {/* Grid comparing Source Quote vs Student Paraphrase */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {/* Original Text */}
                  <div className="p-3.5 rounded-2xl bg-[#F5F1EB]/70 border border-[#EBE5DF] space-y-1">
                    <span className="text-[10px] font-bold text-[#8D99AE] uppercase tracking-wider block">
                      Lo que dice el Autor (Texto Original):
                    </span>
                    <p className="text-[#2B2D42] italic font-serif leading-relaxed">
                      "{idea.rawQuote}"
                    </p>
                  </div>

                  {/* Student's Own Paraphrase */}
                  <div className="p-3.5 rounded-2xl bg-[#FDF2F0] border border-[#E8A598]/50 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-[#8C3A32] uppercase tracking-wider block">
                        Explicado con tus Palabras:
                      </span>
                      <Badge
                        variant={para.fidelityReviewStatus === 'CONFIRMED_FAITHFUL' ? 'verified' : 'amber'}
                        size="sm"
                      >
                        {para.fidelityReviewStatus === 'CONFIRMED_FAITHFUL' ? 'Bien redactado' : 'Por revisar'}
                      </Badge>
                    </div>
                    <p className="text-[#2B2D42] font-medium leading-relaxed">
                      {para.finalParaphrase}
                    </p>
                  </div>
                </div>

                {/* Generated Citations in Selected Style */}
                <div className="p-4 rounded-2xl bg-white border border-[#EBE5DF] space-y-3 shadow-2xs">
                  <span className="text-[10px] font-bold text-[#8D99AE] uppercase tracking-wider block">
                    Citas Generadas en {selectedStyle.replace('_', ' ')}
                  </span>

                  {/* Symmetrical 2-Column Grid for Parenthetical and Narrative Citations */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* Parenthetical */}
                    <div className="p-3 rounded-xl bg-[#F5F1EB]/70 border border-[#EBE5DF] flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] font-bold text-[#5A6275] uppercase block">
                          Cita entre paréntesis
                        </span>
                        <code className="text-xs font-mono font-bold text-[#8C3A32] break-all block mt-0.5">
                          {parentheticalCite}
                        </code>
                      </div>
                      <button
                        onClick={() => handleCopyCitation(parentheticalCite, 'Cita entre paréntesis')}
                        className="p-2 text-[#8D99AE] hover:text-[#8C3A32] hover:bg-white rounded-lg transition-colors cursor-pointer shrink-0 shadow-2xs"
                        title="Copiar cita"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Narrative */}
                    <div className="p-3 rounded-xl bg-[#F5F1EB]/70 border border-[#EBE5DF] flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] font-bold text-[#5A6275] uppercase block">
                          Cita narrativa / en el texto
                        </span>
                        <code className="text-xs font-mono font-bold text-[#8C3A32] break-all block mt-0.5">
                          {narrativeCite}
                        </code>
                      </div>
                      <button
                        onClick={() => handleCopyCitation(narrativeCite, 'Cita narrativa')}
                        className="p-2 text-[#8D99AE] hover:text-[#8C3A32] hover:bg-white rounded-lg transition-colors cursor-pointer shrink-0 shadow-2xs"
                        title="Copiar cita"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Full Canonical Reference Box */}
                  <div className="p-3.5 rounded-xl bg-[#FDF2F0]/80 border border-[#E8A598]/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-bold text-[#8C3A32] uppercase block">
                        Referencia Bibliográfica Final
                      </span>
                      <p className="text-xs text-[#2B2D42] font-serif italic leading-relaxed mt-0.5 break-words">
                        {fullRef}
                      </p>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleCopyCitation(fullRef, 'Referencia bibliográfica')}
                      icon={<Copy className="w-3.5 h-3.5" />}
                      className="shrink-0 self-start sm:self-center"
                    >
                      Copiar Referencia
                    </Button>
                  </div>
                </div>

                {/* Audit Actions */}
                <div className="flex flex-col sm:flex-row sm:justify-end gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleAuditFidelity(para)}
                    isLoading={auditingParaId === para.id}
                    icon={<Sparkles className="w-3.5 h-3.5 text-[#D98880]" />}
                    className="w-full sm:w-auto"
                  >
                    Verificar que esté bien redactado
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
