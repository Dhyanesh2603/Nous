import React, { useState, useEffect } from 'react';
import {
  X,
  Database,
  Globe,
  Share2,
  Search,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import {
  fetchFactSummary,
  queryFacts,
  fetchApiRoutes,
} from '../../services/api';
import type { FactSummary, CodeFact, RouteFact } from '../../types';

interface FactsExplorerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSymbol?: (symbolId: string) => void;
  onTraceSequence?: (symbolId: string) => void;
}

export const FactsExplorerModal: React.FC<FactsExplorerModalProps> = ({
  isOpen,
  onClose,
  onSelectSymbol,
  onTraceSequence,
}) => {
  const [activeTab, setActiveTab] = useState<'facts' | 'routes' | 'instantiations'>('facts');
  const [summary, setSummary] = useState<FactSummary | null>(null);
  const [facts, setFacts] = useState<CodeFact[]>([]);
  const [routes, setRoutes] = useState<RouteFact[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [predicateFilter, setPredicateFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    if (!isOpen) return;

    const loadData = async () => {
      setLoading(true);
      try {
        const [sumRes, factsRes, routesRes] = await Promise.all([
          fetchFactSummary(),
          queryFacts({ limit: 200 }),
          fetchApiRoutes(),
        ]);
        setSummary(sumRes);
        setFacts(factsRes.facts);
        setRoutes(routesRes);
      } catch (err) {
        console.error('Failed to load RipEx facts:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isOpen]);

  const filteredFacts = facts.filter((f) => {
    if (predicateFilter !== 'all' && f.predicate !== predicateFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchSub = f.subject_id.toLowerCase().includes(q);
      const matchObj = f.object_id.toLowerCase().includes(q);
      const matchRel = f.relative_path.toLowerCase().includes(q);
      const matchPred = f.predicate.toLowerCase().includes(q);
      if (!matchSub && !matchObj && !matchRel && !matchPred) return false;
    }
    return true;
  });

  const instantiationFacts = facts.filter((f) => f.predicate === 'instantiates');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-semibold text-slate-100">RipEx Fact Engine & Relations</h2>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> ripex v0.3.0
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Atomic structural and relational code facts extracted across multi-language source trees.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Summary Stats Row */}
        {summary && (
          <div className="px-6 py-3 bg-slate-900/90 border-b border-slate-800/80 grid grid-cols-4 gap-4 text-xs font-mono">
            <div className="bg-slate-950/40 p-2.5 rounded-xl border border-slate-800">
              <span className="text-slate-400 block text-[11px]">Total Facts Extracted</span>
              <span className="text-base font-bold text-indigo-400">{summary.total_facts}</span>
            </div>
            <div className="bg-slate-950/40 p-2.5 rounded-xl border border-slate-800">
              <span className="text-slate-400 block text-[11px]">API Routes Detected</span>
              <span className="text-base font-bold text-emerald-400">{summary.total_routes_detected}</span>
            </div>
            <div className="bg-slate-950/40 p-2.5 rounded-xl border border-slate-800">
              <span className="text-slate-400 block text-[11px]">Instantiations</span>
              <span className="text-base font-bold text-amber-400">{summary.total_instantiations}</span>
            </div>
            <div className="bg-slate-950/40 p-2.5 rounded-xl border border-slate-800">
              <span className="text-slate-400 block text-[11px]">Inheritance & Realization</span>
              <span className="text-base font-bold text-cyan-400">{summary.total_inheritance_relations}</span>
            </div>
          </div>
        )}

        {/* Tabs & Filters */}
        <div className="px-6 py-3 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between gap-4">
          <div className="flex space-x-1 p-1 bg-slate-950/60 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setActiveTab('facts')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'facts'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Database className="w-3.5 h-3.5" /> All Facts ({filteredFacts.length})
            </button>
            <button
              onClick={() => setActiveTab('routes')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'routes'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Globe className="w-3.5 h-3.5" /> API Routes ({routes.length})
            </button>
            <button
              onClick={() => setActiveTab('instantiations')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'instantiations'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Share2 className="w-3.5 h-3.5" /> Instantiations ({instantiationFacts.length})
            </button>
          </div>

          {activeTab === 'facts' && (
            <div className="flex items-center space-x-2 flex-1 max-w-md">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Filter facts (subject, object, file)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-700/80 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <select
                value={predicateFilter}
                onChange={(e) => setPredicateFilter(e.target.value)}
                className="bg-slate-950 border border-slate-700/80 rounded-lg text-xs text-slate-300 py-1.5 px-2.5 focus:outline-none focus:border-indigo-500"
              >
                <option value="all">All Predicates</option>
                <option value="calls">calls</option>
                <option value="defines">defines</option>
                <option value="instantiates">instantiates</option>
                <option value="inherits_from">inherits_from</option>
                <option value="imports">imports</option>
                <option value="exports">exports</option>
                <option value="routes_to">routes_to</option>
              </select>
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-3">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400 space-y-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
              <p className="text-xs">Querying RipEx Relational Fact Store...</p>
            </div>
          ) : activeTab === 'facts' ? (
            filteredFacts.length === 0 ? (
              <div className="py-16 text-center text-slate-500 text-xs">
                No relational facts matching the current filter.
              </div>
            ) : (
              <div className="space-y-2 font-mono text-xs">
                {filteredFacts.map((fact) => (
                  <div
                    key={fact.id}
                    onClick={() => onSelectSymbol && onSelectSymbol(fact.subject_id)}
                    className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl flex items-center justify-between hover:border-slate-700 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center space-x-3 overflow-hidden">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          fact.predicate === 'calls'
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            : fact.predicate === 'instantiates'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : fact.predicate === 'inherits_from'
                            ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                            : fact.predicate === 'routes_to'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : fact.predicate === 'imports'
                            ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {fact.predicate}
                      </span>
                      <div className="flex items-center space-x-2 truncate">
                        <span className="text-slate-300 truncate max-w-xs" title={fact.subject_id}>
                          {fact.subject_id.split('::').pop() || fact.subject_id}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                        <span className="text-indigo-300 font-semibold truncate max-w-xs" title={fact.object_id}>
                          {fact.object_id}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 text-[11px] text-slate-500 flex-shrink-0">
                      <span className="truncate max-w-[180px]" title={fact.relative_path}>
                        {fact.relative_path}:{fact.line_number}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : activeTab === 'routes' ? (
            routes.length === 0 ? (
              <div className="py-16 text-center text-slate-500 text-xs">
                No API routes detected via decorator or routing AST facts.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {routes.map((route) => (
                  <div
                    key={route.id}
                    className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2 hover:border-emerald-500/40 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-bold ${
                          route.http_method === 'GET'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : route.http_method === 'POST'
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                            : route.http_method === 'DELETE'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {route.http_method}
                      </span>
                      <span className="text-xs font-mono text-slate-400 truncate">
                        {route.relative_path}:{route.line_number}
                      </span>
                    </div>
                    <div className="text-sm font-mono font-semibold text-slate-100">{route.route_path}</div>
                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                      <span className="text-xs text-slate-400">
                        Handler: <strong className="text-indigo-300 font-mono">{route.handler_name}()</strong>
                      </span>
                      {onTraceSequence && (
                        <button
                          onClick={() => {
                            onClose();
                            onTraceSequence(route.handler_symbol_id);
                          }}
                          className="px-2.5 py-1 rounded bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 text-xs font-medium transition-colors flex items-center gap-1"
                        >
                          <Share2 className="w-3 h-3" /> Trace Flow
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            instantiationFacts.length === 0 ? (
              <div className="py-16 text-center text-slate-500 text-xs">
                No class/struct instantiation facts detected.
              </div>
            ) : (
              <div className="space-y-2 font-mono text-xs">
                {instantiationFacts.map((fact) => (
                  <div
                    key={fact.id}
                    className="p-3 bg-slate-950/60 border border-amber-500/20 rounded-xl flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        new / instance
                      </span>
                      <span className="text-slate-300 font-semibold">{fact.object_id}</span>
                      <span className="text-slate-500 text-[11px]">
                        instantiated in {fact.subject_id.split('::').pop()}
                      </span>
                    </div>
                    <span className="text-slate-500 text-[11px]">
                      {fact.relative_path}:{fact.line_number}
                    </span>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};
