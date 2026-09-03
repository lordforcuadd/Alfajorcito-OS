import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { BookOpen, Trash2, CheckCircle2, Palette, User, Mail, Link as LinkIcon, Calendar } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { db } from '../../db';
import { useToast } from '../common/Toast';
import { generateId } from '../../utils/idHelper';
import { sanitizeSafeUrl } from '../../utils/urlHelper';
import { COURSE_PASTEL_PALETTE as PASTEL_COLORS } from '../../utils/themeTokens';
import type { Course, UserProfile } from '../../types';

export interface CourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseToEdit?: Course | null;
}

export const CourseModal: React.FC<CourseModalProps> = ({
  isOpen,
  onClose,
  courseToEdit
}) => {
  const { showToast } = useToast();
  const userProfile = useLiveQuery(async () => {
    const rec = await db.settings.get('user_profile');
    return rec?.value as UserProfile | undefined;
  });

  const defaultCyclePeriod = userProfile?.currentCycle
    ? `2026-II (${userProfile.currentCycle})`
    : '2026-II (Ciclo Actual)';

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [period, setPeriod] = useState(defaultCyclePeriod);
  const [teacherName, setTeacherName] = useState('');
  const [teacherEmail, setTeacherEmail] = useState('');
  const [syllabusUrl, setSyllabusUrl] = useState('');
  const [color, setColor] = useState(PASTEL_COLORS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);

  useEffect(() => {
    if (courseToEdit) {
      setName(courseToEdit.name || '');
      setCode(courseToEdit.code || '');
      setPeriod(courseToEdit.period || defaultCyclePeriod);
      setTeacherName(courseToEdit.teacherName || '');
      setTeacherEmail(courseToEdit.teacherEmail || '');
      setSyllabusUrl(courseToEdit.syllabusUrl || '');
      setColor(courseToEdit.color || PASTEL_COLORS[0]);
    } else {
      setName('');
      setCode('');
      setPeriod(defaultCyclePeriod);
      setTeacherName('');
      setTeacherEmail('');
      setSyllabusUrl('');
      setColor(PASTEL_COLORS[0]);
    }
  }, [courseToEdit, isOpen, defaultCyclePeriod]);

  const handleSaveCourse = async () => {
    if (!name.trim()) {
      showToast('Nombre requerido', 'Por favor ingresa el nombre del curso.', 'warning');
      return;
    }
    if (teacherEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(teacherEmail.trim())) {
      showToast('Correo inválido', 'Ingresa un correo institucional válido (e.g. docente@usmp.pe).', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const now = Date.now();
      if (courseToEdit) {
        // Edit existing course
        await db.courses.update(courseToEdit.id, {
          name: name.trim(),
          code: code.trim() || undefined,
          period: period.trim(),
          teacherName: teacherName.trim() || undefined,
          teacherEmail: teacherEmail.trim() || undefined,
          syllabusUrl: sanitizeSafeUrl(syllabusUrl),
          color,
          updatedAt: now
        });
        showToast('Curso actualizado', `Los cambios en ${name} se guardaron.`, 'success');
      } else {
        // Create new course
        const newCourseId = generateId('course');
        await db.courses.add({
          id: newCourseId,
          name: name.trim(),
          code: code.trim() || undefined,
          period: period.trim(),
          teacherName: teacherName.trim() || undefined,
          teacherEmail: teacherEmail.trim() || undefined,
          syllabusUrl: sanitizeSafeUrl(syllabusUrl),
          color,
          isArchived: false,
          createdAt: now,
          updatedAt: now
        });
        showToast('Curso agregado', `${name} se añadió a tus cursos.`, 'success');
      }
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCourse = async () => {
    if (!courseToEdit) return;
    try {
      await db.transaction('rw', [db.courses, db.works, db.notes], async () => {
        await db.works.where('courseId').equals(courseToEdit.id).modify({ courseId: undefined });
        await db.notes.where('courseId').equals(courseToEdit.id).modify({ courseId: undefined });
        await db.courses.delete(courseToEdit.id);
      });
      showToast('Curso eliminado', 'El curso se eliminó y sus trabajos y notas se desvincularon.', 'info');
      setIsConfirmDeleteOpen(false);
      onClose();
    } catch {
      showToast('Error', 'No se pudo eliminar el curso de la base de datos.', 'error');
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={courseToEdit ? 'Editar Curso' : 'Nuevo Curso'}
        subtitle="Configura tus materias matriculadas para este ciclo"
        maxWidth="md"
      >
        <div className="space-y-4">
          <Input
            label="Nombre del Curso *"
            placeholder="e.g. Psicoterapia Cognitivo-Conductual"
            value={name}
            onChange={(e) => setName(e.target.value)}
            leftIcon={<BookOpen className="w-4 h-4" />}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Código de Asignatura"
              placeholder="e.g. PSI-801"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <Input
              label="Periodo / Ciclo"
              placeholder="2026-II (8vo Ciclo)"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              leftIcon={<Calendar className="w-4 h-4" />}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Nombre del Docente"
              placeholder="e.g. Dr. Manuel Rodríguez"
              value={teacherName}
              onChange={(e) => setTeacherName(e.target.value)}
              leftIcon={<User className="w-4 h-4" />}
            />
            <Input
              label="Correo del Docente"
              placeholder="docente@usmp.pe"
              value={teacherEmail}
              onChange={(e) => setTeacherEmail(e.target.value)}
              leftIcon={<Mail className="w-4 h-4" />}
            />
          </div>

          <Input
            label="Enlace al Sílabo (Google Drive / PDF)"
            placeholder="https://drive.google.com/..."
            value={syllabusUrl}
            onChange={(e) => setSyllabusUrl(e.target.value)}
            leftIcon={<LinkIcon className="w-4 h-4" />}
          />

          {/* Color Palette Selector */}
          <div>
            <label className="block text-xs font-bold text-[#5A6275] uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <Palette className="w-3.5 h-3.5 text-[#D98880]" />
              <span>Color para Identificar el Curso</span>
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {PASTEL_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full border-2 transition-all cursor-pointer ${
                    color === c ? 'border-[#2B2D42] scale-110 shadow-xs' : 'border-white hover:scale-105'
                  }`}
                  style={{ backgroundColor: c }}
                  title={`Color ${c}`}
                  aria-label={`Seleccionar color ${c}`}
                />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-[#EBE5DF] flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2">
            {courseToEdit ? (
              <Button
                variant="danger"
                size="sm"
                onClick={() => setIsConfirmDeleteOpen(true)}
                icon={<Trash2 className="w-4 h-4" />}
                className="w-full sm:w-auto"
              >
                Eliminar Curso
              </Button>
            ) : (
              <div />
            )}

            <div className="flex gap-2 w-full sm:w-auto">
              <Button variant="ghost" onClick={onClose} className="w-full sm:w-auto">
                Cancelar
              </Button>
              <Button variant="primary" onClick={handleSaveCourse} isLoading={isSubmitting} className="w-full sm:w-auto">
                {courseToEdit ? 'Guardar Cambios' : 'Guardar Curso'}
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Confirmation Modal for Delete */}
      {isConfirmDeleteOpen && (
        <Modal
          isOpen={isConfirmDeleteOpen}
          onClose={() => setIsConfirmDeleteOpen(false)}
          title={`¿Eliminar curso "${courseToEdit?.name}"?`}
          maxWidth="md"
        >
          <div className="space-y-4">
            <p className="text-xs sm:text-sm text-[#5A6275] leading-relaxed">
              Esta acción eliminará el curso de tu lista. Los trabajos y tareas asociados no se borrarán.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-[#EBE5DF]">
              <Button variant="ghost" onClick={() => setIsConfirmDeleteOpen(false)}>
                Cancelar
              </Button>
              <Button variant="danger" onClick={handleDeleteCourse}>
                Sí, eliminar curso
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};
