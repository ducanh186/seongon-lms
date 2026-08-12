const fs = require('fs');
const path = require('path');

const [graphPath, layersPath, outputPath] = process.argv.slice(2);

try {
  if (!graphPath || !layersPath || !outputPath) {
    throw new Error('Usage: node ua-tour-prepare.js <graph> <layers> <output>');
  }
  const graph = JSON.parse(fs.readFileSync(graphPath, 'utf8'));
  const layerData = JSON.parse(fs.readFileSync(layersPath, 'utf8'));
  const layers = Array.isArray(layerData) ? layerData : (layerData.layers || []);
  const input = {
    nodes: Array.isArray(graph.nodes) ? graph.nodes : [],
    edges: Array.isArray(graph.edges) ? graph.edges : [],
    layers,
  };
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(input, null, 2) + '\n');
  console.log(JSON.stringify({ nodes: input.nodes.length, edges: input.edges.length, layers: input.layers.length }));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
