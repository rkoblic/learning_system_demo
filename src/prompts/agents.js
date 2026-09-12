// Tool definitions for the Claude API tool_use format
export const TOOL_DEFINITIONS = [
  {
    name: 'get_node',
    description: 'Get full details about a specific node in the knowledge graph, including its binary rubric when it is assessable.',
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
    name: 'record_criterion_results',
    description: 'Record a completed performance evaluation for one assessable node. Submit a binary result and specific learner evidence for every essential rubric criterion. The application derives the overall performance result.',
    input_schema: {
      type: 'object',
      properties: {
        node_id: { type: 'string', description: 'The ID of the assessable node' },
        criterion_results: {
          type: 'array',
          minItems: 1,
          description: 'One result for every essential rubric criterion on the node.',
          items: {
            type: 'object',
            properties: {
              criterion_id: { type: 'string', description: 'Exact criterion ID returned by get_node' },
              result: {
                type: 'string',
                enum: ['meets', 'does_not_meet'],
                description: 'Binary result for this criterion',
              },
              evidence: {
                type: 'string',
                description: 'Specific observable learner behavior supporting the result, or a precise statement that the required evidence was absent',
              },
            },
            required: ['criterion_id', 'result', 'evidence'],
          },
        },
        summary: {
          type: 'string',
          description: 'Optional concise synthesis of the performance evaluation',
        },
        trace_to: {
          type: 'string',
          description: 'Optional prerequisite node ID that best explains a Does Not Meet result',
        },
      },
      required: ['node_id', 'criterion_results'],
    },
  },
  {
    name: 'mark_not_assessable',
    description: 'Record that the evidence opportunity did not give the learner a fair chance to demonstrate an assessable node. Do not use this merely because the learner omitted required evidence in an otherwise adequate opportunity.',
    input_schema: {
      type: 'object',
      properties: {
        node_id: { type: 'string', description: 'The ID of the assessable node' },
        reason: {
          type: 'string',
          description: 'Why the task, context, or available performance made a valid judgment impossible',
        },
      },
      required: ['node_id', 'reason'],
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
    description: 'Signal that you have gathered sufficient evidence and are concluding the assessment. Call this when the relevant assessable Skills have been addressed and you are ready to wrap up.',
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
4. Use record_criterion_results when a bounded performance provides enough evidence to judge every essential criterion
5. Use mark_not_assessable only when the task or context did not give the learner a fair opportunity to demonstrate the node
6. Use get_evidence_state to review what you've assessed so far and plan your next move
7. Use conclude_assessment when you have sufficient evidence across the relevant skills

BINARY RUBRICS:
- Skill nodes may carry a rubric returned by get_node. Judge each criterion independently as meets or does_not_meet and cite observable learner behavior for every result.
- Do not infer evidence the learner did not provide. If an adequate opportunity was provided and an essential element is absent, that criterion does_not_meet.
- mark_not_assessable sits outside the binary result. Use it only when the opportunity itself did not make the node observable.
- The application, not you, applies the rubric's combination rule and derives the overall performance result.
- Nodes without a rubric may inform diagnosis or teaching, but you must not issue a formal assessment result for them.
- Frame the initial task for a Skill so the learner has a fair opportunity to demonstrate all of its essential criteria in one substantive response.
- Treat that initial response as a bounded performance. If evidence for an essential criterion is genuinely ambiguous because the response is incomplete, ask at most one focused follow-up.
- After the initial response, or after that single follow-up, call record_criterion_results for every essential criterion. Record an absent required element as does_not_meet; do not keep questioning merely to help the learner pass.

IMPORTANT — you must USE the tools every turn, not just converse:
- On your very first turn, call get_node and get_connections to orient yourself, then call set_focus_node on the concept you will probe first — before writing your opening message.
- Whenever your attention moves to a new concept, call set_focus_node.
- After the learner's initial substantive response, either record the complete criterion results or ask the one permitted focused follow-up. After the follow-up response, record the complete criterion results before replying. If the evidence opportunity itself was invalid, call mark_not_assessable instead.
- Use get_connections to trace backward when you detect a gap — find the prerequisite that's missing.
- Call the tools in the SAME turn as your reply (tool calls first, then your message). Your conversational messages to the learner should NOT mention tools, nodes, or the knowledge graph — speak naturally as an educator.`;

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
- Start by calling get_node and get_connections to examine the graph structure, then set_focus_node on your entry point — before you write your opening scenario
- Begin with a scenario or case question that surfaces the primary learning objective
- When you detect a gap, don't just record it — ask questions designed to help the learner see the gap themselves
- Use productive failure: sometimes let the learner commit to a wrong answer, then surface the contradiction
- When a learner shifts their understanding, probe to confirm the shift is genuine (not just agreeing to move on)
- Use get_connections to trace prerequisite chains as a teaching path, not just a diagnostic path
- Even though you teach through questions, you must still record criterion results once the learner has completed a bounded performance
- Your tone is warm, patient, genuinely curious. You ask "what makes you say that?" often.
- In the criterion evidence or summary, note where the learner started and where they moved during the conversation`;

const DIRECT_INSTRUCTOR_ROLE = `You are The Direct Instructor — an assessment and instruction agent that identifies gaps and addresses them through clear, direct explanation. You assess, explain, and verify.

BEHAVIOR:
- Start by calling get_node and get_connections to examine the graph structure, then set_focus_node on the primary learning objective — before your first message
- Begin with a mid-level question targeting the primary learning objective
- When you detect a gap, explain the concept directly — clearly, concisely, with a concrete example
- After explaining, immediately check: ask a question that tests whether the learner actually understood
- If the check reveals the gap persists, try a different explanation or analogy
- Move efficiently: teach what's missing, verify it landed, advance
- Record criterion results after the learner completes the relevant performance, and distinguish evidence produced before instruction from evidence produced after instruction
- Your tone is clear, confident, efficient. Like a good lecturer who explains well and checks often.`;

const AGENT_ROLES = {
  diagnostician: DIAGNOSTICIAN_ROLE,
  socratic: SOCRATIC_TUTOR_ROLE,
  direct: DIRECT_INSTRUCTOR_ROLE,
};

export const AGENT_NAMES = {
  diagnostician: 'Diagnostician',
  socratic: 'Socratic Tutor',
  direct: 'Direct Instructor',
  custom: 'Custom agent',
};

// Each pedagogical move maps to one instruction sentence used in the composed custom-agent role.
export const AGENT_MOVE_FRAGMENTS = {
  questionFirst: 'When a learner is stuck, respond with a question that nudges their thinking before you offer any answer.',
  productiveStruggle: 'Leave room for productive struggle — let the learner wrestle with difficulty rather than rescuing them at the first sign of friction.',
  noFalseConfirm: 'Never confirm a correct answer that was reached through faulty reasoning. Probe the reasoning, not just the answer.',
  praiseProcess: 'Acknowledge reasoning, effort, and good moves — not only correct answers.',
  traceToPrereqs: 'When you detect a gap, trace it backward along prerequisite edges to find the underlying concept that is actually missing.',
  explainDirectly: 'When you detect a gap, explain the concept directly and concisely with a concrete example, then check that it landed.',
  surfaceMisconceptions: "Deliberately surface the learner's likely misconceptions and design questions that force them into the open.",
  warmTone: 'Your tone is warm, patient, and encouraging.',
  neutralTone: 'Your tone is neutral, precise, and clinical.',
  assessOnly: 'Focus on assessment — map what the learner understands without teaching or correcting.',
  teachWhileAssessing: 'Teach and assess at the same time — help the learner move forward while you gather evidence.',
};

// Short labels used by the live preview composition in the builder UI.
export const AGENT_MOVE_LABELS = {
  questionFirst: 'ask a question before answering',
  productiveStruggle: 'allow productive struggle',
  noFalseConfirm: 'never confirm right-answer-from-wrong-reasoning',
  praiseProcess: 'praise reasoning, not just answers',
  traceToPrereqs: 'trace gaps to prerequisites',
  explainDirectly: 'explain gaps directly',
  surfaceMisconceptions: 'surface misconceptions',
  warmTone: 'warm and encouraging',
  neutralTone: 'neutral and clinical',
  assessOnly: 'assess only',
  teachWhileAssessing: 'teach while assessing',
};

export function buildCustomAgentRole(moves) {
  // "Write your own" mode: use the learner-authored tutor prompt verbatim as the role.
  // The shared tool/graph instructions are still appended by buildAgentSystemPrompt.
  const fullPrompt = (moves?.fullPrompt || '').trim();
  if (moves?.useFullPrompt && fullPrompt) {
    return fullPrompt;
  }

  const activeBullets = Object.entries(AGENT_MOVE_FRAGMENTS)
    .filter(([key]) => moves?.[key])
    .map(([, fragment]) => `- ${fragment}`);

  const otherText = (moves?.otherPrinciple || '').trim();
  if (otherText) {
    activeBullets.push(`- ${otherText}`);
  }

  const behavior = activeBullets.length > 0
    ? activeBullets.join('\n')
    : '- Assess the learner\'s understanding with clear, well-targeted questions and adapt as you go.';

  return `You are a custom teaching agent, configured with a specific set of pedagogical principles. Your goal is to move the learner across the knowledge graph — assessing what they understand and, where your principles call for it, helping them learn.

BEHAVIOR:
${behavior}`;
}

export function buildAgentSystemPrompt(agentType, graph, customAgent, startNodeId = null) {
  const nodeList = buildNodeList(graph);
  const instructions = SHARED_INSTRUCTIONS.replace('{NODE_LIST}', nodeList);
  const role = agentType === 'custom'
    ? buildCustomAgentRole(customAgent)
    : AGENT_ROLES[agentType];
  const scope = startNodeId
    ? `\n\nASSESSMENT START:\nBegin with node "${startNodeId}". Inspect its rubric and connections before asking the first question. You may traverse to connected Skill nodes when the learner's performance or a detected gap justifies it, but make each shift explicit with set_focus_node.`
    : '';
  return `${role}\n\n${instructions}${scope}`;
}
