import React, { useState, useEffect } from 'react';
import {
  X,
  Activity,
  AlertTriangle,
  Flame,
  ShieldAlert,
  GitBranch,
  Boxes,
} from 'lucide-react';
import type {
  ArchitectureMetricsResponse,
  GitChurnReport,
  ArchitecturalSummary,
} from '../../types';
import {
  getMetrics,
  getGitChurn,
  getDesignPatterns,
} from '../../services/api';

interface AnalyticsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSymbol: (symbolId: string) => void;
  onHighlightCycle?: (files: string[]) => void;
}

export const AnalyticsDrawer: React.FC<AnalyticsDrawerProps> = ({
  isOpen,
  onClose,
  onSelectSymbol,
  onHighlightCycle,
}) => {
  const [metrics, setMetrics] = useState<ArchitectureMetricsResponse | null>(null);
  const [gitChurn, setGitChurn] = useState<GitChurnReport | null>(null);
  const [patternsSummary, setPatternsSummary] = useState<ArchitecturalSummary | null>(null);
  const [activeTab, setActiveTab] = useState<'git_hotspots' | 'patterns' | 'dead_code' | 'cycles' | 'hotspots'>('git_hotspots');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      Promise.all([
        getMetrics().catch(() => null),
        getGitChurn().catch(() => null),
        getDesignPatterns().catch(() => null),
      ])
        .then(([mRes, gRes, pRes]) => {
          if (mRes) setMetrics(mRes);
          if (gRes) setGitChurn(gRes);
          if (pRes) setPatternsSummary(pRes);
        })
        .finally(() => setIsLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <aside className="fixed left-0 top-14 bottom-0 w-96 md:w-[540px] bg-slate-900/95 backdrop-blur-md border-r border-slate-800 shadow-2xl flex flex-col z-40 animate-in slide-in-from-left duration-200">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 font-mono">Architecture Analytics</h3>
            <p className="text-[11px] text-slate-400 font-mono">Code intelligence, Git churn & design patterns</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="p-2 border-b border-slate-800 bg-slate-950/40 flex items-center gap-1 overflow-x-auto text-xs font-mono">
        <button
          onClick={() => setActiveTab('git_hotspots')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition whitespace-nowrap ${
            activeTab === 'git_hotspots' ? 'bg-slate-800 text-cyan-300 font-semibold border border-slate-700' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <GitBranch className="w-3.5 h-3.5 text-orange-400" />
          Git Hotspots ({gitChurn?.critical_hotspots_count ?? 0})
        </button>

        <button
          onClick={() => setActiveTab('patterns')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition whitespace-nowrap ${
            activeTab === 'patterns' ? 'bg-slate-800 text-cyan-300 font-semibold border border-slate-700' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Boxes className="w-3.5 h-3.5 text-cyan-400" />
          Patterns ({patternsSummary?.patterns_count ?? 0})
        </button>

        <button
          onClick={() => setActiveTab('dead_code')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition whitespace-nowrap ${
            activeTab === 'dead_code' ? 'bg-slate-800 text-cyan-300 font-semibold border border-slate-700' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
          Dead Code ({metrics?.dead_code_count ?? 0})
        </button>

        <button
          onClick={() => setActiveTab('cycles')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition whitespace-nowrap ${
            activeTab === 'cycles' ? 'bg-slate-800 text-cyan-300 font-semibold border border-slate-700' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
          Cycles ({metrics?.circular_cycles_count ?? 0})
        </button>

        <button
          onClick={() => setActiveTab('hotspots')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition whitespace-nowrap ${
            activeTab === 'hotspots' ? 'bg-slate-800 text-cyan-300 font-semibold border border-slate-700' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Flame className="w-3.5 h-3.5 text-orange-400" />
          Complexity
        </button>
      </div>

      {/* Content Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-xs">
        {isLoading ? (
          <div className="flex items-center justify-center p-12 text-slate-400">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-400 mr-3"></div>
            Analyzing architecture analytics & Git metrics...
          </div>
        ) : (
          <>
            {/* Git Churn & Hotspot Matrix Tab */}
            {activeTab === 'git_hotspots' && gitChurn && (
              <div className="space-y-3">
                {/* Quadrants summary grid */}
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="p-2.5 rounded-xl bg-rose-950/30 border border-rose-500/30 text-rose-300">
                    <div className="text-[10px] text-slate-400 font-semibold">Critical Hotspots</div>
                    <div className="text-sm font-bold">{gitChurn.critical_hotspots_count} files</div>
                    <div className="text-[9px] text-slate-500">High CC + High Churn</div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-300">
                    <div className="text-[10px] text-slate-400 font-semibold">Complex Legacy</div>
                    <div className="text-sm font-bold">{gitChurn.complex_legacy_count} files</div>
                    <div className="text-[9px] text-slate-500">High CC + Low Churn</div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-cyan-950/30 border border-cyan-500/30 text-cyan-300">
                    <div className="text-[10px] text-slate-400 font-semibold">Frequent Churn</div>
                    <div className="text-sm font-bold">{gitChurn.frequent_churn_count} files</div>
                    <div className="text-[9px] text-slate-500">Low CC + High Churn</div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-300">
                    <div className="text-[10px] text-slate-400 font-semibold">Stable Low Risk</div>
                    <div className="text-sm font-bold">{gitChurn.stable_count} files</div>
                    <div className="text-[9px] text-slate-500">Low CC + Low Churn</div>
                  </div>
                </div>

                {/* Ranked file list */}
                <div className="space-y-2">
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Risk Ranked Files (Complexity × Churn)
                  </h4>
                  {gitChurn.files.slice(0, 15).map((f, idx) => (
                    <div
                      key={f.file_path + idx}
                      className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition flex items-center justify-between gap-3"
                    >
                      <div className="truncate flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-200 truncate">{f.relative_path}</span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] uppercase border ${
                              f.quadrant === 'critical_hotspot'
                                ? 'bg-rose-950 text-rose-300 border-rose-500/40'
                                : f.quadrant === 'complex_legacy'
                                ? 'bg-amber-950 text-amber-300 border-amber-500/40'
                                : f.quadrant === 'frequent_churn'
                                ? 'bg-cyan-950 text-cyan-300 border-cyan-500/40'
                                : 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
                            }`}
                          >
                            {f.quadrant.replace('_', ' ')}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-1">
                          <span>{f.total_commits} commits</span>
                          <span>•</span>
                          <span>+{f.lines_added} / -{f.lines_deleted} lines</span>
                          {f.top_author && (
                            <>
                              <span>•</span>
                              <span>Author: {f.top_author}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0 font-mono">
                        <div className="text-xs font-bold text-orange-400">Risk: {f.hotspot_score}</div>
                        <div className="text-[10px] text-slate-400">CC: {f.complexity}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Design Patterns & Architectural Insights Tab */}
            {activeTab === 'patterns' && patternsSummary && (
              <div className="space-y-3">
                {/* Primary Style Card */}
                <div className="p-3.5 rounded-xl bg-cyan-950/20 border border-cyan-500/30 text-cyan-300 space-y-1">
                  <div className="text-[10px] uppercase font-semibold text-cyan-400">Detected Architecture</div>
                  <div className="text-xs font-bold text-slate-100">{patternsSummary.primary_architecture_style}</div>
                </div>

                {/* Recommendations */}
                {patternsSummary.recommendations.length > 0 && (
                  <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                    <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Architectural Recommendations
                    </h4>
                    <ul className="space-y-1 text-[11px] text-slate-300 list-disc list-inside leading-relaxed">
                      {(patternsSummary.recommendations || []).map((rec, idx) => (
                        <li key={idx}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Detected Patterns List */}
                <div className="space-y-2">
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Identified Design Patterns ({(patternsSummary.detected_patterns || []).length})
                  </h4>
                  {(patternsSummary.detected_patterns || []).map((pat, idx) => (
                    <div
                      key={pat.id + idx}
                      onClick={() => onSelectSymbol(pat.id.replace('pat::', '').split('::')[0])}
                      className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition cursor-pointer space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-200">{pat.pattern_name}</span>
                        <span className="px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30 text-[9px]">
                          {Math.round(pat.confidence * 100)}% Confidence
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400">
                        {pat.symbol_name} ({pat.symbol_kind}) · {pat.relative_path}:L{pat.line_number}
                      </p>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        {pat.evidence}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Dead Code Tab */}
            {activeTab === 'dead_code' && metrics && (
              <div className="space-y-2.5">
                <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/30 text-amber-300/90 text-[11px]">
                  Unreferenced exported symbols and orphan functions with zero call edges in the call graph.
                </div>

                {(metrics.dead_code_symbols || []).length > 0 ? (
                  (metrics.dead_code_symbols || []).map((sym, idx) => (
                    <div
                      key={sym.id + idx}
                      onClick={() => onSelectSymbol(sym.id)}
                      className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 hover:bg-slate-800/40 transition cursor-pointer space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-200">{sym.name}</span>
                        <span className="px-1.5 py-0.2 rounded bg-slate-900 border border-slate-700 text-[9px] uppercase text-cyan-400">
                          {sym.kind}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 truncate">
                        {sym.relative_path}:L{sym.line_number}
                      </p>
                      <p className="text-[11px] text-amber-400/90">
                        {sym.reason}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-slate-500">
                    No dead code or unreferenced symbols detected!
                  </div>
                )}
              </div>
            )}

            {/* Circular Dependencies Tab */}
            {activeTab === 'cycles' && metrics && (
              <div className="space-y-2.5">
                <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-500/30 text-rose-300/90 text-[11px]">
                  Circular import chains can cause runtime initialization bugs and tight architectural coupling.
                </div>

                {(metrics.circular_dependencies || []).length > 0 ? (
                  (metrics.circular_dependencies || []).map((cycle, idx) => (
                    <div
                      key={cycle.cycle_id + idx}
                      onClick={() => onHighlightCycle && onHighlightCycle(cycle.files)}
                      className="p-3.5 rounded-xl bg-slate-950/60 border border-rose-500/30 hover:border-rose-400 transition cursor-pointer space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-rose-400 text-xs">
                          Cycle #{idx + 1} ({cycle.length} files)
                        </span>
                        <span className="text-[10px] text-slate-500">Click to inspect</span>
                      </div>
                      <div className="p-2 rounded bg-slate-900/90 border border-slate-800 text-[11px] text-slate-300 leading-relaxed font-mono">
                        {cycle.description}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-slate-500">
                    Zero circular dependency cycles found.
                  </div>
                )}
              </div>
            )}

            {/* Complexity Hotspots Tab */}
            {activeTab === 'hotspots' && metrics && (
              <div className="space-y-2.5">
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-400 text-[11px]">
                  High Cyclomatic Complexity combined with high incoming call frequency identifies critical refactoring candidates.
                </div>

                {(metrics.hotspots || []).map((hotspot, idx) => (
                  <div
                    key={hotspot.id + idx}
                    onClick={() => onSelectSymbol(hotspot.id)}
                    className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 hover:bg-slate-800/40 transition cursor-pointer flex items-center justify-between gap-3"
                  >
                    <div className="truncate">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-200 truncate">{hotspot.name}</span>
                        <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-slate-900 border border-slate-700 text-cyan-400">
                          {hotspot.kind}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 truncate mt-0.5">
                        {hotspot.relative_path}:L{hotspot.start_line}
                      </p>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <div className="text-xs font-bold text-orange-400">CC: {hotspot.complexity}</div>
                      <div className="text-[10px] text-slate-400">{hotspot.incoming_calls} callers</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  );
};
