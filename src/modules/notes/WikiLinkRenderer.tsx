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
    const matchedNote = notes.find(
      (n) =>
        n.title.toLowerCase() === targetLower ||
        n.title.toLowerCase().includes(targetLower) ||
        targetLower.includes(n.title.toLowerCase()) ||
        n.slug.toLowerCase() === targetLower
    );
    if (matchedNote) {
      onNavigateToNote(matchedNote);
      return;
    }

    // 2. Check matching concept
    const matchedConcept = concepts.find(
      (c) =>
        c.name.toLowerCase() === targetLower ||
        c.name.toLowerCase().includes(targetLower) ||
        targetLower.includes(c.name.toLowerCase())
    );
    if (matchedConcept) {
      // Find any note linked to this concept
      const conceptNote = notes.find((n) => (n.conceptIds || []).includes(matchedConcept.id));
      if (conceptNote) {
        onNavigateToNote(conceptNote);
        return;
      }
    }

    // 3. Check matching work / thesis
    const matchedWork = works.find(
      (w) =>
        w.title.toLowerCase() === targetLower ||
        w.title.toLowerCase().includes(targetLower) ||
        targetLower.includes(w.title.toLowerCase())
    );
    if (matchedWork && onNavigateToWork) {
      onNavigateToWork(matchedWork.id);
      return;
    }

    // 4. If not found, offer to create it
    if (onCreateMissingNote) {
      onCreateMissingNote(target);
    }
  };

  // Helper to parse inline markdown (bold, italic, tags, and [[wiki-links]])
  const renderInlineText = (text: string, keyPrefix: string) => {
    // Regex matching [[wiki-links]] or #tags
    const parts = text.split(/(\[\[.*?\]\]|#[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ_]+)/g);

    return parts.map((part, index) => {
      const partKey = `${keyPrefix}-${index}`;

      // 1. Is [[Wiki-Link]]
      if (part.startsWith('[[') && part.endsWith(']]')) {
        const linkTitle = part.slice(2, -2).trim();
        const targetLower = linkTitle.toLowerCase();

        // Check node type for badge color/icon
        const isNote = notes.some(
          (n) => n.title.toLowerCase() === targetLower || n.title.toLowerCase().includes(targetLower)
        );
        const isConcept = concepts.some(
          (c) => c.name.toLowerCase() === targetLower || c.name.toLowerCase().includes(targetLower)
        );
        const isWork = works.some(
          (w) => w.title.toLowerCase() === targetLower || w.title.toLowerCase().includes(targetLower)
        );

        let badgeStyle = 'bg-[#FDF2F0] text-[#8C3A32] border-[#E8A598]/60 hover:bg-[#FCE3DF]';
        let Icon = FileText;

        if (isConcept) {
          badgeStyle = 'bg-teal-50 text-teal-800 border-teal-200 hover:bg-teal-100';
          Icon = Sparkles;
        } else if (isWork) {
          badgeStyle = 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100';
          Icon = GraduationCap;
        }

        return (
          <button
            key={partKey}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleLinkClick(linkTitle);
            }}
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 mx-1 my-0.5 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-2xs hover:scale-[1.03] active:scale-[0.97] align-middle select-none ${badgeStyle}`}
            title={`Clic para saltar a: "${linkTitle}"`}
          >
            <Icon className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate max-w-[200px]">{linkTitle}</span>
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

  // Split content by lines/blocks
  const lines = content.split('\n');

  return (
    <div className={`space-y-2.5 text-xs sm:text-sm text-[#2B2D42] leading-relaxed ${className}`}>
      {lines.map((line, lineIdx) => {
        const trimmed = line.trim();

        // Empty line
        if (!trimmed) {
          return <div key={lineIdx} className="h-1.5" />;
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

        // Bullet List
        if (line.startsWith('- ') || line.startsWith('* ')) {
          return (
            <div key={lineIdx} className="flex items-start gap-2 pl-2">
              <span className="text-[#D98880] font-bold text-sm leading-tight">•</span>
              <div className="flex-1 min-w-0">{renderInlineText(line.slice(2), `li-${lineIdx}`)}</div>
            </div>
          );
        }

        // Numbered List
        const numMatch = line.match(/^(\d+)\.\s(.*)$/);
        if (numMatch) {
          return (
            <div key={lineIdx} className="flex items-start gap-2 pl-2">
              <span className="text-[#8C3A32] font-bold text-xs shrink-0 mt-0.5">{numMatch[1]}.</span>
              <div className="flex-1 min-w-0">{renderInlineText(numMatch[2], `num-${lineIdx}`)}</div>
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
