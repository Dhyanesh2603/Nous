import React, { useState, useEffect } from 'react';
import {
  GitPullRequest,
  X,
  UserCheck,
  CheckCircle2,
} from 'lucide-react';
import type { PRImpactReport } from '../../types';
import { fetchPRImpactReport } from '../../services/api';

interface PRImpactModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRepoPath?: string;
}

export const PRImpactModal: React.FC<PRImpactModalProps> = ({
  isOpen,
  onClose,
  currentRepoPath,
}) => {
  const [report, setReport] = useState<PRImpactReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [diffTarget, setDiffTarget] = useState<string>('HEAD~1');

  const loadReport = (target: string) => {
    setLoading(true);
    fetchPRImpactReport(target)
      .then((res) => setReport(res))
      .catch((err) => console.error('Failed to load PR impact:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (isOpen) {
      loadReport(diffTarget);
    }
  }, [isOpen, currentRepoPath]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-6xl h-[88vh] flex flex-col shadow-2xl overflow-hidden font-sans">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <GitPullRequest className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-100">PR Blast Radius & Impact Analyzer</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/30">
                  Pre-Merge Safety Engine
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Simulates pull request changes to calculate blast radius, downstream caller regressions, affected APIs, and reviewers.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-mono">
              <span className="text-slate-500 text-[10px] px-1.5 uppercase">Diff:</span>
              {['HEAD~1', 'HEAD~3', 'origin/main'].map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    setDiffTarget(t);
                    loadReport(t);
                  }}
                  className={`px-2 py-0.5 rounded text-[11px] transition ${
                    diffTarget === t ? 'bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Hero Score Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-5 bg-slate-950/40 border-b border-slate-800 font-sans">
          <div className="p-3.5 bg-slate-900/70 border border-slate-800 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase text-slate-500 block">Blast Radius Score</span>
              <span className="text-2xl font-black text-white font-mono">{report?.estimated_blast_radius_score || 0}%</span>
            </div>
            <span className={`px-2.5 py-1 text-xs font-mono font-bold rounded-xl border ${
              report?.risk_level === 'Critical' ? 'bg-red-500/20 text-red-300 border-red-500/40' :
              report?.risk_level === 'High' ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' :
              report?.risk_level === 'Moderate' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
              'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
            }`}>
              {report?.risk_level || 'Low'} Risk
            </span>
          </div>

          <div className="p-3.5 bg-slate-900/70 border border-slate-800 rounded-xl font-mono">
            <span className="text-[10px] uppercase text-slate-500 block">Files Modified</span>
            <span className="text-xl font-bold text-slate-200 block mt-0.5">{report?.total_files_changed || 0} files</span>
          </div>

          <div className="p-3.5 bg-slate-900/70 border border-slate-800 rounded-xl font-mono">
            <span className="text-[10px] uppercase text-slate-500 block">Diff Delta</span>
            <span className="text-xl font-bold text-emerald-400 block mt-0.5">
              +{report?.total_additions || 0} <span className="text-rose-400 text-sm">-{report?.total_deletions || 0}</span>
            </span>
          </div>

          <div className="p-3.5 bg-slate-900/70 border border-slate-800 rounded-xl font-mono">
            <span className="text-[10px] uppercase text-slate-500 block">Impacted Callers</span>
            <span className="text-xl font-bold text-amber-300 block mt-0.5">{report?.impacted_callers?.length || 0} sites</span>
          </div>

          <div className="p-3.5 bg-slate-900/70 border border-slate-800 rounded-xl font-mono">
            <span className="text-[10px] uppercase text-slate-500 block">Affected API Routes</span>
            <span className="text-xl font-bold text-purple-300 block mt-0.5">{report?.impacted_routes?.length || 0} endpoints</span>
          </div>
        </div>

        {/* Main Body */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6 bg-slate-900/30">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-400"></div>
              <span className="text-xs font-mono text-slate-400">Computing PR blast radius & downstream call graph impact...</span>
            </div>
          ) : (
            <>
              {/* Changed Files & Impacted Callers Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Changed Files */}
                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-3">
                  <span className="text-xs font-bold font-mono text-slate-200 block uppercase">
                    Modified Source Files ({report?.changed_files?.length || 0})
                  </span>
                  <div className="space-y-2 font-mono text-xs">
                    {report?.changed_files?.map((cf, idx) => (
                      <div key={idx} className="p-2.5 bg-slate-900/70 border border-slate-800/80 rounded-lg flex items-center justify-between">
                        <div className="truncate pr-2">
                          <span className="text-slate-200 block truncate">{cf.relative_path}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 text-[11px]">
                          <span className="text-emerald-400 font-bold">+{cf.additions}</span>
                          <span className="text-rose-400 font-bold">-{cf.deletions}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Impacted Callers */}
                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-3">
                  <span className="text-xs font-bold font-mono text-slate-200 block uppercase">
                    Impacted Downstream Callers ({report?.impacted_callers?.length || 0})
                  </span>
                  {report?.impacted_callers && report.impacted_callers.length > 0 ? (
                    <div className="space-y-2 font-mono text-xs">
                      {report.impacted_callers.map((ic, idx) => (
                        <div key={idx} className="p-2.5 bg-slate-900/70 border border-slate-800/80 rounded-lg space-y-0.5">
                          <span className="text-cyan-300 font-bold block">{ic.caller_name}</span>
                          <span className="text-[10px] text-slate-500 block truncate">{ic.relative_path}:{ic.line_number}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-xs font-mono text-slate-500">
                      No external caller call-sites impacted by this diff
                    </div>
                  )}
                </div>
              </div>

              {/* Suggested Reviewers */}
              {report?.suggested_reviewers && report.suggested_reviewers.length > 0 && (
                <div className="space-y-3 pt-2 border-t border-slate-800">
                  <span className="text-xs font-bold font-mono text-slate-200 uppercase block">
                    Suggested Code Reviewers (Git Ownership & Blame)
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {report.suggested_reviewers.map((rev, idx) => (
                      <div key={idx} className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1.5 font-sans">
                        <div className="flex items-center justify-between font-mono text-xs">
                          <div className="flex items-center gap-2">
                            <UserCheck className="w-4 h-4 text-indigo-400" />
                            <span className="font-bold text-slate-200">{rev.name}</span>
                          </div>
                          <span className="text-indigo-300 font-bold">{rev.ownership_percentage}% code ownership</span>
                        </div>
                        <p className="text-xs text-slate-400">{rev.rationale}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Safety Pre-Merge Checklist */}
              {report?.safety_checklist && (
                <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2.5">
                  <span className="text-xs font-bold font-mono text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    Automated Pre-Merge Safety Checklist
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {report.safety_checklist.map((item, idx) => (
                      <div key={idx} className="p-2.5 bg-slate-900/60 border border-slate-800/80 rounded-lg text-xs text-slate-300 flex items-start gap-2">
                        <span className="text-emerald-400 font-bold font-mono">✓</span>
                        <span className="font-sans leading-relaxed">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
