import axios from 'axios';
import type {
  GraphStructureResponse,
  BlastRadiusResponse,
  SearchResponse,
  ArchitectureMetricsResponse,
  FileContentResponse,
  SampleItem,
  GitChurnReport,
  CloneReport,
  ArchitectureRule,
  RuleEvaluationReport,
  SequenceDiagramResponse,
  ArchitecturalSummary,
  FactSummary,
  FactQueryResponse,
  RouteFact,
  SymbolFactsResponse,
  DatabaseSchemaReport,
  SecurityAuditReport,
  PerformanceReport,
  FrameworkOverviewReport,
  RepositoryHealthScorecard,
  CopilotAnswer,
  ImpactPredictionReport,
  OnboardingRoadmap,
} from '../types';

const API_BASE_URL = 'http://127.0.0.1:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000, // 60s for git clones and large repos
});

export const fetchGraphStructure = async (
  viewMode: string = 'file',
  moduleId?: string
): Promise<GraphStructureResponse> => {
  const params: Record<string, string> = { view_mode: viewMode };
  if (moduleId) {
    params.module_id = moduleId;
  }
  const res = await api.get<GraphStructureResponse>('/graph/structure', { params });
  return res.data;
};

export const fetchBlastRadius = async (
  targetId: string,
  targetType: 'symbol' | 'file' = 'file',
  maxDepth: number = 3
): Promise<BlastRadiusResponse> => {
  const res = await api.get<BlastRadiusResponse>('/graph/blast-radius', {
    params: {
      target_id: targetId,
      target_type: targetType,
      max_depth: maxDepth,
    },
  });
  return res.data;
};

export const searchSymbols = async (
  query: string,
  limit: number = 20,
  kind?: string
): Promise<SearchResponse> => {
  const params: Record<string, any> = { q: query, limit };
  if (kind) params.kind = kind;
  const res = await api.get<SearchResponse>('/search', { params });
  return res.data;
};

export const fetchArchitectureMetrics = async (): Promise<ArchitectureMetricsResponse> => {
  const res = await api.get<ArchitectureMetricsResponse>('/analysis/metrics');
  return res.data;
};

export const fetchGitChurnReport = async (): Promise<GitChurnReport> => {
  const res = await api.get<GitChurnReport>('/analysis/git-churn');
  return res.data;
};

export const fetchCloneReport = async (
  minTokens: number = 15,
  similarityThreshold: number = 0.8
): Promise<CloneReport> => {
  const res = await api.get<CloneReport>('/analysis/clones', {
    params: { min_tokens: minTokens, similarity_threshold: similarityThreshold },
  });
  return res.data;
};

export const fetchArchitectureRules = async (preset?: string): Promise<RuleEvaluationReport> => {
  const params: Record<string, string> = {};
  if (preset) params.preset = preset;
  const res = await api.get<RuleEvaluationReport>('/analysis/rules', { params });
  return res.data;
};

export const evaluateCustomRules = async (rules: ArchitectureRule[]): Promise<RuleEvaluationReport> => {
  const res = await api.post<RuleEvaluationReport>('/analysis/rules/evaluate', rules);
  return res.data;
};

export const fetchSequenceDiagram = async (symbolId: string, maxDepth: number = 5): Promise<SequenceDiagramResponse> => {
  const res = await api.get<SequenceDiagramResponse>('/analysis/sequence', {
    params: { symbol_id: symbolId, max_depth: maxDepth },
  });
  return res.data;
};

export const fetchDesignPatterns = async (): Promise<ArchitecturalSummary> => {
  const res = await api.get<ArchitecturalSummary>('/analysis/patterns');
  return res.data;
};

export const fetchFileContent = async (
  filePath: string,
  startLine?: number,
  endLine?: number
): Promise<FileContentResponse> => {
  const params: Record<string, any> = { file_path: filePath };
  if (startLine !== undefined) params.start_line = startLine;
  if (endLine !== undefined) params.end_line = endLine;
  const res = await api.get<FileContentResponse>('/files/content', { params });
  return res.data;
};

export const ingestRepository = async (path: string): Promise<any> => {
  const res = await api.post('/ingest', { path });
  return res.data;
};

export const ingestGitRepository = async (gitUrl: string, branch?: string): Promise<any> => {
  const res = await api.post('/ingest', { git_url: gitUrl, branch });
  return res.data;
};

