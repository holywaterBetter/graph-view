import { GRAPH_COLORS, GRAPH_NODE_SIZE } from '../constants/graphConfig';
import type { AdjacencyMaps, GraphData, GraphLink, GraphNode, HighlightState, NodeId, PathState } from '../types/graph';

const resolveNodeId = (value: string | GraphNode): string => (typeof value === 'string' ? value : value.id);

export const createLinkId = (link: GraphLink): string => {
  if (link.id) {
    return link.id;
  }

  const source = resolveNodeId(link.source);
  const target = resolveNodeId(link.target);
  return `${source}->${target}:${link.label ?? 'related'}`;
};

export const normalizeGraph = (graph: GraphData): GraphData => {
  const nodeById = new Map<string, GraphNode>();
  for (const node of graph.nodes) {
    if (!nodeById.has(node.id)) {
      nodeById.set(node.id, {
        ...node,
        color: node.color ?? GRAPH_COLORS[node.type],
        size: node.size ?? GRAPH_NODE_SIZE[node.type]
      });
    }
  }

  const linkById = new Map<string, GraphLink>();
  for (const link of graph.links) {
    const id = createLinkId(link);
    if (!linkById.has(id)) {
      linkById.set(id, { ...link, id });
    }
  }

  return {
    nodes: [...nodeById.values()],
    links: [...linkById.values()]
  };
};

export const mergeGraphData = (current: GraphData, incoming: GraphData): GraphData => {
  const nodePositionMap = new Map<string, Pick<GraphNode, 'x' | 'y' | 'vx' | 'vy' | 'fx' | 'fy'>>();
  for (const node of current.nodes) {
    nodePositionMap.set(node.id, {
      x: node.x,
      y: node.y,
      vx: node.vx,
      vy: node.vy,
      fx: node.fx,
      fy: node.fy
    });
  }

  const merged = normalizeGraph({
    nodes: [...current.nodes, ...incoming.nodes],
    links: [...current.links, ...incoming.links]
  });

  merged.nodes = merged.nodes.map((node) => {
    const previousPosition = nodePositionMap.get(node.id);
    return previousPosition
      ? {
          ...node,
          ...previousPosition
        }
      : node;
  });

  return merged;
};

export const buildAdjacencyMaps = (graph: GraphData): AdjacencyMaps => {
  const neighborsByNode = new Map<NodeId, Set<NodeId>>();
  const linksByNode = new Map<NodeId, Set<string>>();

  for (const node of graph.nodes) {
    neighborsByNode.set(node.id, new Set<NodeId>());
    linksByNode.set(node.id, new Set<string>());
  }

  for (const link of graph.links) {
    const source = resolveNodeId(link.source);
    const target = resolveNodeId(link.target);
    const linkId = createLinkId(link);

    neighborsByNode.get(source)?.add(target);
    neighborsByNode.get(target)?.add(source);

    linksByNode.get(source)?.add(linkId);
    linksByNode.get(target)?.add(linkId);
  }

  return { neighborsByNode, linksByNode };
};

export const deriveHighlightState = ({
  hoveredNodeId,
  selectedNodeId,
  adjacency
}: {
  hoveredNodeId: NodeId | null;
  selectedNodeId: NodeId | null;
  adjacency: AdjacencyMaps;
}): HighlightState => {
  const rootNodeId = hoveredNodeId ?? selectedNodeId;
  const highlightedNodes = new Set<NodeId>();
  const highlightedLinks = new Set<string>();

  if (!rootNodeId) {
    return { highlightedNodes, highlightedLinks };
  }

  highlightedNodes.add(rootNodeId);

  for (const neighborId of adjacency.neighborsByNode.get(rootNodeId) ?? []) {
    highlightedNodes.add(neighborId);
  }

  for (const linkId of adjacency.linksByNode.get(rootNodeId) ?? []) {
    highlightedLinks.add(linkId);
  }

  return { highlightedNodes, highlightedLinks };
};

export const buildSearchableText = (node: GraphNode): string => {
  const metadataText = node.metadata
    ? Object.entries(node.metadata)
        .flatMap(([key, value]) => [key, value])
        .join(' ')
    : '';

  return [node.id, node.label, node.group, node.type, metadataText]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
};

export const findNodeIdsByQuery = (nodes: GraphNode[], query: string): Set<NodeId> => {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return new Set<NodeId>();
  }

  return new Set(
    nodes
      .filter((node) => buildSearchableText(node).includes(normalizedQuery))
      .map((node) => node.id)
  );
};

