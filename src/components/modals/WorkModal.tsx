import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  FileText,
  Trash2,
  Calendar,
  BookOpen,
  GraduationCap,
  Sparkles,
  Link2,
  AlertTriangle,
  Clock,
  Layers
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input, Select, TextArea } from '../common/Input';
import { db } from '../../db';
import { useToast } from '../common/Toast';
import { triggerCelebrationConfetti } from '../../utils/confettiHelper';
import { dissociateWorkIdFromSources, WORK_DELETION_CONSEQUENCES, deleteAcademicWorkCascade } from '../../utils/academicWorkUtils';
import { generateId } from '../../utils/idHelper';
import { analyzeInstructionsWithAI } from '../../services/aiService';
import { formatLocalDateForInput, parseDeadlineTimestamp } from '../../utils/dateHelper';
import { sanitizeSafeUrl } from '../../utils/urlHelper';
import type { Work, WorkType, WorkStatus, CitationStyle, Course, UserProfile } from '../../types';

export interface WorkModalProps {
  isOpen: boolean;
  onClose: () => void;
  workToEdit?: Work | null;
  initialCourseId?: string;
  onDeleted?: () => void;
}

export const WorkModal: React.FC<WorkModalProps> = ({
  isOpen,
  onClose,
  workToEdit,
  initialCourseId,
  onDeleted
}) => {
  const { showToast } = useToast();
  const allCourses = useLiveQuery(() => db.courses.toArray()) || [];
  const courses = allCourses.filter((c) => !c.isArchived);
  const userProfileRecord = useLiveQuery(() => db.settings.get('user_profile'));
  const userProfile = userProfileRecord?.value as UserProfile | undefined;

  // Form states
  const [title, setTitle] = useState('');
  const [courseId, setCourseId] = useState('');
  const [type, setType] = useState<WorkType>('ENSAYO');
  const [status, setStatus] = useState<WorkStatus>('INVESTIGACION');
  const [deadlineStr, setDeadlineStr] = useState('');
  const [citationStyle, setCitationStyle] = useState<CitationStyle>('APA_7');
  const [minRequiredSources, setMinRequiredSources] = useState<number | string>(4);
  const [maxSourceAgeYears, setMaxSourceAgeYears] = useState<number | string>(5);
  const [rawInstructions, setRawInstructions] = useState('');
  const [googleDocUrl, setGoogleDocUrl] = useState('');
  const [canvaUrl, setCanvaUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);

  // Initialize or reset form when modal opens or workToEdit changes
  useEffect(() => {
    if (!isOpen) return;

    if (workToEdit) {
      setTitle(workToEdit.title || '');
      setCourseId(workToEdit.courseId || '');
      setType(workToEdit.type || 'ENSAYO');
      setStatus(workToEdit.status || 'INVESTIGACION');

      // Format date for HTML date input: YYYY-MM-DD
      setDeadlineStr(formatLocalDateForInput(workToEdit.deadline));

      setCitationStyle(workToEdit.citationStyle || userProfile?.defaultCitationStyle || 'APA_7');
      setMinRequiredSources(workToEdit.minRequiredSources ?? 4);
      setMaxSourceAgeYears(workToEdit.maxSourceAgeYears ?? 5);
      setRawInstructions(workToEdit.rawInstructions || '');
      setGoogleDocUrl(workToEdit.googleDocUrl || '');
      setCanvaUrl(workToEdit.canvaUrl || '');
    } else {
      setTitle('');
      setCourseId(initialCourseId || (courses.length > 0 ? courses[0].id : ''));
      setType('ENSAYO');
      setStatus('INVESTIGACION');

      // Default deadline: 7 days in the future
      setDeadlineStr(formatLocalDateForInput(Date.now() + 86400000 * 7));

      setCitationStyle(userProfile?.defaultCitationStyle || 'APA_7');
      setMinRequiredSources(4);
      setMaxSourceAgeYears(5);
      setRawInstructions('');
      setGoogleDocUrl('');
      setCanvaUrl('');
    }
  }, [workToEdit, isOpen, initialCourseId, courses.length, userProfile?.defaultCitationStyle]);

  const handleSaveWork = async () => {
    if (!title.trim()) {
      showToast('Título requerido', 'Por favor ingresa el título del trabajo o tesis.', 'warning');
      return;
    }

    if (!courseId) {
      showToast('Curso requerido', 'Selecciona la asignatura a la que pertenece este trabajo.', 'warning');
      return;
    }

    if (!deadlineStr) {
      showToast('Fecha requerida', 'Especifica la fecha límite de entrega.', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const now = Date.now();
      const deadlineTimestamp = parseDeadlineTimestamp(deadlineStr);
      const parsedMinSources = Math.max(1, parseInt(String(minRequiredSources), 10) || 4);
      const parsedMaxAge = Math.max(1, parseInt(String(maxSourceAgeYears), 10) || 5);

      if (workToEdit) {
        // Update existing work
        let updatedAnalysis = workToEdit.instructionAnalysis;
        if (rawInstructions.trim() && rawInstructions.trim() !== (workToEdit.rawInstructions || '')) {
          try {
            updatedAnalysis = await analyzeInstructionsWithAI(rawInstructions.trim());
          } catch {
            // Keep existing or fallback
          }
        }
        await db.works.update(workToEdit.id, {
          title: title.trim(),
          courseId,
          type,
          status,
          deadline: deadlineTimestamp,
          citationStyle,
          minRequiredSources: parsedMinSources,
          maxSourceAgeYears: parsedMaxAge,
          rawInstructions: rawInstructions.trim(),
          instructionAnalysis: updatedAnalysis,
          googleDocUrl: sanitizeSafeUrl(googleDocUrl),
          canvaUrl: sanitizeSafeUrl(canvaUrl),
          updatedAt: now
        });

        if (status === 'ENTREGADO' && workToEdit.status !== 'ENTREGADO') {
          triggerCelebrationConfetti();
          window.dispatchEvent(new CustomEvent('work-delivered', { detail: { title: title.trim() } }));
        }

        showToast('Trabajo actualizado', `"${title}" ha sido guardado exitosamente.`, 'success');
      } else {
        // Create new work
        let analysis = undefined;
        if (rawInstructions.trim()) {
          try {
            analysis = await analyzeInstructionsWithAI(rawInstructions.trim());
          } catch {
            // Offline fallback is handled inside analyzeInstructionsWithAI
          }
        }
        const newWorkId = generateId('work');
        await db.works.add({
          id: newWorkId,
          courseId,
          title: title.trim(),
          type,
          status,
          deadline: deadlineTimestamp,
          citationStyle,
          minRequiredSources: parsedMinSources,
          maxSourceAgeYears: parsedMaxAge,
          rawInstructions: rawInstructions.trim(),
          instructionAnalysis: analysis,
          googleDocUrl: sanitizeSafeUrl(googleDocUrl),
          canvaUrl: sanitizeSafeUrl(canvaUrl),
          isArchived: false,
          createdAt: now,
          updatedAt: now
        });

        showToast('Trabajo creado', `"${title}" añadido al planificador académico.`, 'success');
      }

      onClose();
    } catch (err) {
      console.error('Error saving work:', err);
      showToast('Error', 'No se pudo guardar el trabajo en la base de datos.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteWork = async () => {
    if (!workToEdit) return;

    try {
      await deleteAcademicWorkCascade(workToEdit.id);
      showToast('Trabajo eliminado', `"${workToEdit.title}" y sus tareas vinculadas han sido eliminados.`, 'info');
      setIsConfirmDeleteOpen(false);
      if (onDeleted) onDeleted();
      onClose();
    } catch (err) {
      console.error('Error deleting work:', err);
      showToast('Error', 'No se pudo eliminar el trabajo.', 'error');
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen && !isConfirmDeleteOpen}
        onClose={onClose}
        title={workToEdit ? 'Editar Trabajo o Tesis' : 'Nuevo Trabajo Académico'}
        subtitle={
          workToEdit
            ? 'Modifica los parámetros de entrega, estilo y consignas de tu investigación'
            : 'Registra un nuevo entregable, ensayo, proyecto o tesis'
        }
        maxWidth="lg"
      >
        <div className="space-y-4">
          {/* Título */}
          <Input
            label="Título del Trabajo / Tesis"
            placeholder="e.g. Ensayo sobre Regulación Emocional y Autoeficacia"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            leftIcon={<FileText className="w-4 h-4 text-[#D98880]" />}
          />

          {/* Asignatura y Tipo de Trabajo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Asignatura / Curso"
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
            >
              {courses.length === 0 ? (
                <option value="">No hay cursos registrados</option>
              ) : (
                courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code || 'USMP'})
                  </option>
                ))
              )}
            </Select>

            <Select
              label="Tipo de Entregable"
              value={type}
              onChange={(e) => setType(e.target.value as WorkType)}
            >
              <option value="ENSAYO">Ensayo Crítico</option>
              <option value="TESIS">Tesis / Proyecto de Investigación</option>
              <option value="MONOGRAFIA">Monografía</option>
              <option value="INFORME">Informe Académico / Clínico</option>
              <option value="PROYECTO">Proyecto de Curso</option>
              <option value="EXAMEN">Examen / Evaluación Parcial</option>
              <option value="PRESENTACION">Presentación / Diapositivas</option>
              <option value="OTRO">Otro Entregable</option>
            </Select>
          </div>

          {/* Estado, Fecha de Entrega y Estilo de Citación */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Select
              label="Estado Actual"
              value={status}
              onChange={(e) => setStatus(e.target.value as WorkStatus)}
            >
              <option value="PLANIFICACION">Planificación</option>
              <option value="INVESTIGACION">Investigando</option>
              <option value="REDACTANDO">Redactando</option>
              <option value="EN_REVISION">En Revisión</option>
              <option value="CORRECCION">En Corrección</option>
              <option value="ENTREGADO">Entregado 🎉</option>
              <option value="ARCHIVADO">Archivado</option>
            </Select>

            <Input
              label="Fecha Límite de Entrega"
              type="date"
              value={deadlineStr}
              onChange={(e) => setDeadlineStr(e.target.value)}
              leftIcon={<Calendar className="w-4 h-4 text-[#8D99AE]" />}
            />

            <Select
              label="Estilo de Citación"
              value={citationStyle}
              onChange={(e) => setCitationStyle(e.target.value as CitationStyle)}
            >
              <option value="APA_7">APA 7ma Edición</option>
              <option value="MLA_9">MLA 9na Edición</option>
              <option value="VANCOUVER">Vancouver (Salud/Médica)</option>
              <option value="IEEE">IEEE (Ingeniería)</option>
              <option value="CHICAGO_AUTHOR_DATE">Chicago (Autor-Fecha)</option>
              <option value="CHICAGO_NOTES">Chicago (Notas al Pie)</option>
            </Select>
          </div>

          {/* Requisitos de Fuentes */}
          <div className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#EBE5DF] space-y-3 shadow-2xs">
            <h4 className="font-bold text-xs uppercase tracking-wider text-[#8C3A32] flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-[#D98880]" />
              <span>Reglas de Fuentes & Validación Científica</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Mínimo de Fuentes Científicas Requeridas"
                type="number"
                min="1"
                max="50"
                value={minRequiredSources}
                onChange={(e) => setMinRequiredSources(parseInt(e.target.value, 10) || 1)}
              />

              <Input
                label="Antigüedad Máxima Sugerida (Años)"
                type="number"
                min="1"
                max="30"
                value={maxSourceAgeYears}
                onChange={(e) => setMaxSourceAgeYears(parseInt(e.target.value, 10) || 5)}
              />
            </div>
          </div>

          {/* Consignas e Indicaciones del Docente */}
          <TextArea
            label="Consignas / Indicaciones Oficiales del Docente"
            placeholder="Pega aquí las instrucciones completas dadas por el profesor o la rúbrica de evaluación..."
            rows={3}
            value={rawInstructions}
            onChange={(e) => setRawInstructions(e.target.value)}
          />

          {/* Enlaces a la nube (Google Docs & Canva) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Enlace Google Docs (Opcional)"
              placeholder="https://docs.google.com/document/d/..."
              value={googleDocUrl}
              onChange={(e) => setGoogleDocUrl(e.target.value)}
              leftIcon={<Link2 className="w-4 h-4 text-blue-500" />}
            />

            <Input
              label="Enlace Canva Slides (Opcional)"
              placeholder="https://www.canva.com/design/..."
              value={canvaUrl}
              onChange={(e) => setCanvaUrl(e.target.value)}
              leftIcon={<Link2 className="w-4 h-4 text-purple-500" />}
            />
          </div>

          {/* Footer Controls */}
          <div className="pt-3 border-t border-[#EBE5DF] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {workToEdit ? (
              <Button
                variant="ghost"
                type="button"
                onClick={() => setIsConfirmDeleteOpen(true)}
                icon={<Trash2 className="w-4 h-4 text-[#C62828]" />}
                className="text-[#C62828] hover:bg-rose-50 font-bold"
              >
                Eliminar Trabajo
              </Button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <Button variant="secondary" type="button" onClick={onClose} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button
                variant="primary"
                type="button"
                onClick={handleSaveWork}
                isLoading={isSubmitting}
                className="font-bold shadow-2xs"
              >
                {workToEdit ? 'Guardar Cambios' : 'Crear Trabajo'}
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Confirmation Modal for Work Deletion */}
      {isConfirmDeleteOpen && (
        <Modal
          isOpen={isConfirmDeleteOpen}
          onClose={() => setIsConfirmDeleteOpen(false)}
          title="¿Eliminar este trabajo académico?"
          maxWidth="sm"
        >
          <div className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-950 space-y-2">
              <div className="flex items-center gap-2 font-bold text-rose-900">
                <AlertTriangle className="w-4 h-4 text-[#C62828] shrink-0" />
                <span>{WORK_DELETION_CONSEQUENCES.alertTitle}</span>
              </div>
              <p className="leading-relaxed">
                {workToEdit ? WORK_DELETION_CONSEQUENCES.formatMainWarning(workToEdit.title) : 'Se eliminará permanentemente este trabajo.'}
              </p>
              <p className="text-[11px] text-rose-800 italic">
                {WORK_DELETION_CONSEQUENCES.dissociationNotice}
              </p>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsConfirmDeleteOpen(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleDeleteWork}
                isLoading={isSubmitting}
                className="bg-[#C62828] hover:bg-[#B71C1C] text-white font-bold"
              >
                Confirmar y Eliminar
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};
