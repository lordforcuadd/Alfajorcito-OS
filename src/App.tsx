import React, { useState, useEffect } from 'react';
import { ToastProvider, useToast } from './components/common/Toast';
import { AppShell, type NavTab } from './components/layout/AppShell';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { DashboardView } from './modules/dashboard/DashboardView';
import { WorksView } from './modules/works/WorksView';
import { CurriculumView } from './modules/curriculum/CurriculumView';
import { ResearchView } from './modules/research/ResearchView';
import { PipelineView } from './modules/citations/PipelineView';
import { BrainView } from './modules/notes/BrainView';
import { QuickCaptureModal, type CaptureTab } from './components/modals/QuickCaptureModal';
import { CommandPalette } from './components/modals/CommandPalette';
import { SettingsModal } from './components/modals/SettingsModal';
import { initializeDatabaseSeed } from './db';

interface QuickCaptureConfig {
  isOpen: boolean;
  initialTab?: CaptureTab;
  initialCourseId?: string;
  initialWorkId?: string;
}

function MainApp() {
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [quickCaptureConfig, setQuickCaptureConfig] = useState<QuickCaptureConfig>({
    isOpen: false,
    initialTab: 'note'
  });
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

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
  const handleNavigateFromSearch = (type: string, id: string) => {
    if (type === 'works') {
      setSelectedWorkId(id);
      setCurrentTab('works');
    } else if (type === 'sources') {
      setSelectedSourceId(id);
      setCurrentTab('research');
    } else if (type === 'notes') {
      setSelectedNoteId(id);
      setCurrentTab('brain');
    } else if (type === 'inquiries') {
      setCurrentTab('works');
    } else if (type === 'concepts') {
      setCurrentTab('brain');
    } else {
      setCurrentTab('dashboard');
    }
  };

  return (
    <AppShell
      currentTab={currentTab}
      onTabChange={(tab) => {
        setCurrentTab(tab);
        if (tab === 'works') setSelectedWorkId(null);
      }}
      onOpenQuickCapture={() => handleOpenQuickCapture('note')}
      onOpenSearch={() => setIsSearchOpen(true)}
      onOpenSettings={() => setIsSettingsOpen(true)}
    >
      <ErrorBoundary fallbackTitle="Error al cargar la sección">
        {/* 1. Dashboard Tab */}
        {currentTab === 'dashboard' && (
          <DashboardView
            onOpenWork={(workId) => {
              setSelectedWorkId(workId);
              setCurrentTab('works');
            }}
            onOpenSource={(sourceId) => {
              setSelectedSourceId(sourceId);
              setCurrentTab('research');
            }}
            onOpenNote={(noteId) => {
              setSelectedNoteId(noteId);
              setCurrentTab('brain');
            }}
            onQuickCapture={() => handleOpenQuickCapture('note')}
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
              setCurrentTab('works');
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
              setCurrentTab('works');
            }}
          />
        )}
      </ErrorBoundary>

      {/* Global Modals (Rendered into document.body via createPortal for 100% full-screen backdrop coverage) */}
      <QuickCaptureModal
        isOpen={quickCaptureConfig.isOpen}
        initialTab={quickCaptureConfig.initialTab}
        initialCourseId={quickCaptureConfig.initialCourseId}
        initialWorkId={quickCaptureConfig.initialWorkId}
        onClose={() => setQuickCaptureConfig((prev) => ({ ...prev, isOpen: false }))}
      />

      <CommandPalette
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onNavigate={handleNavigateFromSearch}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
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
