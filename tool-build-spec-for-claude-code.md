# AI-Ready Teaching Stack — Tool Build Spec
## For Claude Code
### March 2026

---

## WHAT THIS IS

A web-based interactive prototype demonstrating three interconnected layers of AI-in-education infrastructure: a **knowledge graph** (structured curriculum), an **agent** (adaptive assessment/tutoring), and an **evidence map** (structured record of learner understanding). The tool will be used as a live demo during a keynote presentation and as a leave-behind the audience can use afterward.

---

## TECHNICAL STACK

- **Frontend:** React (single-page app, single file OK — no separate CSS/JS files needed)
- **Graph visualization:** d3-force (force-directed graph layout)
- **AI layer:** Claude API (`claude-sonnet-4-20250514`) via `https://api.anthropic.com/v1/messages`
- **API key handling:** BYOK — the app prompts the user to enter their own Anthropic API key on first load. Store in React state (not localStorage). Show a clear explanation: "This tool uses the Claude API. Enter your API key to get started. Your key is never stored or transmitted anywhere except directly to Anthropic."
- **State management:** React useState/useReducer — conversation history, evidence map state, graph highlight state, active agent selection
- **No backend required.** All API calls go directly from the browser to `api.anthropic.com`.
- **Target environment:** Desktop browser, optimized for projector display (1920×1080). Should be usable on smaller screens but projector is the priority.

---

## LAYOUT

Three-panel layout, full viewport height. Panels sit side by side horizontally.

```
┌─────────────────┬──────────────────────┬─────────────────────┐
│                  │                      │                     │
│  KNOWLEDGE GRAPH │    CONVERSATION      │    EVIDENCE MAP     │
│     (left)       │     (center)         │      (right)        │
│     ~30%         │      ~40%            │       ~30%          │
│                  │                      │                     │
└─────────────────┴──────────────────────┴─────────────────────┘
```

Above the three panels: a **toolbar** with:
- Graph selector: dropdown to choose preloaded graph OR "Upload your own" option
- Agent selector: dropdown with three options (Diagnostician, Socratic Tutor, Direct Instructor)
- Mode toggle: "Play as learner" (default) / "Simulated learner" (auto-plays a student profile)
- "New session" button (resets conversation and evidence map, keeps graph and agent selection)

---

## PANEL 1 — KNOWLEDGE GRAPH (Left, ~30% width)

### What it shows
An interactive force-directed graph visualization of the currently loaded curriculum graph.

### Rendering
- Use d3-force for layout
- Nodes rendered as circles, sized by importance (learning_objective nodes larger than concept nodes)
- Edges rendered as lines with subtle arrowheads showing direction (source → target)
- Edge labels shown on hover, not by default (too cluttered)
- Node labels always visible (short — use the `label` field from the JSON)
- Clicking a node opens a tooltip/popover showing full metadata: description, difficulty, estimated_minutes, misconceptions array

### Node coloring (updates in real time during conversation)
- **Default/not yet assessed:** `#94a3b8` (slate-400)
- **Currently being assessed:** `#3b82f6` (blue-500) with a pulsing ring animation
- **Demonstrated understanding:** `#22c55e` (green-500)
- **Gap detected:** `#ef4444` (red-500)
- **In progress (partially assessed):** `#f59e0b` (amber-500)

### Edge highlighting
- When the agent traverses an edge (e.g., tracing from a gap back to a prerequisite), that edge should briefly animate — thicken and glow in blue, then return to normal. This shows the agent "navigating" the graph.

### Behavior on graph change
- When a new graph is loaded (preloaded or uploaded), the visualization re-renders with the new data
- Force simulation should stabilize quickly — don't let nodes bounce around for more than ~2 seconds

---

## PANEL 2 — CONVERSATION (Center, ~40% width)

### What it shows
A chat interface where the agent converses with a learner (either the user or a simulated learner).

