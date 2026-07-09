import React, { useRef } from 'react';
import { AGENT_MOVE_LABELS } from '../prompts/agents';

const PAIRS = {
  warmTone: 'neutralTone',
  neutralTone: 'warmTone',
  assessOnly: 'teachWhileAssessing',
  teachWhileAssessing: 'assessOnly',
};

const PAIR_SECTIONS = [
  {
    title: 'Tone',
    hint: 'Pick one — or neither',
    traits: [
      { key: 'warmTone', label: 'Warm & encouraging', desc: 'Patient, supportive, relational' },
      { key: 'neutralTone', label: 'Neutral & clinical', desc: 'Precise, professional, matter-of-fact' },
    ],
  },
  {
    title: 'Stance',
    hint: 'Pick one — or neither',
    traits: [
      { key: 'assessOnly', label: 'Assess only', desc: 'Map understanding without teaching or correcting' },
      { key: 'teachWhileAssessing', label: 'Teach while assessing', desc: 'Help the learner move forward as you gather evidence' },
    ],
  },
];

const STANDALONE_SECTIONS = [
  {
    title: 'Core pedagogical moves',
    hint: 'Pick any that apply',
    traits: [
      { key: 'questionFirst', label: 'Question before answer', desc: 'When a learner is stuck, nudge with a question before offering an answer' },
      { key: 'productiveStruggle', label: 'Allow productive struggle', desc: "Don't rescue at the first sign of friction" },
      { key: 'noFalseConfirm', label: "Don't confirm wrong reasoning", desc: 'Never confirm a right answer reached the wrong way — probe the reasoning' },
      { key: 'praiseProcess', label: 'Praise the reasoning', desc: 'Acknowledge effort and good moves, not just correct answers' },
    ],
  },
  {
    title: 'When a gap appears',
    hint: 'How the agent should respond to a detected gap',
    traits: [
      { key: 'traceToPrereqs', label: 'Trace to prerequisites', desc: 'Follow prerequisite edges to find the concept that is actually missing' },
      { key: 'explainDirectly', label: 'Explain directly', desc: 'Explain the concept concisely with a concrete example, then check it landed' },
      { key: 'surfaceMisconceptions', label: 'Surface misconceptions', desc: 'Design questions that force likely misconceptions into the open' },
    ],
  },
];

function buildPreview(moves) {
  const labels = Object.keys(AGENT_MOVE_LABELS)
    .filter((k) => moves[k])
    .map((k) => AGENT_MOVE_LABELS[k]);

  const other = (moves.otherPrinciple || '').trim();
  if (other) {
    const truncated = other.length > 80 ? `${other.slice(0, 77)}…` : other;
    labels.push(`"${truncated}"`);
  }

  if (labels.length === 0) {
    return 'No principles selected — your agent will assess with clear, well-targeted questions and no strong pedagogical stance.';
  }
  if (labels.length === 1) {
    return `Your agent will ${labels[0]}.`;
  }
  const head = labels.slice(0, -1).join(', ');
  const tail = labels[labels.length - 1];
  return `Your agent will ${head}, and ${tail}.`;
}

function countSelected(moves) {
  const toggleCount = Object.keys(AGENT_MOVE_LABELS).filter((k) => moves[k]).length;
  const otherCount = (moves.otherPrinciple || '').trim() ? 1 : 0;
  return toggleCount + otherCount;
}

