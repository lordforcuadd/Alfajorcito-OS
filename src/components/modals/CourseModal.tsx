import React, { useState, useEffect } from 'react';
import { BookOpen, Trash2, CheckCircle2, Palette, User, Mail, Link as LinkIcon, Calendar } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { db } from '../../db';
import { useToast } from '../common/Toast';
import type { Course } from '../../types';

export interface CourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseToEdit?: Course | null;
}

const PASTEL_COLORS = [
  '#D98880', // Rose
  '#B39DDB', // Lavender
  '#80CBC4', // Mint
  '#FFCC80', // Amber
  '#90CAF9', // Blue
  '#EF9A9A', // Coral
  '#A5D6A7', // Sage Green
  '#CE93D8'  // Purple
];

export const CourseModal: React.FC<CourseModalProps> = ({
  isOpen,
  onClose,
  courseToEdit
}) => {
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [period, setPeriod] = useState('2026-II (8vo Ciclo)');
  const [teacherName, setTeacherName] = useState('');
  const [teacherEmail, setTeacherEmail] = useState('');
  const [syllabusUrl, setSyllabusUrl] = useState('');
  const [color, setColor] = useState(PASTEL_COLORS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (courseToEdit) {
      setName(courseToEdit.name || '');
      setCode(courseToEdit.code || '');
      setPeriod(courseToEdit.period || '2026-II (8vo Ciclo)');
      setTeacherName(courseToEdit.teacherName || '');
      setTeacherEmail(courseToEdit.teacherEmail || '');
      setSyllabusUrl(courseToEdit.syllabusUrl || '');
      setColor(courseToEdit.color || PASTEL_COLORS[0]);
    } else {
      setName('');
      setCode('');
      setPeriod('2026-II (8vo Ciclo)');
      setTeacherName('');
      setTeacherEmail('');
      setSyllabusUrl('');
      setColor(PASTEL_COLORS[0]);
    }
  }, [courseToEdit, isOpen]);

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
          syllabusUrl: syllabusUrl.trim() || undefined,
          color,
          updatedAt: now
        });
        showToast('Curso actualizado', `Los cambios en ${name} se guardaron.`, 'success');
      } else {
        // Create new course
        const newCourseId = `course-${Math.random().toString(36).substring(2, 9)}`;
        await db.courses.add({
          id: newCourseId,
          name: name.trim(),
          code: code.trim() || undefined,
          period: period.trim(),
          teacherName: teacherName.trim() || undefined,
          teacherEmail: teacherEmail.trim() || undefined,
          syllabusUrl: syllabusUrl.trim() || undefined,
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
    const confirmDelete = window.confirm(`¿Estás seguro de eliminar el curso "${courseToEdit.name}"? Los trabajos ya creados mantendrán su información.`);
    if (!confirmDelete) return;

    await db.courses.delete(courseToEdit.id);
    showToast('Curso eliminado', 'El curso se eliminó de tu lista.', 'info');
    onClose();
  };

  return (
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
            label="Código (Opcional)"
            placeholder="e.g. PSI-802"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <Input
            label="Ciclo o Semestre"
            placeholder="e.g. 2026-II (8vo Ciclo)"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            leftIcon={<Calendar className="w-4 h-4" />}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Docente / Profesor(a)"
            placeholder="e.g. Dr. César Merino"
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
          label="Enlace al Sílabo o Aula Virtual"
          placeholder="https://fcctp.usmp.edu.pe/... o Classroom"
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
              onClick={handleDeleteCourse}
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
  );
};
