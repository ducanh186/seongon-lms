const fs = require('fs');

const [inputPath, outputPath] = process.argv.slice(2);
if (!inputPath || !outputPath) {
  process.stderr.write('Usage: node ua-arch-assign-layers.cjs <input> <output>\n');
  process.exit(1);
}
const input = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const layers = [
  { id: 'layer:frontend', name: 'Frontend React', description: 'Ứng dụng React/Vite của học viên và quản trị viên, gồm giao diện, routing, API client và styling cho LMS.', nodeIds: [] },
  { id: 'layer:backend-api', name: 'Backend API và Web Delivery', description: 'Bề mặt HTTP của Laravel: controllers, resources, routes, public entry point và Blade views phục vụ REST API cùng nội dung web.', nodeIds: [] },
  { id: 'layer:backend-domain-data', name: 'Backend Domain và Data', description: 'Business logic LMS, Eloquent models, services, commands, factories, seeders và migrations quản lý catalogue, học tập, quiz, thanh toán và chứng chỉ.', nodeIds: [] },
  { id: 'layer:backend-platform', name: 'Backend Platform', description: 'Bootstrap, Laravel configuration, dependency manifests và frontend assets tối thiểu để vận hành backend PHP/Laravel.', nodeIds: [] },
  { id: 'layer:quality-assurance', name: 'Quality Assurance', description: 'Automated tests và test configuration kiểm chứng luồng API, học tập, giao diện, Docker Compose và script vận hành.', nodeIds: [] },
  { id: 'layer:infrastructure', name: 'Infrastructure và Operations', description: 'Docker Compose, Dockerfiles, Nginx/PHP runtime configuration và operator scripts dùng để chạy stack trong môi trường container.', nodeIds: [] },
  { id: 'layer:documentation-specification', name: 'Documentation và Specification', description: 'README, handoff, plans, design specifications và prototype reference ghi lại phạm vi sản phẩm cùng quyết định triển khai.', nodeIds: [] },
  { id: 'layer:runtime-data', name: 'Runtime Data', description: 'State và stream data cục bộ được công cụ tạo trong workspace, tách khỏi source code của ứng dụng LMS.', nodeIds: [] },
  { id: 'layer:project-configuration', name: 'Project Configuration', description: 'Repository metadata và configuration của công cụ phân tích áp dụng ở cấp project.', nodeIds: [] }
];
const byId = new Map(layers.map((layer) => [layer.id, layer]));
function choose(node) {
  const p = String(node.filePath || '').replace(/\\/g, '/');
  const lower = p.toLowerCase();
  if (node.type === 'document' || p.startsWith('docs/') || p.startsWith('SPEC/')) return 'layer:documentation-specification';
  if (/\.test\.[^/]+$/.test(lower) || /(^|\/)tests?\//.test(lower) || /phpunit\.xml$/.test(lower)) return 'layer:quality-assurance';
  if (p.startsWith('data/')) return 'layer:runtime-data';
  if (p.startsWith('FE/')) return 'layer:frontend';
  if (p.startsWith('Infra/')) return 'layer:infrastructure';
  if (/^BE\/(app\/Http\/|routes\/|public\/|resources\/views\/)/.test(p)) return 'layer:backend-api';
  if (/^BE\/(app\/(Models|Services|Support|Console|Providers)\/|database\/)/.test(p)) return 'layer:backend-domain-data';
  if (p.startsWith('BE/')) return 'layer:backend-platform';
  return 'layer:project-configuration';
}
for (const node of input.fileNodes || []) byId.get(choose(node)).nodeIds.push(node.id);
const nonEmpty = layers.filter((layer) => layer.nodeIds.length > 0);
const assigned = nonEmpty.flatMap((layer) => layer.nodeIds);
const expected = (input.fileNodes || []).map((node) => node.id);
const seen = new Set(assigned);
const duplicates = assigned.filter((id, index) => assigned.indexOf(id) !== index);
const missing = expected.filter((id) => !seen.has(id));
const extra = assigned.filter((id) => !expected.includes(id));
if (assigned.length !== expected.length || duplicates.length || missing.length || extra.length || nonEmpty.length < 3 || nonEmpty.length > 10) {
  process.stderr.write(JSON.stringify({ assigned: assigned.length, expected: expected.length, duplicates, missing, extra, layers: nonEmpty.length }) + '\n');
  process.exit(1);
}
fs.writeFileSync(outputPath, JSON.stringify(nonEmpty, null, 2));
console.log(JSON.stringify({ layers: nonEmpty.map((layer) => ({ id: layer.id, count: layer.nodeIds.length })), coverage: `${assigned.length}/${expected.length}` }));
