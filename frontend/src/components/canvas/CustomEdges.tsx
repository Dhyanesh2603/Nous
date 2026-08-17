import React from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
} from '@xyflow/react';
import type { EdgeProps } from '@xyflow/react';

export const CustomEdge: React.FC<EdgeProps> = ({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  label,
  animated,
  data,
}) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const isBlastRadius = (data as any)?.isBlastRadius;

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: isBlastRadius ? '#f43f5e' : (style.stroke || '#475569'),
          strokeWidth: isBlastRadius ? 2.5 : (style.strokeWidth || 1.5),
          strokeDasharray: animated ? '5,5' : undefined,
          ...style,
        }}
      />
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="nodrag nopan px-1.5 py-0.5 rounded text-[9px] font-mono bg-slate-950/90 text-slate-400 border border-slate-800 backdrop-blur-sm truncate max-w-[140px]"
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};

export const edgeTypes = {
  custom: CustomEdge,
};
