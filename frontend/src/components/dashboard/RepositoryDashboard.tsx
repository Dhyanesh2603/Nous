import React, { useState, useEffect } from 'react';
import {
  Brain,
  FolderGit2,
  Boxes,
  FileCode,
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
  Clock,
  Globe,
  Package,
  GitCompare,
  Eye,
  Radio,
  Trash2,
  Zap,
  GitBranch,
  Network,
  Building2,
  TrendingUp,
  Scale,
  HeartPulse,
  Wrench,
  BookOpen,
  GitPullRequest,
  TestTube2,
  History,
  Play,
  Compass,
} from 'lucide-react';
import type {
  GraphSummary,
  FrameworkOverviewReport,
  GitChurnReport,
  ViewMode,
} from '../../types';
import {
  fetchFrameworkOverview,
  fetchGitChurnReport,
  queryCopilot,
  toggleWatchMode,
  fetchWatchStatus,
} from '../../services/api';

interface RepositoryDashboardProps {
  currentRepoPath?: string;
  summary?: GraphSummary;
  onNavigateToGraph: (viewMode: ViewMode) => void;
  onOpenDatabase: () => void;
  onOpenSecurity: () => void;
  onOpenCopilot: () => void;
  onOpenFramework: () => void;
  onOpenSequence: () => void;
  onOpenRules: () => void;
  onOpenClones: () => void;
  onOpenSearch: () => void;
  onOpenAnalytics: () => void;
  onOpenIngestModal: () => void;
  onOpenTimeline: () => void;
  onOpenApiFlow: () => void;
  onOpenDependencies: () => void;
  onOpenCompare: () => void;
  onOpenReview: () => void;
  onOpenDeadCode: () => void;
  onOpenImpact: () => void;
  onOpenDataFlow: () => void;
  onOpenApiMapper: () => void;
  onOpenArchitectureStyle: () => void;
  onOpenDrift: () => void;
  onOpenTechDebt: () => void;
  onOpenModuleHealth: () => void;
  onOpenRefactoring: () => void;
  onOpenDocs: () => void;
  onOpenPRImpact: () => void;
  onOpenNLSearch: () => void;
  onOpenTestAdvisor: () => void;
  onOpenTimeMachine: () => void;
  onOpenPlayback: () => void;
  onOpenKnowledgeGraph: () => void;
  onOpenMigration: () => void;
}

