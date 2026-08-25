export type CitationStyle = 
  | 'APA_7' 
  | 'MLA_9' 
  | 'IEEE' 
  | 'CHICAGO_AUTHOR_DATE' 
  | 'CHICAGO_NOTES' 
  | 'VANCOUVER';

export type WorkType = 
  | 'ENSAYO' 
  | 'MONOGRAFIA' 
  | 'TESIS' 
  | 'INFORME' 
  | 'PROYECTO' 
  | 'EXAMEN' 
  | 'PRESENTACION' 
  | 'OTRO';

export type WorkStatus = 
  | 'PLANIFICACION' 
  | 'INVESTIGACION' 
  | 'REDACTANDO' 
  | 'EN_REVISION' 
  | 'CORRECCION' 
  | 'ENTREGADO' 
  | 'ARCHIVADO';

export type VerificationStatus = 
  | 'VERIFIED' 
  | 'PARTIALLY_VERIFIED' 
  | 'UNVERIFIED';

export type SourceType = 
  | 'JOURNAL_ARTICLE' 
  | 'BOOK' 
  | 'BOOK_CHAPTER' 
  | 'CONFERENCE_PAPER' 
  | 'THESIS' 
  | 'REPORT' 
  | 'WEBPAGE' 
  | 'OTHER';

export type VerificationProvider = 
  | 'CROSSREF' 
  | 'OPENALEX' 
  | 'SEMANTIC_SCHOLAR' 
  | 'MANUAL' 
  | 'DOI_ORG'
  | 'DOAJ';

export type FidelityStatus = 
  | 'PENDING_REVIEW' 
  | 'CONFIRMED_FAITHFUL' 
  | 'NEEDS_ADJUSTMENT';

export type InquiryStatus = 
  | 'DRAFT' 
  | 'SENT' 
  | 'ANSWERED' 
  | 'DISCARDED';

export type TaskPriority = 
  | 'LOW' 
  | 'MEDIUM' 
  | 'HIGH' 
  | 'URGENT';

export type TaskCategory = 
  | 'ASSIGNMENT_CHECKLIST' 
  | 'RESEARCH' 
  | 'WRITING' 
  | 'PROFESSOR_INQUIRY' 
  | 'SUBMISSION' 
  | 'GENERAL';

export type ParaCategory = 
  | 'PROJECT' 
  | 'AREA' 
  | 'RESOURCE' 
  | 'ARCHIVE' 
  | 'ATOMIC';

export interface Author {
  firstName: string;
  lastName: string;
}

export interface Course {
  id: string;
  code?: string;
  name: string;
  period: string;
  color: string;
  teacherName?: string;
  teacherEmail?: string;
  syllabusUrl?: string;
  createdAt: number;
  updatedAt: number;
  isArchived: boolean;
}

export interface InstructionAnalysis {
  explicitRequirements: string[];
  aiInferences: string[];
  deliverableFormat: string;
  wordCountTarget?: number;
  citationStyleExpected?: CitationStyle;
  maxSourceAgeYears?: number;
  detectedQuestionsForTeacher?: string[];
}

export interface Work {
  id: string;
  courseId: string;
  title: string;
  type: WorkType;
  status: WorkStatus;
  deadline: number;
  citationStyle: CitationStyle;
  maxSourceAgeYears?: number; // e.g. 5 means sources >= current_year - 5
  minRequiredSources?: number;
  formatRequirements?: string;
  rawInstructions?: string;
  instructionAnalysis?: InstructionAnalysis;
  draftContent?: string;
  canvaUrl?: string;
  googleDocUrl?: string;
  createdAt: number;
  updatedAt: number;
  isArchived: boolean;
}

export interface InquiryToTeacher {
  id: string;
  workId: string;
  courseId: string;
  topic: string;
  rawQuestion: string;
  formalQuestion: string;
  status: InquiryStatus;
  askedDate?: number;
  teacherAnswer?: string;
  answeredDate?: number;
  evidenceAttachmentUrl?: string;
  bindingDecision?: string; // Teacher's rule that overrides any AI suggestion
  createdAt: number;
  updatedAt: number;
}

