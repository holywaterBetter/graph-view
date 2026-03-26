import { useCallback, useMemo, useState } from 'react';
import { mockExpansionMap, mockSkillGraphSeed } from '../data/mockSkillGraphData';
import {
  buildAdjacencyMaps,
  findAllDirectedPaths,
  findDirectedPath,
  findNodeIdsByQuery,
  mergeGraphData,
  normalizeGraph
} from '../utils/graphUtils';
import type { GraphData, GraphNode, PathMode } from '../types/graph';

interface UseSkillGraphDataResult {
  graphData: GraphData;
  selectedNode: GraphNode | null;
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  sourceNodeId: string | null;
  targetNodeId: string | null;
  pathMode: PathMode;
  searchQuery: string;
  matchedNodeIds: Set<string>;
  pathNodeIds: string[];
  pathLinkIds: string[];
  pathCount: number;
  expandedNodeIds: Set<string>;
  isExpanding: boolean;
  adjacency: ReturnType<typeof buildAdjacencyMaps>;
  setHoveredNodeId: (nodeId: string | null) => void;
  setSelectedNodeId: (nodeId: string | null) => void;
  setSourceNodeId: (nodeId: string | null) => void;
  setTargetNodeId: (nodeId: string | null) => void;
  setPathMode: (mode: PathMode) => void;
  setSearchQuery: (query: string) => void;
  expandNode: (nodeId: string) => Promise<void>;
  clearSelection: () => void;
  clearRoute: () => void;
}

export const useSkillGraphData = (): UseSkillGraphDataResult => {
  const [graphData, setGraphData] = useState<GraphData>(() => normalizeGraph(mockSkillGraphSeed));
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [sourceNodeId, setSourceNodeId] = useState<string | null>(null);
  const [targetNodeId, setTargetNodeId] = useState<string | null>(null);
  const [pathMode, setPathMode] = useState<PathMode>('shortest');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(new Set());
  const [isExpanding, setIsExpanding] = useState(false);

  const adjacency = useMemo(() => buildAdjacencyMaps(graphData), [graphData]);
  const matchedNodeIds = useMemo(
    () => findNodeIdsByQuery(graphData.nodes, searchQuery),
    [graphData.nodes, searchQuery]
  );
  const pathState = useMemo(() => {
    if (!sourceNodeId || !targetNodeId) {
      return { pathNodeIds: [], pathLinkIds: [], pathCount: 0 };
    }

    return pathMode === 'all'
      ? findAllDirectedPaths(graphData, sourceNodeId, targetNodeId)
      : findDirectedPath(graphData, sourceNodeId, targetNodeId);
  }, [graphData, pathMode, sourceNodeId, targetNodeId]);

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

  const clearRoute = useCallback(() => {
    setSourceNodeId(null);
    setTargetNodeId(null);
  }, []);

  return {
    graphData,
    selectedNode,
    selectedNodeId,
    hoveredNodeId,
    sourceNodeId,
    targetNodeId,
    pathMode,
    searchQuery,
    matchedNodeIds,
    pathNodeIds: pathState.pathNodeIds,
    pathLinkIds: pathState.pathLinkIds,
    pathCount: pathState.pathCount,
    expandedNodeIds,
    isExpanding,
    adjacency,
    setHoveredNodeId,
    setSelectedNodeId,
    setSourceNodeId,
    setTargetNodeId,
    setPathMode,
    setSearchQuery,
    expandNode,
    clearSelection,
    clearRoute
  };
};
