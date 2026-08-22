import { useState, useEffect, useCallback } from 'react';
import type {
  GraphStructureResponse,
  GraphNodeData,
  ViewMode,
  SearchResultItem,
  BlastRadiusResponse,
} from './types';
import {
  fetchGraphStructure,
  fetchBlastRadius,
  fetchIngestStatus,
} from './services/api';
import { Header } from './components/layout/Header';
import { FilterBar } from './components/layout/FilterBar';
import { ArchitectureCanvas } from './components/canvas/ArchitectureCanvas';
import { NodeInspector } from './components/inspector/NodeInspector';
import { SearchModal } from './components/search/SearchModal';
import { AnalyticsDrawer } from './components/analytics/AnalyticsDrawer';
import { SequenceModal } from './components/sequence/SequenceModal';
import { RulesModal } from './components/rules/RulesModal';
import { ClonesModal } from './components/clones/ClonesModal';
import { FactsExplorerModal } from './components/facts/FactsExplorerModal';
import { DatabaseModal } from './components/database/DatabaseModal';
import { SecurityModal } from './components/security/SecurityModal';
import { CopilotModal } from './components/copilot/CopilotModal';
import { FrameworkModal } from './components/framework/FrameworkModal';
import { IngestModal } from './components/ingest/IngestModal';
import { RepositoryDashboard } from './components/dashboard/RepositoryDashboard';
import { TimelineModal } from './components/timeline/TimelineModal';
import { ApiFlowModal } from './components/apiflow/ApiFlowModal';
import { DependencyModal } from './components/dependencies/DependencyModal';
import { CompareModal } from './components/compare/CompareModal';
import { CodeReviewModal } from './components/review/CodeReviewModal';
import { DeadCodeModal } from './components/deadcode/DeadCodeModal';
import { ImpactSimulatorModal } from './components/impact/ImpactSimulatorModal';
import { DataFlowModal } from './components/dataflow/DataFlowModal';
import { ApiMapperModal } from './components/apimapper/ApiMapperModal';
import { ArchitectureStyleModal } from './components/architecture/ArchitectureStyleModal';
import { ArchitectureDriftModal } from './components/drift/ArchitectureDriftModal';
import { TechDebtModal } from './components/techdebt/TechDebtModal';
import { ModuleHealthModal } from './components/modulehealth/ModuleHealthModal';
import { RefactoringModal } from './components/refactoring/RefactoringModal';
import { DocumentationModal } from './components/docs/DocumentationModal';
import { PRImpactModal } from './components/pr/PRImpactModal';
import { NLSearchModal } from './components/nlsearch/NLSearchModal';
import { TestAdvisorModal } from './components/testadvisor/TestAdvisorModal';
import { TimeMachineModal } from './components/timemachine/TimeMachineModal';
import { ExecutionPlaybackModal } from './components/playback/ExecutionPlaybackModal';
import { KnowledgeGraphModal } from './components/knowledge/KnowledgeGraphModal';
import { MigrationPlannerModal } from './components/migration/MigrationPlannerModal';
import './App.css';

