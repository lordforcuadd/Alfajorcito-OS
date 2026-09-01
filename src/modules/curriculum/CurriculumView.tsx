import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  GraduationCap,
  BookOpen,
  Award,
  Calendar,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
  Stethoscope,
  Building2,
  FileText,
  Search,
  ExternalLink,
  Plus,
  Edit2,
  Trash2,
  Check
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge, WorkStatusBadge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { CourseModal } from '../../components/modals/CourseModal';
import { USMP_PSYCHOLOGY_CURRICULUM } from '../../services/usmpCurriculum';
import { db } from '../../db';
import { useToast } from '../../components/common/Toast';
import { generateId } from '../../utils/idHelper';
import { parseAcademicCycle } from '../../utils/academicWorkUtils';
import type { CurriculumCourse, Course, Work, UserProfile } from '../../types';
import { DEFAULT_ACADEMIC_PERIOD } from '../../types';

export interface CurriculumViewProps {
  onOpenQuickCapture: (tab?: 'note' | 'work' | 'course' | 'source' | 'inquiry' | 'task', courseId?: string) => void;
  onOpenWork?: (workId: string) => void;
}

export const CurriculumView: React.FC<CurriculumViewProps> = ({
  onOpenQuickCapture,
  onOpenWork
}) => {
  const { showToast } = useToast();

  // Live queries
  const userCourses = useLiveQuery(() => db.courses.toArray()) || [];
  const userWorks = useLiveQuery(() => db.works.toArray()) || [];
  const userProfile = useLiveQuery(async () => {
    const rec = await db.settings.get('user_profile');
    return rec?.value as UserProfile | undefined;
  });

  // Calculate active cycle number dynamically from userProfile using centralized utility
  const userCycleNum = React.useMemo(() => {
    return parseAcademicCycle(userProfile?.currentCycle !== undefined ? String(userProfile.currentCycle) : undefined);
  }, [userProfile?.currentCycle]);

  const [selectedCycle, setSelectedCycle] = useState<number>(8);
  const [hasUserManuallySelectedCycle, setHasUserManuallySelectedCycle] = useState(false);
  const [inspectedCourse, setInspectedCourse] = useState<CurriculumCourse | null>(null);
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [courseToEdit, setCourseToEdit] = useState<Course | null>(null);

  // Sync selectedCycle with userProfile on initial load or profile update if not manually clicked
  React.useEffect(() => {
    if (!hasUserManuallySelectedCycle) {
      setSelectedCycle(userCycleNum);
    }
  }, [userCycleNum, hasUserManuallySelectedCycle]);

  const [unenrollTarget, setUnenrollTarget] = useState<{ course: CurriculumCourse; existingId: string } | null>(null);

  const coursesByCycle = USMP_PSYCHOLOGY_CURRICULUM.filter((c) => c.cycle === selectedCycle);

  const getAreaBadge = (area: CurriculumCourse['area']) => {
    switch (area) {
      case 'CLINICA':
        return <Badge variant="rose" size="sm">Psicología Clínica</Badge>;
      case 'INVESTIGACION':
        return <Badge variant="lavender" size="sm">Tesis & Investigación</Badge>;
      case 'DEONTOLOGIA':
        return <Badge variant="amber" size="sm">Ética & Deontología</Badge>;
      case 'SALUD_PUBLICA':
        return <Badge variant="mint" size="sm">Salud Pública</Badge>;
      case 'EDUCATIVA':
        return <Badge variant="amber" size="sm">Psicología Educativa</Badge>;
      case 'ORGANIZACIONAL':
        return <Badge variant="mint" size="sm">Psicología Organizacional</Badge>;
      default:
        return <Badge variant="default" size="sm">{area}</Badge>;
    }
  };

  // Toggle or Enroll course from curriculum
  const handleToggleEnrollCourse = async (curriculumCourse: CurriculumCourse, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const existingCourse = userCourses.find(
      (c) => c.code === curriculumCourse.code || c.name.toLowerCase() === curriculumCourse.name.toLowerCase()
    );

    if (existingCourse) {
      // Open custom confirmation modal instead of window.confirm
      setUnenrollTarget({ course: curriculumCourse, existingId: existingCourse.id });
    } else {
      // Enroll
      const colors = ['#D98880', '#B39DDB', '#80CBC4', '#FFCC80', '#90CAF9'];
      const assignedColor = colors[Math.floor(Math.random() * colors.length)];
      try {
        await db.courses.add({
          id: generateId('course'),
          code: curriculumCourse.code,
          name: curriculumCourse.name,
          period: `${DEFAULT_ACADEMIC_PERIOD} (${curriculumCourse.cycle}vo Ciclo)`,
          color: assignedColor,
          isArchived: false,
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
        showToast('¡Matrícula registrada!', `${curriculumCourse.name} agregada a tus cursos activos.`, 'success');
      } catch {
        showToast('Error', 'No se pudo registrar la matrícula en la base de datos.', 'error');
      }
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="p-4 sm:p-6 rounded-3xl bg-gradient-to-br from-[#FDF2F0] via-white to-[#F3E5F5] border border-[#E8A598]/40 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold text-[#8C3A32]">
              <span className="inline-flex items-center gap-1 bg-[#FDF2F0] text-[#8C3A32] px-2.5 py-1 rounded-lg border border-[#E8A598]/50">
                <GraduationCap className="w-3.5 h-3.5 text-[#D98880] shrink-0" />
                <span>{userProfile?.institution || 'USMP'}</span>
              </span>
              <span className="inline-flex items-center bg-[#F5F1EB] text-[#5A6275] px-2.5 py-1 rounded-lg border border-[#EBE5DF]">
                {userProfile?.faculty || 'FCCTP'}
              </span>
              <span className="inline-flex items-center bg-[#E8A598]/20 text-[#8C3A32] px-2.5 py-1 rounded-lg border border-[#E8A598]/40 font-bold">
                Ciclo Actual: {userProfile?.currentCycle || '8vo Ciclo'}
              </span>
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#2B2D42] leading-tight">
                Malla Curricular & Plan de Titulación
              </h2>
              <p className="text-xs sm:text-sm text-[#5A6275] mt-0.5">
                Personaliza tus asignaturas matriculadas, revisa prerrequisitos y planifica tu ruta de internado y tesis.
              </p>
            </div>
          </div>

          <Button
            variant="primary"
            size="md"
            onClick={() => {
              setCourseToEdit(null);
              setIsCourseModalOpen(true);
            }}
            icon={<Plus className="w-4 h-4 stroke-[2.5]" />}
            className="w-full sm:w-auto font-bold shrink-0 shadow-xs"
          >
            Nuevo Curso
          </Button>
        </div>

        {/* Pathway summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className={`p-3 rounded-2xl bg-white border ${userCycleNum === 8 ? 'border-[#E8A598] bg-[#FDF2F0]/40' : 'border-[#EBE5DF]'} space-y-1`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#8C3A32] uppercase">Ciclo 8</span>
              {userCycleNum === 8 ? (
                <span className="text-[10px] bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-200">En Curso</span>
              ) : userCycleNum > 8 ? (
                <span className="text-[10px] bg-gray-100 text-gray-600 font-bold px-2 py-0.5 rounded-full">Completado</span>
              ) : (
                <span className="text-[10px] bg-[#F3E5F5] text-[#512DA8] font-bold px-2 py-0.5 rounded-full">Próximo</span>
              )}
            </div>
            <p className="text-xs font-bold text-[#2B2D42]">Taller de Tesis I & Psicoterapia</p>
            <p className="text-[11px] text-[#5A6275]">Aprobación de proyecto de tesis y seminarios clínicos.</p>
          </div>

          <div className={`p-3 rounded-2xl bg-white border ${userCycleNum === 9 ? 'border-[#B39DDB] bg-[#F3E5F5]/40' : 'border-[#EBE5DF]'} space-y-1`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#512DA8] uppercase">Ciclo 9</span>
              {userCycleNum === 9 ? (
                <span className="text-[10px] bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-200">En Curso (Internado I)</span>
              ) : userCycleNum > 9 ? (
                <span className="text-[10px] bg-gray-100 text-gray-600 font-bold px-2 py-0.5 rounded-full">Completado</span>
              ) : (
                <span className="text-[10px] bg-[#F3E5F5] text-[#512DA8] font-bold px-2 py-0.5 rounded-full">Internado I</span>
              )}
            </div>
            <p className="text-xs font-bold text-[#2B2D42]">Prácticas Preprofesionales I & Tesis II</p>
            <p className="text-[11px] text-[#5A6275]">Inmersión en sedes hospitalarias/CSMC y recolección de datos.</p>
          </div>

          <div className={`p-3 rounded-2xl bg-white border ${userCycleNum === 10 ? 'border-emerald-400 bg-emerald-50/40' : 'border-[#EBE5DF]'} space-y-1`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#004D40] uppercase">Ciclo 10</span>
              {userCycleNum === 10 ? (
                <span className="text-[10px] bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-200">En Curso (Licenciatura)</span>
              ) : (
                <span className="text-[10px] bg-[#E0F2F1] text-[#004D40] font-bold px-2 py-0.5 rounded-full border border-teal-200">Licenciatura</span>
              )}
            </div>
            <p className="text-xs font-bold text-[#2B2D42]">Internado II & Sustentación de Tesis</p>
            <p className="text-[11px] text-[#5A6275]">Memoria de prácticas, dictamen y título profesional USMP.</p>
          </div>
        </div>
      </div>

      {/* Cycle Selector Pills with smooth PC wheel & touch scroll */}
      <div
        onWheel={(e) => {
          if (e.deltaY !== 0) {
            e.currentTarget.scrollLeft += e.deltaY;
          }
        }}
        className="flex items-center gap-2 pb-1.5 tab-scroll-pc flex-nowrap"
      >
        {[
          { cycle: 1, roman: 'I', label: 'I Ciclo' },
          { cycle: 2, roman: 'II', label: 'II Ciclo' },
          { cycle: 3, roman: 'III', label: 'III Ciclo' },
          { cycle: 4, roman: 'IV', label: 'IV Ciclo' },
          { cycle: 5, roman: 'V', label: 'V Ciclo' },
          { cycle: 6, roman: 'VI', label: 'VI Ciclo' },
          { cycle: 7, roman: 'VII', label: 'VII Ciclo' },
          { cycle: 8, roman: 'VIII', label: 'VIII Ciclo' },
          { cycle: 9, roman: 'IX', label: 'IX Ciclo (Internado I)' },
          { cycle: 10, roman: 'X', label: 'X Ciclo (Internado II & Tesis)' }
        ].map((item) => {
          const isActual = item.cycle === userCycleNum;
          const displayLabel = isActual ? `${item.roman} Ciclo (${item.cycle}vo - Actual)` : item.label;

          return (
            <button
              key={item.cycle}
              onClick={() => {
                setHasUserManuallySelectedCycle(true);
                setSelectedCycle(item.cycle);
              }}
              className={`px-4 py-2.5 sm:py-2 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer select-none whitespace-nowrap shrink-0 active:scale-[0.98] ${
                selectedCycle === item.cycle
                  ? 'bg-[#E8A598] text-[#2B2D42] shadow-2xs border border-[#D98880]/30'
                  : isActual
                  ? 'bg-[#FDF2F0] text-[#8C3A32] border border-[#E8A598]/60'
                  : 'bg-white text-[#5A6275] border border-[#EBE5DF] hover:bg-[#F5F1EB]'
              }`}
            >
              {displayLabel}
            </button>
          );
        })}
      </div>

      {/* Courses in Selected Cycle */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {coursesByCycle.map((course) => {
          const matchingDbCourse = userCourses.find(
            (c) => c.code === course.code || c.name.toLowerCase() === course.name.toLowerCase()
          );
          const isEnrolled = !!matchingDbCourse;
          const relatedWorks = matchingDbCourse ? userWorks.filter((w) => w.courseId === matchingDbCourse.id) : [];

          return (
            <Card
              key={course.code}
              variant="interactive"
              onClick={() => setInspectedCourse(course)}
              className="space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
                  <span className="text-xs font-bold font-mono text-[#8C3A32] bg-[#FDF2F0] px-2 py-0.5 rounded-lg border border-[#E8A598]/40">
                    {course.code}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                    {getAreaBadge(course.area)}
                    <Badge variant="default" size="sm">{course.credits} créditos</Badge>
                    {isEnrolled && relatedWorks.length > 0 && (
                      <Badge variant="lavender" size="sm">
                        {relatedWorks.length} {relatedWorks.length === 1 ? 'trabajo' : 'trabajos'}
                      </Badge>
                    )}
                  </div>
                </div>

                <h3 className="font-extrabold text-sm sm:text-base text-[#2B2D42] leading-snug">
                  {course.name}
                </h3>

                <p className="text-xs text-[#5A6275] line-clamp-3 leading-relaxed">
                  {course.description}
                </p>
              </div>

              {/* Course Footer with Dynamic Enrollment Toggle */}
              <div className="pt-3 border-t border-[#EBE5DF] flex items-center justify-between text-xs text-[#5A6275] gap-2">
                <button
                  onClick={(e) => handleToggleEnrollCourse(course, e)}
                  className={`text-xs px-2.5 py-1 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                    isEnrolled
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-rose-50 hover:text-rose-800 hover:border-rose-300'
                      : 'bg-[#F5F1EB] text-[#2B2D42] border border-[#EBE5DF] hover:bg-[#E8A598]/20 hover:border-[#E8A598]'
                  }`}
                  title={isEnrolled ? 'Click para quitar de tus cursos' : 'Click para agregar a tus cursos'}
                  aria-label={isEnrolled ? `Quitar ${course.name} de mis cursos` : `Matricular ${course.name} en mis cursos`}
                >
                  {isEnrolled ? (
                    <>
                      <Check className="w-3.5 h-3.5" /> En Mis Cursos
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" /> Matricular
                    </>
                  )}
                </button>

                <span className="text-[11px] font-bold text-[#8C3A32] flex items-center gap-1 shrink-0">
                  Ver Sílabo <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Course Detail Modal */}
      {inspectedCourse && (
        <Modal
          isOpen={!!inspectedCourse}
          onClose={() => setInspectedCourse(null)}
          title={`${inspectedCourse.code} • ${inspectedCourse.name}`}
          subtitle={`Facultad de Ciencias de la Comunicación, Turismo y Psicología - USMP • ${inspectedCourse.cycle}vo Ciclo • ${inspectedCourse.credits} Créditos`}
          maxWidth="xl"
        >
          <div className="space-y-4">
            {/* Area and Type Badges */}
            <div className="flex items-center gap-2 flex-wrap">
              {getAreaBadge(inspectedCourse.area)}
              <Badge variant="default" size="sm">Tipo: {inspectedCourse.type}</Badge>
              <Badge variant="rose" size="sm">Créditos: {inspectedCourse.credits}</Badge>
            </div>

            {/* Description */}
            <div className="p-3.5 rounded-2xl bg-[#F5F1EB]/70 border border-[#EBE5DF] space-y-1 text-xs text-[#2B2D42] leading-relaxed">
              <span className="font-bold text-[#8C3A32] block uppercase tracking-wider text-[10px]">
                Descripción de la Asignatura
              </span>
              <p>{inspectedCourse.description}</p>
            </div>

            {/* Prerequisites */}
            <div className="p-3 rounded-2xl bg-white border border-[#EBE5DF] space-y-1.5">
              <span className="font-bold text-xs text-[#5A6275] block uppercase tracking-wider text-[10px]">
                Prerrequisitos Académicos (FCCTP USMP)
              </span>
              <div className="flex flex-wrap gap-1.5">
                {inspectedCourse.prerequisites.map((req, i) => (
                  <span key={i} className="text-xs bg-[#F5F1EB] text-[#2B2D42] px-2.5 py-1 rounded-xl font-medium border border-[#EBE5DF]">
                    {req}
                  </span>
                ))}
              </div>
            </div>

            {/* Competencies */}
            <div className="p-3.5 rounded-2xl bg-[#FDF2F0] border border-[#E8A598]/50 space-y-2">
              <span className="font-bold text-xs text-[#8C3A32] block uppercase tracking-wider text-[10px]">
                Competencias & Resultados de Aprendizaje
              </span>
              <ul className="space-y-1.5 text-xs text-[#2B2D42]">
                {inspectedCourse.competencies.map((comp, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#D98880] shrink-0 mt-0.5" />
                    <span>{comp}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Related Works in this Course */}
            {(() => {
              const matching = userCourses.find(
                (c) => c.code === inspectedCourse.code || c.name.toLowerCase() === inspectedCourse.name.toLowerCase()
              );
              const worksInCourse = matching ? userWorks.filter((w) => w.courseId === matching.id) : [];
              if (worksInCourse.length === 0) return null;

              return (
                <div className="p-3.5 rounded-2xl bg-white border border-[#EBE5DF] space-y-2">
                  <span className="font-bold text-xs text-[#8C3A32] block uppercase tracking-wider text-[10px]">
                    Trabajos y Tesis en este curso ({worksInCourse.length})
                  </span>
                  <div className="space-y-1.5">
                    {worksInCourse.map((w) => (
                      <button
                        key={w.id}
                        onClick={() => {
                          setInspectedCourse(null);
                          if (onOpenWork) onOpenWork(w.id);
                        }}
                        className="w-full flex items-center justify-between text-xs p-2.5 rounded-xl bg-[#FAF8F5] hover:bg-[#FDF2F0] border border-[#EBE5DF] hover:border-[#E8A598] transition-all cursor-pointer text-left group shadow-2xs"
                        title="Abrir espacio de trabajo"
                      >
                        <span className="font-bold text-[#2B2D42] group-hover:text-[#8C3A32] truncate flex-1 mr-2">{w.title}</span>
                        <WorkStatusBadge status={w.status} size="sm" />
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Action Buttons with Responsive Flex Grouping */}
            <div className="pt-3 border-t border-[#EBE5DF] flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2.5">
              <Button variant="ghost" onClick={() => setInspectedCourse(null)} className="w-full sm:w-auto">
                Cerrar
              </Button>
              <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
                <Button
                  variant="secondary"
                  onClick={() => {
                    handleToggleEnrollCourse(inspectedCourse);
                  }}
                  className="w-full sm:w-auto"
                >
                  {userCourses.some((c) => c.code === inspectedCourse.code)
                    ? 'Quitar de Mis Cursos'
                    : 'Matricular en Mis Cursos'}
                </Button>
                <Button
                  variant="primary"
                  onClick={async () => {
                    let courseId = '';
                    const existing = userCourses.find(
                      (c) =>
                        c.code === inspectedCourse.code ||
                        c.name.toLowerCase() === inspectedCourse.name.toLowerCase()
                    );
                    if (existing) {
                      courseId = existing.id;
                    } else {
                      const colors = ['#D98880', '#B39DDB', '#80CBC4', '#FFCC80', '#90CAF9'];
                      const assignedColor = colors[Math.floor(Math.random() * colors.length)];
                      const newCourseId = generateId('course');
                      try {
                        await db.courses.add({
                          id: newCourseId,
                          code: inspectedCourse.code,
                          name: inspectedCourse.name,
                          period: `${DEFAULT_ACADEMIC_PERIOD} (${inspectedCourse.cycle}vo Ciclo)`,
                          color: assignedColor,
                          isArchived: false,
                          createdAt: Date.now(),
                          updatedAt: Date.now()
                        });
                        courseId = newCourseId;
                      } catch {
                        showToast('Error', 'No se pudo crear el curso en la base de datos.', 'error');
                        return;
                      }
                    }
                    setInspectedCourse(null);
                    onOpenQuickCapture('work', courseId);
                  }}
                  icon={<Plus className="w-4 h-4 stroke-[2.5]" />}
                  className="w-full sm:w-auto font-bold"
                >
                  Crear Trabajo
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Unenroll Confirmation Modal */}
      {unenrollTarget && (
        <Modal
          isOpen={!!unenrollTarget}
          onClose={() => setUnenrollTarget(null)}
          title={`¿Desmatricularte de ${unenrollTarget.course.name}?`}
          maxWidth="md"
        >
          <div className="space-y-4">
            <p className="text-xs sm:text-sm text-[#5A6275] leading-relaxed">
              La asignatura se quitará de tus cursos activos. Los trabajos y notas vinculados se mantendrán desvinculados de forma segura sin registros huérfanos.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-[#EBE5DF]">
              <Button variant="ghost" onClick={() => setUnenrollTarget(null)}>
                Cancelar
              </Button>
              <Button
                variant="danger"
                onClick={async () => {
                  try {
                    await db.transaction('rw', [db.courses, db.works, db.notes], async () => {
                      await db.works.where('courseId').equals(unenrollTarget.existingId).modify({ courseId: undefined });
                      await db.notes.where('courseId').equals(unenrollTarget.existingId).modify({ courseId: undefined });
                      await db.courses.delete(unenrollTarget.existingId);
                    });
                    showToast('Asignatura retirada', `${unenrollTarget.course.name} se eliminó de tus cursos activos.`, 'info');
                    setUnenrollTarget(null);
                  } catch {
                    showToast('Error', 'No se pudo retirar la asignatura de la base de datos.', 'error');
                  }
                }}
              >
                Sí, retirar asignatura
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Course Modal for creating/editing custom courses */}
      <CourseModal
        isOpen={isCourseModalOpen}
        onClose={() => {
          setIsCourseModalOpen(false);
          setCourseToEdit(null);
        }}
        courseToEdit={courseToEdit}
      />
    </div>
  );
};