export const findDirectedPath = (graph: GraphData, sourceNodeId: NodeId, targetNodeId: NodeId): PathState => {
  if (sourceNodeId === targetNodeId) {
    return { pathNodeIds: [sourceNodeId], pathLinkIds: [], pathCount: 1 };
  }

  const outgoingLinksByNode = new Map<NodeId, Array<{ nextNodeId: NodeId; linkId: string }>>();
  for (const node of graph.nodes) {
    outgoingLinksByNode.set(node.id, []);
  }

  for (const link of graph.links) {
    const source = resolveNodeId(link.source);
    const target = resolveNodeId(link.target);
    outgoingLinksByNode.get(source)?.push({
      nextNodeId: target,
      linkId: createLinkId(link)
    });
  }

  const queue: NodeId[] = [sourceNodeId];
  const visited = new Set<NodeId>([sourceNodeId]);
  const previousByNode = new Map<NodeId, { nodeId: NodeId; linkId: string }>();

  while (queue.length > 0) {
    const currentNodeId = queue.shift();
    if (!currentNodeId) {
      break;
    }

    for (const edge of outgoingLinksByNode.get(currentNodeId) ?? []) {
      if (visited.has(edge.nextNodeId)) {
        continue;
      }

      visited.add(edge.nextNodeId);
      previousByNode.set(edge.nextNodeId, {
        nodeId: currentNodeId,
        linkId: edge.linkId
      });

      if (edge.nextNodeId === targetNodeId) {
        const pathNodeIds: NodeId[] = [targetNodeId];
        const pathLinkIds: string[] = [];
        let cursor = targetNodeId;

        while (cursor !== sourceNodeId) {
          const previous = previousByNode.get(cursor);
          if (!previous) {
            return { pathNodeIds: [], pathLinkIds: [], pathCount: 0 };
          }

          pathNodeIds.unshift(previous.nodeId);
          pathLinkIds.unshift(previous.linkId);
          cursor = previous.nodeId;
        }

        return { pathNodeIds, pathLinkIds, pathCount: 1 };
      }

      queue.push(edge.nextNodeId);
    }
  }

  return { pathNodeIds: [], pathLinkIds: [], pathCount: 0 };
};

export const findAllDirectedPaths = (
  graph: GraphData,
  sourceNodeId: NodeId,
  targetNodeId: NodeId,
  maxPathCount = 256
): PathState => {
  if (sourceNodeId === targetNodeId) {
    return { pathNodeIds: [sourceNodeId], pathLinkIds: [], pathCount: 1 };
  }

  const outgoingLinksByNode = new Map<NodeId, Array<{ nextNodeId: NodeId; linkId: string }>>();
  for (const node of graph.nodes) {
    outgoingLinksByNode.set(node.id, []);
  }

  for (const link of graph.links) {
    const source = resolveNodeId(link.source);
    const target = resolveNodeId(link.target);
    outgoingLinksByNode.get(source)?.push({
      nextNodeId: target,
      linkId: createLinkId(link)
    });
  }

  const pathNodeSet = new Set<NodeId>();
  const pathLinkSet = new Set<string>();
  let pathCount = 0;

  const visit = (
    currentNodeId: NodeId,
    visitedNodeIds: Set<NodeId>,
    currentNodeIds: NodeId[],
    currentLinkIds: string[]
  ): void => {
    if (pathCount >= maxPathCount) {
      return;
    }

    if (currentNodeId === targetNodeId) {
      pathCount += 1;
      currentNodeIds.forEach((nodeId) => pathNodeSet.add(nodeId));
      currentLinkIds.forEach((linkId) => pathLinkSet.add(linkId));
      return;
    }

    for (const edge of outgoingLinksByNode.get(currentNodeId) ?? []) {
      if (visitedNodeIds.has(edge.nextNodeId)) {
        continue;
      }

      visitedNodeIds.add(edge.nextNodeId);
      currentNodeIds.push(edge.nextNodeId);
      currentLinkIds.push(edge.linkId);

      visit(edge.nextNodeId, visitedNodeIds, currentNodeIds, currentLinkIds);

      currentLinkIds.pop();
      currentNodeIds.pop();
      visitedNodeIds.delete(edge.nextNodeId);
    }
  };

  visit(sourceNodeId, new Set<NodeId>([sourceNodeId]), [sourceNodeId], []);

  return {
    pathNodeIds: [...pathNodeSet],
    pathLinkIds: [...pathLinkSet],
    pathCount
  };
};

export const deriveActivityState = ({
  baseHighlight,
  matchedNodeIds,
  pathState
}: {
  baseHighlight: HighlightState;
  matchedNodeIds: Set<NodeId>;
  pathState: PathState;
}): HighlightState => {
  const highlightedNodes = new Set<NodeId>([
    ...baseHighlight.highlightedNodes,
    ...matchedNodeIds,
    ...pathState.pathNodeIds
  ]);
  const highlightedLinks = new Set<string>([
    ...baseHighlight.highlightedLinks,
    ...pathState.pathLinkIds
  ]);

  return { highlightedNodes, highlightedLinks };
};

export const shouldDimNode = ({
  nodeId,
  highlightedNodes,
  hasActiveContext
}: {
  nodeId: string;
  highlightedNodes: Set<string>;
  hasActiveContext: boolean;
}): boolean => hasActiveContext && !highlightedNodes.has(nodeId);

export const shouldShowNodeLabel = ({
  nodeId,
  hoveredNodeId,
  selectedNodeId,
  highlightedNodes,
  zoom,
  threshold,
  globalThreshold
}: {
  nodeId: string;
  hoveredNodeId: string | null;
  selectedNodeId: string | null;
  highlightedNodes: Set<string>;
  zoom: number;
  threshold: number;
  globalThreshold: number;
}): boolean => {
  if (nodeId === hoveredNodeId || nodeId === selectedNodeId) {
    return true;
  }

  if (highlightedNodes.has(nodeId)) {
    return zoom >= threshold;
  }

  return zoom >= globalThreshold;
};
