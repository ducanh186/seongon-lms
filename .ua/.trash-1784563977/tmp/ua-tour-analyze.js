const fs = require('fs');
const path = require('path');

function isCodeNode(node) {
  return node.type === 'file' && /\.(?:[cm]?[jt]sx?|php|py|go|rs|java|kt|cs|c|cpp|h|hpp)$/i.test(node.filePath || node.name || '');
}

function relativeDepth(node) {
  const filePath = (node.filePath || '').replace(/\\/g, '/');
  return filePath.split('/').filter(Boolean).length;
}

function entryBaseScore(node, fanIn, fanOut, allFanIn, allFanOut) {
  const filePath = (node.filePath || '').replace(/\\/g, '/');
  const basename = path.posix.basename(filePath || node.name || '');
  const entryNames = new Set([
    'index.ts', 'index.js', 'main.ts', 'main.js', 'app.ts', 'app.js', 'server.ts', 'server.js', 'mod.rs',
    'main.go', 'main.py', 'main.rs', 'manage.py', 'app.py', 'wsgi.py', 'asgi.py', 'run.py', '__main__.py',
    'Application.java', 'Main.java', 'Program.cs', 'config.ru', 'index.php', 'App.swift', 'Application.kt',
    'main.cpp', 'main.c'
  ]);
  let score = 0;
  if (isCodeNode(node) && entryNames.has(basename)) score += 3;
  if (isCodeNode(node) && relativeDepth(node) <= 2) score += 1;
  const sortedOut = [...allFanOut].sort((a, b) => a - b);
  const sortedIn = [...allFanIn].sort((a, b) => a - b);
  const topOutCutoff = sortedOut[Math.max(0, Math.floor(sortedOut.length * 0.9))] || 0;
  const bottomInCutoff = sortedIn[Math.min(sortedIn.length - 1, Math.floor(sortedIn.length * 0.25))] || 0;
  if (isCodeNode(node) && fanOut >= topOutCutoff && fanOut > 0) score += 1;
  if (isCodeNode(node) && fanIn <= bottomInCutoff) score += 1;
  if (node.type === 'document' && filePath.toLowerCase() === 'readme.md') score += 5;
  else if (node.type === 'document' && relativeDepth(node) <= 1 && /\.md$/i.test(filePath)) score += 2;
  return score;
}

try {
  const [inputPath, outputPath] = process.argv.slice(2);
  if (!inputPath || !outputPath) throw new Error('Usage: node ua-tour-analyze.js <input> <output>');
  const input = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const nodes = Array.isArray(input.nodes) ? input.nodes : [];
  const edges = Array.isArray(input.edges) ? input.edges : [];
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const fanIn = new Map(nodes.map((node) => [node.id, 0]));
  const fanOut = new Map(nodes.map((node) => [node.id, 0]));
  const traversable = new Map(nodes.map((node) => [node.id, []]));

  for (const edge of edges) {
    if (!nodeById.has(edge.source) || !nodeById.has(edge.target)) continue;
    fanOut.set(edge.source, (fanOut.get(edge.source) || 0) + 1);
    fanIn.set(edge.target, (fanIn.get(edge.target) || 0) + 1);
    if (edge.type === 'imports' || edge.type === 'calls') {
      traversable.get(edge.source).push(edge.target);
    }
  }

  const allFanIn = [...fanIn.values()];
  const allFanOut = [...fanOut.values()];
  const entryPointCandidates = nodes
    .map((node) => ({
      id: node.id,
      score: entryBaseScore(node, fanIn.get(node.id) || 0, fanOut.get(node.id) || 0, allFanIn, allFanOut),
      name: node.name,
      summary: node.summary || '',
    }))
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .slice(0, 5);

  const rank = (scores, property) => nodes
    .map((node) => ({ id: node.id, [property]: scores.get(node.id) || 0, name: node.name }))
    .sort((a, b) => b[property] - a[property] || a.id.localeCompare(b.id))
    .slice(0, 20);

  const topCodeEntry = entryPointCandidates
    .map((candidate) => nodeById.get(candidate.id))
    .find((node) => node && isCodeNode(node));
  const order = [];
  const depthMap = {};
  const byDepth = {};
  if (topCodeEntry) {
    const queue = [topCodeEntry.id];
    depthMap[topCodeEntry.id] = 0;
    for (let index = 0; index < queue.length; index += 1) {
      const id = queue[index];
      const depth = depthMap[id];
      order.push(id);
      (byDepth[String(depth)] ||= []).push(id);
      for (const target of traversable.get(id) || []) {
        if (depthMap[target] !== undefined) continue;
        depthMap[target] = depth + 1;
        queue.push(target);
      }
    }
  }

  const nonCodeFiles = { documentation: [], infrastructure: [], data: [], config: [] };
  for (const node of nodes) {
    const item = { id: node.id, name: node.name, type: node.type, summary: node.summary || '' };
    if (node.type === 'document') nonCodeFiles.documentation.push(item);
    else if (['service', 'pipeline', 'resource'].includes(node.type)) nonCodeFiles.infrastructure.push(item);
    else if (['table', 'schema', 'endpoint'].includes(node.type)) nonCodeFiles.data.push(item);
    else if (node.type === 'config') nonCodeFiles.config.push(item);
  }

  const pairEdges = new Map();
  for (const edge of edges) {
    if (!['imports', 'calls'].includes(edge.type) || !nodeById.has(edge.source) || !nodeById.has(edge.target)) continue;
    const pair = [edge.source, edge.target].sort().join('\u0000');
    pairEdges.set(pair, (pairEdges.get(pair) || 0) + 1);
  }
  const clusters = [];
  for (const [pair, count] of pairEdges) {
    const [a, b] = pair.split('\u0000');
    const forward = edges.some((edge) => edge.source === a && edge.target === b && ['imports', 'calls'].includes(edge.type));
    const backward = edges.some((edge) => edge.source === b && edge.target === a && ['imports', 'calls'].includes(edge.type));
    if (forward && backward) clusters.push({ nodes: [a, b], edgeCount: count });
  }
  clusters.sort((a, b) => b.edgeCount - a.edgeCount || a.nodes.join().localeCompare(b.nodes.join()));

  const nodeSummaryIndex = Object.fromEntries(nodes.map((node) => [node.id, {
    name: node.name,
    type: node.type,
    summary: node.summary || '',
  }]));
  const layers = Array.isArray(input.layers) ? input.layers : [];
  const result = {
    scriptCompleted: true,
    entryPointCandidates,
    fanInRanking: rank(fanIn, 'fanIn'),
    fanOutRanking: rank(fanOut, 'fanOut'),
    bfsTraversal: { startNode: topCodeEntry ? topCodeEntry.id : null, order, depthMap, byDepth },
    nonCodeFiles,
    clusters: clusters.slice(0, 10),
    layers: { count: layers.length, list: layers.map(({ id, name, description }) => ({ id, name, description })) },
    nodeSummaryIndex,
    totalNodes: nodes.length,
    totalEdges: edges.length,
  };
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify({ scriptCompleted: true, startNode: result.bfsTraversal.startNode, totalNodes: result.totalNodes, totalEdges: result.totalEdges }));
} catch (error) {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exit(1);
}
