import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Edit3,
  Eye,
  Trash2,
  Share2,
  FolderDown,
  Sparkles,
  Link2
} from 'lucide-react';
import { db } from '../../db';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Input, TextArea, Select } from '../../components/common/Input';
import { Badge } from '../../components/common/Badge';
import { useToast } from '../../components/common/Toast';
import { FormattedNoteContent } from './WikiLinkRenderer';
import type { Note, Concept, Course, Work, ParaCategory } from '../../types';

export interface NoteViewerModalProps {
  note: Note | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectNote: (note: Note) => void;
  onOpenWork?: (workId: string) => void;
  notes: Note[];
  concepts: Concept[];
  courses: Course[];
  works: Work[];
}

export const NoteViewerModal: React.FC<NoteViewerModalProps> = ({
  note,
  isOpen,
  onClose,
  onSelectNote,
  onOpenWork,
  notes,
  concepts,
  courses,
  works
}) => {
  const { showToast } = useToast();
  const [mode, setMode] = useState<'view' | 'edit'>('view');

  // Resolve the active live note from live notes collection or fallback to prop
  const currentNote = note ? (notes.find((n) => n.id === note.id) || note) : null;

  // Edit fields
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editCategory, setEditCategory] = useState<ParaCategory>('ATOMIC');
  const [editCourseId, setEditCourseId] = useState('');
  const [editWorkId, setEditWorkId] = useState('');
  const [editTags, setEditTags] = useState('');
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);

  // Sync state when note opens or when currentNote updates
  useEffect(() => {
    if (currentNote) {
      setEditTitle(currentNote.title);
      setEditContent(currentNote.content);
      setEditCategory(currentNote.paraCategory);
      setEditCourseId(currentNote.courseId || '');
      setEditWorkId(currentNote.workId || '');
      setEditTags((currentNote.tags || []).join(', '));
      setIsConfirmDeleteOpen(false);
    }
  }, [currentNote?.id, currentNote?.updatedAt]);

  // Reset to view mode on open/close
  useEffect(() => {
    if (isOpen) {
      setMode('view');
    }
  }, [isOpen, note?.id]);

  // Handle Save
  const handleSave = async () => {
    if (!currentNote) return;
    if (!editTitle.trim()) {
      showToast('Título requerido', 'Por favor ingresa un título para la nota.', 'warning');
      return;
    }

    const baseSlug = editTitle
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '') || currentNote.slug;

    let updatedSlug = baseSlug;
    let counter = 2;
    while (notes.some((n) => n.id !== currentNote.id && n.slug === updatedSlug)) {
      updatedSlug = `${baseSlug}-${counter}`;
      counter++;
    }

    const parsedTags = editTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
      .map((t) => (t.startsWith('#') ? t : `#${t}`));

    const updatedData = {
      slug: updatedSlug,
      title: editTitle.trim(),
      content: editContent.trim(),
      paraCategory: editCategory,
      courseId: editCourseId || undefined,
      workId: editWorkId || undefined,
      tags: parsedTags,
      updatedAt: Date.now()
    };

    const updatedNote: Note = {
      ...currentNote,
      ...updatedData
    };

    try {
      await db.notes.update(currentNote.id, updatedData);
      onSelectNote(updatedNote);
      showToast('Nota guardada', 'Cambios sincronizados en el Segundo Cerebro.', 'success');
      setMode('view');
    } catch {
      showToast('Error', 'No se pudo guardar la nota en la base de datos.', 'error');
    }
  };

  const handleSaveRef = useRef(handleSave);
  handleSaveRef.current = handleSave;

  // Keyboard shortcut Ctrl+S (Must be declared before any conditional return)
  useEffect(() => {
    if (!isOpen || mode !== 'edit' || !currentNote) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSaveRef.current();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, mode, currentNote]);

  if (!currentNote) return null;

  const currentCourse = courses.find((c) => c.id === currentNote.courseId);
  const currentWork = works.find((w) => w.id === currentNote.workId);

  // Find incoming backlinks (notes that mention this note's title in their content, accent-insensitive)
  const normalizeBacklinkText = (str: string) =>
    str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const noteTitleNorm = normalizeBacklinkText(currentNote.title);
  const noteSlugNorm = normalizeBacklinkText(currentNote.slug);

  const backlinks = notes.filter((n) => {
    if (n.id === currentNote.id) return false;
    if ((n.backlinks || []).includes(currentNote.id)) return true;
    const contentNorm = normalizeBacklinkText(n.content);
    return (
      contentNorm.includes(`[[${noteTitleNorm}]]`) ||
      contentNorm.includes(`[[${noteSlugNorm}]]`)
    );
  });

  // Handle Delete
  const handleDelete = async () => {
    try {
      await db.notes.delete(currentNote.id);
      showToast('Nota eliminada', 'La nota ha sido retirada de tu Segundo Cerebro.', 'info');
      setIsConfirmDeleteOpen(false);
      onClose();
    } catch {
      showToast('Error', 'No se pudo eliminar la nota de la base de datos.', 'error');
    }
  };

  // Insert helper text into editor
  const insertText = (snippet: string) => {
    setEditContent((prev) => prev + (prev.endsWith('\n') || !prev ? '' : '\n') + snippet);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'view' ? currentNote.title : 'Editar Nota'}
      subtitle={
        currentCourse
          ? `${currentCourse.name} • ${currentCourse.period}`
          : 'Segundo Cerebro • Ideas Conectadas'
      }
      maxWidth="xl"
    >
      <div className="space-y-4">
        {/* Mode Switcher & Category Ribbon */}
        <div className="flex items-center justify-between gap-2 border-b border-[#EBE5DF] pb-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            {currentNote.paraCategory === 'PROJECT' ? (
              <span className="text-[11px] font-extrabold uppercase tracking-wider bg-[#F3E5F5] text-[#6A1B9A] border border-[#CE93D8]/50 px-2.5 py-1 rounded-xl">
                Proyecto / Trabajo
              </span>
            ) : currentNote.paraCategory === 'AREA' ? (
              <span className="text-[11px] font-extrabold uppercase tracking-wider bg-[#E3F2FD] text-[#1565C0] border border-[#90CAF9]/50 px-2.5 py-1 rounded-xl">
                Materia
              </span>
            ) : currentNote.paraCategory === 'RESOURCE' ? (
              <span className="text-[11px] font-extrabold uppercase tracking-wider bg-[#E0F2F1] text-[#00695C] border border-[#80CBC4]/50 px-2.5 py-1 rounded-xl">
                Recurso de Estudio
              </span>
            ) : currentNote.paraCategory === 'ARCHIVE' ? (
              <span className="text-[11px] font-extrabold uppercase tracking-wider bg-[#F5F1EB] text-[#5A6275] border border-[#EBE5DF] px-2.5 py-1 rounded-xl">
                Archivada
              </span>
            ) : (
              <span className="text-[11px] font-extrabold uppercase tracking-wider bg-[#FDF2F0] text-[#8C3A32] border border-[#E8A598]/50 px-2.5 py-1 rounded-xl">
                Idea Rápida
              </span>
            )}
            {currentWork && (
              <span className="text-[11px] font-bold text-[#2B2D42] bg-[#F5F1EB] px-2.5 py-1 rounded-xl border border-[#EBE5DF] break-words leading-snug max-w-[220px]">
                {currentWork.title}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 bg-[#F5F1EB] p-1 rounded-xl border border-[#EBE5DF]">
            <button
              onClick={() => setMode('view')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                mode === 'view'
                  ? 'bg-white text-[#2B2D42] shadow-2xs'
                  : 'text-[#5A6275] hover:text-[#2B2D42]'
              }`}
              title="Modo Lectura"
              aria-label="Modo de solo lectura"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Lectura</span>
            </button>
            <button
              onClick={() => setMode('edit')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                mode === 'edit'
                  ? 'bg-white text-[#2B2D42] shadow-2xs'
                  : 'text-[#5A6275] hover:text-[#2B2D42]'
              }`}
              title="Modo Edición"
              aria-label="Modo de edición"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Editar</span>
            </button>
          </div>
        </div>

        {/* ─── 1. READING MODE (Full Formatted Content & Clickable Wiki-Links) ─── */}
        {mode === 'view' && (
          <div className="space-y-5">
            {/* Formatted Content with Interactive Wiki-Links */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#EBE5DF] shadow-2xs min-h-[160px]">
              <FormattedNoteContent
                content={currentNote.content}
                notes={notes}
                concepts={concepts}
                courses={courses}
                works={works}
                onNavigateToNote={(targetNote) => onSelectNote(targetNote)}
                onNavigateToWork={onOpenWork}
                onCreateMissingNote={(missingTitle) => {
                  showToast(
                    'Enlace pendiente',
                    `No existe una nota llamada "${missingTitle}". Puedes crearla desde el botón de Nueva Nota.`,
                    'info'
                  );
                }}
              />
            </div>

            {/* Tags Ribbon */}
            {currentNote.tags && currentNote.tags.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs text-[#8D99AE] font-semibold">Etiquetas:</span>
                {currentNote.tags.map((t, idx) => (
                  <span
                    key={idx}
                    className="text-xs bg-[#F5F1EB] text-[#5A6275] px-2.5 py-0.5 rounded-lg font-medium border border-[#EBE5DF]"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}

            {/* Backlinks & Connected Notes Section */}
            {backlinks.length > 0 && (
              <div className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#EBE5DF] space-y-2">
                <h5 className="font-extrabold text-xs text-[#8C3A32] flex items-center gap-1.5 uppercase tracking-wider">
                  <Link2 className="w-3.5 h-3.5 text-[#D98880]" />
                  <span>Notas Conectadas que mencionan esta idea ({backlinks.length})</span>
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {backlinks.map((bNote) => (
                    <button
                      key={bNote.id}
                      onClick={() => onSelectNote(bNote)}
                      className="p-2.5 rounded-xl bg-white border border-[#EBE5DF] hover:border-[#E8A598] hover:shadow-2xs text-left transition-all cursor-pointer flex items-center justify-between group"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="font-bold text-xs text-[#2B2D42] block truncate group-hover:text-[#8C3A32]">
                          {bNote.title}
                        </span>
                        <span className="text-[10px] text-[#8D99AE]">
                          {bNote.paraCategory === 'PROJECT' ? 'Trabajo' : 'Nota'}
                        </span>
                      </div>
                      <span className="text-xs text-[#D98880] font-bold shrink-0 ml-2">→</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Bottom Actions */}
            <div className="pt-2 border-t border-[#EBE5DF] flex items-center justify-between gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsConfirmDeleteOpen(true)}
                icon={<Trash2 className="w-3.5 h-3.5 text-[#C62828]" />}
                className="text-[#C62828] hover:bg-red-50"
              >
                Eliminar Nota
              </Button>

              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={onClose}>
                  Cerrar
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setMode('edit')}
                  icon={<Edit3 className="w-3.5 h-3.5" />}
                >
                  Editar Contenido
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ─── 2. EDITING MODE ─── */}
        {mode === 'edit' && (
          <div className="space-y-4">
            <Input
              label="Título de la Nota *"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="e.g. Regulación Emocional en Psicología"
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Select
                label="Categoría"
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value as ParaCategory)}
              >
                <option value="ATOMIC">Idea Rápida</option>
                <option value="PROJECT">Proyecto / Trabajo</option>
                <option value="AREA">Materia</option>
                <option value="RESOURCE">Recurso de Estudio</option>
                <option value="ARCHIVE">Archivada</option>
              </Select>

              <Select
                label="Curso Asociado"
                value={editCourseId}
                onChange={(e) => setEditCourseId(e.target.value)}
              >
                <option value="">Sin curso específico</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>

              <Select
                label="Trabajo Asignado"
                value={editWorkId}
                onChange={(e) => setEditWorkId(e.target.value)}
              >
                <option value="">Sin trabajo vinculado</option>
                {works.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.title}
                  </option>
                ))}
              </Select>
            </div>

            {/* Quick Inserters Toolbar */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#5A6275]">
                  Contenido en Markdown
                </label>
                <span className="text-[11px] text-[#8D99AE]">Usa [[enlace]] para conectar</span>
              </div>

              <div className="flex items-center gap-1.5 p-1.5 bg-[#F5F1EB] rounded-xl border border-[#EBE5DF] overflow-x-auto no-scrollbar">
                <button
                  type="button"
                  onClick={() => insertText('[[Nombre de otra Nota]]')}
                  className="px-2 py-1 bg-white hover:bg-[#FDF2F0] rounded-lg text-xs font-bold text-[#8C3A32] border border-[#EBE5DF] shadow-2xs whitespace-nowrap cursor-pointer"
                  title="Insertar Enlace Wiki"
                  aria-label="Insertar enlace wiki"
                >
                  [[Enlace Wiki]]
                </button>
                <button
                  type="button"
                  onClick={() => insertText('**Texto en Negrita**')}
                  className="px-2 py-1 bg-white hover:bg-[#F5F1EB] rounded-lg text-xs font-bold text-[#2B2D42] border border-[#EBE5DF] shadow-2xs whitespace-nowrap cursor-pointer"
                  title="Insertar Texto en Negrita"
                  aria-label="Insertar texto en negrita"
                >
                  **Negrita**
                </button>
                <button
                  type="button"
                  onClick={() => insertText('## Subtítulo')}
                  className="px-2 py-1 bg-white hover:bg-[#F5F1EB] rounded-lg text-xs font-bold text-[#2B2D42] border border-[#EBE5DF] shadow-2xs whitespace-nowrap cursor-pointer"
                  title="Insertar Título de Nivel 2"
                  aria-label="Insertar subtítulo"
                >
                  ## Título
                </button>
                <button
                  type="button"
                  onClick={() => insertText('- Elemento de lista')}
                  className="px-2 py-1 bg-white hover:bg-[#F5F1EB] rounded-lg text-xs font-bold text-[#2B2D42] border border-[#EBE5DF] shadow-2xs whitespace-nowrap cursor-pointer"
                  title="Insertar Elemento de Lista"
                  aria-label="Insertar elemento de lista"
                >
                  - Lista
                </button>
                <button
                  type="button"
                  onClick={() => insertText('#psicologia #usmp #tesis')}
                  className="px-2 py-1 bg-white hover:bg-[#F5F1EB] rounded-lg text-xs font-bold text-[#2B2D42] border border-[#EBE5DF] shadow-2xs whitespace-nowrap cursor-pointer"
                  title="Insertar Etiquetas de Ejemplo"
                  aria-label="Insertar etiquetas de ejemplo"
                >
                  #Tags
                </button>
              </div>

              <TextArea
                rows={10}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                placeholder="Redacta tus notas con enlaces [[ideas]] y citas..."
                className="font-mono text-xs sm:text-sm leading-relaxed"
              />
            </div>

            <Input
              label="Etiquetas (separadas por comas)"
              value={editTags}
              onChange={(e) => setEditTags(e.target.value)}
              placeholder="psicologia, usmp, tesis, apa7"
            />

            <div className="pt-3 border-t border-[#EBE5DF] flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <Button variant="ghost" onClick={() => setMode('view')} className="w-full sm:w-auto">
                Cancelar
              </Button>
              <Button variant="primary" onClick={handleSave} className="w-full sm:w-auto font-bold">
                Guardar Cambios
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Custom Confirmation Modal for Deleting Note */}
      {isConfirmDeleteOpen && (
        <Modal
          isOpen={isConfirmDeleteOpen}
          onClose={() => setIsConfirmDeleteOpen(false)}
          title="¿Eliminar esta Nota?"
          subtitle={`Se eliminará "${currentNote.title}" de tu Segundo Cerebro`}
          maxWidth="sm"
        >
          <div className="space-y-4">
            <p className="text-xs text-[#5A6275] leading-relaxed">
              Esta acción retirará la nota de tus ideas conectadas. Los backlinks hacia esta nota quedarán archivados.
            </p>
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2 border-t border-[#EBE5DF]">
              <Button variant="ghost" onClick={() => setIsConfirmDeleteOpen(false)} className="w-full sm:w-auto">
                Cancelar
              </Button>
              <Button
                variant="primary"
                onClick={handleDelete}
                className="w-full sm:w-auto bg-[#C62828] hover:bg-[#B71C1C] text-white font-bold"
              >
                Eliminar Definitivamente
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </Modal>
  );
};
