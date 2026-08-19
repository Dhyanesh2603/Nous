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

export const fetchGeneratedDocs = async (): Promise<{ documentation_markdown: string }> => {
  const res = await api.get<{ documentation_markdown: string }>('/copilot/docs');
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
