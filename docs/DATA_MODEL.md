# DATA MODEL SPECIFICATION: Alfajorcito OS

## 1. Esquema Relacional de Entidades (IndexedDB / Dexie.js)

### Diagrama Entidad-Relación Conceptual:

```text
┌──────────────┐       1:N       ┌──────────────┐       1:N       ┌──────────────┐
│    Course    │ ─────────────── │     Work     │ ─────────────── │  Assignment  │
│  (Materia)   │                 │  (Trabajo)   │                 │  Checklist   │
└──────────────┘                 └──────────────┘                 └──────────────┘
       │                                │                                │
       │ 1:N                            │ 1:N                            │
       ▼                                ▼                                │
┌──────────────┐                 ┌──────────────┐                        │
│   Teacher    │                 │  InquiryTo   │                        │
│  (Profesor)  │                 │   Teacher    │                        │
└──────────────┘                 └──────────────┘                        │
                                        │                                │
                                        │ M:N                            │
                                        ▼                                │
┌──────────────┐       1:N       ┌──────────────┐       1:N              │
│    Source    │ ─────────────── │     Idea     │ ─────────────┐         │
│   (Fuente)   │                 │  (Extraída)  │              │         │
└──────────────┘                 └──────────────┘              │         │
       │                                │                      │         │
       │ 1:N                            │ 1:1                  │         │
       ▼                                ▼                      │         │
┌──────────────┐                 ┌──────────────┐              │         │
│  Reference   │ ─────────────── │  Paraphrase  │              │         │
│ (Bibliog.)   │      1:1        │  (Paráfrasis)│              │         │
└──────────────┘                 └──────────────┘              │         │
       │                                │ 1:1                  │         │
       │                                ▼                      │         │
       │                         ┌──────────────┐              │         │
       └──────────────────────── │   Citation   │ ◄────────────┘         │
                                 │   (En texto) │                        │
                                 └──────────────┘                        │
                                        │                                │
                                        │ M:N                            │
                                        ▼                                │
┌──────────────┐       M:N       ┌──────────────┐       M:N              │
│   Concept    │ ─────────────── │     Note     │ ───────────────────────┘
│  (Concepto)  │                 │  (Atómica)   │
└──────────────┘                 └──────────────┘
```

---

## 2. Definición Detallada de Tablas y Atributos

### 1. `courses` (Cursos / Asignaturas)
- `id` (string, UUID / nanoid, Primary Key)
- `code` (string, opcional, e.g. "INF-302")
- `name` (string, requerido, e.g. "Metodología de la Investigación")
- `period` (string, e.g. "2026-II")
- `color` (string, hex, e.g. "#D98880")
- `teacherName` (string, opcional)
- `teacherEmail` (string, opcional)
- `syllabusUrl` (string, opcional)
- `createdAt` (number, timestamp ms)
- `updatedAt` (number, timestamp ms)
- `isArchived` (boolean, default: false)

*Índices Dexie*: `&id, name, period, isArchived, updatedAt`

---

### 2. `works` (Trabajos Académicos / Ensayos / Tesis)
- `id` (string, UUID, Primary Key)
- `courseId` (string, FK -> `courses.id`)
- `title` (string, requerido)
- `type` (enum: `'ENSAYO' | 'MONOGRAFIA' | 'TESIS' | 'INFORME' | 'PROYECTO' | 'EXAMEN' | 'PRESENTACION' | 'OTRO'`)
- `status` (enum: `'PLANIFICACION' | 'INVESTIGACION' | 'REDACTANDO' | 'EN_REVISION' | 'CORRECCION' | 'ENTREGADO' | 'ARCHIVADO'`)
- `deadline` (number, timestamp ms)
- `citationStyle` (enum: `'APA_7' | 'MLA_9' | 'IEEE' | 'CHICAGO_AUTHOR_DATE' | 'CHICAGO_NOTES' | 'VANCOUVER'`)
- `maxSourceAgeYears` (number, opcional, e.g. 5 años / año mínimo 2021)
- `minRequiredSources` (number, default: 0)
- `formatRequirements` (string, formato de entrega, tipografía, márgenes)
- `rawInstructions` (string, consigna textual o descripción)
- `instructionAnalysis` (object con `{ explicitRequirements: string[], aiInferences: string[], deliverableFormat: string, wordCountTarget?: number }`)
- `draftContent` (string, texto borrador en Markdown)
- `canvaUrl` (string, URL de diseño vinculado)
- `googleDocUrl` (string, URL de documento de Google vinculado)
- `createdAt` (number, timestamp ms)
- `updatedAt` (number, timestamp ms)
- `isArchived` (boolean, default: false)