export const RepositoryDashboard: React.FC<RepositoryDashboardProps> = ({
  currentRepoPath,
  summary,
  onNavigateToGraph,
  onOpenDatabase,
  onOpenSecurity,
  onOpenCopilot,
  onOpenFramework,
  onOpenSequence,
  onOpenRules,
  onOpenClones,
  onOpenSearch,
  onOpenAnalytics,
  onOpenIngestModal,
  onOpenTimeline,
  onOpenApiFlow,
  onOpenDependencies,
  onOpenCompare,
  onOpenReview,
  onOpenDeadCode,
  onOpenImpact,
  onOpenDataFlow,
  onOpenApiMapper,
  onOpenArchitectureStyle,
  onOpenDrift,
  onOpenTechDebt,
  onOpenModuleHealth,
  onOpenRefactoring,
  onOpenDocs,
  onOpenPRImpact,
  onOpenNLSearch,
  onOpenTestAdvisor,
  onOpenTimeMachine,
  onOpenPlayback,
  onOpenKnowledgeGraph,
  onOpenMigration,
}) => {
  const [frameworks, setFrameworks] = useState<FrameworkOverviewReport | null>(null);
  const [gitChurn, setGitChurn] = useState<GitChurnReport | null>(null);
  const [aiSummary, setAiSummary] = useState<string>('');
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [isWatching, setIsWatching] = useState(false);

  const repoName = currentRepoPath
    ? currentRepoPath.split(/[/\\]/).filter(Boolean).pop() || 'Repository'
    : 'Repository';

  useEffect(() => {
    fetchFrameworkOverview()
      .then((res) => setFrameworks(res))
      .catch((err) => console.error('Failed to load frameworks:', err));

    fetchGitChurnReport()
      .then((res) => setGitChurn(res))
      .catch((err) => console.error('Failed to load git churn:', err));

    fetchWatchStatus()
      .then((res) => setIsWatching(res.is_watching))
      .catch(() => {});

    setLoadingSummary(true);
    queryCopilot('Summarize architecture overview')
      .then((res) => setAiSummary(res.summary))
      .catch((err) => console.error('Failed to load copilot summary:', err))
      .finally(() => setLoadingSummary(false));
  }, [currentRepoPath]);

  const handleToggleWatch = async () => {
    try {
      const res = await toggleWatchMode();
      setIsWatching(res.is_watching);
    } catch (err) {
      console.error('Failed to toggle watch mode:', err);
    }
  };

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
              <button
                onClick={handleToggleWatch}
                className={`text-[11px] font-mono px-2.5 py-1 rounded-full border flex items-center gap-1.5 transition ${
                  isWatching
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 animate-pulse'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
                title="Detects local file modifications and updates ASTs in real-time"
              >
                {isWatching ? <Radio className="w-3.5 h-3.5 text-emerald-400" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{isWatching ? 'Live Watch Active' : 'Live Watch Mode'}</span>
              </button>
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

          {/* Switch Repo Button */}
          <div className="flex items-center gap-4 flex-shrink-0">
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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-6 pt-6 border-t border-slate-800/80 font-mono text-xs">
          <div className="p-3 bg-slate-950/50 border border-slate-800/60 rounded-xl">
            <span className="text-slate-500 text-[10px] uppercase block">Total Files</span>
            <span className="text-base font-bold text-slate-100">{summary?.total_files || 0}</span>
          </div>

          <div className="p-3 bg-slate-950/50 border border-slate-800/60 rounded-xl">
            <span className="text-slate-500 text-[10px] uppercase block">AST Symbols</span>
            <span className="text-base font-bold text-cyan-300">{summary?.total_symbols || 0}</span>
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
          {/* Card 5: Timeline Replay */}
          <div
            onClick={onOpenTimeline}
            className="p-4 bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-cyan-500/40 rounded-2xl transition cursor-pointer group flex items-center gap-3.5"
          >
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400">
              <Clock className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h4 className="text-xs font-bold text-slate-200 group-hover:text-cyan-300 transition">
                Timeline Replay
              </h4>
              <p className="text-[11px] text-slate-400">Replay commit growth & history.</p>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:translate-x-1 transition" />
          </div>

          {/* Card 6: API Request Flow */}
          <div
            onClick={onOpenApiFlow}
            className="p-4 bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/40 rounded-2xl transition cursor-pointer group flex items-center gap-3.5"
          >
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Globe className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h4 className="text-xs font-bold text-slate-200 group-hover:text-emerald-300 transition">
                API Request Lifecycle
              </h4>
              <p className="text-[11px] text-slate-400">Middleware & handler pipelines.</p>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:translate-x-1 transition" />
          </div>

          {/* Card 7: Supply Chain Packages */}
          <div
            onClick={onOpenDependencies}
            className="p-4 bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-purple-500/40 rounded-2xl transition cursor-pointer group flex items-center gap-3.5"
          >
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400">
              <Package className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h4 className="text-xs font-bold text-slate-200 group-hover:text-purple-300 transition">
                Supply Chain & Packages
              </h4>
              <p className="text-[11px] text-slate-400">Licenses & third-party packages.</p>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:translate-x-1 transition" />
          </div>

          {/* Card 8: Architecture Diff */}
          <div
            onClick={onOpenCompare}
            className="p-4 bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-amber-500/40 rounded-2xl transition cursor-pointer group flex items-center gap-3.5"
          >
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400">
              <GitCompare className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h4 className="text-xs font-bold text-slate-200 group-hover:text-amber-300 transition">
                Architecture Diff & Drift
              </h4>
              <p className="text-[11px] text-slate-400">Compare refs and PR changes.</p>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:translate-x-1 transition" />
          </div>

          {/* Card 9: Sequence Execution Tracer */}
          <div
            onClick={onOpenSequence}
            className="p-4 bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-cyan-500/40 rounded-2xl transition cursor-pointer group flex items-center gap-3.5"
          >
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400">
              <Workflow className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h4 className="text-xs font-bold text-slate-200 group-hover:text-cyan-300 transition">
                Sequence Diagram Tracer
              </h4>
              <p className="text-[11px] text-slate-400">Dynamic execution trace generator.</p>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:translate-x-1 transition" />
          </div>

          {/* Card 10: Framework & Architecture Layers */}
          <div
            onClick={onOpenFramework}
            className="p-4 bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-purple-500/40 rounded-2xl transition cursor-pointer group flex items-center gap-3.5"
          >
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400">
              <Layers className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h4 className="text-xs font-bold text-slate-200 group-hover:text-purple-300 transition">
                Component & Layer Tree
              </h4>
              <p className="text-[11px] text-slate-400">Controllers, services, & components.</p>
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 font-sans">
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
                AI Repository Copilot
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Ask architectural questions and generate onboarding roadmaps.
              </p>
            </div>
          </div>

          {/* Tool 2: AI Automated Code Review */}
          <div
            onClick={onOpenReview}
            className="p-5 bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/50 rounded-2xl transition cursor-pointer group space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                PR Reviewer
              </span>
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-100 group-hover:text-emerald-300 transition">
                Automated Code Review
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Audit function size, complexity smells, and generate test plans.
              </p>
            </div>
          </div>

          {/* Tool 3: Security & SAST Audit */}
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
                Security & SAST Audit
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Scan for hardcoded credentials, SQL injection, and unsafe code eval.
              </p>
            </div>
          </div>

          {/* Tool 4: Database & ERD Schema */}
          <div
            onClick={onOpenDatabase}
            className="p-5 bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-2xl transition cursor-pointer group space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Database className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                Schema ERD
              </span>
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-100 group-hover:text-indigo-300 transition">
                Database & Schema ERD
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Relational entity models, foreign key relationships, and table definitions.
              </p>
            </div>
          </div>
        </div>

        {/* Second Row of Diagnostics Tools */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 font-sans">
          {/* Tool 5: Architecture Boundary Linter */}
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
                Architecture Rules
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Enforce architectural layer boundaries and prevent cross-layer leaks.
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
                AST Clones
              </span>
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-100 group-hover:text-purple-300 transition">
                Code Clones Explorer
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Identify duplicated code blocks, copy-pasted implementations, and clone groups.
              </p>
            </div>
          </div>

          {/* Tool 7: Git Churn & Hotspot Analysis */}
          <div
            onClick={onOpenAnalytics}
            className="p-5 bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-amber-500/50 rounded-2xl transition cursor-pointer group space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Flame className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
                Hotspots
              </span>
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-100 group-hover:text-amber-300 transition">
                Git Churn & Hotspots
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Correlate commit frequency with code complexity to uncover high-risk files.
              </p>
            </div>
          </div>

          {/* Tool 8: Code Search */}
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
                Hybrid Code Search
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Search functions, classes, interfaces, and keywords with BM25 fusion.
              </p>
            </div>
          </div>
        </div>

        {/* Third Row: Advanced Code Intelligence (Phase 1) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 font-sans">
          {/* Tool 9: Dead Code Explorer */}
          <div
            onClick={onOpenDeadCode}
            className="p-5 bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-amber-500/50 rounded-2xl transition cursor-pointer group space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Trash2 className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
                Dead Logic
              </span>
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-100 group-hover:text-amber-300 transition">
                Dead Code Explorer
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Detect unused functions, classes, orphan files, and dead exports with confidence scores.
              </p>
            </div>
          </div>

          {/* Tool 10: Change Impact Simulator */}
          <div
            onClick={onOpenImpact}
            className="p-5 bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-rose-500/50 rounded-2xl transition cursor-pointer group space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <Zap className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/30">
                Pre-Refactor
              </span>
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-100 group-hover:text-rose-300 transition">
                Change Impact Simulator
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Simulate deletion, rename, and moves to preview broken callers and affected APIs.
              </p>
            </div>
          </div>

          {/* Tool 11: Data Flow Analysis */}
          <div
            onClick={onOpenDataFlow}
            className="p-5 bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-cyan-500/50 rounded-2xl transition cursor-pointer group space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <GitBranch className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                Taint Tracker
              </span>
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-100 group-hover:text-cyan-300 transition">
                Data Flow Analysis
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Trace variables, parameters, user inputs, database writes, and API responses.
              </p>
            </div>
          </div>

          {/* Tool 12: API Dependency Map */}
          <div
            onClick={onOpenApiMapper}
            className="p-5 bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/50 rounded-2xl transition cursor-pointer group space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Network className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                Protocols
              </span>
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-100 group-hover:text-emerald-300 transition">
                API Dependency Map
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Map REST, GraphQL, gRPC, WebSockets, and internal cross-module client invocations.
              </p>
            </div>
          </div>
        </div>

        {/* Fourth Row: Architecture Intelligence (Phase 2) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 font-sans">
          {/* Tool 13: Architecture Style Detection */}
          <div
            onClick={onOpenArchitectureStyle}
            className="p-5 bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-purple-500/50 rounded-2xl transition cursor-pointer group space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <Building2 className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/30">
                Style Classifier
              </span>
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-100 group-hover:text-purple-300 transition">
                Architecture Detection
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Identify MVC, Clean Architecture, Hexagonal, DDD, Onion, Layered, and Microservices.
              </p>
            </div>
          </div>

          {/* Tool 14: Architecture Drift Timeline */}
          <div
            onClick={onOpenDrift}
            className="p-5 bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-cyan-500/50 rounded-2xl transition cursor-pointer group space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <TrendingUp className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                Git Timeline
              </span>
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-100 group-hover:text-cyan-300 transition">
                Architecture Drift
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Visualize structural evolution, coupling trends, and architectural degradation over Git history.
              </p>
            </div>
          </div>

          {/* Tool 15: Technical Debt Engine */}
          <div
            onClick={onOpenTechDebt}
            className="p-5 bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-amber-500/50 rounded-2xl transition cursor-pointer group space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Scale className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
                8-Dimension Score
              </span>
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-100 group-hover:text-amber-300 transition">
                Technical Debt Engine
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Quantify technical debt across complexity, churn, cycles, clones, file sizing, and maintainability.
              </p>
            </div>
          </div>

          {/* Tool 16: Module Health Dashboard */}
          <div
            onClick={onOpenModuleHealth}
            className="p-5 bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/50 rounded-2xl transition cursor-pointer group space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <HeartPulse className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                Package Metrics
              </span>
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-100 group-hover:text-emerald-300 transition">
                Module Health
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Analyze cohesion, coupling (Ca/Ce), instability (I), DAG depth, test, and doc coverage.
              </p>
            </div>
          </div>

          {/* Tool 17: Refactoring Advisor */}
          <div
            onClick={onOpenRefactoring}
            className="p-5 bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-sky-500/50 rounded-2xl transition cursor-pointer group space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
                <Wrench className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/10 text-sky-300 border border-sky-500/30">
                Advisor
              </span>
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-100 group-hover:text-sky-300 transition">
                Refactoring Advisor
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Automated recommendations to extract methods, break cycles, split files, and reduce complexity.
              </p>
            </div>
          </div>
        </div>

        {/* Fifth Row: AI Engineering Assistant (Phase 3) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 font-sans">
          {/* Tool 18: Automatic Documentation Generator */}
          <div
            onClick={onOpenDocs}
            className="p-5 bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-2xl transition cursor-pointer group space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <BookOpen className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                Doc Synthesizer
              </span>
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-100 group-hover:text-indigo-300 transition">
                Documentation Generator
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Live markdown onboarding guides, architecture blueprints, API catalogs, and model schemas.
              </p>
            </div>
          </div>

          {/* Tool 19: PR Blast Radius Analyzer */}
          <div
            onClick={onOpenPRImpact}
            className="p-5 bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-rose-500/50 rounded-2xl transition cursor-pointer group space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <GitPullRequest className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/30">
                Pre-Merge Safety
              </span>
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-100 group-hover:text-rose-300 transition">
                PR Impact Analyzer
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Simulate PR diffs to calculate blast radius, downstream caller regressions, and reviewers.
              </p>
            </div>
          </div>

          {/* Tool 20: Natural Language Code Search */}
          <div
            onClick={onOpenNLSearch}
            className="p-5 bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-cyan-500/50 rounded-2xl transition cursor-pointer group space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <Sparkles className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                Semantic Query
              </span>
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-100 group-hover:text-cyan-300 transition">
                Natural Language Search
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Ask natural questions about authentication, database queries, business workflows, and APIs.
              </p>
            </div>
          </div>

          {/* Tool 21: Intelligent Test Advisor */}
          <div
            onClick={onOpenTestAdvisor}
            className="p-5 bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/50 rounded-2xl transition cursor-pointer group space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <TestTube2 className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                Test Synthesizer
              </span>
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-100 group-hover:text-emerald-300 transition">
                Test Advisor & Stubs
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Identify untested high-risk functions and synthesize unit test stubs with mocks and assertions.
              </p>
            </div>
          </div>
        </div>

        {/* Sixth Row: Enterprise & WOW Features (Phase 4) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 font-sans">
          {/* Tool 22: Repository Time Machine */}
          <div
            onClick={onOpenTimeMachine}
            className="p-5 bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-violet-500/50 rounded-2xl transition cursor-pointer group space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20">
                <History className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-violet-500/10 text-violet-300 border border-violet-500/30">
                Git Scrubber
              </span>
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-100 group-hover:text-violet-300 transition">
                Repository Time Machine
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Scrub through git evolution history, velocity trajectory curves, and codebase LOC growth frames.
              </p>
            </div>
          </div>

          {/* Tool 23: Interactive Execution Playback */}
          <div
            onClick={onOpenPlayback}
            className="p-5 bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-amber-500/50 rounded-2xl transition cursor-pointer group space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Play className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
                Call Stepper
              </span>
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-100 group-hover:text-amber-300 transition">
                Execution Flow Playback
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Step-by-step function call animation with runtime payloads, branch decisions, and stack traces.
              </p>
            </div>
          </div>

          {/* Tool 24: Unified Repository Knowledge Graph */}
          <div
            onClick={onOpenKnowledgeGraph}
            className="p-5 bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-teal-500/50 rounded-2xl transition cursor-pointer group space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
                <Network className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-teal-500/10 text-teal-300 border border-teal-500/30">
                Knowledge Graph
              </span>
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-100 group-hover:text-teal-300 transition">
                Unified Knowledge Graph
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Interconnect files, modules, AST symbols, database entities, and HTTP routes into a unified graph.
              </p>
            </div>
          </div>

          {/* Tool 25: AI Refactoring & Migration Planner */}
          <div
            onClick={onOpenMigration}
            className="p-5 bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-orange-500/50 rounded-2xl transition cursor-pointer group space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20">
                <Compass className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-orange-500/10 text-orange-300 border border-orange-500/30">
                Migration AI
              </span>
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-100 group-hover:text-orange-300 transition">
                Migration & Modernization
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Modernization roadmaps for TypeScript adoption, Async concurrency, and type-safe API contracts.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
