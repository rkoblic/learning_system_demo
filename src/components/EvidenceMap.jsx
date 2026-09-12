import React, { useEffect, useRef, useState } from 'react';
import { normalizeRubric } from '../utils/rubric';

const STATUS_CONFIG = {
  assessed: { icon: '✓', color: '#22c55e', section: 'assessed' },
  collecting: { icon: '→', color: '#3b82f6', section: 'in_progress' },
  not_assessable: { icon: '—', color: '#8b5cf6', section: 'assessed' },
  not_assessed: { icon: '○', color: '#94a3b8', section: 'not_assessed' },
};

export default function EvidenceMap({ graph, evidenceMap }) {
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
    rubric: normalizeRubric(n),
    status: evidenceMap[n.id]?.status || 'not_assessed',
    performance_result: evidenceMap[n.id]?.performance_result || null,
    criterion_results: evidenceMap[n.id]?.criterion_results || [],
    summary: evidenceMap[n.id]?.summary || '',
    reason: evidenceMap[n.id]?.reason || '',
    trace_to: evidenceMap[n.id]?.trace_to || null,
  }));

  const assessed = nodes.filter(
    (n) => n.status === 'assessed' || n.status === 'not_assessable'
  );
  const inProgress = nodes.filter((n) => n.status === 'collecting');
  const notAssessed = nodes.filter((n) => n.status === 'not_assessed');

  // Find label for trace_to node
  const nodeLabels = {};
  graph.nodes.forEach((n) => { nodeLabels[n.id] = n.label; });

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
  const config = node.status === 'assessed' && node.performance_result === 'does_not_meet'
    ? { icon: '✗', color: '#ef4444' }
    : STATUS_CONFIG[node.status];
  const resultsById = new Map(
    node.criterion_results.map((result) => [result.criterion_id, result])
  );
  const overall = node.status === 'not_assessable'
    ? 'NOT ASSESSABLE'
    : node.performance_result === 'meets'
      ? 'MEETS'
      : node.performance_result === 'does_not_meet'
        ? 'DOES NOT MEET'
        : node.status === 'collecting'
          ? 'GATHERING EVIDENCE'
          : '';
  const overallColor = node.performance_result === 'does_not_meet'
    ? '#dc2626'
    : node.status === 'not_assessable'
      ? '#7c3aed'
      : node.performance_result === 'meets'
        ? '#15803d'
        : '#64748b';

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
        {overall && <span style={{ ...styles.overallBadge, color: overallColor }}>{overall}</span>}
      </div>
      {node.summary && <p style={styles.evidence}>{node.summary}</p>}
      {node.reason && <p style={styles.notAssessableReason}>{node.reason}</p>}
      {node.rubric && node.status !== 'not_assessed' && (
        <div style={styles.criteriaList}>
          {node.rubric.criteria.map((criterion) => {
            const result = resultsById.get(criterion.id);
            const icon = result?.result === 'meets' ? '✓' : result?.result === 'does_not_meet' ? '✗' : '○';
            const color = result?.result === 'meets' ? '#16a34a' : result?.result === 'does_not_meet' ? '#dc2626' : '#94a3b8';
            return (
              <div key={criterion.id} style={styles.criterionEntry}>
                <div style={styles.criterionHeader}>
                  <span style={{ color, fontWeight: 800 }}>{icon}</span>
                  <span style={styles.criterionLabel}>{criterion.label}</span>
                  <span style={{ ...styles.criterionResult, color }}>
                    {result?.result === 'meets' ? 'MEETS' : result?.result === 'does_not_meet' ? 'DOES NOT MEET' : 'NOT JUDGED'}
                  </span>
                </div>
                {result?.evidence && <p style={styles.criterionEvidence}>{result.evidence}</p>}
              </div>
            );
          })}
        </div>
      )}
      {node.performance_result === 'does_not_meet' && node.trace_to && (
        <p style={styles.traceTo}>
          Traces to: <strong>{nodeLabels[node.trace_to] || node.trace_to}</strong>
        </p>
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
    flex: 1,
  },
  overallBadge: {
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: '0.04em',
    whiteSpace: 'nowrap',
  },
  evidence: {
    fontSize: 13,
    color: '#475569',
    marginTop: 4,
    marginLeft: 28,
    lineHeight: 1.5,
  },
  notAssessableReason: {
    fontSize: 12,
    color: '#6d28d9',
    margin: '6px 0 0 28px',
    lineHeight: 1.45,
  },
  criteriaList: {
    margin: '8px 0 0 28px',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  criterionEntry: {
    padding: '7px 8px',
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: 6,
  },
  criterionHeader: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 6,
  },
  criterionLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: 700,
    color: '#334155',
  },
  criterionResult: {
    fontSize: 9,
    fontWeight: 800,
    letterSpacing: '0.03em',
    whiteSpace: 'nowrap',
  },
  criterionEvidence: {
    margin: '4px 0 0 18px',
    color: '#64748b',
    fontSize: 11,
    lineHeight: 1.45,
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
