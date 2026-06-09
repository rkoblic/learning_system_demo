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

const SECTIONS = [
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

export default function LearnerBuilder({ traits, onToggle, onSetOther, disabled }) {
  const selected = countSelected(traits);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <div style={styles.title}>Design your simulated learner</div>
          <div style={styles.subtitle}>
            Toggle the behaviors you want this learner to exhibit. The agent will assess a student who actually behaves this way.
          </div>
        </div>
        <div style={styles.counter}>{selected} selected</div>
      </div>

      <div style={styles.sections}>
        {SECTIONS.map((section) => (
          <div key={section.title} style={styles.section}>
            <div style={styles.sectionHead}>
              <span style={styles.sectionTitle}>{section.title}</span>
              <span style={styles.sectionHint}>{section.hint}</span>
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
        ))}
      </div>

      <div style={styles.otherSection}>
        <label style={styles.otherLabel} htmlFor="other-tendency">
          Other tendency <span style={styles.optional}>(optional)</span>
        </label>
        <div style={styles.otherHint}>
          Describe any way of thinking, communicating, or learning you want this learner to have. This text is added directly to the learner's profile.
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

      <div style={styles.preview}>
        <span style={styles.previewLabel}>Preview: </span>
        <span style={styles.previewText}>{buildPreview(traits)}</span>
      </div>
    </div>
  );
}

const styles = {
  container: {
    background: '#ffffff',
    borderBottom: '1px solid #e2e8f0',
    padding: '16px 20px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
    marginBottom: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: 700,
    color: '#0f172a',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 1.4,
  },
  counter: {
    fontSize: 12,
    fontWeight: 600,
    color: '#3b82f6',
    background: '#eff6ff',
    padding: '4px 10px',
    borderRadius: 12,
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  sections: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: 16,
  },
  section: {
    minWidth: 0,
  },
  sectionHead: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: '#334155',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  sectionHint: {
    fontSize: 11,
    color: '#94a3b8',
  },
  traitList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  traitRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 8,
    padding: '6px 8px',
    borderRadius: 6,
    cursor: 'pointer',
    border: '1px solid transparent',
  },
  traitRowActive: {
    background: '#eff6ff',
    border: '1px solid #bfdbfe',
  },
  checkbox: {
    marginTop: 3,
    flexShrink: 0,
    cursor: 'pointer',
  },
  traitText: {
    display: 'flex',
    flexDirection: 'column',
    gap: 1,
  },
  traitLabel: {
    fontSize: 13,
    fontWeight: 600,
    color: '#1e293b',
  },
  traitDesc: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 1.35,
  },
  otherSection: {
    marginTop: 14,
    paddingTop: 14,
    borderTop: '1px solid #f1f5f9',
  },
  otherLabel: {
    display: 'block',
    fontSize: 12,
    fontWeight: 700,
    color: '#334155',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    marginBottom: 2,
  },
  optional: {
    fontWeight: 500,
    color: '#94a3b8',
    textTransform: 'none',
    letterSpacing: 0,
  },
  otherHint: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 6,
    lineHeight: 1.4,
  },
  textarea: {
    width: '100%',
    fontSize: 13,
    fontFamily: 'inherit',
    padding: '8px 10px',
    borderRadius: 6,
    border: '1px solid #cbd5e1',
    resize: 'vertical',
    minHeight: 44,
    color: '#1e293b',
    boxSizing: 'border-box',
  },
  preview: {
    marginTop: 12,
    padding: '10px 12px',
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    fontSize: 13,
    lineHeight: 1.5,
  },
  previewLabel: {
    fontWeight: 700,
    color: '#475569',
  },
  previewText: {
    color: '#1e293b',
  },
  disabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
};
