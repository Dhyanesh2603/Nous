import React, { useState, useEffect } from 'react';
import {
  Network,
  X,
  Search,
} from 'lucide-react';
import type { KnowledgeGraphReport, KnowledgeNode, KnowledgeEdge } from '../../types';
import { fetchUnifiedKnowledgeGraph } from '../../services/api';

interface KnowledgeGraphModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRepoPath?: string;
  onSelectSymbol?: (symbolId: string) => void;
}

export const KnowledgeGraphModal: React.FC<KnowledgeGraphModalProps> = ({
  isOpen,
  onClose,
  currentRepoPath,
}) => {
  const [report, setReport] = useState<KnowledgeGraphReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedNode, setSelectedNode] = useState<KnowledgeNode | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetchUnifiedKnowledgeGraph()
        .then((res) => {
          setReport(res);
          if (res?.nodes?.length) {
            setSelectedNode(res.nodes[0]);
          }
        })
        .catch((err) => console.error('Failed to load knowledge graph:', err))
        .finally(() => setLoading(false));
    }
  }, [isOpen, currentRepoPath]);

  if (!isOpen) return null;

  const filteredNodes = (report?.nodes || []).filter((node) => {
    const matchesFilter = activeFilter === 'all' || node.entity_type === activeFilter;
    const matchesSearch =
      node.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (node.relative_path && node.relative_path.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  const connectedEdges: KnowledgeEdge[] = (report?.edges || []).filter(
    (e) => selectedNode && (e.source === selectedNode.id || e.target === selectedNode.id)
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-6xl h-[88vh] flex flex-col shadow-2xl overflow-hidden font-sans">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
              <Network className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-100">Unified Repository Knowledge Graph</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/30">
                  Multi-Entity Interconnect
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Full-graph unification across files, modules, AST symbols, database entities, and HTTP routes.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Entity Filter Bar */}
        <div className="p-4 bg-slate-950/40 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 font-mono text-xs overflow-x-auto">
            {['all', 'module', 'file', 'function', 'class', 'route', 'table'].map((t) => (
              <button
                key={t}
                onClick={() => setActiveFilter(t)}
                className={`px-3 py-1 rounded-lg uppercase text-[11px] font-bold transition ${
                  activeFilter === t
                    ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                    : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800/80'
                }`}
              >
                {t} {report?.entity_counts?.[t] ? `(${report.entity_counts[t]})` : ''}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter entities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-teal-500/50"
            />
          </div>
        </div>

        {/* Main Body */}
        <div className="flex-1 flex overflow-hidden">
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-400"></div>
              <span className="text-xs font-mono text-slate-400">Fusing relational facts into multi-entity knowledge graph...</span>
            </div>
          ) : (
            <>
              {/* Left Entities List */}
              <div className="w-80 border-r border-slate-800 overflow-y-auto divide-y divide-slate-800/60 bg-slate-950/20">
                <div className="p-3 text-[11px] font-mono uppercase text-slate-500 font-bold bg-slate-950/40 flex justify-between">
                  <span>Entities ({filteredNodes.length})</span>
                  <span className="text-teal-400">{report?.total_edges || 0} Total Edges</span>
                </div>
                {filteredNodes.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => setSelectedNode(n)}
                    className={`p-3.5 cursor-pointer transition flex flex-col gap-1 ${
                      selectedNode?.id === n.id
                        ? 'bg-teal-500/10 border-l-2 border-teal-400'
                        : 'hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center justify-between font-mono text-xs">
                      <span className="font-bold text-slate-200 truncate">{n.label}</span>
                      <span className="px-1.5 py-0.5 text-[9px] rounded font-bold uppercase bg-slate-800 text-teal-300">
                        {n.entity_type}
                      </span>
                    </div>
                    {n.relative_path && (
                      <p className="text-[11px] font-mono text-slate-500 truncate">{n.relative_path}</p>
                    )}
                  </div>
                ))}
              </div>

              {/* Right Graph Detail & Relationship Inspector */}
              <div className="flex-1 p-6 overflow-y-auto space-y-6 bg-slate-900/30">
                {selectedNode ? (
                  <>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold text-white font-mono">{selectedNode.label}</h3>
                          <span className="px-2 py-0.5 text-xs font-mono rounded bg-teal-500/10 text-teal-300 border border-teal-500/30 uppercase">
                            {selectedNode.entity_type}
                          </span>
                        </div>
                        {selectedNode.relative_path && (
                          <p className="text-xs font-mono text-slate-400 mt-1">
                            Relative Path: `{selectedNode.relative_path}`
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Node Metadata Card */}
                    <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
                      <span className="text-xs font-bold text-slate-300 font-mono">Entity Attributes</span>
                      <pre className="p-3 bg-slate-900/80 rounded-lg text-xs font-mono text-teal-200 overflow-x-auto">
                        {JSON.stringify(selectedNode.metadata, null, 2)}
                      </pre>
                    </div>

                    {/* Connected Knowledge Edges */}
                    <div className="space-y-3">
                      <span className="text-xs font-bold text-slate-200 font-mono uppercase block">
                        Interconnected Graph Relationships ({connectedEdges.length})
                      </span>
                      {connectedEdges.length > 0 ? (
                        <div className="space-y-2 font-mono text-xs">
                          {connectedEdges.map((edge) => (
                            <div
                              key={edge.id}
                              className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between"
                            >
                              <span className="text-slate-300 truncate">{edge.source}</span>
                              <span className="px-2 py-0.5 rounded bg-teal-500/10 text-teal-400 text-[10px] font-bold border border-teal-500/20">
                                ── {edge.relation_type} ──►
                              </span>
                              <span className="text-slate-300 truncate">{edge.target}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4 text-center text-xs font-mono text-slate-500 bg-slate-950/40 rounded-xl">
                          No direct relational edges connected to this entity
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-500 text-xs font-mono">
                    Select a knowledge node to inspect graph topology
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