### Chat UI
- Agent messages: left-aligned, with a subtle background fill (`#f1f5f9`)
- Learner messages: right-aligned, with a blue background (`#3b82f6`, white text)
- Text input at the bottom with a send button
- When in "Simulated learner" mode, the text input is disabled and replaced with a "Next turn" button that triggers the simulated learner's response followed by the agent's next move
- Scrolls to bottom on new messages
- Agent name displayed above its messages should change based on the selected agent ("Diagnostician" / "Socratic Tutor" / "Direct Instructor")

### Agent reasoning disclosure
Below the chat area, a collapsible panel labeled "Agent reasoning" (collapsed by default). When expanded, it shows the agent's internal reasoning for its most recent turn: which node it's assessing, why it chose this question, what it observed in the learner's response. This data comes from the `reasoning` field in the agent's structured JSON output.

### Conversation flow

**"Play as learner" mode:**
1. User selects a graph and an agent
2. User clicks "Start" (or conversation begins automatically)
3. Agent sends first message (a question targeting the primary learning objective)
4. User types a response
5. User's response is sent to the Claude API along with: the full conversation history, the agent's system prompt (which includes the graph and the agent strategy), and instructions to produce both a conversational response and a JSON evidence map update
6. The API response is parsed: the conversational part goes into the chat; the JSON update goes to the evidence map panel and the graph visualization
7. Repeat until the agent signals it has sufficient evidence (it will say something like "I think I have a good picture of where you are" in the conversation) or the user clicks "End session"

**"Simulated learner" mode:**
1. User selects a graph and an agent
2. User clicks "Start"
3. Agent sends first message
4. The simulated learner's response is generated by a SEPARATE Claude API call using the simulated learner's system prompt (see SIMULATED LEARNER section below)
5. That response is fed back to the agent as the learner's turn
6. User clicks "Next turn" to advance each exchange
7. This continues until the agent signals completion or the user clicks "End session"

---

## PANEL 3 — EVIDENCE MAP (Right, ~30% width)

### What it shows
A structured, updating record of the learner's demonstrated understanding, organized by graph node.

### Layout
A vertical list of all nodes from the current graph, grouped by status:

