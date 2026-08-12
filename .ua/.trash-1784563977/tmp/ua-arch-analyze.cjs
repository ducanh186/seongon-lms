const fs = require('fs');
const path = require('path');

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

const [inputPath, outputPath] = process.argv.slice(2);
if (!inputPath || !outputPath) fail('Usage: node ua-arch-analyze.cjs <input> <output>');

let input;
try {
  input = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
} catch (error) {
  fail(`Cannot read input: ${error.message}`);
}

const fileNodes = Array.isArray(input.fileNodes) ? input.fileNodes : [];
const importEdges = Array.isArray(input.importEdges) ? input.importEdges : [];
const allEdges = Array.isArray(input.allEdges) ? input.allEdges : [];
const nodeById = new Map(fileNodes.map((node) => [node.id, node]));
const normalPath = (node) => String(node.filePath || node.path || node.name || '').replace(/\\/g, '/').replace(/^\.\//, '');
const pathParts = fileNodes.map((node) => normalPath(node).split('/').filter(Boolean));
let commonPrefixLength = 0;
if (pathParts.length) {
  while (pathParts.every((parts) => parts.length > commonPrefixLength + 1 && parts[commonPrefixLength] === pathParts[0][commonPrefixLength])) commonPrefixLength += 1;
}
function groupFor(node) {
  const parts = normalPath(node).split('/').filter(Boolean);
  const group = parts[commonPrefixLength] || (parts.length > 1 ? parts[0] : 'root');
  return group || 'root';
}
const directoryGroups = {};
const groupById = new Map();
const nodeTypeGroups = {};
for (const node of fileNodes) {
  const group = groupFor(node);
  (directoryGroups[group] ||= []).push(node.id);
  groupById.set(node.id, group);
  const type = node.type || 'file';
  (nodeTypeGroups[type] ||= []).push(node.id);
}
const fanIn = Object.fromEntries(fileNodes.map((node) => [node.id, 0]));
const fanOut = Object.fromEntries(fileNodes.map((node) => [node.id, 0]));
const interGroupMap = new Map();
const groupIncoming = new Map();
const groupOutgoing = new Map();
for (const edge of importEdges) {
  if (!nodeById.has(edge.source) || !nodeById.has(edge.target)) continue;
  fanOut[edge.source] += 1;
  fanIn[edge.target] += 1;
  const from = groupById.get(edge.source);
  const to = groupById.get(edge.target);
  const key = `${from}\u0000${to}`;
  interGroupMap.set(key, (interGroupMap.get(key) || 0) + 1);
  (groupOutgoing.get(from) || groupOutgoing.set(from, new Set()).get(from)).add(to);
  (groupIncoming.get(to) || groupIncoming.set(to, new Set()).get(to)).add(from);
}
const interGroupImports = [...interGroupMap].map(([key, count]) => {
  const [from, to] = key.split('\u0000');
  return { from, to, count };
}).sort((a, b) => b.count - a.count || a.from.localeCompare(b.from) || a.to.localeCompare(b.to));
const intraGroupDensity = {};
for (const group of Object.keys(directoryGroups)) {
  const nodeIds = new Set(directoryGroups[group]);
  const involving = importEdges.filter((edge) => nodeIds.has(edge.source) || nodeIds.has(edge.target));
  const internal = involving.filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target));
  intraGroupDensity[group] = { internalEdges: internal.length, totalEdges: involving.length, density: involving.length ? Number((internal.length / involving.length).toFixed(3)) : 0 };
}
const patternLookup = [
  ['routes|api|controllers|endpoints|handlers|serializers|blueprints|controller|routers', 'api'],
  ['services|core|lib|domain|logic|composables|mailers|jobs|channels|signals|internal', 'service'],
  ['models|db|data|persistence|repository|entities|migrations|entity|sql|database|schema', 'data'],
  ['components|views|pages|ui|layouts|screens', 'ui'],
  ['middleware|plugins|interceptors|guards', 'middleware'],
  ['utils|helpers|common|shared|tools|templatetags|pkg', 'utility'],
  ['config|constants|env|settings|management|commands', 'config'],
  ['__tests__|test|tests|spec|specs', 'test'],
  ['types|interfaces|schemas|contracts|dtos|dto|request|response', 'types'],
  ['hooks', 'hooks'], ['store|state|reducers|actions|slices', 'state'], ['assets|static|public', 'assets'],
  ['docs|documentation|wiki', 'documentation'], ['deploy|deployment|infra|infrastructure|docker|k8s|kubernetes|helm|charts|terraform|tf', 'infrastructure'],
  ['.github|.gitlab|.circleci', 'ci-cd'], ['cmd|bin', 'entry']
];
const patternMatches = {};
for (const group of Object.keys(directoryGroups)) {
  const match = patternLookup.find(([patterns]) => patterns.split('|').includes(group.toLowerCase()));
  if (match) patternMatches[group] = match[1];
}
const categoryMap = new Map();
for (const edge of allEdges) {
  const source = nodeById.get(edge.source);
  const target = nodeById.get(edge.target);
  if (!source || !target) continue;
  const fromType = source.type || 'file';
  const toType = target.type || 'file';
  const edgeType = edge.type || 'related_to';
  const key = `${fromType}\u0000${toType}\u0000${edgeType}`;
  categoryMap.set(key, (categoryMap.get(key) || 0) + 1);
}
const crossCategoryEdges = [...categoryMap].map(([key, count]) => {
  const [fromType, toType, edgeType] = key.split('\u0000');
  return { fromType, toType, edgeType, count };
}).sort((a, b) => b.count - a.count);
const allPaths = fileNodes.map(normalPath);
const lowerPaths = allPaths.map((p) => p.toLowerCase());
const infraFiles = allPaths.filter((p) => /(^|\/)(dockerfile|docker-compose[^/]*|.*\.tf(vars)?|.*k8s.*|.*kubernetes.*|.*helm.*|\.github\/workflows\/.*)/i.test(p));
const deploymentTopology = {
  hasDockerfile: lowerPaths.some((p) => /(^|\/)dockerfile/.test(p)),
  hasCompose: lowerPaths.some((p) => /(^|\/)docker-compose/.test(p)),
  hasK8s: lowerPaths.some((p) => /k8s|kubernetes|helm/.test(p)),
  hasTerraform: lowerPaths.some((p) => /\.tf(vars)?$|terraform/.test(p)),
  hasCI: lowerPaths.some((p) => /\.github\/workflows|\.gitlab-ci|jenkinsfile/.test(p)),
  infraFiles
};
const isDoc = (p) => /(^|\/)(readme|contributing|changelog)[^/]*\.md$|^docs\/.*\.md$/i.test(p);
const docsByGroup = new Set(fileNodes.filter((node) => isDoc(normalPath(node))).map((node) => groupById.get(node.id)));
const dataPipeline = {
  schemaFiles: allPaths.filter((p) => /\.sql$|\.graphql$|\.gql$|\.proto$/i.test(p)),
  migrationFiles: allPaths.filter((p) => /migrations?\//i.test(p)),
  dataModelFiles: allPaths.filter((p) => /models?\//i.test(p)),
  apiHandlerFiles: allPaths.filter((p) => /routes?|controllers?|endpoints?|api\//i.test(p))
};
const dependencyDirection = [];
for (const pair of interGroupImports) {
  if (pair.from === pair.to) continue;
  const reverse = interGroupMap.get(`${pair.to}\u0000${pair.from}`) || 0;
  if (pair.count > reverse) dependencyDirection.push({ dependent: pair.from, dependsOn: pair.to });
}
const result = {
  scriptCompleted: true,
  directoryGroups,
  nodeTypeGroups,
  crossCategoryEdges,
  interGroupImports,
  intraGroupDensity,
  patternMatches,
  deploymentTopology,
  dataPipeline,
  docCoverage: {
    groupsWithDocs: docsByGroup.size,
    totalGroups: Object.keys(directoryGroups).length,
    coverageRatio: Object.keys(directoryGroups).length ? Number((docsByGroup.size / Object.keys(directoryGroups).length).toFixed(3)) : 0,
    undocumentedGroups: Object.keys(directoryGroups).filter((group) => !docsByGroup.has(group))
  },
  dependencyDirection,
  fileStats: {
    totalFileNodes: fileNodes.length,
    filesPerGroup: Object.fromEntries(Object.entries(directoryGroups).map(([group, ids]) => [group, ids.length])),
    nodeTypeCounts: Object.fromEntries(Object.entries(nodeTypeGroups).map(([type, ids]) => [type, ids.length]))
  },
  fileFanIn: fanIn,
  fileFanOut: fanOut
};
try {
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
} catch (error) {
  fail(`Cannot write output: ${error.message}`);
}
