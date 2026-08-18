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
        .then((res) => {
          setReport(res);
          setSelectedGroupIndex(0);
        })
        .catch((err) => console.error('Failed to detect code clones:', err))
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
        className="w-full max-w-5xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Files className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 font-mono">
                AST Code Clone & Duplicate Logic Explorer
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                Detect Type-1 (Exact) and Type-2 (Renamed Identifiers) duplicated fragments
              </p>
            </div>
          </div>

          {/* Stats Badges */}
          {report && (
            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="px-3 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
                <strong className="text-cyan-400">{report.total_clone_groups}</strong> clone groups
              </span>
              <span className="px-3 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
                <strong className="text-amber-400">{report.total_duplicated_lines}</strong> duplicate lines
              </span>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition ml-2"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="flex-1 flex overflow-hidden font-mono text-xs">
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center p-16 text-slate-400">
              <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-cyan-400 mr-3"></div>
              Analyzing AST subtrees for code clones...
            </div>
          ) : report && report.clone_groups.length > 0 ? (
            <>
              {/* Groups Sidebar */}
              <div className="w-80 border-r border-slate-800 overflow-y-auto p-3 space-y-2 bg-slate-950/40">
                {report.clone_groups.map((group, idx) => {
                  const isSelected = idx === selectedGroupIndex;
                  return (
                    <div
                      key={group.group_id}
                      onClick={() => setSelectedGroupIndex(idx)}
                      className={`p-3 rounded-xl border transition cursor-pointer space-y-1.5 ${
                        isSelected
                          ? 'bg-slate-800/90 border-cyan-500/60 shadow-md shadow-cyan-950/40'
                          : 'bg-slate-950/60 border-slate-800 hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-200 text-xs capitalize">
                          {group.clone_type}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30 font-bold">
                          {group.similarity_score}% Match
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>{group.instances_count} occurrences</span>
                        <span className="text-amber-400">{group.duplicated_lines} lines dup</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Instances Viewer */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {activeGroup && (
                  <>
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div>
                        <h4 className="text-xs font-bold text-slate-100">
                          {activeGroup.clone_type} Clone Cluster ({activeGroup.similarity_score}% Structural Similarity)
                        </h4>
                        <p className="text-[11px] text-slate-400">
                          Found across {activeGroup.instances_count} locations in the codebase
                        </p>
                      </div>
                    </div>

                    {/* Side-by-side or stacked code cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {activeGroup.instances.map((inst, idx) => (
                        <div
                          key={inst.id + idx}
                          className="rounded-xl bg-slate-950 border border-slate-800 p-3.5 space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-300 truncate">
                              <FileCode className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                              <span className="truncate">{inst.relative_path}</span>
                            </div>
                            <span className="text-[10px] text-slate-500">
                              L{inst.start_line}-{inst.end_line}
                            </span>
                          </div>

                          {inst.symbol_name && (
                            <div className="text-[11px] text-slate-400 font-bold">
                              Symbol: <span className="text-slate-200">{inst.symbol_name}</span>
                            </div>
                          )}

                          <pre className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/80 text-slate-300 overflow-x-auto text-[11px] leading-5 font-mono max-h-56">
                            {inst.snippet}
                          </pre>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 p-16 text-center text-slate-500 space-y-2">
              <Sparkles className="w-8 h-8 text-cyan-500/40 mx-auto" />
              <p>No significant duplicate code blocks or Type-1/Type-2 AST clones detected.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
