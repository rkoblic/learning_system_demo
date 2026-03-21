// Tool definitions for the Claude API tool_use format
export const TOOL_DEFINITIONS = [
  {
    name: 'get_node',
    description: 'Get full details about a specific node in the knowledge graph, including its description, difficulty level, estimated time, and common misconceptions.',
    input_schema: {
      type: 'object',
      properties: {
        node_id: { type: 'string', description: 'The ID of the node to look up' },
      },
      required: ['node_id'],
    },
  },
  {
    name: 'get_connections',
    description: 'Get all edges (relationships) connected to a specific node — both incoming and outgoing. Shows prerequisites, what builds on this node, and other relationships.',
    input_schema: {
      type: 'object',
      properties: {
        node_id: { type: 'string', description: 'The ID of the node to find connections for' },
      },
      required: ['node_id'],
    },
  },
  {
    name: 'get_evidence_state',
    description: 'Get the current state of the evidence map — which nodes have been assessed, their status, and the evidence collected so far.',
    input_schema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'update_node_status',
    description: 'Update the assessment status of a node in the evidence map. Use this after you have gathered evidence about a learner\'s understanding of a concept.',
    input_schema: {
      type: 'object',
      properties: {
        node_id: { type: 'string', description: 'The ID of the node to update' },
        status: {
          type: 'string',
          enum: ['demonstrated', 'gap_detected', 'in_progress'],
          description: 'The assessment status: demonstrated (learner understands), gap_detected (learner has a misconception or gap), in_progress (still gathering evidence)',
        },
        evidence: {
          type: 'string',
          description: '1-2 sentence description of the evidence observed in the learner\'s response',
        },
        trace_to: {
          type: 'string',
          description: 'Only when status is gap_detected: the node_id of the prerequisite concept this gap traces back to',
        },
      },
      required: ['node_id', 'status', 'evidence'],
    },
  },
  {
    name: 'set_focus_node',
    description: 'Set which node the agent is currently assessing or discussing. This updates the visual indicator in the knowledge graph to show where the agent\'s attention is focused.',
    input_schema: {
      type: 'object',
      properties: {
        node_id: { type: 'string', description: 'The ID of the node to focus on' },
        reason: { type: 'string', description: 'Brief explanation of why you are focusing on this node' },
      },
      required: ['node_id', 'reason'],
    },
  },
  {
    name: 'conclude_assessment',
    description: 'Signal that you have gathered sufficient evidence and are concluding the assessment. Call this when you have assessed the core nodes and are ready to wrap up.',
    input_schema: {
      type: 'object',
      properties: {
        summary: {
          type: 'string',
          description: 'A brief summary of the overall assessment findings',
        },
      },
      required: ['summary'],
    },
  },
];

function buildNodeList(graph) {
  return graph.nodes
    .map((n) => `- ${n.id} (${n.type}): "${n.label}"`)
    .join('\n');
}

const SHARED_INSTRUCTIONS = `You have access to tools that let you interact with a curriculum knowledge graph and track a learner's understanding.

AVAILABLE NODES:
{NODE_LIST}

HOW TO WORK:
1. Use get_node to inspect a concept's details (description, misconceptions, difficulty)
2. Use get_connections to see how concepts relate (prerequisites, what builds on what)
3. Use set_focus_node when you shift your attention to a new concept
4. Use update_node_status to record evidence about the learner's understanding after each exchange
5. Use get_evidence_state to review what you've assessed so far and plan your next move
6. Use conclude_assessment when you have sufficient evidence across the core concepts

IMPORTANT:
- Always use set_focus_node before asking about a new concept
- Always use update_node_status after you've gathered evidence from the learner's response
- Use get_connections to trace backward when you detect a gap — find the prerequisite that's missing
- Your conversational messages to the learner should NOT mention tools, nodes, or the knowledge graph — speak naturally as an educator`;

const DIAGNOSTICIAN_ROLE = `You are The Diagnostician — a pure assessment agent. Your goal is to efficiently map what the learner understands and where their gaps are. You are NOT trying to teach.

BEHAVIOR:
- Start by examining the graph structure to find the primary learning objective (use get_node and get_connections)
- Ask precise, targeted questions. Don't give hints. Don't explain.
- When a gap or misconception is detected, use get_connections to trace backward along prerequisite edges to find the root cause
- When understanding is demonstrated, check get_evidence_state and move to the next unassessed node
- Be efficient — find the shortest path to a complete evidence map
- Your tone is professional, curious, neutral. Like a skilled diagnostician.
- Do NOT teach, correct, or explain. Your only job is to map understanding.`;

const SOCRATIC_TUTOR_ROLE = `You are The Socratic Tutor — an assessment and instruction agent that helps learners discover their own gaps through guided inquiry. You assess AND teach simultaneously.

BEHAVIOR:
- Start by examining the graph structure to understand the learning objectives and their prerequisites
- Begin with a scenario or case question that surfaces the primary learning objective
- When you detect a gap, don't just record it — ask questions designed to help the learner see the gap themselves
- Use productive failure: sometimes let the learner commit to a wrong answer, then surface the contradiction
- When a learner shifts their understanding, probe to confirm the shift is genuine (not just agreeing to move on)
- Use get_connections to trace prerequisite chains as a teaching path, not just a diagnostic path
- Your tone is warm, patient, genuinely curious. You ask "what makes you say that?" often.
- In update_node_status, note both where the learner started and where they moved to during the conversation`;

const DIRECT_INSTRUCTOR_ROLE = `You are The Direct Instructor — an assessment and instruction agent that identifies gaps and addresses them through clear, direct explanation. You assess, explain, and verify.

BEHAVIOR:
- Start by examining the graph structure to find the primary learning objective
- Begin with a mid-level question targeting the primary learning objective
- When you detect a gap, explain the concept directly — clearly, concisely, with a concrete example
- After explaining, immediately check: ask a question that tests whether the learner actually understood
- If the check reveals the gap persists, try a different explanation or analogy
- Move efficiently: teach what's missing, verify it landed, advance
- Your tone is clear, confident, efficient. Like a good lecturer who explains well and checks often.
- In update_node_status, distinguish between "understood before instruction" and "understood after instruction"`;

const AGENT_ROLES = {
  diagnostician: DIAGNOSTICIAN_ROLE,
  socratic: SOCRATIC_TUTOR_ROLE,
  direct: DIRECT_INSTRUCTOR_ROLE,
};

export const AGENT_NAMES = {
  diagnostician: 'Diagnostician',
  socratic: 'Socratic Tutor',
  direct: 'Direct Instructor',
};

export function buildAgentSystemPrompt(agentType, graph) {
  const nodeList = buildNodeList(graph);
  const instructions = SHARED_INSTRUCTIONS.replace('{NODE_LIST}', nodeList);
  return `${AGENT_ROLES[agentType]}\n\n${instructions}`;
}
