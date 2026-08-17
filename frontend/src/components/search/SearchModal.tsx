import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  X,
  Code2,
  Zap,
  Sparkles,
  Layers,
} from 'lucide-react';
import type { SearchResultItem } from '../../types';
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
        .then((res) => {
          setResults(res.results);
          setSelectedIndex(0);
        })
        .catch((err) => console.error('Search failed:', err))
        .finally(() => setIsLoading(false));
    }, 150);

    return () => clearTimeout(timer);
  }, [query, selectedKind]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault();
      onSelectResult(results[selectedIndex]);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-start justify-center pt-20 px-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[75vh]"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Header */}
        <div className="p-4 border-b border-slate-800 flex items-center gap-3 bg-slate-950/60">
          <Search className="w-5 h-5 text-cyan-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search symbols, functions, classes, or architecture concepts... (e.g. authenticate, jwt, batch)"
            className="flex-1 bg-transparent border-none outline-none text-slate-100 placeholder-slate-500 text-sm font-mono"
          />
          {isLoading && (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-cyan-400"></div>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter Pills */}
        <div className="px-4 py-2 border-b border-slate-800/80 bg-slate-950/30 flex items-center gap-2 overflow-x-auto text-xs font-mono">
          <button
            onClick={() => setSelectedKind(undefined)}
            className={`px-2.5 py-1 rounded-md transition ${
              selectedKind === undefined ? 'bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/30' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Types
          </button>
          <button
            onClick={() => setSelectedKind('function')}
            className={`px-2.5 py-1 rounded-md transition ${
              selectedKind === 'function' ? 'bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/30' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Functions
          </button>
          <button
            onClick={() => setSelectedKind('class')}
            className={`px-2.5 py-1 rounded-md transition ${
              selectedKind === 'class' ? 'bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/30' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Classes
          </button>
          <button
            onClick={() => setSelectedKind('interface')}
            className={`px-2.5 py-1 rounded-md transition ${
              selectedKind === 'interface' ? 'bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/30' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Interfaces
          </button>
        </div>

        {/* Search Results List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5 font-mono">
          {results.length > 0 ? (
            results.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id + idx}
                  onClick={() => {
                    onSelectResult(item);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                    isSelected
                      ? 'bg-slate-800/90 border-cyan-500/50 shadow-md shadow-cyan-950/30'
                      : 'bg-slate-950/40 border-slate-800/80 hover:bg-slate-800/50 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start gap-2.5 truncate flex-1">
                    <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 mt-0.5 flex-shrink-0">
                      {item.symbol_kind === 'class' ? <Layers className="w-4 h-4" /> : <Code2 className="w-4 h-4" />}
                    </div>
                    <div className="truncate flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-100 truncate">
                          {item.symbol_name || item.relative_path}
                        </span>
                        {item.symbol_kind && (
                          <span className="px-1.5 py-0.2 rounded bg-slate-900 border border-slate-700 text-[9px] uppercase text-cyan-300">
                            {item.symbol_kind}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-500">
                          {item.relative_path}:L{item.start_line}
                        </span>
                      </div>

                      {/* Snippet */}
                      <p className="text-[11px] text-slate-400 truncate mt-1 text-slate-300/80">
                        {item.matched_snippet.replace(/\n/g, ' ')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onCalculateBlastRadius(item.node_id);
                        onClose();
                      }}
                      className="p-1.5 rounded-md bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 border border-rose-500/30 text-[10px] flex items-center gap-1 transition"
                      title="Calculate Blast Radius"
                    >
                      <Zap className="w-3 h-3 text-rose-400" />
                      Blast
                    </button>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-950 text-slate-500 border border-slate-800">
                      {item.score}
                    </span>
                  </div>
                </div>
              );
            })
          ) : query.trim() ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              No matching AST symbols or chunks found for "{query}".
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500 text-xs space-y-2">
              <Sparkles className="w-6 h-6 text-cyan-500/50 mx-auto" />
              <p>Type to search across functions, classes, interfaces, imports, and docstrings.</p>
              <p className="text-[10px] text-slate-600">Use <kbd className="px-1 py-0.5 rounded bg-slate-800 text-slate-300">↑</kbd> <kbd className="px-1 py-0.5 rounded bg-slate-800 text-slate-300">↓</kbd> to navigate and <kbd className="px-1 py-0.5 rounded bg-slate-800 text-slate-300">Enter</kbd> to jump.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-2.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-500 font-mono">
          <div className="flex items-center gap-2">
            <span>Press <kbd className="px-1 py-0.5 rounded bg-slate-800 text-slate-300">Esc</kbd> to close</span>
            <span>•</span>
            <span><kbd className="px-1 py-0.5 rounded bg-slate-800 text-slate-300">Enter</kbd> to inspect</span>
          </div>
          <span>AST Hybrid Search Engine</span>
        </div>
      </div>
    </div>
  );
};
