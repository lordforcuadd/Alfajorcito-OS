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

    // Version 2: Index workId on ideas, paraphrases and citations
    this.version(2).stores({
      ideas: '&id, sourceId, workId, updatedAt',
      paraphrases: '&id, ideaId, sourceId, workId, fidelityReviewStatus, updatedAt',
      citations: '&id, sourceId, workId, style, updatedAt'
    });
  }
}

export const db = new AlfajorcitoDB();

// Helper to clear all academic entities atomically (leaving database clean at 0)
export async function clearAllDatabaseData(): Promise<void> {
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
      await db.settings.put({ key: 'has_initialized', value: true, updatedAt: Date.now() });
    }
  );
}

export { initializeDatabaseSeed } from './seed';
