export type ViewMode = 'module' | 'file' | 'symbol' | 'combined' | 'frontend' | 'backend';

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

// Database Analysis Types
export interface ColumnDefinition {
  name: string;
  data_type: string;
  is_primary_key: boolean;
  is_foreign_key: boolean;
  is_nullable: boolean;
  references_table?: string;
  references_column?: string;
}

export interface TableRelationship {
  source_table: string;
  target_table: string;
  relationship_type: string;
  foreign_key?: string;
  references_key?: string;
}

export interface TableDefinition {
  name: string;
  schema_type: string;
  file_path: string;
  relative_path: string;
  line_number: number;
  columns: ColumnDefinition[];
  primary_keys: string[];
}

export interface DatabaseSchemaReport {
  detected: boolean;
  schema_type?: string;
  tables_count: number;
  relationships_count: number;
  tables: TableDefinition[];
  relationships: TableRelationship[];
  mermaid_erd: string;
}

// Security Audit Types
export interface SecurityVulnerability {
  id: string;
  title: string;
  category: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  file_path: string;
  relative_path: string;
  line_number: number;
  matched_snippet: string;
  remediation: string;
  cwe?: string;
}

export interface SecurityAuditReport {
  security_score: number;
  grade: string;
  total_issues: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  vulnerabilities: SecurityVulnerability[];
}

// Performance Insights Types
export interface PerformanceIssue {
  id: string;
  title: string;
  issue_type: string;
  severity: string;
  file_path: string;
  relative_path: string;
  line_number: number;
  matched_snippet: string;
  explanation: string;
  optimization_tip: string;
}

export interface PerformanceReport {
  performance_score: number;
  grade: string;
  total_issues: number;
  n_plus_one_count: number;
  blocking_io_count: number;
  nested_loop_count: number;
  issues: PerformanceIssue[];
}

// Framework Intelligence Types
export interface ComponentInfo {
  name: string;
  framework: string;
  file_path: string;
  relative_path: string;
  line_number: number;
  props: string[];
  hooks_used: string[];
  child_components: string[];
}

export interface BackendLayerMap {
  controllers: Array<{ name: string; file: string; symbols: string[]; endpoints_count: number }>;
  services: Array<{ name: string; file: string; symbols: string[] }>;
  repositories: Array<{ name: string; file: string; symbols: string[] }>;
  middleware_chain: string[];
}

export interface FrameworkOverviewReport {
  detected_frameworks: string[];
  frontend_components: ComponentInfo[];
  backend_layers: BackendLayerMap;
  routes_map: Array<Record<string, any>>;
}

// Repository Health & Technical Debt Types
export interface HealthRadarMetrics {
  architecture_score: number;
  maintainability_score: number;
  security_score: number;
  performance_score: number;
  testability_score: number;
}

export interface RefactoringRecommendation {
  priority: string;
  category: string;
  title: string;
  impact: string;
  remediation: string;
}

export interface RepositoryHealthScorecard {
  overall_score: number;
  overall_grade: string;
  technical_debt_hours: number;
  technical_debt_level: string;
  radar: HealthRadarMetrics;
  total_loc: number;
  total_files: number;
  total_symbols: number;
  circular_cycles_count: number;
  duplicated_lines_count: number;
  recommendations: RefactoringRecommendation[];
}

// AI Copilot & Onboarding Types
export interface CopilotAnswer {
  query: string;
  summary: string;
  markdown_response: string;
  cited_files: string[];
  cited_symbols: string[];
  suggested_actions: string[];
}

export interface ImpactPredictionReport {
  target: string;
  target_type: string;
  breaking_change_probability: number;
  risk_level: string;
  affected_files_count: number;
  affected_symbols_count: number;
  affected_routes: string[];
  affected_tables: string[];
  affected_files: string[];
  suggested_tests: string[];
}

export interface OnboardingStep {
  step_number: number;
  title: string;
  description: string;
  key_files: string[];
  key_symbols: string[];
  learning_goal: string;
}

export interface OnboardingRoadmap {
  repo_name: string;
  primary_languages: string[];
  estimated_reading_time_minutes: number;
  total_steps: number;
  steps: OnboardingStep[];
}

