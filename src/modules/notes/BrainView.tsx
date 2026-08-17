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
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Live queries
  const notes = useLiveQuery(() => db.notes.toArray()) || [];
  const concepts = useLiveQuery(() => db.concepts.toArray()) || [];
  const courses = useLiveQuery(() => db.courses.toArray()) || [];
  const works = useLiveQuery(() => db.works.toArray()) || [];
  const sources = useLiveQuery(() => db.sources.toArray()) || [];

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
      a.download = `Alfajorcito_Notas_Obsidian_${new Date().toISOString().split('T')[0]}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Notas exportadas', 'Archivo .zip listo para abrir en Obsidian con tus notas conectadas.', 'success');
    } catch {
      showToast('Error', 'No se pudo exportar el archivo.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // Filtered Notes
  const filteredNotes = notes.filter((n) => {
    if (paraFilter !== 'ALL' && n.paraCategory !== paraFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#2B2D42]">
            Segundo Cerebro & Ideas Conectadas
          </h2>
          <p className="text-xs sm:text-sm text-[#5A6275] mt-0.5">
            Tus notas de estudio, conceptos y resúmenes conectados entre sí con enlaces [[wiki]].
          </p>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setActiveView(activeView === 'notes' ? 'graph' : 'notes')}
            icon={<Network className="w-4 h-4" />}
            className="flex-1 sm:flex-none"
          >
            {activeView === 'notes' ? (
              <span>Grafo<span className="hidden sm:inline"> de Conocimiento</span></span>
            ) : (
              <span><span className="hidden sm:inline">Lista de </span>Notas</span>
            )}
          </Button>
          <Button
            variant="lavender"
            size="sm"
            onClick={handleExportObsidian}
            isLoading={isExporting}
            icon={<FolderDown className="w-4 h-4" />}
            className="flex-1 sm:flex-none"
            title="Descargar para Obsidian (.zip)"
          >
            <span className="hidden sm:inline">Descargar para </span>Obsidian
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => onOpenQuickCapture('note')}
            icon={<Plus className="w-4 h-4 stroke-[2.5]" />}
            className="flex-1 sm:flex-none"
          >
            <span className="hidden sm:inline">Nueva </span>Nota
          </Button>
        </div>
      </div>

      {/* 1. KNOWLEDGE GRAPH VIEW (Interactive Graphify / Obsidian Style) */}
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
          {/* Category Filter Pills with PC mouse wheel scroll */}
          <div
            onWheel={(e) => {
              if (e.deltaY !== 0) {
                e.currentTarget.scrollLeft += e.deltaY;
              }
            }}
            className="flex items-center gap-1.5 tab-scroll-pc pb-1.5 flex-nowrap"
          >
            {[
              { id: 'ALL', label: 'Todas las Notas' },
              { id: 'ATOMIC', label: 'Ideas Rápidas' },
              { id: 'PROJECT', label: 'Proyectos & Tesis' },
              { id: 'AREA', label: 'Materias' },
              { id: 'RESOURCE', label: 'Material de Estudio' },
              { id: 'ARCHIVE', label: 'Archivadas' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setParaFilter(tab.id as ParaCategory | 'ALL')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer select-none shrink-0 ${
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
            <Card variant="subtle" className="text-center py-12">
              <p className="text-sm text-[#8D99AE]">No hay notas registradas en esta categoría.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredNotes.map((note) => {
                const course = courses.find((c) => c.id === note.courseId);
                const work = works.find((w) => w.id === note.workId);

                return (
                  <Card
                    key={note.id}
                    variant="interactive"
                    onClick={() => setEditingNote(note)}
                    className="space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold text-[#8C3A32] uppercase tracking-wider bg-[#FDF2F0] px-2 py-0.5 rounded-md">
                          {note.paraCategory === 'ATOMIC'
                            ? 'Idea Rápida'
                            : note.paraCategory === 'PROJECT'
                            ? 'Proyecto / Tesis'
                            : note.paraCategory === 'AREA'
                            ? 'Materia'
                            : note.paraCategory === 'RESOURCE'
                            ? 'Recurso'
                            : 'Archivo'}
                        </span>
                        {course && (
                          <span className="text-[10px] font-medium text-[#5A6275] truncate max-w-[120px]">
                            {course.name}
                          </span>
                        )}
                      </div>

                      <h3 className="font-extrabold text-sm text-[#2B2D42] leading-snug">
                        {note.title}
                      </h3>

                      <p className="text-xs text-[#5A6275] line-clamp-3 leading-relaxed font-mono">
                        {note.content.replace(/#+\s/g, '').replace(/\[\[|\]\]/g, '')}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-[#EBE5DF] flex items-center justify-between text-xs text-[#8D99AE]">
                      <div className="flex items-center gap-1 flex-wrap">
                        {note.tags.slice(0, 2).map((tag, i) => (
                          <span key={i} className="text-[10px] bg-[#F5F1EB] px-1.5 py-0.5 rounded text-[#5A6275]">
                            {tag}
                          </span>
                        ))}
                      </div>
                      <span className="text-[10px] font-mono text-[#8C3A32] font-semibold">[[enlace]]</span>
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
        note={editingNote}
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
    </div>
  );
};
