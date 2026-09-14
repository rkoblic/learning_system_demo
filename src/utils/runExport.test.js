import test from 'node:test';
import assert from 'node:assert/strict';
import { countConversationTurns, createRunFilename, createRunMarkdown } from './runExport.js';

const graph = {
  nodes: [{
    id: 'skill-1',
    label: 'Explain the idea',
    type: 'skill',
    rubric: {
      criteria: [{
        id: 'mechanism',
        label: 'Names the mechanism',
        meets_when: 'Names it.',
        does_not_meet_when: 'Does not name it.',
        essential: true,
      }],
    },
  }],
  edges: [],
};

test('run export includes the exact run inputs and accumulated evidence', () => {
  const markdown = createRunMarkdown({
    createdAt: new Date('2026-09-14T15:04:00.000Z'),
    startedAt: '2026-09-14T15:00:00.000Z',
    currentNode: 'skill-1',
    graph,
    messages: [
      { role: 'assistant', content: 'What causes it?' },
      { role: 'user', content: 'This mechanism does.' },
    ],
    evidenceMap: {
      'skill-1': {
        status: 'assessed',
        performance_result: 'meets',
        criterion_results: [{
          criterion_id: 'mechanism',
          result: 'meets',
          evidence: 'The learner named the mechanism.',
        }],
      },
    },
    toolCallLog: [{
      order: 1,
      turn: 1,
      name: 'get_node',
      input: { node_id: 'skill-1' },
      result: JSON.stringify({ id: 'skill-1' }),
      timestamp: '2026-09-14T15:00:01.000Z',
    }],
    tutorPrompt: 'Exact tutor prompt',
    learnerMode: 'custom',
    learnerPrompt: 'Exact learner prompt',
    learnerConfig: { terse: true },
  });

  assert.match(markdown, /# Learning System Test Run/);
  assert.match(markdown, /Run started: 2026-09-14T15:00:00.000Z/);
  assert.match(markdown, /Exact tutor prompt/);
  assert.match(markdown, /Exact learner prompt/);
  assert.match(markdown, /The learner named the mechanism/);
  assert.match(markdown, /Call 1: `get_node`/);
  assert.match(markdown, /"id": "skill-1"/);
});

test('conversation turns are counted and grouped by tutor turn', () => {
  const messages = [
    { role: 'assistant', content: 'Question one' },
    { role: 'user', content: 'Answer one' },
    { role: 'assistant', content: 'Question two' },
  ];
  assert.equal(countConversationTurns(messages), 2);
});

test('run filename uses the requested local date and time shape', () => {
  const date = new Date(2026, 8, 14, 9, 7);
  assert.equal(createRunFilename(date), 'learning-system-run-2026-09-14-0907.md');
});
