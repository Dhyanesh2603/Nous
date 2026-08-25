import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Code2,
  Zap,
  Sparkles,
  Layers,
  LayoutDashboard,
  Boxes,
  Network,
  ShieldAlert,
  Database,
  FileCheck2,
  Share2,
  Clock,
  GitPullRequest,
  ShieldCheck,
  FolderOpen,
  ArrowRight,
  Terminal,
  BookOpen,
} from 'lucide-react';
import type { SearchResultItem, SearchResponse, ViewMode } from '../../types';
import { searchCodebase } from '../../services/api';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectResult: (result: SearchResultItem) => void;
  onCalculateBlastRadius: (nodeId: string) => void;
  onNavigateScreen?: (screen: 'dashboard' | 'graph') => void;
  onViewModeChange?: (mode: ViewMode) => void;
  onOpenSecurity?: () => void;
  onOpenDatabase?: () => void;
  onOpenExport?: () => void;
  onOpenExecutiveReport?: () => void;
  onOpenPlatformDocs?: () => void;
  onOpenTimeMachine?: () => void;
  onOpenPRImpact?: () => void;
  onOpenRules?: () => void;
  onOpenIngest?: () => void;
}

interface CommandAction {
  id: string;
  category: 'Navigation' | 'Diagnostics' | 'Export' | 'Repository' | 'Documentation';
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  action: () => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  onSelectResult,
  onCalculateBlastRadius,
  onNavigateScreen,
  onViewModeChange,
  onOpenSecurity,
  onOpenDatabase,
  onOpenExport,
  onOpenExecutiveReport,
  onOpenPlatformDocs,
  onOpenTimeMachine,
  onOpenPRImpact,
  onOpenRules,
  onOpenIngest,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedKind, setSelectedKind] = useState<string | undefined>(undefined);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Command palette actions catalog
  const commandActions: CommandAction[] = [
    {
      id: 'view_dashboard',
      category: 'Navigation',
      title: 'Switch to Repository Dashboard',
      subtitle: 'Overview telemetry and diagnostic matrix',
      icon: LayoutDashboard,
      iconBg: 'bg-cyan-500/10',
      iconColor: 'text-cyan-400',
      action: () => {
        onNavigateScreen?.('dashboard');
        onClose();
      },
    },
    {
      id: 'view_frontend',
      category: 'Navigation',
      title: 'Switch to Frontend Architecture Lens',
      subtitle: 'Isolate React/Vue/Svelte UI components and routes',
      icon: Layers,
      iconBg: 'bg-purple-500/10',
      iconColor: 'text-purple-400',
      action: () => {
        onNavigateScreen?.('graph');
        onViewModeChange?.('frontend');
        onClose();
      },
    },
    {
      id: 'view_backend',
      category: 'Navigation',
      title: 'Switch to Backend Architecture Lens',
      subtitle: 'Isolate controllers, routes, services & repositories',
      icon: Network,
      iconBg: 'bg-indigo-500/10',
      iconColor: 'text-indigo-400',
      action: () => {
        onNavigateScreen?.('graph');
        onViewModeChange?.('backend');
        onClose();
      },
    },
    {
      id: 'view_modules',
      category: 'Navigation',
      title: 'Switch to Module Community View',
      subtitle: 'Clustered architectural subsystem boundaries',
      icon: Boxes,
      iconBg: 'bg-emerald-500/10',
      iconColor: 'text-emerald-400',
      action: () => {
        onNavigateScreen?.('graph');
        onViewModeChange?.('module');
        onClose();
      },
    },
    {
      id: 'view_callgraph',
      category: 'Navigation',
      title: 'Switch to Symbol Call Graph',
      subtitle: 'Function and method cross-invocation hierarchy',
      icon: Code2,
      iconBg: 'bg-amber-500/10',
      iconColor: 'text-amber-400',
      action: () => {
        onNavigateScreen?.('graph');
        onViewModeChange?.('symbol');
        onClose();
      },
    },
    {
      id: 'action_audit_report',
      category: 'Diagnostics',
      title: 'Open Executive Architecture Audit Report',
      subtitle: 'Health scorecard, SAST security & technical debt summary',
      icon: FileCheck2,
      iconBg: 'bg-emerald-500/10',
      iconColor: 'text-emerald-400',
      action: () => {
        onOpenExecutiveReport?.();
        onClose();
      },
    },
    {
      id: 'action_docs',
      category: 'Documentation',
      title: 'Open Platform Documentation & User Manual',
      subtitle: 'Complete architecture guide, 20 tools walkthrough & API reference',
      icon: BookOpen,
      iconBg: 'bg-indigo-500/10',
      iconColor: 'text-indigo-400',
      action: () => {
        onOpenPlatformDocs?.();
        onClose();
      },
    },
    {
      id: 'action_export',
      category: 'Export',
      title: 'Export Architecture Diagram & Code',
      subtitle: 'Generate high-res PNG, SVG, or Mermaid.js markdown',
      icon: Share2,
      iconBg: 'bg-cyan-500/10',
      iconColor: 'text-cyan-400',
      action: () => {
        onOpenExport?.();
        onClose();
      },
    },
    {
      id: 'action_security',
      category: 'Diagnostics',
      title: 'Open Security & SAST Audit',
      subtitle: 'Static vulnerability scanner and secret leak audit',
      icon: ShieldAlert,
      iconBg: 'bg-rose-500/10',
      iconColor: 'text-rose-400',
      action: () => {
        onOpenSecurity?.();
        onClose();
      },
    },
    {
      id: 'action_database',
      category: 'Diagnostics',
      title: 'Open Database Schema & ERD',
      subtitle: 'Relational entity models and table diagram',
      icon: Database,
      iconBg: 'bg-blue-500/10',
      iconColor: 'text-blue-400',
      action: () => {
        onOpenDatabase?.();
        onClose();
      },
    },
    {
      id: 'action_timemachine',
      category: 'Diagnostics',
      title: 'Launch Repository Time Machine',
      subtitle: 'Commit-by-commit architectural evolution playback',
      icon: Clock,
      iconBg: 'bg-purple-500/10',
      iconColor: 'text-purple-400',
      action: () => {
        onOpenTimeMachine?.();
        onClose();
      },
    },
    {
      id: 'action_pr_impact',
      category: 'Diagnostics',
      title: 'Run PR Blast Radius Impact Simulator',
      subtitle: 'Predict downstream breakage of proposed changes',
      icon: GitPullRequest,
      iconBg: 'bg-rose-500/10',
      iconColor: 'text-rose-400',
      action: () => {
        onOpenPRImpact?.();
        onClose();
      },
    },
    {
      id: 'action_rules',
      category: 'Diagnostics',
      title: 'Open Architecture Boundary Rules',
      subtitle: 'Enforce clean architecture layer constraints',
      icon: ShieldCheck,
      iconBg: 'bg-emerald-500/10',
      iconColor: 'text-emerald-400',
      action: () => {
        onOpenRules?.();
        onClose();
      },
    },
    {
      id: 'action_ingest',
      category: 'Repository',
      title: 'Open / Switch Repository...',
      subtitle: 'Load local folder, clone Git URL, or upload ZIP',
      icon: FolderOpen,
      iconBg: 'bg-cyan-500/10',
      iconColor: 'text-cyan-400',
      action: () => {
        onOpenIngest?.();
        onClose();
      },
    },
  ];

  const isCommandMode = query.startsWith('>') || !query.trim();
  const cleanCmdQuery = query.startsWith('>') ? query.slice(1).trim().toLowerCase() : query.trim().toLowerCase();

  const filteredCommands = isCommandMode && cleanCmdQuery
    ? commandActions.filter(
        (c) =>
          c.title.toLowerCase().includes(cleanCmdQuery) ||
          c.subtitle.toLowerCase().includes(cleanCmdQuery) ||
          c.category.toLowerCase().includes(cleanCmdQuery)
      )
    : commandActions;

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Debounced search query for symbols
  useEffect(() => {
    if (!query.trim() || query.startsWith('>')) {
      setResults([]);
      return;
    }

    const timer = setTimeout(() => {
      setIsLoading(true);
      searchCodebase(query, 20, selectedKind)
        .then((res: SearchResponse) => {
          setResults(res.results || []);
          setSelectedIndex(0);
        })
        .catch((err: unknown) => console.error('Search failed:', err))
        .finally(() => setIsLoading(false));
    }, 150);

    return () => clearTimeout(timer);
  }, [query, selectedKind]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const totalItems = isCommandMode && !query.trim() ? filteredCommands.length : results.length;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < totalItems - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (isCommandMode && !query.trim()) {
        filteredCommands[selectedIndex]?.action();
      } else if (results[selectedIndex]) {
        onSelectResult(results[selectedIndex]);
        onClose();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-start justify-center pt-16 p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col font-sans"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Command Search Bar */}
        <div className="p-4 border-b border-slate-800 flex items-center gap-3 bg-slate-950/50">
          <Terminal className="w-5 h-5 text-cyan-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a symbol, file, or '>' for actions (e.g. 'Auth', '> export', '> audit')..."
            className="flex-1 bg-transparent text-sm text-slate-100 placeholder-slate-500 outline-none font-mono"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded text-slate-400 hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400 font-mono border border-slate-700">
            ESC
          </kbd>
        </div>

        {/* Content Mode: Quick Actions OR Symbol Results */}
        {(!query.trim() || query.startsWith('>')) ? (
          <div className="max-h-[26rem] overflow-y-auto p-2 space-y-1">
            <div className="px-3 py-1.5 text-[11px] font-mono font-bold text-slate-500 uppercase tracking-wider">
              Quick Actions & Navigation ({filteredCommands.length})
            </div>
            {filteredCommands.map((cmd, idx) => {
              const Icon = cmd.icon;
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={cmd.id}
                  onClick={cmd.action}
                  className={`p-2.5 rounded-xl cursor-pointer transition border flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-slate-800/90 border-cyan-500/50 text-slate-100 shadow-md'
                      : 'bg-slate-900/40 border-transparent text-slate-300 hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-2 rounded-xl ${cmd.iconBg} ${cmd.iconColor} border border-slate-700/50 flex-shrink-0`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-100">{cmd.title}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700/60">
                          {cmd.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate">{cmd.subtitle}</p>
                    </div>
                  </div>
                  <ArrowRight className={`w-4 h-4 flex-shrink-0 transition ${isSelected ? 'text-cyan-400 translate-x-0.5' : 'text-slate-600'}`} />
                </div>
              );
            })}
          </div>
        ) : (
          <>
            {/* Filter Pills for Symbol Search */}
            <div className="px-4 py-2 border-b border-slate-800/80 bg-slate-950/20 flex items-center gap-2 text-xs font-mono">
              <span className="text-slate-500 text-[11px]">Symbol Kind:</span>
              {['all', 'function', 'class', 'method', 'interface'].map((kind) => {
                const isSelected = (kind === 'all' && !selectedKind) || selectedKind === kind;
                return (
                  <button
                    key={kind}
                    onClick={() => setSelectedKind(kind === 'all' ? undefined : kind)}
                    className={`px-2.5 py-0.5 rounded-full capitalize transition ${
                      isSelected
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold'
                        : 'text-slate-400 hover:text-slate-200 border border-transparent'
                    }`}
                  >
                    {kind}
                  </button>
                );
              })}
            </div>

            {/* Results List */}
            <div className="max-h-[24rem] overflow-y-auto p-2 space-y-1">
              {isLoading ? (
                <div className="p-8 text-center text-slate-500 text-xs font-mono">
                  Searching AST & Reciprocal Rank Fusion index...
                </div>
              ) : results.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs font-mono">
                  No matching symbols or AST chunks found for &quot;{query}&quot;.
                </div>
              ) : (
                results.map((result, idx) => {
                  const isSelected = idx === selectedIndex;
                  return (
                    <div
                      key={result.id}
                      onClick={() => {
                        onSelectResult(result);
                        onClose();
                      }}
                      className={`p-3 rounded-xl cursor-pointer transition border flex items-start justify-between gap-3 ${
                        isSelected
                          ? 'bg-slate-800/90 border-cyan-500/50 text-slate-100 shadow-md'
                          : 'bg-slate-900/40 border-transparent text-slate-300 hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 mt-0.5 flex-shrink-0">
                          {result.symbol_kind === 'class' ? (
                            <Layers className="w-4 h-4" />
                          ) : (
                            <Code2 className="w-4 h-4" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-slate-100 font-mono truncate">
                              {result.symbol_name || result.relative_path}
                            </span>
                            {result.symbol_kind && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono uppercase bg-slate-800 text-cyan-400 border border-slate-700">
                                {result.symbol_kind}
                              </span>
                            )}
                            <span className="text-[10px] font-mono text-slate-500">
                              {result.match_type} match
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 font-mono truncate mt-0.5">
                            {result.relative_path}:{result.start_line}
                          </p>
                          {result.matched_snippet && (
                            <pre className="mt-1.5 p-2 bg-slate-950 rounded text-[11px] text-slate-300 font-mono overflow-x-auto border border-slate-800/60 max-h-20">
                              <code>{result.matched_snippet}</code>
                            </pre>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onCalculateBlastRadius(result.node_id);
                            onClose();
                          }}
                          className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/20 transition border border-rose-500/30"
                          title="Calculate Blast Radius"
                        >
                          <Zap className="w-3.5 h-3.5 fill-current" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}

        {/* Footer shortcuts */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/50 text-[11px] font-mono text-slate-500 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Execute / Inspect</span>
            <span>ESC Close</span>
          </div>
          <div className="flex items-center gap-1 text-cyan-400">
            <Sparkles className="w-3 h-3" />
            <span>Omni-Command Palette & AST Index</span>
          </div>
        </div>
      </div>
    </div>
  );
};
