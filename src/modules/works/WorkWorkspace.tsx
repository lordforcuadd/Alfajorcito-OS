import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { triggerCelebrationConfetti } from '../../utils/confettiHelper';
import {
  ArrowLeft,
  GraduationCap,
  Calendar,
  BookOpen,
  CheckSquare,
  HelpCircle,
  FileText,
  Share2,
  ExternalLink,
  Sparkles,
  Plus,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Copy,
  Trash2,
  Columns,
  Maximize2,
  Link2,
  Edit3,
  Layout,
  BookMarked,
  Check,
  Bold,
  Italic,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Table as TableIcon
} from 'lucide-react';
import { db } from '../../db';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge, CitationStyleBadge, VerificationBadge, WorkStatusBadge, WORK_STATUS_META, type BadgeVariant } from '../../components/common/Badge';
import { Tabs } from '../../components/common/Tabs';
import { Modal } from '../../components/common/Modal';
import { WorkModal } from '../../components/modals/WorkModal';
import { Input, TextArea, Select } from '../../components/common/Input';
import { useToast } from '../../components/common/Toast';
import { validateSourceAge } from '../../utils/sourceAgeValidator';
import {
  formatFullReference,
  formatFullReferenceHTML,
  formatInTextParenthetical,
  formatInTextNarrative,
  copyRichReference
} from '../../utils/citationEngine';
import { generateGoogleDocsRichHTML, generateGoogleCalendarUrl, generateICSFile } from '../../utils/googleExporter';
import { formulateQuestionForTeacher, analyzeInstructionsWithAI } from '../../services/aiService';
import { copyText } from '../../utils/clipboardHelper';
import { generateId } from '../../utils/idHelper';
import { computeDraftFormatting, type DraftFormattingType } from '../../utils/draftFormattingEngine';
import type { Work, Course, Source, Task, InquiryToTeacher, Citation, Paraphrase, Idea, UserProfile, TaskPriority, WorkStatus } from '../../types';

export interface WorkWorkspaceProps {
  workId: string;
  onBack: () => void;
  onOpenSourceDetail?: (sourceId: string) => void;
}

type WorkspaceTab = 'overview' | 'instructions' | 'checklist' | 'inquiries' | 'sources' | 'draft' | 'export';

