import React, { useState } from 'react';
import {
  FolderGit2,
  HardDrive,
  Globe,
  Upload,
  Play,
  BookOpen,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import type { SampleItem } from '../../types';
import { ingestSample } from '../../services/api';

interface NoRepoWelcomeProps {
  onOpenIngestModal: (tab?: 'local' | 'git' | 'upload') => void;
  samples: SampleItem[];
  onRefreshGraph: () => void;
  onOpenPlatformDocs?: () => void;
}

export const NoRepoWelcome: React.FC<NoRepoWelcomeProps> = ({
  onOpenIngestModal,
  samples,
  onRefreshGraph,
  onOpenPlatformDocs,
}) => {
  const [loadingSampleId, setLoadingSampleId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleQuickLoadSample = async (sampleId: string) => {
    setLoadingSampleId(sampleId);
    setErrorMsg(null);
    try {
      await ingestSample(sampleId);
      onRefreshGraph();
    } catch (err: any) {
      console.error('Failed to load sample:', err);
      setErrorMsg(err?.response?.data?.detail || 'Failed to load sample project.');
    } finally {
      setLoadingSampleId(null);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto w-full">
      <div className="min-h-full py-10 sm:py-14 px-6 md:px-12 flex flex-col items-center justify-start max-w-6xl mx-auto font-sans animate-in fade-in duration-300">
        {/* Hero Welcome Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto mb-10 pt-2">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Interactive Architecture & Codebase Intelligence</span>
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white font-sans">
          Select a Repository to Begin
        </h1>

        <p className="text-slate-400 text-sm sm:text-base leading-relaxed font-sans max-w-2xl mx-auto">
          Nous analyzes syntax trees, dependency hierarchies, database schemas, and architectural boundaries.
          Choose a codebase below to start exploring.
        </p>

        {errorMsg && (
          <div className="p-3 bg-rose-950/30 border border-rose-500/40 rounded-xl text-rose-300 text-xs font-mono text-center">
            {errorMsg}
          </div>
        )}
      </div>

      {/* Main 3 Ingestion Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mb-12">
        {/* Option 1: Local Directory / File */}
        <div
          onClick={() => onOpenIngestModal('local')}
          className="p-6 rounded-2xl bg-slate-900/70 hover:bg-slate-900 border border-slate-800 hover:border-cyan-500/50 transition cursor-pointer group flex flex-col justify-between space-y-5 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl group-hover:bg-cyan-500/10 transition"></div>
          
          <div className="space-y-3">
            <div className="p-3 w-fit rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 group-hover:scale-105 transition">
              <HardDrive className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg text-slate-100 group-hover:text-cyan-300 transition">
              Local Folder or File
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Scan a local folder on your computer with real-time file watching or parse an isolated script.
            </p>
          </div>

          <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono text-cyan-400 group-hover:text-cyan-300">
            <span>Browse Local Path</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Option 2: Remote Git Repository */}
        <div
          onClick={() => onOpenIngestModal('git')}
          className="p-6 rounded-2xl bg-slate-900/70 hover:bg-slate-900 border border-slate-800 hover:border-indigo-500/50 transition cursor-pointer group flex flex-col justify-between space-y-5 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition"></div>
          
          <div className="space-y-3">
            <div className="p-3 w-fit rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 group-hover:scale-105 transition">
              <Globe className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg text-slate-100 group-hover:text-indigo-300 transition">
              Clone from Git
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Clone any public or private GitHub, GitLab, or Bitbucket repository with full commit history & timeline.
            </p>
          </div>

          <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono text-indigo-400 group-hover:text-indigo-300">
            <span>Clone Git URL</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Option 3: ZIP Project Archive */}
        <div
          onClick={() => onOpenIngestModal('upload')}
          className="p-6 rounded-2xl bg-slate-900/70 hover:bg-slate-900 border border-slate-800 hover:border-purple-500/50 transition cursor-pointer group flex flex-col justify-between space-y-5 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl group-hover:bg-purple-500/10 transition"></div>
          
          <div className="space-y-3">
            <div className="p-3 w-fit rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 group-hover:scale-105 transition">
              <Upload className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg text-slate-100 group-hover:text-purple-300 transition">
              Upload ZIP Archive
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Upload a compressed project archive to automatically unpack, index, and visualize instantly.
            </p>
          </div>

          <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono text-purple-400 group-hover:text-purple-300">
            <span>Upload Archive</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>

      {/* Quick Sample Projects Section */}
      {samples.length > 0 && (
        <div className="w-full bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FolderGit2 className="w-4 h-4 text-cyan-400" />
              <h4 className="text-xs font-bold font-mono text-slate-200 uppercase tracking-wider">
                Or Quick-Load a Sample Repository
              </h4>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">1-Click Instant Demo</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 font-mono text-xs">
            {samples.map((sample) => (
              <button
                key={sample.id}
                disabled={!!loadingSampleId}
                onClick={() => handleQuickLoadSample(sample.id)}
                className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-900 text-left transition flex items-center justify-between group disabled:opacity-50"
              >
                <div className="truncate pr-2">
                  <div className="font-bold text-slate-200 group-hover:text-cyan-300 truncate">
                    {sample.name}
                  </div>
                  <div className="text-[10px] text-slate-500 truncate mt-0.5">
                    {sample.id}
                  </div>
                </div>

                <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 group-hover:bg-cyan-500 group-hover:text-white transition flex-shrink-0">
                  {loadingSampleId === sample.id ? (
                    <div className="w-3.5 h-3.5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Play className="w-3.5 h-3.5 fill-current" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Platform Documentation Quick Banner */}
      {onOpenPlatformDocs && (
        <div
          onClick={onOpenPlatformDocs}
          className="w-full mt-6 p-4 rounded-xl bg-indigo-950/30 hover:bg-indigo-950/50 border border-indigo-500/30 hover:border-indigo-500/50 transition cursor-pointer flex items-center justify-between group text-xs font-mono"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-slate-200 group-hover:text-indigo-300 block font-sans">
                Explore the Platform Documentation & User Manual
              </span>
              <span className="text-[11px] text-slate-400 font-sans">
                Read in-depth guides on ingestion modes, visual canvas controls, AST diagnostics, and all 20 tools.
              </span>
            </div>
          </div>
          <span className="text-indigo-400 group-hover:translate-x-1 transition-transform font-bold">
            Read Manual ➜
          </span>
        </div>
      )}
      </div>
    </div>
  );
};
