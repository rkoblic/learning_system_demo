import React from 'react';
import { TRAIT_LABELS } from '../prompts/simulated-learner';

const PAIRS = {
  overconfident: 'hesitant',
  hesitant: 'overconfident',
  verbose: 'terse',
  terse: 'verbose',
  resistant: 'receptive',
  receptive: 'resistant',
};

const PAIR_SECTIONS = [
  {
    title: 'Confidence',
    hint: 'Pick one — or neither',
    traits: [
      { key: 'overconfident', label: 'Overconfident', desc: 'States answers with certainty, even when wrong' },
      { key: 'hesitant', label: 'Hesitant', desc: 'Hedges every answer; uncertain even when correct' },
    ],
  },
  {
    title: 'Response style',
    hint: 'Pick one — or neither',
    traits: [
      { key: 'verbose', label: 'Verbose', desc: 'Long, meandering responses with tangents' },
      { key: 'terse', label: 'Terse', desc: 'Answers in one short sentence' },
    ],
  },
  {
    title: 'Receptiveness',
    hint: 'Pick one — or neither',
    traits: [
      { key: 'resistant', label: 'Resistant', desc: 'Doubles down when challenged; adds detail within the same frame' },
      { key: 'receptive', label: 'Receptive', desc: 'Updates thinking quickly when given a new angle' },
    ],
  },
];

const STANDALONE_SECTIONS = [
  {
    title: 'Common tendencies',
    hint: 'Pick any that apply',
    traits: [
      { key: 'surfaceVocab', label: 'Surface vocabulary', desc: 'Uses the right terms but misapplies them' },
      { key: 'conflates', label: 'Conflates similar concepts', desc: 'Mixes up closely related ideas' },
      { key: 'concreteOnly', label: 'Concrete-only', desc: 'Sticks to specific examples; struggles to generalize' },
      { key: 'turnsQuestionsAround', label: 'Turns questions around', desc: 'Asks the tutor a clarifying question instead of answering' },
    ],
  },
  {
    title: 'Cognitive & cultural framings',
    hint: 'Patterns you may encounter in real classrooms',
    traits: [
      { key: 'patternFirst', label: 'Pattern-first', desc: 'Jumps ahead to the structural pattern; impatient with step-by-step buildup' },
      { key: 'needsStructure', label: 'Needs explicit structure', desc: 'Wants the framework before the content' },
      { key: 'collectivist', label: 'Collectivist framing', desc: 'Interprets situations through group / family / community lens' },
      { key: 'highContext', label: 'High-context communicator', desc: 'Implies rather than states; expects the tutor to infer' },
      { key: 'authorityDeferring', label: 'Authority-deferring', desc: 'Agrees with the tutor even when uncertain; reluctant to push back' },
    ],
  },
];

function buildPreview(traits) {
  const labels = Object.keys(TRAIT_LABELS)
    .filter((k) => traits[k])
    .map((k) => TRAIT_LABELS[k]);

  const other = (traits.otherTendency || '').trim();
  if (other) {
    const truncated = other.length > 80 ? `${other.slice(0, 77)}…` : other;
    labels.push(`"${truncated}"`);
  }

  if (labels.length === 0) {
    return 'No traits selected — your learner will respond as an average student with no strong tendencies.';
  }
  if (labels.length === 1) {
    return `Your learner will be ${labels[0]}.`;
  }
  const head = labels.slice(0, -1).join(', ');
  const tail = labels[labels.length - 1];
  return `Your learner will be ${head}, and ${tail}.`;
}

function countSelected(traits) {
  const toggleCount = Object.keys(TRAIT_LABELS).filter((k) => traits[k]).length;
  const otherCount = (traits.otherTendency || '').trim() ? 1 : 0;
  return toggleCount + otherCount;
}

function SectionCard({ section, traits, onToggle, disabled }) {
  return (
    <div style={styles.sectionCard}>
      <div style={styles.sectionHead}>
        <div style={styles.sectionTitle}>{section.title}</div>
        <div style={styles.sectionHint}>{section.hint}</div>
      </div>
      <div style={styles.traitList}>
        {section.traits.map((trait) => {
          const active = !!traits[trait.key];
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

export default function LearnerBuilder({ traits, onToggle, onSetOther, disabled }) {
  const selected = countSelected(traits);

  return (
    <div style={styles.wrap}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div>
            <div style={styles.title}>Design your simulated learner</div>
            <div style={styles.subtitle}>
              Toggle the behaviors you want this learner to exhibit. The agent will assess a student who actually behaves this way.
            </div>
          </div>
          <div style={styles.counter}>{selected} selected</div>
        </div>

        <div style={styles.body}>
          <div style={styles.pairRow}>
            {PAIR_SECTIONS.map((section) => (
              <SectionCard
                key={section.title}
                section={section}
                traits={traits}
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
                traits={traits}
                onToggle={onToggle}
                disabled={disabled}
              />
            ))}
          </div>

          <div style={styles.sectionCard}>
            <div style={styles.sectionHead}>
              <div style={styles.sectionTitle}>
                Other tendency <span style={styles.optional}>(optional)</span>
              </div>
              <div style={styles.sectionHint}>
                Anything not captured above — added directly to the learner's profile
              </div>
            </div>
            <textarea
              id="other-tendency"
              value={traits.otherTendency || ''}
              onChange={(e) => onSetOther(e.target.value)}
              disabled={disabled}
              placeholder="e.g., processes information visually before words, code-switches between languages when stuck, tests every claim against personal experience"
              style={{ ...styles.textarea, ...(disabled ? styles.disabled : {}) }}
              rows={2}
            />
          </div>
        </div>

        <div style={styles.preview}>
          <span style={styles.previewLabel}>Preview </span>
          <span style={styles.previewText}>{buildPreview(traits)}</span>
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
  body: {
    padding: 20,
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  pairRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
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
