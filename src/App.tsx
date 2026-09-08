import React, { useState, useEffect, Suspense } from 'react';
import { ToastProvider, useToast } from './components/common/Toast';
import { AppShell, type NavTab } from './components/layout/AppShell';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { DashboardView } from './modules/dashboard/DashboardView';
import { QuickCaptureModal, type CaptureTab } from './components/modals/QuickCaptureModal';
import { initializeDatabaseSeed, db } from './db';
import { lazyWithRetry } from './utils/lazyRetry';

// Code-split dynamic views with auto-retry on deployment updates
const WorksView = lazyWithRetry(() => import('./modules/works/WorksView').then((m) => ({ default: m.WorksView })), 'WorksView');
const CurriculumView = lazyWithRetry(() => import('./modules/curriculum/CurriculumView').then((m) => ({ default: m.CurriculumView })), 'CurriculumView');
const ResearchView = lazyWithRetry(() => import('./modules/research/ResearchView').then((m) => ({ default: m.ResearchView })), 'ResearchView');
const PipelineView = lazyWithRetry(() => import('./modules/citations/PipelineView').then((m) => ({ default: m.PipelineView })), 'PipelineView');
const BrainView = lazyWithRetry(() => import('./modules/notes/BrainView').then((m) => ({ default: m.BrainView })), 'BrainView');
const TextLabView = lazyWithRetry(() => import('./modules/textlab/TextLabView').then((m) => ({ default: m.TextLabView })), 'TextLabView');
const SettingsModal = lazyWithRetry(() => import('./components/modals/SettingsModal').then((m) => ({ default: m.SettingsModal })), 'SettingsModal');
const CommandPalette = lazyWithRetry(() => import('./components/modals/CommandPalette').then((m) => ({ default: m.CommandPalette })), 'CommandPalette');

