import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  X,
  Code2,
  Zap,
  Sparkles,
  Layers,
} from 'lucide-react';
import type { SearchResultItem, SearchResponse } from '../../types';
import { searchCodebase } from '../../services/api';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectResult: (result: SearchResultItem) => void;
  onCalculateBlastRadius: (nodeId: string) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  onSelectResult,
  onCalculateBlastRadius,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedKind, setSelectedKind] = useState<string | undefined>(undefined);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Debounced search query
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(() => {
      setIsLoading(true);
      searchCodebase(query, 20, selectedKind)
        .then((res: SearchResponse) => {
          setResults(res.results);
          setSelectedIndex(0);
        })
        .catch((err: unknown) => console.error('Search failed:', err))
        .finally(() => setIsLoading(false));
    }, 150);

    return () => clearTimeout(timer);
  }, [query, selectedKind]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault();
      onSelectResult(results[selectedIndex]);
      onClose();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-start justify-center pt-20 p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col font-sans"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="p-4 border-b border-slate-800 flex items-center gap-3 bg-slate-950/40">
          <Search className="w-5 h-5 text-cyan-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search symbols, signatures, concepts (e.g. 'AuthService', 'jwt', 'login')..."
            className="flex-1 bg-transparent text-sm text-slate-100 placeholder-slate-500 outline-none font-mono"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded text-slate-400 hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400 font-mono border border-slate-700">
            ESC
          </kbd>
        </div>

        {/* Filter Pills */}
        <div className="px-4 py-2 border-b border-slate-800/80 bg-slate-950/20 flex items-center gap-2 text-xs font-mono">
          <span className="text-slate-500 text-[11px]">Filter:</span>
          {['all', 'function', 'class', 'method', 'interface'].map((kind) => {
            const isSelected = (kind === 'all' && !selectedKind) || selectedKind === kind;
            return (
              <button
                key={kind}
                onClick={() => setSelectedKind(kind === 'all' ? undefined : kind)}
                className={`px-2.5 py-0.5 rounded-full capitalize transition ${
                  isSelected
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 border border-transparent'
                }`}
              >
                {kind}
              </button>
            );
          })}
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 space-y-1">
          {isLoading ? (
            <div className="p-8 text-center text-slate-500 text-xs font-mono">
              Searching AST & Reciprocal Rank Fusion index...
            </div>
          ) : results.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs font-mono">
              {query ? 'No matching symbols or AST chunks found.' : 'Type to search symbols across all files.'}
            </div>
          ) : (
            results.map((result, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={result.id}
                  onClick={() => {
                    onSelectResult(result);
                    onClose();
                  }}
                  className={`p-3 rounded-xl cursor-pointer transition border flex items-start justify-between gap-3 ${
                    isSelected
                      ? 'bg-slate-800/90 border-cyan-500/50 text-slate-100 shadow-md'
                      : 'bg-slate-900/40 border-transparent text-slate-300 hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 mt-0.5 flex-shrink-0">
                      {result.symbol_kind === 'class' ? (
                        <Layers className="w-4 h-4" />
                      ) : (
                        <Code2 className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-100 font-mono truncate">
                          {result.symbol_name || result.relative_path}
                        </span>
                        {result.symbol_kind && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono uppercase bg-slate-800 text-cyan-400 border border-slate-700">
                            {result.symbol_kind}
                          </span>
                        )}
                        <span className="text-[10px] font-mono text-slate-500">
                          {result.match_type} match (score: {result.score.toFixed(2)})
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-mono truncate mt-0.5">
                        {result.relative_path}:{result.start_line}
                      </p>
                      {result.matched_snippet && (
                        <pre className="mt-1.5 p-2 bg-slate-950 rounded text-[11px] text-slate-300 font-mono overflow-x-auto border border-slate-800/60 max-h-20">
                          <code>{result.matched_snippet}</code>
                        </pre>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onCalculateBlastRadius(result.node_id);
                        onClose();
                      }}
                      className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/20 transition border border-rose-500/30"
                      title="Calculate Blast Radius"
                    >
                      <Zap className="w-3.5 h-3.5 fill-current" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/40 text-[11px] font-mono text-slate-500 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select Node</span>
            <span>ESC Close</span>
          </div>
          <div className="flex items-center gap-1 text-cyan-400">
            <Sparkles className="w-3 h-3" />
            <span>AST Hybrid Search (BM25 + RRF)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
