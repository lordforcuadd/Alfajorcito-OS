import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  LayoutDashboard,
  GraduationCap,
  BookOpen,
  Brain,
  Plus,
  Search,
  Settings,
  WifiOff,
  GitFork,
  Award,
  Sparkles,
  Heart
} from 'lucide-react';
import { Button } from '../common/Button';
import { db } from '../../db';
import type { UserProfile } from '../../types';

export type NavTab = 'dashboard' | 'works' | 'curriculum' | 'research' | 'brain' | 'pipeline';

export interface AppShellProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onOpenQuickCapture: () => void;
  onOpenSearch: () => void;
  onOpenSettings: () => void;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  currentTab,
  onTabChange,
  onOpenQuickCapture,
  onOpenSearch,
  onOpenSettings,
  children
}) => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  // Dynamic user profile from IndexedDB (Live reactivity on settings edit!)
  const userProfileRecord = useLiveQuery(() => db.settings.get('user_profile'));
  const profile = (userProfileRecord?.value as UserProfile | undefined) || {
    name: 'Estudiante',
    institution: 'Universidad de San Martín de Porres',
    faculty: 'Facultad de Ciencias de la Comunicación, Turismo y Psicología',
    major: 'Psicología',
    currentCycle: '8vo Ciclo',
    defaultCitationStyle: 'APA_7'
  };

  // Mascot Animation States (Optimized WebP)
  const pusheenAnimations = [
    {
      id: 'idle',
      title: 'Acompañante',
      webp: '/pusheen/anim-idle.webp',
      phrases: [`¡Vamos por ese 20, ${profile.name}! 🐾`, '¡Miau! Lista para estudiar 🍰', '¡Orgullo USMP! 🌟']
    },
    {
      id: 'laptop',
      title: 'Tesis & Redacción',
      webp: '/pusheen/anim-laptop.webp',
      phrases: ['¡Redactando entregables a full! 💻', '¡Tu tesis va tomando forma! 📝', '¡Tipeando sin parar! ✨']
    },
    {
      id: 'book',
      title: 'Lectura & Fuentes',
      webp: '/pusheen/anim-book.webp',
      phrases: ['¡Revisando literatura con rigor APA 7! 📖', '¡Analizando papers y fuentes! 🔍', '¡Segundo Cerebro en acción! 🧠']
    },
    {
      id: 'party',
      title: 'Celebración',
      webp: '/pusheen/anim-party.webp',
      phrases: ['¡Objetivo académico cumplido! 🎉', '¡Excelente avance hoy! 🥳', '¡Tesis aprobada con 20! 🎓']
    },
    {
      id: 'sleep',
      title: 'Descanso',
      webp: '/pusheen/anim-sleep.webp',
      phrases: ['¡Zzz... tomando un merecido descanso! 💤', '¡Pausa activa para despejar la mente! ☕', '¡Recargando energía! 😴']
    }
  ];

  const [animIndex, setAnimIndex] = useState(0);
  const [pusheenMessage, setPusheenMessage] = useState<string | null>(null);
  const [isPusheenPopping, setIsPusheenPopping] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isCelebratingUntil, setIsCelebratingUntil] = useState(0);
  const messageTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Centralized speech bubble manager (clears previous timers to avoid flickering/bugs)
  const showPusheenBubble = useCallback((text: string, durationMs = 4000) => {
    if (messageTimeoutRef.current) {
      clearTimeout(messageTimeoutRef.current);
    }
    setPusheenMessage(text);
    messageTimeoutRef.current = setTimeout(() => {
      setPusheenMessage(null);
      messageTimeoutRef.current = null;
    }, durationMs);
  }, []);

  useEffect(() => {
    return () => {
      if (messageTimeoutRef.current) {
        clearTimeout(messageTimeoutRef.current);
      }
    };
  }, []);

  // 1. Contextual Auto-State based on Active Tab or Live Typing
  useEffect(() => {
    // If a work delivery celebration is active, don't interrupt it!
    if (Date.now() < isCelebratingUntil) return;

    if (isTyping) {
      setAnimIndex(1); // laptop typing mode
      return;
    }

    if (currentTab === 'works') {
      setAnimIndex(1); // laptop
    } else if (
      currentTab === 'research' ||
      currentTab === 'curriculum' ||
      currentTab === 'pipeline' ||
      currentTab === 'brain'
    ) {
      setAnimIndex(2); // book (studying, reading literature, notes & graph)
    } else {
      setAnimIndex(0); // idle (dashboard)
    }
  }, [currentTab, isTyping, isCelebratingUntil]);

  // 2. Work Delivery Celebration Listener (anim-party ONLY triggers upon delivering a work!)
  useEffect(() => {
    const handleWorkDelivered = (e: Event) => {
      const customEvent = e as CustomEvent<{ title?: string }>;
      const workTitle = customEvent.detail?.title || 'tu trabajo académico';
      setAnimIndex(3); // party celebration mode!
      setIsPusheenPopping(true);
      setIsCelebratingUntil(Date.now() + 14000); // 14 seconds celebration
      showPusheenBubble(`¡Felicitaciones, ${profile.name}! 🎉 ¡Entregaste "${workTitle.slice(0, 30)}..."! 🎓`, 6000);
      setTimeout(() => setIsPusheenPopping(false), 800);
    };

    window.addEventListener('work-delivered', handleWorkDelivered);
    return () => {
      window.removeEventListener('work-delivered', handleWorkDelivered);
    };
  }, [profile.name, showPusheenBubble]);

  // 3. Live Typing Detector across the entire application (Desktop/Tablet only, evaluated dynamically)
  useEffect(() => {
    let typingTimeout: NodeJS.Timeout;

    const handleUserTyping = (e: Event) => {
      if (typeof window !== 'undefined' && window.innerWidth < 768) return;
      if (Date.now() < isCelebratingUntil) return;
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      if (isInput) {
        setIsTyping(true);
        clearTimeout(typingTimeout);
        typingTimeout = setTimeout(() => {
          setIsTyping(false);
        }, 3500); // return to ambient mode 3.5s after typing ends
      }
    };

    window.addEventListener('input', handleUserTyping, true);
    window.addEventListener('keydown', handleUserTyping, true);

    return () => {
      clearTimeout(typingTimeout);
      window.removeEventListener('input', handleUserTyping, true);
      window.removeEventListener('keydown', handleUserTyping, true);
    };
  }, [isCelebratingUntil]);

  // 4. Inactivity / Idle Sleep Detector (Desktop/Tablet only, evaluated dynamically)
  useEffect(() => {
    let timer: NodeJS.Timeout;
    const resetIdleTimer = () => {
      if (typeof window !== 'undefined' && window.innerWidth < 768) return;
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (Date.now() < isCelebratingUntil) return;
        setAnimIndex(4); // sleep
        showPusheenBubble('¡Zzz... en modo descanso! Tócame para despertar 🐾', 4000);
      }, 150000); // 2.5 minutes
    };

    const events = ['mousemove', 'keydown', 'touchstart', 'scroll'];
    events.forEach((ev) => window.addEventListener(ev, resetIdleTimer));
    resetIdleTimer();

    return () => {
      clearTimeout(timer);
      events.forEach((ev) => window.removeEventListener(ev, resetIdleTimer));
    };
  }, [showPusheenBubble, isCelebratingUntil]);

  const currentAnim = pusheenAnimations[animIndex];

  const handlePusheenInteract = () => {
    setIsPusheenPopping(true);
    const nextIndex = (animIndex + 1) % pusheenAnimations.length;
    setAnimIndex(nextIndex);
    const phrases = pusheenAnimations[nextIndex].phrases;
    const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];
    showPusheenBubble(randomPhrase, 3500);
    setTimeout(() => setIsPusheenPopping(false), 500);
  };

  const handleTabClick = (tabId: NavTab) => {
    setIsTyping(false);
    onTabChange(tabId);
  };

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Keyboard shortcut for Global Search (Ctrl+K or Cmd+K)
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        onOpenSearch();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'j') {
        e.preventDefault();
        onOpenQuickCapture();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onOpenSearch, onOpenQuickCapture]);

  const navItems = [
    { id: 'dashboard' as NavTab, label: 'Inicio', mobileLabel: 'Inicio', icon: LayoutDashboard },
    { id: 'works' as NavTab, label: 'Trabajos & Tesis', mobileLabel: 'Trabajos', icon: GraduationCap },
    { id: 'curriculum' as NavTab, label: profile.institution?.includes('USMP') ? 'Malla USMP' : 'Malla Curricular', mobileLabel: 'Malla', icon: Award },
    { id: 'research' as NavTab, label: 'Fuentes & Papers', mobileLabel: 'Fuentes', icon: BookOpen },
    { id: 'pipeline' as NavTab, label: 'Citas & Referencias', mobileLabel: 'Citas', icon: GitFork },
    { id: 'brain' as NavTab, label: 'Segundo Cerebro', mobileLabel: 'Cerebro', icon: Brain }
  ];

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#2B2D42] flex flex-col md:flex-row pb-20 md:pb-0">
      {/* Desktop / Tablet Modern Sidebar */}
      <aside className="hidden md:flex flex-col w-64 lg:w-72 bg-white/95 backdrop-blur-md border-r border-[#EBE5DF] h-screen sticky top-0 shrink-0 z-30 p-4 lg:p-5 justify-between select-none overflow-y-auto tab-scroll-pc">
        <div className="space-y-4 lg:space-y-5">
          {/* Logo Brand Header (Clean & Uncluttered) */}
          <div className="flex items-center gap-3 px-1.5 py-0.5">
            <div className="w-10 h-10 rounded-2xl bg-[#FDF2F0] border border-[#E8A598]/60 flex items-center justify-center shadow-xs shrink-0 p-1.5">
              <img src="/alfajor.svg" alt="Alfajorcito OS" className="w-full h-full object-contain drop-shadow-xs" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="font-extrabold text-sm lg:text-base tracking-tight text-[#2B2D42] truncate">Alfajorcito OS</h1>
              <p className="text-[10px] text-[#8C3A32] font-bold truncate">
                {profile.institution || 'USMP'} · {profile.currentCycle || '8vo Ciclo'}
              </p>
            </div>
          </div>

          {/* Quick Action Button */}
          <Button
            onClick={onOpenQuickCapture}
            variant="primary"
            size="md"
            className="w-full justify-center shadow-xs font-bold py-2.5 text-xs lg:text-sm"
            icon={<Plus className="w-4 h-4 stroke-[2.5]" />}
          >
            <span>Captura Rápida</span>
            <kbd className="hidden lg:inline-block ml-auto text-[9px] bg-black/15 text-white px-1.5 py-0.5 rounded font-mono">
              Ctrl J
            </kbd>
          </Button>

          {/* Nav Links with Paw Tap Interactivity */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabClick(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 lg:py-3 rounded-2xl text-xs lg:text-sm font-bold transition-all duration-150 cursor-pointer group relative overflow-hidden ${
                    isActive
                      ? 'bg-[#FDF2F0] text-[#8C3A32] border border-[#E8A598]/60 shadow-2xs'
                      : 'text-[#5A6275] hover:text-[#2B2D42] hover:bg-[#F5F1EB]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`transition-transform duration-200 ${isActive ? 'text-[#8C3A32] scale-110' : 'text-[#8D99AE] group-hover:text-[#2B2D42] group-hover:scale-105'}`}>
                      <item.icon className="w-4.5 h-4.5" />
                    </span>
                    <span className="truncate">{item.label}</span>
                  </div>

                  {/* Active Indicator with Cute Pusheen Paw */}
                  {isActive && (
                    <span className="flex items-center justify-center w-5 h-5 animate-omni-paw" title="Sección activa">
                      <img src="/pusheen/pusheen-paw.png" alt="🐾" className="w-4 h-4 object-contain" />
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* ─── PUSHEEN COMPANION IN WHITE SPACE (100% Borderless, Large & Transparent) ─── */}
        <div className="my-auto py-1 flex flex-col items-center justify-center relative select-none">
          {/* Speech Bubble on Click/Interaction (Smooth fade & slide, zero layout shifting) */}
          <div className="h-10 mb-1 flex items-end justify-center w-full relative z-30 pointer-events-none">
            <div
              className={`max-w-[200px] lg:max-w-[230px] w-auto bg-[#2B2D42] text-white text-[11px] font-bold px-3 py-1.5 rounded-2xl shadow-md text-center leading-snug whitespace-normal break-words border border-white/20 relative transition-all duration-300 ease-out ${
                pusheenMessage
                  ? 'opacity-100 translate-y-0 scale-100'
                  : 'opacity-0 translate-y-2 scale-95 pointer-events-none'
              }`}
            >
              {pusheenMessage || ''}
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#2B2D42] rotate-45" />
            </div>
          </div>

          <button
            type="button"
            onClick={handlePusheenInteract}
            className="group relative flex flex-col items-center justify-center p-0 bg-transparent border-none shadow-none cursor-pointer focus:outline-none transition-transform hover:scale-105 active:scale-95"
            title={`Pusheen: ${currentAnim.title} (Clic para interactuar)`}
            aria-label="Tocar a Pusheen"
          >
            <div className={`w-44 h-44 lg:w-52 lg:h-52 flex items-center justify-center relative ${isPusheenPopping ? 'animate-omni-pop' : 'animate-omni-float'}`}>
              <img
                key={currentAnim.id}
                src={currentAnim.webp}
                alt={`Pusheen: ${currentAnim.title}`}
                className="w-full h-full object-contain filter drop-shadow-sm select-none pointer-events-none"
              />
            </div>
          </button>
        </div>

        {/* Sidebar Footer: Profile & Settings Trigger */}
        <div className="pt-3 border-t border-[#EBE5DF] space-y-2">
          <button
            onClick={onOpenSettings}
            className="w-full flex items-center justify-between p-2.5 rounded-2xl bg-[#FAF8F5] hover:bg-[#FDF2F0] border border-[#EBE5DF] hover:border-[#E8A598]/60 transition-all cursor-pointer group shadow-2xs"
            title="Configuración de Perfil e IA"
            aria-label="Configuración de Perfil e IA"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-white border border-[#E8A598]/60 flex items-center justify-center text-xs font-black text-[#8C3A32] shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                {profile.name ? profile.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="text-left min-w-0">
                <span className="text-xs font-extrabold text-[#2B2D42] block truncate group-hover:text-[#8C3A32]">{profile.name}</span>
                <span className="text-[10px] text-[#8D99AE] block truncate">{profile.currentCycle || '8vo Ciclo'}</span>
              </div>
            </div>
            <Settings className="w-4 h-4 text-[#8D99AE] group-hover:text-[#8C3A32] group-hover:rotate-45 transition-all shrink-0" />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-20 bg-[#FAF8F5]/90 backdrop-blur-md border-b border-[#EBE5DF] px-3 sm:px-6 py-2 sm:py-3 flex items-center justify-between gap-2 sm:gap-3">
          {/* Mobile Brand Title (Dynamic from Profile) */}
          <div className="md:hidden flex items-center gap-2 min-w-0 max-w-[140px] xs:max-w-[180px]">
            <div className="w-8 h-8 rounded-xl bg-[#FDF2F0] border border-[#E8A598]/60 flex items-center justify-center shrink-0 p-1">
              <img src="/alfajor.svg" alt="Alfajorcito OS" className="w-full h-full object-contain" />
            </div>
            <div className="min-w-0">
              <span className="font-bold text-xs text-[#2B2D42] block truncate">{profile.name}</span>
              <span className="text-[9px] text-[#8C3A32] font-semibold block truncate">
                {profile.currentCycle}
              </span>
            </div>
          </div>

          {/* Search Bar (Click to open command palette) */}
          <button
            onClick={onOpenSearch}
            className="flex-1 max-w-md flex items-center gap-2 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl bg-white border border-[#EBE5DF] text-xs sm:text-sm text-[#8D99AE] hover:border-[#E8A598] hover:shadow-2xs transition-all cursor-pointer select-none"
            title="Abrir buscador global"
            aria-label="Abrir buscador global"
          >
            <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#8D99AE] shrink-0" />
            <span className="truncate">Buscar<span className="hidden sm:inline"> trabajos, fuentes, notas, conceptos, citas...</span></span>
            <kbd className="hidden sm:inline-block ml-auto text-[10px] bg-[#F5F1EB] text-[#5A6275] px-1.5 py-0.5 rounded font-mono border border-[#EBE5DF]">
              Ctrl K
            </kbd>
          </button>

          {/* Header Right Actions (Single profile pill on mobile or offline alert) */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {!isOnline && (
              <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full font-medium">
                <WifiOff className="w-3 h-3" /> <span className="hidden xs:inline">Offline</span>
              </span>
            )}

            <button
              onClick={onOpenSettings}
              className="md:hidden p-1.5 rounded-xl text-[#5A6275] hover:bg-white hover:border-[#EBE5DF] border border-transparent transition-all cursor-pointer"
              title="Configuración & Perfil"
              aria-label="Configuración y Perfil"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Page View Container */}
        <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto animate-fade-in">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (Fixed bottom with balanced spacing and touch targets) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-[#EBE5DF] px-1 py-1 shadow-lg">
        <div className="flex items-center justify-between gap-0.5 max-w-md mx-auto">
          {navItems.slice(0, 3).map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`flex-1 min-w-0 flex flex-col items-center gap-0.5 py-1 px-0.5 rounded-xl transition-all cursor-pointer ${
                  isActive ? 'text-[#8C3A32] font-bold' : 'text-[#8D99AE]'
                }`}
                title={item.label}
              >
                <Icon className="w-4.5 h-4.5 shrink-0" />
                <span className="text-[9px] truncate max-w-full leading-tight">{item.mobileLabel}</span>
              </button>
            );
          })}

          {/* Central Floating Quick Capture Button */}
          <button
            onClick={onOpenQuickCapture}
            className="relative -top-2.5 mx-0.5 w-10 h-10 rounded-2xl bg-[#E8A598] hover:bg-[#D98880] text-[#2B2D42] shadow-md flex items-center justify-center border-2 border-white active:scale-95 transition-all cursor-pointer shrink-0"
            aria-label="Captura rápida"
            title="Captura Rápida"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
          </button>

          {navItems.slice(3, 6).map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`flex-1 min-w-0 flex flex-col items-center gap-0.5 py-1 px-0.5 rounded-xl transition-all cursor-pointer ${
                  isActive ? 'text-[#8C3A32] font-bold' : 'text-[#8D99AE]'
                }`}
                title={item.label}
              >
                <Icon className="w-4.5 h-4.5 shrink-0" />
                <span className="text-[9px] truncate max-w-full leading-tight">{item.mobileLabel}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
