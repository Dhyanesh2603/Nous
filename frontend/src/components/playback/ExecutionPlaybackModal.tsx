import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  X,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import type { ExecutionCandidate, ExecutionPlaybackTrace, ExecutionStep } from '../../types';
import { fetchPlaybackCandidates, tracePlaybackExecution } from '../../services/api';

interface ExecutionPlaybackModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRepoPath?: string;
  onSelectSymbol?: (symbolId: string) => void;
}

export const ExecutionPlaybackModal: React.FC<ExecutionPlaybackModalProps> = ({
  isOpen,
  onClose,
  currentRepoPath,
}) => {
  const [candidates, setCandidates] = useState<ExecutionCandidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<ExecutionCandidate | null>(null);
  const [trace, setTrace] = useState<ExecutionPlaybackTrace | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetchPlaybackCandidates()
        .then((res) => {
          setCandidates(res || []);
          if (res?.length) {
            setSelectedCandidate(res[0]);
            loadTrace(res[0].name);
          }
        })
        .catch((err) => console.error('Failed to load playback candidates:', err))
        .finally(() => setLoading(false));
    }
  }, [isOpen, currentRepoPath]);

  const loadTrace = (entryName: string) => {
    setLoading(true);
    tracePlaybackExecution(entryName)
      .then((res) => {
        setTrace(res);
        setCurrentStepIndex(0);
        setIsPlaying(false);
      })
      .catch((err) => console.error('Failed to load execution trace:', err))
      .finally(() => setLoading(false));
  };

  // Playback timer
  useEffect(() => {
    let timer: any = null;
    if (isPlaying && trace?.steps?.length) {
      timer = setInterval(() => {
        setCurrentStepIndex((prev) => {
          if (prev >= trace.steps.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1500);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlaying, trace]);

  if (!isOpen) return null;

  const currentStep: ExecutionStep | undefined = trace?.steps?.[currentStepIndex];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-6xl h-[88vh] flex flex-col shadow-2xl overflow-hidden font-sans">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-100">Interactive Execution Flow Playback</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30">
                  Call Stack Stepper
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Step-by-step runtime flow simulation through nested functions, branch guards, and state payloads.
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
          {/* Left Entry Point Selection */}
          <div className="w-72 border-r border-slate-800 overflow-y-auto divide-y divide-slate-800/60 bg-slate-950/20">
            <div className="p-3 text-[11px] font-mono uppercase text-slate-500 font-bold bg-slate-950/40">
              Entry Points ({candidates.length})
            </div>
            {candidates.map((c) => (
              <div
                key={c.id}
                onClick={() => {
                  setSelectedCandidate(c);
                  loadTrace(c.name);
                }}
                className={`p-3.5 cursor-pointer transition flex flex-col gap-1 ${
                  selectedCandidate?.id === c.id
                    ? 'bg-amber-500/10 border-l-2 border-amber-400'
                    : 'hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center justify-between font-mono text-xs">
                  <span className="font-bold text-slate-200 truncate">{c.name}</span>
                  {c.is_route_handler && (
                    <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      HTTP
                    </span>
                  )}
                </div>
                <p className="text-[11px] font-mono text-slate-500 truncate">{c.relative_path}:{c.line_number}</p>
              </div>
            ))}
          </div>

          {/* Right Execution Playback View */}
          <div className="flex-1 flex flex-col overflow-hidden bg-slate-900/30">
            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400"></div>
                <span className="text-xs font-mono text-slate-400">Tracer synthesizing execution frames...</span>
              </div>
            ) : trace && currentStep ? (
              <>
                {/* Step Header */}
                <div className="p-5 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between font-mono text-xs">
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                      Step {currentStep.step_number} of {trace.total_steps}
                    </span>
                    <span className="text-slate-300 font-bold text-sm">{currentStep.symbol_name}</span>
                  </div>
                  <span className="text-slate-400 text-[11px]">
                    Call Depth: {currentStep.call_depth} • Action: <strong className="text-amber-300">{currentStep.action_type}</strong>
                  </span>
                </div>

                {/* Step Details Body */}
                <div className="flex-1 p-6 overflow-y-auto space-y-5">
                  {/* Step Explanation */}
                  <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1.5">
                    <span className="text-xs font-bold text-slate-200 font-mono flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-amber-400" />
                      Runtime Step Context
                    </span>
                    <p className="text-xs text-slate-300 leading-relaxed font-sans">{currentStep.explanation}</p>
                  </div>

                  {/* Code Line Expression */}
                  <div className="space-y-2">
                    <span className="text-xs font-mono text-slate-400">Expression Coordinate: `{currentStep.relative_path}:{currentStep.line_number}`</span>
                    <pre className="p-4 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-amber-300">
                      {currentStep.expression_snippet}
                    </pre>
                  </div>

                  {/* State Payload Snapshot */}
                  {currentStep.state_payload && Object.keys(currentStep.state_payload).length > 0 && (
                    <div className="space-y-2">
                      <span className="text-xs font-bold text-slate-300 font-mono">Frame State & Variable Bindings</span>
                      <pre className="p-4 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-cyan-300 overflow-x-auto">
                        {JSON.stringify(currentStep.state_payload, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>

                {/* Playback Controls Footer */}
                <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between font-mono text-xs">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentStepIndex((prev) => Math.max(0, prev - 1))}
                      disabled={currentStepIndex === 0}
                      className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 transition"
                    >
                      <SkipBack className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setIsPlaying(!isPlaying)}
                      className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold flex items-center gap-1.5 transition shadow-lg shadow-amber-900/30"
                    >
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      <span>{isPlaying ? 'Pause' : 'Play Flow'}</span>
                    </button>
                    <button
                      onClick={() => setCurrentStepIndex((prev) => Math.min(trace.steps.length - 1, prev + 1))}
                      disabled={currentStepIndex >= trace.steps.length - 1}
                      className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 transition"
                    >
                      <SkipForward className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Step Timeline Indicator */}
                  <div className="flex items-center gap-1">
                    {trace.steps?.map((_, idx) => (
                      <div
                        key={idx}
                        onClick={() => setCurrentStepIndex(idx)}
                        className={`w-4 h-2 rounded-full cursor-pointer transition ${
                          idx === currentStepIndex
                            ? 'bg-amber-400 scale-125'
                            : idx < currentStepIndex
                            ? 'bg-amber-600/70'
                            : 'bg-slate-800'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs font-mono">
                Select an entry point to simulate execution playback
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