export const uploadFileForIngest = async (file: File): Promise<any> => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await api.post('/ingest/file-upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return res.data;
};

export const uploadZipForIngest = async (file: File): Promise<any> => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await api.post('/ingest/zip', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return res.data;
};

export const ingestSample = async (sampleName: string): Promise<any> => {
  const res = await api.post('/ingest/sample', { sample_id: sampleName });
  return res.data;
};

export const fetchSamples = async (): Promise<{ samples: SampleItem[] }> => {
  const res = await api.get<{ samples: SampleItem[] }>('/ingest/samples');
  return res.data;
};

export const fetchIngestStatus = async (): Promise<any> => {
  const res = await api.get('/ingest/status');
  return res.data;
};

// RipEx Facts API Calls
export const fetchFactSummary = async (): Promise<FactSummary> => {
  const res = await api.get<FactSummary>('/facts/summary');
  return res.data;
};

export const queryFacts = async (params: {
  subject?: string;
  predicate?: string;
  object?: string;
  kind?: string;
  file_path?: string;
  limit?: number;
}): Promise<FactQueryResponse> => {
  const res = await api.get<FactQueryResponse>('/facts/query', { params });
  return res.data;
};

export const fetchApiRoutes = async (): Promise<RouteFact[]> => {
  const res = await api.get<RouteFact[]>('/facts/routes');
  return res.data;
};

export const fetchSymbolFacts = async (symbolId: string): Promise<SymbolFactsResponse> => {
  const res = await api.get<SymbolFactsResponse>(`/facts/symbol/${encodeURIComponent(symbolId)}`);
  return res.data;
};

// Database Schema & ERD
export const fetchDatabaseSchema = async (): Promise<DatabaseSchemaReport> => {
  const res = await api.get<DatabaseSchemaReport>('/database/schema');
  return res.data;
};

// Security Audit
export const fetchSecurityAudit = async (): Promise<SecurityAuditReport> => {
  const res = await api.get<SecurityAuditReport>('/security/audit');
  return res.data;
};

// Performance Insights
export const fetchPerformanceInsights = async (): Promise<PerformanceReport> => {
  const res = await api.get<PerformanceReport>('/performance/insights');
  return res.data;
};

// Framework Overview
export const fetchFrameworkOverview = async (): Promise<FrameworkOverviewReport> => {
  const res = await api.get<FrameworkOverviewReport>('/framework/overview');
  return res.data;
};

// Health Scorecard
export const fetchHealthScorecard = async (): Promise<RepositoryHealthScorecard> => {
  const res = await api.get<RepositoryHealthScorecard>('/analysis/health-scorecard');
  return res.data;
};

// AI Copilot
export const queryCopilot = async (query: string): Promise<CopilotAnswer> => {
  const res = await api.post<CopilotAnswer>('/copilot/query', { query });
  return res.data;
};

export const predictImpact = async (target: string): Promise<ImpactPredictionReport> => {
  const res = await api.post<ImpactPredictionReport>('/copilot/impact', { target });
  return res.data;
};

export const fetchOnboardingRoadmap = async (): Promise<OnboardingRoadmap> => {
  const res = await api.get<OnboardingRoadmap>('/copilot/onboarding');
  return res.data;
};

export const fetchCopilotDocs = async (): Promise<{ documentation_markdown: string }> => {
  const res = await api.get<{ documentation_markdown: string }>('/copilot/docs');
  return res.data;
};

// Timeline & Evolution
export const fetchTimelineEvolution = async (maxCommits: number = 40): Promise<any> => {
  const res = await api.get('/timeline/evolution', { params: { max_commits: maxCommits } });
  return res.data;
};

// API Lifecycle & Flow
export const fetchApiFlowCatalog = async (): Promise<any> => {
  const res = await api.get('/api-flow/catalog');
  return res.data;
};

// Supply Chain & Dependencies
export const fetchSupplyChain = async (): Promise<any> => {
  const res = await api.get('/dependencies/supply-chain');
  return res.data;
};

// Architecture Comparison & Diff
export const compareRepositoryDiff = async (baseRef: string = 'HEAD~1', targetRef: string = 'HEAD'): Promise<any> => {
  const res = await api.post('/compare/diff', { base_ref: baseRef, target_ref: targetRef });
  return res.data;
};

// Automated Code Review
export const fetchCodeReview = async (): Promise<any> => {
  const res = await api.get('/review/audit');
  return res.data;
};

