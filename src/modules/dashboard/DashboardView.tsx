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
  GraduationCap
} from 'lucide-react';
import { db } from '../../db';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge, VerificationBadge, CitationStyleBadge } from '../../components/common/Badge';
import type { Work, Course, Task, Source, InquiryToTeacher, Note, Concept, Paraphrase, UserProfile } from '../../types';

export interface DashboardViewProps {
  onOpenWork: (workId: string) => void;
  onOpenSource: (sourceId: string) => void;
  onOpenNote: (noteId: string) => void;
  onQuickCapture: (tab?: 'note' | 'work' | 'course' | 'source' | 'inquiry' | 'task') => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onOpenWork,
  onOpenSource,
  onOpenNote,
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

  // 1. ¿Qué debo hacer hoy? (Tasks due today or uncompleted assignment checklist)
  const todayTasks = tasks.filter((t) => !t.isCompleted && (!t.dueDate || t.dueDate <= now + oneDayMs));

  // 2. ¿Qué se acerca? (Works or deadlines in next 14 days)
  const upcomingWorks = works
    .filter((w) => w.status !== 'ENTREGADO' && w.status !== 'ARCHIVADO' && w.deadline >= now && w.deadline <= now + oneDayMs * 14)
    .sort((a, b) => a.deadline - b.deadline);

  // 3. ¿Qué está atrasado? (Overdue tasks or overdue unsubmitted works)
  const overdueWorks = works.filter((w) => w.status !== 'ENTREGADO' && w.status !== 'ARCHIVADO' && w.deadline < now);
  const overdueTasks = tasks.filter((t) => !t.isCompleted && t.dueDate && t.dueDate < now);

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

  // Toggle Task Completion Handler
  const handleToggleTask = async (taskId: string, currentStatus: boolean) => {
    await db.tasks.update(taskId, {
      isCompleted: !currentStatus,
      completedAt: !currentStatus ? Date.now() : undefined,
      updatedAt: Date.now()
    });
  };

  // Dynamic user profile query
  const userProfileRecord = useLiveQuery(() => db.settings.get('user_profile'));
  const userProfile = (userProfileRecord?.value as UserProfile | undefined) || {
    name: 'Saory',
    institution: 'Universidad de San Martín de Porres (USMP)',
    faculty: 'Facultad de Ciencias de la Comunicación, Turismo y Psicología',
    major: 'Psicología',
    currentCycle: 'VIII Ciclo (8vo Ciclo)',
    defaultCitationStyle: 'APA_7'
  };

