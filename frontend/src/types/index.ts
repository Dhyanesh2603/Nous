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

// Git Churn & Hotspot Types
export interface FileChurnMetric {
  file_path: string;
  relative_path: string;
  total_commits: number;
  lines_added: number;
  lines_deleted: number;
  total_churn: number;
  author_count: number;
  top_author?: string;
  last_modified_date?: string;
  complexity: number;
  hotspot_score: number;
  quadrant: 'critical_hotspot' | 'complex_legacy' | 'frequent_churn' | 'stable';
}

export interface GitChurnReport {
  is_git_repo: boolean;
  total_commits_analyzed: number;
  total_authors: number;
  files: FileChurnMetric[];
  critical_hotspots_count: number;
  complex_legacy_count: number;
  frequent_churn_count: number;
  stable_count: number;
}

// Code Clone Types
export interface CloneInstance {
  id: string;
  file_path: string;
  relative_path: string;
  symbol_name?: string;
  start_line: number;
  end_line: number;
  line_count: number;
  snippet: string;
}

export interface CloneGroup {
  group_id: string;
  clone_type: string;
  similarity_score: number;
  duplicated_lines: number;
  instances_count: number;
  instances: CloneInstance[];
}

export interface CloneReport {
  total_clone_groups: number;
  total_duplicated_lines: number;
  clone_groups: CloneGroup[];
}

// Architecture Rules Types
export interface ArchitectureRule {
  id: string;
  name: string;
  description: string;
  source_pattern: string;
  target_pattern: string;
  action: 'deny' | 'allow';
  severity: 'error' | 'warning';
  preset?: string;
}

export interface RuleViolation {
  rule_id: string;
  rule_name: string;
  source_file: string;
  source_relative: string;
  target_file: string;
  target_relative: string;
  imported_symbols: string[];
  severity: string;
  explanation: string;
}

export interface RuleEvaluationReport {
  total_rules_evaluated: number;
  violations_count: number;
  is_compliant: boolean;
  preset_applied?: string;
  violations: RuleViolation[];
}

// Sequence Diagram Types
export interface SequenceStep {
  step: number;
  depth: number;
  caller_id: string;
  caller_label: string;
  caller_participant: string;
  callee_id: string;
  callee_label: string;
  callee_participant: string;
  raw_call: string;
  line_number: number;
  file_path: string;
}

export interface SequenceParticipant {
  id: string;
  name: string;
  type: string;
  file_path?: string;
}

export interface SequenceDiagramResponse {
  entry_symbol_id: string;
  entry_symbol_name: string;
  mermaid_markdown: string;
  total_steps: number;
  participants: SequenceParticipant[];
  steps: SequenceStep[];
}

// Design Pattern Types
export interface DetectedPattern {
  id: string;
  pattern_name: string;
  category: string;
  symbol_name: string;
  symbol_kind: string;
  file_path: string;
  relative_path: string;
  line_number: number;
  confidence: number;
  evidence: string;
}

export interface ArchitecturalSummary {
  primary_architecture_style: string;
  patterns_count: number;
  detected_patterns: DetectedPattern[];
  module_roles: Record<string, string>;
  recommendations: string[];
}

// RipEx Relational Fact Types
export type FactKind =
  | 'DEF_SYMBOL'
  | 'CALL_REF'
  | 'INSTANTIATES_REF'
  | 'INHERITS_REF'
  | 'TYPE_REF'
  | 'ROUTE_HANDLER_DEF'
  | 'IMPORT_REF'
  | 'EXPORT_DEF'
  | 'MEMBER_DEF';

export interface CodeFact {
  id: string;
  kind: FactKind;
  subject_id: string;
  predicate: string;
  object_id: string;
  file_path: string;
  relative_path: string;
  line_number: number;
  span?: [number, number];
  metadata: Record<string, any>;
}

export interface RouteFact {
  id: string;
  http_method: string;
  route_path: string;
  handler_symbol_id: string;
  handler_name: string;
  file_path: string;
  relative_path: string;
  line_number: number;
}

export interface FactSummary {
  total_facts: number;
  facts_by_kind: Record<string, number>;
  total_routes_detected: number;
  total_instantiations: number;
  total_inheritance_relations: number;
}

export interface FactQueryResponse {
  total_matches: number;
  facts: CodeFact[];
}

export interface SymbolFactsResponse {
  symbol_id: string;
  short_name: string;
  total_facts: number;
  outgoing_facts: CodeFact[];
  incoming_facts: CodeFact[];
  calls_made: CodeFact[];
  called_by: CodeFact[];
  instantiates: CodeFact[];
  instantiated_by: CodeFact[];
  inherits_from: CodeFact[];
  subclasses: CodeFact[];
}
