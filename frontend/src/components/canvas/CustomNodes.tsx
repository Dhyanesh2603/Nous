import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import {
  FileCode,
  AlertTriangle,
  Code2,
  Boxes,
} from 'lucide-react';
import type { GraphNodeData } from '../../types';

// Custom Module Node
export const ModuleNode: React.FC<NodeProps> = memo(({ data, selected }) => {
  const d = data as unknown as GraphNodeData;
  const instability = d.instability ?? 0;
  
  const instabilityColor =
    instability > 0.7 ? 'text-rose-400 border-rose-500/30 bg-rose-950/20' :
    instability > 0.3 ? 'text-amber-400 border-amber-500/30 bg-amber-950/20' :
    'text-emerald-400 border-emerald-500/30 bg-emerald-950/20';

  return (
    <div
      className={`module-node group relative rounded-xl border p-4 transition-all duration-200 ${
        selected
          ? 'border-cyan-400 ring-2 ring-cyan-400/40 shadow-lg shadow-cyan-950/50'
          : 'border-slate-700/80 bg-slate-900/90 hover:border-slate-500'
      }`}
      style={{ minWidth: 260 }}
    >
      <Handle type="target" position={Position.Top} className="handle-dot" />
      <Handle type="source" position={Position.Bottom} className="handle-dot" />
      <Handle type="target" position={Position.Left} className="handle-dot" />
      <Handle type="source" position={Position.Right} className="handle-dot" />

      {/* Header */}
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2 truncate">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Boxes className="w-4 h-4" />
          </div>
          <div className="truncate">
            <h4 className="text-sm font-semibold text-slate-100 truncate tracking-tight">{d.name}</h4>
            <span className="text-[10px] uppercase font-mono tracking-wider text-cyan-400">Architectural Module</span>
          </div>
        </div>
        <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${instabilityColor}`}>
          I: {instability}
        </span>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-3 gap-2 my-3 text-center">
        <div className="rounded-lg bg-slate-950/60 p-1.5 border border-slate-800/80">
          <div className="text-[10px] text-slate-400">Files</div>
          <div className="text-xs font-mono font-bold text-slate-200">{d.fileCount || 0}</div>
        </div>
        <div className="rounded-lg bg-slate-950/60 p-1.5 border border-slate-800/80">
          <div className="text-[10px] text-slate-400">Symbols</div>
          <div className="text-xs font-mono font-bold text-cyan-300">{d.symbolCount || 0}</div>
        </div>
        <div className="rounded-lg bg-slate-950/60 p-1.5 border border-slate-800/80">
          <div className="text-[10px] text-slate-400">LOC</div>
          <div className="text-xs font-mono font-bold text-slate-200">{d.lineCount || 0}</div>
        </div>
      </div>

      {/* Coupling Indicators */}
      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60 font-mono">
        <span title="Afferent Coupling (Incoming dependencies from other modules)">Ca: <b className="text-emerald-400">{d.afferentCoupling ?? 0}</b></span>
        <span title="Efferent Coupling (Outgoing dependencies to other modules)">Ce: <b className="text-amber-400">{d.efferentCoupling ?? 0}</b></span>
      </div>
    </div>
  );
});

// Custom File Node
export const FileNode: React.FC<NodeProps> = memo(({ data, selected }) => {
  const d = data as unknown as GraphNodeData;
  const isTarget = d.isTarget;
  const inCycle = d.inCycle;

  const langBadge =
    d.language === 'python' ? 'bg-amber-500/10 text-amber-300 border-amber-500/30' :
    d.language === 'typescript' || d.language === 'tsx' ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30' :
    'bg-emerald-500/10 text-emerald-300 border-emerald-500/30';

  return (
    <div
      className={`file-node relative rounded-xl border p-3 transition-all duration-200 ${
        isTarget
          ? 'border-rose-500 ring-4 ring-rose-500/30 bg-rose-950/30 shadow-xl shadow-rose-950/60'
          : selected
          ? 'border-cyan-400 ring-2 ring-cyan-400/40 bg-slate-900 shadow-lg shadow-cyan-950/40'
          : inCycle
          ? 'border-amber-500/60 bg-slate-900/95 hover:border-amber-400'
          : 'border-slate-800 bg-slate-900/90 hover:border-slate-600'
      }`}
      style={{ minWidth: 240 }}
    >
      <Handle type="target" position={Position.Top} className="handle-dot" />
      <Handle type="source" position={Position.Bottom} className="handle-dot" />
      <Handle type="target" position={Position.Left} className="handle-dot" />
      <Handle type="source" position={Position.Right} className="handle-dot" />

      {/* Header */}
      <div className="flex items-center justify-between gap-2 pb-2">
        <div className="flex items-center gap-2 truncate">
          <FileCode className="w-4 h-4 text-cyan-400 flex-shrink-0" />
          <div className="truncate">
            <h4 className="text-xs font-semibold text-slate-100 truncate font-mono">{d.label}</h4>
            <p className="text-[10px] text-slate-500 truncate">{d.relativePath}</p>
          </div>
        </div>
        <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono border uppercase ${langBadge}`}>
          {d.language}
        </span>
      </div>

      {/* Cycle warning if any */}
      {inCycle && (
        <div className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-950/40 border border-amber-500/30 rounded px-2 py-0.5 mb-2">
          <AlertTriangle className="w-3 h-3 flex-shrink-0" />
          <span>Circular Dependency</span>
        </div>
      )}

      {/* Symbol preview tags */}
      {d.symbols && d.symbols.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1 pt-2 border-t border-slate-800/80">
          {d.symbols.slice(0, 4).map((s, idx) => (
            <span
              key={idx}
              className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-800"
            >
              {s.kind === 'class' ? 'C' : 'f'}: {s.name}
            </span>
          ))}
          {d.symbols.length > 4 && (
            <span className="text-[9px] font-mono text-slate-500 self-center">
              +{d.symbols.length - 4} more
            </span>
          )}
        </div>
      )}

      {/* Footer stats */}
      <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2 pt-1.5 border-t border-slate-800/60 font-mono">
        <span>{d.lineCount || 0} LOC</span>
        <span>{d.symbolCount || 0} symbols</span>
        <span>{d.importCount || 0} imports</span>
      </div>
    </div>
  );
});

