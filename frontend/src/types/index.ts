export type ViewMode = 'module' | 'file' | 'symbol' | 'combined';

export interface GraphNodeData {
  id: string;
  name?: string;
  label?: string;
  relativePath?: string;
  filePath?: string;
  moduleName?: string;
  language?: string;
  lineCount?: number;
  symbolCount?: number;
  fileCount?: number;
  importCount?: number;
  exportCount?: number;
  afferentCoupling?: number;
  efferentCoupling?: number;
  instability?: number;
  inCycle?: boolean;
  isTarget?: boolean;
  kind?: string;
  signature?: string;
  docstring?: string;
  complexity?: number;
  scope?: string;
  startLine?: number;
  endLine?: number;
  files?: string[];
  symbols?: Array<{ name: string; kind: string; line: number }>;
}

export interface GraphNode {
  id: string;
  type: 'moduleNode' | 'fileNode' | 'symbolNode';
  data: GraphNodeData;
  position: { x: number; y: number };
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  animated?: boolean;
  data?: {
    weight?: number;
    symbols?: string[];
    raw_call?: string;
    lineNumber?: number;
    isBlastRadius?: boolean;
  };
}

export interface GraphSummary {
  total_files: number;
  total_modules: number;
  total_symbols: number;
  total_calls: number;
  total_dependencies: number;
  circular_cycles_count: number;
}

export interface GraphStructureResponse {
  nodes: GraphNode[];
  edges: GraphEdge[];
  view_mode: ViewMode;
  summary: GraphSummary;
}

export interface BlastRadiusItem {
  id: string;
  name: string;
  type: 'symbol' | 'file';
  file_path: string;
  depth: number;
  impact_score: number;
  relationship: string;
}

export interface BlastRadiusResponse {
  target_id: string;
  target_name: string;
  target_type: 'symbol' | 'file';
  total_impacted_symbols: number;
  total_impacted_files: number;
  impact_items: BlastRadiusItem[];
  subgraph_nodes: GraphNode[];
  subgraph_edges: GraphEdge[];
}

export interface SearchResultItem {
  id: string;
  symbol_name?: string;
  symbol_kind?: string;
  file_path: string;
  relative_path: string;
  start_line: number;
  end_line: number;
  matched_snippet: string;
  context_header: string;
  score: number;
  match_type: string;
  node_id: string;
}

export interface SearchResponse {
  query: string;
  total_matches: number;
  results: SearchResultItem[];
}

export interface DeadCodeSymbol {
  id: string;
  name: string;
  kind: string;
  file_path: string;
  relative_path: string;
  line_number: number;
  reason: string;
}

export interface CircularDependencyItem {
  cycle_id: string;
  length: number;
  files: string[];
  relative_files: string[];
  description: string;
}

export interface HotspotItem {
  id: string;
  name: string;
  kind: string;
  relative_path: string;
  start_line: number;
  complexity: number;
  incoming_calls: number;
  risk_score: number;
}

export interface ArchitectureMetricsResponse {
  total_files: number;
  total_loc: number;
  total_symbols: number;
  total_calls: number;
  language_distribution: Record<string, number>;
  dead_code_count: number;
  circular_cycles_count: number;
  dead_code_symbols: DeadCodeSymbol[];
  circular_dependencies: CircularDependencyItem[];
  hotspots: HotspotItem[];
}

export interface FileContentResponse {
  file_path: string;
  relative_path: string;
  language: string;
  content: string;
  total_lines: number;
  start_line?: number;
  end_line?: number;
}

export interface SampleItem {
  id: string;
  name: string;
  path: string;
}