// Timeline & Evolution Types
export interface TimelineCommitSnapshot {
  commit_sha: string;
  short_sha: string;
  author_name: string;
  commit_date: string;
  message: string;
  files_changed_count: number;
  lines_added: number;
  lines_deleted: number;
  cumulative_files_estimate: number;
  architectural_impact: string;
  affected_modules: string[];
}

export interface FeatureEvolutionMilestone {
  feature_name: string;
  first_introduced_commit?: string;
  last_modified_date?: string;
  total_revisions: number;
  active_files: string[];
  lifecycle_stage: string;
}

export interface RepositoryTimelineReport {
  is_git_repo: boolean;
  total_commits: number;
  first_commit_date?: string;
  latest_commit_date?: string;
  timeline_snapshots: TimelineCommitSnapshot[];
  feature_milestones: FeatureEvolutionMilestone[];
}

// API Lifecycle & Flow Types
export interface ApiPipelineStep {
  step_number: number;
  stage: string;
  title: string;
  description: string;
  file_path?: string;
  line_number?: number;
  symbol_name?: string;
}

export interface EndpointLifecycle {
  id: string;
  http_method: string;
  route_path: string;
  handler_name: string;
  file_path: string;
  relative_path: string;
  line_number: number;
  summary: string;
  middleware_chain: string[];
  auth_required: boolean;
  database_models_touched: string[];
  downstream_services: string[];
  pipeline_steps: ApiPipelineStep[];
}

export interface ApiFlowCatalog {
  total_endpoints: number;
  endpoints: EndpointLifecycle[];
}

// Third-Party Supply Chain Types
export interface ThirdPartyDependency {
  name: string;
  version_spec: string;
  ecosystem: string;
  manifest_file: string;
  license_category: string;
  is_dev_dependency: boolean;
  usage_count_in_code: number;
  imported_in_files: string[];
}

export interface SupplyChainReport {
  manifests_found: string[];
  total_dependencies: number;
  direct_dependencies_count: number;
  dev_dependencies_count: number;
  copyleft_licenses_count: number;
  dependencies: ThirdPartyDependency[];
}

// Comparison & Architecture Diff Types
export interface SymbolDiffItem {
  name: string;
  kind: string;
  change_type: string;
  file_path: string;
}

export interface ArchitectureDiffReport {
  base_ref: string;
  target_ref: string;
  files_added_count: number;
  files_removed_count: number;
  files_modified_count: number;
  breaking_changes_count: number;
  symbols_diff: SymbolDiffItem[];
  new_dependencies: string[];
  architectural_drift_summary: string;
}

// Code Review & Risk Types
export interface CodeReviewFinding {
  id: string;
  rule_name: string;
  category: string;
  severity: 'critical' | 'warning' | 'info';
  file_path: string;
  relative_path: string;
  line_number: number;
  matched_code: string;
  review_comment: string;
  suggested_refactor: string;
}

export interface CodeReviewReport {
  review_status: string;
  maintainability_rating: string;
  total_findings: number;
  critical_findings_count: number;
  warning_findings_count: number;
  info_findings_count: number;
  suggested_test_suites: string[];
  findings: CodeReviewFinding[];
}

// ==========================================
// PHASE 1 — ADVANCED CODE INTELLIGENCE TYPES
// ==========================================

// 1. Enhanced Dead Code Detection Types
export interface DeadCodeItem {
  id: string;
  name: string;
  category: 'unused_function' | 'unused_class' | 'unused_file' | 'unused_export' | 'unreachable_code';
  kind: string;
  file_path: string;
  relative_path: string;
  line_number: number;
  confidence_score: number; // 0.0 to 1.0
  reason: string;
  snippet?: string;
  suggested_remediation: string;
}

export interface DeadCodeReport {
  total_dead_items: number;
  unused_functions_count: number;
  unused_classes_count: number;
  unused_files_count: number;
  unused_exports_count: number;
  unreachable_code_count: number;
  overall_dead_loc: number;
  items: DeadCodeItem[];
}

// 2. Change Impact Simulator Types
export type SimulationType =
  | 'function_delete'
  | 'class_delete'
  | 'module_delete'
  | 'function_rename'
  | 'file_move'
  | 'module_extract';

export interface BrokenImport {
  file_path: string;
  relative_path: string;
  line_number: number;
  imported_symbol_or_module: string;
  impact_reason: string;
}

export interface BrokenCaller {
  caller_symbol_id: string;
  caller_name: string;
  caller_file: string;
  relative_path: string;
  call_line: number;
  raw_call: string;
  impact_reason: string;
}