export interface Source {
  id: string;
  workIds: string[]; // Many-to-many: a source can be used across multiple works
  title: string;
  authors: Author[];
  year: number;
  type: SourceType;
  publication?: string; // Journal, Publisher, Conference
  volume?: string;
  issue?: string;
  pages?: string;
  doi?: string;
  url?: string;
  abstract?: string;
  keywords?: string[];
  accessedAt: number;
  verificationStatus: VerificationStatus;
  verificationProvider: VerificationProvider;
  historicalContextApproved?: boolean; // If teacher approved an older source
  cslJson?: Record<string, unknown>;
  bibtex?: string;
  pdfLocalPath?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Idea {
  id: string;
  sourceId: string;
  workId?: string;
  rawQuote: string;
  pageOrLocation?: string;
  extractedCoreIdea: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

export interface Paraphrase {
  id: string;
  ideaId: string;
  sourceId: string;
  workId?: string;
  ownInterpretation: string;
  finalParaphrase: string;
  fidelityReviewStatus: FidelityStatus;
  fidelityWarningMessage?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Citation {
  id: string;
  paraphraseId?: string;
  ideaId?: string;
  sourceId: string;
  workId: string;
  style: CitationStyle;
  inTextNarrative: string; // e.g. "Sánchez (2024)"
  inTextParenthetical: string; // e.g. "(Sánchez, 2024, p. 45)"
  fullReferenceFormatted: string;
  createdAt: number;
  updatedAt: number;
}

export interface Note {
  id: string;
  slug: string;
  title: string;
  content: string; // Markdown with [[wikilinks]]
  paraCategory: ParaCategory;
  courseId?: string;
  workId?: string;
  sourceIds: string[];
  conceptIds: string[];
  tags: string[];
  backlinks: string[];
  isPinned: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Concept {
  id: string;
  name: string;
  description: string;
  color: string;
  createdAt: number;
  updatedAt: number;
}

export interface Task {
  id: string;
  workId?: string;
  courseId?: string;
  title: string;
  description?: string;
  dueDate?: number;
  priority: TaskPriority;
  isCompleted: boolean;
  completedAt?: number;
  category: TaskCategory;
  createdAt: number;
  updatedAt: number;
}

export interface SettingRecord {
  key: string;
  value: unknown;
  updatedAt: number;
}

export type AIProvider = 'gemini' | 'openai' | 'openrouter' | 'ollama' | 'offline_heuristics';

export interface AISettings {
  provider: AIProvider;
  apiKey?: string;
  modelName?: string;
  ollamaEndpoint?: string;
  temperature?: number;
  tokensUsedThisMonth?: number;
  tokensMonthKey?: string;
}

export interface ObsidianSettings {
  vaultName?: string;
  defaultParaFolder?: string;
}

export interface CurriculumCourse {
  code: string;
  name: string;
  cycle: number; // 8, 9, 10
  credits: number;
  type: 'OBLIGATORIO' | 'ELECTIVO' | 'INTERNADO' | 'INVESTIGACION';
  prerequisites: string[];
  area: 'CLINICA' | 'INVESTIGACION' | 'DEONTOLOGIA' | 'EDUCATIVA' | 'ORGANIZACIONAL' | 'SALUD_PUBLICA';
  description: string;
  competencies: string[];
}

export interface UserProfile {
  name: string;
  institution: string;
  faculty: string;
  major: string;
  currentCycle: number | string;
  specialty?: 'CLINICA' | 'EDUCATIVA' | 'ORGANIZACIONAL' | 'SOCIAL_COMUNITARIA';
  thesisTitle?: string;
  internshipSite?: string;
  defaultCitationStyle: CitationStyle;
}

export const DEFAULT_ACADEMIC_PERIOD = '2026-II';

export const DEFAULT_USER_PROFILE: UserProfile = {
  name: 'Saory',
  institution: 'Universidad de San Martín de Porres (USMP)',
  faculty: 'Facultad de Ciencias de la Comunicación, Turismo y Psicología',
  major: 'Psicología',
  currentCycle: 'VIII Ciclo (8vo Ciclo)',
  specialty: 'CLINICA',
  thesisTitle: '',
  internshipSite: '',
  defaultCitationStyle: 'APA_7'
};
