import React, { useState, useRef, useEffect } from 'react';
import { AGENT_NAMES } from '../prompts/agents';

function renderMarkdown(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code style="background:#e2e8f0;padding:1px 4px;border-radius:3px;font-size:13px">$1</code>');
}

const TOOL_LABELS = {
  get_node: 'Inspect node',
  get_connections: 'Check connections',
  get_evidence_state: 'Review evidence',
  update_node_status: 'Update evidence',
  set_focus_node: 'Set focus',
  conclude_assessment: 'Conclude',
};

const TOOL_COLORS = {
  get_node: '#8b5cf6',
  get_connections: '#6366f1',
  get_evidence_state: '#3b82f6',
  update_node_status: '#22c55e',
  set_focus_node: '#f59e0b',
  conclude_assessment: '#ef4444',
};

export default function Conversation({
  conversation,
  agent,
  mode,
  started,
  isLoading,
  toolCallLog,
  turnLimitReached,
  onSendMessage,
  onNextTurn,
}) {
  const [input, setInput] = useState('');
  const [showReasoning, setShowReasoning] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

  function handleSubmit(e) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSendMessage(input.trim());
    setInput('');
  }

  const agentName = AGENT_NAMES[agent];
  const isSimulated = mode === 'simulated' || mode === 'custom' || mode === 'demo';

  return (
    <div style={styles.container}>
      <div style={styles.messages}>
        {!started && (
          <p style={styles.placeholder}>
            Select an agent and mode, then click Start to begin.
          </p>
        )}
        {conversation.map((msg, i) => (
          <div
            key={i}
            style={{
              ...styles.messageBubble,
              ...(msg.role === 'assistant' ? styles.agentBubble : styles.learnerBubble),
            }}
          >
            {msg.role === 'assistant' && (
              <div style={styles.agentLabel}>{agentName}</div>
            )}
            <div style={{ whiteSpace: 'pre-wrap' }} dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
          </div>
        ))}
        {isLoading && (
          <div style={{ ...styles.messageBubble, ...styles.agentBubble }}>
            <div style={styles.agentLabel}>{agentName}</div>
            <div className="typing-dots" style={styles.typing}>
              <span style={styles.dot} /><span style={styles.dot} /><span style={styles.dot} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {started && toolCallLog && toolCallLog.length > 0 && (
        <div style={styles.reasoningContainer}>
          <button
            style={styles.reasoningToggle}
            onClick={() => setShowReasoning(!showReasoning)}
          >
            Agent tool use ({toolCallLog.length} call{toolCallLog.length !== 1 ? 's' : ''}) {showReasoning ? '▼' : '▶'}
          </button>
          {showReasoning && (
            <div style={styles.reasoningContent}>
              {toolCallLog.map((tc, i) => (
                <div key={i} style={styles.toolCallEntry}>
                  <div style={styles.toolCallHeader}>
                    <span
                      style={{
                        ...styles.toolBadge,
                        background: TOOL_COLORS[tc.name] || '#64748b',
                      }}
                    >
                      {TOOL_LABELS[tc.name] || tc.name}
                    </span>
                    <span style={styles.toolInput}>
                      {formatToolInput(tc.name, tc.input)}
                    </span>
                  </div>
                  {tc.name === 'update_node_status' && (
                    <div style={styles.toolDetail}>
                      {tc.input.status === 'demonstrated' ? '✓' : tc.input.status === 'gap_detected' ? '✗' : '→'}{' '}
                      {tc.input.evidence}
                    </div>
                  )}
                  {tc.name === 'set_focus_node' && tc.input.reason && (
                    <div style={styles.toolDetail}>{tc.input.reason}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={styles.inputArea}>
        {started && turnLimitReached && (
          <p style={styles.limitMsg}>Turn limit reached. Click "New session" to start over.</p>
        )}
        {started && !turnLimitReached && isSimulated ? (
          <button
            style={styles.nextTurnBtn}
            onClick={onNextTurn}
            disabled={isLoading}
          >
            {isLoading ? 'Thinking...' : 'Next turn'}
          </button>
        ) : started && !turnLimitReached ? (
          <form onSubmit={handleSubmit} style={styles.form}>
            <input
              style={styles.textInput}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your response..."
              disabled={isLoading}
            />
            <button style={styles.sendBtn} type="submit" disabled={isLoading || !input.trim()}>
              Send
            </button>
          </form>
        ) : null}
      </div>
    </div>
  );
}

function formatToolInput(name, input) {
  switch (name) {
    case 'get_node':
    case 'get_connections':
      return input.node_id;
    case 'set_focus_node':
      return input.node_id;
    case 'update_node_status':
      return `${input.node_id} → ${input.status}`;
    case 'get_evidence_state':
      return '';
    case 'conclude_assessment':
      return 'ending session';
    default:
      return JSON.stringify(input);
  }
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  messages: {
    flex: 1,
    overflow: 'auto',
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  placeholder: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 40,
  },
  messageBubble: {
    maxWidth: '85%',
    padding: '10px 14px',
    borderRadius: 12,
    fontSize: 15,
    lineHeight: 1.5,
  },
  agentBubble: {
    alignSelf: 'flex-start',
    background: '#f1f5f9',
    color: '#1e293b',
  },
  learnerBubble: {
    alignSelf: 'flex-end',
    background: '#3b82f6',
    color: '#ffffff',
  },
  agentLabel: {
    fontSize: 12,
    fontWeight: 700,
    color: '#64748b',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
  },
  typing: {
    display: 'flex',
    gap: 4,
    padding: '4px 0',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: '#94a3b8',
    display: 'inline-block',
  },
  reasoningContainer: {
    borderTop: '1px solid #e2e8f0',
    padding: '0 16px',
  },
  reasoningToggle: {
    fontSize: 13,
    fontWeight: 600,
    color: '#64748b',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '10px 0',
    width: '100%',
    textAlign: 'left',
  },
  reasoningContent: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 1.5,
    paddingBottom: 10,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  toolCallEntry: {
    padding: '6px 0',
    borderBottom: '1px solid #f1f5f9',
  },
  toolCallHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  toolBadge: {
    fontSize: 11,
    fontWeight: 700,
    color: '#ffffff',
    padding: '2px 8px',
    borderRadius: 4,
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
    whiteSpace: 'nowrap',
  },
  toolInput: {
    fontSize: 13,
    color: '#64748b',
    fontFamily: 'monospace',
  },
  toolDetail: {
    fontSize: 12,
    color: '#475569',
    marginTop: 4,
    marginLeft: 4,
    lineHeight: 1.4,
  },
  limitMsg: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    margin: 0,
  },
  inputArea: {
    borderTop: '1px solid #e2e8f0',
    padding: 12,
    flexShrink: 0,
  },
  form: {
    display: 'flex',
    gap: 8,
  },
  textInput: {
    flex: 1,
    padding: '10px 14px',
    fontSize: 15,
    border: '1px solid #cbd5e1',
    borderRadius: 8,
    outline: 'none',
  },
  sendBtn: {
    padding: '10px 20px',
    fontSize: 14,
    fontWeight: 600,
    background: '#3b82f6',
    color: '#ffffff',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
  },
  nextTurnBtn: {
    width: '100%',
    padding: '12px 20px',
    fontSize: 15,
    fontWeight: 600,
    background: '#3b82f6',
    color: '#ffffff',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
  },
};
