import React, { useState, useEffect } from 'react';
import {
  X,
  Layers,
  Code2,
} from 'lucide-react';
import { fetchFrameworkOverview } from '../../services/api';
import type { FrameworkOverviewReport } from '../../types';

interface FrameworkModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FrameworkModal: React.FC<FrameworkModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [report, setReport] = useState<FrameworkOverviewReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'components' | 'backend'>('components');

  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    fetchFrameworkOverview()
      .then((res: FrameworkOverviewReport) => setReport(res))
      .catch((err: unknown) => console.error('Failed to load framework overview:', err))
      .finally(() => setLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl overflow-hidden font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-100">Framework & Architectural Layers</h2>
                {report?.detected_frameworks && report.detected_frameworks.length > 0 && (
                  <div className="flex gap-1">
                    {report.detected_frameworks.map((fw) => (
                      <span key={fw} className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/30">
                        {fw}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Frontend UI component trees, hook state graphs, and backend controller-service-repo layers.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-950 rounded-lg p-0.5 border border-slate-800 text-xs font-mono">
              <button
                onClick={() => setActiveTab('components')}
                className={`px-3 py-1 rounded-md transition ${
                  activeTab === 'components'
                    ? 'bg-purple-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Frontend Components ({report?.frontend_components.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('backend')}
                className={`px-3 py-1 rounded-md transition ${
                  activeTab === 'backend'
                    ? 'bg-purple-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Backend Layers
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

        {/* Modal Body */}
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
            <p className="text-xs font-mono">Mapping component trees and backend layers...</p>
          </div>
        ) : !report ? (
          <div className="flex-1 flex items-center justify-center text-slate-500 text-xs font-mono">
            No framework data available.
          </div>
        ) : activeTab === 'components' ? (
          <div className="flex-1 overflow-y-auto p-6 space-y-4 font-mono text-xs">
            {report.frontend_components.length === 0 ? (
              <div className="py-16 text-center text-slate-500">
                No React/Vue components detected in source trees.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {report.frontend_components.map((comp, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-3 hover:border-purple-500/40 transition"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Code2 className="w-4 h-4 text-purple-400" />
                        <span className="font-bold text-sm text-slate-100">{comp.name}</span>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                        Line {comp.line_number}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate">{comp.relative_path}</p>

                    {comp.hooks_used.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-500 uppercase font-semibold">Hooks Used:</span>
                        <div className="flex flex-wrap gap-1">
                          {comp.hooks_used.map((h, i) => (
                            <span key={i} className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-300 text-[10px] border border-purple-500/20">
                              {h}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {comp.child_components.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-500 uppercase font-semibold">Child Elements:</span>
                        <div className="flex flex-wrap gap-1">
                          {comp.child_components.map((c, i) => (
                            <span key={i} className="px-1.5 py-0.5 rounded bg-slate-900 text-cyan-300 text-[10px] border border-slate-800">
                              &lt;{c} /&gt;
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-6 font-mono text-xs">
            {/* Controllers */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider block">
                Controllers & API Routers ({report.backend_layers.controllers.length})
              </span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {report.backend_layers.controllers.map((c, i) => (
                  <div key={i} className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                    <span className="font-bold text-cyan-300 block">{c.name}</span>
                    <span className="text-[10px] text-slate-500 block truncate">{c.file}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Services */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider block">
                Service & Domain Logic Layer ({report.backend_layers.services.length})
              </span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {report.backend_layers.services.map((s, i) => (
                  <div key={i} className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                    <span className="font-bold text-emerald-300 block">{s.name}</span>
                    <span className="text-[10px] text-slate-500 block truncate">{s.file}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Repositories */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider block">
                Persistence & Repository Layer ({report.backend_layers.repositories.length})
              </span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {report.backend_layers.repositories.map((r, i) => (
                  <div key={i} className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                    <span className="font-bold text-amber-300 block">{r.name}</span>
                    <span className="text-[10px] text-slate-500 block truncate">{r.file}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
