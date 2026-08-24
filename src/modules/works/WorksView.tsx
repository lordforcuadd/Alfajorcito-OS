import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import confetti from 'canvas-confetti';
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
  BookMarked,
  Search,
  FileText,
  HelpCircle,
  Sparkles,
  TrendingUp,
  FolderOpen,
  Trash2
} from 'lucide-react';
import { db } from '../../db';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge, CitationStyleBadge, WorkStatusBadge, WORK_STATUS_META, type BadgeVariant } from '../../components/common/Badge';
import { useToast } from '../../components/common/Toast';
import { CourseModal } from '../../components/modals/CourseModal';
import { WorkModal } from '../../components/modals/WorkModal';
import { WorkWorkspace } from './WorkWorkspace';
import type { Work, Course, WorkStatus, WorkType } from '../../types';

export interface WorksViewProps {
  selectedWorkId?: string | null;
  onSelectWork: (workId: string | null) => void;
  onOpenQuickCapture: (tab?: 'note' | 'work' | 'course' | 'source' | 'inquiry' | 'task', courseId?: string) => void;
}

const WORK_TYPE_META: Record<WorkType, { label: string; color: string }> = {
  TESIS: { label: 'Tesis / Proyecto', color: 'bg-purple-100/80 text-purple-900 border-purple-200' },
  ENSAYO: { label: 'Ensayo Crítico', color: 'bg-rose-100/80 text-rose-900 border-rose-200' },
  MONOGRAFIA: { label: 'Monografía', color: 'bg-blue-100/80 text-blue-900 border-blue-200' },
  INFORME: { label: 'Informe Académico', color: 'bg-teal-100/80 text-teal-900 border-teal-200' },
  PROYECTO: { label: 'Proyecto de Curso', color: 'bg-indigo-100/80 text-indigo-900 border-indigo-200' },
  EXAMEN: { label: 'Examen / Evaluación', color: 'bg-amber-100/80 text-amber-900 border-amber-200' },
  PRESENTACION: { label: 'Presentación / Slides', color: 'bg-emerald-100/80 text-emerald-900 border-emerald-200' },
  OTRO: { label: 'Entregable', color: 'bg-stone-100 text-stone-800 border-stone-200' }
};

