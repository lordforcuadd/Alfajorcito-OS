import React from 'react';
import { FileText, Sparkles, GraduationCap, BookOpen, ExternalLink, Plus } from 'lucide-react';
import type { Note, Concept, Course, Work } from '../../types';

export interface FormattedContentProps {
  content: string;
  notes: Note[];
  concepts?: Concept[];
  courses?: Course[];
  works?: Work[];
  onNavigateToNote: (note: Note) => void;
  onNavigateToWork?: (workId: string) => void;
  onCreateMissingNote?: (title: string) => void;
  className?: string;
}

export const FormattedNoteContent: React.FC<FormattedContentProps> = ({
  content,
  notes,
  concepts = [],
  courses = [],
  works = [],
  onNavigateToNote,
  onNavigateToWork,
  onCreateMissingNote,
  className = ''
}) => {
  if (!content) {
    return <p className="text-xs text-[#8D99AE] italic">Nota vacía.</p>;
  }

  // Handle Wiki-Link Navigation
  const handleLinkClick = (rawTarget: string) => {
    const target = rawTarget.trim();
    const targetLower = target.toLowerCase();
    // 1. Check matching note by title or slug
    const matchedNote = notes.find((n) => {
      const nt = n.title.toLowerCase();
      if (nt === targetLower || n.slug.toLowerCase() === targetLower) return true;
      if (targetLower.length >= 3 && (nt.includes(targetLower) || (nt.length >= 3 && targetLower.includes(nt)))) return true;
      return false;
    });
    if (matchedNote) {
      onNavigateToNote(matchedNote);
      return;
    }

    // 2. Check matching concept
    const matchedConcept = concepts.find((c) => {
      const cn = c.name.toLowerCase();
      if (cn === targetLower) return true;
      if (targetLower.length >= 3 && (cn.includes(targetLower) || (cn.length >= 3 && targetLower.includes(cn)))) return true;
      return false;
    });
    if (matchedConcept) {
      // Find any note linked to this concept
      const conceptNote = notes.find((n) => (n.conceptIds || []).includes(matchedConcept.id));
      if (conceptNote) {
        onNavigateToNote(conceptNote);
        return;
      }
    }

    // 3. Check matching work / thesis
    const matchedWork = works.find((w) => {
      const wt = w.title.toLowerCase();
      if (wt === targetLower) return true;
      if (targetLower.length >= 3 && (wt.includes(targetLower) || (wt.length >= 3 && targetLower.includes(wt)))) return true;
      return false;
    });
    if (matchedWork && onNavigateToWork) {
      onNavigateToWork(matchedWork.id);
      return;
    }

    // 4. Check matching course
    const matchedCourse = courses.find((c) => {
      const ct = c.name.toLowerCase();
      if (ct === targetLower) return true;
      if (c.code && c.code.toLowerCase() === targetLower) return true;
      if (targetLower.length >= 3 && (ct.includes(targetLower) || targetLower.includes(ct))) return true;
      return false;
    });
    if (matchedCourse) {
      const courseNote = notes.find((n) => n.courseId === matchedCourse.id);
      if (courseNote) {
        onNavigateToNote(courseNote);
        return;
      }
    }

    // 5. If not found, offer to create it
    if (onCreateMissingNote) {
      onCreateMissingNote(target);
    }
  };

  // Helper to parse inline markdown (bold, italic, tags, and [[wiki-links]])
  const renderInlineText = (text: string, keyPrefix: string) => {
    // Regex matching [[wiki-links]] or #tags
    const targetSet = new Set([
      ...notes.map((n) => n.title.toLowerCase()),
      ...notes.map((n) => n.slug.toLowerCase()),
      ...concepts.map((c) => c.name.toLowerCase()),
      ...works.map((w) => w.title.toLowerCase()),
      ...courses.map((c) => c.name.toLowerCase()),
      ...courses.map((c) => (c.code || '').toLowerCase()).filter(Boolean)
    ]);
    const parts = text.split(/(\[\[.*?\]\]|#[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ_]+)/g);

    return parts.map((part, index) => {
      const partKey = `${keyPrefix}-${index}`;

      // 1. Is [[Wiki-Link]]
      if (part.startsWith('[[') && part.endsWith(']]')) {
        const linkTitle = part.slice(2, -2).trim();
        if (!linkTitle) return null;

        const isCourse = courses.some(
          (c) =>
            c.name.toLowerCase() === linkTitle.toLowerCase() ||
            (c.code && c.code.toLowerCase() === linkTitle.toLowerCase()) ||
            (linkTitle.length >= 4 && c.name.toLowerCase().includes(linkTitle.toLowerCase()))
        );
        const isWork = works.some(
          (w) =>
            w.title.toLowerCase() === linkTitle.toLowerCase() ||
            (linkTitle.length >= 4 && w.title.toLowerCase().includes(linkTitle.toLowerCase()))
        );
        const isConcept = concepts.some(
          (c) =>
            c.name.toLowerCase() === linkTitle.toLowerCase() ||
            (linkTitle.length >= 4 && c.name.toLowerCase().includes(linkTitle.toLowerCase()))
        );
        const isNote = notes.some(
          (n) =>
            n.title.toLowerCase() === linkTitle.toLowerCase() ||
            (linkTitle.length >= 4 && n.title.toLowerCase().includes(linkTitle.toLowerCase()))
        );

        const exists = isCourse || isWork || isConcept || isNote || targetSet.has(linkTitle.toLowerCase());

        let badgeStyle = 'bg-[#FAF8F5] text-[#2B2D42] border-[#CBD5E1] hover:bg-white hover:border-[#8C3A32]';
        let Icon = FileText;

        if (isCourse) {
          // Asignatura: Elegant Slate / Academic Blue
          badgeStyle = 'bg-[#EEF2F6] text-[#1E293B] border-[#CBD5E1] hover:bg-[#E2E8F0] hover:border-[#94A3B8]';
          Icon = BookOpen;
        } else if (isWork) {
          // Entregable / Tesis: Elegant Terracotta / Rose
          badgeStyle = 'bg-[#FDF2F0] text-[#8C3A32] border-[#E8A598]/70 hover:bg-[#FBE5E1] hover:border-[#D98880]';
          Icon = GraduationCap;
        } else if (isConcept) {
          // Concepto Teórico: Elegant Teal / Mint
          badgeStyle = 'bg-[#F0FDFA] text-[#0F766E] border-[#99F6E4] hover:bg-[#CCFBF1] hover:border-[#5EEAD4]';
          Icon = Sparkles;
        } else if (!exists) {
          // Nota por crear
          badgeStyle = 'bg-[#F5F1EB]/70 text-[#5A6275] border border-dashed border-[#CBD5E1] hover:bg-white';
          Icon = Plus;
        }

        return (
          <button
            key={partKey}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleLinkClick(linkTitle);
            }}
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 mx-1 my-0.5 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-2xs hover:scale-[1.02] active:scale-[0.98] align-middle select-none max-w-full ${badgeStyle}`}
            title={`Clic para saltar a: "${linkTitle}"`}
          >
            <Icon className="w-3.5 h-3.5 shrink-0 opacity-90" />
            <span className="truncate max-w-[180px] sm:max-w-[280px]">{linkTitle}</span>
          </button>
        );
      }

      // 2. Is #hashtag
      if (part.startsWith('#') && part.length > 1) {
        return (
          <span
            key={partKey}
            className="inline-block px-1.5 py-0.5 mx-0.5 rounded-md bg-[#F5F1EB] text-[#5A6275] text-[11px] font-semibold font-mono"
          >
            {part}
          </span>
        );
      }

      // 3. Regular text with basic bold formatting
      return parseBoldItalic(part, partKey);
    });
  };

  // Helper for bold and italic
  const parseBoldItalic = (text: string, key: string) => {
    const boldParts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);
    return boldParts.map((bPart, bIdx) => {
      const bKey = `${key}-b-${bIdx}`;
      if (bPart.startsWith('**') && bPart.endsWith('**')) {
        return <strong key={bKey} className="font-extrabold text-[#2B2D42]">{bPart.slice(2, -2)}</strong>;
      }
      if (bPart.startsWith('*') && bPart.endsWith('*')) {
        return <em key={bKey} className="italic text-[#5A6275]">{bPart.slice(1, -1)}</em>;
      }
      return <span key={bKey}>{bPart}</span>;
    });
  };

  // Clean and normalize content (clean empty wiki links and isolated floating bullets)
  const normalizedContent = (content || '')
    .replace(/\[\[\s*\]\]/g, '')
    .replace(/\n\s*•\s*\n\s*/g, '\n• ')
    .replace(/\n\s*-\s*\n\s*/g, '\n- ')
    .replace(/\n\s*\*\s*\n\s*/g, '\n* ');

  // Split content by lines/blocks
  const lines = normalizedContent.split('\n');

  return (
    <div className={`space-y-2 text-xs sm:text-sm text-[#2B2D42] leading-relaxed ${className}`}>
      {lines.map((line, lineIdx) => {
        const trimmed = line.trim();

        // Empty line
        if (!trimmed) {
          return <div key={lineIdx} className="h-1" />;
        }

        // Horizontal Rule
        if (trimmed === '---' || trimmed === '***' || trimmed === '══════════════════════════════════════════') {
          return <hr key={lineIdx} className="border-t border-[#EBE5DF] my-2" />;
        }

        // H1 Heading
        if (line.startsWith('# ')) {
          return (
            <h2 key={lineIdx} className="text-base sm:text-lg font-extrabold text-[#2B2D42] pt-2 pb-1 border-b border-[#EBE5DF]/80">
              {renderInlineText(line.slice(2), `h1-${lineIdx}`)}
            </h2>
          );
        }

        // H2 Heading
        if (line.startsWith('## ')) {
          return (
            <h3 key={lineIdx} className="text-sm sm:text-base font-bold text-[#8C3A32] pt-2 pb-0.5">
              {renderInlineText(line.slice(3), `h2-${lineIdx}`)}
            </h3>
          );
        }

        // H3 Heading
        if (line.startsWith('### ')) {
          return (
            <h4 key={lineIdx} className="text-xs sm:text-sm font-bold text-[#2B2D42] pt-1">
              {renderInlineText(line.slice(4), `h3-${lineIdx}`)}
            </h4>
          );
        }

        // Bullet List (supports -, *, •, and numbered items)
        const bulletMatch = line.match(/^(\s*)([-*•]|\d+\.)\s+(.*)$/);
        if (bulletMatch) {
          const marker = bulletMatch[2];
          const isNumbered = /^\d+\./.test(marker);
          return (
            <div key={lineIdx} className="flex items-start gap-2 pl-1.5 my-0.5">
              <span className={`font-bold text-xs shrink-0 select-none ${isNumbered ? 'text-[#8C3A32]' : 'text-[#D98880]'}`}>
                {isNumbered ? marker : '•'}
              </span>
              <div className="flex-1 min-w-0">{renderInlineText(bulletMatch[3], `li-${lineIdx}`)}</div>
            </div>
          );
        }

        // Standalone bullet with text directly following or indented
        if (line.startsWith('- ') || line.startsWith('* ') || line.startsWith('• ')) {
          return (
            <div key={lineIdx} className="flex items-start gap-2 pl-1.5 my-0.5">
              <span className="text-[#D98880] font-bold text-xs shrink-0 select-none">•</span>
              <div className="flex-1 min-w-0">{renderInlineText(line.slice(2), `li-${lineIdx}`)}</div>
            </div>
          );
        }

        // Regular Paragraph
        return (
          <p key={lineIdx} className="leading-relaxed">
            {renderInlineText(line, `p-${lineIdx}`)}
          </p>
        );
      })}
    </div>
  );
};