export const WorkWorkspace: React.FC<WorkWorkspaceProps> = ({ workId, onBack, onOpenSourceDetail }) => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('overview');
  const [splitMode, setSplitMode] = useState<boolean>(false);

  // Live queries
  const work = useLiveQuery(() => db.works.get(workId), [workId]);
  const courses = useLiveQuery(() => db.courses.toArray()) || [];
  const allSources = useLiveQuery(() => db.sources.toArray()) || [];
  const tasks = useLiveQuery(() => db.tasks.where({ workId }).toArray(), [workId]) || [];
  const inquiries = useLiveQuery(() => db.inquiries.where({ workId }).toArray(), [workId]) || [];
  const citations = useLiveQuery(() => db.citations.where({ workId }).toArray(), [workId]) || [];
  const paraphrases = useLiveQuery(() => db.paraphrases.where({ workId }).toArray(), [workId]) || [];
  const ideas = useLiveQuery(() => db.ideas.where({ workId }).toArray(), [workId]) || [];
  const userProfileRecord = useLiveQuery(() => db.settings.get('user_profile'));
  const userProfile = userProfileRecord?.value as UserProfile | undefined;

  const course = courses.find((c) => c.id === work?.courseId);
  const workSources = allSources.filter((s) => s.workIds.includes(workId));

  // Local draft editing state
  const [draftText, setDraftText] = useState<string>('');
  const [hasUnsavedDraft, setHasUnsavedDraft] = useState(false);
  const draftTextareaRef = React.useRef<HTMLTextAreaElement>(null);

  // New task input state
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<Task['priority']>('MEDIUM');

  // New inquiry input state
  const [newInquiryTopic, setNewInquiryTopic] = useState('');
  const [newInquiryDoubt, setNewInquiryDoubt] = useState('');
  const [inquiryTeacherAnswers, setInquiryTeacherAnswers] = useState<Record<string, string>>({});
  const [newInquiryStatus, setNewInquiryStatus] = useState<'DRAFT' | 'SENT' | 'ANSWERED'>('DRAFT');
  const [isFormulating, setIsFormulating] = useState(false);
  const [isAnalyzingConsigna, setIsAnalyzingConsigna] = useState(false);
  const [copiedInquiryId, setCopiedInquiryId] = useState<string | null>(null);

  // Google Docs & Canva link modal state
  const [isLinksModalOpen, setIsLinksModalOpen] = useState(false);
  const [isEditWorkModalOpen, setIsEditWorkModalOpen] = useState(false);
  const [editGoogleDocUrl, setEditGoogleDocUrl] = useState('');
  const [editCanvaUrl, setEditCanvaUrl] = useState('');

  React.useEffect(() => {
    if (work && !hasUnsavedDraft) {
      setDraftText(work.draftContent || '');
    }
  }, [work]);

  // Save Draft
  const handleSaveDraft = async () => {
    await db.works.update(workId, { draftContent: draftText, updatedAt: Date.now() });
    setHasUnsavedDraft(false);
    showToast('Borrador guardado', 'Cambios sincronizados en la base de datos local.', 'success');
  };

  // Auto-Save Draft (1.5s debounce)
  useEffect(() => {
    if (!hasUnsavedDraft) return;
    const timer = setTimeout(async () => {
      await db.works.update(workId, { draftContent: draftText, updatedAt: Date.now() });
      setHasUnsavedDraft(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, [draftText, hasUnsavedDraft, workId]);

  // Browser beforeunload guard for unsaved draft
  useEffect(() => {
    if (!hasUnsavedDraft) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedDraft]);

  // Smart Formatting for Draft Textarea (Bold, Italic, Headings, Lists, Blockquotes, APA Tables)
  const applyDraftFormatting = (type: DraftFormattingType) => {
    const textarea = draftTextareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const { updatedText, newCursorStart, newCursorEnd } = computeDraftFormatting(
      draftText,
      start,
      end,
      type
    );

    setDraftText(updatedText);
    setHasUnsavedDraft(true);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorStart, newCursorEnd);
    }, 0);
  };

  // Keyboard shortcuts Ctrl+S (save), Ctrl+B (bold), Ctrl+I (italic)
  const saveDraftRef = React.useRef(handleSaveDraft);
  saveDraftRef.current = handleSaveDraft;
  const applyDraftFormattingRef = React.useRef(applyDraftFormatting);
  applyDraftFormattingRef.current = applyDraftFormatting;

  useEffect(() => {
    if (activeTab !== 'draft') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveDraftRef.current();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        if (document.activeElement === draftTextareaRef.current) {
          e.preventDefault();
          applyDraftFormattingRef.current('bold');
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'i') {
        if (document.activeElement === draftTextareaRef.current) {
          e.preventDefault();
          applyDraftFormattingRef.current('italic');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab]);

  if (!work) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-[#8D99AE]">Cargando espacio de trabajo...</p>
      </div>
    );
  }

  // Word count calculation
  const wordCount = draftText.trim() ? draftText.trim().split(/\s+/).length : 0;
  const targetWordCount = work.instructionAnalysis?.wordCountTarget || 2500;
  const wordProgressPct = Math.min(100, Math.round((wordCount / targetWordCount) * 100));

  // Assignment Delivery Celebration
  const handleMarkDelivered = async () => {
    const newStatus = work.status === 'ENTREGADO' ? 'REDACTANDO' : 'ENTREGADO';
    await db.works.update(workId, { status: newStatus, updatedAt: Date.now() });

    if (newStatus === 'ENTREGADO') {
      triggerCelebrationConfetti();
      window.dispatchEvent(new CustomEvent('work-delivered', { detail: { title: work.title } }));
      showToast('¡Felicitaciones!', 'Trabajo marcado como ENTREGADO. El conocimiento ha sido preservado.', 'success');
    }
  };

  // Insert Citation into Draft
  const handleInsertCitation = (source: Source, type: 'parenthetical' | 'narrative') => {
    const refNum = workSources.findIndex((ws) => ws.id === source.id) + 1;
    const citeText = type === 'parenthetical'
      ? formatInTextParenthetical(source, work.citationStyle, undefined, refNum || 1)
      : formatInTextNarrative(source, work.citationStyle, refNum || 1);

    setDraftText((prev) => `${prev} ${citeText}`);
    setHasUnsavedDraft(true);
    showToast('Cita insertada', `Añadida cita ${type} en estilo ${work.citationStyle}`, 'success');
  };

  // Copy Google Docs Rich Text
  const handleCopyGoogleDocsHtml = async () => {
    const workToExport = { ...work, draftContent: draftText };
    const html = generateGoogleDocsRichHTML(workToExport, workSources, userProfile, course?.name, course?.teacherName);
    const plainFallback = draftText.trim() || `${work.title}\n${course?.name || ''}\n${userProfile?.name || 'Estudiante'}`;
    const ok = await copyRichReference(plainFallback, html);
    if (ok) {
      showToast('Copiado para Google Docs', 'Pega directamente en tu documento manteniendo portada APA 7 y sangría francesa.', 'success');
    } else {
      showToast('Error', 'No se pudo copiar al portapapeles.', 'error');
    }
  };

  // Download .ics Calendar File
  const handleDownloadICS = () => {
    const icsContent = generateICSFile(work, course?.name);
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Entrega_${work.title.replace(/\s+/g, '_')}.ics`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Evento creado', 'Archivo .ics descargado para importar a Google/Apple Calendar.', 'success');
  };

  // Update Work Status (supports all 7 academic statuses)
  const handleStatusChange = async (newStatus: WorkStatus) => {
    await db.works.update(work.id, { status: newStatus, updatedAt: Date.now() });
    if (newStatus === 'ENTREGADO') {
      triggerCelebrationConfetti();
      window.dispatchEvent(new CustomEvent('work-delivered', { detail: { title: work.title } }));
    } else {
      showToast('Estado actualizado', `El trabajo cambió a "${WORK_STATUS_META[newStatus]?.label || newStatus}".`, 'success');
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6 animate-fade-in pb-12">
      {/* Top Header Cockpit */}
      <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-[#FDF2F0] via-white to-[#F3E5F5] border border-[#E8A598]/40 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 sm:p-2.5 rounded-xl bg-white text-[#5A6275] hover:text-[#2B2D42] hover:bg-[#F5F1EB] border border-[#EBE5DF] transition-all cursor-pointer shadow-2xs shrink-0"
              title="Volver al listado de trabajos"
              aria-label="Volver al listado de trabajos"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-bold text-[#2B2D42]"
                  style={{
                    backgroundColor: course?.color ? `${course.color}25` : '#FAF8F5',
                    border: `1px solid ${course?.color ? `${course.color}50` : '#EBE5DF'}`
                  }}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: course?.color || '#D98880' }}
                  />
                  <span>{course?.name || 'Materia'}</span>
                </span>
                <CitationStyleBadge style={work.citationStyle} />
                <select
                  value={work.status}
                  onChange={(e) => handleStatusChange(e.target.value as WorkStatus)}
                  className="bg-white text-[#2B2D42] text-xs font-bold border border-[#EBE5DF] rounded-lg px-2.5 py-0.5 focus:outline-none focus:ring-2 focus:ring-[#E8A598] cursor-pointer shadow-2xs hover:border-[#E8A598]"
                  title="Cambiar estado del trabajo"
                >
                  {Object.entries(WORK_STATUS_META).map(([statusKey, meta]) => (
                    <option key={statusKey} value={statusKey}>
                      {meta.label}{statusKey === 'ENTREGADO' ? ' 🎉' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <h2 className="text-base sm:text-xl font-extrabold text-[#2B2D42] tracking-tight leading-snug">
                {work.title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsEditWorkModalOpen(true)}
              icon={<Edit3 className="w-4 h-4 text-[#8C3A32]" />}
              title="Editar parámetros, consignas y fechas del trabajo"
              className="font-bold shadow-2xs"
            >
              Editar Trabajo
            </Button>

            {/* Split-View Toggle for Tablets / Large screens */}
            <Button
              variant={splitMode ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setSplitMode(!splitMode)}
              icon={<Columns className="w-4 h-4" />}
              title="Alternar vista dividida (Split View)"
              className="font-bold shadow-2xs"
            >
              {splitMode ? 'Vista Dividida Activa' : 'Split View'}
            </Button>

            <Button
              variant={work.status === 'ENTREGADO' ? 'secondary' : 'mint'}
              size="sm"
              onClick={handleMarkDelivered}
              icon={<CheckCircle2 className="w-4 h-4" />}
              className="font-bold shadow-2xs"
            >
              {work.status === 'ENTREGADO' ? 'Reabrir Trabajo' : 'Marcar Entregado'}
            </Button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <Tabs
        tabs={[
          { id: 'overview', label: 'Resumen', icon: <GraduationCap className="w-4 h-4" /> },
          { id: 'instructions', label: 'Indicaciones del Docente', icon: <FileText className="w-4 h-4" /> },
          { id: 'checklist', label: 'Tareas & Criterios', icon: <CheckSquare className="w-4 h-4" />, badge: tasks.filter(t => !t.isCompleted).length },
          { id: 'inquiries', label: 'Consultas al Docente', icon: <HelpCircle className="w-4 h-4" />, badge: inquiries.length },
          { id: 'sources', label: 'Fuentes y Libros', icon: <BookOpen className="w-4 h-4" />, badge: workSources.length },
          { id: 'draft', label: 'Redacción & Citas', icon: <FileText className="w-4 h-4" /> },
          { id: 'export', label: 'Exportar a Google Docs', icon: <Share2 className="w-4 h-4" /> }
        ]}
        activeTab={activeTab}
        onChange={(tab) => setActiveTab(tab as WorkspaceTab)}
      />

      {/* Main Workspace Layout (Supports Split-View on Tablet/Desktop) */}
      <div className={`grid gap-5 ${splitMode ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
        {/* LEFT PANEL / MAIN VIEW */}
        <div className="space-y-5">
          {/* 1. OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="space-y-5">
              {/* Progress & Target Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card variant="default">
                  <span className="text-xs text-[#5A6275] font-semibold">Fecha Límite</span>
                  <p className="text-sm sm:text-base font-extrabold text-[#2B2D42] mt-1">
                    {new Date(work.deadline).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}
                  </p>
                  <span className="text-[11px] text-[#D98880] font-semibold">
                    {Math.ceil((work.deadline - Date.now()) / 86400000)} días restantes
                  </span>
                </Card>

                <Card variant="default">
                  <span className="text-xs text-[#5A6275] font-semibold">Progreso de Palabras</span>
                  <p className="text-sm sm:text-base font-extrabold text-[#2B2D42] mt-1">
                    {wordCount} / {targetWordCount} palabras
                  </p>
                  <div className="w-full bg-[#EBE5DF] h-1.5 rounded-full mt-2 overflow-hidden">
                    <div className="bg-[#E8A598] h-full transition-all" style={{ width: `${wordProgressPct}%` }} />
                  </div>
                </Card>

                <Card variant="default">
                  <span className="text-xs text-[#5A6275] font-semibold">Fuentes Indexadas</span>
                  <p className="text-sm sm:text-base font-extrabold text-[#2B2D42] mt-1">
                    {workSources.length} de {work.minRequiredSources || 4} requeridas
                  </p>
                  <span className="text-[11px] text-emerald-700 font-semibold">
                    {workSources.filter((s) => s.verificationStatus === 'VERIFIED').length} verificadas
                  </span>
                </Card>
              </div>

              {/* Quick Actions and External Links */}
              <Card variant="pastel_rose" className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-sm text-[#8C3A32] flex items-center gap-1.5">
                      <Link2 className="w-4 h-4 text-[#8C3A32]" />
                      <span>Integraciones de Google Docs & Canva</span>
                    </h4>
                    <p className="text-xs text-[#5A6275] mt-0.5">
                      Vincula tu borrador en la nube y diapositivas para abrirlos o crearlos con un clic.
                    </p>
                  </div>

                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<Edit3 className="w-3.5 h-3.5 text-[#8C3A32]" />}
                    onClick={() => {
                      setEditGoogleDocUrl(work.googleDocUrl || '');
                      setEditCanvaUrl(work.canvaUrl || '');
                      setIsLinksModalOpen(true);
                    }}
                    className="shrink-0"
                  >
                    {work.googleDocUrl || work.canvaUrl ? 'Editar Enlaces' : 'Vincular Enlaces'}
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-[#E8A598]/40">
                  {/* Google Docs Tile */}
                  <div className="p-3 rounded-xl bg-white border border-[#EBE5DF] flex items-center justify-between gap-2 shadow-2xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold text-xs text-[#2B2D42] block truncate">Google Docs</span>
                        <span className="text-[11px] text-[#5A6275] block truncate">
                          {work.googleDocUrl ? 'Documento Vinculado' : 'Sin vincular aún'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {work.googleDocUrl ? (
                        <a
                          href={work.googleDocUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" /> Abrir
                        </a>
                      ) : (
                        <a
                          href="https://docs.new"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#F5F1EB] hover:bg-[#EBE5DF] text-[#5A6275] text-[11px] font-bold transition-colors"
                          title="Abrir docs.new para crear un documento nuevo"
                        >
                          <Plus className="w-3 h-3" /> Crear Doc
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Canva Tile */}
                  <div className="p-3 rounded-xl bg-white border border-[#EBE5DF] flex items-center justify-between gap-2 shadow-2xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                        <Layout className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold text-xs text-[#2B2D42] block truncate">Canva Diapositivas</span>
                        <span className="text-[11px] text-[#5A6275] block truncate">
                          {work.canvaUrl ? 'Presentación Vinculada' : 'Sin vincular aún'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {work.canvaUrl ? (
                        <a
                          href={work.canvaUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 text-xs font-bold transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" /> Abrir
                        </a>
                      ) : (
                        <a
                          href="https://www.canva.com/presentations/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#F5F1EB] hover:bg-[#EBE5DF] text-[#5A6275] text-[11px] font-bold transition-colors"
                          title="Abrir Canva para crear diapositivas"
                        >
                          <Plus className="w-3 h-3" /> Crear Slides
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* 2. INSTRUCTIONS TAB (Explicit Official Requirements vs AI Inferences) */}
          {activeTab === 'instructions' && (
            <div className="space-y-4">
              <Card variant="default">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-sm text-[#2B2D42] flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#D98880]" />
                    <span>Consigna Textual Original</span>
                  </h4>
                  <Button
                    variant="secondary"
                    size="sm"
                    isLoading={isAnalyzingConsigna}
                    icon={<Sparkles className="w-3.5 h-3.5 text-[#8C3A32]" />}
                    onClick={async () => {
                      if (!work.rawInstructions) {
                        showToast('Sin consigna', 'Ingresa las consignas oficiales antes de analizar con IA.', 'warning');
                        return;
                      }
                      setIsAnalyzingConsigna(true);
                      try {
                        const analysis = await analyzeInstructionsWithAI(work.rawInstructions);
                        await db.works.update(workId, { instructionAnalysis: analysis, updatedAt: Date.now() });
                        showToast('Análisis completado', 'Requisitos explícitos e inferencias actualizadas con IA.', 'success');
                      } catch {
                        showToast('Error', 'No se pudo analizar la consigna.', 'error');
                      } finally {
                        setIsAnalyzingConsigna(false);
                      }
                    }}
                  >
                    Reanalizar Consigna con IA
                  </Button>
                </div>
                <div className="p-3.5 rounded-xl bg-[#F5F1EB]/80 text-xs text-[#2B2D42] whitespace-pre-wrap leading-relaxed font-mono">
                  {work.rawInstructions || 'Sin consigna registrada. Puedes añadirla en cualquier momento.'}
                </div>
              </Card>

              {/* Explicit Requirements from Professor */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card variant="elevated" className="border-l-4 border-l-[#2E7D32]">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 uppercase tracking-wider mb-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Requisitos Explícitos del Profesor (Oficial)</span>
                  </div>
                  <ul className="space-y-2 text-xs text-[#2B2D42]">
                    {(work.instructionAnalysis?.explicitRequirements || [
                      'Extensión objetivo según rúbrica',
                      `Estilo de citación obligatorio: ${work.citationStyle}`
                    ]).map((req, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-emerald-600 font-bold">•</span>
                        <span>{req}</span>
                      </li>
                    ))}
                  </ul>
                </Card>

                {/* AI Inferences (Clearly separated to prevent hallucination) */}
                <Card variant="subtle" className="border-l-4 border-l-[#B39DDB]">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#6A1B9A] uppercase tracking-wider mb-2">
                    <Sparkles className="w-4 h-4 text-[#6A1B9A]" />
                    <span>Sugerencias e Inferencias con IA (No Oficial)</span>
                  </div>
                  <ul className="space-y-2 text-xs text-[#5A6275]">
                    {(work.instructionAnalysis?.aiInferences || [
                      'Sugerencia: estructurar esquema con Introducción, Desarrollo argumentativo y Conclusiones.'
                    ]).map((inf, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-[#6A1B9A] font-bold">•</span>
                        <span>{inf}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              </div>
            </div>
          )}

          {/* 3. CHECKLIST TAB */}
          {activeTab === 'checklist' && (
            <Card variant="default" className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm text-[#2B2D42]">Checklist de Entregables & Tareas</h4>
                <span className="text-xs text-[#5A6275]">
                  {tasks.filter((t) => t.isCompleted).length} de {tasks.length} completadas
                </span>
              </div>

              {/* Add Task Input & Priority Selector */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="flex-1 min-w-0">
                  <Input
                    placeholder="Añadir nuevo entregable o tarea..."
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    onKeyDown={async (e) => {
                      if (e.key === 'Enter' && newTaskTitle.trim()) {
                        await db.tasks.add({
                          id: generateId('task'),
                          workId,
                          courseId: work.courseId,
                          title: newTaskTitle.trim(),
                          isCompleted: false,
                          priority: newTaskPriority,
                          category: 'ASSIGNMENT_CHECKLIST',
                          createdAt: Date.now(),
                          updatedAt: Date.now()
                        });
                        setNewTaskTitle('');
                      }
                    }}
                  />
                </div>
                <div className="w-full sm:w-40 shrink-0">
                  <Select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value as TaskPriority)}
                  >
                    <option value="LOW">Prioridad Baja</option>
                    <option value="MEDIUM">Prioridad Media</option>
                    <option value="HIGH">Prioridad Alta</option>
                    <option value="URGENT">Urgente</option>
                  </Select>
                </div>
                <Button
                  variant="primary"
                  size="md"
                  onClick={async () => {
                    if (!newTaskTitle.trim()) return;
                    await db.tasks.add({
                      id: generateId('task'),
                      workId,
                      courseId: work.courseId,
                      title: newTaskTitle.trim(),
                      isCompleted: false,
                      priority: newTaskPriority,
                      category: 'ASSIGNMENT_CHECKLIST',
                      createdAt: Date.now(),
                      updatedAt: Date.now()
                    });
                    setNewTaskTitle('');
                  }}
                  icon={<Plus className="w-4 h-4" />}
                  className="shrink-0"
                >
                  Añadir
                </Button>
              </div>

              {/* Tasks List */}
              <div className="space-y-2 pt-2">
                {tasks.length === 0 ? (
                  <p className="text-xs text-[#8D99AE] py-4 text-center italic bg-[#F5F1EB]/40 rounded-2xl border border-dashed border-[#EBE5DF]">
                    No hay tareas registradas para este trabajo. ¡Añade una arriba!
                  </p>
                ) : (
                  tasks.map((t) => {
                    const priorityConfig = {
                      URGENT: { variant: 'rose' as const, label: 'Urgente' },
                      HIGH: { variant: 'amber' as const, label: 'Prioridad Alta' },
                      MEDIUM: { variant: 'lavender' as const, label: 'Media' },
                      LOW: { variant: 'mint' as const, label: 'Baja' }
                    }[t.priority || 'MEDIUM'] || { variant: 'default' as const, label: 'Media' };

                    return (
                      <div
                        key={t.id}
                        className={`flex items-center justify-between gap-3 p-3 rounded-2xl border transition-all ${
                          t.isCompleted
                            ? 'bg-[#F5F1EB]/50 border-[#EBE5DF] opacity-60'
                            : 'bg-white border-[#EBE5DF] hover:border-[#E8A598]'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <input
                            type="checkbox"
                            checked={t.isCompleted}
                            onChange={async () => {
                              await db.tasks.update(t.id, {
                                isCompleted: !t.isCompleted,
                                completedAt: !t.isCompleted ? Date.now() : undefined,
                                updatedAt: Date.now()
                              });
                            }}
                            className="rounded border-[#EBE5DF] text-[#E8A598] focus:ring-[#E8A598] cursor-pointer shrink-0 w-4 h-4"
                          />
                          <span
                            className={`text-xs font-semibold break-words [overflow-wrap:anywhere] min-w-0 flex-1 ${
                              t.isCompleted ? 'line-through text-[#8D99AE]' : 'text-[#2B2D42]'
                            }`}
                          >
                            {t.title}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant={priorityConfig.variant} size="sm">
                            {priorityConfig.label}
                          </Badge>
                          <button
                            onClick={async () => {
                              await db.tasks.delete(t.id);
                              showToast('Tarea eliminada', 'La tarea ha sido retirada.', 'info');
                            }}
                            className="p-1 text-[#8D99AE] hover:text-[#C62828] hover:bg-[#F5F1EB] rounded-lg transition-colors cursor-pointer"
                            title="Eliminar tarea"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </Card>
          )}

          {/* 4. INQUIRIES TO TEACHER TAB */}
          {activeTab === 'inquiries' && (
            <div className="space-y-4">
              <Card variant="default" className="space-y-3">
                <h4 className="font-bold text-sm text-[#2B2D42]">Registrar Nueva Consulta al Profesor</h4>
                <Input
                  label="Tema de la Duda"
                  placeholder="e.g. Inclusión de fuente seminal fuera de rango de 5 años"
                  value={newInquiryTopic}
                  onChange={(e) => setNewInquiryTopic(e.target.value)}
                />
                <TextArea
                  label="Duda Informal"
                  placeholder="Escribe tu duda..."
                  rows={2}
                  value={newInquiryDoubt}
                  onChange={(e) => setNewInquiryDoubt(e.target.value)}
                />
                <div className="flex justify-end gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      isLoading={isFormulating}
                      icon={<Sparkles className="w-3.5 h-3.5" />}
                      onClick={async () => {
                        if (!newInquiryTopic.trim()) {
                          showToast('Tema requerido', 'Por favor ingresa el tema de la consulta.', 'warning');
                          return;
                        }
                        if (!newInquiryDoubt.trim()) {
                          showToast('Duda requerida', 'Por favor describe tu duda para el profesor.', 'warning');
                          return;
                        }
                        setIsFormulating(true);
                        try {
                          const formal = await formulateQuestionForTeacher(
                            newInquiryDoubt.trim(),
                            course?.name || 'Materia',
                            course?.teacherName
                          );
                          await db.inquiries.add({
                            id: generateId('inq'),
                            workId,
                            courseId: work.courseId,
                            topic: newInquiryTopic.trim(),
                            rawQuestion: newInquiryDoubt.trim(),
                            formalQuestion: formal,
                            status: 'DRAFT',
                            createdAt: Date.now(),
                            updatedAt: Date.now()
                          });
                          setNewInquiryTopic('');
                          setNewInquiryDoubt('');
                          showToast('Consulta guardada', 'Registrada y formulada formalmente con IA.', 'success');
                        } catch {
                          showToast('Error', 'No se pudo formular la consulta con IA.', 'error');
                        } finally {
                          setIsFormulating(false);
                        }
                      }}
                    >
                      Guardar y Formular con IA
                    </Button>
                </div>
              </Card>

              {/* Existing Inquiries List */}
              <div className="space-y-3">
                {inquiries.map((inq) => (
                  <Card key={inq.id} variant="elevated" className="space-y-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
                      <h4 className="font-bold text-sm text-[#2B2D42]">{inq.topic}</h4>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {inq.status !== 'ANSWERED' && (
                          <button
                            type="button"
                            onClick={async () => {
                              const nextStatus = inq.status === 'DRAFT' ? 'SENT' : 'DRAFT';
                              await db.inquiries.update(inq.id, { status: nextStatus, updatedAt: Date.now() });
                              showToast(
                                nextStatus === 'SENT' ? 'Marcada como Enviada' : 'Marcada como Borrador',
                                'Estado de la consulta actualizado.',
                                'info'
                              );
                            }}
                            className="text-[10px] font-bold text-[#5A6275] bg-[#F5F1EB] hover:bg-[#EBE5DF] px-2 py-0.5 rounded-md cursor-pointer transition-colors"
                            title="Cambiar estado"
                          >
                            {inq.status === 'DRAFT' ? 'Marcar Enviada' : 'Marcar Borrador'}
                          </button>
                        )}
                        <Badge
                          variant={inq.status === 'ANSWERED' ? 'mint' : inq.status === 'SENT' ? 'lavender' : 'amber'}
                          size="sm"
                        >
                          {inq.status === 'ANSWERED' ? 'Respuesta Oficial Recibida' : inq.status === 'SENT' ? 'Enviada al Docente' : 'Borrador'}
                        </Badge>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#EBE5DF] text-xs space-y-1.5 shadow-2xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-[10px] uppercase tracking-wider text-[#8C3A32]">
                          Consulta Formal para el Profesor:
                        </span>
                        <button
                          onClick={async () => {
                            const ok = await copyText(inq.formalQuestion);
                            if (ok) {
                              setCopiedInquiryId(inq.id);
                              showToast('Mensaje copiado', 'Consulta formal copiada al portapapeles.', 'success');
                              setTimeout(() => setCopiedInquiryId(null), 2000);
                            } else {
                              showToast('Error', 'No se pudo copiar al portapapeles.', 'error');
                            }
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-[#8C3A32] hover:text-[#2B2D42] bg-white px-2.5 py-1 rounded-lg border border-[#EBE5DF] transition-colors cursor-pointer shadow-2xs"
                          title="Copiar texto formal"
                        >
                          {copiedInquiryId === inq.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span>¡Copiado!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copiar Mensaje</span>
                            </>
                          )}
                        </button>
                      </div>
                      <p className="text-[#2B2D42] whitespace-pre-line leading-relaxed">{inq.formalQuestion}</p>
                    </div>

                    {inq.teacherAnswer ? (
                      <div className="p-3.5 rounded-2xl bg-emerald-50/90 border border-emerald-200 text-xs space-y-1 shadow-2xs">
                        <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                          <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                          <span>Respuesta Oficial de {course?.teacherName || 'Profesor/a'}:</span>
                        </div>
                        <p className="text-emerald-950 leading-relaxed">{inq.teacherAnswer}</p>
                        {inq.bindingDecision && (
                          <div className="mt-2 pt-2 border-t border-emerald-200 font-semibold text-emerald-800">
                            Directriz vinculante: {inq.bindingDecision}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/70 space-y-2 shadow-2xs">
                        <span className="text-xs font-semibold text-amber-900 block">
                          ¿El docente ya respondió esta duda? Registra la respuesta para que sea vinculante en el trabajo:
                        </span>
                        <TextArea
                          rows={2}
                          placeholder="Pega aquí la respuesta oficial dada por el docente..."
                          value={inquiryTeacherAnswers[inq.id] || ''}
                          onChange={(e) =>
                            setInquiryTeacherAnswers((prev) => ({
                              ...prev,
                              [inq.id]: e.target.value
                            }))
                          }
                        />
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={async () => {
                            const answer = (inquiryTeacherAnswers[inq.id] || '').trim();
                            if (!answer) return;
                            await db.inquiries.update(inq.id, {
                              teacherAnswer: answer,
                              status: 'ANSWERED',
                              answeredDate: Date.now(),
                              updatedAt: Date.now()
                            });
                            setInquiryTeacherAnswers((prev) => {
                              const copy = { ...prev };
                              delete copy[inq.id];
                              return copy;
                            });
                            showToast('Respuesta guardada', 'La respuesta oficial del profesor ha sido registrada.', 'success');
                          }}
                        >
                          Guardar Respuesta Oficial
                        </Button>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* 5. SOURCES & AGE COMPLIANCE TAB */}
          {activeTab === 'sources' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-[#2B2D42]">Fuentes del Trabajo & Control de Antigüedad</h4>
                  <p className="text-xs text-[#5A6275]">
                    Límite de antigüedad sugerido: últimos {work.maxSourceAgeYears || 5} años.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {workSources.map((source) => {
                  const ageCheck = validateSourceAge(source, work);
                  return (
                    <Card key={source.id} variant="elevated" className="space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h5 className="font-bold text-sm text-[#2B2D42]">{source.title}</h5>
                          <p className="text-xs text-[#5A6275] mt-0.5">
                            {(source.authors || []).map((a) => `${a.lastName}, ${a.firstName}`).join('; ')} ({source.year}) • {source.publication}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <VerificationBadge status={source.verificationStatus} />
                          <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold border flex items-center gap-1 ${ageCheck.badgeColor}`}>
                            {ageCheck.iconType === 'valid' ? (
                              <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                            ) : ageCheck.iconType === 'warning' ? (
                              <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                            ) : (
                              <AlertCircle className="w-3 h-3 text-rose-600 shrink-0" />
                            )}
                            <span>{source.year}</span>
                          </span>
                        </div>
                      </div>

                      {/* Age Compliance Note */}
                      <p className="text-xs text-[#5A6275] italic bg-[#F5F1EB]/60 p-2 rounded-xl">
                        {ageCheck.message}
                      </p>

                      {/* Citation Previews & Direct Insertion */}
                      <div className="space-y-2 pt-2 border-t border-[#EBE5DF]">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          {/* Parenthetical insertion preview */}
                          <div className="p-2.5 rounded-xl bg-[#FAF8F5] border border-[#EBE5DF] flex items-center justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <span className="text-[10px] font-bold text-[#8C3A32] uppercase block">
                                Cita Parentética
                              </span>
                              <code className="text-[11px] font-mono text-[#2B2D42] truncate block">
                                {formatInTextParenthetical(
                                  source,
                                  work.citationStyle,
                                  undefined,
                                  workSources.findIndex((ws) => ws.id === source.id) + 1 || 1
                                )}
                              </code>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleInsertCitation(source, 'parenthetical')}
                              icon={<Plus className="w-3.5 h-3.5" />}
                              className="shrink-0 text-xs font-bold text-[#8C3A32]"
                              title="Insertar al final de la idea en el borrador"
                            >
                              Insertar
                            </Button>
                          </div>

                          {/* Narrative insertion preview */}
                          <div className="p-2.5 rounded-xl bg-[#FAF8F5] border border-[#EBE5DF] flex items-center justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <span className="text-[10px] font-bold text-[#8C3A32] uppercase block">
                                Cita Narrativa
                              </span>
                              <code className="text-[11px] font-mono text-[#2B2D42] truncate block">
                                {formatInTextNarrative(
                                  source,
                                  work.citationStyle,
                                  workSources.findIndex((ws) => ws.id === source.id) + 1 || 1
                                )}
                              </code>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleInsertCitation(source, 'narrative')}
                              icon={<Plus className="w-3.5 h-3.5" />}
                              className="shrink-0 text-xs font-bold text-[#2B2D42]"
                              title="Insertar autor en la redacción"
                            >
                              Insertar
                            </Button>
                          </div>
                        </div>

                        {/* Historical context toggle */}
                        <div className="flex justify-end pt-1">
                          <button
                            onClick={async () => {
                              await db.sources.update(source.id, {
                                historicalContextApproved: !source.historicalContextApproved,
                                updatedAt: Date.now()
                              });
                            }}
                            className={`text-[11px] px-2.5 py-1 rounded-xl font-semibold border transition-all cursor-pointer ${
                              source.historicalContextApproved
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-[#F5F1EB] text-[#5A6275] border-[#EBE5DF] hover:bg-[#EBE5DF]'
                            }`}
                          >
                            {source.historicalContextApproved ? '✓ Excepción Seminal Aprobada' : 'Aprobar como Contexto Histórico'}
                          </button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>

              {/* Registered Citations List */}
              {citations.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-[#EBE5DF]">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm text-[#2B2D42]">Citas & Trazabilidad Registradas ({citations.length})</h4>
                    <span className="text-[11px] font-bold text-[#8C3A32] bg-[#FDF2F0] px-2.5 py-0.5 rounded-lg border border-[#E8A598]/40">
                      {work.citationStyle}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {citations.map((c) => (
                      <div key={c.id} className="p-3 rounded-2xl bg-[#FAF8F5] border border-[#EBE5DF] space-y-1.5 shadow-2xs">
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="font-bold text-[#8C3A32]">{c.inTextNarrative || c.inTextParenthetical}</span>
                          <span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded-md border border-[#EBE5DF] text-[#5A6275]">{c.style}</span>
                        </div>
                        <p className="text-xs text-[#2B2D42] font-serif leading-relaxed pl-3 border-l-2 border-[#E8A598]">
                          {c.fullReferenceFormatted}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 6. DRAFT & EDITOR TAB */}
          {activeTab === 'draft' && (
            <Card variant="default" className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="font-bold text-sm text-[#2B2D42]">Borrador Académico</h4>
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-[#5A6275] mt-1">
                    <span className="font-bold text-[#2B2D42] bg-[#F5F1EB] px-2 py-0.5 rounded-md border border-[#EBE5DF]">
                      {wordCount} palabras
                    </span>
                    <span className="bg-[#FAF8F5] px-2 py-0.5 rounded-md border border-[#EBE5DF]">
                      ~{Math.max(1, Math.ceil(wordCount / 200))} min de lectura
                    </span>
                    <span className="font-bold text-[#8C3A32] bg-[#FDF2F0] px-2 py-0.5 rounded-md border border-[#E8A598]/40">
                      Estilo {work.citationStyle}
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium">
                      {hasUnsavedDraft ? '🟡 Guardando...' : '🟢 Autoguardado activo'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-[#5A6275] hidden sm:inline">
                    Atajo: <kbd className="px-1.5 py-0.5 bg-[#F5F1EB] rounded text-[10px] font-mono border border-[#EBE5DF]">Ctrl + S</kbd>
                  </span>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleSaveDraft}
                    disabled={!hasUnsavedDraft}
                  >
                    {hasUnsavedDraft ? 'Guardar Cambios' : 'Guardado'}
                  </Button>
                </div>
              </div>

              {work.instructionAnalysis?.wordCountTarget && (
                <div className="p-2.5 rounded-xl bg-[#F5F1EB]/60 space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-[#5A6275]">
                    <span>Meta de la consigna: {work.instructionAnalysis.wordCountTarget} palabras</span>
                    <span className="font-bold text-[#2B2D42]">{Math.min(100, Math.round((wordCount / work.instructionAnalysis.wordCountTarget) * 100))}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-[#EBE5DF] overflow-hidden">
                    <div
                      className="h-full bg-[#E8A598] rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, (wordCount / work.instructionAnalysis.wordCountTarget) * 100)}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Quick Citation Bar for Drafting */}
              {workSources.length > 0 && (
                <div className="p-3 rounded-2xl bg-[#FAF8F5] border border-[#EBE5DF] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-[#8C3A32] uppercase tracking-wider flex items-center gap-1">
                      <BookMarked className="w-3.5 h-3.5" />
                      <span>Citas Rápidas de tus Fuentes (Haz clic para insertar en el borrador)</span>
                    </span>
                    <span className="text-[10px] text-[#8D99AE]">
                      Estilo {work.citationStyle.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 tab-scroll-pc scroll-touch touch-pan-x flex-nowrap">
                    {workSources.map((s, idx) => {
                      const refNum = idx + 1;
                      const parenthetical = formatInTextParenthetical(s, work.citationStyle, undefined, refNum);
                      const narrative = formatInTextNarrative(s, work.citationStyle, refNum);
                      return (
                        <div key={s.id} className="flex items-center gap-1 shrink-0 bg-white p-1 rounded-xl border border-[#EBE5DF] shadow-2xs">
                          <button
                            type="button"
                            onClick={() => handleInsertCitation(s, 'parenthetical')}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold text-[#8C3A32] bg-[#FDF2F0] hover:bg-[#E8A598]/40 transition-colors cursor-pointer flex items-center gap-1"
                            title={`Insertar al final: ${parenthetical}`}
                            aria-label={`Insertar cita parentética: ${parenthetical}`}
                          >
                            <Plus className="w-3 h-3 shrink-0 stroke-[2.5]" />
                            <span>{parenthetical}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleInsertCitation(s, 'narrative')}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold text-[#2B2D42] bg-[#F5F1EB] hover:bg-[#EBE5DF] transition-colors cursor-pointer flex items-center gap-1"
                            title={`Insertar en redacción: ${narrative}`}
                            aria-label={`Insertar cita narrativa: ${narrative}`}
                          >
                            <Plus className="w-3 h-3 shrink-0 stroke-[2.5]" />
                            <span>{narrative}</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Mini Word / Markdown Formatting Toolbar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[#5A6275]">
                    Editor de Redacción (Formato APA 7 / Markdown)
                  </label>
                  <span className="text-[11px] text-[#8D99AE]">Selecciona texto para aplicar formato rápido</span>
                </div>

                <div className="flex items-center gap-1.5 p-1.5 bg-[#F5F1EB] rounded-xl border border-[#EBE5DF] overflow-x-auto tab-scroll-pc scroll-touch touch-pan-x flex-nowrap">
                  {/* Negrita */}
                  <button
                    type="button"
                    onClick={() => applyDraftFormatting('bold')}
                    className="p-1.5 sm:px-2.5 sm:py-1 bg-white hover:bg-[#FDF2F0] rounded-lg text-xs font-bold text-[#2B2D42] hover:text-[#8C3A32] border border-[#EBE5DF] shadow-2xs whitespace-nowrap cursor-pointer flex items-center gap-1.5 transition-colors"
                    title="Negrita (Ctrl + B)"
                    aria-label="Insertar o alternar texto en negrita"
                  >
                    <Bold className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Negrita</span>
                  </button>

                  {/* Cursiva */}
                  <button
                    type="button"
                    onClick={() => applyDraftFormatting('italic')}
                    className="p-1.5 sm:px-2.5 sm:py-1 bg-white hover:bg-[#FDF2F0] rounded-lg text-xs font-bold text-[#2B2D42] hover:text-[#8C3A32] border border-[#EBE5DF] shadow-2xs whitespace-nowrap cursor-pointer flex items-center gap-1.5 transition-colors"
                    title="Cursiva (Ctrl + I)"
                    aria-label="Insertar o alternar texto en cursiva"
                  >
                    <Italic className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Cursiva</span>
                  </button>

                  {/* Título Nivel 2 */}
                  <button
                    type="button"
                    onClick={() => applyDraftFormatting('h2')}
                    className="p-1.5 sm:px-2.5 sm:py-1 bg-white hover:bg-[#F5F1EB] rounded-lg text-xs font-bold text-[#2B2D42] border border-[#EBE5DF] shadow-2xs whitespace-nowrap cursor-pointer flex items-center gap-1.5 transition-colors"
                    title="Título de Sección (Nivel 2)"
                    aria-label="Insertar título de sección"
                  >
                    <Heading2 className="w-3.5 h-3.5 text-[#8C3A32]" />
                    <span className="hidden sm:inline">Título</span>
                  </button>

                  {/* Subtítulo Nivel 3 */}
                  <button
                    type="button"
                    onClick={() => applyDraftFormatting('h3')}
                    className="p-1.5 sm:px-2.5 sm:py-1 bg-white hover:bg-[#F5F1EB] rounded-lg text-xs font-bold text-[#2B2D42] border border-[#EBE5DF] shadow-2xs whitespace-nowrap cursor-pointer flex items-center gap-1.5 transition-colors"
                    title="Subtítulo (Nivel 3)"
                    aria-label="Insertar subtítulo"
                  >
                    <Heading3 className="w-3.5 h-3.5 text-[#8C3A32]" />
                    <span className="hidden sm:inline">Subtítulo</span>
                  </button>

                  {/* Lista con viñetas */}
                  <button
                    type="button"
                    onClick={() => applyDraftFormatting('bullet')}
                    className="p-1.5 sm:px-2.5 sm:py-1 bg-white hover:bg-[#F5F1EB] rounded-lg text-xs font-bold text-[#2B2D42] border border-[#EBE5DF] shadow-2xs whitespace-nowrap cursor-pointer flex items-center gap-1.5 transition-colors"
                    title="Lista con Viñetas (Aplica a todas las líneas seleccionadas)"
                    aria-label="Insertar o alternar lista con viñetas"
                  >
                    <List className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Viñeta</span>
                  </button>

                  {/* Lista numerada */}
                  <button
                    type="button"
                    onClick={() => applyDraftFormatting('number')}
                    className="p-1.5 sm:px-2.5 sm:py-1 bg-white hover:bg-[#F5F1EB] rounded-lg text-xs font-bold text-[#2B2D42] border border-[#EBE5DF] shadow-2xs whitespace-nowrap cursor-pointer flex items-center gap-1.5 transition-colors"
                    title="Lista Numerada 1, 2, 3... (Aplica a todas las líneas seleccionadas)"
                    aria-label="Insertar o alternar lista numerada"
                  >
                    <ListOrdered className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Numerada</span>
                  </button>

                  {/* Cita en Bloque (+40 palabras APA) */}
                  <button
                    type="button"
                    onClick={() => applyDraftFormatting('quote')}
                    className="p-1.5 sm:px-2.5 sm:py-1 bg-white hover:bg-[#FDF2F0] rounded-lg text-xs font-bold text-[#8C3A32] border border-[#EBE5DF] shadow-2xs whitespace-nowrap cursor-pointer flex items-center gap-1.5 transition-colors"
                    title="Cita Textual en Bloque APA 7 (+40 palabras)"
                    aria-label="Insertar cita en bloque"
                  >
                    <Quote className="w-3.5 h-3.5 text-[#D98880]" />
                    <span className="hidden sm:inline">Cita en Bloque</span>
                  </button>

                  {/* Tabla APA 7 */}
                  <button
                    type="button"
                    onClick={() => applyDraftFormatting('table')}
                    className="p-1.5 sm:px-2.5 sm:py-1 bg-white hover:bg-[#F5F1EB] rounded-lg text-xs font-bold text-[#2B2D42] border border-[#EBE5DF] shadow-2xs whitespace-nowrap cursor-pointer flex items-center gap-1.5 transition-colors"
                    title="Insertar Tabla con formato estándar APA 7"
                    aria-label="Insertar tabla APA 7"
                  >
                    <TableIcon className="w-3.5 h-3.5 text-[#80CBC4]" />
                    <span className="hidden sm:inline">Tabla APA</span>
                  </button>
                </div>

                <TextArea
                  ref={draftTextareaRef}
                  id="work-draft-textarea"
                  rows={16}
                  value={draftText}
                  onChange={(e) => {
                    setDraftText(e.target.value);
                    setHasUnsavedDraft(true);
                  }}
                  className="font-serif leading-relaxed text-sm"
                  placeholder="Comienza a redactar tu ensayo o trabajo aquí. Usa la barra superior de herramientas para negritas, subtítulos, listas, citas en bloque o tablas APA..."
                />
              </div>

              {/* Live Canonical References Section (French Indentation) */}
              {workSources.length > 0 && (
                <div className="p-4 rounded-2xl bg-gradient-to-br from-[#FDF2F0] via-white to-white border border-[#E8A598]/60 space-y-3 shadow-2xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-[#D98880]" />
                      <h5 className="font-extrabold text-xs text-[#2B2D42] uppercase tracking-wider">
                        Lista de Referencias Generada ({work.citationStyle.replace('_', ' ')})
                      </h5>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={async () => {
                        const allRefs = workSources
                          .map((s) => formatFullReference(s, work.citationStyle))
                          .sort()
                          .join('\n\n');
                        const allRefsHtml = workSources
                          .map((s) => `<p style="padding-left:1.5rem;text-indent:-1.5rem;margin-bottom:8pt;">${formatFullReferenceHTML(s, work.citationStyle)}</p>`)
                          .sort()
                          .join('\n');
                        const ok = await copyRichReference(allRefs, allRefsHtml);
                        if (ok) {
                          showToast('Referencias copiadas', 'Lista completa con formato cursiva copiada al portapapeles.', 'success');
                        } else {
                          showToast('Error', 'No se pudo copiar al portapapeles.', 'error');
                        }
                      }}
                      icon={<Copy className="w-3.5 h-3.5" />}
                      className="font-bold text-xs self-start sm:self-center"
                    >
                      Copiar Todas las Referencias
                    </Button>
                  </div>

                  <div className="space-y-2.5 pt-1">
                    {workSources
                      .map((s) => formatFullReference(s, work.citationStyle))
                      .sort()
                      .map((refText, idx) => (
                        <p
                          key={idx}
                          className="text-xs text-[#2B2D42] font-serif leading-relaxed break-words [overflow-wrap:anywhere]"
                          style={{ paddingLeft: '1.5rem', textIndent: '-1.5rem' }}
                        >
                          {refText}
                        </p>
                      ))}
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* 7. EXPORT TAB */}
          {activeTab === 'export' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Google Docs Export */}
                <Card variant="elevated" className="space-y-3 flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-[#2B2D42] flex items-center gap-2">
                      <Share2 className="w-4 h-4 text-[#D98880]" />
                      <span>Google Docs (Sangría Francesa)</span>
                    </h4>
                    <p className="text-xs text-[#5A6275] mt-1 leading-relaxed">
                      Copia el borrador completo junto con la lista de referencias bibliográficas en formato Rich Text para pegarlo en Google Docs.
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    size="md"
                    onClick={handleCopyGoogleDocsHtml}
                    icon={<Copy className="w-4 h-4" />}
                  >
                    Copiar Formato Google Docs
                  </Button>
                </Card>

                {/* Google Calendar / .ICS */}
                <Card variant="elevated" className="space-y-3 flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-[#2B2D42] flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-[#FFB300]" />
                      <span>Google Calendar & .ICS</span>
                    </h4>
                    <p className="text-xs text-[#5A6275] mt-1 leading-relaxed">
                      Sincroniza la fecha de entrega con tu calendario personal para recibir alertas automáticas.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <a
                      href={generateGoogleCalendarUrl(work, course?.name)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-[#EBE5DF] text-xs font-bold text-[#2B2D42] hover:bg-[#F5F1EB] shadow-xs"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Abrir Google Cal
                    </a>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleDownloadICS}
                    >
                      Descargar .ics
                    </Button>
                  </div>
                </Card>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT PANEL (ONLY IN SPLIT-VIEW MODE ON TABLET/DESKTOP) */}
        {splitMode && (
          <div className="space-y-4 border-l border-[#EBE5DF] pl-5">
            <h4 className="font-bold text-sm text-[#2B2D42]">Panel Secundario de Apoyo</h4>
            <div className="space-y-3">
              {workSources.map((s) => (
                <div key={s.id} className="p-3 rounded-2xl bg-white border border-[#EBE5DF] text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#2B2D42] truncate">{s.title}</span>
                    <VerificationBadge status={s.verificationStatus} />
                  </div>
                  <p className="text-[#5A6275] line-clamp-2">{s.abstract || 'Sin resumen disponible.'}</p>
                    <div className="flex justify-end gap-1.5 pt-1">
                      <button
                        onClick={() => handleInsertCitation(s, 'parenthetical')}
                        className="text-[11px] font-bold text-[#8C3A32] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3 stroke-[2.5]" />
                        <span>Citar</span>
                      </button>
                    </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Edit Google Docs & Canva Links Modal */}
      {isLinksModalOpen && (
        <Modal
          isOpen={isLinksModalOpen}
          onClose={() => setIsLinksModalOpen(false)}
          title="Vincular Google Docs & Canva"
          subtitle="Guarda los enlaces directos a tus archivos de trabajo en la nube"
          maxWidth="md"
        >
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Input
                label="Enlace de Google Docs (Borrador Oficial)"
                placeholder="https://docs.google.com/document/d/..."
                value={editGoogleDocUrl}
                onChange={(e) => setEditGoogleDocUrl(e.target.value)}
                leftIcon={<FileText className="w-4 h-4 text-blue-500" />}
              />
              <div className="flex justify-between items-center text-[11px] text-[#5A6275] px-1">
                <span>Pega el link de tu Google Doc</span>
                <a
                  href="https://docs.new"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#8C3A32] font-semibold hover:underline inline-flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" /> Crear nuevo en docs.new
                </a>
              </div>
            </div>

            <div className="space-y-1.5">
              <Input
                label="Enlace de Canva (Diapositivas / Infografía)"
                placeholder="https://www.canva.com/design/..."
                value={editCanvaUrl}
                onChange={(e) => setEditCanvaUrl(e.target.value)}
                leftIcon={<Layout className="w-4 h-4 text-purple-500" />}
              />
              <div className="flex justify-between items-center text-[11px] text-[#5A6275] px-1">
                <span>Pega el link de tu diseño en Canva</span>
                <a
                  href="https://www.canva.com/presentations/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#8C3A32] font-semibold hover:underline inline-flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" /> Ir a Canva
                </a>
              </div>
            </div>

            <div className="pt-3 border-t border-[#EBE5DF] flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <Button variant="ghost" onClick={() => setIsLinksModalOpen(false)} className="w-full sm:w-auto">
                Cancelar
              </Button>
              <Button
                variant="primary"
                onClick={async () => {
                  await db.works.update(workId, {
                    googleDocUrl: editGoogleDocUrl.trim() || undefined,
                    canvaUrl: editCanvaUrl.trim() || undefined,
                    updatedAt: Date.now()
                  });
                  showToast('Enlaces actualizados', 'Google Docs y Canva vinculados al trabajo.', 'success');
                  setIsLinksModalOpen(false);
                }}
                className="w-full sm:w-auto font-bold"
              >
                Guardar Enlaces
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Work Modal */}
      {work && (
        <WorkModal
          isOpen={isEditWorkModalOpen}
          onClose={() => setIsEditWorkModalOpen(false)}
          workToEdit={work}
          onDeleted={onBack}
        />
      )}
    </div>
  );
};
