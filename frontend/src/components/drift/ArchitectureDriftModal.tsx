import React, { useState, useEffect } from 'react';
import {
  GitCommit,
  X,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';
import type { ArchitectureDriftReport, DriftCheckpoint } from '../../types';
import { fetchArchitectureDrift } from '../../services/api';

interface ArchitectureDriftModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRepoPath?: string;
}

export const ArchitectureDriftModal: React.FC<ArchitectureDriftModalProps> = ({
  isOpen,
  onClose,
  currentRepoPath,
}) => {
  const [report, setReport] = useState<ArchitectureDriftReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedCheckpoint, setSelectedCheckpoint] = useState<DriftCheckpoint | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetchArchitectureDrift(12)
        .then((res) => {
          setReport(res);
          if (res?.checkpoints?.length) {
            setSelectedCheckpoint(res.checkpoints[res.checkpoints.length - 1]);
          }
        })
        .catch((err) => console.error('Failed to load architecture drift:', err))
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
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-100">Architecture Drift Timeline</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                  Git Modularity & Coupling History
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Visualizes structural changes, dependency growth, coupling trends, and degradation over Git commits.
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
            <span className="text-slate-500 text-[10px] block uppercase">Sampled Checkpoints</span>
            <span className="text-base font-bold text-cyan-300">{report?.total_checkpoints || 0}</span>
          </div>
          <div className="p-2.5 bg-slate-900/60 border border-slate-800/80 rounded-xl">
            <span className="text-slate-500 text-[10px] block uppercase">Initial Coupling</span>
            <span className="text-base font-bold text-slate-200">{report?.initial_coupling || 1.0}</span>
          </div>
          <div className="p-2.5 bg-slate-900/60 border border-slate-800/80 rounded-xl">
            <span className="text-slate-500 text-[10px] block uppercase">Current Coupling</span>
            <span className="text-base font-bold text-amber-300">{report?.current_coupling || 1.0}</span>
          </div>
          <div className="p-2.5 bg-slate-900/60 border border-slate-800/80 rounded-xl">
            <span className="text-slate-500 text-[10px] block uppercase">Coupling Trend</span>
            <span className={`text-base font-bold ${(report?.coupling_growth_rate || 0) > 20 ? 'text-rose-300' : 'text-emerald-300'}`}>
              +{report?.coupling_growth_rate || 0}%
            </span>
          </div>
          <div className="p-2.5 bg-slate-900/60 border border-slate-800/80 rounded-xl">
            <span className="text-slate-500 text-[10px] block uppercase">Dependency Growth</span>
            <span className="text-base font-bold text-purple-300">+{report?.dependency_growth_rate || 0}%</span>
          </div>
        </div>

        {/* Degradation Alerts */}
        {report?.degradation_alerts && report.degradation_alerts.length > 0 && (
          <div className="px-6 py-2.5 bg-slate-950/70 border-b border-slate-800 flex items-center gap-2 text-xs font-mono text-slate-300">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>{report.degradation_alerts[0]}</span>
          </div>
        )}

        {/* Main Body */}
        <div className="flex-1 flex overflow-hidden">
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
              <span className="text-xs font-mono text-slate-400">Sampling Git history & computing coupling evolution...</span>
            </div>
          ) : (
            <>
              {/* Left Timeline List */}
              <div className="w-80 border-r border-slate-800 overflow-y-auto divide-y divide-slate-800/60 bg-slate-950/20">
                {report?.checkpoints?.map((cp) => (
                  <div
                    key={cp.commit_hash}
                    onClick={() => setSelectedCheckpoint(cp)}
                    className={`p-3.5 cursor-pointer transition flex flex-col gap-1.5 ${
                      selectedCheckpoint?.commit_hash === cp.commit_hash
                        ? 'bg-cyan-500/10 border-l-2 border-cyan-400'
                        : 'hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center justify-between font-mono text-xs">
                      <span className="font-bold text-cyan-300 flex items-center gap-1">
                        <GitCommit className="w-3.5 h-3.5" />
                        {cp.short_hash}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                        cp.architectural_status === 'Healthy'
                          ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                          : cp.architectural_status === 'Drifting'
                          ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                          : 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
                      }`}>
                        {cp.architectural_status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-200 line-clamp-1">{cp.message}</p>
                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 mt-1">
                      <span>{cp.date}</span>
                      <span>Coupling: {cp.coupling_index}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Right Detail Pane */}
              <div className="flex-1 p-6 overflow-y-auto space-y-6 bg-slate-900/30">
                {selectedCheckpoint ? (
                  <>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold text-white font-mono">{selectedCheckpoint.short_hash}</h3>
                          <span className={`px-2 py-0.5 text-xs font-mono rounded font-bold ${
                            selectedCheckpoint.architectural_status === 'Healthy'
                              ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                              : 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                          }`}>
                            {selectedCheckpoint.architectural_status}
                          </span>
                        </div>
                        <p className="text-sm text-slate-200 mt-1">{selectedCheckpoint.message}</p>
                        <p className="text-xs font-mono text-slate-500 mt-1 flex items-center gap-2">
                          <span>Author: {selectedCheckpoint.author}</span>
                          <span>•</span>
                          <span>Date: {selectedCheckpoint.date}</span>
                        </p>
                      </div>
                    </div>

                    {/* Snapshot Metrics Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 font-mono text-xs">
                      <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1">
                        <span className="text-slate-500 text-[10px] uppercase">Files Count</span>
                        <span className="text-lg font-bold text-slate-200 block">{selectedCheckpoint.file_count}</span>
                      </div>
                      <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1">
                        <span className="text-slate-500 text-[10px] uppercase">Dependencies</span>
                        <span className="text-lg font-bold text-purple-300 block">{selectedCheckpoint.dependency_count}</span>
                      </div>
                      <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1">
                        <span className="text-slate-500 text-[10px] uppercase">Architectural Modules</span>
                        <span className="text-lg font-bold text-cyan-300 block">{selectedCheckpoint.module_count}</span>
                      </div>
                      <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1">
                        <span className="text-slate-500 text-[10px] uppercase">Coupling Index</span>
                        <span className="text-lg font-bold text-amber-300 block">{selectedCheckpoint.coupling_index}</span>
                      </div>
                      <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1">
                        <span className="text-slate-500 text-[10px] uppercase">Cyclomatic Avg</span>
                        <span className="text-lg font-bold text-slate-300 block">{selectedCheckpoint.cyclomatic_avg}</span>
                      </div>
                      <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1">
                        <span className="text-slate-500 text-[10px] uppercase">Circular Cycles</span>
                        <span className={`text-lg font-bold block ${selectedCheckpoint.circular_cycles > 0 ? 'text-red-400' : 'text-emerald-300'}`}>
                          {selectedCheckpoint.circular_cycles}
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-500 text-xs font-mono">
                    Select a commit checkpoint to view architecture evolution snapshot
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
