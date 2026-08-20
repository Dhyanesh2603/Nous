import React, { useState, useEffect } from 'react';
import {
  Scale,
  X,
  Clock,
  DollarSign,
  FileCode,
  CheckCircle2,
} from 'lucide-react';
import type { TechnicalDebtReport, DebtHotspot } from '../../types';
import { fetchTechnicalDebt } from '../../services/api';

interface TechDebtModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRepoPath?: string;
}

export const TechDebtModal: React.FC<TechDebtModalProps> = ({
  isOpen,
  onClose,
  currentRepoPath,
}) => {
  const [report, setReport] = useState<TechnicalDebtReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedHotspot, setSelectedHotspot] = useState<DebtHotspot | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetchTechnicalDebt()
        .then((res) => {
          setReport(res);
          if (res?.top_debt_hotspots?.length) {
            setSelectedHotspot(res.top_debt_hotspots[0]);
          }
        })
        .catch((err) => console.error('Failed to load technical debt report:', err))
        .finally(() => setLoading(false));
    }
  }, [isOpen, currentRepoPath]);

  if (!isOpen) return null;

  const getGradeBadge = (grade: string) => {
    switch (grade) {
      case 'A':
        return <span className="px-3 py-1 text-sm font-bold font-mono rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">Grade A</span>;
      case 'B':
        return <span className="px-3 py-1 text-sm font-bold font-mono rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">Grade B</span>;
      case 'C':
        return <span className="px-3 py-1 text-sm font-bold font-mono rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40">Grade C</span>;
      default:
        return <span className="px-3 py-1 text-sm font-bold font-mono rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/40">Grade {grade}</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-6xl h-[88vh] flex flex-col shadow-2xl overflow-hidden font-sans">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-100">Technical Debt Engine</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30">
                  8-Dimension Debt Matrix
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Quantifies architectural debt across complexity, churn, cycles, clones, file sizing, and maintainability.
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

        {/* Hero Debt Scoreboard */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-5 bg-slate-950/40 border-b border-slate-800 font-sans">
          <div className="p-3.5 bg-slate-900/70 border border-slate-800 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase text-slate-500 block">Overall Debt Score</span>
              <span className="text-2xl font-black text-white font-mono">{report?.overall_debt_score || 100}%</span>
            </div>
            {getGradeBadge(report?.debt_grade || 'A')}
          </div>

          <div className="p-3.5 bg-slate-900/70 border border-slate-800 rounded-xl font-mono">
            <span className="text-[10px] uppercase text-slate-500 block flex items-center gap-1">
              <Clock className="w-3 h-3 text-amber-400" /> Remediation Effort
            </span>
            <span className="text-xl font-bold text-amber-300 block mt-0.5">{report?.total_debt_hours || 0} hrs</span>
          </div>

          <div className="p-3.5 bg-slate-900/70 border border-slate-800 rounded-xl font-mono">
            <span className="text-[10px] uppercase text-slate-500 block flex items-center gap-1">
              <DollarSign className="w-3 h-3 text-emerald-400" /> Est. Cost Impact
            </span>
            <span className="text-xl font-bold text-emerald-300 block mt-0.5">
              ${report?.total_debt_cost_estimate_usd?.toLocaleString() || 0}
            </span>
          </div>

          <div className="p-3.5 bg-slate-900/70 border border-slate-800 rounded-xl font-mono">
            <span className="text-[10px] uppercase text-slate-500 block">Maintainability Index</span>
            <span className="text-xl font-bold text-cyan-300 block mt-0.5">{report?.maintainability_index || 100} / 100</span>
          </div>

          <div className="p-3.5 bg-slate-900/70 border border-slate-800 rounded-xl font-mono">
            <span className="text-[10px] uppercase text-slate-500 block">Critical Hotspots</span>
            <span className="text-xl font-bold text-rose-300 block mt-0.5">{report?.top_debt_hotspots?.length || 0} items</span>
          </div>
        </div>

        {/* Main Body */}
        <div className="flex-1 flex overflow-hidden">
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400"></div>
              <span className="text-xs font-mono text-slate-400">Calculating weighted technical debt across dimensions...</span>
            </div>
          ) : (
            <>
              {/* Left Dimensions & Hotspots List */}
              <div className="w-88 border-r border-slate-800 overflow-y-auto p-4 space-y-5 bg-slate-950/20">
                {/* 8-Dimension Score Bars */}
                <div className="space-y-2.5">
                  <span className="text-xs font-bold font-mono text-slate-300 block uppercase">
                    Debt Dimensions ({report?.dimensions?.length || 0})
                  </span>
                  <div className="space-y-2 font-mono text-xs">
                    {report?.dimensions.map((dim, idx) => (
                      <div key={idx} className="p-2.5 bg-slate-950/70 border border-slate-800 rounded-lg space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-300 truncate">{dim.dimension_name}</span>
                          <span className={`font-bold ${dim.score >= 80 ? 'text-emerald-300' : dim.score >= 60 ? 'text-amber-300' : 'text-rose-300'}`}>
                            {dim.score}% ({dim.debt_hours}h)
                          </span>
                        </div>
                        <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${dim.score >= 80 ? 'bg-emerald-400' : dim.score >= 60 ? 'bg-amber-400' : 'bg-rose-400'}`}
                            style={{ width: `${dim.score}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Ranked Hotspots */}
                <div className="space-y-2.5 pt-2 border-t border-slate-800">
                  <span className="text-xs font-bold font-mono text-slate-300 block uppercase">
                    Top Ranked Debt Hotspots
                  </span>
                  <div className="space-y-1.5 font-sans">
                    {report?.top_debt_hotspots.map((hs) => (
                      <div
                        key={hs.id}
                        onClick={() => setSelectedHotspot(hs)}
                        className={`p-2.5 rounded-lg border cursor-pointer transition text-xs space-y-1 ${
                          selectedHotspot?.id === hs.id
                            ? 'bg-amber-500/10 border-amber-500/40 text-amber-200'
                            : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-900 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between font-mono text-[11px]">
                          <span className="font-bold truncate">{hs.title}</span>
                          <span className="text-amber-400 font-bold">{hs.estimated_hours_to_fix}h</span>
                        </div>
                        <p className="text-[10px] font-mono text-slate-500 truncate">{hs.relative_path}:{hs.line_number}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Detail Pane */}
              <div className="flex-1 p-6 overflow-y-auto space-y-6 bg-slate-900/30">
                {selectedHotspot ? (
                  <>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-white font-mono">{selectedHotspot.title}</h3>
                        <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
                          {selectedHotspot.category}
                        </span>
                      </div>
                      <p className="text-xs font-mono text-slate-400 flex items-center gap-2">
                        <FileCode className="w-3.5 h-3.5 text-slate-500" />
                        <span>{selectedHotspot.relative_path}:{selectedHotspot.line_number}</span>
                        <span>•</span>
                        <span className="text-amber-400 font-bold">{selectedHotspot.estimated_hours_to_fix} hours estimated effort</span>
                      </p>
                    </div>

                    {/* Remediation Box */}
                    <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
                      <span className="text-xs font-bold text-emerald-400 font-mono flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        Remediation Rationale
                      </span>
                      <p className="text-xs text-slate-300 leading-relaxed font-sans">{selectedHotspot.remediation_rationale}</p>
                    </div>

                    {/* Recommendations List */}
                    {report?.recommendations && (
                      <div className="space-y-3 pt-2 border-t border-slate-800">
                        <span className="text-xs font-bold text-slate-200 font-mono">
                          Strategic Architecture Recommendations
                        </span>
                        <div className="space-y-2">
                          {report.recommendations.map((rec, idx) => (
                            <div key={idx} className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-slate-300 flex items-start gap-2.5">
                              <span className="text-amber-400 font-bold font-mono">0{idx + 1}.</span>
                              <span className="font-sans leading-relaxed">{rec}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-500 text-xs font-mono">
                    Select a debt hotspot to view remediation strategy
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
