import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Search,
  GraduationCap,
  BookOpen,
  FileText,
  Brain,
  HelpCircle,
  CheckSquare,
  ArrowRight,
  X
} from 'lucide-react';
import { db } from '../../db';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';
import type { Work, Source, Note, Concept, InquiryToTeacher, Task } from '../../types';

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (type: string, id: string) => void;
}

type FilterCategory = 'ALL' | 'WORKS' | 'SOURCES' | 'NOTES' | 'CONCEPTS' | 'INQUIRIES' | 'TASKS';

export type CommandPaletteItem = {
  id: string;
  title: string;
  subtitle: string;
  category: FilterCategory;
  icon: React.ReactNode;
  badgeText: string;
  badgeVariant: 'rose' | 'lavender' | 'mint' | 'amber' | 'default';
  rawItem: Work | Source | Note | Concept | InquiryToTeacher | Task;
};

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, onNavigate }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<FilterCategory>('ALL');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Live queries
  const works = useLiveQuery(() => db.works.toArray()) || [];
  const sources = useLiveQuery(() => db.sources.toArray()) || [];
  const notes = useLiveQuery(() => db.notes.toArray()) || [];
  const concepts = useLiveQuery(() => db.concepts.toArray()) || [];
  const inquiries = useLiveQuery(() => db.inquiries.toArray()) || [];
  const tasks = useLiveQuery(() => db.tasks.toArray()) || [];

  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [isOpen]);

  // Unified Search Results
  const results = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    const items: CommandPaletteItem[] = [];

    const workStatusSpanish: Record<string, string> = {
      PLANIFICACION: 'Planificación',
      INVESTIGACION: 'Investigando',
      REDACTANDO: 'Redactando',
      EN_REVISION: 'En Revisión',
      CORRECCION: 'En Corrección',
      ENTREGADO: 'Entregado',
      ARCHIVADO: 'Archivado'
    };

    const verifStatusSpanish: Record<string, string> = {
      VERIFIED: 'Verificada',
      PARTIALLY_VERIFIED: 'Parcial',
      UNVERIFIED: 'Por verificar'
    };

    const paraCategorySpanish: Record<string, string> = {
      ATOMIC: 'Idea Rápida',
      PROJECT: 'Proyecto / Trabajo',
      AREA: 'Materia',
      RESOURCE: 'Recurso de Estudio',
      ARCHIVE: 'Archivada'
    };

    const inquiryStatusSpanish: Record<string, string> = {
      DRAFT: 'Borrador',
      SENT: 'Enviada',
      ANSWERED: 'Respondida'
    };

    // 1. Works
    if (selectedFilter === 'ALL' || selectedFilter === 'WORKS') {
      works.forEach((w) => {
        if (!q || w.title.toLowerCase().includes(q) || w.type.toLowerCase().includes(q)) {
          items.push({
            id: w.id,
            title: w.title,
            subtitle: `Trabajo (${w.type}) • Entrega: ${new Date(w.deadline).toLocaleDateString()}`,
            category: 'WORKS',
            icon: <GraduationCap className="w-4 h-4 text-[#D98880]" />,
            badgeText: workStatusSpanish[w.status] || w.status,
            badgeVariant: 'rose',
            rawItem: w
          });
        }
      });
    }

    // 2. Sources
    if (selectedFilter === 'ALL' || selectedFilter === 'SOURCES') {
      sources.forEach((s) => {
        const authors = (s.authors || []).map((a) => `${a.lastName} ${a.firstName}`).join(' ');
        if (
          !q ||
          s.title.toLowerCase().includes(q) ||
          authors.toLowerCase().includes(q) ||
          s.doi?.toLowerCase().includes(q) ||
          s.publication?.toLowerCase().includes(q)
        ) {
          items.push({
            id: s.id,
            title: s.title,
            subtitle: `${authors || 'Autor no verificado'} (${s.year || 's.f.'}) • ${s.publication || 'Fuente'}`,
            category: 'SOURCES',
            icon: <BookOpen className="w-4 h-4 text-[#90CAF9]" />,
            badgeText: verifStatusSpanish[s.verificationStatus] || s.verificationStatus,
            badgeVariant: s.verificationStatus === 'VERIFIED' ? 'mint' : 'amber',
            rawItem: s
          });
        }
      });
    }

    // 3. Notes
    if (selectedFilter === 'ALL' || selectedFilter === 'NOTES') {
      notes.forEach((n) => {
        if (
          !q ||
          n.title.toLowerCase().includes(q) ||
          n.content.toLowerCase().includes(q) ||
          n.tags.some((t) => t.toLowerCase().includes(q))
        ) {
          items.push({
            id: n.id,
            title: n.title,
            subtitle: `Nota [${paraCategorySpanish[n.paraCategory] || n.paraCategory}] • ${n.tags.join(' ')}`,
            category: 'NOTES',
            icon: <FileText className="w-4 h-4 text-[#B39DDB]" />,
            badgeText: paraCategorySpanish[n.paraCategory] || n.paraCategory,
            badgeVariant: 'lavender',
            rawItem: n
          });
        }
      });
    }

    // 4. Concepts
    if (selectedFilter === 'ALL' || selectedFilter === 'CONCEPTS') {
      concepts.forEach((c) => {
        if (!q || c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q)) {
          items.push({
            id: c.id,
            title: c.name,
            subtitle: c.description,
            category: 'CONCEPTS',
            icon: <Brain className="w-4 h-4 text-[#80CBC4]" />,
            badgeText: 'Concepto',
            badgeVariant: 'mint',
            rawItem: c
          });
        }
      });
    }

    // 5. Inquiries
    if (selectedFilter === 'ALL' || selectedFilter === 'INQUIRIES') {
      inquiries.forEach((inq) => {
        if (
          !q ||
          inq.topic.toLowerCase().includes(q) ||
          inq.rawQuestion.toLowerCase().includes(q) ||
          inq.teacherAnswer?.toLowerCase().includes(q)
        ) {
          items.push({
            id: inq.id,
            title: inq.topic,
            subtitle: inq.teacherAnswer
              ? `Respuesta: "${inq.teacherAnswer.length > 60 ? inq.teacherAnswer.slice(0, 60) + '...' : inq.teacherAnswer}"`
              : 'Pendiente de respuesta',
            category: 'INQUIRIES',
            icon: <HelpCircle className="w-4 h-4 text-[#FFCC80]" />,
            badgeText: inquiryStatusSpanish[inq.status] || inq.status,
            badgeVariant: inq.status === 'ANSWERED' ? 'mint' : 'amber',
            rawItem: inq
          });
        }
      });
    }

    // 6. Tasks
    if (selectedFilter === 'ALL' || selectedFilter === 'TASKS') {
      const prioritySpanish: Record<string, string> = {
        URGENT: 'Urgente',
        HIGH: 'Prioridad Alta',
        MEDIUM: 'Prioridad Media',
        LOW: 'Prioridad Baja'
      };

      tasks.forEach((t) => {
        if (!q || t.title.toLowerCase().includes(q)) {
          const priorityLabel = prioritySpanish[t.priority] || 'Media';
          items.push({
            id: t.id,
            title: t.title,
            subtitle: `Tarea • ${priorityLabel}`,
            category: 'TASKS',
            icon: <CheckSquare className="w-4 h-4 text-[#5A6275]" />,
            badgeText: t.isCompleted ? 'Completada' : priorityLabel,
            badgeVariant: t.isCompleted ? 'mint' : t.priority === 'URGENT' ? 'rose' : 'amber',
            rawItem: t
          });
        }
      });
    }

    return items;
  }, [searchQuery, selectedFilter, works, sources, notes, concepts, inquiries, tasks]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, results.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + results.length) % Math.max(1, results.length));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault();
      const item = results[selectedIndex];
      onNavigate(item.category.toLowerCase(), item.id);
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="lg" showCloseButton={false}>
      <div className="space-y-2.5 sm:space-y-3">
        {/* Search Header Input */}
        <div className="relative flex items-center border-b border-[#EBE5DF] pb-2 sm:pb-3">
          <Search className="w-4 h-4 sm:w-5 sm:h-5 text-[#8D99AE] absolute left-1 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            className="w-full bg-transparent pl-7 sm:pl-9 pr-7 sm:pr-8 text-xs sm:text-base text-[#2B2D42] placeholder:text-[#8D99AE] focus:outline-none"
            placeholder="Buscar por título, autor, DOI, concepto o nota..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-[#8D99AE] hover:text-[#2B2D42] p-1 cursor-pointer"
              aria-label="Limpiar búsqueda"
            >
              <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          )}
        </div>

        {/* Filter Pills with smooth scroll */}
        <div
          onWheel={(e) => {
            if (e.deltaY !== 0) {
              e.currentTarget.scrollLeft += e.deltaY;
            }
          }}
          className="flex items-center gap-1 sm:gap-1.5 tab-scroll-pc pb-1"
        >
          {[
            { id: 'ALL', label: 'Todo' },
            { id: 'WORKS', label: 'Trabajos' },
            { id: 'SOURCES', label: 'Fuentes' },
            { id: 'NOTES', label: 'Notas' },
            { id: 'CONCEPTS', label: 'Conceptos' },
            { id: 'INQUIRIES', label: 'Consultas' },
            { id: 'TASKS', label: 'Tareas' }
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => {
                setSelectedFilter(f.id as FilterCategory);
                setSelectedIndex(0);
              }}
              className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl text-[11px] sm:text-xs font-bold whitespace-nowrap transition-all cursor-pointer select-none shrink-0 ${
                selectedFilter === f.id
                  ? 'bg-[#E8A598] text-[#2B2D42] shadow-2xs'
                  : 'bg-[#F5F1EB] text-[#5A6275] hover:bg-[#EBE5DF]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Results List */}
        <div className="max-h-[55vh] sm:max-h-[50vh] overflow-y-auto space-y-1.5 pt-1 pr-1 overscroll-contain scroll-touch">
          {results.length === 0 ? (
            <div className="py-10 text-center text-xs text-[#8D99AE]">
              No se encontraron coincidencias para "{searchQuery}".
            </div>
          ) : (
            results.map((item, index) => {
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={`${item.category}-${item.id}`}
                  onClick={() => {
                    onNavigate(item.category.toLowerCase(), item.id);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`flex items-center justify-between p-3 rounded-2xl transition-all cursor-pointer select-none min-h-[48px] ${
                    isSelected
                      ? 'bg-[#FDF2F0] border border-[#E8A598]/50 shadow-2xs'
                      : 'hover:bg-[#F5F1EB] border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
                    <div className="p-2 rounded-xl bg-white border border-[#EBE5DF] shrink-0">
                      {item.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap min-w-0">
                        <h4 className="text-xs sm:text-sm font-bold text-[#2B2D42] truncate min-w-0 flex-1">
                          {item.title}
                        </h4>
                        <Badge variant={item.badgeVariant} size="sm" className="shrink-0">
                          {item.badgeText}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-[#5A6275] truncate mt-0.5">
                        {item.subtitle}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className={`w-4 h-4 shrink-0 transition-transform ${isSelected ? 'text-[#D98880] translate-x-0.5' : 'text-[#8D99AE]'}`} />
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="pt-2 border-t border-[#EBE5DF] flex items-center justify-between text-[10px] sm:text-[11px] text-[#8D99AE]">
          <span className="hidden sm:inline">Navegar con ↑ ↓</span>
          <span>Toca un elemento o presiona Enter para abrir</span>
          <span className="hidden sm:inline">Esc para cerrar</span>
        </div>
      </div>
    </Modal>
  );
};
