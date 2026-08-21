import React, { useState, useEffect } from 'react';
import {
  X,
  Workflow,
  Copy,
  Check,
  Play,
  ArrowRight,
  User,
  Boxes,
} from 'lucide-react';
import type { SequenceDiagramResponse } from '../../types';
import { getSequenceDiagram } from '../../services/api';

interface SequenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetSymbolId?: string;
}

export const SequenceModal: React.FC<SequenceModalProps> = ({
  isOpen,
  onClose,
  targetSymbolId,
}) => {
  const [symbolInput, setSymbolInput] = useState('');
  const [sequenceData, setSequenceData] = useState<SequenceDiagramResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && targetSymbolId) {
      setSymbolInput(targetSymbolId);
      loadSequence(targetSymbolId);
    }
  }, [isOpen, targetSymbolId]);

  const loadSequence = async (symId: string) => {
    if (!symId.trim()) return;
    setIsLoading(true);
    try {
      const res = await getSequenceDiagram(symId.trim(), 6);
      setSequenceData(res);
      setActiveStepIndex(0);
    } catch (err) {
      console.error('Failed to generate sequence diagram:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyMermaid = () => {
    if (sequenceData?.mermaid_markdown) {
      navigator.clipboard.writeText(sequenceData.mermaid_markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Workflow className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 font-mono">
                Static Execution Flow & Sequence Generator
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                Multi-level static call stack tracer & Mermaid diagram generator
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

        {/* Input Bar */}
        <div className="p-3 bg-slate-950/40 border-b border-slate-800 flex items-center gap-2 font-mono text-xs">
          <input
            type="text"
            value={symbolInput}
            onChange={(e) => setSymbolInput(e.target.value)}
            placeholder="Enter target function or method symbol ID to trace... (e.g. main.py::bootstrap_app)"
            className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 placeholder-slate-500 outline-none focus:border-cyan-500/60"
          />
          <button
            onClick={() => loadSequence(symbolInput)}
            disabled={isLoading || !symbolInput.trim()}
            className="px-4 py-2 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold transition disabled:opacity-50 flex items-center gap-1.5"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-cyan-400"></div>
            ) : (
              <Play className="w-3 h-3" />
            )}
            Trace Call Stack
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-xs">
          {isLoading ? (
            <div className="flex items-center justify-center p-16 text-slate-400">
              <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-cyan-400 mr-3"></div>
              Traced static execution call tree...
            </div>
          ) : sequenceData ? (
            <>
              {/* Participants Bar */}
              <div className="rounded-xl bg-slate-950/60 border border-slate-800 p-3">
                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Participating Lifelines ({sequenceData.participants?.length || 0})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {sequenceData.participants?.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-slate-200"
                    >
                      {p.type === 'actor' ? (
                        <User className="w-3.5 h-3.5 text-amber-400" />
                      ) : (
                        <Boxes className="w-3.5 h-3.5 text-cyan-400" />
                      )}
                      <span>{p.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Execution Steps Timeline */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Execution Steps ({sequenceData.steps?.length || 0})
                  </h4>
                  <button
                    onClick={handleCopyMermaid}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 transition text-[11px]"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    Copy Mermaid Code
                  </button>
                </div>

                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {sequenceData.steps?.map((step, idx) => {
                    const isActive = idx === activeStepIndex;
                    return (
                      <div
                        key={step.step}
                        onClick={() => setActiveStepIndex(idx)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isActive
                            ? 'bg-slate-800/90 border-cyan-500/50 shadow-lg shadow-cyan-950/30'
                            : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/40'
                        }`}
                      >
                        <div className="flex items-center gap-3 truncate">
                          <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center justify-center font-bold text-[10px] flex-shrink-0">
                            {step.step}
                          </span>

                          <div className="flex items-center gap-2 font-semibold text-slate-200">
                            <span className="text-amber-300">{step.caller_participant}</span>
                            <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
                            <span className="text-cyan-300">{step.callee_participant}</span>
                          </div>

                          <span className="text-slate-400 truncate bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-[11px]">
                            {step.raw_call}
                          </span>
                        </div>

                        <span className="text-[10px] text-slate-500 flex-shrink-0">
                          L{step.line_number}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Mermaid Markdown Code Box */}
              <div className="space-y-1.5">
                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Mermaid Sequence Diagram
                </h4>
                <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-cyan-200/90 overflow-x-auto text-[11px] leading-5 font-mono">
                  {sequenceData.mermaid_markdown}
                </pre>
              </div>
            </>
          ) : (
            <div className="p-16 text-center text-slate-500 space-y-2">
              <Workflow className="w-8 h-8 text-cyan-500/40 mx-auto" />
              <p>Select any function or method in the codebase to trace its static call hierarchy.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
