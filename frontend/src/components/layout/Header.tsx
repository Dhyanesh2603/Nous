import React, { useState, useEffect, useRef } from 'react';
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
  ChevronDown,
  Wrench,
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
  onOpenDatabase,
  onOpenSecurity,
  onOpenCopilot,
  onOpenFramework,
  onRefreshGraph,
  currentRepoPath,
}) => {
  const [samples, setSamples] = useState<SampleItem[]>([]);
  const [isIngestModalOpen, setIsIngestModalOpen] = useState(false);
  const [isToolsDropdownOpen, setIsToolsDropdownOpen] = useState(false);
  const toolsMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchSamples()
      .then((res) => setSamples(res.samples))
      .catch((err) => console.error('Failed to load sample repos:', err));
  }, []);

  // Close tools dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (toolsMenuRef.current && !toolsMenuRef.current.contains(event.target as Node)) {
        setIsToolsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <>
      <header className="h-14 bg-slate-950 border-b border-slate-800 px-6 flex items-center justify-between gap-4 select-none z-30 sticky top-0 font-mono text-xs w-full">
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
        <div className="flex items-center gap-2 flex-shrink-0 font-mono">
          {/* AI Copilot */}
          <button
            onClick={onOpenCopilot}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-cyan-300 hover:border-slate-700 transition"
            title="AI Repository Copilot & Onboarding"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Copilot</span>
          </button>

          {/* Security Audit */}
          <button
            onClick={onOpenSecurity}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-rose-300 hover:border-slate-700 transition"
            title="Security & Vulnerability Audit"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            <span>Security</span>
          </button>

          {/* Tools Menu Dropdown */}
          <div className="relative" ref={toolsMenuRef}>
            <button
              onClick={() => setIsToolsDropdownOpen((prev) => !prev)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition ${
                isToolsDropdownOpen
                  ? 'bg-slate-800 border-cyan-500/50 text-cyan-300 shadow-sm'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-slate-100 hover:border-slate-700'
              }`}
              title="More Architecture & Analysis Tools"
            >
              <Wrench className="w-3.5 h-3.5 text-purple-400" />
              <span>Tools</span>
              <ChevronDown
                className={`w-3 h-3 text-slate-400 transition-transform duration-150 ${
                  isToolsDropdownOpen ? 'rotate-180 text-cyan-400' : ''
                }`}
              />
            </button>

            {isToolsDropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-xl shadow-2xl p-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150 font-sans text-xs">
                <div className="px-2.5 py-1.5 text-[10px] font-mono text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-800/80 mb-1">
                  Architecture & Diagnostics
                </div>

                <button
                  onClick={() => {
                    setIsToolsDropdownOpen(false);
                    onOpenDatabase();
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition text-left group"
                >
                  <div className="p-1 rounded-md bg-blue-500/10 text-blue-400 group-hover:scale-105 transition">
                    <Database className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-medium block text-slate-200 group-hover:text-blue-300">Database Schema</span>
                    <span className="text-[10px] text-slate-500 block">ER diagrams & SQL models</span>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setIsToolsDropdownOpen(false);
                    onOpenFramework();
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition text-left group"
                >
                  <div className="p-1 rounded-md bg-purple-500/10 text-purple-400 group-hover:scale-105 transition">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-medium block text-slate-200 group-hover:text-purple-300">Architecture Layers</span>
                    <span className="text-[10px] text-slate-500 block">Frontend & backend components</span>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setIsToolsDropdownOpen(false);
                    onOpenSequence();
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition text-left group"
                >
                  <div className="p-1 rounded-md bg-cyan-500/10 text-cyan-400 group-hover:scale-105 transition">
                    <Workflow className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-medium block text-slate-200 group-hover:text-cyan-300">Sequence Tracer</span>
                    <span className="text-[10px] text-slate-500 block">Visual call sequence flow</span>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setIsToolsDropdownOpen(false);
                    onOpenRules();
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition text-left group"
                >
                  <div className="p-1 rounded-md bg-emerald-500/10 text-emerald-400 group-hover:scale-105 transition">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-medium block text-slate-200 group-hover:text-emerald-300">Architecture Rules</span>
                    <span className="text-[10px] text-slate-500 block">Boundary & dependency rules</span>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setIsToolsDropdownOpen(false);
                    onOpenClones();
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition text-left group"
                >
                  <div className="p-1 rounded-md bg-amber-500/10 text-amber-400 group-hover:scale-105 transition">
                    <Files className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-medium block text-slate-200 group-hover:text-amber-300">AST Clones</span>
                    <span className="text-[10px] text-slate-500 block">Code duplication detector</span>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Search */}
          <button
            onClick={onOpenSearch}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-slate-100 hover:border-slate-700 transition"
          >
            <Search className="w-3.5 h-3.5 text-cyan-400" />
            <span>Search</span>
            <kbd className="px-1.5 py-0.5 rounded bg-slate-950 text-[9px] text-slate-400 border border-slate-800 font-mono">
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
