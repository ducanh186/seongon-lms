const fs = require('fs');
const root = 'D:/CODE/seongon-lms';
const batches = JSON.parse(fs.readFileSync(root + '/.ua/intermediate/batches.json', 'utf8')).batches;
const indices = [10, 11, 12];
const allowed = new Set(['file','function','class','config','document','service','table','endpoint','pipeline','schema','resource']);
const results = [];
for (const index of indices) {
  const batch = batches.find(b => b.batchIndex === index);
  const file = root + `/.ua/intermediate/batch-${index}.json`;
  const graph = JSON.parse(fs.readFileSync(file, 'utf8'));
  const errors = [];
  if (!Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) errors.push('missing nodes or edges array');
  const ids = new Set();
  for (const n of graph.nodes) {
    if (!n.id || !n.name || !n.summary || !Array.isArray(n.tags) || !n.complexity || !allowed.has(n.type)) errors.push(`invalid node ${n.id || '<missing>'}`);
    if (ids.has(n.id)) errors.push(`duplicate node ${n.id}`);
    ids.add(n.id);
  }
  for (const e of graph.edges) {
    if (!e.source || !e.target || !e.type || e.direction !== 'forward' || typeof e.weight !== 'number') errors.push('invalid edge shape');
    if (!ids.has(e.source) || !ids.has(e.target)) errors.push(`local dangling edge ${e.source} -> ${e.target}`);
  }
  const expected = batch.files.filter(f => f.fileCategory === 'code').reduce((sum, f) => sum + (batch.batchImportData[f.path] || []).length, 0);
  const actual = graph.edges.filter(e => e.type === 'imports').length;
  if (actual !== expected) errors.push(`imports ${actual} != ${expected}`);
  results.push({ index, name: `batch-${index}.json`, nodes: graph.nodes.length, edges: graph.edges.length, imports: `${actual}/${expected}`, valid: errors.length === 0, errors });
}
console.log(JSON.stringify(results, null, 2));
if (results.some(r => !r.valid)) process.exit(1);
