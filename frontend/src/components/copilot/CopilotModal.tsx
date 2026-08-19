import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Send,
  FileText,
  Compass,
  CheckCircle2,
  FileCode,
  Copy,
  Check,
  RotateCcw,
} from 'lucide-react';
import {
  queryCopilot,
  fetchOnboardingRoadmap,
  fetchGeneratedDocs,
} from '../../services/api';
import type { CopilotAnswer, OnboardingRoadmap } from '../../types';

interface CopilotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFile?: (file: string) => void;
  currentRepoPath?: string;
}

export const CopilotModal: React.FC<CopilotModalProps> = ({
  isOpen,
  onClose,
  onSelectFile,
  currentRepoPath,
}) => {
  const [activeTab, setActiveTab] = useState<'chat' | 'onboarding' | 'docs'>('chat');
  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string; answer?: CopilotAnswer }>>([]);
  const [onboarding, setOnboarding] = useState<OnboardingRoadmap | null>(null);
  const [docsMarkdown, setDocsMarkdown] = useState<string>('');
  const [copiedDocs, setCopiedDocs] = useState(false);

  // When repo changes or modal opens, reset and load fresh data for active repository
  useEffect(() => {
    setMessages([]);
    setInputQuery('');
    setOnboarding(null);
    setDocsMarkdown('');
  }, [currentRepoPath]);

  useEffect(() => {
    if (!isOpen) return;

    // Load fresh onboarding roadmap and generated docs for the active repo
    fetchOnboardingRoadmap()
      .then((res: OnboardingRoadmap) => setOnboarding(res))
      .catch((err: unknown) => console.error('Onboarding load error:', err));

    fetchGeneratedDocs()
      .then((res) => setDocsMarkdown(res.documentation_markdown))
      .catch((err: unknown) => console.error('Docs load error:', err));
  }, [isOpen, currentRepoPath]);

  if (!isOpen) return null;

  const handleSendQuery = async (queryText: string) => {
    const q = queryText.trim();
    if (!q) return;

    setMessages((prev) => [...prev, { role: 'user', text: q }]);
    setInputQuery('');
    setLoading(true);

    try {
      const answer = await queryCopilot(q);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: answer.markdown_response, answer },
      ]);
    } catch (err: unknown) {
      console.error('Copilot query error:', err);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: 'Error querying codebase intelligence engine.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    setInputQuery('');
  };

  const handleCopyDocs = () => {
    navigator.clipboard.writeText(docsMarkdown);
    setCopiedDocs(true);
    setTimeout(() => setCopiedDocs(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl h-[88vh] flex flex-col shadow-2xl overflow-hidden font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-100">AI Repository Copilot & Reasoning</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                  Local AST Knowledge Graph
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Reason over architecture, generate onboarding roadmaps, and query implementation details.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-950 rounded-lg p-0.5 border border-slate-800 text-xs font-mono">
              <button
                onClick={() => setActiveTab('chat')}
                className={`px-3 py-1 rounded-md transition flex items-center gap-1.5 ${
                  activeTab === 'chat'
                    ? 'bg-cyan-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                Repository Q&A
              </button>
              <button
                onClick={() => setActiveTab('onboarding')}
                className={`px-3 py-1 rounded-md transition flex items-center gap-1.5 ${
                  activeTab === 'onboarding'
                    ? 'bg-cyan-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                Onboarding Guide
              </button>
              <button
                onClick={() => setActiveTab('docs')}
                className={`px-3 py-1 rounded-md transition flex items-center gap-1.5 ${
                  activeTab === 'docs'
                    ? 'bg-cyan-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                Auto Docs
              </button>
            </div>

            {activeTab === 'chat' && messages.length > 0 && (
              <button
                onClick={handleClearChat}
                title="Reset / Clear Chat"
                className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        {activeTab === 'chat' ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 font-mono text-xs">
              {messages.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-4 max-w-lg mx-auto">
                  <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                    <Sparkles className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-200">Ask Nous Copilot Anything</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Reason over software architecture, find implementations, inspect authentication lifecycle, and detect dead logic.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 justify-center pt-2">
                    {[
                      'Explain architecture and folder structure',
                      'Show authentication & JWT flow',
                      'Find dead code & unused exports',
                      'Where are API endpoints handled?',
                    ].map((prompt, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendQuery(prompt)}
                        className="px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-cyan-500/50 text-slate-300 hover:text-cyan-300 text-[11px] transition text-left"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((m, idx) => (
                  <div
                    key={idx}
                    className={`flex flex-col ${
                      m.role === 'user' ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div
                      className={`max-w-3xl p-4 rounded-2xl ${
                        m.role === 'user'
                          ? 'bg-cyan-600/90 text-white rounded-br-none'
                          : 'bg-slate-950/80 border border-slate-800 text-slate-200 rounded-bl-none'
                      }`}
                    >
                      <div className="whitespace-pre-wrap leading-relaxed font-sans text-xs">
                        {m.text}
                      </div>

                      {/* Cited files & symbols */}
                      {m.answer && (
                        <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-2 font-mono text-[11px]">
                          {m.answer.cited_files.length > 0 && (
                            <div className="flex items-center gap-1.5 flex-wrap text-slate-400">
                              <span className="text-cyan-400 font-semibold">Citations:</span>
                              {m.answer.cited_files.map((cf, i) => (
                                <span
                                  key={i}
                                  onClick={() => onSelectFile && onSelectFile(cf)}
                                  className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 cursor-pointer hover:border-cyan-500"
                                >
                                  {cf}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}

              {loading && (
                <div className="flex items-center gap-2 text-cyan-400 text-xs py-2">
                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-cyan-400"></div>
                  <span>Traversing Knowledge Graph & AST facts...</span>
                </div>
              )}
            </div>

            {/* Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendQuery(inputQuery);
              }}
              className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center gap-2"
            >
              <input
                type="text"
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                placeholder="Ask about architecture, services, database models, or logic..."
                className="flex-1 bg-slate-950 border border-slate-700/80 focus:border-cyan-500 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 font-mono outline-none"
              />
              <button
                type="submit"
                disabled={loading || !inputQuery.trim()}
                className="p-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white transition disabled:opacity-40"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        ) : activeTab === 'onboarding' ? (
          <div className="flex-1 overflow-y-auto p-6 space-y-5 font-mono text-xs">
            {onboarding && (
              <>
                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-100">{onboarding.repo_name} Onboarding Roadmap</h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Estimated reading roadmap: ~{onboarding.estimated_reading_time_minutes} minutes
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    {onboarding.primary_languages.map((l) => (
                      <span key={l} className="px-2 py-0.5 rounded bg-slate-800 text-cyan-300 text-[10px] uppercase">
                        {l}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  {onboarding.steps.map((step) => (
                    <div
                      key={step.step_number}
                      className="p-5 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-300 font-bold text-xs">
                          {step.step_number}
                        </div>
                        <h4 className="font-bold text-sm text-slate-200">{step.title}</h4>
                      </div>
                      <p className="text-slate-300 text-xs font-sans leading-relaxed">{step.description}</p>

                      <div className="space-y-1.5">
                        <span className="text-[10px] text-slate-500 uppercase font-semibold">Recommended Files:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {step.key_files.map((kf, i) => (
                            <span key={i} className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-cyan-300 flex items-center gap-1">
                              <FileCode className="w-3 h-3 text-cyan-400" />
                              {kf}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-800/80 text-[11px] text-emerald-300 font-sans flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                        <span><strong>Objective:</strong> {step.learning_goal}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-slate-400">
                Markdown documentation generated from AST facts & architectural clusters.
              </span>
              <button
                onClick={handleCopyDocs}
                className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-mono flex items-center gap-1.5 transition"
              >
                {copiedDocs ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedDocs ? 'Copied' : 'Copy Markdown'}</span>
              </button>
            </div>
            <pre className="p-5 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-mono text-slate-300 overflow-x-auto leading-relaxed max-h-[60vh]">
              <code>{docsMarkdown}</code>
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
