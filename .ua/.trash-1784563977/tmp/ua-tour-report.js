const fs = require('fs');

try {
  const result = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  const pick = (items, fields) => (items || []).map((item) => Object.fromEntries(fields.map((field) => [field, item[field]])));
  const report = {
    entries: pick(result.entryPointCandidates, ['id', 'score', 'name', 'summary']),
    fanIn: pick(result.fanInRanking.slice(0, 12), ['id', 'fanIn', 'name']),
    fanOut: pick(result.fanOutRanking.slice(0, 12), ['id', 'fanOut', 'name']),
    bfs: { startNode: result.bfsTraversal.startNode, byDepth: result.bfsTraversal.byDepth },
    nonCode: {
      documentation: pick(result.nonCodeFiles.documentation.slice(0, 20), ['id', 'name', 'type', 'summary']),
      infrastructure: pick(result.nonCodeFiles.infrastructure.slice(0, 20), ['id', 'name', 'type', 'summary']),
      data: pick(result.nonCodeFiles.data.slice(0, 20), ['id', 'name', 'type', 'summary']),
      config: pick(result.nonCodeFiles.config.slice(0, 20), ['id', 'name', 'type', 'summary']),
    },
    clusters: result.clusters,
    layers: result.layers,
  };
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