export interface AffectedRoute {
  http_method: string;
  route_path: string;
  handler_name: string;
  file_path: string;
  line_number: number;
  impact_level: 'critical' | 'high' | 'medium';
  reason: string;
}

export interface ImpactSimulationResult {
  target_id: string;
  target_name: string;
  simulation_type: SimulationType;
  new_name_or_path?: string;
  estimated_risk_score: number;
  risk_level: 'Low' | 'Moderate' | 'High' | 'Critical';
  total_broken_callers: number;
  total_broken_imports: number;
  total_affected_apis: number;
  total_downstream_files: number;
  broken_callers: BrokenCaller[];
  broken_imports: BrokenImport[];
  affected_apis: AffectedRoute[];
  downstream_dependencies: string[];
  subgraph_nodes: any[];
  subgraph_edges: any[];
  summary_markdown: string;
}

export interface SimulationTargetsResponse {
  functions: Array<{ id: string; name: string; kind: string; file_path: string; relative_path: string; line: number }>;
  classes: Array<{ id: string; name: string; kind: string; file_path: string; relative_path: string; line: number }>;
  files: Array<{ id: string; name: string; relative_path: string; line_count: number; symbol_count: number }>;
  modules: Array<{ id: string; name: string; relative_dir: string; file_count: number }>;
}

// 3. Data Flow Analysis Types
export type FlowStepType =
  | 'user_input'
  | 'param_pass'
  | 'variable_assign'
  | 'transformation'
  | 'db_read'
  | 'db_write'
  | 'api_request'
  | 'api_response'
  | 'return_value';

export interface DataFlowStep {
  step_index: number;
  step_type: FlowStepType;
  symbol_name: string;
  symbol_id?: string;
  file_path: string;
  relative_path: string;
  line_number: number;
  variable_name: string;
  expression_snippet: string;
  description: string;
}

export interface DataFlowChain {
  chain_id: string;
  entry_point: string;
  entry_file: string;
  terminal_sink: string;
  flow_category: string;
  is_tainted_sink: boolean;
  total_steps: number;
  steps: DataFlowStep[];
}

export interface DataFlowReport {
  total_chains: number;
  total_user_input_sources: number;
  total_db_reads: number;
  total_db_writes: number;
  total_api_endpoints_traced: number;
  chains: DataFlowChain[];
  available_entry_points: Array<{ id: string; name: string; file: string }>;
}

// 4. API Dependency Mapping Types
export type ApiProtocol = 'REST' | 'GraphQL' | 'gRPC' | 'WebSocket' | 'Internal';

export interface ApiEndpoint {
  id: string;
  protocol: ApiProtocol;
  method: string;
  path: string;
  handler_name: string;
  file_path: string;
  relative_path: string;
  line_number: number;
  auth_required: boolean;
  inbound_payload_model?: string;
  response_model?: string;
  service_module: string;
}

export interface ApiClientCall {
  id: string;
  caller_symbol: string;
  caller_file: string;
  relative_path: string;
  line_number: number;
  target_url_or_service: string;
  http_method: string;
  protocol: ApiProtocol;
  is_internal_call: boolean;
}

export interface ApiDependencyEdge {
  source_service: string;
  target_endpoint: string;
  protocol: ApiProtocol;
  caller_file: string;
  call_count: number;
}

export interface ApiDependencyGraphReport {
  total_endpoints: number;
  total_client_calls: number;
  total_dependencies: number;
  protocol_distribution: Record<string, number>;
  endpoints: ApiEndpoint[];
  client_calls: ApiClientCall[];
  dependency_edges: ApiDependencyEdge[];
  service_nodes: Array<{ name: string }>;
  graph_nodes: any[];
  graph_edges: any[];
}

// ==========================================
// PHASE 2 — ARCHITECTURE INTELLIGENCE TYPES
// ==========================================

// 6. Architecture Style Detection Types
export interface DetectedStyle {
  style: string;
  confidence_score: number;
  matched_patterns: string[];
  evidence_directories: string[];
  evidence_files: string[];
  description: string;
}

export interface LayerItem {
  layer_name: string;
  file_count: number;
  files: string[];
  description: string;
}

