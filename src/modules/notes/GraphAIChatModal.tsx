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
  RefreshCw,
  Copy,
  Check,
  RotateCcw,
  Lightbulb,
  FileText
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

  const studentName = userProfile?.name || 'Estudiante';
  const cycle = userProfile?.currentCycle || '';
  const specialty = userProfile?.specialty === 'CLINICA' ? 'Psicología Clínica' : userProfile?.specialty || userProfile?.major || 'Psicología';
  const thesisTitle = userProfile?.thesisTitle || '';
  const institution = userProfile?.institution || 'Universidad';

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const activeNotes = notes.filter((n) => n.paraCategory !== 'ARCHIVE');
  const activeWorks = works.filter((w) => !w.isArchived);
  const activeCourses = courses.filter((c) => !c.isArchived);

  // Initialize personalized welcome message
  const initWelcome = () => {
    const specialtyText = specialty ? ` de **${specialty}**` : '';
    const instText = institution ? ` en la ${institution}` : '';
    const cycleText = cycle ? ` (${cycle})` : '';
    const thesisText = thesisTitle ? ` y tu proyecto de investigación "${thesisTitle}"` : '';

    return [
      {
        id: 'welcome',
        sender: 'ai' as const,
        text: `¡Hola **${studentName}**! 🌟
Estoy conectada a tu Segundo Cerebro${specialtyText}${instText}${cycleText}. 

Conozco tus apuntes, asignaturas en curso, conceptos teóricos${thesisText}.

Cualquier nota o concepto que mencione tendrá su enlace interactivo como [[Nombre]] para que puedas abrirlo con un clic. ¿En qué te gustaría profundizar hoy?`,
        timestamp: Date.now(),
        modelUsed: 'Alfajorcito Companion Engine'
      }
    ];
  };

  useEffect(() => {
    if (messages.length === 0 || (messages.length === 1 && messages[0].id === 'welcome')) {
      setMessages(initWelcome());
    }
  }, [studentName, cycle, specialty, institution, thesisTitle]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleCopyMessage = async (msgId: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(msgId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // ignore
    }
  };

  const handleResetChat = () => {
    setMessages(initWelcome());
    setInputText('');
  };

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
        userProfile,
        history: messages.map((m) => ({ sender: m.sender, text: m.text }))
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
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Asistente IA del Grafo"
      subtitle={`Segundo Cerebro de ${studentName} • ${cycle}`}
      maxWidth="2xl"
    >
      <div className="flex flex-col h-[65vh] sm:h-[500px] max-h-[70vh] space-y-3">
        {/* Knowledge Stats Index Bar */}
        <div className="flex items-center justify-between gap-1.5 p-2 rounded-2xl bg-[#FAF8F5] border border-[#CBD5E1] text-xs shrink-0 flex-wrap">
          <div className="flex items-center gap-1.5 text-[#475569] font-medium flex-wrap overflow-x-auto tab-scroll-pc py-0.5">
            <span className="flex items-center gap-1 bg-white px-2 py-0.5 rounded-lg border border-[#E2E8F0] shadow-2xs font-bold text-[#D97706] text-[11px] whitespace-nowrap">
              📝 {activeNotes.length} notas
            </span>
            <span className="flex items-center gap-1 bg-white px-2 py-0.5 rounded-lg border border-[#E2E8F0] shadow-2xs font-bold text-[#0D9488] text-[11px] whitespace-nowrap">
              💡 {concepts.length} conceptos
            </span>
            <span className="flex items-center gap-1 bg-white px-2 py-0.5 rounded-lg border border-[#E2E8F0] shadow-2xs font-bold text-[#7C3AED] text-[11px] whitespace-nowrap">
              🎓 {activeCourses.length} cursos
            </span>
            <span className="flex items-center gap-1 bg-white px-2 py-0.5 rounded-lg border border-[#E2E8F0] shadow-2xs font-bold text-[#E11D48] text-[11px] whitespace-nowrap">
              📁 {activeWorks.length} trabajos
            </span>
          </div>

          <button
            onClick={handleResetChat}
            className="flex items-center gap-1 px-2 py-1 rounded-xl bg-white hover:bg-[#F1F5F9] border border-[#E2E8F0] text-[#64748B] hover:text-[#0F172A] text-[11px] font-semibold transition-colors cursor-pointer shadow-2xs shrink-0 ml-auto"
            title="Reiniciar conversación"
          >
            <RotateCcw className="w-3 h-3" />
            <span className="hidden xs:inline">Reiniciar</span>
          </button>
        </div>

        {/* Chat Thread */}
        <div className="flex-1 overflow-y-auto min-h-0 space-y-3 p-3 rounded-2xl bg-[#FAF8F5] border border-[#E2E8F0] shadow-2xs scroll-touch overscroll-contain">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.sender === 'ai' && (
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#FDF2F0] border border-[#E8A598]/60 flex items-center justify-center shrink-0 shadow-xs mt-0.5 overflow-hidden p-0.5">
                  <img src="/pusheen/anim-idle.webp" alt="Pusheen IA" className="w-full h-full object-contain filter drop-shadow-xs" />
                </div>
              )}

              <div
                className={`max-w-[92%] sm:max-w-[84%] rounded-2xl p-3 sm:p-3.5 space-y-1.5 text-xs sm:text-sm leading-relaxed shadow-2xs transition-all ${
                  msg.sender === 'user'
                    ? 'bg-gradient-to-r from-[#E8A598] to-[#D98880] text-[#2B2D42] font-semibold rounded-tr-xs'
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
                  <p className="break-words">{msg.text}</p>
                )}

                {msg.sender === 'ai' && (
                  <div className="pt-2 mt-1 border-t border-[#F1F5F9] flex items-center justify-between text-[10px] text-[#94A3B8] gap-2">
                    <span className="truncate">
                      {msg.modelUsed ? (
                        <>Modelo: <strong className="text-[#8C3A32]">{msg.modelUsed}</strong></>
                      ) : (
                        <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      )}
                    </span>
                    <button
                      onClick={() => handleCopyMessage(msg.id, msg.text)}
                      className="flex items-center gap-1 px-1.5 py-0.5 rounded-md hover:bg-[#F1F5F9] text-[#64748B] hover:text-[#0F172A] transition-colors cursor-pointer shrink-0"
                      title="Copiar respuesta"
                    >
                      {copiedId === msg.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-600 font-bold">Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {msg.sender === 'user' && (
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[#2B2D42] text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-2 justify-start animate-fade-in">
              <div className="w-9 h-9 rounded-xl bg-[#FDF2F0] border border-[#E8A598]/60 flex items-center justify-center shrink-0 p-0.5 overflow-hidden shadow-xs">
                <img src="/pusheen/anim-laptop.webp" alt="Pusheen pensando" className="w-full h-full object-contain" />
              </div>
              <div className="bg-white border border-[#E2E8F0] rounded-2xl rounded-tl-xs p-2.5 text-xs text-[#64748B] flex items-center gap-2 shadow-2xs">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#8C3A32]" />
                <span>Pusheen está navegando y sintetizando tu grafo en tiempo real...</span>
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
          className="flex items-center gap-2 shrink-0 pt-0.5"
        >
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Pregunta sobre relaciones, conceptos o notas de tu grafo..."
              disabled={isLoading}
              className="w-full px-3.5 py-2 sm:py-2.5 rounded-2xl border border-[#CBD5E1] bg-white text-xs sm:text-sm text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#0D9488] focus:border-transparent disabled:opacity-50 shadow-xs"
            />
          </div>
          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={!inputText.trim() || isLoading}
            isLoading={isLoading}
            icon={<Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
            className="font-bold shrink-0 bg-[#0D9488] hover:bg-[#0F766E] border-none text-white shadow-xs px-3 sm:px-4"
          >
            <span className="hidden sm:inline">Preguntar</span>
          </Button>
        </form>
      </div>
    </Modal>
  );
};
