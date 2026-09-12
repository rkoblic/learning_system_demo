export const CRITERION_RESULTS = ['meets', 'does_not_meet'];

export function normalizeRubric(node) {
  if (node?.rubric?.criteria?.length) {
    return {
      combination_rule: node.rubric.combination_rule || 'all_essential',
      criteria: node.rubric.criteria.map((criterion) => ({
        ...criterion,
        essential: criterion.essential !== false,
      })),
    };
  }

  // Backward compatibility for graphs created before binary rubrics.
  if (typeof node?.win_condition === 'string' && node.win_condition.trim()) {
    return {
      combination_rule: 'all_essential',
      criteria: [
        {
          id: 'observable-performance',
          label: 'Observable performance',
          meets_when: node.win_condition.trim(),
          does_not_meet_when: 'The performance does not provide observable evidence that satisfies this condition.',
          essential: true,
        },
        {
          id: 'case-specific-evidence',
          label: 'Case-specific evidence',
          meets_when: 'The learner supports the performance with concrete details from the supplied situation.',
          does_not_meet_when: 'The response is asserted or generic and could apply unchanged to a materially different situation.',
          essential: true,
        },
      ],
    };
  }

  return null;
}

export function derivePerformanceResult(rubric, criterionResults) {
  if (!rubric?.criteria?.length) return null;

  const resultsById = new Map(
    (criterionResults || []).map((result) => [result.criterion_id, result.result])
  );
  const essential = rubric.criteria.filter((criterion) => criterion.essential !== false);

  if (essential.some((criterion) => !resultsById.has(criterion.id))) return null;
  return essential.every((criterion) => resultsById.get(criterion.id) === 'meets')
    ? 'meets'
    : 'does_not_meet';
}

export function validateCriterionSubmission(node, criterionResults) {
  const rubric = normalizeRubric(node);
  if (!rubric) return { error: `Node '${node?.id || 'unknown'}' does not have an assessable rubric.` };
  if (!Array.isArray(criterionResults) || criterionResults.length === 0) {
    return { error: 'criterion_results must contain at least one result.' };
  }

  const rubricIds = new Set(rubric.criteria.map((criterion) => criterion.id));
  const submittedIds = new Set();

  for (const result of criterionResults) {
    if (!rubricIds.has(result.criterion_id)) {
      return { error: `Unknown criterion '${result.criterion_id}' for node '${node.id}'.` };
    }
    if (submittedIds.has(result.criterion_id)) {
      return { error: `Criterion '${result.criterion_id}' was submitted more than once.` };
    }
    if (!CRITERION_RESULTS.includes(result.result)) {
      return { error: `Criterion '${result.criterion_id}' must be 'meets' or 'does_not_meet'.` };
    }
    if (typeof result.evidence !== 'string' || !result.evidence.trim()) {
      return { error: `Criterion '${result.criterion_id}' requires cited learner evidence or a precise statement that no evidence was present.` };
    }
    submittedIds.add(result.criterion_id);
  }

  const missingEssential = rubric.criteria
    .filter((criterion) => criterion.essential !== false && !submittedIds.has(criterion.id))
    .map((criterion) => criterion.id);
  if (missingEssential.length > 0) {
    return { error: `Missing results for essential criteria: ${missingEssential.join(', ')}.` };
  }

  const normalizedResults = rubric.criteria
    .filter((criterion) => submittedIds.has(criterion.id))
    .map((criterion) => {
      const submitted = criterionResults.find((result) => result.criterion_id === criterion.id);
      return { ...submitted, evidence: submitted.evidence.trim() };
    });

  return {
    rubric,
    criterionResults: normalizedResults,
    performanceResult: derivePerformanceResult(rubric, normalizedResults),
  };
}
