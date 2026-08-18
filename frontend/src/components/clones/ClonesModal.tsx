import React, { useState, useEffect } from 'react';
import {
  X,
  Files,
  FileCode,
  Sparkles,
} from 'lucide-react';
import type { CloneReport } from '../../types';
import { getCodeClones } from '../../services/api';

interface ClonesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ClonesModal: React.FC<ClonesModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [report, setReport] = useState<CloneReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedGroupIndex, setSelectedGroupIndex] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      getCodeClones()
        .then((res: CloneReport) => {
          setReport(res);
          setSelectedGroupIndex(0);
        })
        .catch((err: unknown) => console.error('Failed to detect code clones:', err))
        .finally(() => setIsLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const activeGroup = report?.clone_groups[selectedGroupIndex];

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl overflow-hidden font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Files className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-100">AST Subtree Clone & Duplicate Logic</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-500/10 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Type-1 & Type-2
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Detect duplicate code fragments, boilerplate abstractions, and copy-pasted blocks.
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

        {/* Content Body */}
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400"></div>
            <p className="text-xs font-mono">Running AST Subtree Clone Detection...</p>
          </div>
        ) : !report || report.total_clone_groups === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-2 p-8 text-center">
            <Files className="w-12 h-12 text-slate-600" />
            <h3 className="text-sm font-semibold text-slate-200">No Duplicate Clones Detected</h3>
            <p className="text-xs text-slate-500 max-w-sm">
              Your codebase appears dry without significant structural duplicate functions.
            </p>
          </div>
        ) : (
          <div className="flex-1 flex overflow-hidden">
            {/* Left sidebar: Clone Groups list */}
            <div className="w-80 border-r border-slate-800 bg-slate-950/40 flex flex-col">
              <div className="p-3 border-b border-slate-800 text-xs font-mono text-slate-400 flex items-center justify-between">
                <span>Clone Clusters ({report.total_clone_groups})</span>
                <span className="text-amber-400 font-semibold">{report.total_duplicated_lines} Lines</span>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1.5 font-mono text-xs">
                {report.clone_groups.map((group, idx) => (
                  <button
                    key={group.group_id}
                    onClick={() => setSelectedGroupIndex(idx)}
                    className={`w-full text-left p-3 rounded-xl border transition ${
                      selectedGroupIndex === idx
                        ? 'bg-amber-500/10 border-amber-500/40 text-slate-100 shadow-sm'
                        : 'bg-slate-900/60 border-slate-800/80 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-amber-300">{group.clone_type}</span>
                      <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                        {Math.round(group.similarity_score * 100)}% Match
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {group.instances_count} occurrences · {group.duplicated_lines} duplicated lines
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Right panel: Comparison of Clone Instances */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {activeGroup && (
                <>
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div>
                      <h3 className="text-sm font-bold text-slate-100">{activeGroup.clone_type}</h3>
                      <p className="text-xs text-slate-400">
                        {activeGroup.instances_count} identical code fragments found across your files.
                      </p>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-mono bg-amber-500/15 border border-amber-500/30 text-amber-300">
                      {Math.round(activeGroup.similarity_score * 100)}% Similarity
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {activeGroup.instances.map((instance) => (
                      <div
                        key={instance.id}
                        className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden flex flex-col font-mono text-xs"
                      >
                        <div className="px-3 py-2 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                          <div className="flex items-center gap-1.5 truncate">
                            <FileCode className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                            <span className="text-slate-200 font-semibold truncate">{instance.relative_path}</span>
                          </div>
                          <span className="text-slate-500 flex-shrink-0">
                            Lines {instance.start_line}-{instance.end_line}
                          </span>
                        </div>
                        <pre className="p-3 text-[11px] text-slate-300 overflow-x-auto leading-relaxed bg-slate-950 max-h-72">
                          <code>{instance.snippet}</code>
                        </pre>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
