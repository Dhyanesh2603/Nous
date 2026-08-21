import React, { useState, useEffect } from 'react';
import {
  X,
  Globe,
  Lock,
} from 'lucide-react';
import { fetchApiFlowCatalog } from '../../services/api';
import type { ApiFlowCatalog, EndpointLifecycle } from '../../types';

interface ApiFlowModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRepoPath?: string;
}

export const ApiFlowModal: React.FC<ApiFlowModalProps> = ({
  isOpen,
  onClose,
  currentRepoPath,
}) => {
  const [catalog, setCatalog] = useState<ApiFlowCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedEndpoint, setSelectedEndpoint] = useState<EndpointLifecycle | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    fetchApiFlowCatalog()
      .then((res: ApiFlowCatalog) => {
        setCatalog(res);
        if (res?.endpoints && res.endpoints.length > 0) {
          setSelectedEndpoint(res.endpoints[0]);
        }
      })
      .catch((err: unknown) => console.error('API catalog fetch error:', err))
      .finally(() => setLoading(false));
  }, [isOpen, currentRepoPath]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-6xl h-[88vh] flex flex-col shadow-2xl overflow-hidden font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-100">API Architecture & Request Lifecycle</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                  {catalog?.total_endpoints || 0} Routes Detected
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Inspect end-to-end request pipelines: Middlewares, Auth Guards, Controllers, Services, and Database models.
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

        {/* Modal Body */}
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
            <p className="text-xs font-mono">Mapping API pipelines and handler call graphs...</p>
          </div>
        ) : !catalog || catalog.endpoints.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-2 p-8 text-center font-mono">
            <Globe className="w-12 h-12 text-slate-600" />
            <h3 className="text-sm font-semibold text-slate-200">No API Endpoints Detected</h3>
            <p className="text-xs text-slate-500 max-w-md">
              Nous extracts routes declared in FastAPI, Express, Flask, Next.js, and Gin frameworks.
            </p>
          </div>
        ) : (
          <div className="flex-1 flex overflow-hidden">
            {/* Left: Endpoint List */}
            <div className="w-80 border-r border-slate-800 bg-slate-950/40 flex flex-col">
              <div className="p-3 border-b border-slate-800 text-xs font-mono text-slate-400 flex items-center justify-between">
                <span>API Endpoints</span>
                <span className="text-cyan-400 font-semibold">{catalog.total_endpoints}</span>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1.5 font-mono text-xs">
                {catalog.endpoints.map((ep) => (
                  <button
                    key={ep.id}
                    onClick={() => setSelectedEndpoint(ep)}
                    className={`w-full text-left p-3 rounded-xl border transition ${
                      selectedEndpoint?.id === ep.id
                        ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300 shadow-sm'
                        : 'bg-slate-900/60 border-slate-800/80 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                          ep.http_method === 'GET'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : ep.http_method === 'POST'
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                            : ep.http_method === 'DELETE'
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {ep.http_method}
                      </span>
                      {ep.auth_required && <Lock className="w-3 h-3 text-amber-400" />}
                    </div>
                    <div className="font-semibold text-xs text-slate-200 truncate">{ep.route_path}</div>
                    <div className="text-[10px] text-slate-500 truncate mt-1">
                      {ep.handler_name}() · {ep.relative_path}:{ep.line_number}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Right: Selected Endpoint Lifecycle Pipeline */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 font-mono text-xs">
              {selectedEndpoint && (
                <>
                  <div className="border-b border-slate-800 pb-4">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                          selectedEndpoint.http_method === 'GET'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        }`}
                      >
                        {selectedEndpoint.http_method}
                      </span>
                      <h3 className="text-base font-bold text-slate-100">{selectedEndpoint.route_path}</h3>
                    </div>
                    <p className="text-xs text-slate-400 font-sans">{selectedEndpoint.summary}</p>
                  </div>

                  {/* End-to-End Visual Request Pipeline */}
                  <div className="space-y-3">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                      End-to-End Execution Pipeline
                    </span>

                    <div className="space-y-3">
                      {selectedEndpoint.pipeline_steps.map((step) => (
                        <div
                          key={step.step_number}
                          className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl flex items-start gap-3.5 hover:border-cyan-500/40 transition"
                        >
                          <div className="w-7 h-7 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-bold flex items-center justify-center text-xs flex-shrink-0">
                            {step.step_number}
                          </div>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 uppercase font-semibold">
                                {step.stage}
                              </span>
                              <h4 className="font-bold text-xs text-slate-200">{step.title}</h4>
                            </div>
                            <p className="text-xs text-slate-300 font-sans leading-relaxed">
                              {step.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