*Índices Dexie*: `&id, courseId, status, deadline, isArchived, updatedAt`

---

### 3. `inquiries` (Consultas al Profesor)
- `id` (string, UUID, Primary Key)
- `workId` (string, FK -> `works.id`)
- `courseId` (string, FK -> `courses.id`)
- `topic` (string, e.g. "¿Se permite usar fuentes del año 2018?")
- `rawQuestion` (string, duda original informal)
- `formalQuestion` (string, formulación estructurada para el profesor)
- `status` (enum: `'DRAFT' | 'SENT' | 'ANSWERED' | 'DISCARDED'`)
- `askedDate` (number, timestamp ms, opcional)
- `teacherAnswer` (string, respuesta oficial del docente)
- `answeredDate` (number, timestamp ms, opcional)
- `evidenceAttachmentUrl` (string, captura de correo o audio/foto de pizarra)
- `bindingDecision` (string, directriz que anula sugerencias de IA)
- `createdAt` (number, timestamp ms)
- `updatedAt` (number, timestamp ms)

*Índices Dexie*: `&id, workId, courseId, status, updatedAt`

---

### 4. `sources` (Biblioteca de Fuentes Académicas)
- `id` (string, UUID, Primary Key)
- `workIds` (string[], array de FKs -> `works.id`)
- `title` (string, requerido)
- `authors` (array de `{ firstName: string, lastName: string }`)
- `year` (number, año de publicación)
- `type` (enum: `'JOURNAL_ARTICLE' | 'BOOK' | 'BOOK_CHAPTER' | 'CONFERENCE_PAPER' | 'THESIS' | 'REPORT' | 'WEBPAGE' | 'OTHER'`)
- `publication` (string, revista científica, editorial o institución)
- `volume` (string, opcional)
- `issue` (string, opcional)
- `pages` (string, opcional, e.g. "45-62")
- `doi` (string, opcional, e.g. "10.1016/j.compedu.2023.104789")
- `url` (string, opcional)
- `abstract` (string, resumen académico)
- `keywords` (string[])
- `accessedAt` (number, timestamp ms de consulta)
- `verificationStatus` (enum: `'VERIFIED' | 'PARTIALLY_VERIFIED' | 'UNVERIFIED'`)
- `verificationProvider` (enum: `'CROSSREF' | 'OPENALEX' | 'SEMANTIC_SCHOLAR' | 'MANUAL' | 'DOI_ORG'`)
- `historicalContextApproved` (boolean, si el profesor aprobó antigüedad excepcional)
- `cslJson` (object, JSON estándar CSL completo)
- `bibtex` (string, entrada BibTeX)
- `pdfLocalPath` (string, opcional)
- `createdAt` (number, timestamp ms)
- `updatedAt` (number, timestamp ms)

*Índices Dexie*: `&id, *workIds, year, verificationStatus, doi, updatedAt`

---

### 5. `ideas` (Ideas Extraídas de Fuentes)
- `id` (string, UUID, Primary Key)
- `sourceId` (string, FK -> `sources.id`)
- `workId` (string, opcional, FK -> `works.id`)
- `rawQuote` (string, texto textual extraído del paper/libro)
- `pageOrLocation` (string, e.g. "p. 112", "Sección 3.2")
- `extractedCoreIdea` (string, síntesis de la tesis o hallazgo)
- `tags` (string[])
- `createdAt` (number, timestamp ms)
- `updatedAt` (number, timestamp ms)

*Índices Dexie*: `&id, sourceId, workId, updatedAt`

---

