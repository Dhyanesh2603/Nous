import React, { useState, useEffect } from 'react';
import {
  Brain,
  Search,
  FileCode,
  Code2,
  Boxes,
  Workflow,
  ShieldCheck,
  Files,
  Database,
  FolderOpen,
  ShieldAlert,
  Sparkles,
  Layers,
  LayoutDashboard,
  Network,
} from 'lucide-react';
import type { ViewMode, SampleItem } from '../../types';
import { fetchSamples } from '../../services/api';
import { IngestModal } from '../ingest/IngestModal';

interface HeaderProps {
  activeScreen: 'dashboard' | 'graph';
  onNavigateScreen: (screen: 'dashboard' | 'graph') => void;
  currentViewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onOpenSearch: () => void;
  onOpenSequence: () => void;
  onOpenRules: () => void;
  onOpenClones: () => void;
  onOpenFacts: () => void;
  onOpenDatabase: () => void;
  onOpenSecurity: () => void;
  onOpenCopilot: () => void;
  onOpenFramework: () => void;
  onRefreshGraph: () => void;
  currentRepoPath?: string;
}

export const Header: React.FC<HeaderProps> = ({
  activeScreen,
  onNavigateScreen,
  currentViewMode,
  onViewModeChange,
  onOpenSearch,
  onOpenSequence,
  onOpenRules,
  onOpenClones,
  onOpenFacts,
  onOpenDatabase,
  onOpenSecurity,
  onOpenCopilot,
  onOpenFramework,
  onRefreshGraph,
  currentRepoPath,
}) => {
  const [samples, setSamples] = useState<SampleItem[]>([]);
  const [isIngestModalOpen, setIsIngestModalOpen] = useState(false);

  useEffect(() => {
    fetchSamples()
      .then((res) => setSamples(res.samples))
      .catch((err) => console.error('Failed to load sample repos:', err));
  }, []);

  return (
    <>
      <header className="h-14 bg-slate-950 border-b border-slate-800 px-4 flex items-center justify-between gap-3 select-none z-30 sticky top-0 font-mono text-xs">
        {/* Left: Brand & Main Navigation Toggle */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div
            onClick={() => onNavigateScreen('dashboard')}
            className="flex items-center gap-2 cursor-pointer group"
          >
            <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 group-hover:scale-105 transition">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-sm text-slate-100 tracking-tight font-sans">NOUS</span>
              <span className="text-[10px] text-cyan-400 block font-mono leading-none">Software Intelligence</span>
            </div>
          </div>

          {/* Screen Switcher: Dashboard vs Architecture Graph */}
          <div className="flex items-center rounded-lg bg-slate-900 border border-slate-800 p-0.5 ml-2">
            <button
              onClick={() => onNavigateScreen('dashboard')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition ${
                activeScreen === 'dashboard'
                  ? 'bg-cyan-600 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Overview</span>
            </button>
            <button
              onClick={() => onNavigateScreen('graph')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition ${
                activeScreen === 'graph'
                  ? 'bg-cyan-600 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              <span>Graph</span>
            </button>
          </div>

          {/* View Mode Switcher (Visible when in Graph view) */}
          {activeScreen === 'graph' && (
            <div className="hidden 2xl:flex items-center rounded-lg bg-slate-900 border border-slate-800 p-0.5">
              <button
                onClick={() => onViewModeChange('file')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition ${
                  currentViewMode === 'file'
                    ? 'bg-slate-800 text-cyan-300 font-semibold border border-slate-700 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileCode className="w-3.5 h-3.5" />
                All Files
              </button>
              <button
                onClick={() => onViewModeChange('frontend')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition ${
                  currentViewMode === 'frontend'
                    ? 'bg-slate-800 text-purple-300 font-semibold border border-slate-700 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Frontend
              </button>
              <button
                onClick={() => onViewModeChange('backend')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition ${
                  currentViewMode === 'backend'
                    ? 'bg-slate-800 text-emerald-300 font-semibold border border-slate-700 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Boxes className="w-3.5 h-3.5" />
                Backend
              </button>
              <button
                onClick={() => onViewModeChange('module')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition ${
                  currentViewMode === 'module'
                    ? 'bg-slate-800 text-cyan-300 font-semibold border border-slate-700 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Boxes className="w-3.5 h-3.5" />
                Modules
              </button>
              <button
                onClick={() => onViewModeChange('symbol')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition ${
                  currentViewMode === 'symbol'
                    ? 'bg-slate-800 text-cyan-300 font-semibold border border-slate-700 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                Call Graph
              </button>
            </div>
          )}
        </div>

        {/* Center: Open / Ingest Repository */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setIsIngestModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/40 text-cyan-300 font-semibold transition"
            title="Open folder, ZIP archive, or Git repository dialog to analyze"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>Open Repo...</span>
          </button>
        </div>

        {/* Right Action Tools Toolbar */}
        <div className="flex items-center gap-1.5 flex-shrink-0 font-mono">
          {/* AI Copilot */}
          <button
            onClick={onOpenCopilot}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-cyan-300 hover:border-slate-700 transition"
            title="AI Repository Copilot & Onboarding"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden lg:inline">Copilot</span>
          </button>

          {/* Security Audit */}
          <button
            onClick={onOpenSecurity}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-rose-300 hover:border-slate-700 transition"
            title="Security & Vulnerability Audit"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden lg:inline">Security</span>
          </button>

          {/* Database ERD */}
          <button
            onClick={onOpenDatabase}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-blue-300 hover:border-slate-700 transition"
            title="Database Schema & ER Diagrams"
          >
            <Database className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden lg:inline">Database</span>
          </button>

          {/* Framework & Layers */}
          <button
            onClick={onOpenFramework}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-purple-300 hover:border-slate-700 transition"
            title="Framework Components & Architecture Layers"
          >
            <Layers className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden lg:inline">Layers</span>
          </button>

          {/* RipEx Facts Explorer */}
          <button
            onClick={onOpenFacts}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-indigo-300 hover:border-slate-700 transition"
            title="RipEx Fact Engine & API Route Catalog"
          >
            <Code2 className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden xl:inline">Facts</span>
          </button>

          {/* Sequence Tracer */}
          <button
            onClick={onOpenSequence}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-cyan-300 hover:border-slate-700 transition"
            title="Sequence Diagram Tracer"
          >
            <Workflow className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden xl:inline">Sequence</span>
          </button>

          {/* Rules Linter */}
          <button
            onClick={onOpenRules}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-emerald-300 hover:border-slate-700 transition"
            title="Architecture Rules Linter"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden xl:inline">Rules</span>
          </button>

          {/* Clones */}
          <button
            onClick={onOpenClones}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-amber-300 hover:border-slate-700 transition"
            title="AST Clones Explorer"
          >
            <Files className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden xl:inline">Clones</span>
          </button>

          {/* Search */}
          <button
            onClick={onOpenSearch}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-slate-100 hover:border-slate-700 transition"
          >
            <Search className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Search</span>
            <kbd className="px-1 py-0.2 rounded bg-slate-950 text-[9px] text-slate-500 border border-slate-800">
              Ctrl+K
            </kbd>
          </button>
        </div>
      </header>

      {/* Codebase Ingestion Modal Dialog */}
      <IngestModal
        isOpen={isIngestModalOpen}
        onClose={() => setIsIngestModalOpen(false)}
        onSuccess={() => {
          onRefreshGraph();
        }}
        samples={samples}
        currentRepoPath={currentRepoPath}
      />
    </>
  );
};
