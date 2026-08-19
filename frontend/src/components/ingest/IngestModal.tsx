import React, { useState } from 'react';
import {
  X,
  FolderGit2,
  Play,
  Sparkles,
  HardDrive,
  CheckCircle2,
} from 'lucide-react';
import { ingestRepository, ingestSample } from '../../services/api';
import type { SampleItem } from '../../types';

interface IngestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  samples: SampleItem[];
  currentRepoPath?: string;
}

export const IngestModal: React.FC<IngestModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  samples,
  currentRepoPath,
}) => {
  const [repoPath, setRepoPath] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleScanCustomPath = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoPath.trim()) return;

    setIsScanning(true);
    setErrorMsg(null);
    try {
      await ingestRepository(repoPath.trim());
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Ingest error:', err);
      setErrorMsg(
        err?.response?.data?.detail ||
          `Could not ingest repository at '${repoPath}'. Please verify the folder path exists on your computer.`
      );
    } finally {
      setIsScanning(false);
    }
  };

  const handleSelectSample = async (sampleId: string) => {
    setIsScanning(true);
    setErrorMsg(null);
    try {
      await ingestSample(sampleId);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Sample ingest error:', err);
      setErrorMsg(`Failed to load sample project.`);
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <FolderGit2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Scan & Ingest Codebase</h2>
              <p className="text-xs text-slate-400">
                Parse your local project folder with native RipEx v0.3.0 & Tree-sitter.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {/* Custom Path Ingest Form */}
          <form onSubmit={handleScanCustomPath} className="space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Local Repository Folder Path
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <HardDrive className="w-4 h-4 absolute left-3 top-3 text-cyan-400 pointer-events-none" />
                <input
                  type="text"
                  autoFocus
                  value={repoPath}
                  onChange={(e) => setRepoPath(e.target.value)}
                  placeholder="e.g. D:\projects\my-app or C:\Users\name\my-repo"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-xs font-mono text-slate-100 placeholder-slate-500 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
                />
              </div>
              <button
                type="submit"
                disabled={isScanning || !repoPath.trim()}
                className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition disabled:opacity-40 flex items-center gap-2 shadow-lg shadow-cyan-900/30 flex-shrink-0"
              >
                {isScanning ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Play className="w-3.5 h-3.5 fill-current" />
                )}
                <span>Scan Codebase</span>
              </button>
            </div>

            {currentRepoPath && (
              <p className="text-[11px] font-mono text-slate-500 truncate">
                Current active repo: <span className="text-slate-400">{currentRepoPath}</span>
              </p>
            )}

            {errorMsg && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-mono">
                {errorMsg}
              </div>
            )}
          </form>

          {/* Sample Projects Section */}
          <div className="pt-4 border-t border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Or Load a Sample Project
              </span>
              <span className="text-[11px] font-mono text-cyan-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Quick Demo
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {samples.map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleSelectSample(s.id)}
                  disabled={isScanning}
                  className="p-3.5 bg-slate-950/60 border border-slate-800 hover:border-cyan-500/50 rounded-xl text-left transition group space-y-1"
                >
                  <div className="font-semibold text-xs text-slate-200 group-hover:text-cyan-300 transition">
                    {s.name}
                  </div>
                  <div className="text-[10px] font-mono text-slate-500 truncate" title={s.path}>
                    {s.path}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-950/40 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500 font-mono">
          <span>Supported: Python, TS, JS, Go, Rust, C, C++, C#</span>
          <div className="flex items-center gap-1.5 text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>RipEx v0.3.0 Engine Ready</span>
          </div>
        </div>
      </div>
    </div>
  );
};
