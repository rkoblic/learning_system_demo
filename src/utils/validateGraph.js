export function validateGraph(data) {
  const errors = [];

  if (!data || typeof data !== 'object') {
    return ['File does not contain a valid JSON object.'];
  }

  if (!Array.isArray(data.nodes)) {
    errors.push('Missing required "nodes" array.');
  }
  if (!Array.isArray(data.edges)) {
    errors.push('Missing required "edges" array.');
  }
  if (errors.length > 0) return errors;

  const nodeIds = new Set();
  const duplicateIds = new Set();

  data.nodes.forEach((node, i) => {
    if (!node.id) errors.push(`Node at index ${i} is missing a required 'id' field.`);
    if (!node.label) errors.push(`Node at index ${i} is missing a required 'label' field.`);
    if (!node.type) errors.push(`Node at index ${i} is missing a required 'type' field.`);
    if (node.win_condition !== undefined && typeof node.win_condition !== 'string') {
      errors.push(`Node '${node.id || `at index ${i}`}' has a 'win_condition' that must be a string (one sentence describing what success looks like).`);
    }
    if (node.id) {
      if (nodeIds.has(node.id)) {
        duplicateIds.add(node.id);
      }
      nodeIds.add(node.id);
    }
  });

  duplicateIds.forEach((id) => {
    errors.push(`Duplicate node ID: '${id}' appears more than once.`);
  });

  data.edges.forEach((edge, i) => {
    if (!edge.source) errors.push(`Edge at index ${i} is missing a required 'source' field.`);
    if (!edge.target) errors.push(`Edge at index ${i} is missing a required 'target' field.`);
    if (!edge.relationship) errors.push(`Edge at index ${i} is missing a required 'relationship' field.`);
    if (edge.source && !nodeIds.has(edge.source)) {
      errors.push(`Edge references node '${edge.source}' but no node with that ID exists in the nodes array.`);
    }
    if (edge.target && !nodeIds.has(edge.target)) {
      errors.push(`Edge references node '${edge.target}' but no node with that ID exists in the nodes array.`);
    }
  });

  return errors;
}
