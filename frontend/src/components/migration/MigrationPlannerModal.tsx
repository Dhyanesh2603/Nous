import React, { useState, useEffect } from 'react';
import {
  Compass,
  X,
  CheckCircle2,
  Copy,
  Check,
  ArrowRight,
} from 'lucide-react';
import type { MigrationPlannerReport, MigrationPlan } from '../../types';
import { fetchMigrationPlans } from '../../services/api';

interface MigrationPlannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRepoPath?: string;
}

export const MigrationPlannerModal: React.FC<MigrationPlannerModalProps> = ({
  isOpen,
  onClose,
  currentRepoPath,
}) => {
  const [report, setReport] = useState<MigrationPlannerReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<MigrationPlan | null>(null);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetchMigrationPlans()
        .then((res) => {
          setReport(res);
          if (res?.plans?.length) {
            setSelectedPlan(res.plans[0]);
          }
        })
        .catch((err) => console.error('Failed to load migration plans:', err))
        .finally(() => setLoading(false));
    }
  }, [isOpen, currentRepoPath]);

  const handleCopy = (cmd: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(cmd);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-6xl h-[88vh] flex flex-col shadow-2xl overflow-hidden font-sans">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-100">AI Refactoring & Migration Planner</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-300 border border-orange-500/30">
                  Modernization Engine
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Automated modernization roadmaps for TypeScript adoption, Async concurrency, and type-safe API contracts.
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

        {/* Main Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Plans List */}
          <div className="w-80 border-r border-slate-800 overflow-y-auto divide-y divide-slate-800/60 bg-slate-950/20">
            <div className="p-3 text-[11px] font-mono uppercase text-slate-500 font-bold bg-slate-950/40">
              Migration Roadmaps ({report?.plans?.length || 0})
            </div>
            {report?.plans?.map((p) => (
              <div
                key={p.id}
                onClick={() => setSelectedPlan(p)}
                className={`p-4 cursor-pointer transition flex flex-col gap-1.5 ${
                  selectedPlan?.id === p.id
                    ? 'bg-orange-500/10 border-l-2 border-orange-400'
                    : 'hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-200">{p.title}</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
                  <span className="text-orange-300 font-bold">{p.readiness_score}% Readiness</span>
                  <span>•</span>
                  <span>~{p.total_estimated_hours}h</span>
                </div>
              </div>
            ))}
          </div>

          {/* Right Plan Detail Pane */}
          <div className="flex-1 p-6 overflow-y-auto space-y-6 bg-slate-900/30">
            {loading ? (
              <div className="h-full flex flex-col items-center justify-center gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-400"></div>
                <span className="text-xs font-mono text-slate-400">Generating modernization checklists and codemods...</span>
              </div>
            ) : selectedPlan ? (
              <>
                {/* Hero Plan Overview */}
                <div className="p-5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-white font-mono">{selectedPlan.title}</h3>
                      <p className="text-xs text-slate-300 mt-1 font-sans leading-relaxed">{selectedPlan.rationale}</p>
                    </div>
                    <div className="flex items-center gap-2 font-mono text-xs">
                      <span className="px-2.5 py-1 rounded bg-orange-500/20 text-orange-300 font-bold border border-orange-500/30">
                        {selectedPlan.readiness_score}% Readiness
                      </span>
                      <span className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        ~{selectedPlan.total_estimated_hours} Hours
                      </span>
                    </div>
                  </div>

                  {/* Framework Transition Strip */}
                  <div className="p-3 bg-slate-900/80 rounded-lg flex items-center justify-between font-mono text-xs border border-slate-800">
                    <span className="text-slate-400">{selectedPlan.source_framework}</span>
                    <ArrowRight className="w-4 h-4 text-orange-400" />
                    <span className="text-emerald-300 font-bold">{selectedPlan.target_framework}</span>
                  </div>
                </div>

                {/* Key Benefits */}
                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2.5">
                  <span className="text-xs font-bold text-slate-200 font-mono flex items-center gap-1.5 uppercase">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Architecture & Developer Benefits
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300">
                    {selectedPlan.benefits.map((b, idx) => (
                      <div key={idx} className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800/80 flex items-start gap-2">
                        <span className="text-emerald-400 font-bold">✓</span>
                        <span className="font-sans leading-relaxed">{b}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Step-by-Step Conversion Checklist */}
                <div className="space-y-3">
                  <span className="text-xs font-bold text-slate-200 font-mono uppercase block">
                    Phased Migration Execution Checklist ({selectedPlan.checklist.length} Steps)
                  </span>
                  <div className="space-y-3 font-mono text-xs">
                    {selectedPlan.checklist.map((step) => (
                      <div key={step.step_number} className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-orange-500/20 text-orange-300 font-bold flex items-center justify-center text-[10px] border border-orange-500/30">
                              {step.step_number}
                            </span>
                            <span className="font-bold text-slate-200">{step.title}</span>
                          </div>
                          <span className="text-slate-400 text-[11px]">~{step.estimated_hours}h • {step.target_files_count} files</span>
                        </div>
                        <p className="text-xs text-slate-400 font-sans leading-relaxed">{step.description}</p>
                        {step.command_or_codemod && (
                          <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-between text-xs text-orange-300">
                            <code className="truncate pr-2">{step.command_or_codemod}</code>
                            <button
                              onClick={() => handleCopy(step.command_or_codemod!)}
                              className="p-1 text-slate-400 hover:text-slate-200 transition"
                            >
                              {copiedCmd === step.command_or_codemod ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs font-mono">
                Select a migration roadmap to view execution checklist
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
