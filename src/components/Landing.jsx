import React, { useRef, useState } from 'react';
import { validateGraph } from '../utils/validateGraph';

const PROMPT_TEMPLATE = `I want to build a knowledge graph for an AI assessment tool. Take the following learning objective (or syllabus excerpt) and produce a JSON knowledge graph.

For each concept, identify:
- A unique ID (lowercase, hyphenated)
- A short label
- A type (learning_objective, concept, or skill)
- A description
- Common student misconceptions (if applicable)
- A win condition: one explicit sentence describing what success looks like for this concept, written so an AI could judge it (don't leave a vague word like "strong" or "clear" undefined)

For relationships between concepts, identify:
- Source and target node IDs
- Relationship type (prerequisite, builds-on, breaks-into, or enables)
- A brief description of why this relationship exists

Output ONLY valid JSON in this exact format:
{
  "metadata": { "title": "...", "domain": "..." },
  "nodes": [ { "id": "...", "label": "...", "type": "...", "description": "...", "win_condition": "...", "misconceptions": ["..."] } ],
  "edges": [ { "source": "...", "target": "...", "relationship": "...", "description": "..." } ]
}

Here is my learning objective / syllabus excerpt:
[PASTE YOUR CONTENT HERE]`;

const RUBRIC_PROMPT_TEMPLATE = `Here is my knowledge graph JSON. Add a "win_condition" to each node that doesn't have one.

A win condition is the machine-readable version of a rubric criterion: one explicit sentence describing what success looks like for that concept, written for an AI to judge against. Human rubrics lean on tacit words ("poses a STRONG research question") that a human grader fills in with judgment. Make that judgment explicit instead — spell out exactly what "strong" means here, name the observable things a successful learner does, and leave nothing vague.

Return the SAME JSON with a "win_condition" string added to every node. Change nothing else.

Here is my graph:
[PASTE YOUR GRAPH JSON HERE]`;

const AGENT_PROMPT_TEMPLATE = `Help me draft the pedagogical principles for a teaching agent — the "rules of the game" it should follow when it assesses and teaches a learner.

Give me a short, concrete list of teaching moves and a tone, for example:
- When a learner is stuck, ask a guiding question before giving the answer
- Leave room for productive struggle; don't rescue too early
- Never confirm a right answer reached through wrong reasoning
- When a gap appears, trace it back to the missing prerequisite (or explain it directly)
- Tone: warm and encouraging / neutral and clinical

Base them on how I actually like to teach:
[DESCRIBE YOUR TEACHING STYLE, OR A COURSE / CONTEXT]

I'll reflect these in the prototype's agent builder (toggles + "other principle"), or paste a full version into its tutor.md editor.`;

