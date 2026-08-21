import React, { useState, useEffect } from 'react';
import {
  Trash2,
  X,
  AlertTriangle,
  FileCode,
  Search,
  CheckCircle2,
} from 'lucide-react';
import type { DeadCodeReport, DeadCodeItem } from '../../types';
import { fetchDeadCodeReport } from '../../services/api';

interface DeadCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSymbol?: (symbolId: string) => void;
}

export const DeadCodeModal: React.FC<DeadCodeModalProps> = ({
  isOpen,
  onClose,
  onSelectSymbol,
}) => {
  const [report, setReport] = useState<DeadCodeReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedItem, setSelectedItem] = useState<DeadCodeItem | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetchDeadCodeReport()
        .then((res) => {
          setReport(res);
          if (res?.items?.length) {
            setSelectedItem(res.items[0]);
          }
        })
        .catch((err) => console.error('Failed to load dead code report:', err))
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const items = report?.items || [];
  const filteredItems = items.filter((item) => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const filter = searchFilter.toLowerCase();
    const matchesSearch =
      searchFilter === '' ||
      (item.name ? item.name.toLowerCase().includes(filter) : false) ||
      (item.relative_path ? item.relative_path.toLowerCase().includes(filter) : false) ||
      (item.reason ? item.reason.toLowerCase().includes(filter) : false);
    return matchesCategory && matchesSearch;
  });

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'unused_function':
        return <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">Unused Function</span>;
      case 'unused_class':
        return <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-purple-500/10 text-purple-300 border border-purple-500/30">Unused Class</span>;
      case 'unused_file':
        return <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-rose-500/10 text-rose-300 border border-rose-500/30">Unused File</span>;
      case 'unused_export':
        return <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">Unused Export</span>;
      case 'unreachable_code':
        return <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-red-500/10 text-red-300 border border-red-500/30">Unreachable</span>;
      default:
        return <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-slate-800 text-slate-300">Dead Code</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl overflow-hidden font-sans">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-100">Dead Code & Unused Logic Detection</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30">
                  AST + Call Graph + Facts
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Identifies unused functions, classes, unreferenced files, dead exports, and unreachable code with calibrated confidence.
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

        {/* Top Summary Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 p-4 bg-slate-950/40 border-b border-slate-800 font-mono text-xs">
          <div className="p-2.5 bg-slate-900/60 border border-slate-800/80 rounded-xl">
            <span className="text-slate-500 text-[10px] block uppercase">Total Dead Items</span>
            <span className="text-base font-bold text-amber-300">{report?.total_dead_items || 0}</span>
          </div>
          <div className="p-2.5 bg-slate-900/60 border border-slate-800/80 rounded-xl">
            <span className="text-slate-500 text-[10px] block uppercase">Unused Functions</span>
            <span className="text-base font-bold text-slate-200">{report?.unused_functions_count || 0}</span>
          </div>
          <div className="p-2.5 bg-slate-900/60 border border-slate-800/80 rounded-xl">
            <span className="text-slate-500 text-[10px] block uppercase">Unused Classes</span>
            <span className="text-base font-bold text-purple-300">{report?.unused_classes_count || 0}</span>
          </div>
          <div className="p-2.5 bg-slate-900/60 border border-slate-800/80 rounded-xl">
            <span className="text-slate-500 text-[10px] block uppercase">Unused Files</span>
            <span className="text-base font-bold text-rose-300">{report?.unused_files_count || 0}</span>
          </div>
          <div className="p-2.5 bg-slate-900/60 border border-slate-800/80 rounded-xl">
            <span className="text-slate-500 text-[10px] block uppercase">Unused Exports</span>
            <span className="text-base font-bold text-cyan-300">{report?.unused_exports_count || 0}</span>
          </div>
          <div className="p-2.5 bg-slate-900/60 border border-slate-800/80 rounded-xl">
            <span className="text-slate-500 text-[10px] block uppercase">Unreachable</span>
            <span className="text-base font-bold text-red-300">{report?.unreachable_code_count || 0}</span>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="px-4 py-2.5 border-b border-slate-800 flex items-center justify-between gap-3 bg-slate-900/40">
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-mono">
            {[
              { id: 'all', label: 'All Items' },
              { id: 'unused_function', label: 'Functions' },
              { id: 'unused_class', label: 'Classes' },
              { id: 'unused_file', label: 'Files' },
              { id: 'unused_export', label: 'Exports' },
              { id: 'unreachable_code', label: 'Unreachable' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg font-medium transition ${
                  selectedCategory === cat.id
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 border border-transparent'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Filter dead symbols / files..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/50 font-sans"
            />
          </div>
        </div>

        {/* Main Split Body */}
        <div className="flex-1 flex overflow-hidden">
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400"></div>
              <span className="text-xs font-mono text-slate-400">Auditing AST symbol references & call graphs...</span>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 text-slate-500">
              <CheckCircle2 className="w-10 h-10 text-emerald-400/60" />
              <p className="text-sm font-semibold text-slate-300">No dead code found in this filter category</p>
              <p className="text-xs">Your codebase references all active symbols and exports cleanly.</p>
            </div>
          ) : (
            <>
              {/* Left List Pane */}
              <div className="w-80 border-r border-slate-800 overflow-y-auto divide-y divide-slate-800/60 bg-slate-950/20">
                {filteredItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    className={`p-3 cursor-pointer transition flex flex-col gap-1.5 ${
                      selectedItem?.id === item.id
                        ? 'bg-amber-500/10 border-l-2 border-amber-400'
                        : 'hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-xs text-slate-200 truncate">{item.name}</span>
                      {getCategoryBadge(item.category)}
                    </div>
                    <p className="text-[11px] font-mono text-slate-400 truncate">{item.relative_path}:{item.line_number}</p>
                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 mt-0.5">
                      <span>Confidence</span>
                      <span className={`font-bold ${item.confidence_score >= 0.85 ? 'text-amber-400' : 'text-slate-400'}`}>
                        {Math.round(item.confidence_score * 100)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Right Detail Pane */}
              <div className="flex-1 p-6 overflow-y-auto space-y-5 bg-slate-900/30">
                {selectedItem ? (
                  <>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-lg font-bold text-white font-mono">{selectedItem.name}</h3>
                          {getCategoryBadge(selectedItem.category)}
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                            Confidence: {Math.round(selectedItem.confidence_score * 100)}%
                          </span>
                        </div>
                        <p className="text-xs font-mono text-slate-400 mt-1 flex items-center gap-1.5">
                          <FileCode className="w-3.5 h-3.5 text-slate-500" />
                          <span>{selectedItem.relative_path}:{selectedItem.line_number}</span>
                        </p>
                      </div>

                      {onSelectSymbol && selectedItem.id.includes('::') && (
                        <button
                          onClick={() => onSelectSymbol(selectedItem.id)}
                          className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-mono transition"
                        >
                          Locate in Graph
                        </button>
                      )}
                    </div>

                    {/* Reason Box */}
                    <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-amber-400 font-mono">
                        <AlertTriangle className="w-4 h-4" />
                        <span>Detection Reason</span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed font-sans">{selectedItem.reason}</p>
                    </div>

                    {/* Suggested Remediation */}
                    <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 font-mono">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Suggested Remediation</span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed font-sans">{selectedItem.suggested_remediation}</p>
                    </div>

                    {/* Code Snippet */}
                    {selectedItem.snippet && (
                      <div className="space-y-2">
                        <span className="text-xs font-bold text-slate-300 font-mono">Dead Code Preview</span>
                        <pre className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-amber-200 overflow-x-auto leading-relaxed">
                          {selectedItem.snippet}
                        </pre>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-500 text-xs font-mono">
                    Select a dead code item to inspect details
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
