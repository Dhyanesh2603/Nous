import React, { useState, useEffect } from 'react';
import {
  GitCommit,
  X,
  TrendingUp,
  AlertTriangle,
  ShieldCheck,
  Layers,
  Sparkles,
  Copy,
  Check,
  ShieldAlert,
} from 'lucide-react';
import type {
  ArchitectureDriftReport,
  DriftCheckpoint,
  CleanArchitectureReport,
  CleanArchitectureViolation,
} from '../../types';
import {
  fetchArchitectureDrift,
  fetchCleanArchitectureDrift,
  generateDriftFixPrompt,
} from '../../services/api';

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
  const [activeTab, setActiveTab] = useState<'timeline' | 'clean_arch'>('timeline');
  const [cleanArchReport, setCleanArchReport] = useState<CleanArchitectureReport | null>(null);
  const [activeFixPrompt, setActiveFixPrompt] = useState<{ prompt: string; violation: CleanArchitectureViolation } | null>(null);
  const [promptLoading, setPromptLoading] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

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

      fetchCleanArchitectureDrift()
        .then((res) => setCleanArchReport(res))
        .catch((err) => console.error('Failed to load clean architecture:', err));
    }
  }, [isOpen, currentRepoPath]);

  const handleGenerateFix = async (violationId: string) => {
    setPromptLoading(true);
    try {
      const res = await generateDriftFixPrompt(violationId);
      setActiveFixPrompt(res);
    } catch (err) {
      console.error('Failed to generate fix prompt:', err);
    } finally {
      setPromptLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-6xl h-[88vh] flex flex-col shadow-2xl overflow-hidden font-sans">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              {activeTab === 'timeline' ? <TrendingUp className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5 text-emerald-400" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-100">
                  {activeTab === 'timeline' ? 'Architecture Drift Timeline' : 'Clean Architecture 4-Tier Blueprint'}
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                  {activeTab === 'timeline' ? 'Git Modularity & Coupling History' : 'Boundary Enforcement & AI Fixes'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {activeTab === 'timeline'
                  ? 'Visualizes structural changes, dependency growth, coupling trends, and degradation over Git commits.'
                  : 'Validates Domain → Application → Infrastructure → Presentation boundary constraints.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* View Tab Switcher */}
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => setActiveTab('timeline')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
                  activeTab === 'timeline'
                    ? 'bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                Git Drift Timeline
              </button>
              <button
                onClick={() => setActiveTab('clean_arch')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
                  activeTab === 'clean_arch'
                    ? 'bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Clean Architecture Blueprint
                {cleanArchReport && cleanArchReport.total_violations > 0 && (
                  <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-rose-500/30 text-rose-300 border border-rose-500/40">
                    {cleanArchReport.total_violations}
                  </span>
                )}
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
        {activeTab === 'timeline' ? (
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
        ) : (
          /* Clean Architecture 4-Tier Blueprint View */
          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-slate-950/30 font-sans">
            {/* Blueprint Compliance Hero */}
            <div className="p-5 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800 rounded-2xl flex items-center justify-between">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-base font-bold text-white">Clean Architecture 4-Tier Boundary Checker</h3>
                </div>
                <p className="text-xs text-slate-400 max-w-2xl">
                  Enforces strict inward dependency flow: Domain cannot depend on outer layers; Presentation cannot bypass Application directly to Infrastructure.
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <span className="text-[10px] font-mono text-slate-500 uppercase block">Compliance Score</span>
                  <span className={`text-2xl font-black font-mono ${
                    (cleanArchReport?.compliance_score || 0) >= 80 ? 'text-emerald-400' :
                    (cleanArchReport?.compliance_score || 0) >= 60 ? 'text-amber-400' : 'text-rose-400'
                  }`}>
                    {cleanArchReport?.compliance_score || 100}%
                  </span>
                </div>
                <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl text-center font-mono">
                  <span className="text-[10px] text-slate-500 uppercase block">Violations</span>
                  <span className="text-xl font-bold text-rose-400">{cleanArchReport?.total_violations || 0}</span>
                </div>
              </div>
            </div>

            {/* 4-Tier Layer Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              {cleanArchReport?.layers?.map((layer) => (
                <div
                  key={layer.name}
                  className="p-4 bg-slate-900/70 border border-slate-800 rounded-xl space-y-2 relative overflow-hidden"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold" style={{ color: layer.color }}>
                      Tier {layer.tier}: {layer.name}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                      {layer.files.length} files
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{layer.description}</p>
                </div>
              ))}
            </div>

            {/* Boundary Violations & Fix Prompt Generator */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  Detected Boundary Violations ({cleanArchReport?.violations?.length || 0})
                </h4>
              </div>

              {cleanArchReport?.violations?.map((v) => (
                <div
                  key={v.id}
                  className="p-4 bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-xl space-y-3 transition"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded uppercase border ${
                          v.severity === 'critical' ? 'bg-red-500/20 text-red-300 border-red-500/40' :
                          v.severity === 'high' ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' :
                          'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        }`}>
                          {v.severity}
                        </span>
                        <span className="text-xs font-mono text-slate-300 font-semibold">{v.rule}</span>
                      </div>
                      <p className="text-xs text-slate-400">{v.reason}</p>
                    </div>

                    <button
                      onClick={() => handleGenerateFix(v.id)}
                      disabled={promptLoading}
                      className="shrink-0 px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-mono font-medium flex items-center gap-1.5 transition"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      AI Fix Prompt
                    </button>
                  </div>

                  <div className="p-2.5 bg-slate-950/80 rounded-lg border border-slate-800/80 text-xs font-mono text-slate-300 flex items-center gap-2">
                    <span className="text-rose-400 font-bold">{v.source_file} ({v.source_layer})</span>
                    <span className="text-slate-500">→</span>
                    <span className="text-amber-400 font-bold">{v.target_file} ({v.target_layer})</span>
                  </div>

                  <div className="text-xs text-slate-400 flex items-center gap-1.5">
                    <span className="text-emerald-400 font-bold">Suggested Fix:</span>
                    <span>{v.suggested_fix}</span>
                  </div>
                </div>
              ))}

              {(!cleanArchReport?.violations || cleanArchReport.violations.length === 0) && (
                <div className="p-8 bg-slate-900/40 border border-slate-800 rounded-xl text-center space-y-2">
                  <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto opacity-80" />
                  <p className="text-xs font-mono text-slate-300 font-semibold">
                    Zero Clean Architecture Boundary Violations!
                  </p>
                  <p className="text-xs text-slate-500">
                    All components comply with Domain → Application → Infrastructure → Presentation layer dependencies.
                  </p>
                </div>
              )}
            </div>

            {/* Generated AI Fix Prompt Modal / Preview */}
            {activeFixPrompt && (
              <div className="p-4 bg-slate-950 border border-emerald-500/40 rounded-xl space-y-3 shadow-2xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-mono font-bold text-emerald-300">
                      Generated Refactoring Prompt for LLM
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(activeFixPrompt.prompt);
                        setCopiedPrompt(true);
                        setTimeout(() => setCopiedPrompt(false), 2000);
                      }}
                      className="px-2.5 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-mono flex items-center gap-1.5 transition"
                    >
                      {copiedPrompt ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          Copy Prompt
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setActiveFixPrompt(null)}
                      className="p-1 text-slate-400 hover:text-slate-200"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <pre className="p-3 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-slate-300 overflow-x-auto whitespace-pre-wrap max-h-48 custom-scrollbar">
                  {activeFixPrompt.prompt}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
