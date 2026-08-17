import React from 'react';
import {
  ArrowDownUp,
  ArrowLeftRight,
  Zap,
} from 'lucide-react';
import type { GraphSummary, ViewMode } from '../../types';

interface FilterBarProps {
  summary?: GraphSummary;
  layoutDirection: 'TB' | 'LR';
  onToggleLayoutDirection: () => void;
  isBlastRadiusActive: boolean;
  onResetBlastRadius: () => void;
  currentViewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  summary,
  layoutDirection,
  onToggleLayoutDirection,
  isBlastRadiusActive,
  onResetBlastRadius,
}) => {
  return (
    <div className="absolute top-4 left-4 z-20 flex items-center gap-2 select-none font-mono text-xs">
      {/* Layout Direction Toggle */}
      <button
        onClick={onToggleLayoutDirection}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-800 text-slate-300 hover:text-slate-100 hover:border-slate-700 shadow-xl transition"
        title={`Switch to ${layoutDirection === 'TB' ? 'Horizontal (LR)' : 'Vertical (TB)'} Layout`}
      >
        {layoutDirection === 'TB' ? (
          <>
            <ArrowDownUp className="w-3.5 h-3.5 text-cyan-400" />
            <span>Vertical</span>
          </>
        ) : (
          <>
            <ArrowLeftRight className="w-3.5 h-3.5 text-cyan-400" />
            <span>Horizontal</span>
          </>
        )}
      </button>

      {/* Summary Stats Pill */}
      {summary && (
        <div className="hidden sm:flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-800 text-slate-400 shadow-xl">
          <span>
            <strong className="text-slate-200">{summary.total_files}</strong> files
          </span>
          <span>•</span>
          <span>
            <strong className="text-cyan-300">{summary.total_symbols}</strong> symbols
          </span>
          <span>•</span>
          <span>
            <strong className="text-slate-200">{summary.total_dependencies}</strong> dependencies
          </span>
          {summary.circular_cycles_count > 0 && (
            <>
              <span>•</span>
              <span className="text-amber-400 font-bold">
                {summary.circular_cycles_count} cycles
              </span>
            </>
          )}
        </div>
      )}

      {/* Blast Radius Reset Indicator */}
      {isBlastRadiusActive && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-950/80 backdrop-blur-md border border-rose-500/40 text-rose-300 shadow-xl animate-pulse">
          <Zap className="w-3.5 h-3.5 text-rose-400" />
          <span className="font-semibold">Blast Radius Active</span>
          <button
            onClick={onResetBlastRadius}
            className="ml-2 px-2 py-0.5 rounded bg-rose-900/80 hover:bg-rose-800 text-rose-100 text-[10px] border border-rose-500/40 transition"
          >
            Reset
          </button>
        </div>
      )}
    </div>
  );
};
