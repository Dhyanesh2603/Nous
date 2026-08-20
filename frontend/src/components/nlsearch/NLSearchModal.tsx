import React, { useState } from 'react';
import {
  Sparkles,
  X,
  Search,
  CheckCircle2,
} from 'lucide-react';
import type { NLSearchReport, NLSearchResult } from '../../types';
import { searchNaturalLanguage } from '../../services/api';

interface NLSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSymbol?: (symbolId: string) => void;
}

export const NLSearchModal: React.FC<NLSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectSymbol,
}) => {
  const [query, setQuery] = useState('');
  const [report, setReport] = useState<NLSearchReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedResult, setSelectedResult] = useState<NLSearchResult | null>(null);

  const sampleQueries = [
    'Where is user authentication and JWT validation handled?',
    'Show me all database query operations and data models',
    'Find HTTP REST API route handlers and controllers',
    'Where is business logic and service orchestration defined?',
  ];

  const handleSearch = (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    searchNaturalLanguage(q)
      .then((res) => {
        setReport(res);
        if (res?.results?.length) {
          setSelectedResult(res.results[0]);
        } else {
          setSelectedResult(null);
        }
      })
      .catch((err) => console.error('Failed NL search:', err))
      .finally(() => setLoading(false));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl overflow-hidden font-sans">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-100">Natural Language Code Search</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                  Semantic AST Query Engine
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Ask natural questions about authentication, database queries, business workflows, and APIs.
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

        {/* Search Input Bar */}
        <div className="p-4 bg-slate-950/40 border-b border-slate-800 space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Ask a question about the codebase (e.g., 'where is token validation logic?')..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch(query)}
                className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500/50 font-mono"
              />
            </div>
            <button
              onClick={() => handleSearch(query)}
              disabled={loading || !query.trim()}
              className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold text-xs font-mono transition"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>

          {/* Prompt Chips */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
            <span className="text-slate-500 text-[10px] uppercase mr-1">Suggested Prompts:</span>
            {sampleQueries.map((sq, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setQuery(sq);
                  handleSearch(sq);
                }}
                className="px-2.5 py-0.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-[11px] text-slate-300 border border-slate-700/60 transition"
              >
                {sq}
              </button>
            ))}
          </div>
        </div>

        {/* Intent Badge Strip */}
        {report && (
          <div className="px-6 py-2 bg-slate-950/70 border-b border-slate-800 flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 uppercase text-[10px]">Detected Intent:</span>
              <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 font-bold">
                {report.detected_intent}
              </span>
            </div>
            <span className="text-slate-400 text-[11px]">Found {report.total_results} matching code locations</span>
          </div>
        )}

        {/* Main Body */}
        <div className="flex-1 flex overflow-hidden">
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
              <span className="text-xs font-mono text-slate-400">Evaluating intent semantics & ranking AST symbols...</span>
            </div>
          ) : !report ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 text-slate-500 text-xs font-mono">
              Enter a query or select a prompt above to search code semantics
            </div>
          ) : report.results.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 text-slate-500 text-xs font-mono">
              No matching symbols found for this query
            </div>
          ) : (
            <>
              {/* Left Results List */}
              <div className="w-80 border-r border-slate-800 overflow-y-auto divide-y divide-slate-800/60 bg-slate-950/20">
                {report.results.map((r) => (
                  <div
                    key={r.id}
                    onClick={() => setSelectedResult(r)}
                    className={`p-3.5 cursor-pointer transition flex flex-col gap-1 ${
                      selectedResult?.id === r.id
                        ? 'bg-cyan-500/10 border-l-2 border-cyan-400'
                        : 'hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center justify-between font-mono text-xs">
                      <span className="font-bold text-slate-200 truncate">{r.symbol_name}</span>
                      <span className="text-cyan-300 font-bold">{r.match_score}%</span>
                    </div>
                    <p className="text-[11px] font-mono text-slate-500 truncate">{r.relative_path}:{r.line_number}</p>
                    <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">{r.explanation}</p>
                  </div>
                ))}
              </div>

              {/* Right Detail Pane */}
              <div className="flex-1 p-6 overflow-y-auto space-y-6 bg-slate-900/30">
                {selectedResult ? (
                  <>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3
                            onClick={() => selectedResult.id && onSelectSymbol?.(selectedResult.id.replace('nl_', ''))}
                            className={`text-lg font-bold font-mono ${onSelectSymbol ? 'text-cyan-300 hover:underline cursor-pointer' : 'text-white'}`}
                          >
                            {selectedResult.symbol_name}
                          </h3>
                          <span className="px-2 py-0.5 text-xs font-mono rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                            {selectedResult.match_score}% Match
                          </span>
                        </div>
                        <p className="text-xs font-mono text-slate-400 mt-1">
                          Defined in `{selectedResult.relative_path}:{selectedResult.line_number}`
                        </p>
                      </div>
                    </div>

                    {/* Explanation Box */}
                    <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
                      <span className="text-xs font-bold text-slate-200 font-mono flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        Relevance Rationale
                      </span>
                      <p className="text-xs text-slate-300 leading-relaxed font-sans">{selectedResult.explanation}</p>
                    </div>

                    {/* Code Snippet */}
                    {selectedResult.code_snippet && (
                      <div className="space-y-2">
                        <span className="text-xs font-bold text-slate-300 font-mono">Code Implementation Context</span>
                        <pre className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-cyan-200 overflow-x-auto leading-relaxed">
                          {selectedResult.code_snippet}
                        </pre>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-500 text-xs font-mono">
                    Select a search match to inspect code details
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
