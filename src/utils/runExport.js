import { normalizeRubric } from './rubric.js';

function codeFence(content, language = '') {
  const text = String(content ?? '');
  const fence = text.includes('```') ? '````' : '```';
  return `${fence}${language}\n${text}\n${fence}`;
}

function formatStructured(value) {
  if (typeof value !== 'string') return JSON.stringify(value ?? null, null, 2);

  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}

function labelResult(value) {
  if (!value) return 'Not judged';
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function buildTranscript(messages) {
  if (!messages?.length) return '_No visible conversation messages yet._';

  const turns = [];
  let currentTurn = null;

  for (const message of messages) {
    if (message.role === 'assistant' || !currentTurn) {
      currentTurn = [];
      turns.push(currentTurn);
    }
    currentTurn.push(message);
  }

  return turns.map((turn, index) => {
    const entries = turn.map((message) => {
      const speaker = message.role === 'assistant' ? 'Tutor' : 'Learner';
      return `**${speaker}**\n\n${message.content}`;
    });
    return `### Turn ${index + 1}\n\n${entries.join('\n\n')}`;
  }).join('\n\n');
}

function buildEvidenceMap(graph, evidenceMap) {
  if (!graph?.nodes?.length) return '_No knowledge graph was available._';

  return graph.nodes.map((node) => {
    const evidence = evidenceMap?.[node.id] || {};
    const rubric = normalizeRubric(node);
    const resultsById = new Map(
      (evidence.criterion_results || []).map((result) => [result.criterion_id, result])
    );
    const lines = [
      `### ${node.label} (\`${node.id}\`)`,
      '',
      `- Status: ${labelResult(evidence.status || 'not_assessed')}`,
    ];

    if (evidence.performance_result) {
      lines.push(`- Judgment: ${labelResult(evidence.performance_result)}`);
    }
    if (evidence.summary) lines.push(`- Summary: ${evidence.summary}`);
    if (evidence.reason) lines.push(`- Reason: ${evidence.reason}`);
    if (evidence.trace_to) lines.push(`- Traces to: \`${evidence.trace_to}\``);

    if (rubric?.criteria?.length) {
      lines.push('', '#### Criteria', '');
      for (const criterion of rubric.criteria) {
        const result = resultsById.get(criterion.id);
        lines.push(`- **${criterion.label}** (\`${criterion.id}\`): ${labelResult(result?.result)}`);
        if (result?.evidence) lines.push(`  - Evidence: ${result.evidence}`);
      }
    }

    return lines.join('\n');
  }).join('\n\n');
}

function buildToolHistory(toolCallLog) {
  if (!toolCallLog?.length) return '_No tool calls were recorded._';

  return toolCallLog.map((call, index) => {
    const lines = [
      `### Call ${call.order || index + 1}: \`${call.name}\``,
      '',
    ];
    if (call.turn) lines.push(`- Turn: ${call.turn}`);
    if (call.timestamp) lines.push(`- Timestamp: ${call.timestamp}`);
    lines.push('', '**Arguments**', '', codeFence(formatStructured(call.input), 'json'));
    lines.push('', '**Returned result**', '', codeFence(formatStructured(call.result), 'json'));
    return lines.join('\n');
  }).join('\n\n');
}

export function countConversationTurns(messages) {
  if (!messages?.length) return 0;
  const tutorTurns = messages.filter((message) => message.role === 'assistant').length;
  return tutorTurns || 1;
}

export function createRunMarkdown({
  createdAt,
  startedAt,
  currentNode,
  graph,
  messages,
  evidenceMap,
  toolCallLog,
  tutorPrompt,
  learnerMode,
  learnerPrompt,
  learnerConfig,
}) {
  const timestamp = createdAt instanceof Date ? createdAt : new Date(createdAt);
  const focusNode = graph?.nodes?.find((node) => node.id === currentNode);
  const learnerLines = [`- Mode: ${learnerMode}`];

  if (learnerConfig) {
    learnerLines.push('', '**Configuration**', '', codeFence(JSON.stringify(learnerConfig, null, 2), 'json'));
  }
  if (learnerPrompt) {
    learnerLines.push('', '**Exact learner prompt**', '', codeFence(learnerPrompt));
  } else if (learnerMode === 'demo') {
    learnerLines.push('', '_This run used the pre-scripted demo learner; no learner system prompt was sent._');
  } else {
    learnerLines.push('', '_The participant played the learner; no synthetic learner prompt was used._');
  }

  const metadata = [
    `- Run started: ${startedAt || 'Unavailable'}`,
    `- Exported: ${timestamp.toISOString()}`,
    `- Conversation turns: ${countConversationTurns(messages)}`,
  ];
  if (currentNode) {
    metadata.push(`- Current/focus node: ${focusNode?.label || currentNode} (\`${currentNode}\`)`);
  }

  return [
    '# Learning System Test Run',
    '',
    '## Run Metadata',
    '',
    ...metadata,
    '',
    '## Synthetic Learner',
    '',
    ...learnerLines,
    '',
    '## Tutor Prompt',
    '',
    tutorPrompt
      ? codeFence(tutorPrompt)
      : '_This pre-scripted demo did not send a tutor system prompt._',
    '',
    '## Knowledge Graph',
    '',
    codeFence(JSON.stringify(graph || null, null, 2), 'json'),
    '',
    '## Transcript',
    '',
    buildTranscript(messages),
    '',
    '## Evidence Map',
    '',
    buildEvidenceMap(graph, evidenceMap),
    '',
    '## Tool Call History',
    '',
    buildToolHistory(toolCallLog),
    '',
  ].join('\n');
}

export function createRunFilename(date = new Date()) {
  const pad = (value) => String(value).padStart(2, '0');
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const time = `${pad(date.getHours())}${pad(date.getMinutes())}`;
  return `learning-system-run-${day}-${time}.md`;
}
