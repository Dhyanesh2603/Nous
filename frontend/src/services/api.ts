import axios from 'axios';
import type {
  GraphStructureResponse,
  BlastRadiusResponse,
  SearchResponse,
  ArchitectureMetricsResponse,
  FileContentResponse,
  ViewMode,
  SampleItem,
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
