import type { LinkObject, NodeObject } from 'react-force-graph-2d';

export type GraphNodeType =
  | 'user'
  | 'job'
  | 'department'
  | 'skillLarge'
  | 'skillMedium'
  | 'skillSmall'
  | 'skillRaw'
  | 'education';

export interface GraphNode extends NodeObject {
  id: string;
  label: string;
  type: GraphNodeType;
  group?: string;
  color?: string;
  size?: number;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number;
  fy?: number;
  expanded?: boolean;
  metadata?: Record<string, string>;
}

export interface GraphLink extends LinkObject {
  source: string | GraphNode;
  target: string | GraphNode;
  label?: string;
  strength?: number;
  id?: string;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export interface GraphExpansionPayload {
  nodes: GraphNode[];
  links: GraphLink[];
}

export type NodeId = GraphNode['id'];

export interface HighlightState {
  highlightedNodes: Set<NodeId>;
  highlightedLinks: Set<string>;
}

export interface AdjacencyMaps {
  neighborsByNode: Map<NodeId, Set<NodeId>>;
  linksByNode: Map<NodeId, Set<string>>;
}
