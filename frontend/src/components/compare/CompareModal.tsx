import React, { useState, useEffect } from 'react';
import {
  X,
  GitCompare,
  ArrowRight,
  PlusCircle,
  MinusCircle,
  FileCode,
  Sparkles,
} from 'lucide-react';
import { compareRepositoryDiff } from '../../services/api';
import type { ArchitectureDiffReport } from '../../types';

interface CompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRepoPath?: string;
}

export const CompareModal: React.FC<CompareModalProps> = ({
  isOpen,
  onClose,
  currentRepoPath,
}) => {
  const [baseRef, setBaseRef] = useState('HEAD~1');
  const [targetRef, setTargetRef] = useState('HEAD');
  const [report, setReport] = useState<ArchitectureDiffReport | null>(null);
  const [loading, setLoading] = useState(false);

  const runComparison = (base: string, target: string) => {
    setLoading(true);
    compareRepositoryDiff(base, target)
      .then((res: ArchitectureDiffReport) => setReport(res))
      .catch((err: unknown) => console.error('Diff compare error:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (isOpen) {
      runComparison(baseRef, targetRef);
    }
  }, [isOpen, currentRepoPath]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl h-[88vh] flex flex-col shadow-2xl overflow-hidden font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <GitCompare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-100">Architecture Diff & Branch Comparison</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30">
                  Structural Drift
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Compare commit references or branches to detect breaking structural changes, added symbols, and API regressions.
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
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Comparison Control Input Bar */}
          <div className="p-6 bg-slate-950/80 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4 font-mono text-xs">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
                <span className="text-slate-500">Base:</span>
                <input
                  type="text"
                  value={baseRef}
                  onChange={(e) => setBaseRef(e.target.value)}
                  className="bg-transparent outline-none text-slate-200 w-24 font-bold"
                />
              </div>

              <ArrowRight className="w-4 h-4 text-slate-500" />

              <div className="flex items-center gap-1.5 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
                <span className="text-slate-500">Target:</span>
                <input
                  type="text"
                  value={targetRef}
                  onChange={(e) => setTargetRef(e.target.value)}
                  className="bg-transparent outline-none text-slate-200 w-24 font-bold"
                />
              </div>

              <button
                onClick={() => runComparison(baseRef, targetRef)}
                disabled={loading}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold transition disabled:opacity-50"
              >
                Compare Refs
              </button>
            </div>

            {report && (
              <div className="flex items-center gap-4 text-[11px]">
                <span className="text-emerald-400 font-bold">+{report.files_added_count} Added</span>
                <span className="text-rose-400 font-bold">-{report.files_removed_count} Removed</span>
                <span className="text-cyan-400 font-bold">~{report.files_modified_count} Modified</span>
              </div>
            )}
          </div>

          {/* Diff Content */}
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400"></div>
              <p className="text-xs font-mono">Computing topological diff & symbol delta...</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-6 space-y-6 font-mono text-xs">
              {report?.architectural_drift_summary && (
                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl flex items-start gap-3">
                  <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-amber-300">Drift Assessment: </span>
                    <span className="text-slate-300 font-sans">{report.architectural_drift_summary}</span>
                  </div>
                </div>
              )}

              {/* Structural Symbols Delta */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                  Modified & Added Code Entities
                </span>

                <div className="space-y-2">
                  {report?.symbols_diff.map((sym, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        {sym.change_type === 'added' ? (
                          <PlusCircle className="w-4 h-4 text-emerald-400" />
                        ) : sym.change_type === 'removed' ? (
                          <MinusCircle className="w-4 h-4 text-rose-400" />
                        ) : (
                          <FileCode className="w-4 h-4 text-cyan-400" />
                        )}
                        <div>
                          <span className="font-bold text-slate-100">{sym.name}</span>
                          <span className="text-[10px] text-slate-500 block">{sym.file_path}</span>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                          sym.change_type === 'added'
                            ? 'bg-emerald-500/10 text-emerald-300'
                            : sym.change_type === 'removed'
                            ? 'bg-rose-500/10 text-rose-300'
                            : 'bg-cyan-500/10 text-cyan-300'
                        }`}
                      >
                        {sym.change_type}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
