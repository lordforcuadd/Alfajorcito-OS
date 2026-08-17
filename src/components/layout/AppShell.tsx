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
  UserCheck
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
    name: 'Saory',
    institution: 'Universidad de San Martín de Porres (USMP)',
    faculty: 'Facultad de Ciencias de la Comunicación, Turismo y Psicología',
    major: 'Psicología',
    currentCycle: 'VIII Ciclo (8vo Ciclo)',
    defaultCitationStyle: 'APA_7'
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
    { id: 'dashboard', label: 'Inicio', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'works', label: 'Trabajos & Tesis', icon: <GraduationCap className="w-5 h-5" /> },
    { id: 'curriculum', label: 'Malla USMP', icon: <Award className="w-5 h-5" /> },
    { id: 'research', label: 'Fuentes & Papers', icon: <BookOpen className="w-5 h-5" /> },
    { id: 'brain', label: 'Segundo Cerebro', icon: <Brain className="w-5 h-5" /> },
    { id: 'pipeline', label: 'Citas & Referencias', icon: <GitFork className="w-5 h-5" /> }
  ];

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#2B2D42] flex flex-col md:flex-row pb-20 md:pb-0">
      {/* Desktop / Tablet Sidebar */}
      <aside className="hidden md:flex flex-col w-64 lg:w-72 bg-white border-r border-[#EBE5DF] h-screen sticky top-0 shrink-0 z-30 p-5 justify-between">
        <div className="space-y-6">
          {/* Logo Brand (Dynamic from Profile) */}
          <div className="flex items-center gap-3 px-2">
            <div className="w-11 h-11 rounded-2xl bg-[#FDF2F0] border border-[#E8A598]/60 flex items-center justify-center shadow-xs shrink-0 p-1.5">
              <img src="/alfajor.svg" alt="Alfajorcito OS" className="w-full h-full object-contain drop-shadow-xs" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="font-extrabold text-base tracking-tight text-[#2B2D42] truncate">Alfajorcito OS</h1>
              <p className="text-[11px] text-[#5A6275] font-semibold truncate">
                {profile.faculty || profile.major} • {profile.currentCycle}
              </p>
            </div>
          </div>

          {/* Quick Action Button */}
          <Button
            onClick={onOpenQuickCapture}
            variant="primary"
            size="md"
            className="w-full justify-center shadow-xs"
            icon={<Plus className="w-4 h-4" />}
          >
            Captura Rápida
          </Button>

          {/* Nav Links */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm font-semibold transition-all duration-150 cursor-pointer select-none ${
                    isActive
                      ? 'bg-[#FDF2F0] text-[#8C3A32] border border-[#E8A598]/40 shadow-2xs'
                      : 'text-[#5A6275] hover:text-[#2B2D42] hover:bg-[#F5F1EB]'
                  }`}
                >
                  <span className={isActive ? 'text-[#D98880]' : 'text-[#8D99AE]'}>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Clean Single Profile / Settings Trigger */}
        <div className="pt-4 border-t border-[#EBE5DF]">
          <button
            onClick={onOpenSettings}
            className="w-full flex items-center justify-between p-2.5 rounded-2xl bg-[#F5F1EB]/60 hover:bg-[#F5F1EB] border border-[#EBE5DF] transition-all cursor-pointer group"
            title="Configuración de Perfil e IA"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-white border border-[#EBE5DF] flex items-center justify-center text-xs font-bold text-[#8C3A32] shrink-0">
                {profile.name ? profile.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="text-left min-w-0">
                <span className="text-xs font-bold text-[#2B2D42] block truncate">{profile.name}</span>
                <span className="text-[10px] text-[#8D99AE] block truncate">{profile.currentCycle}</span>
              </div>
            </div>
            <Settings className="w-4 h-4 text-[#8D99AE] group-hover:text-[#2B2D42] transition-colors shrink-0" />
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
          >
            <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#8D99AE] shrink-0" />
            <span className="truncate">Buscar<span className="hidden sm:inline"> tesis, DSM-5-TR, fuentes, notas, APA 7...</span></span>
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
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-[#EBE5DF] px-1.5 py-1.5 flex items-center justify-around pb-safe">
        <button
          onClick={() => onTabChange('dashboard')}
          className={`flex flex-col items-center gap-0.5 p-1.5 rounded-xl transition-all cursor-pointer ${
            currentTab === 'dashboard' ? 'text-[#D98880]' : 'text-[#8D99AE]'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px] font-semibold">Inicio</span>
        </button>

        <button
          onClick={() => onTabChange('works')}
          className={`flex flex-col items-center gap-0.5 p-1.5 rounded-xl transition-all cursor-pointer ${
            currentTab === 'works' ? 'text-[#D98880]' : 'text-[#8D99AE]'
          }`}
        >
          <GraduationCap className="w-5 h-5" />
          <span className="text-[10px] font-semibold">Tesis</span>
        </button>

        <button
          onClick={() => onTabChange('curriculum')}
          className={`flex flex-col items-center gap-0.5 p-1.5 rounded-xl transition-all cursor-pointer ${
            currentTab === 'curriculum' ? 'text-[#D98880]' : 'text-[#8D99AE]'
          }`}
        >
          <Award className="w-5 h-5" />
          <span className="text-[10px] font-semibold">Malla</span>
        </button>

        {/* Central Floating Quick Capture Button */}
        <button
          onClick={onOpenQuickCapture}
          className="relative -top-3 w-11 h-11 rounded-2xl bg-[#E8A598] hover:bg-[#D98880] text-[#2B2D42] shadow-lg flex items-center justify-center border-2 border-white active:scale-95 transition-all cursor-pointer shrink-0"
          aria-label="Captura rápida"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
        </button>

        <button
          onClick={() => onTabChange('research')}
          className={`flex flex-col items-center gap-0.5 p-1.5 rounded-xl transition-all cursor-pointer ${
            currentTab === 'research' ? 'text-[#D98880]' : 'text-[#8D99AE]'
          }`}
        >
          <BookOpen className="w-5 h-5" />
          <span className="text-[10px] font-semibold">Fuentes</span>
        </button>

        <button
          onClick={() => onTabChange('brain')}
          className={`flex flex-col items-center gap-0.5 p-1.5 rounded-xl transition-all cursor-pointer ${
            currentTab === 'brain' ? 'text-[#D98880]' : 'text-[#8D99AE]'
          }`}
        >
          <Brain className="w-5 h-5" />
          <span className="text-[10px] font-semibold">Cerebro</span>
        </button>
      </div>
    </div>
  );
};
