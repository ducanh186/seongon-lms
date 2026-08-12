const fs = require('fs');

try {
  const result = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  const pattern = new RegExp(process.argv[3], 'i');
  const selected = Object.entries(result.nodeSummaryIndex)
    .filter(([id, info]) => pattern.test(id) || pattern.test(info.name) || pattern.test(info.summary || ''))
    .map(([id, info]) => ({ id, ...info }))
    .slice(0, 80);
  console.log(JSON.stringify(selected, null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
