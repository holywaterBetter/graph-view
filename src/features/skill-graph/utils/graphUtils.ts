import { GRAPH_COLORS, GRAPH_NODE_SIZE } from '../constants/graphConfig';
import type { AdjacencyMaps, GraphData, GraphLink, GraphNode, HighlightState, NodeId } from '../types/graph';

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
