#!/usr/bin/env node
const fs = require('fs');

const [basePath, scanPath, layersPath, tourPath, outputPath, gitCommitHash] = process.argv.slice(2);
const readJson = (path) => JSON.parse(fs.readFileSync(path, 'utf8'));
const base = readJson(basePath);
const scan = readJson(scanPath);
const layers = readJson(layersPath);
const tour = readJson(tourPath);

if (!Array.isArray(layers) || !Array.isArray(tour)) {
  throw new Error('layers.json and tour.json must both contain JSON arrays');
}

const graph = {
  version: '1.0.0',
  project: {
    name: scan.name || 'seongon-lms',
    languages: scan.languages || [],
    frameworks: scan.frameworks || [],
    description: scan.description || '',
    analyzedAt: new Date().toISOString(),
    gitCommitHash
  },
  nodes: base.nodes || [],
  edges: base.edges || [],
  layers,
  tour
};

fs.writeFileSync(outputPath, JSON.stringify(graph, null, 2));
console.log(`Assembled ${graph.nodes.length} nodes, ${graph.edges.length} edges, ${layers.length} layers, ${tour.length} tour steps.`);
