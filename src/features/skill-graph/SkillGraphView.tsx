import ForceGraph2D, { type ForceGraphMethods } from 'react-force-graph-2d';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  GRAPH_INTERACTION,
  GRAPH_PHYSICS,
  GRAPH_THEME
} from './constants/graphConfig';
import { useSkillGraphData } from './hooks/useSkillGraphData';
import {
  buildAdjacencyMaps,
  createLinkId,
  deriveActivityState,
  deriveHighlightState,
  shouldDimNode,
  shouldShowNodeLabel
} from './utils/graphUtils';
import type { GraphData, GraphLink, GraphNode, PathMode } from './types/graph';
import './SkillGraphView.css';

const getNodeColor = (node: GraphNode): string => node.color ?? '#8ecaff';

const getNodeTypeLabel = (nodeType: GraphNode['type']): string =>
  nodeType.replace('skill', 'skill ').replace(/^./, (char) => char.toUpperCase());

const getVisibleGraphData = (graphData: GraphData, hiddenGroups: Set<string>): GraphData => {
  const visibleNodes = graphData.nodes.filter((node) => !node.group || !hiddenGroups.has(node.group));
  const visibleNodeIds = new Set(visibleNodes.map((node) => node.id));
  const visibleLinks = graphData.links.filter((link) => {
    const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
    const targetId = typeof link.target === 'string' ? link.target : link.target.id;
    return visibleNodeIds.has(sourceId) && visibleNodeIds.has(targetId);
  });

  return {
    nodes: visibleNodes,
    links: visibleLinks
  };
};

