import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  X,
  Send,
  Workflow,
  Copy,
  Check,
  Code2,
  Cpu,
  Layers,
  HelpCircle,
} from 'lucide-react';
import type { ArchitectAIResponse, AIProviderStatus } from '../../types';
import {
  fetchArchitectAIQuery,
  fetchAIStatus,
  fetchSuggestedAIQuestions,
} from '../../services/api';

interface ArchitectAIModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
  focusNodeId?: string;
  onSelectNode?: (nodeId: string) => void;
}

export const ArchitectAIModal: React.FC<ArchitectAIModalProps> = ({
  isOpen,
  onClose,
  initialQuery,
  focusNodeId,
  onSelectNode,
}) => {
  const [query, setQuery] = useState(initialQuery || '');
  const [response, setResponse] = useState<ArchitectAIResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [aiStatus, setAiStatus] = useState<AIProviderStatus | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      // Load AI providers & suggested questions
      fetchAIStatus()
        .then((res) => {
          setAiStatus(res);
          setSelectedProvider(res.active_default || 'offline');
        })
        .catch((err) => console.error('Failed to fetch AI status:', err));

      fetchSuggestedAIQuestions()
        .then((res) => setSuggestedQuestions(res.questions || []))
        .catch((err) => console.error('Failed to fetch suggested questions:', err));

      if (initialQuery) {
        setQuery(initialQuery);
        handleExecuteQuery(initialQuery);
      } else if (focusNodeId) {
        const defaultQ = `Explain the architecture role and dependencies of ${focusNodeId}`;
        setQuery(defaultQ);
        handleExecuteQuery(defaultQ, focusNodeId);
      }
    }
  }, [isOpen, initialQuery, focusNodeId]);

  const handleExecuteQuery = async (queryText: string, nodeFocus?: string) => {
    if (!queryText.trim()) return;
    setLoading(true);
    try {
      const res = await fetchArchitectAIQuery(
        queryText.trim(),
        selectedProvider || undefined,
        undefined,
        nodeFocus || focusNodeId
      );
      setResponse(res);
    } catch (err) {
      console.error('Failed to execute Architect AI query:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyMermaid = () => {
    if (response?.sequence_diagram) {
      navigator.clipboard.writeText(response.sequence_diagram);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-6xl h-[90vh] flex flex-col shadow-2xl overflow-hidden font-sans">
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-100">Architect AI</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                  Graph-RAG Engine
                </span>
                {response?.is_fallback ? (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                    Deterministic AST Engine
                  </span>
                ) : response?.provider ? (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/30">
                    {response.provider.toUpperCase()} ({response.model})
                  </span>
                ) : null}
              </div>
              <p className="text-xs text-slate-400">
                Grounded cross-file architecture intelligence, verified execution pathways, and live sequence flow.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Provider Selector Dropdown */}
            {aiStatus && (
              <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800 text-xs font-mono text-slate-300">
                <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                <select
                  value={selectedProvider}
                  onChange={(e) => setSelectedProvider(e.target.value)}
                  className="bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer"
                >
                  <option value="offline" className="bg-slate-900 text-slate-200">
                    Deterministic AST Engine (Offline)
                  </option>
                  {aiStatus.providers.openai?.available && (
                    <option value="openai" className="bg-slate-900 text-slate-200">
                      OpenAI (GPT-4o-mini)
                    </option>
                  )}
                  {aiStatus.providers.anthropic?.available && (
                    <option value="anthropic" className="bg-slate-900 text-slate-200">
                      Anthropic (Claude 3.5)
                    </option>
                  )}
                  {aiStatus.providers.gemini?.available && (
                    <option value="gemini" className="bg-slate-900 text-slate-200">
                      Google Gemini (1.5 Flash)
                    </option>
                  )}
                  {aiStatus.providers.ollama?.available && (
                    <option value="ollama" className="bg-slate-900 text-slate-200">
                      Local Ollama (llama3.2)
                    </option>
                  )}
                </select>
              </div>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Query Input Section */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/40 space-y-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleExecuteQuery(query);
            }}
            className="flex items-center gap-2"
          >
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Ask anything about this architecture (e.g., 'How does user login work?', 'Trace API route to database')..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-4 pr-10 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-sans shadow-inner"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-lg shadow-cyan-900/20 flex-shrink-0 font-mono"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span>Analyze</span>
            </button>
          </form>

          {/* Suggested Question Prompt Pills */}
          {suggestedQuestions.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] font-sans">
              <span className="text-slate-500 flex items-center gap-1 flex-shrink-0 mr-1 font-mono text-[10px]">
                <HelpCircle className="w-3 h-3 text-cyan-400" />
                Suggestions:
              </span>
              {suggestedQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setQuery(q);
                    handleExecuteQuery(q);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-cyan-500/20 hover:text-cyan-300 text-slate-300 border border-slate-700/60 hover:border-cyan-500/40 transition whitespace-nowrap flex-shrink-0"
                >
                  {q}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Main Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center gap-4 py-16">
              <div className="relative">
                <div className="w-12 h-12 border-4 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin"></div>
                <Sparkles className="w-5 h-5 text-cyan-400 absolute inset-0 m-auto animate-pulse" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-xs font-bold text-slate-200 font-mono">
                  Traversing AST Symbol Tables & Call Hierarchy...
                </p>
                <p className="text-[11px] text-slate-500 font-sans">
                  Extracting grounded cross-file graph context and synthesizing sequence pathways.
                </p>
              </div>
            </div>
          ) : !response ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto py-12 space-y-3">
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-cyan-400">
                <Workflow className="w-8 h-8" />
              </div>
              <h3 className="text-sm font-bold text-slate-200 font-sans">
                Ask Architect AI About This Repository
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                Type a question above or click any suggestion to extract deterministic call flows, execution pathways, and architecture diagrams directly from AST syntax trees.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 font-sans">
              {/* Left Column: Narrative, Execution Steps & Observations (7 Cols) */}
              <div className="lg:col-span-7 space-y-6">
                {/* Executive Summary Card */}
                <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                    <span className="text-xs font-bold font-mono text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      Architectural Explanation
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      100% Grounded in AST
                    </span>
                  </div>
                  <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap font-sans space-y-2">
                    {response.summary}
                  </div>
                </div>

                {/* Step-by-Step Execution Flow Cards */}
                {response.execution_steps.length > 0 && (
                  <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                    <span className="text-xs font-bold font-mono text-slate-200 uppercase tracking-wider block">
                      Step-by-Step Call Pipeline
                    </span>
                    <div className="space-y-2">
                      {response.execution_steps.map((step, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/80 text-xs text-slate-300"
                        >
                          <span className="px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-[10px] font-mono font-bold flex-shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <span className="leading-relaxed font-sans">{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Architectural Observations */}
                {response.architectural_observations.length > 0 && (
                  <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/30 space-y-2">
                    <span className="text-[11px] font-bold font-mono text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5" />
                      Structural Observations
                    </span>
                    <ul className="text-xs text-slate-300 space-y-1 list-disc pl-4 font-sans">
                      {response.architectural_observations.map((obs, i) => (
                        <li key={i}>{obs}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Right Column: Live Sequence Flow & Referenced Symbols (5 Cols) */}
              <div className="lg:col-span-5 space-y-6">
                {/* Sequence Flowchart Card */}
                {response.sequence_diagram && (
                  <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                      <span className="text-xs font-bold font-mono text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                        <Workflow className="w-3.5 h-3.5 text-cyan-400" />
                        Sequence Diagram
                      </span>
                      <button
                        onClick={handleCopyMermaid}
                        className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-mono text-slate-300 transition"
                        title="Copy Mermaid.js Markdown"
                      >
                        {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copied ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>

                    <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto font-mono text-[11px] text-cyan-300 leading-relaxed whitespace-pre">
                      {response.sequence_diagram}
                    </div>
                  </div>
                )}

                {/* Referenced Files & Symbols */}
                <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                  <span className="text-xs font-bold font-mono text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Code2 className="w-3.5 h-3.5 text-purple-400" />
                    Referenced Codebase Entities ({response.referenced_symbols.length})
                  </span>

                  <div className="space-y-1.5 max-h-60 overflow-y-auto font-mono text-xs">
                    {response.referenced_symbols.map((sym, idx) => (
                      <div
                        key={idx}
                        onClick={() => onSelectNode?.(sym.file_path)}
                        className="p-2 rounded-lg bg-slate-900/90 border border-slate-800/90 hover:border-cyan-500/50 hover:bg-slate-800 text-left transition flex items-center justify-between cursor-pointer group"
                      >
                        <div className="truncate pr-2">
                          <div className="font-bold text-slate-200 group-hover:text-cyan-300 truncate">
                            {sym.name}
                          </div>
                          <div className="text-[10px] text-slate-500 truncate">
                            {sym.file_path}:{sym.start_line}
                          </div>
                        </div>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/30 flex-shrink-0">
                          {sym.kind}
                        </span>
                      </div>
                    ))}

                    {response.referenced_symbols.length === 0 && (
                      <div className="text-xs text-slate-500 font-sans italic py-2">
                        Files analyzed: {response.referenced_files.join(', ')}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