**Section 1: "Assessed"** — nodes with a definitive status
Each entry shows:
- Status icon: ✓ (green) for demonstrated understanding, ✗ (red) for gap detected
- Node label (bold)
- Evidence note (1-2 sentences from the agent's assessment)
- For gaps: a "Traces to:" line showing which prerequisite node the gap connects to

**Section 2: "In progress"** — nodes currently being assessed
- Arrow icon → (blue)
- Node label
- Partial evidence note if available

**Section 3: "Not yet assessed"** — remaining nodes
- Circle icon ○ (gray)
- Node label only

### The 72% contrast view
A button at the bottom of the evidence map panel: **"Compare to traditional score"**

When clicked, it overlays or splits the panel to show two columns:
- Left: `72%` in large, thin gray text with the label "What a score tells you"
- Right: The full evidence map with the label "What an evidence map tells you"

This is a key moment in the presentation. The contrast should be visually stark — the score should feel empty and the evidence map should feel rich.

### Real-time updates
- Evidence map updates after every agent turn (parsed from the agent's JSON output)
- When a node's status changes, it should animate briefly (subtle highlight flash) to draw attention
- Nodes should re-sort into the correct section when their status changes

---

## GRAPH JSON FORMAT

The tool accepts knowledge graphs in this format. All fields marked `(required)` must be present; all others are optional and the tool should handle their absence gracefully.

```json
{
  "metadata": {
    "title": "string — graph title (required)",
    "domain": "string — subject area (optional)",
    "author": "string (optional)",
    "created": "string — date (optional)"
  },
  "nodes": [
    {
      "id": "string — unique identifier (required)",
      "label": "string — display name (required)",
      "type": "string — one of: learning_objective, concept, skill (required)",
      "description": "string — full description (optional, used in tooltips and agent context)",
      "difficulty": "string — foundational, intermediate, advanced (optional)",
      "estimated_minutes": "number (optional)",
      "misconceptions": ["array of strings (optional, used by agent for probing)"]
    }
  ],
  "edges": [
    {
      "source": "string — node id (required, must reference existing node)",
      "target": "string — node id (required, must reference existing node)",
      "relationship": "string — one of: prerequisite, builds-on, breaks-into, enables (required)",
      "description": "string — explains the relationship (optional, used by agent)"
    }
  ]
}
```

### Validation rules (applied on upload)
1. JSON must parse successfully
2. Must have `nodes` array and `edges` array
3. Every node must have `id`, `label`, and `type`
4. Every edge must have `source`, `target`, and `relationship`
5. Every edge `source` and `target` must reference an existing node `id`
6. No duplicate node `id` values

On validation failure, show a specific, helpful error message. Examples:
- "Edge references node 'systems-thinking' but no node with that ID exists in the nodes array."
- "Node at index 3 is missing a required 'label' field."
- "Duplicate node ID: 'mental-models' appears twice."

Do NOT just say "Invalid JSON" or "Validation failed."

---

## GRAPH UPLOAD UX

### Landing state
When the tool first loads (after API key entry), show a choice:
- **"Try the demo"** — loads the preloaded Organizational Behavior graph
- **"Upload your own graph"** — opens a drag-and-drop zone + file picker

### Upload mechanism
- Drag-and-drop zone with file picker fallback
- Accepts `.json` files only
- On successful upload + validation: graph renders in Panel 1, agent system prompt rebuilds with new graph, conversation and evidence map reset
- On failure: show validation errors inline, keep the upload zone active

### "Build a graph" helper
Below the upload zone, include a copyable prompt template:

```
PROMPT TEMPLATE (copy this into Claude):

I want to build a knowledge graph for an AI assessment tool. Take the following learning objective (or syllabus excerpt) and produce a JSON knowledge graph.

For each concept, identify:
- A unique ID (lowercase, hyphenated)
- A short label
- A type (learning_objective, concept, or skill)
- A description
- Common student misconceptions (if applicable)

For relationships between concepts, identify:
- Source and target node IDs
- Relationship type (prerequisite, builds-on, breaks-into, or enables)
- A brief description of why this relationship exists

Output ONLY valid JSON in this exact format:
{
  "metadata": { "title": "...", "domain": "..." },
  "nodes": [ { "id": "...", "label": "...", "type": "...", "description": "...", "misconceptions": ["..."] } ],
  "edges": [ { "source": "...", "target": "...", "relationship": "...", "description": "..." } ]
}

Here is my learning objective / syllabus excerpt:
[PASTE YOUR CONTENT HERE]
```

---

## PRELOADED GRAPH: ORGANIZATIONAL BEHAVIOR

Ship the tool with this graph preloaded. This is the demo graph for the presentation.

```json
{
  "metadata": {
    "title": "Organizational Culture and Change Implementation",
    "domain": "Organizational Behavior",
    "author": "Demo",
    "created": "2026-03-15"
  },
  "nodes": [
    {
      "id": "culture-change-implementation",
      "label": "Culture & Change Implementation",
      "type": "learning_objective",
      "description": "Analyze how organizational culture affects change implementation, distinguishing structural from individual explanations.",
      "difficulty": "advanced",
      "estimated_minutes": 60,
      "misconceptions": [
        "Culture change is primarily a communication/messaging problem",
        "Resistance to change is irrational or reflects poor attitude",
        "Culture can be directly managed through top-down directives"
      ]
    },
    {
      "id": "structural-vs-individual",
      "label": "Structural vs. Individual Explanations",
      "type": "concept",
      "description": "The distinction between explaining organizational behavior through individual traits/actions (leadership, motivation, attitude) versus structural features (incentives, systems, power dynamics).",
      "difficulty": "foundational",
      "estimated_minutes": 30,
      "misconceptions": [
        "Defaulting to 'leadership failed' as the explanation for any organizational problem",
        "Treating individual behavior as independent of structural context"
      ]
    },
    {
      "id": "mental-models",
      "label": "Mental Models (Senge)",
      "type": "concept",
      "description": "Deeply held internal images of how the world works that shape how people interpret events and take action — often unconscious and resistant to change.",
      "difficulty": "intermediate",
      "estimated_minutes": 25,
      "misconceptions": [
        "Equating mental models with opinions or beliefs (they're deeper — structural, often invisible)",
        "Assuming surfacing a mental model is sufficient to change it"
      ]
    },
    {
      "id": "psychological-safety",
      "label": "Psychological Safety (Edmondson)",
      "type": "concept",
      "description": "A shared belief that the team is safe for interpersonal risk-taking — speaking up, admitting mistakes, challenging the status quo without fear of punishment.",
      "difficulty": "intermediate",
      "estimated_minutes": 20,
      "misconceptions": [
        "Confusing psychological safety with 'being nice' or avoiding conflict",
        "Thinking psychological safety means no accountability"
      ]
    },
    {
      "id": "scheins-levels",
      "label": "Schein's Three Levels of Culture",
      "type": "concept",
      "description": "Artifacts (visible structures and processes), espoused values (stated strategies, goals, philosophies), and underlying assumptions (unconscious, taken-for-granted beliefs).",
      "difficulty": "intermediate",
      "estimated_minutes": 25,
      "misconceptions": [
        "Confusing espoused values with actual culture (what we say vs. what we do)",
        "Treating artifacts as the whole of culture"
      ]
    },
    {
      "id": "systems-thinking",
      "label": "Systems Thinking",
      "type": "concept",
      "description": "Understanding organizations as complex systems with feedback loops, emergent properties, and non-linear causation.",
      "difficulty": "intermediate",
      "estimated_minutes": 30,
      "misconceptions": [
        "Linear causal thinking (A causes B, so fix A to fix B)",
        "Ignoring feedback loops and unintended consequences"
      ]
    },
    {
      "id": "resistance-to-change",
      "label": "Resistance as Rational Behavior",
      "type": "concept",
      "description": "Reframing resistance not as irrational stubbornness but as rational behavior given existing incentive structures, power dynamics, and mental models.",
      "difficulty": "advanced",
      "estimated_minutes": 25,
      "misconceptions": [
        "Resistance = bad attitude or fear of the unknown",
        "If people understood the change, they would support it"
      ]
    },
    {
      "id": "incentive-structures",
      "label": "Incentive Structures",
      "type": "concept",
      "description": "How formal and informal reward systems shape behavior — and how misalignment between stated goals and actual incentives undermines change.",
      "difficulty": "intermediate",
      "estimated_minutes": 20,
      "misconceptions": [
        "Incentives = compensation (they include status, workload, autonomy, social capital)",
        "Assuming stated incentives match actual incentives"
      ]
    },
    {
      "id": "change-management-strategy",
      "label": "Change Management Strategy",
      "type": "learning_objective",
      "description": "Designing change implementation strategies that account for culture, structure, and individual factors.",
      "difficulty": "advanced",
      "estimated_minutes": 45
    },
    {
      "id": "organizational-design",
      "label": "Organizational Design",
      "type": "learning_objective",
      "description": "Understanding how formal structures, roles, and processes shape behavior and culture.",
      "difficulty": "advanced",
      "estimated_minutes": 40
    }
  ],
  "edges": [
    {
      "source": "structural-vs-individual",
      "target": "resistance-to-change",
      "relationship": "prerequisite",
      "description": "Must distinguish structural from individual explanations before analyzing resistance as rational structural behavior."
    },
    {
      "source": "structural-vs-individual",
      "target": "culture-change-implementation",
      "relationship": "prerequisite",
      "description": "The foundational lens for analyzing culture's role in change."
    },
    {
      "source": "mental-models",
      "target": "resistance-to-change",
      "relationship": "prerequisite",
      "description": "Understanding mental models is required to see why people interpret the same change differently."
    },
    {
      "source": "mental-models",
      "target": "culture-change-implementation",
      "relationship": "prerequisite",
      "description": "Culture operates partly through shared mental models."
    },
    {
      "source": "psychological-safety",
      "target": "culture-change-implementation",
      "relationship": "prerequisite",
      "description": "Psychological safety determines whether concerns about change surface or stay hidden."
    },
    {
      "source": "scheins-levels",
      "target": "culture-change-implementation",
      "relationship": "prerequisite",
      "description": "Must analyze culture at all three levels to understand how it affects change."
    },
    {
      "source": "systems-thinking",
      "target": "resistance-to-change",
      "relationship": "prerequisite",
      "description": "Systems thinking enables seeing resistance as emergent from structural conditions."
    },
    {
      "source": "systems-thinking",
      "target": "culture-change-implementation",
      "relationship": "prerequisite",
      "description": "Change implementation requires understanding non-linear effects and feedback loops."
    },
    {
      "source": "incentive-structures",
      "target": "resistance-to-change",
      "relationship": "prerequisite",
      "description": "Resistance is often rational given existing incentives."
    },
    {
      "source": "resistance-to-change",
      "target": "culture-change-implementation",
      "relationship": "prerequisite",
      "description": "Understanding resistance as rational behavior is required before analyzing culture-change dynamics."
    },
    {
      "source": "culture-change-implementation",
      "target": "change-management-strategy",
      "relationship": "builds-on",
      "description": "Culture analysis feeds into change strategy design."
    },
    {
      "source": "culture-change-implementation",
      "target": "organizational-design",
      "relationship": "builds-on",
      "description": "Understanding culture-change dynamics informs organizational design choices."
    }
  ]
}
```

---

## THREE AGENT STRATEGIES

All three agents share the same knowledge graph, the same structured output format, and the same evidence map. They differ in how they interact with the learner. The user selects which agent to use via a dropdown in the toolbar.

### Shared system prompt structure (all agents)

Every agent's system prompt follows this template:

```
[AGENT ROLE — differs per agent, see below]

[KNOWLEDGE GRAPH]
You have access to the following curriculum knowledge graph. Use it to guide your assessment.
{full graph JSON inserted here}

[STRUCTURED OUTPUT RULES]
After EVERY message you send to the learner, you must also produce a JSON evidence map update. Your response must be in this exact format:

---RESPONSE---
[Your conversational message to the learner goes here]
---EVIDENCE---
{
  "current_node": "node-id being assessed",
  "action": "one of: initial_probe, probing_deeper, probing_prerequisite, confirming_understanding, concluding",
  "reasoning": "Brief explanation of why you chose this move",
  "evidence_updates": [
    {
      "node_id": "node-id",
      "status": "one of: demonstrated, gap_detected, in_progress, not_assessed",
      "evidence": "1-2 sentence description of what the learner showed",
      "trace_to": "node-id (only if status is gap_detected — which prerequisite does this trace to?)"
    }
  ]
}

IMPORTANT:
- Always include both ---RESPONSE--- and ---EVIDENCE--- sections
- The evidence_updates array should only include nodes whose status CHANGED this turn
- Use the graph's edge relationships to guide prerequisite tracing
- When you have sufficient evidence for all core nodes, set action to "concluding" and wrap up the conversation naturally
```

### Agent 1 — The Diagnostician

Append this role to the shared system prompt:

```
ROLE: You are The Diagnostician — a pure assessment agent. Your goal is to efficiently map what the learner understands and where their gaps are. You are NOT trying to teach.

BEHAVIOR:
- Start with a mid-level question targeting the primary learning objective (the node with type "learning_objective" that has the most prerequisite edges pointing to it)
- When a gap or misconception is detected, trace backward along prerequisite edges to find the root cause
- When understanding is demonstrated, move to the next unassessed node
- Ask precise, targeted questions. Don't give hints. Don't explain.
- Be efficient — find the shortest path to a complete evidence map
- Your tone is professional, curious, neutral. Like a skilled diagnostician. You ask precise questions and listen carefully.
- Do NOT teach, correct, or explain. Your only job is to map understanding.
```

### Agent 2 — The Socratic Tutor

```
ROLE: You are The Socratic Tutor — an assessment and instruction agent that helps learners discover their own gaps through guided inquiry. You assess AND teach simultaneously.

BEHAVIOR:
- Start with a scenario or case question that surfaces the primary learning objective
- When you detect a gap, don't just note it — ask questions designed to help the learner see the gap themselves
- Use productive failure: sometimes let the learner commit to a wrong answer, then surface the contradiction
- When a learner shifts their understanding, probe to confirm the shift is genuine (not just agreeing to move on)
- Trace prerequisite chains, but use them as a teaching path, not just a diagnostic path
- Your tone is warm, patient, genuinely curious. You ask "what makes you say that?" often. You let silence sit. You celebrate genuine shifts in understanding.
- In the evidence map, note both where the learner started and where they moved to during the conversation
```

### Agent 3 — The Direct Instructor

```
ROLE: You are The Direct Instructor — an assessment and instruction agent that identifies gaps and addresses them through clear, direct explanation. You assess, explain, and verify.

BEHAVIOR:
- Start with a mid-level question targeting the primary learning objective
- When you detect a gap, explain the concept directly — clearly, concisely, with a concrete example
- After explaining, immediately check: ask a question that tests whether the learner actually understood (not just repeated your explanation)
- If the check reveals the gap persists, try a different explanation or analogy
- Move efficiently: teach what's missing, verify it landed, advance
- Your tone is clear, confident, efficient. Like a good lecturer who explains well and checks often.
- In the evidence map, distinguish between "understood before instruction" and "understood after instruction"
```

---

## SIMULATED LEARNER

When "Simulated learner" mode is active, a SEPARATE Claude API call generates the learner's responses.

### Simulated learner system prompt

```
You are a simulated student in an organizational behavior course. You are being assessed by an AI agent. Respond naturally as a student would — not perfectly, not robotically.

YOUR KNOWLEDGE PROFILE — "The Communication Fixer":
- You understand Schein's three levels of culture SUPERFICIALLY. You can name them (artifacts, espoused values, underlying assumptions) but you tend to conflate espoused values with actual culture. When asked about culture, you describe what organizations SAY rather than what they DO.
- You DEFAULT to individual-level explanations. When asked why change fails, you talk about leadership, communication, vision, buy-in. You rarely think about structural explanations like incentive misalignment or systemic feedback loops.
- You treat resistance to change as IRRATIONAL — people resist because they fear the unknown, don't understand the change, or have bad attitudes. You don't see resistance as rational behavior given structural incentives.
- You have NOT internalized the structural-vs-individual distinction. You don't know you're missing it. You think your explanations are good.
- You respond CONFIDENTLY. You believe your framing is correct. You're not uncertain — you're wrong in a specific, consistent way.
- When pushed or challenged, you ADD MORE DETAIL within the same frame rather than shifting frames. If told your answer about communication is incomplete, you add "and also leadership visibility" or "and stakeholder engagement" — still individual-level, just more of it.
- You are a capable, articulate student. You use appropriate vocabulary. You just have a specific conceptual blind spot.

IMPORTANT:
- Respond in 2-4 sentences, like a real student in a conversation
- Don't break character. Don't reveal your misconception profile.
- If the agent helps you see something new (especially with the Socratic Tutor or Direct Instructor), you can show genuine learning — but make it gradual and realistic, not instant
```

### API call structure for simulated learner
The simulated learner's API call includes:
- The simulated learner system prompt (above)
- The full conversation history so far (so it responds in context)
- No knowledge graph (the simulated learner doesn't see the graph — that's the agent's advantage)

---

## API CALL STRUCTURE

### Agent turn (user sends a message)

```javascript
const response = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": userApiKey,
    "anthropic-version": "2023-06-01",
    "anthropic-dangerous-direct-browser-access": "true"
  },
  body: JSON.stringify({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: agentSystemPrompt, // includes graph JSON + agent role
    messages: conversationHistory // full history in user/assistant format
  })
});
```

### Parsing the response

The agent's response contains both conversational text and JSON evidence data, separated by `---RESPONSE---` and `---EVIDENCE---` markers. Parse them:

```javascript
const fullText = data.content[0].text;
const responsePart = fullText.split("---EVIDENCE---")[0].replace("---RESPONSE---", "").trim();
const evidencePart = fullText.split("---EVIDENCE---")[1]?.trim();

// Display responsePart in the chat
// Parse evidencePart as JSON and update the evidence map + graph visualization
let evidenceUpdate;
try {
  evidenceUpdate = JSON.parse(evidencePart);
} catch (e) {
  // If JSON parsing fails, still display the conversation but log the error
  // The agent sometimes wraps JSON in backticks — strip them and retry
  const cleaned = evidencePart?.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  evidenceUpdate = JSON.parse(cleaned);
}
```

### Simulated learner turn

```javascript
const learnerResponse = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": userApiKey,
    "anthropic-version": "2023-06-01",
    "anthropic-dangerous-direct-browser-access": "true"
  },
  body: JSON.stringify({
    model: "claude-sonnet-4-20250514",
    max_tokens: 256,
    system: simulatedLearnerSystemPrompt, // learner profile, no graph
    messages: conversationHistoryFromLearnerPerspective // what the learner has "seen"
  })
});
```

---

## VISUAL DESIGN

Keep it clean, professional, and legible on a projector. Not flashy.

### Color palette
- Background: `#ffffff`
- Panel borders: `#e2e8f0` (slate-200)
- Text: `#1e293b` (slate-800)
- Agent messages bg: `#f1f5f9` (slate-100)
- Learner messages bg: `#3b82f6` (blue-500), text white
- Graph node colors: see Panel 1 section above
- Accent/highlight: `#3b82f6` (blue-500)
- Error states: `#ef4444` (red-500)
- Success states: `#22c55e` (green-500)

### Typography
- Use system fonts: `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
- Panel headers: 14px, bold, uppercase, letter-spacing 0.05em
- Chat text: 15px
- Evidence map text: 14px
- Graph node labels: 12px
- Toolbar: 14px

### Projector considerations
- High contrast — no light gray on white
- Large enough text to read from the back of a room
- No animations that are too subtle to see on a projector (make them obvious)
- The graph node pulsing animation and edge traversal animation should be clearly visible

---

## BUILD PRIORITIES (in order)

1. API key entry screen
2. Three-panel layout with the preloaded OB graph rendering in Panel 1
3. The Diagnostician agent — full conversation flow with evidence map updates
4. Evidence map panel updating in real time from agent JSON output
5. Graph visualization updating node colors based on evidence map state
6. Simulated learner mode
7. Socratic Tutor and Direct Instructor agents (same architecture, different system prompts)
8. Agent selector dropdown
9. Graph upload with validation and error messages
10. "Build a graph" prompt template on the upload screen
11. The 72% contrast view button
12. Agent reasoning disclosure panel (collapsible)

---

## ERROR HANDLING

- **API key invalid:** Show clear message, let user re-enter
- **API rate limit / error:** Show message in chat area, don't crash. Let user retry.
- **Agent response doesn't include evidence JSON:** Display the conversational response anyway. Show a warning in the agent reasoning panel. Don't crash.
- **Graph upload validation failure:** Show specific errors (see validation rules above). Don't clear the upload zone — let the user fix and retry.
- **Empty graph (no nodes):** Show a message in Panel 1: "This graph has no nodes. Upload a graph with at least one node to get started."

---

## WHAT DONE LOOKS LIKE

The tool is done when:
1. You can load the preloaded OB graph and see it rendered as a force-directed graph
2. You can start a conversation with the Diagnostician and get adaptive questions based on the graph
3. The evidence map updates after each agent turn with node statuses and evidence notes
4. The graph visualization updates node colors in real time as the evidence map changes
5. You can switch to simulated learner mode and watch the full conversation play out turn by turn
6. You can switch between all three agents and get meaningfully different conversation styles
7. You can upload a custom JSON graph file and the whole system works with it
8. The 72% contrast view works
9. It looks good on a 1920×1080 projector