export function App() {
  // Navigation Screens: 'dashboard' (landing overview) vs 'graph' (interactive visual architecture canvas)
  const [activeScreen, setActiveScreen] = useState<'dashboard' | 'graph'>('dashboard');
  const [viewMode, setViewMode] = useState<ViewMode>('file');
  const [layoutDirection, setLayoutDirection] = useState<'TB' | 'LR'>('TB');
  const [graphData, setGraphData] = useState<GraphStructureResponse | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNodeData | null>(null);
  
  // Modals & Drawers
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [isSequenceOpen, setIsSequenceOpen] = useState(false);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isClonesOpen, setIsClonesOpen] = useState(false);
  const [isFactsOpen, setIsFactsOpen] = useState(false);
  const [isDatabaseOpen, setIsDatabaseOpen] = useState(false);
  const [isSecurityOpen, setIsSecurityOpen] = useState(false);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [isFrameworkOpen, setIsFrameworkOpen] = useState(false);
  const [isIngestModalOpen, setIsIngestModalOpen] = useState(false);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [isApiFlowOpen, setIsApiFlowOpen] = useState(false);
  const [isDependenciesOpen, setIsDependenciesOpen] = useState(false);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isDeadCodeOpen, setIsDeadCodeOpen] = useState(false);
  const [isImpactOpen, setIsImpactOpen] = useState(false);
  const [isDataFlowOpen, setIsDataFlowOpen] = useState(false);
  const [isApiMapperOpen, setIsApiMapperOpen] = useState(false);
  const [isArchitectureStyleOpen, setIsArchitectureStyleOpen] = useState(false);
  const [isDriftOpen, setIsDriftOpen] = useState(false);
  const [isTechDebtOpen, setIsTechDebtOpen] = useState(false);
  const [isModuleHealthOpen, setIsModuleHealthOpen] = useState(false);
  const [isRefactoringOpen, setIsRefactoringOpen] = useState(false);
  const [isDocsOpen, setIsDocsOpen] = useState(false);
  const [isPRImpactOpen, setIsPRImpactOpen] = useState(false);
  const [isNLSearchOpen, setIsNLSearchOpen] = useState(false);
  const [isTestAdvisorOpen, setIsTestAdvisorOpen] = useState(false);
  const [isTimeMachineOpen, setIsTimeMachineOpen] = useState(false);
  const [isPlaybackOpen, setIsPlaybackOpen] = useState(false);
  const [isKnowledgeGraphOpen, setIsKnowledgeGraphOpen] = useState(false);
  const [isMigrationOpen, setIsMigrationOpen] = useState(false);
  const [sequenceTargetSymbol, setSequenceTargetSymbol] = useState<string | undefined>(undefined);

  const [blastRadiusData, setBlastRadiusData] = useState<BlastRadiusResponse | null>(null);
  const [status, setStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load graph structure from backend
  const loadGraph = useCallback(async (mode: ViewMode = viewMode) => {
    setIsLoading(true);
    try {
      const data = await fetchGraphStructure(mode);
      setGraphData(data);
      const statusRes = await fetchIngestStatus();
      setStatus(statusRes);
    } catch (err) {
      console.error('Failed to load graph structure:', err);
    } finally {
      setIsLoading(false);
    }
  }, [viewMode]);

  // Initial load
  useEffect(() => {
    loadGraph();
  }, [loadGraph]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
        setIsAnalyticsOpen(false);
        setIsSequenceOpen(false);
        setIsRulesOpen(false);
        setIsClonesOpen(false);
        setIsFactsOpen(false);
        setIsDatabaseOpen(false);
        setIsSecurityOpen(false);
        setIsCopilotOpen(false);
        setIsFrameworkOpen(false);
        setIsIngestModalOpen(false);
        setIsTimelineOpen(false);
        setIsApiFlowOpen(false);
        setIsDependenciesOpen(false);
        setIsCompareOpen(false);
        setIsReviewOpen(false);
        setIsDeadCodeOpen(false);
        setIsImpactOpen(false);
        setIsDataFlowOpen(false);
        setIsApiMapperOpen(false);
        setIsArchitectureStyleOpen(false);
        setIsDriftOpen(false);
        setIsTechDebtOpen(false);
        setIsModuleHealthOpen(false);
        setIsRefactoringOpen(false);
        setIsDocsOpen(false);
        setIsPRImpactOpen(false);
        setIsNLSearchOpen(false);
        setIsTestAdvisorOpen(false);
        setIsTimeMachineOpen(false);
        setIsPlaybackOpen(false);
        setIsKnowledgeGraphOpen(false);
        setIsMigrationOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    setBlastRadiusData(null);
    loadGraph(mode);
  };

  const handleNavigateToGraph = (mode: ViewMode) => {
    setViewMode(mode);
    setBlastRadiusData(null);
    loadGraph(mode);
    setActiveScreen('graph');
  };

  const handleNodeClick = (nodeData: GraphNodeData) => {
    setSelectedNode(nodeData);
  };

  const handleCalculateBlastRadius = async (targetId: string, targetType: 'symbol' | 'file' = 'file') => {
    try {
      const blast = await fetchBlastRadius(targetId, targetType);
      setBlastRadiusData(blast);
      setActiveScreen('graph');
    } catch (err) {
      console.error('Blast radius calculation failed:', err);
    }
  };

  const handleSelectSearchResult = (result: SearchResultItem) => {
    const node = graphData?.nodes.find((n) => n.id === result.node_id || n.data.filePath === result.file_path);
    if (node) {
      setSelectedNode(node.data);
      setActiveScreen('graph');
    }
  };

  const handleTraceSequence = (symbolId: string) => {
    setSequenceTargetSymbol(symbolId);
    setIsSequenceOpen(true);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Top Navigation Bar */}
      <Header
        activeScreen={activeScreen}
        onNavigateScreen={setActiveScreen}
        currentViewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenSequence={() => {
          setSequenceTargetSymbol(undefined);
          setIsSequenceOpen(true);
        }}
        onOpenRules={() => setIsRulesOpen(true)}
        onOpenClones={() => setIsClonesOpen(true)}
        onOpenFacts={() => setIsFactsOpen(true)}
        onOpenDatabase={() => setIsDatabaseOpen(true)}
        onOpenSecurity={() => setIsSecurityOpen(true)}
        onOpenCopilot={() => setIsCopilotOpen(true)}
        onOpenFramework={() => setIsFrameworkOpen(true)}
        onRefreshGraph={() => loadGraph()}
        currentRepoPath={status?.current_repo_path}
      />

      {/* Main Workspace: Either Repository Dashboard OR Architecture Graph */}
      <main className="flex-1 relative flex overflow-hidden">
        {activeScreen === 'dashboard' ? (
          <RepositoryDashboard
            currentRepoPath={status?.current_repo_path}
            summary={graphData?.summary}
            onNavigateToGraph={handleNavigateToGraph}
            onOpenDatabase={() => setIsDatabaseOpen(true)}
            onOpenSecurity={() => setIsSecurityOpen(true)}
            onOpenCopilot={() => setIsCopilotOpen(true)}
            onOpenFramework={() => setIsFrameworkOpen(true)}
            onOpenFacts={() => setIsFactsOpen(true)}
            onOpenSequence={() => {
              setSequenceTargetSymbol(undefined);
              setIsSequenceOpen(true);
            }}
            onOpenRules={() => setIsRulesOpen(true)}
            onOpenClones={() => setIsClonesOpen(true)}
            onOpenSearch={() => setIsSearchOpen(true)}
            onOpenAnalytics={() => setIsAnalyticsOpen(true)}
            onOpenIngestModal={() => setIsIngestModalOpen(true)}
            onOpenTimeline={() => setIsTimelineOpen(true)}
            onOpenApiFlow={() => setIsApiFlowOpen(true)}
            onOpenDependencies={() => setIsDependenciesOpen(true)}
            onOpenCompare={() => setIsCompareOpen(true)}
            onOpenReview={() => setIsReviewOpen(true)}
            onOpenDeadCode={() => setIsDeadCodeOpen(true)}
            onOpenImpact={() => setIsImpactOpen(true)}
            onOpenDataFlow={() => setIsDataFlowOpen(true)}
            onOpenApiMapper={() => setIsApiMapperOpen(true)}
            onOpenArchitectureStyle={() => setIsArchitectureStyleOpen(true)}
            onOpenDrift={() => setIsDriftOpen(true)}
            onOpenTechDebt={() => setIsTechDebtOpen(true)}
            onOpenModuleHealth={() => setIsModuleHealthOpen(true)}
            onOpenRefactoring={() => setIsRefactoringOpen(true)}
            onOpenDocs={() => setIsDocsOpen(true)}
            onOpenPRImpact={() => setIsPRImpactOpen(true)}
            onOpenNLSearch={() => setIsNLSearchOpen(true)}
            onOpenTestAdvisor={() => setIsTestAdvisorOpen(true)}
            onOpenTimeMachine={() => setIsTimeMachineOpen(true)}
            onOpenPlayback={() => setIsPlaybackOpen(true)}
            onOpenKnowledgeGraph={() => setIsKnowledgeGraphOpen(true)}
            onOpenMigration={() => setIsMigrationOpen(true)}
          />
        ) : (
          <>
            {/* Left Filter & Controls Toolbar */}
            <FilterBar
              summary={graphData?.summary}
              layoutDirection={layoutDirection}
              onToggleLayoutDirection={() =>
                setLayoutDirection((prev) => (prev === 'TB' ? 'LR' : 'TB'))
              }
              isBlastRadiusActive={!!blastRadiusData}
              onResetBlastRadius={() => setBlastRadiusData(null)}
              currentViewMode={viewMode}
              onViewModeChange={handleViewModeChange}
            />

            {/* Central Graph Canvas */}
            <div className="flex-1 relative h-full">
              {isLoading ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 z-20 gap-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
                  <span className="text-xs font-mono text-slate-400">Building architecture topology...</span>
                </div>
              ) : null}

              <ArchitectureCanvas
                nodes={blastRadiusData ? blastRadiusData.subgraph_nodes : (graphData?.nodes || [])}
                edges={blastRadiusData ? blastRadiusData.subgraph_edges : (graphData?.edges || [])}
                onSelectNode={handleNodeClick}
                layoutDirection={layoutDirection}
                isBlastRadiusActive={!!blastRadiusData}
              />
            </div>

            {/* Right Inspector Drawer */}
            <NodeInspector
              node={selectedNode}
              onClose={() => setSelectedNode(null)}
              onCalculateBlastRadius={(nodeId) => handleCalculateBlastRadius(nodeId, 'file')}
              onTraceSequence={handleTraceSequence}
            />
          </>
        )}

        {/* Analytics Left Drawer */}
        <AnalyticsDrawer
          isOpen={isAnalyticsOpen}
          onClose={() => setIsAnalyticsOpen(false)}
          onSelectSymbol={(symId) => {
            const node = graphData?.nodes.find((n) => n.id === symId);
            if (node) {
              setSelectedNode(node.data);
              setActiveScreen('graph');
            }
          }}
          onHighlightCycle={(_cycleFiles) => {
            setIsAnalyticsOpen(false);
          }}
        />

        {/* Command Palette Search Modal */}
        <SearchModal
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
          onSelectResult={handleSelectSearchResult}
          onCalculateBlastRadius={(nodeId) => handleCalculateBlastRadius(nodeId, 'file')}
        />

        {/* Sequence Diagram Modal */}
        <SequenceModal
          isOpen={isSequenceOpen}
          onClose={() => {
            setIsSequenceOpen(false);
            setSequenceTargetSymbol(undefined);
          }}
          targetSymbolId={sequenceTargetSymbol}
        />

        {/* Architecture Rules Linter Modal */}
        <RulesModal
          isOpen={isRulesOpen}
          onClose={() => setIsRulesOpen(false)}
        />

        {/* AST Duplicate Code & Clones Modal */}
        <ClonesModal
          isOpen={isClonesOpen}
          onClose={() => setIsClonesOpen(false)}
        />

        {/* RipEx Facts Explorer Modal */}
        <FactsExplorerModal
          isOpen={isFactsOpen}
          onClose={() => setIsFactsOpen(false)}
          onTraceSequence={handleTraceSequence}
          currentRepoPath={status?.current_repo_path}
        />

        {/* Database ERD Modal */}
        <DatabaseModal
          isOpen={isDatabaseOpen}
          onClose={() => setIsDatabaseOpen(false)}
          currentRepoPath={status?.current_repo_path}
        />

        {/* Security Audit Modal */}
        <SecurityModal
          isOpen={isSecurityOpen}
          onClose={() => setIsSecurityOpen(false)}
          currentRepoPath={status?.current_repo_path}
        />

        {/* AI Copilot Modal */}
        <CopilotModal
          isOpen={isCopilotOpen}
          onClose={() => setIsCopilotOpen(false)}
          currentRepoPath={status?.current_repo_path}
          onSelectFile={(f) => {
            const node = graphData?.nodes.find(
              (n) => n.data.relativePath === f || n.data.filePath?.endsWith(f)
            );
            if (node) {
              setSelectedNode(node.data);
              setActiveScreen('graph');
              setIsCopilotOpen(false);
            }
          }}
        />

        {/* Framework & Layers Modal */}
        <FrameworkModal
          isOpen={isFrameworkOpen}
          onClose={() => setIsFrameworkOpen(false)}
          currentRepoPath={status?.current_repo_path}
        />

        {/* Timeline Replay Modal */}
        <TimelineModal
          isOpen={isTimelineOpen}
          onClose={() => setIsTimelineOpen(false)}
          currentRepoPath={status?.current_repo_path}
        />

        {/* API Flow & Lifecycle Modal */}
        <ApiFlowModal
          isOpen={isApiFlowOpen}
          onClose={() => setIsApiFlowOpen(false)}
          currentRepoPath={status?.current_repo_path}
        />

        {/* Supply Chain & Dependencies Modal */}
        <DependencyModal
          isOpen={isDependenciesOpen}
          onClose={() => setIsDependenciesOpen(false)}
          currentRepoPath={status?.current_repo_path}
        />

        {/* Architecture Diff & Comparison Modal */}
        <CompareModal
          isOpen={isCompareOpen}
          onClose={() => setIsCompareOpen(false)}
          currentRepoPath={status?.current_repo_path}
        />

        {/* Automated Code Review Modal */}
        <CodeReviewModal
          isOpen={isReviewOpen}
          onClose={() => setIsReviewOpen(false)}
          currentRepoPath={status?.current_repo_path}
        />

        {/* Dead Code & Unused Logic Modal */}
        <DeadCodeModal
          isOpen={isDeadCodeOpen}
          onClose={() => setIsDeadCodeOpen(false)}
          onSelectSymbol={(symId) => {
            const node = graphData?.nodes.find((n) => n.id === symId);
            if (node) {
              setSelectedNode(node.data);
              setActiveScreen('graph');
              setIsDeadCodeOpen(false);
            }
          }}
        />

        {/* Change Impact Simulator Modal */}
        <ImpactSimulatorModal
          isOpen={isImpactOpen}
          onClose={() => setIsImpactOpen(false)}
          currentRepoPath={status?.current_repo_path}
        />

        {/* Data Flow Analysis Modal */}
        <DataFlowModal
          isOpen={isDataFlowOpen}
          onClose={() => setIsDataFlowOpen(false)}
          onSelectSymbol={(symId) => {
            const node = graphData?.nodes.find((n) => n.id === symId);
            if (node) {
              setSelectedNode(node.data);
              setActiveScreen('graph');
              setIsDataFlowOpen(false);
            }
          }}
        />

        {/* API Dependency & Protocol Mapper Modal */}
        <ApiMapperModal
          isOpen={isApiMapperOpen}
          onClose={() => setIsApiMapperOpen(false)}
          currentRepoPath={status?.current_repo_path}
        />

        {/* Automatic Architecture Style Detection Modal */}
        <ArchitectureStyleModal
          isOpen={isArchitectureStyleOpen}
          onClose={() => setIsArchitectureStyleOpen(false)}
          currentRepoPath={status?.current_repo_path}
        />

        {/* Architecture Drift Timeline Modal */}
        <ArchitectureDriftModal
          isOpen={isDriftOpen}
          onClose={() => setIsDriftOpen(false)}
          currentRepoPath={status?.current_repo_path}
        />

        {/* Technical Debt Engine Modal */}
        <TechDebtModal
          isOpen={isTechDebtOpen}
          onClose={() => setIsTechDebtOpen(false)}
          currentRepoPath={status?.current_repo_path}
        />

        {/* Module Health Dashboard Modal */}
        <ModuleHealthModal
          isOpen={isModuleHealthOpen}
          onClose={() => setIsModuleHealthOpen(false)}
          currentRepoPath={status?.current_repo_path}
        />

        {/* Intelligent Refactoring Advisor Modal */}
        <RefactoringModal
          isOpen={isRefactoringOpen}
          onClose={() => setIsRefactoringOpen(false)}
          currentRepoPath={status?.current_repo_path}
        />

        {/* Automatic Documentation Generator Modal */}
        <DocumentationModal
          isOpen={isDocsOpen}
          onClose={() => setIsDocsOpen(false)}
          currentRepoPath={status?.current_repo_path}
        />

        {/* PR Blast Radius & Impact Analyzer Modal */}
        <PRImpactModal
          isOpen={isPRImpactOpen}
          onClose={() => setIsPRImpactOpen(false)}
          currentRepoPath={status?.current_repo_path}
        />

        {/* Natural Language Code Search Modal */}
        <NLSearchModal
          isOpen={isNLSearchOpen}
          onClose={() => setIsNLSearchOpen(false)}
          onSelectSymbol={(symId) => {
            const node = graphData?.nodes.find((n) => n.id === symId);
            if (node) {
              setSelectedNode(node.data);
              setActiveScreen('graph');
              setIsNLSearchOpen(false);
            }
          }}
        />

        {/* Intelligent Test Advisor Modal */}
        <TestAdvisorModal
          isOpen={isTestAdvisorOpen}
          onClose={() => setIsTestAdvisorOpen(false)}
          currentRepoPath={status?.current_repo_path}
          onSelectSymbol={(symId) => {
            const node = graphData?.nodes.find((n) => n.id === symId);
            if (node) {
              setSelectedNode(node.data);
              setActiveScreen('graph');
              setIsTestAdvisorOpen(false);
            }
          }}
        />

        {/* Repository Time Machine Modal */}
        <TimeMachineModal
          isOpen={isTimeMachineOpen}
          onClose={() => setIsTimeMachineOpen(false)}
          currentRepoPath={status?.current_repo_path}
        />

        {/* Interactive Execution Playback Modal */}
        <ExecutionPlaybackModal
          isOpen={isPlaybackOpen}
          onClose={() => setIsPlaybackOpen(false)}
          currentRepoPath={status?.current_repo_path}
        />

        {/* Unified Repository Knowledge Graph Modal */}
        <KnowledgeGraphModal
          isOpen={isKnowledgeGraphOpen}
          onClose={() => setIsKnowledgeGraphOpen(false)}
          currentRepoPath={status?.current_repo_path}
        />

        {/* AI Refactoring & Migration Planner Modal */}
        <MigrationPlannerModal
          isOpen={isMigrationOpen}
          onClose={() => setIsMigrationOpen(false)}
          currentRepoPath={status?.current_repo_path}
        />

        {/* Ingest Modal */}
        <IngestModal
          isOpen={isIngestModalOpen}
          onClose={() => setIsIngestModalOpen(false)}
          onSuccess={() => {
            loadGraph();
          }}
          samples={[]}
          currentRepoPath={status?.current_repo_path}
        />
      </main>
    </div>
  );
}

export default App;
