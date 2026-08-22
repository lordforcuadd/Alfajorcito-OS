import React, { useState, useRef, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Sparkles,
  Send,
  Bot,
  User,
  X,
  BookOpen,
  GraduationCap,
  Layers,
  ArrowRight,
  RefreshCw,
  Zap,
  HeartHandshake
} from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { FormattedNoteContent } from './WikiLinkRenderer';
import { queryGraphAssistant } from '../../services/aiService';
import { db } from '../../db';
import type { Note, Concept, Course, Work, Source, UserProfile } from '../../types';

export interface GraphAIChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  notes: Note[];
  concepts: Concept[];
  courses: Course[];
  works: Work[];
  sources?: Source[];
  onNavigateToNote: (note: Note) => void;
  onNavigateToWork?: (workId: string) => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: number;
  modelUsed?: string;
}

export const GraphAIChatModal: React.FC<GraphAIChatModalProps> = ({
  isOpen,
  onClose,
  notes,
  concepts,
  courses,
  works,
  sources = [],
  onNavigateToNote,
  onNavigateToWork
}) => {
  const userProfile = useLiveQuery(async () => {
    const rec = await db.settings.get('user_profile');
    return rec?.value as UserProfile | undefined;
  });

  const studentName = userProfile?.name || 'Saory';
  const cycle = userProfile?.currentCycle || '8vo Ciclo';
  const specialty = userProfile?.specialty === 'CLINICA' ? 'Psicología Clínica' : userProfile?.specialty || 'Psicología';

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const activeNotes = notes.filter((n) => n.paraCategory !== 'ARCHIVE');
  const activeWorks = works.filter((w) => !w.isArchived);
  const activeCourses = courses.filter((c) => !c.isArchived);

  // Initialize personalized welcome message
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          sender: 'ai',
          text: `¡Hola **${studentName}**! 🌟 Qué gusto saludarte.

Estoy conectado a todo tu **Segundo Cerebro** de **${specialty}** en la USMP (${cycle}). 

Conozco tus notas, asignaturas en curso, conceptos teóricos y tu proyecto de investigación sobre Regulación Emocional y Autoeficacia. Pregúntame con total libertad lo que necesites explorar o relacionar.

Cualquier nota o concepto que mencione tendrá su enlace directo como [[Nombre]] para que puedas abrirlo con un clic en tu grafo.`,
          timestamp: Date.now(),
          modelUsed: 'Alfajorcito Companion Engine'
        }
      ]);
    }
  }, [studentName, cycle, specialty, messages.length]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSendMessage = async (queryToSend?: string) => {
    const text = (queryToSend || inputText).trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: Date.now()
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      const result = await queryGraphAssistant(text, {
        notes: activeNotes,
        concepts,
        courses: activeCourses,
        works: activeWorks,
        sources,
        userProfile
      });

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: result.answer,
        timestamp: Date.now(),
        modelUsed: result.modelUsed
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      const errorMsg: ChatMessage = {
        id: `error-${Date.now()}`,
        sender: 'ai',
        text: `Disculpa ${studentName}, ocurrió un inconveniente al consultar el grafo. Por favor intenta preguntarme de nuevo.`,
        timestamp: Date.now()
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Asistente IA del Grafo"
      subtitle={`Conectado al Segundo Cerebro de ${studentName} • ${cycle}`}
      maxWidth="2xl"
    >
      <div className="space-y-4">
        {/* Knowledge Stats Index Bar */}
        <div className="flex items-center justify-between gap-2 p-2.5 rounded-2xl bg-gradient-to-r from-[#FDF2F0] via-white to-[#E0F2F1] border border-[#CBD5E1] text-xs flex-wrap">
          <div className="flex items-center gap-2 text-[#475569] font-medium flex-wrap">
            <span className="flex items-center gap-1 bg-white px-2 py-0.5 rounded-lg border border-[#E2E8F0] shadow-2xs font-bold text-[#D97706]">
              📝 {activeNotes.length} notas activas
            </span>
            <span className="flex items-center gap-1 bg-white px-2 py-0.5 rounded-lg border border-[#E2E8F0] shadow-2xs font-bold text-[#0D9488]">
              💡 {concepts.length} conceptos
            </span>
            <span className="flex items-center gap-1 bg-white px-2 py-0.5 rounded-lg border border-[#E2E8F0] shadow-2xs font-bold text-[#7C3AED]">
              🎓 {activeCourses.length} cursos
            </span>
            <span className="flex items-center gap-1 bg-white px-2 py-0.5 rounded-lg border border-[#E2E8F0] shadow-2xs font-bold text-[#E11D48]">
              📁 {activeWorks.length} trabajos
            </span>
          </div>

          <span className="text-[10px] font-bold text-[#00695C] bg-[#E0F2F1] px-2 py-0.5 rounded-full border border-[#80CBC4]/60">
            {studentName} • USMP
          </span>
        </div>

        {/* Chat Thread */}
        <div className="max-h-[440px] min-h-[260px] overflow-y-auto space-y-3.5 p-3 rounded-2xl bg-[#FAF8F5] border border-[#E2E8F0] shadow-2xs">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.sender === 'ai' && (
                <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-[#0D9488] to-[#14B8A6] text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[88%] sm:max-w-[80%] rounded-2xl p-3.5 space-y-1 text-xs sm:text-sm leading-relaxed shadow-2xs ${
                  msg.sender === 'user'
                    ? 'bg-[#E8A598] text-[#2B2D42] font-semibold rounded-tr-xs'
                    : 'bg-white text-[#1E293B] border border-[#E2E8F0] rounded-tl-xs'
                }`}
              >
                {msg.sender === 'ai' ? (
                  <FormattedNoteContent
                    content={msg.text}
                    notes={notes}
                    concepts={concepts}
                    courses={courses}
                    works={works}
                    onNavigateToNote={(n) => {
                      onClose();
                      onNavigateToNote(n);
                    }}
                    onNavigateToWork={(wId) => {
                      onClose();
                      if (onNavigateToWork) onNavigateToWork(wId);
                    }}
                  />
                ) : (
                  <p>{msg.text}</p>
                )}

                {msg.modelUsed && (
                  <div className="pt-1.5 border-t border-[#F1F5F9] flex items-center justify-between text-[10px] text-[#94A3B8]">
                    <span>Generado con: <strong className="text-[#0D9488]">{msg.modelUsed}</strong></span>
                    <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                )}
              </div>

              {msg.sender === 'user' && (
                <div className="w-7 h-7 rounded-xl bg-[#2B2D42] text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-2.5 justify-start animate-fade-in">
              <div className="w-7 h-7 rounded-xl bg-[#0D9488] text-white flex items-center justify-center shrink-0 animate-pulse">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-white border border-[#E2E8F0] rounded-2xl rounded-tl-xs p-3 text-xs text-[#64748B] flex items-center gap-2 shadow-2xs">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#0D9488]" />
                <span>Navegando y sintetizando el grafo de conocimiento...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Pregúntale a la IA sobre relaciones, conceptos o notas de tu grafo..."
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 rounded-2xl border border-[#CBD5E1] bg-white text-xs sm:text-sm text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#0D9488] disabled:opacity-50"
          />
          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={!inputText.trim() || isLoading}
            isLoading={isLoading}
            icon={<Send className="w-4 h-4" />}
            className="font-bold shrink-0 bg-[#0D9488] hover:bg-[#0F766E] border-none text-white shadow-xs"
          >
            Preguntar
          </Button>
        </form>
      </div>
    </Modal>
  );
};
