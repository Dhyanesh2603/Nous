import React, { useState, useEffect } from 'react';
import {
  X,
  Activity,
  AlertTriangle,
  Flame,
  ShieldAlert,
} from 'lucide-react';
import type { ArchitectureMetricsResponse } from '../../types';
import { getMetrics } from '../../services/api';

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
  const [activeTab, setActiveTab] = useState<'dead_code' | 'cycles' | 'hotspots' | 'summary'>('dead_code');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      getMetrics()
        .then((res) => setMetrics(res))
        .catch((err) => console.error('Failed to load metrics:', err))
        .finally(() => setIsLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <aside className="fixed left-0 top-14 bottom-0 w-96 md:w-[500px] bg-slate-900/95 backdrop-blur-md border-r border-slate-800 shadow-2xl flex flex-col z-40 animate-in slide-in-from-left duration-200">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 font-mono">Architecture Analytics</h3>
            <p className="text-[11px] text-slate-400 font-mono">Code intelligence & maintenance risks</p>
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
          onClick={() => setActiveTab('dead_code')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
            activeTab === 'dead_code' ? 'bg-slate-800 text-cyan-300 font-semibold border border-slate-700' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
          Dead Code ({metrics?.dead_code_count ?? 0})
        </button>
        <button
          onClick={() => setActiveTab('cycles')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
            activeTab === 'cycles' ? 'bg-slate-800 text-cyan-300 font-semibold border border-slate-700' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
          Cycles ({metrics?.circular_cycles_count ?? 0})
        </button>
        <button
          onClick={() => setActiveTab('hotspots')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
            activeTab === 'hotspots' ? 'bg-slate-800 text-cyan-300 font-semibold border border-slate-700' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Flame className="w-3.5 h-3.5 text-orange-400" />
          Hotspots
        </button>
      </div>

      {/* Content Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-xs">
        {isLoading ? (
          <div className="flex items-center justify-center p-12 text-slate-400">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-400 mr-3"></div>
            Analyzing AST & Graph metrics...
          </div>
        ) : metrics ? (
          <>
            {/* Dead Code Tab */}
            {activeTab === 'dead_code' && (
              <div className="space-y-2.5">
                <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/30 text-amber-300/90 text-[11px]">
                  Unreferenced exported symbols and orphan functions with zero call edges in the call graph.
                </div>

                {metrics.dead_code_symbols.length > 0 ? (
                  metrics.dead_code_symbols.map((sym, idx) => (
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
            {activeTab === 'cycles' && (
              <div className="space-y-2.5">
                <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-500/30 text-rose-300/90 text-[11px]">
                  Circular import chains can cause runtime initialization bugs and tight architectural coupling.
                </div>

                {metrics.circular_dependencies.length > 0 ? (
                  metrics.circular_dependencies.map((cycle, idx) => (
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

            {/* Hotspots Tab */}
            {activeTab === 'hotspots' && (
              <div className="space-y-2.5">
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-400 text-[11px]">
                  High Cyclomatic Complexity combined with high incoming call frequency identifies critical refactoring candidates.
                </div>

                {metrics.hotspots.map((hotspot, idx) => (
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
        ) : null}
      </div>
    </aside>
  );
};
