import React, { useState, useEffect } from 'react';
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
  const [pusheenMood, setPusheenMood] = useState<'classic' | 'party' | 'rainbow'>('classic');
  const [pusheenMessage, setPusheenMessage] = useState<string | null>(null);
  const [isPusheenBouncing, setIsPusheenBouncing] = useState(false);

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

  const pusheenPhrases = [
    `¡Vamos, ${profile.name}! 🐾`,
    '¡Tu tesis va con todo! 🎓',
    '¡Segundo Cerebro activado! ✨',
    '¡APA 7 sin errores! 📖',
    '¡Miau! Modo estudio 🍰',
    '¡Orgullo USMP! 🌟'
  ];

  const handlePusheenInteract = () => {
    setIsPusheenBouncing(true);
    setPusheenMood((prev) => (prev === 'classic' ? 'party' : prev === 'party' ? 'rainbow' : 'classic'));
    const randomPhrase = pusheenPhrases[Math.floor(Math.random() * pusheenPhrases.length)];
    setPusheenMessage(randomPhrase);
    setTimeout(() => setIsPusheenBouncing(false), 600);
    setTimeout(() => setPusheenMessage(null), 3000);
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

  const navItems: { id: NavTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Inicio', icon: <LayoutDashboard className="w-4.5 h-4.5" /> },
    { id: 'works', label: 'Trabajos & Tesis', icon: <GraduationCap className="w-4.5 h-4.5" /> },
    { id: 'curriculum', label: profile.institution?.includes('USMP') ? 'Malla USMP' : 'Malla Curricular', icon: <Award className="w-4.5 h-4.5" /> },
    { id: 'research', label: 'Fuentes & Papers', icon: <BookOpen className="w-4.5 h-4.5" /> },
    { id: 'brain', label: 'Segundo Cerebro', icon: <Brain className="w-4.5 h-4.5" /> },
    { id: 'pipeline', label: 'Citas & Referencias', icon: <GitFork className="w-4.5 h-4.5" /> }
  ];

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#2B2D42] flex flex-col md:flex-row pb-20 md:pb-0">
      {/* Desktop / Tablet Modern Sidebar */}
      <aside className="hidden md:flex flex-col w-64 lg:w-72 bg-white/95 backdrop-blur-md border-r border-[#EBE5DF] h-screen sticky top-0 shrink-0 z-30 p-4 lg:p-5 justify-between select-none">
        <div className="space-y-4 lg:space-y-5">
          {/* Logo Brand Header with Cute Mascot */}
          <div className="flex items-center justify-between p-2 rounded-2xl bg-gradient-to-r from-[#FDF2F0] to-[#FAF8F5] border border-[#E8A598]/40 shadow-2xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-white border border-[#E8A598]/60 flex items-center justify-center shadow-xs shrink-0 p-1">
                <img src="/alfajor.svg" alt="Alfajorcito OS" className="w-full h-full object-contain drop-shadow-xs" />
              </div>
              <div className="min-w-0">
                <h1 className="font-extrabold text-sm lg:text-base tracking-tight text-[#2B2D42] truncate">Alfajorcito OS</h1>
                <p className="text-[10px] text-[#8C3A32] font-bold truncate">
                  {profile.institution || 'USMP'} · {profile.currentCycle || '8vo Ciclo'}
                </p>
              </div>
            </div>

            {/* Pusheen Mini Interactive Mascot */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={handlePusheenInteract}
                className={`w-9 h-9 rounded-xl bg-white border border-[#E8A598]/50 hover:border-[#8C3A32] flex items-center justify-center shadow-2xs transition-all cursor-pointer overflow-hidden p-0.5 group ${
                  isPusheenBouncing ? 'scale-115 rotate-6' : 'hover:scale-105'
                }`}
                title="¡Haz clic en Pusheen para interactuar!"
                aria-label="Interactuar con Pusheen"
              >
                <img
                  src={
                    pusheenMood === 'party'
                      ? '/pusheen/pusheen-party.png'
                      : pusheenMood === 'rainbow'
                      ? '/pusheen/pusheen-rainbow.png'
                      : '/pusheen/pusheen-classic.png'
                  }
                  alt="Pusheen"
                  className="w-full h-full object-contain"
                />
              </button>

              {/* Speech Bubble on Click */}
              {pusheenMessage && (
                <div className="absolute top-11 right-0 z-50 bg-[#2B2D42] text-white text-[10px] font-bold px-2.5 py-1 rounded-xl shadow-lg whitespace-nowrap animate-fade-in border border-white/20">
                  <div className="absolute -top-1 right-3.5 w-2 h-2 bg-[#2B2D42] rotate-45" />
                  {pusheenMessage}
                </div>
              )}
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
                  onClick={() => onTabChange(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 lg:py-3 rounded-2xl text-xs lg:text-sm font-bold transition-all duration-150 cursor-pointer group relative overflow-hidden ${
                    isActive
                      ? 'bg-[#FDF2F0] text-[#8C3A32] border border-[#E8A598]/60 shadow-2xs'
                      : 'text-[#5A6275] hover:text-[#2B2D42] hover:bg-[#F5F1EB]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`transition-transform duration-200 ${isActive ? 'text-[#8C3A32] scale-110' : 'text-[#8D99AE] group-hover:text-[#2B2D42] group-hover:scale-105'}`}>
                      {item.icon}
                    </span>
                    <span className="truncate">{item.label}</span>
                  </div>

                  {/* Active Indicator with Cute Pusheen Paw */}
                  {isActive && (
                    <span className="text-[11px] animate-fade-in text-[#8C3A32]" title="Sección activa">
                      🐾
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
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

      {/* Mobile Bottom Navigation Bar (Fixed bottom for thumb accessibility) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-[#EBE5DF] px-1 py-1 flex items-center justify-between pb-safe shadow-lg">
        <button
          onClick={() => onTabChange('dashboard')}
          className={`flex-1 min-w-0 flex flex-col items-center gap-0.5 p-1 rounded-xl transition-all cursor-pointer ${
            currentTab === 'dashboard' ? 'text-[#8C3A32] font-bold' : 'text-[#8D99AE]'
          }`}
          title="Inicio"
        >
          <LayoutDashboard className="w-4.5 h-4.5" />
          <span className="text-[9px] truncate">Inicio</span>
        </button>

        <button
          onClick={() => onTabChange('works')}
          className={`flex-1 min-w-0 flex flex-col items-center gap-0.5 p-1 rounded-xl transition-all cursor-pointer ${
            currentTab === 'works' ? 'text-[#8C3A32] font-bold' : 'text-[#8D99AE]'
          }`}
          title="Trabajos"
        >
          <GraduationCap className="w-4.5 h-4.5" />
          <span className="text-[9px] truncate">Trabajos</span>
        </button>

        <button
          onClick={() => onTabChange('curriculum')}
          className={`flex-1 min-w-0 flex flex-col items-center gap-0.5 p-1 rounded-xl transition-all cursor-pointer ${
            currentTab === 'curriculum' ? 'text-[#8C3A32] font-bold' : 'text-[#8D99AE]'
          }`}
          title="Malla"
        >
          <Award className="w-4.5 h-4.5" />
          <span className="text-[9px] truncate">Malla</span>
        </button>

        {/* Central Floating Quick Capture Button */}
        <button
          onClick={onOpenQuickCapture}
          className="relative -top-2.5 mx-0.5 w-10 h-10 rounded-2xl bg-[#E8A598] hover:bg-[#D98880] text-[#2B2D42] shadow-md flex items-center justify-center border-2 border-white active:scale-95 transition-all cursor-pointer shrink-0"
          aria-label="Captura rápida"
          title="Captura Rápida"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
        </button>

        <button
          onClick={() => onTabChange('research')}
          className={`flex-1 min-w-0 flex flex-col items-center gap-0.5 p-1 rounded-xl transition-all cursor-pointer ${
            currentTab === 'research' ? 'text-[#8C3A32] font-bold' : 'text-[#8D99AE]'
          }`}
          title="Fuentes"
        >
          <BookOpen className="w-4.5 h-4.5" />
          <span className="text-[9px] truncate">Fuentes</span>
        </button>

        <button
          onClick={() => onTabChange('pipeline')}
          className={`flex-1 min-w-0 flex flex-col items-center gap-0.5 p-1 rounded-xl transition-all cursor-pointer ${
            currentTab === 'pipeline' ? 'text-[#8C3A32] font-bold' : 'text-[#8D99AE]'
          }`}
          title="Citas & Referencias"
        >
          <GitFork className="w-4.5 h-4.5" />
          <span className="text-[9px] truncate">Citas</span>
        </button>

        <button
          onClick={() => onTabChange('brain')}
          className={`flex-1 min-w-0 flex flex-col items-center gap-0.5 p-1 rounded-xl transition-all cursor-pointer ${
            currentTab === 'brain' ? 'text-[#8C3A32] font-bold' : 'text-[#8D99AE]'
          }`}
          title="Cerebro"
        >
          <Brain className="w-4.5 h-4.5" />
          <span className="text-[9px] truncate">Cerebro</span>
        </button>
      </div>
    </div>
  );
};