const ViewLoadingFallback = () => (
  <div className="flex items-center justify-center py-20 text-center animate-fade-in">
    <div className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-white border border-[#EBE5DF] shadow-xs text-xs font-bold text-[#8C3A32]">
      <span className="w-2 h-2 rounded-full bg-[#E8A598] animate-ping" />
      <span>Cargando módulo...</span>
    </div>
  </div>
);

interface QuickCaptureConfig {
  isOpen: boolean;
  initialTab?: CaptureTab;
  initialCourseId?: string;
  initialWorkId?: string;
}

export const VALID_NAV_TABS = new Set<NavTab>(['dashboard', 'works', 'curriculum', 'research', 'pipeline', 'brain', 'textlab']);
export const ACTIVE_TAB_STORAGE_KEY = 'alfajorcito.active_tab';

export function getInitialNavTab(): NavTab {
  try {
    const saved = localStorage.getItem(ACTIVE_TAB_STORAGE_KEY);
    if (saved && VALID_NAV_TABS.has(saved as NavTab)) {
      return saved as NavTab;
    }
  } catch {
    // Fallback for restricted storage environments
  }
  return 'dashboard';
}

function MainApp() {
  const [currentTab, setCurrentTab] = useState<NavTab>(getInitialNavTab);
  const [quickCaptureConfig, setQuickCaptureConfig] = useState<QuickCaptureConfig>({
    isOpen: false,
    initialTab: 'note'
  });
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleTabChange = (tab: NavTab) => {
    setCurrentTab(tab);
    try {
      localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, tab);
    } catch {
      // Fallback if localStorage is full or blocked
    }
  };

  // Selected item states for direct navigation
  const [selectedWorkId, setSelectedWorkId] = useState<string | null>(null);
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);

  // Initialize Seeds on first mount
  useEffect(() => {
    initializeDatabaseSeed().catch((err) => {
      console.error('Error initializing database seeds:', err);
    });
  }, []);

  // Open Quick Capture with accurate tab & preselected course/work
  const handleOpenQuickCapture = (
    tab: CaptureTab = 'note',
    courseId?: string,
    workId?: string
  ) => {
    setQuickCaptureConfig({
      isOpen: true,
      initialTab: tab,
      initialCourseId: courseId,
      initialWorkId: workId
    });
  };

  // Handle Navigation from Global Search
  const handleNavigateFromSearch = async (type: string, id: string) => {
    if (type === 'works') {
      setSelectedWorkId(id);
      handleTabChange('works');
    } else if (type === 'sources') {
      setSelectedSourceId(id);
      handleTabChange('research');
    } else if (type === 'notes') {
      setSelectedNoteId(id);
      handleTabChange('brain');
    } else if (type === 'inquiries' || type === 'tasks') {
      // A failed lookup must not break navigation: fall back to the
      // dashboard-safe state (no selected work) instead of throwing.
      try {
        const linkedWorkId =
          type === 'inquiries'
            ? (await db.inquiries.get(id))?.workId
            : (await db.tasks.get(id))?.workId;
        if (linkedWorkId) setSelectedWorkId(linkedWorkId);
      } catch (err) {
        console.warn('Could not resolve linked work from search result:', err);
      }
      handleTabChange('works');
    } else if (type === 'concepts') {
      handleTabChange('brain');
    } else {
      handleTabChange('dashboard');
    }
  };

  return (
    <AppShell
      currentTab={currentTab}
      onTabChange={(tab) => {
        handleTabChange(tab);
        if (tab === 'works') setSelectedWorkId(null);
      }}
      onOpenQuickCapture={() => handleOpenQuickCapture('note')}
      onOpenSearch={() => setIsSearchOpen(true)}
      onOpenSettings={() => setIsSettingsOpen(true)}
    >
      <ErrorBoundary key={currentTab} fallbackTitle="Error al cargar la sección">
        <Suspense fallback={<ViewLoadingFallback />}>
          {/* 1. Dashboard Tab */}
          {currentTab === 'dashboard' && (
            <DashboardView
              onOpenWork={(workId) => {
                setSelectedWorkId(workId);
                handleTabChange('works');
              }}
              onOpenSource={(sourceId) => {
                setSelectedSourceId(sourceId);
                handleTabChange('research');
              }}
              onOpenNote={(noteId) => {
                setSelectedNoteId(noteId);
                handleTabChange('brain');
              }}
              onNavigateTab={(tab) => handleTabChange(tab)}
              onQuickCapture={(tab) => handleOpenQuickCapture(tab || 'note')}
            />
          )}

          {/* 2. Works & Thesis Tab */}
          {currentTab === 'works' && (
            <WorksView
              selectedWorkId={selectedWorkId}
              onSelectWork={setSelectedWorkId}
              onOpenQuickCapture={(tab = 'work', courseId?: string) => handleOpenQuickCapture(tab, courseId)}
            />
          )}

          {/* 3. USMP Psychology Curriculum Tab */}
          {currentTab === 'curriculum' && (
            <CurriculumView
              onOpenQuickCapture={(tab = 'work', courseId?: string) => handleOpenQuickCapture(tab, courseId)}
              onOpenWork={(workId) => {
                setSelectedWorkId(workId);
                handleTabChange('works');
              }}
            />
          )}

          {/* 4. Research & Sources Tab */}
          {currentTab === 'research' && (
            <ResearchView
              onOpenQuickCapture={() => handleOpenQuickCapture('source')}
              selectedSourceId={selectedSourceId}
              onSelectSource={setSelectedSourceId}
            />
          )}

          {/* 5. Citations & References Tab */}
          {currentTab === 'pipeline' && <PipelineView />}

          {/* 6. Second Brain & Notes Tab */}
          {currentTab === 'brain' && (
            <BrainView
              onOpenQuickCapture={() => handleOpenQuickCapture('note')}
              selectedNoteId={selectedNoteId}
              onSelectNote={setSelectedNoteId}
              onOpenWork={(workId) => {
                setSelectedWorkId(workId);
                handleTabChange('works');
              }}
            />
          )}

          {/* 7. Text Lab Tab */}
          {currentTab === 'textlab' && <TextLabView />}
        </Suspense>
      </ErrorBoundary>

      {/* Global Modals (Rendered into document.body via createPortal for 100% full-screen backdrop coverage) */}
      <QuickCaptureModal
        isOpen={quickCaptureConfig.isOpen}
        initialTab={quickCaptureConfig.initialTab}
        initialCourseId={quickCaptureConfig.initialCourseId}
        initialWorkId={quickCaptureConfig.initialWorkId}
        onClose={() => setQuickCaptureConfig((prev) => ({ ...prev, isOpen: false }))}
      />

      <ErrorBoundary
        variant="modal"
        fallbackTitle="Error al abrir la herramienta"
        onClose={() => {
          setIsSearchOpen(false);
          setIsSettingsOpen(false);
        }}
      >
        <Suspense fallback={null}>
          {isSearchOpen && (
            <CommandPalette
              isOpen={isSearchOpen}
              onClose={() => setIsSearchOpen(false)}
              onNavigate={handleNavigateFromSearch}
            />
          )}

          {isSettingsOpen && (
            <SettingsModal
              isOpen={isSettingsOpen}
              onClose={() => setIsSettingsOpen(false)}
            />
          )}
        </Suspense>
      </ErrorBoundary>
    </AppShell>
  );
}

export function App() {
  return (
    <ToastProvider>
      <MainApp />
    </ToastProvider>
  );
}

export default App;
