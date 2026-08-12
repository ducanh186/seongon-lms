const fs = require('fs');
const [batchPath, batchesPath] = process.argv.slice(2);
const fragment = JSON.parse(fs.readFileSync(batchPath, 'utf8'));
const batches = JSON.parse(fs.readFileSync(batchesPath, 'utf8'));
const batch = batches.batches.find((item) => item.batchIndex === 9);
const errors = [];
if (!/^batch-9(?:-part-\d+)?\.json$/.test(batchPath.split(/[\\/]/).pop())) errors.push('invalid output filename');
if (!Array.isArray(fragment.nodes) || !Array.isArray(fragment.edges)) errors.push('nodes/edges arrays missing');
const ids = new Set();
for (const node of fragment.nodes) {
  if (ids.has(node.id)) errors.push(`duplicate node: ${node.id}`);
  ids.add(node.id);
  for (const key of ['id', 'type', 'name', 'summary', 'tags', 'complexity']) if (!(key in node)) errors.push(`missing ${key}: ${node.id}`);
}
const expectedImports = Object.values(batch.batchImportData).flat();
const actualImports = fragment.edges.filter((edge) => edge.type === 'imports');
if (actualImports.length !== expectedImports.length) errors.push(`import count ${actualImports.length} !== ${expectedImports.length}`);
const expectedImportKeys = new Set(Object.entries(batch.batchImportData).flatMap(([source, targets]) => targets.map((target) => `file:${source}|file:${target}`)));
const actualImportKeys = new Set(actualImports.map((edge) => `${edge.source}|${edge.target}`));
for (const key of expectedImportKeys) if (!actualImportKeys.has(key)) errors.push(`missing import: ${key}`);
for (const key of actualImportKeys) if (!expectedImportKeys.has(key)) errors.push(`unexpected import: ${key}`);
const neighborSymbols = new Set(Object.values(batch.neighborMap).flat().flatMap((neighbor) => neighbor.symbols.map((symbol) => `function:${neighbor.path}:${symbol}`)));
const knownExternalFiles = new Set(Object.values(batch.batchImportData).flat().map((path) => `file:${path}`));
for (const edge of fragment.edges) {
  if (edge.source === edge.target) errors.push(`self edge: ${edge.source}`);
  if (!ids.has(edge.source)) errors.push(`unknown source: ${edge.source}`);
  if (!ids.has(edge.target) && !knownExternalFiles.has(edge.target) && !neighborSymbols.has(edge.target)) errors.push(`unknown target: ${edge.target}`);
}
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(JSON.stringify({file: batchPath.split(/[\\/]/).pop(), nodes: fragment.nodes.length, edges: fragment.edges.length, imports: actualImports.length, expectedImports: expectedImports.length, filesSkipped: []}));
