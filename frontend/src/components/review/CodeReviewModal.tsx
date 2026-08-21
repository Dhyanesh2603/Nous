import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle2,
  Terminal,
} from 'lucide-react';
import { fetchCodeReview } from '../../services/api';
import type { CodeReviewReport } from '../../types';

interface CodeReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRepoPath?: string;
}

export const CodeReviewModal: React.FC<CodeReviewModalProps> = ({
  isOpen,
  onClose,
  currentRepoPath,
}) => {
  const [report, setReport] = useState<CodeReviewReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    fetchCodeReview()
      .then((res: CodeReviewReport) => setReport(res))
      .catch((err: unknown) => console.error('Code review fetch error:', err))
      .finally(() => setLoading(false));
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
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-100">Automated AI Code Reviewer & PR Risk Forecaster</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                  Rating: {report?.maintainability_rating || 'A'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Automated static PR code review: anti-patterns, function complexity, and recommended test suites.
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
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400"></div>
            <p className="text-xs font-mono">Running automated PR code review & test strategy generator...</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Top Stat Strip */}
            <div className="p-6 bg-slate-950/80 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-mono text-xs">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col items-center justify-center text-emerald-300">
                  <span className="text-xl font-bold leading-none">{report?.maintainability_rating || 'A'}</span>
                  <span className="text-[8px] text-slate-500 mt-0.5">GRADE</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Review Status</span>
                  <span className="text-sm font-bold text-slate-100">{report?.review_status || 'Approved'}</span>
                </div>
              </div>

              <div className="flex items-center gap-4 text-[11px]">
                <span className="text-rose-400 font-bold">{report?.critical_findings_count || 0} Critical</span>
                <span className="text-amber-400 font-bold">{report?.warning_findings_count || 0} Warnings</span>
                <span className="text-cyan-400 font-bold">{report?.info_findings_count || 0} Info</span>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 font-mono text-xs">
              {/* Suggested Test Execution Plan */}
              {report?.suggested_test_suites && report.suggested_test_suites.length > 0 && (
                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-cyan-300 font-bold text-xs">
                    <Terminal className="w-4 h-4" />
                    <span>Recommended Test Suites to Run Before Merge</span>
                  </div>
                  <div className="space-y-1 pl-6">
                    {report.suggested_test_suites.map((ts, idx) => (
                      <div key={idx} className="text-slate-300 text-[11px] flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <code>{ts}</code>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Findings List */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                  Code Review Comments ({report?.findings?.length || 0})
                </span>

                {(report?.findings || []).length === 0 ? (
                  <div className="p-6 bg-slate-950/40 border border-slate-800 rounded-2xl text-center text-slate-400">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                    <span>Zero critical code review findings detected. Clean maintainability score!</span>
                  </div>
                ) : (
                  report?.findings?.map((f) => (
                    <div
                      key={f.id}
                      className="p-5 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-2 hover:border-emerald-500/40 transition"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {f.severity === 'critical' ? (
                            <AlertCircle className="w-4 h-4 text-rose-400" />
                          ) : f.severity === 'warning' ? (
                            <AlertTriangle className="w-4 h-4 text-amber-400" />
                          ) : (
                            <Info className="w-4 h-4 text-cyan-400" />
                          )}
                          <span className="font-bold text-sm text-slate-100">{f.rule_name}</span>
                        </div>
                        <span className="text-[10px] uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-semibold">
                          {f.category}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-400">
                        File: <span className="text-cyan-300">{f.relative_path}:{f.line_number}</span>
                      </div>

                      <div className="p-2.5 bg-slate-950 rounded-xl text-slate-300 font-mono text-[11px] border border-slate-800/80">
                        {f.matched_code}
                      </div>

                      <p className="text-xs text-slate-300 font-sans leading-relaxed pt-1">
                        <strong>Review Note:</strong> {f.review_comment}
                      </p>

                      <div className="text-xs text-emerald-400 font-sans">
                        <strong>Suggested Action:</strong> {f.suggested_refactor}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