export default function Landing({ onSelectDemo, onUploadGraph }) {
  const [showUpload, setShowUpload] = useState(false);
  const [errors, setErrors] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);
  const fileInputRef = useRef(null);

  function handleFile(file) {
    setErrors([]);
    if (!file.name.endsWith('.json')) {
      setErrors(['Please upload a .json file.']);
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      let data;
      try {
        data = JSON.parse(e.target.result);
      } catch {
        setErrors(['File is not valid JSON. Please check the syntax and try again.']);
        return;
      }
      const validationErrors = validateGraph(data);
      if (validationErrors.length > 0) {
        setErrors(validationErrors);
        return;
      }
      onUploadGraph(data);
    };
    reader.readAsText(file);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function copyPrompt(key, text) {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 2000);
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>AI-Ready Teaching Stack</h1>
        <p style={styles.subtitle}>
          Explore how knowledge graphs, AI agents, and evidence maps work together
          to create adaptive assessment.
        </p>

        {!showUpload ? (
          <div style={styles.choices}>
            <button style={styles.primaryBtn} onClick={onSelectDemo}>
              Try the demo
            </button>
            <button style={styles.secondaryBtn} onClick={() => setShowUpload(true)}>
              Upload your own graph
            </button>
          </div>
        ) : (
          <div style={styles.uploadSection}>
            <button
              style={styles.backBtnTop}
              onClick={() => { setShowUpload(false); setErrors([]); }}
            >
              ← Back
            </button>
            <div
              style={{
                ...styles.dropZone,
                borderColor: dragging ? '#3b82f6' : '#cbd5e1',
                background: dragging ? '#eff6ff' : '#f8fafc',
              }}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <p style={styles.dropText}>
                Drop a .json graph file here, or click to browse
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) handleFile(file);
                }}
              />
            </div>

            <a
              href="/graph-template.json"
              download="graph-template.json"
              style={styles.templateLink}
            >
              Download JSON template
            </a>

            {errors.length > 0 && (
              <div style={styles.errorBox}>
                {errors.map((err, i) => (
                  <p key={i} style={styles.errorLine}>{err}</p>
                ))}
              </div>
            )}

            <div style={styles.promptSection}>
              <p style={styles.promptSectionTitle}>
                Building your pieces? Copy these prompts into Claude:
              </p>

              <p style={styles.promptLabel}>1. Generate a knowledge graph (the board)</p>
              <pre style={styles.promptBox}>{PROMPT_TEMPLATE}</pre>
              <button style={styles.copyBtn} onClick={() => copyPrompt('graph', PROMPT_TEMPLATE)}>
                {copiedKey === 'graph' ? 'Copied!' : 'Copy prompt'}
              </button>

              <p style={{ ...styles.promptLabel, marginTop: 20 }}>2. Add win conditions to each node (the rubric)</p>
              <pre style={styles.promptBox}>{RUBRIC_PROMPT_TEMPLATE}</pre>
              <button style={styles.copyBtn} onClick={() => copyPrompt('rubric', RUBRIC_PROMPT_TEMPLATE)}>
                {copiedKey === 'rubric' ? 'Copied!' : 'Copy prompt'}
              </button>

              <p style={{ ...styles.promptLabel, marginTop: 20 }}>3. Draft a teaching agent (the rules of the game)</p>
              <pre style={styles.promptBox}>{AGENT_PROMPT_TEMPLATE}</pre>
              <button style={styles.copyBtn} onClick={() => copyPrompt('agent', AGENT_PROMPT_TEMPLATE)}>
                {copiedKey === 'agent' ? 'Copied!' : 'Copy prompt'}
              </button>
            </div>

            <button
              style={styles.backBtn}
              onClick={() => { setShowUpload(false); setErrors([]); }}
            >
              Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    height: '100%',
    overflowY: 'auto',
    padding: '32px 20px',
    boxSizing: 'border-box',
    background: '#f8fafc',
  },
  card: {
    margin: 'auto',
    maxWidth: 560,
    width: '100%',
    padding: 48,
    background: '#ffffff',
    borderRadius: 12,
    border: '1px solid #e2e8f0',
    textAlign: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 700,
    marginBottom: 12,
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 16,
    color: '#475569',
    marginBottom: 36,
    lineHeight: 1.5,
  },
  choices: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  primaryBtn: {
    padding: '14px 24px',
    fontSize: 16,
    fontWeight: 600,
    background: '#3b82f6',
    color: '#ffffff',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
  },
  secondaryBtn: {
    padding: '14px 24px',
    fontSize: 16,
    fontWeight: 600,
    background: '#ffffff',
    color: '#3b82f6',
    border: '2px solid #3b82f6',
    borderRadius: 8,
    cursor: 'pointer',
  },
  uploadSection: {
    textAlign: 'left',
  },
  dropZone: {
    border: '2px dashed #cbd5e1',
    borderRadius: 8,
    padding: 40,
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  dropText: {
    fontSize: 15,
    color: '#64748b',
  },
  errorBox: {
    marginTop: 12,
    padding: 12,
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: 8,
  },
  errorLine: {
    fontSize: 14,
    color: '#dc2626',
    marginBottom: 4,
  },
  promptSection: {
    marginTop: 24,
  },
  promptSectionTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: '#0f172a',
    marginBottom: 16,
  },
  promptLabel: {
    fontSize: 14,
    fontWeight: 600,
    color: '#334155',
    marginBottom: 8,
  },
  promptBox: {
    fontSize: 12,
    background: '#f1f5f9',
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    padding: 12,
    maxHeight: 180,
    overflow: 'auto',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    textAlign: 'left',
    lineHeight: 1.5,
  },
  copyBtn: {
    marginTop: 8,
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: 600,
    background: '#f1f5f9',
    color: '#334155',
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    cursor: 'pointer',
  },
  templateLink: {
    display: 'inline-block',
    marginTop: 12,
    fontSize: 14,
    fontWeight: 600,
    color: '#3b82f6',
    textDecoration: 'none',
  },
  backBtn: {
    marginTop: 16,
    padding: '8px 16px',
    fontSize: 14,
    background: 'transparent',
    color: '#64748b',
    border: 'none',
    cursor: 'pointer',
    textDecoration: 'underline',
  },
  backBtnTop: {
    display: 'inline-flex',
    alignItems: 'center',
    marginBottom: 16,
    padding: '6px 12px',
    fontSize: 13,
    fontWeight: 600,
    background: '#f1f5f9',
    color: '#334155',
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    cursor: 'pointer',
  },
};
