import React, { useState, useEffect } from 'react';
import {
  Activity,
  X,
  AlertTriangle,
  Flame,
  ShieldAlert,
  TestTube2,
  FileCode,
  CheckCircle2,
  Zap,
} from 'lucide-react';
import type { RippleSimulationReport, RippleTarget } from '../../types';
import { fetchRippleTargets, fetchRippleSimulation } from '../../services/api';

interface RippleSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTargetId?: string;
  initialTargetType?: 'file' | 'symbol';
  onSelectNode?: (nodeId: string) => void;
}

export const RippleSimulatorModal: React.FC<RippleSimulatorModalProps> = ({
  isOpen,
  onClose,
  initialTargetId,
  initialTargetType = 'file',
  onSelectNode,
}) => {
  const [targetId, setTargetId] = useState(initialTargetId || '');
  const [targetType, setTargetType] = useState<'file' | 'symbol'>(initialTargetType);
  const [changeType, setChangeType] = useState<'breaking' | 'behavioral' | 'additive'>('breaking');
  const [targets, setTargets] = useState<RippleTarget[]>([]);
  const [report, setReport] = useState<RippleSimulationReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTierTab, setActiveTierTab] = useState<'level1' | 'level2' | 'level3'>('level1');

  useEffect(() => {
    if (isOpen) {
      fetchRippleTargets()
        .then((res) => {
          setTargets(res.targets || []);
          if (!targetId && res.targets?.length > 0) {
            setTargetId(res.targets[0].id);
            setTargetType(res.targets[0].type === 'symbol' ? 'symbol' : 'file');
            runSimulation(res.targets[0].id, res.targets[0].type === 'symbol' ? 'symbol' : 'file', changeType);
          } else if (targetId) {
            runSimulation(targetId, targetType, changeType);
          }
        })
        .catch((err) => console.error('Failed to load ripple targets:', err));
    }
  }, [isOpen, initialTargetId, initialTargetType]);

  const runSimulation = async (
    tId: string,
    tType: 'file' | 'symbol' = targetType,
    cType: 'breaking' | 'behavioral' | 'additive' = changeType
  ) => {
    if (!tId.trim()) return;
    setLoading(true);
    try {
      const res = await fetchRippleSimulation(tId.trim(), tType, cType);
      setReport(res);
    } catch (err) {
      console.error('Failed to run ripple simulation:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const getRiskBadge = (tier: string) => {
    switch (tier) {
      case 'CRITICAL':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      case 'HIGH':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/30';
      case 'MEDIUM':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      default:
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-6xl h-[90vh] flex flex-col shadow-2xl overflow-hidden font-sans">
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <Activity className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-100">Ripple Effect & Failure Cascade Simulator</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/30">
                  Multi-Tier Blast Radius
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Simulate contract mutations, cascading breakage waves, and downstream ingress route impact.
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

        {/* Mutation Config Section */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/40 space-y-4">
          {/* Target Quick Select & Custom Input */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex-1 flex items-center gap-2">
              <span className="text-xs font-mono text-slate-400 flex-shrink-0">Target:</span>
              <input
                type="text"
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                placeholder="Enter file path or symbol name (e.g., auth.py, UserService)..."
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-rose-500 font-mono"
              />
            </div>

            <button
              onClick={() => runSimulation(targetId, targetType, changeType)}
              disabled={loading || !targetId.trim()}
              className="px-5 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition shadow-lg shadow-rose-900/30 font-mono flex-shrink-0"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Zap className="w-3.5 h-3.5" />
              )}
              <span>Simulate Ripple</span>
            </button>
          </div>

          {/* Quick Target Candidates */}
          {targets.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] font-sans">
              <span className="text-slate-500 flex-shrink-0 mr-1 font-mono text-[10px]">
                High-Impact Targets:
              </span>
              {targets.slice(0, 8).map((t, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setTargetId(t.id);
                    setTargetType(t.type === 'symbol' ? 'symbol' : 'file');
                    runSimulation(t.id, t.type === 'symbol' ? 'symbol' : 'file', changeType);
                  }}
                  className={`px-2.5 py-1 rounded-lg border transition whitespace-nowrap flex-shrink-0 font-mono text-[10px] ${
                    targetId === t.id
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 font-bold'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}

          {/* Mutation Change Type Toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div
              onClick={() => {
                setChangeType('breaking');
                if (targetId) runSimulation(targetId, targetType, 'breaking');
              }}
              className={`p-3 rounded-xl border cursor-pointer transition flex items-start gap-3 ${
                changeType === 'breaking'
                  ? 'bg-rose-950/30 border-rose-500/60 shadow-md shadow-rose-950/40'
                  : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 mt-0.5">
                <Flame className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5 font-mono">
                  Breaking Signature
                  {changeType === 'breaking' && <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping"></span>}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Parameters, arguments, or return type altered. Highest failure cascade.
                </div>
              </div>
            </div>

            <div
              onClick={() => {
                setChangeType('behavioral');
                if (targetId) runSimulation(targetId, targetType, 'behavioral');
              }}
              className={`p-3 rounded-xl border cursor-pointer transition flex items-start gap-3 ${
                changeType === 'behavioral'
                  ? 'bg-amber-950/30 border-amber-500/60 shadow-md shadow-amber-950/40'
                  : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 mt-0.5">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5 font-mono">
                  Behavioral / Logic
                  {changeType === 'behavioral' && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Internal algorithm updated. Same interface, but behavior changed.
                </div>
              </div>
            </div>

            <div
              onClick={() => {
                setChangeType('additive');
                if (targetId) runSimulation(targetId, targetType, 'additive');
              }}
              className={`p-3 rounded-xl border cursor-pointer transition flex items-start gap-3 ${
                changeType === 'additive'
                  ? 'bg-emerald-950/30 border-emerald-500/60 shadow-md shadow-emerald-950/40'
                  : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 mt-0.5">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5 font-mono">
                  Additive / Non-Breaking
                  {changeType === 'additive' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  New optional arguments or helper functions added. Minimal risk.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center gap-4 py-16">
              <div className="w-12 h-12 border-4 border-rose-500/20 border-t-rose-400 rounded-full animate-spin"></div>
              <div className="text-center space-y-1">
                <p className="text-xs font-bold text-slate-200 font-mono">
                  Traversing Cascading Dependency Graphs...
                </p>
                <p className="text-[11px] text-slate-500">
                  Computing multi-tier reachability and ingress route blast radius.
                </p>
              </div>
            </div>
          ) : !report ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto py-12 space-y-3">
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-rose-400">
                <Activity className="w-8 h-8" />
              </div>
              <h3 className="text-sm font-bold text-slate-200 font-sans">
                Select a Target to Simulate Ripple Effect
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                Choose a central module or symbol above to model how breaking changes cascade through Level 1 callers, Level 2 transitive services, and public API endpoints.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Metric Overview Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 font-mono">
                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl">
                  <span className="text-slate-500 text-[10px] uppercase block">Risk Score</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-bold text-rose-400">{report.overall_risk_score}</span>
                    <span className="text-xs text-slate-500">/100</span>
                  </div>
                </div>

                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl">
                  <span className="text-slate-500 text-[10px] uppercase block">Risk Tier</span>
                  <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-bold border ${getRiskBadge(report.risk_tier)}`}>
                    {report.risk_tier}
                  </span>
                </div>

                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl">
                  <span className="text-slate-500 text-[10px] uppercase block">Total Files Reachable</span>
                  <span className="text-2xl font-bold text-slate-100 mt-1 block">
                    {report.total_affected_files}
                  </span>
                </div>

                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl">
                  <span className="text-slate-500 text-[10px] uppercase block">Codebase Blast %</span>
                  <span className="text-2xl font-bold text-cyan-400 mt-1 block">
                    {report.transitive_reachability_pct}%
                  </span>
                </div>

                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl">
                  <span className="text-slate-500 text-[10px] uppercase block">Ingress Routes at Risk</span>
                  <span className="text-2xl font-bold text-amber-400 mt-1 block">
                    {report.affected_endpoints_count}
                  </span>
                </div>
              </div>

              {/* Breaking Warnings Alert */}
              {report.breaking_contract_warnings.length > 0 && (
                <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/30 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-rose-300 font-mono">
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                    <span>Contract Impact Warnings</span>
                  </div>
                  <ul className="text-xs text-slate-300 space-y-1 list-disc pl-5 font-sans">
                    {report.breaking_contract_warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Multi-Tier Ripple Cascade Tabs */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                  <button
                    onClick={() => setActiveTierTab('level1')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition flex items-center gap-1.5 ${
                      activeTierTab === 'level1'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>Level 1: Direct Impact</span>
                    <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px]">
                      {report.level1_direct.length}
                    </span>
                  </button>

                  <button
                    onClick={() => setActiveTierTab('level2')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition flex items-center gap-1.5 ${
                      activeTierTab === 'level2'
                        ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>Level 2: Transitive Ripple</span>
                    <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px]">
                      {report.level2_transitive.length}
                    </span>
                  </button>

                  <button
                    onClick={() => setActiveTierTab('level3')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition flex items-center gap-1.5 ${
                      activeTierTab === 'level3'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>Level 3: Ingress Routes</span>
                    <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px]">
                      {report.level3_ingress.length}
                    </span>
                  </button>
                </div>

                {/* Items in Active Tier */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(activeTierTab === 'level1'
                    ? report.level1_direct
                    : activeTierTab === 'level2'
                    ? report.level2_transitive
                    : report.level3_ingress
                  ).map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => onSelectNode?.(item.file_path)}
                      className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-cyan-500/40 transition flex items-start justify-between cursor-pointer group"
                    >
                      <div className="space-y-1 truncate pr-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold font-mono text-slate-200 group-hover:text-cyan-300 truncate">
                            {item.name}
                          </span>
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 uppercase">
                            {item.kind}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-snug font-sans">
                          {item.risk_reason}
                        </p>
                        <div className="text-[10px] font-mono text-slate-500 truncate">
                          {item.file_path}{item.line ? `:${item.line}` : ''}
                        </div>
                      </div>

                      <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border flex-shrink-0 ${getRiskBadge(item.risk_level.toUpperCase())}`}>
                        {item.risk_level}
                      </span>
                    </div>
                  ))}

                  {(activeTierTab === 'level1' && report.level1_direct.length === 0) ||
                  (activeTierTab === 'level2' && report.level2_transitive.length === 0) ||
                  (activeTierTab === 'level3' && report.level3_ingress.length === 0) ? (
                    <div className="col-span-2 text-center py-8 text-xs text-slate-500 font-mono">
                      No dependents identified at this cascade level.
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Recommended Test Suites Card */}
              {report.recommended_test_files.length > 0 && (
                <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/30 space-y-2">
                  <span className="text-xs font-bold font-mono text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                    <TestTube2 className="w-3.5 h-3.5" />
                    Recommended Validation Tests
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {report.recommended_test_files.map((testFile, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-lg bg-indigo-900/40 text-indigo-200 border border-indigo-700/50 text-xs font-mono flex items-center gap-1.5"
                      >
                        <FileCode className="w-3 h-3 text-indigo-400" />
                        {testFile}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