  return (
    <div className="space-y-6">
      {/* Header Welcome Card (100% Dynamic & Reactive) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-6 rounded-3xl bg-gradient-to-br from-[#FDF2F0] via-white to-[#F3E5F5] border border-[#E8A598]/40 shadow-xs">
        <div className="space-y-2">
          {/* Institutional Chips */}
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold text-[#8C3A32]">
            <span className="inline-flex items-center gap-1 bg-[#FDF2F0] text-[#8C3A32] px-2.5 py-1 rounded-lg border border-[#E8A598]/50">
              <GraduationCap className="w-3.5 h-3.5 text-[#D98880] shrink-0" />
              <span>{userProfile.institution || 'USMP'}</span>
            </span>
            <span className="inline-flex items-center bg-[#F5F1EB] text-[#5A6275] px-2.5 py-1 rounded-lg border border-[#EBE5DF]">
              {userProfile.faculty || 'FCCTP'}
            </span>
            <span className="inline-flex items-center bg-[#F3E5F5] text-[#6A1B9A] px-2.5 py-1 rounded-lg border border-[#CE93D8]/60">
              {userProfile.currentCycle || '8vo Ciclo'}
            </span>
          </div>

          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#2B2D42] leading-tight">
              ¡Hola, {userProfile.name}! 👋
            </h2>
            <p className="text-xs text-[#8D99AE] font-medium mt-0.5">
              Panel Académico & Tesis de Grado
            </p>
          </div>

          {/* Quick Metrics Bar in Structured Chips */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs text-[#5A6275]">
            <span className="inline-flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-[#EBE5DF] shadow-2xs">
              <span className="font-bold text-[#2B2D42]">{courses.length}</span> {courses.length === 1 ? 'asignatura' : 'asignaturas'}
            </span>
            <span className="inline-flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-[#EBE5DF] shadow-2xs">
              <span className="font-bold text-[#2B2D42]">{works.length}</span> {works.length === 1 ? 'proyecto' : 'proyectos'}
            </span>
            <span className="inline-flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-[#EBE5DF] shadow-2xs">
              <span className="font-bold text-[#2B2D42]">{sources.length}</span> {sources.length === 1 ? 'fuente' : 'fuentes'}
            </span>
            <span className="inline-flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-[#EBE5DF] shadow-2xs">
              <span className="font-bold text-[#2B2D42]">{notes.length}</span> {notes.length === 1 ? 'nota' : 'notas'}
            </span>
          </div>
        </div>

        <Button
          onClick={() => onQuickCapture('note')}
          variant="primary"
          size="md"
          icon={<Plus className="w-4 h-4 stroke-[2.5]" />}
          className="shadow-sm w-full sm:w-auto shrink-0 font-bold"
        >
          Captura Rápida
        </Button>
      </div>

      {/* Grid of the 8 Core Questions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Q1: ¿Qué debo hacer hoy? */}
        <Card variant="elevated" className="flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#FDF2F0] text-[#D98880] flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm text-[#2B2D42]">¿Qué debo hacer hoy?</h3>
              </div>
              <Badge variant="rose" size="sm">
                {todayTasks.length} pendientes
              </Badge>
            </div>

            <div className="space-y-2 pt-1">
              {todayTasks.length === 0 ? (
                <p className="text-xs text-[#8D99AE] py-3 italic">¡Estás al día! No hay tareas urgentes para hoy.</p>
              ) : (
                todayTasks.slice(0, 3).map((task) => (
                  <div
                    key={task.id}
                    className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[#F5F1EB]/60 hover:bg-[#FDF2F0] transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={task.isCompleted}
                      onChange={() => handleToggleTask(task.id, task.isCompleted)}
                      className="mt-0.5 w-4 h-4 rounded text-[#E8A598] focus:ring-[#E8A598] cursor-pointer"
                    />
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs font-semibold break-words [overflow-wrap:anywhere] ${task.isCompleted ? 'line-through text-[#8D99AE]' : 'text-[#2B2D42]'}`}>
                        {task.title}
                      </p>
                      {task.priority === 'URGENT' && (
                        <span className="text-[10px] font-bold text-[#C62828] uppercase tracking-wider">Urgente</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </Card>

        {/* Q2: ¿Qué se acerca? */}
        <Card variant="elevated" className="flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#FFF8E1] text-[#FFB300] flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm text-[#2B2D42]">¿Qué se acerca?</h3>
              </div>
              <Badge variant="amber" size="sm">
                Próximos 14 días
              </Badge>
            </div>

            <div className="space-y-2 pt-1">
              {upcomingWorks.length === 0 ? (
                <p className="text-xs text-[#8D99AE] py-3 italic">No hay entregas próximas en las siguientes dos semanas.</p>
              ) : (
                upcomingWorks.slice(0, 3).map((work) => {
                  const daysLeft = Math.ceil((work.deadline - now) / oneDayMs);
                  const course = coursesMap.get(work.courseId);
                  return (
                    <div
                      key={work.id}
                      onClick={() => onOpenWork(work.id)}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-[#F5F1EB]/60 hover:bg-[#FDF2F0] hover:border-[#E8A598]/50 border border-transparent transition-all cursor-pointer gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-[#2B2D42] truncate">{work.title}</p>
                        <p className="text-[10px] text-[#5A6275] truncate">{course?.name || 'Materia'}</p>
                      </div>
                      <Badge variant={daysLeft <= 3 ? 'rose' : 'amber'} size="sm">
                        {daysLeft === 0 ? '¡Hoy!' : daysLeft === 1 ? 'Mañana' : `En ${daysLeft} días`}
                      </Badge>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </Card>

        {/* Q3: ¿Qué está atrasado? */}
        <Card variant="elevated" className="flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#FFEBEE] text-[#C62828] flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm text-[#2B2D42]">¿Qué está atrasado?</h3>
              </div>
              <Badge variant={overdueWorks.length + overdueTasks.length > 0 ? 'unverified' : 'verified'} size="sm">
                {overdueWorks.length + overdueTasks.length} alertas
              </Badge>
            </div>

            <div className="space-y-2 pt-1">
              {overdueWorks.length === 0 && overdueTasks.length === 0 ? (
                <div className="flex items-center gap-2 text-xs text-emerald-800 bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>¡Excelente! Sin entregas atrasadas.</span>
                </div>
              ) : (
                <>
                  {overdueWorks.map((work) => (
                    <div
                      key={work.id}
                      onClick={() => onOpenWork(work.id)}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-rose-50/70 border border-rose-200 transition-all cursor-pointer gap-2"
                    >
                      <span className="text-xs font-bold text-rose-900 truncate min-w-0 flex-1">{work.title}</span>
                      <span className="text-[10px] font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded-full shrink-0">
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
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-xs text-rose-900 truncate">{task.title}</span>
                      </div>
                      <span className="text-[10px] font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded-full shrink-0">
                        Tarea vencida
                      </span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </Card>

        {/* Q4: ¿Qué está bloqueado? */}
        <Card variant="elevated" className="flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#F3E5F5] text-[#6A1B9A] flex items-center justify-center">
                  <HelpCircle className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm text-[#2B2D42]">¿Qué está bloqueado?</h3>
              </div>
              <Badge variant={blockedInquiries.length > 0 ? 'lavender' : 'default'} size="sm">
                {blockedInquiries.length} consultas
              </Badge>
            </div>

            <div className="space-y-2 pt-1">
              {blockedInquiries.length === 0 ? (
                <p className="text-xs text-[#8D99AE] py-3 italic">No hay dudas bloqueando el avance.</p>
              ) : (
                blockedInquiries.map((inq) => {
                  const course = coursesMap.get(inq.courseId);
                  return (
                    <div
                      key={inq.id}
                      className="p-2.5 rounded-xl bg-[#F5F1EB]/60 hover:bg-[#F3E5F5]/40 transition-colors space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold text-[#6A1B9A] uppercase truncate">{course?.name || 'Profesor'}</span>
                        <Badge variant="lavender" size="sm">
                          {inq.status === 'SENT' ? 'Enviada' : 'Borrador'}
                        </Badge>
                      </div>
                      <p className="text-xs font-semibold text-[#2B2D42] line-clamp-1">{inq.topic}</p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </Card>

        {/* Q5: ¿Qué estoy investigando? */}
        <Card variant="elevated" className="flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#F3E5F5] text-[#512DA8] flex items-center justify-center">
                  <Search className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm text-[#2B2D42]">¿Qué estoy investigando?</h3>
              </div>
              <Badge variant="lavender" size="sm">
                {activeResearchWorks.length} activos
              </Badge>
            </div>

            <div className="space-y-2 pt-1">
              {activeResearchWorks.length === 0 ? (
                <p className="text-xs text-[#8D99AE] py-3 italic">No hay trabajos en fase activa de investigación.</p>
              ) : (
                activeResearchWorks.map((work) => {
                  const workSources = sources.filter((s) => s.workIds.includes(work.id));
                  return (
                    <div
                      key={work.id}
                      onClick={() => onOpenWork(work.id)}
                      className="p-2.5 rounded-xl bg-[#F5F1EB]/60 hover:bg-[#FDF2F0] transition-all cursor-pointer space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-[#2B2D42] truncate min-w-0 flex-1">{work.title}</span>
                        <CitationStyleBadge style={work.citationStyle} />
                      </div>
                      <p className="text-[11px] text-[#5A6275]">
                        {workSources.length} de {work.minRequiredSources || 3} fuentes recolectadas
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </Card>

        {/* Q6: ¿Qué investigué recientemente? */}
        <Card variant="elevated" className="flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#E0F2F1] text-[#00695C] flex items-center justify-center">
                  <BookOpen className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm text-[#2B2D42]">¿Qué investigué?</h3>
              </div>
              <Badge variant="mint" size="sm">
                Fuentes Recientes
              </Badge>
            </div>

            <div className="space-y-2 pt-1">
              {recentSources.length === 0 ? (
                <p className="text-xs text-[#8D99AE] py-3 italic">Aún no has registrado fuentes científicas.</p>
              ) : (
                recentSources.map((src) => (
                  <div
                    key={src.id}
                    onClick={() => onOpenSource(src.id)}
                    className="p-2.5 rounded-xl bg-[#F5F1EB]/60 hover:bg-[#E0F2F1]/50 transition-colors cursor-pointer space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold text-[#00695C] uppercase">{src.year}</span>
                      <VerificationBadge status={src.verificationStatus} />
                    </div>
                    <p className="text-xs font-semibold text-[#2B2D42] line-clamp-1">{src.title}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </Card>

        {/* Q7: ¿Qué debo revisar? */}
        <Card variant="elevated" className="flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#FFF8E1] text-[#E65100] flex items-center justify-center">
                  <CheckSquare className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm text-[#2B2D42]">¿Qué debo revisar?</h3>
              </div>
              <Badge variant={pendingParaphrases.length + unverifiedSources.length > 0 ? 'amber' : 'verified'} size="sm">
                {pendingParaphrases.length + unverifiedSources.length} por auditar
              </Badge>
            </div>

            <div className="space-y-2 pt-1">
              {pendingParaphrases.length === 0 && unverifiedSources.length === 0 ? (
                <div className="flex items-center gap-2 text-xs text-emerald-800 bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Trazabilidad y citas al 100% verificadas.</span>
                </div>
              ) : (
                <>
                  {pendingParaphrases.map((para) => (
                    <div
                      key={para.id}
                      className="p-2.5 rounded-xl bg-[#FFF8E1]/60 border border-[#FFE082] text-xs space-y-0.5"
                    >
                      <span className="text-[10px] font-bold text-[#E65100] uppercase">Auditoría de Paráfrasis</span>
                      <p className="text-[#2B2D42] line-clamp-1 font-medium">{para.finalParaphrase}</p>
                    </div>
                  ))}
                  {unverifiedSources.map((src) => (
                    <div
                      key={src.id}
                      onClick={() => onOpenSource(src.id)}
                      className="p-2.5 rounded-xl bg-rose-50/70 border border-rose-200 text-xs flex items-center justify-between cursor-pointer gap-2"
                    >
                      <span className="text-[#2B2D42] truncate min-w-0 flex-1">{src.title}</span>
                      <span className="text-[10px] text-rose-800 font-bold shrink-0">Sin DOI</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </Card>

        {/* Q8: ¿Qué aprendí recientemente? */}
        <Card variant="elevated" className="flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#FDF2F0] text-[#8C3A32] flex items-center justify-center">
                  <Brain className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm text-[#2B2D42]">¿Qué aprendí?</h3>
              </div>
              <Badge variant="rose" size="sm">
                Segundo Cerebro
              </Badge>
            </div>

            <div className="space-y-2 pt-1">
              {recentNotes.length === 0 ? (
                <p className="text-xs text-[#8D99AE] py-3 italic">Aún no hay notas atómicas registradas.</p>
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
                      className="p-2.5 rounded-xl bg-[#F5F1EB]/60 hover:bg-[#FDF2F0] transition-colors cursor-pointer space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold text-[#8C3A32] uppercase truncate">{paraLabel}</span>
                        <span className="text-[10px] text-[#8D99AE] font-mono shrink-0">[[wiki]]</span>
                      </div>
                      <p className="text-xs font-semibold text-[#2B2D42] line-clamp-1">{note.title}</p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
