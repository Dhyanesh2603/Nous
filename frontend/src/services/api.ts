import axios from 'axios';
import type {
  GraphStructureResponse,
  BlastRadiusResponse,
  SearchResponse,
  ArchitectureMetricsResponse,
  FileContentResponse,
  ViewMode,
  SampleItem,
  GitChurnReport,
  CloneReport,
  RuleEvaluationReport,
  SequenceDiagramResponse,
  ArchitecturalSummary,
  ArchitectureRule,
} from '../types';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getGraphStructure = async (viewMode: ViewMode = 'file'): Promise<GraphStructureResponse> => {
  const res = await api.get<GraphStructureResponse>('/graph/structure', {
    params: { view_mode: viewMode },
  });
  return res.data;
};

export const getBlastRadius = async (nodeId: string, maxDepth: number = 4): Promise<BlastRadiusResponse> => {
  const res = await api.get<BlastRadiusResponse>('/graph/blast-radius', {
    params: { node_id: nodeId, max_depth: maxDepth },
  });
  return res.data;
};

export const searchCodebase = async (
  query: string,
  limit: number = 20,
  kind?: string
): Promise<SearchResponse> => {
  const res = await api.get<SearchResponse>('/search', {
    params: { q: query, limit, kind },
  });
  return res.data;
};

export const getMetrics = async (): Promise<ArchitectureMetricsResponse> => {
  const res = await api.get<ArchitectureMetricsResponse>('/analysis/metrics');
  return res.data;
};

export const getGitChurn = async (): Promise<GitChurnReport> => {
  const res = await api.get<GitChurnReport>('/analysis/git-churn');
  return res.data;
};

export const getCodeClones = async (): Promise<CloneReport> => {
  const res = await api.get<CloneReport>('/analysis/clones');
  return res.data;
};

export const getArchitectureRules = async (preset: string = 'clean_architecture'): Promise<RuleEvaluationReport> => {
  const res = await api.get<RuleEvaluationReport>('/analysis/rules', {
    params: { preset },
  });
  return res.data;
};

export const evaluateCustomRules = async (
  preset?: string,
  customRules?: ArchitectureRule[]
): Promise<RuleEvaluationReport> => {
  const res = await api.post<RuleEvaluationReport>('/analysis/rules/evaluate', {
    preset,
    custom_rules: customRules,
  });
  return res.data;
};

export const getSequenceDiagram = async (
  symbolId: string,
  maxDepth: number = 5
): Promise<SequenceDiagramResponse> => {
  const res = await api.get<SequenceDiagramResponse>('/analysis/sequence', {
    params: { symbol_id: symbolId, max_depth: maxDepth },
  });
  return res.data;
};

export const getDesignPatterns = async (): Promise<ArchitecturalSummary> => {
  const res = await api.get<ArchitecturalSummary>('/analysis/patterns');
  return res.data;
};

export const getFileContent = async (
  filePath: string,
  startLine?: number,
  endLine?: number
): Promise<FileContentResponse> => {
  const res = await api.get<FileContentResponse>('/files/content', {
    params: { file_path: filePath, start_line: startLine, end_line: endLine },
  });
  return res.data;
};

export const ingestRepository = async (path: string) => {
  const res = await api.post('/ingest', { path });
  return res.data;
};

export const ingestSample = async (sampleId: string) => {
  const res = await api.post('/ingest/sample', { sample_id: sampleId });
  return res.data;
};

export const getSamples = async (): Promise<{ samples: SampleItem[] }> => {
  const res = await api.get<{ samples: SampleItem[] }>('/ingest/samples');
  return res.data;
};

export const getIngestStatus = async () => {
  const res = await api.get('/ingest/status');
  return res.data;
};

export default api;
