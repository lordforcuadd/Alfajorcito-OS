import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  GraduationCap,
  FileText,
  BookOpen,
  HelpCircle,
  CheckSquare,
  Search,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  BookMarked,
  Palette,
  User,
  Mail,
  Link as LinkIcon,
  Calendar,
  Plus
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input, Select, TextArea } from '../common/Input';
import { db } from '../../db';
import { resolveDOI, extractDOI } from '../../services/academicApis';
import { auditSourceMetadata } from '../../utils/antiHallucination';
import { formulateQuestionForTeacher, analyzeInstructionsOffline } from '../../services/aiService';
import { useToast } from '../common/Toast';
import type { CitationStyle, WorkType, WorkStatus, ParaCategory, TaskPriority, SourceType, Author, UserProfile, Source } from '../../types';

export type CaptureTab = 'note' | 'work' | 'course' | 'source' | 'inquiry' | 'task';

export interface QuickCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: CaptureTab;
  initialCourseId?: string;
  initialWorkId?: string;
}

const PASTEL_COLORS = [
  '#FFD1DC', // Pastel Pink
  '#C1E1C1', // Pastel Mint
  '#B5EAD7', // Pastel Seafoam
  '#C7CEEA', // Pastel Periwinkle
  '#FFDAC1', // Pastel Peach
  '#E2F0CB', // Pastel Lime
  '#DED2F9'  // Pastel Lavender
];

