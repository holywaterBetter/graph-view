import { useCallback, useMemo, useState } from 'react';
import { mockExpansionMap, mockSkillGraphSeed } from '../data/mockSkillGraphData';
import { buildAdjacencyMaps, mergeGraphData, normalizeGraph } from '../utils/graphUtils';
import type { GraphData, GraphNode } from '../types/graph';

interface UseSkillGraphDataResult {
  graphData: GraphData;
  selectedNode: GraphNode | null;
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  expandedNodeIds: Set<string>;
  isExpanding: boolean;
  adjacency: ReturnType<typeof buildAdjacencyMaps>;
  setHoveredNodeId: (nodeId: string | null) => void;
  setSelectedNodeId: (nodeId: string | null) => void;
  expandNode: (nodeId: string) => Promise<void>;
  clearSelection: () => void;
}

export const useSkillGraphData = (): UseSkillGraphDataResult => {
  const [graphData, setGraphData] = useState<GraphData>(() => normalizeGraph(mockSkillGraphSeed));
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(new Set());
  const [isExpanding, setIsExpanding] = useState(false);

  const adjacency = useMemo(() => buildAdjacencyMaps(graphData), [graphData]);

  const selectedNode = useMemo(
    () => graphData.nodes.find((node) => node.id === selectedNodeId) ?? null,
    [graphData.nodes, selectedNodeId]
  );

  const expandNode = useCallback(async (nodeId: string): Promise<void> => {
    if (expandedNodeIds.has(nodeId)) {
      return;
    }

    const expansionPayload = mockExpansionMap[nodeId];
    if (!expansionPayload) {
      return;
    }

    setIsExpanding(true);

    await new Promise((resolve) => {
      window.setTimeout(resolve, 260);
    });

    setGraphData((current) => mergeGraphData(current, expansionPayload));
    setExpandedNodeIds((prev) => {
      const next = new Set(prev);
      next.add(nodeId);
      return next;
    });

    setIsExpanding(false);
  }, [expandedNodeIds]);

  const clearSelection = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  return {
    graphData,
    selectedNode,
    selectedNodeId,
    hoveredNodeId,
    expandedNodeIds,
    isExpanding,
    adjacency,
    setHoveredNodeId,
    setSelectedNodeId,
    expandNode,
    clearSelection
  };
};
