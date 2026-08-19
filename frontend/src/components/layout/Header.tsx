import React, { useState, useEffect } from 'react';
import {
  Brain,
  Search,
  Activity,
  Play,
  FileCode,
  Code2,
  Boxes,
  Workflow,
  ShieldCheck,
  Files,
  Database,
  FolderOpen,
} from 'lucide-react';
import type { ViewMode, SampleItem } from '../../types';
import { fetchSamples, ingestRepository } from '../../services/api';
import { IngestModal } from '../ingest/IngestModal';

interface HeaderProps {
  currentViewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onOpenSearch: () => void;
  onToggleAnalytics: () => void;
  onOpenSequence: () => void;
  onOpenRules: () => void;
  onOpenClones: () => void;
  onOpenFacts: () => void;
  onRefreshGraph: () => void;
  currentRepoPath?: string;
  isIndexing?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentViewMode,
  onViewModeChange,
  onOpenSearch,
  onToggleAnalytics,
  onOpenSequence,
  onOpenRules,
  onOpenClones,
  onOpenFacts,
  onRefreshGraph,
  currentRepoPath,
  isIndexing = false,
}) => {
  const [samples, setSamples] = useState<SampleItem[]>([]);
  const [customPath, setCustomPath] = useState('');
  const [isIngesting, setIsIngesting] = useState(false);
  const [isIngestModalOpen, setIsIngestModalOpen] = useState(false);

  useEffect(() => {
    fetchSamples()
      .then((res) => setSamples(res.samples))
      .catch((err) => console.error('Failed to load sample repos:', err));
  }, []);

  const handleIngestCustomPath = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customPath.trim()) return;

    setIsIngesting(true);
    try {
      await ingestRepository(customPath.trim());
      setCustomPath('');
      onRefreshGraph();
    } catch (err) {
      console.error('Failed to ingest custom repo:', err);
      alert(`Could not ingest repository at '${customPath}'. Please check that the folder path exists.`);
    } finally {
      setIsIngesting(false);
    }
  };

  return (
    <>
      <header className="h-14 bg-slate-950 border-b border-slate-800 px-4 flex items-center justify-between gap-3 select-none z-30 sticky top-0 font-mono text-xs">
        {/* Left: Brand & View Mode Switcher */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-sm text-slate-100 tracking-tight font-sans">NOUS</span>
              <span className="text-[10px] text-cyan-400 block font-mono leading-none">Codebase Intelligence</span>
            </div>
          </div>

          {/* View Mode Switcher */}
          <div className="hidden lg:flex items-center rounded-lg bg-slate-900 border border-slate-800 p-0.5">
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
              onClick={() => onViewModeChange('file')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition ${
                currentViewMode === 'file'
                  ? 'bg-slate-800 text-cyan-300 font-semibold border border-slate-700 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              Files
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
        </div>

        {/* Center: Open / Ingest Repository */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Quick Ingest Modal Trigger Button */}
          <button
            onClick={() => setIsIngestModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 font-semibold transition"
            title="Open folder dialog to scan and analyze your repository"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>Open Repo...</span>
          </button>

          {/* Inline path input form */}
          <form onSubmit={handleIngestCustomPath} className="flex items-center gap-1 hidden xl:flex">
            <input
              type="text"
              value={customPath}
              onChange={(e) => setCustomPath(e.target.value)}
              placeholder="Paste path (e.g. D:\my-repo)..."
              className="w-64 bg-slate-900 border border-slate-800 focus:border-cyan-500 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-500 font-mono outline-none"
            />
            <button
              type="submit"
              disabled={isIngesting || isIndexing || !customPath.trim()}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 font-semibold transition disabled:opacity-40 flex items-center gap-1"
            >
              {isIngesting || isIndexing ? (
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-cyan-400"></div>
              ) : (
                <Play className="w-3 h-3" />
              )}
              <span>Scan</span>
            </button>
          </form>
        </div>

        {/* Right Action Tools Toolbar */}
        <div className="flex items-center gap-1.5 flex-shrink-0 font-mono">
          {/* RipEx Facts Explorer button */}
          <button
            onClick={onOpenFacts}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-indigo-300 hover:border-slate-700 transition"
            title="RipEx Multi-Language Fact Engine & Relations"
          >
            <Database className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden md:inline">Facts</span>
          </button>

          {/* Sequence Tracer button */}
          <button
            onClick={onOpenSequence}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-cyan-300 hover:border-slate-700 transition"
            title="Sequence Diagram & Call Stack Tracer"
          >
            <Workflow className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden md:inline">Sequence</span>
          </button>

          {/* Architecture Rules Linter button */}
          <button
            onClick={onOpenRules}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-emerald-300 hover:border-slate-700 transition"
            title="Architecture Rules & Drift Linter"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden md:inline">Rules</span>
          </button>

          {/* Code Clones button */}
          <button
            onClick={onOpenClones}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-amber-300 hover:border-slate-700 transition"
            title="AST Duplicate Code & Clones Explorer"
          >
            <Files className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">Clones</span>
          </button>

          {/* Search button */}
          <button
            onClick={onOpenSearch}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-slate-100 hover:border-slate-700 transition"
          >
            <Search className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Search</span>
            <kbd className="px-1 py-0.2 rounded bg-slate-950 text-[9px] text-slate-500 border border-slate-800">
              Ctrl+K
            </kbd>
          </button>

          {/* Analytics button */}
          <button
            onClick={onToggleAnalytics}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-cyan-300 hover:border-slate-700 transition"
          >
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Analytics</span>
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
