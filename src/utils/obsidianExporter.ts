import JSZip from 'jszip';
import type { Note, Source, Work, Course, Concept } from '../types';
import { formatFullReference } from './citationEngine';

export function sanitizeSlug(title: string): string {
  return (
    title
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .trim() || 'nota'
  );
}

export function generateNoteMarkdown(
  note: Note,
  coursesMap: Map<string, Course>,
  worksMap: Map<string, Work>,
  sourcesMap: Map<string, Source>,
  conceptsMap: Map<string, Concept>
): string {
  const course = note.courseId ? coursesMap.get(note.courseId)?.name : undefined;
  const work = note.workId ? worksMap.get(note.workId)?.title : undefined;
  const sources = note.sourceIds.map(sid => sourcesMap.get(sid)?.title).filter(Boolean);
  const concepts = note.conceptIds.map(cid => conceptsMap.get(cid)?.name).filter(Boolean);

  const frontmatter = [
    '---',
    `id: "${note.id}"`,
    `title: "${note.title.replace(/"/g, '\\"')}"`,
    `para_category: "${note.paraCategory}"`,
    course ? `course: "[[${course}]]"` : null,
    work ? `work: "[[${work}]]"` : null,
    sources.length > 0 ? `sources:\n${sources.map(s => `  - "[[${s}]]"`).join('\n')}` : null,
    concepts.length > 0 ? `concepts:\n${concepts.map(c => `  - "[[${c}]]"`).join('\n')}` : null,
    note.tags.length > 0 ? `tags:\n${note.tags.map(t => `  - "${t}"`).join('\n')}` : null,
    `created: "${new Date(note.createdAt).toISOString().split('T')[0]}"`,
    `updated: "${new Date(note.updatedAt).toISOString().split('T')[0]}"`,
    '---',
    ''
  ].filter(line => line !== null).join('\n');

  return `${frontmatter}\n${note.content}`;
}

export function generateSourceMarkdown(source: Source): string {
  const authorsStr = (source.authors || []).map(a => `${a.lastName}, ${a.firstName}`).join('; ');
  const ref = formatFullReference(source, 'APA_7');

  return `---
id: "${source.id}"
title: "${source.title.replace(/"/g, '\\"')}"
type: "${source.type}"
authors: "${authorsStr}"
year: ${source.year || 'null'}
doi: "${source.doi || ''}"
url: "${source.url || ''}"
verification_status: "${source.verificationStatus}"
created: "${new Date(source.createdAt).toISOString().split('T')[0]}"
---

# ${source.title}

> **Referencia APA 7**:
> ${ref}

## Metadatos
- **Autores**: ${authorsStr || 'Dato no verificado'}
- **Año**: ${source.year || 's.f.'}
- **Publicación**: ${source.publication || 'Dato no verificado'}
- **DOI**: [${source.doi || 'Sin DOI'}](https://doi.org/${source.doi || ''})

## Resumen
${source.abstract || '*Sin resumen registrado.*'}

## Palabras Clave
${(source.keywords || []).map(k => `- #${k}`).join('\n') || '*Sin etiquetas.*'}
`;
}

export async function exportVaultZip(
  notes: Note[],
  sources: Source[],
  works: Work[],
  courses: Course[],
  concepts: Concept[]
): Promise<Blob> {
  const zip = new JSZip();

  const coursesMap = new Map(courses.map(c => [c.id, c]));
  const worksMap = new Map(works.map(w => [w.id, w]));
  const sourcesMap = new Map(sources.map(s => [s.id, s]));
  const conceptsMap = new Map(concepts.map(c => [c.id, c]));

  // Root Folders
  const inboxFolder = zip.folder('00_Inbox');
  const projectsFolder = zip.folder('01_Projects');
  const areasFolder = zip.folder('02_Areas');
  const resourcesFolder = zip.folder('03_Resources');
  const atomicFolder = zip.folder('04_Atomic_Notes');
  const archiveFolder = zip.folder('05_Archive');
  const sourcesFolder = zip.folder('06_Sources');

  // Add Courses as Area MOCs
  courses.forEach(c => {
    const courseContent = `---
id: "${c.id}"
title: "${c.name}"
code: "${c.code || ''}"
period: "${c.period}"
teacher: "${c.teacherName || ''}"
---

# ${c.name} (${c.period})

- **Docente**: ${c.teacherName || 'No especificado'} (${c.teacherEmail || ''})
- **Código**: ${c.code || 'N/A'}
`;
    areasFolder?.file(`${sanitizeSlug(c.name)}.md`, courseContent);
  });

  // Add Works as Project MOCs
  works.forEach(w => {
    const courseName = coursesMap.get(w.courseId)?.name || 'General';
    const workContent = `---
id: "${w.id}"
title: "${w.title}"
type: "${w.type}"
status: "${w.status}"
deadline: "${new Date(w.deadline).toISOString().split('T')[0]}"
course: "[[${courseName}]]"
citation_style: "${w.citationStyle}"
---

# ${w.title}

- **Curso**: [[${courseName}]]
- **Estado**: ${w.status}
- **Fecha de Entrega**: ${new Date(w.deadline).toLocaleDateString()}
- **Estilo de Citación**: ${w.citationStyle}

## Consignas e Instrucciones
${w.rawInstructions || '*Sin consignas registradas.*'}

## Borrador
${w.draftContent || '*Borrador vacío.*'}
`;
    const targetFolder = w.status === 'ARCHIVADO' ? archiveFolder : projectsFolder;
    targetFolder?.file(`${sanitizeSlug(w.title)}.md`, workContent);
  });

  // Add Sources
  sources.forEach(s => {
    sourcesFolder?.file(`${sanitizeSlug(s.title)}.md`, generateSourceMarkdown(s));
  });

  // Add Notes in their PARA location
  notes.forEach(n => {
    const md = generateNoteMarkdown(n, coursesMap, worksMap, sourcesMap, conceptsMap);
    const fileName = `${sanitizeSlug(n.title)}.md`;

    switch (n.paraCategory) {
      case 'PROJECT':
        projectsFolder?.file(fileName, md);
        break;
      case 'AREA':
        areasFolder?.file(fileName, md);
        break;
      case 'RESOURCE':
        resourcesFolder?.file(fileName, md);
        break;
      case 'ARCHIVE':
        archiveFolder?.file(fileName, md);
        break;
      case 'ATOMIC':
      default:
        atomicFolder?.file(fileName, md);
        break;
    }
  });

  return await zip.generateAsync({ type: 'blob' });
}
