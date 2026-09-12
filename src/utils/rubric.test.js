import test from 'node:test';
import assert from 'node:assert/strict';
import {
  derivePerformanceResult,
  normalizeRubric,
  validateCriterionSubmission,
} from './rubric.js';
import { validateGraph } from './validateGraph.js';

const node = {
  id: 'identify-stakeholders',
  label: 'Identify affected stakeholders',
  type: 'skill',
  rubric: {
    criteria: [
      {
        id: 'parties',
        label: 'Material parties',
        meets_when: 'Central materially affected parties are identified.',
        does_not_meet_when: 'A central party is omitted.',
        essential: true,
      },
      {
        id: 'stakes',
        label: 'Concrete stakes',
        meets_when: 'Each central party is linked to a concrete effect.',
        does_not_meet_when: 'Parties are only listed.',
        essential: true,
      },
    ],
    combination_rule: 'all_essential',
  },
};

test('all essential criteria must Meet for the performance to Meet', () => {
  const rubric = normalizeRubric(node);
  assert.equal(
    derivePerformanceResult(rubric, [
      { criterion_id: 'parties', result: 'meets' },
      { criterion_id: 'stakes', result: 'meets' },
    ]),
    'meets'
  );
  assert.equal(
    derivePerformanceResult(rubric, [
      { criterion_id: 'parties', result: 'meets' },
      { criterion_id: 'stakes', result: 'does_not_meet' },
    ]),
    'does_not_meet'
  );
});

test('a completed submission requires every essential criterion and evidence', () => {
  const missing = validateCriterionSubmission(node, [
    { criterion_id: 'parties', result: 'meets', evidence: 'Names workers and customers.' },
  ]);
  assert.match(missing.error, /Missing results for essential criteria: stakes/);

  const noEvidence = validateCriterionSubmission(node, [
    { criterion_id: 'parties', result: 'meets', evidence: '' },
    { criterion_id: 'stakes', result: 'meets', evidence: 'Names the job loss mechanism.' },
  ]);
  assert.match(noEvidence.error, /requires cited learner evidence/);
});

test('unknown and duplicate criterion IDs are rejected', () => {
  const unknown = validateCriterionSubmission(node, [
    { criterion_id: 'unknown', result: 'meets', evidence: 'Evidence.' },
  ]);
  assert.match(unknown.error, /Unknown criterion/);

  const duplicate = validateCriterionSubmission(node, [
    { criterion_id: 'parties', result: 'meets', evidence: 'Evidence.' },
    { criterion_id: 'parties', result: 'meets', evidence: 'Evidence again.' },
  ]);
  assert.match(duplicate.error, /submitted more than once/);
});

test('legacy win conditions are exposed as binary criteria', () => {
  const rubric = normalizeRubric({ id: 'legacy', win_condition: 'The learner explains the mechanism.' });
  assert.equal(rubric.criteria.length, 2);
  assert.equal(rubric.criteria[0].id, 'observable-performance');
});

test('graph validation accepts valid rubrics and rejects malformed criteria', () => {
  const valid = { nodes: [node], edges: [] };
  assert.deepEqual(validateGraph(valid), []);

  const invalid = structuredClone(valid);
  delete invalid.nodes[0].rubric.criteria[0].meets_when;
  assert.ok(validateGraph(invalid).some((error) => error.includes("'meets_when'")));
});