export interface LayerBoundaryViolation {
  from_layer: string;
  to_layer: string;
  from_file: string;
  to_file: string;
  rule_description: string;
  severity: 'high' | 'medium' | 'low';
}

export interface ArchitectureDetectionReport {
  primary_style: string;
  primary_confidence: number;
  detected_styles: DetectedStyle[];
  architectural_layers: LayerItem[];
  layer_boundary_violations: LayerBoundaryViolation[];
  recommendations: string[];
}

// 7. Architecture Drift Types
export interface DriftCheckpoint {
  commit_hash: string;
  short_hash: string;
  author: string;
  date: string;
  message: string;
  file_count: number;
  dependency_count: number;
  module_count: number;
  coupling_index: number;
  cyclomatic_avg: number;
  circular_cycles: number;
  architectural_status: 'Healthy' | 'Drifting' | 'Degrading';
}

export interface ArchitectureDriftReport {
  total_checkpoints: number;
  oldest_commit_date: string;
  latest_commit_date: string;
  initial_coupling: number;
  current_coupling: number;
  coupling_growth_rate: number;
  dependency_growth_rate: number;
  degradation_alerts: string[];
  checkpoints: DriftCheckpoint[];
}

// 8. Technical Debt Engine Types
export interface DebtDimension {
  dimension_name: string;
  weight: number;
  score: number;
  debt_hours: number;
  description: string;
}

export interface DebtHotspot {
  id: string;
  title: string;
  category: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  file_path: string;
  relative_path: string;
  line_number: number;
  estimated_hours_to_fix: number;
  remediation_rationale: string;
}

export interface TechnicalDebtReport {
  overall_debt_score: number;
  debt_grade: 'A' | 'B' | 'C' | 'D' | 'F';
  total_debt_hours: number;
  total_debt_cost_estimate_usd: number;
  maintainability_index: number;
  dimensions: DebtDimension[];
  top_debt_hotspots: DebtHotspot[];
  recommendations: string[];
}

// 9. Module Health Dashboard Types
export interface ModuleHealthCard {
  module_id: string;
  name: string;
  relative_dir: string;
  file_count: number;
  line_count: number;
  symbol_count: number;
  cohesion_score: number;
  afferent_coupling: number;
  efferent_coupling: number;
  instability: number;
  maintainability_rating: string;
  dependency_depth: number;
  average_complexity: number;
  test_coverage_pct: number;
  documentation_coverage_pct: number;
  health_score: number;
  risk_level: 'Low' | 'Moderate' | 'High' | 'Critical';
  file_paths: string[];
}

export interface ModuleHealthReport {
  total_modules: number;
  overall_health_score: number;
  average_cohesion: number;
  average_instability: number;
  modules: ModuleHealthCard[];
}

// 10. Intelligent Refactoring Advisor Types
export interface RefactorRecommendation {
  id: string;
  category: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  target_symbol_or_file: string;
  relative_path: string;
  line_number: number;
  estimated_effort_hours: number;
  description: string;
  code_snippet?: string;
  suggested_transformation: string;
}

export interface RefactoringReport {
  total_recommendations: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  total_estimated_effort_hours: number;
  recommendations: RefactorRecommendation[];
}

// ==========================================
// PHASE 3 — AI ENGINEERING ASSISTANT TYPES
// ==========================================

// 12. Automatic Documentation Generator
export interface GeneratedDocSection {
  title: string;
  doc_type: 'onboarding' | 'architecture' | 'api_reference' | 'data_models' | 'modules';
  markdown_content: string;
  summary: string;
  symbols_covered_count: number;
}

export interface DocumentationReport {
  repository_name: string;
  generated_at: string;
  total_sections: number;
  sections: GeneratedDocSection[];
}

// 13. PR Impact Analyzer
export interface ChangedFile {
  file_path: string;
  relative_path: string;
  change_type: 'modified' | 'added' | 'deleted';
  additions: number;
  deletions: number;
  complexity_delta: number;
}

export interface ImpactedCaller {
  caller_name: string;
  caller_file: string;
  relative_path: string;
  line_number: number;
}

export interface ImpactedRoute {
  http_method: string;
  route_path: string;
  handler_name: string;
  file_path: string;
}

export interface SuggestedReviewer {
  name: string;
  email: string;
  commit_count_on_touched_files: number;
  ownership_percentage: number;
  rationale: string;
}

