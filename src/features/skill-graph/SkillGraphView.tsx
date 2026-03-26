import ForceGraph2D, { type ForceGraphMethods } from 'react-force-graph-2d';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  GRAPH_INTERACTION,
  GRAPH_PHYSICS,
  GRAPH_THEME
} from './constants/graphConfig';
import { useSkillGraphData } from './hooks/useSkillGraphData';
import {
  createLinkId,
  deriveHighlightState,
  shouldDimNode,
  shouldShowNodeLabel
} from './utils/graphUtils';
import type { GraphLink, GraphNode } from './types/graph';
import './SkillGraphView.css';

const getNodeColor = (node: GraphNode): string => node.color ?? '#8ecaff';


const SkillGraphView = () => {
  const graphRef = useRef<ForceGraphMethods<GraphNode, GraphLink> | undefined>();
  const containerRef = useRef<HTMLDivElement | null>(null);

  const {
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
  } = useSkillGraphData();

  const [zoomLevel, setZoomLevel] = useState(1);
  const [dimensions, setDimensions] = useState({ width: 1024, height: 720 });

  const hasActiveContext = Boolean(hoveredNodeId || selectedNodeId);

  const { highlightedNodes, highlightedLinks } = useMemo(
    () =>
      deriveHighlightState({
        hoveredNodeId,
        selectedNodeId,
        adjacency
      }),
    [adjacency, hoveredNodeId, selectedNodeId]
  );


  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
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

  const handleEngineStop = useCallback(() => {
    graphRef.current?.zoomToFit(280, 80);
  }, []);

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
      const node = nodeObject;
      setSelectedNodeId(node.id);

      if (typeof node.x === 'number' && typeof node.y === 'number') {
        graphRef.current?.centerAt(node.x, node.y, GRAPH_INTERACTION.focusAnimationMs);
        graphRef.current?.zoom(1.9, GRAPH_INTERACTION.focusAnimationMs);
      }
    },
    [setSelectedNodeId]
  );

  const handleBackgroundClick = useCallback(() => {
    clearSelection();
  }, [clearSelection]);

  const drawNode = useCallback(
    (nodeObject: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const node = nodeObject;
      const isSelected = node.id === selectedNodeId;
      const isHovered = node.id === hoveredNodeId;
      const isHighlighted = highlightedNodes.has(node.id);
      const isDimmed = shouldDimNode({
        nodeId: node.id,
        highlightedNodes,
        hasActiveContext
      });

      const size = (node.size ?? 4) * (isSelected ? 1.55 : isHovered ? 1.35 : isHighlighted ? 1.2 : 1);
      const opacity = isDimmed ? GRAPH_THEME.dimOpacity : isSelected || isHovered ? 1 : GRAPH_THEME.defaultNodeOpacity;

      ctx.save();

      ctx.beginPath();
      ctx.fillStyle = getNodeColor(node);
      ctx.globalAlpha = opacity;
      ctx.shadowBlur = isSelected || isHovered ? 14 : 6;
      ctx.shadowColor = getNodeColor(node);
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
    [hasActiveContext, highlightedNodes, hoveredNodeId, selectedNodeId, zoomLevel]
  );

  const linkColor = useCallback(
    (linkObject: GraphLink) => {
      const linkId = createLinkId(linkObject);

      if (!hasActiveContext) {
        return GRAPH_THEME.linkBase;
      }

      return highlightedLinks.has(linkId) ? GRAPH_THEME.linkHighlight : 'rgba(80, 108, 145, 0.12)';
    },
    [hasActiveContext, highlightedLinks]
  );

  const linkWidth = useCallback(
    (linkObject: GraphLink) => {
      const linkId = createLinkId(linkObject);
      return highlightedLinks.has(linkId) ? 1.45 : 0.75;
    },
    [highlightedLinks]
  );

  const linkDirectionalParticles = useCallback(
    (linkObject: GraphLink) => {
      const linkId = createLinkId(linkObject);
      return highlightedLinks.has(linkId) ? 1 : 0;
    },
    [highlightedLinks]
  );


  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) {
      return;
    }

    graph.d3Force('charge')?.strength(GRAPH_PHYSICS.chargeStrength);
    graph.d3Force('link')
      ?.distance((link: GraphLink) => (link as GraphLink).strength ? Math.max(48, 140 - ((link as GraphLink).strength ?? 0) * 40) : GRAPH_PHYSICS.linkDistance)
      .strength((link: GraphLink) => (link as GraphLink).strength ?? GRAPH_PHYSICS.linkStrength);
    graph.d3ReheatSimulation();
  }, [graphData]);

  const panelNodeTypeLabel = selectedNode?.type.replace('skill', 'skill ').replace(/^./, (char) => char.toUpperCase()) ?? 'None';

  return (
    <div className="skill-graph-layout">
      <div className="skill-graph-header">
        <h2>Skill Relationship Graph</h2>
        <div className="skill-graph-header__meta">
          <span>{graphData.nodes.length} nodes</span>
          <span>{graphData.links.length} links</span>
          <span>{isExpanding ? 'Expanding…' : 'Stable'}</span>
        </div>
      </div>

      <div className="skill-graph-main">
        <div className="skill-graph-canvas" ref={containerRef}>
          <ForceGraph2D
            ref={graphRef}
            graphData={graphData}
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
            linkDirectionalParticleColor={() => 'rgba(190,230,255,0.85)'}
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
            <h3>Selected Node</h3>
            {selectedNode ? (
              <>
                <div className="skill-graph-panel__label">{selectedNode.label}</div>
                <div className="skill-graph-panel__type">{panelNodeTypeLabel}</div>
                <div className="skill-graph-panel__actions">
                  <button
                    type="button"
                    className="skill-graph-button"
                    onClick={() => void expandNode(selectedNode.id)}
                    disabled={expandedNodeIds.has(selectedNode.id) || isExpanding}
                  >
                    {expandedNodeIds.has(selectedNode.id) ? 'Expanded' : 'Expand Neighborhood'}
                  </button>
                  <button type="button" className="skill-graph-button skill-graph-button--ghost" onClick={clearSelection}>
                    Clear Selection
                  </button>
                </div>
              </>
            ) : (
              <p className="skill-graph-panel__empty">
                Click a node to lock focus, center camera, and inspect local relationships.
              </p>
            )}
          </div>

          <div className="skill-graph-panel__section">
            <h3>Interaction Hints</h3>
            <ul className="skill-graph-list">
              <li>Hover nodes to highlight immediate neighbors.</li>
              <li>Click a node to persist focus and dim unrelated context.</li>
              <li>Use mouse wheel to zoom and drag to pan.</li>
              <li>Use “Expand Neighborhood” for progressive graph loading.</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default SkillGraphView;
