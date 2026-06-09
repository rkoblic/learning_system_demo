import React, { useState } from 'react';

const TABS = [
  { key: 'prompt', label: 'Agent Prompt' },
  { key: 'learner', label: 'Simulated Learner' },
  { key: 'tools', label: 'Tools' },
  { key: 'graph', label: 'Graph JSON' },
];

export default function UnderTheHood({ systemPrompt, learnerPrompt, learnerMode, toolDefinitions, graph, onClose }) {
  const [activeTab, setActiveTab] = useState('prompt');
  const [copied, setCopied] = useState(false);
  const [expandedTools, setExpandedTools] = useState(new Set());

  function getContent() {
    switch (activeTab) {
      case 'prompt':
        return systemPrompt;
      case 'learner':
        return learnerPrompt;
      case 'tools':
        return JSON.stringify(toolDefinitions, null, 2);
      case 'graph':
        return JSON.stringify(graph, null, 2);
      default:
        return '';
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(getContent());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function toggleTool(index) {
    const next = new Set(expandedTools);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    setExpandedTools(next);
  }

  return (
    <div style={styles.backdrop} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>Under the Hood</h2>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={styles.tabs}>
          {TABS.map((tab) => (
            <button
              key={tab.key}
              style={{
                ...styles.tab,
                ...(activeTab === tab.key ? styles.activeTab : {}),
              }}
              onClick={() => { setActiveTab(tab.key); setCopied(false); }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={styles.content}>
          {activeTab === 'tools' ? (
            <div style={styles.toolsList}>
              {toolDefinitions.map((tool, i) => (
                <div key={tool.name} style={styles.toolEntry}>
                  <button
                    style={styles.toolHeader}
                    onClick={() => toggleTool(i)}
                  >
                    <span style={styles.toolName}>{tool.name}</span>
                    <span style={styles.toolDesc}>{tool.description}</span>
                    <span style={styles.expandIcon}>
                      {expandedTools.has(i) ? '▼' : '▶'}
                    </span>
                  </button>
                  {expandedTools.has(i) && (
                    <pre style={styles.toolSchema}>
                      {JSON.stringify(tool.input_schema, null, 2)}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <>
              {activeTab === 'learner' && (
                <div style={styles.contextNote}>
                  {learnerMode === 'custom'
                    ? 'Built from the toggles you selected in the Custom simulated learner panel.'
                    : "Default profile — 'The Communication Fixer'. Switch the Mode dropdown to Custom simulated learner to design your own."}
                </div>
              )}
              <pre style={styles.codeBlock}>{getContent()}</pre>
            </>
          )}
        </div>

        <div style={styles.footer}>
          <button style={styles.copyBtn} onClick={handleCopy}>
            {copied ? 'Copied!' : 'Copy to clipboard'}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    background: '#ffffff',
    borderRadius: 12,
    width: '85%',
    maxWidth: 800,
    maxHeight: '85vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.2)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 24px 0',
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    color: '#0f172a',
  },
  closeBtn: {
    fontSize: 18,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#64748b',
    padding: '4px 8px',
    borderRadius: 4,
  },
  tabs: {
    display: 'flex',
    gap: 0,
    padding: '16px 24px 0',
    borderBottom: '1px solid #e2e8f0',
  },
  tab: {
    padding: '10px 20px',
    fontSize: 14,
    fontWeight: 600,
    color: '#64748b',
    background: 'none',
    border: 'none',
    borderBottom: '2px solid transparent',
    cursor: 'pointer',
    marginBottom: -1,
  },
  activeTab: {
    color: '#3b82f6',
    borderBottomColor: '#3b82f6',
  },
  content: {
    flex: 1,
    overflow: 'auto',
    padding: 24,
  },
  contextNote: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  codeBlock: {
    fontSize: 13,
    lineHeight: 1.6,
    fontFamily: "'SF Mono', 'Fira Code', 'Consolas', monospace",
    color: '#1e293b',
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    padding: 16,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    margin: 0,
  },
  toolsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  toolEntry: {
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    overflow: 'hidden',
  },
  toolHeader: {
    width: '100%',
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
    padding: '12px 14px',
    background: '#f8fafc',
    border: 'none',
    cursor: 'pointer',
    textAlign: 'left',
  },
  toolName: {
    fontSize: 13,
    fontWeight: 700,
    fontFamily: "'SF Mono', 'Fira Code', 'Consolas', monospace",
    color: '#3b82f6',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  toolDesc: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 1.4,
    flex: 1,
  },
  expandIcon: {
    fontSize: 11,
    color: '#94a3b8',
    flexShrink: 0,
    marginTop: 2,
  },
  toolSchema: {
    fontSize: 12,
    lineHeight: 1.5,
    fontFamily: "'SF Mono', 'Fira Code', 'Consolas', monospace",
    color: '#475569',
    background: '#ffffff',
    padding: '12px 14px',
    margin: 0,
    borderTop: '1px solid #e2e8f0',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  footer: {
    padding: '12px 24px 20px',
    display: 'flex',
    justifyContent: 'flex-end',
  },
  copyBtn: {
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: 600,
    background: '#f1f5f9',
    color: '#475569',
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    cursor: 'pointer',
  },
};
