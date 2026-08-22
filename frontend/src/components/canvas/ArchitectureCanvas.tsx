import React, { useCallback, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  Position,
  ConnectionLineType,
  MarkerType,
} from '@xyflow/react';
import type { Node, Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';

import { nodeTypes } from './CustomNodes';
import { edgeTypes } from './CustomEdges';
import { MinimapRadarControl } from './MinimapRadarControl';
import type { GraphNode, GraphEdge, GraphNodeData } from '../../types';

interface ArchitectureCanvasProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onSelectNode: (nodeData: GraphNodeData) => void;
  layoutDirection?: 'TB' | 'LR';
  isBlastRadiusActive?: boolean;
}

const getLayoutedElements = (
  nodes: Node[],
  edges: Edge[],
  direction: 'TB' | 'LR' = 'TB'
) => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  const isHorizontal = direction === 'LR';
  dagreGraph.setGraph({
    rankdir: direction,
    ranksep: isHorizontal ? 100 : 80,
    nodesep: isHorizontal ? 50 : 60,
  });

  nodes.forEach((node) => {
    let width = 260;
    let height = 140;
    if (node.type === 'moduleNode') {
      width = 280;
      height = 170;
    } else if (node.type === 'symbolNode') {
      width = 240;
      height = 120;
    }
    dagreGraph.setNode(node.id, { width, height });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    let width = 260;
    let height = 140;
    if (node.type === 'moduleNode') {
      width = 280;
      height = 170;
    } else if (node.type === 'symbolNode') {
      width = 240;
      height = 120;
    }

    return {
      ...node,
      targetPosition: isHorizontal ? Position.Left : Position.Top,
      sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
      position: {
        x: nodeWithPosition ? nodeWithPosition.x - width / 2 : 0,
        y: nodeWithPosition ? nodeWithPosition.y - height / 2 : 0,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
};

export const ArchitectureCanvas: React.FC<ArchitectureCanvasProps> = ({
  nodes: initialNodes,
  edges: initialEdges,
  onSelectNode,
  layoutDirection = 'TB',
  isBlastRadiusActive = false,
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // Format and layout elements whenever input nodes/edges or direction changes
  useEffect(() => {
    const formattedNodes: Node[] = initialNodes.map((n) => ({
      id: n.id,
      type: n.type,
      data: n.data as unknown as Record<string, unknown>,
      position: n.position || { x: 0, y: 0 },
    }));

    const formattedEdges: Edge[] = initialEdges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: e.label,
      type: 'custom',
      animated: e.animated || isBlastRadiusActive,
      data: e.data as unknown as Record<string, unknown>,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 16,
        height: 16,
        color: isBlastRadiusActive ? '#f43f5e' : '#64748b',
      },
    }));

    const layouted = getLayoutedElements(formattedNodes, formattedEdges, layoutDirection);
    setNodes(layouted.nodes);
    setEdges(layouted.edges);
  }, [initialNodes, initialEdges, layoutDirection, isBlastRadiusActive, setNodes, setEdges]);

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      onSelectNode(node.data as unknown as GraphNodeData);
    },
    [onSelectNode]
  );

  return (
    <div className="w-full h-full relative bg-slate-950">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        connectionLineType={ConnectionLineType.SmoothStep}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.15}
        maxZoom={2.5}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="#334155"
        />
        <Controls
          className="!bg-slate-900 !border-slate-800 !shadow-xl !rounded-lg !text-slate-300 [&>button]:!border-slate-800 [&>button]:!bg-slate-900 [&>button:hover]:!bg-slate-800"
        />
        <MinimapRadarControl layoutDirection={layoutDirection} />
      </ReactFlow>
    </div>
  );
};
