import type { GraphNodeType } from '../types/graph';

export const GRAPH_COLORS: Record<GraphNodeType, string> = {
  user: '#8bc5ff',
  department: '#70a5ff',
  job: '#9f8dff',
  skillLarge: '#59d4ff',
  skillMedium: '#36b9ff',
  skillSmall: '#2da3ff',
  skillRaw: '#7fdfff',
  education: '#8de0c9'
};

export const GRAPH_NODE_SIZE: Record<GraphNodeType, number> = {
  user: 5.8,
  department: 5,
  job: 5.2,
  skillLarge: 4.9,
  skillMedium: 4.5,
  skillSmall: 4.2,
  skillRaw: 3.8,
  education: 4.6
};

export const GRAPH_PHYSICS = {
  chargeStrength: -150,
  linkDistance: 105,
  linkStrength: 0.15,
  velocityDecay: 0.22,
  alphaDecay: 0.045,
  alphaMin: 0.001,
  cooldownTicks: 180,
  warmupTicks: 30
} as const;

export const GRAPH_INTERACTION = {
  minZoom: 0.2,
  maxZoom: 4,
  nodeFocusDistance: 180,
  focusAnimationMs: 700,
  expansionWarmupTicks: 20,
  labelZoomThreshold: 1.25,
  globalLabelZoomThreshold: 2.2
} as const;

export const GRAPH_THEME = {
  background: '#070b14',
  panelBackground: '#0b1220',
  border: '#1b2a43',
  textPrimary: '#dbe8ff',
  textSecondary: '#8ca1c4',
  linkBase: 'rgba(133, 170, 225, 0.22)',
  linkHighlight: 'rgba(146, 201, 255, 0.85)',
  glow: 'rgba(87, 199, 255, 0.35)',
  dimOpacity: 0.12,
  defaultNodeOpacity: 0.9,
  highlightedNodeOpacity: 1
} as const;

export const GRAPH_DEFAULTS = {
  maxInitialNodes: 150,
  maxInitialLinks: 300
} as const;
