# CLAUDE.md

## Project Overview
AI-Ready Teaching Stack — a three-panel interactive demo showing how knowledge graphs, AI agents, and evidence maps work together for adaptive assessment. Built for keynote presentations and as a leave-behind tool.

## Tech Stack
- **Frontend:** React 18 + Vite
- **Graph visualization:** d3-force
- **AI:** Claude API (claude-sonnet-4-20250514) via Vercel serverless proxy
- **Deployment:** Vercel

## Project Structure
```
api/chat.js              — Vercel serverless function (proxies Claude API)
src/App.jsx              — Root component, state management (useReducer), agentic loop
src/components/
  Landing.jsx            — Landing page (demo selection, graph upload, prompt template)
  KnowledgeGraph.jsx     — Panel 1: d3-force graph visualization
  Conversation.jsx       — Panel 2: chat UI + tool call reasoning panel
  EvidenceMap.jsx         — Panel 3: evidence list + 72% contrast view
src/data/
  ob-graph.json          — Preloaded Organizational Behavior curriculum graph
  demo-script.js         — Pre-scripted 8-turn demo conversation
src/prompts/
  agents.js              — Agent system prompts + tool definitions (6 tools)
  simulated-learner.js   — Simulated learner profile ("The Communication Fixer")
src/utils/
  api.js                 — API client + runAgentLoop (client-side agentic loop)
  validateGraph.js       — JSON graph validation with specific error messages
```

## Key Architecture Decisions
- **Agents use Claude tool_use** — not structured text output. Each agent has 6 tools: `get_node`, `get_connections`, `get_evidence_state`, `update_node_status`, `set_focus_node`, `conclude_assessment`.
- **Agentic loop runs client-side** so tool calls can update the UI in real-time.
- **API key is server-side only** — the Vercel serverless function proxies all Claude API calls. Never expose the key in client code.
- **Demo mode** plays back a scripted conversation with no API calls — safety net for live demos.
- **State management** uses useReducer in App.jsx. `conversation` tracks API message history; `displayMessages` tracks what the user sees.

## Running Locally
```bash
npm install
# Add your Anthropic API key to .env:
# ANTHROPIC_API_KEY=sk-ant-...
vercel dev
```

## Building
```bash
npm run build
```

## Deploying
Push to GitHub, connect to Vercel, set `ANTHROPIC_API_KEY` as an environment variable.

## Three Agent Strategies
- **Diagnostician** — pure assessment, no teaching. Maps understanding efficiently.
- **Socratic Tutor** — assesses and teaches through guided inquiry and productive failure.
- **Direct Instructor** — identifies gaps and addresses them with clear explanations.

## Graph JSON Format
Graphs need `nodes` (id, label, type required) and `edges` (source, target, relationship required). See `src/data/ob-graph.json` for the full schema example.
