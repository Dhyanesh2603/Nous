import React, { useState } from 'react';
import { useReactFlow, useViewport, MiniMap } from '@xyflow/react';
import {
  Maximize2,
  Scan,
  ZoomIn,
  ZoomOut,
  Compass,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';

interface MinimapRadarControlProps {
  layoutDirection?: 'TB' | 'LR';
}

export const MinimapRadarControl: React.FC<MinimapRadarControlProps> = ({
  layoutDirection = 'TB',
}) => {
  const { fitView, zoomTo, getNodes, setCenter } = useReactFlow();
  const { zoom } = useViewport();
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeSector, setActiveSector] = useState<'all' | 'top' | 'mid' | 'bot'>('all');

  // Jump to specific sectors of the graph (like selecting rows in a theatre)
  const jumpToSector = (sector: 'top' | 'mid' | 'bot' | 'all') => {
    setActiveSector(sector);
    const nodes = getNodes();
    if (!nodes || nodes.length === 0) return;

    if (sector === 'all') {
      fitView({ padding: 0.2, duration: 600 });
      return;
    }

    // Sort nodes based on layout direction
    const isHorizontal = layoutDirection === 'LR';
    const sorted = [...nodes].sort((a, b) => {
      const posA = isHorizontal ? a.position.x : a.position.y;
      const posB = isHorizontal ? b.position.x : b.position.y;
      return posA - posB;
    });

    const total = sorted.length;
    let targetNodes = sorted;
    if (sector === 'top') {
      targetNodes = sorted.slice(0, Math.max(1, Math.ceil(total * 0.35)));
    } else if (sector === 'mid') {
      const start = Math.floor(total * 0.3);
      const end = Math.ceil(total * 0.7);
      targetNodes = sorted.slice(start, Math.max(start + 1, end));
    } else if (sector === 'bot') {
      targetNodes = sorted.slice(Math.floor(total * 0.65));
    }

    if (targetNodes.length > 0) {
      // Calculate center of target nodes
      const avgX =
        targetNodes.reduce((acc, n) => acc + (n.position.x || 0) + 130, 0) /
        targetNodes.length;
      const avgY =
        targetNodes.reduce((acc, n) => acc + (n.position.y || 0) + 70, 0) /
        targetNodes.length;

      setCenter(avgX, avgY, { zoom: Math.max(0.65, zoom), duration: 600 });
    }
  };

  const handleZoomSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newZoom = parseFloat(e.target.value);
    zoomTo(newZoom, { duration: 150 });
  };

  return (
    <div className="absolute bottom-4 right-4 z-20 flex flex-col items-end gap-1.5 select-none font-mono">
      {/* Interactive Minimap Widget Container */}
      <div className="bg-slate-950/90 backdrop-blur-md border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col w-64 transition-all duration-200">
        {/* Radar Header & Sector Bar */}
        <div className="px-3 py-2 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-cyan-400 font-semibold">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
            </span>
            <Scan className="w-3.5 h-3.5" />
            <span className="text-[11px] tracking-wide">Viewport Radar</span>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-[10px] text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 text-slate-400 hover:text-slate-200 rounded transition"
              title={isExpanded ? 'Collapse Minimap' : 'Expand Minimap'}
            >
              {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
            </button>
          </div>
        </div>

        {isExpanded && (
          <>
            {/* Theatre Sector Jump Selector */}
            <div className="p-1.5 bg-slate-900/40 border-b border-slate-800/80 grid grid-cols-4 gap-1 text-[10px]">
              <button
                onClick={() => jumpToSector('top')}
                className={`px-1.5 py-1 rounded transition text-center font-semibold truncate ${
                  activeSector === 'top'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
                title="Focus on Entry / Ingress Sector"
              >
                Top
              </button>
              <button
                onClick={() => jumpToSector('mid')}
                className={`px-1.5 py-1 rounded transition text-center font-semibold truncate ${
                  activeSector === 'mid'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
                title="Focus on Core Logic / Services Sector"
              >
                Mid
              </button>
              <button
                onClick={() => jumpToSector('bot')}
                className={`px-1.5 py-1 rounded transition text-center font-semibold truncate ${
                  activeSector === 'bot'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
                title="Focus on Database / Storage Sector"
              >
                Base
              </button>
              <button
                onClick={() => jumpToSector('all')}
                className={`px-1.5 py-1 rounded transition text-center font-semibold flex items-center justify-center gap-0.5 ${
                  activeSector === 'all'
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
                title="Fit Full Graph Overview"
              >
                <Maximize2 className="w-2.5 h-2.5" />
                <span>All</span>
              </button>
            </div>

            {/* Pannable / Slidable MiniMap Area */}
            <div className="relative w-full h-36 bg-slate-950 overflow-hidden cursor-crosshair">
              {/* Subtle Theatre Sector Overlay Grid */}
              <div className="absolute inset-0 pointer-events-none grid grid-rows-3 grid-cols-2 border border-slate-800/40 divide-y divide-x divide-slate-800/20 z-10 opacity-30">
                <div></div><div></div>
                <div></div><div></div>
                <div></div><div></div>
              </div>

              {/* ReactFlow MiniMap with Pannable Viewport Lens */}
              <MiniMap
                nodeColor={(node) => {
                  if (node.type === 'moduleNode') return '#06b6d4';
                  if (node.type === 'symbolNode') return '#10b981';
                  return '#64748b';
                }}
                nodeStrokeColor="#0f172a"
                nodeStrokeWidth={1}
                nodeBorderRadius={3}
                pannable={true}
                zoomable={true}
                maskColor="rgba(2, 6, 23, 0.72)"
                maskStrokeColor="#06b6d4"
                maskStrokeWidth={2}
                className="!m-0 !w-full !h-full !bg-transparent !border-0"
              />

              {/* Interactive Help Tooltip */}
              <div className="absolute bottom-1 right-2 z-10 pointer-events-none text-[9px] text-cyan-400/80 bg-slate-950/80 px-1 py-0.5 rounded">
                Drag frame to pan
              </div>
            </div>

            {/* Viewport Zoom & Slider Controls */}
            <div className="p-2 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between gap-2 text-xs">
              <button
                onClick={() => zoomTo(zoom - 0.2, { duration: 200 })}
                className="p-1 rounded bg-slate-950 border border-slate-800 text-slate-400 hover:text-cyan-300 transition"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>

              <input
                type="range"
                min="0.2"
                max="2.0"
                step="0.05"
                value={Math.min(2.0, Math.max(0.2, zoom))}
                onChange={handleZoomSlider}
                className="flex-1 accent-cyan-500 h-1 bg-slate-950 rounded-lg cursor-pointer"
                title="Slide to Zoom Lens"
              />

              <button
                onClick={() => zoomTo(zoom + 0.2, { duration: 200 })}
                className="p-1 rounded bg-slate-950 border border-slate-800 text-slate-400 hover:text-cyan-300 transition"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => fitView({ padding: 0.2, duration: 400 })}
                className="p-1 rounded bg-slate-950 border border-slate-800 text-slate-400 hover:text-purple-300 transition"
                title="Recenter & Fit All"
              >
                <Compass className="w-3.5 h-3.5" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
