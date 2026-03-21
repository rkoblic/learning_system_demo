import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';

const STATUS_COLORS = {
  not_assessed: '#94a3b8',
  in_progress: '#f59e0b',
  demonstrated: '#22c55e',
  gap_detected: '#ef4444',
};

const CURRENT_COLOR = '#3b82f6';

export default function KnowledgeGraph({ graph, evidenceMap, currentNode }) {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const simRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);

  useEffect(() => {
    if (!graph || !svgRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Build data copies for d3 (it mutates them)
    const nodes = graph.nodes.map((n) => ({ ...n }));
    const edges = graph.edges.map((e) => ({ ...e }));

    // Arrow marker
    svg
      .append('defs')
      .append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 28)
      .attr('refY', 0)
      .attr('markerWidth', 8)
      .attr('markerHeight', 8)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#94a3b8');

    const g = svg.append('g');

    // Zoom
    const zoom = d3.zoom()
      .scaleExtent([0.3, 3])
      .on('zoom', (event) => g.attr('transform', event.transform));
    svg.call(zoom);

    // Edge groups
    const edgeGroup = g
      .append('g')
      .attr('class', 'edges')
      .selectAll('line')
      .data(edges)
      .join('line')
      .attr('stroke', '#cbd5e1')
      .attr('stroke-width', 1.5)
      .attr('marker-end', 'url(#arrowhead)');

    // Edge hover labels
    const edgeLabelGroup = g
      .append('g')
      .attr('class', 'edge-labels')
      .selectAll('text')
      .data(edges)
      .join('text')
      .text((d) => d.relationship)
      .attr('font-size', 11)
      .attr('fill', '#64748b')
      .attr('text-anchor', 'middle')
      .attr('dy', -6)
      .attr('opacity', 0)
      .style('pointer-events', 'none');

    // Show edge label on hover
    edgeGroup
      .on('mouseenter', (event, d) => {
        const idx = edges.indexOf(d);
        edgeLabelGroup.filter((_, i) => i === idx).attr('opacity', 1);
        d3.select(event.target).attr('stroke', '#3b82f6').attr('stroke-width', 2.5);
      })
      .on('mouseleave', (event, d) => {
        const idx = edges.indexOf(d);
        edgeLabelGroup.filter((_, i) => i === idx).attr('opacity', 0);
        d3.select(event.target).attr('stroke', '#cbd5e1').attr('stroke-width', 1.5);
      });

    // Node groups
    const nodeGroup = g
      .append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .style('cursor', 'pointer')
      .call(
        d3.drag()
          .on('start', (event, d) => {
            if (!event.active) sim.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on('drag', (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on('end', (event, d) => {
            if (!event.active) sim.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      );

    // Node circles
    nodeGroup
      .append('circle')
      .attr('r', (d) => (d.type === 'learning_objective' ? 22 : 16))
      .attr('fill', (d) => getNodeColor(d.id, evidenceMap, currentNode))
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 2);

    // Node labels
    nodeGroup
      .append('text')
      .text((d) => d.label)
      .attr('font-size', 12)
      .attr('text-anchor', 'middle')
      .attr('dy', (d) => (d.type === 'learning_objective' ? 34 : 28))
      .attr('fill', '#1e293b')
      .attr('font-weight', 500)
      .style('pointer-events', 'none');

    // Click for tooltip
    nodeGroup.on('click', (event, d) => {
      event.stopPropagation();
      setTooltip({
        node: d,
        x: event.pageX,
        y: event.pageY,
      });
    });

    svg.on('click', () => setTooltip(null));

    // Force simulation
    const sim = d3
      .forceSimulation(nodes)
      .force('link', d3.forceLink(edges).id((d) => d.id).distance(120))
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(30))
      .alphaDecay(0.05);

    simRef.current = sim;

    sim.on('tick', () => {
      edgeGroup
        .attr('x1', (d) => d.source.x)
        .attr('y1', (d) => d.source.y)
        .attr('x2', (d) => d.target.x)
        .attr('y2', (d) => d.target.y);

      edgeLabelGroup
        .attr('x', (d) => (d.source.x + d.target.x) / 2)
        .attr('y', (d) => (d.source.y + d.target.y) / 2);

      nodeGroup.attr('transform', (d) => `translate(${d.x},${d.y})`);
    });

    return () => {
      sim.stop();
    };
  }, [graph]);

  // Update node colors when evidence changes (without re-running the full simulation)
  useEffect(() => {
    if (!svgRef.current || !graph) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll('.nodes circle').attr('fill', function (d) {
      return getNodeColor(d.id, evidenceMap, currentNode);
    });

    // Add pulsing ring to current node
    svg.selectAll('.pulse-ring').remove();
    if (currentNode) {
      svg.selectAll('.nodes g').each(function (d) {
        if (d.id === currentNode) {
          const parent = d3.select(this);
          const r = d.type === 'learning_objective' ? 22 : 16;
          parent
            .insert('circle', 'circle')
            .attr('class', 'pulse-ring')
            .attr('r', r + 6)
            .attr('fill', 'none')
            .attr('stroke', CURRENT_COLOR)
            .attr('stroke-width', 2)
            .attr('opacity', 0.7);
        }
      });

      // Animate edges leading to/from the current node
      svg.selectAll('.edges line').each(function (d) {
        if (d.source?.id === currentNode || d.target?.id === currentNode ||
            d.source === currentNode || d.target === currentNode) {
          const el = d3.select(this);
          el.classed('edge-traversal', false);
          // Force reflow to restart animation
          void this.offsetWidth;
          el.classed('edge-traversal', true);
        }
      });
    }
  }, [evidenceMap, currentNode, graph]);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        style={{ display: 'block' }}
      />
      {tooltip && (
        <div
          style={{
            position: 'fixed',
            left: Math.min(tooltip.x + 10, window.innerWidth - 320),
            top: Math.min(tooltip.y + 10, window.innerHeight - 200),
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            padding: 16,
            maxWidth: 300,
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            zIndex: 100,
            fontSize: 14,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 15 }}>{tooltip.node.label}</div>
          <div style={{ color: '#64748b', marginBottom: 4 }}>
            <strong>Type:</strong> {tooltip.node.type} &nbsp;|&nbsp;
            <strong>Difficulty:</strong> {tooltip.node.difficulty || 'n/a'}
          </div>
          {tooltip.node.estimated_minutes && (
            <div style={{ color: '#64748b', marginBottom: 4 }}>
              <strong>Est. time:</strong> {tooltip.node.estimated_minutes} min
            </div>
          )}
          {tooltip.node.description && (
            <p style={{ color: '#334155', lineHeight: 1.5, marginBottom: 6 }}>
              {tooltip.node.description}
            </p>
          )}
          {tooltip.node.misconceptions?.length > 0 && (
            <div>
              <strong style={{ color: '#ef4444' }}>Common misconceptions:</strong>
              <ul style={{ margin: '4px 0 0 16px', color: '#475569', lineHeight: 1.5 }}>
                {tooltip.node.misconceptions.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            </div>
          )}
          <button
            onClick={() => setTooltip(null)}
            style={{
              marginTop: 8,
              padding: '4px 10px',
              fontSize: 12,
              background: '#f1f5f9',
              border: '1px solid #e2e8f0',
              borderRadius: 4,
              cursor: 'pointer',
              color: '#64748b',
            }}
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}

function getNodeColor(nodeId, evidenceMap, currentNode) {
  if (currentNode === nodeId) return CURRENT_COLOR;
  const status = evidenceMap[nodeId]?.status;
  return STATUS_COLORS[status] || STATUS_COLORS.not_assessed;
}