// Watch Mode
export const toggleWatchMode = async (): Promise<{ is_watching: boolean; watched_path: string | null }> => {
  const res = await api.post('/ingest/watch/toggle');
  return res.data;
};

export const fetchWatchStatus = async (): Promise<{ is_watching: boolean; watched_path: string | null }> => {
  const res = await api.get('/ingest/watch/status');
  return res.data;
};

// ==========================================
// PHASE 1 — ADVANCED CODE INTELLIGENCE APIs
// ==========================================

// 1. Enhanced Dead Code Detection
export const fetchDeadCodeReport = async (): Promise<any> => {
  const res = await api.get('/analysis/dead-code-report');
  return res.data;
};

// 2. Change Impact Simulator
export const fetchSimulationTargets = async (): Promise<any> => {
  const res = await api.get('/analysis/impact-simulate/targets');
  return res.data;
};

export const simulateChangeImpact = async (
  targetId: string,
  simulationType: string,
  newNameOrPath?: string
): Promise<any> => {
  const res = await api.post('/analysis/impact-simulate', {
    target_id: targetId,
    simulation_type: simulationType,
    new_name_or_path: newNameOrPath,
  });
  return res.data;
};

// 3. Data Flow Analysis
export const fetchDataFlowChains = async (): Promise<any> => {
  const res = await api.get('/analysis/data-flow/chains');
  return res.data;
};

export const traceSymbolDataFlow = async (entrySymbol: string): Promise<any> => {
  const res = await api.get('/analysis/data-flow/trace', { params: { entry_symbol: entrySymbol } });
  return res.data;
};

// 4. API Dependency Mapping
export const fetchApiDependencies = async (): Promise<any> => {
  const res = await api.get('/analysis/api-dependencies');
  return res.data;
};

// ==========================================
// PHASE 2 — ARCHITECTURE INTELLIGENCE APIs
// ==========================================

// 6. Automatic Architecture Detection
export const fetchArchitectureStyle = async (): Promise<any> => {
  const res = await api.get('/analysis/architecture-style');
  return res.data;
};

// 7. Architecture Drift Timeline
export const fetchArchitectureDrift = async (maxSamples: number = 12): Promise<any> => {
  const res = await api.get('/analysis/architecture-drift', { params: { max_samples: maxSamples } });
  return res.data;
};

// 8. Technical Debt Engine
export const fetchTechnicalDebt = async (): Promise<any> => {
  const res = await api.get('/analysis/tech-debt');
  return res.data;
};

// 9. Module Health Dashboard
export const fetchModuleHealth = async (): Promise<any> => {
  const res = await api.get('/analysis/module-health');
  return res.data;
};

// 10. Intelligent Refactoring Advisor
export const fetchRefactoringSuggestions = async (): Promise<any> => {
  const res = await api.get('/analysis/refactoring-suggestions');
  return res.data;
};

// ==========================================
// PHASE 3 — AI ENGINEERING ASSISTANT APIs
// ==========================================

// 12. Automatic Documentation Generator
export const fetchGeneratedDocs = async (): Promise<any> => {
  const res = await api.get('/analysis/generate-docs');
  return res.data;
};

// 13. PR Impact Analyzer
export const fetchPRImpactReport = async (diffTarget: string = 'HEAD~1'): Promise<any> => {
  const res = await api.get('/analysis/pr-impact', { params: { diff_target: diffTarget } });
  return res.data;
};

// 14. Natural Language Code Search
export const searchNaturalLanguage = async (query: string): Promise<any> => {
  const res = await api.get('/analysis/nl-search', { params: { q: query } });
  return res.data;
};

// 15. Intelligent Test Advisor
export const fetchTestAdvice = async (): Promise<any> => {
  const res = await api.get('/analysis/test-advice');
  return res.data;
};

// Aliases for compatibility
export const getGraphStructure = fetchGraphStructure;
export const getBlastRadius = fetchBlastRadius;
export const searchCodebase = searchSymbols;
export const getMetrics = fetchArchitectureMetrics;
export const getGitChurn = fetchGitChurnReport;
export const getCodeClones = fetchCloneReport;
export const getArchitectureRules = fetchArchitectureRules;
export const getSequenceDiagram = fetchSequenceDiagram;
export const getDesignPatterns = fetchDesignPatterns;
export const getFileContent = fetchFileContent;
export const getSamples = fetchSamples;
export const getIngestStatus = fetchIngestStatus;

export default api;