// Custom Symbol Node (Function, Method, Class, Interface)
export const SymbolNode: React.FC<NodeProps> = memo(({ data, selected }) => {
  const d = data as unknown as GraphNodeData;
  const isTarget = d.isTarget;
  const complexity = d.complexity ?? 1;

  const kindColor =
    d.kind === 'class' ? 'bg-purple-500/10 text-purple-300 border-purple-500/30' :
    d.kind === 'interface' || d.kind === 'type_alias' ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30' :
    d.kind === 'method' ? 'bg-blue-500/10 text-blue-300 border-blue-500/30' :
    'bg-emerald-500/10 text-emerald-300 border-emerald-500/30';

  const complexityColor =
    complexity >= 8 ? 'text-rose-400 border-rose-500/30 bg-rose-950/20' :
    complexity >= 4 ? 'text-amber-400 border-amber-500/30 bg-amber-950/20' :
    'text-emerald-400 border-emerald-500/30 bg-emerald-950/20';

  return (
    <div
      className={`symbol-node relative rounded-xl border p-3 transition-all duration-200 ${
        isTarget
          ? 'border-rose-500 ring-4 ring-rose-500/40 bg-rose-950/30 shadow-xl shadow-rose-950/60'
          : selected
          ? 'border-cyan-400 ring-2 ring-cyan-400/40 bg-slate-900 shadow-lg shadow-cyan-950/40'
          : 'border-slate-800 bg-slate-900/90 hover:border-slate-600'
      }`}
      style={{ minWidth: 220 }}
    >
      <Handle type="target" position={Position.Top} className="handle-dot" />
      <Handle type="source" position={Position.Bottom} className="handle-dot" />
      <Handle type="target" position={Position.Left} className="handle-dot" />
      <Handle type="source" position={Position.Right} className="handle-dot" />

      {/* Header */}
      <div className="flex items-center justify-between gap-2 pb-1.5">
        <div className="flex items-center gap-1.5 truncate">
          <Code2 className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
          <h4 className="text-xs font-semibold text-slate-100 truncate font-mono">{d.name}</h4>
        </div>
        <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono uppercase border ${kindColor}`}>
          {d.kind}
        </span>
      </div>

      {/* Location / Scope */}
      <p className="text-[10px] text-slate-500 truncate font-mono mb-2">
        {d.scope ? `${d.scope} · ` : ''}{d.relativePath}
      </p>

      {/* Signature snippet */}
      {d.signature && (
        <div className="bg-slate-950 rounded p-1.5 text-[10px] font-mono text-cyan-200/90 border border-slate-800/80 truncate mb-2">
          {d.signature}
        </div>
      )}

      {/* Footer info */}
      <div className="flex items-center justify-between text-[10px] pt-1 border-t border-slate-800/60 font-mono">
        <span className="text-slate-400">L{d.startLine}-{d.endLine}</span>
        <span className={`px-1.5 py-0.2 rounded border text-[9px] ${complexityColor}`}>
          CC: {complexity}
        </span>
      </div>
    </div>
  );
});

export const nodeTypes = {
  moduleNode: ModuleNode,
  fileNode: FileNode,
  symbolNode: SymbolNode,
};
