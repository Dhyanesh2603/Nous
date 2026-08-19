import React, { useState, useEffect } from 'react';
import {
  Brain,
  FolderGit2,
  Boxes,
  FileCode,
  Code2,
  Database,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Layers,
  Workflow,
  Files,
  ArrowRight,
  HardDrive,
  Flame,
  Search,
} from 'lucide-react';
import type {
  GraphSummary,
  RepositoryHealthScorecard,
  FrameworkOverviewReport,
  GitChurnReport,
  ViewMode,
} from '../../types';
import {
  fetchHealthScorecard,
  fetchFrameworkOverview,
  fetchGitChurnReport,
  queryCopilot,
} from '../../services/api';

interface RepositoryDashboardProps {
  currentRepoPath?: string;
  summary?: GraphSummary;
  onNavigateToGraph: (viewMode: ViewMode) => void;
  onOpenDatabase: () => void;
  onOpenSecurity: () => void;
  onOpenHealth: () => void;
  onOpenCopilot: () => void;
  onOpenFramework: () => void;
  onOpenFacts: () => void;
  onOpenSequence: () => void;
  onOpenRules: () => void;
  onOpenClones: () => void;
  onOpenSearch: () => void;
  onOpenAnalytics: () => void;
  onOpenIngestModal: () => void;
}