function SectionCard({ section, moves, onToggle, disabled }) {
  return (
    <div style={styles.sectionCard}>
      <div style={styles.sectionHead}>
        <div style={styles.sectionTitle}>{section.title}</div>
        <div style={styles.sectionHint}>{section.hint}</div>
      </div>
      <div style={styles.traitList}>
        {section.traits.map((trait) => {
          const active = !!moves[trait.key];
          return (
            <label
              key={trait.key}
              style={{
                ...styles.traitRow,
                ...(active ? styles.traitRowActive : {}),
                ...(disabled ? styles.disabled : {}),
              }}
            >
              <input
                type="checkbox"
                checked={active}
                disabled={disabled}
                onChange={() => onToggle(trait.key, PAIRS[trait.key])}
                style={styles.checkbox}
              />
              <span style={styles.traitText}>
                <span style={styles.traitLabel}>{trait.label}</span>
                <span style={styles.traitDesc}>{trait.desc}</span>
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

function promptStats(text) {
  const trimmed = (text || '').trim();
  if (!trimmed) return 'empty';
  const words = trimmed.split(/\s+/).length;
  const lines = trimmed.split('\n').length;
  return `${lines} line${lines === 1 ? '' : 's'}, ${words} word${words === 1 ? '' : 's'}`;
}

export default function AgentBuilder({ moves, onToggle, onSetOther, onSetInputMode, onSetFullPrompt, disabled }) {
  const selected = countSelected(moves);
  const useFullPrompt = !!moves.useFullPrompt;
  const fileInputRef = useRef(null);

  function handleTutorFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => onSetFullPrompt(e.target.result);
    reader.readAsText(file);
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div>
            <div style={styles.title}>Prompt your teaching agent</div>
            <div style={styles.subtitle}>
              Define the "rules of the game" this agent should follow. They become the agent's system prompt, on top of the shared tool and graph instructions.
            </div>
          </div>
          {!useFullPrompt && <div style={styles.counter}>{selected} selected</div>}
        </div>

        <div style={styles.tabBar}>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onSetInputMode(false)}
            style={{ ...styles.tab, ...(!useFullPrompt ? styles.tabActive : {}), ...(disabled ? styles.disabled : {}) }}
          >
            Guided principles
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onSetInputMode(true)}
            style={{ ...styles.tab, ...(useFullPrompt ? styles.tabActive : {}), ...(disabled ? styles.disabled : {}) }}
          >
            Write your own
          </button>
        </div>

        {useFullPrompt ? (
          <div style={styles.body}>
            <div style={styles.sectionCard}>
              <div style={styles.sectionHead}>
                <div style={styles.fileRow}>
                  <span style={styles.fileChip}>tutor.md</span>
                  <span style={styles.sectionHint}>{promptStats(moves.fullPrompt)}</span>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => fileInputRef.current?.click()}
                    style={{ ...styles.uploadBtn, ...(disabled ? styles.disabled : {}) }}
                  >
                    Upload tutor.md
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".md,.markdown,.txt,text/markdown,text/plain"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) handleTutorFile(file);
                      e.target.value = '';
                    }}
                  />
                </div>
                <div style={{ ...styles.sectionHint, marginTop: 4 }}>
                  Upload, write, or paste a complete tutor prompt. It's used verbatim as the agent's role — the shared tool and graph instructions are still appended so it can drive the demo.
                </div>
              </div>
              <textarea
                id="tutor-md"
                value={moves.fullPrompt || ''}
                onChange={(e) => onSetFullPrompt(e.target.value)}
                disabled={disabled}
                placeholder="You are a tutor who..."
                style={{ ...styles.textarea, ...styles.mono, minHeight: 220, ...(disabled ? styles.disabled : {}) }}
                rows={12}
              />
            </div>
          </div>
        ) : (
          <div style={styles.body}>
            <div style={styles.pairRow}>
              {PAIR_SECTIONS.map((section) => (
                <SectionCard
                  key={section.title}
                  section={section}
                  moves={moves}
                  onToggle={onToggle}
                  disabled={disabled}
                />
              ))}
            </div>

            <div style={styles.standaloneRow}>
              {STANDALONE_SECTIONS.map((section) => (
                <SectionCard
                  key={section.title}
                  section={section}
                  moves={moves}
                  onToggle={onToggle}
                  disabled={disabled}
                />
              ))}
            </div>

            <div style={styles.sectionCard}>
              <div style={styles.sectionHead}>
                <div style={styles.sectionTitle}>
                  Other principle <span style={styles.optional}>(optional)</span>
                </div>
                <div style={styles.sectionHint}>
                  Any teaching move not captured above — added directly to the agent's prompt
                </div>
              </div>
              <textarea
                id="other-principle"
                value={moves.otherPrinciple || ''}
                onChange={(e) => onSetOther(e.target.value)}
                disabled={disabled}
                placeholder="e.g., use a real-world analogy before any abstract definition, always end a turn with one concrete next step, connect every concept back to the learner's stated goal"
                style={{ ...styles.textarea, ...(disabled ? styles.disabled : {}) }}
                rows={2}
              />
            </div>
          </div>
        )}

        <div style={styles.preview}>
          <span style={styles.previewLabel}>Preview </span>
          <span style={styles.previewText}>
            {useFullPrompt
              ? ((moves.fullPrompt || '').trim()
                ? `Your agent will follow your custom tutor.md prompt (${promptStats(moves.fullPrompt)}).`
                : 'Your tutor.md prompt is empty — the agent will fall back to plain assessment.')
              : buildPreview(moves)}
          </span>
        </div>
      </div>
    </div>
  );
}

