import React, { useState, useEffect } from 'react';
import {
  Brain,
  Search,
  Activity,
  Play,
  FileCode,
  Code2,
  Boxes,
} from 'lucide-react';
import type { ViewMode, SampleItem } from '../../types';
import { getSamples, ingestSample, ingestRepository } from '../../services/api';

interface HeaderProps {
  currentViewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onOpenSearch: () => void;
  onToggleAnalytics: () => void;
  onRefreshGraph: () => void;
  currentRepoPath?: string;
  isIndexing?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentViewMode,
  onViewModeChange,
  onOpenSearch,
  onToggleAnalytics,
  onRefreshGraph,
  currentRepoPath,
  isIndexing = false,
}) => {
  const [samples, setSamples] = useState<SampleItem[]>([]);
  const [customPath, setCustomPath] = useState('');
  const [isIngesting, setIsIngesting] = useState(false);

  useEffect(() => {
    getSamples()
      .then((res) => setSamples(res.samples))
      .catch((err) => console.error('Failed to load sample repos:', err));
  }, []);

  const handleSelectSample = async (sampleId: string) => {
    setIsIngesting(true);
    try {
      await ingestSample(sampleId);
      onRefreshGraph();
    } catch (err) {
      console.error('Failed to ingest sample:', err);
    } finally {
      setIsIngesting(false);
    }
  };

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
      alert(`Could not ingest repository at '${customPath}'. Please check path.`);
    } finally {
      setIsIngesting(false);
    }
  };

  return (
    <header className="h-14 bg-slate-950 border-b border-slate-800 px-4 flex items-center justify-between gap-4 select-none z-30 sticky top-0">
      {/* Brand & Logo */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-sm text-slate-100 tracking-tight">NOUS</span>
            <span className="text-[10px] text-cyan-400 block font-mono leading-none">Codebase Intelligence</span>
          </div>
        </div>

        {/* View Mode Switcher */}
        <div className="hidden lg:flex items-center rounded-lg bg-slate-900 border border-slate-800 p-0.5 text-xs font-mono">
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

      {/* Center: Repository Ingest & Demo Selector */}
      <div className="flex items-center gap-2 flex-1 max-w-xl">
        {/* Sample selector dropdown */}
        <select
          onChange={(e) => e.target.value && handleSelectSample(e.target.value)}
          defaultValue=""
          className="bg-slate-900 border border-slate-800 text-slate-300 text-xs rounded-lg px-2.5 py-1.5 outline-none font-mono focus:border-cyan-500/60"
        >
          <option value="" disabled>Load Demo Project...</option>
          {samples.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        {/* Custom repo path form */}
        <form onSubmit={handleIngestCustomPath} className="flex-1 flex items-center gap-1">
          <input
            type="text"
            value={customPath}
            onChange={(e) => setCustomPath(e.target.value)}
            placeholder={currentRepoPath ? `Active: ...${currentRepoPath.slice(-30)}` : "Ingest repository directory path (e.g. D:\\MyProject)..."}
            className="flex-1 bg-slate-900/90 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 font-mono outline-none focus:border-cyan-500/60"
          />
          <button
            type="submit"
            disabled={isIngesting || isIndexing || !customPath.trim()}
            className="px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-mono font-semibold transition disabled:opacity-50 flex items-center gap-1.5 flex-shrink-0"
          >
            {isIngesting || isIndexing ? (
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-cyan-400"></div>
            ) : (
              <Play className="w-3 h-3" />
            )}
            Scan
          </button>
        </form>
      </div>

      {/* Right Action Controls */}
      <div className="flex items-center gap-2 flex-shrink-0 font-mono text-xs">
        {/* Search button */}
        <button
          onClick={onOpenSearch}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-slate-100 hover:border-slate-700 transition"
        >
          <Search className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden sm:inline">Search</span>
          <kbd className="px-1.5 py-0.2 rounded bg-slate-950 text-[10px] text-slate-500 border border-slate-800">
            Ctrl+K
          </kbd>
        </button>

        {/* Analytics button */}
        <button
          onClick={onToggleAnalytics}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-cyan-300 hover:border-slate-700 transition"
        >
          <Activity className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden sm:inline">Analytics</span>
        </button>
      </div>
    </header>
  );
};
