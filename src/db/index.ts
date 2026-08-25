import Dexie, { type Table } from 'dexie';
import type {
  Course,
  Work,
  Source,
  Idea,
  Paraphrase,
  Citation,
  Note,
  Concept,
  Task,
  InquiryToTeacher,
  SettingRecord
} from '../types';

export class AlfajorcitoDB extends Dexie {
  courses!: Table<Course, string>;
  works!: Table<Work, string>;
  sources!: Table<Source, string>;
  ideas!: Table<Idea, string>;
  paraphrases!: Table<Paraphrase, string>;
  citations!: Table<Citation, string>;
  notes!: Table<Note, string>;
  concepts!: Table<Concept, string>;
  tasks!: Table<Task, string>;
  inquiries!: Table<InquiryToTeacher, string>;
  settings!: Table<SettingRecord, string>;

  constructor() {
    super('AlfajorcitoDB');

    // Schema definition (Version 1 baseline)
    this.version(1).stores({
      courses: '&id, code, name, period, isArchived, updatedAt',
      works: '&id, courseId, type, status, deadline, isArchived, updatedAt',
      sources: '&id, *workIds, type, year, verificationStatus, updatedAt',
      ideas: '&id, sourceId, workId, updatedAt',
      paraphrases: '&id, ideaId, sourceId, workId, fidelityReviewStatus, updatedAt',
      citations: '&id, sourceId, workId, style, updatedAt',
      notes: '&id, slug, paraCategory, courseId, workId, *tags, isPinned, updatedAt',
      concepts: '&id, name, courseId, updatedAt',
      inquiries: '&id, courseId, workId, status, updatedAt',
      tasks: '&id, workId, courseId, dueDate, priority, isCompleted, category, updatedAt',
      settings: '&key, updatedAt'
    });

    // Version 2: Preserved for backwards compatibility with existing PWA client migrations
    this.version(2).stores({
      ideas: '&id, sourceId, workId, updatedAt',
      paraphrases: '&id, ideaId, sourceId, workId, fidelityReviewStatus, updatedAt',
      citations: '&id, sourceId, workId, style, updatedAt'
    });
  }
}

export const db = new AlfajorcitoDB();

// Helper to clear all academic entities atomically (restoring default user settings)
export async function clearAllDatabaseData(): Promise<void> {
  const now = Date.now();
  await db.transaction(
    'rw',
    [
      db.courses,
      db.works,
      db.sources,
      db.ideas,
      db.paraphrases,
      db.citations,
      db.notes,
      db.concepts,
      db.tasks,
      db.inquiries,
      db.settings
    ],
    async () => {
      await db.courses.clear();
      await db.works.clear();
      await db.sources.clear();
      await db.ideas.clear();
      await db.paraphrases.clear();
      await db.citations.clear();
      await db.notes.clear();
      await db.concepts.clear();
      await db.tasks.clear();
      await db.inquiries.clear();
      await db.settings.bulkPut([
        {
          key: 'user_profile',
          value: {
            name: 'Saory',
            institution: 'Universidad de San Martín de Porres (USMP)',
            faculty: 'Facultad de Ciencias de la Comunicación, Turismo y Psicología',
            major: 'Psicología',
            currentCycle: 'VIII Ciclo',
            specialty: 'CLINICA',
            thesisTitle: 'Regulación Emocional y Ansiedad Académica',
            defaultCitationStyle: 'APA_7'
          },
          updatedAt: now
        },
        {
          key: 'ai_settings',
          value: {
            provider: 'offline_heuristics',
            modelName: 'gemini-2.5-flash',
            temperature: 0.2,
            tokensUsedThisMonth: 0
          },
          updatedAt: now
        },
        {
          key: 'obsidian_settings',
          value: {
            vaultName: 'Alfajorcito Vault',
            defaultParaFolder: 'Alfajorcito OS/Notes'
          },
          updatedAt: now
        },
        { key: 'has_initialized', value: true, updatedAt: now }
      ]);
    }
  );
}

export { initializeDatabaseSeed } from './seed';
