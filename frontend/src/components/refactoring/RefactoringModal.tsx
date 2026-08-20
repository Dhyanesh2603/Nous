import React, { useState, useEffect } from 'react';
import {
  Wrench,
  X,
  FileCode,
  CheckCircle2,
} from 'lucide-react';
import type { RefactoringReport, RefactorRecommendation } from '../../types';
import { fetchRefactoringSuggestions } from '../../services/api';

interface RefactoringModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRepoPath?: string;
}

export const RefactoringModal: React.FC<RefactoringModalProps> = ({
  isOpen,
  onClose,
  currentRepoPath,
}) => {
  const [report, setReport] = useState<RefactoringReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedRec, setSelectedRec] = useState<RefactorRecommendation | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetchRefactoringSuggestions()
        .then((res) => {
          setReport(res);
          if (res?.recommendations?.length) {
            setSelectedRec(res.recommendations[0]);
          }
        })
        .catch((err) => console.error('Failed to load refactoring suggestions:', err))
        .finally(() => setLoading(false));
    }
  }, [isOpen, currentRepoPath]);

  if (!isOpen) return null;

  const recs = report?.recommendations || [];
  const filteredRecs = recs.filter((r) => {
    if (selectedCategory === 'all') return true;
    return r.category.toLowerCase().includes(selectedCategory.toLowerCase());
  });

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'critical':
        return <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-red-500/20 text-red-300 border border-red-500/40">Critical Priority</span>;
      case 'high':
        return <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-rose-500/20 text-rose-300 border border-rose-500/40">High Priority</span>;
      case 'medium':
        return <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">Medium</span>;
      default:
        return <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-slate-800 text-slate-400">Low</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-6xl h-[88vh] flex flex-col shadow-2xl overflow-hidden font-sans">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-100">Intelligent Refactoring Advisor</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                  Automated Clean Code Guidance
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Actionable recommendations to extract methods/classes, break cycles, split files, and simplify complex logic.
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

        {/* Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 p-4 bg-slate-950/40 border-b border-slate-800 font-mono text-xs">
          <div className="p-2.5 bg-slate-900/60 border border-slate-800/80 rounded-xl">
            <span className="text-slate-500 text-[10px] uppercase block">Total Opportunities</span>
            <span className="text-base font-bold text-cyan-300">{report?.total_recommendations || 0}</span>
          </div>
          <div className="p-2.5 bg-slate-900/60 border border-slate-800/80 rounded-xl">
            <span className="text-slate-500 text-[10px] uppercase block">Critical Priority</span>
            <span className="text-base font-bold text-red-300">{report?.critical_count || 0}</span>
          </div>
          <div className="p-2.5 bg-slate-900/60 border border-slate-800/80 rounded-xl">
            <span className="text-slate-500 text-[10px] uppercase block">High Priority</span>
            <span className="text-base font-bold text-rose-300">{report?.high_count || 0}</span>
          </div>
          <div className="p-2.5 bg-slate-900/60 border border-slate-800/80 rounded-xl">
            <span className="text-slate-500 text-[10px] uppercase block">Medium Priority</span>
            <span className="text-base font-bold text-amber-300">{report?.medium_count || 0}</span>
          </div>
          <div className="p-2.5 bg-slate-900/60 border border-slate-800/80 rounded-xl">
            <span className="text-slate-500 text-[10px] uppercase block">Total Refactor Effort</span>
            <span className="text-base font-bold text-emerald-300">{report?.total_estimated_effort_hours || 0} hrs</span>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="px-4 py-2 border-b border-slate-800 bg-slate-900/40 flex items-center gap-2 overflow-x-auto text-xs font-mono">
          {[
            { id: 'all', label: 'All Refactorings' },
            { id: 'extract', label: 'Extract Method/Class' },
            { id: 'split', label: 'Split File' },
            { id: 'circular', label: 'Break Cycles' },
            { id: 'complexity', label: 'Reduce Complexity' },
            { id: 'conditionals', label: 'Conditionals' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1 rounded-lg font-medium transition ${
                selectedCategory === cat.id
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Main Body */}
        <div className="flex-1 flex overflow-hidden">
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
              <span className="text-xs font-mono text-slate-400">Auditing code smell patterns & complexity thresholds...</span>
            </div>
          ) : filteredRecs.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 text-slate-500">
              <CheckCircle2 className="w-10 h-10 text-emerald-400/60" />
              <p className="text-sm font-semibold text-slate-300">Clean codebase — no refactorings recommended in this filter</p>
            </div>
          ) : (
            <>
              {/* Left List Pane */}
              <div className="w-88 border-r border-slate-800 overflow-y-auto divide-y divide-slate-800/60 bg-slate-950/20">
                {filteredRecs.map((r) => (
                  <div
                    key={r.id}
                    onClick={() => setSelectedRec(r)}
                    className={`p-3.5 cursor-pointer transition flex flex-col gap-1.5 ${
                      selectedRec?.id === r.id
                        ? 'bg-cyan-500/10 border-l-2 border-cyan-400'
                        : 'hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center justify-between font-mono text-xs">
                      <span className="font-bold text-slate-200 truncate">{r.category}</span>
                      {getPriorityBadge(r.priority)}
                    </div>
                    <p className="text-xs text-slate-300 font-sans font-medium line-clamp-1">{r.title}</p>
                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 mt-0.5">
                      <span className="truncate">{r.relative_path}:{r.line_number}</span>
                      <span className="text-cyan-400 font-bold">{r.estimated_effort_hours}h</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Right Detail Pane */}
              <div className="flex-1 p-6 overflow-y-auto space-y-6 bg-slate-900/30">
                {selectedRec ? (
                  <>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold text-white font-mono">{selectedRec.title}</h3>
                          {getPriorityBadge(selectedRec.priority)}
                        </div>
                        <p className="text-xs font-mono text-slate-400 mt-1 flex items-center gap-2">
                          <FileCode className="w-3.5 h-3.5 text-slate-500" />
                          <span>{selectedRec.relative_path}:{selectedRec.line_number}</span>
                          <span>•</span>
                          <span className="text-cyan-300 font-bold">{selectedRec.estimated_effort_hours} hours effort</span>
                        </p>
                      </div>
                    </div>

                    {/* Description Box */}
                    <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
                      <span className="text-xs font-bold text-slate-300 font-mono">Code Smell & Complexity Rationale</span>
                      <p className="text-xs text-slate-300 leading-relaxed font-sans">{selectedRec.description}</p>
                    </div>

                    {/* Suggested Transformation */}
                    <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
                      <span className="text-xs font-bold text-emerald-400 font-mono flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        Suggested Step-by-Step Refactoring
                      </span>
                      <p className="text-xs text-slate-300 leading-relaxed font-sans">{selectedRec.suggested_transformation}</p>
                    </div>

                    {/* Code Preview */}
                    {selectedRec.code_snippet && (
                      <div className="space-y-2">
                        <span className="text-xs font-bold text-slate-300 font-mono">Target Implementation Context</span>
                        <pre className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-cyan-200 overflow-x-auto leading-relaxed">
                          {selectedRec.code_snippet}
                        </pre>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-500 text-xs font-mono">
                    Select a refactoring suggestion to inspect transformation details
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