const styles = {
  wrap: {
    background: '#f8fafc',
    borderBottom: '1px solid #e2e8f0',
    padding: '20px',
    display: 'flex',
    justifyContent: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 1100,
    background: '#ffffff',
    borderRadius: 12,
    border: '1px solid #e2e8f0',
    boxShadow: '0 4px 12px rgba(15, 23, 42, 0.04)',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
    padding: '20px 24px 16px',
    borderBottom: '1px solid #e2e8f0',
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
    color: '#0f172a',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 1.5,
    maxWidth: 720,
  },
  counter: {
    fontSize: 12,
    fontWeight: 600,
    color: '#3b82f6',
    background: '#eff6ff',
    padding: '4px 12px',
    borderRadius: 999,
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  tabBar: {
    display: 'flex',
    gap: 4,
    padding: '12px 20px 0',
  },
  tab: {
    fontSize: 13,
    fontWeight: 600,
    fontFamily: 'inherit',
    padding: '8px 16px',
    borderRadius: '8px 8px 0 0',
    border: '1px solid transparent',
    borderBottom: 'none',
    background: 'transparent',
    color: '#64748b',
    cursor: 'pointer',
  },
  tabActive: {
    background: '#ffffff',
    color: '#0f172a',
    border: '1px solid #e2e8f0',
    borderBottom: '1px solid #ffffff',
    marginBottom: -1,
  },
  body: {
    padding: 20,
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    borderTop: '1px solid #e2e8f0',
  },
  fileRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  fileChip: {
    fontSize: 12,
    fontWeight: 700,
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    color: '#334155',
    background: '#e2e8f0',
    padding: '2px 8px',
    borderRadius: 4,
  },
  uploadBtn: {
    marginLeft: 'auto',
    fontSize: 12,
    fontWeight: 600,
    fontFamily: 'inherit',
    padding: '4px 12px',
    borderRadius: 6,
    border: '1px solid #cbd5e1',
    background: '#ffffff',
    color: '#334155',
    cursor: 'pointer',
  },
  mono: {
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
    fontSize: 12.5,
  },
  pairRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: 12,
  },
  standaloneRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: 12,
  },
  sectionCard: {
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    background: '#ffffff',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  sectionHead: {
    padding: '10px 14px',
    background: '#f8fafc',
    borderBottom: '1px solid #e2e8f0',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: '#334155',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: 2,
  },
  sectionHint: {
    fontSize: 11,
    color: '#94a3b8',
    lineHeight: 1.3,
  },
  traitList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    padding: 8,
  },
  traitRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
    padding: '8px 10px',
    borderRadius: 6,
    cursor: 'pointer',
    border: '1px solid transparent',
    transition: 'background 0.1s, border-color 0.1s',
  },
  traitRowActive: {
    background: '#eff6ff',
    border: '1px solid #bfdbfe',
  },
  checkbox: {
    marginTop: 3,
    flexShrink: 0,
    cursor: 'pointer',
    accentColor: '#3b82f6',
  },
  traitText: {
    display: 'flex',
    flexDirection: 'column',
    gap: 1,
    minWidth: 0,
  },
  traitLabel: {
    fontSize: 13,
    fontWeight: 600,
    color: '#1e293b',
  },
  traitDesc: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 1.4,
  },
  optional: {
    fontWeight: 500,
    color: '#94a3b8',
    textTransform: 'none',
    letterSpacing: 0,
  },
  textarea: {
    width: '100%',
    fontSize: 13,
    fontFamily: 'inherit',
    padding: '10px 12px',
    border: 'none',
    borderTop: '1px solid transparent',
    resize: 'vertical',
    minHeight: 56,
    color: '#1e293b',
    boxSizing: 'border-box',
    outline: 'none',
    background: '#ffffff',
    lineHeight: 1.5,
  },
  preview: {
    padding: '14px 24px',
    borderTop: '1px solid #e2e8f0',
    background: '#f8fafc',
    borderRadius: '0 0 12px 12px',
    fontSize: 13,
    lineHeight: 1.5,
  },
  previewLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginRight: 4,
  },
  previewText: {
    color: '#1e293b',
  },
  disabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
};