### 6. `paraphrases` (Paráfrasis Propias y Trazabilidad)
- `id` (string, UUID, Primary Key)
- `ideaId` (string, FK -> `ideas.id`)
- `sourceId` (string, FK -> `sources.id`)
- `workId` (string, opcional, FK -> `works.id`)
- `ownInterpretation` (string, comprensión y reflexión del estudiante)
- `finalParaphrase` (string, redacción con palabras propias sin plagio)
- `fidelityReviewStatus` (enum: `'PENDING_REVIEW' | 'CONFIRMED_FAITHFUL' | 'NEEDS_ADJUSTMENT'`)
- `fidelityWarningMessage` (string, opcional)
- `createdAt` (number, timestamp ms)
- `updatedAt` (number, timestamp ms)

*Índices Dexie*: `&id, ideaId, sourceId, workId, fidelityReviewStatus, updatedAt`

---

### 7. `citations` (Citas y Referencias Vinculadas)
- `id` (string, UUID, Primary Key)
- `paraphraseId` (string, FK -> `paraphrases.id`, opcional)
- `ideaId` (string, FK -> `ideas.id`, opcional)
- `sourceId` (string, FK -> `sources.id`)
- `workId` (string, FK -> `works.id`)
- `style` (enum: `'APA_7' | 'MLA_9' | 'IEEE' | 'CHICAGO_AUTHOR_DATE' | 'CHICAGO_NOTES' | 'VANCOUVER'`)
- `inTextNarrative` (string, e.g. "Sánchez (2024)")
- `inTextParenthetical` (string, e.g. "(Sánchez, 2024, p. 112)")
- `fullReferenceFormatted` (string, entrada bibliográfica completa)
- `createdAt` (number, timestamp ms)
- `updatedAt` (number, timestamp ms)

*Índices Dexie*: `&id, sourceId, workId, style, updatedAt`

---

### 8. `notes` (Segundo Cerebro / Notas Atómicas Obsidian)
- `id` (string, UUID, Primary Key)
- `slug` (string, nombre de archivo Obsidian seguro)
- `title` (string, requerido)
- `content` (string, Markdown con `[[wikilinks]]`)
- `paraCategory` (enum: `'PROJECT' | 'AREA' | 'RESOURCE' | 'ARCHIVE' | 'ATOMIC'`)
- `courseId` (string, opcional, FK -> `courses.id`)
- `workId` (string, opcional, FK -> `works.id`)
- `sourceIds` (string[], array de FKs -> `sources.id`)
- `conceptIds` (string[], array de FKs -> `concepts.id`)
- `tags` (string[])
- `backlinks` (string[], slugs o IDs de notas que enlazan a esta)
- `isPinned` (boolean, default: false)
- `createdAt` (number, timestamp ms)
- `updatedAt` (number, timestamp ms)

*Índices Dexie*: `&id, slug, paraCategory, courseId, workId, *tags, *sourceIds, isPinned, updatedAt`

---

### 9. `concepts` (Red Conceptual / Zettelkasten)
- `id` (string, UUID, Primary Key)
- `name` (string, único, e.g. "Constructivismo Epistemológico")
- `description` (string, definición canónica condensada)
- `color` (string, hex)
- `createdAt` (number, timestamp ms)
- `updatedAt` (number, timestamp ms)

*Índices Dexie*: `&id, &name, updatedAt`

---

### 10. `tasks` (Gestor de Tareas y Checklist de Trabajos)
- `id` (string, UUID, Primary Key)
- `workId` (string, opcional, FK -> `works.id`)
- `courseId` (string, opcional, FK -> `courses.id`)
- `title` (string, requerido)
- `description` (string, opcional)
- `dueDate` (number, timestamp ms, opcional)
- `priority` (enum: `'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'`)
- `isCompleted` (boolean, default: false)
- `completedAt` (number, timestamp ms, opcional)
- `category` (enum: `'ASSIGNMENT_CHECKLIST' | 'RESEARCH' | 'WRITING' | 'PROFESSOR_INQUIRY' | 'SUBMISSION' | 'GENERAL'`)
- `createdAt` (number, timestamp ms)
- `updatedAt` (number, timestamp ms)

*Índices Dexie*: `&id, workId, courseId, dueDate, priority, isCompleted, category, updatedAt`

---

### 11. `settings` (Configuración Local & Tokens Seguros)
- `key` (string, Primary Key, e.g. `'ai_config'`, `'user_profile'`, `'obsidian_config'`)
- `value` (object con llaves encriptadas localmente o flags)
- `updatedAt` (number, timestamp ms)

*Índices Dexie*: `&key`
