import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Filter,
} from 'lucide-react';
import type { RuleEvaluationReport } from '../../types';
import { getArchitectureRules } from '../../services/api';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [preset, setPreset] = useState<'clean_architecture' | 'layered_architecture'>('clean_architecture');
  const [report, setReport] = useState<RuleEvaluationReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadRules = async (presetName: string) => {
    setIsLoading(true);
    try {
      const res = await getArchitectureRules(presetName);
      setReport(res);
    } catch (err) {
      console.error('Failed to evaluate architecture rules:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadRules(preset);
    }
  }, [isOpen, preset]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 font-mono">
                Architecture Boundary Rules & Linter
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                Architectural drift detection & cross-boundary dependency enforcement
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

        {/* Preset Selector */}
        <div className="p-3 bg-slate-950/40 border-b border-slate-800 flex items-center justify-between gap-3 font-mono text-xs">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-cyan-400" />
            <span className="text-slate-400">Architecture Policy:</span>
            <div className="flex rounded-lg bg-slate-900 p-0.5 border border-slate-800">
              <button
                onClick={() => setPreset('clean_architecture')}
                className={`px-3 py-1 rounded-md transition ${
                  preset === 'clean_architecture'
                    ? 'bg-slate-800 text-cyan-300 font-semibold border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Clean Architecture (Hexagonal)
              </button>
              <button
                onClick={() => setPreset('layered_architecture')}
                className={`px-3 py-1 rounded-md transition ${
                  preset === 'layered_architecture'
                    ? 'bg-slate-800 text-cyan-300 font-semibold border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Layered Architecture (N-Tier)
              </button>
            </div>
          </div>

          {/* Compliance Status Badge */}
          {report && (
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-semibold ${
                report.is_compliant
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                  : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
              }`}
            >
              {report.is_compliant ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Compliant</span>
                </>
              ) : (
                <>
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  <span>{report.violations_count} Drift Violation(s)</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-xs">
          {isLoading ? (
            <div className="flex items-center justify-center p-16 text-slate-400">
              <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-cyan-400 mr-3"></div>
              Evaluating architectural rules on dependency graph...
            </div>
          ) : report ? (
            <>
              {report.violations && report.violations.length > 0 ? (
                report.violations.map((v, idx) => (
                  <div
                    key={v.rule_id + idx}
                    className="p-4 rounded-xl bg-slate-950/60 border border-rose-500/40 space-y-2 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-400" />
                        <span className="font-bold text-slate-100 text-xs">{v.rule_name}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-500/30 text-[10px] uppercase font-bold">
                        {v.severity}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-slate-300 bg-slate-900 p-2 rounded-lg border border-slate-800">
                      <span className="text-amber-300 font-semibold">{v.source_relative}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-rose-400" />
                      <span className="text-cyan-300 font-semibold">{v.target_relative}</span>
                    </div>

                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {v.explanation}
                    </p>

                    {v.imported_symbols && v.imported_symbols.length > 0 && (
                      <div className="flex items-center gap-1 text-[10px] text-slate-500 pt-1">
                        <span>Imported:</span>
                        {v.imported_symbols.map((sym, sIdx) => (
                          <span
                            key={sIdx}
                            className="px-1.5 py-0.2 rounded bg-slate-900 border border-slate-800 text-slate-300"
                          >
                            {sym}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="p-16 text-center text-slate-400 space-y-2">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                  <h4 className="text-sm font-bold text-slate-200">100% Architecturally Compliant</h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    No forbidden cross-boundary dependencies or architectural drift detected under the active policy.
                  </p>
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};
