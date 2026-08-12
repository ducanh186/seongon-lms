const fs = require('fs');

const [graphPath, outputPath] = process.argv.slice(2);
if (!graphPath || !outputPath) {
  process.stderr.write('Usage: node ua-arch-prepare-input.cjs <graph> <output>\n');
  process.exit(1);
}
const graph = JSON.parse(fs.readFileSync(graphPath, 'utf8'));
const fileTypes = new Set(['file', 'config', 'document', 'service', 'pipeline', 'table', 'schema', 'resource', 'endpoint']);
const fileNodes = (graph.nodes || []).filter((node) => fileTypes.has(node.type) && typeof node.filePath === 'string');
const fileIds = new Set(fileNodes.map((node) => node.id));
const allEdges = (graph.edges || []).filter((edge) => fileIds.has(edge.source) && fileIds.has(edge.target));
const importEdges = allEdges.filter((edge) => edge.type === 'imports');
fs.writeFileSync(outputPath, JSON.stringify({ fileNodes, importEdges, allEdges }, null, 2));
console.log(JSON.stringify({ fileNodes: fileNodes.length, importEdges: importEdges.length, allEdges: allEdges.length }));
