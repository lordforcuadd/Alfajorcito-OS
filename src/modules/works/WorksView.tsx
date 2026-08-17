import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  GraduationCap,
  Plus,
  Calendar,
  BookOpen,
  CheckCircle2,
  Clock,
  Filter,
  Layers,
  ChevronRight,
  Edit2,
  BookMarked
} from 'lucide-react';
import { db } from '../../db';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge, CitationStyleBadge } from '../../components/common/Badge';
import { CourseModal } from '../../components/modals/CourseModal';
import { WorkWorkspace } from './WorkWorkspace';
import type { Work, Course, WorkStatus } from '../../types';

export interface WorksViewProps {
  selectedWorkId?: string | null;
  onSelectWork: (workId: string | null) => void;
  onOpenQuickCapture: (tab?: 'note' | 'work' | 'course' | 'source' | 'inquiry' | 'task', courseId?: string) => void;
}

export const WorksView: React.FC<WorksViewProps> = ({
  selectedWorkId,
  onSelectWork,
  onOpenQuickCapture
}) => {
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [courseToEdit, setCourseToEdit] = useState<Course | null>(null);

  const courses = useLiveQuery(() => db.courses.toArray()) || [];
  const works = useLiveQuery(() => db.works.toArray()) || [];
  const allSources = useLiveQuery(() => db.sources.toArray()) || [];
  const tasks = useLiveQuery(() => db.tasks.toArray()) || [];

  const coursesMap = React.useMemo(() => new Map(courses.map((c) => [c.id, c])), [courses]);

  // If a work is selected, show its full dedicated Workspace
  if (selectedWorkId) {
    return <WorkWorkspace workId={selectedWorkId} onBack={() => onSelectWork(null)} />;
  }

  // Filtered works
  const filteredWorks = works.filter((w) => {
    if (selectedCourseFilter !== 'ALL' && w.courseId !== selectedCourseFilter) return false;
    if (selectedStatusFilter !== 'ALL' && w.status !== selectedStatusFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#2B2D42]">
            Trabajos Académicos & Proyectos de Tesis
          </h2>
          <p className="text-xs sm:text-sm text-[#5A6275] mt-0.5">
            Tus investigaciones con fuentes científicas, consultas al docente, tareas y redactor en formato APA 7.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="md"
            onClick={() => {
              setCourseToEdit(null);
              setIsCourseModalOpen(true);
            }}
            icon={<Plus className="w-4 h-4 text-[#D98880] stroke-[2.5]" />}
            className="w-full sm:w-auto"
          >
            Nuevo Curso
          </Button>

          <Button
            onClick={() => {
              const preselectedCourse = selectedCourseFilter !== 'ALL' ? selectedCourseFilter : undefined;
              onOpenQuickCapture('work', preselectedCourse);
            }}
            variant="primary"
            size="md"
            icon={<Plus className="w-4 h-4 stroke-[2.5]" />}
            className="w-full sm:w-auto"
          >
            Nuevo Trabajo
          </Button>
        </div>
      </div>

      {/* Filter Row with Course Pills & Quick Edit */}
      <div
        onWheel={(e) => {
          if (e.deltaY !== 0) {
            e.currentTarget.scrollLeft += e.deltaY;
          }
        }}
        className="flex items-center gap-1.5 overflow-x-auto pb-1 tab-scroll-pc scroll-touch touch-pan-x flex-nowrap"
      >
        <button
          onClick={() => setSelectedCourseFilter('ALL')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer select-none shrink-0 ${
            selectedCourseFilter === 'ALL'
              ? 'bg-[#E8A598] text-[#2B2D42] shadow-2xs'
              : 'bg-[#F5F1EB] text-[#5A6275] hover:bg-[#EBE5DF]'
          }`}
        >
          Todos ({works.length})
        </button>

        {courses.map((c) => {
          const isSelected = selectedCourseFilter === c.id;
          const courseWorksCount = works.filter((w) => w.courseId === c.id).length;

          return (
            <div
              key={c.id}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all select-none shrink-0 ${
                isSelected
                  ? 'bg-[#E8A598] text-[#2B2D42] shadow-2xs'
                  : 'bg-[#F5F1EB] text-[#5A6275] hover:bg-[#EBE5DF]'
              }`}
            >
              <button
                onClick={() => setSelectedCourseFilter(c.id)}
                className="cursor-pointer"
              >
                {c.name} ({courseWorksCount})
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCourseToEdit(c);
                  setIsCourseModalOpen(true);
                }}
                className="p-1 hover:bg-white/60 text-[#8D99AE] hover:text-[#2B2D42] rounded-lg transition-colors cursor-pointer"
                title={`Editar curso: ${c.name}`}
              >
                <Edit2 className="w-3 h-3" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Works Grid */}
      {filteredWorks.length === 0 ? (
        <Card variant="subtle" className="text-center py-12">
          <p className="text-sm text-[#8D99AE]">No hay trabajos creados con estos filtros.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredWorks.map((work) => {
            const course = coursesMap.get(work.courseId);
            const workSources = allSources.filter((s) => s.workIds.includes(work.id));
            const workTasks = tasks.filter((t) => t.workId === work.id);
            const completedTasks = workTasks.filter((t) => t.isCompleted).length;
            const daysLeft = Math.ceil((work.deadline - Date.now()) / 86400000);

            return (
              <Card
                key={work.id}
                variant="interactive"
                onClick={() => onSelectWork(work.id)}
                className="space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
                    <span className="text-xs font-bold text-[#8C3A32] uppercase truncate max-w-[200px]">
                      {course?.name || 'Materia'}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <CitationStyleBadge style={work.citationStyle} />
                      <Badge
                        variant={
                          work.status === 'ENTREGADO'
                            ? 'mint'
                            : work.status === 'INVESTIGACION'
                            ? 'lavender'
                            : work.status === 'PLANIFICACION'
                            ? 'amber'
                            : 'rose'
                        }
                        size="sm"
                      >
                        {work.status === 'ENTREGADO'
                          ? 'Entregado'
                          : work.status === 'INVESTIGACION'
                          ? 'Investigando'
                          : work.status === 'PLANIFICACION'
                          ? 'Planificación'
                          : work.status === 'REDACTANDO'
                          ? 'Redactando'
                          : work.status === 'EN_REVISION'
                          ? 'En Revisión'
                          : work.status === 'CORRECCION'
                          ? 'En Corrección'
                          : work.status}
                      </Badge>
                    </div>
                  </div>

                  <h3 className="font-extrabold text-sm sm:text-base text-[#2B2D42] leading-snug">
                    {work.title}
                  </h3>

                  <p className="text-xs text-[#5A6275] line-clamp-2 leading-relaxed">
                    {work.rawInstructions || 'Sin indicaciones registradas.'}
                  </p>
                </div>

                {/* Footer Metrics */}
                <div className="pt-3 border-t border-[#EBE5DF] flex items-center justify-between text-xs text-[#5A6275]">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5 text-[#8D99AE]" />
                      <span>{workSources.length} fuentes</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#8D99AE]" />
                      <span>{completedTasks}/{workTasks.length} tareas</span>
                    </span>
                  </div>

                  <span className={`text-xs font-bold flex items-center gap-1 ${daysLeft < 3 ? 'text-[#C62828]' : 'text-[#8C3A32]'}`}>
                    <Clock className="w-3.5 h-3.5" />
                    <span>{daysLeft < 0 ? 'Vencido' : `${daysLeft} días`}</span>
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Course Modal for creating/editing courses */}
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
