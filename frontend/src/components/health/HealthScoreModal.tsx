import React, { useState, useEffect } from 'react';
import {
  X,
  Activity,
  Clock,
  ShieldCheck,
  Layers,
  Sparkles,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { fetchHealthScorecard, fetchPerformanceInsights } from '../../services/api';
import type { RepositoryHealthScorecard, PerformanceReport } from '../../types';

interface HealthScoreModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HealthScoreModal: React.FC<HealthScoreModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [scorecard, setScorecard] = useState<RepositoryHealthScorecard | null>(null);
  const [perfReport, setPerfReport] = useState<PerformanceReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'performance' | 'recommendations'>('overview');

  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    Promise.all([fetchHealthScorecard(), fetchPerformanceInsights()])
      .then(([card, perf]) => {
        setScorecard(card);
        setPerfReport(perf);
      })
      .catch((err: unknown) => console.error('Failed to load health scorecard:', err))
      .finally(() => setLoading(false));
  }, [isOpen]);

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
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-100">Repository Health & Technical Debt Scorecard</h2>
                {scorecard && (
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                    Grade {scorecard.overall_grade} ({scorecard.overall_score}/100)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Multi-dimensional quality score, maintainability debt, and performance bottleneck audits.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-950 rounded-lg p-0.5 border border-slate-800 text-xs font-mono">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-3 py-1 rounded-md transition ${
                  activeTab === 'overview'
                    ? 'bg-cyan-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Health Overview
              </button>
              <button
                onClick={() => setActiveTab('performance')}
                className={`px-3 py-1 rounded-md transition ${
                  activeTab === 'performance'
                    ? 'bg-cyan-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Performance ({perfReport?.total_issues || 0})
              </button>
              <button
                onClick={() => setActiveTab('recommendations')}
                className={`px-3 py-1 rounded-md transition ${
                  activeTab === 'recommendations'
                    ? 'bg-cyan-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Action Items ({scorecard?.recommendations.length || 0})
              </button>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
            <p className="text-xs font-mono">Calculating composite health radar and debt metrics...</p>
          </div>
        ) : !scorecard ? (
          <div className="flex-1 flex items-center justify-center text-slate-500 text-xs">
            No repository health data available.
          </div>
        ) : activeTab === 'overview' ? (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Top Score Banner */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-300 font-bold text-lg font-mono">
                  {scorecard.overall_grade}
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block font-mono">Overall Health</span>
                  <span className="text-sm font-bold text-slate-100">{scorecard.overall_score}/100</span>
                </div>
              </div>

              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl flex items-center gap-3">
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block font-mono">Technical Debt</span>
                  <span className="text-sm font-bold text-amber-300 font-mono">
                    ~{scorecard.technical_debt_hours}h ({scorecard.technical_debt_level})
                  </span>
                </div>
              </div>

              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl flex items-center gap-3">
                <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block font-mono">Total Scale</span>
                  <span className="text-sm font-bold text-slate-100 font-mono">
                    {scorecard.total_loc} LOC ({scorecard.total_files} files)
                  </span>
                </div>
              </div>

              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl flex items-center gap-3">
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block font-mono">Architecture Status</span>
                  <span className="text-sm font-bold text-slate-100 font-mono">
                    {scorecard.circular_cycles_count === 0 ? 'No Cycles' : `${scorecard.circular_cycles_count} Cycles`}
                  </span>
                </div>
              </div>
            </div>

            {/* Radar Breakdown Bars */}
            <div className="p-5 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-4 font-mono text-xs">
              <span className="font-semibold text-slate-300 uppercase tracking-wider block text-[11px]">
                5-Pillar Code Quality Radar
              </span>

              <div className="space-y-3">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-300">Architecture & Decoupling</span>
                    <span className="text-cyan-400 font-bold">{scorecard.radar.architecture_score}%</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-cyan-500 h-full transition-all duration-500"
                      style={{ width: `${scorecard.radar.architecture_score}%` }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-300">Maintainability & Simplicity</span>
                    <span className="text-emerald-400 font-bold">{scorecard.radar.maintainability_score}%</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full transition-all duration-500"
                      style={{ width: `${scorecard.radar.maintainability_score}%` }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-300">Security & Secrets Protection</span>
                    <span className="text-rose-400 font-bold">{scorecard.radar.security_score}%</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-rose-500 h-full transition-all duration-500"
                      style={{ width: `${scorecard.radar.security_score}%` }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-300">Performance & Asynchrony</span>
                    <span className="text-amber-400 font-bold">{scorecard.radar.performance_score}%</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-amber-500 h-full transition-all duration-500"
                      style={{ width: `${scorecard.radar.performance_score}%` }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-300">Testability & Modular Abstraction</span>
                    <span className="text-indigo-400 font-bold">{scorecard.radar.testability_score}%</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-indigo-500 h-full transition-all duration-500"
                      style={{ width: `${scorecard.radar.testability_score}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === 'performance' ? (
          <div className="flex-1 overflow-y-auto p-6 space-y-3 font-mono text-xs">
            {!perfReport || perfReport.total_issues === 0 ? (
              <div className="py-16 text-center text-slate-500">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
                No performance bottlenecks detected in loop or async calls.
              </div>
            ) : (
              perfReport.issues.map((issue) => (
                <div
                  key={issue.id}
                  className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2 hover:border-amber-500/40 transition"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                        issue.severity === 'high'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      }`}
                    >
                      {issue.issue_type.replace(/_/g, ' ')}
                    </span>
                    <span className="text-slate-500 text-[11px]">
                      {issue.relative_path}:{issue.line_number}
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-200 text-xs">{issue.title}</h4>
                  <p className="text-slate-400 text-[11px] leading-relaxed font-sans">{issue.explanation}</p>
                  <pre className="p-2.5 bg-slate-950 rounded-lg text-amber-300 text-[11px] overflow-x-auto">
                    <code>{issue.matched_snippet}</code>
                  </pre>
                  <div className="pt-2 border-t border-slate-800/80 text-[11px] text-emerald-300 font-sans flex items-start gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    <span><strong>Optimization:</strong> {issue.optimization_tip}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-3 font-mono text-xs">
            {scorecard.recommendations.length === 0 ? (
              <div className="py-16 text-center text-slate-500">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
                No critical refactoring tasks identified.
              </div>
            ) : (
              scorecard.recommendations.map((rec, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2 hover:border-cyan-500/40 transition"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                        rec.priority === 'critical'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : rec.priority === 'high'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                      }`}
                    >
                      {rec.priority} Priority · {rec.category}
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-200 text-xs">{rec.title}</h4>
                  <p className="text-slate-400 text-[11px] leading-relaxed font-sans">{rec.impact}</p>
                  <div className="pt-2 border-t border-slate-800/80 text-[11px] text-cyan-300 font-sans flex items-start gap-1.5">
                    <ArrowRight className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    <span><strong>Remediation:</strong> {rec.remediation}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
