const fs = require('fs');

try {
  const input = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  const tour = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
  const nodeIds = new Set((input.nodes || []).map((node) => node.id));
  const errors = [];
  if (!Array.isArray(tour) || tour.length < 5 || tour.length > 15) errors.push('Tour must contain 5-15 steps.');
  const seenOrders = new Set();
  for (const [index, step] of (tour || []).entries()) {
    if (step.order !== index + 1 || seenOrders.has(step.order)) errors.push(`Invalid sequential order at index ${index}.`);
    seenOrders.add(step.order);
    if (!Array.isArray(step.nodeIds) || step.nodeIds.length < 1 || step.nodeIds.length > 5) errors.push(`Invalid nodeIds count at step ${step.order}.`);
    for (const id of step.nodeIds || []) if (!nodeIds.has(id)) errors.push(`Unknown node ID: ${id}`);
    if (typeof step.title !== 'string' || !step.title.trim()) errors.push(`Missing title at step ${step.order}.`);
    if (typeof step.description !== 'string' || !step.description.trim()) errors.push(`Missing description at step ${step.order}.`);
  }
  if (errors.length) throw new Error(errors.join('\n'));
  console.log(JSON.stringify({ valid: true, steps: tour.length, titles: tour.map((step) => step.title) }));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
