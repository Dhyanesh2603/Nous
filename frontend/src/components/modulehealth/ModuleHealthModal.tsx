import React, { useState, useEffect } from 'react';
import {
  HeartPulse,
  X,
} from 'lucide-react';
import type { ModuleHealthReport, ModuleHealthCard } from '../../types';
import { fetchModuleHealth } from '../../services/api';

interface ModuleHealthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRepoPath?: string;
  onSelectModule?: (moduleId: string) => void;
}

export const ModuleHealthModal: React.FC<ModuleHealthModalProps> = ({
  isOpen,
  onClose,
  currentRepoPath,
}) => {
  const [report, setReport] = useState<ModuleHealthReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedModule, setSelectedModule] = useState<ModuleHealthCard | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetchModuleHealth()
        .then((res) => {
          setReport(res);
          if (res?.modules?.length) {
            setSelectedModule(res.modules[0]);
          }
        })
        .catch((err) => console.error('Failed to load module health:', err))
        .finally(() => setLoading(false));
    }
  }, [isOpen, currentRepoPath]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-6xl h-[88vh] flex flex-col shadow-2xl overflow-hidden font-sans">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <HeartPulse className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-100">Module Health Dashboard</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                  Martin's Coupling & Cohesion
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Measures cohesion, afferent/efferent coupling, instability (I), DAG depth, test coverage, and documentation.
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

        {/* Top Summary Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-950/40 border-b border-slate-800 font-mono text-xs">
          <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl">
            <span className="text-slate-500 text-[10px] uppercase block">Total Modules</span>
            <span className="text-base font-bold text-slate-200">{report?.total_modules || 0}</span>
          </div>
          <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl">
            <span className="text-slate-500 text-[10px] uppercase block">Overall Health</span>
            <span className="text-base font-bold text-emerald-300">{report?.overall_health_score || 100}%</span>
          </div>
          <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl">
            <span className="text-slate-500 text-[10px] uppercase block">Average Cohesion</span>
            <span className="text-base font-bold text-cyan-300">{report?.average_cohesion || 1.0}</span>
          </div>
          <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl">
            <span className="text-slate-500 text-[10px] uppercase block">Average Instability</span>
            <span className="text-base font-bold text-amber-300">{report?.average_instability || 0.0}</span>
          </div>
        </div>

        {/* Main Body */}
        <div className="flex-1 flex overflow-hidden">
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400"></div>
              <span className="text-xs font-mono text-slate-400">Evaluating package cohesion and instability metrics...</span>
            </div>
          ) : (
            <>
              {/* Left Module List */}
              <div className="w-80 border-r border-slate-800 overflow-y-auto divide-y divide-slate-800/60 bg-slate-950/20">
                {report?.modules?.map((m) => (
                  <div
                    key={m.module_id}
                    onClick={() => setSelectedModule(m)}
                    className={`p-3.5 cursor-pointer transition flex flex-col gap-1.5 ${
                      selectedModule?.module_id === m.module_id
                        ? 'bg-emerald-500/10 border-l-2 border-emerald-400'
                        : 'hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center justify-between font-mono text-xs">
                      <span className="font-bold text-slate-200 truncate">{m.name}</span>
                      <span className={`px-2 py-0.5 text-[10px] rounded font-bold ${
                        m.maintainability_rating === 'A'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : m.maintainability_rating === 'B'
                          ? 'bg-cyan-500/20 text-cyan-300'
                          : 'bg-amber-500/20 text-amber-300'
                      }`}>
                        Rating {m.maintainability_rating}
                      </span>
                    </div>
                    <p className="text-[11px] font-mono text-slate-400 truncate">{m.relative_dir}</p>
                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 mt-1">
                      <span>{m.file_count} files • {m.line_count} LOC</span>
                      <span className="font-bold text-emerald-400">{m.health_score}%</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Right Detail Cards Pane */}
              <div className="flex-1 p-6 overflow-y-auto space-y-6 bg-slate-900/30">
                {selectedModule ? (
                  <>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-xl font-bold text-white font-mono">{selectedModule.name}</h3>
                          <span className="px-2.5 py-0.5 text-xs font-mono rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                            Health: {selectedModule.health_score}%
                          </span>
                        </div>
                        <p className="text-xs font-mono text-slate-400 mt-1">
                          Directory: `{selectedModule.relative_dir}` • Risk Level: <span className="text-emerald-300 font-bold">{selectedModule.risk_level}</span>
                        </p>
                      </div>
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
                      <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1">
                        <span className="text-slate-500 text-[10px] uppercase">Cohesion Score</span>
                        <span className="text-lg font-bold text-cyan-300 block">{selectedModule.cohesion_score}</span>
                      </div>
                      <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1">
                        <span className="text-slate-500 text-[10px] uppercase">Instability (I)</span>
                        <span className="text-lg font-bold text-amber-300 block">{selectedModule.instability}</span>
                      </div>
                      <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1">
                        <span className="text-slate-500 text-[10px] uppercase">Afferent (Ca)</span>
                        <span className="text-lg font-bold text-purple-300 block">{selectedModule.afferent_coupling} incoming</span>
                      </div>
                      <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1">
                        <span className="text-slate-500 text-[10px] uppercase">Efferent (Ce)</span>
                        <span className="text-lg font-bold text-rose-300 block">{selectedModule.efferent_coupling} outgoing</span>
                      </div>
                      <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1">
                        <span className="text-slate-500 text-[10px] uppercase">Avg Complexity</span>
                        <span className="text-lg font-bold text-slate-200 block">{selectedModule.average_complexity}</span>
                      </div>
                      <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1">
                        <span className="text-slate-500 text-[10px] uppercase">DAG Depth</span>
                        <span className="text-lg font-bold text-blue-300 block">{selectedModule.dependency_depth} levels</span>
                      </div>
                      <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1">
                        <span className="text-slate-500 text-[10px] uppercase">Test Coverage</span>
                        <span className="text-lg font-bold text-emerald-300 block">{selectedModule.test_coverage_pct}%</span>
                      </div>
                      <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1">
                        <span className="text-slate-500 text-[10px] uppercase">Documentation</span>
                        <span className="text-lg font-bold text-indigo-300 block">{selectedModule.documentation_coverage_pct}%</span>
                      </div>
                    </div>

                    {/* Contained Files List */}
                    <div className="space-y-2.5 pt-2 border-t border-slate-800 font-sans">
                      <span className="text-xs font-bold font-mono text-slate-300 uppercase block">
                        Contained Module Files ({selectedModule.file_paths.length})
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-xs">
                        {selectedModule.file_paths.map((f, idx) => (
                          <div key={idx} className="p-2 bg-slate-950/70 border border-slate-800 rounded-lg text-slate-300 truncate">
                            📄 {f}
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-500 text-xs font-mono">
                    Select a module to view health metrics
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
