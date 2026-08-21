import React, { useState, useEffect } from 'react';
import {
  TestTube2,
  X,
  Copy,
  Check,
  Sparkles,
} from 'lucide-react';
import type { TestAdvisorReport, UntestedFunctionItem } from '../../types';
import { fetchTestAdvice } from '../../services/api';

interface TestAdvisorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRepoPath?: string;
  onSelectSymbol?: (symbolId: string) => void;
}

export const TestAdvisorModal: React.FC<TestAdvisorModalProps> = ({
  isOpen,
  onClose,
  currentRepoPath,
  onSelectSymbol,
}) => {
  const [report, setReport] = useState<TestAdvisorReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<UntestedFunctionItem | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetchTestAdvice()
        .then((res) => {
          setReport(res);
          if (res?.untested_candidates?.length) {
            setSelectedCandidate(res.untested_candidates[0]);
          }
        })
        .catch((err) => console.error('Failed to load test advice:', err))
        .finally(() => setLoading(false));
    }
  }, [isOpen, currentRepoPath]);

  const handleCopyStub = () => {
    if (selectedCandidate) {
      navigator.clipboard.writeText(selectedCandidate.suggested_test_stub);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-6xl h-[88vh] flex flex-col shadow-2xl overflow-hidden font-sans">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <TestTube2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-100">Intelligent Test Advisor & Stub Synthesizer</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                  Unit Test Coverage Generator
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Identifies high-risk, high-complexity functions lacking unit tests and generates ready-to-run test stubs.
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-950/40 border-b border-slate-800 font-mono text-xs">
          <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl">
            <span className="text-slate-500 text-[10px] uppercase block">Untested High-Risk Functions</span>
            <span className="text-base font-bold text-amber-300">{report?.total_untested_functions || 0}</span>
          </div>
          <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl">
            <span className="text-slate-500 text-[10px] uppercase block">Critical Priority Tier</span>
            <span className="text-base font-bold text-red-400">{report?.critical_untested_count || 0}</span>
          </div>
          <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl">
            <span className="text-slate-500 text-[10px] uppercase block">High Priority Tier</span>
            <span className="text-base font-bold text-rose-300">{report?.high_untested_count || 0}</span>
          </div>
          <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl">
            <span className="text-slate-500 text-[10px] uppercase block">Avg Test Gap Risk</span>
            <span className="text-base font-bold text-cyan-300">{report?.average_test_gap_score || 0}%</span>
          </div>
        </div>

        {/* Main Body */}
        <div className="flex-1 flex overflow-hidden">
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400"></div>
              <span className="text-xs font-mono text-slate-400">Evaluating call graph dependencies & synthesizing test stubs...</span>
            </div>
          ) : (
            <>
              {/* Left Candidates List */}
              <div className="w-80 border-r border-slate-800 overflow-y-auto divide-y divide-slate-800/60 bg-slate-950/20">
                {report?.untested_candidates?.map((cand) => (
                  <div
                    key={cand.id}
                    onClick={() => setSelectedCandidate(cand)}
                    className={`p-3.5 cursor-pointer transition flex flex-col gap-1.5 ${
                      selectedCandidate?.id === cand.id
                        ? 'bg-emerald-500/10 border-l-2 border-emerald-400'
                        : 'hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center justify-between font-mono text-xs">
                      <span className="font-bold text-slate-200 truncate">{cand.symbol_name}</span>
                      <span className={`px-2 py-0.5 text-[10px] rounded font-bold ${
                        cand.risk_tier === 'Critical'
                          ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                          : cand.risk_tier === 'High'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      }`}>
                        {cand.risk_tier}
                      </span>
                    </div>
                    <p className="text-[11px] font-mono text-slate-500 truncate">{cand.relative_path}:{cand.line_number}</p>
                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mt-0.5">
                      <span>v(G)={cand.cyclomatic_complexity} • {cand.in_degree_callers_count} callers</span>
                      <span className="text-emerald-400 font-bold">~{cand.estimated_test_writing_mins}m</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Right Detail & Code Stub Pane */}
              <div className="flex-1 flex flex-col overflow-hidden bg-slate-900/30">
                {selectedCandidate ? (
                  <>
                    <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3
                            onClick={() => selectedCandidate.id && onSelectSymbol?.(selectedCandidate.id.replace('test_cand_', ''))}
                            className={`text-base font-bold font-mono ${onSelectSymbol ? 'text-emerald-300 hover:underline cursor-pointer' : 'text-white'}`}
                          >
                            {selectedCandidate.symbol_name}
                          </h3>
                          <span className="px-2 py-0.5 text-xs font-mono rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                            {selectedCandidate.recommended_framework}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1 font-sans">{selectedCandidate.reason_for_testing}</p>
                      </div>
                      <button
                        onClick={handleCopyStub}
                        className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-mono text-white flex items-center gap-1.5 transition shadow-lg shadow-emerald-900/20"
                      >
                        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copied ? 'Copied Test Stub' : 'Copy Test Code'}</span>
                      </button>
                    </div>

                    {/* Test Code Stub */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-3">
                      <span className="text-xs font-bold text-slate-300 font-mono flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-emerald-400" />
                        Generated Unit Test Stub
                      </span>
                      <pre className="p-5 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-emerald-300 whitespace-pre-wrap leading-relaxed">
                        {selectedCandidate.suggested_test_stub}
                      </pre>
                    </div>
                  </>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-500 text-xs font-mono">
                    Select a function to generate and preview unit test stubs
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
