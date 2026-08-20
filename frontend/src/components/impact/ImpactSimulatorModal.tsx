import React, { useState, useEffect } from 'react';
import {
  Zap,
  X,
  AlertOctagon,
  FileCode,
  Globe,
  Code2,
  Play,
} from 'lucide-react';
import type {
  SimulationType,
  ImpactSimulationResult,
  SimulationTargetsResponse,
} from '../../types';
import {
  fetchSimulationTargets,
  simulateChangeImpact,
} from '../../services/api';

interface ImpactSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRepoPath?: string;
  onSelectNode?: (nodeId: string) => void;
}

export const ImpactSimulatorModal: React.FC<ImpactSimulatorModalProps> = ({
  isOpen,
  onClose,
  currentRepoPath,
}) => {
  const [targets, setTargets] = useState<SimulationTargetsResponse | null>(null);
  const [targetType, setTargetType] = useState<'function' | 'class' | 'file' | 'module'>('function');
  const [selectedTargetId, setSelectedTargetId] = useState<string>('');
  const [simulationType, setSimulationType] = useState<SimulationType>('function_delete');
  const [newNameOrPath, setNewNameOrPath] = useState<string>('');
  const [result, setResult] = useState<ImpactSimulationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [simulating, setSimulating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetchSimulationTargets()
        .then((res) => {
          setTargets(res);
          if (res?.functions?.length) {
            setSelectedTargetId(res.functions[0].id);
          }
        })
        .catch((err) => console.error('Failed to load simulation targets:', err))
        .finally(() => setLoading(false));
    }
  }, [isOpen, currentRepoPath]);

  // Update default simulation type when target type changes
  const handleTargetTypeChange = (type: 'function' | 'class' | 'file' | 'module') => {
    setTargetType(type);
    if (type === 'function') {
      setSimulationType('function_delete');
      if (targets?.functions?.length) setSelectedTargetId(targets.functions[0].id);
    } else if (type === 'class') {
      setSimulationType('class_delete');
      if (targets?.classes?.length) setSelectedTargetId(targets.classes[0].id);
    } else if (type === 'file') {
      setSimulationType('file_move');
      if (targets?.files?.length) setSelectedTargetId(targets.files[0].id);
    } else if (type === 'module') {
      setSimulationType('module_delete');
      if (targets?.modules?.length) setSelectedTargetId(targets.modules[0].id);
    }
  };

  const handleRunSimulation = () => {
    if (!selectedTargetId) return;
    setSimulating(true);
    simulateChangeImpact(selectedTargetId, simulationType, newNameOrPath || undefined)
      .then((res) => setResult(res))
      .catch((err) => console.error('Simulation failed:', err))
      .finally(() => setSimulating(false));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-6xl h-[88vh] flex flex-col shadow-2xl overflow-hidden font-sans">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-100">Change Impact Simulator</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/30">
                  Pre-Refactor Simulation
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Simulate deletion, renaming, relocation, or modular extraction to foresee broken callers, imports, and affected APIs.
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

        {/* Configuration Toolbar */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/40 grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          {/* Target Type Selector */}
          <div className="space-y-1">
            <label className="text-[11px] font-mono text-slate-400 block">1. Target Entity Kind</label>
            <div className="grid grid-cols-4 gap-1 p-1 bg-slate-950 border border-slate-800 rounded-lg">
              {(['function', 'class', 'file', 'module'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => handleTargetTypeChange(t)}
                  className={`py-1 rounded text-center capitalize text-[11px] font-mono transition ${
                    targetType === t
                      ? 'bg-rose-500/20 text-rose-300 font-bold border border-rose-500/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Target Entity Picker */}
          <div className="space-y-1">
            <label className="text-[11px] font-mono text-slate-400 block">2. Select Target Entity</label>
            <select
              value={selectedTargetId}
              onChange={(e) => setSelectedTargetId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-rose-500/50 font-mono"
            >
              {targetType === 'function' &&
                targets?.functions.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}() — {f.relative_path}:{f.line}
                  </option>
                ))}
              {targetType === 'class' &&
                targets?.classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    class {c.name} — {c.relative_path}
                  </option>
                ))}
              {targetType === 'file' &&
                targets?.files.map((fl) => (
                  <option key={fl.id} value={fl.id}>
                    {fl.relative_path} ({fl.line_count} LOC)
                  </option>
                ))}
              {targetType === 'module' &&
                targets?.modules.map((m) => (
                  <option key={m.id} value={m.id}>
                    Module: {m.name} ({m.file_count} files)
                  </option>
                ))}
            </select>
          </div>

          {/* Simulation Action */}
          <div className="space-y-1">
            <label className="text-[11px] font-mono text-slate-400 block">3. Mutation Action</label>
            <select
              value={simulationType}
              onChange={(e) => setSimulationType(e.target.value as SimulationType)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-rose-500/50 font-mono"
            >
              {targetType === 'function' && (
                <>
                  <option value="function_delete">Delete Function (Safe Deletion Check)</option>
                  <option value="function_rename">Rename Function Signature</option>
                </>
              )}
              {targetType === 'class' && (
                <>
                  <option value="class_delete">Delete Class & All Member Methods</option>
                </>
              )}
              {targetType === 'file' && (
                <>
                  <option value="file_move">Move File to New Path</option>
                </>
              )}
              {targetType === 'module' && (
                <>
                  <option value="module_delete">Delete Full Module / Package</option>
                  <option value="module_extract">Extract Module to Separate Boundary</option>
                </>
              )}
            </select>
            {(simulationType === 'function_rename' || simulationType === 'file_move' || simulationType === 'module_extract') && (
              <input
                type="text"
                placeholder="New name or target path..."
                value={newNameOrPath}
                onChange={(e) => setNewNameOrPath(e.target.value)}
                className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-rose-500/50 font-mono"
              />
            )}
          </div>

          {/* Action Trigger Button */}
          <div className="space-y-1 flex flex-col justify-end">
            <label className="text-[11px] font-mono text-slate-400 block opacity-0">4. Run</label>
            <button
              onClick={handleRunSimulation}
              disabled={simulating || !selectedTargetId}
              className="w-full py-1.5 px-3 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-rose-900/30"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{simulating ? 'Simulating Impact...' : 'Run Simulation'}</span>
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-950/20">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-400"></div>
              <span className="text-xs font-mono text-slate-400">Loading candidate refactor targets...</span>
            </div>
          ) : result ? (
            <div className="space-y-6">
              {/* Risk Level Banner */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl flex items-center gap-3.5">
                  <div className={`p-3 rounded-xl border ${
                    result.risk_level === 'Critical' ? 'bg-red-500/20 text-red-400 border-red-500/40' :
                    result.risk_level === 'High' ? 'bg-rose-500/20 text-rose-400 border-rose-500/40' :
                    result.risk_level === 'Moderate' ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' :
                    'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                  }`}>
                    <AlertOctagon className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase text-slate-500 block">Estimated Risk</span>
                    <span className="text-lg font-black text-white">{result.risk_level} ({result.estimated_risk_score}%)</span>
                  </div>
                </div>

                <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl">
                  <span className="text-[10px] font-mono uppercase text-slate-500 block">Broken Callers</span>
                  <span className="text-lg font-bold text-rose-300">{result.total_broken_callers} invocations</span>
                </div>

                <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl">
                  <span className="text-[10px] font-mono uppercase text-slate-500 block">Broken Imports</span>
                  <span className="text-lg font-bold text-amber-300">{result.total_broken_imports} files</span>
                </div>

                <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl">
                  <span className="text-[10px] font-mono uppercase text-slate-500 block">Affected API Routes</span>
                  <span className="text-lg font-bold text-cyan-300">{result.total_affected_apis} endpoints</span>
                </div>
              </div>

              {/* Broken Callers Section */}
              {result.broken_callers.length > 0 && (
                <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-200">
                    <Code2 className="w-4 h-4 text-rose-400" />
                    <span>Broken Call Sites ({result.broken_callers.length})</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {result.broken_callers.map((c, idx) => (
                      <div key={idx} className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl text-xs space-y-1">
                        <div className="flex items-center justify-between font-mono">
                          <span className="font-bold text-rose-300">{c.caller_name}()</span>
                          <span className="text-[10px] text-slate-500">L{c.call_line}</span>
                        </div>
                        <p className="text-[11px] font-mono text-slate-400 truncate">{c.relative_path}</p>
                        <p className="text-[11px] text-slate-300">{c.impact_reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Broken Imports Section */}
              {result.broken_imports.length > 0 && (
                <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-200">
                    <FileCode className="w-4 h-4 text-amber-400" />
                    <span>Broken Module Imports ({result.broken_imports.length})</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {result.broken_imports.map((imp, idx) => (
                      <div key={idx} className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl text-xs space-y-1">
                        <div className="flex items-center justify-between font-mono">
                          <span className="font-bold text-amber-300">{imp.relative_path}</span>
                          <span className="text-[10px] text-slate-500">L{imp.line_number}</span>
                        </div>
                        <p className="text-[11px] text-slate-300">{imp.impact_reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Affected APIs Section */}
              {result.affected_apis.length > 0 && (
                <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-200">
                    <Globe className="w-4 h-4 text-cyan-400" />
                    <span>Affected Public API Endpoints ({result.affected_apis.length})</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                    {result.affected_apis.map((api, idx) => (
                      <div key={idx} className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl text-xs space-y-1">
                        <div className="flex items-center gap-1.5 font-mono">
                          <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold text-[10px]">
                            {api.http_method}
                          </span>
                          <span className="font-bold text-slate-200 truncate">{api.route_path}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-mono">Handler: {api.handler_name}()</p>
                        <p className="text-[11px] text-slate-300">{api.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-slate-500 text-xs font-mono py-16">
              <Zap className="w-12 h-12 text-rose-500/30" />
              <p className="text-sm font-semibold text-slate-300">Choose an entity and click "Run Simulation"</p>
              <p className="text-slate-500 max-w-md text-center">
                The simulator will perform a full topological traversal of your call graph and dependencies to forecast broken invariants before you commit code.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