export const QuickCaptureModal: React.FC<QuickCaptureModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'note',
  initialCourseId,
  initialWorkId
}) => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<CaptureTab>(initialTab);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Courses, Works & User Profile live query for dropdowns
  const courses = useLiveQuery(() => db.courses.toArray()) || [];
  const works = useLiveQuery(() => db.works.toArray()) || [];
  const userProfile = useLiveQuery(async () => {
    const rec = await db.settings.get('user_profile');
    return rec?.value as UserProfile | undefined;
  });

  const defaultCyclePeriod = userProfile?.currentCycle
    ? `2026-II (${userProfile.currentCycle})`
    : '2026-II (Ciclo Actual)';

  // 1. Note State
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [notePara, setNotePara] = useState<ParaCategory>('ATOMIC');
  const [noteCourseId, setNoteCourseId] = useState(initialCourseId || '');
  const [noteWorkId, setNoteWorkId] = useState(initialWorkId || '');
  const [noteTags, setNoteTags] = useState('');

  // 2. Work State
  const [workTitle, setWorkTitle] = useState('');
  const [workCourseId, setWorkCourseId] = useState(initialCourseId || '');
  const [workType, setWorkType] = useState<WorkType>('ENSAYO');
  const [workStatus, setWorkStatus] = useState<WorkStatus>('PLANIFICACION');
  const [workDeadline, setWorkDeadline] = useState('');
  const [workCitationStyle, setWorkCitationStyle] = useState<CitationStyle>('APA_7');
  const [workInstructions, setWorkInstructions] = useState('');
  const [workGoogleDocUrl, setWorkGoogleDocUrl] = useState('');
  const [workCanvaUrl, setWorkCanvaUrl] = useState('');

  // 3. Course State (Dynamic Course creation)
  const [courseName, setCourseName] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [coursePeriod, setCoursePeriod] = useState(defaultCyclePeriod);
  const [courseTeacherName, setCourseTeacherName] = useState('');
  const [courseTeacherEmail, setCourseTeacherEmail] = useState('');
  const [courseSyllabusUrl, setCourseSyllabusUrl] = useState('');
  const [courseColor, setCourseColor] = useState(PASTEL_COLORS[0]);

  // Sync coursePeriod when userProfile loads
  useEffect(() => {
    if (userProfile?.currentCycle) {
      setCoursePeriod((prev) => (prev.includes('Ciclo Actual') ? `2026-II (${userProfile.currentCycle})` : prev));
    }
  }, [userProfile?.currentCycle]);

  // 4. Source State
  const [sourceDoiOrSearch, setSourceDoiOrSearch] = useState('');
  const [sourceTitle, setSourceTitle] = useState('');
  const [sourceAuthor, setSourceAuthor] = useState('');
  const [sourceYear, setSourceYear] = useState<number>(new Date().getFullYear());
  const [sourcePublication, setSourcePublication] = useState('');
  const [sourceWorkId, setSourceWorkId] = useState(initialWorkId || '');
  const [isResolvingDoi, setIsResolvingDoi] = useState(false);

  // 5. Inquiry State
  const [inquiryCourseId, setInquiryCourseId] = useState(initialCourseId || '');
  const [inquiryWorkId, setInquiryWorkId] = useState(initialWorkId || '');
  const [inquiryTopic, setInquiryTopic] = useState('');
  const [inquiryRawQuestion, setInquiryRawQuestion] = useState('');
  const [inquiryFormalPreview, setInquiryFormalPreview] = useState('');

  // 6. Task State
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskPriority, setTaskPriority] = useState<TaskPriority>('MEDIUM');
  const [taskWorkId, setTaskWorkId] = useState(initialWorkId || '');

  // Synchronize initial values when modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialTab) setActiveTab(initialTab);
      if (initialCourseId) {
        setWorkCourseId(initialCourseId);
        setNoteCourseId(initialCourseId);
        setInquiryCourseId(initialCourseId);
      }
      if (initialWorkId) {
        setNoteWorkId(initialWorkId);
        setSourceWorkId(initialWorkId);
        setInquiryWorkId(initialWorkId);
        setTaskWorkId(initialWorkId);
      }
    }
  }, [isOpen, initialTab, initialCourseId, initialWorkId]);

  // DOI Auto Resolver
  const handleResolveDoi = async () => {
    if (!sourceDoiOrSearch.trim()) return;
    setIsResolvingDoi(true);
    try {
      const result = await resolveDOI(sourceDoiOrSearch.trim());
      if (result) {
        setSourceTitle(result.title);
        const authorStr = result.authors.map((a: Author) => `${a.lastName || ''}, ${a.firstName || ''}`).join('; ');
        setSourceAuthor(authorStr);
        setSourceYear(result.year);
        setSourcePublication(result.publication || '');
        showToast('Artículo encontrado', `Verificado en ${result.provider}`, 'success');
      } else {
        showToast('DOI no resuelto', 'Ingresa los datos manualmente o revisa el DOI.', 'warning');
      }
    } catch {
      showToast('Error de conexión', 'No se pudo contactar con Crossref/DOI.', 'error');
    } finally {
      setIsResolvingDoi(false);
    }
  };

  // Inquiry AI Formalizer Helper
  const handleFormalizeInquiry = async () => {
    if (!inquiryRawQuestion.trim()) return;
    const course = courses.find(c => c.id === inquiryCourseId);
    const formal = await formulateQuestionForTeacher(
      inquiryRawQuestion,
      course?.name || 'la asignatura',
      course?.teacherName
    );
    setInquiryFormalPreview(formal);
  };

  // Submit Handlers
  const handleSaveNote = async () => {
    if (!noteTitle.trim()) {
      showToast('Título requerido', 'Por favor ingresa un título para la nota.', 'warning');
      return;
    }
    setIsSubmitting(true);
    try {
      const now = Date.now();
      const slug = noteTitle
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '') || `nota-${now}`;

      const parsedTags = noteTags
        .split(',')
        .map((t) => t.replace(/^#+/, '').trim())
        .filter(Boolean);

      await db.notes.add({
        id: `note-${crypto.randomUUID()}`,
        slug,
        title: noteTitle.trim(),
        content: noteContent.trim(),
        paraCategory: notePara,
        courseId: noteCourseId || undefined,
        workId: noteWorkId || undefined,
        sourceIds: [],
        conceptIds: [],
        tags: parsedTags,
        backlinks: [],
        isPinned: false,
        createdAt: now,
        updatedAt: now
      });

      showToast('Nota guardada', 'Añadida al Segundo Cerebro.', 'success');
      setNoteTitle('');
      setNoteContent('');
      setNoteTags('');
      onClose();
    } catch {
      showToast('Error', 'No se pudo guardar la nota en la base de datos.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveWork = async () => {
    if (courses.length === 0) {
      showToast('Curso requerido', 'Primero debes crear un curso antes de registrar un trabajo.', 'warning');
      setActiveTab('course');
      return;
    }
    if (!workTitle.trim()) {
      showToast('Título requerido', 'Por favor ingresa el título del trabajo o tesis.', 'warning');
      return;
    }
    if (!workCourseId) {
      showToast('Curso requerido', 'Por favor selecciona la asignatura correspondiente.', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const now = Date.now();
      const deadlineMs = workDeadline ? new Date(workDeadline).getTime() : now + 86400000 * 7;
      const analysis = analyzeInstructionsOffline(workInstructions);

      const newWorkId = `work-${crypto.randomUUID()}`;
      await db.works.add({
        id: newWorkId,
        courseId: workCourseId,
        title: workTitle.trim(),
        type: workType,
        status: workStatus,
        deadline: isNaN(deadlineMs) ? now + 86400000 * 7 : deadlineMs,
        citationStyle: workCitationStyle,
        rawInstructions: workInstructions.trim(),
        instructionAnalysis: analysis,
        googleDocUrl: workGoogleDocUrl.trim() || undefined,
        canvaUrl: workCanvaUrl.trim() || undefined,
        draftContent: `# ${workTitle.trim()}\n\n## 1. Introducción\n`,
        createdAt: now,
        updatedAt: now,
        isArchived: false
      });

      showToast('Trabajo registrado', `"${workTitle}" añadido a tus entregables.`, 'success');
      setWorkTitle('');
      setWorkInstructions('');
      setWorkDeadline('');
      onClose();
    } catch {
      showToast('Error', 'No se pudo guardar el trabajo en la base de datos.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveCourse = async () => {
    if (!courseName.trim()) {
      showToast('Nombre requerido', 'Por favor ingresa el nombre de la asignatura.', 'warning');
      return;
    }
    if (courseTeacherEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(courseTeacherEmail.trim())) {
      showToast('Correo inválido', 'Ingresa un correo institucional válido (e.g. docente@usmp.pe).', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const now = Date.now();
      await db.courses.add({
        id: `course-${crypto.randomUUID()}`,
        name: courseName.trim(),
        code: courseCode.trim() || undefined,
        period: coursePeriod.trim() || '2026-II',
        teacherName: courseTeacherName.trim() || undefined,
        teacherEmail: courseTeacherEmail.trim() || undefined,
        syllabusUrl: courseSyllabusUrl.trim() || undefined,
        color: courseColor,
        isArchived: false,
        createdAt: now,
        updatedAt: now
      });

      showToast('Curso creado', `${courseName} añadido a tus cursos.`, 'success');
      setCourseName('');
      setCourseCode('');
      setCourseTeacherName('');
      setCourseTeacherEmail('');
      setCourseSyllabusUrl('');
      onClose();
    } catch {
      showToast('Error', 'No se pudo guardar el curso en la base de datos.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveSource = async () => {
    if (!sourceTitle.trim()) {
      showToast('Título requerido', 'Ingresa el título de la fuente o libro.', 'warning');
      return;
    }
    const parsedYear = Number(sourceYear);
    if (isNaN(parsedYear) || parsedYear < 1800 || parsedYear > new Date().getFullYear() + 2) {
      showToast('Año inválido', 'Por favor ingresa un año de publicación válido (ej. 2024).', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const now = Date.now();
      const authors = sourceAuthor
        ? sourceAuthor.split(';').map((a) => {
            const parts = a.trim().split(',');
            return {
              lastName: parts[0]?.trim() || '',
              firstName: parts[1]?.trim() || ''
            };
          }).filter(a => a.lastName || a.firstName)
        : [];

      const rawDoi = sourceDoiOrSearch.trim();
      const extractedDoi = extractDOI(rawDoi);
      let verifiedStatus: 'VERIFIED' | 'PARTIALLY_VERIFIED' | 'UNVERIFIED' = 'PARTIALLY_VERIFIED';
      let verifiedProvider: 'CROSSREF' | 'OPENALEX' | 'SEMANTIC_SCHOLAR' | 'MANUAL' | 'DOI_ORG' | 'DOAJ' = 'MANUAL';
      let finalTitle = sourceTitle.trim();
      let finalAuthors = authors.length > 0 ? authors : [{ firstName: '', lastName: 'Autor' }];
      let finalYear = parsedYear;
      let finalPub = sourcePublication.trim() || undefined;

      if (extractedDoi) {
        try {
          const resolved = await resolveDOI(extractedDoi);
          if (resolved) {
            finalTitle = resolved.title || finalTitle;
            if (resolved.authors && resolved.authors.length > 0) {
              finalAuthors = resolved.authors;
            }
            if (resolved.year) finalYear = resolved.year;
            if (resolved.publication) finalPub = resolved.publication;

            const tempSource: Source = {
              id: 'temp',
              workIds: [],
              title: finalTitle,
              authors: finalAuthors,
              year: finalYear,
              type: 'JOURNAL_ARTICLE',
              publication: finalPub,
              doi: extractedDoi,
              accessedAt: now,
              verificationStatus: 'PARTIALLY_VERIFIED',
              verificationProvider: resolved.provider,
              createdAt: now,
              updatedAt: now
            };
            const audit = auditSourceMetadata(tempSource);
            verifiedStatus = audit.status;
            verifiedProvider = resolved.provider;
          }
        } catch {
          verifiedStatus = 'PARTIALLY_VERIFIED';
          verifiedProvider = 'MANUAL';
        }
      }

      await db.sources.add({
        id: `src-${crypto.randomUUID()}`,
        workIds: sourceWorkId ? [sourceWorkId] : [],
        title: finalTitle,
        authors: finalAuthors,
        year: finalYear,
        type: 'JOURNAL_ARTICLE',
        publication: finalPub,
        doi: extractedDoi || (rawDoi.length > 0 ? rawDoi : undefined),
        accessedAt: now,
        verificationStatus: verifiedStatus,
        verificationProvider: verifiedProvider,
        createdAt: now,
        updatedAt: now
      });

      showToast(
        verifiedStatus === 'VERIFIED' ? 'Fuente verificada y guardada' : 'Fuente guardada',
        verifiedStatus === 'VERIFIED'
          ? 'Metadatos validados con éxito desde registro académico.'
          : 'Registrada en tu biblioteca de investigación.',
        'success'
      );
      setSourceTitle('');
      setSourceAuthor('');
      setSourcePublication('');
      setSourceDoiOrSearch('');
      onClose();
    } catch {
      showToast('Error', 'No se pudo guardar la fuente en la base de datos.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveInquiry = async () => {
    if (courses.length === 0) {
      showToast('Curso requerido', 'Primero debes registrar un curso para asociar la consulta.', 'warning');
      setActiveTab('course');
      return;
    }
    if (!inquiryCourseId) {
      showToast('Curso requerido', 'Selecciona el curso al que pertenece la duda.', 'warning');
      return;
    }
    if (!inquiryTopic.trim()) {
      showToast('Tema requerido', 'Indica el tema o criterio de la duda.', 'warning');
      return;
    }
    if (!inquiryRawQuestion.trim()) {
      showToast('Duda requerida', 'Escribe tu pregunta o duda para el docente.', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const now = Date.now();
      await db.inquiries.add({
        id: `inq-${crypto.randomUUID()}`,
        courseId: inquiryCourseId,
        workId: inquiryWorkId || '',
        topic: inquiryTopic.trim(),
        rawQuestion: inquiryRawQuestion.trim(),
        formalQuestion: inquiryFormalPreview.trim() || inquiryRawQuestion.trim(),
        status: 'DRAFT',
        createdAt: now,
        updatedAt: now
      });

      showToast('Consulta guardada', 'Guardada en Consultas al Docente.', 'success');
      setInquiryTopic('');
      setInquiryRawQuestion('');
      setInquiryFormalPreview('');
      onClose();
    } catch {
      showToast('Error', 'No se pudo guardar la consulta en la base de datos.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveTask = async () => {
    if (!taskTitle.trim()) {
      showToast('Título requerido', 'Por favor ingresa la descripción del pendiente o tarea.', 'warning');
      return;
    }
    if (taskTitle.trim().length > 300) {
      showToast('Texto muy extenso', 'La descripción de la tarea no debe superar los 300 caracteres.', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const now = Date.now();
      const dueMs = taskDueDate ? new Date(taskDueDate).getTime() : undefined;
      const linkedWork = works.find((w) => w.id === taskWorkId);

      await db.tasks.add({
        id: `task-${crypto.randomUUID()}`,
        title: taskTitle.trim(),
        dueDate: dueMs && !isNaN(dueMs) ? dueMs : undefined,
        priority: taskPriority,
        workId: taskWorkId || undefined,
        courseId: linkedWork?.courseId || undefined,
        isCompleted: false,
        category: 'GENERAL',
        createdAt: now,
        updatedAt: now
      });

      showToast('Tarea guardada', 'Añadida a tus pendientes académicos.', 'success');
      setTaskTitle('');
      setTaskDueDate('');
      setTaskPriority('MEDIUM');
      setTaskWorkId('');
      onClose();
    } catch {
      showToast('Error', 'No se pudo guardar la tarea en la base de datos.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Captura Rápida"
      subtitle="Registra notas, tesis, cursos o fuentes al instante"
      maxWidth="xl"
    >
      {/* Sticky Entity Tabs with smooth PC wheel & touch scroll */}
      <div
        onWheel={(e) => {
          if (e.deltaY !== 0) {
            e.currentTarget.scrollLeft += e.deltaY;
          }
        }}
        className="flex items-center gap-1 sm:gap-1.5 tab-scroll-pc pb-2 mb-3 border-b border-[#EBE5DF] shrink-0"
      >
        {[
          { id: 'note', label: 'Nota / Idea', icon: <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> },
          { id: 'work', label: 'Trabajo / Tesis', icon: <GraduationCap className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> },
          { id: 'course', label: 'Curso', icon: <BookMarked className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> },
          { id: 'source', label: 'Fuente / Paper', icon: <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> },
          { id: 'inquiry', label: 'Consulta Docente', icon: <HelpCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> },
          { id: 'task', label: 'Tarea', icon: <CheckSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as CaptureTab)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === tab.id
                ? 'bg-[#E8A598] text-[#2B2D42] shadow-2xs'
                : 'bg-[#F5F1EB] text-[#5A6275] hover:bg-[#EBE5DF]'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* 1. Note Form */}
      {activeTab === 'note' && (
        <div className="space-y-4">
          <Input
            label="Título de la Nota *"
            placeholder="e.g. Regulación Emocional y Ansiedad Académica"
            value={noteTitle}
            onChange={(e) => setNoteTitle(e.target.value)}
          />
          <TextArea
            label="Contenido en Markdown (usa [[links]] para conectar ideas)"
            placeholder="Escribe tus reflexiones o notas de clase aquí..."
            rows={4}
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Select
              label="Categoría"
              value={notePara}
              onChange={(e) => setNotePara(e.target.value as ParaCategory)}
            >
              <option value="ATOMIC">Idea Rápida</option>
              <option value="PROJECT">Proyecto / Trabajo</option>
              <option value="AREA">Materia</option>
              <option value="RESOURCE">Recurso de Estudio</option>
              <option value="ARCHIVE">Archivada</option>
            </Select>

            <Select
              label="Curso (Opcional)"
              value={noteCourseId}
              onChange={(e) => setNoteCourseId(e.target.value)}
            >
              <option value="">Seleccionar curso</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>

            <Select
              label="Trabajo (Opcional)"
              value={noteWorkId}
              onChange={(e) => setNoteWorkId(e.target.value)}
            >
              <option value="">Seleccionar trabajo</option>
              {works.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.title}
                </option>
              ))}
            </Select>
          </div>

          <Input
            label="Etiquetas (separadas por comas)"
            placeholder="psicologia, usmp, fcctp, tesis, apa7"
            value={noteTags}
            onChange={(e) => setNoteTags(e.target.value)}
          />

          <div className="pt-2 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <Button variant="ghost" onClick={onClose} className="w-full sm:w-auto">
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleSaveNote}
              isLoading={isSubmitting}
              icon={<Plus className="w-4 h-4 stroke-[2.5]" />}
              className="w-full sm:w-auto"
            >
              Guardar Nota
            </Button>
          </div>
        </div>
      )}

      {/* 2. Work Form */}
      {activeTab === 'work' && (
        <div className="space-y-4">
          <Input
            label="Título del Trabajo o Proyecto de Tesis *"
            placeholder="e.g. Proyecto de Tesis: Regulación Emocional en USMP"
            value={workTitle}
            onChange={(e) => setWorkTitle(e.target.value)}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Select
              label="Curso / Asignatura *"
              value={workCourseId}
              onChange={(e) => setWorkCourseId(e.target.value)}
            >
              <option value="">Seleccionar curso</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>

            <Select
              label="Tipo de Trabajo"
              value={workType}
              onChange={(e) => setWorkType(e.target.value as WorkType)}
            >
              <option value="TESIS">Proyecto de Tesis</option>
              <option value="ENSAYO">Ensayo</option>
              <option value="MONOGRAFIA">Monografía</option>
              <option value="INFORME">Informe de Caso / Psicodiagnóstico</option>
              <option value="PROYECTO">Proyecto de Investigación / Artículo</option>
            </Select>

            <Select
              label="Estado Inicial"
              value={workStatus}
              onChange={(e) => setWorkStatus(e.target.value as WorkStatus)}
            >
              <option value="PLANIFICACION">Planificación</option>
              <option value="INVESTIGACION">Investigando</option>
              <option value="REDACTANDO">Redactando</option>
              <option value="EN_REVISION">En Revisión</option>
              <option value="CORRECCION">En Corrección</option>
              <option value="ENTREGADO">Entregado</option>
              <option value="ARCHIVADO">Archivado</option>
            </Select>

            <Select
              label="Estilo de Citación"
              value={workCitationStyle}
              onChange={(e) => setWorkCitationStyle(e.target.value as CitationStyle)}
            >
              <option value="APA_7">Normas APA 7ma Edición</option>
              <option value="MLA_9">Normas MLA 9na Edición</option>
              <option value="IEEE">Estilo IEEE</option>
              <option value="VANCOUVER">Estilo Vancouver</option>
            </Select>
          </div>

          <Input
            label="Fecha Límite de Entrega"
            type="date"
            value={workDeadline}
            onChange={(e) => setWorkDeadline(e.target.value)}
          />

          <TextArea
            label="Indicaciones del Profesor (Consigna)"
            placeholder="Pega aquí el texto de las indicaciones del profesor..."
            rows={2}
            value={workInstructions}
            onChange={(e) => setWorkInstructions(e.target.value)}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-[#EBE5DF]">
            <Input
              label="Enlace Google Docs (Opcional)"
              placeholder="https://docs.google.com/document/d/..."
              value={workGoogleDocUrl}
              onChange={(e) => setWorkGoogleDocUrl(e.target.value)}
            />
            <Input
              label="Enlace Canva (Opcional)"
              placeholder="https://www.canva.com/design/..."
              value={workCanvaUrl}
              onChange={(e) => setWorkCanvaUrl(e.target.value)}
            />
          </div>

          <div className="pt-2 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <Button variant="ghost" onClick={onClose} className="w-full sm:w-auto">
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleSaveWork}
              isLoading={isSubmitting}
              icon={<Plus className="w-4 h-4 stroke-[2.5]" />}
              className="w-full sm:w-auto"
            >
              Crear Trabajo
            </Button>
          </div>
        </div>
      )}

      {/* 3. Course Form (Dynamic Course Creation) */}
      {activeTab === 'course' && (
        <div className="space-y-4">
          <Input
            label="Nombre del Curso *"
            placeholder="e.g. Psicoterapia Cognitivo-Conductual"
            value={courseName}
            onChange={(e) => setCourseName(e.target.value)}
            leftIcon={<BookOpen className="w-4 h-4" />}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Código (Opcional)"
              placeholder="e.g. PSI-802"
              value={courseCode}
              onChange={(e) => setCourseCode(e.target.value)}
            />
            <Input
              label="Ciclo o Semestre"
              placeholder="e.g. 2026-II (8vo Ciclo)"
              value={coursePeriod}
              onChange={(e) => setCoursePeriod(e.target.value)}
              leftIcon={<Calendar className="w-4 h-4" />}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Docente / Profesor(a)"
              placeholder="e.g. Dr. César Merino"
              value={courseTeacherName}
              onChange={(e) => setCourseTeacherName(e.target.value)}
              leftIcon={<User className="w-4 h-4" />}
            />
            <Input
              label="Correo del Docente"
              placeholder="docente@usmp.pe"
              value={courseTeacherEmail}
              onChange={(e) => setCourseTeacherEmail(e.target.value)}
              leftIcon={<Mail className="w-4 h-4" />}
            />
          </div>

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
                  onClick={() => setCourseColor(c)}
                  className={`w-7 h-7 rounded-full border-2 transition-all cursor-pointer ${
                    courseColor === c ? 'border-[#2B2D42] scale-110 shadow-xs' : 'border-white hover:scale-105'
                  }`}
                  style={{ backgroundColor: c }}
                  title={`Color ${c}`}
                  aria-label={`Seleccionar color ${c}`}
                />
              ))}
            </div>
          </div>

          <div className="pt-2 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <Button variant="ghost" onClick={onClose} className="w-full sm:w-auto">
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleSaveCourse}
              isLoading={isSubmitting}
              icon={<Plus className="w-4 h-4 stroke-[2.5]" />}
              className="w-full sm:w-auto"
            >
              Guardar Curso
            </Button>
          </div>
        </div>
      )}

      {/* 4. Source Form */}
      {activeTab === 'source' && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#5A6275] uppercase tracking-wider mb-1.5">
              Buscar automáticamente por DOI o Enlace
            </label>
            <div className="flex gap-2">
              <Input
                placeholder="10.18800/psico.202202.008 o URL"
                value={sourceDoiOrSearch}
                onChange={(e) => setSourceDoiOrSearch(e.target.value)}
                leftIcon={<Search className="w-4 h-4" />}
              />
              <Button
                type="button"
                variant="secondary"
                onClick={handleResolveDoi}
                isLoading={isResolvingDoi}
                className="shrink-0"
              >
                Buscar
              </Button>
            </div>
          </div>

          <Input
            label="Título de la Fuente o Libro *"
            placeholder="e.g. Propiedades psicométricas de escalas de autorregulación..."
            value={sourceTitle}
            onChange={(e) => setSourceTitle(e.target.value)}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Autores (Apellido, Nombre; Apellido, Nombre)"
              placeholder="Merino-Soto, César; Calderón, Marcia"
              value={sourceAuthor}
              onChange={(e) => setSourceAuthor(e.target.value)}
            />
            <Input
              label="Año de Publicación"
              type="number"
              value={sourceYear}
              onChange={(e) => setSourceYear(Number(e.target.value))}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Revista / Editorial"
              placeholder="Revista de Psicología (PUCP)"
              value={sourcePublication}
              onChange={(e) => setSourcePublication(e.target.value)}
            />

            <Select
              label="Vincular a Trabajo (Opcional)"
              value={sourceWorkId}
              onChange={(e) => setSourceWorkId(e.target.value)}
            >
              <option value="">Seleccionar trabajo</option>
              {works.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.title}
                </option>
              ))}
            </Select>
          </div>

          <div className="pt-2 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <Button variant="ghost" onClick={onClose} className="w-full sm:w-auto">
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleSaveSource}
              isLoading={isSubmitting}
              icon={<Plus className="w-4 h-4 stroke-[2.5]" />}
              className="w-full sm:w-auto"
            >
              Guardar Fuente
            </Button>
          </div>
        </div>
      )}

      {/* 5. Inquiry Form */}
      {activeTab === 'inquiry' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Curso / Docente *"
              value={inquiryCourseId}
              onChange={(e) => setInquiryCourseId(e.target.value)}
            >
              <option value="">Seleccionar curso</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.teacherName || 'Docente'})
                </option>
              ))}
            </Select>

            <Select
              label="Trabajo Relacionado (Opcional)"
              value={inquiryWorkId}
              onChange={(e) => setInquiryWorkId(e.target.value)}
            >
              <option value="">Seleccionar trabajo</option>
              {works.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.title}
                </option>
              ))}
            </Select>
          </div>

          <Input
            label="Tema de la Duda o Pregunta"
            placeholder="e.g. Aprobación de la escala DERS adaptada en Perú"
            value={inquiryTopic}
            onChange={(e) => setInquiryTopic(e.target.value)}
          />

          <TextArea
            label="Tu duda escrita con tus palabras"
            placeholder="Escribe tu pregunta tal como la piensas..."
            rows={3}
            value={inquiryRawQuestion}
            onChange={(e) => setInquiryRawQuestion(e.target.value)}
          />

          <div className="flex justify-between items-center">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              icon={<Sparkles className="w-3.5 h-3.5 text-[#8C3A32]" />}
              onClick={handleFormalizeInquiry}
              className="w-full sm:w-auto"
            >
              Redactar Formalmente con IA
            </Button>
          </div>

          {inquiryFormalPreview && (
            <div className="p-3.5 rounded-2xl bg-[#FDF2F0] border border-[#E8A598]/60 text-xs text-[#2B2D42] space-y-1.5 animate-fade-in">
              <span className="font-bold text-[#8C3A32] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Redacción formal generada con IA:
              </span>
              <p className="whitespace-pre-line leading-relaxed">{inquiryFormalPreview}</p>
            </div>
          )}

          <div className="pt-2 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <Button variant="ghost" onClick={onClose} className="w-full sm:w-auto">
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleSaveInquiry}
              isLoading={isSubmitting}
              icon={<Plus className="w-4 h-4 stroke-[2.5]" />}
              className="w-full sm:w-auto"
            >
              Guardar Pregunta
            </Button>
          </div>
        </div>
      )}

      {/* 6. Task Form */}
      {activeTab === 'task' && (
        <div className="space-y-4">
          <Input
            label="Descripción del Pendiente o Tarea *"
            placeholder="e.g. Calcular Omega de McDonald para el instrumento DERS"
            value={taskTitle}
            onChange={(e) => setTaskTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveTask();
            }}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Fecha Límite"
              type="date"
              value={taskDueDate}
              onChange={(e) => setTaskDueDate(e.target.value)}
            />

            <Select
              label="Prioridad"
              value={taskPriority}
              onChange={(e) => setTaskPriority(e.target.value as TaskPriority)}
            >
              <option value="LOW">Baja</option>
              <option value="MEDIUM">Media</option>
              <option value="HIGH">Alta</option>
              <option value="URGENT">Urgente (Prioridad Máxima)</option>
            </Select>
          </div>

          <Select
            label="Trabajo Asociado (Opcional)"
            value={taskWorkId}
            onChange={(e) => setTaskWorkId(e.target.value)}
          >
            <option value="">Seleccionar trabajo</option>
            {works.map((w) => (
              <option key={w.id} value={w.id}>
                {w.title}
              </option>
            ))}
          </Select>

          <div className="pt-2 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <Button variant="ghost" onClick={onClose} className="w-full sm:w-auto">
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleSaveTask}
              isLoading={isSubmitting}
              icon={<Plus className="w-4 h-4 stroke-[2.5]" />}
              className="w-full sm:w-auto"
            >
              Guardar Tarea
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};
