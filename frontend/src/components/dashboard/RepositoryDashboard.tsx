import React, { useState, useEffect } from 'react';
import {
  Brain,
  FolderGit2,
  Boxes,
  FileCode,
  Database,
  ShieldAlert,
  ShieldCheck,
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
  FileCheck2,
  Sparkles,
  Activity,
  SlidersHorizontal,
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
  toggleWatchMode,
  fetchWatchStatus,
} from '../../services/api';

interface RepositoryDashboardProps {
  currentRepoPath?: string;
  summary?: GraphSummary;
  onNavigateToGraph: (viewMode: ViewMode) => void;
  onOpenDatabase: () => void;
  onOpenSecurity: () => void;
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
  onOpenTestAdvisor: () => void;
  onOpenTimeMachine: () => void;
  onOpenPlayback: () => void;
  onOpenKnowledgeGraph: () => void;
  onOpenMigration: () => void;
  onOpenExecutiveReport?: () => void;
  onOpenPlatformDocs?: () => void;
  onOpenArchitectAI?: () => void;
  onOpenRippleSimulator?: () => void;
  onOpenArchaeology?: (file?: string) => void;
}

type SegmentId = 'canvas' | 'ai' | 'drift' | 'archaeology' | 'quality' | 'pr';

export const RepositoryDashboard: React.FC<RepositoryDashboardProps> = ({
  currentRepoPath,
  summary,
  onNavigateToGraph,
  onOpenDatabase,
  onOpenSecurity,
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
  onOpenTestAdvisor,
  onOpenTimeMachine,
  onOpenPlayback,
  onOpenKnowledgeGraph,
  onOpenMigration,
  onOpenExecutiveReport,
  onOpenPlatformDocs,
  onOpenArchitectAI,
  onOpenRippleSimulator,
  onOpenArchaeology,
}) => {
  const [frameworks, setFrameworks] = useState<FrameworkOverviewReport | null>(null);
  const [gitChurn, setGitChurn] = useState<GitChurnReport | null>(null);
  const [isWatching, setIsWatching] = useState(false);
  const [selectedSegment, setSelectedSegment] = useState<SegmentId>('canvas');
  const [searchQuery, setSearchQuery] = useState('');

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
  }, [currentRepoPath]);

  const handleToggleWatch = async () => {
    try {
      const res = await toggleWatchMode();
      setIsWatching(res.is_watching);
    } catch (err) {
      console.error('Failed to toggle watch mode:', err);
    }
  };

  // Segments Definition
  const segments = [
    {
      id: 'canvas' as SegmentId,
      name: 'Architecture Graph',
      badge: '7 Views',
      icon: Layers,
      color: 'from-cyan-500/20 to-blue-500/20 text-cyan-400 border-cyan-500/30',
      activeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-cyan-950/40',
      description: 'System-wide topology, frontend/backend lenses, modules, and call graphs.',
    },
    {
      id: 'ai' as SegmentId,
      name: 'AI & Ripple Simulator',
      badge: 'DeepSeek V4',
      icon: Sparkles,
      color: 'from-amber-500/20 to-rose-500/20 text-amber-400 border-amber-500/30',
      activeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-amber-950/40',
      description: 'Architect AI with DeepSeek V4 Flash, sequence generation, and failure cascade simulation.',
    },
    {
      id: 'drift' as SegmentId,
      name: 'Drift & Boundaries',
      badge: 'Clean Arch',
      icon: ShieldCheck,
      color: 'from-emerald-500/20 to-teal-500/20 text-emerald-400 border-emerald-500/30',
      activeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-emerald-950/40',
      description: 'Clean Architecture 4-Tier Blueprint, coupling drift checkpoints, and style classification.',
    },
    {
      id: 'archaeology' as SegmentId,
      name: 'Archaeology & Forensics',
      badge: 'Intent Forensics',
      icon: Compass,
      color: 'from-yellow-500/20 to-amber-500/20 text-yellow-400 border-yellow-500/30',
      activeColor: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40 shadow-yellow-950/40',
      description: '"Why does this code exist?", origin commits, #HACK/#TODO debt flags, and time machine.',
    },
    {
      id: 'quality' as SegmentId,
      name: 'Quality & Tech Debt',
      badge: 'Scorecard A-F',
      icon: Scale,
      color: 'from-purple-500/20 to-indigo-500/20 text-purple-400 border-purple-500/30',
      activeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-purple-950/40',
      description: 'Executive audit report, 8D tech debt matrix, dead code, code clones, and refactoring advisor.',
    },
    {
      id: 'pr' as SegmentId,
      name: 'PR Review & Security',
      badge: 'Review Composer',
      icon: GitPullRequest,
      color: 'from-rose-500/20 to-pink-500/20 text-rose-400 border-rose-500/30',
      activeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-rose-950/40',
      description: 'Automated GitHub review comment composer, SAST security scanner, and data flow taint analyzer.',
    },
  ];

  // Master Tools Catalog for Instant Universal Search
  const allTools = [
    // Canvas
    {
      id: 'overall-arch',
      segment: 'canvas',
      name: 'Overall Architecture Graph',
      category: 'Architecture Graph',
      description: 'Full-repository dependency graph with layout algorithms, circular cycle detection, and blast radius.',
      icon: FileCode,
      tag: 'Interactive Canvas',
      action: () => onNavigateToGraph('file'),
      color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
    },
    {
      id: 'frontend-lens',
      segment: 'canvas',
      name: 'Frontend Architecture Lens',
      category: 'Architecture Graph',
      description: 'Isolates UI components, React/Vue routing, layouts, and custom hooks.',
      icon: Layers,
      tag: 'Frontend Lens',
      action: () => onNavigateToGraph('frontend'),
      color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    },
    {
      id: 'backend-lens',
      segment: 'canvas',
      name: 'Backend Architecture Lens',
      category: 'Architecture Graph',
      description: 'Isolates controllers, API routes, domain services, repositories, and middleware.',
      icon: Boxes,
      tag: 'Backend Lens',
      action: () => onNavigateToGraph('backend'),
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    },
    {
      id: 'module-clusters',
      segment: 'canvas',
      name: 'Module Clusters',
      category: 'Architecture Graph',
      description: 'Coarse-grained architectural modules with afferent/efferent coupling & instability metrics.',
      icon: Package,
      tag: 'Modularity',
      action: () => onNavigateToGraph('module'),
      color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    },
    {
      id: 'symbol-callgraph',
      segment: 'canvas',
      name: 'Symbol Topology & Call Graph',
      category: 'Architecture Graph',
      description: 'Fine-grained functions, classes, and method invocation chains across files.',
      icon: Network,
      tag: 'Symbol Graph',
      action: () => onNavigateToGraph('symbol'),
      color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
    },
    {
      id: 'database-erd',
      segment: 'canvas',
      name: 'Database Schema & ERD',
      category: 'Architecture Graph',
      description: 'Interactive entity-relationship diagrams, foreign keys, and SQL/Prisma schemas.',
      icon: Database,
      tag: 'Data Tier',
      action: onOpenDatabase,
      color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    },
    {
      id: 'api-flow',
      segment: 'canvas',
      name: 'API Flow & Pipeline Mapper',
      category: 'Architecture Graph',
      description: 'End-to-end trace from HTTP route triggers through services to database calls.',
      icon: Workflow,
      tag: 'Route Trace',
      action: onOpenApiFlow,
      color: 'text-pink-400 bg-pink-500/10 border-pink-500/20',
    },
    {
      id: 'cross-dependencies',
      segment: 'canvas',
      name: 'Cross-Module Dependencies',
      category: 'Architecture Graph',
      description: 'Coupling matrices, import hierarchies, and external third-party package dependencies.',
      icon: Files,
      tag: 'Coupling',
      action: onOpenDependencies,
      color: 'text-teal-400 bg-teal-500/10 border-teal-500/20',
    },

    // AI & Ripple
    {
      id: 'architect-ai',
      segment: 'ai',
      name: 'Architect AI (DeepSeek V4 Flash)',
      category: 'AI & Simulation',
      description: 'Graph-RAG architectural assistant powered by NVIDIA DeepSeek V4 Flash with offline fallback.',
      icon: Sparkles,
      tag: 'AI Reasoning',
      action: onOpenArchitectAI || (() => {}),
      color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
    },
    {
      id: 'ripple-simulator',
      segment: 'ai',
      name: 'Interactive Ripple Effect Simulator',
      category: 'AI & Simulation',
      description: 'Multi-level failure cascade simulator calculating blast radius and contract breakages.',
      icon: Activity,
      tag: 'Cascade Simulation',
      action: onOpenRippleSimulator || (() => {}),
      color: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    },
    {
      id: 'impact-simulator',
      segment: 'ai',
      name: 'Change Impact & Blast Radius',
      category: 'AI & Simulation',
      description: 'Simulates file and symbol modifications to predict downstream breakages.',
      icon: Zap,
      tag: 'Impact Forecast',
      action: onOpenImpact,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    },
    {
      id: 'sequence-diagram',
      segment: 'ai',
      name: 'Dynamic Sequence Diagrams',
      category: 'AI & Simulation',
      description: 'Renders step-by-step UML sequence diagrams for method execution chains.',
      icon: GitBranch,
      tag: 'Sequence UML',
      action: onOpenSequence,
      color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    },
    {
      id: 'nl-search',
      segment: 'ai',
      name: 'Natural Language Code Search',
      category: 'AI & Simulation',
      description: 'Semantic query engine to search code intent like "Where is JWT authentication verified?".',
      icon: Search,
      tag: 'Semantic Search',
      action: onOpenSearch,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    },

    // Drift & Clean Arch
    {
      id: 'clean-arch',
      segment: 'drift',
      name: 'Clean Architecture 4-Tier Blueprint',
      category: 'Drift & Boundaries',
      description: 'Enforces Domain → Application → Infrastructure → Presentation boundary constraints with AI fix prompts.',
      icon: ShieldCheck,
      tag: 'Boundary Enforcer',
      action: onOpenDrift,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    },
    {
      id: 'drift-timeline',
      segment: 'drift',
      name: 'Architecture Drift Timeline',
      category: 'Drift & Boundaries',
      description: 'Samples Git commit checkpoints to compute coupling growth and degradation alerts.',
      icon: TrendingUp,
      tag: 'Git Coupling',
      action: onOpenDrift,
      color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
    },
    {
      id: 'arch-style',
      segment: 'drift',
      name: 'Architecture Style Classifier',
      category: 'Drift & Boundaries',
      description: 'Detects layered, microservices, hexagonal, event-driven, or modular monolith architectures.',
      icon: Building2,
      tag: 'Style Detector',
      action: onOpenArchitectureStyle,
      color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    },
    {
      id: 'arch-rules',
      segment: 'drift',
      name: 'Architecture Invariant Rules',
      category: 'Drift & Boundaries',
      description: 'Enforces custom import constraints and clean architectural boundaries.',
      icon: ShieldAlert,
      tag: 'Rule Checker',
      action: onOpenRules,
      color: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    },
    {
      id: 'repo-compare',
      segment: 'drift',
      name: 'Repository Branch Diff',
      category: 'Drift & Boundaries',
      description: 'Side-by-side structural comparison of commits or branches to detect architecture changes.',
      icon: GitCompare,
      tag: 'Branch Diff',
      action: onOpenCompare,
      color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
    },

    // Archaeology & Forensics
    {
      id: 'code-archaeology',
      segment: 'archaeology',
      name: 'Code Archaeology ("Why This Exists")',
      category: 'Forensics',
      description: 'Uncovers the historical provenance, original author intent, and birth commit of any file or symbol.',
      icon: Compass,
      tag: 'Origin Forensics',
      action: onOpenArchaeology ? () => onOpenArchaeology() : onOpenTimeline,
      color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
    },
    {
      id: 'legacy-flags',
      segment: 'archaeology',
      name: 'Legacy Flags & Tech Debt Scanner',
      category: 'Forensics',
      description: 'Scans source code for #HACK, #FIXME, #TODO, #DO_NOT_REMOVE, and #WORKAROUND safety markers.',
      icon: Flame,
      tag: 'Debt Markers',
      action: onOpenArchaeology ? () => onOpenArchaeology() : onOpenTechDebt,
      color: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    },
    {
      id: 'git-churn',
      segment: 'archaeology',
      name: 'Git Churn & Hotspot Velocity',
      category: 'Forensics',
      description: 'Detects high-churn, frequently rewritten files correlated with bug frequency.',
      icon: Flame,
      tag: 'Git Velocity',
      action: onOpenAnalytics,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    },
    {
      id: 'time-machine',
      segment: 'archaeology',
      name: 'Repository Time Machine',
      category: 'Forensics',
      description: 'Step backward in repository Git history to view past code structure and symbol states.',
      icon: History,
      tag: 'Time Travel',
      action: onOpenTimeMachine,
      color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
    },
    {
      id: 'execution-playback',
      segment: 'archaeology',
      name: 'Execution Path Playback',
      category: 'Forensics',
      description: 'Step-by-step playback of function call trees and program flow across files.',
      icon: Play,
      tag: 'Flow Playback',
      action: onOpenPlayback,
      color: 'text-teal-400 bg-teal-500/10 border-teal-500/20',
    },
    {
      id: 'timeline-replay',
      segment: 'archaeology',
      name: 'Timeline Replay',
      category: 'Forensics',
      description: 'Chronological replay of commit milestones and repository file growth.',
      icon: Clock,
      tag: 'Commit Replay',
      action: onOpenTimeline,
      color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
    },

    // Quality & Debt
    {
      id: 'executive-report',
      segment: 'quality',
      name: 'Executive Architecture Audit Report',
      category: 'Quality & Tech Debt',
      description: 'Comprehensive A-F grade scorecard across maintainability, modularity, security, and coupling.',
      icon: FileCheck2,
      tag: 'Scorecard A-F',
      action: onOpenExecutiveReport || (() => {}),
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    },
    {
      id: 'tech-debt',
      segment: 'quality',
      name: '8-Dimension Tech Debt Matrix',
      category: 'Quality & Tech Debt',
      description: 'Breaks down technical debt across complexity, test deficit, coupling, and churn.',
      icon: Scale,
      tag: 'Debt Breakdown',
      action: onOpenTechDebt,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    },
    {
      id: 'dead-code',
      segment: 'quality',
      name: 'Dead Code & Unused Symbol Sweeper',
      category: 'Quality & Tech Debt',
      description: 'Identifies unreferenced functions, orphaned classes, and dead exports.',
      icon: Trash2,
      tag: 'Code Cleanup',
      action: onOpenDeadCode,
      color: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    },
    {
      id: 'code-clones',
      segment: 'quality',
      name: 'AST Code Clone Detector',
      category: 'Quality & Tech Debt',
      description: 'Finds exact and near-miss duplicated logic across files using AST hash fingerprints.',
      icon: Files,
      tag: 'Duplicate Logic',
      action: onOpenClones,
      color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    },
    {
      id: 'refactoring-advisor',
      segment: 'quality',
      name: 'AI Refactoring Advisor',
      category: 'Quality & Tech Debt',
      description: 'Detects God classes, feature envy, and proposes automated extraction patterns.',
      icon: Wrench,
      tag: 'Refactor AI',
      action: onOpenRefactoring,
      color: 'text-teal-400 bg-teal-500/10 border-teal-500/20',
    },
    {
      id: 'test-advisor',
      segment: 'quality',
      name: 'Intelligent Test Advisor',
      category: 'Quality & Tech Debt',
      description: 'Identifies untested high-risk symbols and recommends critical test scenarios.',
      icon: TestTube2,
      tag: 'Test Gaps',
      action: onOpenTestAdvisor,
      color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
    },
    {
      id: 'module-health',
      segment: 'quality',
      name: 'Module Cohesion & Health Radar',
      category: 'Quality & Tech Debt',
      description: 'Evaluates Robert C. Martin stability, abstractness, and distance from main sequence.',
      icon: HeartPulse,
      tag: 'Cohesion',
      action: onOpenModuleHealth,
      color: 'text-pink-400 bg-pink-500/10 border-pink-500/20',
    },

    // PR Review & Security
    {
      id: 'pr-review-composer',
      segment: 'pr',
      name: 'Automated PR Review Comment Composer',
      category: 'PR Review & Security',
      description: 'Calculates blast radius, caller regressions, and synthesizes complete Markdown PR review comment ready to paste.',
      icon: GitPullRequest,
      tag: 'PR Composer',
      action: onOpenPRImpact,
      color: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    },
    {
      id: 'code-review',
      segment: 'pr',
      name: 'Automated Code Review & Antipatterns',
      category: 'PR Review & Security',
      description: 'Reviews pull request changes against best practices, security standards, and modularity rules.',
      icon: FileCheck2,
      tag: 'Code Review',
      action: onOpenReview,
      color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
    },
    {
      id: 'security-scanner',
      segment: 'pr',
      name: 'SAST Security & Vulnerability Scanner',
      category: 'PR Review & Security',
      description: 'Detects OWASP Top 10 vulnerabilities, hardcoded secrets, injection vectors, and weak cryptos.',
      icon: ShieldAlert,
      tag: 'SAST Audit',
      action: onOpenSecurity,
      color: 'text-red-400 bg-red-500/10 border-red-500/20',
    },
    {
      id: 'data-flow',
      segment: 'pr',
      name: 'Data Flow & Taint Analyzer',
      category: 'PR Review & Security',
      description: 'Traces untrusted user inputs through function arguments down into database or shell sinks.',
      icon: Zap,
      tag: 'Taint Analysis',
      action: onOpenDataFlow,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    },
    {
      id: 'api-mapper',
      segment: 'pr',
      name: 'API Dependency & Contract Mapper',
      category: 'PR Review & Security',
      description: 'Maps REST endpoints, HTTP methods, controllers, and external API integrations.',
      icon: Globe,
      tag: 'API Contracts',
      action: onOpenApiMapper,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    },
    {
      id: 'knowledge-graph',
      segment: 'pr',
      name: 'Unified Repository Knowledge Graph',
      category: 'PR Review & Security',
      description: 'Unifies code ASTs, Git authors, documentation, and database tables into one graph.',
      icon: Network,
      tag: 'Knowledge Graph',
      action: onOpenKnowledgeGraph,
      color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    },
    {
      id: 'migration-planner',
      segment: 'pr',
      name: 'Modernization & Migration Planner',
      category: 'PR Review & Security',
      description: 'Generates step-by-step roadmap for framework updates, typing upgrades, and async refactors.',
      icon: Compass,
      tag: 'Migration AI',
      action: onOpenMigration,
      color: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
    },
    {
      id: 'framework-overview',
      segment: 'pr',
      name: 'Framework & Runtime Overview',
      category: 'PR Review & Security',
      description: 'Detects ecosystem frameworks, build tools, backend web engines, and UI libraries.',
      icon: Package,
      tag: 'Ecosystem',
      action: onOpenFramework,
      color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    },
    {
      id: 'platform-docs',
      segment: 'pr',
      name: 'Platform Documentation & Manual',
      category: 'PR Review & Security',
      description: 'Complete user manual and developer documentation for the Nous platform.',
      icon: BookOpen,
      tag: 'Documentation',
      action: onOpenPlatformDocs || onOpenDocs,
      color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
    },
  ];

  const filteredTools = searchQuery.trim()
    ? allTools.filter(
        (t) =>
          t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.tag.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : allTools.filter((t) => t.segment === selectedSegment);

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

            {/* Topology Status */}
            <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-2xl text-xs text-slate-300 flex items-start gap-2.5 leading-relaxed font-sans">
              <Network className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-cyan-300">Deterministic Topology: </span>
                <span>AST graph with Clean Architecture boundary checker and DeepSeek V4 AI active.</span>
              </div>
            </div>
          </div>

          {/* Quick Action Chips */}
          <div className="flex items-center gap-2.5 flex-wrap lg:flex-nowrap flex-shrink-0">
            {onOpenArchitectAI && (
              <button
                onClick={onOpenArchitectAI}
                className="px-3.5 py-2.5 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/40 text-cyan-300 font-semibold text-xs transition flex items-center gap-2 shadow-lg shadow-cyan-950/30"
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                <span>Architect AI</span>
              </button>
            )}

            {onOpenRippleSimulator && (
              <button
                onClick={onOpenRippleSimulator}
                className="px-3.5 py-2.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 font-semibold text-xs transition flex items-center gap-2 shadow-lg shadow-rose-950/30"
              >
                <Activity className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                <span>Ripple Effect</span>
              </button>
            )}

            {onOpenArchaeology && (
              <button
                onClick={() => onOpenArchaeology()}
                className="px-3.5 py-2.5 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-300 font-semibold text-xs transition flex items-center gap-2 shadow-lg shadow-amber-950/30"
              >
                <Compass className="w-3.5 h-3.5 text-amber-400" />
                <span>Archaeology</span>
              </button>
            )}

            {onOpenExecutiveReport && (
              <button
                onClick={onOpenExecutiveReport}
                className="px-3.5 py-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 font-semibold text-xs transition flex items-center gap-2 shadow-lg shadow-emerald-950/30"
              >
                <FileCheck2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Audit</span>
              </button>
            )}

            <button
              onClick={onOpenIngestModal}
              className="px-3.5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition flex items-center gap-2 shadow-lg shadow-cyan-900/30"
            >
              <FolderGit2 className="w-3.5 h-3.5" />
              <span>Switch</span>
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

      {/* 2. COMMAND CENTER SEGMENT CONTROLS & INSTANT SEARCH BAR */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <SlidersHorizontal className="w-5 h-5 text-cyan-400" />
              <span>Feature Command Center</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Select a functional segment or type to instantly search across all 30+ intelligence tools.
            </p>
          </div>

          {/* Instant Universal Search Filter */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search features (e.g. Clean Arch, PR, Debt)..."
              className="w-full pl-9 pr-8 py-2 bg-slate-900/90 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition shadow-inner"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs p-1"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* SEGMENT TABS */}
        {!searchQuery && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 p-1.5 bg-slate-900/60 border border-slate-800/80 rounded-2xl">
            {segments.map((seg) => {
              const Icon = seg.icon;
              const isSelected = selectedSegment === seg.id;
              return (
                <button
                  key={seg.id}
                  onClick={() => setSelectedSegment(seg.id)}
                  className={`p-3 rounded-xl transition flex flex-col items-start text-left border ${
                    isSelected
                      ? `${seg.activeColor} border`
                      : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-slate-500'}`} />
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-950/70 border border-slate-800/80 text-slate-300">
                      {seg.badge}
                    </span>
                  </div>
                  <span className={`text-xs font-bold mt-2 ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                    {seg.name}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. SPOTLIGHT HERO FOR ACTIVE SEGMENT (When not searching) */}
      {!searchQuery && (
        <>
          {selectedSegment === 'canvas' && (
            <div
              onClick={() => onNavigateToGraph('file')}
              className="p-6 bg-gradient-to-r from-cyan-950/40 via-slate-900 to-slate-950 border border-cyan-500/30 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 cursor-pointer group hover:border-cyan-500/60 transition shadow-xl"
            >
              <div className="space-y-2 max-w-3xl">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold">
                    Interactive Canvas
                  </span>
                  <span className="text-xs text-slate-400">Primary System Topology View</span>
                </div>
                <h3 className="text-lg font-bold text-white group-hover:text-cyan-300 transition flex items-center gap-2">
                  Interactive System Architecture Graph
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition text-cyan-400" />
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Full reactive canvas with Dagre hierarchical and Force-directed layouts, instant symbol blast radius isolation, circular cycle highlighter, and real-time inspector.
                </p>
              </div>
              <button className="px-4 py-2.5 bg-cyan-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-cyan-500/20 group-hover:bg-cyan-400 transition self-start md:self-auto shrink-0">
                Launch Canvas →
              </button>
            </div>
          )}

          {selectedSegment === 'ai' && (
            <div
              onClick={onOpenArchitectAI}
              className="p-6 bg-gradient-to-r from-amber-950/30 via-slate-900 to-slate-950 border border-amber-500/30 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 cursor-pointer group hover:border-amber-500/60 transition shadow-xl"
            >
              <div className="space-y-2 max-w-3xl">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                    NVIDIA DeepSeek V4 Flash
                  </span>
                  <span className="text-xs text-slate-400">Graph-RAG Architectural AI</span>
                </div>
                <h3 className="text-lg font-bold text-white group-hover:text-amber-300 transition flex items-center gap-2">
                  Architect AI Copilot & Sequence Explainer
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition text-amber-400" />
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Ask deep questions grounded in deterministic graph facts, extract UML sequence diagrams, and generate multi-step implementation plans for complex refactors.
                </p>
              </div>
              <button className="px-4 py-2.5 bg-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 group-hover:bg-amber-400 transition self-start md:self-auto shrink-0">
                Open AI Copilot →
              </button>
            </div>
          )}

          {selectedSegment === 'drift' && (
            <div
              onClick={onOpenDrift}
              className="p-6 bg-gradient-to-r from-emerald-950/30 via-slate-900 to-slate-950 border border-emerald-500/30 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 cursor-pointer group hover:border-emerald-500/60 transition shadow-xl"
            >
              <div className="space-y-2 max-w-3xl">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                    4-Tier Blueprint
                  </span>
                  <span className="text-xs text-slate-400">Clean Architecture Boundary Enforcer</span>
                </div>
                <h3 className="text-lg font-bold text-white group-hover:text-emerald-300 transition flex items-center gap-2">
                  Clean Architecture Drift & Automated Refactoring Fixes
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition text-emerald-400" />
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Validates Domain → Application → Infrastructure → Presentation layer constraints, flags reverse dependencies and layer bypasses, and synthesizes ready-to-use LLM fix prompts.
                </p>
              </div>
              <button className="px-4 py-2.5 bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 group-hover:bg-emerald-400 transition self-start md:self-auto shrink-0">
                Inspect Blueprint →
              </button>
            </div>
          )}

          {selectedSegment === 'archaeology' && (
            <div
              onClick={() => onOpenArchaeology && onOpenArchaeology()}
              className="p-6 bg-gradient-to-r from-yellow-950/30 via-slate-900 to-slate-950 border border-yellow-500/30 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 cursor-pointer group hover:border-yellow-500/60 transition shadow-xl"
            >
              <div className="space-y-2 max-w-3xl">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 font-bold">
                    Git Provenance & Debt
                  </span>
                  <span className="text-xs text-slate-400">Code Archaeology Engine</span>
                </div>
                <h3 className="text-lg font-bold text-white group-hover:text-yellow-300 transition flex items-center gap-2">
                  "Why Does This Code Exist?" & Legacy Flags Forensics
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition text-yellow-400" />
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Investigate the birth of any code module, author intent, revision history, and line-by-line #HACK, #FIXME, #TODO, and #DO_NOT_REMOVE safety markers across your repository.
                </p>
              </div>
              <button className="px-4 py-2.5 bg-yellow-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-yellow-500/20 group-hover:bg-yellow-400 transition self-start md:self-auto shrink-0">
                Investigate Origin →
              </button>
            </div>
          )}

          {selectedSegment === 'quality' && (
            <div
              onClick={onOpenExecutiveReport}
              className="p-6 bg-gradient-to-r from-purple-950/30 via-slate-900 to-slate-950 border border-purple-500/30 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 cursor-pointer group hover:border-purple-500/60 transition shadow-xl"
            >
              <div className="space-y-2 max-w-3xl">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold">
                    Audit Grade A-F
                  </span>
                  <span className="text-xs text-slate-400">Executive Quality Scorecard</span>
                </div>
                <h3 className="text-lg font-bold text-white group-hover:text-purple-300 transition flex items-center gap-2">
                  Executive Architecture & Security Audit Report
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition text-purple-400" />
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Generates an enterprise-ready executive report with letter grades, risk breakdowns, technical debt estimates, test deficits, and automated remediation action plans.
                </p>
              </div>
              <button className="px-4 py-2.5 bg-purple-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-purple-500/20 group-hover:bg-purple-400 transition self-start md:self-auto shrink-0">
                View Audit Report →
              </button>
            </div>
          )}

          {selectedSegment === 'pr' && (
            <div
              onClick={onOpenPRImpact}
              className="p-6 bg-gradient-to-r from-rose-950/30 via-slate-900 to-slate-950 border border-rose-500/30 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 cursor-pointer group hover:border-rose-500/60 transition shadow-xl"
            >
              <div className="space-y-2 max-w-3xl">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold">
                    Pre-Merge Safety
                  </span>
                  <span className="text-xs text-slate-400">Automated PR Review Comment</span>
                </div>
                <h3 className="text-lg font-bold text-white group-hover:text-rose-300 transition flex items-center gap-2">
                  Automated GitHub PR Review Comment Composer
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition text-rose-400" />
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Simulates pull request changes to calculate blast radius, downstream caller regressions, affected API endpoints, and generates a ready-to-paste GitHub Markdown review comment.
                </p>
              </div>
              <button className="px-4 py-2.5 bg-rose-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-rose-500/20 group-hover:bg-rose-400 transition self-start md:self-auto shrink-0">
                Generate PR Review →
              </button>
            </div>
          )}
        </>
      )}

      {/* 4. STRUCTURED TOOLS GRID */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
            {searchQuery ? `Search Results (${filteredTools.length})` : `${segments.find((s) => s.id === selectedSegment)?.name} Tools`}
          </span>
          <span className="text-xs font-mono text-slate-500">
            {filteredTools.length} {filteredTools.length === 1 ? 'tool' : 'tools'} available
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredTools.map((tool) => {
            const Icon = tool.icon;
            return (
              <div
                key={tool.id}
                onClick={tool.action}
                className="p-5 bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-cyan-500/40 rounded-2xl transition cursor-pointer group flex flex-col justify-between space-y-3.5 shadow-sm relative overflow-hidden"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className={`p-2.5 rounded-xl border ${tool.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-950 border border-slate-800 text-slate-300">
                      {tool.tag}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-100 group-hover:text-cyan-300 transition">
                      {tool.name}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed line-clamp-2">
                      {tool.description}
                    </p>
                  </div>
                </div>

                <div className="pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono text-cyan-400 group-hover:text-cyan-300 transition">
                  <span className="text-[11px]">Open Tool</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
                </div>
              </div>
            );
          })}
        </div>

        {filteredTools.length === 0 && (
          <div className="p-12 text-center bg-slate-900/40 border border-slate-800 rounded-2xl space-y-2">
            <Search className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-xs font-mono text-slate-400">
              No tools found matching "{searchQuery}".
            </p>
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs text-cyan-400 hover:underline font-mono"
            >
              Clear search filter
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
