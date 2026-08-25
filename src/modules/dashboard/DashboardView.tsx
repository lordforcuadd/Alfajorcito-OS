import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Clock,
  Calendar,
  AlertTriangle,
  HelpCircle,
  Search,
  BookOpen,
  CheckSquare,
  Sparkles,
  ChevronRight,
  Plus,
  BookMarked,
  CheckCircle2,
  AlertCircle,
  Brain,
  GraduationCap,
  ArrowUpRight,
  Bookmark,
  Check,
  Award,
  FileText
} from 'lucide-react';
import { db } from '../../db';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge, VerificationBadge, CitationStyleBadge } from '../../components/common/Badge';
import { useToast } from '../../components/common/Toast';
import { calculateDaysRemaining, isWorkUpcoming, isWorkOverdue } from '../../utils/academicWorkUtils';
import { DEFAULT_USER_PROFILE, type UserProfile, type Work, type Course, type Task, type Source, type InquiryToTeacher, type Note, type Concept, type Paraphrase } from '../../types';
import type { NavTab } from '../../components/layout/AppShell';

export interface DashboardViewProps {
  onOpenWork: (workId: string) => void;
  onOpenSource: (sourceId: string) => void;
  onOpenNote: (noteId: string) => void;
  onNavigateTab?: (tab: NavTab) => void;
  onQuickCapture: (tab?: 'note' | 'work' | 'course' | 'source' | 'inquiry' | 'task') => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onOpenWork,
  onOpenSource,
  onOpenNote,
  onNavigateTab,
  onQuickCapture
}) => {
  const now = Date.now();
  const oneDayMs = 86400000;

  // Database queries
  const courses = useLiveQuery(() => db.courses.toArray()) || [];
  const works = useLiveQuery(() => db.works.toArray()) || [];
  const tasks = useLiveQuery(() => db.tasks.toArray()) || [];
  const sources = useLiveQuery(() => db.sources.toArray()) || [];
  const inquiries = useLiveQuery(() => db.inquiries.toArray()) || [];
  const notes = useLiveQuery(() => db.notes.toArray()) || [];
  const concepts = useLiveQuery(() => db.concepts.toArray()) || [];
  const paraphrases = useLiveQuery(() => db.paraphrases.toArray()) || [];

  const coursesMap = React.useMemo(() => new Map(courses.map((c) => [c.id, c])), [courses]);

  const startOfToday = new Date().setHours(0, 0, 0, 0);
  const endOfToday = new Date().setHours(23, 59, 59, 999);

  // 1. ¿Qué debo hacer hoy? (Tasks due today or checklist items without date, strictly not past days)
  const todayTasks = tasks.filter(
    (t) => !t.isCompleted && (!t.dueDate || (t.dueDate >= startOfToday && t.dueDate <= endOfToday))
  );

  // 2. ¿Qué se acerca? (Works or deadlines in next 14 days)
  const upcomingWorks = works
    .filter((w) => isWorkUpcoming(w, now, 14))
    .sort((a, b) => a.deadline - b.deadline);

  // 3. ¿Qué está atrasado? (Overdue tasks strictly before today or overdue unsubmitted works)
  const overdueWorks = works.filter((w) => isWorkOverdue(w, now));
  const overdueTasks = tasks.filter((t) => !t.isCompleted && t.dueDate && t.dueDate < startOfToday);

  // 4. ¿Qué está bloqueado? (Pending teacher inquiries)
  const blockedInquiries = inquiries.filter((inq) => inq.status === 'SENT' || inq.status === 'DRAFT');

  // 5. ¿Qué estoy investigando? (Works currently in active research/writing/review status)
  const activeResearchWorks = works.filter((w) => w.status !== 'ENTREGADO' && w.status !== 'ARCHIVADO');

  // 6. ¿Qué investigué recientemente? (Latest sources added)
  const recentSources = [...sources].sort((a, b) => b.createdAt - a.createdAt).slice(0, 3);

  // 7. ¿Qué debo revisar? (Paraphrases pending review, unverified sources)
  const pendingParaphrases = paraphrases.filter((p) => p.fidelityReviewStatus === 'PENDING_REVIEW' || p.fidelityReviewStatus === 'NEEDS_ADJUSTMENT');
  const unverifiedSources = sources.filter((s) => s.verificationStatus === 'UNVERIFIED');

  // 8. ¿Qué aprendí recientemente? (Latest atomic notes)
  const recentNotes = [...notes].sort((a, b) => b.createdAt - a.createdAt).slice(0, 3);

  // Dynamic user profile query
  const userProfileRecord = useLiveQuery(() => db.settings.get('user_profile'));
  const userProfile = (userProfileRecord?.value as UserProfile | undefined) || DEFAULT_USER_PROFILE;

  // Time-aware greeting (updates automatically across midnight/focus)
  const [currentTime, setCurrentTime] = React.useState(Date.now());
  React.useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 60000);
    const handleFocus = () => setCurrentTime(Date.now());
    window.addEventListener('focus', handleFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const greeting = React.useMemo(() => {
    const hour = new Date(currentTime).getHours();
    if (hour >= 5 && hour < 12) return { text: '¡Buenos días', icon: '☀️' };
    if (hour >= 12 && hour < 19) return { text: '¡Buenas tardes', icon: '🌤️' };
    return { text: '¡Buenas noches', icon: '🌙' };
  }, [currentTime]);

  // Toggle Task Completion Handler
  const handleToggleTask = async (taskId: string, currentStatus: boolean) => {
    await db.tasks.update(taskId, {
      isCompleted: !currentStatus,
      completedAt: !currentStatus ? Date.now() : undefined,
      updatedAt: Date.now()
    });
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* ─── 1. HERO COCKPIT CARD (Adaptive Portrait & Landscape) ─── */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-[#FDF2F0] via-white to-[#F3E5F5] border border-[#E8A598]/50 p-4 sm:p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          {/* Left: Greeting & Profile Context */}
          <div className="space-y-3 min-w-0">
            {/* Institution & Cycle Badges */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
              <span className="inline-flex items-center gap-1 bg-[#FDF2F0] text-[#8C3A32] px-2.5 py-1 rounded-xl border border-[#E8A598]/60 shadow-2xs">
                <GraduationCap className="w-3.5 h-3.5 text-[#D98880] shrink-0" />
                <span className="truncate max-w-[200px] sm:max-w-none">{userProfile.institution || 'USMP'}</span>
              </span>
              <span className="inline-flex items-center bg-[#F5F1EB] text-[#5A6275] px-2.5 py-1 rounded-xl border border-[#EBE5DF] shadow-2xs">
                <span className="truncate max-w-[160px] sm:max-w-none">{userProfile.faculty || 'FCCTP'}</span>
              </span>
              <span className="inline-flex items-center bg-[#F3E5F5] text-[#6A1B9A] px-2.5 py-1 rounded-xl border border-[#CE93D8]/60 shadow-2xs">
                {userProfile.currentCycle || '8vo Ciclo'}
              </span>
            </div>

            <div>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-[#2B2D42] tracking-tight">
                {greeting.text}, <span className="text-[#8C3A32]">{userProfile.name}</span>! {greeting.icon}
              </h2>
              <p className="text-xs sm:text-sm text-[#5A6275] font-medium mt-0.5">
                Panel Académico & Segundo Cerebro · {userProfile.major || 'Psicología'}
              </p>
            </div>

            {/* Interactive Metrics Bar (Click to navigate) */}
            <div className="grid grid-cols-2 xs:grid-cols-4 gap-2 pt-1">
              <button
                type="button"
                onClick={() => onNavigateTab?.('curriculum')}
                className="flex items-center gap-2 p-2 rounded-xl bg-white/90 hover:bg-white border border-[#EBE5DF] hover:border-[#CBD5E1] shadow-2xs transition-all cursor-pointer text-left group"
                title="Ver Malla Curricular"
              >
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <BookOpen className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-extrabold text-[#2B2D42] block leading-none">{courses.length}</span>
                  <span className="text-[10px] text-[#5A6275] font-medium block truncate mt-0.5">Cursos</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => onNavigateTab?.('works')}
                className="flex items-center gap-2 p-2 rounded-xl bg-white/90 hover:bg-white border border-[#EBE5DF] hover:border-[#E8A598] shadow-2xs transition-all cursor-pointer text-left group"
                title="Ver Entregables & Tesis"
              >
                <div className="w-7 h-7 rounded-lg bg-[#FDF2F0] text-[#8C3A32] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <GraduationCap className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-extrabold text-[#2B2D42] block leading-none">{works.length}</span>
                  <span className="text-[10px] text-[#5A6275] font-medium block truncate mt-0.5">Trabajos</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => onNavigateTab?.('research')}
                className="flex items-center gap-2 p-2 rounded-xl bg-white/90 hover:bg-white border border-[#EBE5DF] hover:border-[#80CBC4] shadow-2xs transition-all cursor-pointer text-left group"
                title="Ver Fuentes & Papers"
              >
                <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-800 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Search className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-extrabold text-[#2B2D42] block leading-none">{sources.length}</span>
                  <span className="text-[10px] text-[#5A6275] font-medium block truncate mt-0.5">Fuentes</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => onNavigateTab?.('brain')}
                className="flex items-center gap-2 p-2 rounded-xl bg-white/90 hover:bg-white border border-[#EBE5DF] hover:border-[#B39DDB] shadow-2xs transition-all cursor-pointer text-left group"
                title="Ver Segundo Cerebro"
              >
                <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-800 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Brain className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-extrabold text-[#2B2D42] block leading-none">{notes.length}</span>
                  <span className="text-[10px] text-[#5A6275] font-medium block truncate mt-0.5">Notas</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 2. RESPONSIVE GRID OF 8 ACADEMIC QUESTIONS ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
        {/* Q1: ¿Qué debo hacer hoy? */}
        <Card variant="elevated" className="h-full flex flex-col justify-between p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-[#EBE5DF] hover:border-[#E8A598]/70 hover:shadow-md transition-all">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#F5F1EB]">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className="w-7 h-7 rounded-lg bg-[#FDF2F0] text-[#D98880] flex items-center justify-center shrink-0">
                  <Clock className="w-3.5 h-3.5" />
                </div>
                <h3 className="font-extrabold text-xs sm:text-sm text-[#2B2D42] leading-tight">
                  ¿Qué debo hacer hoy?
                </h3>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-[#FDF2F0] text-[#8C3A32] border border-[#E8A598]/50 shrink-0">
                {todayTasks.length} pendientes
              </span>
            </div>

            <div className="space-y-2">
              {todayTasks.length === 0 ? (
                <div className="py-6 text-center space-y-1">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto opacity-80" />
                  <p className="text-xs font-bold text-[#2B2D42]">¡Estás al día!</p>
                  <p className="text-[11px] text-[#8D99AE]">No tienes tareas urgentes pendientes para hoy.</p>
                </div>
              ) : (
                todayTasks.slice(0, 3).map((task) => (
                  <div
                    key={task.id}
                    className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[#FAF8F5] hover:bg-[#FDF2F0] border border-[#EBE5DF] transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={task.isCompleted}
                      onChange={() => handleToggleTask(task.id, task.isCompleted)}
                      className="mt-0.5 w-4 h-4 rounded text-[#E8A598] focus:ring-[#E8A598] cursor-pointer shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs font-semibold leading-snug break-words [overflow-wrap:anywhere] ${task.isCompleted ? 'line-through text-[#8D99AE]' : 'text-[#2B2D42]'}`}>
                        {task.title}
                      </p>
                      {task.priority === 'URGENT' && (
                        <span className="text-[9px] font-extrabold text-[#C62828] bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 mt-1 inline-block uppercase">
                          Urgente
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-2 mt-auto">
            <button
              onClick={() => onQuickCapture('task')}
              className="w-full py-1.5 text-[11px] font-bold text-[#8C3A32] hover:bg-[#FDF2F0] rounded-xl transition-colors flex items-center justify-center gap-1 cursor-pointer"
            >
              <Plus className="w-3 h-3" /> Agregar tarea
            </button>
          </div>
        </Card>

        {/* Q2: ¿Qué se acerca? */}
        <Card variant="elevated" className="h-full flex flex-col justify-between p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-[#EBE5DF] hover:border-[#FFB300]/70 hover:shadow-md transition-all">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#F5F1EB]">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className="w-7 h-7 rounded-lg bg-[#FFF8E1] text-[#FFB300] flex items-center justify-center shrink-0">
                  <Calendar className="w-3.5 h-3.5" />
                </div>
                <h3 className="font-extrabold text-xs sm:text-sm text-[#2B2D42] leading-tight">
                  ¿Qué se acerca?
                </h3>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-[#FFF8E1] text-[#B78103] border border-[#FFE082] shrink-0">
                14 días
              </span>
            </div>

            <div className="space-y-2">
              {upcomingWorks.length === 0 ? (
                <div className="py-6 text-center space-y-1">
                  <Calendar className="w-6 h-6 text-amber-500 mx-auto opacity-70" />
                  <p className="text-xs font-bold text-[#2B2D42]">Calendario despejado</p>
                  <p className="text-[11px] text-[#8D99AE]">No hay entregas en las próximas 2 semanas.</p>
                </div>
              ) : (
                upcomingWorks.slice(0, 3).map((work) => {
                  const daysLeft = calculateDaysRemaining(work.deadline, now);
                  const course = coursesMap.get(work.courseId);
                  return (
                    <div
                      key={work.id}
                      onClick={() => onOpenWork(work.id)}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-[#FAF8F5] hover:bg-[#FFF8E1]/60 border border-[#EBE5DF] hover:border-[#FFB300]/50 transition-all cursor-pointer gap-2 group"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-[#2B2D42] truncate group-hover:text-[#8C3A32]">{work.title}</p>
                        <p className="text-[10px] text-[#5A6275] truncate mt-0.5">{course?.name || 'Materia'}</p>
                      </div>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md shrink-0 ${daysLeft <= 3 ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'}`}>
                        {daysLeft === 0 ? '¡Hoy!' : daysLeft === 1 ? 'Mañana' : `${daysLeft}d`}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="pt-2 mt-auto">
            <button
              onClick={() => onNavigateTab?.('works')}
              className="w-full py-1.5 text-[11px] font-bold text-[#5A6275] hover:text-[#2B2D42] hover:bg-[#F5F1EB] rounded-xl transition-colors flex items-center justify-center gap-1 cursor-pointer"
            >
              <span>Ver todos los trabajos</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        </Card>

        {/* Q3: ¿Qué está atrasado? */}
        <Card variant="elevated" className="h-full flex flex-col justify-between p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-[#EBE5DF] hover:border-rose-300 hover:shadow-md transition-all">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#F5F1EB]">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className="w-7 h-7 rounded-lg bg-[#FFEBEE] text-[#C62828] flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-3.5 h-3.5" />
                </div>
                <h3 className="font-extrabold text-xs sm:text-sm text-[#2B2D42] leading-tight">
                  ¿Qué está atrasado?
                </h3>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg shrink-0 ${overdueWorks.length + overdueTasks.length > 0 ? 'bg-rose-100 text-rose-800 border border-rose-200' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'}`}>
                {overdueWorks.length + overdueTasks.length} alertas
              </span>
            </div>

            <div className="space-y-2">
              {overdueWorks.length === 0 && overdueTasks.length === 0 ? (
                <div className="py-6 text-center space-y-1 bg-emerald-50/60 rounded-xl border border-emerald-200/60 p-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
                  <p className="text-xs font-bold text-emerald-900">¡Al día y sin retrasos!</p>
                  <p className="text-[11px] text-emerald-700">Todas tus entregas están en fecha.</p>
                </div>
              ) : (
                <>
                  {overdueWorks.map((work) => (
                    <div
                      key={work.id}
                      onClick={() => onOpenWork(work.id)}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-rose-50/70 border border-rose-200 hover:bg-rose-100/70 transition-all cursor-pointer gap-2"
                    >
                      <span className="text-xs font-bold text-rose-900 truncate min-w-0 flex-1">{work.title}</span>
                      <span className="text-[9px] font-bold text-rose-800 bg-rose-100 px-1.5 py-0.5 rounded shrink-0">
                        Vencido
                      </span>
                    </div>
                  ))}
                  {overdueTasks.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => {
                        if (task.workId) onOpenWork(task.workId);
                      }}
                      className={`flex items-center justify-between p-2.5 rounded-xl bg-rose-50/70 border border-rose-200 transition-all gap-2 ${
                        task.workId ? 'cursor-pointer hover:bg-rose-100/70' : ''
                      }`}
                      title={task.workId ? 'Clic para abrir el trabajo vinculado' : undefined}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={async (e) => {
                            e.stopPropagation();
                            await db.tasks.update(task.id, { isCompleted: true, updatedAt: Date.now() });
                          }}
                          className="text-rose-400 hover:text-emerald-600 transition-colors cursor-pointer shrink-0"
                          title="Marcar como completada"
                          aria-label="Marcar tarea como completada"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                        <span className="text-xs text-rose-900 truncate">{task.title}</span>
                      </div>
                      <span className="text-[9px] font-bold text-rose-800 bg-rose-100 px-1.5 py-0.5 rounded shrink-0">
                        Tarea
                      </span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          <div className="pt-2 mt-auto">
            <button
              onClick={() => onNavigateTab?.('works')}
              className="w-full py-1.5 text-[11px] font-bold text-[#5A6275] hover:text-[#2B2D42] hover:bg-[#F5F1EB] rounded-xl transition-colors flex items-center justify-center gap-1 cursor-pointer"
            >
              <span>Revisar cronograma</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        </Card>

        {/* Q4: ¿Qué está bloqueado? */}
        <Card variant="elevated" className="h-full flex flex-col justify-between p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-[#EBE5DF] hover:border-[#CE93D8] hover:shadow-md transition-all">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#F5F1EB]">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className="w-7 h-7 rounded-lg bg-[#F3E5F5] text-[#6A1B9A] flex items-center justify-center shrink-0">
                  <HelpCircle className="w-3.5 h-3.5" />
                </div>
                <h3 className="font-extrabold text-xs sm:text-sm text-[#2B2D42] leading-tight">
                  ¿Qué está bloqueado?
                </h3>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-[#F3E5F5] text-[#6A1B9A] border border-[#CE93D8]/60 shrink-0">
                {blockedInquiries.length} dudas
              </span>
            </div>

            <div className="space-y-2">
              {blockedInquiries.length === 0 ? (
                <div className="py-6 text-center space-y-1">
                  <Sparkles className="w-6 h-6 text-purple-400 mx-auto opacity-70" />
                  <p className="text-xs font-bold text-[#2B2D42]">Sin bloqueos</p>
                  <p className="text-[11px] text-[#8D99AE]">No hay consultas docentes pendientes.</p>
                </div>
              ) : (
                blockedInquiries.map((inq) => {
                  const course = coursesMap.get(inq.courseId);
                  return (
                    <div
                      key={inq.id}
                      className="p-2.5 rounded-xl bg-[#FAF8F5] hover:bg-[#F3E5F5]/40 border border-[#EBE5DF] transition-colors space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold text-[#6A1B9A] uppercase truncate">{course?.name || 'Profesor'}</span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 shrink-0">
                          {inq.status === 'SENT' ? 'Enviada' : 'Borrador'}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-[#2B2D42] line-clamp-1">{inq.topic}</p>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="pt-2 mt-auto">
            <button
              onClick={() => onQuickCapture('inquiry')}
              className="w-full py-1.5 text-[11px] font-bold text-[#6A1B9A] hover:bg-[#F3E5F5] rounded-xl transition-colors flex items-center justify-center gap-1 cursor-pointer"
            >
              <Plus className="w-3 h-3" /> Formular duda a docente
            </button>
          </div>
        </Card>

        {/* Q5: ¿Qué estoy investigando? */}
        <Card variant="elevated" className="h-full flex flex-col justify-between p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-[#EBE5DF] hover:border-indigo-300 hover:shadow-md transition-all">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#F5F1EB]">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
                  <Search className="w-3.5 h-3.5" />
                </div>
                <h3 className="font-extrabold text-xs sm:text-sm text-[#2B2D42] leading-tight">
                  ¿Qué investigo?
                </h3>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">
                {activeResearchWorks.length} activos
              </span>
            </div>

            <div className="space-y-2">
              {activeResearchWorks.length === 0 ? (
                <div className="py-6 text-center space-y-1">
                  <Search className="w-6 h-6 text-indigo-400 mx-auto opacity-70" />
                  <p className="text-xs font-bold text-[#2B2D42]">Sin investigaciones</p>
                  <p className="text-[11px] text-[#8D99AE]">Crea un nuevo entregable para iniciar.</p>
                </div>
              ) : (
                activeResearchWorks.slice(0, 3).map((work) => {
                  const workSources = sources.filter((s) => s.workIds.includes(work.id));
                  return (
                    <div
                      key={work.id}
                      onClick={() => onOpenWork(work.id)}
                      className="p-2.5 rounded-xl bg-[#FAF8F5] hover:bg-indigo-50/50 border border-[#EBE5DF] transition-all cursor-pointer space-y-1.5 group"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-[#2B2D42] truncate min-w-0 flex-1 group-hover:text-indigo-900">{work.title}</span>
                        <CitationStyleBadge style={work.citationStyle} />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-[#5A6275]">
                        <span>{workSources.length} de {work.minRequiredSources || 3} fuentes</span>
                        <span className="font-bold text-indigo-700">{Math.min(100, Math.round((workSources.length / (work.minRequiredSources || 3)) * 100))}%</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="pt-2 mt-auto">
            <button
              onClick={() => onNavigateTab?.('research')}
              className="w-full py-1.5 text-[11px] font-bold text-indigo-700 hover:bg-indigo-50 rounded-xl transition-colors flex items-center justify-center gap-1 cursor-pointer"
            >
              <span>Explorar fuentes científicas</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        </Card>

        {/* Q6: ¿Qué investigué recientemente? */}
        <Card variant="elevated" className="h-full flex flex-col justify-between p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-[#EBE5DF] hover:border-teal-300 hover:shadow-md transition-all">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#F5F1EB]">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-800 flex items-center justify-center shrink-0">
                  <BookOpen className="w-3.5 h-3.5" />
                </div>
                <h3 className="font-extrabold text-xs sm:text-sm text-[#2B2D42] leading-tight">
                  ¿Qué investigué?
                </h3>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-teal-50 text-teal-800 border border-teal-200 shrink-0">
                {recentSources.length} recientes
              </span>
            </div>

            <div className="space-y-2">
              {recentSources.length === 0 ? (
                <div className="py-6 text-center space-y-1">
                  <BookOpen className="w-6 h-6 text-teal-500 mx-auto opacity-70" />
                  <p className="text-xs font-bold text-[#2B2D42]">Sin fuentes aún</p>
                  <p className="text-[11px] text-[#8D99AE]">Indexa tu primer paper con DOI.</p>
                </div>
              ) : (
                recentSources.map((src) => (
                  <div
                    key={src.id}
                    onClick={() => onOpenSource(src.id)}
                    className="p-2.5 rounded-xl bg-[#FAF8F5] hover:bg-teal-50/60 border border-[#EBE5DF] transition-colors cursor-pointer space-y-1 group"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold text-[#00695C] uppercase">{src.year}</span>
                      <VerificationBadge status={src.verificationStatus} />
                    </div>
                    <p className="text-xs font-semibold text-[#2B2D42] line-clamp-1 group-hover:text-teal-900">{src.title}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-2 mt-auto">
            <button
              onClick={() => onQuickCapture('source')}
              className="w-full py-1.5 text-[11px] font-bold text-teal-800 hover:bg-teal-50 rounded-xl transition-colors flex items-center justify-center gap-1 cursor-pointer"
            >
              <Plus className="w-3 h-3" /> Registrar fuente / DOI
            </button>
          </div>
        </Card>

        {/* Q7: ¿Qué debo revisar? */}
        <Card variant="elevated" className="h-full flex flex-col justify-between p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-[#EBE5DF] hover:border-amber-300 hover:shadow-md transition-all">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#F5F1EB]">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className="w-7 h-7 rounded-lg bg-[#FFF8E1] text-[#E65100] flex items-center justify-center shrink-0">
                  <CheckSquare className="w-3.5 h-3.5" />
                </div>
                <h3 className="font-extrabold text-xs sm:text-sm text-[#2B2D42] leading-tight">
                  ¿Qué debo revisar?
                </h3>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg shrink-0 ${pendingParaphrases.length + unverifiedSources.length > 0 ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'}`}>
                {pendingParaphrases.length + unverifiedSources.length} alertas
              </span>
            </div>

            <div className="space-y-2">
              {pendingParaphrases.length === 0 && unverifiedSources.length === 0 ? (
                <div className="py-6 text-center space-y-1 bg-emerald-50/60 rounded-xl border border-emerald-200/60 p-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
                  <p className="text-xs font-bold text-emerald-900">100% Verificado</p>
                  <p className="text-[11px] text-emerald-700">Citas y fuentes auditadas sin alertas.</p>
                </div>
              ) : (
                <>
                  {pendingParaphrases.slice(0, 2).map((para) => (
                    <div
                      key={para.id}
                      onClick={() => onNavigateTab?.('pipeline')}
                      className="p-2.5 rounded-xl bg-[#FFF8E1]/60 border border-[#FFE082] text-xs space-y-0.5 cursor-pointer hover:bg-[#FFF8E1] transition-colors"
                    >
                      <span className="text-[10px] font-bold text-[#E65100] uppercase">Auditoría de Paráfrasis</span>
                      <p className="text-[#2B2D42] line-clamp-1 font-medium">{para.finalParaphrase}</p>
                    </div>
                  ))}
                  {unverifiedSources.slice(0, 2).map((src) => (
                    <div
                      key={src.id}
                      onClick={() => onOpenSource(src.id)}
                      className="p-2.5 rounded-xl bg-rose-50/70 border border-rose-200 text-xs flex items-center justify-between cursor-pointer hover:bg-rose-100/70 transition-colors gap-2"
                    >
                      <span className="text-[#2B2D42] truncate min-w-0 flex-1">{src.title}</span>
                      <span className="text-[10px] text-rose-800 font-bold shrink-0">Sin DOI</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          <div className="pt-2 mt-auto">
            <button
              onClick={() => onNavigateTab?.('pipeline')}
              className="w-full py-1.5 text-[11px] font-bold text-[#E65100] hover:bg-[#FFF8E1] rounded-xl transition-colors flex items-center justify-center gap-1 cursor-pointer"
            >
              <span>Ir a Trazabilidad de Citas</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        </Card>

        {/* Q8: ¿Qué aprendí recientemente? */}
        <Card variant="elevated" className="h-full flex flex-col justify-between p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-[#EBE5DF] hover:border-[#E8A598] hover:shadow-md transition-all">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#F5F1EB]">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className="w-7 h-7 rounded-lg bg-[#FDF2F0] text-[#8C3A32] flex items-center justify-center shrink-0">
                  <Brain className="w-3.5 h-3.5" />
                </div>
                <h3 className="font-extrabold text-xs sm:text-sm text-[#2B2D42] leading-tight">
                  ¿Qué aprendí?
                </h3>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-[#FDF2F0] text-[#8C3A32] border border-[#E8A598]/50 shrink-0">
                {recentNotes.length} notas
              </span>
            </div>

            <div className="space-y-2">
              {recentNotes.length === 0 ? (
                <div className="py-6 text-center space-y-1">
                  <Brain className="w-6 h-6 text-[#D98880] mx-auto opacity-70" />
                  <p className="text-xs font-bold text-[#2B2D42]">Sin notas atómicas</p>
                  <p className="text-[11px] text-[#8D99AE]">Crea tu primera nota para alimentar el grafo.</p>
                </div>
              ) : (
                recentNotes.map((note) => {
                  const paraLabel =
                    note.paraCategory === 'PROJECT'
                      ? 'Proyecto'
                      : note.paraCategory === 'AREA'
                      ? 'Materia'
                      : note.paraCategory === 'RESOURCE'
                      ? 'Recurso'
                      : note.paraCategory === 'ARCHIVE'
                      ? 'Archivada'
                      : 'Idea Rápida';

                  return (
                    <div
                      key={note.id}
                      onClick={() => onOpenNote(note.id)}
                      className="p-2.5 rounded-xl bg-[#FAF8F5] hover:bg-[#FDF2F0] border border-[#EBE5DF] transition-colors cursor-pointer space-y-1 group"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold text-[#8C3A32] uppercase truncate">{paraLabel}</span>
                        <span className="text-[10px] text-[#8D99AE] font-mono shrink-0">[[wiki]]</span>
                      </div>
                      <p className="text-xs font-semibold text-[#2B2D42] line-clamp-1 group-hover:text-[#8C3A32]">{note.title}</p>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="pt-2 mt-auto">
            <button
              onClick={() => onQuickCapture('note')}
              className="w-full py-1.5 text-[11px] font-bold text-[#8C3A32] hover:bg-[#FDF2F0] rounded-xl transition-colors flex items-center justify-center gap-1 cursor-pointer"
            >
              <Plus className="w-3 h-3" /> Tomar nota atómica
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
};

