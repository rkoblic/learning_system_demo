import React, { useState, useEffect, useRef } from 'react';

const STATUS_CONFIG = {
  demonstrated: { icon: '✓', color: '#22c55e', section: 'assessed' },
  gap_detected: { icon: '✗', color: '#ef4444', section: 'assessed' },
  in_progress: { icon: '→', color: '#3b82f6', section: 'in_progress' },
  not_assessed: { icon: '○', color: '#94a3b8', section: 'not_assessed' },
};

export default function EvidenceMap({ graph, evidenceMap }) {
  const [showContrast, setShowContrast] = useState(false);
  const [flashNodes, setFlashNodes] = useState(new Set());
  const prevMapRef = useRef({});

  // Detect status changes and trigger flash
  useEffect(() => {
    const changed = new Set();
    for (const [nodeId, info] of Object.entries(evidenceMap)) {
      const prev = prevMapRef.current[nodeId];
      if (!prev || prev.status !== info.status) {
        changed.add(nodeId);
      }
    }
    if (changed.size > 0) {
      setFlashNodes(changed);
      const timer = setTimeout(() => setFlashNodes(new Set()), 800);
      return () => clearTimeout(timer);
    }
    prevMapRef.current = { ...evidenceMap };
  }, [evidenceMap]);

  if (!graph) return null;

  const nodes = graph.nodes.map((n) => ({
    ...n,
    win_condition: n.win_condition || null,
    status: evidenceMap[n.id]?.status || 'not_assessed',
    evidence: evidenceMap[n.id]?.evidence || null,
    trace_to: evidenceMap[n.id]?.trace_to || null,
  }));

  const assessed = nodes.filter(
    (n) => n.status === 'demonstrated' || n.status === 'gap_detected'
  );
  const inProgress = nodes.filter((n) => n.status === 'in_progress');
  const notAssessed = nodes.filter((n) => n.status === 'not_assessed');

  // Find label for trace_to node
  const nodeLabels = {};
  graph.nodes.forEach((n) => { nodeLabels[n.id] = n.label; });

  // Compute a traditional-style score from the evidence map
  // Demonstrated = full credit, in_progress = half credit (benefit of the doubt),
  // gap_detected = 0, not_assessed = excluded (traditional tests only score what's asked)
  const scorableNodes = nodes.filter((n) => n.status !== 'not_assessed');
  let score;
  if (scorableNodes.length === 0) {
    score = 0;
  } else {
    const points = scorableNodes.reduce((sum, n) => {
      if (n.status === 'demonstrated') return sum + 1;
      if (n.status === 'in_progress') return sum + 0.5;
      return sum;
    }, 0);
    score = Math.round((points / scorableNodes.length) * 100);
  }

  if (showContrast) {
    return (
      <div style={styles.container}>
        <div style={styles.contrastView}>
          <div style={styles.contrastLeft}>
            <div style={styles.scoreValue}>{score}%</div>
            <div style={styles.scoreLabel}>What a score tells you</div>
          </div>
          <div style={styles.contrastDivider} />
          <div style={styles.contrastRight}>
            <div style={styles.contrastRightLabel}>What an evidence map tells you</div>
            <div style={styles.contrastList}>
              {assessed.map((n) => (
                <CompactNode key={n.id} node={n} nodeLabels={nodeLabels} />
              ))}
              {inProgress.map((n) => (
                <CompactNode key={n.id} node={n} nodeLabels={nodeLabels} />
              ))}
              {notAssessed.map((n) => (
                <CompactNode key={n.id} node={n} nodeLabels={nodeLabels} />
              ))}
            </div>
          </div>
        </div>
        <button style={styles.contrastBtn} onClick={() => setShowContrast(false)}>
          Back to evidence map
        </button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.list}>
        {assessed.length > 0 && (
          <Section title="Assessed">
            {assessed.map((n) => (
              <NodeEntry key={n.id} node={n} nodeLabels={nodeLabels} flash={flashNodes.has(n.id)} />
            ))}
          </Section>
        )}
        {inProgress.length > 0 && (
          <Section title="In progress">
            {inProgress.map((n) => (
              <NodeEntry key={n.id} node={n} nodeLabels={nodeLabels} flash={flashNodes.has(n.id)} />
            ))}
          </Section>
        )}
        {notAssessed.length > 0 && (
          <Section title="Not yet assessed">
            {notAssessed.map((n) => (
              <NodeEntry key={n.id} node={n} nodeLabels={nodeLabels} flash={flashNodes.has(n.id)} />
            ))}
          </Section>
        )}
      </div>
      <button style={styles.contrastBtn} onClick={() => setShowContrast(true)}>
        Compare to traditional score
      </button>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={styles.section}>
      <div style={styles.sectionTitle}>{title}</div>
      {children}
    </div>
  );
}