export const RepositoryDashboard: React.FC<RepositoryDashboardProps> = ({
  currentRepoPath,
  summary,
  onNavigateToGraph,
  onOpenDatabase,
  onOpenSecurity,
  onOpenHealth,
  onOpenCopilot,
  onOpenFramework,
  onOpenFacts,
  onOpenSequence,
  onOpenRules,
  onOpenClones,
  onOpenSearch,
  onOpenAnalytics,
  onOpenIngestModal,
}) => {
  const [healthScorecard, setHealthScorecard] = useState<RepositoryHealthScorecard | null>(null);
  const [frameworks, setFrameworks] = useState<FrameworkOverviewReport | null>(null);
  const [gitChurn, setGitChurn] = useState<GitChurnReport | null>(null);
  const [aiSummary, setAiSummary] = useState<string>('');
  const [loadingSummary, setLoadingSummary] = useState(true);

  const repoName = currentRepoPath
    ? currentRepoPath.split(/[/\\]/).filter(Boolean).pop() || 'Repository'
    : 'Repository';

  useEffect(() => {
    fetchHealthScorecard()
      .then((res) => setHealthScorecard(res))
      .catch((err) => console.error('Failed to load health:', err));

    fetchFrameworkOverview()
      .then((res) => setFrameworks(res))
      .catch((err) => console.error('Failed to load frameworks:', err));

    fetchGitChurnReport()
      .then((res) => setGitChurn(res))
      .catch((err) => console.error('Failed to load git churn:', err));

    setLoadingSummary(true);
    queryCopilot('Summarize architecture overview')
      .then((res) => setAiSummary(res.summary))
      .catch((err) => console.error('Failed to load copilot summary:', err))
      .finally(() => setLoadingSummary(false));
  }, [currentRepoPath]);

  return (
    <div className="flex-1 overflow-y-auto bg-slate-950 text-slate-100 font-sans p-6 lg:p-10 space-y-8 select-none">
      {/* 1. HERO REPOSITORY OVERVIEW BANNER */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 rounded-3xl p-6 lg:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 flex items-center gap-1.5">
                <Brain className="w-3.5 h-3.5" /> Nous Intelligence Engine
              </span>
              {frameworks?.detected_frameworks?.map((fw) => (
                <span
                  key={fw}
                  className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/30"
                >
                  {fw}
                </span>
              ))}
            </div>

            <div>
              <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                <span>{repoName}</span>
              </h1>
              <p className="text-xs font-mono text-slate-400 mt-1 flex items-center gap-1.5 truncate">
                <HardDrive className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                <span className="truncate">{currentRepoPath || 'No repository path'}</span>
              </p>
            </div>

            {/* AI Architectural Insight Summary */}
            <div className="p-3.5 bg-slate-950/70 border border-slate-800/80 rounded-2xl text-xs text-slate-300 flex items-start gap-2.5 leading-relaxed font-sans">
              <Sparkles className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-cyan-300">Architecture Insight: </span>
                {loadingSummary ? (
                  <span className="text-slate-500 animate-pulse font-mono text-[11px]">
                    Synthesizing Knowledge Graph topology...
                  </span>
                ) : (
                  aiSummary || 'Repository indexed with multi-language AST facts and dependency graphs.'
                )}
              </div>
            </div>
          </div>

          {/* Right Health Score Gauge & Switch Repo */}
          <div className="flex items-center gap-4 flex-shrink-0">
            {healthScorecard && (
              <div
                onClick={onOpenHealth}
                className="cursor-pointer p-4 bg-slate-950/80 hover:bg-slate-900 border border-slate-800 hover:border-cyan-500/50 rounded-2xl transition flex items-center gap-3.5 group shadow-lg"
              >
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/10 border border-cyan-500/30 flex flex-col items-center justify-center text-cyan-300 font-mono">
                  <span className="text-xl font-black leading-none">{healthScorecard.overall_grade}</span>
                  <span className="text-[9px] text-slate-400 mt-0.5">{healthScorecard.overall_score}%</span>
                </div>
                <div>
                  <span className="text-[11px] font-mono text-slate-400 block">Repository Health</span>
                  <span className="text-xs font-bold text-slate-200 group-hover:text-cyan-300 transition">
                    Scorecard & Debt
                  </span>
                </div>
              </div>
            )}

            <button
              onClick={onOpenIngestModal}
              className="px-4 py-3 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition flex items-center gap-2 shadow-lg shadow-cyan-900/30 flex-shrink-0"
            >
              <FolderGit2 className="w-4 h-4" />
              <span>Switch Repo</span>
            </button>
          </div>
        </div>

        {/* METRICS STRIP */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-6 border-t border-slate-800/80 font-mono text-xs">
          <div className="p-3 bg-slate-950/50 border border-slate-800/60 rounded-xl">
            <span className="text-slate-500 text-[10px] uppercase block">Total Files</span>
            <span className="text-base font-bold text-slate-100">{summary?.total_files || healthScorecard?.total_files || 0}</span>
          </div>

          <div className="p-3 bg-slate-950/50 border border-slate-800/60 rounded-xl">
            <span className="text-slate-500 text-[10px] uppercase block">AST Symbols</span>
            <span className="text-base font-bold text-cyan-300">{summary?.total_symbols || healthScorecard?.total_symbols || 0}</span>
          </div>

          <div className="p-3 bg-slate-950/50 border border-slate-800/60 rounded-xl">
            <span className="text-slate-500 text-[10px] uppercase block">Dependencies</span>
            <span className="text-base font-bold text-slate-100">{summary?.total_dependencies || 0}</span>
          </div>

          <div className="p-3 bg-slate-950/50 border border-slate-800/60 rounded-xl">
            <span className="text-slate-500 text-[10px] uppercase block">Modules</span>
            <span className="text-base font-bold text-purple-300">{summary?.total_modules || 0}</span>
          </div>

          <div className="p-3 bg-slate-950/50 border border-slate-800/60 rounded-xl">
            <span className="text-slate-500 text-[10px] uppercase block">Git Commits</span>
            <span className="text-base font-bold text-amber-300">{gitChurn?.total_commits_analyzed || 0}</span>
          </div>

          <div className="p-3 bg-slate-950/50 border border-slate-800/60 rounded-xl">
            <span className="text-slate-500 text-[10px] uppercase block">Tech Debt</span>
            <span className="text-base font-bold text-rose-300">~{healthScorecard?.technical_debt_hours || 0}h</span>
          </div>
        </div>
      </div>

      {/* 2. ARCHITECTURE VISUALIZATION VIEWS SECTION */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-100">Architecture & System Visualizations</h2>
            <p className="text-xs text-slate-400">Choose a focused architectural lens or inspect the full system graph.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Overall Architecture Graph */}
          <div
            onClick={() => onNavigateToGraph('file')}
            className="p-5 bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-cyan-500/50 rounded-2xl transition cursor-pointer group flex flex-col justify-between space-y-4 shadow-sm"
          >
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center group-hover:scale-110 transition">
                <FileCode className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-slate-100 group-hover:text-cyan-300 transition">
                Overall Architecture
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                Interactive full-file dependency graph with layout controls, cycle highlights, and blast radius.
              </p>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs font-mono text-cyan-400">
              <span>Explore Graph</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
            </div>
          </div>

          {/* Card 2: Frontend Architecture */}
          <div
            onClick={() => onNavigateToGraph('frontend')}
            className="p-5 bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-purple-500/50 rounded-2xl transition cursor-pointer group flex flex-col justify-between space-y-4 shadow-sm"
          >
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center group-hover:scale-110 transition">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-slate-100 group-hover:text-purple-300 transition">
                Frontend Architecture
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                Focused graph isolating React/Vue components, page routing, layouts, and custom hook state.
              </p>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs font-mono text-purple-400">
              <span>View Frontend</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
            </div>
          </div>

          {/* Card 3: Backend Architecture */}
          <div
            onClick={() => onNavigateToGraph('backend')}
            className="p-5 bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/50 rounded-2xl transition cursor-pointer group flex flex-col justify-between space-y-4 shadow-sm"
          >
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition">
                <Boxes className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-slate-100 group-hover:text-emerald-300 transition">
                Backend Architecture
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                Isolates controllers, API routes, domain services, repository patterns, and middleware pipelines.
              </p>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs font-mono text-emerald-400">
              <span>View Backend</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
            </div>
          </div>

          {/* Card 4: Database ERD */}
          <div
            onClick={onOpenDatabase}
            className="p-5 bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-blue-500/50 rounded-2xl transition cursor-pointer group flex flex-col justify-between space-y-4 shadow-sm"
          >
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center group-hover:scale-110 transition">
                <Database className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-slate-100 group-hover:text-blue-300 transition">
                Database Schema & ERD
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                Entity-relationship diagrams, foreign key mappings, and SQL/Prisma/Drizzle schema tables.
              </p>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs font-mono text-blue-400">
              <span>Inspect Schema</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
            </div>
          </div>
        </div>

        {/* Second Row of Visualizations */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Card 5: Module Clustering */}
          <div
            onClick={() => onNavigateToGraph('module')}
            className="p-4 bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl transition cursor-pointer group flex items-center gap-3.5"
          >
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400">
              <Boxes className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h4 className="text-xs font-bold text-slate-200 group-hover:text-indigo-300 transition">
                Module Clustering
              </h4>
              <p className="text-[11px] text-slate-400">High-level package boundary graph.</p>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:translate-x-1 transition" />
          </div>

          {/* Card 6: Call Graph */}
          <div
            onClick={() => onNavigateToGraph('symbol')}
            className="p-4 bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl transition cursor-pointer group flex items-center gap-3.5"
          >
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400">
              <Code2 className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h4 className="text-xs font-bold text-slate-200 group-hover:text-cyan-300 transition">
                Symbol Call Graph
              </h4>
              <p className="text-[11px] text-slate-400">Function invocation network.</p>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:translate-x-1 transition" />
          </div>

          {/* Card 7: Sequence Diagram Tracer */}
          <div
            onClick={onOpenSequence}
            className="p-4 bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl transition cursor-pointer group flex items-center gap-3.5"
          >
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400">
              <Workflow className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h4 className="text-xs font-bold text-slate-200 group-hover:text-amber-300 transition">
                Sequence Tracer
              </h4>
              <p className="text-[11px] text-slate-400">Static execution call tracer.</p>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:translate-x-1 transition" />
          </div>

          {/* Card 8: Framework Layers */}
          <div
            onClick={onOpenFramework}
            className="p-4 bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl transition cursor-pointer group flex items-center gap-3.5"
          >
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400">
              <Layers className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h4 className="text-xs font-bold text-slate-200 group-hover:text-purple-300 transition">
                Architecture Layers
              </h4>
              <p className="text-[11px] text-slate-400">Controllers, services, & hooks.</p>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:translate-x-1 transition" />
          </div>
        </div>
      </div>

      {/* 3. SOFTWARE INTELLIGENCE & AUDITING TOOLS */}
      <div className="space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-100">Deep Intelligence & Quality Audits</h2>
          <p className="text-xs text-slate-400">Automated static code diagnostics, security scanning, and reasoning tools.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 font-sans">
          {/* Tool 1: AI Copilot & Onboarding */}
          <div
            onClick={onOpenCopilot}
            className="p-5 bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-cyan-500/50 rounded-2xl transition cursor-pointer group space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <Sparkles className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                Zero Cloud Keys
              </span>
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-100 group-hover:text-cyan-300 transition">
                AI Repository Copilot & Onboarding
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Ask architectural questions, trace authentication logic, and generate step-by-step reading roadmaps.
              </p>
            </div>
          </div>

          {/* Tool 2: Security & SAST Audit */}
          <div
            onClick={onOpenSecurity}
            className="p-5 bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-rose-500/50 rounded-2xl transition cursor-pointer group space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/30">
                Static SAST
              </span>
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-100 group-hover:text-rose-300 transition">
                Security & Vulnerability Audit
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Scan for hardcoded credentials, SQL injection patterns, unsafe code evaluation, and sensitive logging.
              </p>
            </div>
          </div>

          {/* Tool 3: RipEx Relational Facts */}
          <div
            onClick={onOpenFacts}
            className="p-5 bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-2xl transition cursor-pointer group space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Code2 className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                RipEx v0.3.0 Engine
              </span>
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-100 group-hover:text-indigo-300 transition">
                RipEx Fact Engine & API Catalog
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Multi-language relational fact store index across calls, inheritance, instantiations, and REST routes.
              </p>
            </div>
          </div>

          {/* Tool 4: Git Churn & Hotspot Matrix */}
          <div
            onClick={onOpenAnalytics}
            className="p-5 bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-amber-500/50 rounded-2xl transition cursor-pointer group space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Flame className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
                4-Quadrant Matrix
              </span>
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-100 group-hover:text-amber-300 transition">
                Git Churn & Hotspot Analysis
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Correlate commit frequency with code complexity to uncover high-risk maintenance hotspots.
              </p>
            </div>
          </div>

          {/* Tool 5: Architecture Rules Linter */}
          <div
            onClick={onOpenRules}
            className="p-5 bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/50 rounded-2xl transition cursor-pointer group space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                Clean Architecture
              </span>
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-100 group-hover:text-emerald-300 transition">
                Architecture Boundary Linter
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Enforce architectural layer boundaries and prevent illegal cross-layer dependency leaks.
              </p>
            </div>
          </div>

          {/* Tool 6: AST Clone Detector */}
          <div
            onClick={onOpenClones}
            className="p-5 bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-purple-500/50 rounded-2xl transition cursor-pointer group space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <Files className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/30">
                Type-1 & 2 AST
              </span>
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-100 group-hover:text-purple-300 transition">
                AST Clone & Duplicate Logic
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Identify duplicated code blocks, copy-pasted implementations, and structural clone groups.
              </p>
            </div>
          </div>

          {/* Tool 7: Code Search */}
          <div
            onClick={onOpenSearch}
            className="p-5 bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-cyan-500/50 rounded-2xl transition cursor-pointer group space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <Search className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                Ctrl+K
              </span>
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-100 group-hover:text-cyan-300 transition">
                Hybrid Semantic & Symbol Search
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Search functions, classes, interfaces, and keywords with BM25 + reciprocal rank fusion.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
