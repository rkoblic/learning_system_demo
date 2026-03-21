# AI-Ready Teaching Stack

An interactive prototype demonstrating three interconnected layers of AI-in-education infrastructure:

- **Knowledge Graph** — structured curriculum visualized as a force-directed graph
- **AI Agent** — adaptive assessment and tutoring powered by Claude
- **Evidence Map** — structured record of learner understanding, updated in real time

Built for live demos and hands-on exploration. Three agent strategies show different approaches to the same assessment task — and a "Compare to traditional score" view makes the case for evidence-rich assessment over single scores.

## Quick Start

```bash
npm install
```

Create a `.env` file with your Anthropic API key:

```
ANTHROPIC_API_KEY=sk-ant-...
```

Run the development server:

```bash
vercel dev
```

Open [http://localhost:3000](http://localhost:3000).

## How It Works

### The Three Panels

| Panel | What it shows |
|-------|--------------|
| **Knowledge Graph** (left) | Interactive d3-force visualization of curriculum concepts and their relationships. Nodes change color as the agent assesses them. |
| **Conversation** (center) | Chat interface where the agent converses with a learner. An expandable "Agent tool use" panel shows the agent's tool calls in real time. |
| **Evidence Map** (right) | Structured record of what the learner knows, organized by status: assessed, in progress, not yet assessed. |

### The Three Agents

- **Diagnostician** — Pure assessment. Asks precise questions, maps understanding, never teaches. Like a skilled clinician.
- **Socratic Tutor** — Assesses and teaches simultaneously through guided inquiry. Uses productive failure and celebrates genuine shifts in understanding.
- **Direct Instructor** — Identifies gaps and addresses them with clear, direct explanation. Teaches, verifies, advances.

### The Three Modes

- **Play as learner** — You answer the agent's questions yourself.
- **Simulated learner** — A simulated student ("The Communication Fixer") responds automatically. Click "Next turn" to advance.
- **Demo mode** — A pre-scripted conversation plays back with no API calls. Works offline. Only available with the preloaded demo graph.

### Agent Tool Use

Each agent is a proper tool-using agent with six tools:

| Tool | Purpose |
|------|---------|
| `get_node` | Inspect a concept's details, difficulty, and common misconceptions |
| `get_connections` | See how concepts relate (prerequisites, dependencies) |
| `get_evidence_state` | Review the current assessment state |
| `update_node_status` | Record evidence about a learner's understanding |
| `set_focus_node` | Shift attention to a new concept (updates the graph visualization) |
| `conclude_assessment` | Signal that assessment is complete |

Click **"Under the Hood"** in the toolbar to inspect the system prompts, tool definitions, and graph JSON at any time.

### Cost Controls

- Sessions are capped at **10 turns** (applies to Play as learner and Simulated learner modes, not Demo mode)
- The API proxy is **rate-limited** to 30 requests per minute per IP

## Upload Your Own Graph

Click "Upload your own graph" on the landing page to use a custom curriculum. A **downloadable JSON template** is provided on the upload page, along with a prompt you can paste into Claude to generate a graph from any syllabus or learning objective.

Graphs are JSON files with `nodes` and `edges`:

```json
{
  "metadata": { "title": "My Course", "domain": "Subject" },
  "nodes": [
    { "id": "concept-1", "label": "First Concept", "type": "concept" }
  ],
  "edges": [
    { "source": "concept-1", "target": "concept-2", "relationship": "prerequisite" }
  ]
}
```

## Deploy to Vercel

1. Push to GitHub
2. Import the repo in [Vercel](https://vercel.com)
3. Set `ANTHROPIC_API_KEY` as an environment variable
4. Deploy

## License

MIT