function NodeEntry({ node, nodeLabels, flash }) {
  const config = STATUS_CONFIG[node.status];
  return (
    <div
      style={{
        ...styles.nodeEntry,
        background: flash ? '#eff6ff' : 'transparent',
        transition: 'background 0.3s',
      }}
    >
      <div style={styles.nodeHeader}>
        <span style={{ ...styles.statusIcon, color: config.color }}>{config.icon}</span>
        <span style={styles.nodeLabel}>{node.label}</span>
      </div>
      {node.evidence && <p style={styles.evidence}>{node.evidence}</p>}
      {node.win_condition && node.status !== 'not_assessed' && (
        <p style={styles.winCondition}>
          <span style={styles.winConditionLabel}>Win condition:</span> {node.win_condition}
        </p>
      )}
      {node.status === 'gap_detected' && node.trace_to && (
        <p style={styles.traceTo}>
          Traces to: <strong>{nodeLabels[node.trace_to] || node.trace_to}</strong>
        </p>
      )}
    </div>
  );
}

function CompactNode({ node, nodeLabels }) {
  const config = STATUS_CONFIG[node.status];
  return (
    <div style={styles.compactNode}>
      <span style={{ ...styles.statusIcon, color: config.color, fontSize: 13 }}>{config.icon}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{node.label}</span>
      {node.evidence && (
        <span style={{ fontSize: 12, color: '#64748b', marginLeft: 4 }}>— {node.evidence}</span>
      )}
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  list: {
    flex: 1,
    overflow: 'auto',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: '#94a3b8',
    marginBottom: 8,
  },
  nodeEntry: {
    padding: '8px 0',
    borderBottom: '1px solid #f1f5f9',
  },
  nodeHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  statusIcon: {
    fontSize: 16,
    fontWeight: 700,
    width: 20,
    textAlign: 'center',
    flexShrink: 0,
  },
  nodeLabel: {
    fontSize: 14,
    fontWeight: 600,
    color: '#1e293b',
  },
  evidence: {
    fontSize: 13,
    color: '#475569',
    marginTop: 4,
    marginLeft: 28,
    lineHeight: 1.5,
  },
  traceTo: {
    fontSize: 13,
    color: '#ef4444',
    marginTop: 2,
    marginLeft: 28,
  },
  winCondition: {
    fontSize: 12,
    color: '#475569',
    marginTop: 4,
    marginLeft: 28,
    paddingLeft: 8,
    borderLeft: '2px solid #cbd5e1',
    lineHeight: 1.45,
    fontStyle: 'italic',
  },
  winConditionLabel: {
    fontWeight: 700,
    color: '#64748b',
    fontStyle: 'normal',
    textTransform: 'uppercase',
    fontSize: 11,
    letterSpacing: '0.04em',
  },
  contrastBtn: {
    padding: '12px 16px',
    fontSize: 14,
    fontWeight: 600,
    background: '#f1f5f9',
    color: '#475569',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    cursor: 'pointer',
    flexShrink: 0,
    marginTop: 8,
  },
  contrastView: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
  },
  contrastLeft: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  scoreValue: {
    fontSize: 72,
    fontWeight: 200,
    color: '#cbd5e1',
    lineHeight: 1,
  },
  scoreLabel: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 12,
    textAlign: 'center',
  },
  contrastDivider: {
    width: 1,
    background: '#e2e8f0',
    margin: '20px 0',
  },
  contrastRight: {
    flex: 1,
    padding: '12px 16px',
    overflow: 'auto',
  },
  contrastRightLabel: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: 600,
    marginBottom: 12,
    textAlign: 'center',
  },
  contrastList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  compactNode: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 6,
    lineHeight: 1.4,
  },
};
