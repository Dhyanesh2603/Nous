import React, { useState, useEffect } from 'react';
import {
  Building2,
  X,
  Layers,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import type { ArchitectureDetectionReport, DetectedStyle } from '../../types';
import { fetchArchitectureStyle } from '../../services/api';

interface ArchitectureStyleModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRepoPath?: string;
}

export const ArchitectureStyleModal: React.FC<ArchitectureStyleModalProps> = ({
  isOpen,
  onClose,
  currentRepoPath,
}) => {
  const [report, setReport] = useState<ArchitectureDetectionReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState<DetectedStyle | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetchArchitectureStyle()
        .then((res) => {
          setReport(res);
          if (res?.detected_styles?.length) {
            setSelectedStyle(res.detected_styles[0]);
          }
        })
        .catch((err) => console.error('Failed to load architecture detection:', err))
        .finally(() => setLoading(false));
    }
  }, [isOpen, currentRepoPath]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl overflow-hidden font-sans">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-100">Automatic Architecture Style Detection</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/30">
                  Pattern Classifier
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Classifies repository into MVC, MVVM, Clean Architecture, Hexagonal, Onion, DDD, Layered, Microservices, or Event-Driven.
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

        {/* Primary Style Hero */}
        <div className="p-4 bg-slate-950/40 border-b border-slate-800 flex items-center justify-between font-sans">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-500/20 text-purple-300 border border-purple-500/40 rounded-xl">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase text-slate-500 block">Primary Detected Architecture</span>
              <h3 className="text-lg font-black text-white">{report?.primary_style || 'Analyzing...'}</h3>
            </div>
          </div>
          <div className="text-right font-mono">
            <span className="text-[10px] uppercase text-slate-500 block">Confidence Score</span>
            <span className="text-base font-bold text-purple-300">
              {Math.round((report?.primary_confidence || 0) * 100)}%
            </span>
          </div>
        </div>

        {/* Main Body */}
        <div className="flex-1 flex overflow-hidden">
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
              <span className="text-xs font-mono text-slate-400">Classifying architectural patterns & layer boundaries...</span>
            </div>
          ) : (
            <>
              {/* Left Styles List */}
              <div className="w-80 border-r border-slate-800 overflow-y-auto divide-y divide-slate-800/60 bg-slate-950/20">
                <div className="p-3 text-[11px] font-mono uppercase text-slate-500 font-bold bg-slate-950/40">
                  Detected Architectural Styles ({report?.detected_styles?.length || 0})
                </div>
                {report?.detected_styles?.map((s, idx) => (
                  <div
                    key={idx}
                    onClick={() => setSelectedStyle(s)}
                    className={`p-3.5 cursor-pointer transition flex flex-col gap-1 ${
                      selectedStyle?.style === s.style
                        ? 'bg-purple-500/10 border-l-2 border-purple-400'
                        : 'hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-200">{s.style}</span>
                      <span className="font-mono text-[10px] font-bold text-purple-300">
                        {Math.round(s.confidence_score * 100)}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden mt-1">
                      <div
                        className="bg-purple-400 h-full rounded-full"
                        style={{ width: `${Math.round(s.confidence_score * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Right Detail Pane */}
              <div className="flex-1 p-6 overflow-y-auto space-y-6 bg-slate-900/30">
                {selectedStyle && (
                  <>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-white font-mono">{selectedStyle.style}</h3>
                        <span className="px-2 py-0.5 text-xs font-mono rounded bg-purple-500/10 text-purple-300 border border-purple-500/30">
                          {Math.round(selectedStyle.confidence_score * 100)}% Confidence
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed font-sans">{selectedStyle.description}</p>
                    </div>

                    {/* Evidence & Matched Patterns */}
                    <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2.5">
                      <span className="text-xs font-bold text-slate-200 font-mono flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        Matched Structural Patterns
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {(selectedStyle.matched_patterns || []).map((pat, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 text-[11px] font-mono rounded-lg bg-slate-900 text-purple-300 border border-purple-500/20"
                          >
                            {pat}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Evidence Directories */}
                    {(selectedStyle.evidence_directories || []).length > 0 && (
                      <div className="space-y-2">
                        <span className="text-xs font-bold text-slate-300 font-mono">Evidence Directories</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-xs">
                          {(selectedStyle.evidence_directories || []).map((dir, idx) => (
                            <div key={idx} className="p-2.5 bg-slate-950/70 border border-slate-800 rounded-lg text-slate-300 truncate">
                              📁 {dir}/
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Architectural Layers Breakdown */}
                    {(report?.architectural_layers || []).length > 0 && (
                      <div className="space-y-3 pt-2 border-t border-slate-800">
                        <span className="text-xs font-bold text-slate-200 font-mono flex items-center gap-1.5">
                          <Layers className="w-4 h-4 text-cyan-400" />
                          Identified Architectural Layers ({(report?.architectural_layers || []).length})
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 font-sans">
                          {(report?.architectural_layers || []).map((layer, idx) => (
                            <div key={idx} className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1">
                              <div className="flex items-center justify-between font-mono text-xs">
                                <span className="font-bold text-slate-200">{layer.layer_name}</span>
                                <span className="text-[10px] text-slate-500">{layer.file_count} files</span>
                              </div>
                              <p className="text-[11px] text-slate-400">{layer.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
