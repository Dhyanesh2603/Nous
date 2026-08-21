import React, { useState, useEffect } from 'react';
import {
  Network,
  X,
  ShieldCheck,
  Search,
} from 'lucide-react';
import type { ApiDependencyGraphReport } from '../../types';
import { fetchApiDependencies } from '../../services/api';

interface ApiMapperModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRepoPath?: string;
}

export const ApiMapperModal: React.FC<ApiMapperModalProps> = ({
  isOpen,
  onClose,
  currentRepoPath,
}) => {
  const [report, setReport] = useState<ApiDependencyGraphReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedProtocol, setSelectedProtocol] = useState<string>('all');
  const [searchFilter, setSearchFilter] = useState('');
  const [activeTab, setActiveTab] = useState<'endpoints' | 'clients' | 'services'>('endpoints');

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetchApiDependencies()
        .then((res) => setReport(res))
        .catch((err) => console.error('Failed to load API dependencies:', err))
        .finally(() => setLoading(false));
    }
  }, [isOpen, currentRepoPath]);

  if (!isOpen) return null;

  const endpoints = report?.endpoints || [];
  const clientCalls = report?.client_calls || [];

  const filteredEndpoints = endpoints.filter((ep) => {
    const matchesProto = selectedProtocol === 'all' || ep.protocol === selectedProtocol;
    const filter = searchFilter.toLowerCase();
    const matchesSearch =
      searchFilter === '' ||
      (ep.path ? ep.path.toLowerCase().includes(filter) : false) ||
      (ep.handler_name ? ep.handler_name.toLowerCase().includes(filter) : false) ||
      (ep.service_module ? ep.service_module.toLowerCase().includes(filter) : false);
    return matchesProto && matchesSearch;
  });

  const getMethodBadge = (method: string) => {
    switch (method.toUpperCase()) {
      case 'GET':
        return <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">GET</span>;
      case 'POST':
        return <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-blue-500/20 text-blue-300 border border-blue-500/40">POST</span>;
      case 'PUT':
      case 'PATCH':
        return <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">{method}</span>;
      case 'DELETE':
        return <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-rose-500/20 text-rose-300 border border-rose-500/40">DELETE</span>;
      case 'QUERY':
        return <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-purple-500/20 text-purple-300 border border-purple-500/40">Query</span>;
      case 'MUTATION':
        return <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-pink-500/20 text-pink-300 border border-pink-500/40">Mutation</span>;
      case 'RPC':
        return <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">gRPC</span>;
      case 'WS':
        return <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-teal-500/20 text-teal-300 border border-teal-500/40">WS</span>;
      default:
        return <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-slate-800 text-slate-300">{method}</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-6xl h-[88vh] flex flex-col shadow-2xl overflow-hidden font-sans">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Network className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-100">API Dependency & Protocol Mapper</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                  REST • GraphQL • gRPC • WebSockets
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Discovers inbound endpoints and maps outbound client calls across services and external APIs.
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
            <span className="text-slate-500 text-[10px] block uppercase">REST APIs</span>
            <span className="text-base font-bold text-emerald-300">{report?.protocol_distribution?.REST || 0}</span>
          </div>
          <div className="p-2.5 bg-slate-900/60 border border-slate-800/80 rounded-xl">
            <span className="text-slate-500 text-[10px] block uppercase">GraphQL</span>
            <span className="text-base font-bold text-purple-300">{report?.protocol_distribution?.GraphQL || 0}</span>
          </div>
          <div className="p-2.5 bg-slate-900/60 border border-slate-800/80 rounded-xl">
            <span className="text-slate-500 text-[10px] block uppercase">gRPC Services</span>
            <span className="text-base font-bold text-indigo-300">{report?.protocol_distribution?.gRPC || 0}</span>
          </div>
          <div className="p-2.5 bg-slate-900/60 border border-slate-800/80 rounded-xl">
            <span className="text-slate-500 text-[10px] block uppercase">WebSockets</span>
            <span className="text-base font-bold text-teal-300">{report?.protocol_distribution?.WebSocket || 0}</span>
          </div>
          <div className="p-2.5 bg-slate-900/60 border border-slate-800/80 rounded-xl">
            <span className="text-slate-500 text-[10px] block uppercase">Client Outbound Calls</span>
            <span className="text-base font-bold text-cyan-300">{report?.total_client_calls || 0}</span>
          </div>
        </div>

        {/* Toolbar */}
        <div className="px-4 py-2.5 border-b border-slate-800 flex items-center justify-between gap-3 bg-slate-900/40">
          <div className="flex items-center gap-2">
            <div className="flex items-center p-1 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono">
              <button
                onClick={() => setActiveTab('endpoints')}
                className={`px-3 py-1 rounded font-medium transition ${
                  activeTab === 'endpoints' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'text-slate-400'
                }`}
              >
                Inbound Endpoints ({endpoints.length})
              </button>
              <button
                onClick={() => setActiveTab('clients')}
                className={`px-3 py-1 rounded font-medium transition ${
                  activeTab === 'clients' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'text-slate-400'
                }`}
              >
                Outbound Calls ({clientCalls.length})
              </button>
            </div>

            {activeTab === 'endpoints' && (
              <div className="flex items-center gap-1 text-xs font-mono">
                {['all', 'REST', 'GraphQL', 'gRPC', 'WebSocket'].map((proto) => (
                  <button
                    key={proto}
                    onClick={() => setSelectedProtocol(proto)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] transition ${
                      selectedProtocol === proto
                        ? 'bg-slate-800 text-white font-bold'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {proto}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search route path or handler..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 font-sans"
            />
          </div>
        </div>

        {/* Main Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-950/20">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400"></div>
              <span className="text-xs font-mono text-slate-400">Scanning API decorators & client invocations...</span>
            </div>
          ) : activeTab === 'endpoints' ? (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredEndpoints.map((ep) => (
                  <div
                    key={ep.id}
                    className="p-4 bg-slate-900/70 border border-slate-800/80 hover:border-emerald-500/40 rounded-xl transition text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-mono">
                        {getMethodBadge(ep.method)}
                        <span className="font-bold text-slate-200 truncate">{ep.path}</span>
                      </div>
                      <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-slate-800 text-slate-400">
                        {ep.protocol}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-1">
                      <span>Handler: <span className="text-emerald-300 font-bold">{ep.handler_name}()</span></span>
                      <span>{ep.relative_path}:{ep.line_number}</span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 border-t border-slate-850 pt-2">
                      <span>Module: {ep.service_module}</span>
                      {ep.auth_required ? (
                        <span className="text-amber-400 flex items-center gap-1 font-bold">
                          <ShieldCheck className="w-3 h-3" /> Auth Guarded
                        </span>
                      ) : (
                        <span className="text-slate-500">Public Access</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {clientCalls.map((call) => (
                  <div
                    key={call.id}
                    className="p-4 bg-slate-900/70 border border-slate-800/80 rounded-xl text-xs space-y-2 font-mono"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getMethodBadge(call.http_method)}
                        <span className="font-bold text-slate-200 truncate">{call.target_url_or_service}</span>
                      </div>
                      <span className="px-2 py-0.5 text-[10px] rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                        {call.is_internal_call ? 'Internal RPC' : 'External HTTP'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>Caller: {call.relative_path}:{call.line_number}</span>
                      <span className="text-slate-500">{call.protocol}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