export const WorksView: React.FC<WorksViewProps> = ({
  selectedWorkId,
  onSelectWork,
  onOpenQuickCapture
}) => {
  const { showToast } = useToast();
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [courseToEdit, setCourseToEdit] = useState<Course | null>(null);
  const [isWorkModalOpen, setIsWorkModalOpen] = useState(false);
  const [workToEdit, setWorkToEdit] = useState<Work | null>(null);

  const courses = useLiveQuery(() => db.courses.toArray()) || [];
  const works = useLiveQuery(() => db.works.toArray()) || [];
  const allSources = useLiveQuery(() => db.sources.toArray()) || [];
  const tasks = useLiveQuery(() => db.tasks.toArray()) || [];
  const inquiries = useLiveQuery(() => db.inquiries.toArray()) || [];

  const coursesMap = useMemo(() => new Map(courses.map((c) => [c.id, c])), [courses]);

  // Overall Stats
  const activeWorks = works.filter((w) => w.status !== 'ENTREGADO' && w.status !== 'ARCHIVADO');
  const deliveredWorks = works.filter((w) => w.status === 'ENTREGADO');
  const thesisWorks = works.filter((w) => w.type === 'TESIS');

  const handleCardStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>, work: Work) => {
    e.stopPropagation();
    const newStatus = e.target.value as WorkStatus;
    await db.works.update(work.id, { status: newStatus, updatedAt: Date.now() });

    if (newStatus === 'ENTREGADO') {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
      window.dispatchEvent(new CustomEvent('work-delivered', { detail: { title: work.title } }));
      showToast('¡Felicitaciones!', `"${work.title}" marcado como ENTREGADO.`, 'success');
    } else {
      showToast(
        'Estado actualizado',
        `"${work.title}" cambió a ${WORK_STATUS_META[newStatus]?.label || newStatus}.`,
        'success'
      );
    }
  };

  // If a work is selected, show its full dedicated Workspace
  if (selectedWorkId) {
    return <WorkWorkspace workId={selectedWorkId} onBack={() => onSelectWork(null)} />;
  }

  // Filtered works
  const filteredWorks = works.filter((w) => {
    if (selectedCourseFilter !== 'ALL' && w.courseId !== selectedCourseFilter) return false;
    if (selectedStatusFilter !== 'ALL' && w.status !== selectedStatusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchTitle = w.title.toLowerCase().includes(q);
      const matchInstructions = (w.rawInstructions || '').toLowerCase().includes(q);
      const courseName = coursesMap.get(w.courseId)?.name.toLowerCase() || '';
      return matchTitle || matchInstructions || courseName.includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-5 sm:space-y-6 animate-fade-in pb-12">
      {/* ─── 1. HERO COCKPIT HEADER ─── */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-[#FDF2F0] via-white to-[#F3E5F5] border border-[#E8A598]/40 p-4 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#E8A598]/20 border border-[#E8A598]/30 text-[#8C3A32] text-xs font-bold">
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Gestión de Entregables & Tesis USMP</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#2B2D42] tracking-tight">
              Trabajos Académicos & Proyectos
            </h2>
            <p className="text-xs sm:text-sm text-[#5A6275] max-w-2xl leading-relaxed">
              Planifica, investiga con fuentes verificadas, redacta con citas deterministas y da seguimiento a revisiones docentes.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button
              variant="secondary"
              size="md"
              onClick={() => {
                setCourseToEdit(null);
                setIsCourseModalOpen(true);
              }}
              icon={<Plus className="w-4 h-4 text-[#D98880] stroke-[2.5]" />}
              className="w-full xs:w-auto font-bold shadow-2xs"
            >
              Nuevo Curso
            </Button>

            <Button
              onClick={() => {
                setWorkToEdit(null);
                setIsWorkModalOpen(true);
              }}
              variant="primary"
              size="md"
              icon={<Plus className="w-4 h-4 stroke-[2.5]" />}
              className="w-full xs:w-auto font-bold shadow-2xs"
            >
              Nuevo Trabajo
            </Button>
          </div>
        </div>

        {/* Mini Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-[#EBE5DF]/60 text-xs">
          <div className="p-2.5 rounded-xl bg-white/70 border border-[#EBE5DF]/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#D98880]" />
              <span className="text-[#5A6275] font-medium">En Curso</span>
            </div>
            <span className="font-extrabold text-[#2B2D42] text-sm">{activeWorks.length}</span>
          </div>

          <div className="p-2.5 rounded-xl bg-white/70 border border-[#EBE5DF]/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-purple-500" />
              <span className="text-[#5A6275] font-medium">Tesis</span>
            </div>
            <span className="font-extrabold text-purple-950 text-sm">{thesisWorks.length}</span>
          </div>

          <div className="p-2.5 rounded-xl bg-white/70 border border-[#EBE5DF]/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-[#5A6275] font-medium">Entregados</span>
            </div>
            <span className="font-extrabold text-emerald-950 text-sm">{deliveredWorks.length}</span>
          </div>

          <div className="p-2.5 rounded-xl bg-white/70 border border-[#EBE5DF]/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-[#5A6275] font-medium">Asignaturas</span>
            </div>
            <span className="font-extrabold text-amber-950 text-sm">{courses.length}</span>
          </div>
        </div>
      </div>

      {/* ─── 2. SEARCH & FILTER CONTROLS ─── */}
      <div className="space-y-3">
        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-[#8D99AE] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar trabajos por título, indicaciones o curso..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white border border-[#EBE5DF] text-xs sm:text-sm text-[#2B2D42] placeholder-[#8D99AE] focus:outline-none focus:border-[#E8A598] focus:ring-2 focus:ring-[#E8A598]/20 transition-all shadow-2xs"
          />
        </div>

        {/* Filter Row: Course Pills */}
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
                ? 'bg-[#2B2D42] text-white shadow-2xs'
                : 'bg-white text-[#5A6275] border border-[#EBE5DF] hover:bg-[#F5F1EB]'
            }`}
          >
            Todos los Cursos ({works.length})
          </button>

          {courses.map((c) => {
            const isSelected = selectedCourseFilter === c.id;
            const courseWorksCount = works.filter((w) => w.courseId === c.id).length;

            return (
              <div
                key={c.id}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all select-none shrink-0 border ${
                  isSelected
                    ? 'bg-[#FAF8F5] border-[#E8A598] text-[#8C3A32] shadow-2xs'
                    : 'bg-white border-[#EBE5DF] text-[#5A6275] hover:bg-[#F5F1EB]'
                }`}
              >
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: c.color || '#D98880' }}
                />
                <button
                  onClick={() => setSelectedCourseFilter(c.id)}
                  className="cursor-pointer font-bold"
                >
                  {c.name} ({courseWorksCount})
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setCourseToEdit(c);
                    setIsCourseModalOpen(true);
                  }}
                  className="p-1 hover:bg-[#F5F1EB] text-[#8D99AE] hover:text-[#2B2D42] rounded-lg transition-colors cursor-pointer"
                  title={`Editar curso: ${c.name}`}
                  aria-label={`Editar curso: ${c.name}`}
                >
                  <Edit2 className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Filter Row: Status Pills */}
        <div
          onWheel={(e) => {
            if (e.deltaY !== 0) {
              e.currentTarget.scrollLeft += e.deltaY;
            }
          }}
          className="flex items-center gap-1.5 overflow-x-auto pb-1 tab-scroll-pc scroll-touch touch-pan-x flex-nowrap"
        >
          {[
            { id: 'ALL', label: `Todos (${works.length})` },
            { id: 'PLANIFICACION', label: `Planificación (${works.filter((w) => w.status === 'PLANIFICACION').length})` },
            { id: 'INVESTIGACION', label: `Investigando (${works.filter((w) => w.status === 'INVESTIGACION').length})` },
            { id: 'REDACTANDO', label: `Redactando (${works.filter((w) => w.status === 'REDACTANDO').length})` },
            { id: 'EN_REVISION', label: `En Revisión (${works.filter((w) => w.status === 'EN_REVISION').length})` },
            { id: 'CORRECCION', label: `En Corrección (${works.filter((w) => w.status === 'CORRECCION').length})` },
            { id: 'ENTREGADO', label: `Entregados (${works.filter((w) => w.status === 'ENTREGADO').length})` },
            { id: 'ARCHIVADO', label: `Archivados (${works.filter((w) => w.status === 'ARCHIVADO').length})` }
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setSelectedStatusFilter(st.id)}
              className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer select-none shrink-0 ${
                selectedStatusFilter === st.id
                  ? 'bg-[#E8A598] text-[#2B2D42] font-bold shadow-2xs'
                  : 'bg-white text-[#5A6275] border border-[#EBE5DF] hover:bg-[#F5F1EB]'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── 3. WORKS CARDS GRID ─── */}
      {filteredWorks.length === 0 ? (
        <Card variant="subtle" className="text-center py-12 rounded-3xl border-dashed space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#FDF2F0] border border-[#E8A598]/40 flex items-center justify-center mx-auto text-[#D98880]">
            <FolderOpen className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h4 className="font-bold text-[#2B2D42] text-sm">No se encontraron trabajos</h4>
            <p className="text-xs text-[#8D99AE] max-w-sm mx-auto">
              No hay entregables que coincidan con los filtros seleccionados o búsqueda.
            </p>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setSelectedCourseFilter('ALL');
              setSelectedStatusFilter('ALL');
              setSearchQuery('');
            }}
            className="font-bold mt-2"
          >
            Limpiar Filtros
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredWorks.map((work) => {
            const course = coursesMap.get(work.courseId);
            const workSources = allSources.filter((s) => s.workIds.includes(work.id));
            const verifiedSourcesCount = workSources.filter((s) => s.verificationStatus === 'VERIFIED').length;
            const workTasks = tasks.filter((t) => t.workId === work.id);
            const completedTasks = workTasks.filter((t) => t.isCompleted).length;
            const taskProgress = workTasks.length > 0 ? Math.round((completedTasks / workTasks.length) * 100) : 0;
            const workInquiries = inquiries.filter((inq) => inq.workId === work.id);
            const pendingInquiries = workInquiries.filter((inq) => inq.status === 'DRAFT' || inq.status === 'SENT').length;
            const daysLeft = Math.ceil((work.deadline - Date.now()) / 86400000);

            const isDelivered = work.status === 'ENTREGADO';
            const typeMeta = WORK_TYPE_META[work.type] || WORK_TYPE_META.OTRO;

            return (
              <div
                key={work.id}
                onClick={() => onSelectWork(work.id)}
                className={`group relative rounded-3xl bg-white border border-[#EBE5DF] p-4 sm:p-5 shadow-xs hover:shadow-md hover:border-[#E8A598]/80 transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-4 ${
                  isDelivered ? 'bg-emerald-50/20 border-emerald-200/60' : ''
                }`}
              >
                {/* Card Top: Badges & Status Dropdown */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2 flex-wrap sm:flex-nowrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* Course Pill */}
                      <span
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold text-[#2B2D42] truncate max-w-[180px]"
                        style={{
                          backgroundColor: course?.color ? `${course.color}25` : '#FAF8F5',
                          border: `1px solid ${course?.color ? `${course.color}50` : '#EBE5DF'}`
                        }}
                      >
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: course?.color || '#D98880' }}
                        />
                        <span className="truncate">{course?.name || 'Asignatura'}</span>
                      </span>

                      {/* Work Type Pill */}
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${typeMeta.color}`}>
                        {typeMeta.label}
                      </span>

                      <CitationStyleBadge style={work.citationStyle} />
                    </div>

                    {/* Interactive Status Dropdown & Edit / Delete Buttons */}
                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={work.status}
                        onChange={(e) => handleCardStatusChange(e, work)}
                        className="text-[11px] font-bold bg-[#FAF8F5] border border-[#EBE5DF] rounded-xl px-2 py-1 text-[#2B2D42] focus:outline-none focus:border-[#E8A598] cursor-pointer shadow-2xs hover:bg-white transition-colors"
                        title="Cambiar estado del trabajo"
                      >
                        <option value="PLANIFICACION">Planificación</option>
                        <option value="INVESTIGACION">Investigando</option>
                        <option value="REDACTANDO">Redactando</option>
                        <option value="EN_REVISION">En Revisión</option>
                        <option value="CORRECCION">En Corrección</option>
                        <option value="ENTREGADO">Entregado 🎉</option>
                        <option value="ARCHIVADO">Archivado</option>
                      </select>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setWorkToEdit(work);
                          setIsWorkModalOpen(true);
                        }}
                        className="p-1 hover:bg-[#F5F1EB] text-[#8D99AE] hover:text-[#2B2D42] rounded-lg transition-colors cursor-pointer"
                        title={`Editar trabajo: ${work.title}`}
                        aria-label={`Editar trabajo: ${work.title}`}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setWorkToEdit(work);
                          setIsWorkModalOpen(true);
                        }}
                        className="p-1 hover:bg-rose-50 text-[#8D99AE] hover:text-[#C62828] rounded-lg transition-colors cursor-pointer"
                        title={`Eliminar trabajo: ${work.title}`}
                        aria-label={`Eliminar trabajo: ${work.title}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Title & Instructions preview */}
                  <div className="space-y-1">
                    <h3 className="font-extrabold text-sm sm:text-base text-[#2B2D42] leading-snug group-hover:text-[#8C3A32] transition-colors line-clamp-2">
                      {work.title}
                    </h3>
                    <p className="text-xs text-[#5A6275] line-clamp-2 leading-relaxed">
                      {work.rawInstructions || 'Sin consignas oficiales registradas. Haz clic para redactar o analizar rúbrica.'}
                    </p>
                  </div>
                </div>

                {/* Card Middle: Tasks Progress Bar */}
                {workTasks.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-[11px] text-[#5A6275]">
                      <span className="font-semibold">Progreso de tareas</span>
                      <span className="font-bold text-[#2B2D42]">{completedTasks}/{workTasks.length} ({taskProgress}%)</span>
                    </div>
                    <div className="w-full h-1.5 bg-[#F5F1EB] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#E8A598] to-[#D98880] rounded-full transition-all duration-300"
                        style={{ width: `${taskProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Card Bottom: Metadata Badges & Deadline */}
                <div className="pt-3 border-t border-[#EBE5DF]/70 flex items-center justify-between text-xs text-[#5A6275] gap-2 flex-wrap">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1" title={`${workSources.length} fuentes científicas vinculadas (${verifiedSourcesCount} verificadas)`}>
                      <BookOpen className="w-3.5 h-3.5 text-[#8D99AE]" />
                      <span className="font-semibold text-[#2B2D42]">{workSources.length}</span>
                      <span className="text-[11px]">fuentes</span>
                      {verifiedSourcesCount > 0 && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Contiene fuentes 100% verificadas" />
                      )}
                    </span>

                    {pendingInquiries > 0 && (
                      <span className="flex items-center gap-1 text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-200/60 text-[11px] font-bold" title={`${pendingInquiries} dudas docentes pendientes`}>
                        <HelpCircle className="w-3 h-3" />
                        <span>{pendingInquiries} dudas</span>
                      </span>
                    )}
                  </div>

                  {/* Deadline countdown */}
                  <div className="flex items-center gap-1 shrink-0">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold ${
                        isDelivered
                          ? 'bg-emerald-100/70 text-emerald-900'
                          : daysLeft < 0
                          ? 'bg-rose-100 text-rose-900 border border-rose-200'
                          : daysLeft <= 3
                          ? 'bg-rose-50 text-rose-800 border border-rose-200'
                          : daysLeft <= 7
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : 'bg-[#FAF8F5] text-[#5A6275] border border-[#EBE5DF]'
                      }`}
                    >
                      <Clock className="w-3 h-3" />
                      <span>
                        {isDelivered
                          ? 'Entregado'
                          : daysLeft < 0
                          ? `Venció hace ${Math.abs(daysLeft)}d`
                          : daysLeft === 0
                          ? '¡Vence hoy!'
                          : `${daysLeft} días restantes`}
                      </span>
                    </span>
                    <ChevronRight className="w-4 h-4 text-[#8D99AE] group-hover:text-[#2B2D42] group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              </div>
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

      {/* Work Modal for creating/editing/deleting works and theses */}
      <WorkModal
        isOpen={isWorkModalOpen}
        onClose={() => {
          setIsWorkModalOpen(false);
          setWorkToEdit(null);
        }}
        workToEdit={workToEdit}
        initialCourseId={selectedCourseFilter !== 'ALL' ? selectedCourseFilter : undefined}
      />
    </div>
  );
};
