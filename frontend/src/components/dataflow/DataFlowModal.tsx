import React, { useState, useEffect } from 'react';
import {
  GitBranch,
  X,
  Database,
  Globe,
  ArrowDown,
  CheckCircle2,
  Code2,
} from 'lucide-react';
import type { DataFlowReport, DataFlowChain } from '../../types';
import { fetchDataFlowChains } from '../../services/api';

interface DataFlowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSymbol?: (symbolId: string) => void;
}

export const DataFlowModal: React.FC<DataFlowModalProps> = ({
  isOpen,
  onClose,
  onSelectSymbol,
}) => {
  const [report, setReport] = useState<DataFlowReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedChain, setSelectedChain] = useState<DataFlowChain | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetchDataFlowChains()
        .then((res) => {
          setReport(res);
          if (res?.chains?.length) {
            setSelectedChain(res.chains[0]);
          }
        })
        .catch((err) => console.error('Failed to load data flow report:', err))
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const chains = report?.chains || [];
  const filteredChains = chains.filter((c) => {
    if (filterCategory === 'all') return true;
    return c.flow_category.toLowerCase().includes(filterCategory.toLowerCase());
  });

  const getStepIcon = (type: string) => {
    switch (type) {
      case 'user_input':
        return <Globe className="w-4 h-4 text-cyan-400" />;
      case 'db_read':
        return <Database className="w-4 h-4 text-purple-400" />;
      case 'db_write':
        return <Database className="w-4 h-4 text-emerald-400" />;
      case 'api_request':
        return <Globe className="w-4 h-4 text-amber-400" />;
      case 'api_response':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'param_pass':
        return <ArrowDown className="w-4 h-4 text-blue-400" />;
      default:
        return <Code2 className="w-4 h-4 text-slate-400" />;
    }
  };

  const getStepBadge = (type: string) => {
    switch (type) {
      case 'user_input':
        return <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">User Input</span>;
      case 'db_read':
        return <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-purple-500/10 text-purple-300 border border-purple-500/30">Database Read</span>;
      case 'db_write':
        return <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">Database Write</span>;
      case 'api_request':
        return <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">Outbound API</span>;
      case 'api_response':
        return <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">HTTP Response</span>;
      case 'param_pass':
        return <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-blue-500/10 text-blue-300 border border-blue-500/30">Param Forward</span>;
      default:
        return <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-slate-800 text-slate-400">Transform</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-6xl h-[88vh] flex flex-col shadow-2xl overflow-hidden font-sans">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <GitBranch className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-100">Data Flow & Taint Analysis</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                  Source-to-Sink Lifecycles
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Traces end-to-end data lifecycle across parameters, user inputs, database queries/mutations, and API responses.
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
            <span className="text-slate-500 text-[10px] block uppercase">Total Flow Chains</span>
            <span className="text-base font-bold text-cyan-300">{report?.total_chains || 0}</span>
          </div>
          <div className="p-2.5 bg-slate-900/60 border border-slate-800/80 rounded-xl">
            <span className="text-slate-500 text-[10px] block uppercase">User Input Sources</span>
            <span className="text-base font-bold text-slate-200">{report?.total_user_input_sources || 0}</span>
          </div>
          <div className="p-2.5 bg-slate-900/60 border border-slate-800/80 rounded-xl">
            <span className="text-slate-500 text-[10px] block uppercase">Database Reads</span>
            <span className="text-base font-bold text-purple-300">{report?.total_db_reads || 0}</span>
          </div>
          <div className="p-2.5 bg-slate-900/60 border border-slate-800/80 rounded-xl">
            <span className="text-slate-500 text-[10px] block uppercase">Database Writes</span>
            <span className="text-base font-bold text-emerald-300">{report?.total_db_writes || 0}</span>
          </div>
          <div className="p-2.5 bg-slate-900/60 border border-slate-800/80 rounded-xl">
            <span className="text-slate-500 text-[10px] block uppercase">API Endpoints Traced</span>
            <span className="text-base font-bold text-amber-300">{report?.total_api_endpoints_traced || 0}</span>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="px-4 py-2 border-b border-slate-800 bg-slate-900/40 flex items-center gap-2 overflow-x-auto text-xs font-mono">
          {[
            { id: 'all', label: 'All Chains' },
            { id: 'mutation', label: 'DB Mutations' },
            { id: 'response', label: 'API Responses' },
            { id: 'api', label: 'External APIs' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setFilterCategory(cat.id)}
              className={`px-3 py-1 rounded-lg font-medium transition ${
                filterCategory === cat.id
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Split Content Body */}
        <div className="flex-1 flex overflow-hidden">
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
              <span className="text-xs font-mono text-slate-400">Tracing inter-procedural data flows...</span>
            </div>
          ) : (
            <>
              {/* Left Chains List */}
              <div className="w-80 border-r border-slate-800 overflow-y-auto divide-y divide-slate-800/60 bg-slate-950/20">
                {filteredChains.map((c) => (
                  <div
                    key={c.chain_id}
                    onClick={() => setSelectedChain(c)}
                    className={`p-3 cursor-pointer transition flex flex-col gap-1 ${
                      selectedChain?.chain_id === c.chain_id
                        ? 'bg-cyan-500/10 border-l-2 border-cyan-400'
                        : 'hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center justify-between font-mono text-xs">
                      <span className="font-bold text-slate-200 truncate">{c.entry_point}()</span>
                      <span className="text-[10px] text-slate-500">{c.total_steps} steps</span>
                    </div>
                    <p className="text-[11px] font-mono text-slate-400 truncate">{c.entry_file}</p>
                    <div className="flex items-center justify-between mt-1 text-[10px]">
                      <span className="text-cyan-400 font-mono font-medium">{c.flow_category}</span>
                      <span className="text-slate-500 font-mono">→ {c.terminal_sink}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Right Visual Pipeline */}
              <div className="flex-1 p-6 overflow-y-auto space-y-6 bg-slate-900/30">
                {selectedChain ? (
                  <>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-white font-mono">{selectedChain.entry_point}() Flow Chain</h3>
                          <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                            {selectedChain.flow_category}
                          </span>
                        </div>
                        <p className="text-xs font-mono text-slate-400 mt-1">
                          Source Entry: `{selectedChain.entry_file}` → Terminal Sink: `{selectedChain.terminal_sink}`
                        </p>
                      </div>
                    </div>

                    {/* Step-by-Step Flow Pipeline */}
                    <div className="space-y-4 relative">
                      {selectedChain.steps.map((step, idx) => (
                        <div key={idx} className="relative flex items-start gap-4 group">
                          {/* Step Number & Connector Line */}
                          <div className="flex flex-col items-center flex-shrink-0">
                            <div className="w-8 h-8 rounded-xl bg-slate-950 border border-slate-700 flex items-center justify-center font-mono text-xs font-bold text-slate-300">
                              {getStepIcon(step.step_type)}
                            </div>
                            {idx < selectedChain.steps.length - 1 && (
                              <div className="w-0.5 h-12 bg-slate-800 my-1 group-hover:bg-cyan-500/50 transition"></div>
                            )}
                          </div>

                          {/* Step Content Box */}
                          <div className="flex-1 p-4 bg-slate-950/70 border border-slate-800/80 rounded-xl text-xs space-y-1.5 shadow-sm">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span
                                  onClick={() => step.symbol_id && onSelectSymbol?.(step.symbol_id)}
                                  className={`font-bold text-sm font-mono ${step.symbol_id && onSelectSymbol ? 'text-cyan-300 hover:underline cursor-pointer' : 'text-slate-200'}`}
                                >
                                  {step.symbol_name}()
                                </span>
                                {getStepBadge(step.step_type)}
                              </div>
                              <span className="text-[11px] font-mono text-slate-500">{step.relative_path}:{step.line_number}</span>
                            </div>

                            <p className="text-xs text-slate-300 leading-relaxed font-sans">{step.description}</p>

                            <div className="pt-2 border-t border-slate-850 flex items-center justify-between text-[11px] font-mono">
                              <span className="text-slate-500">Payload variable: <span className="text-cyan-300 font-bold">{step.variable_name}</span></span>
                              <span className="text-slate-400 text-[10px] bg-slate-900 px-2 py-0.5 rounded truncate max-w-xs">{step.expression_snippet}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-500 text-xs font-mono">
                    Select a data flow chain to trace its lifecycle
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