const SkillGraphView = () => {
  const graphRef = useRef<ForceGraphMethods<GraphNode, GraphLink> | undefined>();
  const containerRef = useRef<HTMLDivElement | null>(null);

  const {
    graphData,
    selectedNode,
    selectedNodeId,
    hoveredNodeId,
    sourceNodeId,
    targetNodeId,
    pathMode,
    searchQuery,
    matchedNodeIds,
    pathNodeIds,
    pathLinkIds,
    pathCount,
    expandedNodeIds,
    isExpanding,
    setHoveredNodeId,
    setSelectedNodeId,
    setSourceNodeId,
    setTargetNodeId,
    setPathMode,
    setSearchQuery,
    expandNode,
    clearSelection,
    clearRoute
  } = useSkillGraphData();

  const [zoomLevel, setZoomLevel] = useState(1);
  const [dimensions, setDimensions] = useState({ width: 1024, height: 720 });
  const [hiddenGroups, setHiddenGroups] = useState<Set<string>>(new Set());
  const [revealedNodeIds, setRevealedNodeIds] = useState<Set<string>>(new Set());
  const [revealedLinkIds, setRevealedLinkIds] = useState<Set<string>>(new Set());

  const availableGroups = useMemo(
    () =>
      [...new Set(graphData.nodes.map((node) => node.group).filter((group): group is string => Boolean(group)))].sort(),
    [graphData.nodes]
  );

  useEffect(() => {
    setHiddenGroups((current) => new Set([...current].filter((group) => availableGroups.includes(group))));
  }, [availableGroups]);

  const visibleGraphData = useMemo(
    () => getVisibleGraphData(graphData, hiddenGroups),
    [graphData, hiddenGroups]
  );
  const visibleNodeIds = useMemo(
    () => new Set(visibleGraphData.nodes.map((node) => node.id)),
    [visibleGraphData.nodes]
  );
  const visibleLinkIds = useMemo(
    () => new Set(visibleGraphData.links.map((link) => createLinkId(link))),
    [visibleGraphData.links]
  );
  const adjacency = useMemo(() => buildAdjacencyMaps(visibleGraphData), [visibleGraphData]);

  const visibleMatchedNodeIds = useMemo(
    () => new Set([...matchedNodeIds].filter((nodeId) => visibleNodeIds.has(nodeId))),
    [matchedNodeIds, visibleNodeIds]
  );
  const visiblePathNodeIds = useMemo(
    () => pathNodeIds.filter((nodeId) => visibleNodeIds.has(nodeId)),
    [pathNodeIds, visibleNodeIds]
  );
  const visiblePathLinkIds = useMemo(
    () => pathLinkIds.filter((linkId) => visibleLinkIds.has(linkId)),
    [pathLinkIds, visibleLinkIds]
  );
  const animatedGraphData = useMemo<GraphData>(() => {
    const nodes = visibleGraphData.nodes.filter((node) => revealedNodeIds.has(node.id));
    const links = visibleGraphData.links.filter((link) => {
      const linkId = createLinkId(link);
      const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
      const targetId = typeof link.target === 'string' ? link.target : link.target.id;
      return revealedLinkIds.has(linkId) && revealedNodeIds.has(sourceId) && revealedNodeIds.has(targetId);
    });

    return { nodes, links };
  }, [revealedLinkIds, revealedNodeIds, visibleGraphData.links, visibleGraphData.nodes]);

  const baseHighlight = useMemo(
    () =>
      deriveHighlightState({
        hoveredNodeId: hoveredNodeId && visibleNodeIds.has(hoveredNodeId) ? hoveredNodeId : null,
        selectedNodeId: selectedNodeId && visibleNodeIds.has(selectedNodeId) ? selectedNodeId : null,
        adjacency
      }),
    [adjacency, hoveredNodeId, selectedNodeId, visibleNodeIds]
  );

  const { highlightedNodes, highlightedLinks } = useMemo(
    () =>
      deriveActivityState({
        baseHighlight,
        matchedNodeIds: visibleMatchedNodeIds,
        pathState: {
          pathNodeIds: visiblePathNodeIds,
          pathLinkIds: visiblePathLinkIds,
          pathCount
        }
      }),
    [baseHighlight, pathCount, visibleMatchedNodeIds, visiblePathLinkIds, visiblePathNodeIds]
  );

  const hasActiveContext = Boolean(
    hoveredNodeId ||
      selectedNodeId ||
      visibleMatchedNodeIds.size > 0 ||
      visiblePathNodeIds.length > 0
  );

  const matchedNodes = useMemo(
    () => visibleGraphData.nodes.filter((node) => visibleMatchedNodeIds.has(node.id)).slice(0, 8),
    [visibleGraphData.nodes, visibleMatchedNodeIds]
  );
  const sourceNode = useMemo(
    () => graphData.nodes.find((node) => node.id === sourceNodeId) ?? null,
    [graphData.nodes, sourceNodeId]
  );
  const targetNode = useMemo(
    () => graphData.nodes.find((node) => node.id === targetNodeId) ?? null,
    [graphData.nodes, targetNodeId]
  );
  const pathNodes = useMemo(
    () =>
      visiblePathNodeIds
        .map((nodeId) => visibleGraphData.nodes.find((node) => node.id === nodeId) ?? null)
        .filter((node): node is GraphNode => node !== null),
    [visibleGraphData.nodes, visiblePathNodeIds]
  );

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const observer = new ResizeObserver(([entry]) => {
      if (!entry) {
        return;
      }

      const { width, height } = entry.contentRect;
      setDimensions({
        width: Math.max(320, Math.floor(width)),
        height: Math.max(320, Math.floor(height))
      });
    });

    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const visibleNodeOrder = visibleGraphData.nodes.map((node) => node.id);
    const visibleNodeSet = new Set(visibleNodeOrder);
    const visibleLinkOrder = visibleGraphData.links.map((link) => createLinkId(link));
    const visibleLinkSet = new Set(visibleLinkOrder);

    setRevealedNodeIds((current) => new Set([...current].filter((nodeId) => visibleNodeSet.has(nodeId))));
    setRevealedLinkIds((current) => new Set([...current].filter((linkId) => visibleLinkSet.has(linkId))));

    const nodeTimers = visibleNodeOrder.map((nodeId, index) =>
      window.setTimeout(() => {
        setRevealedNodeIds((current) => {
          if (!visibleNodeSet.has(nodeId) || current.has(nodeId)) {
            return current;
          }

          const next = new Set(current);
          next.add(nodeId);
          return next;
        });
      }, index * 45)
    );

    const linkTimers = visibleLinkOrder.map((linkId, index) =>
      window.setTimeout(() => {
        setRevealedLinkIds((current) => {
          if (!visibleLinkSet.has(linkId) || current.has(linkId)) {
            return current;
          }

          const next = new Set(current);
          next.add(linkId);
          return next;
        });
      }, 180 + index * 26)
    );

    return () => {
      nodeTimers.forEach((timerId) => window.clearTimeout(timerId));
      linkTimers.forEach((timerId) => window.clearTimeout(timerId));
    };
  }, [visibleGraphData]);

  const handleEngineStop = useCallback(() => {
    graphRef.current?.zoomToFit(280, 80);
  }, []);

  const gatherNodesAroundMe = useCallback(() => {
    const graph = graphRef.current;
    if (!graph || visibleGraphData.nodes.length === 0) {
      return;
    }

    const meNode =
      visibleGraphData.nodes.find((node) => node.id === 'user:me') ??
      visibleGraphData.nodes.find((node) => node.type === 'user') ??
      visibleGraphData.nodes[0];
    const centerX = typeof meNode.x === 'number' ? meNode.x : 0;
    const centerY = typeof meNode.y === 'number' ? meNode.y : 0;

    visibleGraphData.nodes.forEach((node) => {
      if (node.id === meNode.id || typeof node.x !== 'number' || typeof node.y !== 'number') {
        return;
      }

      node.x = centerX + (node.x - centerX) * 0.68;
      node.y = centerY + (node.y - centerY) * 0.68;
      node.vx = (node.vx ?? 0) * 0.45;
      node.vy = (node.vy ?? 0) * 0.45;
    });

    graph.d3ReheatSimulation();
    graph.centerAt(centerX, centerY, GRAPH_INTERACTION.focusAnimationMs);
    graph.zoom(1.35, GRAPH_INTERACTION.focusAnimationMs);
  }, [visibleGraphData.nodes]);

  const focusNode = useCallback(
    (nodeId: string) => {
      const node = visibleGraphData.nodes.find((item) => item.id === nodeId);
      setSelectedNodeId(nodeId);

      if (!node) {
        return;
      }

      if (typeof node.x === 'number' && typeof node.y === 'number') {
        graphRef.current?.centerAt(node.x, node.y, GRAPH_INTERACTION.focusAnimationMs);
        graphRef.current?.zoom(1.9, GRAPH_INTERACTION.focusAnimationMs);
      }
    },
    [setSelectedNodeId, visibleGraphData.nodes]
  );

  const toggleGroupVisibility = useCallback((group: string) => {
    setHiddenGroups((current) => {
      const next = new Set(current);
      if (next.has(group)) {
        next.delete(group);
      } else {
        next.add(group);
      }
      return next;
    });
  }, []);

  const setAllGroupsVisible = useCallback(() => {
    setHiddenGroups(new Set());
  }, []);

  const setOnlyNoGroupsVisible = useCallback(() => {
    setHiddenGroups(new Set(availableGroups));
  }, [availableGroups]);

  const handleNodeHover = useCallback(
    (node: GraphNode | null) => {
      const hoveredId = node?.id ?? null;
      setHoveredNodeId(hoveredId);
      if (containerRef.current) {
        containerRef.current.style.cursor = hoveredId ? 'pointer' : 'grab';
      }
    },
    [setHoveredNodeId]
  );

  const handleNodeClick = useCallback(
    (nodeObject: GraphNode) => {
      focusNode(nodeObject.id);
    },
    [focusNode]
  );

  const handleBackgroundClick = useCallback(() => {
    clearSelection();
  }, [clearSelection]);

  const drawNode = useCallback(
    (nodeObject: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const node = nodeObject;
      const isSelected = node.id === selectedNodeId;
      const isHovered = node.id === hoveredNodeId;
      const isMatched = visibleMatchedNodeIds.has(node.id);
      const isPathNode = visiblePathNodeIds.includes(node.id);
      const isHighlighted = highlightedNodes.has(node.id);
      const isDimmed = shouldDimNode({
        nodeId: node.id,
        highlightedNodes,
        hasActiveContext
      });

      const size =
        (node.size ?? 4) *
        (isSelected
          ? 1.55
          : isHovered
            ? 1.35
            : isPathNode
              ? 1.3
              : isMatched
                ? 1.24
                : isHighlighted
                  ? 1.2
                  : 1);
      const opacity = isDimmed
        ? GRAPH_THEME.dimOpacity
        : isSelected || isHovered || isMatched || isPathNode
          ? 1
          : GRAPH_THEME.defaultNodeOpacity;

      ctx.save();
      ctx.beginPath();
      ctx.fillStyle = getNodeColor(node);
      ctx.globalAlpha = opacity;
      ctx.shadowBlur = isSelected || isHovered || isPathNode ? 14 : 6;
      ctx.shadowColor = isPathNode ? '#ffd57a' : getNodeColor(node);
      ctx.arc(node.x ?? 0, node.y ?? 0, size, 0, 2 * Math.PI, false);
      ctx.fill();

      if (isSelected) {
        ctx.beginPath();
        ctx.globalAlpha = 0.7;
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = '#d3f0ff';
        ctx.arc(node.x ?? 0, node.y ?? 0, size + 3.5, 0, 2 * Math.PI, false);
        ctx.stroke();
      }

      if (isPathNode && !isSelected) {
        ctx.beginPath();
        ctx.globalAlpha = 0.6;
        ctx.lineWidth = 1;
        ctx.strokeStyle = '#ffd57a';
        ctx.arc(node.x ?? 0, node.y ?? 0, size + 2.8, 0, 2 * Math.PI, false);
        ctx.stroke();
      }

      const showLabel = shouldShowNodeLabel({
        nodeId: node.id,
        hoveredNodeId,
        selectedNodeId,
        highlightedNodes,
        zoom: zoomLevel,
        threshold: GRAPH_INTERACTION.labelZoomThreshold,
        globalThreshold: GRAPH_INTERACTION.globalLabelZoomThreshold
      });

      if (showLabel) {
        const fontSize = 12 / globalScale;
        ctx.font = `${fontSize}px Inter, Segoe UI, sans-serif`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = isDimmed ? 'rgba(219,232,255,0.3)' : 'rgba(232,242,255,0.96)';
        ctx.globalAlpha = 1;
        ctx.fillText(node.label, (node.x ?? 0) + size + 2.5, node.y ?? 0);
      }

      ctx.restore();
    },
    [
      hasActiveContext,
      highlightedNodes,
      hoveredNodeId,
      selectedNodeId,
      visibleMatchedNodeIds,
      visiblePathNodeIds,
      zoomLevel
    ]
  );

  const linkColor = useCallback(
    (linkObject: GraphLink) => {
      const linkId = createLinkId(linkObject);
      if (!hasActiveContext) {
        return GRAPH_THEME.linkBase;
      }

      if (visiblePathLinkIds.includes(linkId)) {
        return pathMode === 'all' ? 'rgba(255, 184, 92, 0.95)' : 'rgba(255, 213, 122, 0.95)';
      }

      return highlightedLinks.has(linkId) ? GRAPH_THEME.linkHighlight : 'rgba(80, 108, 145, 0.12)';
    },
    [hasActiveContext, highlightedLinks, pathMode, visiblePathLinkIds]
  );

  const linkWidth = useCallback(
    (linkObject: GraphLink) => {
      const linkId = createLinkId(linkObject);
      if (visiblePathLinkIds.includes(linkId)) {
        return pathMode === 'all' ? 2.4 : 2.1;
      }

      return highlightedLinks.has(linkId) ? 1.45 : 0.75;
    },
    [highlightedLinks, pathMode, visiblePathLinkIds]
  );

  const linkDirectionalParticles = useCallback(
    (linkObject: GraphLink) => {
      const linkId = createLinkId(linkObject);
      if (visiblePathLinkIds.includes(linkId)) {
        return pathMode === 'all' ? 3 : 2;
      }

      return highlightedLinks.has(linkId) ? 1 : 0;
    },
    [highlightedLinks, pathMode, visiblePathLinkIds]
  );

  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) {
      return;
    }

    graph.d3Force('charge')?.strength(GRAPH_PHYSICS.chargeStrength);
    graph
      .d3Force('link')
      ?.distance((link: GraphLink) =>
        (link as GraphLink).strength
          ? Math.max(48, 140 - ((link as GraphLink).strength ?? 0) * 40)
          : GRAPH_PHYSICS.linkDistance
      )
      .strength((link: GraphLink) => (link as GraphLink).strength ?? GRAPH_PHYSICS.linkStrength);
    graph.d3ReheatSimulation();
  }, [animatedGraphData]);

  const panelNodeTypeLabel = selectedNode ? getNodeTypeLabel(selectedNode.type) : 'None';
  const hasSearchQuery = searchQuery.trim().length > 0;
  const hasRouteSelection = Boolean(sourceNodeId || targetNodeId);
  const hasResolvedPath = pathCount > 0;
  const routeStatusText =
    !sourceNodeId || !targetNodeId
      ? 'Set both source and target to activate the route.'
      : hasResolvedPath
        ? pathMode === 'all'
          ? `${pathCount} route(s) found. All connected route lines are active.`
          : `${visiblePathNodeIds.length} node(s) are active on the shortest route.`
        : sourceNodeId === targetNodeId
          ? 'Source and target are the same node.'
          : 'No directed route was found with the current graph.';

  const hiddenGroupCount = hiddenGroups.size;

  const handlePathModeChange = useCallback((mode: PathMode) => {
    setPathMode(mode);
  }, [setPathMode]);

  return (
    <div className="skill-graph-layout">
      <div className="skill-graph-header">
        <h2>Skill Relationship Graph</h2>
        <div className="skill-graph-header__meta">
          <span>{visibleGraphData.nodes.length} visible nodes</span>
          <span>{visibleGraphData.links.length} visible links</span>
          <span>{isExpanding ? 'Expanding...' : 'Stable'}</span>
        </div>
      </div>

      <div className="skill-graph-main">
        <div className="skill-graph-canvas" ref={containerRef}>
          <ForceGraph2D
            ref={graphRef}
            graphData={animatedGraphData}
            width={dimensions.width}
            height={dimensions.height}
            backgroundColor={GRAPH_THEME.background}
            minZoom={GRAPH_INTERACTION.minZoom}
            maxZoom={GRAPH_INTERACTION.maxZoom}
            onNodeHover={handleNodeHover}
            onNodeClick={handleNodeClick}
            onBackgroundClick={handleBackgroundClick}
            onZoomEnd={({ k }) => setZoomLevel(k)}
            nodeCanvasObjectMode={() => 'replace'}
            nodeCanvasObject={drawNode}
            nodePointerAreaPaint={(nodeObj, color, ctx) => {
              const node = nodeObj as GraphNode;
              const size = (node.size ?? 4) + 6;
              ctx.fillStyle = color;
              ctx.beginPath();
              ctx.arc(node.x ?? 0, node.y ?? 0, size, 0, 2 * Math.PI, false);
              ctx.fill();
            }}
            linkColor={linkColor}
            linkWidth={linkWidth}
            linkDirectionalParticles={linkDirectionalParticles}
            linkDirectionalParticleWidth={1.4}
            linkDirectionalParticleSpeed={0.006}
            linkDirectionalParticleColor={(link) =>
              visiblePathLinkIds.includes(createLinkId(link as GraphLink))
                ? 'rgba(255, 225, 159, 0.92)'
                : 'rgba(190,230,255,0.85)'
            }
            linkCurvature={0.06}
            cooldownTicks={GRAPH_PHYSICS.cooldownTicks}
            warmupTicks={GRAPH_PHYSICS.warmupTicks}
            d3AlphaDecay={GRAPH_PHYSICS.alphaDecay}
            d3VelocityDecay={GRAPH_PHYSICS.velocityDecay}
            onEngineStop={handleEngineStop}
          />
        </div>

        <aside className="skill-graph-panel">
          <div className="skill-graph-panel__section">
            <h3>Graph Controls</h3>
            <div className="skill-graph-panel__actions">
              <button type="button" className="skill-graph-button" onClick={gatherNodesAroundMe}>
                Gather Around Me
              </button>
            </div>
            <p className="skill-graph-panel__caption">
              Pull visible nodes toward the central user node for a tighter cluster.
            </p>
          </div>

          <div className="skill-graph-panel__section">
            <h3>Search</h3>
            <input
              type="search"
              className="skill-graph-input"
              placeholder="Search labels, ids, types, groups, and metadata"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
            <div className="skill-graph-panel__caption">
              {hasSearchQuery
                ? `${visibleMatchedNodeIds.size} visible match(es) found.`
                : 'Search covers node labels, ids, groups, types, and metadata text.'}
            </div>
            {hasSearchQuery && matchedNodes.length > 0 ? (
              <div className="skill-graph-search-results">
                {matchedNodes.map((node) => (
                  <button
                    key={node.id}
                    type="button"
                    className="skill-graph-result"
                    onClick={() => focusNode(node.id)}
                  >
                    <span className="skill-graph-result__label">{node.label}</span>
                    <span className="skill-graph-result__meta">{node.id}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="skill-graph-panel__section">
            <h3>Group Filters</h3>
            <div className="skill-graph-filter-actions">
              <button type="button" className="skill-graph-button skill-graph-button--ghost" onClick={setAllGroupsVisible}>
                Show All
              </button>
              <button type="button" className="skill-graph-button skill-graph-button--ghost" onClick={setOnlyNoGroupsVisible}>
                Hide Groups
              </button>
            </div>
            <div className="skill-graph-panel__caption">
              {hiddenGroupCount > 0
                ? `${hiddenGroupCount} group filter(s) are hidden.`
                : 'Toggle each data group on or off.'}
            </div>
            <div className="skill-graph-chip-list">
              {availableGroups.map((group) => {
                const isVisible = !hiddenGroups.has(group);
                return (
                  <button
                    key={group}
                    type="button"
                    className={`skill-graph-chip${isVisible ? ' skill-graph-chip--active' : ''}`}
                    onClick={() => toggleGroupVisibility(group)}
                  >
                    {group}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="skill-graph-panel__section">
            <h3>Selected Node</h3>
            {selectedNode ? (
              <>
                <div className="skill-graph-panel__label">{selectedNode.label}</div>
                <div className="skill-graph-panel__type">{panelNodeTypeLabel}</div>
                {selectedNode.metadata ? (
                  <div className="skill-graph-kv-list">
                    {Object.entries(selectedNode.metadata).map(([key, value]) => (
                      <div key={key} className="skill-graph-kv">
                        <span>{key}</span>
                        <strong>{value}</strong>
                      </div>
                    ))}
                  </div>
                ) : null}
                <div className="skill-graph-panel__actions">
                  <button
                    type="button"
                    className="skill-graph-button"
                    onClick={() => void expandNode(selectedNode.id)}
                    disabled={expandedNodeIds.has(selectedNode.id) || isExpanding}
                  >
                    {expandedNodeIds.has(selectedNode.id) ? 'Expanded' : 'Expand Neighborhood'}
                  </button>
                  <button
                    type="button"
                    className="skill-graph-button"
                    onClick={() => setSourceNodeId(selectedNode.id)}
                  >
                    Set As Source
                  </button>
                  <button
                    type="button"
                    className="skill-graph-button"
                    onClick={() => setTargetNodeId(selectedNode.id)}
                  >
                    Set As Target
                  </button>
                  <button
                    type="button"
                    className="skill-graph-button skill-graph-button--ghost"
                    onClick={clearSelection}
                  >
                    Clear Selection
                  </button>
                </div>
              </>
            ) : (
              <p className="skill-graph-panel__empty">
                Click a node to inspect metadata and set route endpoints.
              </p>
            )}
          </div>

          <div className="skill-graph-panel__section">
            <h3>Route Activation</h3>
            <div className="skill-graph-route-card">
              <div className="skill-graph-mode-tabs">
                <button
                  type="button"
                  className={`skill-graph-tab${pathMode === 'shortest' ? ' skill-graph-tab--active' : ''}`}
                  onClick={() => handlePathModeChange('shortest')}
                >
                  Shortest Route
                </button>
                <button
                  type="button"
                  className={`skill-graph-tab${pathMode === 'all' ? ' skill-graph-tab--active' : ''}`}
                  onClick={() => handlePathModeChange('all')}
                >
                  All Routes
                </button>
              </div>
              <div className="skill-graph-route-card__row">
                <span>Source</span>
                <strong>{sourceNode?.label ?? 'Not set'}</strong>
              </div>
              <div className="skill-graph-route-card__row">
                <span>Target</span>
                <strong>{targetNode?.label ?? 'Not set'}</strong>
              </div>
              <p className="skill-graph-panel__caption">{routeStatusText}</p>
              {hasResolvedPath ? (
                <div className="skill-graph-path-list">
                  {pathNodes.map((node) => (
                    <button
                      key={node.id}
                      type="button"
                      className="skill-graph-path-node"
                      onClick={() => focusNode(node.id)}
                    >
                      {node.label}
                    </button>
                  ))}
                </div>
              ) : null}
              {hasRouteSelection ? (
                <button
                  type="button"
                  className="skill-graph-button skill-graph-button--ghost"
                  onClick={clearRoute}
                >
                  Clear Route
                </button>
              ) : null}
            </div>
          </div>

          <div className="skill-graph-panel__section">
            <h3>Interaction Hints</h3>
            <ul className="skill-graph-list">
              <li>Shortest Route shows one minimum-hop path between source and target.</li>
              <li>All Routes activates every directed path found between source and target.</li>
              <li>Group filters hide matching node groups from the current graph view.</li>
              <li>Search and hover highlights work on the currently visible graph.</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default SkillGraphView;
