import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Brain,
  Plus,
  FolderDown,
  FileText,
  Share2,
  Tag,
  Search,
  ExternalLink,
  BookOpen,
  GraduationCap,
  Sparkles,
  Lightbulb,
  Layers,
  Network
} from 'lucide-react';
import { db } from '../../db';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input, TextArea } from '../../components/common/Input';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { useToast } from '../../components/common/Toast';
import { exportVaultZip } from '../../utils/obsidianExporter';
import { InteractiveGraph } from './InteractiveGraph';
import { NoteViewerModal } from './NoteViewerModal';
import { generateId } from '../../utils/idHelper';
import { formatLocalDateForInput } from '../../utils/dateHelper';
import type { Note, Concept, ParaCategory, Course, Work, Source } from '../../types';

export interface BrainViewProps {
  onOpenQuickCapture: (tab?: 'note' | 'work' | 'course' | 'source' | 'inquiry' | 'task') => void;
  selectedNoteId?: string | null;
  onSelectNote?: (noteId: string | null) => void;
  onOpenWork?: (workId: string) => void;
}

export const BrainView: React.FC<BrainViewProps> = ({
  onOpenQuickCapture,
  selectedNoteId,
  onSelectNote,
  onOpenWork
}) => {
  const { showToast } = useToast();
  const [activeView, setActiveView] = useState<'notes' | 'graph'>('notes');
  const [paraFilter, setParaFilter] = useState<'ALL' | ParaCategory>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isNewConceptModalOpen, setIsNewConceptModalOpen] = useState(false);
  const [newConceptName, setNewConceptName] = useState('');
  const [newConceptDesc, setNewConceptDesc] = useState('');

  // Live queries
  const notes = useLiveQuery(() => db.notes.toArray()) || [];
  const concepts = useLiveQuery(() => db.concepts.toArray()) || [];
  const courses = useLiveQuery(() => db.courses.toArray()) || [];
  const works = useLiveQuery(() => db.works.toArray()) || [];
  const sources = useLiveQuery(() => db.sources.toArray()) || [];

  const coursesMap = React.useMemo(() => new Map(courses.map((c) => [c.id, c])), [courses]);
  const worksMap = React.useMemo(() => new Map(works.map((w) => [w.id, w])), [works]);

  // Open note if selected from props
  useEffect(() => {
    if (selectedNoteId) {
      const n = notes.find((item) => item.id === selectedNoteId);
      if (n) setEditingNote(n);
    }
  }, [selectedNoteId, notes]);

  // Export Obsidian Vault ZIP
  const handleExportObsidian = async () => {
    setIsExporting(true);
    try {
      const zipBlob = await exportVaultZip(notes, sources, works, courses, concepts);
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Alfajorcito_Notas_Obsidian_${formatLocalDateForInput(new Date())}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Notas exportadas', 'Archivo .zip listo para abrir en Obsidian con tus notas conectadas.', 'success');
    } catch {
      showToast('Error', 'No se pudo exportar el archivo.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // Save Concept
  const handleSaveConcept = async () => {
    if (!newConceptName.trim()) {
      showToast('Nombre requerido', 'Ingresa el nombre del concepto teórico.', 'warning');
      return;
    }
    const now = Date.now();
    await db.concepts.add({
      id: generateId('concept'),
      name: newConceptName.trim(),
      description: newConceptDesc.trim() || 'Concepto clave de psicología.',
      color: '#0D9488',
      createdAt: now,
      updatedAt: now
    });
    showToast(
      'Concepto creado',
      `"${newConceptName.trim()}" agregado al grafo. Conéctalo usando [[${newConceptName.trim()}]] en tus notas.`,
      'success'
    );
    setNewConceptName('');
    setNewConceptDesc('');
    setIsNewConceptModalOpen(false);
  };

  // Filtered Notes
  const filteredNotes = notes.filter((n) => {
    if (paraFilter !== 'ALL' && n.paraCategory !== paraFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchTitle = n.title.toLowerCase().includes(q);
      const matchContent = n.content.toLowerCase().includes(q);
      const matchTags = (n.tags || []).some((t) => t.toLowerCase().includes(q));
      if (!matchTitle && !matchContent && !matchTags) return false;
    }
    return true;
  });

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-[#FDF2F0] via-white to-[#F3E5F5] border border-[#E8A598]/40 shadow-xs">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#8C3A32] uppercase tracking-wider bg-[#FDF2F0] px-2.5 py-0.5 rounded-lg border border-[#E8A598]/50">
            <Brain className="w-3.5 h-3.5 text-[#D98880]" />
            <span>Gestión del Conocimiento</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#2B2D42] leading-tight">
            Segundo Cerebro & Notas Conectadas
          </h2>
          <p className="text-xs sm:text-sm text-[#5A6275]">
            Tus notas de estudio, conceptos y resúmenes conectados con enlaces wiki [[concepto]].
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <Button
            variant="secondary"
            size="md"
            onClick={handleExportObsidian}
            isLoading={isExporting}
            icon={<FolderDown className="w-4 h-4 text-[#8C3A32]" />}
            className="w-full sm:w-auto font-bold"
            title="Descargar para Obsidian (.zip)"
          >
            Exportar Obsidian
          </Button>

          <Button
            variant="secondary"
            size="md"
            onClick={() => setIsNewConceptModalOpen(true)}
            icon={<Lightbulb className="w-4 h-4 text-[#0D9488]" />}
            className="w-full sm:w-auto font-bold"
          >
            Nuevo Concepto
          </Button>

          <Button
            variant="primary"
            size="md"
            onClick={() => onOpenQuickCapture('note')}
            icon={<Plus className="w-4 h-4 stroke-[2.5]" />}
            className="w-full sm:w-auto font-bold shadow-xs"
          >
            Nueva Nota
          </Button>
        </div>
      </div>

      {/* Mode Switcher Segmented Tabs */}
      <div className="grid grid-cols-2 p-1 bg-[#F5F1EB] rounded-2xl border border-[#EBE5DF] gap-1">
        <button
          onClick={() => setActiveView('notes')}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer select-none ${
            activeView === 'notes'
              ? 'bg-white text-[#8C3A32] shadow-xs border border-[#E8A598]/40'
              : 'text-[#5A6275] hover:text-[#2B2D42]'
          }`}
        >
          <FileText className="w-4 h-4 text-[#D98880]" />
          <span>Mis Notas ({notes.length})</span>
        </button>
        <button
          onClick={() => setActiveView('graph')}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer select-none ${
            activeView === 'graph'
              ? 'bg-white text-[#8C3A32] shadow-xs border border-[#E8A598]/40'
              : 'text-[#5A6275] hover:text-[#2B2D42]'
          }`}
        >
          <Network className="w-4 h-4 text-[#D98880]" />
          <span>Grafo de Conocimiento</span>
        </button>
      </div>

      {/* 1. KNOWLEDGE GRAPH VIEW */}
      {activeView === 'graph' && (
        <div className="space-y-3">
          <InteractiveGraph
            notes={notes}
            courses={courses}
            works={works}
            concepts={concepts}
            onOpenNote={(n) => setEditingNote(n)}
            onOpenWork={onOpenWork}
          />
        </div>
      )}

      {/* 2. NOTES LIST VIEW */}
      {activeView === 'notes' && (
        <div className="space-y-4">
          {/* Instant Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-[#8D99AE] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar notas por título, etiqueta, contenido o enlace wiki..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2.5 bg-white rounded-xl border border-[#EBE5DF] text-xs sm:text-sm text-[#2B2D42] placeholder-[#8D99AE] focus:outline-none focus:ring-2 focus:ring-[#E8A598]"
            />
          </div>

          {/* Category Filter Pills */}
          <div
            onWheel={(e) => {
              if (e.deltaY !== 0) {
                e.currentTarget.scrollLeft += e.deltaY;
              }
            }}
            className="flex items-center gap-1.5 overflow-x-auto pb-1 tab-scroll-pc scroll-touch touch-pan-x flex-nowrap"
          >
            {[
              { id: 'ALL', label: `Todas (${notes.length})` },
              { id: 'ATOMIC', label: `Ideas Rápidas (${notes.filter((n) => n.paraCategory === 'ATOMIC').length})` },
              { id: 'PROJECT', label: `Proyectos & Trabajos (${notes.filter((n) => n.paraCategory === 'PROJECT').length})` },
              { id: 'AREA', label: `Materias (${notes.filter((n) => n.paraCategory === 'AREA').length})` },
              { id: 'RESOURCE', label: `Recursos (${notes.filter((n) => n.paraCategory === 'RESOURCE').length})` },
              { id: 'ARCHIVE', label: `Archivadas (${notes.filter((n) => n.paraCategory === 'ARCHIVE').length})` }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setParaFilter(tab.id as ParaCategory | 'ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer select-none shrink-0 ${
                  paraFilter === tab.id
                    ? 'bg-[#E8A598] text-[#2B2D42] shadow-2xs'
                    : 'bg-[#F5F1EB] text-[#5A6275] hover:bg-[#EBE5DF]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Notes Grid */}
          {filteredNotes.length === 0 ? (
            <Card variant="subtle" className="text-center py-12 px-4">
              <FileText className="w-8 h-8 text-[#8D99AE] mx-auto mb-2 opacity-60" />
              <p className="text-sm font-semibold text-[#5A6275]">No se encontraron notas con estos filtros.</p>
              <p className="text-xs text-[#8D99AE] mt-0.5">Prueba a buscar con otro término o crea una nueva nota de estudio.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredNotes.map((note) => {
                const course = note.courseId ? coursesMap.get(note.courseId) : undefined;
                const work = note.workId ? worksMap.get(note.workId) : undefined;

                // Count wiki-links in content
                const wikiLinkMatches = (note.content.match(/\[\[(.*?)\]\]/g) || []).length;

                const categoryBadge = (() => {
                  switch (note.paraCategory) {
                    case 'PROJECT':
                      return (
                        <span className="text-[11px] font-bold text-[#6A1B9A] bg-[#F3E5F5] px-2.5 py-0.5 rounded-lg border border-[#CE93D8]/50 truncate max-w-[150px]">
                          Proyecto / Trabajo
                        </span>
                      );
                    case 'AREA':
                      return (
                        <span className="text-[11px] font-bold text-[#1565C0] bg-[#E3F2FD] px-2.5 py-0.5 rounded-lg border border-[#90CAF9]/50 truncate max-w-[150px]">
                          Materia
                        </span>
                      );
                    case 'RESOURCE':
                      return (
                        <span className="text-[11px] font-bold text-[#00695C] bg-[#E0F2F1] px-2.5 py-0.5 rounded-lg border border-[#80CBC4]/50 truncate max-w-[150px]">
                          Recurso de Estudio
                        </span>
                      );
                    case 'ARCHIVE':
                      return (
                        <span className="text-[11px] font-bold text-[#5A6275] bg-[#F5F1EB] px-2.5 py-0.5 rounded-lg border border-[#EBE5DF] truncate max-w-[150px]">
                          Archivada
                        </span>
                      );
                    case 'ATOMIC':
                    default:
                      return (
                        <span className="text-[11px] font-bold text-[#8C3A32] bg-[#FDF2F0] px-2.5 py-0.5 rounded-lg border border-[#E8A598]/40 truncate max-w-[150px]">
                          Idea Rápida
                        </span>
                      );
                  }
                })();

                return (
                  <Card
                    key={note.id}
                    variant="interactive"
                    onClick={() => setEditingNote(note)}
                    className="p-4 rounded-2xl sm:rounded-3xl space-y-3 flex flex-col justify-between transition-all cursor-pointer"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        {categoryBadge}
                        {course && (
                          <span className="text-[11px] font-semibold text-[#5A6275] bg-[#F5F1EB] px-2 py-0.5 rounded-lg border border-[#EBE5DF] truncate max-w-[140px]">
                            {course.code || course.name}
                          </span>
                        )}
                      </div>

                      <h3 className="font-extrabold text-sm sm:text-base text-[#2B2D42] leading-snug line-clamp-2">
                        {note.title}
                      </h3>

                      <p className="text-xs text-[#5A6275] line-clamp-3 leading-relaxed">
                        {note.content.replace(/#+\s/g, '').replace(/\[\[|\]\]/g, '')}
                      </p>
                    </div>

                    <div className="pt-2.5 border-t border-[#EBE5DF] flex items-center justify-between gap-2 text-xs text-[#8D99AE]">
                      <div className="flex items-center gap-1 flex-wrap min-w-0">
                        {note.tags.slice(0, 2).map((tag, i) => (
                          <span key={i} className="text-[10px] bg-[#F5F1EB] px-1.5 py-0.5 rounded-md text-[#5A6275] font-medium truncate max-w-[90px]">
                            #{tag}
                          </span>
                        ))}
                      </div>

                      {wikiLinkMatches > 0 ? (
                        <span className="text-[11px] font-bold text-[#8C3A32] bg-[#FDF2F0] px-2 py-0.5 rounded-lg border border-[#E8A598]/40 shrink-0">
                          {wikiLinkMatches} {wikiLinkMatches === 1 ? 'enlace' : 'enlaces'}
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-[#8D99AE]">
                          [[nota]]
                        </span>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Note Viewer & Editor Modal with Interactive Wiki-Links */}
      <NoteViewerModal
        note={notes.find((n) => n.id === editingNote?.id) || editingNote}
        isOpen={!!editingNote}
        onClose={() => {
          setEditingNote(null);
          if (onSelectNote) onSelectNote(null);
        }}
        onSelectNote={(targetNote) => {
          setEditingNote(targetNote);
          if (onSelectNote) onSelectNote(targetNote.id);
        }}
        onOpenWork={onOpenWork}
        notes={notes}
        concepts={concepts}
        courses={courses}
        works={works}
      />

      {/* New Concept Creation Modal */}
      {isNewConceptModalOpen && (
        <Modal
          isOpen={isNewConceptModalOpen}
          onClose={() => setIsNewConceptModalOpen(false)}
          title="Nuevo Concepto Teórico"
          subtitle="Registra constructos, variables o teorías clave para conectar en tu Grafo"
          maxWidth="md"
        >
          <div className="space-y-4">
            <Input
              label="Nombre del Concepto o Constructo *"
              placeholder="e.g. Regulación Emocional, Autoeficacia, TCC, Burnout..."
              value={newConceptName}
              onChange={(e) => setNewConceptName(e.target.value)}
              autoFocus
            />
            <TextArea
              label="Definición o Marco Teórico"
              placeholder="Describe brevemente el significado científico o teórico de este concepto..."
              rows={3}
              value={newConceptDesc}
              onChange={(e) => setNewConceptDesc(e.target.value)}
            />
            <div className="p-3 rounded-2xl bg-[#E0F2F1]/60 border border-[#80CBC4]/60 text-xs text-[#004D40] space-y-1">
              <span className="font-bold block">💡 ¿Cómo se conecta con tus notas?</span>
              <p>
                Al crear un concepto, aparecerá como un nodo verde teal en el Grafo. Puedes vincular cualquier nota a este concepto escribiendo <code className="font-mono bg-white px-1 py-0.5 rounded border border-[#80CBC4] text-[#00695C]">[[{newConceptName.trim() || 'Nombre del Concepto'}]]</code> dentro del texto de la nota.
              </p>
            </div>
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2 border-t border-[#EBE5DF]">
              <Button variant="ghost" onClick={() => setIsNewConceptModalOpen(false)} className="w-full sm:w-auto">
                Cancelar
              </Button>
              <Button variant="primary" onClick={handleSaveConcept} className="w-full sm:w-auto font-bold">
                Guardar Concepto
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