export interface PRImpactReport {
  pr_title: string;
  base_branch: string;
  head_branch: string;
  total_files_changed: number;
  total_additions: number;
  total_deletions: number;
  estimated_blast_radius_score: number;
  risk_level: 'Low' | 'Moderate' | 'High' | 'Critical';
  changed_files: ChangedFile[];
  impacted_callers: ImpactedCaller[];
  impacted_routes: ImpactedRoute[];
  suggested_reviewers: SuggestedReviewer[];
  safety_checklist: string[];
}

// 14. Natural Language Code Search
export interface NLSearchResult {
  id: string;
  symbol_name: string;
  kind: string;
  file_path: string;
  relative_path: string;
  line_number: number;
  match_score: number;
  intent_category: string;
  explanation: string;
  code_snippet?: string;
}

export interface NLSearchReport {
  query: string;
  detected_intent: string;
  total_results: number;
  results: NLSearchResult[];
}

// 15. Intelligent Test Advisor
export interface UntestedFunctionItem {
  id: string;
  symbol_name: string;
  file_path: string;
  relative_path: string;
  line_number: number;
  cyclomatic_complexity: number;
  in_degree_callers_count: number;
  risk_score: number;
  risk_tier: 'Critical' | 'High' | 'Moderate';
  estimated_test_writing_mins: number;
  recommended_framework: string;
  reason_for_testing: string;
  suggested_test_stub: string;
}

export interface TestAdvisorReport {
  total_untested_functions: number;
  critical_untested_count: number;
  high_untested_count: number;
  average_test_gap_score: number;
  untested_candidates: UntestedFunctionItem[];
}

// ==========================================
// PHASE 4 — ENTERPRISE & WOW FEATURES TYPES
// ==========================================

// 16. Repository Time Machine
export interface CommitFrame {
  frame_index: number;
  commit_hash: string;
  short_hash: string;
  author_name: string;
  author_email: string;
  date: string;
  timestamp: number;
  message: string;
  files_changed: number;
  additions: number;
  deletions: number;
  cumulative_loc: number;
  active_branch: string;
  tags: string[];
}

export interface TimeMachineReport {
  repository_name: string;
  total_frames: number;
  total_authors: number;
  oldest_commit_date: string;
  latest_commit_date: string;
  average_velocity_commits_per_week: number;
  frames: CommitFrame[];
}

// 17. Interactive Execution Playback
export interface ExecutionStep {
  step_number: number;
  call_depth: number;
  symbol_name: string;
  symbol_kind: string;
  file_path: string;
  relative_path: string;
  line_number: number;
  action_type: string;
  state_payload: Record<string, any>;
  expression_snippet: string;
  explanation: string;
}

export interface ExecutionPlaybackTrace {
  entry_point_name: string;
  entry_file: string;
  total_steps: number;
  max_call_depth: number;
  total_db_operations: number;
  total_external_calls: number;
  steps: ExecutionStep[];
}

export interface ExecutionCandidate {
  id: string;
  name: string;
  kind: string;
  relative_path: string;
  line_number: number;
  is_route_handler: boolean;
}

// 18. Unified Repository Knowledge Graph
export interface KnowledgeNode {
  id: string;
  label: string;
  entity_type: 'file' | 'module' | 'function' | 'class' | 'route' | 'table' | 'vulnerability';
  file_path?: string;
  relative_path?: string;
  line_number?: number;
  metadata: Record<string, any>;
}

export interface KnowledgeEdge {
  id: string;
  source: string;
  target: string;
  relation_type: string;
  label?: string;
}

export interface KnowledgeGraphReport {
  total_nodes: number;
  total_edges: number;
  entity_counts: Record<string, number>;
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
}

// 20. AI Refactoring & Migration Planner
export interface MigrationChecklistItem {
  step_number: number;
  title: string;
  target_files_count: number;
  estimated_hours: number;
  command_or_codemod?: string;
  description: string;
}

export interface MigrationPlan {
  id: string;
  title: string;
  source_framework: string;
  target_framework: string;
  readiness_score: number;
  risk_level: string;
  total_estimated_hours: number;
  affected_files_count: number;
  rationale: string;
  benefits: string[];
  checklist: MigrationChecklistItem[];
}

export interface MigrationPlannerReport {
  total_plans: number;
  recommended_plan_id: string;
  plans: MigrationPlan[];
}




