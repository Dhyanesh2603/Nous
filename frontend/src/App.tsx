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
import './App.css';

export function App() {
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

  // Mode change handler
  const handleViewModeChange = (newMode: ViewMode) => {
    setViewMode(newMode);
    setBlastRadiusData(null);
    loadGraph(newMode);
  };

  // Blast radius calculation
  const handleCalculateBlastRadius = async (nodeId: string) => {
    try {
      const res = await fetchBlastRadius(nodeId);
      setBlastRadiusData(res);
      const targetNode = res.subgraph_nodes.find((n) => n.data.isTarget);
      if (targetNode) {
        setSelectedNode(targetNode.data);
      }
    } catch (err) {
      console.error('Failed to calculate blast radius:', err);
    }
  };

  // Trace sequence flow from a symbol
  const handleTraceSequence = (symbolId: string) => {
    setSequenceTargetSymbol(symbolId);
    setIsSequenceOpen(true);
  };

  // Search selection handler
  const handleSelectSearchResult = (result: SearchResultItem) => {
    const matchedNode = graphData?.nodes.find((n) => n.id === result.node_id);
    if (matchedNode) {
      setSelectedNode(matchedNode.data);
    } else {
      setSelectedNode({
        id: result.node_id,
        name: result.symbol_name || result.relative_path,
        kind: result.symbol_kind,
        relativePath: result.relative_path,
        filePath: result.file_path,
        startLine: result.start_line,
        endLine: result.end_line,
      });
    }
  };

  // Keyboard shortcut listener (Ctrl+K / Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Compute active nodes and edges (standard or blast radius mode)
  const activeNodes = blastRadiusData ? blastRadiusData.subgraph_nodes : graphData?.nodes || [];
  const activeEdges = blastRadiusData ? blastRadiusData.subgraph_edges : graphData?.edges || [];

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden select-none font-sans">
      {/* Top Header */}
      <Header
        currentViewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        onOpenSearch={() => setIsSearchOpen(true)}
        onToggleAnalytics={() => setIsAnalyticsOpen((prev) => !prev)}
        onOpenSequence={() => setIsSequenceOpen(true)}
        onOpenRules={() => setIsRulesOpen(true)}
        onOpenClones={() => setIsClonesOpen(true)}
        onOpenFacts={() => setIsFactsOpen(true)}
        onRefreshGraph={() => {
          setBlastRadiusData(null);
          loadGraph();
        }}
        currentRepoPath={status?.current_repo_path}
        isIndexing={status?.is_indexing}
      />

      {/* Main Canvas Area */}
      <main className="flex-1 relative overflow-hidden">
        {/* Floating Controls */}
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

        {/* Loading Spinner */}
        {isLoading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 z-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mb-3"></div>
            <p className="text-xs font-mono text-slate-400">Loading codebase architecture graph...</p>
          </div>
        ) : (
          <ArchitectureCanvas
            nodes={activeNodes}
            edges={activeEdges}
            onSelectNode={(nodeData) => setSelectedNode(nodeData)}
            layoutDirection={layoutDirection}
            isBlastRadiusActive={!!blastRadiusData}
          />
        )}

        {/* Inspector Side Drawer */}
        <NodeInspector
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
          onCalculateBlastRadius={handleCalculateBlastRadius}
          onTraceSequence={handleTraceSequence}
        />

        {/* Analytics Left Drawer */}
        <AnalyticsDrawer
          isOpen={isAnalyticsOpen}
          onClose={() => setIsAnalyticsOpen(false)}
          onSelectSymbol={(symId) => {
            const node = graphData?.nodes.find((n) => n.id === symId);
            if (node) {
              setSelectedNode(node.data);
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
          onCalculateBlastRadius={handleCalculateBlastRadius}
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
        />
      </main>
    </div>
  );
}

export default App;
